const assert = require('node:assert/strict');
const {
  AGNES_MODEL,
  AGNES_ENDPOINT,
  AGNES_SIZES,
  AGNES_RATIOS,
  AGNES_REFERENCE_ROLES,
  buildAgnesPrompt,
  buildAgnesRequest,
  applyAgnesSequenceContext
} = require('./agnes-adapter.js');

const compiled = {
  version:'0.1.0', engine:'deterministic-v0.1', grammarId:'boundary-relational',
  must:['Narrative verb: WITHDRAW; preserve the narrative function before surface styling.','Primary variable: Boundary; it must carry the main visual storytelling load.','Composition: medium wide, small subject, high negative space; keep the platform geometry dominant.'],
  should:['Camera: witness; static with restrained distance.','Color: relational ownership; boundary-local migration.'],
  optional:['Texture: selective paper grain.'],
  antiRules:['no global watercolor filter','no generic cinematic teal-orange grade'],
  evidenceGaps:[{field:'temporal.signature',status:'evidence_incomplete',confidence:0.42}]
};

assert.equal(AGNES_MODEL,'agnes-image-2.1-flash');
assert.equal(AGNES_ENDPOINT,'https://apihub.agnes-ai.com/v1/images/generations');
assert.ok(AGNES_SIZES.includes('2K'));
assert.ok(AGNES_RATIOS.includes('16:9'));
assert.ok(AGNES_REFERENCE_ROLES.includes('continuity'));

const prompt=buildAgnesPrompt(compiled);
assert.match(prompt,/Visual hierarchy and narrative intent:/);
assert.match(prompt,/WITHDRAW/);
assert.match(prompt,/Do not:/);
assert.doesNotMatch(prompt,/EVIDENCE GAPS:/);

const textRequest=buildAgnesRequest({compiled,size:'2K',ratio:'16:9'});
assert.equal(textRequest.extra_body.response_format,'url');
assert.equal('image' in textRequest.extra_body,false);
const textBase64Request=buildAgnesRequest({compiled,size:'1K',ratio:'1:1',responseFormat:'b64_json'});
assert.equal(textBase64Request.return_base64,true);

const refs=[
  {source:'data:image/png;base64,CHAR',role:'character',preserve:['identity','silhouette']},
  {source:'https://example.com/composition.png',role:'composition',preserve:['camera angle']}
];
const imageRequest=buildAgnesRequest({compiled,size:'1K',ratio:'3:4',references:refs,responseFormat:'b64_json'});
assert.deepEqual(imageRequest.extra_body.image,refs.map((ref)=>ref.source));
assert.match(imageRequest.prompt,/Reference image 1/i);
assert.match(imageRequest.prompt,/Reference image 2/i);

const base=buildAgnesRequest({compiled,responseFormat:'b64_json',references:[{source:'data:image/png;base64,CHAR',role:'character'}]});
const snapshot=JSON.stringify(base);
const finalRequest=applyAgnesSequenceContext(base,{
  sequenceIntent:'Move from isolation toward action.',
  shotIntent:'Cut to a frontal close-up.',
  continuityReference:{source:'data:image/webp;base64,CONT',role:'continuity'}
});
assert.equal(JSON.stringify(base),snapshot,'base request must remain context-neutral');
assert.equal(finalRequest.extra_body.image[0],'data:image/webp;base64,CONT');
assert.equal(finalRequest.extra_body.image[1],'data:image/png;base64,CHAR');
assert.equal('return_base64' in finalRequest,false);
assert.match(finalRequest.prompt,/SEQUENCE DIRECTION/);
assert.match(finalRequest.prompt,/CURRENT SHOT INTENT/);
assert.match(finalRequest.prompt,/same visual world/i);
assert.match(finalRequest.prompt,/Reference image 1 is the approved continuity frame/);
assert.match(finalRequest.prompt,/Reference image 2: use it for character identity/i,'ordinary reference numbering must shift after continuity is inserted');
assert.ok(finalRequest.prompt.indexOf('CURRENT SHOT INTENT') < finalRequest.prompt.indexOf('Visual hierarchy and narrative intent'));

const rerun=applyAgnesSequenceContext(base,{
  sequenceIntent:'Move from isolation toward action.',
  shotIntent:'Cut to a frontal close-up.',
  continuityReference:{source:'data:image/webp;base64,NEW',role:'continuity'}
});
assert.equal(rerun.extra_body.image[0],'data:image/webp;base64,NEW');
assert.equal(rerun.extra_body.image.filter((x)=>x.includes('CONT')).length,0);

const noContinuity=applyAgnesSequenceContext(base,{sequenceIntent:'Sequence.',shotIntent:'Shot.'});
assert.deepEqual(noContinuity.extra_body.image,base.extra_body.image);
assert.match(noContinuity.prompt,/SEQUENCE DIRECTION/);
assert.match(noContinuity.prompt,/CURRENT SHOT INTENT/);

assert.throws(()=>buildAgnesRequest({compiled,size:'8K',ratio:'16:9'}),/Unsupported Agnes size/);
assert.throws(()=>buildAgnesRequest({compiled,size:'2K',ratio:'5:4'}),/Unsupported Agnes ratio/);
assert.throws(()=>buildAgnesRequest({compiled,references:[{source:'',role:'character'}]}),/reference source/i);

console.log('agnes adapter tests passed');