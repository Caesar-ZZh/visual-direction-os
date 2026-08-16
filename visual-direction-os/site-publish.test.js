const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildSite } = require('./build-pages-site.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vdos-publish-'));
const source = path.join(root, 'source');
const output = path.join(root, 'site');
fs.mkdirSync(source, { recursive: true });
fs.writeFileSync(path.join(source, 'index.html'), '<h1>knowledge-v2</h1>');
fs.writeFileSync(path.join(source, 'director-v2.html'), '<h1>director-v2.1</h1>');
fs.writeFileSync(path.join(source, 'styles.css'), 'body{}');

buildSite(source, output);

assert.equal(fs.readFileSync(path.join(output, 'index.html'), 'utf8'), '<h1>director-v2.1</h1>');
assert.equal(fs.readFileSync(path.join(output, 'knowledge.html'), 'utf8'), '<h1>knowledge-v2</h1>');
assert.equal(fs.readFileSync(path.join(output, 'styles.css'), 'utf8'), 'body{}');
assert.ok(fs.existsSync(path.join(output, 'director-v2.html')));

fs.rmSync(root, { recursive: true, force: true });
console.log('site publish tests passed');
