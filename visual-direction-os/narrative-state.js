((root, factory) => {
  const contracts = typeof module === 'object' && module.exports
    ? require('./narrative-contracts.js')
    : root?.VDOSNarrativeContracts;
  const api = factory(contracts, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSNarrativeState = api;
})(typeof window !== 'undefined' ? window : globalThis, (contracts, root) => {
  'use strict';

  if (!contracts) throw new Error('VDOSNarrativeContracts is required before narrative-state.js');
  const { clone, BEAT_IDS, validateInterpretResponse, validateStrategyResponse, validateSequenceCompletionResponse, validateSequenceResponse } = contracts;
  const REQUEST_STAGES = ['interpret', 'strategy', 'sequence'];
  const READING_FIELDS = ['narrativeProblem', 'coreConflict', 'startingState', 'endingState', 'turningPoint', 'agencyTransition'];

  function resolveApplyEvidence() {
    const api = typeof module === 'object' && module.exports
      ? require('./generation-prompt-apply-evidence.js')
      : root?.VDOSGenerationPromptApplyEvidence;
    if (!api?.createEmptySequenceApplyState || !api?.validateSequenceApplyState || !api?.recordAppliedBeats) {
      throw new Error('VDOSGenerationPromptApplyEvidence is required before Narrative State Apply Evidence operations.');
    }
    return api;
  }

  const initialRequest = () => ({ status: 'idle', token: 0, error: null });
  const initialState = applyEvidence => ({
    stage: 'input',
    input: '',
    directorIntent: '',
    signal: null,
    readings: [],
    selectedReadingId: null,
    selectedReading: null,
    confirmedReading: null,
    strategies: [],
    selectedStrategyId: null,
    selectedStrategy: null,
    sequenceSkeleton: null,
    sequenceCompletion: null,
    sequenceProposal: null,
    sequenceProvenance: null,
    sequenceApplyState: applyEvidence.createEmptySequenceApplyState(),
    selectedBeatIds: clone(BEAT_IDS),
    applyMode: 'all',
    clarification: null,
    clarificationAnswer: null,
    requests: {
      interpret: initialRequest(),
      strategy: initialRequest(),
      sequence: initialRequest()
    }
  });

  function createNarrativeState(initial = {}) {
    const applyEvidence = resolveApplyEvidence();
    const initialClone = clone(initial);
    if (Object.prototype.hasOwnProperty.call(initialClone, 'sequenceApplyState')) {
      const checked = applyEvidence.validateSequenceApplyState(initialClone.sequenceApplyState);
      if (!checked.valid) throw new Error(`Invalid Sequence Apply Evidence: ${checked.errors.join('; ')}`);
      initialClone.sequenceApplyState = checked.value;
    }
    let state = { ...initialState(applyEvidence), ...initialClone };
    const listeners = new Set();

    const notify = source => {
      const snapshot = getState();
      listeners.forEach(listener => listener(snapshot, source));
    };

    function getState() {
      return clone(state);
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      listener(getState(), 'subscribe');
      return () => listeners.delete(listener);
    }

    function resetRequest(stageName, invalidate = false) {
      const current = state.requests[stageName];
      state.requests[stageName] = {
        status: 'idle',
        token: current.token + (invalidate ? 1 : 0),
        error: null
      };
    }

    function invalidateRequests(stages) {
      stages.forEach(stageName => resetRequest(stageName, true));
    }

    function resetApplyEvidence() {
      state.sequenceApplyState = applyEvidence.createEmptySequenceApplyState();
    }

    function clearSequenceArtifacts() {
      state.sequenceSkeleton = null;
      state.sequenceCompletion = null;
      state.sequenceProposal = null;
      state.sequenceProvenance = null;
      resetApplyEvidence();
      state.selectedBeatIds = clone(BEAT_IDS);
      state.applyMode = 'all';
    }

    function clearDownstreamFromReading() {
      state.confirmedReading = null;
      state.strategies = [];
      state.selectedStrategyId = null;
      state.selectedStrategy = null;
      clearSequenceArtifacts();
      invalidateRequests(['strategy', 'sequence']);
    }

    function clearDownstreamFromStrategy() {
      clearSequenceArtifacts();
      invalidateRequests(['sequence']);
    }

    function setInput(input, directorIntent = state.directorIntent) {
      const nextInput = String(input ?? '');
      const nextIntent = String(directorIntent ?? '');
      const changed = nextInput !== state.input || nextIntent !== state.directorIntent;
      state.input = nextInput;
      state.directorIntent = nextIntent;
      if (changed) {
        state.stage = 'input';
        state.signal = null;
        state.readings = [];
        state.selectedReadingId = null;
        state.selectedReading = null;
        state.confirmedReading = null;
        state.strategies = [];
        state.selectedStrategyId = null;
        state.selectedStrategy = null;
        clearSequenceArtifacts();
        state.clarification = null;
        state.clarificationAnswer = null;
        invalidateRequests(REQUEST_STAGES);
      }
      notify('input');
      return getState();
    }

    function setInterpretResult(payload) {
      const checked = validateInterpretResponse(payload);
      if (!checked.valid) throw new Error(`Invalid interpret response: ${checked.errors.join('; ')}`);
      const value = checked.value;
      state.stage = 'interpret';
      state.signal = value.signal;
      state.readings = clone(value.readings);
      state.clarification = clone(value.clarification);
      state.selectedReadingId = null;
      state.selectedReading = null;
      clearDownstreamFromReading();
      notify('interpret-result');
      return getState();
    }

    function selectReading(id) {
      const reading = state.readings.find(item => item.id === id);
      if (!reading) throw new Error(`Unknown Narrative Reading: ${id}`);
      state.selectedReadingId = id;
      state.selectedReading = clone(reading);
      state.stage = 'edit-reading';
      clearDownstreamFromReading();
      notify('reading-select');
      return getState();
    }

    function editSelectedReadingField(key, value) {
      if (!state.selectedReading) throw new Error('Select a Narrative Reading before editing it.');
      if (!READING_FIELDS.includes(key)) throw new Error(`Unsupported Narrative Reading field: ${key}`);
      const current = state.selectedReading[key];
      if (!current || typeof current !== 'object') throw new Error(`Narrative Reading field is unavailable: ${key}`);
      const editedValue = key === 'agencyTransition'
        ? (Array.isArray(value) ? clone(value) : String(value).split(/\s*(?:→|->|,)\s*/).filter(Boolean))
        : String(value ?? '');
      state.selectedReading[key] = {
        ...clone(current),
        value: editedValue,
        directorEdited: true,
        directorEditBasis: 'Edited by the director.'
      };
      state.stage = 'edit-reading';
      clearDownstreamFromReading();
      notify('reading-edit');
      return getState();
    }

    function confirmReading() {
      if (!state.selectedReading) throw new Error('Select a Narrative Reading before confirming it.');
      state.confirmedReading = clone(state.selectedReading);
      state.stage = 'strategy';
      state.strategies = [];
      state.selectedStrategyId = null;
      state.selectedStrategy = null;
      clearSequenceArtifacts();
      invalidateRequests(['strategy', 'sequence']);
      notify('reading-confirm');
      return getState();
    }

    function setStrategyResult(payload) {
      if (!state.confirmedReading) throw new Error('Confirm a Narrative Reading before generating strategies.');
      const checked = validateStrategyResponse(payload);
      if (!checked.valid) throw new Error(`Invalid strategy response: ${checked.errors.join('; ')}`);
      state.stage = 'strategy';
      state.strategies = clone(checked.value.strategies);
      state.selectedStrategyId = null;
      state.selectedStrategy = null;
      clearDownstreamFromStrategy();
      notify('strategy-result');
      return getState();
    }

    function selectStrategy(id) {
      if (!state.confirmedReading) throw new Error('Confirm a Narrative Reading before selecting a strategy.');
      const strategy = state.strategies.find(item => item.id === id);
      if (!strategy) throw new Error(`Unknown Visual Direction Strategy: ${id}`);
      state.selectedStrategyId = id;
      state.selectedStrategy = clone(strategy);
      state.stage = 'strategy';
      clearDownstreamFromStrategy();
      notify('strategy-select');
      return getState();
    }

    function setSequenceSkeleton(skeleton) {
      if (!state.confirmedReading || !state.selectedStrategy) throw new Error('Select a strategy after confirming a Narrative Reading before compiling a sequence skeleton.');
      if (!skeleton || typeof skeleton !== 'object' || !Array.isArray(skeleton.beats)) throw new Error('Sequence Skeleton must be an object with beats.');
      state.sequenceSkeleton = clone(skeleton);
      state.sequenceCompletion = null;
      state.sequenceProposal = null;
      state.sequenceProvenance = null;
      resetApplyEvidence();
      state.stage = 'strategy';
      state.selectedBeatIds = clone(BEAT_IDS);
      state.applyMode = 'all';
      notify('sequence-skeleton');
      return getState();
    }

    function setSequenceCompletionResult({ completion, proposal, provenance } = {}) {
      if (!state.sequenceSkeleton) throw new Error('Compile a Sequence Skeleton before storing a compiler-first completion result.');
      const completionCheck = validateSequenceCompletionResponse(completion);
      if (!completionCheck.valid) throw new Error(`Invalid sequence completion: ${completionCheck.errors.join('; ')}`);
      const proposalCheck = validateSequenceResponse({ sequenceProposal: proposal });
      if (!proposalCheck.valid) throw new Error(`Invalid assembled sequence proposal: ${proposalCheck.errors.join('; ')}`);
      if (!provenance || provenance.origin !== 'compiler-first') throw new Error('Compiler-first sequence provenance is required.');
      state.sequenceCompletion = clone(completionCheck.value);
      state.sequenceProposal = clone(proposalCheck.value.sequenceProposal);
      state.sequenceProvenance = clone(provenance);
      resetApplyEvidence();
      state.stage = 'sequence';
      state.selectedBeatIds = clone(BEAT_IDS);
      state.applyMode = 'all';
      notify('sequence-completion-result');
      return getState();
    }

    function setSequenceCompletionFailure(completion) {
      if (!state.sequenceSkeleton) throw new Error('Compile a Sequence Skeleton before storing a failed compiler-first completion.');
      const completionCheck = validateSequenceCompletionResponse(completion);
      if (!completionCheck.valid) throw new Error(`Invalid sequence completion shape: ${completionCheck.errors.join('; ')}`);
      state.sequenceCompletion = clone(completionCheck.value);
      state.sequenceProposal = null;
      state.sequenceProvenance = null;
      resetApplyEvidence();
      state.stage = 'sequence';
      state.selectedBeatIds = clone(BEAT_IDS);
      state.applyMode = 'all';
      notify('sequence-completion-failure');
      return getState();
    }

    function setSequenceResult(payload) {
      if (!state.confirmedReading || !state.selectedStrategy) throw new Error('Select a strategy after confirming a Narrative Reading before generating a sequence.');
      const checked = validateSequenceResponse(payload);
      if (!checked.valid) throw new Error(`Invalid sequence response: ${checked.errors.join('; ')}`);
      state.sequenceCompletion = null;
      state.sequenceProvenance = null;
      state.sequenceProposal = clone(checked.value.sequenceProposal);
      resetApplyEvidence();
      state.stage = 'sequence';
      state.selectedBeatIds = clone(BEAT_IDS);
      state.applyMode = 'all';
      notify('sequence-result');
      return getState();
    }

    function recordSequenceApplyEvidence({ proposal, provenance, sequence, beatIds } = {}) {
      if (!state.confirmedReading?.id) throw new Error('Confirm a Narrative Reading before recording Sequence Apply Evidence.');
      if (!state.selectedStrategy?.id) throw new Error('Select a Visual Direction Strategy before recording Sequence Apply Evidence.');
      if (!provenance || provenance.origin !== 'compiler-first') throw new Error('Compiler-first Sequence provenance is required before recording Apply Evidence.');
      const source = {
        readingId: state.confirmedReading.id,
        strategyId: state.selectedStrategy.id,
        grammarId: provenance.grammarId || null,
        sequenceOrigin: provenance.origin || null,
        skeletonVersion: provenance.skeletonVersion || state.sequenceSkeleton?.version || null
      };
      state.sequenceApplyState = applyEvidence.recordAppliedBeats(state.sequenceApplyState, {
        source, proposal, provenance, sequence, beatIds
      });
      notify('sequence-apply-evidence');
      return getState();
    }

    function clearSequenceApplyEvidence() {
      resetApplyEvidence();
      notify('sequence-apply-evidence-clear');
      return getState();
    }

    function toggleBeat(id) {
      if (!BEAT_IDS.includes(id)) throw new Error(`Unknown sequence beat: ${id}`);
      const selected = new Set(state.selectedBeatIds);
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
      state.selectedBeatIds = BEAT_IDS.filter(beatId => selected.has(beatId));
      notify('beat-toggle');
      return getState();
    }

    function setApplyMode(mode) {
      if (!['all', 'selected'].includes(mode)) throw new Error(`Unknown apply mode: ${mode}`);
      state.applyMode = mode;
      if (mode === 'all') state.selectedBeatIds = clone(BEAT_IDS);
      notify('apply-mode');
      return getState();
    }

    function setClarificationAnswer(answer) {
      state.clarificationAnswer = answer == null ? null : String(answer);
      notify('clarification-answer');
      return getState();
    }

    function beginRequest(stageName) {
      if (!REQUEST_STAGES.includes(stageName)) throw new Error(`Unknown Narrative request stage: ${stageName}`);
      const token = state.requests[stageName].token + 1;
      state.requests[stageName] = { status: 'loading', token, error: null };
      notify(`request:${stageName}:loading`);
      return token;
    }

    function acceptResponse(stageName, token, payload) {
      if (!REQUEST_STAGES.includes(stageName)) throw new Error(`Unknown Narrative request stage: ${stageName}`);
      if (state.requests[stageName].token !== token) return false;
      if (stageName === 'interpret') setInterpretResult(payload);
      else if (stageName === 'strategy') setStrategyResult(payload);
      else setSequenceResult(payload);
      state.requests[stageName] = { status: 'success', token, error: null };
      notify(`request:${stageName}:success`);
      return true;
    }

    function markRequestSuccess(stageName, token) {
      if (!REQUEST_STAGES.includes(stageName)) throw new Error(`Unknown Narrative request stage: ${stageName}`);
      if (state.requests[stageName].token !== token) return false;
      state.requests[stageName] = { status: 'success', token, error: null };
      notify(`request:${stageName}:success`);
      return true;
    }

    function failRequest(stageName, token, error) {
      if (!REQUEST_STAGES.includes(stageName)) throw new Error(`Unknown Narrative request stage: ${stageName}`);
      if (state.requests[stageName].token !== token) return false;
      state.requests[stageName] = { status: 'error', token, error: clone(error || { code: 'UNKNOWN', message: 'Unknown error' }) };
      notify(`request:${stageName}:error`);
      return true;
    }

    return {
      getState,
      subscribe,
      setInput,
      setInterpretResult,
      selectReading,
      editSelectedReadingField,
      confirmReading,
      setStrategyResult,
      selectStrategy,
      setSequenceSkeleton,
      setSequenceCompletionResult,
      setSequenceCompletionFailure,
      setSequenceResult,
      recordSequenceApplyEvidence,
      clearSequenceApplyEvidence,
      toggleBeat,
      setApplyMode,
      setClarificationAnswer,
      beginRequest,
      acceptResponse,
      markRequestSuccess,
      failRequest
    };
  }

  return { createNarrativeState };
});
