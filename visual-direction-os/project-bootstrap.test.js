const assert = require('assert');
const { deriveProjectApiBase, createInitialProjectInput, createNarrativeApiProxy, renderSceneContextBar, renderNarrativeProjectContext } = require('./project-bootstrap.js');
assert.equal(deriveProjectApiBase('https://example.test/api/narrative'), 'https://example.test');
assert.equal(deriveProjectApiBase('https://example.test/api/narrative/'), 'https://example.test');
assert.equal(deriveProjectApiBase('https://example.test'), 'https://example.test');
const normal = createInitialProjectInput(false);
assert.equal(normal.title, 'Untitled Film');
assert.equal(normal.sourceNarrative, '');
const demo = createInitialProjectInput(true);
assert.ok(demo.sourceNarrative.length > 40);
assert.match(demo.projectIntent, /agency/i);

(async () => {
  const calls = [];
  const baseApi = {
    async interpret(payload){ calls.push(['interpret',payload]); return {ok:true}; },
    async strategy(payload){ calls.push(['strategy',payload]); return {ok:true}; },
    async sequence(payload){ calls.push(['sequence',payload]); return {ok:true}; }
  };
  const context = {
    projectIntent:'End with reclaimed agency.', sceneRole:'rupture', narrativeFunction:'Recognition becomes refusal.',
    startingState:'Agency is contested.', endingState:'The character refuses.', agencyTransition:['contested','character']
  };
  const proxy = createNarrativeApiProxy(baseApi, () => context);
  await proxy.interpret({narrative:'scene'});
  await proxy.strategy({reading:{}});
  assert.deepEqual(calls[0][1].projectContext, context);
  assert.equal('projectContext' in calls[1][1], false, 'Project Context belongs to Interpret only');

  const project = {
    title:'Untitled Film', activeSceneId:'scene-02', sceneOrder:['scene-01','scene-02','scene-03'],
    scenes:{
      'scene-01':{title:'COMPLIANCE',narrativeRole:{role:'setup',agencyTransition:['world','world']}},
      'scene-02':{title:'REFUSAL',narrativeRole:{role:'rupture',agencyTransition:['contested','character']}},
      'scene-03':{title:'EXIT',narrativeRole:{role:'resolution',agencyTransition:['character','character']}}
    }
  };
  const bar = renderSceneContextBar(project);
  assert.match(bar, /UNTITLED FILM/);
  assert.match(bar, /02 \/ 03/);
  assert.match(bar, /PROJECT ARC/);
  assert.match(bar, /NEXT SCENE/);
  const upstream = renderNarrativeProjectContext(context);
  assert.match(upstream, /PROJECT CONTEXT/);
  assert.match(upstream, /RUPTURE/);
  assert.match(upstream, /CONTESTED → CHARACTER/);
  console.log('project-bootstrap.test.js passed');
})().catch(error => { console.error(error); process.exitCode = 1; });