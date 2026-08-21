'use strict';
const assert = require('assert');
const fixtures = require('../../visual-direction-os/project-breakdown-fixtures.js');
const { createHandler } = require('./_handler.js');

function makeRes() {
  return {
    statusCode:200, headers:{}, body:'',
    setHeader(key,value){ this.headers[String(key).toLowerCase()] = value; },
    status(code){ this.statusCode = code; return this; },
    json(value){ this.body = JSON.stringify(value); return this; },
    end(){ return this; }
  };
}
async function run(handler, req) {
  const res = makeRes();
  await handler(req,res);
  return { ...res, jsonBody:res.body ? JSON.parse(res.body) : null };
}

(async () => {
  const calls = [];
  const handler = createHandler({
    provider:{ async generate(args){ calls.push(args); return fixtures.breakdown; } },
    allowedOrigin:'https://caesar-zzh.github.io', production:true
  });
  const request = { method:'POST', headers:{origin:'https://caesar-zzh.github.io'}, body:{sourceNarrative:'A story about compliance becoming refusal.',directorIntent:'End with reclaimed agency.'} };
  const ok = await run(handler, request);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.jsonBody.scenes.length, 4);
  assert.equal(calls[0].input.sourceNarrative, request.body.sourceNarrative);

  const blocked = await run(handler, { ...request, headers:{origin:'https://evil.example'} });
  assert.equal(blocked.statusCode, 403);
  const wrongMethod = await run(handler, { ...request, method:'GET' });
  assert.equal(wrongMethod.statusCode, 405);
  const empty = await run(handler, { ...request, body:{sourceNarrative:'',directorIntent:''} });
  assert.equal(empty.statusCode, 400);

  const invalidProvider = createHandler({
    provider:{ async generate(){ return { ...fixtures.breakdown, scenes:[{...fixtures.breakdown.scenes[0],camera:{perspective:'character'}}] }; } },
    allowedOrigin:'https://caesar-zzh.github.io', production:true
  });
  const invalid = await run(invalidProvider, request);
  assert.equal(invalid.statusCode, 502);
  assert.equal(invalid.jsonBody.error.code, 'SCHEMA');
  console.log('project _handler.test.js passed');
})().catch(error => { console.error(error); process.exit(1); });
