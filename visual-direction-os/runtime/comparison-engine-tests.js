const assert = require('node:assert/strict');
const { compareArtifacts } = require('./comparison-engine.js');

function artifact(id, measuredStatus, humanStatus = 'needs_judgment', measurements = {}) {
  return {
    id,
    measurements:{
      meanSaturation:id === 'a' ? 0.61 : 0.37,
      edgeDensity:id === 'a' ? 0.28 : 0.18,
      entropyProxy:id === 'a' ? 0.62 : 0.48,
      luminanceStdDev:id === 'a' ? 0.31 : 0.22,
      localContrast:id === 'a' ? 0.18 : 0.12,
      aspectRatio:1.7778,
      ...measurements
    },
    evaluation:{ checks:[
      { id:'saturation-direction', label:'Saturation Direction', evidenceMode:'measured', status:measuredStatus, target:'low', observed:id === 'a' ? 'mean saturation 0.61' : 'mean saturation 0.37' },
      { id:'detail-density', label:'Detail Density', evidenceMode:'measured', status:'pass', target:'low', observed:'density proxy' },
      { id:'narrative-verb', label:'Narrative Verb', evidenceMode:'human_required', status:humanStatus, target:'WITHDRAW' },
      { id:'unsupported', label:'Unsupported', evidenceMode:'unsupported', status:'unsupported' }
    ]}
  };
}

let result = compareArtifacts({ artifactA:artifact('a','warn'), artifactB:artifact('b','pass') });
assert.equal(result.artifactAId, 'a');
assert.equal(result.artifactBId, 'b');
assert.equal(result.measuredComparisons.find((row) => row.checkId === 'saturation-direction').state, 'resolved');
assert.equal(result.summary.resolved, 1);
assert.equal(result.summary.stableWarn, 0);
assert.equal(result.semanticComparisons[0].state, null, 'semantic comparison requires explicit director input');
assert.equal(result.measuredComparisons.some((row) => row.checkId === 'unsupported'), false);
assert.equal(result.semanticComparisons.some((row) => row.checkId === 'unsupported'), false);

const saturation = result.measuredComparisons.find((row) => row.checkId === 'saturation-direction');
assert.equal(saturation.metricA, 0.61);
assert.equal(saturation.metricB, 0.37);
assert.equal(saturation.metricDelta, -0.24);

result = compareArtifacts({ artifactA:artifact('a','warn'), artifactB:artifact('b','warn') });
assert.equal(result.measuredComparisons.find((row) => row.checkId === 'saturation-direction').state, 'stable_warn');
assert.equal(result.summary.stableWarn, 1);

result = compareArtifacts({ artifactA:artifact('a','pass'), artifactB:artifact('b','warn') });
assert.equal(result.measuredComparisons.find((row) => row.checkId === 'saturation-direction').state, 'regressed');
assert.equal(result.summary.regressed, 1);

result = compareArtifacts({ artifactA:artifact('a','pass'), artifactB:artifact('b','pass') });
assert.equal(result.measuredComparisons.find((row) => row.checkId === 'saturation-direction').state, 'stable_pass');
assert.ok(result.summary.stablePass >= 1);

result = compareArtifacts({ artifactA:artifact('a','pass'), artifactB:{ ...artifact('b','pass'), evaluation:{ checks:artifact('b','pass').evaluation.checks.filter((row) => row.id !== 'saturation-direction') } } });
assert.equal(result.measuredComparisons.some((row) => row.checkId === 'saturation-direction'), false, 'only measured checks present on both artifacts participate');

result = compareArtifacts({
  artifactA:artifact('a','pass'),
  artifactB:artifact('b','pass'),
  directorJudgments:{ 'narrative-verb':{ state:'improved', note:'Withdrawal reads more clearly.' } }
});
assert.equal(result.semanticComparisons.find((row) => row.checkId === 'narrative-verb').state, 'improved');
assert.equal(result.semanticComparisons.find((row) => row.checkId === 'narrative-verb').note, 'Withdrawal reads more clearly.');

assert.throws(() => compareArtifacts({ artifactA:artifact('a','pass'), artifactB:artifact('b','pass'), directorJudgments:{ 'narrative-verb':{ state:'better' } } }), /semantic comparison state/i);

console.log('comparison engine tests passed');
