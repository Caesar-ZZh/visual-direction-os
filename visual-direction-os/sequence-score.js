((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSSequenceScore = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';
  const beats = [
    { id:'baseline', t:0, label:'Baseline', agency:'world', ownership:{character:'low',world:'high',narrative:'medium'}, tracks:{color:.28,space:.22,camera:.2,line:.34,texture:.18,agency:.12} },
    { id:'contact', t:.17, label:'Contact', agency:'contested', ownership:{character:'medium',world:'medium',narrative:'high'}, tracks:{color:.42,space:.35,camera:.32,line:.5,texture:.28,agency:.24} },
    { id:'pressure', t:.34, label:'Pressure', agency:'world', ownership:{character:'medium',world:'high',narrative:'high'}, tracks:{color:.68,space:.66,camera:.58,line:.72,texture:.54,agency:.22} },
    { id:'crisis', t:.5, label:'Crisis', agency:'contested', ownership:{character:'low',world:'low',narrative:'high'}, tracks:{color:.76,space:.84,camera:.88,line:.9,texture:.82,agency:.14} },
    { id:'silence', t:.66, label:'Silence', agency:'in-transfer', ownership:{character:'medium',world:'low',narrative:'high'}, tracks:{color:.16,space:.2,camera:.14,line:.18,texture:.12,agency:.42} },
    { id:'ownership', t:.82, label:'Ownership Shift', agency:'character', ownership:{character:'high',world:'low',narrative:'medium'}, tracks:{color:.62,space:.54,camera:.66,line:.48,texture:.44,agency:.94} },
    { id:'rewrite', t:1, label:'Rewrite', agency:'shared', ownership:{character:'high',world:'medium',narrative:'medium'}, tracks:{color:.58,space:.7,camera:.6,line:.62,texture:.56,agency:.86} }
  ];
  const clamp01 = n => Math.max(0, Math.min(1, Number(n) || 0));
  const clone = v => JSON.parse(JSON.stringify(v));
  const level = v => v < .34 ? 'low' : v < .67 ? 'medium' : 'high';
  function sampleSequence(playhead = 0) {
    const t = clamp01(playhead);
    let current = beats[0];
    for (const beat of beats) if (Math.abs(beat.t - t) < Math.abs(current.t - t)) current = beat;
    return { playhead:t, currentBeat:clone(current), tracks:clone(current.tracks), ownership:clone(current.ownership), agency:current.agency, qualitative:Object.fromEntries(Object.entries(current.tracks).map(([k,v]) => [k,level(v)])) };
  }
  function initSequenceScore(root, scene) {
    if (!root || !scene) return () => {};
    root.innerHTML = `<div class="score-toolbar"><label for="sequence-playhead">Sequence playhead</label><input id="sequence-playhead" type="range" min="0" max="100" value="0" step="1"><output id="sequence-beat">Baseline</output></div><div class="score-tracks" role="img" aria-describedby="sequence-text-state">${['color','space','camera','line','texture','agency'].map(name => `<div class="score-track"><span>${name}</span><div class="score-track-line"><i data-score-fill="${name}"></i></div><b data-score-value="${name}">low</b></div>`).join('')}</div><div class="ownership-markers" aria-label="Ownership shift markers">${beats.filter(b=>b.id==='ownership').map(b=>`<button type="button" data-sequence-marker="${b.t}" style="--marker:${b.t*100}%">Ownership Shift</button>`).join('')}</div><p id="sequence-text-state" class="mechanism-note" aria-live="polite"></p>`;
    const input = root.querySelector('#sequence-playhead');
    const render = (t, source) => {
      const sample = sampleSequence(t);
      root.querySelector('#sequence-beat').textContent = sample.currentBeat.label;
      Object.entries(sample.tracks).forEach(([name,value]) => {
        const fill = root.querySelector(`[data-score-fill="${name}"]`); if (fill) fill.style.width = `${Math.round(value*100)}%`;
        const text = root.querySelector(`[data-score-value="${name}"]`); if (text) text.textContent = sample.qualitative[name];
      });
      root.querySelector('#sequence-text-state').textContent = `${sample.currentBeat.label}: ${Object.entries(sample.qualitative).map(([k,v])=>`${k} ${v}`).join(' · ')} · agency ${sample.agency}`;
      scene.updateSceneState({ playhead:sample.playhead, narrativeState:sample.currentBeat.id, agency:sample.agency, ownership:sample.ownership, variables:{ color:{ saturation:sample.qualitative.color }, space:{ compression:sample.qualitative.space }, camera:{ stability:sample.qualitative.camera }, line:{ density:sample.qualitative.line }, texture:{ noise:sample.qualitative.texture }, rhythm:{ motionEnergy:sample.qualitative.agency } } }, source);
    };
    input.addEventListener('input', () => render(Number(input.value)/100, 'sequence-score:playhead'));
    root.querySelectorAll('[data-sequence-marker]').forEach(button => button.addEventListener('click', () => { input.value = String(Number(button.dataset.sequenceMarker)*100); render(Number(button.dataset.sequenceMarker), 'sequence-score:marker'); }));
    render(0, 'sequence-score:init');
    return () => {};
  }
  return { beats:clone(beats), sampleSequence, initSequenceScore };
});