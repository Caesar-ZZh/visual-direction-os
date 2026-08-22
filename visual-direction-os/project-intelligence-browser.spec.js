const { test, expect } = require('@playwright/test');

const url = 'http://127.0.0.1:4173/director-v2.html?narrativeDemo=1&projectDemo=1';

async function installProjectIntelligenceFixture(page, variant = 'normal') {
  await page.waitForFunction(() => Boolean(window.VDOSProjectContext?.store && window.VDOSProjectContext?.workspace && window.VDOSScene));
  await page.evaluate(({ variant }) => {
    const context = window.VDOSProjectContext;
    const store = context.store;
    const clone = value => JSON.parse(JSON.stringify(value));
    const baseSceneState = clone(window.VDOSScene.getSceneState());

    const configs = [
      { id:'scene-01', title:'Institution Owns the Frame', role:'setup', transition:['world','world'], grammar:'camera-authority-transfer', agency:'world', camera:'world', color:'world' },
      { id:'scene-02', title:'Authority Becomes Contested', role:'recognition', transition:['world','contested'], grammar:'camera-authority-transfer', agency:'contested', camera:'mixed', color:'contested' },
      { id:'scene-03', title:'Color Territory Transfers', role:'resolution', transition:['contested','character'], grammar:'color-ownership-transfer', agency:'character', camera:'mixed', color:'character' }
    ];

    store.createProject({
      id:'project-m6-browser',
      title:'Project Intelligence Browser Fixture',
      projectIntent:'Explain cross-Scene ownership changes without flattening Scene autonomy.',
      sourceNarrative:'Institutional ownership becomes contested and resolves into self-authored agency.'
    });

    function narrativeStateFor(config) {
      const family = config.grammar === 'color-ownership-transfer' ? 'color' : 'camera';
      const path = family === 'color' ? 'color.territory' : 'camera.perspective';
      const value = family === 'color' ? config.color : config.camera;
      return {
        selectedStrategy:{ id:`${config.id}-${family}`, grammarId:config.grammar },
        sequenceSkeleton:{
          version:'0.1.0',
          grammarId:config.grammar,
          beats:[{
            id:'new-ownership',
            patchSlots:{
              [path]:{ status:'compiler-derived' },
              'space.compression':{ status:'blocked' }
            }
          }]
        },
        sequenceCompletion:{ beats:[{ id:'new-ownership', agency:config.agency, narrativeBeat:'Browser acceptance.', visualEvents:[], rationale:'Fixture completion.', openPatch:{} }] },
        sequenceProposal:{
          beats:[{
            id:'new-ownership',
            label:'NEW OWNERSHIP',
            agency:config.agency,
            narrativeBeat:'Browser acceptance.',
            visualEvents:[],
            rationale:'Fixture completion.',
            sceneStatePatch:{
              agency:config.agency,
              variables: family === 'color'
                ? { color:{ territory:value } }
                : { camera:{ perspective:value } }
            }
          }]
        },
        sequenceProvenance:{
          origin:'compiler-first',
          skeletonVersion:'0.1.0',
          grammarId:config.grammar,
          fields:{
            'new-ownership.agency':{ owner:'compiler', support:'supported', source:'agency-constraint' },
            [`new-ownership.${path}`]:{ owner:'compiler', support:'supported', source:config.grammar }
          }
        }
      };
    }

    for (const config of configs) {
      store.addScene({
        id:config.id,
        title:config.title,
        role:config.role,
        narrativeFunction:`Carry ${config.role} ownership semantics.`,
        startingState:`Starts in ${config.transition[0]} agency.`,
        endingState:`Ends in ${config.transition[config.transition.length - 1]} agency.`,
        turningPoint:'Ownership relation changes materially.',
        agencyTransition:config.transition,
        relationToPrevious:config.id === 'scene-01' ? null : 'The previous Scene creates this ownership condition.'
      });

      const sceneState = clone(baseSceneState);
      sceneState.agency = config.agency;
      sceneState.narrativeState = 'new-ownership';
      sceneState.variables = sceneState.variables || {};
      sceneState.variables.camera = { ...(sceneState.variables.camera || {}), perspective:config.camera };
      sceneState.variables.color = { ...(sceneState.variables.color || {}), territory:config.color };
      sceneState.variables.space = { ...(sceneState.variables.space || {}), compression:'medium' };

      let narrativeState = narrativeStateFor(config);
      if (variant === 'legacy' && config.id === 'scene-03') narrativeState = null;
      if (variant === 'divergence' && config.id === 'scene-02') sceneState.variables.camera.perspective = 'character';

      store.updateScene(config.id, {
        workspace:{
          narrativeState,
          sceneState,
          sequenceState:null
        },
        status:{ narrative:'confirmed', visual:'directed', continuity:'unresolved' }
      });
    }

    context.workspace.showProject();
  }, { variant });
}

test('M6 renders compiler-backed causal boundaries after Continuity without mutating canonical Scene State', async ({ page }) => {
  await page.setViewportSize({ width:1440, height:1100 });
  await page.goto(url);
  await installProjectIntelligenceFixture(page, 'normal');

  const projectRoot = page.locator('#project-workspace-root');
  await expect(projectRoot.getByText('PROJECT INTELLIGENCE · SHADOW')).toBeVisible();

  const html = await projectRoot.innerHTML();
  expect(html.indexOf('Project Arc')).toBeLessThan(html.indexOf('Cross-Scene Continuity'));
  expect(html.indexOf('Cross-Scene Continuity')).toBeLessThan(html.indexOf('PROJECT INTELLIGENCE · SHADOW'));

  const cameraBoundary = page.locator('[data-project-intelligence-boundary="scene-01->scene-02"]');
  await expect(cameraBoundary).toHaveAttribute('data-status', 'PASS');
  await expect(cameraBoundary).toContainText('CAUSE · CURRENT SCENE');
  await expect(cameraBoundary).toContainText('WORLD → CONTESTED');
  await expect(cameraBoundary).toContainText('VISUAL RESPONSE');
  await expect(cameraBoundary).toContainText('CAMERA');
  await expect(cameraBoundary).toContainText('COMPILER-BACKED');
  await expect(cameraBoundary).toContainText('OWNERSHIP CONSEQUENCE');

  const colorBoundary = page.locator('[data-project-intelligence-boundary="scene-02->scene-03"]');
  await expect(colorBoundary).toHaveAttribute('data-status', 'PASS');
  await expect(colorBoundary).toContainText('COLOR');
  await expect(colorBoundary).toContainText('COMPILER-BACKED');
  await expect(colorBoundary).not.toContainText('WARN');

  const beforeInspect = await page.evaluate(() => window.VDOSScene.getSceneState());
  await cameraBoundary.getByText('Inspect Project Intelligence').click();
  await expect(cameraBoundary).toContainText('HANDOFF');
  await expect(cameraBoundary).toContainText('GRAMMAR');
  await expect(cameraBoundary).toContainText('PROVENANCE');
  const afterInspect = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(afterInspect).toEqual(beforeInspect);

  await page.locator('.project-scene-node[data-scene-id="scene-01"]').click();
  await expect(page.locator('#project-scene-context-bar')).toContainText('01 / 03');
  const sceneOne = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(sceneOne.agency).toBe('world');
  expect(sceneOne.variables.camera.perspective).toBe('world');

  await page.getByRole('button', { name:/PROJECT ARC/i }).click();
  await page.locator('.project-scene-node[data-scene-id="scene-02"]').click();
  const sceneTwo = await page.evaluate(() => window.VDOSScene.getSceneState());
  expect(sceneTwo.agency).toBe('contested');
  expect(sceneTwo.variables.camera.perspective).toBe('mixed');
});

test('legacy directed Scene remains UNRESOLVED without blocking Project Workspace', async ({ page }) => {
  await page.goto(url);
  await installProjectIntelligenceFixture(page, 'legacy');

  const boundary = page.locator('[data-project-intelligence-boundary="scene-02->scene-03"]');
  await expect(boundary).toHaveAttribute('data-status', 'UNRESOLVED');
  await expect(boundary).toContainText('LEGACY');
  await expect(page.getByText('PROJECT INTELLIGENCE · SHADOW')).toBeVisible();
  await expect(page.getByRole('heading', { name:'Project Arc' })).toBeVisible();
  await expect(page.getByRole('button', { name:/Fix automatically/i })).toHaveCount(0);
});

test('provenance divergence is UNRESOLVED and never mislabeled compiler-backed', async ({ page }) => {
  await page.goto(url);
  await installProjectIntelligenceFixture(page, 'divergence');

  const boundary = page.locator('[data-project-intelligence-boundary="scene-01->scene-02"]');
  await expect(boundary).toHaveAttribute('data-status', 'UNRESOLVED');
  await expect(boundary).toContainText('PROVENANCE-FINAL-STATE-DIVERGENCE');
  const camera = boundary.locator('[data-intelligence-family="camera"]');
  await expect(camera).toContainText('UNKNOWN');
  await expect(camera).not.toContainText('COMPILER-BACKED');
});