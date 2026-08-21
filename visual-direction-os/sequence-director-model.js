((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSSequenceDirectorModel = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const VISUAL_FAMILIES = ['color', 'space', 'camera', 'line', 'texture', 'rhythm', 'agency'];
  const clone = value => JSON.parse(JSON.stringify(value));
  const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
  const level = value => value < .34 ? 'low' : value < .67 ? 'medium' : 'high';

  const mergeNested = (base, patch) => {
    const next = { ...(base || {}) };
    Object.entries(patch || {}).forEach(([key, value]) => {
      if (value && typeof value === 'object' && !Array.isArray(value) && base?.[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
        next[key] = mergeNested(base[key], value);
      } else {
        next[key] = clone(value);
      }
    });
    return next;
  };

  const DEFAULT_SEQUENCE = Object.freeze({
    beats: [
      {
        id: 'setup',
        label: 'SETUP',
        start: 0,
        end: .18,
        narrativePurpose: 'Establish the world as the default visual authority before pressure arrives.',
        primaryVariable: 'camera',
        supportingVariables: ['color', 'space'],
        restrainedVariables: ['texture', 'line', 'rhythm'],
        tensionLevel: 'low',
        scenePatch: {
          agency: 'world',
          ownership: { character: 'low', world: 'high', narrative: 'medium' },
          variables: {
            color: { temperature: 'neutral', saturation: 'low', territory: 'world' },
            space: { compression: 'low', openness: 'medium' },
            camera: { perspective: 'world', stability: 'high', distance: 'medium' },
            line: { stability: 'high', density: 'medium' },
            texture: { noise: 'low', granularity: 'low' },
            rhythm: { motionEnergy: 'low', cutDensity: 'low' }
          }
        }
      },
      {
        id: 'pressure',
        label: 'PRESSURE',
        start: .18,
        end: .42,
        narrativePurpose: 'Increase external pressure while the world still defines most of the frame.',
        primaryVariable: 'space',
        supportingVariables: ['camera', 'color'],
        restrainedVariables: ['texture', 'rhythm'],
        tensionLevel: 'medium',
        scenePatch: {
          agency: 'world',
          ownership: { character: 'medium', world: 'high', narrative: 'high' },
          variables: {
            color: { temperature: 'cool', saturation: 'medium', territory: 'world' },
            space: { compression: 'medium', openness: 'low' },
            camera: { perspective: 'world', stability: 'medium', distance: 'far' },
            line: { stability: 'medium', density: 'high' },
            texture: { noise: 'medium', granularity: 'medium' },
            rhythm: { motionEnergy: 'medium', cutDensity: 'medium' }
          }
        }
      },
      {
        id: 'rupture',
        label: 'RUPTURE',
        start: .42,
        end: .58,
        narrativePurpose: 'Break the established visual order and make ownership conflict legible.',
        primaryVariable: 'space',
        supportingVariables: ['camera', 'color'],
        restrainedVariables: ['rhythm'],
        tensionLevel: 'high',
        scenePatch: {
          agency: 'contested',
          ownership: { character: 'low', world: 'low', narrative: 'high' },
          variables: {
            color: { temperature: 'warm', saturation: 'high', territory: 'contested' },
            space: { compression: 'high', openness: 'low' },
            camera: { perspective: 'mixed', stability: 'low', distance: 'near' },
            line: { stability: 'low', density: 'high' },
            texture: { noise: 'high', granularity: 'high' },
            rhythm: { motionEnergy: 'high', cutDensity: 'high' }
          }
        }
      },
      {
        id: 'release',
        label: 'RELEASE',
        start: .58,
        end: .78,
        narrativePurpose: 'Let visual pressure recover so the ownership transition can become readable.',
        primaryVariable: 'camera',
        supportingVariables: ['space', 'camera'],
        restrainedVariables: ['texture', 'line', 'rhythm'],
        tensionLevel: 'medium',
        scenePatch: {
          agency: 'contested',
          ownership: { character: 'medium', world: 'low', narrative: 'high' },
          variables: {
            color: { temperature: 'neutral', saturation: 'low', territory: 'contested' },
            space: { compression: 'low', openness: 'medium' },
            camera: { perspective: 'mixed', stability: 'medium', distance: 'medium' },
            line: { stability: 'medium', density: 'low' },
            texture: { noise: 'low', granularity: 'low' },
            rhythm: { motionEnergy: 'low', cutDensity: 'low' }
          }
        }
      },
      {
        id: 'new-ownership',
        label: 'NEW OWNERSHIP',
        start: .78,
        end: 1,
        narrativePurpose: 'Transfer visual authority to the character and stabilize the new framing logic.',
        primaryVariable: 'agency',
        supportingVariables: ['camera', 'color'],
        restrainedVariables: ['texture', 'rhythm'],
        tensionLevel: 'medium',
        scenePatch: {
          agency: 'character',
          ownership: { character: 'high', world: 'low', narrative: 'medium' },
          variables: {
            color: { temperature: 'warm', saturation: 'medium', territory: 'character' },
            space: { compression: 'medium', openness: 'medium' },
            camera: { perspective: 'character', stability: 'medium', distance: 'near' },
            line: { stability: 'medium', density: 'medium' },
            texture: { noise: 'medium', granularity: 'medium' },
            rhythm: { motionEnergy: 'medium', cutDensity: 'medium' }
          }
        }
      }
    ],
    events: [
      {
        id: 'evt-space-collapse',
        type: 'SPACE COLLAPSE',
        at: .42,
        beatId: 'rupture',
        cause: 'External pressure stops being background context and becomes the dominant frame condition.',
        primaryChange: 'Space compression rises to HIGH.',
        supportingChanges: ['Camera distance moves NEAR', 'Color territory becomes CONTESTED'],
        heldBack: ['Agency transfer'],
        targetPatch: { variables: { space: { compression: 'high' } } }
      },
      {
        id: 'evt-camera-break',
        type: 'CAMERA BREAK',
        at: .46,
        beatId: 'rupture',
        cause: 'The established World POV can no longer contain the character-state rupture.',
        primaryChange: 'Camera perspective becomes MIXED and stability drops.',
        supportingChanges: ['Line stability breaks'],
        heldBack: ['Ownership transfer'],
        targetPatch: { variables: { camera: { perspective: 'mixed', stability: 'low' }, line: { stability: 'low' } } }
      },
      {
        id: 'evt-texture-peak',
        type: 'TEXTURE PEAK',
        at: .50,
        beatId: 'rupture',
        cause: 'Material noise peaks only after the spatial and camera rupture is established.',
        primaryChange: 'Texture noise and granularity peak.',
        supportingChanges: ['Line density remains HIGH'],
        heldBack: ['Agency transfer'],
        targetPatch: { variables: { texture: { noise: 'high', granularity: 'high' } } }
      },
      {
        id: 'evt-color-migration',
        type: 'COLOR MIGRATION',
        at: .62,
        beatId: 'release',
        cause: 'Color stops behaving as pure environmental pressure and begins following the ownership transition.',
        primaryChange: 'Color temperature returns toward NEUTRAL while territory remains contested.',
        supportingChanges: ['Texture recedes'],
        heldBack: ['Final character ownership'],
        targetPatch: { variables: { color: { temperature: 'neutral', territory: 'contested' }, texture: { noise: 'low' } } }
      },
      {
        id: 'evt-agency-transfer',
        type: 'AGENCY TRANSFER',
        at: .74,
        beatId: 'release',
        cause: 'The frame is ready to hand visual authority to the character without carrying rupture energy forward.',
        primaryChange: 'Character ownership rises while World ownership remains low.',
        supportingChanges: ['Camera remains MIXED as a transitional lag'],
        heldBack: ['Final color ownership'],
        targetPatch: { ownership: { character: 'medium', world: 'low', narrative: 'high' }, agency: 'contested' }
      },
      {
        id: 'evt-ownership-shift',
        type: 'OWNERSHIP SHIFT',
        at: .82,
        beatId: 'new-ownership',
        cause: 'The character now defines the framing logic instead of merely resisting the World.',
        primaryChange: 'Agency becomes CHARACTER.',
        supportingChanges: ['Camera perspective becomes CHARACTER', 'Color territory becomes CHARACTER'],
        heldBack: ['Texture remains secondary'],
        targetPatch: {
          agency: 'character',
          ownership: { character: 'high', world: 'low', narrative: 'medium' },
          variables: { color: { territory: 'character' }, camera: { perspective: 'character' } }
        }
      }
    ],
    trackAnchors: [
      { t: 0, tracks: { color: .28, space: .22, camera: .20, line: .34, texture: .18, agency: .12 } },
      { t: .17, tracks: { color: .42, space: .35, camera: .32, line: .50, texture: .28, agency: .24 } },
      { t: .34, tracks: { color: .68, space: .66, camera: .58, line: .72, texture: .54, agency: .22 } },
      { t: .50, tracks: { color: .76, space: .84, camera: .88, line: .90, texture: .82, agency: .14 } },
      { t: .66, tracks: { color: .16, space: .20, camera: .14, line: .18, texture: .12, agency: .42 } },
      { t: .82, tracks: { color: .62, space: .54, camera: .66, line: .48, texture: .44, agency: .94 } },
      { t: 1, tracks: { color: .58, space: .70, camera: .60, line: .62, texture: .56, agency: .86 } }
    ]
  });

  function validateSequence(sequence = {}) {
    const errors = [];
    const beats = Array.isArray(sequence.beats) ? sequence.beats : [];
    const events = Array.isArray(sequence.events) ? sequence.events : [];
    if (!beats.length) errors.push('sequence requires at least one beat');

    const sorted = [...beats].sort((a, b) => Number(a.start) - Number(b.start));
    sorted.forEach((beat, index) => {
      const start = Number(beat.start);
      const end = Number(beat.end);
      if (!beat.id) errors.push(`beat ${index} requires id`);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end > 1 || start >= end) errors.push(`beat ${beat.id || index} has invalid range`);
      const previous = sorted[index - 1];
      if (previous && start < Number(previous.end)) errors.push(`beat ${beat.id || index} overlap with ${previous.id || index - 1}`);
    });

    events.forEach((event, index) => {
      const beat = beats.find(item => item.id === event.beatId);
      if (!beat) {
        errors.push(`event ${event.id || index} references missing beat ${event.beatId}`);
        return;
      }
      const at = Number(event.at);
      if (!Number.isFinite(at) || at < Number(beat.start) || at > Number(beat.end)) errors.push(`event ${event.id || index} falls outside beat ${event.beatId}`);
    });

    return { valid: errors.length === 0, errors };
  }

  function deriveActiveBeat(sequence = DEFAULT_SEQUENCE, playhead = 0) {
    const t = clamp01(playhead);
    const beats = Array.isArray(sequence.beats) ? sequence.beats : [];
    if (!beats.length) return null;
    return clone(beats.find((beat, index) => t >= Number(beat.start) && (t < Number(beat.end) || index === beats.length - 1)) || beats[beats.length - 1]);
  }

  function deriveActiveEvents(sequence = DEFAULT_SEQUENCE, playhead = 0) {
    const t = clamp01(playhead);
    const beat = deriveActiveBeat(sequence, t);
    if (!beat) return [];
    return clone((sequence.events || []).filter(event => event.beatId === beat.id && Number(event.at) <= t).sort((a, b) => Number(a.at) - Number(b.at)));
  }

  function deriveTension(sequence = DEFAULT_SEQUENCE, playhead = 0) {
    return deriveActiveBeat(sequence, playhead)?.tensionLevel || 'low';
  }

  function deriveHierarchy(sequence = DEFAULT_SEQUENCE, playhead = 0) {
    const beat = deriveActiveBeat(sequence, playhead);
    if (!beat) return { primary: null, support: [], restrain: [] };
    return {
      primary: beat.primaryVariable || null,
      support: clone(beat.supportingVariables || []),
      restrain: clone(beat.restrainedVariables || [])
    };
  }

  function interpolateTracks(sequence = DEFAULT_SEQUENCE, playhead = 0) {
    const t = clamp01(playhead);
    const anchors = [...(sequence.trackAnchors || [])].sort((a, b) => Number(a.t) - Number(b.t));
    if (!anchors.length) return {};
    if (t <= Number(anchors[0].t)) return clone(anchors[0].tracks || {});
    if (t >= Number(anchors[anchors.length - 1].t)) return clone(anchors[anchors.length - 1].tracks || {});

    let left = anchors[0];
    let right = anchors[anchors.length - 1];
    for (let index = 1; index < anchors.length; index += 1) {
      if (t <= Number(anchors[index].t)) {
        left = anchors[index - 1];
        right = anchors[index];
        break;
      }
    }
    const span = Number(right.t) - Number(left.t) || 1;
    const progress = (t - Number(left.t)) / span;
    const names = new Set([...Object.keys(left.tracks || {}), ...Object.keys(right.tracks || {})]);
    return Object.fromEntries([...names].map(name => {
      const a = Number(left.tracks?.[name]) || 0;
      const b = Number(right.tracks?.[name]) || 0;
      return [name, clamp01(a + (b - a) * progress)];
    }));
  }

  function deriveSequenceState(sequence = DEFAULT_SEQUENCE, playhead = 0) {
    const t = clamp01(playhead);
    const beat = deriveActiveBeat(sequence, t);
    if (!beat) return { playhead: t, beat: null, events: [], hierarchy: { primary: null, support: [], restrain: [] }, tension: 'low', tracks: {}, qualitative: {}, patch: {} };
    const events = deriveActiveEvents(sequence, t);
    const tracks = interpolateTracks(sequence, t);
    const qualitative = Object.fromEntries(Object.entries(tracks).map(([name, value]) => [name, level(value)]));
    let patch = clone(beat.scenePatch || {});
    events.forEach(event => { patch = mergeNested(patch, event.targetPatch || {}); });
    return {
      playhead: t,
      beat,
      events,
      hierarchy: deriveHierarchy(sequence, t),
      tension: deriveTension(sequence, t),
      tracks,
      qualitative,
      patch
    };
  }

  function sampleSequence(playhead = 0, sequence = DEFAULT_SEQUENCE) {
    const state = deriveSequenceState(sequence, playhead);
    return {
      playhead: state.playhead,
      currentBeat: state.beat,
      tracks: clone(state.tracks),
      qualitative: clone(state.qualitative),
      ownership: clone(state.patch.ownership || { character: 'low', world: 'high', narrative: 'medium' }),
      agency: state.patch.agency || 'world',
      hierarchy: clone(state.hierarchy),
      tension: state.tension,
      events: clone(state.events),
      patch: clone(state.patch)
    };
  }

  return {
    VISUAL_FAMILIES: clone(VISUAL_FAMILIES),
    DEFAULT_SEQUENCE: clone(DEFAULT_SEQUENCE),
    clamp01,
    validateSequence,
    deriveActiveBeat,
    deriveActiveEvents,
    deriveTension,
    deriveHierarchy,
    deriveSequenceState,
    sampleSequence
  };
});
