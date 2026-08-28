(function attachM6BrowserController(root){
  'use strict';
  if(!root||!root.document)return;
  const runtime=root.VisualDirectionRuntime||{};
  const m4=root.VisualDirectionOS?.m4;
  if(typeof runtime.createM6Controller!=='function'||typeof runtime.createDirectorMemory!=='function'||typeof runtime.createIndexedDbStore!=='function'||!m4){
    console.error('[Visual Direction OS M6] Browser controller dependencies unavailable.');
    return;
  }
  try{
    const memory=runtime.createDirectorMemory({store:runtime.createIndexedDbStore(root)});
    const controller=runtime.createM6Controller({
      memory,
      m4,
      now:()=>new Date().toISOString(),
      onState:(state)=>root.dispatchEvent(new CustomEvent('vdos:m6-state',{detail:{state}}))
    });
    root.VisualDirectionOS=Object.assign(root.VisualDirectionOS||{},{m6:controller});
  }catch(error){
    console.error('[Visual Direction OS M6] Browser controller failed to initialize:',error);
  }
})(typeof globalThis!=='undefined'?globalThis:window);