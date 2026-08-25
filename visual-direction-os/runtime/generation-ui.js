(function attachGenerationUI(root) {
  'use strict';

  if (!root || !root.document) return;
  const runtime = root.VisualDirectionRuntime || {};
  const {
    AGNES_MODEL,
    AGNES_SIZES,
    AGNES_RATIOS,
    AGNES_REFERENCE_ROLES,
    buildAgnesRequest,
    generateViaProxy,
    generateDirectAgnes
  } = runtime;
  if (typeof buildAgnesRequest !== 'function' || typeof generateViaProxy !== 'function') {
    console.error('[Visual Direction OS] Generation runtime failed to initialize.');
    return;
  }

  const document = root.document;
  const $ = (selector, base = document) => base.querySelector(selector);
  const state = { references: [], request: null, result: null };

  function escapeHtml(input) {
    return String(input ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function currentCompiled() {
    return root.VisualDirectionOS?.activeCompiled || null;
  }

  function providerConfig() {
    const proxy = String(root.VDOS_GENERATION_PROXY || '').trim();
    if (proxy) return { mode: 'proxy', endpoint: proxy, ready: true, label: 'Secure proxy connected' };
    if (root.VDOS_ENABLE_DIRECT_AGNES === true) return { mode: 'direct', endpoint: null, ready: false, label: 'Developer direct mode' };
    return { mode: 'preview', endpoint: null, ready: false, label: 'Request preview only' };
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
    section.setAttribute('aria-labelledby', 'generation-title');
    section.innerHTML = `
      <header class="generation-head">
        <div>
          <small>IMAGE GENERATION / PROVIDER ADAPTER</small>
          <h3 id="generation-title">Compile into <em>Agnes Image 2.1 Flash.</em></h3>
          <p>Visual IR stays model-neutral. This adapter converts the active direction into Agnes-native prompt, reference roles, size, ratio and response payload.</p>
        </div>
        <div class="generation-provider">
          <span>MODEL</span><strong>${escapeHtml(AGNES_MODEL || 'agnes-image-2.1-flash')}</strong><small id="generation-provider-state">Checking execution path…</small>
        </div>
      </header>
      <div class="generation-grid">
        <div class="generation-controls">
          <div class="generation-canvas-controls">
            <label><span>RESOLUTION</span><select id="generation-size">${optionList(AGNES_SIZES || ['1K','2K','3K','4K'], '2K')}</select></label>
            <label><span>CANVAS</span><select id="generation-ratio">${optionList(AGNES_RATIOS || ['1:1','3:4','4:3','16:9','9:16','2:3','3:2','21:9'], '16:9')}</select></label>
            <label><span>OUTPUT</span><select id="generation-format"><option value="url">URL</option><option value="b64_json">Base64</option></select></label>
          </div>
          <div class="reference-intake">
            <div><span>REFERENCE IMAGES</span><small>Optional · assign each image a job instead of treating references as a style pile.</small></div>
            <label class="reference-upload" for="generation-reference-input"><input id="generation-reference-input" type="file" accept="image/*" multiple><span>＋ Add references</span><small>Image → Data URI → extra_body.image[]</small></label>
            <div id="generation-reference-list" class="reference-list" aria-live="polite"></div>
          </div>
          <details class="generation-dev" id="generation-dev" hidden>
            <summary>Developer direct mode</summary>
            <p>Direct browser calls expose the key to the local browser session and may be blocked by provider CORS. Production should use a server-side proxy.</p>
            <label for="generation-api-key"><span>SESSION API KEY</span><input id="generation-api-key" type="password" autocomplete="off" placeholder="Not stored"></label>
          </details>
          <div class="generation-actions">
            <button type="button" class="generation-preview" id="generation-preview">Refresh request</button>
            <button type="button" class="generation-submit" id="generation-submit" disabled><span>GENERATE</span><small>Agnes Image 2.1 Flash</small></button>
          </div>
          <p class="generation-status" id="generation-status" role="status">Run DIRECT first to create an active Visual IR.</p>
        </div>
        <div class="generation-preview-pane">
          <div class="generation-preview-head"><span>AGNES REQUEST</span><small id="generation-request-mode">TEXT → IMAGE</small></div>
          <pre id="generation-request-preview" tabindex="0">No active request.</pre>
        </div>
      </div>
      <div class="generation-result" id="generation-result" hidden>
        <div class="generation-result-frame"><img id="generation-result-image" alt="Generated visual direction result"></div>
        <div class="generation-result-meta"><span>GENERATION RESULT</span><strong id="generation-result-kind">—</strong><p id="generation-result-copy">Agnes output rendered from the current Visual IR.</p></div>
      </div>`;
    if (inspector) output.insertBefore(section, inspector); else output.append(section);

    $('#generation-size')?.addEventListener('change', refreshRequest);
    $('#generation-ratio')?.addEventListener('change', refreshRequest);
    $('#generation-format')?.addEventListener('change', refreshRequest);
    $('#generation-preview')?.addEventListener('click', refreshRequest);
    $('#generation-reference-input')?.addEventListener('change', handleFiles);
    $('#generation-api-key')?.addEventListener('input', syncExecutionState);
    $('#generation-submit')?.addEventListener('click', executeGeneration);
    syncExecutionState();
    refreshRequest();
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
    setStatus(`Reading ${files.length} reference image${files.length > 1 ? 's' : ''}…`);
    try {
      const incoming = await Promise.all(files.map(async (file, index) => ({
        id: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        source: await fileToDataUri(file),
        role: 'subject',
        preserve: []
      })));
      state.references.push(...incoming);
      renderReferences();
      refreshRequest();
      event.target.value = '';
    } catch (error) {
      setStatus(error.message || 'Reference image could not be read.', 'error');
    }
  }

  function renderReferences() {
    const list = $('#generation-reference-list');
    if (!list) return;
    if (!state.references.length) {
      list.innerHTML = '<p class="reference-empty">No reference images. Current request is text-to-image.</p>';
      return;
    }
    list.innerHTML = state.references.map((reference, index) => `
      <article class="reference-card" data-reference-id="${escapeHtml(reference.id)}">
        <div class="reference-thumb"><img src="${reference.source}" alt=""><span>${String(index + 1).padStart(2, '0')}</span></div>
        <div class="reference-fields">
          <strong title="${escapeHtml(reference.name)}">${escapeHtml(reference.name)}</strong>
          <label><span>ROLE</span><select data-reference-role>${optionList(AGNES_REFERENCE_ROLES || [], reference.role)}</select></label>
          <label><span>PRESERVE</span><input data-reference-preserve type="text" value="${escapeHtml(reference.preserve.join(', '))}" placeholder="identity, silhouette, camera angle"></label>
        </div>
        <button type="button" data-reference-remove aria-label="Remove ${escapeHtml(reference.name)}">×</button>
      </article>`).join('');

    list.querySelectorAll('.reference-card').forEach((card) => {
      const ref = state.references.find((item) => item.id === card.dataset.referenceId);
      card.querySelector('[data-reference-role]')?.addEventListener('change', (event) => { ref.role = event.target.value; refreshRequest(); });
      card.querySelector('[data-reference-preserve]')?.addEventListener('change', (event) => {
        ref.preserve = String(event.target.value || '').split(',').map((item) => item.trim()).filter(Boolean);
        refreshRequest();
      });
      card.querySelector('[data-reference-remove]')?.addEventListener('click', () => {
        state.references = state.references.filter((item) => item.id !== ref.id);
        renderReferences();
        refreshRequest();
      });
    });
  }

  function requestInputs() {
    return {
      compiled: currentCompiled(),
      size: $('#generation-size')?.value || '2K',
      ratio: $('#generation-ratio')?.value || '16:9',
      responseFormat: $('#generation-format')?.value || 'url',
      references: state.references.map(({ source, role, preserve }) => ({ source, role, preserve }))
    };
  }

  function safeRequestPreview(request) {
    if (!request) return 'No active request.';
    const clone = JSON.parse(JSON.stringify(request));
    if (Array.isArray(clone.extra_body?.image)) {
      clone.extra_body.image = clone.extra_body.image.map((source, index) => source.startsWith('data:') ? `[reference ${index + 1}: Data URI omitted from preview]` : source);
    }
    return JSON.stringify(clone, null, 2);
  }

  function refreshRequest() {
    const compiled = currentCompiled();
    const preview = $('#generation-request-preview');
    if (!compiled) {
      state.request = null;
      if (preview) preview.textContent = 'Run DIRECT first. The Agnes adapter only compiles resolved Visual IR.';
      if ($('#generation-request-mode')) $('#generation-request-mode').textContent = 'WAITING FOR VISUAL IR';
      syncExecutionState();
      return;
    }
    try {
      state.request = buildAgnesRequest(requestInputs());
      if (preview) preview.textContent = safeRequestPreview(state.request);
      const mode = state.references.length ? `${state.references.length} REF${state.references.length > 1 ? 'S' : ''} → IMAGE` : 'TEXT → IMAGE';
      if ($('#generation-request-mode')) $('#generation-request-mode').textContent = mode;
      setStatus(`Request ready · ${state.request.size} · ${state.request.ratio} · ${mode.toLowerCase()}`);
    } catch (error) {
      state.request = null;
      if (preview) preview.textContent = error.message;
      setStatus(error.message, 'error');
    }
    syncExecutionState();
  }

  function syncExecutionState() {
    const config = providerConfig();
    const stateNode = $('#generation-provider-state');
    const button = $('#generation-submit');
    const dev = $('#generation-dev');
    if (stateNode) stateNode.textContent = config.label;
    if (dev) dev.hidden = config.mode !== 'direct';
    const directKey = $('#generation-api-key')?.value?.trim();
    const canExecute = Boolean(state.request) && (config.mode === 'proxy' || (config.mode === 'direct' && directKey));
    if (button) button.disabled = !canExecute;
    if (state.request && config.mode === 'preview') {
      setStatus('Agnes request is compiled. Configure window.VDOS_GENERATION_PROXY to enable secure execution.');
    } else if (state.request && config.mode === 'direct' && !directKey) {
      setStatus('Developer direct mode is enabled. Enter a session-only Agnes API key to execute.');
    }
  }

  function setStatus(message, kind = 'info') {
    const node = $('#generation-status');
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
  }

  async function executeGeneration() {
    if (!state.request) return;
    const config = providerConfig();
    const button = $('#generation-submit');
    if (button) button.disabled = true;
    setStatus('Generating with Agnes Image 2.1 Flash…', 'busy');
    try {
      let result;
      if (config.mode === 'proxy') {
        result = await generateViaProxy(state.request, { endpoint: config.endpoint });
      } else if (config.mode === 'direct') {
        result = await generateDirectAgnes(state.request, { apiKey: $('#generation-api-key')?.value || '' });
      } else {
        throw new Error('No executable generation path is configured');
      }
      state.result = result;
      const wrap = $('#generation-result');
      const image = $('#generation-result-image');
      if (wrap) wrap.hidden = false;
      if (image) image.src = result.src;
      if ($('#generation-result-kind')) $('#generation-result-kind').textContent = result.kind === 'base64' ? 'BASE64 IMAGE' : 'URL IMAGE';
      if ($('#generation-result-copy')) $('#generation-result-copy').textContent = result.revisedPrompt ? `Provider revised prompt: ${result.revisedPrompt}` : 'Rendered from the active Visual IR through the Agnes provider adapter.';
      setStatus('Generation complete. Result is now attached to the active visual direction.', 'success');
      wrap?.scrollIntoView({ behavior: root.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    } catch (error) {
      console.error('[Visual Direction OS] Agnes generation failed:', error);
      setStatus(error.message || 'Generation failed.', 'error');
    } finally {
      syncExecutionState();
    }
  }

  buildPanel();
  renderReferences();

  const promptNode = $('#director-prompt');
  if (promptNode && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => refreshRequest()).observe(promptNode, { childList: true, characterData: true, subtree: true });
  }

  root.VisualDirectionOS = Object.assign(root.VisualDirectionOS || {}, {
    generation: {
      get request() { return state.request; },
      get references() { return state.references.slice(); },
      refresh: refreshRequest,
      provider: AGNES_MODEL || 'agnes-image-2.1-flash'
    }
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
