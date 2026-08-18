const assert = require('assert');
const qa = require('./visual-qa.js');

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
console.log('visual qa tests passed');
