const assert = require('assert');
const fixtures = require('../../visual-direction-os/narrative-demo-fixtures.js');
const { createHandler } = require('./_handler.js');

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(key, value) { this.headers[String(key).toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = JSON.stringify(value); return this; }
  };
}

async function run(handler, req) {
  const res = makeRes();
  await handler(req, res);
  return { ...res, jsonBody: res.body ? JSON.parse(res.body) : null };
}

(async () => {
  const calls = [];
  const provider = {
    async generate(input) {
      calls.push(input);
      return fixtures[input.stage];
    }
  };
  const handler = createHandler({
    stage: 'interpret',
    provider,
    allowedOrigin: 'https://caesar-zzh.github.io',
    production: true
  });

  const projectContext = {
    projectIntent: 'End with reclaimed agency.',
    sceneRole: 'rupture',
    narrativeFunction: 'Recognition becomes explicit refusal.',
    startingState: 'Agency is contested.',
    endingState: 'The character refuses.',
    agencyTransition: ['contested', 'character']
  };
  const request = {
    method: 'POST',
    headers: { origin: 'https://caesar-zzh.github.io' },
    body: { narrative: 'A character recognizes an assignment as control and refuses it.', directorIntent: 'End with reclaimed agency.', projectContext }
  };
  const ok = await run(handler, request);
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.headers['access-control-allow-origin'], 'https://caesar-zzh.github.io');
  assert.equal(ok.headers['vary'], 'Origin');
  assert.equal(ok.jsonBody.readings.length, 2);
  assert.equal(calls[0].stage, 'interpret');
  assert.equal(calls[0].input.narrative, request.body.narrative);
  assert.deepEqual(calls[0].input.projectContext, projectContext, 'Interpret provider must receive validated Project Context');

  const invalidContext = await run(handler, { ...request, body: { ...request.body, projectContext: { ...projectContext, camera: { perspective: 'character' } } } });
  assert.equal(invalidContext.statusCode, 400);
  assert.equal(invalidContext.jsonBody.error.code, 'BAD_REQUEST');

  const blocked = await run(handler, { ...request, headers: { origin: 'https://evil.example' } });
  assert.equal(blocked.statusCode, 403);
  assert.equal(blocked.jsonBody.error.code, 'FORBIDDEN');

  const wrongMethod = await run(handler, { ...request, method: 'GET' });
  assert.equal(wrongMethod.statusCode, 405);
  assert.equal(wrongMethod.jsonBody.error.code, 'METHOD_NOT_ALLOWED');

  const tooLong = await run(handler, { ...request, body: { narrative: 'x'.repeat(2001), directorIntent: '' } });
  assert.equal(tooLong.statusCode, 400);
  assert.equal(tooLong.jsonBody.error.code, 'BAD_REQUEST');

  const providerFailure = createHandler({
    stage: 'interpret',
    provider: { async generate() { const error = new Error('secret upstream detail'); error.code = 'PROVIDER'; throw error; } },
    allowedOrigin: 'https://caesar-zzh.github.io',
    production: true
  });
  const failed = await run(providerFailure, request);
  assert.equal(failed.statusCode, 502);
  assert.equal(failed.jsonBody.error.code, 'PROVIDER');
  assert.equal(failed.body.includes('secret upstream detail'), false, 'provider internals must not leak to browser responses');

  const ids = ['setup','pressure','rupture','release','new-ownership'];
  const labels = ['SETUP','PRESSURE','RUPTURE','RELEASE','NEW OWNERSHIP'];
  const patchSlots = {
    'camera.distance': { status:'open' },
    'camera.perspective': { status:'compiler-derived', support:'supported' }
  };
  const sequenceSkeleton = {
    version:'0.1.0', mode:'compiler-first', grammarId:'camera-authority-transfer', grammarStatus:'resolved',
    readingId:'reading-1', strategyId:'camera',
    agencyConstraint:{ path:['world','contested','character'], start:'world', end:'character', rule:'monotonic-progression' },
    beats:ids.map((id,index)=>({
      id, label:labels[index], structure:{primaryVariable:'camera',supportingVariables:['space'],restrainedVariables:['texture']},
      agencySlot:index===0?{status:'fixed',value:'world'}:index===4?{status:'fixed',value:'character'}:{status:'open',allowedValues:['world','contested','character']},
      patchSlots
    }))
  };
  const reading = {
    id:'reading-1', title:'AGENCY', confidence:'high',
    narrativeProblem:{value:'problem',sourceType:'explicit',basis:'basis'}, coreConflict:{value:'conflict',sourceType:'explicit',basis:'basis'},
    startingState:{value:'start',sourceType:'explicit',basis:'basis'}, endingState:{value:'end',sourceType:'explicit',basis:'basis'},
    turningPoint:{value:'turn',sourceType:'explicit',basis:'basis'}, agencyTransition:{value:['world','contested','character'],sourceType:'explicit',basis:'basis'}
  };
  const strategy = { id:'camera', title:'CAMERA', grammarId:'camera-authority-transfer', primaryVariable:'camera', supportingVariables:['space'], restrainedVariables:['texture'], mechanism:'Authority follows agency.', rationale:'Perspective carries authorship.' };
  const sequenceCompletion = { sequenceCompletion:{ beats:ids.map((id,index)=>({
    id, narrativeBeat:`beat ${index}`, agency:index<2?'world':index<4?'contested':'character', visualEvents:[], rationale:'reason',
    openPatch:index===0?{variables:{camera:{distance:'wide'}}}:{}
  })) } };
  const sequenceCalls = [];
  const sequenceHandler = createHandler({
    stage:'sequence',
    provider:{ async generate(input) { sequenceCalls.push(input); return sequenceCompletion; } },
    allowedOrigin:'https://caesar-zzh.github.io', production:true
  });
  const sequenceRequest = {
    method:'POST', headers:{origin:'https://caesar-zzh.github.io'},
    body:{ narrative:'A character refuses control.', directorIntent:'Restore agency.', reading, strategy, sequenceSkeleton }
  };
  const sequenceOk = await run(sequenceHandler, sequenceRequest);
  assert.equal(sequenceOk.statusCode, 200);
  assert.ok(sequenceOk.jsonBody.sequenceCompletion);
  assert.deepEqual(sequenceCalls[0].input.sequenceSkeleton, sequenceSkeleton, 'provider receives the validated compiler Skeleton');

  const forbiddenHandler = createHandler({
    stage:'sequence',
    provider:{ async generate() {
      const invalid = JSON.parse(JSON.stringify(sequenceCompletion));
      invalid.sequenceCompletion.beats[2].openPatch = { variables:{camera:{perspective:'world'}} };
      return invalid;
    } },
    allowedOrigin:'https://caesar-zzh.github.io', production:true
  });
  const forbiddenSequence = await run(forbiddenHandler, sequenceRequest);
  assert.equal(forbiddenSequence.statusCode, 502, 'handler rejects model writes to compiler-owned Skeleton paths');
  assert.equal(forbiddenSequence.jsonBody.error.code, 'SCHEMA');

  console.log('_handler.test.js passed');
})().catch(error => {
  console.error(error);
  process.exit(1);
});