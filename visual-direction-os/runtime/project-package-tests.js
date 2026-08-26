const assert = require('node:assert/strict');
const { sha256Hex, encodeVdos, decodeVdos } = require('./vdos-codec.js');
const { createSchemaMigrator } = require('./schema-migrations.js');
const {
  portableRequestV1,
  validateLineage,
  mergeRuntimeAndPersistedArtifacts,
  buildExportStage,
  buildExportReport,
  buildArchiveFiles,
  stageImport,
  remapImportedProject,
  rehydrateRuntimeArtifact,
  buildImportReport
} = require('./project-package.js');

function decodeJson(bytes) {
  return JSON.parse(new TextDecoder().decode(bytes));
}

function jsonFile(files, path) {
  const file = files.find((row) => row.path === path);
  assert.ok(file, `missing archive file ${path}`);
  return decodeJson(file.bytes);
}

function artifactBase(id, overrides = {}) {
  return {
    id,
    projectId:'p1',
    createdAt:'2026-08-26T00:00:00.000Z',
    provider:'agnes-image-2.1-flash',
    request:{
      model:'agnes-image-2.1-flash',
      prompt:`PROMPT ${id}`,
      size:'2K',
      ratio:'16:9',
      return_base64:true,
      extra_body:{response_format:'b64_json'}
    },
    baseRequest:{
      model:'agnes-image-2.1-flash',
      prompt:`BASE ${id}`,
      size:'2K',
      ratio:'16:9',
      return_base64:true,
      extra_body:{response_format:'b64_json'}
    },
    result:{kind:'base64',src:'data:image/png;base64,AAAA',revisedPrompt:null},
    references:[],
    visualIR:{metadata:{version:'0.1.0'}},
    measurements:null,
    evaluation:null,
    humanJudgments:null,
    iterationDelta:null,
    evaluationDelta:null,
    parentArtifactId:null,
    rootArtifactId:id,
    generationIndex:1,
    persistenceStatus:'persisted',
    ...overrides
  };
}

function cloneDecoded(decoded) {
  return {
    ...decoded,
    manifest:structuredClone(decoded.manifest),
    entries:new Map([...decoded.entries].map(([path,bytes]) => [path,new Uint8Array(bytes)])),
    warnings:[...(decoded.warnings || [])]
  };
}

async function bytesOf(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

(async () => {
  // Task 6 — portable request allowlist.
  const safe = portableRequestV1({
    model:'agnes-image-2.1-flash',
    prompt:'P',
    size:'2K',
    ratio:'16:9',
    return_base64:true,
    Authorization:'Bearer injected-secret',
    headers:{Cookie:'session-secret'},
    VDOS_PROXY_TOKEN:'proxy-secret',
    unknown:'drop-me',
    extra_body:{
      response_format:'b64_json',
      image:['data:image/png;base64,AA=='],
      token:'drop-extra-secret'
    }
  });
  assert.deepEqual(safe, {
    model:'agnes-image-2.1-flash',
    prompt:'P',
    size:'2K',
    ratio:'16:9',
    return_base64:true,
    extra_body:{response_format:'b64_json'}
  });
  assert.doesNotMatch(JSON.stringify(safe), /Bearer|injected-secret|session-secret|proxy-secret|drop-me|drop-extra-secret|Cookie|VDOS_PROXY_TOKEN/);

  // Task 6 — runtime metadata wins while persisted bytes survive.
  const persistedBlob = new Blob([Uint8Array.of(1,2,3)], {type:'image/png'});
  const merged = mergeRuntimeAndPersistedArtifacts(
    [
      artifactBase('g2', {parentArtifactId:'g1',rootArtifactId:'g1',generationIndex:2,persistenceStatus:'not_persisted'}),
      artifactBase('g1', {request:{model:'agnes-image-2.1-flash',prompt:'RUNTIME',return_base64:true,extra_body:{response_format:'b64_json'}},imageBlob:null})
    ],
    [artifactBase('g1', {
      request:{model:'agnes-image-2.1-flash',prompt:'PERSISTED',return_base64:true,extra_body:{response_format:'b64_json'}},
      imageBlob:persistedBlob
    })]
  );
  assert.deepEqual(merged.map((row) => row.id), ['g1','g2']);
  assert.equal(merged[0].request.prompt, 'RUNTIME');
  assert.equal(merged[0].imageBlob, persistedBlob);
  assert.equal(merged[1].persistenceStatus, 'not_persisted');

  // Task 6 — lineage is independently cross-checked against artifact topology.
  const project = {id:'p1',title:'Portable Project'};
  const lineageArtifacts = [
    artifactBase('g1'),
    artifactBase('g2', {parentArtifactId:'g1',rootArtifactId:'g1',generationIndex:2})
  ];
  const validLineage = {
    roots:['g1'],
    nodes:[
      {artifactId:'g1',parentArtifactId:null,rootArtifactId:'g1'},
      {artifactId:'g2',parentArtifactId:'g1',rootArtifactId:'g1'}
    ]
  };
  assert.doesNotThrow(() => validateLineage({project,artifacts:lineageArtifacts,lineage:validLineage}));
  assert.throws(() => validateLineage({
    project,
    artifacts:lineageArtifacts,
    lineage:{roots:['g1'],nodes:[validLineage.nodes[0],{artifactId:'g2',parentArtifactId:'missing',rootArtifactId:'g1'}]}
  }), /parent|lineage|missing/i);
  assert.throws(() => validateLineage({
    project,
    artifacts:[lineageArtifacts[0],artifactBase('g2',{parentArtifactId:'g1',rootArtifactId:'g2',generationIndex:2})],
    lineage:validLineage
  }), /root|lineage|mismatch/i);
  assert.throws(() => validateLineage({
    project,
    artifacts:[
      artifactBase('g1',{parentArtifactId:'g2',rootArtifactId:'g1'}),
      artifactBase('g2',{parentArtifactId:'g1',rootArtifactId:'g1',generationIndex:2})
    ],
    lineage:{roots:[],nodes:[
      {artifactId:'g1',parentArtifactId:'g2',rootArtifactId:'g1'},
      {artifactId:'g2',parentArtifactId:'g1',rootArtifactId:'g1'}
    ]}
  }), /cycle|lineage/i);

  // Task 6 — reference dedup, partial preflight, and archive secret regression.
  const referenceBytes = Uint8Array.from([137,80,78,71,13,10,26,10,1,2,3]);
  const referenceDataUri = `data:image/png;base64,${Buffer.from(referenceBytes).toString('base64')}`;
  const remoteSecretUrl = 'https://assets.example.test/private/hero.png?token=session-secret#signed';
  const runtimeArtifacts = [
    artifactBase('g1', {
      references:[{id:'r1',name:'hero.png',source:referenceDataUri,role:'character',preserve:['identity']}],
      request:{
        model:'agnes-image-2.1-flash',prompt:'P1',size:'2K',ratio:'16:9',return_base64:true,
        Authorization:'Bearer injected-secret',headers:{Cookie:'x'},unknown:'drop-me',
        extra_body:{response_format:'b64_json',image:[referenceDataUri],token:'drop-extra-secret'}
      },
      result:{kind:'base64',src:'blob:runtime-object-url',revisedPrompt:null},
      persistenceError:'session-secret'
    }),
    artifactBase('g2', {
      parentArtifactId:'g1',rootArtifactId:'g1',generationIndex:2,
      references:[{id:'r2',name:'same-bytes.png',source:referenceDataUri,role:'style',preserve:['palette']}]
    }),
    artifactBase('g3', {
      parentArtifactId:'g2',rootArtifactId:'g1',generationIndex:3,
      references:[{id:'remote',name:'remote.png',source:remoteSecretUrl,role:'world',preserve:['layout']}]
    }),
    artifactBase('g4', {
      parentArtifactId:'g3',rootArtifactId:'g1',generationIndex:4,persistenceStatus:'not_persisted',
      result:{kind:'url',src:'https://result.example.test/private/output.png?VDOS_PROXY_TOKEN=proxy-secret'}
    })
  ];
  const persistedArtifacts = runtimeArtifacts.slice(0,3).map((artifact, index) => ({
    ...artifact,
    request:{...artifact.request,prompt:`PERSISTED ${artifact.id}`},
    imageBlob:new Blob([Uint8Array.of(10 + index,20 + index,30 + index)], {type:'image/png'}),
    persistenceStatus:'persisted'
  }));
  const stage = await buildExportStage({
    project:{
      id:'p1',title:'Portable Project',createdAt:'2026-08-25T00:00:00.000Z',updatedAt:'2026-08-26T00:00:00.000Z',
      runtimeSessionSecret:'session-secret'
    },
    runtimeArtifacts,
    persistedArtifacts,
    comparisons:[{
      id:'cmp-1',projectId:'p1',artifactAId:'g1',artifactBId:'g2',createdAt:'2026-08-26T00:00:00.000Z',
      directorJudgments:{'narrative-verb':{state:'improved',note:'clearer'}},
      comparison:{summary:{stablePass:1}},sessionSecret:'session-secret'
    }],
    memorySnapshot:{
      policyVersion:1,computedAt:'2026-08-26T00:00:00.000Z',pathHeadArtifactId:'g2',locked:[],active:[],watch:[],
      sessionSecret:'session-secret'
    },
    fetchImpl:async (url) => {
      assert.equal(url, remoteSecretUrl);
      throw new Error('CORS blocked session-secret');
    }
  });
  const report = buildExportReport(stage);
  assert.equal(report.packageCompleteness, 'partial');
  assert.ok(report.missingAssets.some((row) => row.artifactId === 'g3' && row.code === 'remote_unavailable'));
  assert.ok(report.missingAssets.some((row) => row.artifactId === 'g4' && row.code === 'not_persisted'));

  const files = buildArchiveFiles(stage);
  const referenceFiles = files.filter((row) => row.path.startsWith('references/'));
  assert.equal(referenceFiles.length, 1);
  const referenceHash = await sha256Hex(referenceBytes);
  assert.equal(referenceFiles[0].path, `references/${referenceHash}.png`);
  const g1Portable = jsonFile(files, 'artifacts/g1.json');
  const g2Portable = jsonFile(files, 'artifacts/g2.json');
  const g3Portable = jsonFile(files, 'artifacts/g3.json');
  const g4Portable = jsonFile(files, 'artifacts/g4.json');
  assert.equal(g1Portable.generation.references[0].path, referenceFiles[0].path);
  assert.equal(g2Portable.generation.references[0].path, referenceFiles[0].path);
  assert.equal(g1Portable.generation.references[0].role, 'character');
  assert.equal(g2Portable.generation.references[0].role, 'style');
  assert.deepEqual(g1Portable.generation.references[0].preserve, ['identity']);
  assert.deepEqual(g2Portable.generation.references[0].preserve, ['palette']);
  assert.equal(g3Portable.generation.references[0].status, 'remote_unavailable');
  assert.doesNotMatch(JSON.stringify(g3Portable), /\/private\/hero\.png|token=|#signed|session-secret/);
  assert.equal(g4Portable.image.status, 'meta_only');
  assert.equal(files.filter((row) => row.path.startsWith('images/')).length, 3);
  const lineage = jsonFile(files, 'lineage.json');
  assert.deepEqual(lineage.roots, ['g1']);
  assert.deepEqual(lineage.nodes.map((row) => [row.artifactId,row.parentArtifactId,row.rootArtifactId]), [
    ['g1',null,'g1'],['g2','g1','g1'],['g3','g2','g1'],['g4','g3','g1']
  ]);
  const allJson = files
    .filter((row) => row.path.endsWith('.json'))
    .map((row) => new TextDecoder().decode(row.bytes))
    .join('\n');
  assert.doesNotMatch(allJson, /Bearer|VDOS_PROXY_TOKEN|session-secret|injected-secret|proxy-secret|drop-me|drop-extra-secret|blob:runtime-object-url/);

  // Task 7 RED — build a complete package fixture with ordered reference usages.
  const refABytes = Uint8Array.from([1,3,5,7,9]);
  const refBBytes = Uint8Array.from([2,4,6,8,10]);
  const refA = `data:image/png;base64,${Buffer.from(refABytes).toString('base64')}`;
  const refB = `data:image/png;base64,${Buffer.from(refBBytes).toString('base64')}`;
  const importRuntimeArtifacts = [
    artifactBase('g1', {
      references:[{id:'ra',name:'a.png',source:refA,role:'character',preserve:['identity']}]
    }),
    artifactBase('g2', {
      parentArtifactId:'g1',rootArtifactId:'g1',generationIndex:2,
      references:[
        {id:'ra2',name:'a-again.png',source:refA,role:'character',preserve:['identity']},
        {id:'rb',name:'b.png',source:refB,role:'style',preserve:['palette']}
      ]
    })
  ];
  const importPersistedArtifacts = importRuntimeArtifacts.map((artifact, index) => ({
    ...artifact,
    imageBlob:new Blob([Uint8Array.of(40 + index,50 + index,60 + index)], {type:'image/png'}),
    persistenceStatus:'persisted'
  }));
  const completeExportStage = await buildExportStage({
    project:{id:'p1',title:'Import Source',createdAt:'2026-08-25T00:00:00.000Z',updatedAt:'2026-08-26T00:00:00.000Z'},
    runtimeArtifacts:importRuntimeArtifacts,
    persistedArtifacts:importPersistedArtifacts,
    comparisons:[{
      id:'g1::g2',projectId:'p1',artifactAId:'g1',artifactBId:'g2',updatedAt:'2026-08-26T00:00:00.000Z',
      directorJudgments:{'narrative-verb':{state:'improved',note:'clearer'}},
      comparison:{summary:{stablePass:1}}
    }],
    memorySnapshot:{
      policyVersion:1,computedAt:'2026-08-26T00:00:00.000Z',pathHeadArtifactId:'g2',pathArtifactIds:['g1','g2'],
      locked:[{checkId:'canvas-ratio'}],active:[],watch:[]
    }
  });
  assert.equal(completeExportStage.packageCompleteness, 'complete');
  const completeArchive = await encodeVdos({
    files:buildArchiveFiles(completeExportStage),
    manifestBase:completeExportStage.manifestBase
  });
  const decoded = await decodeVdos(completeArchive);
  const migrator = createSchemaMigrator({currentVersion:1,migrations:{}});

  // Task 7 RED — public rehydration must restore generated Blob and ordered rich references.
  const portableG2 = decodeJson(decoded.entries.get('artifacts/g2.json'));
  const assetLookup = new Map([...decoded.entries].filter(([path]) => path.startsWith('images/') || path.startsWith('references/')));
  const rehydratedG2 = await rehydrateRuntimeArtifact(portableG2, assetLookup);
  assert.ok(rehydratedG2.imageBlob instanceof Blob);
  assert.equal(rehydratedG2.imageBlob.type, 'image/png');
  assert.deepEqual(rehydratedG2.request.extra_body.image, [refA,refB]);
  assert.deepEqual(rehydratedG2.baseRequest.extra_body.image, [refA,refB]);
  assert.deepEqual(rehydratedG2.references.map((row) => row.role), ['character','style']);
  assert.deepEqual(rehydratedG2.references.map((row) => row.preserve), [['identity'],['palette']]);
  assert.deepEqual(rehydratedG2.references.map((row) => row.source), [refA,refB]);

  // Task 7 RED — conflict Copy remaps the complete graph and preserves earliest provenance.
  let recomputeCalls = 0;
  const stagedCopy = await stageImport({
    decoded,
    migrator,
    existingProjectIds:new Set(['p1']),
    mode:'copy',
    makeProjectId:() => 'project-copy',
    makeArtifactId:(oldId) => `copy-${oldId}`,
    recomputeDerived:({artifacts,comparisons,lineage,memorySnapshot}) => {
      recomputeCalls += 1;
      assert.deepEqual(artifacts.map((row) => row.id), ['g1','g2'], 'derived recomputation must occur before Copy remap');
      assert.equal(comparisons[0].artifactBId, 'g2');
      assert.equal(lineage.nodes[1].parentArtifactId, 'g1');
      assert.equal(memorySnapshot.pathHeadArtifactId, 'g2');
      return {
        comparisons,
        memory:{pathHeadArtifactId:'g2',pathArtifactIds:['g1','g2'],locked:[],active:[],watch:[]},
        memoryReconciliation:'MEMORY VERIFIED'
      };
    }
  });
  assert.equal(recomputeCalls, 1);
  assert.equal(stagedCopy.project.id, 'project-copy');
  assert.equal(stagedCopy.project.provenance.sourceProjectId, 'p1');
  assert.equal(stagedCopy.project.provenance.importedFromPackageId, decoded.manifest.packageId);
  assert.deepEqual(stagedCopy.idMap.artifacts, {g1:'copy-g1',g2:'copy-g2'});
  const copiedG2 = stagedCopy.artifacts.find((row) => row.sourceIdentity.sourceArtifactId === 'g2');
  assert.ok(copiedG2);
  assert.equal(copiedG2.id, 'copy-g2');
  assert.equal(copiedG2.projectId, 'project-copy');
  assert.equal(copiedG2.parentArtifactId, 'copy-g1');
  assert.equal(copiedG2.rootArtifactId, 'copy-g1');
  assert.deepEqual(copiedG2.request.extra_body.image, [refA,refB]);
  assert.deepEqual(stagedCopy.lineage.roots, ['copy-g1']);
  assert.equal(stagedCopy.lineage.nodes.find((row) => row.artifactId === 'copy-g2').parentArtifactId, 'copy-g1');
  assert.equal(stagedCopy.comparisons[0].artifactAId, 'copy-g1');
  assert.equal(stagedCopy.comparisons[0].artifactBId, 'copy-g2');
  assert.equal(stagedCopy.comparisons[0].id, 'copy-g1::copy-g2');
  assert.equal(stagedCopy.derived.memory.pathHeadArtifactId, 'copy-g2');
  assert.deepEqual(stagedCopy.derived.memory.pathArtifactIds, ['copy-g1','copy-g2']);
  assert.equal(stagedCopy.derived.memoryReconciliation, 'MEMORY VERIFIED');
  assert.equal(stagedCopy.project.importAudit.memorySnapshot.pathHeadArtifactId, 'copy-g2');
  assert.equal(stagedCopy.recoveryStatus, 'complete');

  const importReport = buildImportReport(stagedCopy);
  assert.equal(importReport.recoveryStatus, 'complete');
  assert.equal(importReport.memoryReconciliation, 'MEMORY VERIFIED');
  assert.deepEqual(importReport.migrations, []);

  // Task 7 RED — remap helper must preserve topology without mutating the source stage.
  const remapSource = {
    project:{id:'p1',provenance:{sourceProjectId:null}},
    artifacts:[
      {id:'g1',projectId:'p1',parentArtifactId:null,rootArtifactId:'g1',sourceIdentity:{sourceArtifactId:null}},
      {id:'g2',projectId:'p1',parentArtifactId:'g1',rootArtifactId:'g1',sourceIdentity:{sourceArtifactId:null}}
    ],
    comparisons:[{id:'g1::g2',projectId:'p1',artifactAId:'g1',artifactBId:'g2'}],
    lineage:{roots:['g1'],nodes:[
      {artifactId:'g1',parentArtifactId:null,rootArtifactId:'g1'},
      {artifactId:'g2',parentArtifactId:'g1',rootArtifactId:'g1'}
    ]},
    memorySnapshot:{pathHeadArtifactId:'g2',pathArtifactIds:['g1','g2']},
    derived:{memory:{pathHeadArtifactId:'g2',pathArtifactIds:['g1','g2']}}
  };
  const remapped = remapImportedProject(remapSource, {
    projectId:'p2',artifactIdMap:{g1:'n1',g2:'n2'}
  });
  assert.equal(remapSource.project.id, 'p1');
  assert.equal(remapped.project.id, 'p2');
  assert.equal(remapped.artifacts[1].parentArtifactId, 'n1');
  assert.equal(remapped.lineage.nodes[1].artifactId, 'n2');
  assert.equal(remapped.comparisons[0].id, 'n1::n2');
  assert.equal(remapped.memorySnapshot.pathHeadArtifactId, 'n2');
  assert.equal(remapped.derived.memory.pathHeadArtifactId, 'n2');

  // Task 7 RED — a corrupt non-structural image degrades to metadata-only import.
  const corruptAssetDecoded = cloneDecoded(decoded);
  const corruptImagePath = completeExportStage.artifacts.find((row) => row.id === 'g2').image.path;
  corruptAssetDecoded.entries.set(corruptImagePath, Uint8Array.of(255,254,253));
  const stagedPartial = await stageImport({
    decoded:corruptAssetDecoded,
    migrator,
    existingProjectIds:new Set(),
    mode:'copy',
    makeProjectId:() => 'unused',
    makeArtifactId:(oldId) => `unused-${oldId}`,
    recomputeDerived:({comparisons}) => ({
      comparisons,memory:{pathHeadArtifactId:'g2',pathArtifactIds:['g1','g2'],locked:[],active:[],watch:[]},
      memoryReconciliation:'MEMORY VERIFIED'
    })
  });
  assert.equal(stagedPartial.project.id, 'p1', 'no conflict must retain imported identity');
  assert.equal(stagedPartial.recoveryStatus, 'partial');
  const partialG2 = stagedPartial.artifacts.find((row) => row.id === 'g2');
  assert.equal(partialG2.imageBlob, null);
  assert.equal(partialG2.persistenceStatus, 'meta_only');
  assert.ok(buildImportReport(stagedPartial).assetErrors.some((row) => row.path === corruptImagePath));

  // Task 7 RED — corrupt core bytes block before import staging can succeed.
  const corruptCoreDecoded = cloneDecoded(decoded);
  corruptCoreDecoded.entries.set('project.json', new TextEncoder().encode('{"schemaVersion":1,"id":"tampered"}'));
  await assert.rejects(() => stageImport({
    decoded:corruptCoreDecoded,migrator,existingProjectIds:new Set(),mode:'copy',
    makeProjectId:() => 'unused',makeArtifactId:(id) => id,
    recomputeDerived:() => ({memory:{},memoryReconciliation:'MEMORY VERIFIED'})
  }), /checksum|core|integrity/i);

  // Task 7 RED — forward schemas are rejected instead of guessed compatible.
  const forwardDecoded = cloneDecoded(decoded);
  forwardDecoded.manifest.schemaVersion = 2;
  await assert.rejects(() => stageImport({
    decoded:forwardDecoded,migrator,existingProjectIds:new Set(),mode:'copy',
    makeProjectId:() => 'unused',makeArtifactId:(id) => id,
    recomputeDerived:() => ({memory:{},memoryReconciliation:'MEMORY VERIFIED'})
  }), /newer|update|schema/i);

  // Task 7 RED — copy-of-copy must keep earliest project/artifact provenance.
  const copiedSourceArtifacts = [
    artifactBase('mid-g1', {
      projectId:'mid-project',rootArtifactId:'mid-g1',sourceIdentity:{sourceArtifactId:'origin-g1'},
      imageBlob:new Blob([Uint8Array.of(70,71,72)], {type:'image/png'})
    }),
    artifactBase('mid-g2', {
      projectId:'mid-project',parentArtifactId:'mid-g1',rootArtifactId:'mid-g1',generationIndex:2,
      sourceIdentity:{sourceArtifactId:'origin-g2'},imageBlob:new Blob([Uint8Array.of(73,74,75)], {type:'image/png'})
    })
  ];
  const copyOfCopyExport = await buildExportStage({
    project:{
      id:'mid-project',title:'Copied Once',createdAt:'2026-08-25T00:00:00.000Z',updatedAt:'2026-08-26T00:00:00.000Z',
      provenance:{sourceProjectId:'origin-project',importedFromPackageId:'older-package'}
    },
    runtimeArtifacts:copiedSourceArtifacts,
    persistedArtifacts:copiedSourceArtifacts,
    comparisons:[],
    memorySnapshot:{policyVersion:1,pathHeadArtifactId:'mid-g2',pathArtifactIds:['mid-g1','mid-g2'],locked:[],active:[],watch:[]}
  });
  const copyOfCopyDecoded = await decodeVdos(await encodeVdos({
    files:buildArchiveFiles(copyOfCopyExport),manifestBase:copyOfCopyExport.manifestBase
  }));
  const copiedAgain = await stageImport({
    decoded:copyOfCopyDecoded,migrator,existingProjectIds:new Set(['mid-project']),mode:'copy',
    makeProjectId:() => 'third-project',makeArtifactId:(id) => `third-${id}`,
    recomputeDerived:({comparisons}) => ({
      comparisons,memory:{pathHeadArtifactId:'mid-g2',pathArtifactIds:['mid-g1','mid-g2'],locked:[],active:[],watch:[]},
      memoryReconciliation:'MEMORY MIGRATED'
    })
  });
  assert.equal(copiedAgain.project.provenance.sourceProjectId, 'origin-project');
  assert.equal(copiedAgain.artifacts.find((row) => row.id === 'third-mid-g1').sourceIdentity.sourceArtifactId, 'origin-g1');
  assert.equal(copiedAgain.artifacts.find((row) => row.id === 'third-mid-g2').sourceIdentity.sourceArtifactId, 'origin-g2');

  console.log('project package tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
