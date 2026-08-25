const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const SITE_ROOT = path.resolve(__dirname, '..');
const PNG_DATA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WlNXiwAAAAASUVORK5CYII=';

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    '.html':'text/html; charset=utf-8',
    '.js':'text/javascript; charset=utf-8',
    '.css':'text/css; charset=utf-8',
    '.json':'application/json; charset=utf-8',
    '.svg':'image/svg+xml',
    '.png':'image/png',
    '.jpg':'image/jpeg',
    '.jpeg':'image/jpeg',
    '.webp':'image/webp'
  })[ext] || 'application/octet-stream';
}

function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const raw = decodeURIComponent(String(req.url || '/').split('?')[0]);
      const relative = raw === '/' ? 'index.html' : raw.replace(/^\/+/, '');
      const filePath = path.resolve(SITE_ROOT, relative);
      if (!filePath.startsWith(SITE_ROOT + path.sep) && filePath !== path.join(SITE_ROOT, 'index.html')) {
        res.writeHead(403).end('forbidden');
        return;
      }
      fs.readFile(filePath, (error, data) => {
        if (error) {
          res.writeHead(404, { 'content-type':'text/plain; charset=utf-8' });
          res.end('not found');
          return;
        }
        res.writeHead(200, { 'content-type':contentType(filePath), 'cache-control':'no-store' });
        res.end(data);
      });
    });
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function findChrome() {
  const candidates = [process.env.CHROME_BIN, 'google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'].filter(Boolean);
  for (const candidate of candidates) {
    const found = spawnSync('which', [candidate], { encoding:'utf8' });
    if (found.status === 0 && found.stdout.trim()) return found.stdout.trim();
  }
  throw new Error('Chrome/Chromium executable not found');
}

async function waitForJson(url, predicate, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const value = await response.json();
        if (!predicate || predicate(value)) return value;
      }
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error(`Timed out waiting for ${url}`);
}

class CdpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.ws = null;
  }

  async connect() {
    this.ws = new WebSocket(this.url);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once:true });
      this.ws.addEventListener('error', () => reject(new Error('CDP websocket failed to open')), { once:true });
    });
    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message || 'CDP command failed'));
      else resolve(message.result || {});
    });
  }

  call(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression) {
    const result = await this.call('Runtime.evaluate', {
      expression,
      awaitPromise:true,
      returnByValue:true,
      userGesture:true
    });
    if (result.exceptionDetails) {
      const description = result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed';
      throw new Error(description);
    }
    return result.result?.value;
  }

  close() { try { this.ws?.close(); } catch (_) {} }
}

async function waitForExpression(cdp, expression, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      if (await cdp.evaluate(`Boolean(${expression})`)) return;
    } catch (error) { lastError = error; }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError || new Error(`Timed out waiting for browser expression: ${expression}`);
}

function seedScript(origin) {
  return `(async () => {
    const m4 = globalThis.VisualDirectionOS.m4;
    await m4.clearProject();
    await m4.boot();
    const image = ${JSON.stringify(PNG_DATA)};
    const baseRequest = { model:'agnes-image-2.1-flash', prompt:'BASE', ratio:'16:9', return_base64:true, extra_body:{response_format:'b64_json'} };
    const artifact = (id, parent = null, result = {kind:'base64',src:image}) => ({
      id,
      createdAt:new Date(Date.now() + ({g1:1000,g2:2000,g3:3000,g2b:4000,meta:5000,failed:6000}[id] || 7000)).toISOString(),
      provider:'agnes-image-2.1-flash',
      request:{...baseRequest, prompt:parent ? 'BASE\\n\\nHISTORICAL CHILD DELTA' : 'BASE'},
      baseRequest:{...baseRequest},
      result,
      visualIR:{metadata:{version:'0.1.0'}},
      iterationOf:parent,
      parentArtifactId:parent,
      iterationDelta:parent ? { entries:[{checkId:'canvas-ratio',label:'Canvas Ratio',intent:'preserve',evidenceMode:'measured',instruction:'preserve canvas'}], promptAppendix:'HISTORICAL CHILD DELTA' } : null
    });
    const detail = (value, status = 'pass') => ({
      artifact:{...value, measurements:{aspectRatio:1.7778, meanSaturation:0.3, edgeDensity:0.2, entropyProxy:0.4, luminanceStdDev:0.25, localContrast:0.2}},
      human:{'narrative-verb':{status:'pass'}},
      report:{artifactId:value.id, checks:[
        {id:'canvas-ratio',label:'Canvas Ratio',evidenceMode:'measured',status,target:'16:9',observed:status === 'pass' ? '1.7778' : '1.2',reason:status === 'pass' ? 'correct' : 'wrong'},
        {id:'narrative-verb',label:'Narrative Verb',evidenceMode:'human_required',status:'pass',target:'WITHDRAW',observed:'pass',reason:'director pass'}
      ], summary:{measuredPass:status === 'pass' ? 1 : 0, measuredWarn:status === 'warn' ? 1 : 0, humanPassed:1, humanNeedsWork:0, unresolved:0}},
      delta:{
        entries:[
          {checkId:'canvas-ratio',label:'Canvas Ratio',intent:status === 'pass' ? 'preserve' : 'correct',sourceStatus:status,evidenceMode:'measured',instruction:'Canvas Ratio: ' + (status === 'pass' ? 'preserve' : 'correct')},
          {checkId:'narrative-verb',label:'Narrative Verb',intent:'preserve',sourceStatus:'pass',evidenceMode:'human_required',instruction:'Narrative Verb: preserve'}
        ],
        preserve:status === 'pass' ? ['Canvas Ratio: preserve'] : [],
        correct:status === 'warn' ? ['Canvas Ratio: correct'] : [],
        unresolved:[],
        promptAppendix:'ITERATION / EVALUATION DELTA\\n\\n' + (status === 'pass' ? 'PRESERVE' : 'CORRECT')
      }
    });

    const g1 = artifact('g1');
    await m4.ingestGeneration(g1); await m4.ingestEvaluation(detail(g1, 'pass'));
    const g2 = artifact('g2', 'g1');
    await m4.ingestGeneration(g2); await m4.ingestEvaluation(detail(g2, 'pass'));
    await m4.setSemanticJudgment('narrative-verb', 'improved', 'Clearer withdrawal.');
    const state = m4.getState();
    return {
      artifactCount:state.artifacts.length,
      selectedAId:state.selectedAId,
      selectedBId:state.selectedBId,
      stablePass:state.comparison?.summary?.stablePass,
      canvasLocked:state.memory.locked.some((row) => row.checkId === 'canvas-ratio'),
      semanticLocked:state.memory.locked.some((row) => row.checkId === 'narrative-verb'),
      panelVisible:document.querySelector('#iteration-memory-console')?.hidden === false,
      countText:document.querySelector('#m4-generation-count')?.textContent || ''
    };
  })()`;
}

function afterReloadScript(origin) {
  return `(async () => {
    const m4 = globalThis.VisualDirectionOS.m4;
    const restored = m4.getState();
    const g1 = restored.artifacts.find((row) => row.id === 'g1');
    const g2 = restored.artifacts.find((row) => row.id === 'g2');
    const baseRequest = g1.baseRequest;
    const image = ${JSON.stringify(PNG_DATA)};
    const artifact = (id, parent, result = {kind:'base64',src:image}) => ({
      id, createdAt:new Date().toISOString(), provider:'agnes-image-2.1-flash', request:{...baseRequest,prompt:'BASE'}, baseRequest:{...baseRequest}, result,
      visualIR:{metadata:{version:'0.1.0'}}, iterationOf:parent, parentArtifactId:parent,
      iterationDelta:{entries:[{checkId:'canvas-ratio',label:'Canvas Ratio',intent:'preserve',evidenceMode:'measured',instruction:'preserve canvas'}],promptAppendix:'INCOMING DELTA'}
    });
    const detail = (value, status) => ({
      artifact:{...value, measurements:{aspectRatio:status === 'pass' ? 1.7778 : 1.2, meanSaturation:0.3, edgeDensity:0.2, entropyProxy:0.4, luminanceStdDev:0.25, localContrast:0.2}},
      human:{'narrative-verb':{status:'pass'}},
      report:{artifactId:value.id, checks:[
        {id:'canvas-ratio',label:'Canvas Ratio',evidenceMode:'measured',status,target:'16:9',observed:status === 'pass' ? '1.7778' : '1.2',reason:status === 'pass' ? 'correct' : 'wrong'},
        {id:'narrative-verb',label:'Narrative Verb',evidenceMode:'human_required',status:'pass',target:'WITHDRAW',observed:'pass',reason:'director pass'}
      ], summary:{measuredPass:status === 'pass' ? 1 : 0, measuredWarn:status === 'warn' ? 1 : 0, humanPassed:1, humanNeedsWork:0, unresolved:0}},
      delta:{entries:[{checkId:'canvas-ratio',label:'Canvas Ratio',intent:status === 'pass' ? 'preserve' : 'correct',sourceStatus:status,evidenceMode:'measured',instruction:'Canvas Ratio: ' + (status === 'pass' ? 'preserve' : 'correct')}],preserve:status === 'pass' ? ['Canvas Ratio: preserve'] : [],correct:status === 'warn' ? ['Canvas Ratio: correct'] : [],unresolved:[],promptAppendix:'ITERATION / EVALUATION DELTA\\n\\n' + status}
    });

    const restoredCheck = {
      artifactCount:restored.artifacts.length,
      selectedAId:restored.selectedAId,
      selectedBId:restored.selectedBId,
      hasRootDelta:Boolean(g1?.evaluationDelta),
      hasChildDelta:Boolean(g2?.evaluationDelta),
      countText:document.querySelector('#m4-generation-count')?.textContent || ''
    };

    const g3 = artifact('g3', 'g2');
    await m4.ingestGeneration(g3); await m4.ingestEvaluation(detail(g3, 'warn'));
    const regressedState = m4.getState();

    const g2b = artifact('g2b', 'g1');
    await m4.ingestGeneration(g2b); await m4.ingestEvaluation(detail(g2b, 'warn'));
    const memoryA = m4.getMemoryFor('g2');
    const memoryB = m4.getMemoryFor('g2b');

    const originalGeneration = globalThis.VisualDirectionOS.generation;
    let captured = null;
    globalThis.VisualDirectionOS.generation = {
      setRequest(request){ captured = {...(captured || {}), setRequest:request}; },
      async generate(request, context){ captured = {...(captured || {}), request, context}; return {id:'synthetic-branch'}; }
    };
    await m4.redirectFromArtifact('g1');
    globalThis.VisualDirectionOS.generation = originalGeneration;

    const meta = artifact('meta', null, {kind:'url',src:${JSON.stringify(origin + '/missing-image.png')}});
    await m4.ingestGeneration(meta); await m4.ingestEvaluation(detail(meta, 'pass'));
    const metaStatus = m4.getState().artifacts.find((row) => row.id === 'meta')?.persistenceStatus;

    const failed = artifact('failed', null);
    await m4.ingestGeneration(failed);
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function(value) {
      if (this.name === 'artifacts') throw new Error('forced artifact store failure');
      return originalPut.call(this, value);
    };
    try { await m4.ingestEvaluation(detail(failed, 'pass')); }
    finally { IDBObjectStore.prototype.put = originalPut; }
    const failedStatus = m4.getState().artifacts.find((row) => row.id === 'failed')?.persistenceStatus;

    return {
      restoredCheck,
      regressed:regressedState.comparison?.summary?.regressed,
      canvasActive:regressedState.memory.active.some((row) => row.checkId === 'canvas-ratio' && row.state === 'regressed'),
      canvasStillLocked:regressedState.memory.locked.some((row) => row.checkId === 'canvas-ratio'),
      siblingALocked:memoryA.locked.some((row) => row.checkId === 'canvas-ratio'),
      siblingBLocked:memoryB.locked.some((row) => row.checkId === 'canvas-ratio'),
      branchParent:captured?.context?.iterationOf,
      branchBasePrompt:captured?.context?.baseRequest?.prompt,
      memoryAppendixCount:(captured?.request?.prompt?.match(/ITERATION \\/ DIRECTOR MEMORY/g) || []).length,
      includesHistoricalChildDelta:Boolean(captured?.request?.prompt?.includes('HISTORICAL CHILD DELTA')),
      metaStatus,
      failedStatus
    };
  })()`;
}

(async () => {
  const server = await startStaticServer();
  const sitePort = server.address().port;
  const origin = `http://127.0.0.1:${sitePort}`;
  const debugPort = await freePort();
  const chrome = findChrome();
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vdos-browser-'));
  const browser = spawn(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDir}`,
    '--no-first-run', '--no-default-browser-check', `${origin}/index.html`
  ], { stdio:['ignore','ignore','pipe'] });
  let stderr = '';
  browser.stderr.on('data', (chunk) => { stderr += String(chunk); });

  let cdp = null;
  try {
    await waitForJson(`http://127.0.0.1:${debugPort}/json/version`, (value) => Boolean(value.webSocketDebuggerUrl));
    const targets = await waitForJson(`http://127.0.0.1:${debugPort}/json/list`, (value) => Array.isArray(value) && value.some((target) => target.type === 'page' && target.url.startsWith(origin)));
    const target = targets.find((item) => item.type === 'page' && item.url.startsWith(origin));
    cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.call('Runtime.enable');
    await cdp.call('Page.enable');

    await waitForExpression(cdp, `globalThis.VisualDirectionOS?.m4 && document.querySelector('#iteration-memory-console') && document.querySelector('#generation-console')`);
    const seeded = await cdp.evaluate(seedScript(origin));
    assert.equal(seeded.artifactCount, 2);
    assert.equal(seeded.selectedAId, 'g1');
    assert.equal(seeded.selectedBId, 'g2');
    assert.equal(seeded.stablePass, 1);
    assert.equal(seeded.canvasLocked, true);
    assert.equal(seeded.semanticLocked, true);
    assert.equal(seeded.panelVisible, true);
    assert.match(seeded.countText, /2 generations/);

    await cdp.call('Page.reload', { ignoreCache:true });
    await waitForExpression(cdp, `globalThis.VisualDirectionOS?.m4?.getState?.().artifacts?.length === 2 && document.querySelector('#iteration-memory-console')?.hidden === false`);
    const afterReload = await cdp.evaluate(afterReloadScript(origin));
    assert.equal(afterReload.restoredCheck.artifactCount, 2);
    assert.equal(afterReload.restoredCheck.selectedAId, 'g1');
    assert.equal(afterReload.restoredCheck.selectedBId, 'g2');
    assert.equal(afterReload.restoredCheck.hasRootDelta, true, 'root evaluationDelta must survive IndexedDB restore');
    assert.equal(afterReload.restoredCheck.hasChildDelta, true, 'child evaluationDelta must survive IndexedDB restore');
    assert.match(afterReload.restoredCheck.countText, /2 generations/);
    assert.equal(afterReload.regressed, 1);
    assert.equal(afterReload.canvasActive, true);
    assert.equal(afterReload.canvasStillLocked, false);
    assert.equal(afterReload.siblingALocked, true, 'successful sibling path must retain its measured lock');
    assert.equal(afterReload.siblingBLocked, false, 'regressed sibling path must not inherit the lock');
    assert.equal(afterReload.branchParent, 'g1');
    assert.equal(afterReload.branchBasePrompt, 'BASE');
    assert.equal(afterReload.memoryAppendixCount, 1, 'historical branch redirect must compile exactly one Director Memory appendix');
    assert.equal(afterReload.includesHistoricalChildDelta, false, 'historical child delta must not leak into a new sibling branch');
    assert.equal(afterReload.metaStatus, 'meta_only');
    assert.equal(afterReload.failedStatus, 'not_persisted');

    await cdp.call('Page.reload', { ignoreCache:true });
    await waitForExpression(cdp, `globalThis.VisualDirectionOS?.m4?.getState?.().artifacts?.some?.((row) => row.id === 'g1')`);
    const finalState = await cdp.evaluate(`(() => { const s=globalThis.VisualDirectionOS.m4.getState(); return {ids:s.artifacts.map((row)=>row.id), meta:s.artifacts.find((row)=>row.id==='meta')?.persistenceStatus}; })()`);
    assert.equal(finalState.ids.includes('failed'), false, 'not_persisted generation must disappear after reload');
    assert.equal(finalState.ids.includes('g1'), true, 'existing persisted lineage must survive a later store failure');
    assert.equal(finalState.ids.includes('g2'), true, 'existing persisted child must survive a later store failure');
    assert.equal(finalState.meta, 'meta_only');

    console.log('browser acceptance tests passed');
  } finally {
    cdp?.close();
    browser.kill('SIGTERM');
    server.close();
    fs.rmSync(profileDir, { recursive:true, force:true });
    if (browser.exitCode && browser.exitCode !== 0) process.stderr.write(stderr);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
