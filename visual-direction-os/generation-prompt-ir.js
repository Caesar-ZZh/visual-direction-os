((root, factory) => {
  const bridge = typeof module === 'object' && module.exports
    ? require('./visual-ir-bridge.js')
    : root?.VDOSVisualIRBridge;
  const registry = typeof module === 'object' && module.exports
    ? require('./project-constraint-registry.js')
    : root?.VDOSProjectConstraintRegistry;
  const api = factory(bridge, registry);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSGenerationPromptIR = api;
})(typeof window !== 'undefined' ? window : globalThis, (bridge, registry) => {
  'use strict';

  if (!bridge?.validateVisualIR) throw new Error('VDOSVisualIRBridge is required before generation-prompt-ir.js');
  if (!registry?.fingerprintSnapshot || !registry?.canonicalJSONString) throw new Error('VDOSProjectConstraintRegistry is required before generation-prompt-ir.js');

  const PROMPT_IR_VERSION = '0.1.0';
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const nonEmpty = value => typeof value === 'string' && Boolean(value.trim());

  function failure(code, message, errors = null) {
    const error = new Error(message);
    error.code = code;
    if (errors) error.errors = clone(errors);
    return error;
  }

  function readProposalPath(proposalBeat, path) {
    const patch = proposalBeat?.sceneStatePatch;
    if (!isObject(patch)) return undefined;
    if (path === 'agency') return patch.agency;
    const parts = String(path || '').split('.').filter(Boolean);
    if (parts.length !== 2) return undefined;
    if (parts[0] === 'ownership') return patch.ownership?.[parts[1]];
    return patch.variables?.[parts[0]]?.[parts[1]];
  }

  function collectBeatProvenance(sequenceProvenance, beatId) {
    const prefix = `${beatId}.`;
    return Object.fromEntries(
      Object.entries(sequenceProvenance?.fields || {})
        .filter(([key]) => key.startsWith(prefix))
        .map(([key, value]) => [key.slice(prefix.length), clone(value)])
    );
  }

  function collectEvidenceGaps(visualIR) {
    const result = [];
    const seen = new Set();
    const add = item => {
      if (!item || !nonEmpty(item.field) || seen.has(item.field)) return;
      const normalized = {
        field: item.field,
        status: nonEmpty(item.status) ? item.status : 'unresolved',
        ...(item.confidence !== undefined ? { confidence:clone(item.confidence) } : {}),
        source: nonEmpty(item.source) ? item.source : 'visual-ir'
      };
      result.push(normalized);
      seen.add(item.field);
    };
    (visualIR?.evidence?.gaps || []).forEach(add);
    (visualIR?.evidence?.unresolved || []).forEach(field => add({ field, status:'unresolved', source:'visual-ir' }));
    return result;
  }

  function currentProjectSupport({ meta, beatId, path, projectResolutions }) {
    const ids = Array.isArray(meta?.projectConstraintIds) ? meta.projectConstraintIds : [];
    if (!ids.length) return [];
    return (projectResolutions || [])
      .filter(item => item?.status === 'SATISFIED' && item?.beatId === beatId && item?.path === path && ids.includes(item.constraintId))
      .map(item => ({ constraintId:item.constraintId, revision:item.revision, result:'satisfied' }));
  }

  function validateSourceBackbone(args) {
    const errors = [];
    if (!nonEmpty(args.sceneId)) errors.push('sceneId is required');
    if (!nonEmpty(args.proposalBeat?.id)) errors.push('proposalBeat.id is required');
    if (!nonEmpty(args.confirmedReading?.id)) errors.push('confirmedReading.id is required');
    if (!nonEmpty(args.selectedStrategy?.id)) errors.push('selectedStrategy.id is required');
    if (!nonEmpty(args.skeletonBeat?.structure?.primaryVariable)) errors.push('skeletonBeat.structure.primaryVariable is required');
    if (!isObject(args.sequenceProvenance) || args.sequenceProvenance.origin !== 'compiler-first') errors.push('sequenceProvenance.origin must be compiler-first');
    if (!isObject(args.sequenceProvenance?.fields)) errors.push('sequenceProvenance.fields must be an object');
    if (args.skeletonBeat?.id && args.proposalBeat?.id && args.skeletonBeat.id !== args.proposalBeat.id) errors.push('skeletonBeat.id must match proposalBeat.id');
    if (args.visualIR?.source?.readingId && args.confirmedReading?.id && args.visualIR.source.readingId !== args.confirmedReading.id) errors.push('Visual IR reading identity does not match confirmed Reading');
    if (args.visualIR?.source?.strategyId && args.selectedStrategy?.id && args.visualIR.source.strategyId !== args.selectedStrategy.id) errors.push('Visual IR strategy identity does not match selected Strategy');
    if (errors.length) throw failure('PROMPT_SOURCE_INVALID', `Prompt source is invalid: ${errors.join('; ')}`, errors);
  }

  function validatePromptIR(promptIR) {
    const shapeErrors = [];
    if (!isObject(promptIR)) throw failure('PROMPT_IR_INVALID', 'Generation Prompt IR must be an object.');
    if (promptIR.schemaVersion !== PROMPT_IR_VERSION) shapeErrors.push(`schemaVersion must be ${PROMPT_IR_VERSION}`);
    if (promptIR.mode !== 'generation-translation') shapeErrors.push('mode must be generation-translation');
    if (!nonEmpty(promptIR.sceneId)) shapeErrors.push('sceneId is required');
    if (!nonEmpty(promptIR.beatId)) shapeErrors.push('beatId is required');
    for (const key of ['required','guided','open','blocked','antiRules','evidenceGaps']) if (!Array.isArray(promptIR[key])) shapeErrors.push(`${key} must be an array`);
    if (!isObject(promptIR.meta) || promptIR.meta.version !== PROMPT_IR_VERSION) shapeErrors.push('meta.version is invalid');
    if (!isObject(promptIR.source)) shapeErrors.push('source is required');
    if (!isObject(promptIR.content)) shapeErrors.push('content is required');
    if (!isObject(promptIR.provenance)) shapeErrors.push('provenance is required');
    if (!isObject(promptIR.compileState)) shapeErrors.push('compileState is required');
    if (shapeErrors.length) throw failure('PROMPT_IR_INVALID', `Generation Prompt IR is invalid: ${shapeErrors.join('; ')}`, shapeErrors);

    const escalation = [];
    (promptIR.required || []).forEach((item, index) => {
      if (item?.authorityClass !== 'required') escalation.push(`required.${index}.authorityClass must be required`);
      if (item?.kind === 'structural') {
        if (item.owner !== 'director-confirmed') escalation.push(`required.${index} structural owner must be director-confirmed`);
      } else if (item?.kind === 'exact') {
        if (item.owner !== 'compiler' || item.support !== 'supported') escalation.push(`required.${index} exact directive requires compiler/supported authority`);
        if (item.value === undefined || item.value === 'UNKNOWN') escalation.push(`required.${index} exact value must be resolved`);
      } else escalation.push(`required.${index}.kind is invalid`);
      if (item?.owner === 'project' || item?.owner === 'apply') escalation.push(`required.${index} uses forbidden owner ${item.owner}`);
    });
    (promptIR.guided || []).forEach((item,index) => {
      if (item?.authorityClass !== 'guided' || item?.owner !== 'ai') escalation.push(`guided.${index} must remain ai/guided`);
    });
    (promptIR.open || []).forEach((item,index) => {
      if (item?.authorityClass !== 'open' || item?.owner !== 'none') escalation.push(`open.${index} must remain none/open`);
    });
    (promptIR.blocked || []).forEach((item,index) => {
      if (item?.authorityClass !== 'blocked' || item?.owner !== 'none') escalation.push(`blocked.${index} must remain none/blocked`);
    });
    if (escalation.length) throw failure('AUTHORITY_ESCALATION', `Prompt authority escalation rejected: ${escalation.join('; ')}`, escalation);
    if (promptIR.fingerprint != null && !/^pir-[0-9a-f]{16}$/.test(String(promptIR.fingerprint))) throw failure('PROMPT_IR_INVALID', 'fingerprint is invalid');
    return { valid:true, errors:[], value:clone(promptIR) };
  }

  function fingerprintPromptIR(promptIR) {
    const meta = { ...(promptIR?.meta || {}) };
    delete meta.generatedAt;
    const semantic = {
      schemaVersion:promptIR?.schemaVersion,
      meta,
      sceneId:promptIR?.sceneId,
      beatId:promptIR?.beatId,
      source:promptIR?.source,
      content:promptIR?.content,
      intent:promptIR?.intent,
      required:promptIR?.required,
      guided:promptIR?.guided,
      open:promptIR?.open,
      blocked:promptIR?.blocked,
      antiRules:promptIR?.antiRules,
      evidenceGaps:promptIR?.evidenceGaps,
      provenance:promptIR?.provenance,
      compileState:promptIR?.compileState
    };
    return registry.fingerprintSnapshot('pir', semantic);
  }

  function buildGenerationPromptIR(args = {}) {
    const visualCheck = bridge.validateVisualIR(args.visualIR || {});
    if (!visualCheck.valid) throw failure('VISUAL_IR_INVALID', `Visual IR is invalid: ${visualCheck.errors.join('; ')}`, visualCheck.errors);
    validateSourceBackbone(args);

    const { sceneId, narrativeInput, confirmedReading, selectedStrategy, visualIR, skeletonBeat, proposalBeat, sequenceProvenance, projectResolutions = [], applyEvidence = null } = args;
    const compileState = clone(args.compileState || { phase:'proposal', applyRevision:null });
    if (!['proposal','applied'].includes(compileState.phase)) throw failure('PROMPT_SOURCE_INVALID', 'compileState.phase must be proposal or applied');

    const beatId = proposalBeat.id;
    const beatProvenance = collectBeatProvenance(sequenceProvenance, beatId);
    const required = [
      { kind:'structural', key:'primaryVariable', value:skeletonBeat.structure.primaryVariable, owner:'director-confirmed', authorityClass:'required' },
      { kind:'structural', key:'supportingVariables', value:clone(skeletonBeat.structure.supportingVariables || []), owner:'director-confirmed', authorityClass:'required' },
      { kind:'structural', key:'restrainedVariables', value:clone(skeletonBeat.structure.restrainedVariables || []), owner:'director-confirmed', authorityClass:'required' }
    ];
    const guided = [];
    const provenanceRequired = [];
    const provenanceGuided = [];

    for (const [path, meta] of Object.entries(beatProvenance)) {
      const value = readProposalPath(proposalBeat, path);
      if (meta?.owner === 'compiler' && meta?.support === 'supported') {
        if (value === undefined || value === 'UNKNOWN') throw failure('PROMPT_SOURCE_INVALID', `Supported compiler field ${beatId}.${path} has no exact guarded proposal value.`);
        const projectSupport = currentProjectSupport({ meta, beatId, path, projectResolutions });
        required.push({ kind:'exact', path, value:clone(value), owner:'compiler', support:'supported', source:meta.source || null, authorityClass:'required', projectSupport });
        provenanceRequired.push({ path, owner:'compiler', support:'supported', source:meta.source || null, projectConstraintIds:projectSupport.map(item => item.constraintId) });
      } else if (meta?.owner === 'ai') {
        if (value === undefined || value === 'UNKNOWN') continue;
        guided.push({ path, value:clone(value), owner:'ai', support:meta.support || 'open', source:meta.source || 'sequence-completion', authorityClass:'guided' });
        provenanceGuided.push({ path, owner:'ai', support:meta.support || 'open', source:meta.source || 'sequence-completion' });
      }
    }

    const guidedPaths = new Set(guided.map(item => item.path));
    const open = [];
    const openKeys = new Set();
    const addOpen = (field, source, reason) => {
      if (!nonEmpty(field) || openKeys.has(field)) return;
      openKeys.add(field);
      open.push({ field, owner:'none', authorityClass:'open', source, reason });
    };
    for (const [field, signal] of Object.entries(visualIR.visual || {})) {
      if (signal?.status === 'unknown') addOpen(field, 'visual-ir', signal.basis || 'unresolved-evidence');
    }
    for (const [path, slot] of Object.entries(skeletonBeat.patchSlots || {})) {
      if (slot?.status === 'open' && !guidedPaths.has(path)) addOpen(path, 'sequence-skeleton', 'ai-open-slot-unfilled');
    }

    const blocked = Object.entries(skeletonBeat.patchSlots || {})
      .filter(([,slot]) => slot?.status === 'blocked')
      .map(([path,slot]) => ({ path, authorityClass:'blocked', owner:'none', source:slot.source || null, reason:slot.why || 'blocked-by-compiler-contract' }));

    const antiRulesValue = visualIR.constraints?.antiRules;
    const antiRules = antiRulesValue?.status === 'known' && Array.isArray(antiRulesValue.value)
      ? antiRulesValue.value.map(value => ({ value:clone(value), owner:'grammar/evidence', authorityClass:'anti-rule', source:antiRulesValue.source || `grammar:${visualIR.grammar?.id || 'unresolved'}` }))
      : [];

    const satisfiedProject = (projectResolutions || [])
      .filter(item => item?.status === 'SATISFIED' && item?.beatId === beatId)
      .map(item => ({ constraintId:item.constraintId, revision:item.revision, result:'satisfied', path:item.path }));

    const prompt = {
      schemaVersion:PROMPT_IR_VERSION,
      mode:'generation-translation',
      sceneId,
      beatId,
      compileState,
      meta:{
        schema:'GenerationPromptIR',
        version:PROMPT_IR_VERSION,
        sourceVisualIRVersion:visualIR.schemaVersion,
        engine:'deterministic',
        grammarId:sequenceProvenance.grammarId || visualIR.grammar?.id || visualIR.source?.grammarId || null,
        readingId:confirmedReading.id,
        strategyId:selectedStrategy.id,
        sceneId,
        beatId
      },
      source:{
        readingId:confirmedReading.id,
        strategyId:selectedStrategy.id,
        grammarId:sequenceProvenance.grammarId || visualIR.grammar?.id || visualIR.source?.grammarId || null,
        sequenceOrigin:sequenceProvenance.origin,
        skeletonVersion:sequenceProvenance.skeletonVersion || null,
        projectConstraints:satisfiedProject
      },
      content:{
        sceneDescription:{ value:String(narrativeInput ?? ''), owner:'director', source:'narrative-input' },
        beatRealization:{ value:String(proposalBeat.narrativeBeat ?? ''), owner:'ai', source:'sequence-completion' },
        visualEvents:(proposalBeat.visualEvents || []).map(value => ({ value:clone(value), owner:'ai', source:'sequence-completion' }))
      },
      intent:{
        narrative:clone(visualIR.narrative || {}),
        primaryVariable:clone(visualIR.direction?.primaryVariable || null),
        supportingVariables:clone(visualIR.direction?.supportingVariables || null),
        restrainedVariables:clone(visualIR.direction?.restrainedVariables || null),
        mechanism:clone(visualIR.direction?.mechanism || null),
        rationale:clone(visualIR.direction?.rationale || null),
        agencyTransition:clone(visualIR.agency?.transition || null)
      },
      required,
      guided,
      open,
      blocked,
      antiRules,
      evidenceGaps:collectEvidenceGaps(visualIR),
      provenance:{
        requiredFields:provenanceRequired,
        guidedFields:provenanceGuided,
        projectConstraintRefs:satisfiedProject,
        applyEvidence:clone(applyEvidence)
      },
      readiness:{
        status:'DRAFT',
        reasons:[compileState.phase === 'proposal' ? {code:'APPLY_REQUIRED'} : {code:'RUNTIME_RECONCILIATION_REQUIRED'}]
      },
      fingerprint:null
    };

    validatePromptIR(prompt);
    prompt.fingerprint = fingerprintPromptIR(prompt);
    validatePromptIR(prompt);
    return clone(prompt);
  }

  return {
    PROMPT_IR_VERSION,
    readProposalPath,
    collectBeatProvenance,
    collectEvidenceGaps,
    validatePromptIR,
    buildGenerationPromptIR,
    fingerprintPromptIR
  };
});
