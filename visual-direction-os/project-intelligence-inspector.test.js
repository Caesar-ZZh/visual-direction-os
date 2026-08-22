const test = require('node:test');
const assert = require('node:assert/strict');
const inspector = require('./project-intelligence-inspector.js');

function state() {
  return {
    schemaVersion: '0.1.0',
    mode: 'shadow',
    status: 'WARN',
    sceneOrder: ['scene-01', 'scene-02', 'scene-03'],
    scenes: [
      {
        sceneId: 'scene-01', title: 'Setup', narrativeRole: 'SETUP', grammarId: 'camera-authority-transfer',
        provenanceStatus: 'compiler-first', compilerOwnedFamilies: ['agency', 'camera'], aiCompletedFamilies: ['camera'], blockedFamilies: ['space']
      },
      {
        sceneId: 'scene-02', title: '<script>alert(1)</script>', narrativeRole: 'RECOGNITION', grammarId: 'camera-authority-transfer',
        provenanceStatus: 'compiler-first', compilerOwnedFamilies: ['agency', 'camera'], aiCompletedFamilies: [], blockedFamilies: []
      },
      {
        sceneId: 'scene-03', title: 'Legacy coda', narrativeRole: 'RESOLUTION', grammarId: null,
        provenanceStatus: 'legacy', compilerOwnedFamilies: [], aiCompletedFamilies: [], blockedFamilies: []
      }
    ],
    boundaries: [
      {
        id: 'scene-01->scene-02', fromSceneId: 'scene-01', toSceneId: 'scene-02', status: 'PASS', rule: 'boundary-pass',
        cause: { narrativeRole: 'RECOGNITION', agencyFrom: 'WORLD', agencyTo: 'CONTESTED', relationToPrevious: 'Pressure becomes authorship.' },
        handoff: { previousEndingAgency: 'WORLD', currentStartingAgency: 'WORLD', status: 'PASS' },
        visualResponse: [
          { family: 'camera', from: 'WORLD', to: 'CONTESTED', changed: true, source: 'compiler-backed' },
          { family: 'color', from: 'WORLD', to: 'WORLD', changed: false, source: 'unknown' }
        ],
        ownershipConsequence: { summary: 'CAMERA authority moves from WORLD to CONTESTED.', from: 'WORLD', to: 'CONTESTED' },
        why: 'The supported visual ownership response follows the current Scene narrative cause.', evidenceStatus: 'supported'
      },
      {
        id: 'scene-02->scene-03', fromSceneId: 'scene-02', toSceneId: 'scene-03', status: 'UNRESOLVED', rule: 'legacy-provenance',
        cause: { narrativeRole: 'RESOLUTION', agencyFrom: 'CONTESTED', agencyTo: 'CHARACTER', relationToPrevious: null },
        handoff: { previousEndingAgency: 'CONTESTED', currentStartingAgency: 'CONTESTED', status: 'PASS' },
        visualResponse: [{ family: 'camera', from: 'CONTESTED', to: 'CHARACTER', changed: true, source: 'legacy' }],
        ownershipConsequence: { summary: 'CAMERA authority moves from CONTESTED to CHARACTER.', from: 'CONTESTED', to: 'CHARACTER' },
        why: 'At least one directed Scene predates compiler-first provenance.', evidenceStatus: 'legacy'
      }
    ],
    findings: []
  };
}

test('renders compact Project Intelligence Shadow with causal sections and categorical status', () => {
  const html = inspector.renderProjectIntelligence(state());
  assert.match(html, /PROJECT INTELLIGENCE · SHADOW/);
  assert.match(html, /CAUSE · CURRENT SCENE/);
  assert.match(html, /VISUAL RESPONSE/);
  assert.match(html, /OWNERSHIP CONSEQUENCE/);
  assert.match(html, /COMPILER-BACKED/);
  assert.match(html, /LEGACY/);
  assert.match(html, /PASS/);
  assert.match(html, /UNRESOLVED/);
  assert.doesNotMatch(html, /coherence score|total score|score\s*[:=]/i);
  assert.doesNotMatch(html, /Fix automatically/i);
  assert.doesNotMatch(html, /unify grammar|same grammar/i);
});

test('expanded provenance detail exposes handoff, grammar and ownership families without mutation controls', () => {
  const html = inspector.renderProjectIntelligence(state());
  assert.match(html, /Inspect Project Intelligence/);
  assert.match(html, /HANDOFF/);
  assert.match(html, /GRAMMAR/);
  assert.match(html, /PROVENANCE/);
  assert.match(html, /COMPILER OWNED/);
  assert.match(html, /AI COMPLETED/);
  assert.match(html, /BLOCKED/);
  assert.doesNotMatch(html, /data-action=.*fix|data-action=.*apply/i);
});

test('escapes every dynamic Scene title and explanation', () => {
  const input = state();
  input.boundaries[0].why = '<img src=x onerror=alert(1)>';
  const html = inspector.renderProjectIntelligence(input);
  assert.doesNotMatch(html, /<script>|<img src=x/i);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('renders a useful empty state for Projects without analyzable boundaries', () => {
  const html = inspector.renderProjectIntelligence({ schemaVersion: '0.1.0', mode: 'shadow', status: 'UNRESOLVED', scenes: [], boundaries: [], findings: [] });
  assert.match(html, /PROJECT INTELLIGENCE · SHADOW/);
  assert.match(html, /UNRESOLVED/);
  assert.match(html, /Add or direct at least two Scenes/i);
});
