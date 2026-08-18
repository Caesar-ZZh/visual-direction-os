const assert = require('assert');
const { renderProjectWorkspace, renderProjectEditor, renderBreakdownProposal } = require('./project-workspace.js');
const { deriveProjectArc } = require('./project-arc.js');
const { deriveContinuity } = require('./project-continuity.js');
const fixtures = require('./project-breakdown-fixtures.js');

const project = {
  id:'project-1', title:'Untitled Film', projectIntent:'Compliance becomes self-authorship', sourceNarrative:'story',
  sceneOrder:['scene-01','scene-02'], activeSceneId:'scene-01',
  scenes:{
    'scene-01':{ id:'scene-01',order:1,title:'COMPLIANCE',narrativeRole:{role:'setup',narrativeFunction:'Establish order.',startingState:'Order accepted.',endingState:'Task accepted.',turningPoint:'Task binds.',agencyTransition:['world','world'],relationToPrevious:null},workspace:{sceneState:null,narrativeState:null,sequenceState:null},status:{narrative:'defined',visual:'undirected',continuity:'unresolved'} },
    'scene-02':{ id:'scene-02',order:2,title:'REFUSAL',narrativeRole:{role:'rupture',narrativeFunction:'Recognition becomes refusal.',startingState:'Pressure.',endingState:'Open refusal.',turningPoint:'Control recognized.',agencyTransition:['contested','character'],relationToPrevious:'Recognition becomes action.'},workspace:{sceneState:null,narrativeState:null,sequenceState:null},status:{narrative:'defined',visual:'undirected',continuity:'unresolved'} }
  }
};
const html = renderProjectWorkspace(project, deriveProjectArc(project), deriveContinuity(project));
assert.match(html, /Project Arc/);
assert.match(html, /COMPLIANCE/);
assert.match(html, /REFUSAL/);
assert.match(html, /data-project-arc-row="camera"/);
assert.match(html, /data-scene-id="scene-01"[^>]*>—</);
assert.match(html, /UNRESOLVED/);
assert.match(html, /data-action="edit-project"/, 'Project Workspace should expose a compact metadata edit entry point');
assert.doesNotMatch(html, />PROJECT<\/button>/, 'Project must not become a fifth mode button');
const emptyHtml = renderProjectWorkspace({ id:'empty', title:'Empty', projectIntent:'', sourceNarrative:'', sceneOrder:[], activeSceneId:null, scenes:{} });
assert.match(emptyHtml, />00 SCENES</, 'empty Project must report zero Scenes');

const editor = renderProjectEditor(project);
assert.match(editor, /EDIT PROJECT/);
assert.match(editor, /data-project-meta-field="title"/);
assert.match(editor, /value="Untitled Film"/);
assert.match(editor, /data-project-meta-field="projectIntent"/);
assert.match(editor, /Compliance becomes self-authorship/);
assert.doesNotMatch(editor, /camera|color|space|texture|rhythm/i, 'Project metadata editor must not expose Scene visual direction fields');

const proposal = renderBreakdownProposal({
  status:'proposal',
  projectReading:fixtures.breakdown.projectReading,
  proposedScenes:fixtures.breakdown.scenes.map(scene => ({...scene,directorEdits:{}})),
  selectedSceneId:'proposal-scene-01',
  structureNeedsReview:false
});
assert.match(proposal, /PROJECT READING/);
assert.match(proposal, /PROPOSED SCENE STRUCTURE/);
assert.match(proposal, /CONFIRM SCENE STRUCTURE/);
assert.match(proposal, /data-action="split-scene"/);
assert.match(proposal, /data-action="merge-next"/);
console.log('project-workspace.test.js passed');
