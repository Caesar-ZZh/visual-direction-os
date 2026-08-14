(() => {
  'use strict';

  const routes = ['overview', 'character', 'world', 'sequence', 'color', 'production', 'case-study', 'glossary', 'decision-tree', 'workflow', 'qa'];
  const routeLabels = {
    overview: 'Overview', character: 'Character', world: 'World', sequence: 'Sequence', color: 'Color', production: 'Production',
    'case-study': 'Case Study', glossary: 'Glossary', 'decision-tree': 'Decision Tree', workflow: 'Master Workflow', qa: 'Visual QA'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const setText = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };

  function currentRoute() {
    const hash = location.hash.replace('#', '').trim();
    return routes.includes(hash) ? hash : 'overview';
  }

  function closeNavigation({ restoreFocus = false } = {}) {
    document.body.classList.remove('nav-open');
    const rail = $('.system-rail');
    if (rail) rail.inert = innerWidth <= 820;
    const toggle = $('.menu-toggle');
    if (toggle) {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', '打开导航');
      if (restoreFocus) toggle.focus();
    }
  }

  function showRoute(route, { focus = true } = {}) {
    const safeRoute = routes.includes(route) ? route : 'overview';
    $$('.view').forEach((view) => {
      const active = view.dataset.view === safeRoute;
      view.hidden = !active;
      view.classList.toggle('is-visible', active);
    });
    $$('.nav-link').forEach((button) => {
      const active = button.dataset.route === safeRoute;
      button.classList.toggle('is-active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    document.title = `Visual Direction OS · ${routeLabels[safeRoute]}`;
    closeNavigation();
    scrollTo({ top: 0, behavior: 'instant' });
    updateProgress();
    if (focus) {
      const view = $(`[data-view="${safeRoute}"]`);
      const heading = view?.querySelector('h1');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    }
  }

  function navigate(route) {
    if (!routes.includes(route)) route = 'overview';
    if (location.hash === `#${route}`) showRoute(route);
    else location.hash = route;
  }

  document.addEventListener('click', (event) => {
    const routeControl = event.target.closest('[data-route]');
    if (routeControl) {
      event.preventDefault();
      navigate(routeControl.dataset.route);
    }
  });
  window.addEventListener('hashchange', () => showRoute(currentRoute()));

  const menuToggle = $('.menu-toggle');
  menuToggle?.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    const rail = $('.system-rail');
    if (rail) rail.inert = !open && innerWidth <= 820;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
    if (open) $('.system-rail .nav-link.is-active')?.focus();
  });
  $('.nav-scrim')?.addEventListener('click', () => closeNavigation({ restoreFocus: true }));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('nav-open')) closeNavigation({ restoreFocus: true });
  });

  // Theme
  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('vdos-theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#11120f' : '#f0eee7');
    $$('.theme-toggle').forEach((button) => button.setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'));
  }
  $$('.theme-toggle').forEach((button) => button.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')));
  setTheme(document.documentElement.dataset.theme || 'dark');

  // Reading progress
  function updateProgress() {
    const activeView = $('.view:not([hidden])');
    const meter = $('.chapter-meter span');
    if (!activeView || !meter) return;
    const max = Math.max(1, activeView.scrollHeight - innerHeight + 80);
    meter.style.width = `${Math.min(100, Math.max(0, scrollY / max * 100))}%`;
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', () => {
    updateProgress();
    const rail = $('.system-rail');
    if (innerWidth > 820) closeNavigation();
    else if (rail && !document.body.classList.contains('nav-open')) rail.inert = true;
  });

  // Character State Machine
  const stateData = {
    baseline: { variable: 'Focus accepts external hierarchy', camera: 'System-led / locked framing', readability: 'Assigned object holds hard edge', trigger: 'A suppressed detail attracts attention', owner: 'WORLD / SYSTEM', x: '50%', y: '50%' },
    pressure: { variable: 'Focus begins to split', camera: 'Late correction / slight resistance', readability: 'Eye-line opposes focal hierarchy', trigger: 'Character keeps returning to forbidden detail', owner: 'CONTESTED', x: '60%', y: '44%' },
    crisis: { variable: 'Focus logic collapses', camera: 'Unreliable snap focus', readability: 'Wrong objects repeatedly become clear', trigger: 'No hierarchy can be trusted', owner: 'SYSTEM / NOISE', x: '37%', y: '67%' },
    decision: { variable: 'One object is deliberately chosen', camera: 'Motion pauses / neutral witness', readability: 'Visual silence isolates the eye mark', trigger: 'Character stops trying to see everything', owner: 'IN TRANSFER', x: '50%', y: '34%' },
    agency: { variable: 'Focus follows character intent', camera: 'Predictive framing', readability: 'Edge clarity propagates from gaze', trigger: 'The chosen subject returns the gaze', owner: 'CHARACTER', x: '72%', y: '32%' },
    resolution: { variable: 'Focal hierarchy becomes plural', camera: 'Character-led / open composition', readability: 'Suppressed zones regain visual presence', trigger: 'New rules stabilize as Baseline B', owner: 'CHARACTER + WORLD', x: '78%', y: '62%' }
  };
  $$('.state-machine button').forEach((button) => button.addEventListener('click', () => {
    $$('.state-machine button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    const data = stateData[button.dataset.state];
    setText('#state-variable', data.variable); setText('#state-camera', data.camera); setText('#state-readability', data.readability); setText('#state-trigger', data.trigger); setText('#state-owner', data.owner);
    const marker = $('.state-gauge b'); if (marker) { marker.style.left = data.x; marker.style.top = data.y; }
  }));

  // Compatibility Matrix
  const modeDescriptions = {
    Harmonize: ['世界支持角色机制', '世界的默认语法为角色提供可用基础设施；身份通过轻微偏差保持。', 'Supports', 'Low'],
    Amplify: ['世界放大角色机制', '世界把角色的 Primary Variable 推向更大的范围，同时也更快消耗视觉储备。', 'Magnifies', 'Moderate'],
    Resist: ['世界限制角色机制', '世界允许核心规则存在，但持续施加阻力，迫使角色启用替代识别通道。', 'Constrains', 'Moderate'],
    Destabilize: ['世界使角色规则失效', '世界攻击角色专属的视觉能力，形成 Character-specific Crisis，而不是泛化的混乱。', 'Disables', 'High'],
    Rewrite: ['角色改写世界语法', '控制权转移后，世界开始响应角色选择；新规则保留双方痕迹，形成 Baseline B。', 'Transforms', 'Resolved']
  };
  const characterActions = {
    Space: ['路径与摄影机共同响应角色选择', '角色从跟随路线转向创造路线。'],
    Boundary: ['Hard / Soft / Lost 边缘获得情感条件', '角色主动决定边界何时开放、渗透或关闭。'],
    Time: ['同步与不同步成为有意选择', '稳定身份骨架允许媒介层以不同 cadence 更新。'],
    Focus: ['清晰度与层级沿角色意图传播', '角色决定什么值得被看见，而非接受指定焦点。']
  };
  $$('.compatibility-matrix button').forEach((button) => button.addEventListener('click', () => {
    $$('.compatibility-matrix button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    const character = button.dataset.character;
    const mode = button.dataset.mode;
    const modeData = modeDescriptions[mode];
    setText('#matrix-character', character.toUpperCase()); setText('#matrix-mode', mode.toUpperCase());
    setText('#matrix-headline', mode === 'Harmonize' ? characterActions[character][0] : modeData[0]);
    setText('#matrix-copy', `${modeData[1]} ${characterActions[character][1]}`);
    setText('#matrix-action', modeData[2]); setText('#matrix-risk', modeData[3]);
  }));

  // Sequence Beat Console
  const beatData = [
    { phase: 'BASELINE / SYSTEM POV', verb: 'ACCEPT', lead: 'Focal hierarchy', support: 'Stable camera · Amber marker', silent: 'Texture · Edge activity', owner: 'System', values: [26, 38, 20, 34, 12] },
    { phase: 'CONTACT / MIXED POV', verb: 'NOTICE', lead: 'Eye-line conflict', support: 'Edge contrast · Negative space', silent: 'Camera movement', owner: 'Contested', values: [39, 46, 24, 51, 21] },
    { phase: 'PRESSURE / SYSTEM POV', verb: 'CORRECT', lead: 'Snap focus', support: 'Architectural framing · Amber invasion', silent: 'Character color', owner: 'System', values: [64, 72, 58, 69, 16] },
    { phase: 'CRISIS / UNSTABLE POV', verb: 'COLLAPSE', lead: 'Focus instability', support: 'Contradictory edges · Camera lag', silent: 'Reliable hierarchy', owner: 'Noise', values: [82, 68, 81, 92, 8] },
    { phase: 'DECISION / NEUTRAL POV', verb: 'WITHHOLD', lead: 'Visual silence', support: 'Eye mark · Breath', silent: 'Color · Texture · Motion', owner: 'In transfer', values: [18, 9, 7, 11, 36] },
    { phase: 'AGENCY / CHARACTER POV', verb: 'REFOCUS', lead: 'Directed pull focus', support: 'Predictive frame · Edge propagation', silent: 'System markers', owner: 'Character', values: [53, 62, 71, 48, 92] },
    { phase: 'RESOLUTION / SHARED POV', verb: 'REWRITE', lead: 'Plural hierarchy', support: 'Texture return · Amber residue', silent: 'Institutional correction', owner: 'Character + world', values: [72, 54, 56, 66, 84] }
  ];
  const barNames = ['space', 'color', 'camera', 'load', 'agency'];
  $$('.beat-tabs button').forEach((button) => button.addEventListener('click', () => {
    $$('.beat-tabs button').forEach((item) => item.setAttribute('aria-selected', String(item === button)));
    const data = beatData[Number(button.dataset.beat)];
    setText('#beat-phase', data.phase); setText('#beat-verb', data.verb); setText('#beat-lead', data.lead); setText('#beat-support', data.support); setText('#beat-silent', data.silent); setText('#beat-owner', data.owner);
    barNames.forEach((name, index) => { const bar = $(`[data-bar="${name}"]`); if (bar) bar.style.setProperty('--value', `${data.values[index]}%`); setText(`[data-value="${name}"]`, data.values[index]); });
  }));

  // Color Territory
  const territoryData = [
    { index: 'BEAT 01 / ASSIGNED VISION', verb: 'Occupy', copy: 'Amber 由制度拥有，以硬边界框定被指定的观看对象。角色的视觉存在被限制在低对比冷色区域。', owner: 'Institution / System', boundary: 'Hard · architectural', migration: 'Background → object', residue: 'None', desc: '制度拥有大部分 Amber 色域，角色只占据一个小的冷白区域。' },
    { index: 'BEAT 02 / FORBIDDEN DETAIL', verb: 'Invade', copy: '系统色域扩张并包围角色；一个关系色在制度与角色之间短暂生成，提示注意力冲突。', owner: 'System / contested', boundary: 'Encroaching · angular', migration: 'Object → clothing', residue: 'Relationship trace', desc: '制度色域向角色入侵，关系色出现在两者交界。' },
    { index: 'BEAT 03 / PERCEPTUAL COLLAPSE', verb: 'Dissolve', copy: '所有权边界失去可靠性。Amber 不再指向意义，只剩弥散噪声；角色区域压缩到一个无法行动的焦点。', owner: 'No reliable owner', boundary: 'Broken · unstable', migration: 'Field → body', residue: 'Contamination', desc: '色彩边界破碎，角色被压缩在画面中心，所有权不再可靠。' },
    { index: 'BEAT 04 / SELF-DIRECTED FOCUS', verb: 'Claim', copy: '角色重新定义清晰度传播方向。冷色注意力场占领画面，Amber 从制度标记转为被主动选择的对象。', owner: 'Character', boundary: 'Directed · permeable', migration: 'Eye mark → world', residue: 'Ownership transfer', desc: '角色注意力色域占据画面，制度色退到边缘，关系区域连接两者。' },
    { index: 'BEAT 05 / BASELINE B', verb: 'Remain', copy: '世界保留一小块 Amber，但其语义已经改变：它不再强迫观看，而是记录角色曾经选择过的注意方向。', owner: 'Character + world', boundary: 'Open · negotiated', migration: 'World → shared field', residue: 'Amber memory', desc: '角色与世界共享画面，右下角保留一块 Amber 残余作为新基线的记忆。' }
  ];
  $$('.territory-controls button').forEach((button) => button.addEventListener('click', () => {
    $$('.territory-controls button').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    const index = Number(button.dataset.territory); const data = territoryData[index]; const frame = $('.territory-frame');
    if (frame) frame.dataset.territoryFrame = String(index);
    setText('#territory-index', data.index); setText('#territory-verb', data.verb); setText('#territory-copy', data.copy); setText('#territory-owner', data.owner); setText('#territory-boundary', data.boundary); setText('#territory-migration', data.migration); setText('#territory-residue', data.residue); setText('#territory-frame-desc', data.desc);
  }));

  // Glossary filter
  const glossaryInput = $('#glossary-input');
  glossaryInput?.addEventListener('input', () => {
    const query = glossaryInput.value.trim().toLocaleLowerCase();
    const terms = $$('.glossary-list article');
    let visible = 0;
    terms.forEach((term) => { const match = !query || term.dataset.search.toLocaleLowerCase().includes(query) || term.textContent.toLocaleLowerCase().includes(query); term.hidden = !match; if (match) visible += 1; });
    setText('#glossary-count', `${visible} term${visible === 1 ? '' : 's'}`);
    const empty = $('.glossary-list .empty-state'); if (empty) empty.hidden = visible !== 0;
  });

  // Narrative Decision Tree
  const decisions = {
    freedom: { primary: 'SPACE / DIRECTION', reason: '自由与束缚优先映射为空间可用范围、路径选择与运动方向。', steps: ['定义角色可拥有的路径范围', '选择 Shape / Camera 作为支持变量', '让危机压缩路线选择', '让 Agency 创造新路径'] },
    intimacy: { primary: 'EDGE / DISTANCE', reason: '亲密与疏离通过边缘硬度、边界渗透和心理距离获得视觉形式。', steps: ['定义关系边界的默认状态', '建立 Hard / Soft / Lost 条件', '让危机制造边界矛盾', '让 Agency 选择开放或关闭'] },
    identity: { primary: 'SHAPE / TIME', reason: '身份自主需要稳定锚点与可控变化之间的张力，Shape 或 Time 最适合作为主变量。', steps: ['固定 2–3 个身份锚点', '定义 Controlled Range', '让危机强迫统一', '让 Agency 选择何时偏离'] },
    visibility: { primary: 'FOCUS / CONTRAST', reason: '被看见的问题应转译为注意力分配、清晰度与画面优先级。', steps: ['定义谁分配注意力', '建立 Contrast Budget', '让焦点逻辑在危机中失效', '让 Agency 主动选择重要对象'] },
    order: { primary: 'GRID / REPETITION', reason: '秩序通过网格、重复、同步和偏差被感知；关键是明确规则何时允许被打破。', steps: ['定义世界默认网格', '分配偏差预算', '让危机消除有意义差异', '让 Agency 重写重复规则'] },
    memory: { primary: 'LAYER / TEXTURE', reason: '记忆通过信息层、材质累积、焦点可靠性与残余痕迹进入图像。', steps: ['定义记忆如何叠加', '区分当前层与残余层', '让危机打乱时间层级', '用 Baseline B 保留痕迹'] }
  };
  $$('[data-decision]').forEach((button) => button.addEventListener('click', () => {
    $$('[data-decision]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    const data = decisions[button.dataset.decision]; setText('#decision-primary', data.primary); setText('#decision-reason', data.reason);
    const list = $('#decision-steps'); if (list) list.innerHTML = data.steps.map((step, index) => `<li><b>${String(index + 1).padStart(2, '0')}</b>${step}</li>`).join('');
  }));

  // Master Workflow
  const workflowData = [
    { range: 'PHASE 01 / STEPS 01—05', name: 'Define the narrative engine', goal: '先把故事问题压缩成一个可视化的行动逻辑，不讨论风格标签。', deliverable: 'Project Visual Thesis', steps: [['Narrative Situation', '写发生什么，而不是画面长什么样。'], ['Character State', '定义人物现在处于什么心理位置。'], ['Viewer Response', '观众第一时间应该感受到什么。'], ['Narrative Verb', '压缩成 CLAIM、WITHDRAW、DIVIDE 或 REFOCUS。'], ['Core Loss', '找到角色最怕失去的能力或关系。']] },
    { range: 'PHASE 02 / STEPS 06—10', name: 'Build the rule system', goal: '把叙事核心转译为主变量、身份锚点与角色—世界关系。', deliverable: 'Character + World Bible', steps: [['Primary Variable', '只选一个承担主要叙事工作。'], ['Secondary / Silent', '明确支持变量和保持安静的变量。'], ['Identity Anchors', '建立至少三个稳定识别通道。'], ['World Thesis', '定义世界默认怎样生成图像。'], ['Compatibility', '命名 Harmonize 到 Rewrite 的关系。']] },
    { range: 'PHASE 03 / STEPS 11—15', name: 'Make the system visible', goal: '把规则变成状态、构图、明度、边缘与颜色的可执行控制图。', deliverable: 'State Matrix + Visual Maps', steps: [['State Machine', '写出六状态与每个 Transition Trigger。'], ['Thumbnail', '用 3–7 个大形验证空间和读序。'], ['Shape / Value', '先完成二值和三值明度结构。'], ['Visual Traffic', '设计 Edge、Direction 与 Negative Space。'], ['Color Ownership', '先分配颜色工作和所有权，再选色相。']] },
    { range: 'PHASE 04 / STEPS 16—20', name: 'Orchestrate and validate', goal: '让媒介、序列、高潮和生产反馈共同验证系统，而非装饰系统。', deliverable: 'Sequence Score + Bible Update', steps: [['Medium Behavior', '让材质行为支持主变量。'], ['Sequence Score', '编排 Lead、Support、Silent 与 Reserve。'], ['Climax / Silence', '把高潮放在决定与控制权转移。'], ['Constraint Test', '移除全部表面标签验证可迁移性。'], ['Production QA', '把镜头反馈回 Bible，形成 Baseline B。']] }
  ];
  let activeWorkflowPhase = 0;
  function renderWorkflow(index) {
    activeWorkflowPhase = (index + workflowData.length) % workflowData.length;
    const data = workflowData[activeWorkflowPhase];
    $$('.workflow-phases button').forEach((button, i) => button.setAttribute('aria-selected', String(i === activeWorkflowPhase)));
    setText('#workflow-range', data.range); setText('#workflow-name', data.name); setText('#workflow-goal', data.goal); setText('#workflow-deliverable', `DELIVERABLE / ${data.deliverable}`); setText('#workflow-next', activeWorkflowPhase === 3 ? 'Return to phase one ↺' : 'Next phase →');
    const list = $('#workflow-steps'); if (list) list.innerHTML = data.steps.map((step, i) => `<li><span>${String(activeWorkflowPhase * 5 + i + 1).padStart(2, '0')}</span><div><strong>${step[0]}</strong><p>${step[1]}</p></div></li>`).join('');
  }
  $$('.workflow-phases button').forEach((button) => button.addEventListener('click', () => renderWorkflow(Number(button.dataset.phase))));
  $('#workflow-next')?.addEventListener('click', () => renderWorkflow(activeWorkflowPhase + 1));

  // Visual QA progress
  const qaChecks = $$('.qa-groups input[type="checkbox"]');
  function updateQa() {
    const checked = qaChecks.filter((input) => input.checked).length;
    const percent = Math.round(checked / qaChecks.length * 100) || 0;
    setText('#qa-percent', `${percent}%`);
    const progress = $('#qa-progress'); if (progress) progress.style.width = `${percent}%`;
  }
  qaChecks.forEach((input) => input.addEventListener('change', updateQa));
  $('#qa-reset')?.addEventListener('click', () => { qaChecks.forEach((input) => { input.checked = false; }); updateQa(); qaChecks[0]?.focus(); });

  // Arrow-key navigation for horizontal tab-like controls
  $$('.beat-tabs, .workflow-phases').forEach((group) => group.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = $$('button', group); const current = buttons.indexOf(document.activeElement); if (current < 0) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus(); buttons[next].click();
  }));

  showRoute(currentRoute(), { focus: false });
})();
