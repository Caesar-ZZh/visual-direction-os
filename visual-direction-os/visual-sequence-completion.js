((root, factory) => {
  const contracts = typeof module === 'object' && module.exports
    ? require('./narrative-contracts.js')
    : root?.VDOSNarrativeContracts;
  const compiler = typeof module === 'object' && module.exports
    ? require('./visual-compiler.js')
    : root?.VDOSVisualCompiler;
  const api = factory(contracts, compiler);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSVisualSequenceCompletion = api;
})(typeof window !== 'undefined' ? window : globalThis, (contracts, compiler) => {
  'use strict';

  if (!contracts) throw new Error('VDOSNarrativeContracts is required before visual-sequence-completion.js');
  if (!compiler) throw new Error('VDOSVisualCompiler is required before visual-sequence-completion.js');

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const LEVELS = new Set(['low', 'medium', 'high']);

  function flattenOpenPatch(openPatch = {}) {
    const result = {};
    const walk = (value, prefix = '') => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        if (prefix) {
          const canonicalPath = prefix.startsWith('variables.') ? prefix.slice('variables.'.length) : prefix;
          result[canonicalPath] = value;
        }
        return;
      }
      const entries = Object.entries(value);
      if (!entries.length && prefix) return;
      for (const [key, child] of entries) walk(child, prefix ? `${prefix}.${key}` : key);
    };
    walk(openPatch);
    return result;
  }

  function setPatchPath(patch, path, value) {
    if (path === 'agency') {
      patch.agency = clone(value);
      return patch;
    }
    const parts = String(path || '').split('.').filter(Boolean);
    if (!parts.length) return patch;
    if (parts[0] === 'ownership') {
      patch.ownership ||= {};
      patch.ownership[parts[1]] = clone(value);
      return patch;
    }
    patch.variables ||= {};
    const family = parts[0];
    const field = parts[1];
    patch.variables[family] ||= {};
    patch.variables[family][field] = clone(value);
    return patch;
  }

  function error(code, beatId, path, message) {
    return { code, beatId: beatId || null, path: path || null, message };
  }

  function validateOpenValue(path, value) {
    if (path.startsWith('ownership.')) return LEVELS.has(value);
    return typeof value === 'string' && Boolean(value.trim());
  }

  function validateSequenceCompletion({ skeleton, completion } = {}) {
    const errors = [];
    const beats = completion?.sequenceCompletion?.beats;
    const skeletonBeats = skeleton?.beats;
    const agencyPath = skeleton?.agencyConstraint?.path;

    if (!Array.isArray(skeletonBeats) || skeletonBeats.length !== 5 || !Array.isArray(agencyPath) || agencyPath.length < 2) {
      return { valid: false, errors: [error('INVALID_SKELETON', null, null, 'A valid five-beat Sequence Skeleton is required.')] };
    }
    if (!Array.isArray(beats) || beats.length !== skeletonBeats.length) {
      return { valid: false, errors: [error('BEAT_COUNT_MISMATCH', null, null, 'Completion must contain exactly the Skeleton beats.')] };
    }

    let previousAgencyIndex = -1;
    beats.forEach((beat, index) => {
      const skeletonBeat = skeletonBeats[index];
      const beatId = beat?.id || null;
      if (!beat || typeof beat !== 'object') {
        errors.push(error('BEAT_ID_MISMATCH', beatId, null, `Completion beat ${index} is invalid.`));
        return;
      }
      if (beat.id !== skeletonBeat.id) {
        errors.push(error('BEAT_ID_MISMATCH', beat.id, null, `Expected beat ${skeletonBeat.id} at index ${index}.`));
      }

      const agencyIndex = agencyPath.indexOf(beat.agency);
      if (agencyIndex < 0) {
        errors.push(error('AGENCY_OUTSIDE_CONFIRMED_PATH', beat.id, 'agency', `Agency ${beat.agency} is outside the confirmed path.`));
      } else {
        if (agencyIndex < previousAgencyIndex) {
          errors.push(error('AGENCY_REGRESSION', beat.id, 'agency', `Agency regressed from ${agencyPath[previousAgencyIndex]} to ${beat.agency}.`));
        }
        previousAgencyIndex = Math.max(previousAgencyIndex, agencyIndex);
      }

      if (index === 0 && beat.agency !== skeleton.agencyConstraint.start) {
        errors.push(error('AGENCY_OUTSIDE_CONFIRMED_PATH', beat.id, 'agency', 'SETUP must use the first confirmed agency state.'));
      }
      if (index === beats.length - 1 && beat.agency !== skeleton.agencyConstraint.end) {
        errors.push(error('FINAL_AGENCY_NOT_REACHED', beat.id, 'agency', 'NEW OWNERSHIP must reach the final confirmed agency state.'));
      }

      if (typeof beat.narrativeBeat !== 'string' || !beat.narrativeBeat.trim()) {
        errors.push(error('INVALID_NARRATIVE_BEAT', beat.id, 'narrativeBeat', 'Narrative beat text is required.'));
      }
      if (typeof beat.rationale !== 'string' || !beat.rationale.trim()) {
        errors.push(error('INVALID_RATIONALE', beat.id, 'rationale', 'Rationale is required.'));
      }
      if (!Array.isArray(beat.visualEvents) || beat.visualEvents.length > 3 || beat.visualEvents.some(eventValue => {
        if (typeof eventValue === 'string') return !eventValue.trim();
        return !eventValue || typeof eventValue !== 'object' || typeof eventValue.type !== 'string' || !eventValue.type.trim();
      })) {
        errors.push(error('INVALID_VISUAL_EVENT', beat.id, 'visualEvents', 'Visual events must contain at most three non-empty event labels or typed objects.'));
      }

      const flatPatch = flattenOpenPatch(beat.openPatch || {});
      for (const [path, value] of Object.entries(flatPatch)) {
        const slot = skeletonBeat.patchSlots?.[path];
        if (!slot) {
          errors.push(error('UNDECLARED_OPEN_FIELD_WRITE', beat.id, path, `Path ${path} is not declared by the Skeleton.`));
          continue;
        }
        if (slot.status === 'compiler-owned' || slot.status === 'compiler-derived') {
          errors.push(error('COMPILER_OWNED_FIELD_WRITE', beat.id, path, `Path ${path} is compiler-owned.`));
          continue;
        }
        if (slot.status === 'blocked') {
          errors.push(error('BLOCKED_FIELD_WRITE', beat.id, path, `Path ${path} is blocked by the current compiler contract.`));
          continue;
        }
        if (slot.status !== 'open') {
          errors.push(error('UNDECLARED_OPEN_FIELD_WRITE', beat.id, path, `Path ${path} is not an AI-open slot.`));
          continue;
        }
        if (!validateOpenValue(path, value)) {
          errors.push(error('INVALID_SCENE_STATE_VALUE', beat.id, path, `Path ${path} contains an invalid Scene State value.`));
        }
      }
    });

    return errors.length
      ? { valid: false, errors }
      : { valid: true, errors: [], value: clone(completion) };
  }

  function assembleSequenceProposal({ skeleton, completion, visualIR, projectConstraintResolutions = [], projectConstraintRegistryVersion = '0.1.0' } = {}) {
    const checked = validateSequenceCompletion({ skeleton, completion });
    if (!checked.valid) {
      const failure = new Error('Invalid sequence completion.');
      failure.code = 'SEQUENCE_COMPLETION_INVALID';
      failure.errors = clone(checked.errors);
      throw failure;
    }

    const provenance = {
      origin: 'compiler-first',
      skeletonVersion: skeleton.version,
      grammarId: skeleton.grammarId || null,
      fields: {}
    };
    const satisfiedProjectConstraints = (projectConstraintResolutions || []).filter(item => item?.status === 'SATISFIED');
    if (satisfiedProjectConstraints.length) {
      provenance.projectConstraints = {
        registryVersion: projectConstraintRegistryVersion,
        resolutions: satisfiedProjectConstraints.map(item => ({
          constraintId: item.constraintId,
          revision: item.revision,
          result: 'satisfied',
          beatId: item.beatId,
          path: item.path
        }))
      };
    }

    const beats = checked.value.sequenceCompletion.beats.map((beat, index) => {
      const skeletonBeat = skeleton.beats[index];
      const patch = clone(beat.openPatch || {});
      patch.agency = beat.agency;

      const openFields = flattenOpenPatch(beat.openPatch || {});
      Object.keys(openFields).forEach(path => {
        provenance.fields[`${beat.id}.${path}`] = {
          owner: 'ai', support: 'open', source: 'sequence-completion'
        };
      });
      provenance.fields[`${beat.id}.agency`] = {
        owner: skeletonBeat.agencySlot.status === 'fixed' ? 'compiler' : 'ai',
        support: skeletonBeat.agencySlot.status === 'fixed' ? 'supported' : 'constrained',
        source: 'agency-constraint'
      };

      const expectations = compiler.compileBeatExpectations({
        visualIR,
        beat: { id: beat.id, label: skeletonBeat.label, agency: beat.agency }
      });
      for (const item of expectations.assertions || []) {
        if (item.status !== 'supported') continue;
        setPatchPath(patch, item.path, item.expected);
        const fieldKey = `${beat.id}.${item.path}`;
        provenance.fields[fieldKey] = {
          owner: 'compiler', support: 'supported', source: item.source || skeleton.grammarId || null
        };
        const matches = satisfiedProjectConstraints.filter(entry => entry.beatId === beat.id && entry.path === item.path);
        if (matches.length) provenance.fields[fieldKey].projectConstraintIds = matches.map(entry => entry.constraintId);
      }

      const patchCheck = contracts.validateSceneStatePatch(patch);
      if (!patchCheck.valid) {
        const failure = new Error(`Assembler produced invalid Scene State patch for ${beat.id}: ${patchCheck.errors.join('; ')}`);
        failure.code = 'ASSEMBLED_SCENE_STATE_INVALID';
        throw failure;
      }

      return {
        id: skeletonBeat.id,
        label: skeletonBeat.label,
        narrativeBeat: beat.narrativeBeat,
        agency: beat.agency,
        primaryVariable: skeletonBeat.structure.primaryVariable,
        supportingVariables: clone(skeletonBeat.structure.supportingVariables || []),
        restrainedVariables: clone(skeletonBeat.structure.restrainedVariables || []),
        visualEvents: clone(beat.visualEvents || []),
        sceneStatePatch: patchCheck.value,
        rationale: beat.rationale
      };
    });

    return {
      sequenceProposal: { beats },
      sequenceProvenance: provenance,
      rawCompletion: clone(completion)
    };
  }

  return {
    flattenOpenPatch,
    setPatchPath,
    validateSequenceCompletion,
    assembleSequenceProposal
  };
});
