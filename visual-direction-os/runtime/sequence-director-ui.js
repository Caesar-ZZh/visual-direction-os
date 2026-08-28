(function attachSequenceDirectorUI(root, factory) {
  const api=factory(root);
  if(typeof module!=='undefined'&&module.exports) module.exports=api;
  if(root) {
    root.VisualDirectionRuntime=Object.assign(root.VisualDirectionRuntime||{},api);
    if(root.document) Promise.resolve().then(()=>api.mountSequenceDirectorUI(root)).catch((error)=>console.error('[Visual Direction OS M6] Sequence Director UI unavailable:',error));
  }
})(typeof globalThis!=='undefined'?globalThis:this,function sequenceDirectorUiFactory(root){
  'use strict';

  const clone=(value)=>value==null?value:(typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value)));
  const esc=(value)=>String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function statusLabel(status){ return ({current:'Continuity Current',review_required:'⚠ Review Required',source_missing:'! Source Missing',source_unavailable:'! Source Asset Missing',source_out_of_order:'↗ Source Out of Order',not_applicable:'First Shot · No Continuity'})[status]||String(status||''); }
  function approvalLabel(shot){ return shot?.approvedArtifactId?'✓ Approved':'○ Draft'; }
  function orderedShots(state,sequenceId){ return (state?.shots||[]).filter((s)=>s.sequenceId===sequenceId).slice().sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0)||String(a.id).localeCompare(String(b.id))); }
  function previousShots(state,shot){ return orderedShots(state,shot.sequenceId).filter((candidate)=>candidate.order<shot.order); }
  function boardThumbnailId(shot,artifacts=[]){ if(shot?.approvedArtifactId) return shot.approvedArtifactId; return artifacts.filter((a)=>a.shotId===shot?.id).slice().sort((a,b)=>(Number(b.generationIndex)||0)-(Number(a.generationIndex)||0))[0]?.id||null; }

  function renderSequenceBoard({shots=[],activeShotId=null,continuityByShotId={},artifacts=[]}={}){
    return shots.map((shot)=>{
      const thumb=boardThumbnailId(shot,artifacts);
      const status=continuityByShotId[shot.id]||shot.continuityStatus||'';
      return `<button type="button" class="m6-shot-card${shot.id===activeShotId?' is-active':''}" data-shot-id="${esc(shot.id)}"><span class="m6-shot-number">${String(shot.order||0).padStart(2,'0')}</span><span class="m6-shot-thumb" data-thumb-artifact="${esc(thumb||'')}">${thumb?'FRAME':'NO FRAME'}</span><strong>${esc(shot.title||'Untitled Shot')}</strong><small>${esc(approvalLabel(shot))}</small><em data-status="${esc(status)}">${esc(statusLabel(status))}</em></button>`;
    }).join('');
  }

  async function mountSequenceDirectorUI(browserRoot=root){
    const document=browserRoot?.document; if(!document) return null;
    const getM6=()=>browserRoot.VisualDirectionOS?.m6||null;
    const getM4=()=>browserRoot.VisualDirectionOS?.m4||null;
    const output=document.querySelector('#director-output'); if(!output) return null;
    let panel=document.querySelector('#sequence-director');
    if(!panel){
      panel=document.createElement('section'); panel.id='sequence-director'; panel.className='sequence-director'; panel.setAttribute('aria-label','Sequence Director');
      panel.innerHTML=`<header class="sequence-director-head"><div><small>SEQUENCE DIRECTOR / M6</small><h3>Direct the sequence. <em>Keep continuity intentional.</em></h3><p id="m6-sequence-intent">No active sequence.</p></div><div class="m6-view-switch"><button type="button" data-m6-view="board" aria-pressed="true">BOARD</button><button type="button" data-m6-view="director" aria-pressed="false">DIRECTOR</button></div></header><div class="m6-toolbar"><select id="m6-sequence-select" aria-label="Active sequence"></select><button type="button" id="m6-new-sequence">+ Sequence</button><button type="button" id="m6-add-shot">+ Add Shot</button></div><div class="m6-board" id="m6-board"></div><div class="m6-active-context" id="m6-active-context"></div><p class="m6-notice" id="m6-notice" role="status" hidden></p>`;
      output.insertBefore(panel,output.firstChild);
    }
    let m6State=getM6()?.getState?.()||null; let m4State=getM4()?.getState?.()||null; let view='board';
    const notice=(text)=>{const node=document.querySelector('#m6-notice');if(!node)return;node.hidden=!text;node.textContent=text||'';};
    const activeShot=()=>m6State?.shots?.find((s)=>s.id===m6State.activeShotId)||null;
    const activeSequence=()=>m6State?.sequences?.find((s)=>s.id===m6State.activeSequenceId)||null;

    async function hydrateThumbs(){
      const m4=getM4(); if(!m4||!m4State) return;
      for(const node of panel.querySelectorAll('[data-thumb-artifact]')){
        const id=node.dataset.thumbArtifact; if(!id) continue;
        const artifact=m4State.artifacts?.find((a)=>a.id===id); if(!artifact) continue;
        try{const src=await m4.getRenderableImage(id); if(src&&node.isConnected) node.innerHTML=`<img src="${esc(src)}" alt="">`; }catch(_){}
      }
    }

    function renderContext(){
      const node=document.querySelector('#m6-active-context'); if(!node) return;
      const shot=activeShot(); const sequence=activeSequence(); if(!shot){node.innerHTML='<p class="m6-empty">Create a Shot to begin directing.</p>';return;}
      const status=m6State.continuityByShotId?.[shot.id]||'';
      const resolution=getM6()?.resolveContinuity?.(shot.id)||{};
      const earlier=previousShots(m6State,shot);
      const sourceTitle=m6State.shots?.find((s)=>s.id===resolution.sourceShotId)?.title||resolution.sourceShotId||'None';
      const manualOptions=earlier.map((s)=>`<option value="${esc(s.id)}"${shot.continuityMode==='manual'&&shot.continuitySourceShotId===s.id?' selected':''}>${esc(s.title||s.id)}</option>`).join('');
      node.innerHTML=`<div class="m6-context-head"><div><span>ACTIVE SHOT ${String(shot.order||0).padStart(2,'0')}</span><h4>${esc(shot.title||'Untitled Shot')}</h4></div><div><b>${esc(approvalLabel(shot))}</b><em data-status="${esc(status)}">${esc(statusLabel(status))}</em></div></div><label class="m6-intent"><span>SHOT INTENT</span><textarea id="m6-shot-intent">${esc(shot.intent||'')}</textarea></label><div class="m6-continuity"><header><span>CONTINUITY</span><strong>${shot.continuityMode==='auto'?'Auto · Previous Shot':`Manual · ${esc(sourceTitle)}`}</strong></header><p>Current source: ${esc(sourceTitle)}${resolution.sourceArtifactId?` / ${esc(resolution.sourceArtifactId)}`:''}</p><div class="m6-continuity-controls"><button type="button" id="m6-reset-auto">Auto · Previous Shot</button><select id="m6-manual-source"><option value="">Manual source…</option>${manualOptions}</select></div>${status==='source_out_of_order'?'<div class="m6-inline-warning">Continuity Source Out of Order <button type="button" id="m6-keep-manual">Keep Manual Source</button><button type="button" id="m6-reset-previous">Reset to Previous Shot</button></div>':''}</div>${status==='review_required'?'<div class="m6-review"><strong>CONTINUITY REVIEW</strong><p>The upstream Approved Frame changed. Existing generations are preserved.</p><button type="button" id="m6-accept-continuity">Accept Current Continuity</button><button type="button" id="m6-generate-version">Generate New Version</button></div>':''}<div class="m6-shot-actions"><button type="button" id="m6-move-up">↑ Move</button><button type="button" id="m6-move-down">↓ Move</button><button type="button" id="m6-delete-shot" class="is-destructive">Delete Shot</button></div>`;
      node.querySelector('#m6-shot-intent')?.addEventListener('change',(event)=>getM6()?.updateShot?.(shot.id,{intent:event.target.value}));
      node.querySelector('#m6-reset-auto')?.addEventListener('click',()=>getM6()?.setContinuityAuto?.(shot.id));
      node.querySelector('#m6-reset-previous')?.addEventListener('click',()=>getM6()?.setContinuityAuto?.(shot.id));
      node.querySelector('#m6-keep-manual')?.addEventListener('click',()=>notice('Manual continuity source kept. Generation will use it with an out-of-order warning.'));
      node.querySelector('#m6-manual-source')?.addEventListener('change',(event)=>{if(event.target.value)getM6()?.setContinuityManual?.(shot.id,event.target.value);});
      node.querySelector('#m6-accept-continuity')?.addEventListener('click',()=>getM6()?.acceptCurrentContinuity?.(shot.id));
      node.querySelector('#m6-generate-version')?.addEventListener('click',()=>{getM6()?.setActiveShot?.(shot.id);document.querySelector('#generation-console')?.scrollIntoView?.({block:'start'});});
      const reorder=async(delta)=>{const siblings=orderedShots(m6State,shot.sequenceId);const index=siblings.findIndex((s)=>s.id===shot.id);const next=index+delta;if(next<0||next>=siblings.length)return;[siblings[index],siblings[next]]=[siblings[next],siblings[index]];await getM6()?.reorderShots?.(shot.sequenceId,siblings.map((s)=>s.id));notice('Sequence reordered. Auto continuity was recalculated; manual sources were preserved.');};
      node.querySelector('#m6-move-up')?.addEventListener('click',()=>reorder(-1)); node.querySelector('#m6-move-down')?.addEventListener('click',()=>reorder(1));
      node.querySelector('#m6-delete-shot')?.addEventListener('click',async()=>{const impact=getM6()?.getContinuityImpact?.(shot.id);const count=m4State?.activeShotId===shot.id?(m4State.artifacts?.length||0):0;const copy=`Delete ${shot.title||shot.id}? This removes this Shot and ${count} loaded generation(s). Downstream Shots stay. ${impact?.descendants?.length||0} downstream Shot(s) may need continuity review.`;if(browserRoot.confirm?.(copy))await getM6()?.deleteShot?.(shot.id);});
    }

    function render(){
      if(!m6State) return;
      const sequence=activeSequence(); const siblings=sequence?orderedShots(m6State,sequence.id):[];
      const select=document.querySelector('#m6-sequence-select'); if(select){select.innerHTML=(m6State.sequences||[]).map((s)=>`<option value="${esc(s.id)}"${s.id===m6State.activeSequenceId?' selected':''}>${esc(s.title||s.id)}</option>`).join('');}
      const intent=document.querySelector('#m6-sequence-intent'); if(intent) intent.textContent=sequence?.intent||'No sequence intent yet.';
      const board=document.querySelector('#m6-board'); if(board){const visibleArtifacts=m4State?.activeSequenceId===m6State.activeSequenceId?(m4State.artifacts||[]):[];board.innerHTML=renderSequenceBoard({shots:siblings,activeShotId:m6State.activeShotId,continuityByShotId:m6State.continuityByShotId,artifacts:visibleArtifacts});board.hidden=view!=='board';board.querySelectorAll('[data-shot-id]').forEach((button)=>button.addEventListener('click',()=>getM6()?.setActiveShot?.(button.dataset.shotId)));}
      const context=document.querySelector('#m6-active-context'); if(context) context.hidden=view!=='director'; renderContext(); hydrateThumbs();
    }

    panel.querySelectorAll('[data-m6-view]').forEach((button)=>button.addEventListener('click',()=>{view=button.dataset.m6View;panel.querySelectorAll('[data-m6-view]').forEach((b)=>b.setAttribute('aria-pressed',String(b===button)));render();}));
    document.querySelector('#m6-sequence-select')?.addEventListener('change',async(event)=>{const first=orderedShots(m6State,event.target.value)[0];if(first)await getM6()?.setActiveShot?.(first.id);});
    document.querySelector('#m6-new-sequence')?.addEventListener('click',async()=>{const sequence=await getM6()?.createSequence?.({title:`Sequence ${(m6State?.sequences?.length||0)+1}`});if(sequence)await getM6()?.createShot?.({sequenceId:sequence.id,title:'Untitled Shot',intent:''});});
    document.querySelector('#m6-add-shot')?.addEventListener('click',async()=>{const sequence=activeSequence();if(!sequence)return;const shot=await getM6()?.createShot?.({sequenceId:sequence.id,title:'Untitled Shot',intent:''});if(shot)await getM6()?.setActiveShot?.(shot.id);});
    browserRoot.addEventListener('vdos:m6-state',(event)=>{m6State=clone(event.detail?.state||null);render();});
    browserRoot.addEventListener('vdos:m4-state',(event)=>{m4State=clone(event.detail?.state||null);render();});
    render(); return {render};
  }

  return {statusLabel,approvalLabel,boardThumbnailId,renderSequenceBoard,mountSequenceDirectorUI};
});