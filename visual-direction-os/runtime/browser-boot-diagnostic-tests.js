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
    socket.listen(0, '127.0.0.1', () => { const port = socket.address().port; socket.close(() => resolve(port)); });
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
  on(method, listener) {
    const listeners = this.events.get(method) || new Set();
    listeners.add(listener);
    this.events.set(method, listeners);
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
    const result = await this.call('Runtime.evaluate', {expression, awaitPromise:true, returnByValue:true});
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text || 'Browser evaluation failed');
    return result.result?.value;
  }
  close() { try { this.ws?.close(); } catch (_) {} }
}

async function stopBrowser(browser) {
  if (!browser || browser.exitCode != null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => { if (browser.exitCode == null) browser.kill('SIGKILL'); resolve(); }, 2000);
    browser.once('exit', () => { clearTimeout(timer); resolve(); });
    browser.kill('SIGTERM');
  });
}

(async () => {
  const site = await server();
  const port = site.address().port;
  const origin = `http://127.0.0.1:${port}`;
  const debug = await openPort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vdos-boot-diag-'));
  const browser = spawn(chromeBinary(), [
    '--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
    `--remote-debugging-port=${debug}`,`--user-data-dir=${profile}`,'--no-first-run','--no-default-browser-check','about:blank'
  ], {stdio:'ignore'});
  let cdp;
  try {
    await poll(`http://127.0.0.1:${debug}/json/version`, (value) => Boolean(value.webSocketDebuggerUrl));
    const targets = await poll(`http://127.0.0.1:${debug}/json/list`, (value) => Array.isArray(value) && value.some((target) => target.type === 'page'));
    const target = targets.find((item) => item.type === 'page');
    cdp = new Cdp(target.webSocketDebuggerUrl);
    await cdp.connect();
    const diagnostics = { console:[], exceptions:[], logs:[] };
    cdp.on('Runtime.consoleAPICalled', (event) => diagnostics.console.push({type:event.type,args:(event.args || []).map((arg) => arg.value ?? arg.description)}));
    cdp.on('Runtime.exceptionThrown', (event) => diagnostics.exceptions.push(event.exceptionDetails?.exception?.description || event.exceptionDetails?.text || 'exception'));
    cdp.on('Log.entryAdded', (event) => diagnostics.logs.push({level:event.entry?.level,text:event.entry?.text,url:event.entry?.url}));
    await cdp.call('Runtime.enable');
    await cdp.call('Page.enable');
    await cdp.call('Log.enable');
    const loaded = cdp.event('Page.loadEventFired');
    await cdp.call('Page.navigate', {url:`${origin}/index.html`});
    await loaded;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    diagnostics.state = await cdp.eval(`(() => ({
      readyState:document.readyState,
      status:document.querySelector('.rail-status span:nth-child(2)')?.textContent || null,
      m4:Boolean(globalThis.VisualDirectionOS?.m4),
      projects:Boolean(globalThis.VisualDirectionOS?.projects),
      runtimeKeys:Object.keys(globalThis.VisualDirectionRuntime || {}).sort(),
      panel:Boolean(document.querySelector('#iteration-memory-console')),
      panelHidden:document.querySelector('#iteration-memory-console')?.hidden ?? null,
      projectPanel:Boolean(document.querySelector('.vdos-project-panel')),
      scripts:[...document.scripts].map((script) => script.src.replace(location.origin + '/', '')),
      resources:performance.getEntriesByType('resource').filter((entry) => /\\.(?:js|css)(?:$|\\?)/.test(entry.name)).map((entry) => ({name:entry.name.replace(location.origin + '/', ''),duration:Math.round(entry.duration)}))
    }))()`);
    console.log('VDOS_BROWSER_BOOT_DIAGNOSTICS=' + JSON.stringify(diagnostics));
    assert.equal(diagnostics.state.m4, true, 'M4 global must attach during browser boot');
    assert.equal(diagnostics.state.panel, true, 'M4 lineage panel must mount during browser boot');
    assert.equal(diagnostics.state.panelHidden, false, 'M4 lineage panel must render an initial state');
    console.log('browser boot diagnostic passed');
  } finally {
    cdp?.close();
    site.close();
    await stopBrowser(browser);
    fs.rmSync(profile, {recursive:true,force:true,maxRetries:5,retryDelay:100});
  }
})().catch((error) => { console.error(error); process.exit(1); });
