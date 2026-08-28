((root, factory) => {
  const contracts = typeof module === 'object' && module.exports
    ? require('./narrative-contracts.js')
    : root?.VDOSNarrativeContracts;
  const api = factory(contracts);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSNarrativeApply = api;
})(typeof window !== 'undefined' ? window : globalThis, contracts => {
  'use strict';

  if (!contracts) throw new Error('VDOSNarrativeContracts is required before narrative-apply.js');
  const clone = contracts.clone || (value => JSON.parse(JSON.stringify(value)));
  const EVENT_FRACTIONS = [.25, .50, .75];

  const stable = value => JSON.stringify(value);

  function assertProposalBeat(proposalBeat, beatId) {
    if (!proposalBeat) throw new Error(`Missing proposal beat: ${beatId}`);
    const patchCheck = contracts.validateSceneStatePatch(proposalBeat.sceneStatePatch);
    if (!patchCheck.valid) {
      throw new Error(`Invalid scene state patch for ${beatId}: ${patchCheck.errors.join('; ')}`);
    }
    if (!Array.isArray(proposalBeat.visualEvents) || proposalBeat.visualEvents.length > 3) {
      throw new Error(`Invalid visual events for ${beatId}.`);
    }
  }

  function proposalEvent(event, beat, proposalBeat, index) {
    const type = typeof event === 'string' ? event : event?.type;
    if (!String(type || '').trim()) throw new Error(`Invalid visual event for ${beat.id}.`);
    const fraction = EVENT_FRACTIONS[index] ?? .5;
    const at = Number((Number(beat.start) + (Number(beat.end) - Number(beat.start)) * fraction).toFixed(6));
    return {
      id: `${beat.id}-proposal-${index}`,
      type: String(type),
      at,
      beatId: beat.id,
      cause: proposalBeat.rationale || proposalBeat.narrativeBeat || 'Narrative proposal event.',
      primaryChange: `Primary variable: ${String(proposalBeat.primaryVariable || '—').toUpperCase()}.`,
      supportingChanges: (proposalBeat.supportingVariables || []).map(value => `${String(value).toUpperCase()} supports the primary change.`),
      heldBack: (proposalBeat.restrainedVariables || []).map(value => String(value).toUpperCase()),
      targetPatch: clone(proposalBeat.sceneStatePatch)
    };
  }

  function buildSequenceFromProposal(proposal, currentSequence, selectedBeatIds) {
    if (!proposal || !Array.isArray(proposal.beats)) throw new Error('Narrative sequence proposal requires beats.');
    if (!currentSequence || !Array.isArray(currentSequence.beats) || !Array.isArray(currentSequence.events)) {
      throw new Error('Current Sequence Director sequence is invalid.');
    }

    const selected = new Set(Array.isArray(selectedBeatIds) ? selectedBeatIds : []);
    const currentIds = new Set(currentSequence.beats.map(beat => beat.id));
    selected.forEach(id => {
      if (!currentIds.has(id)) throw new Error(`Unknown selected beat: ${id}`);
    });

    const proposalById = new Map(proposal.beats.map(beat => [beat.id, beat]));
    const next = clone(currentSequence);

    next.beats = currentSequence.beats.map(beat => {
      if (!selected.has(beat.id)) return clone(beat);
      const proposalBeat = proposalById.get(beat.id);
      assertProposalBeat(proposalBeat, beat.id);
      return {
        ...clone(beat),
        narrativePurpose: String(proposalBeat.narrativeBeat),
        primaryVariable: String(proposalBeat.primaryVariable),
        supportingVariables: clone(proposalBeat.supportingVariables || []),
        restrainedVariables: clone(proposalBeat.restrainedVariables || []),
        scenePatch: clone(proposalBeat.sceneStatePatch)
      };
    });

    const untouchedEvents = currentSequence.events.filter(event => !selected.has(event.beatId)).map(clone);
    const replacementEvents = [];
    next.beats.forEach(beat => {
      if (!selected.has(beat.id)) return;
      const proposalBeat = proposalById.get(beat.id);
      (proposalBeat.visualEvents || []).forEach((event, index) => {
        replacementEvents.push(proposalEvent(event, beat, proposalBeat, index));
      });
    });
    next.events = [...untouchedEvents, ...replacementEvents].sort((a, b) => Number(a.at) - Number(b.at));
    return next;
  }

  function summarizeImpact(currentSequence, nextSequence) {
    const currentBeats = new Map((currentSequence?.beats || []).map(beat => [beat.id, beat]));
    const nextBeats = nextSequence?.beats || [];
    const changedBeatIds = nextBeats
      .filter(beat => stable(currentBeats.get(beat.id)) !== stable(beat))
      .map(beat => beat.id);

    const beatOrder = nextBeats.map(beat => beat.id);
    const eventSignature = (sequence, beatId) => stable((sequence?.events || []).filter(event => event.beatId === beatId));
    const changedEventBeatIds = beatOrder.filter(beatId => eventSignature(currentSequence, beatId) !== eventSignature(nextSequence, beatId));

    return { changedBeatIds, changedEventBeatIds };
  }

  return { buildSequenceFromProposal, summarizeImpact };
});