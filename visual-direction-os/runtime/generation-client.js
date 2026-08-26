(function attachGenerationClient(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function generationClientFactory(root) {
  'use strict';

  const DEFAULT_AGNES_ENDPOINT = 'https://apihub.agnes-ai.com/v1/images/generations';
  const PROXY_TOKEN_HEADER = 'X-VDOS-Proxy-Token';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function valueOf(node, fallback = null) {
    if (node && typeof node === 'object' && 'value' in node) return node.value;
    return node ?? fallback;
  }

  function requestsBase64(request) {
    return request?.return_base64 === true || request?.extra_body?.response_format === 'b64_json';
  }

  function base64Result(item) {
    const src = String(item.b64_json).startsWith('data:') ? item.b64_json : `data:image/png;base64,${item.b64_json}`;
    return { kind: 'base64', src, revisedPrompt: item.revised_prompt ?? null };
  }

  function normalizeGenerationResponse(payload, request = null) {
    const item = payload && Array.isArray(payload.data) ? payload.data[0] : null;
    if (requestsBase64(request)) {
      if (item?.b64_json) return base64Result(item);
      if (item?.url) throw new Error('Base64 generation was requested, but Agnes returned only a remote image URL');
    }
    if (item?.url) {
      return { kind: 'url', src: item.url, revisedPrompt: item.revised_prompt ?? null };
    }
    if (item?.b64_json) return base64Result(item);
    throw new Error('Generation response did not include an image URL or Base64 payload');
  }

  function createGenerationArtifact({ provider, request, baseRequest = null, result, ir, references = [], id, createdAt } = {}) {
    if (!request || typeof request !== 'object') throw new Error('Generation artifact requires the executed request');
    if (!result || typeof result !== 'object' || !result.src) throw new Error('Generation artifact requires a generation result');
    if (!Array.isArray(references)) throw new Error('Generation artifact references must be an array');
    const timestamp = createdAt || new Date().toISOString();
    const randomId = root?.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return {
      id: id || `gen-${randomId}`,
      createdAt: timestamp,
      provider: String(provider || request.model || 'unknown'),
      request: clone(request),
      baseRequest: clone(baseRequest || request),
      result: clone(result),
      references: clone(references),
      visualIR: clone(ir || null),
      visualIRVersion: ir?.metadata?.version || null,
      grammarId: valueOf(ir?.world?.grammarId, null),
      measurements: null,
      evaluation: null
    };
  }

  async function readError(response) {
    let raw = '';
    try { raw = await response.text(); } catch (_) { raw = ''; }
    if (!raw) return `HTTP ${response.status || 'error'}`;
    try {
      const parsed = JSON.parse(raw);
      const message = parsed?.error?.message || parsed?.message || raw;
      return `HTTP ${response.status || 'error'}: ${message}`;
    } catch (_) {
      return `HTTP ${response.status || 'error'}: ${raw.slice(0, 500)}`;
    }
  }

  async function postGeneration(endpoint, request, { headers = {}, fetchImpl } = {}) {
    const fetchFn = fetchImpl || root?.fetch;
    if (typeof fetchFn !== 'function') throw new Error('No fetch implementation is available for image generation');
    const response = await fetchFn(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(request)
    });
    if (!response?.ok) throw new Error(await readError(response || {}));
    return normalizeGenerationResponse(await response.json(), request);
  }

  async function generateViaProxy(request, { endpoint, proxyToken, fetchImpl } = {}) {
    const safeEndpoint = String(endpoint || '').trim();
    const safeToken = String(proxyToken || '').trim();
    if (!safeEndpoint) throw new Error('A generation proxy endpoint is required');
    if (!safeToken) throw new Error('A session proxy token is required');
    return postGeneration(safeEndpoint, request, {
      fetchImpl,
      headers: { [PROXY_TOKEN_HEADER]: safeToken }
    });
  }

  async function generateDirectAgnes(request, { apiKey, endpoint = DEFAULT_AGNES_ENDPOINT, fetchImpl } = {}) {
    const safeKey = String(apiKey || '').trim();
    if (!safeKey) throw new Error('An Agnes API key is required for direct generation');
    return postGeneration(endpoint, request, {
      fetchImpl,
      headers: { Authorization: `Bearer ${safeKey}` }
    });
  }

  return {
    PROXY_TOKEN_HEADER,
    normalizeGenerationResponse,
    createGenerationArtifact,
    generateViaProxy,
    generateDirectAgnes
  };
});
