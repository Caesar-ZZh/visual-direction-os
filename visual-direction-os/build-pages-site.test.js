const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSite } = require('./build-pages-site.js');

const source = __dirname;
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'vdos-pages-'));

try {
  const previewShimPath = path.join(source, 'studio', 'index.html');
  assert.ok(fs.existsSync(previewShimPath), 'Source tree must expose a studio/ preview route');
  const previewShim = fs.readFileSync(previewShimPath, 'utf8');
  assert.match(previewShim, /\.\.\/director-v2\.html/, 'Source studio route must target the exact-commit Director entry');
  assert.match(previewShim, /location\.search/, 'Studio preview redirect must preserve query parameters');
  assert.match(previewShim, /location\.hash/, 'Studio preview redirect must preserve hash state');

  buildSite(source, output);

  const systemSource = fs.readFileSync(path.join(source, 'index.html'), 'utf8');
  const systemBuilt = fs.readFileSync(path.join(output, 'index.html'), 'utf8');
  const studioPath = path.join(output, 'studio', 'index.html');

  assert.equal(systemBuilt, systemSource, 'SYSTEM root must remain byte-identical to source index.html');
  assert.ok(fs.existsSync(studioPath), 'Pages build must create studio/index.html');

  const studioBuilt = fs.readFileSync(studioPath, 'utf8');
  assert.match(studioBuilt, /<base href="\.\.\/">/, 'Studio build must resolve shared assets from the parent directory');
  assert.match(studioBuilt, /Director Workspace/, 'Studio build must contain Director Workspace markup');
  assert.doesNotMatch(studioBuilt, /location\.replace\(/, 'Published Studio must be the full workspace, not the preview redirect shim');
  assert.ok(fs.existsSync(path.join(output, 'director-v2.html')), 'Compatibility director-v2.html must remain published');
  assert.ok(fs.existsSync(path.join(output, 'director-v2.css')), 'Studio shared assets must remain at the publish root');

  console.log('build-pages-site.test.js passed');
} finally {
  fs.rmSync(output, { recursive:true, force:true });
}
