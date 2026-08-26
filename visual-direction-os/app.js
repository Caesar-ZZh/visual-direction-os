(() => {
  'use strict';

  const packageRuntimeAssets = [
    'vendor/fflate.min.js',
    'runtime/runtime-fingerprint.js',
    'runtime/schema-migrations.js',
    'runtime/vdos-codec.js',
    'runtime/project-package.js',
    'runtime/project-library.js'
  ];

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
    'runtime/iteration-controller.js',
    'runtime/director-ui.js',
    'runtime/generation-ui-m3.js',
    'runtime/evaluation-ui.js',
    'runtime/director-memory.js',
    'runtime/comparison-engine.js',
    'runtime/memory-engine.js',
    'runtime/m4-controller.js',
    'runtime/lineage-ui.js'
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
    loadStylesheet('runtime/lineage.css');
    loadStylesheet('runtime/project-package.css');

    // M3/M4 are the critical director path. Project-package tooling is optional
    // and must never delay DIRECT / GENERATE / EVALUATE or persistent M4 restore.
    for (const asset of runtimeAssets) await loadScript(asset);

    const status = document.querySelector('.rail-status span:nth-child(2)');
    if (status) status.textContent = 'Director + generation + evaluation online · memory restoring';

    let preferredProjectId = null;
    try { preferredProjectId = localStorage.getItem('vdos-active-project-id'); } catch (_) {}
    const m4Boot = globalThis.VisualDirectionOS?.m4?.boot?.({ projectId:preferredProjectId });
    Promise.resolve(m4Boot).then((m4State) => {
      if (!status) return;
      status.textContent = m4State?.restoreError
        ? 'Director + generation + evaluation online · memory unavailable'
        : 'Director + generation + evaluation + memory online';
    }).catch((error) => {
      console.error('[Visual Direction OS M4] Persistent memory boot failed:', error);
      if (status) status.textContent = 'Director + generation + evaluation online · memory unavailable';
    });

    // Load the portable-project stack after M4 has mounted. This IIFE is
    // deliberately not awaited so package failures/latency cannot take down M3/M4.
    (async () => {
      let packageRuntimeReady = true;
      for (const asset of packageRuntimeAssets) {
        try {
          await loadScript(asset);
        } catch (error) {
          packageRuntimeReady = false;
          console.error('[Visual Direction OS M5] Optional package runtime unavailable:', error);
          break;
        }
      }
      if (packageRuntimeReady) {
        loadScript('runtime/project-package-ui.js').catch((error) => {
          console.error('[Visual Direction OS M5] Project workspace unavailable:', error);
        });
      }
    })().catch((error) => {
      console.error('[Visual Direction OS M5] Project package boot failed:', error);
    });
  }

  bootVisualDirectionOS().catch((error) => {
    console.error('[Visual Direction OS]', error);
    const status = document.querySelector('.rail-status span:nth-child(2)');
    if (status) status.textContent = 'Runtime unavailable';
  });
})();
