const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appPath = path.join(__dirname, '..', 'app.js');
const source = fs.readFileSync(appPath, 'utf8');

const requiredAssets = [
  'runtime/director-memory.js',
  'runtime/comparison-engine.js',
  'runtime/memory-engine.js',
  'runtime/m4-controller.js',
  'runtime/lineage-ui.js'
];

for (const asset of requiredAssets) {
  assert.ok(source.includes(`'${asset}'`), `app.js must load ${asset}`);
}

const indices = requiredAssets.map((asset) => source.indexOf(`'${asset}'`));
for (let i = 1; i < indices.length; i += 1) {
  assert.ok(indices[i] > indices[i - 1], 'M4 runtime assets must load in dependency order');
}

assert.ok(source.includes("loadStylesheet('runtime/lineage.css')"), 'app.js must load lineage.css');
assert.doesNotMatch(source, /await\s+globalThis\.VisualDirectionOS\?\.m4\?\.boot\?\.\(/, 'M4 restore must not block the main runtime boot path');
assert.match(source, /VisualDirectionOS\?\.m4\?\.boot\?\.\(\)/, 'M4 boot must still be started after scripts load');

console.log('app boot tests passed');
