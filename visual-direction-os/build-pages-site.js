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

function buildSite(sourceDir, outputDir) {
  const source = path.resolve(sourceDir);
  const output = path.resolve(outputDir);
  const legacyIndex = path.join(source, 'index.html');
  const directorIndex = path.join(source, 'director-v2.html');
  if (!fs.existsSync(legacyIndex)) throw new Error(`Legacy index missing: ${legacyIndex}`);
  if (!fs.existsSync(directorIndex)) throw new Error(`Director v2.1 entry missing: ${directorIndex}`);

  fs.rmSync(output, { recursive: true, force: true });
  copyTree(source, output);
  fs.copyFileSync(legacyIndex, path.join(output, 'knowledge.html'));
  fs.copyFileSync(directorIndex, path.join(output, 'index.html'));
  return output;
}

if (require.main === module) {
  const [, , sourceDir = 'visual-direction-os', outputDir = '_site'] = process.argv;
  const output = buildSite(sourceDir, outputDir);
  console.log(`Visual Direction OS Pages site assembled at ${output}`);
}

module.exports = { buildSite };
