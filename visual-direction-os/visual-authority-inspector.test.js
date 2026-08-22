const test = require('node:test');
const assert = require('node:assert/strict');

let inspector = null;
try {
  inspector = require('./visual-authority-inspector.js');
} catch (_) {}

test('authority inspector module exists', () => {
  assert.ok(inspector, 'visual-authority-inspector.js must exist');
});

test('renders guarded apply-time authority without overstating blocked fields', () => {
  assert.ok(inspector);
  const html = inspector.renderAuthorityPlan({
    version: '0.1.0',
    mode: 'guarded',
    grammarId: 'camera-authority-transfer',
    totals: { CONFIRM: 2, OVERRIDE: 1, INJECT: 1, PARTIAL: 0, BLOCKED: 1 },
    beats: [
      {
        id: 'rupture',
        label: 'RUPTURE',
        decisions: [
          { path:'camera.perspective', action:'OVERRIDE', from:'world', to:'mixed', authority:'compiler', support:'supported', source:'camera-authority-transfer', why:'Camera authority follows contested agency.' },
          { path:'space', action:'BLOCKED', from:null, to:null, authority:'ai', support:'blocked', source:'spatial-authorship', why:'No exact spatial intensity is justified.' }
        ]
      }
    ]
  });

  assert.match(html, /data-visual-authority-plan/);
  assert.match(html, /COMPILER AUTHORITY/);
  assert.match(html, /GUARDED \/ APPLY-TIME/);
  assert.match(html, /OVERRIDE/);
  assert.match(html, /WORLD/);
  assert.match(html, /MIXED/);
  assert.match(html, /BLOCKED/);
  assert.match(html, /AI RETAINED/i);
  assert.match(html, /No mutation has happened yet/i);
  assert.doesNotMatch(html, /BLOCKED[^<]*VALIDATED/i);
});
