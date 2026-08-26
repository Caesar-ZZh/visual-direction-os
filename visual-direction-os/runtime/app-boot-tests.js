const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const appPath = path.join(__dirname, '..', 'app.js');
const source = fs.readFileSync(appPath, 'utf8');

const packagePrerequisites = [
  'vendor/fflate.min.js',
  'runtime/runtime-fingerprint.js',
  'runtime/schema-migrations.js',
  'runtime/vdos-codec.js',
  'runtime/project-package.js',
  'runtime/project-library.js'
];
const requiredM4Assets = [
  'runtime/director-memory.js',
  'runtime/comparison-engine.js',
  'runtime/memory-engine.js',
  'runtime/m4-controller.js',
  'runtime/lineage-ui.js'
];

for (const asset of [...packagePrerequisites, ...requiredM4Assets, 'runtime/project-package-ui.js']) {
  assert.ok(source.includes(`'${asset}'`), `app.js must load ${asset}`);
}

const packageIndices = packagePrerequisites.map((asset) => source.indexOf(`'${asset}'`));
for (let i = 1; i < packageIndices.length; i += 1) {
  assert.ok(packageIndices[i] > packageIndices[i - 1], 'M5 package prerequisites must load in dependency order');
}
const m4Indices = requiredM4Assets.map((asset) => source.indexOf(`'${asset}'`));
for (let i = 1; i < m4Indices.length; i += 1) {
  assert.ok(m4Indices[i] > m4Indices[i - 1], 'M4 runtime assets must load in dependency order');
}
assert.ok(packageIndices.at(-1) < m4Indices[0], 'M5 package prerequisites must be declared before M4 runtime modules');
assert.ok(source.indexOf("'runtime/project-package-ui.js'") > source.indexOf("'runtime/lineage-ui.js'"), 'Project Package UI must load after M4 controller/UI dependencies');

assert.ok(source.includes("loadStylesheet('runtime/lineage.css')"), 'app.js must load lineage.css');
assert.ok(source.includes("loadStylesheet('runtime/project-package.css')"), 'app.js must load project-package.css');
assert.match(source, /localStorage\.getItem\(['"]vdos-active-project-id['"]\)/, 'hard reload must read explicit active project preference before M4 restore');
assert.doesNotMatch(source, /await\s+globalThis\.VisualDirectionOS\?\.m4\?\.boot\?\.\(/, 'M4 restore must not block the main runtime boot path');
assert.match(source, /VisualDirectionOS\?\.m4\?\.boot\?\.\(\{\s*projectId\s*:\s*preferredProjectId\s*\}\)/, 'M4 boot must receive the explicit preferred project ID');
assert.match(source, /loadScript\(['"]runtime\/project-package-ui\.js['"]\)\.catch\(/, 'Project Package UI failure must be isolated from the main runtime boot catch');

const uiPath = path.join(__dirname, 'project-package-ui.js');
assert.equal(fs.existsSync(uiPath), true, 'project-package-ui.js must exist');
const uiSource = fs.readFileSync(uiPath, 'utf8');
for (const label of ['PROJECT','New Project','Open','Rename','Export .vdos','Import .vdos','Delete Project']) {
  assert.ok(uiSource.includes(label), `Project Package UI must expose ${label}`);
}
assert.ok(uiSource.includes('Import as Copy'), 'import conflict UI must make Copy the primary/default option');
assert.ok(uiSource.includes('Replace Existing'), 'import conflict UI must expose explicit destructive Replace');
assert.ok(uiSource.includes('Export Incomplete Package'), 'partial export UI must require an explicit incomplete-package action');
assert.match(uiSource, /VisualDirectionOS[^\n]*projects|projects\s*:/, 'browser mount must expose VisualDirectionOS.projects');

console.log('app boot tests passed');
