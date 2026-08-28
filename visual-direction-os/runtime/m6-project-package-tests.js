const assert=require('node:assert/strict');
const pkg=require('./m6-project-package.js');
const codec=require('./vdos-codec.js');
const migrations=require('./schema-migrations.js');
const fingerprint=require('./runtime-fingerprint.js');

function artifact({id,shotId,parentArtifactId=null,rootArtifactId=id,generationIndex=1,continuityProvenance=null}){
  return {
    id,projectId:'p1',sequenceId:'q1',shotId,rootArtifactId,parentArtifactId,generationIndex,createdAt:`2026-08-28T00:0${generationIndex}:00.000Z`,
    provider:'agnes-image-2.1-flash',request:{model:'agnes-image-2.1-flash',prompt:`PROMPT ${id}`,size:'1K',ratio:'16:9',extra_body:{response_format:'url'}},baseRequest:{model:'agnes-image-2.1-flash',prompt:'BASE',size:'1K',ratio:'16:9',extra_body:{response_format:'url'}},result:{kind:'url',src:null},visualIR:null,measurements:null,evaluation:null,humanJudgments:{},iterationDelta:null,evaluationDelta:null,continuityProvenance,
    imageBlob:new Blob([`image-${id}`],{type:'image/webp'}),imageMimeType:'image/webp',persistenceStatus:'persisted'
  };
}
function decodeJson(bytes){return JSON.parse(new TextDecoder().decode(bytes));}
function legacyCoreFile(file){
  if(file.role!=='core'||!file.path.endsWith('.json')) return file;
  const value=decodeJson(file.bytes);
  if(file.path==='project.json'){
    value.schemaVersion=1;delete value.activeSequenceId;delete value.activeShotId;
    if(value.stats){delete value.stats.sequenceCount;delete value.stats.shotCount;}
  }else if(file.path.startsWith('artifacts/')){
    value.schemaVersion=1;delete value.sequenceId;delete value.shotId;delete value.continuityProvenance;
  }else if(file.path==='comparisons.json'){
    value.schemaVersion=1;value.comparisons=(value.comparisons||[]).map((row)=>{const next={...row};delete next.sequenceId;delete next.shotId;return next;});
  }else value.schemaVersion=1;
  return {...file,bytes:codec.stableJsonBytes(value)};
}

(async()=>{
  const project={id:'p1',title:'Sequence Project',createdAt:'2026-08-28T00:00:00.000Z',updatedAt:'2026-08-28T01:00:00.000Z',activeSequenceId:'q1',activeShotId:'s2'};
  const sequences=[{id:'q1',projectId:'p1',order:1,title:'Sequence 01',intent:'Move from isolation toward action.',createdAt:project.createdAt,updatedAt:project.updatedAt}];
  const shots=[
    {id:'s1',projectId:'p1',sequenceId:'q1',order:1,title:'Establishing',intent:'Establish the rooftop.',approvedArtifactId:'g1',continuityMode:'auto',continuitySourceShotId:null,continuityReview:null,continuityInvalidation:null,createdAt:project.createdAt,updatedAt:project.updatedAt},
    {id:'s2',projectId:'p1',sequenceId:'q1',order:2,title:'Reaction',intent:'Move to reaction.',approvedArtifactId:'h2',continuityMode:'auto',continuitySourceShotId:null,continuityReview:{status:'accepted',reviewedArtifactId:'h2',sourceArtifactId:'g1',reviewedAt:project.updatedAt,note:''},continuityInvalidation:null,createdAt:project.createdAt,updatedAt:project.updatedAt}
  ];
  const artifacts=[
    artifact({id:'g1',shotId:'s1'}),
    artifact({id:'h1',shotId:'s2',continuityProvenance:{sourceShotId:'s1',sourceArtifactId:'g1',status:'resolved'}}),
    artifact({id:'h2',shotId:'s2',parentArtifactId:'h1',rootArtifactId:'h1',generationIndex:2,continuityProvenance:{sourceShotId:'deleted-shot',sourceArtifactId:'deleted-artifact',status:'resolved'}})
  ];
  const comparisons=[{id:'h1::h2',projectId:'p1',sequenceId:'q1',shotId:'s2',artifactAId:'h1',artifactBId:'h2',directorJudgments:{},comparison:null,updatedAt:project.updatedAt}];
  const memorySnapshot={pathHeadArtifactId:'h2',pathArtifactIds:['h1','h2'],locked:[],active:[],watch:[]};

  const stage=await pkg.buildExportStage({project,sequences,shots,runtimeArtifacts:artifacts,persistedArtifacts:artifacts,comparisons,memorySnapshot});
  assert.equal(stage.schemaVersion,2);
  assert.equal(stage.sequences.length,1);
  assert.equal(stage.shots.length,2);
  assert.equal(stage.project.activeShotId,'s2');
  assert.equal(stage.artifacts.find((a)=>a.id==='h1').continuityProvenance.sourceArtifactId,'g1');
  assert.equal(stage.artifacts.find((a)=>a.id==='h2').continuityProvenance.sourceArtifactId,'deleted-artifact');
  const files=pkg.buildArchiveFiles(stage);
  assert.ok(files.some((f)=>f.path==='sequences.json'&&f.role==='core'));
  assert.ok(files.some((f)=>f.path==='shots.json'&&f.role==='core'));

  const bytes=await codec.encodeVdos({files,manifestBase:stage.manifestBase});
  const decoded=await codec.decodeVdos(bytes);
  const integrity=await codec.verifyManifestFiles(decoded);
  assert.deepEqual(integrity.coreErrors,[]);
  assert.deepEqual(integrity.assetErrors,[]);
  const migrator=migrations.createSchemaMigrator({currentVersion:fingerprint.VDOS_SCHEMA_VERSION,migrations:migrations.VDOS_SCHEMA_MIGRATIONS});
  const recomputeDerived=async({comparisons:rows,memorySnapshot:snapshot})=>({comparisons:rows,memory:snapshot,memoryReconciliation:'MEMORY VERIFIED'});
  const imported=await pkg.stageImport({decoded,migrator,existingProjectIds:new Set(),mode:'copy',recomputeDerived});
  assert.equal(imported.project.id,'p1');
  assert.equal(imported.project.activeShotId,'s2');
  assert.deepEqual(imported.shots.map((s)=>s.id),['s1','s2']);
  assert.equal(imported.artifacts.find((a)=>a.id==='h1').continuityProvenance.sourceArtifactId,'g1');
  assert.equal(imported.artifacts.find((a)=>a.id==='h2').continuityProvenance.sourceArtifactId,'deleted-artifact','dangling historical provenance remains valid');
  assert.equal(imported.shots.find((s)=>s.id==='s2').approvedArtifactId,'h2');

  const copied=await pkg.stageImport({
    decoded,migrator,existingProjectIds:new Set(['p1']),mode:'copy',recomputeDerived,
    makeProjectId:()=> 'p-copy',makeSequenceId:(id)=>`copy-${id}`,makeShotId:(id)=>`copy-${id}`,makeArtifactId:(id)=>`copy-${id}`
  });
  assert.equal(copied.project.id,'p-copy');
  assert.equal(copied.project.activeSequenceId,'copy-q1');
  assert.equal(copied.project.activeShotId,'copy-s2');
  assert.equal(copied.shots.find((s)=>s.id==='copy-s2').approvedArtifactId,'copy-h2');
  assert.equal(copied.artifacts.find((a)=>a.id==='copy-h1').continuityProvenance.sourceShotId,'copy-s1');
  const copiedDangling=copied.artifacts.find((a)=>a.id==='copy-h2').continuityProvenance;
  assert.equal(copiedDangling.sourceShotId,'copy-deleted-shot');
  assert.equal(copiedDangling.sourceArtifactId,'copy-deleted-artifact');
  assert.equal(copied.shots.find((s)=>s.id==='copy-s2').continuityReview.reviewedArtifactId,'copy-h2');
  assert.equal(copied.shots.find((s)=>s.id==='copy-s2').continuityReview.sourceArtifactId,'copy-g1');

  // A real schema-v1 archive has no Sequence/Shot core files and no M6 fields.
  const legacyFiles=files.filter((file)=>file.path!=='sequences.json'&&file.path!=='shots.json').map(legacyCoreFile);
  const legacyManifest={...stage.manifestBase,schemaVersion:1,createdWith:{...(stage.manifestBase.createdWith||{}),appVersion:'2.0-m5'},project:{id:'p1',title:'Sequence Project'}};
  const legacyBytes=await codec.encodeVdos({files:legacyFiles,manifestBase:legacyManifest});
  const legacyDecoded=await codec.decodeVdos(legacyBytes);
  const legacyImported=await pkg.stageImport({decoded:legacyDecoded,migrator,existingProjectIds:new Set(),mode:'replace',recomputeDerived});
  const expectedLegacySequence=migrations.legacySequenceId('p1');
  const expectedLegacyShot=migrations.legacyShotId('p1');
  assert.equal(legacyImported.importAudit.migrations.includes('1→2'),true);
  assert.deepEqual(legacyImported.sequences.map((row)=>row.id),[expectedLegacySequence]);
  assert.deepEqual(legacyImported.shots.map((row)=>row.id),[expectedLegacyShot]);
  assert.equal(legacyImported.shots[0].approvedArtifactId,null,'legacy migration must never auto-approve');
  assert.equal(legacyImported.project.activeSequenceId,expectedLegacySequence);
  assert.equal(legacyImported.project.activeShotId,expectedLegacyShot);
  assert.equal(legacyImported.artifacts.every((row)=>row.sequenceId===expectedLegacySequence&&row.shotId===expectedLegacyShot),true);
  assert.equal(legacyImported.artifacts.every((row)=>row.continuityProvenance==null),true);
  assert.equal(legacyImported.artifacts.find((row)=>row.id==='h2').parentArtifactId,'h1','legacy generation lineage must remain unchanged');

  const degraded=await codec.decodeVdos(bytes);
  const g1Image=degraded.manifest.files.find((row)=>row.role==='asset'&&row.path.startsWith('images/g1.'));
  degraded.entries.delete(g1Image.path);
  const degradedImport=await pkg.stageImport({decoded:degraded,migrator,existingProjectIds:new Set(),mode:'replace',recomputeDerived});
  assert.equal(degradedImport.shots.find((s)=>s.id==='s1').approvedArtifactId,'g1','Approved identity survives image asset loss');
  assert.equal(degradedImport.artifacts.find((a)=>a.id==='g1').persistenceStatus,'meta_only');
  assert.equal(degradedImport.recoveryStatus,'partial');

  assert.throws(()=>pkg.validateM6Structure({project,sequences,shots,artifacts:[{...artifacts[1],parentArtifactId:'g1',rootArtifactId:'g1'}],comparisons:[]}),/parent|root|Shot/i);
  console.log('m6 project package tests passed');
})().catch((error)=>{console.error(error);process.exit(1);});