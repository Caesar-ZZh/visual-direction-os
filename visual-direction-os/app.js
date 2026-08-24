(() => {
  'use strict';

  const runtimeAssets = [
    'runtime/product-shell.js',
    'runtime/visual-ir.js',
    'runtime/grammar-registry.js',
    'runtime/narrative-interpreter.js',
    'runtime/decision-engine.js',
    'runtime/prompt-compiler.js',
    'runtime/agnes-adapter.js',
    'runtime/generation-client.js',
    'runtime/image-measurements.js',
    'runtime/evaluation-engine.js',
    'runtime/director-ui.js',
    'runtime/generation-ui-m3.js',
    'runtime/evaluation-ui.js'
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

  function loadStylesheet(href) {
    if (document.querySelector(`link[href="${href}"]`)) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = href;
    document.head.append(stylesheet);
  }

  async function bootVisualDirectionOS() {
    loadStylesheet('runtime/runtime.css');
    loadStylesheet('runtime/generation.css');
    loadStylesheet('runtime/evaluation.css');
    loadStylesheet('runtime/evaluation-metrics.css');
    for (const asset of runtimeAssets) await loadScript(asset);
    const status = document.querySelector('.rail-status span:nth-child(2)');
    if (status) status.textContent = 'Director + generation + evaluation online';
  }

  bootVisualDirectionOS().catch((error) => {
    console.error('[Visual Direction OS]', error);
    const status = document.querySelector('.rail-status span:nth-child(2)');
    if (status) status.textContent = 'Runtime unavailable';
  });
})();
