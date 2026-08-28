(function attachM6ProjectPackage(root,factory){
  const deps=typeof module!=='undefined'&&module.exports
    ? Object.assign({},require('./project-package.js'),require('./vdos-codec.js'),require('./runtime-fingerprint.js'),require('./schema-migrations.js'))
    : (root?.VisualDirectionRuntime||{});
  const api=factory(root,deps);
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(root) root.VisualDirectionRuntime=Object.assign(root.VisualDirectionRuntime||{},api);
})(typeof globalThis!=='undefined'?globalThis:this,function m6ProjectPackageFactory(root,deps){
  'use strict';

  const baseBuildExportStage=deps.buildExportStage;
  const baseBuildArchiveFiles=deps.buildArchiveFiles;
  const baseStageImport=deps.stageImport;
  const baseBuildExportReport=deps.buildExportReport;
  const baseBuildImportReport=deps.buildImportReport;
  const stableJsonBytes=deps.stableJsonBytes;
  const clone=(value)=>value==null?value:(typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value)));

  function jsonEntry(decoded,path){
    const bytes=decoded?.entries?.get(path); if(!bytes) throw new Error(`VDOS core file is missing: ${path}`);
    try{return JSON.parse(new TextDecoder().decode(bytes));}catch(error){throw new Error(`Invalid VDOS core JSON ${path}: ${error?.message||error}`);}
  }
  function structuralArray(file,key){ const rows=Array.isArray(file)?file:file?.[key]; if(!Array.isArray(rows)) throw new Error(`${key}.json must contain a ${key} array`); return rows; }
  function artifactMetadata(decoded){
    const map=new Map();
    for(const row of decoded?.manifest?.files||[]){
      if(row?.role!=='core'||!String(row.path||'').startsWith('artifacts/')||!String(row.path).endsWith('.json')) continue;
      const value=jsonEntry(decoded,row.path); map.set(String(value.id),value);
    }
    return map;
  }
  function sourceRows(runtimeArtifacts=[],persistedArtifacts=[]){
    const map=new Map(); for(const row of persistedArtifacts||[]) if(row?.id) map.set(String(row.id),row); for(const row of runtimeArtifacts||[]) if(row?.id) map.set(String(row.id),{...(map.get(String(row.id))||{}),...row}); return map;
  }

  function validateM6Structure({project,sequences=[],shots=[],artifacts=[],comparisons=[]}={}){
    if(!project?.id) throw new Error('M6 portable validation requires project identity');
    const projectId=String(project.id); const seq=new Map(); const shot=new Map(); const art=new Map();
    for(const row of sequences){ if(!row?.id||String(row.projectId)!==projectId) throw new Error(`Sequence ${row?.id||'?'} belongs to a different Project`); if(seq.has(String(row.id))) throw new Error(`Duplicate Sequence ${row.id}`); seq.set(String(row.id),row); }
    for(const row of shots){ if(!row?.id||String(row.projectId)!==projectId) throw new Error(`Shot ${row?.id||'?'} belongs to a different Project`); if(!seq.has(String(row.sequenceId))) throw new Error(`Shot ${row.id} references an unknown Sequence`); if(shot.has(String(row.id))) throw new Error(`Duplicate Shot ${row.id}`); shot.set(String(row.id),row); }
    for(const row of artifacts){ const s=shot.get(String(row.shotId)); if(!row?.id||String(row.projectId)!==projectId||!s||String(row.sequenceId)!==String(s.sequenceId)) throw new Error(`Artifact ${row?.id||'?'} does not belong to a valid Shot`); if(art.has(String(row.id))) throw new Error(`Duplicate Artifact ${row.id}`); art.set(String(row.id),row); }
    for(const row of artifacts){
      const parent=row.parentArtifactId==null?null:art.get(String(row.parentArtifactId)); const rootArtifact=art.get(String(row.rootArtifactId));
      if(row.parentArtifactId!=null&&(!parent||String(parent.shotId)!==String(row.shotId))) throw new Error(`Artifact ${row.id} parent must stay in the same Shot`);
      if(!rootArtifact||String(rootArtifact.shotId)!==String(row.shotId)) throw new Error(`Artifact ${row.id} root must stay in the same Shot`);
      const provenance=row.continuityProvenance;
      if(provenance?.sourceArtifactId&&art.has(String(provenance.sourceArtifactId))&&provenance.sourceShotId&&shot.has(String(provenance.sourceShotId))){
        if(String(art.get(String(provenance.sourceArtifactId)).shotId)!==String(provenance.sourceShotId)) throw new Error(`Artifact ${row.id} continuity provenance source mismatch`);
      }
    }
    for(const row of shots){
      if(row.approvedArtifactId!=null){const approved=art.get(String(row.approvedArtifactId));if(!approved||String(approved.shotId)!==String(row.id)) throw new Error(`Approved Artifact for Shot ${row.id} must belong to the same Shot`);}
      if(row.continuityMode==='manual'&&row.continuitySourceShotId!=null&&shot.has(String(row.continuitySourceShotId))){const source=shot.get(String(row.continuitySourceShotId));if(String(source.sequenceId)!==String(row.sequenceId)) throw new Error(`Manual continuity source for Shot ${row.id} must stay in the same Sequence`);}
    }
    for(const row of comparisons){const a=art.get(String(row.artifactAId));const b=art.get(String(row.artifactBId));if(!a||!b||String(a.shotId)!==String(b.shotId)) throw new Error(`Comparison ${row.id} must stay in the same Shot`);if(row.shotId&&String(row.shotId)!==String(a.shotId)) throw new Error(`Comparison ${row.id} Shot mismatch`);}
    return true;
  }

  async function buildExportStage(input={}){
    if(typeof baseBuildExportStage!=='function') throw new Error('M6 package layer requires M5 buildExportStage');
    const sequences=clone(input.sequences||[]); const shots=clone(input.shots||[]);
    const sources=sourceRows(input.runtimeArtifacts,input.persistedArtifacts);
    const stage=await baseBuildExportStage(input);
    stage.sequences=sequences.map((row)=>({...clone(row),schemaVersion:2,projectId:String(input.project.id)}));
    stage.shots=shots.map((row)=>({...clone(row),schemaVersion:2,projectId:String(input.project.id)}));
    stage.project={...stage.project,activeSequenceId:input.project.activeSequenceId||null,activeShotId:input.project.activeShotId||null,stats:{...(stage.project.stats||{}),sequenceCount:stage.sequences.length,shotCount:stage.shots.length}};
    stage.artifacts=stage.artifacts.map((portable)=>{const source=sources.get(String(portable.id))||{};return {...portable,sequenceId:String(source.sequenceId||''),shotId:String(source.shotId||''),continuityProvenance:clone(source.continuityProvenance||null)};});
    const comparisonSource=new Map((input.comparisons||[]).map((row)=>[String(row.id),row]));
    stage.comparisons={...stage.comparisons,comparisons:(stage.comparisons.comparisons||[]).map((row)=>{const source=comparisonSource.get(String(row.id))||{};const a=sources.get(String(row.artifactAId))||{};return {...row,sequenceId:String(source.sequenceId||a.sequenceId||''),shotId:String(source.shotId||a.shotId||'')};})};
    validateM6Structure({project:stage.project,sequences:stage.sequences,shots:stage.shots,artifacts:stage.artifacts,comparisons:stage.comparisons.comparisons});
    return stage;
  }

  function buildArchiveFiles(stage){
    if(typeof baseBuildArchiveFiles!=='function'||typeof stableJsonBytes!=='function') throw new Error('M6 package layer requires M5 archive support');
    validateM6Structure({project:stage.project,sequences:stage.sequences,shots:stage.shots,artifacts:stage.artifacts,comparisons:stage.comparisons?.comparisons||[]});
    const files=baseBuildArchiveFiles(stage);
    files.push({path:'sequences.json',role:'core',bytes:stableJsonBytes({schemaVersion:2,projectId:stage.project.id,sequences:stage.sequences})});
    files.push({path:'shots.json',role:'core',bytes:stableJsonBytes({schemaVersion:2,projectId:stage.project.id,shots:stage.shots})});
    return files;
  }

  function identityFactory(factory,prefix){return (oldId)=>{const value=typeof factory==='function'?factory(oldId):`${prefix}-${String(oldId)}`;if(!String(value||'').trim()) throw new Error(`Invalid ${prefix} identity`);return String(value);};}
  function remapNested(value,maps){
    if(Array.isArray(value)) return value.map((item)=>remapNested(item,maps));
    if(!value||typeof value!=='object') return value;
    const out={};
    const artifactKeys=new Set(['approvedArtifactId','reviewedArtifactId','sourceArtifactId','previousArtifactId','currentArtifactId']);
    const shotKeys=new Set(['continuitySourceShotId','sourceShotId','causedByShotId','previousSourceShotId','currentSourceShotId']);
    for(const [key,item] of Object.entries(value)){
      if(item!=null&&artifactKeys.has(key)) out[key]=maps.artifact(String(item));
      else if(item!=null&&shotKeys.has(key)) out[key]=maps.shot(String(item));
      else out[key]=remapNested(item,maps);
    }
    return out;
  }

  async function stageImport(args={}){
    if(typeof baseStageImport!=='function') throw new Error('M6 package layer requires M5 stageImport');
    const sourceSchema=Number(args.decoded?.manifest?.schemaVersion||0); const metadata=artifactMetadata(args.decoded);
    const baseArgs={...args,migrations:undefined};
    const staged=await baseStageImport(baseArgs);
    const oldProject=jsonEntry(args.decoded,'project.json'); const oldProjectId=String(oldProject.id); const newProjectId=String(staged.project.id);
    let sequences; let shots;
    if(sourceSchema>=2){
      if(!args.decoded.entries.has('sequences.json')||!args.decoded.entries.has('shots.json')) throw new Error('VDOS schema v2 requires sequences.json and shots.json');
      sequences=structuralArray(jsonEntry(args.decoded,'sequences.json'),'sequences');
      shots=structuralArray(jsonEntry(args.decoded,'shots.json'),'shots');
    }else{
      const sequenceId=deps.legacySequenceId?deps.legacySequenceId(oldProjectId):`sequence-legacy-${encodeURIComponent(oldProjectId)}`;
      const shotId=deps.legacyShotId?deps.legacyShotId(oldProjectId):`shot-legacy-${encodeURIComponent(oldProjectId)}`;
      sequences=[{id:sequenceId,projectId:oldProjectId,order:1,title:'Sequence 01',intent:'',createdAt:oldProject.createdAt||null,updatedAt:oldProject.updatedAt||null}];
      shots=[{id:shotId,projectId:oldProjectId,sequenceId,order:1,title:'Shot 01',intent:'',approvedArtifactId:null,continuityMode:'auto',continuitySourceShotId:null,continuityReview:null,continuityInvalidation:null,createdAt:oldProject.createdAt||null,updatedAt:oldProject.updatedAt||null}];
      for(const [id,row] of metadata) metadata.set(id,{...row,sequenceId,shotId,continuityProvenance:null});
    }

    const copied=newProjectId!==oldProjectId;
    const makeSequence=identityFactory(args.makeSequenceId,'sequence-copy'); const makeShot=identityFactory(args.makeShotId,'shot-copy'); const makeArtifact=identityFactory(args.makeArtifactId,'artifact-copy');
    const seqMap=new Map(); const shotMap=new Map(); const artifactMap=new Map();
    for(const row of sequences) seqMap.set(String(row.id),copied?makeSequence(String(row.id)):String(row.id));
    for(const row of shots) shotMap.set(String(row.id),copied?makeShot(String(row.id)):String(row.id));
    for(const artifact of staged.artifacts||[]){const sourceId=String(artifact.sourceIdentity?.sourceArtifactId||artifact.id);artifactMap.set(sourceId,String(artifact.id));}
    const mappedArtifactIds=new Set(artifactMap.values());
    const mapArtifact=(id)=>{if(artifactMap.has(id))return artifactMap.get(id);if(!copied)return id;let next=makeArtifact(id);let suffix=1;while(mappedArtifactIds.has(next))next=`${makeArtifact(id)}-${suffix++}`;mappedArtifactIds.add(next);artifactMap.set(id,next);return next;};
    const mappedShotIds=new Set(shotMap.values());
    const mapShot=(id)=>{if(shotMap.has(id))return shotMap.get(id);if(!copied)return id;let next=makeShot(id);let suffix=1;while(mappedShotIds.has(next))next=`${makeShot(id)}-${suffix++}`;mappedShotIds.add(next);shotMap.set(id,next);return next;};
    const maps={artifact:mapArtifact,shot:mapShot};

    const runtimeBySource=new Map((staged.artifacts||[]).map((row)=>[String(row.sourceIdentity?.sourceArtifactId||row.id),row]));
    staged.artifacts=(staged.artifacts||[]).map((row)=>{
      const sourceId=String(row.sourceIdentity?.sourceArtifactId||row.id); const meta=metadata.get(sourceId)||{}; const oldShot=String(meta.shotId||shots[0]?.id||''); const oldSeq=String(meta.sequenceId||shots.find((s)=>String(s.id)===oldShot)?.sequenceId||sequences[0]?.id||'');
      return {...row,projectId:newProjectId,sequenceId:seqMap.get(oldSeq)||oldSeq,shotId:mapShot(oldShot),continuityProvenance:remapNested(clone(meta.continuityProvenance||null),maps)};
    });
    staged.sequences=sequences.map((row)=>({...clone(row),schemaVersion:2,id:seqMap.get(String(row.id))||String(row.id),projectId:newProjectId}));
    staged.shots=shots.map((row)=>{const remapped=remapNested(clone(row),maps);return {...remapped,schemaVersion:2,id:mapShot(String(row.id)),projectId:newProjectId,sequenceId:seqMap.get(String(row.sequenceId))||String(row.sequenceId),approvedArtifactId:row.approvedArtifactId==null?null:mapArtifact(String(row.approvedArtifactId))};});
    staged.comparisons=(staged.comparisons||[]).map((row)=>{const a=staged.artifacts.find((x)=>String(x.id)===String(row.artifactAId));return {...row,projectId:newProjectId,sequenceId:a?.sequenceId||'',shotId:a?.shotId||''};});
    staged.project={...staged.project,schemaVersion:2,activeSequenceId:oldProject.activeSequenceId?(seqMap.get(String(oldProject.activeSequenceId))||String(oldProject.activeSequenceId)):staged.sequences[0]?.id||null,activeShotId:oldProject.activeShotId?mapShot(String(oldProject.activeShotId)):staged.shots[0]?.id||null};
    validateM6Structure({project:staged.project,sequences:staged.sequences,shots:staged.shots,artifacts:staged.artifacts,comparisons:staged.comparisons});
    staged.idMap={...(staged.idMap||{}),sequences:Object.fromEntries(seqMap),shots:Object.fromEntries(shotMap),artifacts:Object.fromEntries(artifactMap)};
    return staged;
  }

  function buildExportReport(stage){const report=typeof baseBuildExportReport==='function'?baseBuildExportReport(stage):{};return {...report,sequenceCount:stage?.sequences?.length||0,shotCount:stage?.shots?.length||0};}
  function buildImportReport(stage){const report=typeof baseBuildImportReport==='function'?baseBuildImportReport(stage):{};return {...report,sequenceCount:stage?.sequences?.length||0,shotCount:stage?.shots?.length||0};}

  return {buildExportStage,buildArchiveFiles,stageImport,buildExportReport,buildImportReport,validateM6Structure};
});