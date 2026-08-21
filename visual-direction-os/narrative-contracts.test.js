const assert = require('assert');
const c = require('./narrative-contracts.js');
const f = (value, sourceType = 'inferred') => ({ value, sourceType, basis: 'short evidence' });
const reading = {
  id: 'agency', title: 'AGENCY RECOVERY', confidence: 'high',
  narrativeProblem: f('External authority becomes control.'),
  coreConflict: f('Authority vs self-determination.'),
  startingState: f('Compliance', 'explicit'),
  endingState: f('Self-directed', 'director_intent'),
  turningPoint: f('The assignment is recognized as control.'),
  agencyTransition: { value: ['world','contested','character'], sourceType: 'inferred', basis: 'authority visibly transfers' }
};
const interpret = { signal: 'strong', readings: [reading, { ...reading, id: 'rupture', title: 'INSTITUTIONAL RUPTURE' }], clarification: null };
assert.equal(c.validateInterpretResponse(interpret).valid, true);
assert.equal(c.validateInterpretResponse({ ...interpret, readings: [reading] }).valid, false);

const strategies = { strategies: [
  { id: 'space', title: 'SPACE-LED', grammarId: 'spatial-authorship', primaryVariable: 'space', supportingVariables: ['camera','color'], restrainedVariables: ['texture','rhythm'], mechanism: 'Pressure accumulates spatially before agency transfers.', rationale: 'Loss of freedom is the first visible causal change.' },
  { id: 'camera', title: 'CAMERA-LED', grammarId: 'camera-authority-transfer', primaryVariable: 'camera', supportingVariables: ['space','line'], restrainedVariables: ['color'], mechanism: 'Viewpoint authority moves from institution to character.', rationale: 'The scene is fundamentally about who defines perspective.' }
]};
const checkedStrategies = c.validateStrategyResponse(strategies);
assert.equal(checkedStrategies.valid, true);
assert.equal(checkedStrategies.value.strategies[0].grammarId, 'spatial-authorship', 'new grammar identity must survive client validation');
const legacyStrategies = { strategies: strategies.strategies.map(({ grammarId, ...item }) => item) };
assert.equal(c.validateStrategyResponse(legacyStrategies).valid, true, 'saved pre-M2 strategies remain loadable and resolve as UNKNOWN later');

const ids = ['setup','pressure','rupture','release','new-ownership'];
const seq = { sequenceProposal: { beats: ids.map((id, i) => ({
  id, label: id === 'new-ownership' ? 'NEW OWNERSHIP' : id.toUpperCase(), narrativeBeat: `beat ${i}`,
  agency: i < 2 ? 'world' : i < 4 ? 'contested' : 'character', primaryVariable: i === 4 ? 'agency' : 'camera',
  supportingVariables: ['space'], restrainedVariables: ['texture'], visualEvents: [],
  sceneStatePatch: { agency: i < 2 ? 'world' : i < 4 ? 'contested' : 'character' }, rationale: 'causal reason'
})) } };
assert.equal(c.validateSequenceResponse(seq).valid, true);
assert.equal(c.validateSequenceResponse({ sequenceProposal: { beats: seq.sequenceProposal.beats.slice(0,4) } }).valid, false);
console.log('narrative-contracts.test.js passed');
