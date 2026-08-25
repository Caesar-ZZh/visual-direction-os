(function attachGenerationUIM3(root) {
  'use strict';
  if (!root || !root.document) return;

  const runtime = root.VisualDirectionRuntime || {};
  const {
    AGNES_MODEL,
    AGNES_SIZES,
    AGNES_RATIOS,
    AGNES_REFERENCE_ROLES,
    buildAgnesRequest,
    createGenerationArtifact,
    generateViaProxy
  } = runtime;
  if (![buildAgnesRequest, createGenerationArtifact, generateViaProxy].every((fn) => typeof fn === 'function')) {
    console.error('[Visual Direction OS] M3 generation runtime failed to initialize.');
    return;
  }

  const document = root.document;
  const $ = (selector, base = document) => base.querySelector(selector);
  const state = { references: [], request: null, activeArtifact: null };
  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

  function currentCompiled() { return root.VisualDirectionOS?.activeCompiled || null; }
  function currentIR() { return root.VisualDirectionOS?.activeIR || null; }
  function storedProxy() { try { return String(root.localStorage?.getItem('vdos-generation-proxy') || '').trim(); } catch (_) { return ''; } }
  function storedProxyToken() { try { return String(root.sessionStorage?.getItem('vdos-proxy-token') || '').trim(); } catch (_) { return ''; } }
  function proxyEndpoint() { return String(root.VDOS_GENERATION_PROXY || storedProxy() || '').trim(); }
  function proxyToken() { return storedProxyToken(); }

  function normalizeProxyUrl(raw) {
    const value = String(raw || '').trim();
    if (!value) return '';
    const parsed = new URL(value, root.location?.href || 'https://localhost/');
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Proxy endpoint must use http:// or https://');
    return parsed.href;
  }

  function optionList(values, selected) {
    return values.map((item) => `<option value="${escapeHtml(item)}"${item === selected ? ' selected' : ''}>${escapeHtml(item)}</option>`).join('');
  }

  function buildPanel() {
    const output = $('#director-output');
    if (!output || $('#generation-console')) return;
    const inspector = output.querySelector('.ir-inspector');
    const section = document.createElement('section');
    section.className = 'generation-console';
    section.id = 'generation-console';
    section.innerHTML = `
      <header class="generation-head">
        <div><small>IMAGE GENERATION / M3 EXECUTION</small><h3>Generate through <em>Agnes Image 2.1 Flash.</em></h3><p>The Visual IR remains model-neutral. Execution goes through a separate Cloudflare Worker so the Agnes credential never enters GitHub Pages.</p></div>
        <div class="generation-provider"><span>MODEL</span><strong>${escapeHtml(AGNES_MODEL)}</strong><small id="generation-provider-state">Proxy not configured</small></div>
      </header>
      <div class="generation-grid">
        <div class="generation-controls">
          <div class="generation-canvas-controls">
            <label><span>RESOLUTION</span><select id="generation-size">${optionList(AGNES_SIZES, '2K')}</select></label>
            <label><span>CANVAS</span><select id="generation-ratio">${optionList(AGNES_RATIOS, '16:9')}</select></label>
            <label><span>OUTPUT</span><select id="generation-format"><option value="url">URL</option><option value="b64_json">Base64</option></select></label>
          </div>
          <div class="reference-intake">
            <div><span>REFERENCE IMAGES</span><small>Each image receives an explicit job; M3 accepts up to 8 references.</small></div>
            <label class="reference-upload" for="generation-reference-input"><input id="generation-reference-input" type="file" accept="image/*" multiple><span>＋ Add references</span><small>Character / composition / color / medium / world…</small></label>
            <div id="generation-reference-list" class="reference-list" aria-live="polite"></div>
          </div>
          <details class="generation-proxy-config" id="generation-proxy-config">
            <summary>Cloudflare secure generation proxy</summary>
            <p>The Agnes key stays in a Worker Secret. The separate proxy token only authorizes this browser session to use your Worker.</p>
            <label for="generation-proxy-input"><span>PROXY ENDPOINT</span><input id="generation-proxy-input" type="url" autocomplete="off" placeholder="https://your-worker.workers.dev/api/agnes-generate"></label>
            <label for="generation-proxy-token"><span>SESSION PROXY TOKEN</span><input id="generation-proxy-token" type="password" autocomplete="off" placeholder="Matches Worker secret VDOS_PROXY_TOKEN"></label>
            <button type="button" id="generation-proxy-save">Save connection</button>
            <small>Endpoint persists locally. Proxy token lives only in sessionStorage and is cleared with the browser session. The Agnes API key is never stored here.</small>
          </details>
          <div class="generation-actions"><button type="button" class="generation-preview" id="generation-preview">Refresh request</button><button type="button" class="generation-submit" id="generation-submit" disabled><span>GENERATE</span><small>Cloudflare → Agnes</small></button></div>
          <p class="generation-status" id="generation-status" role="status">Run DIRECT first to create an active Visual IR.</p>
        </div>
        <div class="generation-preview-pane"><div class="generation-preview-head"><span>AGNES REQUEST</span><small id="generation-request-mode">WAITING FOR VISUAL IR</small></div><pre id="generation-request-preview" tabindex="0">No active request.</pre></div>
      </div>
      <div class="generation-result" id="generation-result" hidden><div class="generation-result-frame"><img id="generation-result-image" alt="Generated visual direction result"></div><div class="generation-result-meta"><span>GENERATION ARTIFACT</span><strong id="generation-result-kind">—</strong><p id="generation-result-copy">—</p></div></div>`;
    if (inspector) output.insertBefore(section, inspector); else output.append(section);

    const proxyInput = $('#generation-proxy-input');
    const tokenInput = $('#generation-proxy-token');
    if (proxyInput) proxyInput.value = proxyEndpoint();
    if (tokenInput) tokenInput.value = proxyToken();
    $('#generation-size')?.addEventListener('change', refreshRequest);
    $('#generation-ratio')?.addEventListener('change', refreshRequest);
    $('#generation-format')?.addEventListener('change', refreshRequest);
    $('#generation-preview')?.addEventListener('click', refreshRequest);
    $('#generation-reference-input')?.addEventListener('change', handleFiles);
    $('#generation-proxy-save')?.addEventListener('click', saveProxy);
    $('#generation-submit')?.addEventListener('click', () => generate());
    refreshRequest();
  }

  function setStatus(message, kind = 'info') {
    const node = $('#generation-status');
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
  }

  function saveProxy() {
    const input = $('#generation-proxy-input');
    const tokenInput = $('#generation-proxy-token');
    if (!input || !tokenInput) return;
    try {
      const endpoint = normalizeProxyUrl(input.value);
      const token = String(tokenInput.value || '').trim();
      if (!root.VDOS_GENERATION_PROXY) {
        if (endpoint) root.localStorage?.setItem('vdos-generation-proxy', endpoint);
        else root.localStorage?.removeItem('vdos-generation-proxy');
      }
      if (token) root.sessionStorage?.setItem('vdos-proxy-token', token);
      else root.sessionStorage?.removeItem('vdos-proxy-token');
      input.value = proxyEndpoint();
      setStatus(endpoint && token ? 'Secure proxy connection saved for this browser session.' : 'Proxy configuration updated; endpoint and session token are both required to generate.', endpoint && token ? 'success' : 'info');
      syncExecutionState();
    } catch (error) {
      setStatus(error.message || 'Invalid proxy configuration.', 'error');
    }
  }

  async function fileToDataUri(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error || new Error('Failed to read reference image'));
      reader.readAsDataURL(file);
    });
  }

  async function handleFiles(event) {
    const files = [...(event.target.files || [])];
    if (!files.length) return;
    if (state.references.length + files.length > 8) {
      setStatus('Reference limit is 8 images.', 'error');
      event.target.value = '';
      return;
    }
    try {
      const incoming = await Promise.all(files.map(async (file, index) => ({ id:`${Date.now()}-${index}-${file.name}`, name:file.name, source:await fileToDataUri(file), role:'subject', preserve:[] })));
      state.references.push(...incoming);
      renderReferences();
      refreshRequest();
      event.target.value = '';
    } catch (error) { setStatus(error.message || 'Reference image could not be read.', 'error'); }
  }

  function renderReferences() {
    const list = $('#generation-reference-list');
    if (!list) return;
    if (!state.references.length) { list.innerHTML = '<p class="reference-empty">No references · text-to-image</p>'; return; }
    list.innerHTML = state.references.map((ref, index) => `<article class="reference-card" data-id="${escapeHtml(ref.id)}"><div class="reference-thumb"><img src="${ref.source}" alt=""><span>${String(index + 1).padStart(2,'0')}</span></div><div class="reference-fields"><strong>${escapeHtml(ref.name)}</strong><label><span>ROLE</span><select data-role>${optionList(AGNES_REFERENCE_ROLES, ref.role)}</select></label><label><span>PRESERVE</span><input data-preserve value="${escapeHtml(ref.preserve.join(', '))}" placeholder="identity, silhouette, camera angle"></label></div><button type="button" data-remove aria-label="Remove reference">×</button></article>`).join('');
    list.querySelectorAll('.reference-card').forEach((card) => {
      const ref = state.references.find((item) => item.id === card.dataset.id);
      card.querySelector('[data-role]')?.addEventListener('change', (event) => { ref.role = event.target.value; refreshRequest(); });
      card.querySelector('[data-preserve]')?.addEventListener('change', (event) => { ref.preserve = String(event.target.value || '').split(',').map((v) => v.trim()).filter(Boolean); refreshRequest(); });
      card.querySelector('[data-remove]')?.addEventListener('click', () => { state.references = state.references.filter((item) => item.id !== ref.id); renderReferences(); refreshRequest(); });
    });
  }

  function safePreview(request) {
    if (!request) return 'No active request.';
    const value = clone(request);
    if (Array.isArray(value.extra_body?.image)) value.extra_body.image = value.extra_body.image.map((src, i) => String(src).startsWith('data:') ? `[reference ${i + 1}: Data URI omitted]` : src);
    return JSON.stringify(value, null, 2);
  }

  function renderRequest(request, label) {
    const pre = $('#generation-request-preview');
    if (pre) pre.textContent = safePreview(request);
    if ($('#generation-request-mode')) $('#generation-request-mode').textContent = label;
  }

  function syncExecutionState() {
    const endpoint = proxyEndpoint();
    const token = proxyToken();
    const ready = Boolean(state.request && endpoint && token);
    if ($('#generation-submit')) $('#generation-submit').disabled = !ready;
    if ($('#generation-provider-state')) $('#generation-provider-state').textContent = endpoint && token ? 'Cloudflare proxy authenticated' : endpoint ? 'Proxy token required' : 'Proxy not configured';
    const details = $('#generation-proxy-config');
    if (details && (!endpoint || !token)) details.open = true;
    if (state.request && !endpoint) setStatus('Request compiled. Configure the Cloudflare Worker endpoint to enable generation.');
    else if (state.request && endpoint && !token) setStatus('Worker endpoint configured. Enter the session proxy token to enable generation.');
  }

  function setRequest(request, { label = 'ITERATION REQUEST' } = {}) {
    state.request = clone(request);
    renderRequest(state.request, label);
    syncExecutionState();
    return state.request;
  }

  function refreshRequest() {
    const compiled = currentCompiled();
    if (!compiled) { state.request = null; renderRequest(null, 'WAITING FOR VISUAL IR'); syncExecutionState(); return; }
    try {
      state.request = buildAgnesRequest({ compiled, size:$('#generation-size')?.value || '2K', ratio:$('#generation-ratio')?.value || '16:9', responseFormat:$('#generation-format')?.value || 'url', references:state.references.map(({source,role,preserve}) => ({source,role,preserve})) });
      const mode = state.references.length ? `${state.references.length} REF → IMAGE` : 'TEXT → IMAGE';
      renderRequest(state.request, mode);
      setStatus(`Request ready · ${state.request.size} · ${state.request.ratio}`);
    } catch (error) { state.request = null; renderRequest(null, 'REQUEST ERROR'); setStatus(error.message, 'error'); }
    syncExecutionState();
  }

  function renderArtifact(artifact) {
    const wrap = $('#generation-result');
    if (wrap) wrap.hidden = false;
    const image = $('#generation-result-image');
    if (image) image.src = artifact.result.src;
    if ($('#generation-result-kind')) $('#generation-result-kind').textContent = `${artifact.result.kind.toUpperCase()} · ${artifact.id}`;
    if ($('#generation-result-copy')) $('#generation-result-copy').textContent = `${artifact.visualIRVersion || 'unknown IR'} · ${artifact.grammarId || 'unknown grammar'}${artifact.iterationOf ? ` · iteration of ${artifact.iterationOf}` : ''}`;
  }

  async function generate(requestOverride = null, context = {}) {
    const request = requestOverride && requestOverride.model ? clone(requestOverride) : clone(state.request);
    const endpoint = proxyEndpoint();
    const token = proxyToken();
    if (!request) return null;
    if (!endpoint) { setStatus('Cloudflare Worker endpoint is required before generation.', 'error'); return null; }
    if (!token) { setStatus('Session proxy token is required before generation.', 'error'); return null; }
    $('#generation-submit')?.setAttribute('disabled', '');
    state.request = clone(request);
    renderRequest(state.request, context.iterationOf ? 'ITERATION REQUEST' : ($('#generation-request-mode')?.textContent || 'AGNES REQUEST'));
    setStatus('Generating through Cloudflare secure Agnes proxy…', 'busy');
    try {
      const result = await generateViaProxy(request, { endpoint, proxyToken: token });
      const baseRequest = clone(context.baseRequest || request);
      const artifact = createGenerationArtifact({ provider:AGNES_MODEL, request, baseRequest, result, ir:context.visualIR || currentIR() });
      artifact.iterationOf = context.iterationOf || null;
      artifact.parentArtifactId = context.iterationOf || null;
      artifact.iterationDelta = context.iterationDelta ? clone(context.iterationDelta) : null;
      state.activeArtifact = artifact;
      renderArtifact(artifact);
      setStatus('Generation complete · artifact ready for evidence-aware QA.', 'success');
      root.dispatchEvent(new CustomEvent('vdos:generation-complete', { detail:{ artifact } }));
      $('#generation-result')?.scrollIntoView({ behavior:root.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'center' });
      return artifact;
    } catch (error) {
      console.error('[Visual Direction OS] Generation failed:', error);
      setStatus(error.message || 'Generation failed.', 'error');
      return null;
    } finally { syncExecutionState(); }
  }

  buildPanel();
  renderReferences();
  const promptNode = $('#director-prompt');
  if (promptNode && typeof MutationObserver !== 'undefined') new MutationObserver(refreshRequest).observe(promptNode, { childList:true, characterData:true, subtree:true });

  root.VisualDirectionOS = Object.assign(root.VisualDirectionOS || {}, { generation:{ get request(){return state.request;}, get activeArtifact(){return state.activeArtifact;}, get references(){return state.references.slice();}, refresh:refreshRequest, setRequest, generate, provider:AGNES_MODEL, get proxy(){return proxyEndpoint();} } });
})(typeof globalThis !== 'undefined' ? globalThis : window);
