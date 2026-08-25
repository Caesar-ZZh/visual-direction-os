const assert = require('node:assert/strict');
const { evaluateArtifact, compileReDirectionDelta } = require('./evaluation-engine.js');

function signal(value) { return { value, status: 'resolved', confidence: 0.9, evidenceStatus: 'test' }; }
function ir(overrides = {}) {
  return {
    narrative: { verb: signal('WITHDRAW') },
    character: { primaryVariable: signal('Boundary'), anchors: ['silhouette', 'face landmark'] },
    world: { relation: signal('Resist') },
    composition: { shotSize: signal('wide'), subjectScale: signal('small'), negativeSpace: signal('high') },
    camera: { allegiance: signal('neutral witness') },
    color: { ownershipMode: signal('relational'), saturation: signal(overrides.saturation ?? 'restrained; reserve saturation for relational event') },
    edge: { policy: signal(overrides.edge ?? 'hard/soft/lost edges carry relational condition') },
    detail: { informationDensity: signal(overrides.detail ?? 'low around subject; absence is active structure') },
    value: { contrastBudget: signal(overrides.contrast ?? 'highest contrast belongs to primary read') },
    medium: { ownership: signal('split / relational') },
    fx: { global: false, localOwners: ['relationship state when justified'] },
    antiRules: ['no global watercolor filter']
  };
}

const measurements = {
  width: 1200,
  height: 900,
  aspectRatio: 1.3333,
  meanLuminance: 0.42,
  luminanceStdDev: 0.18,
  shadowShare: 0.2,
  highlightShare: 0.1,
  meanSaturation: 0.72,
  highSaturationShare: 0.68,
  edgeDensity: 0.62,
  localContrast: 0.31,
  entropyProxy: 0.7
};

const report = evaluateArtifact({
  artifactId: 'artifact-1',
  ir: ir(),
  request: { ratio: '16:9' },
  measurements,
  human: {}
});

const ratio = report.checks.find((check) => check.id === 'canvas-ratio');
assert.equal(ratio.evidenceMode, 'measured');
assert.equal(ratio.status, 'warn', '4:3 result should warn against a 16:9 target');

const saturation = report.checks.find((check) => check.id === 'saturation-direction');
assert.equal(saturation.status, 'warn', 'high measured saturation should warn against restrained saturation');

const detail = report.checks.find((check) => check.id === 'detail-density');
assert.equal(detail.status, 'warn', 'high measured density should warn against low information density target');

const contrast = report.checks.find((check) => check.id === 'value-contrast');
assert.equal(contrast.status, 'unsupported', 'semantic contrast ownership is not an overall contrast target');

const edge = report.checks.find((check) => check.id === 'edge-activity');
assert.equal(edge.status, 'unsupported', 'mixed hard/soft/lost edge semantics should not become a global edge score');

const narrative = report.checks.find((check) => check.id === 'narrative-verb');
assert.equal(narrative.evidenceMode, 'human_required');
assert.equal(narrative.status, 'needs_judgment');
assert.equal(report.summary.humanPassed, 0);
assert.equal(report.summary.unresolved > 0, true);

const unknownReport = evaluateArtifact({
  artifactId: 'artifact-2',
  ir: ir({ saturation: 'unknown', detail: 'partitioned by owner', edge: 'route edges outrank incidental texture', contrast: 'unknown' }),
  request: { ratio: '1:1' },
  measurements: { ...measurements, width: 1000, height: 1000 },
  human: {}
});
for (const id of ['saturation-direction', 'detail-density', 'value-contrast', 'edge-activity']) {
  assert.equal(unknownReport.checks.find((check) => check.id === id).status, 'unsupported');
}

const judged = evaluateArtifact({
  artifactId: 'artifact-3',
  ir: ir(),
  request: { ratio: '4:3' },
  measurements,
  human: {
    'narrative-verb': { status: 'pass' },
    'primary-variable': { status: 'needs_work', note: 'Boundary is not carrying the main read.' },
    'camera-allegiance': { status: 'not_sure' }
  }
});
const delta = compileReDirectionDelta(judged);
assert.ok(delta.preserve.some((item) => /Narrative Verb/i.test(item)));
assert.ok(delta.correct.some((item) => /Boundary is not carrying the main read/i.test(item)));
assert.ok(delta.unresolved.some((item) => /Camera Allegiance/i.test(item)));
assert.match(delta.promptAppendix, /ITERATION \/ EVALUATION DELTA/);
assert.match(delta.promptAppendix, /PRESERVE:/);
assert.match(delta.promptAppendix, /CORRECT:/);
assert.doesNotMatch(delta.promptAppendix, /NOT SURE|unresolved/i, 'unresolved items must not become generation instructions');

assert.ok(Array.isArray(delta.entries), 'M4 requires structured delta entries while retaining M3 arrays');
const narrativeEntry = delta.entries.find((entry) => entry.checkId === 'narrative-verb');
const primaryEntry = delta.entries.find((entry) => entry.checkId === 'primary-variable');
const cameraEntry = delta.entries.find((entry) => entry.checkId === 'camera-allegiance');
assert.equal(narrativeEntry.intent, 'preserve');
assert.equal(narrativeEntry.evidenceMode, 'human_required');
assert.equal(primaryEntry.intent, 'correct');
assert.match(primaryEntry.instruction, /Boundary is not carrying the main read/i);
assert.equal(cameraEntry.intent, 'unresolved');

const structuredReport = { checks:[
  { id:'detail-density', label:'Detail Density', status:'warn', evidenceMode:'measured', target:'low', observed:'density proxy 0.51', reason:'too dense' },
  { id:'canvas-ratio', label:'Canvas Ratio', status:'pass', evidenceMode:'measured', target:'16:9', observed:'16:9', reason:'correct' }
] };
const structuredDelta = compileReDirectionDelta(structuredReport);
assert.equal(structuredDelta.correct.length, 1);
assert.equal(structuredDelta.entries.find((entry) => entry.checkId === 'detail-density').intent, 'correct');
assert.equal(structuredDelta.entries.find((entry) => entry.checkId === 'canvas-ratio').intent, 'preserve');

console.log('evaluation engine tests passed');
