(function attachM6ProjectPackageUi(root,factory){
  const api=factory(root);
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(root){root.VisualDirectionRuntime=Object.assign(root.VisualDirectionRuntime||{},api);if(root.document)Promise.resolve().then(()=>api.mountM6ProjectPackageUi(root)).catch((error)=>console.error('[Visual Direction OS M6] Project workspace unavailable:',error));}
})(typeof globalThis!=='undefined'?globalThis:this,function m6ProjectPackageUiFactory(root){
  'use strict';
  const clone=(value)=>value==null?value:(typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value)));
  const makeId=(prefix,oldId='')=>{const uuid=root?.crypto?.randomUUID?.();return uuid?`${prefix}-${uuid}`:`${prefix}-${String(oldId||Date.now()).replace(/[^A-Za-z0-9_.-]/g,'-')}-${Math.random().toString(36).slice(2,8)}`;};
  const packageFilename=(project)=>`${String(project?.title||'Visual-Direction-Project').trim().replace(/[\\/:*?"<>|\u0000-\u001f]/g,'-').slice(0,120)||'Visual-Direction-Project'}.vdos`;
  async function toBytes(input){if(input instanceof Uint8Array)return input;if(input instanceof ArrayBuffer)return new Uint8Array(input);if(ArrayBuffer.isView(input))return new Uint8Array(input.buffer,input.byteOffset,input.byteLength);if(input&&typeof input.arrayBuffer==='function')return new Uint8Array(await input.arrayBuffer());throw new Error('Import requires .vdos bytes or a File/Blob');}

  function createDerivedReconciler({compareArtifacts,deriveMemoryForPath}={}){
    return async({artifacts=[],comparisons=[],memorySnapshot=null}={})=>{
      if(typeof compareArtifacts!=='function'||typeof deriveMemoryForPath!=='function')return{comparisons:clone(comparisons),memory:clone(memorySnapshot||{pathArtifactIds:[],locked:[],active:[],watch:[]}),memoryReconciliation:'MEMORY VERIFIED'};
      const byId=new Map(artifacts.map((a)=>[a.id,a]));
      const current=comparisons.map((row)=>{const a=byId.get(row.artifactAId),b=byId.get(row.artifactBId);return a?.evaluation&&b?.evaluation?{...clone(row),comparison:compareArtifacts({artifactA:a,artifactB:b,directorJudgments:clone(row.directorJudgments||{})})}:clone(row);});
      const headId=memorySnapshot?.pathHeadArtifactId||memorySnapshot?.pathArtifactIds?.at?.(-1)||artifacts.slice().sort((a,b)=>(Number(a.generationIndex)||0)-(Number(b.generationIndex)||0)).at(-1)?.id||null;
      const memory=headId?deriveMemoryForPath({artifacts,comparisons:current,pathHeadId:headId,semanticLocks:{}}):{pathArtifactIds:[],locked:[],active:[],watch:[]};
      return{comparisons:current,memory:{...clone(memory),pathHeadArtifactId:headId},memoryReconciliation:'MEMORY MIGRATED'};
    };
  }

  function createM6ProjectPackageWorkspace({memory,library,director,m4,packageRuntime={},migrator=null,recomputeDerived=null}={}){
    if(!memory||typeof memory.loadProjectBundle!=='function'||typeof memory.commitProjectBundle!=='function')throw new Error('M6 package workspace requires atomic Director Memory bundles');
    if(!library||typeof library.getActiveProjectId!=='function')throw new Error('M6 package workspace requires Project Library');
    if(!director||typeof director.openProject!=='function')throw new Error('M6 package workspace requires Sequence Director project switching');
    for(const method of ['buildExportStage','buildExportReport','buildArchiveFiles','encodeVdos','decodeVdos','stageImport','buildImportReport'])if(typeof packageRuntime[method]!=='function')throw new Error(`M6 package workspace requires ${method}()`);

    async function open(id){await library.open(id);return director.openProject(id);}
    async function newProject(title){const project=await library.newProject(title);await director.openProject(project.id);return project;}
    async function rename(id,title){const project=await library.rename(id,title);if(library.getActiveProjectId()===id)await director.openProject(id);return project;}
    async function deleteProject(id){const result=await library.delete(id);if(result.activeProject?.id)await director.openProject(result.activeProject.id);return result;}

    async function exportProject({allowIncomplete=false}={}){
      const activeId=library.getActiveProjectId();if(!activeId)throw new Error('No active project is available for export');
      const persisted=await memory.loadProjectBundle(activeId);if(!persisted?.project)throw new Error('Active project bundle is unavailable');
      const live=m4?.getState?.()||null;
      const liveById=new Map((live?.artifacts||[]).map((row)=>[row.id,row]));
      const runtimeArtifacts=(persisted.artifacts||[]).map((row)=>row.shotId===live?.activeShotId&&liveById.has(row.id)?{...row,...clone(liveById.get(row.id)),imageBlob:liveById.get(row.id).imageBlob??row.imageBlob}:row);
      for(const row of live?.artifacts||[])if(!runtimeArtifacts.some((candidate)=>candidate.id===row.id))runtimeArtifacts.push(clone(row));
      const liveComparisonById=new Map((live?.comparisons||[]).map((row)=>[row.id,row]));
      const comparisons=(persisted.comparisons||[]).map((row)=>row.shotId===live?.activeShotId&&liveComparisonById.has(row.id)?clone(liveComparisonById.get(row.id)):row);
      for(const row of live?.comparisons||[])if(!comparisons.some((candidate)=>candidate.id===row.id))comparisons.push(clone(row));
      const memorySnapshot=m4?.getExportSnapshot?.()?.memorySnapshot||null;
      const stage=await packageRuntime.buildExportStage({project:persisted.project,sequences:persisted.sequences||[],shots:persisted.shots||[],runtimeArtifacts,persistedArtifacts:persisted.artifacts||[],comparisons,memorySnapshot});
      const report=packageRuntime.buildExportReport(stage);if(report.packageCompleteness==='partial'&&!allowIncomplete)return{status:'preflight',report,stage};
      const files=packageRuntime.buildArchiveFiles(stage);const bytes=await packageRuntime.encodeVdos({files,manifestBase:stage.manifestBase});return{status:'exported',bytes,filename:packageFilename(persisted.project),report,stage};
    }

    async function importProject(input,{mode='copy',replaceProjectId=null}={}){
      const bytes=await toBytes(input);const decoded=await packageRuntime.decodeVdos(bytes);const projects=await library.list();
      const activeMigrator=migrator||packageRuntime.createSchemaMigrator?.({currentVersion:packageRuntime.VDOS_SCHEMA_VERSION||2,migrations:packageRuntime.VDOS_SCHEMA_MIGRATIONS});if(!activeMigrator)throw new Error('M6 package import requires schema migration support');
      const derived=recomputeDerived||createDerivedReconciler({compareArtifacts:packageRuntime.compareArtifacts,deriveMemoryForPath:packageRuntime.deriveMemoryForPath});
      const staged=await packageRuntime.stageImport({decoded,migrator:activeMigrator,existingProjectIds:new Set(projects.map((p)=>p.id)),mode,makeProjectId:(id)=>makeId('project',id),makeSequenceId:(id)=>makeId('sequence',id),makeShotId:(id)=>makeId('shot',id),makeArtifactId:(id)=>makeId('gen',id),recomputeDerived:derived});
      const selectedMode=String(mode||'copy').toLowerCase();
      const commit=await memory.commitProjectBundle({mode:selectedMode,replaceProjectId:selectedMode==='replace'?(replaceProjectId||staged.project.id):null,project:staged.project,sequences:staged.sequences||[],shots:staged.shots||[],artifacts:staged.artifacts||[],comparisons:staged.comparisons||[]});
      await library.open(staged.project.id);await director.openProject(staged.project.id);return{status:'imported',staged,report:packageRuntime.buildImportReport(staged),commit,activeProjectId:staged.project.id};
    }
    return{list:()=>library.list(),open,new:newProject,rename,delete:deleteProject,export:exportProject,import:importProject};
  }

  function download(browserRoot,result){const blob=new Blob([result.bytes],{type:'application/zip'});const url=browserRoot.URL.createObjectURL(blob);const a=browserRoot.document.createElement('a');a.href=url;a.download=result.filename;a.hidden=true;browserRoot.document.body.append(a);a.click();a.remove();browserRoot.setTimeout(()=>browserRoot.URL.revokeObjectURL(url),0);}
  async function mountM6ProjectPackageUi(browserRoot=root){
    const runtime=browserRoot?.VisualDirectionRuntime||{};const director=browserRoot?.VisualDirectionOS?.m6;const m4=browserRoot?.VisualDirectionOS?.m4;if(!browserRoot?.document||!director)throw new Error('M6 Project workspace requires Sequence Director');
    const memory=runtime.createDirectorMemory({store:runtime.createIndexedDbStore(browserRoot)});const library=runtime.createProjectLibrary({memory,preferences:browserRoot.localStorage});await library.boot();
    const workspace=createM6ProjectPackageWorkspace({memory,library,director,m4,packageRuntime:runtime,migrator:runtime.createSchemaMigrator({currentVersion:runtime.VDOS_SCHEMA_VERSION||2,migrations:runtime.VDOS_SCHEMA_MIGRATIONS}),recomputeDerived:createDerivedReconciler({compareArtifacts:runtime.compareArtifacts,deriveMemoryForPath:runtime.deriveMemoryForPath})});browserRoot.VisualDirectionOS=Object.assign(browserRoot.VisualDirectionOS||{},{projects:workspace});
    const rail=browserRoot.document.querySelector('.system-rail');if(!rail)return workspace;rail.querySelector('.vdos-project-panel')?.remove();const panel=browserRoot.document.createElement('section');panel.className='vdos-project-panel';panel.innerHTML='<div class="vdos-project-kicker">PROJECT / M6</div><button type="button" class="vdos-project-current" data-a="open"><span>Project</span><b>▾</b></button><div class="vdos-project-actions"><button data-a="new">New</button><button data-a="open">Open</button><button data-a="rename">Rename</button><button data-a="export">Export .vdos</button><button data-a="import">Import .vdos</button><button data-a="delete" class="is-destructive">Delete</button></div><input class="vdos-project-file" type="file" accept=".vdos,application/zip" hidden><div class="vdos-project-report" role="status" hidden></div>';rail.append(panel);
    const current=panel.querySelector('.vdos-project-current span'),file=panel.querySelector('.vdos-project-file'),report=panel.querySelector('.vdos-project-report');const show=(text)=>{report.hidden=!text;report.textContent=text||'';};
    async function refresh(){const rows=await workspace.list();const id=library.getActiveProjectId();const active=rows.find((p)=>p.id===id)||rows[0]||null;current.textContent=active?.title||'No project';return{rows,active};}async function choose(){const{rows,active}=await refresh();const answer=browserRoot.prompt(`Open project:\n${rows.map((p,i)=>`${i+1}. ${p.title}`).join('\n')}`,active?.id||'');if(answer==null)return;const n=Number(answer);const target=Number.isInteger(n)&&n>0&&n<=rows.length?rows[n-1]:rows.find((p)=>p.id===String(answer).trim());if(!target)throw new Error('Project not found');await workspace.open(target.id);await refresh();}
    async function run(fn){try{await fn();}catch(error){show(String(error?.message||error).replace(/Bearer\s+\S+/ig,'Bearer [redacted]'));}}
    panel.addEventListener('click',(event)=>{const button=event.target.closest('[data-a]');if(!button)return;const action=button.dataset.a;if(action==='open')return void run(choose);if(action==='new')return void run(async()=>{const title=browserRoot.prompt('New Project name','Untitled Director Project');if(title!=null){await workspace.new(title);await refresh();}});if(action==='rename')return void run(async()=>{const{active}=await refresh();if(!active)return;const title=browserRoot.prompt('Rename Project',active.title);if(title!=null){await workspace.rename(active.id,title);await refresh();}});if(action==='delete')return void run(async()=>{const{active}=await refresh();if(active&&browserRoot.confirm(`Delete project “${active.title}”?`)){await workspace.delete(active.id);await refresh();}});if(action==='export')return void run(async()=>{let result=await workspace.export();if(result.status==='preflight'){if(!browserRoot.confirm(`${result.report.missingAssets?.length||0} asset issue(s). Export incomplete package?`))return;result=await workspace.export({allowIncomplete:true});}download(browserRoot,result);show(`Package exported · ${result.report.sequenceCount||0} sequence(s) · ${result.report.shotCount||0} shot(s)`);});if(action==='import')file.click();});
    file.addEventListener('change',()=>{const selected=file.files?.[0];file.value='';if(!selected)return;void run(async()=>{const bytes=await toBytes(selected);const decoded=await runtime.decodeVdos(bytes);const sourceId=decoded?.manifest?.project?.id||null;const rows=await workspace.list();let mode='copy';if(sourceId&&rows.some((p)=>p.id===sourceId)&&browserRoot.confirm('Project exists. Replace existing? Cancel chooses Import as Copy.'))mode='replace';const result=await workspace.import(bytes,{mode,replaceProjectId:mode==='replace'?sourceId:null});await refresh();show(`Import ${result.report.recoveryStatus||'complete'} · ${result.report.sequenceCount||0} sequence(s) · ${result.report.shotCount||0} shot(s)`);});});await refresh();return workspace;
  }
  return{createDerivedReconciler,createM6ProjectPackageWorkspace,mountM6ProjectPackageUi};
});