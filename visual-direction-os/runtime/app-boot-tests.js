const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const appPath=path.join(__dirname,'..','app.js');
const source=fs.readFileSync(appPath,'utf8');

const critical=[
  'runtime/sequence-model.js','runtime/continuity-engine.js','runtime/director-memory.js','runtime/comparison-engine.js','runtime/memory-engine.js','runtime/m4-controller.js','runtime/m6-controller.js','runtime/m6-browser-controller.js','runtime/lineage-ui.js','runtime/sequence-director-ui.js','runtime/m6-approved-frame-ui.js'
];
const packages=['vendor/fflate.min.js','runtime/runtime-fingerprint.js','runtime/schema-migrations.js','runtime/vdos-codec.js','runtime/project-package.js','runtime/m6-project-package.js','runtime/project-library.js'];
for(const asset of [...critical,...packages,'runtime/m6-project-package-ui.js'])assert.ok(source.includes(`'${asset}'`),`app.js must load ${asset}`);
for(let i=1;i<critical.length;i++)assert.ok(source.indexOf(`'${critical[i]}'`)>source.indexOf(`'${critical[i-1]}'`),`critical M6 dependency order failed at ${critical[i]}`);
for(let i=1;i<packages.length;i++)assert.ok(source.indexOf(`'${packages[i]}'`)>source.indexOf(`'${packages[i-1]}'`),`package dependency order failed at ${packages[i]}`);
assert.ok(source.indexOf("'runtime/m6-browser-controller.js'")>source.indexOf("'runtime/m6-controller.js'"));
assert.ok(source.indexOf("'runtime/sequence-director-ui.js'")>source.indexOf("'runtime/m6-browser-controller.js'"));
assert.match(source,/VisualDirectionOS\?\.m6\?\.boot\?\.\(\{\s*projectId\s*:\s*preferredProjectId\s*\}\)/,'M6 must own project/shot restore');
assert.doesNotMatch(source,/VisualDirectionOS\?\.m4\?\.boot\?\.\(\{\s*projectId/,'app boot must not restore M4 project-wide');
assert.match(source,/localStorage\.getItem\(['"]vdos-active-project-id['"]\)/);
assert.ok(source.includes("loadStylesheet('runtime/sequence-director.css')"));
assert.match(source,/loadScript\(['"]runtime\/m6-project-package-ui\.js['"]\)\.catch\(/,'portable workspace failure must remain optional');

for(const file of ['sequence-model.js','continuity-engine.js','m6-controller.js','m6-browser-controller.js','sequence-director-ui.js','m6-approved-frame-ui.js','m6-project-package.js','m6-project-package-ui.js'])assert.equal(fs.existsSync(path.join(__dirname,file)),true,`${file} must exist`);
const ui=fs.readFileSync(path.join(__dirname,'sequence-director-ui.js'),'utf8');
assert.ok(ui.includes('SEQUENCE DIRECTOR / M6'));
assert.ok(ui.includes('CONTINUITY REVIEW'));
assert.ok(ui.includes('Generate New Version'));
const approved=fs.readFileSync(path.join(__dirname,'m6-approved-frame-ui.js'),'utf8');
assert.ok(approved.includes('Set as Approved Frame'));
assert.ok(approved.includes('Clear Approval'));
const projectUi=fs.readFileSync(path.join(__dirname,'m6-project-package-ui.js'),'utf8');
for(const label of ['PROJECT / M6','Export .vdos','Import .vdos'])assert.ok(projectUi.includes(label));
assert.match(projectUi,/loadProjectBundle/,'whole-project export must originate from Director Memory bundle');
assert.doesNotMatch(projectUi,/m4\.getExportSnapshot\(\).*project|const live = m4\.getExportSnapshot/,'M4 snapshot must not define project membership');

console.log('app boot tests passed');