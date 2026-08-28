const test = require('node:test');
const assert = require('node:assert/strict');
const bridge = require('./visual-ir-bridge.js');

let inspector = null;
try {
  inspector = require('./visual-ir-inspector.js');
} catch (_) {
  inspector = null;
}

const grounded = value => ({ value, sourceType: 'inferred', basis: 'Confirmed upstream evidence.' });
const ir = bridge.compileVisualIR({
  confirmedReading: {
    id: 'reading-1',
    title: 'Authorship',
    confidence: 'high',
    narrativeProblem: grounded('A route is imposed.'),
    coreConflict: grounded('Compliance versus authorship.'),
    startingState: grounded('world-led'),
    endingState: grounded('character-led'),
    turningPoint: grounded('The route is rejected.'),
    agencyTransition: { value: ['world','contested','character'], sourceType: 'inferred', basis: 'Agency transfers.' }
  },
  selectedStrategy: {
    id: 'strategy-1',
    title: 'Spatial authorship',
    grammarId: 'spatial-authorship',
    primaryVariable: 'space',
    supportingVariables: ['camera','agency'],
    restrainedVariables: ['texture'],
    mechanism: 'Space carries the authorship shift.',
    rationale: 'The narrative change is spatial control.'
  }
});

test('renders grammar, contract and evidence state without hiding unresolved dimensions', () => {
  assert.equal(typeof inspector?.renderVisualIRInspector, 'function', 'Visual IR inspector must expose renderVisualIRInspector');
  const html = inspector.renderVisualIRInspector(ir);

  assert.match(html, /Direction Logic/);
  assert.match(html, /PRIMARY/);
  assert.match(html, /SPACE/);
  assert.match(html, /CAMERA \/ AGENCY/);
  assert.match(html, /TEXTURE/);
  assert.match(html, /WORLD → CONTESTED → CHARACTER/);
  assert.match(html, /SPATIAL AUTHORSHIP/);
  assert.match(html, /CONTRACT · SUPPORTED/);
  assert.match(html, /EVIDENCE · SUPPORTED/);
  assert.match(html, /METHOD/);
  assert.match(html, /4 SOURCES/);
  assert.match(html, /15 UNRESOLVED/);
  assert.match(html, /<details[^>]*data-visual-ir-details/);
  assert.match(html, /Visual IR v0\.3/);
});
