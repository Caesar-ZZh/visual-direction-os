'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const fixtures = require('../../visual-direction-os/project-breakdown-fixtures.js');
const { createProductionHandler } = require('./_handler.js');

function makeRes() {
  return {
    statusCode:200, headers:{}, body:'',
    setHeader(key,value){ this.headers[String(key).toLowerCase()] = value; },
    status(code){ this.statusCode = code; return this; },
    json(value){ this.body = JSON.stringify(value); return this; }
  };
}

(async () => {
  const calls = [];
  const handler = createProductionHandler({
    env:{
      OPENAI_API_KEY:'sk-test', OPENAI_MODEL:'gpt-5.6',
      VDOS_ALLOWED_ORIGIN:'https://caesar-zzh.github.io', NODE_ENV:'production'
    },
    fetchImpl:async (url,options) => {
      calls.push({url,options});
      return { ok:true, status:200, async json(){ return { output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(fixtures.breakdown)}]}] }; } };
    }
  });
  const res = makeRes();
  await handler({ method:'POST', headers:{origin:'https://caesar-zzh.github.io'}, body:{sourceNarrative:'A story of compliance becoming refusal.',directorIntent:''} }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(JSON.parse(res.body).scenes.length, 4);
  assert.equal(JSON.parse(calls[0].options.body).store, false);
  assert.equal(typeof require('./breakdown.js'), 'function', 'breakdown.js must export a serverless handler function');

  const vercel = JSON.parse(fs.readFileSync(path.join(__dirname,'..','..','vercel.json'),'utf8'));
  assert.ok(vercel.functions?.['api/project/*.js'], 'vercel.json must configure Project Serverless functions');
  console.log('project _production.test.js passed');
})().catch(error => { console.error(error); process.exit(1); });
