(function attachM6ApprovedFrameUI(root){
  'use strict';
  if(!root||!root.document)return;
  let m6State=root.VisualDirectionOS?.m6?.getState?.()||null;
  let m4State=root.VisualDirectionOS?.m4?.getState?.()||null;
  const esc=(value)=>String(value??'').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function render(){
    const host=root.document.querySelector('#m6-active-context');
    if(!host||!m6State||!m4State||m6State.activeShotId!==m4State.activeShotId)return;
    host.querySelector('.m6-approved-picker')?.remove();
    const shot=m6State.shots?.find((row)=>row.id===m6State.activeShotId);if(!shot)return;
    const artifacts=(m4State.artifacts||[]).slice().sort((a,b)=>(Number(b.generationIndex)||0)-(Number(a.generationIndex)||0));
    const section=root.document.createElement('section');section.className='m6-approved-picker';
    section.innerHTML=`<header><div><span>APPROVED FRAME</span><strong>${shot.approvedArtifactId?`★ ${esc(shot.approvedArtifactId)}`:'No Approved Frame'}</strong></div>${shot.approvedArtifactId?'<button type="button" data-clear-approved>Clear Approval</button>':''}</header><div class="m6-approved-candidates">${artifacts.length?artifacts.map((artifact)=>`<button type="button" data-approve-artifact="${esc(artifact.id)}" class="${artifact.id===shot.approvedArtifactId?'is-approved':''}"><b>${artifact.id===shot.approvedArtifactId?'★ Approved Frame':'Set as Approved Frame'}</b><small>GEN ${String(artifact.generationIndex||'?').padStart(2,'0')} · ${esc(artifact.id)}</small></button>`).join(''):'<p>No generations in this Shot yet.</p>'}</div>`;
    section.querySelector('[data-clear-approved]')?.addEventListener('click',()=>root.VisualDirectionOS?.m6?.clearApprovedFrame?.(shot.id));
    section.querySelectorAll('[data-approve-artifact]').forEach((button)=>button.addEventListener('click',()=>root.VisualDirectionOS?.m6?.setApprovedFrame?.(shot.id,button.dataset.approveArtifact)));
    host.insertBefore(section,host.querySelector('.m6-shot-actions')||null);
  }
  root.addEventListener('vdos:m6-state',(event)=>{m6State=event.detail?.state||null;queueMicrotask(render);});
  root.addEventListener('vdos:m4-state',(event)=>{m4State=event.detail?.state||null;queueMicrotask(render);});
  queueMicrotask(render);
})(typeof globalThis!=='undefined'?globalThis:window);