const assert = require('assert');
const { createSystemDocument, createStudioDocument } = require('./build-pages-site.js');

const systemFixture = `<!doctype html>
<html><head><title>Visual Direction OS</title></head><body>
<aside class="system-rail">
  <div class="rail-status">Framework online</div>
      <nav class="primary-nav" aria-label="核心章节"></nav>
</aside>
</body></html>`;

const studioFixture = `<!doctype html>
<html><head><title>Visual Direction OS · Director Workspace v2.1 staging</title></head><body>
<aside class="v2-rail">
      <div class="brand">Visual Direction OS<small>Director Workspace · v2.1 staging</small></div>
</aside>
<p class="eyebrow">Director Control Room / staging build</p>
</body></html>`;

const system = createSystemDocument(systemFixture);
assert.match(system, /studio-entry/);
assert.match(system, /href="studio\/"/);
assert.match(system, /Enter Director Workspace/);
assert.match(system, /release-routing\.css/);

const studio = createStudioDocument(studioFixture);
assert.match(studio, /<base href="\.\.\/">/);
assert.match(studio, /data-system-home/);
assert.match(studio, /href="\.\/"/);
assert.match(studio, /Director Workspace · v2\.1/);
assert.match(studio, /Director Control Room/);
assert.doesNotMatch(studio, /v2\.1 staging|staging build/i);
assert.match(studio, /release-routing\.css/);

console.log('release-routing.test.js passed');
