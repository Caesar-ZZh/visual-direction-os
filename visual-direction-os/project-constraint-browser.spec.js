const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1&projectDemo=1';

async function installM7Fixture(page) {
  await page.waitForFunction(() => Boolean(window.VDOSProjectContext?.store && window.VDOSProjectContext?.workspace && window.VDOSScene && window.VDOSProjectConstraintRegistry));
  await page.evaluate(() => {
    const context = window.VDOSProjectContext;
    const store = context.store;
    const clone = value => JSON.parse(JSON.stringify(value));
    const baseSceneState = clone(window.VDOSScene.getSceneState());

    store.createProject({
      id:'project-m7-browser',
      title:'Project Constraint Browser Fixture',
      projectIntent:'Carry verified Camera ownership into the next Scene without flattening Scene autonomy.',
      sourceNarrative:'World authority becomes contested before the next Scene begins from contested agency.'
    });

    const configs = [
      {id:'scene-01',title:'World Holds Authority',role:'setup',transition:['world','world'],agency:'world',camera:'world'},
      {id:'scene-02',title:'Authority Becomes Contested',role:'recognition',transition:['world','contested'],agency:'contested',camera:'mixed'},
      {id:'scene-03',title:'Future Scene',role:'resolution',transition:['contested','character'],agency:null,camera:null}
    ];

    function directedNarrative(config) {
      return {
        confirmedReading:{id:`${config.id}-reading`},
        selectedStrategy:{id:`${config.id}-camera`,grammarId:'camera-authority-transfer'},
        sequenceSkeleton:{version:'0.1.0',grammarId:'camera-authority-transfer',beats:[{id:'new-ownership',patchSlots:{'camera.perspective':{status:'compiler-derived'}}}]},
        sequenceProposal:{beats:[{id:'new-ownership',label:'NEW OWNERSHIP',agency:config.agency,narrativeBeat:'Fixture.',visualEvents:[],rationale:'Fixture.',sceneStatePatch:{agency:config.agency,variables:{camera:{perspective:config.camera}}}}]},
        sequenceProvenance:{origin:'compiler-first',skeletonVersion:'0.1.0',grammarId:'camera-authority-transfer',fields:{'new-ownership.agency':{owner:'compiler',support:'supported',source:'agency-constraint'},'new-ownership.camera.perspective':{owner:'compiler',support:'supported',source:'camera-authority-transfer'}}}
      };
    }

    for (const config of configs) {
      store.addScene({
        id:config.id,title:config.title,role:config.role,
        narrativeFunction:`Carry ${config.role} ownership semantics.`,
        startingState:`Starts in ${config.transition[0]} agency.`,
        endingState:`Ends in ${config.transition[config.transition.length - 1]} agency.`,
        turningPoint:'Ownership relation changes materially.',agencyTransition:config.transition,
        relationToPrevious:config.id === 'scene-01' ? null : 'The previous Scene creates this ownership condition.'
      });
      if (config.id !== 'scene-03') {
        const sceneState = clone(baseSceneState);
        sceneState.agency = config.agency;
        sceneState.narrativeState = 'new-ownership';
        sceneState.variables = sceneState.variables || {};
        sceneState.variables.camera = {...(sceneState.variables.camera || {}),perspective:config.camera};
        store.updateScene(config.id,{workspace:{narrativeState:directedNarrative(config),sceneState,sequenceState:null},status:{narrative:'confirmed',visual:'directed',continuity:'unresolved'}});
      }
    }
    store.setActiveScene('scene-03');
    context.workspace.showProject();
  });
}

test('M7 Candidate appears after M6, confirms without Scene mutation, and guarded bridge respects Scene Compiler truth', async ({page}) => {
  await page.setViewportSize({width:1440,height:1100});
  await page.goto(url);
  await installM7Fixture(page);

  const root = page.locator('#project-workspace-root');
  await expect(root.locator('[data-project-intelligence-panel]')).toBeVisible();
  await expect(root.locator('[data-project-constraints]')).toBeVisible();
  const order = await root.evaluate(node => ({
    intelligence:[...node.querySelectorAll('*')].findIndex(el => el.hasAttribute('data-project-intelligence-panel')),
    constraints:[...node.querySelectorAll('*')].findIndex(el => el.hasAttribute('data-project-constraints'))
  }));
  expect(order.constraints).toBeGreaterThan(order.intelligence);

  const candidate = root.locator('[data-project-constraint-candidate]');
  await expect(candidate).toHaveCount(1);
  await expect(candidate).toContainText('CAMERA');
  await expect(candidate).toContainText('MIXED');
  const scenesBefore = await page.evaluate(() => JSON.parse(JSON.stringify(window.VDOSProjectContext.store.getProject().scenes)));
  await candidate.getByRole('button',{name:'CONFIRM'}).click();
  const scenesAfter = await page.evaluate(() => JSON.parse(JSON.stringify(window.VDOSProjectContext.store.getProject().scenes)));
  expect(scenesAfter).toEqual(scenesBefore);

  const confirmed = root.locator('[data-project-constraint-id]');
  await expect(confirmed).toContainText('CONFIRMED · ACTIVE');
  await expect(candidate).toHaveCount(0);

  const result = await page.evaluate(() => {
    const projectState = window.VDOSProjectContext.store.getProject();
    const projectIntelligence = window.VDOSProjectIntelligence.deriveProjectIntelligence(projectState);
    const registry = projectState.projectConstraints;
    const baseSkeleton = {beats:[{id:'setup',label:'SETUP',agencySlot:{status:'fixed',value:'contested'}}]};
    const satisfied = window.VDOSVisualSequenceProjectConstraints.guardProjectConstraints({
      projectState,projectIntelligence,registry,targetSceneId:'scene-03',
      visualIR:{grammar:{status:'resolved',id:'camera-authority-transfer'}},baseSkeleton
    });
    let conflict = null;
    try {
      window.VDOSVisualSequenceProjectConstraints.guardProjectConstraints({
        projectState,projectIntelligence,registry,targetSceneId:'scene-03',
        visualIR:{grammar:{status:'resolved',id:'color-ownership-transfer'}},baseSkeleton
      });
    } catch (error) {
      conflict = {code:error.code,resolutions:error.resolutions};
    }
    return {satisfied,conflict};
  });
  expect(result.satisfied.safeToComplete).toBe(true);
  expect(result.satisfied.resolutions[0].status).toBe('SATISFIED');
  expect(result.satisfied.resolutions[0].sceneExpected).toBe('mixed');
  expect(result.conflict.code).toBe('PROJECT_CONSTRAINT_REVIEW_REQUIRED');
  expect(result.conflict.resolutions[0].reason).toBe('TARGET_GRAMMAR_UNSUPPORTED');
});

test('M7 confirmed constraint becomes stale with authority removed when target evidence changes', async ({page}) => {
  await page.goto(url);
  await installM7Fixture(page);
  const root = page.locator('#project-workspace-root');
  await root.locator('[data-project-constraint-candidate]').getByRole('button',{name:'CONFIRM'}).click();

  await page.evaluate(() => {
    const store = window.VDOSProjectContext.store;
    store.updateScene('scene-03',{narrativeRole:{agencyTransition:['contested','shared','character']}});
    window.VDOSProjectContext.workspace.showProject();
  });

  const card = root.locator('[data-project-constraint-id]');
  await expect(card).toContainText('STALE · AUTHORITY REMOVED');
  await expect(card).toContainText('EXACT AUTHORITY · NONE');
  await expect(card.getByRole('button',{name:'REVIEW NEW REVISION'})).toBeVisible();
  await expect(card.getByRole('button',{name:'REVOKE'})).toBeVisible();
});
