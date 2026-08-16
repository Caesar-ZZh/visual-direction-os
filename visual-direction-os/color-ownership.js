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
  function initColorOwnership(root, scene) {
    if (!root || !scene) return () => {};
    root.innerHTML = `<div class="color-view-tabs" role="tablist" aria-label="Color ownership views">${Object.entries(views).map(([id,v],i)=>`<button type="button" role="tab" data-color-view="${id}" aria-selected="${i===2?'true':'false'}">${v.label}</button>`).join('')}</div><div class="territory-visual" aria-describedby="territory-copy"><div data-territory="character"><span>Character</span><b></b></div><div data-territory="world"><span>World</span><b></b></div><div data-territory="narrative"><span>Narrative</span><b></b></div></div><p id="territory-copy" class="mechanism-note"></p><p id="territory-status" class="status-line" aria-live="polite"></p>`;
    let activeView = 'ownership';
    root.querySelectorAll('[data-color-view]').forEach(button => button.addEventListener('click', () => {
      activeView = button.dataset.colorView;
      root.querySelectorAll('[data-color-view]').forEach(item => item.setAttribute('aria-selected', String(item === button)));
      render(scene.getSceneState());
    }));
    function render(state) {
      const desc = describeOwnership(state.ownership);
      root.querySelector('#territory-copy').textContent = views[activeView].copy;
      root.querySelector('#territory-status').textContent = desc.conflict ? 'COLOR OWNERSHIP · CONFLICT' : `COLOR OWNERSHIP · ${desc.primaryOwner.toUpperCase()}`;
      desc.ordered.forEach(entry => {
        const row = root.querySelector(`[data-territory="${entry.key}"]`);
        if (!row) return;
        row.dataset.level = entry.value;
        row.querySelector('b').textContent = entry.value.toUpperCase();
      });
    }
    const unsubscribe = scene.subscribeSceneState(render);
    return unsubscribe;
  }
  return { views, describeOwnership, initColorOwnership };
});