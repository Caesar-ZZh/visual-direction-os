const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createProjectStore } = require('./project-state.js');
const { createProjectRuntime } = require('./project-runtime.js');

const read = file => fs.readFileSync(path.join(__dirname,file),'utf8');

test('Project Bootstrap loads M8 dependencies and Prompt context in deterministic order', () => {
  const source = read('project-bootstrap.js');
  assert.match(source,/const VERSION = '20260824-m8-prompt-compiler'/);
  for (const asset of [
    'generation-prompt.css',
    'generation-prompt-apply-evidence.js',
    'generation-prompt-ir.js',
    'prompt-language-registry.js',
    'generation-prompt-renderer.js',
    'generation-prompt-compiler.js',
    'generation-prompt-inspector.js'
  ]) assert.match(source,new RegExp(asset.replace(/[.]/g,'\\.')));
  const registry = source.indexOf('project-constraint-registry.js');
  const applyEvidence = source.indexOf('generation-prompt-apply-evidence.js');
  const promptIR = source.indexOf('generation-prompt-ir.js');
  const compiler = source.indexOf('generation-prompt-compiler.js');
  const inspector = source.indexOf('generation-prompt-inspector.js');
  assert.ok(registry >= 0 && applyEvidence > registry);
  assert.ok(promptIR > applyEvidence);
  assert.ok(compiler > promptIR);
  assert.ok(inspector > compiler);
  assert.match(source,/generationPromptCompiler:\s*root\.VDOSGenerationPromptCompiler/);
  assert.match(source,/generationPromptInspector:\s*root\.VDOSGenerationPromptInspector/);
  assert.match(source,/generationPromptContextProvider:\s*\(\) => \(\{/);
  assert.match(source,/projectConstraintContext:\s*currentProjectConstraintContext\(store\)/);
});

test('Project Runtime round-trips sequenceApplyState inside existing narrativeState snapshot', async () => {
  const role = { role:'setup', narrativeFunction:'Establish.', startingState:'A', endingState:'B', turningPoint:'T', agencyTransition:['world','world'], relationToPrevious:null };
  const emptyScene = id => ({ id, order:Number(id.slice(-1)), title:id, narrativeRole:role, workspace:{ sceneState:{mode:'narrative'}, narrativeState:{stage:'input'}, sequenceState:null }, status:{narrative:'defined',visual:'undirected',continuity:'unresolved'} });
  const store = createProjectStore({ id:'p',title:'Film',projectIntent:'',sourceNarrative:'',sceneOrder:['scene-01','scene-02'],activeSceneId:'scene-01',scenes:{'scene-01':emptyScene('scene-01'),'scene-02':emptyScene('scene-02')} });
  let liveScene = {mode:'narrative'};
  let liveNarrative = {
    stage:'sequence',
    sequenceApplyState:{
      schemaVersion:'0.1.0',revision:2,
      beats:{ rupture:{ beatId:'rupture',applyRevision:2,source:{readingId:'r',strategyId:'s',grammarId:'camera-authority-transfer',sequenceOrigin:'compiler-first',skeletonVersion:'0.1.0'},proposalBeatFingerprint:'pbeat-1111111111111111',provenanceFingerprint:'pprv-2222222222222222',sequenceDirectorBeatFingerprint:'sbeat-3333333333333333' } }
    }
  };
  let liveSequence = null;
  const runtime = createProjectRuntime({
    projectStore:store, initialLoadedSceneId:'scene-01',
    sceneRuntime:{getState:()=>structuredClone(liveScene),restore:value=>{liveScene=structuredClone(value || {mode:'narrative'});}},
    narrativeRuntime:{getState:()=>structuredClone(liveNarrative),restore:value=>{liveNarrative=structuredClone(value || {stage:'input'});}},
    sequenceRuntime:{getState:()=>liveSequence,restore:value=>{liveSequence=value;}}
  });
  await runtime.switchScene('scene-02');
  assert.equal(store.getProject().scenes['scene-01'].workspace.narrativeState.sequenceApplyState.beats.rupture.applyRevision,2);
  await runtime.switchScene('scene-01');
  assert.equal(liveNarrative.sequenceApplyState.beats.rupture.proposalBeatFingerprint,'pbeat-1111111111111111');
});

test('Pages build test is responsible for asserting published M8 assets', () => {
  const source = read('build-pages-site.test.js');
  assert.match(source,/generation-prompt-apply-evidence\.js/);
  assert.match(source,/generation-prompt-compiler\.js/);
  assert.match(source,/generation-prompt-inspector\.js/);
  assert.match(source,/generation-prompt\.css/);
});
