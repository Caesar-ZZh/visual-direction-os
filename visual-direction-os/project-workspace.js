((root, factory) => {
  const projectArc = typeof module === 'object' && module.exports ? require('./project-arc.js') : root?.VDOSProjectArc;
  const continuity = typeof module === 'object' && module.exports ? require('./project-continuity.js') : root?.VDOSProjectContinuity;
  const intelligence = typeof module === 'object' && module.exports ? require('./project-intelligence.js') : root?.VDOSProjectIntelligence;
  const intelligenceInspector = typeof module === 'object' && module.exports ? require('./project-intelligence-inspector.js') : root?.VDOSProjectIntelligenceInspector;
  const api = factory(projectArc, continuity, intelligence, intelligenceInspector, root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectWorkspace = api;
})(typeof window !== 'undefined' ? window : globalThis, (projectArc, continuity, intelligence, intelligenceInspector, root) => {
  'use strict';

  if (!projectArc || !continuity || !intelligence || !intelligenceInspector) throw new Error('Project Arc, Continuity, Project Intelligence and Project Intelligence Inspector are required before project-workspace.js');
  const { deriveProjectArc } = projectArc;
  const { deriveContinuity } = continuity;
  const { deriveProjectIntelligence } = intelligence;
  const { renderProjectIntelligence } = intelligenceInspector;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const sceneNumber = index => String(index + 1).padStart(2, '0');
  const agencyLabel = values => Array.isArray(values) ? values.map(v => String(v).toUpperCase()).join(' → ') : '—';

  const ARC_ROWS = [
    ['narrativeRole','NARRATIVE ROLE','narrativeRole'],
    ['agency','AGENCY','visualAgency'],
    ['camera','CAMERA AUTHORITY','cameraAuthority'],
    ['color','COLOR TERRITORY','colorTerritory'],
    ['space','SPATIAL PRESSURE','spatialPressure'],
    ['density','GRAPHIC DENSITY','graphicDensity'],
    ['rhythm','RHYTHMIC ENERGY','rhythmicEnergy']
  ];

  function projectProgress(project) {
    const ids = project?.sceneOrder || [];
    const directed = ids.filter(id => project.scenes?.[id]?.status?.visual === 'directed').length;
    return { total:ids.length, directed, pending:Math.max(0, ids.length - directed) };
  }

  function renderSceneRail(project) {
    const order = project?.sceneOrder || [];
    if (!order.length) return `<div class="project-empty"><strong>NO SCENES YET</strong><span>Build the narrative structure before visual direction begins</span></div>`;
    return `<div class="project-scene-track">${order.map((id,index) => {
      const scene = project.scenes[id];
      const active = project.activeSceneId === id;
      const agency = agencyLabel(scene?.narrativeRole?.agencyTransition);
      return `<button type="button" class="project-scene-node" data-action="open-scene" data-scene-id="${esc(id)}" aria-current="${active ? 'true' : 'false'}"><span>${sceneNumber(index)}</span><strong>${esc(scene?.title || id)}</strong><small>${esc(String(scene?.narrativeRole?.role || '').toUpperCase())} · ${esc(agency)}</small></button>${index < order.length - 1 ? '<i class="project-scene-arrow" aria-hidden="true">→</i>' : ''}`;
    }).join('')}</div>`;
  }

  function renderArc(project, arcState) {
    const scenes = arcState?.scenes || [];
    if (!scenes.length) return `<div class="project-arc-empty">Narrative structure has not been confirmed yet</div>`;
    const columns = scenes.map((scene,index) => `<button type="button" class="project-arc-scene-head" data-action="open-scene" data-scene-id="${esc(scene.id)}"><span>${sceneNumber(index)}</span><strong>${esc(scene.title)}</strong></button>`).join('');
    const rows = ARC_ROWS.map(([rowId,label,key]) => `<div class="project-arc-row" data-project-arc-row="${rowId}"><strong>${label}</strong>${scenes.map(scene => {
      const value = scene[key] || '—';
      return `<button type="button" data-action="open-scene" data-scene-id="${esc(scene.id)}">${esc(value)}</button>`;
    }).join('')}</div>`).join('');
    return `<div class="project-arc-scroll"><div class="project-arc-matrix" style="--project-scenes:${Math.max(1, scenes.length)}"><div class="project-arc-head"><span>PROJECT SYSTEM</span>${columns}</div>${rows}</div></div>`;
  }

  function renderContinuity(continuityState) {
    const findings = continuityState?.findings || [];
    if (!findings.length) return `<div class="project-continuity-empty">Continuity will appear as directed Scenes accumulate</div>`;
    return `<div class="project-findings">${findings.map(item => `<article class="project-finding" data-status="${esc(item.status)}"><header><span>${esc(item.status)}</span><strong>${esc(item.boundary || item.sceneIds?.[0] || 'PROJECT')}</strong></header><h3>${esc(item.title)}</h3><p>${esc(item.detail)}</p><div>${(item.sceneIds || []).map(id => `<button type="button" data-action="open-scene" data-scene-id="${esc(id)}">OPEN ${esc(id.toUpperCase())}</button>`).join('')}</div></article>`).join('')}</div>`;
  }

  function renderProjectWorkspace(project, arcState = deriveProjectArc(project || {}), continuityState = deriveContinuity(project || {}), intelligenceState = deriveProjectIntelligence(project || {})) {
    const safeProject = project || { title:'Untitled Project', projectIntent:'', sceneOrder:[], scenes:{}, activeSceneId:null };
    const progress = projectProgress(safeProject);
    return `<section class="project-workspace-panel" aria-labelledby="project-arc-title">
      <header class="project-header">
        <div><p class="project-kicker">PROJECT CONTEXT</p><h2>${esc(safeProject.title || 'Untitled Project')}</h2><p>${esc(safeProject.projectIntent || 'Build the narrative structure, then direct each Scene as part of one visual system')}</p></div>
        <div class="project-progress" aria-label="Project progress"><span>${String(progress.total).padStart(2, '0')} SCENES</span><strong>${progress.directed} DIRECTED</strong><small>${progress.pending} PENDING</small></div>
        <div class="project-header-actions"><button type="button" data-action="edit-project">EDIT PROJECT</button><button type="button" data-action="show-breakdown">BREAK DOWN STORY</button><button type="button" data-action="add-manual-scene">+ ADD SCENE</button></div>
      </header>
      <section class="project-structure" aria-labelledby="project-structure-title"><div class="project-section-head"><p>SCENE STRUCTURE</p><h3 id="project-structure-title">Narrative progression</h3></div>${renderSceneRail(safeProject)}</section>
      <section class="project-arc" aria-labelledby="project-arc-title"><div class="project-section-head"><p>PROJECT SCALE</p><h2 id="project-arc-title">Project Arc</h2><span>${progress.directed} / ${progress.total} DIRECTED</span></div>${renderArc(safeProject, arcState)}</section>
      <section class="project-continuity" aria-labelledby="project-continuity-title"><div class="project-section-head"><p>CAUSE → RESPONSE</p><h2 id="project-continuity-title">Cross-Scene Continuity</h2><span>${esc(continuityState?.status || 'UNRESOLVED')}</span></div>${renderContinuity(continuityState)}</section>
      ${renderProjectIntelligence(intelligenceState)}
    </section>`;
  }

  function renderProjectEditor(project, errorMessage = '') {
    const safeProject = project || { title:'Untitled Project', projectIntent:'' };
    return `<section class="project-breakdown project-meta-editor" aria-labelledby="project-editor-title">
      <header><p>PROJECT / METADATA</p><h2 id="project-editor-title">EDIT PROJECT</h2><span>PROJECT ONLY · SCENE STATE UNCHANGED</span></header>
      <label>PROJECT TITLE<input data-project-meta-field="title" maxlength="120" value="${esc(safeProject.title || '')}"></label>
      <label>DIRECTOR INTENT <small>OPTIONAL</small><textarea data-project-meta-field="projectIntent" maxlength="1000">${esc(safeProject.projectIntent || '')}</textarea></label>
      <div class="project-breakdown-actions"><button type="button" data-action="cancel-project-edit">CANCEL</button><button type="button" data-action="save-project-edit">SAVE PROJECT</button></div>
      <p class="project-request-status" role="status">${esc(errorMessage)}</p>
    </section>`;
  }

  function renderBreakdownInput(project, draft) {
    return `<section class="project-breakdown" aria-labelledby="project-breakdown-title"><header><p>PROJECT / STRUCTURE PROPOSAL</p><h2 id="project-breakdown-title">Break down story</h2><span>SCENE STRUCTURE NOT YET MUTATED</span></header><label>PROJECT STORY<textarea data-project-field="sourceNarrative" maxlength="12000">${esc(draft?.sourceNarrative || project?.sourceNarrative || '')}</textarea></label><label>DIRECTOR INTENT <small>OPTIONAL</small><textarea data-project-field="directorIntent" maxlength="1000">${esc(draft?.directorIntent || project?.projectIntent || '')}</textarea></label><div class="project-breakdown-actions"><button type="button" data-action="cancel-breakdown">BACK TO PROJECT</button><button type="button" data-action="start-breakdown">BREAK DOWN STORY</button></div><p class="project-request-status" role="status">${esc(draft?.request?.status === 'error' ? draft.request.error?.message || 'Project Breakdown failed' : draft?.request?.status === 'loading' ? 'READING PROJECT STRUCTURE…' : '')}</p></section>`;
  }

  function renderSceneProposal(scene, index, count) {
    const edits = scene.directorEdits || {};
    const field = (label,key,value) => `<label>${label}${edits[key] ? '<small>DIRECTOR EDIT</small>' : ''}<textarea data-proposal-field="${key}" data-scene-id="${esc(scene.id)}">${esc(Array.isArray(value) ? value.join(' → ') : value ?? '')}</textarea></label>`;
    return `<article class="project-proposal-scene" data-proposal-scene-id="${esc(scene.id)}"><header><span>${sceneNumber(index)}</span><div><strong>${esc(scene.title)}</strong><small>${esc(String(scene.role).toUpperCase())}</small></div><div class="project-proposal-order"><button type="button" data-action="move-left" data-scene-id="${esc(scene.id)}" ${index === 0 ? 'disabled' : ''} aria-label="Move ${esc(scene.title)} earlier">←</button><button type="button" data-action="move-right" data-scene-id="${esc(scene.id)}" ${index === count - 1 ? 'disabled' : ''} aria-label="Move ${esc(scene.title)} later">→</button></div></header>${field('TITLE','title',scene.title)}<label>ROLE<select data-proposal-field="role" data-scene-id="${esc(scene.id)}">${['setup','development','pressure','recognition','escalation','rupture','reversal','release','resolution','transition'].map(role => `<option value="${role}" ${role === scene.role ? 'selected' : ''}>${role.toUpperCase()}</option>`).join('')}</select></label>${field('NARRATIVE FUNCTION','narrativeFunction',scene.narrativeFunction)}${field('STARTING STATE','startingState',scene.startingState)}${field('ENDING STATE','endingState',scene.endingState)}${field('TURNING POINT','turningPoint',scene.turningPoint)}${field('AGENCY TRANSITION','agencyTransition',scene.agencyTransition)}${field('RELATION TO PREVIOUS','relationToPrevious',scene.relationToPrevious || '')}<details><summary>BREAK BASIS</summary><p>${esc(scene.breakBasis)}</p><p>${esc(scene.sourceBasis)}</p></details><footer><button type="button" data-action="split-scene" data-scene-id="${esc(scene.id)}">SPLIT</button><button type="button" data-action="merge-next" data-scene-id="${esc(scene.id)}" ${index === count - 1 ? 'disabled' : ''}>MERGE WITH NEXT</button><button type="button" data-action="remove-scene" data-scene-id="${esc(scene.id)}" ${count <= 1 ? 'disabled' : ''}>REMOVE</button></footer></article>`;
  }

  function renderBreakdownProposal(draft) {
    const reading = draft?.projectReading || {};
    const scenes = draft?.proposedScenes || [];
    return `<section class="project-breakdown project-breakdown-proposal" aria-labelledby="project-proposal-title"><header><p>PROPOSAL</p><h2 id="project-proposal-title">PROJECT READING</h2><span>SCENE STRUCTURE NOT YET MUTATED</span></header><div class="project-reading"><div><span>NARRATIVE PROBLEM</span><strong>${esc(reading.narrativeProblem || '')}</strong></div><div><span>CORE CONFLICT</span><strong>${esc(reading.coreConflict || '')}</strong></div><div><span>STARTING STATE</span><strong>${esc(reading.startingState || '')}</strong></div><div><span>ENDING STATE</span><strong>${esc(reading.endingState || '')}</strong></div><div><span>AGENCY ARC</span><strong>${esc(agencyLabel(reading.agencyArc || []))}</strong></div></div><div class="project-section-head"><p>DIRECTOR REVIEW</p><h2>PROPOSED SCENE STRUCTURE</h2><span>${scenes.length} SCENES${draft?.structureNeedsReview ? ' · NEEDS REVIEW' : ''}</span></div><div class="project-proposal-list">${scenes.map((scene,index) => renderSceneProposal(scene,index,scenes.length)).join('')}</div><div class="project-breakdown-actions"><button type="button" data-action="cancel-breakdown">BACK TO PROJECT</button><button type="button" data-action="add-proposal-scene">+ ADD SCENE</button><button type="button" data-action="confirm-structure">CONFIRM SCENE STRUCTURE</button></div></section>`;
  }

  function defaultManualProposal(index) {
    return {
      id:`proposal-manual-${Date.now()}-${index}`,
      title:`NEW SCENE ${sceneNumber(index)}`,
      role:'transition',
      narrativeFunction:'Define the narrative responsibility of this Scene.',
      startingState:'Describe the starting narrative state.',
      endingState:'Describe the ending narrative state.',
      turningPoint:'Describe the material state change.',
      agencyTransition:['world','contested'],
      relationToPrevious:index > 1 ? 'Describe how the previous Scene becomes this Scene.' : null,
      sourceBasis:'Added manually by the Director.',
      breakBasis:'Director-defined Scene boundary.'
    };
  }

  function createSplitChildren(scene) {
    const base = Date.now();
    const transition = Array.isArray(scene.agencyTransition) ? scene.agencyTransition : ['world','contested'];
    const startAgency = transition[0] || 'world';
    const endAgency = transition[transition.length - 1] || 'contested';
    const midpoint = transition.length > 2 ? transition[Math.floor(transition.length / 2)] : (startAgency === endAgency ? startAgency : 'contested');
    return [
      { ...scene, id:`${scene.id}-a-${base}`, title:`${scene.title} / A`, endingState:scene.turningPoint, agencyTransition:[startAgency,midpoint], breakBasis:`First half of Director split: ${scene.breakBasis}` },
      { ...scene, id:`${scene.id}-b-${base}`, title:`${scene.title} / B`, role:scene.role === 'setup' ? 'development' : scene.role, startingState:scene.turningPoint, agencyTransition:[midpoint,endAgency], relationToPrevious:`Director split from ${scene.title}.`, breakBasis:`Second half of Director split: ${scene.breakBasis}` }
    ];
  }

  function createMergedScene(first, second) {
    const firstAgency = first.agencyTransition?.[0] || 'world';
    const secondAgency = second.agencyTransition?.[second.agencyTransition.length - 1] || 'contested';
    return {
      id:`proposal-merged-${Date.now()}`,
      title:`${first.title} / ${second.title}`,
      role:second.role,
      narrativeFunction:`${first.narrativeFunction} ${second.narrativeFunction}`,
      startingState:first.startingState,
      endingState:second.endingState,
      turningPoint:second.turningPoint || first.turningPoint,
      agencyTransition:[firstAgency,secondAgency],
      relationToPrevious:first.relationToPrevious,
      sourceBasis:`${first.sourceBasis} ${second.sourceBasis}`,
      breakBasis:'Director merged two adjacent Scene responsibilities into one narrative unit.'
    };
  }

  function initProjectWorkspace(rootElement, options = {}) {
    if (!rootElement) throw new Error('Project Workspace root is required.');
    const { projectStore, breakdownState, projectRuntime = null, apiClient = null } = options;
    if (!projectStore || !breakdownState) throw new Error('Project Workspace requires Project Store and Breakdown state.');
    let view = 'project';
    let controller = null;
    let projectEditError = '';

    function render() {
      const project = projectStore.getProject();
      const draft = breakdownState.getState();
      if (view === 'breakdown') {
        rootElement.innerHTML = draft.status === 'proposal' ? renderBreakdownProposal(draft) : renderBreakdownInput(project, draft);
      } else if (view === 'edit') {
        rootElement.innerHTML = renderProjectEditor(project, projectEditError);
      } else {
        rootElement.innerHTML = renderProjectWorkspace(project, deriveProjectArc(project), deriveContinuity(project), deriveProjectIntelligence(project));
      }
      return rootElement.innerHTML;
    }

    async function startBreakdown() {
      const source = rootElement.querySelector('[data-project-field="sourceNarrative"]')?.value || '';
      const intent = rootElement.querySelector('[data-project-field="directorIntent"]')?.value || '';
      projectStore.updateProjectMetadata({ sourceNarrative:source, projectIntent:intent });
      breakdownState.setInput(source, intent);
      const token = breakdownState.beginRequest();
      render();
      try {
        if (!apiClient || typeof apiClient.breakdown !== 'function') throw Object.assign(new Error('Project Breakdown AI service is not configured.'), { code:'NOT_CONFIGURED' });
        const payload = await apiClient.breakdown({ sourceNarrative:source, directorIntent:intent }, controller?.signal);
        breakdownState.acceptResponse(token, payload);
      } catch (error) {
        if (error?.name !== 'AbortError') breakdownState.failRequest(token, { code:error?.code || 'UNKNOWN', message:error?.message || 'Project Breakdown failed' });
      }
      render();
    }

    function reorder(sceneId, delta) {
      const draft = breakdownState.getState();
      const ids = draft.proposedScenes.map(scene => scene.id);
      const index = ids.indexOf(sceneId);
      const target = index + delta;
      if (index < 0 || target < 0 || target >= ids.length) return;
      [ids[index],ids[target]] = [ids[target],ids[index]];
      breakdownState.reorderScenes(ids);
    }

    rootElement.addEventListener('change', event => {
      const field = event.target?.dataset?.proposalField;
      const sceneId = event.target?.dataset?.sceneId;
      if (!field || !sceneId) return;
      let value = event.target.value;
      if (field === 'agencyTransition') value = value.split(/\s*(?:→|->|,)\s*/).filter(Boolean).map(item => item.toLowerCase());
      if (field === 'relationToPrevious' && !value.trim()) value = null;
      breakdownState.editSceneField(sceneId, field, value);
      render();
    });

    rootElement.addEventListener('click', async event => {
      const button = event.target.closest?.('[data-action]');
      if (!button || button.disabled) return;
      const action = button.dataset.action;
      const sceneId = button.dataset.sceneId;
      if (action === 'edit-project') { projectEditError = ''; view = 'edit'; render(); return; }
      if (action === 'cancel-project-edit') { projectEditError = ''; view = 'project'; render(); return; }
      if (action === 'save-project-edit') {
        const title = rootElement.querySelector('[data-project-meta-field="title"]')?.value || '';
        const projectIntent = rootElement.querySelector('[data-project-meta-field="projectIntent"]')?.value || '';
        try {
          projectStore.updateProjectMetadata({ title, projectIntent });
          projectEditError = '';
          view = 'project';
        } catch (error) {
          projectEditError = error?.message || 'Project metadata could not be saved.';
        }
        render(); return;
      }
      if (action === 'show-breakdown') { view = 'breakdown'; render(); return; }
      if (action === 'cancel-breakdown') { if (controller) controller.abort(); view = 'project'; render(); return; }
      if (action === 'start-breakdown') { if (controller) controller.abort(); controller = typeof AbortController !== 'undefined' ? new AbortController() : null; await startBreakdown(); return; }
      if (action === 'open-scene') {
        if (projectRuntime && sceneId) await projectRuntime.switchScene(sceneId);
        if (root?.dispatchEvent && typeof root.CustomEvent === 'function') root.dispatchEvent(new root.CustomEvent('vdos:project-scene-open', { detail:{ sceneId } }));
        render(); return;
      }
      if (action === 'add-manual-scene') {
        const project = projectStore.getProject();
        if (project.sceneOrder.length === 0) {
          const proposal = defaultManualProposal(1);
          breakdownState.setInput(project.sourceNarrative || 'Director-defined Project structure', project.projectIntent || '');
          const token = breakdownState.beginRequest();
          breakdownState.acceptResponse(token, { projectReading:{ narrativeProblem:'Director-defined structure.',coreConflict:'To be defined by the Director.',startingState:'Project opening.',endingState:'Project ending.',agencyArc:['world','contested'] }, scenes:[proposal] });
          view = 'breakdown'; render(); return;
        }
        projectStore.addScene(defaultManualProposal(project.sceneOrder.length + 1));
        render(); return;
      }
      if (view !== 'breakdown') return;
      const draft = breakdownState.getState();
      const scenes = draft.proposedScenes;
      const index = scenes.findIndex(scene => scene.id === sceneId);
      if (action === 'move-left') reorder(sceneId,-1);
      else if (action === 'move-right') reorder(sceneId,1);
      else if (action === 'remove-scene') breakdownState.removeScene(sceneId);
      else if (action === 'split-scene' && index >= 0) breakdownState.splitScene(sceneId, createSplitChildren(scenes[index]));
      else if (action === 'merge-next' && index >= 0 && index < scenes.length - 1) breakdownState.mergeScenes(sceneId, scenes[index + 1].id, createMergedScene(scenes[index], scenes[index + 1]));
      else if (action === 'add-proposal-scene') breakdownState.addScene(defaultManualProposal(scenes.length + 1));
      else if (action === 'confirm-structure') { projectStore.confirmBreakdown(draft); view = 'project'; }
      render();
    });

    const unsubscribeProject = projectStore.subscribe(() => { if (view === 'project') render(); });
    const unsubscribeDraft = breakdownState.subscribe(() => { if (view === 'breakdown') render(); });
    render();
    return {
      render,
      showProject(){ projectEditError = ''; view = 'project'; return render(); },
      showBreakdown(){ projectEditError = ''; view = 'breakdown'; return render(); },
      destroy(){ if (controller) controller.abort(); unsubscribeProject(); unsubscribeDraft(); }
    };
  }

  return { renderProjectWorkspace, renderProjectEditor, renderBreakdownInput, renderBreakdownProposal, initProjectWorkspace };
});