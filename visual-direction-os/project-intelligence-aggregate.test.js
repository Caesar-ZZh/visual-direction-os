const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveProjectIntelligence } = require('./project-intelligence.js');

function sceneWithCamera({ id, role, transition, camera, agency, title = id }) {
  return {
    id,
    title,
    status: { narrative: 'confirmed', visual: 'directed' },
    narrativeRole: {
      role,
      agencyTransition: transition,
      relationToPrevious: id === 'scene-01' ? null : 'The previous Scene creates this ownership change.'
    },
    workspace: {
      narrativeState: {
        selectedStrategy: { id: `${id}-camera`, grammarId: 'camera-authority-transfer' },
        sequenceSkeleton: {
          version: '0.1.0',
          grammarId: 'camera-authority-transfer',
          beats: [{
            id: 'new-ownership',
            patchSlots: { 'camera.perspective': { status: 'compiler-derived' } }
          }]
        },
        sequenceProposal: {
          beats: [{
            id: 'new-ownership',
            sceneStatePatch: { agency, variables: { camera: { perspective: camera } } }
          }]
        },
        sequenceProvenance: {
          origin: 'compiler-first',
          skeletonVersion: '0.1.0',
          grammarId: 'camera-authority-transfer',
          fields: {
            'new-ownership.agency': { owner: 'compiler', support: 'supported', source: 'agency-constraint' },
            'new-ownership.camera.perspective': { owner: 'compiler', support: 'supported', source: 'camera-authority-transfer' }
          }
        }
      },
      sequenceState: { activeBeatId: 'new-ownership' },
      sceneState: {
        agency,
        narrativeState: 'new-ownership',
        variables: { camera: { perspective: camera } }
      }
    }
  };
}

function projectFixture() {
  return {
    id: 'project-m6',
    title: 'Project Intelligence Fixture',
    activeSceneId: 'scene-02',
    sceneOrder: ['scene-01', 'scene-02', 'scene-03'],
    scenes: {
      'scene-01': sceneWithCamera({ id: 'scene-01', role: 'setup', transition: ['world', 'world'], camera: 'world', agency: 'world' }),
      'scene-02': sceneWithCamera({ id: 'scene-02', role: 'recognition', transition: ['world', 'contested'], camera: 'mixed', agency: 'contested' }),
      'scene-03': sceneWithCamera({ id: 'scene-03', role: 'resolution', transition: ['contested', 'character'], camera: 'character', agency: 'character' })
    }
  };
}

test('empty Project returns deterministic unresolved aggregate', () => {
  const result = deriveProjectIntelligence({ sceneOrder: [], scenes: {} });
  assert.deepEqual(result, {
    schemaVersion: '0.1.0',
    mode: 'shadow',
    status: 'UNRESOLVED',
    sceneOrder: [],
    scenes: [],
    boundaries: [],
    findings: []
  });
});

test('derives adjacent boundaries in exact Project sceneOrder without mutating input', () => {
  const project = projectFixture();
  const before = JSON.parse(JSON.stringify(project));
  const result = deriveProjectIntelligence(project);

  assert.equal(result.schemaVersion, '0.1.0');
  assert.equal(result.mode, 'shadow');
  assert.deepEqual(result.sceneOrder, ['scene-01', 'scene-02', 'scene-03']);
  assert.deepEqual(result.scenes.map(scene => scene.sceneId), result.sceneOrder);
  assert.deepEqual(result.boundaries.map(item => [item.fromSceneId, item.toSceneId]), [
    ['scene-01', 'scene-02'],
    ['scene-02', 'scene-03']
  ]);
  assert.equal(result.status, 'PASS');
  assert.deepEqual(project, before);
});

test('promotes Scene provenance divergence into top-level findings and aggregate status', () => {
  const project = projectFixture();
  project.scenes['scene-02'].workspace.sceneState.variables.camera.perspective = 'character';

  const result = deriveProjectIntelligence(project);
  assert.equal(result.status, 'UNRESOLVED');
  assert.ok(result.findings.some(item => item.rule === 'provenance-final-state-divergence' && item.sceneIds?.includes('scene-02')));
});

test('legacy single Scene is visible as unresolved even without an adjacent boundary', () => {
  const project = projectFixture();
  const legacy = JSON.parse(JSON.stringify(project.scenes['scene-01']));
  legacy.workspace.narrativeState.sequenceSkeleton = null;
  legacy.workspace.narrativeState.sequenceProvenance = null;
  legacy.workspace.narrativeState.selectedStrategy = null;
  legacy.workspace.sceneState.narrativeState = null;
  project.sceneOrder = ['scene-01'];
  project.scenes = { 'scene-01': legacy };

  const result = deriveProjectIntelligence(project);
  assert.equal(result.status, 'UNRESOLVED');
  assert.ok(result.findings.some(item => item.rule === 'legacy-provenance' && item.sceneIds?.[0] === 'scene-01'));
});

test('aggregate status follows categorical precedence across boundary findings', () => {
  const project = projectFixture();
  project.scenes['scene-03'].narrativeRole.agencyTransition = ['world', 'character'];

  const result = deriveProjectIntelligence(project);
  assert.equal(result.status, 'WARN');
  assert.ok(result.findings.some(item => item.rule === 'narrative-handoff-mismatch'));
});

test('same Project input produces deep-equal intelligence', () => {
  const project = projectFixture();
  assert.deepEqual(deriveProjectIntelligence(project), deriveProjectIntelligence(project));
});
