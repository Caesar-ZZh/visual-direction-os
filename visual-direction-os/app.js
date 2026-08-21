(() => {
  'use strict';

  const runtimeAssets = [
    'runtime/product-shell.js',
    'runtime/visual-ir.js',
    'runtime/grammar-registry.js',
    'runtime/narrative-interpreter.js',
    'runtime/decision-engine.js',
    'runtime/prompt-compiler.js',
    'runtime/director-ui.js'
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.append(script);
    });
  }

  async function bootVisualDirectionOS() {
    if (!document.querySelector('link[href="runtime/runtime.css"]')) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = 'runtime/runtime.css';
      document.head.append(stylesheet);
    }
    for (const asset of runtimeAssets) await loadScript(asset);
    const status = document.querySelector('.rail-status span:nth-child(2)');
    if (status) status.textContent = 'Director runtime online';
  }

  bootVisualDirectionOS().catch((error) => {
    console.error('[Visual Direction OS]', error);
    const status = document.querySelector('.rail-status span:nth-child(2)');
    if (status) status.textContent = 'Runtime unavailable';
  });
})();
