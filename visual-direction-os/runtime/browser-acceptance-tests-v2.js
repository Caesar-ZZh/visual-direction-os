const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const SITE_ROOT = path.resolve(__dirname, '..');
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlNXiwAAAAASUVORK5CYII=';

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
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(() => resolve(port)); });
  });
}

function chromeBinary() {
  for (const name of [process.env.CHROME_BIN, 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean)) {
    const out = spawnSync('which', [name], { encoding:'utf8' });
    if (out.status === 0 && out.stdout.trim()) return out.stdout.trim();
  }
  throw new Error('Chrome/Chromium not found');
}

async function poll(url, predicate, timeout = 15000) {
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
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.events = new Map(); }
  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, {once:true});
      this.ws.addEventListener('error', () => reject(new Error('CDP websocket failed')), {once:true});
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
    return new Promise((resolve, reject) => { this.pending.set(id, {resolve,reject}); this.ws.send(JSON.stringify({id,method,params})); });
  }
  event(method, predicate = () => true, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const listeners = this.events.get(method) || new Set();
      let timer = null;
      const listener = (params) => {
        if (!predicate(params)) return;
        clearTimeout(timer); listeners.delete(listener); resolve(params);
      };
      listeners.add(listener); this.events.set(method, listeners);
      timer = setTimeout(() => { listeners.delete(listener); reject(new Error(`Timed out waiting for ${method}`)); }, timeout);
    });
  }
  async eval(expression) {
    const result = await this.call('Runtime.evaluate', {expression, awaitPromise:true, returnByValue:true, userGesture:true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed');
    return result.result?.value;
  }
  close() { try { this.ws?.close(); } catch (_) {} }
}

async function waitReady(cdp, expectedArtifacts = null) {
  const end = Date.now() + 15000;
  while (Date.now() < end) {
    try {
      const value = await cdp.eval(`(() => {
        const m4=globalThis.VisualDirectionOS?.m4; const panel=document.querySelector('#iteration-memory-console');
        if(!m4||!panel||panel.hidden) return false;
        const count=m4.getState?.().artifacts?.length;
        return ${expectedArtifacts == null ? 'true' : `count===${expectedArtifacts}`};
      })()`);
      if (value) return;
    } catch (_) {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('M4 browser runtime did not become ready');
}

function fixture(origin, phase) {
  return `(async()=>{
    const m4=globalThis.VisualDirectionOS.m4;
    const image=${JSON.stringify(PNG)};
    const base={model:'agnes-image-2.1-flash',prompt:'BASE',ratio:'16:9',return_base64:true,extra_body:{response_format:'b64_json'}};
    const art=(id,parent=null,result={kind:'base64',src:image})=>({id,createdAt:new Date().toISOString(),provider:'agnes-image-2.1-flash',request:{...base,prompt:parent?'BASE\\n\\nHISTORICAL CHILD DELTA':'BASE'},baseRequest:{...base},result,visualIR:{metadata:{version:'0.1.0'}},iterationOf:parent,parentArtifactId:parent,iterationDelta:parent?{entries:[{checkId:'canvas-ratio',label:'Canvas Ratio',intent:'preserve',evidenceMode:'measured',instruction:'preserve canvas'}],promptAppendix:'HISTORICAL CHILD DELTA'}:null});
    const detail=(a,status)=>({artifact:{...a,measurements:{aspectRatio:status==='pass'?1.7778:1.2,meanSaturation:.3,edgeDensity:.2,entropyProxy:.4,luminanceStdDev:.25,localContrast:.2}},human:{'narrative-verb':{status:'pass'}},report:{artifactId:a.id,checks:[{id:'canvas-ratio',label:'Canvas Ratio',evidenceMode:'measured',status,target:'16:9',observed:status==='pass'?'1.7778':'1.2',reason:status==='pass'?'correct':'wrong'},{id:'narrative-verb',label:'Narrative Verb',evidenceMode:'human_required',status:'pass',target:'WITHDRAW',observed:'pass',reason:'director pass'}],summary:{measuredPass:status==='pass'?1:0,measuredWarn:status==='warn'?1:0,humanPassed:1,humanNeedsWork:0,unresolved:0}},delta:{entries:[{checkId:'canvas-ratio',label:'Canvas Ratio',intent:status==='pass'?'preserve':'correct',sourceStatus:status,evidenceMode:'measured',instruction:'Canvas Ratio: '+(status==='pass'?'preserve':'correct')}],preserve:status==='pass'?['Canvas Ratio: preserve']:[],correct:status==='warn'?['Canvas Ratio: correct']:[],unresolved:[],promptAppendix:'ITERATION / EVALUATION DELTA\\n\\n'+status}});
    if(${JSON.stringify(phase)}==='seed'){
      await m4.clearProject(); await m4.boot();
      const g1=art('g1'); await m4.ingestGeneration(g1); await m4.ingestEvaluation(detail(g1,'pass'));
      const g2=art('g2','g1'); await m4.ingestGeneration(g2); await m4.ingestEvaluation(detail(g2,'pass'));
      await m4.setSemanticJudgment('narrative-verb','improved','clearer');
      const s=m4.getState(); return {count:s.artifacts.length,a:s.selectedAId,b:s.selectedBId,stable:s.comparison.summary.stablePass,canvas:s.memory.locked.some(r=>r.checkId==='canvas-ratio'),semantic:s.memory.locked.some(r=>r.checkId==='narrative-verb'),ui:document.querySelector('#m4-generation-count')?.textContent};
    }
    const restored=m4.getState(); const g1=restored.artifacts.find(r=>r.id==='g1'); const g2=restored.artifacts.find(r=>r.id==='g2');
    const restoredCheck={count:restored.artifacts.length,a:restored.selectedAId,b:restored.selectedBId,rootDelta:Boolean(g1?.evaluationDelta),childDelta:Boolean(g2?.evaluationDelta)};
    const g3=art('g3','g2'); await m4.ingestGeneration(g3); await m4.ingestEvaluation(detail(g3,'warn')); const reg=m4.getState();
    const g2b=art('g2b','g1'); await m4.ingestGeneration(g2b); await m4.ingestEvaluation(detail(g2b,'warn')); const memA=m4.getMemoryFor('g2'),memB=m4.getMemoryFor('g2b');
    const original=globalThis.VisualDirectionOS.generation; let captured={}; globalThis.VisualDirectionOS.generation={setRequest(r){captured.set=r},async generate(r,c){captured.request=r;captured.context=c;return{id:'synthetic'}}}; await m4.redirectFromArtifact('g1'); globalThis.VisualDirectionOS.generation=original;
    const meta=art('meta',null,{kind:'url',src:${JSON.stringify(origin + '/missing-image.png')}}); await m4.ingestGeneration(meta); await m4.ingestEvaluation(detail(meta,'pass')); const metaStatus=m4.getState().artifacts.find(r=>r.id==='meta')?.persistenceStatus;
    const failed=art('failed'); await m4.ingestGeneration(failed); const put=IDBObjectStore.prototype.put; IDBObjectStore.prototype.put=function(value){if(this.name==='artifacts') throw new Error('forced store failure'); return put.call(this,value)}; try{await m4.ingestEvaluation(detail(failed,'pass'))}finally{IDBObjectStore.prototype.put=put}; const failedStatus=m4.getState().artifacts.find(r=>r.id==='failed')?.persistenceStatus;
    return {restoredCheck,regressed:reg.comparison.summary.regressed,active:reg.memory.active.some(r=>r.checkId==='canvas-ratio'&&r.state==='regressed'),locked:reg.memory.locked.some(r=>r.checkId==='canvas-ratio'),aLocked:memA.locked.some(r=>r.checkId==='canvas-ratio'),bLocked:memB.locked.some(r=>r.checkId==='canvas-ratio'),parent:captured.context?.iterationOf,basePrompt:captured.context?.baseRequest?.prompt,appendices:(captured.request?.prompt?.match(/ITERATION \\/ DIRECTOR MEMORY/g)||[]).length,leaked:Boolean(captured.request?.prompt?.includes('HISTORICAL CHILD DELTA')),metaStatus,failedStatus};
  })()`;
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

(async()=>{
  const site=await server(); const port=site.address().port; const origin=`http://127.0.0.1:${port}`; const debug=await openPort(); const profile=fs.mkdtempSync(path.join(os.tmpdir(),'vdos-chrome-'));
  const browser=spawn(chromeBinary(),['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',`--remote-debugging-port=${debug}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check',`${origin}/index.html`],{stdio:'ignore'});
  let cdp;
  try{
    await poll(`http://127.0.0.1:${debug}/json/version`,v=>Boolean(v.webSocketDebuggerUrl)); const targets=await poll(`http://127.0.0.1:${debug}/json/list`,v=>Array.isArray(v)&&v.some(t=>t.type==='page'&&t.url.startsWith(origin))); const target=targets.find(t=>t.type==='page'&&t.url.startsWith(origin));
    cdp=new Cdp(target.webSocketDebuggerUrl); await cdp.connect(); await cdp.call('Runtime.enable'); await cdp.call('Page.enable'); await waitReady(cdp);
    const seeded=await cdp.eval(fixture(origin,'seed')); assert.deepEqual({count:seeded.count,a:seeded.a,b:seeded.b,stable:seeded.stable,canvas:seeded.canvas,semantic:seeded.semantic},{count:2,a:'g1',b:'g2',stable:1,canvas:true,semantic:true}); assert.match(seeded.ui,/2 generations/);
    const loaded=cdp.event('Page.loadEventFired'); await cdp.call('Page.reload',{ignoreCache:true}); await loaded; await waitReady(cdp,2);
    const next=await cdp.eval(fixture(origin,'after')); assert.deepEqual(next.restoredCheck,{count:2,a:'g1',b:'g2',rootDelta:true,childDelta:true}); assert.equal(next.regressed,1); assert.equal(next.active,true); assert.equal(next.locked,false); assert.equal(next.aLocked,true); assert.equal(next.bLocked,false); assert.equal(next.parent,'g1'); assert.equal(next.basePrompt,'BASE'); assert.equal(next.appendices,1); assert.equal(next.leaked,false); assert.equal(next.metaStatus,'meta_only'); assert.equal(next.failedStatus,'not_persisted');
    const loaded2=cdp.event('Page.loadEventFired'); await cdp.call('Page.reload',{ignoreCache:true}); await loaded2; await waitReady(cdp,5); const final=await cdp.eval(`(()=>{const s=globalThis.VisualDirectionOS.m4.getState();return{ids:s.artifacts.map(r=>r.id),meta:s.artifacts.find(r=>r.id==='meta')?.persistenceStatus}})()`); assert.equal(final.ids.includes('failed'),false); assert.equal(final.ids.includes('g1'),true); assert.equal(final.ids.includes('g2'),true); assert.equal(final.meta,'meta_only');
    console.log('browser acceptance v2 passed');
  } finally {
    cdp?.close();
    site.close();
    await stopBrowser(browser);
    fs.rmSync(profile,{recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
})().catch(error=>{console.error(error);process.exit(1)});
