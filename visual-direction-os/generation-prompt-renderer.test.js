const test=require('node:test');
const assert=require('node:assert/strict');
const language=require('./prompt-language-registry.js');
const renderer=require('./generation-prompt-renderer.js');

const ir={
 schemaVersion:'0.1.0',mode:'generation-translation',sceneId:'scene-03',beatId:'setup',
 meta:{schema:'GenerationPromptIR',version:'0.1.0',sourceVisualIRVersion:'0.3.0',engine:'deterministic',grammarId:'camera-authority-transfer',readingId:'reading-01',strategyId:'strategy-01',sceneId:'scene-03',beatId:'setup'},
 source:{readingId:'reading-01',strategyId:'strategy-01',grammarId:'camera-authority-transfer',sequenceOrigin:'compiler-first',skeletonVersion:'0.1.0',projectConstraints:[]},
 content:{sceneDescription:{value:'A young employee enters the office.',owner:'director',source:'narrative-input'},beatRealization:{value:'The world still holds the frame.',owner:'ai',source:'sequence-completion'},visualEvents:[{value:'enter',owner:'ai',source:'sequence-completion'}]},
 intent:{},
 required:[
  {kind:'structural',key:'primaryVariable',value:'Camera',owner:'director-confirmed',authorityClass:'required'},
  {kind:'structural',key:'supportingVariables',value:['Space'],owner:'director-confirmed',authorityClass:'required'},
  {kind:'structural',key:'restrainedVariables',value:['Texture'],owner:'director-confirmed',authorityClass:'required'},
  {kind:'exact',path:'agency',value:'world',owner:'compiler',support:'supported',authorityClass:'required',projectSupport:[]},
  {kind:'exact',path:'camera.perspective',value:'world',owner:'compiler',support:'supported',authorityClass:'required',projectSupport:[]}
 ],
 guided:[{path:'color.temperature',value:'cool',owner:'ai',authorityClass:'guided'}],
 open:[{field:'medium',owner:'none',authorityClass:'open'}],
 blocked:[{path:'space.depth',owner:'none',authorityClass:'blocked'}],
 antiRules:[{value:'Do not change camera authority without narrative cause.',owner:'grammar/evidence',authorityClass:'anti-rule'}],
 evidenceGaps:[{field:'temporal.signature',status:'evidence_incomplete',confidence:0.42,source:'visual-ir'}],
 provenance:{requiredFields:[],guidedFields:[],projectConstraintRefs:[],applyEvidence:null},
 compileState:{phase:'proposal',applyRevision:null},readiness:{status:'DRAFT',reasons:[{code:'APPLY_REQUIRED'}]},fingerprint:'pir-1111111111111111'
};

test('language registry exposes only supported exact phrases and structural templates',()=>{
 assert.equal(language.getExactPhrase('camera.perspective','mixed'),'Maintain mixed camera authority between world and character.');
 assert.equal(language.getExactPhrase('color.territory','contested'),'Maintain contested color territory between world and character.');
 assert.equal(language.getExactPhrase('camera.perspective','dutch-angle'),null);
 assert.equal(language.renderStructuralDirective({key:'primaryVariable',value:'Camera'}),'Camera carries the primary visual change.');
 assert.equal(language.renderStructuralDirective({key:'supportingVariables',value:[]}),null);
});

test('renderer is byte-deterministic with fixed generation and audit sections',()=>{
 const first=renderer.renderPromptIR(ir);const second=renderer.renderPromptIR(structuredClone(ir));
 assert.deepEqual(first,second);assert.equal(first.rendererVersion,'0.1.0');
 assert.match(first.neutralText,/^SCENE CONTENT/m);assert.match(first.neutralText,/NARRATIVE BEAT/);assert.match(first.neutralText,/DIRECTING PRIORITY/);assert.match(first.neutralText,/REQUIRED VISUAL BEHAVIOR/);assert.match(first.neutralText,/VISUAL GUIDANCE/);
 assert.doesNotMatch(first.neutralText,/EVIDENCE GAPS:/);assert.doesNotMatch(first.neutralText,/Medium: unspecified|choose an appropriate/i);
 assert.match(first.auditText,/VISUAL DIRECTION \/ MODEL-NEUTRAL — IR 0\.3\.0 \/ deterministic \/ grammar camera-authority-transfer/);
 assert.match(first.auditText,/EVIDENCE GAPS:/);assert.match(first.negativeText,/Do not change camera authority/);
 assert.ok(first.neutralText.indexOf('SCENE CONTENT')<first.neutralText.indexOf('NARRATIVE BEAT'));
 assert.ok(first.neutralText.indexOf('NARRATIVE BEAT')<first.neutralText.indexOf('DIRECTING PRIORITY'));
});

test('unrenderable REQUIRED exact value fails closed',()=>{
 const bad=structuredClone(ir);bad.required.push({kind:'exact',path:'camera.perspective',value:'dutch-angle',owner:'compiler',support:'supported',authorityClass:'required'});
 assert.throws(()=>renderer.renderPromptIR(bad),e=>e?.code==='UNRENDERABLE_REQUIRED_VALUE');
});

test('unmapped GUIDED values use deterministic verbatim fallback',()=>{
 const guided=structuredClone(ir);guided.guided=[{path:'texture.noise',value:'localized near the doorway',owner:'ai',authorityClass:'guided'}];
 assert.match(renderer.renderPromptIR(guided).neutralText,/Guidance for texture\.noise: localized near the doorway\./);
});

test('renderer injects no generic quality/style vocabulary but preserves literal Director content',()=>{
 const output=renderer.renderPromptIR(ir).neutralText.toLowerCase();
 for(const word of ['masterpiece','best quality','cinematic','epic','8k','photorealistic','award-winning']) assert.equal(output.includes(word),false);
 const literal=structuredClone(ir);literal.content.sceneDescription.value='The Director literally writes cinematic in the scene description.';
 assert.match(renderer.renderPromptIR(literal).neutralText,/cinematic/);
});

test('OPEN and BLOCKED fields are absent from generation-facing text',()=>{
 const out=renderer.renderPromptIR(ir);
 assert.doesNotMatch(out.neutralText,/space\.depth|unresolved-evidence|medium/i);
 assert.doesNotMatch(out.negativeText,/space\.depth|medium/i);
});

test('semantic object key order does not change typed visual-event rendering',()=>{
 const first=structuredClone(ir);first.content.visualEvents=[{value:{type:'camera',label:'enter'},owner:'ai',source:'sequence-completion'}];
 const second=structuredClone(ir);second.content.visualEvents=[{value:{label:'enter',type:'camera'},owner:'ai',source:'sequence-completion'}];
 assert.equal(renderer.renderPromptIR(first).neutralText,renderer.renderPromptIR(second).neutralText);
});
