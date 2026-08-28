const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const inspector = require('./generation-prompt-inspector.js');

const makePackage = (beatId, status) => ({
  schemaVersion:'0.1.0',
  promptIR:{
    schemaVersion:'0.1.0', sceneId:'scene-03', beatId,
    content:{sceneDescription:{value:'Director scene',owner:'director'},beatRealization:{value:`Beat ${beatId}`,owner:'ai'},visualEvents:[]},
    required:[
      {kind:'structural',key:'primaryVariable',value:'camera',owner:'director-confirmed',authorityClass:'required'},
      {kind:'exact',path:'camera.perspective',value:'mixed',owner:'compiler',support:'supported',authorityClass:'required',projectSupport:[{constraintId:'constraint-1',revision:1,result:'satisfied'}]}
    ],
    guided:[{path:'color.temperature',value:'cool',owner:'ai',authorityClass:'guided'}],
    open:[{field:'medium',owner:'none',authorityClass:'open'}],
    blocked:[{path:'space.depth',owner:'none',authorityClass:'blocked',reason:'not justified'}],
    antiRules:[{value:'Do not change camera authority without narrative cause.',owner:'grammar/evidence',authorityClass:'anti-rule'}],
    evidenceGaps:[{field:'medium',status:'unresolved',source:'visual-ir'}],
    provenance:{projectConstraintRefs:[{constraintId:'constraint-1',revision:1,result:'satisfied',path:'camera.perspective'}],applyEvidence:status==='DRAFT'?null:{beatId,applyRevision:2,proposalBeatFingerprint:'pbeat-1111111111111111',provenanceFingerprint:'pprv-1111111111111111',sequenceDirectorBeatFingerprint:'sbeat-1111111111111111'}},
    meta:{grammarId:'camera-authority-transfer'}, fingerprint:'pir-1111111111111111'
  },
  rendered:{rendererVersion:'0.1.0',neutralText:`NEUTRAL ${beatId}`,negativeText:'AVOID X',auditText:`AUDIT ${beatId}`,sections:{}},
  readiness:{status,reasons:status==='BLOCKED'?[{code:'PROJECT_CONSTRAINT_STALE'}]:status==='DRAFT'?[{code:'APPLY_REQUIRED'}]:[]}
});

const promptSet = {
  schemaVersion:'0.1.0',sceneId:'scene-03',
  beatOrder:['setup','pressure','rupture','release','new-ownership'],
  packages:[makePackage('setup','DRAFT'),makePackage('pressure','DRAFT'),makePackage('rupture','READY'),makePackage('release','BLOCKED'),makePackage('new-ownership','DRAFT')],
  summary:{draft:3,ready:1,blocked:1}
};

test('structure view exposes authority and provenance without generation action', () => {
  const html = inspector.renderGenerationPromptInspector(promptSet,{activeBeatId:'rupture',view:'structure'});
  assert.match(html,/GENERATION PROMPT/);
  assert.match(html,/data-generation-prompt-beat="setup"/);
  assert.match(html,/data-generation-prompt-beat="rupture"/);
  assert.match(html,/REQUIRED/);
  assert.match(html,/GUIDED/);
  assert.match(html,/OPEN/);
  assert.match(html,/BLOCKED/);
  assert.match(html,/APPLY EVIDENCE/);
  assert.match(html,/PROJECT SUPPORT/);
  assert.match(html,/constraint-1/);
  assert.doesNotMatch(html,/GENERATE/);
});

test('rendered view keeps generation and audit text separate', () => {
  const html=inspector.renderGenerationPromptInspector(promptSet,{activeBeatId:'rupture',view:'rendered'});
  assert.match(html,/NEUTRAL rupture/);
  assert.match(html,/AVOID X/);
  assert.match(html,/AUDIT rupture/);
  assert.match(html,/AUDIT \/ PROVENANCE/);
});

test('model reports per-Beat status and normalizes invalid local view selection', () => {
  const model=inspector.buildInspectorModel(promptSet,{activeBeatId:'missing',view:'other'});
  assert.equal(model.activeBeatId,'setup');
  assert.equal(model.view,'structure');
  assert.deepEqual(model.beats.map(item=>item.status),['DRAFT','DRAFT','READY','BLOCKED','DRAFT']);
});

test('model and renderer are read-only with frozen Prompt Set input', () => {
  const frozen=structuredClone(promptSet);
  const before=structuredClone(frozen);
  Object.freeze(frozen);Object.freeze(frozen.packages);
  inspector.buildInspectorModel(frozen,{activeBeatId:'release',view:'structure'});
  inspector.renderGenerationPromptInspector(frozen,{activeBeatId:'release',view:'rendered'});
  assert.deepEqual(frozen,before);
});

test('rendered view handles blocked renderer output without inventing text', () => {
  const blocked=structuredClone(promptSet);
  blocked.packages.find(item=>item.promptIR.beatId==='release').rendered=null;
  const html=inspector.renderGenerationPromptInspector(blocked,{activeBeatId:'release',view:'rendered'});
  assert.match(html,/RENDERED PROMPT UNAVAILABLE/);
  assert.match(html,/PROJECT_CONSTRAINT_STALE/);
});

test('MutationObserver ignores mutations caused by its own connected slot render', () => {
  const source = fs.readFileSync(require.resolve('./generation-prompt-inspector.js'),'utf8');
  assert.match(source,/MutationObserver\(\(\) => \{\s*if \(!slot\?\.isConnected\) render\(\);\s*\}\)/);
  assert.doesNotMatch(source,/MutationObserver\(\(\) => render\(\)\)/);
});
