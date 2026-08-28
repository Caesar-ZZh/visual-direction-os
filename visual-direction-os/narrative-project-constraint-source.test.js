const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync(require.resolve('./narrative-workspace.js'),'utf8');

test('Narrative Workspace declares Project constraint guard/provider options', () => {
  assert.match(source,/projectConstraintGuard/);
  assert.match(source,/projectConstraintProvider/);
});

test('Project constraint guard executes before beginRequest sequence boundary', () => {
  const guard = source.indexOf('guardProjectConstraints');
  const begin = source.indexOf("beginRequest('sequence')");
  assert.ok(guard >= 0,'guard call missing');
  assert.ok(begin >= 0,'sequence beginRequest missing');
  assert.ok(guard < begin,'guard must run before request token/controller creation');
});
