const AGNES_ENDPOINT = 'https://apihub.agnes-ai.com/v1/images/generations';
const MODEL = 'agnes-image-2.1-flash';
const SIZES = new Set(['1K', '2K', '3K', '4K']);
const RATIOS = new Set(['1:1', '3:4', '4:3', '16:9', '9:16', '2:3', '3:2', '21:9']);
const RESPONSE_FORMATS = new Set(['url', 'b64_json']);
const TOP_LEVEL_KEYS = new Set(['model', 'prompt', 'size', 'ratio', 'return_base64', 'extra_body']);
const EXTRA_BODY_KEYS = new Set(['image', 'response_format']);
const MAX_REFERENCES = 8;
const MAX_PROMPT_LENGTH = 24000;
const MAX_BODY_BYTES = 16 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 300000;
const GENERATION_PATH = '/api/agnes-generate';
const TOKEN_HEADER = 'X-VDOS-Proxy-Token';
const encoder = new TextEncoder();

function splitOrigins(value = '') {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

export function resolveAllowedOrigin(origin, configuredOrigins = '') {
  const candidate = String(origin || '').trim();
  if (!candidate) return null;
  return splitOrigins(configuredOrigins).includes(candidate) ? candidate : null;
}

export function constantTimeEqual(candidate, secret, timingSafeEqualFn = null) {
  const left = encoder.encode(String(candidate || ''));
  const right = encoder.encode(String(secret || ''));
  const compare = timingSafeEqualFn || ((a, b) => crypto.subtle.timingSafeEqual(a, b));
  const lengthsMatch = left.byteLength === right.byteLength;
  return lengthsMatch ? compare(left, right) : !compare(left, left);
}

export function validateGenerationRequest(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, errors: ['body must be an object'] };
  }

  for (const key of Object.keys(body)) {
    if (!TOP_LEVEL_KEYS.has(key)) errors.push(`unsupported top-level field: ${key}`);
  }
  if (body.model !== MODEL) errors.push(`model must be ${MODEL}`);
  if (typeof body.prompt !== 'string' || !body.prompt.trim()) errors.push('prompt is required');
  else if (body.prompt.length > MAX_PROMPT_LENGTH) errors.push(`prompt exceeds ${MAX_PROMPT_LENGTH} characters`);
  if (!SIZES.has(body.size)) errors.push('unsupported size');
  if (body.ratio != null && !RATIOS.has(body.ratio)) errors.push('unsupported ratio');
  if (body.return_base64 != null && typeof body.return_base64 !== 'boolean') errors.push('return_base64 must be boolean');

  if (body.extra_body != null) {
    if (typeof body.extra_body !== 'object' || Array.isArray(body.extra_body)) {
      errors.push('extra_body must be an object');
    } else {
      for (const key of Object.keys(body.extra_body)) {
        if (!EXTRA_BODY_KEYS.has(key)) errors.push(`unsupported extra_body field: ${key}`);
      }
      const images = body.extra_body.image;
      if (images != null) {
        if (!Array.isArray(images)) errors.push('extra_body.image must be an array');
        else {
          if (images.length > MAX_REFERENCES) errors.push(`reference count exceeds ${MAX_REFERENCES}`);
          if (images.some((item) => typeof item !== 'string' || !item.trim())) errors.push('reference images must be non-empty strings');
        }
      }
      const responseFormat = body.extra_body.response_format;
      if (responseFormat != null && !RESPONSE_FORMATS.has(responseFormat)) errors.push('unsupported response format');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function buildUpstreamPayload(body) {
  const payload = {
    model: MODEL,
    prompt: body.prompt,
    size: body.size
  };
  if (body.ratio != null) payload.ratio = body.ratio;
  if (body.return_base64 != null) payload.return_base64 = body.return_base64;

  const extra = {};
  if (Array.isArray(body.extra_body?.image)) extra.image = body.extra_body.image.slice(0, MAX_REFERENCES);
  if (body.extra_body?.response_format != null) extra.response_format = body.extra_body.response_format;
  if (Object.keys(extra).length) payload.extra_body = extra;
  return payload;
}

function corsHeaders(origin) {
  const headers = new Headers({
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': `Content-Type, ${TOKEN_HEADER}`,
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    'Vary': 'Origin'
  });
  if (origin) headers.set('Access-Control-Allow-Origin', origin);
  return headers;
}

function jsonResponse(payload, status = 200, origin = null, extraHeaders = {}) {
  const headers = corsHeaders(origin);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  for (const [name, value] of Object.entries(extraHeaders)) headers.set(name, value);
  return new Response(JSON.stringify(payload), { status, headers });
}

function errorResponse(status, message, code, origin = null, details = undefined, extraHeaders = {}) {
  const error = { message, code };
  if (details) error.details = details;
  return jsonResponse({ error }, status, origin, extraHeaders);
}

function healthResponse() {
  return new Response(JSON.stringify({
    status: 'ok',
    service: 'visual-direction-os-agnes-proxy',
    model: MODEL,
    generationPath: GENERATION_PATH,
    auth: 'proxy-token-required'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return { error: 'request_too_large' };
  }
  const contentType = String(request.headers.get('Content-Type') || '').toLowerCase();
  if (!contentType.includes('application/json')) return { error: 'invalid_content_type' };

  let text;
  try { text = await request.text(); }
  catch (_) { return { error: 'invalid_body' }; }
  if (encoder.encode(text).byteLength > MAX_BODY_BYTES) return { error: 'request_too_large' };
  try { return { body: JSON.parse(text) }; }
  catch (_) { return { error: 'invalid_json' }; }
}

function configuredTimeout(env) {
  const parsed = Number(env?.AGNES_TIMEOUT_MS);
  return Number.isFinite(parsed) && parsed >= 1000 ? parsed : DEFAULT_TIMEOUT_MS;
}

export async function handleRequest(request, env = {}, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const timingSafeEqualFn = options.timingSafeEqualFn || null;
  const url = new URL(request.url);

  if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) return healthResponse();
  if (url.pathname !== GENERATION_PATH) return errorResponse(404, 'Not found', 'not_found');

  const requestOrigin = request.headers.get('Origin') || '';
  const allowedOrigin = resolveAllowedOrigin(requestOrigin, env.VDOS_ALLOWED_ORIGINS || '');
  if (!requestOrigin || !allowedOrigin) return errorResponse(403, 'Origin is not allowed', 'origin_not_allowed');

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(allowedOrigin) });
  if (request.method !== 'POST') {
    return errorResponse(405, 'Method not allowed', 'method_not_allowed', allowedOrigin, undefined, { Allow: 'POST, OPTIONS' });
  }

  const apiKey = String(env.AGNES_API_KEY || '').trim();
  const proxySecret = String(env.VDOS_PROXY_TOKEN || '').trim();
  if (!apiKey || !proxySecret) {
    return errorResponse(500, 'Generation proxy is not fully configured', 'proxy_not_configured', allowedOrigin);
  }

  const suppliedToken = request.headers.get(TOKEN_HEADER) || '';
  if (!constantTimeEqual(suppliedToken, proxySecret, timingSafeEqualFn)) {
    return errorResponse(401, 'Proxy authentication failed', 'proxy_unauthorized', allowedOrigin);
  }

  const parsed = await readJsonBody(request);
  if (parsed.error === 'request_too_large') return errorResponse(413, 'Request body is too large', parsed.error, allowedOrigin);
  if (parsed.error === 'invalid_content_type') return errorResponse(415, 'Content-Type must be application/json', parsed.error, allowedOrigin);
  if (parsed.error) return errorResponse(400, 'Request body is not valid JSON', parsed.error, allowedOrigin);

  const validation = validateGenerationRequest(parsed.body);
  if (!validation.valid) {
    return errorResponse(400, 'Invalid generation request', 'invalid_request', allowedOrigin, validation.errors);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), configuredTimeout(env));
  try {
    const upstream = await fetchImpl(AGNES_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildUpstreamPayload(parsed.body)),
      signal: controller.signal
    });

    if (!upstream.ok) {
      let message = `Agnes request failed with HTTP ${upstream.status}`;
      try {
        const payload = await upstream.json();
        message = payload?.error?.message || payload?.message || message;
      } catch (_) {}
      return errorResponse(upstream.status || 502, message, 'agnes_upstream_error', allowedOrigin);
    }

    const headers = corsHeaders(allowedOrigin);
    headers.set('Content-Type', upstream.headers.get('Content-Type') || 'application/json; charset=utf-8');
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    if (error?.name === 'AbortError') return errorResponse(504, 'Agnes generation timed out', 'agnes_timeout', allowedOrigin);
    return errorResponse(502, 'Agnes generation request failed', 'agnes_unreachable', allowedOrigin);
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  fetch(request, env) {
    return handleRequest(request, env);
  }
};
