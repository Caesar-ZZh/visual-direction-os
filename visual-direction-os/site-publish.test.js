const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSite } = require('./build-pages-site.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vdos-publish-'));
const output = path.join(root, 'site');
const source = __dirname;

buildSite(source, output);

const sourceSystem = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
const publishedSystem = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
const publishedStudio = fs.readFileSync(path.join(output, 'studio', 'index.html'), 'utf8');

assert.match(sourceSystem, /Visual Direction OS/, 'source SYSTEM must remain the editorial knowledge browser');
assert.match(publishedSystem, /id="overview-title"/, 'published root must remain the SYSTEM knowledge experience');
assert.match(publishedSystem, /studio-entry/, 'published SYSTEM must route into STUDIO');
assert.match(publishedSystem, /href="studio\/"/, 'SYSTEM → STUDIO route must target /studio/');
assert.match(publishedStudio, /Director Workspace · v2\.1/, 'published /studio/ must contain Director Workspace');
assert.match(publishedStudio, /data-system-home/, 'published STUDIO must route back to SYSTEM');
assert.match(publishedStudio, /<base href="\.\.\/">/, 'STUDIO must resolve shared root assets');
assert.doesNotMatch(publishedStudio, /v2\.1 staging|staging build/i, 'published STUDIO chrome must be production-neutral');

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

const projectAssets = [
  'project-contracts.js',
  'project-context.js',
  'project-state.js',
  'project-persistence.js',
  'project-runtime.js',
  'project-arc.js',
  'project-continuity.js',
  'project-breakdown-state.js',
  'project-breakdown-api-client.js',
  'project-breakdown-fixtures.js',
  'project-workspace.js',
  'project-workspace.css',
  'project-context.css',
  'project-bootstrap.js',
  'release-routing.css'
];
for (const asset of projectAssets) {
  assert.ok(fs.existsSync(path.join(output, asset)), `assembled Pages site must include ${asset}`);
}

const directorApp = fs.readFileSync(path.join(source, 'director-v2-app.js'), 'utf8');
assert.ok(directorApp.includes('project-bootstrap.js'), 'Director shell must load Project Bootstrap as a context layer');
const bootstrap = fs.readFileSync(path.join(source, 'project-bootstrap.js'), 'utf8');
for (const asset of ['project-contracts.js','project-context.js','project-state.js','project-runtime.js','project-arc.js','project-continuity.js','project-breakdown-state.js','project-workspace.js','project-workspace.css','project-context.css']) {
  assert.ok(bootstrap.includes(asset), `Project Bootstrap must load ${asset}`);
}

const workflow = fs.readFileSync(path.join(source, '..', '.github', 'workflows', 'director-v2-ci.yml'), 'utf8');
for (const testFile of [
  'build-pages-site.test.js','release-routing.test.js','project-contracts.test.js','project-context.test.js','project-state.test.js','project-persistence.test.js','project-runtime.test.js','project-arc.test.js','project-continuity.test.js','project-breakdown-state.test.js','project-breakdown-api-client.test.js','project-workspace.test.js','project-bootstrap.test.js','api/project/_handler.test.js','api/project/_openai-adapter.test.js','api/project/_production.test.js','api/narrative/_prompts.test.js','project-workspace.spec.js','release-routing.spec.js'
]) {
  assert.ok(workflow.includes(testFile), `Director CI must execute ${testFile}`);
}
assert.ok(workflow.includes('api/project/**'), 'Director CI path filter must include Project API changes');

assert.ok(fs.existsSync(path.join(output, 'director-v2.html')), 'compatibility Director entry must remain published');
assert.ok(fs.existsSync(path.join(output, 'studio', 'index.html')), 'canonical Studio route must be published');
fs.rmSync(root, { recursive: true, force: true });
console.log('site publish tests passed');
