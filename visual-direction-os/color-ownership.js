((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSColorOwnership = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';
  const weight = { low:1, medium:2, high:3 };
  const views = {
    base:{ label:'Base Palette', copy:'The stable palette grammar before emotional or ownership pressure is applied.' },
    emotion:{ label:'Emotion Palette', copy:'Temperature and contrast changes justified by emotional state.' },
    ownership:{ label:'Ownership Palette', copy:'Which subject currently has authority to define color behavior.' },
    conflict:{ label:'Conflict Palette', copy:'Where competing owners produce incompatible color instructions.' }
  };

  function describeOwnership(input = {}) {
    const normalized = { character:input.character || 'low', world:input.world || 'low', narrative:input.narrative || 'low' };
    const entries = Object.entries(normalized).map(([key,value]) => ({ key, value, score:weight[value] || 0 })).sort((a,b)=>b.score-a.score);
    const top = entries[0];
    const conflict = entries.filter(entry => entry.score === top.score && entry.score >= 3).length > 1;
    return { ownership:normalized, primaryOwner:conflict ? 'contested' : top.key, conflict, ordered:entries };
  }

  function territoryRows(desc) {
    return desc.ordered.map(entry => `<div data-territory="${entry.key}" data-level="${entry.value}"><span>${entry.key}</span><i aria-hidden="true"></i><b>${entry.value}</b></div>`).join('');
  }

  function renderView(view, state, desc) {
    const temperature = state.variables?.color?.temperature || 'neutral';
    const territory = state.variables?.color?.territory || 'world';
    const narrative = state.narrativeState || 'baseline';
    const contrast = state.variables?.color?.contrast || (narrative === 'rupture' ? 'high' : 'medium');
    if (view === 'base') {
      return `<header class="palette-mode-head"><span>STABLE GRAMMAR</span><h3 class="palette-mode-title">Base Palette</h3><p>${views.base.copy}</p></header>
        <div class="base-palette-strip" aria-label="Base palette with foundation, support, and accent swatches"><i data-swatch="foundation"></i><i data-swatch="support"></i><i data-swatch="accent"></i></div>
        <dl class="palette-readout"><div><dt>Foundation</dt><dd>Near black</dd></div><div><dt>Support</dt><dd>Warm off-white</dd></div><div><dt>Accent</dt><dd>Vermilion</dd></div><div><dt>Current temperature</dt><dd>${temperature}</dd></div></dl>`;
    }
    if (view === 'emotion') {
      return `<header class="palette-mode-head"><span>STATE MODULATION</span><h3 class="palette-mode-title">Emotion Palette</h3><p>${views.emotion.copy}</p></header>
        <div class="temperature-axis" data-temperature="${temperature}" role="img" aria-label="Current emotional color temperature is ${temperature}"><span>COOL</span><i aria-hidden="true"></i><span>NEUTRAL</span><span>WARM</span></div>
        <dl class="palette-readout"><div><dt>Narrative state</dt><dd>${narrative}</dd></div><div><dt>Temperature</dt><dd>${temperature}</dd></div><div><dt>Contrast pressure</dt><dd>${contrast}</dd></div><div><dt>Color territory</dt><dd>${territory}</dd></div></dl>`;
    }
    if (view === 'conflict') {
      const first = desc.ordered[0];
      const second = desc.ordered[1];
      const conflictLabel = desc.conflict ? 'ACTIVE CONFLICT' : 'NO PRIMARY CONFLICT';
      return `<header class="palette-mode-head"><span>COMPETING INSTRUCTIONS</span><h3 class="palette-mode-title">Conflict Palette</h3><p>${views.conflict.copy}</p></header>
        <div class="conflict-field" data-conflict="${desc.conflict ? 'true' : 'false'}"><div><span>${first.key}</span><b>${first.value}</b></div><i aria-hidden="true">VS</i><div><span>${second.key}</span><b>${second.value}</b></div></div>
        <p class="conflict-verdict"><strong>${conflictLabel}</strong><span>${desc.conflict ? 'Two high-authority owners are issuing competing color instructions.' : `${first.key} currently has clearer authority; conflict remains below the release threshold.`}</span></p>`;
    }
    return `<header class="palette-mode-head"><span>CONTROL TERRITORY</span><h3 class="palette-mode-title">Ownership Palette</h3><p>${views.ownership.copy}</p></header>
      <div class="territory-visual" aria-label="Relative color ownership by character, world, and narrative">${territoryRows(desc)}</div>
      <p class="ownership-verdict"><span>COLOR OWNERSHIP</span><strong>${desc.conflict ? 'CONFLICT' : desc.primaryOwner.toUpperCase()}</strong></p>`;
  }

  function initColorOwnership(root, scene) {
    if (!root || !scene) return () => {};
    root.innerHTML = `<div class="color-view-tabs" role="tablist" aria-label="Color analysis views">${Object.entries(views).map(([id,v])=>`<button id="color-tab-${id}" type="button" role="tab" data-color-view="${id}" aria-controls="palette-panel" aria-selected="${id==='ownership'?'true':'false'}">${v.label}</button>`).join('')}</div><section id="palette-panel" class="palette-panel" role="tabpanel" aria-live="polite" data-view="ownership"></section>`;
    let activeView = 'ownership';
    root.querySelectorAll('[data-color-view]').forEach(button => button.addEventListener('click', () => {
      activeView = button.dataset.colorView;
      root.querySelectorAll('[data-color-view]').forEach(item => item.setAttribute('aria-selected', String(item === button)));
      render(scene.getSceneState());
    }));
    function render(state) {
      const desc = describeOwnership(state.ownership);
      const panel = root.querySelector('#palette-panel');
      panel.dataset.view = activeView;
      panel.setAttribute('aria-labelledby', `color-tab-${activeView}`);
      panel.innerHTML = renderView(activeView, state, desc);
    }
    const unsubscribe = scene.subscribeSceneState(render);
    return unsubscribe;
  }
  return { views, describeOwnership, renderView, initColorOwnership };
});