const assert = require('assert');
const fs = require('fs');
const qa = require('./visual-qa.js');
const copyPolish = require('./auteur-polish-runtime.js');

const clean = qa.scanSource({
  html:'<main id="main"><a href="#target">Go</a><section id="target"><button aria-label="Run">Run</button></section></main>',
  css:'button:focus-visible{outline:2px solid} @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}} .x{transition:opacity .2s ease}'
});
assert.ok(clean.every(x => x.level !== 'FAIL'));

const bad = qa.scanSource({
  html:'<div id="dup"></div><div id="dup"></div><a href="#missing">Broken</a><button><span></span></button>',
  css:'.x{transition: all .2s}'
});
assert.ok(bad.some(x => x.id === 'duplicate-id' && x.level === 'FAIL'));
assert.ok(bad.some(x => x.id === 'broken-internal-target' && x.level === 'FAIL'));
assert.ok(bad.some(x => x.id === 'transition-all' && x.level === 'FAIL'));
assert.ok(bad.some(x => x.id === 'focus-visible' && x.level === 'FAIL'));
assert.ok(bad.some(x => x.id === 'reduced-motion' && x.level === 'FAIL'));

// Auteur system-register polish contract.
const projectContextCss = fs.readFileSync(require.resolve('./project-context.css'), 'utf8');
assert.match(projectContextCss, /^@import url\("auteur-polish\.css\?v=/, 'Project style entry must load the final Auteur polish layer');
assert.match(projectContextCss, /@import url\("auteur-polish-detail\.css\?v=/, 'Project style entry must load the Auteur detail layer');
const polish = fs.readFileSync(require.resolve('./auteur-polish.css'), 'utf8');
const detail = fs.readFileSync(require.resolve('./auteur-polish-detail.css'), 'utf8');
const projectContextJs = fs.readFileSync(require.resolve('./project-context.js'), 'utf8');
assert.match(polish, /body::after[\s\S]*position:\s*fixed[\s\S]*opacity:\s*\.0[23]/, 'grain must be a fixed, very low-opacity material layer');
assert.match(polish, /\.stage\s+\.project-reading\s*\{[\s\S]*grid-template-columns:\s*1\.18fr\s+1\.12fr\s+1fr\s+1fr\s+\.82fr/, 'Project Reading must break the uniform card-grid rhythm');
assert.doesNotMatch(polish, /\.project-finding[^\{]*\{[^}]*border-left:\s*[2-9]px/, 'semantic findings must not use a thick colored side stripe');
assert.doesNotMatch(polish, /\.narrative-(?:clarification|stage-error|apply-preview)[^\{]*\{[^}]*border-left:\s*[2-9]px/, 'Narrative semantic surfaces must not use a thick colored side stripe');
assert.match(polish, /@media\s*\(hover:hover\)/, 'hover polish must be gated to real hover devices');
assert.match(polish, /--motion-press:\s*130ms/, 'high-frequency control feedback must stay inside the Auteur 100–160ms budget');
assert.match(polish, /button:active[\s\S]*scale\(\.98\)/, 'buttons must have restrained physical press feedback');
assert.match(polish, /@media\s*\(prefers-reduced-motion:reduce\)/, 'polish layer must define a reduced-motion art direction');
assert.match(detail, /\.v2-rail\[data-expanded='false'\]\s+\.brand[\s\S]*font-size:\s*0/, 'collapsed rail must not clip the full wordmark');
assert.match(detail, /\.v2-rail\[data-expanded='false'\]\s+\.brand::before[\s\S]*content:\s*"V"/, 'collapsed rail must render a stable V monogram');
assert.match(detail, /\.stage\s+\.node-narrative\{left:16%;top:-4%\}/, 'Narrative marker must stay inside the hero system map instead of colliding with copy');
assert.match(detail, /body::after\{opacity:\.028\}/, 'detail pass may deepen grain slightly but must remain below 3%');
assert.match(projectContextJs, /auteur-polish-runtime\.js\?v=/, 'Project browser entry must load the UI copy polish runtime');
assert.strictEqual(copyPolish.normalizeInterfaceCopy('系统会提出候选 Reading，而不是唯一答案。'), '系统会提出候选 Reading，而不是唯一答案');
assert.strictEqual(copyPolish.normalizeInterfaceCopy('描述场景。系统形成判断。'), '描述场景，系统形成判断');
assert.strictEqual(copyPolish.normalizeInterfaceCopy('Demo fixture mode. Results remain proposals until Apply.'), 'Demo fixture mode · Results remain proposals until Apply');
console.log('visual qa tests passed');