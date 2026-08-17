const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSite } = require('./build-pages-site.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vdos-publish-'));
const output = path.join(root, 'site');
const source = __dirname;

buildSite(source, output);

assert.equal(
  fs.readFileSync(path.join(output, 'index.html'), 'utf8'),
  fs.readFileSync(path.join(source, 'director-v2.html'), 'utf8'),
  'published index must be the Director Workspace entry'
);
assert.equal(
  fs.readFileSync(path.join(output, 'knowledge.html'), 'utf8'),
  fs.readFileSync(path.join(source, 'index.html'), 'utf8'),
  'legacy knowledge browser must remain available as knowledge.html'
);

const narrativeAssets = [
  'narrative-workspace.css',
  'narrative-contracts.js',
  'narrative-state.js',
  'narrative-demo-fixtures.js',
  'narrative-api-client.js',
  'narrative-workspace.js',
  'narrative-apply.js',
  'narrative-apply-ui.js'
];
for (const asset of narrativeAssets) {
  assert.ok(fs.existsSync(path.join(output, asset)), `assembled Pages site must include ${asset}`);
}

assert.ok(fs.existsSync(path.join(output, 'director-v2.html')));
fs.rmSync(root, { recursive: true, force: true });
console.log('site publish tests passed');