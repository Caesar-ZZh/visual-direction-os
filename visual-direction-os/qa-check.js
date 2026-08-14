const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const appDir = __dirname;
const expectedRoutes = ['overview', 'character', 'world', 'sequence', 'color', 'production', 'case-study', 'glossary', 'decision-tree', 'workflow', 'qa'];
const results = [];

function check(name, condition, detail = '') {
  results.push({ name, pass: Boolean(condition), detail });
}

function read(file) {
  return fs.readFileSync(path.join(appDir, file), 'utf8');
}

for (const file of ['index.html', 'styles.css', 'app.js']) {
  check(`required file: ${file}`, fs.existsSync(path.join(appDir, file)));
}

const html = read('index.html');
const css = read('styles.css');
const js = read('app.js');

for (const route of expectedRoutes) {
  check(`view route: ${route}`, html.includes(`data-view="${route}"`));
  check(`navigation target: ${route}`, html.includes(`data-route="${route}"`));
}

const sourceLinks = [...html.matchAll(/href="\.\.\/visual-direction-system\/([^"]+\.md)"/g)].map((match) => match[1]);
check('canonical source links', sourceLinks.length >= 11, `${sourceLinks.length} links`);
for (const source of new Set(sourceLinks)) {
  check(`source exists: ${source}`, fs.existsSync(path.join(root, 'visual-direction-system', source)));
}

check('viewport metadata', /<meta name="viewport"/.test(html));
check('skip link', /class="skip-link"/.test(html) && /id="main-content"/.test(html));
check('Sequence Score text alternative', /score-svg-title/.test(html) && /score-svg-desc/.test(html));
check('State Machine text output', /class="state-readout"[^>]*aria-live="polite"/.test(html));
check('Compatibility Matrix caption', /compatibility-matrix[\s\S]*?<caption/.test(html));
check('Color Territory text alternative', /territory-frame-desc/.test(html));
check('reduced motion CSS', /prefers-reduced-motion:\s*reduce/.test(css));
check('responsive breakpoints', /max-width:\s*820px/.test(css) && /max-width:\s*480px/.test(css));
check('no remote scripts', !/<script[^>]+src=["']https?:\/\//i.test(html));
check('no build dependency imports', !/\b(import|require)\s*\(?["'][^./]/.test(js));

try {
  execFileSync(process.execPath, ['--check', path.join(appDir, 'app.js')], { stdio: 'pipe' });
  check('JavaScript syntax', true);
} catch (error) {
  check('JavaScript syntax', false, String(error.stderr || error.message));
}

check('legacy root index removed', !fs.existsSync(path.join(root, 'index.html')));

try {
  execFileSync('git', ['diff', '--quiet', '--', 'visual-direction-system'], { cwd: root, stdio: 'pipe' });
  check('Markdown source library unchanged', true);
} catch {
  check('Markdown source library unchanged', false, 'visual-direction-system source files changed');
}

const passed = results.filter((result) => result.pass).length;
const failed = results.length - passed;
for (const result of results) {
  process.stdout.write(`${result.pass ? 'PASS' : 'FAIL'}  ${result.name}${result.detail ? ` (${result.detail})` : ''}\n`);
}
process.stdout.write(`\n${passed} passed, ${failed} failed\n`);
if (failed) process.exitCode = 1;
