import assert from 'node:assert/strict';
import { timingSafeEqual as nodeTimingSafeEqual } from 'node:crypto';
import {
  handleRequest,
  validateGenerationRequest,
  resolveAllowedOrigin,
  buildUpstreamPayload,
  constantTimeEqual
} from './agnes-proxy-worker.mjs';

const AGNES_ENDPOINT = 'https://apihub.agnes-ai.com/v1/images/generations';
const ALLOWED_ORIGIN = 'https://caesar-zzh.github.io';

const validBody = {
  model: 'agnes-image-2.1-flash',
  prompt: 'test generation',
  size: '2K',
  ratio: '16:9',
  extra_body: { response_format: 'url' }
};

const timingSafe = (a, b) => nodeTimingSafeEqual(Buffer.from(a), Buffer.from(b));

assert.deepEqual(validateGenerationRequest(validBody), { valid: true, errors: [] });
assert.equal(validateGenerationRequest({ ...validBody, model: 'other' }).valid, false);
assert.equal(validateGenerationRequest({ ...validBody, size: '8K' }).valid, false);
assert.equal(validateGenerationRequest({ ...validBody, arbitrary: true }).valid, false);
assert.equal(validateGenerationRequest({
  ...validBody,
  extra_body: { image: new Array(9).fill('data:image/png;base64,AA==') }
}).valid, false);

assert.equal(resolveAllowedOrigin(ALLOWED_ORIGIN, `${ALLOWED_ORIGIN},https://example.com`), ALLOWED_ORIGIN);
assert.equal(resolveAllowedOrigin('https://evil.example', ALLOWED_ORIGIN), null);
assert.equal(constantTimeEqual('abc', 'abc', timingSafe), true);
assert.equal(constantTimeEqual('abc', 'abd', timingSafe), false);
assert.equal(constantTimeEqual('short', 'much-longer', timingSafe), false);

assert.deepEqual(buildUpstreamPayload({
  ...validBody,
  extra_body: {
    image: ['data:image/png;base64,AA=='],
    response_format: 'b64_json',
    ignored: true
  },
  ignored: true
}), {
  model: 'agnes-image-2.1-flash',
  prompt: 'test generation',
  size: '2K',
  ratio: '16:9',
  extra_body: {
    image: ['data:image/png;base64,AA=='],
    response_format: 'b64_json'
  }
});

const env = {
  AGNES_API_KEY: 'agnes-server-secret',
  VDOS_PROXY_TOKEN: 'proxy-session-secret',
  VDOS_ALLOWED_ORIGINS: ALLOWED_ORIGIN,
  AGNES_TIMEOUT_MS: '300000'
};

const health = await handleRequest(new Request('https://worker.example/health'), env, { fetchImpl: fetch, timingSafeEqualFn: timingSafe });
assert.equal(health.status, 200);
const healthPayload = await health.json();
assert.equal(healthPayload.status, 'ok');
assert.equal(healthPayload.model, 'agnes-image-2.1-flash');
assert.equal(JSON.stringify(healthPayload).includes('agnes-server-secret'), false);
assert.equal(JSON.stringify(healthPayload).includes('proxy-session-secret'), false);

const preflight = await handleRequest(new Request('https://worker.example/api/agnes-generate', {
  method: 'OPTIONS',
  headers: { Origin: ALLOWED_ORIGIN }
}), env, { fetchImpl: fetch, timingSafeEqualFn: timingSafe });
assert.equal(preflight.status, 204);
assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGIN);
assert.match(preflight.headers.get('Access-Control-Allow-Headers') || '', /X-VDOS-Proxy-Token/i);

const missingOrigin = await handleRequest(new Request('https://worker.example/api/agnes-generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-VDOS-Proxy-Token': env.VDOS_PROXY_TOKEN
  },
  body: JSON.stringify(validBody)
}), env, { fetchImpl: fetch, timingSafeEqualFn: timingSafe });
assert.equal(missingOrigin.status, 403);

const blockedOrigin = await handleRequest(new Request('https://worker.example/api/agnes-generate', {
  method: 'POST',
  headers: {
    Origin: 'https://evil.example',
    'Content-Type': 'application/json',
    'X-VDOS-Proxy-Token': env.VDOS_PROXY_TOKEN
  },
  body: JSON.stringify(validBody)
}), env, { fetchImpl: fetch, timingSafeEqualFn: timingSafe });
assert.equal(blockedOrigin.status, 403);

const missingToken = await handleRequest(new Request('https://worker.example/api/agnes-generate', {
  method: 'POST',
  headers: { Origin: ALLOWED_ORIGIN, 'Content-Type': 'application/json' },
  body: JSON.stringify(validBody)
}), env, { fetchImpl: fetch, timingSafeEqualFn: timingSafe });
assert.equal(missingToken.status, 401);

const wrongToken = await handleRequest(new Request('https://worker.example/api/agnes-generate', {
  method: 'POST',
  headers: {
    Origin: ALLOWED_ORIGIN,
    'Content-Type': 'application/json',
    'X-VDOS-Proxy-Token': 'wrong-secret'
  },
  body: JSON.stringify(validBody)
}), env, { fetchImpl: fetch, timingSafeEqualFn: timingSafe });
assert.equal(wrongToken.status, 401);

let upstreamCall = null;
const fakeFetch = async (url, options) => {
  upstreamCall = { url, options };
  return new Response(JSON.stringify({ data: [{ url: 'https://example.com/generated.png' }] }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

const success = await handleRequest(new Request('https://worker.example/api/agnes-generate', {
  method: 'POST',
  headers: {
    Origin: ALLOWED_ORIGIN,
    'Content-Type': 'application/json',
    'X-VDOS-Proxy-Token': env.VDOS_PROXY_TOKEN
  },
  body: JSON.stringify(validBody)
}), env, { fetchImpl: fakeFetch, timingSafeEqualFn: timingSafe });
assert.equal(success.status, 200);
assert.equal(success.headers.get('Access-Control-Allow-Origin'), ALLOWED_ORIGIN);
assert.equal(upstreamCall.url, AGNES_ENDPOINT);
assert.equal(upstreamCall.options.headers.Authorization, `Bearer ${env.AGNES_API_KEY}`);
assert.deepEqual(JSON.parse(upstreamCall.options.body), validBody);

const invalid = await handleRequest(new Request('https://worker.example/api/agnes-generate', {
  method: 'POST',
  headers: {
    Origin: ALLOWED_ORIGIN,
    'Content-Type': 'application/json',
    'X-VDOS-Proxy-Token': env.VDOS_PROXY_TOKEN
  },
  body: JSON.stringify({ ...validBody, size: '8K' })
}), env, { fetchImpl: fakeFetch, timingSafeEqualFn: timingSafe });
assert.equal(invalid.status, 400);

const missingKey = await handleRequest(new Request('https://worker.example/api/agnes-generate', {
  method: 'POST',
  headers: {
    Origin: ALLOWED_ORIGIN,
    'Content-Type': 'application/json',
    'X-VDOS-Proxy-Token': env.VDOS_PROXY_TOKEN
  },
  body: JSON.stringify(validBody)
}), { ...env, AGNES_API_KEY: '' }, { fetchImpl: fakeFetch, timingSafeEqualFn: timingSafe });
assert.equal(missingKey.status, 500);

console.log('cloudflare agnes proxy tests passed');
