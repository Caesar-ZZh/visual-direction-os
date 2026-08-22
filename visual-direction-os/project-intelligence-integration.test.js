const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const workspace = require('./project-workspace.js');

const root = __dirname;

function minimalProject() {
  return {
    id: 'project-m6-integration',
    title: 'M6 Integration',
    projectIntent: 'Preserve Scene autonomy while exposing cross-Scene cause.',
    activeSceneId: null,
    sceneOrder: [],
    scenes: {}
  };
}

function intelligenceState() {
  return {
    schemaVersion: '0.1.0',
    mode: 'shadow',
    status: 'UNRESOLVED',
    sceneOrder: [],
    scenes: [],
    boundaries: [],
    findings: []
  };
}

test('Project Bootstrap loads M6 intelligence runtime before Project Workspace', () => {
  const source = fs.readFileSync(path.join(root, 'project-bootstrap.js'), 'utf8');
  const continuity = source.indexOf('project-continuity.js');
  const intelligence = source.indexOf('project-intelligence.js');
  const inspector = source.indexOf('project-intelligence-inspector.js');
  const workspaceIndex = source.indexOf('project-workspace.js');
  assert.ok(continuity >= 0, 'continuity loader missing');
  assert.ok(intelligence > continuity, 'Project Intelligence must load after Continuity');
  assert.ok(inspector > intelligence, 'Project Intelligence inspector must load after intelligence');
  assert.ok(workspaceIndex > inspector, 'Project Workspace must load after both M6 modules');
  assert.match(source, /project-intelligence\.css/);
});

test('Project Workspace renders Project Arc then Continuity then Project Intelligence without mutating input', () => {
  const project = minimalProject();
  const before = JSON.parse(JSON.stringify(project));
  const html = workspace.renderProjectWorkspace(
    project,
    { status: 'UNRESOLVED', sceneOrder: [], scenes: [], rows: [] },
    { status: 'UNRESOLVED', findings: [] },
    intelligenceState()
  );

  const arc = html.indexOf('Project Arc');
  const continuity = html.indexOf('Cross-Scene Continuity');
  const intelligence = html.indexOf('PROJECT INTELLIGENCE · SHADOW');
  assert.ok(arc >= 0);
  assert.ok(continuity > arc);
  assert.ok(intelligence > continuity);
  assert.deepEqual(project, before);
});

test('Project Workspace source consumes M6 as read-only dependencies instead of folding logic into Continuity', () => {
  const source = fs.readFileSync(path.join(root, 'project-workspace.js'), 'utf8');
  assert.match(source, /VDOSProjectIntelligence/);
  assert.match(source, /VDOSProjectIntelligenceInspector/);
  assert.match(source, /deriveProjectIntelligence/);
  assert.match(source, /renderProjectIntelligence/);
  assert.doesNotMatch(source, /updateSceneState|setSceneState|markSceneDirected/);
});
