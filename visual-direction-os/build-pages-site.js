const fs = require('fs');
const path = require('path');

function copyTree(source, output) {
  fs.mkdirSync(output, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(output, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
  }
}

function createStudioDocument(directorHtml) {
  const html = String(directorHtml || '');
  if (!html.includes('<head>')) throw new Error('Director v2.1 document is missing <head>.');
  if (html.includes('<base ')) return html;
  return html.replace('<head>', '<head>\n  <base href="../">');
}

function buildSite(sourceDir, outputDir) {
  const source = path.resolve(sourceDir);
  const output = path.resolve(outputDir);
  const systemIndex = path.join(source, 'index.html');
  const directorIndex = path.join(source, 'director-v2.html');
  if (!fs.existsSync(systemIndex)) throw new Error(`SYSTEM index missing: ${systemIndex}`);
  if (!fs.existsSync(directorIndex)) throw new Error(`Director v2.1 entry missing: ${directorIndex}`);

  fs.rmSync(output, { recursive: true, force: true });
  copyTree(source, output);

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

module.exports = { buildSite, createStudioDocument };
