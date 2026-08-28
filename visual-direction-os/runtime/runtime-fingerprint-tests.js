const assert = require('node:assert/strict');
const { VDOS_PACKAGE_VERSION, VDOS_SCHEMA_VERSION, VDOS_RUNTIME_FINGERPRINT } = require('./runtime-fingerprint.js');

assert.equal(VDOS_PACKAGE_VERSION,1);
assert.equal(VDOS_SCHEMA_VERSION,2);
assert.equal(VDOS_RUNTIME_FINGERPRINT.appVersion,'2.1-m6');
assert.equal(VDOS_RUNTIME_FINGERPRINT.sequenceDirectorVersion,1);
assert.equal(VDOS_RUNTIME_FINGERPRINT.continuityEngineVersion,1);
for(const key of ['visualIRVersion','promptCompilerVersion','evaluationEngineVersion','comparisonEngineVersion','memoryPolicyVersion','sequenceDirectorVersion','continuityEngineVersion']) assert.ok(Object.prototype.hasOwnProperty.call(VDOS_RUNTIME_FINGERPRINT,key),`missing ${key}`);
assert.ok(Object.isFrozen(VDOS_RUNTIME_FINGERPRINT));
console.log('runtime fingerprint tests passed');