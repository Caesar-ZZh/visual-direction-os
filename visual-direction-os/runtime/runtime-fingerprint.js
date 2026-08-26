(function attachRuntimeFingerprint(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function runtimeFingerprintFactory() {
  'use strict';

  const VDOS_PACKAGE_VERSION = 1;
  const VDOS_SCHEMA_VERSION = 1;
  const VDOS_RUNTIME_FINGERPRINT = Object.freeze({
    appVersion:'2.0-m5',
    visualIRVersion:'0.1.0',
    promptCompilerVersion:1,
    evaluationEngineVersion:1,
    comparisonEngineVersion:1,
    memoryPolicyVersion:1
  });

  return {
    VDOS_PACKAGE_VERSION,
    VDOS_SCHEMA_VERSION,
    VDOS_RUNTIME_FINGERPRINT
  };
});
