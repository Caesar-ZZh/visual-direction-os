const assert = require('node:assert/strict');
const { sha256Hex } = require('./vdos-codec.js');
const {
  portableRequestV1,
  validateLineage,
  mergeRuntimeAndPersistedArtifacts,
  buildExportStage,
  buildExportReport,
  buildArchiveFiles
} = require('./project-package.js');

function jsonFile(files, path) {
  const file = files.find((row) => row.path === path);
  assert.ok(file, `missing archive file ${path}`);
  return JSON.parse(new TextDecoder().decode(file.bytes));
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

(async () => {
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

  const persistedBlob = new Blob([Uint8Array.of(1,2,3)], {type:'image/png'});
  const merged = mergeRuntimeAndPersistedArtifacts(
    [
      artifactBase('g2', {parentArtifactId:'g1',rootArtifactId:'g1',generationIndex:2,persistenceStatus:'not_persisted'}),
      artifactBase('g1', {request:{model:'agnes-image-2.1-flash',prompt:'RUNTIME',return_base64:true,extra_body:{response_format:'b64_json'}},imageBlob:null})
    ],
    [
      artifactBase('g1', {request:{model:'agnes-image-2.1-flash',prompt:'PERSISTED',return_base64:true,extra_body:{response_format:'b64_json'}},imageBlob:persistedBlob})
    ]
  );
  assert.deepEqual(merged.map((row) => row.id), ['g1','g2']);
  assert.equal(merged[0].request.prompt, 'RUNTIME', 'runtime metadata must win for duplicate artifact IDs');
  assert.equal(merged[0].imageBlob, persistedBlob, 'persisted Blob must be reused when runtime metadata lacks image bytes');
  assert.equal(merged[1].persistenceStatus, 'not_persisted');

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
      comparison:{summary:{stablePass:1}},
      sessionSecret:'session-secret'
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
  assert.equal(referenceFiles.length, 1, 'identical reference bytes must be stored once');
  const referenceHash = await sha256Hex(referenceBytes);
  assert.equal(referenceFiles[0].path, `references/${referenceHash}.png`);

  const g1Portable = jsonFile(files, 'artifacts/g1.json');
  const g2Portable = jsonFile(files, 'artifacts/g2.json');
  const g3Portable = jsonFile(files, 'artifacts/g3.json');
  const g4Portable = jsonFile(files, 'artifacts/g4.json');
  assert.equal(g1Portable.generation.references.length, 1);
  assert.equal(g2Portable.generation.references.length, 1);
  assert.equal(g1Portable.generation.references[0].path, referenceFiles[0].path);
  assert.equal(g2Portable.generation.references[0].path, referenceFiles[0].path);
  assert.equal(g1Portable.generation.references[0].role, 'character');
  assert.equal(g2Portable.generation.references[0].role, 'style');
  assert.deepEqual(g1Portable.generation.references[0].preserve, ['identity']);
  assert.deepEqual(g2Portable.generation.references[0].preserve, ['palette']);
  assert.equal(g3Portable.generation.references[0].status, 'remote_unavailable');
  assert.doesNotMatch(JSON.stringify(g3Portable), /\/private\/hero\.png|token=|#signed|session-secret/);
  assert.equal(g4Portable.image.status, 'meta_only');

  assert.ok(files.some((row) => row.path === 'project.json' && row.role === 'core'));
  assert.ok(files.some((row) => row.path === 'lineage.json' && row.role === 'core'));
  assert.ok(files.some((row) => row.path === 'comparisons.json' && row.role === 'core'));
  assert.ok(files.some((row) => row.path === 'memory.json' && row.role === 'core'));
  assert.equal(files.filter((row) => row.path.startsWith('images/')).length, 3, 'not_persisted metadata-only artifact must not invent image bytes');

  const lineage = jsonFile(files, 'lineage.json');
  assert.deepEqual(lineage.roots, ['g1']);
  assert.deepEqual(lineage.nodes.map((row) => [row.artifactId,row.parentArtifactId,row.rootArtifactId]), [
    ['g1',null,'g1'],['g2','g1','g1'],['g3','g2','g1'],['g4','g3','g1']
  ]);

  const allJson = files
    .filter((row) => row.path.endsWith('.json'))
    .map((row) => new TextDecoder().decode(row.bytes))
    .join('\n');
  assert.doesNotMatch(allJson, /Bearer/);
  assert.doesNotMatch(allJson, /VDOS_PROXY_TOKEN/);
  assert.doesNotMatch(allJson, /session-secret/);
  assert.doesNotMatch(allJson, /injected-secret/);
  assert.doesNotMatch(allJson, /proxy-secret/);
  assert.doesNotMatch(allJson, /drop-me|drop-extra-secret/);
  assert.doesNotMatch(allJson, /blob:runtime-object-url/);

  console.log('project package tests passed');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
