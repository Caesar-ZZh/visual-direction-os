(function attachDecisionEngine(root, factory) {
  let deps;
  if (typeof module !== 'undefined' && module.exports) {
    deps = Object.assign({}, require('./visual-ir.js'), require('./grammar-registry.js'), require('./narrative-interpreter.js'));
    module.exports = factory(deps);
  } else if (root) {
    const api = factory(root.VisualDirectionRuntime || {});
    root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function decisionFactory(runtime) {
  'use strict';

  const { createDefaultVisualIR, signal, getGrammar, interpretNarrative } = runtime;
  const positions = { baseline:['50%','50%'], pressure:['58%','44%'], crisis:['36%','66%'], decision:['50%','34%'], agency:['72%','32%'], resolution:['78%','62%'] };
  const owners = { baseline:'WORLD / SYSTEM', pressure:'CONTESTED', crisis:'RULE FAILURE', decision:'IN TRANSFER', agency:'CHARACTER', resolution:'CHARACTER + WORLD' };
  const verbs = { baseline:'ESTABLISH', pressure:'CONTEST', crisis:'FAIL', decision:'CHOOSE', agency:'OWN', resolution:'STABILIZE' };

  const profiles = {
    'boundary-relational': {
      composition: ['wide','small','high','distance held by empty field and foreground separation','isolated subject; relationship carried by scale, occlusion and negative space'],
      camera: ['neutral witness leaning toward character','restrained eye-level or slightly distant','stable geometry; psychological distance may override physical distance','low energy; do not dramatize isolation with spectacle'],
      color: ['relational',{world:'pale field / large area',character:'compact cool territory',relationship:'conditional bridge',fixedPalette:false},'soft/lost environment; selective hard identity anchors','relationship field may approach or retreat from character; no fixed emotion hue','restrained; reserve saturation for relational event'],
      edge: ['protect silhouette + face landmarks','environmental edge loss allowed','hard/soft/lost edges carry relational condition'],
      detail: ['selective identity detail','strongly suppressed','low around subject; absence is active structure'],
      medium: ['controlled graphic readability','permeable painterly behavior without global filter','split / relational','none unless scene evidence requires it'],
      texture: 'quiet field texture only where it supports spatial/emotional permeability',
      leads: ['relational distance','edge tension','negative-space pressure','boundary contradiction','environment suppression','chosen boundary','negotiated field']
    },
    'spatial-authorship': {
      composition: ['wide-to-medium dynamic','medium; never lost inside density','directional corridors','hero creates a legible route against crowd flow','cluster complexity; preserve one authored movement vector'],
      camera: ['character-aligned','route-revealing oblique perspective','deep navigable Z-space','predictive framing anticipates chosen route'],
      color: ['layered ownership',{world:'city baseline',character:'compact identity accent',route:'local authored trace',fixedPalette:false},'character/route accents remain local','authored trace follows route, not entire host world','functional accents only'],
      edge: ['silhouette + direction vector protected','infrastructure readable in large groups','route edges outrank incidental city texture'],
      detail: ['hero readability protected under density','clustered, not uniform','high but zoned; route corridor remains readable'],
      medium: ['authored surface marks may appear locally','autonomous city baseline','character-local authorship over stable host','optional local city information, never global decoration'],
      texture: 'authored marks restricted to meaningful route surfaces',
      leads: ['route field','direction conflict','path compression','route failure','visual silence','authored route','shared infrastructure']
    },
    'medium-locality': {
      composition: ['medium-wide','clear singular figure inside orderly host','host grid remains legible around character','character gesture cuts across institutional alignment','contrast character-local heterogeneity with host regularity'],
      camera: ['witness character without converting host into character style','stable institutional axis with local character interruption','host geometry remains coherent','camera remains comparatively disciplined'],
      color: ['owner-local',{host:'orderly system field',character:'independent local field',typography:'character-local when used',fixedPalette:false},'clear ownership boundary between host and character','no automatic host contamination','independent from host; hierarchy before palette'],
      edge: ['stable dark skeleton + coherent silhouette','host remains regular and self-consistent','heterogeneous local edges do not become a full-frame rule'],
      detail: ['heterogeneous local detail','orderly host detail','partitioned by owner'],
      medium: ['heterogeneous print / collage / xerox-like behaviors','stable host medium','character_local','spatial material permitted locally'],
      texture: 'multiple local material frequencies; host remains autonomous',
      leads: ['host regularity','local medium contrast','normalization pressure','forced sync','registration pause','chosen divergence','host + character coexistence']
    },
    'institutional-authority': {
      composition: ['wide institutional role-space','role-dependent','vertical separation / controlled lanes','authority encoded through vertical architecture and assigned routes','information density partitioned by role'],
      camera: ['system-aware / role-sensitive','vertical authority bias','large scale with constrained route ownership','controlled, not spectacle-first'],
      color: ['system-owned fields with role exceptions',{system:'dominant regulated field',role:'assigned local zones',character:'contested exception',fixedPalette:false},'architectural / role-space boundaries','system markers remain semantically assigned','controlled'],
      edge: ['primary role read protected','modular structural clarity','hierarchy follows role-space'],
      detail: ['role-significant detail only','dense but partitioned','zoned by authority and function'],
      medium: ['host-compliant unless narrative requires deviation','system-consistent','system / role-space','system information only where functional'],
      texture: 'restrained; density comes from information organization, not noise',
      leads: ['role hierarchy','assigned attention','system pressure','focus failure','visual silence','self-directed focus','plural hierarchy']
    }
  };

  function makeStateMachine(primary, activeState, agencyMode) {
    return Object.fromEntries(Object.keys(owners).map((state) => [state, {
      variable: `${primary} / ${verbs[state]}`,
      camera: state === 'agency' ? 'Character-led / predictive' : state === 'crisis' ? 'Reference becomes unreliable' : 'Measured witness / controlled relation',
      readability: state === 'crisis' ? 'Backup identity anchors compensate' : 'Primary anchor remains protected',
      trigger: state === activeState ? `ACTIVE — ${agencyMode}` : `${verbs[state]} condition`,
      owner: owners[state], x: positions[state][0], y: positions[state][1]
    }]));
  }

  function makeSequence(primary, activeState, leads) {
    const beatVerbs = ['ESTABLISH','CONTACT','PRESSURE','FAIL','WITHHOLD','CLAIM','BASELINE B'];
    const beatOwners = ['World','Contested','System','Rule failure','In transfer','Character','Character + world'];
    const values = [[24,32,20,30,10],[38,44,28,48,20],[64,58,52,68,18],[80,62,76,88,8],[18,12,8,12,34],[50,54,66,42,92],[64,48,52,58,84]];
    const states = ['baseline','pressure','pressure','crisis','decision','agency','resolution'];
    return leads.map((lead, index) => ({
      phase: `${index + 1}/7 · ${index === 0 ? 'BASELINE' : index === 6 ? 'RESOLUTION' : beatVerbs[index]}`,
      verb: beatVerbs[index], lead, support: `${primary} support · protected anchors`,
      silent: index === 4 ? 'texture · color diversity · camera energy' : 'non-leading surface effects',
      owner: beatOwners[index], values: values[index], active: states[index] === activeState
    }));
  }

  function applyProfile(ir, profile, grammar) {
    const [shotSize, subjectScale, negativeSpace, direction, staging] = profile.composition;
    ir.composition.shotSize = signal(shotSize,.9,'calibrated','resolved');
    ir.composition.subjectScale = signal(subjectScale,.9,'calibrated','resolved');
    ir.composition.negativeSpace = signal(negativeSpace,.9,'calibrated','resolved');
    ir.composition.direction = signal(direction,.9,'calibrated','resolved');
    ir.composition.staging = signal(staging,.9,'calibrated','resolved');
    [ir.camera.allegiance, ir.camera.angle, ir.camera.projection, ir.camera.behavior] = profile.camera.map((v) => signal(v,.84,'supported','resolved'));
    ir.color.ownershipMode = signal(profile.color[0],.9,'calibrated','resolved');
    ir.color.territory = profile.color[1];
    ir.color.boundary = signal(profile.color[2],.9,'calibrated','resolved');
    ir.color.migration = signal(profile.color[3],.9,'calibrated','resolved');
    ir.color.saturation = signal(profile.color[4],.8,'supported','resolved');
    [ir.edge.character, ir.edge.environment, ir.edge.policy] = profile.edge.map((v) => signal(v,.92,'calibrated','resolved'));
    [ir.detail.character, ir.detail.environment, ir.detail.informationDensity] = profile.detail.map((v) => signal(v,.9,'calibrated','resolved'));
    ir.medium.character = signal(profile.medium[0],.9,'calibrated','resolved');
    ir.medium.world = signal(profile.medium[1],.9,'calibrated','resolved');
    ir.medium.ownership = signal(profile.medium[2],.94,'calibrated','resolved');
    ir.medium.typography = signal(profile.medium[3],.82,'supported','resolved');
    ir.medium.hostContamination = false;
    ir.texture.behavior = signal(profile.texture,.86,'supported','resolved');
    ir.temporal.evidenceStatus = grammar.temporal.evidenceStatus;
    ir.temporal.confidence = grammar.temporal.confidence;
    ir.temporal.signature = grammar.temporal.evidenceStatus === 'evidence_incomplete'
      ? signal('evidence incomplete — do not invent cadence', grammar.temporal.confidence, 'evidence_incomplete', 'incomplete')
      : signal('state transitions follow ownership arc; shot-to-shot cadence remains conservative', grammar.temporal.confidence, grammar.temporal.evidenceStatus, 'resolved');
  }

  function directBrief(rawBrief) {
    const interpretation = interpretNarrative(rawBrief);
    const grammar = getGrammar(interpretation.grammarId);
    const ir = createDefaultVisualIR(rawBrief);
    const c = interpretation.confidence;
    const profile = profiles[grammar.id];
    ir.metadata.generatedAt = new Date().toISOString();
    ir.narrative.verb = signal(interpretation.narrativeVerb,c,'heuristic','resolved');
    ir.narrative.state = signal(interpretation.narrativeState,c,'heuristic','resolved');
    ir.narrative.relationshipState = signal(interpretation.relationshipState,c,'heuristic','resolved');
    ir.narrative.intensity = signal(interpretation.intensity,c,'heuristic','resolved');
    ir.narrative.shotIntent = signal(interpretation.shotIntent,c,'heuristic','resolved');
    ir.character.archetype = signal(grammar.label,grammar.evidence.confidence,grammar.evidence.status,'resolved');
    ir.character.primaryVariable = signal(interpretation.primaryVariable,c,'heuristic','resolved');
    ir.character.secondaryVariables = grammar.preferredMechanisms.slice(0,3);
    ir.character.anchors = grammar.protectedAnchors.slice();
    ir.character.stateMachine = makeStateMachine(interpretation.primaryVariable,interpretation.narrativeState,interpretation.agencyMode);
    ir.character.evidenceStatus = grammar.evidence.status; ir.character.confidence = grammar.evidence.confidence;
    ir.world.grammarId = signal(grammar.id,grammar.evidence.confidence,grammar.evidence.status,'resolved');
    ir.world.thesis = signal(grammar.mechanismReference,grammar.evidence.confidence,grammar.evidence.status,'resolved');
    ir.world.relation = signal(interpretation.worldRelation,c,'heuristic','resolved');
    ir.world.stability = signal(grammar.id === 'medium-locality' ? 'host stable / character locally divergent' : 'stable baseline under narrative pressure',.78,'supported','resolved');
    ir.world.evidenceStatus = grammar.evidence.status; ir.world.confidence = grammar.evidence.confidence;
    ir.state.active = signal(interpretation.narrativeState,c,'heuristic','resolved');
    applyProfile(ir,profile,grammar);
    ir.hierarchy.reads = [`1. character / ${grammar.protectedAnchors[0]}`,`2. ${interpretation.primaryVariable} mechanism`,`3. world relation / ${interpretation.worldRelation}`];
    ir.hierarchy.protected = grammar.protectedAnchors.slice();
    ir.shape.behavior = signal(interpretation.primaryVariable === 'Space' ? 'directional path-readable masses' : interpretation.primaryVariable === 'Boundary' ? 'few large relational fields' : interpretation.primaryVariable === 'Time / Medium' ? 'stable global silhouette with local heterogeneity' : 'role-readable large shapes',.85,grammar.evidence.status,'resolved');
    ir.shape.anchors = grammar.protectedAnchors.slice();
    ir.value.structure = signal('large value families first; surface enrichment subordinate',.9,'knowledge-base','resolved');
    ir.value.contrastBudget = signal('highest contrast belongs to primary read',.92,'knowledge-base','resolved');
    ir.fx.global = false;
    ir.fx.localOwners = grammar.id === 'medium-locality' ? ['character'] : grammar.id === 'spatial-authorship' ? ['character-authored surfaces','event-local route traces'] : grammar.id === 'boundary-relational' ? ['relationship state when justified'] : ['system markers when functional'];
    ir.fx.notes = ['effects require an owner','no unowned full-frame style filter'];
    ir.temporal.sequence = makeSequence(interpretation.primaryVariable,interpretation.narrativeState,profile.leads);
    ir.agency.mode = signal(interpretation.agencyMode,c,'heuristic','resolved');
    ir.agency.owner = signal(interpretation.narrativeState === 'agency' ? 'character' : 'contested',c,'heuristic','resolved');
    ir.agency.trajectory = signal('world/system → conflict → character → negotiated Baseline B',.9,'knowledge-base','resolved');
    ir.antiRules = grammar.antiRules.slice();
    ir.evidence.grammar = grammar.evidence.tags.slice();
    ir.evidence.rules = grammar.preferredMechanisms.map((rule) => ({ rule, confidence: grammar.evidence.confidence, evidenceStatus: grammar.evidence.status }));
    if (grammar.temporal.evidenceStatus === 'evidence_incomplete') ir.evidence.gaps.push({ field:'temporal.signature',status:'evidence_incomplete',confidence:grammar.temporal.confidence });
    return ir;
  }

  return { directBrief };
});
