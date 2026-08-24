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

function splitOrigins(value = '') {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function resolveAllowedOrigin(origin, configuredOrigins = process.env.VDOS_ALLOWED_ORIGINS || '') {
  const candidate = String(origin || '').trim();
  if (!candidate) return null;
  return splitOrigins(configuredOrigins).includes(candidate) ? candidate : null;
}

function validateRequest(body) {
  const errors = [];
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { valid: false, errors: ['body must be an object'] };

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

function buildUpstreamPayload(body) {
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

function applyCors(req, res) {
  const origin = req?.headers?.origin || req?.headers?.Origin || '';
  const configured = process.env.VDOS_ALLOWED_ORIGINS || '';
  const allowed = resolveAllowedOrigin(origin, configured);
  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', allowed);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  return { origin, configured, allowed };
}

function sendError(res, status, message, code) {
  return res.status(status).json({ error: { message, code } });
}

async function handler(req, res) {
  const cors = applyCors(req, res);
  if (cors.origin && !cors.allowed) return sendError(res, 403, 'Origin is not allowed', 'origin_not_allowed');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return sendError(res, 405, 'Method not allowed', 'method_not_allowed');
  }

  const apiKey = String(process.env.AGNES_API_KEY || '').trim();
  if (!apiKey) return sendError(res, 500, 'Generation proxy is not configured', 'proxy_not_configured');

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); }
    catch (_) { return sendError(res, 400, 'Request body is not valid JSON', 'invalid_json'); }
  }
  const bodyBytes = Buffer.byteLength(JSON.stringify(body || {}), 'utf8');
  if (bodyBytes > MAX_BODY_BYTES) return sendError(res, 413, 'Request body is too large', 'request_too_large');

  const validation = validateRequest(body);
  if (!validation.valid) return res.status(400).json({ error: { message: 'Invalid generation request', code: 'invalid_request', details: validation.errors } });

  const controller = new AbortController();
  const timeoutMs = Math.max(1000, Number(process.env.AGNES_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const upstream = await fetch(AGNES_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildUpstreamPayload(body)),
      signal: controller.signal
    });

    let payload;
    try { payload = await upstream.json(); }
    catch (_) { payload = { error: { message: 'Agnes returned a non-JSON response' } }; }

    if (!upstream.ok) {
      const message = payload?.error?.message || payload?.message || `Agnes request failed with HTTP ${upstream.status}`;
      return sendError(res, upstream.status || 502, message, 'agnes_upstream_error');
    }
    return res.status(200).json(payload);
  } catch (error) {
    if (error?.name === 'AbortError') return sendError(res, 504, 'Agnes generation timed out', 'agnes_timeout');
    return sendError(res, 502, 'Agnes generation request failed', 'agnes_unreachable');
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = handler;
module.exports.AGNES_ENDPOINT = AGNES_ENDPOINT;
module.exports.validateRequest = validateRequest;
module.exports.resolveAllowedOrigin = resolveAllowedOrigin;
module.exports.buildUpstreamPayload = buildUpstreamPayload;
