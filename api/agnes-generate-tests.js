const assert = require('node:assert/strict');

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    end() { return this; }
  };
}

(async () => {
  const proxy = require('./agnes-generate.js');
  const { validateRequest, resolveAllowedOrigin, buildUpstreamPayload } = proxy;

  assert.deepEqual(validateRequest({
    model: 'agnes-image-2.1-flash',
    prompt: 'test',
    size: '2K',
    ratio: '16:9',
    extra_body: { response_format: 'url' }
  }), { valid: true, errors: [] });

  assert.equal(validateRequest({ model: 'other', prompt: 'x', size: '2K' }).valid, false);
  assert.equal(validateRequest({ model: 'agnes-image-2.1-flash', prompt: 'x', size: '8K' }).valid, false);
  assert.equal(validateRequest({ model: 'agnes-image-2.1-flash', prompt: 'x', size: '2K', ratio: '5:4' }).valid, false);
  assert.equal(validateRequest({
    model: 'agnes-image-2.1-flash', prompt: 'x', size: '2K',
    extra_body: { image: new Array(9).fill('data:image/png;base64,AA==') }
  }).valid, false);
  assert.equal(validateRequest({
    model: 'agnes-image-2.1-flash', prompt: 'x', size: '2K', arbitrary: 'nope'
  }).valid, false);

  const payload = buildUpstreamPayload({
    model: 'agnes-image-2.1-flash',
    prompt: 'hello',
    size: '1K',
    ratio: '1:1',
    extra_body: { image: ['data:image/png;base64,AA=='], response_format: 'b64_json', ignored: true },
    ignored: 'field'
  });
  assert.deepEqual(payload, {
    model: 'agnes-image-2.1-flash',
    prompt: 'hello',
    size: '1K',
    ratio: '1:1',
    extra_body: { image: ['data:image/png;base64,AA=='], response_format: 'b64_json' }
  });

  assert.equal(resolveAllowedOrigin('https://caesar-zzh.github.io', 'https://caesar-zzh.github.io,https://example.com'), 'https://caesar-zzh.github.io');
  assert.equal(resolveAllowedOrigin('https://evil.example', 'https://caesar-zzh.github.io'), null);

  const oldKey = process.env.AGNES_API_KEY;
  const oldOrigins = process.env.VDOS_ALLOWED_ORIGINS;
  process.env.AGNES_API_KEY = 'server-secret';
  process.env.VDOS_ALLOWED_ORIGINS = 'https://caesar-zzh.github.io';

  let upstream;
  const oldFetch = global.fetch;
  global.fetch = async (url, options) => {
    upstream = { url, options };
    return {
      ok: true,
      status: 200,
      async json() { return { data: [{ url: 'https://example.com/generated.png' }] }; }
    };
  };

  const req = {
    method: 'POST',
    headers: { origin: 'https://caesar-zzh.github.io' },
    body: {
      model: 'agnes-image-2.1-flash',
      prompt: 'hello',
      size: '2K',
      ratio: '16:9',
      extra_body: { response_format: 'url' }
    }
  };
  const res = mockResponse();
  await proxy(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['Access-Control-Allow-Origin'], 'https://caesar-zzh.github.io');
  assert.equal(upstream.url, 'https://apihub.agnes-ai.com/v1/images/generations');
  assert.equal(upstream.options.headers.Authorization, 'Bearer server-secret');
  assert.deepEqual(JSON.parse(upstream.options.body), req.body);

  const wrongMethod = mockResponse();
  await proxy({ method: 'GET', headers: {}, body: {} }, wrongMethod);
  assert.equal(wrongMethod.statusCode, 405);

  const blockedOrigin = mockResponse();
  await proxy({ method: 'POST', headers: { origin: 'https://evil.example' }, body: req.body }, blockedOrigin);
  assert.equal(blockedOrigin.statusCode, 403);

  global.fetch = oldFetch;
  if (oldKey == null) delete process.env.AGNES_API_KEY; else process.env.AGNES_API_KEY = oldKey;
  if (oldOrigins == null) delete process.env.VDOS_ALLOWED_ORIGINS; else process.env.VDOS_ALLOWED_ORIGINS = oldOrigins;

  console.log('agnes proxy tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
