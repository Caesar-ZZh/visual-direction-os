const test = require('node:test');
const assert = require('node:assert/strict');
const intelligence = require('./project-intelligence.js');

function makeScene(overrides = {}) {
  const scene = {
    id: 'scene-02',
    title: 'Crossing the frame',
    status: { narrative: 'confirmed', visual: 'directed' },
    narrativeRole: {
      role: 'recognition',
      agencyTransition: ['world', 'character'],
      relationToPrevious: 'Pressure resolves into self-authorship.'
    },
    workspace: {
      narrativeState: {
        selectedStrategy: { id: 'camera-led', grammarId: 'camera-authority-transfer' },
        sequenceSkeleton: {
          version: '0.1.0',
          grammarId: 'camera-authority-transfer',
          beats: [
            {
              id: 'new-ownership',
              patchSlots: {
                'camera.perspective': { status: 'compiler-derived' },
                'camera.distance': { status: 'open' },
                'space.compression': { status: 'blocked' }
              }
            }
          ]
        },
        sequenceProposal: {
          beats: [
            {
              id: 'new-ownership',
              sceneStatePatch: {
                agency: 'character',
                variables: {
                  camera: { perspective: 'character', distance: 'close' }
                }
              }
            }
          ]
        },
        sequenceProvenance: {
          origin: 'compiler-first',
          skeletonVersion: '0.1.0',
          grammarId: 'camera-authority-transfer',
          fields: {
            'new-ownership.agency': { owner: 'compiler', support: 'supported', source: 'agency-constraint' },
            'new-ownership.camera.perspective': { owner: 'compiler', support: 'supported', source: 'camera-authority-transfer' },
            'new-ownership.camera.distance': { owner: 'ai', support: 'open', source: 'sequence-completion' }
          }
        }
      },
      sequenceState: { activeBeatId: 'new-ownership' },
      sceneState: {
        agency: 'character',
        narrativeState: 'new-ownership',
        variables: {
          camera: { perspective: 'character', distance: 'close' },
          color: { territory: 'world' },
          space: { compression: 'medium' }
        }
      }
    }
  };
  return deepMerge(scene, overrides);
}

function deepMerge(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return source === undefined ? target : source;
  const out = Array.isArray(target) ? target.slice() : { ...(target || {}) };
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && out[key] && typeof out[key] === 'object' && !Array.isArray(out[key])) {
      out[key] = deepMerge(out[key], value);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function makeRecord(overrides = {}) {
  return deepMerge({
    sceneId: 'scene-02',
    title: 'Scene 02',
    narrativeRole: 'RECOGNITION',
    grammarId: 'camera-authority-transfer',
    provenanceStatus: 'compiler-first',
    narrativeAgency: { start: 'WORLD', end: 'CONTESTED' },
    compilerOwnedFamilies: ['agency', 'camera'],
    aiCompletedFamilies: [],
    blockedFamilies: [],
    visualAgency: 'CONTESTED',
    cameraAuthority: 'MIXED',
    colorTerritory: 'WORLD',
    sources: {
      agency: 'compiler-backed',
      camera: 'compiler-backed',
      color: 'unknown',
      space: 'unknown'
    },
    fieldSources: { agency: 'compiler-backed', 'camera.perspective': 'compiler-backed' },
    evidence: {
      hasNarrativeState: true,
      hasSceneState: true,
      hasSequenceState: true,
      hasCompilerFirstProvenance: true
    },
    integrityFindings: []
  }, overrides);
}

test('normalizes compiler-first Scene provenance without mutating input', () => {
  const scene = makeScene();
  const before = JSON.parse(JSON.stringify(scene));
  const result = intelligence.normalizeSceneIntelligence(scene, { order: 1 });

  assert.equal(result.sceneId, 'scene-02');
  assert.equal(result.order, 1);
  assert.equal(result.narrativeRole, 'RECOGNITION');
  assert.deepEqual(result.narrativeAgency, { start: 'WORLD', end: 'CHARACTER' });
  assert.equal(result.grammarId, 'camera-authority-transfer');
  assert.equal(result.provenanceStatus, 'compiler-first');
  assert.equal(result.visualAgency, 'CHARACTER');
  assert.equal(result.cameraAuthority, 'CHARACTER');
  assert.equal(result.sources.camera, 'compiler-backed');
  assert.equal(result.sources.agency, 'compiler-backed');
  assert.deepEqual(result.compilerOwnedFamilies, ['agency', 'camera']);
  assert.deepEqual(result.aiCompletedFamilies, ['camera']);
  assert.deepEqual(result.blockedFamilies, ['space']);
  assert.equal(result.evidence.hasCompilerFirstProvenance, true);
  assert.deepEqual(scene, before);
});

test('uses the applied narrative beat to validate M5 provenance values', () => {
  const scene = makeScene({
    workspace: {
      narrativeState: {
        sequenceProposal: {
          beats: [
            { id: 'setup', sceneStatePatch: { variables: { camera: { perspective: 'world' } } } },
            { id: 'new-ownership', sceneStatePatch: { variables: { camera: { perspective: 'character' } } } }
          ]
        },
        sequenceProvenance: {
          fields: {
            'setup.camera.perspective': { owner: 'compiler', support: 'supported', source: 'camera-authority-transfer' },
            'new-ownership.camera.perspective': { owner: 'compiler', support: 'supported', source: 'camera-authority-transfer' }
          }
        }
      },
      sceneState: { narrativeState: 'new-ownership', variables: { camera: { perspective: 'character' } } }
    }
  });

  const result = intelligence.normalizeSceneIntelligence(scene);
  assert.equal(result.sources.camera, 'compiler-backed');
  assert.equal(result.appliedBeatId, 'new-ownership');
});

test('downgrades provenance when final Scene State diverges from the applied M5 value', () => {
  const scene = makeScene({
    workspace: {
      sceneState: {
        narrativeState: 'new-ownership',
        variables: { camera: { perspective: 'world', distance: 'close' } }
      }
    }
  });

  const result = intelligence.normalizeSceneIntelligence(scene);
  assert.equal(result.cameraAuthority, 'WORLD');
  assert.equal(result.sources.camera, 'unknown');
  assert.ok(result.integrityFindings.some(item => item.rule === 'provenance-final-state-divergence' && item.family === 'camera'));
});

test('classifies AI-completed active field only when final value still matches', () => {
  const scene = makeScene();
  const result = intelligence.normalizeSceneIntelligence(scene);
  assert.equal(result.fieldSources['camera.distance'], 'ai-completed');

  const edited = makeScene({ workspace: { sceneState: { variables: { camera: { distance: 'wide' } } } } });
  const editedResult = intelligence.normalizeSceneIntelligence(edited);
  assert.equal(editedResult.fieldSources['camera.distance'], 'unknown');
});

test('keeps blocked fields unresolved rather than upgrading them from final state', () => {
  const result = intelligence.normalizeSceneIntelligence(makeScene());
  assert.equal(result.fieldSources['space.compression'], 'blocked');
  assert.equal(result.sources.space, 'blocked');
});

test('treats a directed pre-M5 Scene as legacy and does not infer grammar from visual state', () => {
  const scene = makeScene({
    workspace: {
      narrativeState: {
        selectedStrategy: null,
        sequenceSkeleton: null,
        sequenceProposal: { beats: [] },
        sequenceProvenance: null
      },
      sceneState: {
        agency: 'character',
        narrativeState: null,
        variables: { camera: { perspective: 'character' }, color: { territory: 'character' } }
      }
    }
  });

  const result = intelligence.normalizeSceneIntelligence(scene);
  assert.equal(result.provenanceStatus, 'legacy');
  assert.equal(result.grammarId, null);
  assert.equal(result.sources.camera, 'legacy');
  assert.equal(result.sources.color, 'legacy');
});

test('classifies incomplete compiler-first markers as missing instead of legacy', () => {
  const scene = makeScene({
    workspace: {
      narrativeState: {
        sequenceSkeleton: { version: '0.1.0', grammarId: 'camera-authority-transfer', beats: [] },
        sequenceProvenance: null,
        sequenceProposal: null
      }
    }
  });

  const result = intelligence.normalizeSceneIntelligence(scene);
  assert.equal(result.provenanceStatus, 'missing');
  assert.equal(result.sources.camera, 'unknown');
});

test('normalization is deterministic', () => {
  const scene = makeScene();
  assert.deepEqual(
    intelligence.normalizeSceneIntelligence(scene, { order: 1 }),
    intelligence.normalizeSceneIntelligence(scene, { order: 1 })
  );
});

test('passes when current Scene cause explains compiler-backed camera ownership transfer', () => {
  const previous = makeRecord({
    sceneId: 'scene-01',
    narrativeAgency: { start: 'WORLD', end: 'WORLD' },
    cameraAuthority: 'WORLD',
    visualAgency: 'WORLD'
  });
  const current = makeRecord({
    sceneId: 'scene-02',
    narrativeAgency: { start: 'WORLD', end: 'CONTESTED' },
    cameraAuthority: 'CONTESTED'
  });
  const result = intelligence.deriveBoundaryIntelligence(previous, current);

  assert.equal(result.status, 'PASS');
  assert.equal(result.rule, 'boundary-pass');
  assert.deepEqual(result.cause.agencyFrom, 'WORLD');
  assert.deepEqual(result.cause.agencyTo, 'CONTESTED');
  assert.equal(result.handoff.status, 'PASS');
  assert.ok(result.visualResponse.some(item => item.family === 'camera' && item.from === 'WORLD' && item.to === 'CONTESTED' && item.source === 'compiler-backed'));
  assert.equal(result.ownershipConsequence.to, 'CONTESTED');
  assert.equal(result.evidenceStatus, 'supported');
});

test('warns on major compiler-backed camera transfer without current Scene narrative cause', () => {
  const previous = makeRecord({ sceneId: 'scene-01', narrativeAgency: { start: 'WORLD', end: 'WORLD' }, cameraAuthority: 'WORLD' });
  const current = makeRecord({ sceneId: 'scene-02', narrativeRole: 'DEVELOPMENT', narrativeAgency: { start: 'WORLD', end: 'WORLD' }, cameraAuthority: 'CHARACTER', visualAgency: 'WORLD' });
  const result = intelligence.deriveBoundaryIntelligence(previous, current);

  assert.equal(result.status, 'WARN');
  assert.equal(result.rule, 'visual-transfer-without-narrative-cause');
  assert.match(result.why, /without a comparable narrative cause/i);
});

test('warns when supported camera grammar has narrative transfer but no compiler-backed visual response', () => {
  const previous = makeRecord({ sceneId: 'scene-01', narrativeAgency: { start: 'WORLD', end: 'WORLD' }, cameraAuthority: 'WORLD' });
  const current = makeRecord({ sceneId: 'scene-02', narrativeAgency: { start: 'WORLD', end: 'CONTESTED' }, cameraAuthority: 'WORLD', visualAgency: 'CONTESTED' });
  const result = intelligence.deriveBoundaryIntelligence(previous, current);

  assert.equal(result.status, 'WARN');
  assert.equal(result.rule, 'narrative-transfer-without-visual-response');
});

test('returns unresolved instead of warning when narrative transfer relies on blocked or partial visual family', () => {
  const previous = makeRecord({ sceneId: 'scene-01', narrativeAgency: { start: 'WORLD', end: 'WORLD' }, grammarId: 'spatial-authorship', cameraAuthority: 'WORLD' });
  const current = makeRecord({
    sceneId: 'scene-02',
    grammarId: 'spatial-authorship',
    narrativeAgency: { start: 'WORLD', end: 'CONTESTED' },
    blockedFamilies: ['space'],
    sources: { agency: 'compiler-backed', camera: 'unknown', color: 'unknown', space: 'blocked' }
  });
  const result = intelligence.deriveBoundaryIntelligence(previous, current);

  assert.equal(result.status, 'UNRESOLVED');
  assert.equal(result.rule, 'visual-family-unsupported');
  assert.equal(result.evidenceStatus, 'blocked');
});

test('warns when adjacent narrative agency handoff is incompatible', () => {
  const previous = makeRecord({ sceneId: 'scene-01', narrativeAgency: { start: 'WORLD', end: 'CHARACTER' }, cameraAuthority: 'CHARACTER' });
  const current = makeRecord({ sceneId: 'scene-02', narrativeAgency: { start: 'WORLD', end: 'CONTESTED' }, cameraAuthority: 'CONTESTED' });
  const result = intelligence.deriveBoundaryIntelligence(previous, current);

  assert.equal(result.status, 'WARN');
  assert.equal(result.rule, 'narrative-handoff-mismatch');
  assert.deepEqual(result.handoff, { previousEndingAgency: 'CHARACTER', currentStartingAgency: 'WORLD', status: 'WARN' });
});

test('returns unresolved when a narrative handoff side is unknown', () => {
  const previous = makeRecord({ sceneId: 'scene-01', narrativeAgency: { start: 'WORLD', end: null }, cameraAuthority: 'WORLD' });
  const current = makeRecord({ sceneId: 'scene-02', narrativeAgency: { start: 'WORLD', end: 'CONTESTED' }, cameraAuthority: 'CONTESTED' });
  const result = intelligence.deriveBoundaryIntelligence(previous, current);

  assert.equal(result.status, 'UNRESOLVED');
  assert.equal(result.rule, 'narrative-handoff-unresolved');
});

test('does not warn merely because adjacent Scenes use different grammars', () => {
  const previous = makeRecord({
    sceneId: 'scene-01',
    grammarId: 'camera-authority-transfer',
    narrativeAgency: { start: 'WORLD', end: 'WORLD' },
    cameraAuthority: 'WORLD',
    colorTerritory: 'WORLD',
    sources: { agency: 'compiler-backed', camera: 'compiler-backed', color: 'unknown', space: 'unknown' }
  });
  const current = makeRecord({
    sceneId: 'scene-02',
    grammarId: 'color-ownership-transfer',
    narrativeAgency: { start: 'WORLD', end: 'CONTESTED' },
    cameraAuthority: 'WORLD',
    colorTerritory: 'CONTESTED',
    compilerOwnedFamilies: ['agency', 'color'],
    sources: { agency: 'compiler-backed', camera: 'unknown', color: 'compiler-backed', space: 'unknown' }
  });
  const result = intelligence.deriveBoundaryIntelligence(previous, current);

  assert.equal(result.status, 'PASS');
  assert.equal(result.rule, 'boundary-pass');
  assert.ok(!result.findings?.some(item => item.rule === 'grammar-change'));
});

test('legacy directed Scene yields unresolved rather than fail', () => {
  const previous = makeRecord({ sceneId: 'scene-01', narrativeAgency: { start: 'WORLD', end: 'WORLD' }, cameraAuthority: 'WORLD' });
  const current = makeRecord({ sceneId: 'scene-02', provenanceStatus: 'legacy', grammarId: null, sources: { agency: 'legacy', camera: 'legacy', color: 'legacy', space: 'legacy' } });
  const result = intelligence.deriveBoundaryIntelligence(previous, current);

  assert.equal(result.status, 'UNRESOLVED');
  assert.equal(result.rule, 'legacy-provenance');
  assert.notEqual(result.status, 'FAIL');
});

test('provenance divergence yields unresolved and never reports compiler-backed response', () => {
  const previous = makeRecord({ sceneId: 'scene-01', narrativeAgency: { start: 'WORLD', end: 'WORLD' }, cameraAuthority: 'WORLD' });
  const current = makeRecord({
    sceneId: 'scene-02',
    cameraAuthority: 'CHARACTER',
    sources: { agency: 'compiler-backed', camera: 'unknown', color: 'unknown', space: 'unknown' },
    integrityFindings: [{ status: 'UNRESOLVED', rule: 'provenance-final-state-divergence', family: 'camera', path: 'camera.perspective' }]
  });
  const result = intelligence.deriveBoundaryIntelligence(previous, current);

  assert.equal(result.status, 'UNRESOLVED');
  assert.equal(result.rule, 'provenance-final-state-divergence');
  assert.ok(result.visualResponse.every(item => !(item.family === 'camera' && item.source === 'compiler-backed')));
});
