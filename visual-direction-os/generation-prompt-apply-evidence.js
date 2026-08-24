((root, factory) => {
  const registry = typeof module === 'object' && module.exports
    ? require('./project-constraint-registry.js')
    : root?.VDOSProjectConstraintRegistry;
  const api = factory(registry);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSGenerationPromptApplyEvidence = api;
})(typeof window !== 'undefined' ? window : globalThis, registry => {
  'use strict';

  if (!registry?.canonicalJSONString || !registry?.fingerprintSnapshot) {
    throw new Error('VDOSProjectConstraintRegistry is required before generation-prompt-apply-evidence.js');
  }

  const APPLY_EVIDENCE_VERSION = '0.1.0';
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const nonEmpty = value => typeof value === 'string' && Boolean(value.trim());

  function createEmptySequenceApplyState() {
    return { schemaVersion: APPLY_EVIDENCE_VERSION, revision: 0, beats: {} };
  }

  function proposalBeat(proposal, beatId) {
    return (proposal?.beats || []).find(item => item?.id === beatId) || null;
  }

  function beatProvenanceSnapshot(provenance, beatId) {
    const prefix = `${beatId}.`;
    const fields = Object.fromEntries(
      Object.entries(provenance?.fields || {}).filter(([key]) => key.startsWith(prefix))
    );
    const projectConstraints = (provenance?.projectConstraints?.resolutions || [])
      .filter(item => item?.beatId === beatId);
    return {
      origin: provenance?.origin || null,
      skeletonVersion: provenance?.skeletonVersion || null,
      grammarId: provenance?.grammarId || null,
      fields,
      projectConstraints
    };
  }

  function sequenceBeatSnapshot(sequence, beatId) {
    const beat = (sequence?.beats || []).find(item => item?.id === beatId) || null;
    const events = (sequence?.events || []).filter(item => item?.beatId === beatId);
    return { beat, events };
  }

  function proposalBeatFingerprint(beat) {
    return registry.fingerprintSnapshot('pbeat', beat);
  }

  function provenanceFingerprint(provenance, beatId) {
    return registry.fingerprintSnapshot('pprv', beatProvenanceSnapshot(provenance, beatId));
  }

  function sequenceDirectorBeatFingerprint(sequence, beatId) {
    return registry.fingerprintSnapshot('sbeat', sequenceBeatSnapshot(sequence, beatId));
  }

  function validateSource(source, path, errors) {
    if (!isObject(source)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (!nonEmpty(source.readingId)) errors.push(`${path}.readingId is required`);
    if (!nonEmpty(source.strategyId)) errors.push(`${path}.strategyId is required`);
    if (source.grammarId != null && !nonEmpty(source.grammarId)) errors.push(`${path}.grammarId must be null or a non-empty string`);
    if (source.sequenceOrigin !== 'compiler-first') errors.push(`${path}.sequenceOrigin must be compiler-first`);
    if (!nonEmpty(source.skeletonVersion)) errors.push(`${path}.skeletonVersion is required`);
  }

  function validateSequenceApplyState(state) {
    const errors = [];
    if (!isObject(state)) return { valid:false, errors:['sequenceApplyState must be an object'] };
    if (state.schemaVersion !== APPLY_EVIDENCE_VERSION) errors.push(`schemaVersion must be ${APPLY_EVIDENCE_VERSION}`);
    if (!Number.isInteger(state.revision) || state.revision < 0) errors.push('revision must be a non-negative integer');
    if (!isObject(state.beats)) errors.push('beats must be an object');
    else Object.entries(state.beats).forEach(([beatId, receipt]) => {
      const path = `beats.${beatId}`;
      if (!isObject(receipt)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (receipt.beatId !== beatId || !nonEmpty(receipt.beatId)) errors.push(`${path}.beatId must match its key`);
      if (!Number.isInteger(receipt.applyRevision) || receipt.applyRevision < 1 || receipt.applyRevision > state.revision) {
        errors.push(`${path}.applyRevision must be a positive revision not greater than state.revision`);
      }
      validateSource(receipt.source, `${path}.source`, errors);
      if (!/^pbeat-[0-9a-f]{16}$/.test(String(receipt.proposalBeatFingerprint || ''))) errors.push(`${path}.proposalBeatFingerprint is invalid`);
      if (!/^pprv-[0-9a-f]{16}$/.test(String(receipt.provenanceFingerprint || ''))) errors.push(`${path}.provenanceFingerprint is invalid`);
      if (!/^sbeat-[0-9a-f]{16}$/.test(String(receipt.sequenceDirectorBeatFingerprint || ''))) errors.push(`${path}.sequenceDirectorBeatFingerprint is invalid`);
      if ('timestamp' in receipt || 'generatedAt' in receipt || 'appliedAt' in receipt) errors.push(`${path} must not persist timestamps`);
    });
    return errors.length ? { valid:false, errors } : { valid:true, errors:[], value:clone(state) };
  }

  function checkedState(state) {
    const checked = validateSequenceApplyState(state);
    if (!checked.valid) throw new Error(`Invalid Sequence Apply Evidence: ${checked.errors.join('; ')}`);
    return checked.value;
  }

  function checkedSource(source) {
    const errors = [];
    validateSource(source, 'source', errors);
    if (errors.length) throw new Error(`Invalid Apply Evidence source: ${errors.join('; ')}`);
    return clone(source);
  }

  function selectedBeatIds(beatIds) {
    if (!Array.isArray(beatIds) || !beatIds.length || beatIds.some(id => !nonEmpty(id))) {
      throw new Error('Apply Evidence beatIds must contain at least one non-empty Beat ID.');
    }
    if (new Set(beatIds).size !== beatIds.length) throw new Error('Apply Evidence beatIds must be unique.');
    return beatIds.slice();
  }

  function recordAppliedBeats(state, { source, proposal, provenance, sequence, beatIds } = {}) {
    const next = checkedState(state || createEmptySequenceApplyState());
    const currentSource = checkedSource(source);
    const selected = selectedBeatIds(beatIds);
    if (!provenance || provenance.origin !== 'compiler-first') throw new Error('Apply Evidence requires compiler-first Sequence provenance.');

    const resolved = selected.map(beatId => {
      const proposalValue = proposalBeat(proposal, beatId);
      if (!proposalValue) throw new Error(`Apply Evidence proposal Beat is unavailable: ${beatId}`);
      const sequenceValue = (sequence?.beats || []).find(item => item?.id === beatId) || null;
      if (!sequenceValue) throw new Error(`Apply Evidence Sequence Director Beat is unavailable: ${beatId}`);
      return { beatId, proposalValue };
    });

    const revision = next.revision + 1;
    next.revision = revision;
    resolved.forEach(({ beatId, proposalValue }) => {
      next.beats[beatId] = {
        beatId,
        applyRevision: revision,
        source: clone(currentSource),
        proposalBeatFingerprint: proposalBeatFingerprint(proposalValue),
        provenanceFingerprint: provenanceFingerprint(provenance, beatId),
        sequenceDirectorBeatFingerprint: sequenceDirectorBeatFingerprint(sequence, beatId)
      };
    });
    return checkedState(next);
  }

  function stale(reason, receipt) {
    return { status:'STALE', reason, receipt:clone(receipt) };
  }

  function reconcileBeatApplyEvidence(state, { source, proposal, provenance, sequence, beatId } = {}) {
    const current = checkedState(state || createEmptySequenceApplyState());
    if (!nonEmpty(beatId)) throw new Error('Apply Evidence reconciliation requires beatId.');
    const receipt = current.beats[beatId] || null;
    if (!receipt) return { status:'MISSING', reason:'NOT_APPLIED', receipt:null };

    const currentSource = checkedSource(source);
    if (registry.canonicalJSONString(receipt.source) !== registry.canonicalJSONString(currentSource)) return stale('SOURCE_CHANGED', receipt);

    const proposalValue = proposalBeat(proposal, beatId);
    if (!proposalValue || receipt.proposalBeatFingerprint !== proposalBeatFingerprint(proposalValue)) return stale('PROPOSAL_BEAT_CHANGED', receipt);

    if (!provenance || provenance.origin !== 'compiler-first' || receipt.provenanceFingerprint !== provenanceFingerprint(provenance, beatId)) {
      return stale('PROVENANCE_CHANGED', receipt);
    }

    const sequenceValue = (sequence?.beats || []).find(item => item?.id === beatId) || null;
    if (!sequenceValue || receipt.sequenceDirectorBeatFingerprint !== sequenceDirectorBeatFingerprint(sequence, beatId)) {
      return stale('SEQUENCE_DIRECTOR_BEAT_CHANGED', receipt);
    }

    return { status:'CURRENT', reason:'MATCH', receipt:clone(receipt) };
  }

  return {
    APPLY_EVIDENCE_VERSION,
    createEmptySequenceApplyState,
    proposalBeatFingerprint,
    provenanceFingerprint,
    sequenceDirectorBeatFingerprint,
    validateSequenceApplyState,
    recordAppliedBeats,
    reconcileBeatApplyEvidence
  };
});
