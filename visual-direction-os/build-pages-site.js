const fs = require('fs');
const path = require('path');

const RELEASE_STYLESHEET = '<link rel="stylesheet" href="release-routing.css?v=20260818-2332">';

function copyTree(source, output) {
  fs.mkdirSync(output, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(output, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

function injectReleaseStyles(html) {
  if (html.includes('release-routing.css')) return html;
  if (!html.includes('</head>')) throw new Error('Document is missing </head>.');
  return html.replace('</head>', `  ${RELEASE_STYLESHEET}\n</head>`);
}

function createSystemDocument(systemHtml) {
  let html = String(systemHtml || '');
  if (!html.includes('<head>')) throw new Error('SYSTEM document is missing <head>.');
  html = injectReleaseStyles(html);
  if (!html.includes('studio-entry')) {
    const marker = '      <nav class="primary-nav" aria-label="核心章节">';
    if (!html.includes(marker)) throw new Error('SYSTEM primary navigation marker is unavailable.');
    const bridge = `      <a class="release-space-switch studio-entry" href="studio/" aria-label="Enter Visual Direction OS Studio">\n        <span>STUDIO</span><strong>Enter Director Workspace</strong><i aria-hidden="true">→</i>\n      </a>\n`;
    html = html.replace(marker, `${bridge}${marker}`);
  }
  return html;
}

function createStudioDocument(directorHtml) {
  let html = String(directorHtml || '');
  if (!html.includes('<head>')) throw new Error('Director v2.1 document is missing <head>.');
  if (!html.includes('<base ')) html = html.replace('<head>', '<head>\n  <base href="../">');
  html = injectReleaseStyles(html);
  html = html
    .replace(/Director Workspace · v2\.1 staging/g, 'Director Workspace · v2.1')
    .replace(/Director Control Room \/ staging build/g, 'Director Control Room')
    .replace(/href="#([^"]+)"/g, 'href="studio/#$1"');
  if (!html.includes('data-system-home')) {
    const marker = '      <div class="brand">Visual Direction OS<small>Director Workspace · v2.1</small></div>';
    if (!html.includes(marker)) throw new Error('Studio brand marker is unavailable.');
    const bridge = `${marker}\n      <a class="release-space-switch release-system-home" data-system-home href="./" aria-label="Return to Visual Direction OS System">\n        <span>SYSTEM</span><strong>Knowledge Space</strong><i aria-hidden="true">↗</i>\n      </a>`;
    html = html.replace(marker, bridge);
  }
  return html;
}

function buildSite(sourceDir, outputDir) {
  const source = path.resolve(sourceDir);
  const output = path.resolve(outputDir);
  const systemIndex = path.join(source, 'index.html');
  const directorIndex = path.join(source, 'director-v2.html');
  const releaseStyles = path.join(source, 'release-routing.css');
  if (!fs.existsSync(systemIndex)) throw new Error(`SYSTEM index missing: ${systemIndex}`);
  if (!fs.existsSync(directorIndex)) throw new Error(`Director v2.1 entry missing: ${directorIndex}`);
  if (!fs.existsSync(releaseStyles)) throw new Error(`Release routing styles missing: ${releaseStyles}`);

  fs.rmSync(output, { recursive: true, force: true });
  copyTree(source, output);

  const systemHtml = fs.readFileSync(systemIndex, 'utf8');
  fs.writeFileSync(path.join(output, 'index.html'), createSystemDocument(systemHtml));

  const studioDir = path.join(output, 'studio');
  fs.mkdirSync(studioDir, { recursive: true });
  const directorHtml = fs.readFileSync(directorIndex, 'utf8');
  fs.writeFileSync(path.join(studioDir, 'index.html'), createStudioDocument(directorHtml));

  return output;
}

if (require.main === module) {
  const [, , sourceDir = 'visual-direction-os', outputDir = '_site'] = process.argv;
  const output = buildSite(sourceDir, outputDir);
  console.log(`Visual Direction OS Pages site assembled at ${output}`);
}

module.exports = { buildSite, createSystemDocument, createStudioDocument, injectReleaseStyles };
