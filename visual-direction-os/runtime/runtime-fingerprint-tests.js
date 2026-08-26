const assert = require('node:assert/strict');
const {
  VDOS_PACKAGE_VERSION,
  VDOS_SCHEMA_VERSION,
  VDOS_RUNTIME_FINGERPRINT
} = require('./runtime-fingerprint.js');

assert.equal(VDOS_PACKAGE_VERSION, 1);
assert.equal(VDOS_SCHEMA_VERSION, 1);
assert.equal(typeof VDOS_RUNTIME_FINGERPRINT.appVersion, 'string');
assert.ok(VDOS_RUNTIME_FINGERPRINT.appVersion.trim());
for (const key of [
  'visualIRVersion',
  'promptCompilerVersion',
  'evaluationEngineVersion',
  'comparisonEngineVersion',
  'memoryPolicyVersion'
]) {
  assert.ok(Object.prototype.hasOwnProperty.call(VDOS_RUNTIME_FINGERPRINT, key), `missing ${key}`);
}
assert.ok(Object.isFrozen(VDOS_RUNTIME_FINGERPRINT), 'runtime fingerprint should be immutable');

console.log('runtime fingerprint tests passed');
