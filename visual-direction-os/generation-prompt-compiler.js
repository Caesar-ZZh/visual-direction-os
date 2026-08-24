((root, factory) => {
  const bridge = typeof module === 'object' && module.exports ? require('./visual-ir-bridge.js') : root?.VDOSVisualIRBridge;
  const applyEvidence = typeof module === 'object' && module.exports ? require('./generation-prompt-apply-evidence.js') : root?.VDOSGenerationPromptApplyEvidence;
  const promptIR = typeof module === 'object' && module.exports ? require('./generation-prompt-ir.js') : root?.VDOSGenerationPromptIR;
  const renderer = typeof module === 'object' && module.exports ? require('./generation-prompt-renderer.js') : root?.VDOSGenerationPromptRenderer;
  const authority = typeof module === 'object' && module.exports ? require('./project-constraint-authority.js') : root?.VDOSProjectConstraintAuthority;
  const contracts = typeof module === 'object' && module.exports ? require('./narrative-contracts.js') : root?.VDOSNarrativeContracts;
  const skeletonApi = typeof module === 'object' && module.exports ? require('./visual-sequence-skeleton.js') : root?.VDOSVisualSequenceSkeleton;
  const api = factory(bridge, applyEvidence, promptIR, renderer, authority, contracts, skeletonApi);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSGenerationPromptCompiler = api;
})(typeof window !== 'undefined' ? window : globalThis, (bridge, applyEvidence, promptIR, renderer, authority, contracts, skeletonApi) => {
  'use strict';

  if (!bridge?.validateVisualIR) throw new Error('VDOSVisualIRBridge is required before generation-prompt-compiler.js');
  if (!applyEvidence?.reconcileBeatApplyEvidence || !applyEvidence?.validateSequenceApplyState) throw new Error('VDOSGenerationPromptApplyEvidence is required before generation-prompt-compiler.js');
  if (!promptIR?.buildGenerationPromptIR) throw new Error('VDOSGenerationPromptIR is required before generation-prompt-compiler.js');
  if (!renderer?.renderPromptIR) throw new Error('VDOSGenerationPromptRenderer is required before generation-prompt-compiler.js');
  if (!authority?.resolveProjectConstraintAuthority) throw new Error('VDOSProjectConstraintAuthority is required before generation-prompt-compiler.js');
  if (!contracts?.validateSequenceResponse || !Array.isArray(contracts?.BEAT_IDS)) throw new Error('VDOSNarrativeContracts is required before generation-prompt-compiler.js');
  if (!skeletonApi?.validateSkeleton) throw new Error('VDOSVisualSequenceSkeleton is required before generation-prompt-compiler.js');

  const VERSION = '0.1.0';
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const nonEmpty = value => typeof value === 'string' && Boolean(value.trim());

  function domainError(code, message, details = null) {
    const error = new Error(message);
    error.code = code;
    if (details != null) error.details = clone(details);
    return error;
  }

  function validateContext({ sceneId, narrativeState, visualIR, sequence, projectConstraintContext } = {}) {
    if (!nonEmpty(sceneId)) throw domainError('PROMPT_SOURCE_INVALID', 'sceneId is required.');
    const visualCheck = bridge.validateVisualIR(visualIR || {});
    if (!visualCheck.valid) throw domainError('VISUAL_IR_INVALID', `Visual IR is invalid: ${visualCheck.errors.join('; ')}`, visualCheck.errors);
    if (!isObject(narrativeState)) throw domainError('PROMPT_SOURCE_INVALID', 'Narrative State is required.');
    if (!narrativeState.confirmedReading?.id) throw domainError('PROMPT_SOURCE_INVALID', 'Confirmed Narrative Reading is required.');
    if (!narrativeState.selectedStrategy?.id) throw domainError('PROMPT_SOURCE_INVALID', 'Selected Visual Direction Strategy is required.');
    const sequenceCheck = contracts.validateSequenceResponse({ sequenceProposal:narrativeState.sequenceProposal });
    if (!sequenceCheck.valid) throw domainError('PROMPT_SOURCE_INVALID', `Sequence Proposal is invalid: ${sequenceCheck.errors.join('; ')}`, sequenceCheck.errors);
    if (!isObject(narrativeState.sequenceProvenance) || narrativeState.sequenceProvenance.origin !== 'compiler-first' || !isObject(narrativeState.sequenceProvenance.fields)) {
      throw domainError('SEQUENCE_PROVENANCE_MISSING', 'Compiler-first Sequence provenance is required.');
    }
    const skeletonCheck = skeletonApi.validateSkeleton(narrativeState.sequenceSkeleton);
    if (!skeletonCheck.valid) throw domainError('PROMPT_SOURCE_INVALID', `Sequence Skeleton is invalid: ${skeletonCheck.errors.join('; ')}`, skeletonCheck.errors);
    const applyState = narrativeState.sequenceApplyState || applyEvidence.createEmptySequenceApplyState();
    const applyCheck = applyEvidence.validateSequenceApplyState(applyState);
    if (!applyCheck.valid) throw domainError('PROMPT_SOURCE_INVALID', `Sequence Apply Evidence is invalid: ${applyCheck.errors.join('; ')}`, applyCheck.errors);
    if (!isObject(sequence) || !Array.isArray(sequence.beats) || !Array.isArray(sequence.events)) throw domainError('PROMPT_SOURCE_INVALID', 'Current Sequence Director sequence is invalid.');
    if (projectConstraintContext?.targetSceneId && projectConstraintContext.targetSceneId !== sceneId) {
      throw domainError('PROMPT_SOURCE_INVALID', 'Project Constraint target Scene does not match Prompt Scene.');
    }
    return {
      proposal:sequenceCheck.value.sequenceProposal,
      skeleton:skeletonCheck.value,
      provenance:clone(narrativeState.sequenceProvenance),
      applyState:applyCheck.value
    };
  }

  function sourceIdentity(narrativeState) {
    const provenance = narrativeState.sequenceProvenance;
    return {
      readingId:narrativeState.confirmedReading.id,
      strategyId:narrativeState.selectedStrategy.id,
      grammarId:provenance.grammarId || null,
      sequenceOrigin:provenance.origin,
      skeletonVersion:provenance.skeletonVersion || narrativeState.sequenceSkeleton?.version || null
    };
  }

  function resolveProjectConstraints({ projectConstraintContext, visualIR, skeleton }) {
    if (!projectConstraintContext) return { resolutions:[], conflicts:[], safeToComplete:true };
    try {
      return authority.resolveProjectConstraintAuthority({
        ...clone(projectConstraintContext),
        visualIR:clone(visualIR),
        baseSkeleton:clone(skeleton)
      });
    } catch (error) {
      throw domainError('PROMPT_SOURCE_INVALID', `Project Constraint context is invalid: ${error?.message || error}`, { cause:error?.message || String(error) });
    }
  }

  function subsetEqual(current, expected) {
    if (expected === null || typeof expected !== 'object' || Array.isArray(expected)) return current === expected;
    if (!current || typeof current !== 'object' || Array.isArray(current)) return false;
    return Object.entries(expected).every(([key,value]) => Object.prototype.hasOwnProperty.call(current,key) && subsetEqual(current[key],value));
  }

  function scopedProjectReasons(resolutions, beatId) {
    const reasons = [];
    (resolutions || []).filter(item => item?.beatId === beatId).forEach(item => {
      if (item.status === 'STALE') reasons.push({
        code:'PROJECT_CONSTRAINT_STALE', beatId, constraintId:item.constraintId, revision:item.revision,
        message:'A Project Constraint for this Beat is stale and has no current exact authority.'
      });
      if (item.status === 'CONFLICT') reasons.push({
        code:'PROJECT_CONSTRAINT_CONFLICT', beatId, constraintId:item.constraintId, revision:item.revision, reason:item.reason || null,
        message:'A Project Constraint conflicts with current Scene compiler authority for this Beat.'
      });
    });
    return reasons;
  }

  function rendererFailureReason(error, beatId) {
    return {
      code:error?.code || 'PROMPT_RENDER_FAILED', beatId,
      message:error?.message || 'Prompt rendering failed.',
      ...(error?.details != null ? { details:clone(error.details) } : {})
    };
  }

  function compileBeatPromptPackage(args = {}) {
    const checked = validateContext(args);
    const { sceneId, narrativeState, visualIR, sequence, sceneState = null, projectConstraintContext = null } = args;
    const beatId = args.beatId;
    if (!contracts.BEAT_IDS.includes(beatId)) throw domainError('PROMPT_SOURCE_INVALID', `Unknown Prompt Beat: ${beatId}`);
    const proposalBeat = checked.proposal.beats.find(item => item.id === beatId);
    const skeletonBeat = checked.skeleton.beats.find(item => item.id === beatId);
    if (!proposalBeat || !skeletonBeat) throw domainError('PROMPT_SOURCE_INVALID', `Prompt Beat source is unavailable: ${beatId}`);

    const project = resolveProjectConstraints({ projectConstraintContext, visualIR, skeleton:checked.skeleton });
    const projectReasons = scopedProjectReasons(project.resolutions, beatId);
    const apply = applyEvidence.reconcileBeatApplyEvidence(checked.applyState, {
      source:sourceIdentity(narrativeState),
      proposal:checked.proposal,
      provenance:checked.provenance,
      sequence,
      beatId
    });

    const blockers = projectReasons.slice();
    const draftReasons = [];
    if (apply.status === 'MISSING') draftReasons.push({ code:'APPLY_REQUIRED', beatId, message:'This Beat has not crossed the explicit Apply boundary.' });
    if (apply.status === 'STALE') blockers.push({
      code:'BEAT_APPLY_EVIDENCE_STALE', beatId, reason:apply.reason,
      message:'The stored Apply Evidence no longer matches the current proposal, provenance, or Sequence Director Beat.'
    });

    if (apply.status === 'CURRENT' && sceneState?.narrativeState === beatId && !subsetEqual(sceneState, proposalBeat.sceneStatePatch)) {
      blockers.push({ code:'SCENE_PROVENANCE_DIVERGENCE', beatId, message:'Current Scene State no longer matches the applied Beat provenance.' });
    }

    const compileState = {
      phase:apply.receipt ? 'applied' : 'proposal',
      applyRevision:apply.receipt?.applyRevision || null
    };
    const ir = promptIR.buildGenerationPromptIR({
      sceneId,
      narrativeInput:narrativeState.input || '',
      confirmedReading:narrativeState.confirmedReading,
      selectedStrategy:narrativeState.selectedStrategy,
      visualIR,
      skeletonBeat,
      proposalBeat,
      sequenceProvenance:checked.provenance,
      projectResolutions:project.resolutions || [],
      applyEvidence:apply.receipt || null,
      compileState
    });

    let rendered = null;
    try {
      rendered = renderer.renderPromptIR(ir);
    } catch (error) {
      blockers.push(rendererFailureReason(error, beatId));
    }

    const status = blockers.length ? 'BLOCKED' : apply.status === 'CURRENT' ? 'READY' : 'DRAFT';
    const reasons = blockers.length ? blockers : draftReasons;
    ir.readiness = { status, reasons:clone(reasons) };

    return {
      schemaVersion:VERSION,
      promptIR:clone(ir),
      rendered:clone(rendered),
      readiness:{ status, reasons:clone(reasons) }
    };
  }

  function compileGenerationPromptSet(args = {}) {
    const checked = validateContext(args);
    void checked;
    const packages = contracts.BEAT_IDS.map(beatId => compileBeatPromptPackage({ ...args, beatId }));
    const summary = { draft:0, ready:0, blocked:0 };
    packages.forEach(item => { summary[item.readiness.status.toLowerCase()] += 1; });
    return {
      schemaVersion:VERSION,
      sceneId:args.sceneId,
      beatOrder:clone(contracts.BEAT_IDS),
      packages,
      summary
    };
  }

  return { VERSION, compileBeatPromptPackage, compileGenerationPromptSet, subsetEqual };
});
