const test = require('node:test');
const assert = require('node:assert/strict');

let inspector = null;
try {
  inspector = require('./visual-compiler-inspector.js');
} catch (_) {
  inspector = null;
}

const comparison = {
  grammarId: 'camera-authority-transfer',
  totals: { MATCH: 2, CONFLICT: 1, MISSING: 1, BLOCKED: 0 },
  beats: [
    {
      id:'setup', label:'SETUP', agency:'world', status:'MATCH',
      counts:{ MATCH:1, CONFLICT:0, MISSING:0, BLOCKED:0 },
      items:[{ path:'camera.perspective', expected:'world', actual:'world', result:'MATCH', why:'Camera follows agency.' }]
    },
    {
      id:'rupture', label:'RUPTURE', agency:'contested', status:'CONFLICT',
      counts:{ MATCH:0, CONFLICT:1, MISSING:0, BLOCKED:0 },
      items:[{ path:'camera.perspective', expected:'mixed', actual:'character', result:'CONFLICT', why:'Camera follows contested agency.' }]
    },
    {
      id:'release', label:'RELEASE', agency:'character', status:'MISSING',
      counts:{ MATCH:0, CONFLICT:0, MISSING:1, BLOCKED:0 },
      items:[{ path:'camera.perspective', expected:'character', actual:null, result:'MISSING', why:'AI patch omitted the supported field.' }]
    }
  ]
};

test('renders a compact deterministic read-only Shadow Compare with categorical counts and beat evidence', () => {
  assert.equal(typeof inspector?.renderCompilerComparison, 'function', 'compiler inspector must expose renderCompilerComparison');
  const html = inspector.renderCompilerComparison(comparison);

  assert.match(html, /SHADOW COMPARE/i);
  assert.match(html, /DETERMINISTIC \/ READ-ONLY/);
  assert.match(html, /CAMERA AUTHORITY TRANSFER/);
  assert.match(html, /MATCH[^<]*2/);
  assert.match(html, /CONFLICT[^<]*1/);
  assert.match(html, /MISSING[^<]*1/);
  assert.match(html, /BLOCKED[^<]*0/);
  assert.match(html, /data-compiler-beat="setup"/);
  assert.match(html, /data-compiler-beat="rupture"/);
  assert.match(html, /AI · CHARACTER/);
  assert.match(html, /EXPECT · MIXED/);
  assert.match(html, /Inspect compiler audit/i);
  assert.doesNotMatch(html, /SCORE/i);
});
