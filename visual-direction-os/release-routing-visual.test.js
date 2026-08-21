const assert = require('assert');
const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, 'release-routing.css'), 'utf8');

assert.match(css, /\.studio-entry\s*\{[\s\S]*?box-shadow:\s*inset\s+2px\s+0\s+0\s+var\(--signal/s,
  'SYSTEM → STUDIO should carry a restrained accent edge so it reads as entering the operational space');
assert.match(css, /\.v2-rail\s+\.release-system-home\s*\{[\s\S]*?border-left:\s*0[\s\S]*?border-right:\s*0/s,
  'STUDIO → SYSTEM should read as a quiet return route, not a second primary card');
assert.match(css, /\.release-system-home-mobile\s*\{[\s\S]*?min-height:\s*44px/s,
  'Mobile SYSTEM route must meet the 44px touch-target floor');
assert.match(css, /@media\s*\(max-width:\s*820px\)[\s\S]*?\.system-rail\s*\{[\s\S]*?overflow-y:\s*auto/s,
  'Mobile SYSTEM rail must remain scrollable after adding the STUDIO bridge');
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?transition:\s*none/s,
  'Release navigation must preserve reduced-motion behavior');

console.log('release-routing-visual.test.js passed');