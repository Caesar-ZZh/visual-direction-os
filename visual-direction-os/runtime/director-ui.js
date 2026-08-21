(function attachDirectorUI(root) {
  'use strict';

  if (!root || !root.document) return;

  const runtime = root.VisualDirectionRuntime || {};
  const { directBrief, compileVisualIR, validateVisualIR } = runtime;
  if (typeof directBrief !== 'function' || typeof compileVisualIR !== 'function') {
    console.error('[Visual Direction OS] Director runtime failed to initialize.');
    return;
  }

  const document = root.document;
  const $ = (selector, base = document) => base.querySelector(selector);
  const $$ = (selector, base = document) => [...base.querySelectorAll(selector)];
  const text = (selector, value) => { const node = $(selector); if (node) node.textContent = value ?? 'unknown'; };
  const valueOf = (node, fallback = 'unknown') => node && typeof node === 'object' && 'value' in node ? node.value : (node ?? fallback);
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  let activeIR = null;
  let activeCompiled = null;

  const demos = {
    A: 'A teenage girl sits alone at an empty subway station late at night after an argument with her father.',
    B: 'A teenage boy runs through a dense city while trying to create his own escape route rather than following the crowd.',
    C: 'A rebellious guitarist enters an otherwise orderly institutional space without visually blending into it.'
  };

  function escapeHtml(input) {
    return String(input ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }

  function buildConsole() {
    const overview = $('#view-overview');
    const hero = overview?.querySelector('.hero');
    if (!overview || !hero || $('#director-console')) return;

    const section = document.createElement('section');
    section.className = 'director-console content-band';
    section.id = 'director-console';
    section.setAttribute('aria-labelledby', 'director-title');
    section.innerHTML = `
      <div class="director-intro">
        <div>
          <p class="section-no">00.1 / Executable director</p>
          <h2 id="director-title">Direct the <em>visual logic.</em></h2>
        </div>
        <p>输入叙事，而不是风格标签。系统先解释 Narrative、Primary Variable、World Relation 与 Ownership，再把它编译成可执行视觉约束。</p>
      </div>
      <div class="director-workbench">
        <form class="director-brief" id="director-form">
          <label for="director-brief-input"><span>NARRATIVE BRIEF</span><small>Natural language → Visual IR v0.1</small></label>
          <textarea id="director-brief-input" rows="6" spellcheck="true" placeholder="A character…"></textarea>
          <div class="director-actions">
            <button class="director-submit" type="submit"><span>DIRECT</span><small>Analyze → Resolve → Compile</small></button>
            <div class="director-demos" aria-label="Demo briefs">
              <button type="button" data-director-demo="A">Demo A</button>
              <button type="button" data-director-demo="B">Demo B</button>
              <button type="button" data-director-demo="C">Demo C</button>
            </div>
          </div>
          <p class="director-runtime-note"><i></i> deterministic interpreter · evidence-aware grammar · no image API</p>
        </form>
        <aside class="director-empty" id="director-empty">
          <small>RUNTIME READY / v0.1</small>
          <p>The page is no longer limited to preset demo objects. A brief can now become an active visual direction state.</p>
          <span>Primary Variable → Ownership → Composition → Camera → Color → Edge → Medium → Anti-rules</span>
        </aside>
      </div>
      <div class="director-output" id="director-output" hidden aria-live="polite">
        <header class="director-output-head">
          <div><small>ACTIVE VISUAL DIRECTION</small><h3 id="director-verb">—</h3></div>
          <div class="director-confidence"><span id="director-grammar">—</span><b id="director-confidence">—</b></div>
        </header>
        <div class="director-summary-grid">
          <article><small>PRIMARY VARIABLE</small><strong id="director-primary">—</strong><p id="director-agency">—</p></article>
          <article><small>WORLD RELATION</small><strong id="director-world">—</strong><p id="director-world-thesis">—</p></article>
          <article><small>COMPOSITION</small><strong id="director-composition">—</strong><p id="director-staging">—</p></article>
          <article><small>CAMERA</small><strong id="director-camera">—</strong><p id="director-camera-behavior">—</p></article>
          <article><small>COLOR OWNERSHIP</small><strong id="director-color">—</strong><p id="director-color-boundary">—</p></article>
          <article><small>EDGE / DETAIL</small><strong id="director-edge">—</strong><p id="director-detail">—</p></article>
          <article><small>MEDIUM OWNERSHIP</small><strong id="director-medium">—</strong><p id="director-medium-behavior">—</p></article>
          <article><small>TEMPORAL EVIDENCE</small><strong id="director-temporal">—</strong><p id="director-temporal-copy">—</p></article>
        </div>
        <div class="director-anti">
          <small>ANTI-RULES / PROTECTED CONSTRAINTS</small>
          <div id="director-anti-rules"></div>
        </div>
        <div class="director-links" aria-label="Mapped system modules">
          <button type="button" data-route="character">Character / State</button>
          <button type="button" data-route="world">World / Compatibility</button>
          <button type="button" data-route="sequence">Sequence / Ownership</button>
          <button type="button" data-route="color">Color / Territory</button>
        </div>
        <div class="director-compiled">
          <div><small>COMPILED PROMPT PREVIEW</small><span>MODEL-NEUTRAL · MUST / SHOULD / OPTIONAL / ANTI</span></div>
          <pre id="director-prompt" tabindex="0"></pre>
        </div>
        <details class="ir-inspector">
          <summary><span>Visual IR Inspector</span><small>schema / evidence / confidence / unknown states</small></summary>
          <pre id="director-ir" tabindex="0"></pre>
        </details>
      </div>`;
    hero.insertAdjacentElement('afterend', section);

    const input = $('#director-brief-input');
    input.value = demos.A;
    $('#director-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      runDirection(input.value);
    });
    $$('[data-director-demo]').forEach((button) => button.addEventListener('click', () => {
      input.value = demos[button.dataset.directorDemo];
      $$('[data-director-demo]').forEach((item) => item.classList.toggle('is-active', item === button));
      runDirection(input.value);
    }));
  }

  function renderSummary(ir, compiled) {
    const validation = typeof validateVisualIR === 'function' ? validateVisualIR(ir) : { valid: true, errors: [] };
    const output = $('#director-output');
    if (!output) return;
    output.hidden = false;
    $('#director-empty')?.setAttribute('hidden', '');

    text('#director-verb', `${valueOf(ir.narrative.verb)} / ${valueOf(ir.narrative.state)}`);
    text('#director-grammar', valueOf(ir.world.grammarId));
    text('#director-confidence', `${Math.round((ir.world.confidence || 0) * 100)}% grammar confidence`);
    text('#director-primary', valueOf(ir.character.primaryVariable));
    text('#director-agency', `Agency · ${valueOf(ir.agency.mode)}`);
    text('#director-world', valueOf(ir.world.relation));
    text('#director-world-thesis', valueOf(ir.world.thesis));
    text('#director-composition', `${valueOf(ir.composition.shotSize)} / ${valueOf(ir.composition.subjectScale)}`);
    text('#director-staging', `${valueOf(ir.composition.negativeSpace)} negative space · ${valueOf(ir.composition.direction)}`);
    text('#director-camera', valueOf(ir.camera.allegiance));
    text('#director-camera-behavior', valueOf(ir.camera.behavior));
    text('#director-color', valueOf(ir.color.ownershipMode));
    text('#director-color-boundary', valueOf(ir.color.boundary));
    text('#director-edge', valueOf(ir.edge.policy));
    text('#director-detail', `Environment · ${valueOf(ir.detail.environment)}`);
    text('#director-medium', valueOf(ir.medium.ownership));
    text('#director-medium-behavior', `${valueOf(ir.medium.character)} / host contamination: ${String(ir.medium.hostContamination)}`);
    text('#director-temporal', ir.temporal.evidenceStatus);
    text('#director-temporal-copy', `${valueOf(ir.temporal.signature)} · confidence ${Math.round((ir.temporal.confidence || 0) * 100)}%`);

    const anti = $('#director-anti-rules');
    if (anti) anti.innerHTML = ir.antiRules.map((rule) => `<span>${escapeHtml(rule)}</span>`).join('');
    const prompt = $('#director-prompt'); if (prompt) prompt.textContent = compiled.prompt;
    const inspector = $('#director-ir'); if (inspector) inspector.textContent = JSON.stringify(ir, null, 2);

    output.dataset.valid = String(validation.valid);
    if (!validation.valid) console.warn('[Visual Direction OS] Visual IR validation:', validation.errors);
  }

  function stateFor(ir, stateName) {
    return ir?.character?.stateMachine?.[stateName] || null;
  }

  function renderState(stateName) {
    if (!activeIR) return;
    const data = stateFor(activeIR, stateName);
    if (!data) return;
    $$('.state-machine button').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.state === stateName)));
    text('#state-variable', data.variable);
    text('#state-camera', data.camera);
    text('#state-readability', data.readability);
    text('#state-trigger', data.trigger);
    text('#state-owner', data.owner);
    const marker = $('.state-gauge b'); if (marker) { marker.style.left = data.x; marker.style.top = data.y; }
  }

  function renderCompatibility() {
    if (!activeIR) return;
    const primary = valueOf(activeIR.character.primaryVariable);
    const character = primary === 'Time / Medium' ? 'Time' : primary === 'Boundary' ? 'Boundary' : primary === 'Space' ? 'Space' : 'Focus';
    const relation = valueOf(activeIR.world.relation);
    $$('.compatibility-matrix button').forEach((item) => item.setAttribute('aria-pressed', String(item.dataset.character === character && item.dataset.mode === relation)));
    text('#matrix-character', character.toUpperCase());
    text('#matrix-mode', relation.toUpperCase());
    text('#matrix-headline', `${valueOf(activeIR.world.thesis)} × ${primary}`);
    text('#matrix-copy', `Active Visual IR maps this brief to ${relation}. ${valueOf(activeIR.composition.staging)} The host remains governed by its own grammar unless ownership explicitly transfers.`);
    text('#matrix-action', relation === 'Rewrite' ? 'Transforms' : relation === 'Resist' ? 'Constrains' : relation === 'Destabilize' ? 'Disables' : relation === 'Amplify' ? 'Magnifies' : 'Supports');
    text('#matrix-risk', relation === 'Rewrite' ? 'Resolved' : relation === 'Destabilize' ? 'High' : relation === 'Resist' ? 'Moderate' : 'Low');
  }

  function renderBeat(index) {
    if (!activeIR) return;
    const beats = activeIR.temporal.sequence || [];
    const safe = clamp(Number(index) || 0, 0, Math.max(0, beats.length - 1));
    const data = beats[safe];
    if (!data) return;
    $$('.beat-tabs button').forEach((item) => item.setAttribute('aria-selected', String(Number(item.dataset.beat) === safe)));
    text('#beat-phase', data.phase); text('#beat-verb', data.verb); text('#beat-lead', data.lead); text('#beat-support', data.support); text('#beat-silent', data.silent); text('#beat-owner', data.owner);
    ['space', 'color', 'camera', 'load', 'agency'].forEach((name, i) => {
      const amount = data.values?.[i] ?? 0;
      const bar = $(`[data-bar="${name}"]`); if (bar) bar.style.setProperty('--value', `${amount}%`);
      text(`[data-value="${name}"]`, amount);
    });
  }

  function territoryFrames(ir) {
    const owner = valueOf(ir.color.ownershipMode);
    const boundary = valueOf(ir.color.boundary);
    const migration = valueOf(ir.color.migration);
    const primary = valueOf(ir.character.primaryVariable);
    const relation = valueOf(ir.world.relation);
    return [
      { index: 'BEAT 01 / BASELINE OWNERSHIP', verb: 'Establish', copy: `Establish ${owner} ownership before any break. The host grammar remains legible and identity anchors are protected.`, owner: 'World / baseline', boundary, migration: 'Baseline → contact', residue: 'None', desc: `Baseline ownership map for ${primary}.` },
      { index: 'BEAT 02 / PRESSURE', verb: relation === 'Rewrite' ? 'Contest' : 'Resist', copy: `The ${primary} mechanism meets ${relation.toLowerCase()} pressure. Color changes are assigned by owner rather than applied as a global mood wash.`, owner: 'Contested', boundary, migration, residue: 'Relationship / conflict trace', desc: `Pressure territory for ${primary}; ownership is contested.` },
      { index: 'BEAT 03 / RULE FAILURE', verb: 'Break', copy: `Crisis attacks the character-specific rule instead of increasing generic visual noise. Keep the highest-order identity anchors readable.`, owner: 'Rule failure', boundary: 'Contradictory / unstable', migration, residue: 'Controlled contamination only', desc: `Rule-failure territory for ${primary}.` },
      { index: 'BEAT 04 / OWNERSHIP SHIFT', verb: 'Claim', copy: `${valueOf(ir.agency.mode)} becomes the source of visual organization. Global FX remain disabled; any event is local to a justified owner.`, owner: 'Character', boundary, migration, residue: 'Ownership transfer', desc: `Character ownership expands according to ${valueOf(ir.agency.mode)}.` },
      { index: 'BEAT 05 / BASELINE B', verb: 'Remain', copy: `Resolution preserves residue from the ownership transfer without resetting to the original baseline or contaminating every layer.`, owner: 'Character + world', boundary: 'Negotiated', migration: 'Event → shared residue', residue: 'Baseline B', desc: `Negotiated Baseline B territory for ${primary}.` }
    ];
  }

  function renderTerritory(index) {
    if (!activeIR) return;
    const frames = territoryFrames(activeIR);
    const safe = clamp(Number(index) || 0, 0, frames.length - 1);
    const data = frames[safe];
    $$('.territory-controls button').forEach((item) => item.setAttribute('aria-pressed', String(Number(item.dataset.territory) === safe)));
    const frame = $('.territory-frame'); if (frame) frame.dataset.territoryFrame = String(safe);
    text('#territory-index', data.index); text('#territory-verb', data.verb); text('#territory-copy', data.copy); text('#territory-owner', data.owner); text('#territory-boundary', data.boundary); text('#territory-migration', data.migration); text('#territory-residue', data.residue); text('#territory-frame-desc', data.desc);
  }

  function syncExistingUI(ir) {
    const activeState = valueOf(ir.state.active, 'baseline');
    renderState(activeState);
    renderCompatibility();
    const stateBeat = { baseline: 0, pressure: 2, crisis: 3, decision: 4, agency: 5, resolution: 6 };
    renderBeat(stateBeat[activeState] ?? 0);
    const stateTerritory = { baseline: 0, pressure: 1, crisis: 2, decision: 3, agency: 3, resolution: 4 };
    renderTerritory(stateTerritory[activeState] ?? 0);
  }

  function installRuntimeBridges() {
    $('.state-machine')?.addEventListener('click', (event) => {
      if (!activeIR) return;
      const button = event.target.closest('button[data-state]');
      if (!button) return;
      event.stopImmediatePropagation();
      renderState(button.dataset.state);
    }, true);

    $('.beat-tabs')?.addEventListener('click', (event) => {
      if (!activeIR) return;
      const button = event.target.closest('button[data-beat]');
      if (!button) return;
      event.stopImmediatePropagation();
      renderBeat(Number(button.dataset.beat));
    }, true);

    $('.territory-controls')?.addEventListener('click', (event) => {
      if (!activeIR) return;
      const button = event.target.closest('button[data-territory]');
      if (!button) return;
      event.stopImmediatePropagation();
      renderTerritory(Number(button.dataset.territory));
    }, true);
  }

  function runDirection(rawBrief) {
    const brief = String(rawBrief || '').trim();
    if (!brief) {
      $('#director-brief-input')?.focus();
      return;
    }
    const ir = directBrief(brief);
    const compiled = compileVisualIR(ir);
    activeIR = ir;
    activeCompiled = compiled;
    root.VisualDirectionOS = Object.assign(root.VisualDirectionOS || {}, { activeIR, activeCompiled, direct: runDirection });
    renderSummary(ir, compiled);
    syncExistingUI(ir);
    $('#director-output')?.scrollIntoView({ behavior: root.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }

  buildConsole();
  installRuntimeBridges();
  root.VisualDirectionOS = Object.assign(root.VisualDirectionOS || {}, { activeIR, activeCompiled, direct: runDirection, demos });
})(typeof globalThis !== 'undefined' ? globalThis : window);
