const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const SITE_ROOT = path.resolve(__dirname, '..');

function server() {
  return new Promise((resolve, reject) => {
    const instance = http.createServer((req, res) => {
      const relative = decodeURIComponent(String(req.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
      const file = path.resolve(SITE_ROOT, relative);
      if (!file.startsWith(SITE_ROOT + path.sep) && file !== path.join(SITE_ROOT, 'index.html')) return res.writeHead(403).end();
      fs.readFile(file, (error, data) => {
        if (error) return res.writeHead(404).end('not found');
        const ext = path.extname(file);
        const type = ext === '.js' ? 'text/javascript' : ext === '.css' ? 'text/css' : ext === '.html' ? 'text/html' : 'application/octet-stream';
        res.writeHead(200, { 'content-type':type, 'cache-control':'no-store' });
        res.end(data);
      });
    });
    instance.once('error', reject);
    instance.listen(0, '127.0.0.1', () => resolve(instance));
  });
}

function openPort() {
  return new Promise((resolve, reject) => {
    const socket = net.createServer();
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', () => {
      const port = socket.address().port;
      socket.close(() => resolve(port));
    });
  });
}

function chromeBinary() {
  for (const name of [process.env.CHROME_BIN, 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean)) {
    const out = spawnSync('which', [name], { encoding:'utf8' });
    if (out.status === 0 && out.stdout.trim()) return out.stdout.trim();
  }
  throw new Error('Chrome/Chromium not found');
}

async function poll(url, predicate, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const value = await response.json();
        if (predicate(value)) return value;
      }
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class Cdp {
  constructor(url) {
    this.url = url;
    this.id = 0;
    this.pending = new Map();
    this.events = new Map();
  }
  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once:true });
      this.ws.addEventListener('error', () => reject(new Error('CDP websocket failed')), { once:true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        return message.error ? pending.reject(new Error(message.error.message)) : pending.resolve(message.result || {});
      }
      for (const listener of [...(this.events.get(message.method) || [])]) listener(message.params || {});
    });
  }
  call(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  event(method, predicate = () => true, timeout = 20000) {
    return new Promise((resolve, reject) => {
      const listeners = this.events.get(method) || new Set();
      let timer = null;
      const listener = (params) => {
        if (!predicate(params)) return;
        clearTimeout(timer);
        listeners.delete(listener);
        resolve(params);
      };
      listeners.add(listener);
      this.events.set(method, listeners);
      timer = setTimeout(() => {
        listeners.delete(listener);
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeout);
    });
  }
  async eval(expression) {
    const result = await this.call('Runtime.evaluate', {
      expression,
      awaitPromise:true,
      returnByValue:true,
      userGesture:true
    });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed');
    }
    return result.result?.value;
  }
  close() { try { this.ws?.close(); } catch (_) {} }
}

async function waitWorkspace(cdp, expectedProjectId = null, expectedArtifacts = null) {
  const end = Date.now() + 25000;
  let last = null;
  while (Date.now() < end) {
    try {
      last = await cdp.eval(`(() => {
        const m4=globalThis.VisualDirectionOS?.m4;
        const projects=globalThis.VisualDirectionOS?.projects;
        const panel=document.querySelector('#iteration-memory-console');
        const state=m4?.getState?.();
        return {
          ready:Boolean(m4&&projects&&panel&&!panel.hidden&&state?.project?.id),
          projectId:state?.project?.id||null,
          artifacts:state?.artifacts?.length??null,
          status:document.querySelector('.rail-status span:nth-child(2)')?.textContent||''
        };
      })()`);
      const projectOk = expectedProjectId == null || last.projectId === expectedProjectId;
      const artifactsOk = expectedArtifacts == null || last.artifacts === expectedArtifacts;
      if (last.ready && projectOk && artifactsOk) return last;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Project package browser workspace did not become ready: ${JSON.stringify(last)}`);
}

async function stopBrowser(browser) {
  if (!browser || browser.exitCode != null) return;
  await new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(forceTimer);
      clearTimeout(giveUpTimer);
      resolve();
    };
    const forceTimer = setTimeout(() => {
      if (browser.exitCode == null) browser.kill('SIGKILL');
    }, 2000);
    const giveUpTimer = setTimeout(finish, 5000);
    browser.once('exit', finish);
    browser.kill('SIGTERM');
  });
}

const phaseOne = `
(async()=>{
  const check=(condition,message)=>{if(!condition) throw new Error(message)};
  const equal=(a,b,message)=>check(JSON.stringify(a)===JSON.stringify(b),message+' / '+JSON.stringify(a)+' !== '+JSON.stringify(b));
  const runtime=globalThis.VisualDirectionRuntime;
  const projects=globalThis.VisualDirectionOS.projects;
  const m4=globalThis.VisualDirectionOS.m4;
  check(runtime&&projects&&m4,'M5 workspace missing');
  check(typeof File==='function'&&typeof Blob==='function','real File/Blob APIs required');
  check(Boolean(globalThis.crypto?.subtle),'WebCrypto required');
  check(Boolean(globalThis.fflate?.zipSync&&globalThis.fflate?.unzipSync),'vendored fflate browser runtime required');

  const PNG='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlNXiwAAAAASUVORK5CYII=';
  const WEBP='data:image/webp;base64,UklGRgQAAABXRUJQ';
  const REF_SHARED='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const REF_SECOND='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAQAAAB7GkOtAAAADUlEQVR42mNk+M/wHwAF/gL+S1X9WQAAAABJRU5ErkJggg==';
  const SECRET_SENTINELS=['SHOULD_NOT_EXPORT_BEARER','PROXY_SHOULD_NOT_EXPORT','SESSION_SHOULD_NOT_EXPORT'];

  function bytesToB64(bytes){
    let binary='';
    for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return btoa(binary);
  }
  function request(prompt,refs){
    return {
      model:'agnes-image-2.1-flash',prompt,size:'1024x1024',ratio:'16:9',return_base64:true,
      extra_body:{response_format:'b64_json',image:refs.map((r)=>r.source),VDOS_PROXY_TOKEN:'PROXY_SHOULD_NOT_EXPORT'},
      authorization:'Bearer SHOULD_NOT_EXPORT_BEARER',
      headers:{Authorization:'Bearer SHOULD_NOT_EXPORT_BEARER'},
      sessionSecret:'SESSION_SHOULD_NOT_EXPORT'
    };
  }
  function artifact(id,parent,resultSrc,refs=[]){
    const req=request('FRAME '+id,refs);
    return {
      id,createdAt:new Date().toISOString(),provider:'agnes-image-2.1-flash',request:req,baseRequest:structuredClone(req),
      result:{kind:'base64',src:resultSrc},visualIR:{metadata:{version:'0.1.0'}},references:structuredClone(refs),
      iterationOf:parent,parentArtifactId:parent,
      iterationDelta:parent?{entries:[{checkId:'canvas-ratio',label:'Canvas Ratio',intent:'preserve',evidenceMode:'measured',instruction:'preserve canvas'}],promptAppendix:'HISTORICAL CHILD DELTA'}:null
    };
  }
  function detail(a,status){
    return {
      artifact:{...a,measurements:{aspectRatio:status==='pass'?1.7778:1.2,meanSaturation:.3,edgeDensity:.2,entropyProxy:.4,luminanceStdDev:.25,localContrast:.2}},
      human:{'narrative-verb':{status:'pass'}},
      report:{artifactId:a.id,checks:[
        {id:'canvas-ratio',label:'Canvas Ratio',evidenceMode:'measured',status,target:'16:9',observed:status==='pass'?'1.7778':'1.2',reason:status==='pass'?'correct':'wrong'},
        {id:'narrative-verb',label:'Narrative Verb',evidenceMode:'human_required',status:'pass',target:'WITHDRAW',observed:'pass',reason:'director pass'}
      ],summary:{measuredPass:status==='pass'?1:0,measuredWarn:status==='warn'?1:0,humanPassed:1,humanNeedsWork:0,unresolved:0}},
      delta:{entries:[{checkId:'canvas-ratio',label:'Canvas Ratio',intent:status==='pass'?'preserve':'correct',sourceStatus:status,evidenceMode:'measured',instruction:'Canvas Ratio: '+(status==='pass'?'preserve':'correct')}],preserve:status==='pass'?['Canvas Ratio: preserve']:[],correct:status==='warn'?['Canvas Ratio: correct']:[],unresolved:[],promptAppendix:'ITERATION / EVALUATION DELTA\\n\\n'+status}
    };
  }

  // 1-3. Create Project A, real lineage/branch, generated PNG/WebP, local references, evaluations and semantic judgment.
  const projectA=await projects.new('Project A');
  check(projectA?.id,'Project A creation failed');
  const sharedCharacter={id:'ref-shared-character',name:'shared-character.png',source:REF_SHARED,role:'character',preserve:['identity']};
  const sharedStyle={id:'ref-shared-style',name:'shared-style.png',source:REF_SHARED,role:'style',preserve:['palette']};
  const secondRef={id:'ref-second',name:'second.png',source:REF_SECOND,role:'composition',preserve:['framing']};
  const g1=artifact('g1',null,PNG,[sharedCharacter]);
  const g2=artifact('g2','g1',WEBP,[sharedStyle]);
  const g3=artifact('g3','g2',PNG,[sharedCharacter,secondRef]);
  const g2b=artifact('g2b','g1',PNG,[]);
  for(const [a,status] of [[g1,'pass'],[g2,'pass'],[g3,'warn']]){await m4.ingestGeneration(a);await m4.ingestEvaluation(detail(a,status));}
  await m4.selectA('g2'); await m4.selectB('g3');
  await m4.setSemanticJudgment('narrative-verb','improved','semantic judgment survives package round trip');
  await m4.ingestGeneration(g2b); await m4.ingestEvaluation(detail(g2b,'pass'));
  check(m4.getState().artifacts.length===4,'four artifacts must be in Project A');

  // 4. Export complete archive and inspect exact ZIP payloads for secrets + reference dedup.
  const exported=await projects.export();
  check(exported.status==='exported','complete project must export instead of preflight');
  check(exported.report.packageCompleteness==='complete','export must be complete');
  check(exported.bytes instanceof Uint8Array&&exported.bytes.length>0,'export must produce .vdos bytes');
  const decoded=await runtime.decodeVdos(exported.bytes);
  const decoder=new TextDecoder();
  const artifactJson=(sourceId)=>{
    const path=[...decoded.entries.keys()].find((p)=>p.startsWith('artifacts/')&&p.endsWith('/'+sourceId+'.json'))
      || [...decoded.entries.keys()].find((p)=>p===('artifacts/'+sourceId+'.json'));
    check(path,'missing portable artifact '+sourceId);
    return JSON.parse(decoder.decode(decoded.entries.get(path)));
  };
  const portableG1=artifactJson('g1');
  const portableG2=artifactJson('g2');
  const portableG3=artifactJson('g3');
  check(portableG2.image.mimeType==='image/webp','generated WebP MIME must be portable');
  check(decoded.entries.has(portableG2.image.path),'generated WebP bytes must exist');
  check(portableG1.generation.references[0].path===portableG2.generation.references[0].path,'duplicate reference bytes must share one content-addressed path');
  equal(portableG1.generation.references[0].preserve,['identity'],'first reference preserve metadata lost');
  equal(portableG2.generation.references[0].preserve,['palette'],'second reference preserve metadata lost');
  check(portableG1.generation.references[0].role==='character'&&portableG2.generation.references[0].role==='style','per-use reference role lost');
  const referencePaths=[...decoded.entries.keys()].filter((p)=>p.startsWith('references/'));
  check(referencePaths.length===2,'two unique reference byte payloads expected, got '+referencePaths.length);
  const jsonPayload=[...decoded.entries.entries()].filter(([p])=>p.endsWith('.json')).map(([,b])=>decoder.decode(b)).join('\\n');
  for(const sentinel of SECRET_SENTINELS) check(!jsonPayload.includes(sentinel),'secret leaked into archive JSON: '+sentinel);
  check(!jsonPayload.includes('blob:'),'Object URL leaked into archive JSON');

  localStorage.setItem('vdos-test-archive-b64',bytesToB64(exported.bytes));
  localStorage.setItem('vdos-test-project-a',projectA.id);

  // 5. Remove original local project, import through a real File, and prove exact restoration.
  await projects.delete(projectA.id);
  check(!(await projects.list()).some((p)=>p.id===projectA.id),'original project must be removed before no-conflict import');
  const first=await projects.import(new File([exported.bytes],'project-a.vdos',{type:'application/zip'}));
  check(first.status==='imported','first File import failed');
  check(first.staged.project.id===projectA.id,'no-conflict import must retain original project identity');
  const restored=m4.getState();
  check(restored.project.id===projectA.id&&restored.artifacts.length===4,'restored project/artifact count mismatch');
  const rg1=restored.artifacts.find((a)=>a.id==='g1');
  const rg2=restored.artifacts.find((a)=>a.id==='g2');
  const rg3=restored.artifacts.find((a)=>a.id==='g3');
  const rg2b=restored.artifacts.find((a)=>a.id==='g2b');
  check(rg2.parentArtifactId==='g1'&&rg3.parentArtifactId==='g2'&&rg2b.parentArtifactId==='g1','lineage topology not restored');
  check(rg3.rootArtifactId==='g1'&&rg2b.rootArtifactId==='g1','root lineage not restored');
  check(rg2.imageBlob instanceof Blob&&rg2.imageBlob.type==='image/webp','WebP Blob/MIME not restored');
  const restoredWebp=new Uint8Array(await rg2.imageBlob.arrayBuffer());
  const expectedWebp=decoded.entries.get(portableG2.image.path);
  check(restoredWebp.length===expectedWebp.length&&restoredWebp.every((v,i)=>v===expectedWebp[i]),'generated image bytes changed across round trip');
  const judgment=restored.comparisons.find((row)=>row.artifactAId==='g2'&&row.artifactBId==='g3')?.directorJudgments?.['narrative-verb'];
  check(judgment?.state==='improved','semantic comparison judgment not restored');
  check(['MEMORY VERIFIED','MEMORY MIGRATED'].includes(first.report.memoryReconciliation),'Import Report missing memory reconciliation');
  check(first.staged.derived?.memory,'current memory must be recomputed during staging');

  // 11-12. Per-use metadata and ordered rich references must rehydrate request + baseRequest images.
  const stagedG3=first.staged.artifacts.find((a)=>a.id==='g3');
  equal(stagedG3.references.map((r)=>r.role),['character','composition'],'reference order/roles not restored');
  equal(stagedG3.references.map((r)=>r.preserve),[['identity'],['framing']],'reference preserve metadata not restored');
  equal(stagedG3.request.extra_body.image,stagedG3.references.map((r)=>r.source),'request reference image order not rehydrated');
  equal(stagedG3.baseRequest.extra_body.image,stagedG3.references.map((r)=>r.source),'baseRequest reference image order not rehydrated');

  // 6. Import same archive with original ID present; default Copy remaps graph while retaining source identity.
  const copied=await projects.import(new File([exported.bytes],'project-a-again.vdos',{type:'application/zip'}));
  check(copied.status==='imported','conflict Copy import failed');
  check(copied.staged.project.id!==projectA.id,'conflict default must Import as Copy');
  check(copied.staged.project.provenance.sourceProjectId===projectA.id,'earliest source project identity lost');
  const copiedG3=copied.staged.artifacts.find((a)=>a.sourceIdentity?.sourceArtifactId==='g3');
  const copiedG2=copied.staged.artifacts.find((a)=>a.sourceIdentity?.sourceArtifactId==='g2');
  const copiedG1=copied.staged.artifacts.find((a)=>a.sourceIdentity?.sourceArtifactId==='g1');
  check(copiedG1&&copiedG2&&copiedG3,'copied sourceArtifactId provenance missing');
  check(copiedG3.parentArtifactId===copiedG2.id&&copiedG3.rootArtifactId===copiedG1.id,'Copy lineage topology not remapped');
  check(copied.staged.idMap.artifacts.g3===copiedG3.id,'Copy idMap does not match remapped artifact');
  localStorage.setItem('vdos-test-copy-project',copied.staged.project.id);

  return {
    projectAId:projectA.id,
    copiedProjectId:copied.staged.project.id,
    archiveEntries:decoded.entries.size,
    referenceEntries:referencePaths.length,
    firstReconciliation:first.report.memoryReconciliation
  };
})()`;

const phaseTwo = `
(async()=>{
  const check=(condition,message)=>{if(!condition) throw new Error(message)};
  const runtime=globalThis.VisualDirectionRuntime;
  const projects=globalThis.VisualDirectionOS.projects;
  const m4=globalThis.VisualDirectionOS.m4;
  const projectAId=localStorage.getItem('vdos-test-project-a');
  const copyId=localStorage.getItem('vdos-test-copy-project');
  function b64ToBytes(value){const binary=atob(value);const out=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)out[i]=binary.charCodeAt(i);return out;}
  function corruptZip(bytes,path){
    const entries=globalThis.fflate.unzipSync(bytes);
    check(entries[path] instanceof Uint8Array,'cannot corrupt missing archive path '+path);
    const changed=new Uint8Array(entries[path]);
    changed[0]=(changed[0]||0)^0xff;
    entries[path]=changed;
    return globalThis.fflate.zipSync(entries,{level:6});
  }
  const bytes=b64ToBytes(localStorage.getItem('vdos-test-archive-b64'));
  const decoded=await runtime.decodeVdos(bytes);
  const decoder=new TextDecoder();
  const g2Path=[...decoded.entries.keys()].find((p)=>p==='artifacts/g2.json'||(p.startsWith('artifacts/')&&p.endsWith('/g2.json')));
  check(g2Path,'g2 portable JSON missing after hard reload');
  const portableG2=JSON.parse(decoder.decode(decoded.entries.get(g2Path)));

  // 7. Hard reload must restore the explicitly active copied project, independent of updatedAt.
  check(localStorage.getItem('vdos-active-project-id')===copyId,'active project preference changed across reload');
  check(m4.getState().project.id===copyId,'M4 did not restore explicit copied project');
  check(m4.getState().artifacts.length===4,'copied project artifact count changed across reload');

  // 8. One corrupt generated image is recoverable/partial and becomes metadata-only.
  const corruptImageBytes=corruptZip(bytes,portableG2.image.path);
  const partial=await projects.import(new File([corruptImageBytes],'corrupt-image.vdos',{type:'application/zip'}));
  check(partial.status==='imported','corrupt non-core image should remain importable');
  check(partial.staged.recoveryStatus==='partial','corrupt image import must be partial');
  const partialG2=partial.staged.artifacts.find((a)=>a.sourceIdentity?.sourceArtifactId==='g2'||a.id==='g2');
  check(partialG2&&partialG2.imageBlob===null&&partialG2.persistenceStatus==='meta_only','corrupt image artifact must degrade to metadata-only');
  check(partial.report.assetErrors?.some((row)=>row.path===portableG2.image.path),'Import Report must name corrupt image');

  // 9. Core checksum corruption blocks import and leaves IndexedDB project count unchanged.
  const beforeCoreCount=(await projects.list()).length;
  const corruptCoreBytes=corruptZip(bytes,'project.json');
  let coreError='';
  try{await projects.import(new File([corruptCoreBytes],'corrupt-core.vdos',{type:'application/zip'}));}catch(error){coreError=String(error?.message||error);}
  check(/checksum|core|integrity/i.test(coreError),'corrupt project.json must block with integrity error, got '+coreError);
  check((await projects.list()).length===beforeCoreCount,'blocked core import mutated project count');

  // 10. Forced Replace transaction abort must preserve original project/artifacts and active ID.
  await projects.open(projectAId);
  const beforeReplace=m4.getState();
  check(beforeReplace.project.id===projectAId&&beforeReplace.artifacts.length===4,'original project unavailable before Replace abort test');
  const originalAdd=IDBObjectStore.prototype.add;
  let replaceError='';
  IDBObjectStore.prototype.add=function(value){
    if(this.name==='artifacts'&&value?.projectId===projectAId) throw new Error('forced replace transaction abort');
    return originalAdd.call(this,value);
  };
  try{
    await projects.import(new File([bytes],'replace-abort.vdos',{type:'application/zip'}),{mode:'replace',replaceProjectId:projectAId});
  }catch(error){replaceError=String(error?.message||error);}
  finally{IDBObjectStore.prototype.add=originalAdd;}
  check(/forced replace transaction abort/i.test(replaceError),'forced Replace failure did not surface');
  check(localStorage.getItem('vdos-active-project-id')===projectAId,'failed Replace changed active project preference');
  check(m4.getState().project.id===projectAId&&m4.getState().artifacts.length===4,'failed Replace cleared current M4 project');
  const verifyMemory=runtime.createDirectorMemory({store:runtime.createIndexedDbStore(globalThis)});
  const persistedAfterAbort=await verifyMemory.loadProjectBundle(projectAId);
  check(persistedAfterAbort.project?.id===projectAId&&persistedAfterAbort.artifacts.length===4,'Replace abort did not roll back IndexedDB atomically');

  // 13. Reconciliation must execute during staging before the atomic commit starts.
  const reconciliationMemory=runtime.createDirectorMemory({store:runtime.createIndexedDbStore(globalThis)});
  const reconciliationLibrary=runtime.createProjectLibrary({memory:reconciliationMemory,preferences:localStorage});
  await reconciliationLibrary.boot();
  let recomputed=false;
  let recomputedBeforeCommit=false;
  const wrappedMemory={
    commitProjectBundle:async(input)=>{
      recomputedBeforeCommit=recomputed;
      return reconciliationMemory.commitProjectBundle(input);
    }
  };
  const suffix=Date.now().toString(36);
  const reconciliationWorkspace=runtime.createProjectPackageWorkspace({
    memory:wrappedMemory,
    library:reconciliationLibrary,
    m4,
    packageRuntime:runtime,
    migrator:runtime.createSchemaMigrator({currentVersion:runtime.VDOS_SCHEMA_VERSION||1,migrations:{}}),
    makeProjectId:()=>('project-reconciliation-'+suffix),
    makeArtifactId:(oldId)=>('reconciliation-'+oldId+'-'+suffix),
    recomputeDerived:async({artifacts,comparisons,memorySnapshot})=>{
      recomputed=true;
      return {comparisons,memory:memorySnapshot||{pathArtifactIds:[],locked:[],active:[],watch:[]},memoryReconciliation:'MEMORY VERIFIED'};
    }
  });
  const reconciliationResult=await reconciliationWorkspace.import(new File([bytes],'reconciliation.vdos',{type:'application/zip'}));
  check(recomputed===true&&recomputedBeforeCommit===true,'memory reconciliation must complete before commitProjectBundle begins');
  check(reconciliationResult.report.memoryReconciliation==='MEMORY VERIFIED','Import Report missing pre-commit memory reconciliation');

  return {
    activeAfterReload:copyId,
    partialRecovery:partial.staged.recoveryStatus,
    coreBlocked:Boolean(coreError),
    replaceRolledBack:Boolean(replaceError),
    reconciliationBeforeCommit:recomputedBeforeCommit
  };
})()`;

(async()=>{
  const site=await server();
  const port=site.address().port;
  const origin=`http://127.0.0.1:${port}`;
  const debug=await openPort();
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'vdos-m5-chrome-'));
  const browser=spawn(chromeBinary(),[
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    `--remote-debugging-port=${debug}`,`--user-data-dir=${profile}`,
    '--no-first-run','--no-default-browser-check','about:blank'
  ],{stdio:'ignore'});
  let cdp;
  try{
    await poll(`http://127.0.0.1:${debug}/json/version`,(value)=>Boolean(value.webSocketDebuggerUrl));
    const targets=await poll(`http://127.0.0.1:${debug}/json/list`,(value)=>Array.isArray(value)&&value.some((target)=>target.type==='page'));
    const target=targets.find((item)=>item.type==='page');
    cdp=new Cdp(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.call('Runtime.enable');
    await cdp.call('Page.enable');
    const loaded=cdp.event('Page.loadEventFired');
    await cdp.call('Page.navigate',{url:`${origin}/index.html`});
    await loaded;
    await waitWorkspace(cdp);

    const first=await cdp.eval(phaseOne);
    assert.ok(first.projectAId);
    assert.ok(first.copiedProjectId);
    assert.notEqual(first.projectAId,first.copiedProjectId);
    assert.equal(first.referenceEntries,2);
    assert.match(first.firstReconciliation,/MEMORY (VERIFIED|MIGRATED)/);

    const loadedAgain=cdp.event('Page.loadEventFired');
    await cdp.call('Page.reload',{ignoreCache:true});
    await loadedAgain;
    await waitWorkspace(cdp,first.copiedProjectId,4);

    const second=await cdp.eval(phaseTwo);
    assert.equal(second.activeAfterReload,first.copiedProjectId);
    assert.equal(second.partialRecovery,'partial');
    assert.equal(second.coreBlocked,true);
    assert.equal(second.replaceRolledBack,true);
    assert.equal(second.reconciliationBeforeCommit,true);

    console.log('project package browser acceptance passed');
  } finally {
    cdp?.close();
    site.close();
    await stopBrowser(browser);
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
})().catch((error)=>{
  console.error(error);
  process.exit(1);
});
