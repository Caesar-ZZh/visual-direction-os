((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSNarrativeDemoFixtures = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';
  const grounded = (value, sourceType, basis) => ({ value, sourceType, basis });
  const interpret = {
    signal: 'strong',
    readings: [
      {
        id: 'reading-agency', title: 'AGENCY RECOVERY', confidence: 'high',
        narrativeProblem: grounded('An assigned role is revealed as a mechanism of control.', 'inferred', 'The scene shifts when the character recognizes the assignment as control.'),
        coreConflict: grounded('External authority versus self-determination.', 'inferred', 'Acceptance changes into refusal.'),
        startingState: grounded('The character expects to comply with the assignment.', 'explicit', 'The scene begins with acceptance of the task.'),
        endingState: grounded('The character leaves after making an independent decision.', 'director_intent', 'The Director Intent asks for reclaimed control.'),
        turningPoint: grounded('The character realizes the assignment itself is control.', 'explicit', 'The realization is stated in the scene description.'),
        agencyTransition: { value: ['world','contested','character'], sourceType: 'inferred', basis: 'Authority begins external, becomes contested, then transfers to the character.' }
      },
      {
        id: 'reading-rupture', title: 'INSTITUTIONAL RUPTURE', confidence: 'medium',
        narrativeProblem: grounded('A functional relationship becomes an explicit break with an institution.', 'inferred', 'The refusal converts a routine assignment into rupture.'),
        coreConflict: grounded('Institutional continuity versus personal refusal.', 'inferred', 'The scene ends by breaking the expected relationship.'),
        startingState: grounded('The institution defines the available role.', 'inferred', 'The assignment is presented as a given.'),
        endingState: grounded('The relationship is left unresolved after refusal.', 'inferred', 'Leaving resolves the immediate action but not the institution.'),
        turningPoint: grounded('The task changes meaning from work to control.', 'explicit', 'The character recognizes the controlling function.'),
        agencyTransition: { value: ['world','contested','character'], sourceType: 'inferred', basis: 'The refusal transfers immediate decision authority to the character.' }
      }
    ],
    clarification: null
  };
  const strategy = { strategies: [
    { id:'space', title:'SPACE-LED', grammarId:'spatial-authorship', primaryVariable:'space', supportingVariables:['camera','color'], restrainedVariables:['texture','rhythm'], mechanism:'Let environmental compression embody external authority before opening after refusal.', rationale:'The conflict first becomes visible as loss and recovery of freedom.' },
    { id:'camera', title:'CAMERA-LED', grammarId:'camera-authority-transfer', primaryVariable:'camera', supportingVariables:['space','line'], restrainedVariables:['color'], mechanism:'Keep viewpoint institution-led until the recognition beat, then transfer framing authority.', rationale:'Who defines perspective directly expresses the scene’s agency conflict.' },
    { id:'color', title:'COLOR OWNERSHIP', grammarId:'color-ownership-transfer', primaryVariable:'color', supportingVariables:['camera','texture'], restrainedVariables:['rhythm'], mechanism:'Move color territory from environment to contested space and finally to the character.', rationale:'Ownership can change without reducing the scene to warm-versus-cool mood.' }
  ] };

  const completionData = [
    ['setup','The character enters expecting to accept the assignment.','world',[],{ownership:{world:'high'},variables:{camera:{distance:'wide',stability:'high'},line:{density:'low'}}}],
    ['pressure','The conversation increasingly limits the character’s perceived freedom.','world',['PRESSURE ACCUMULATES'],{ownership:{world:'high'},variables:{camera:{distance:'medium',stability:'medium'},line:{density:'high'}}}],
    ['rupture','The character recognizes that the assignment itself is control.','contested',['CAMERA BREAK'],{ownership:{world:'medium',character:'medium'},variables:{camera:{distance:'close',stability:'low'},line:{direction:'fractured'}}}],
    ['release','The character stops accepting the institutional frame.','contested',['AGENCY TRANSFER'],{ownership:{world:'low',character:'medium'},variables:{camera:{movement:'forward',stability:'medium'}}}],
    ['new-ownership','The character leaves after defining the next action.','character',['OWNERSHIP SHIFT'],{ownership:{character:'high',world:'low'},variables:{camera:{distance:'medium',stability:'high'},line:{density:'low'}}}]
  ];
  const sequence = { sequenceCompletion: { beats: completionData.map(([id,narrativeBeat,agency,visualEvents,openPatch]) => ({
    id, narrativeBeat, agency, visualEvents, openPatch,
    rationale: `${id.toUpperCase()} completes only AI-open slots while compiler-owned fields stay absent from the raw completion.`
  })) } };

  // Legacy fixture remains available for focused M3/M4/downstream compatibility tests.
  const legacyBeatData = [
    ['setup','SETUP','The character enters expecting to accept the assignment.','world','camera',['space'],['texture'],[],{agency:'world',variables:{camera:{perspective:'world',stability:'high'},space:{compression:'low'},color:{territory:'world'}}}],
    ['pressure','PRESSURE','The conversation increasingly limits the character’s perceived freedom.','world','space',['camera','line'],['texture','rhythm'],['SPACE COMPRESSION'],{agency:'world',variables:{space:{compression:'high'},camera:{perspective:'world',stability:'medium'}}}],
    ['rupture','RUPTURE','The character recognizes that the assignment itself is control.','contested','camera',['space','color'],['rhythm'],['CAMERA BREAK','COLOR MIGRATION'],{agency:'contested',variables:{camera:{perspective:'mixed',stability:'low'},color:{territory:'contested'}}}],
    ['release','RELEASE','The character stops accepting the institutional frame.','contested','camera',['space'],['texture','rhythm'],['AGENCY TRANSFER'],{agency:'contested',variables:{space:{compression:'low'},camera:{perspective:'mixed',stability:'medium'}}}],
    ['new-ownership','NEW OWNERSHIP','The character leaves after defining the next action.','character','agency',['camera','color'],['texture','rhythm'],['OWNERSHIP SHIFT'],{agency:'character',variables:{camera:{perspective:'character'},color:{territory:'character'}}}]
  ];
  const legacySequence = { sequenceProposal: { beats: legacyBeatData.map(([id,label,narrativeBeat,agency,primaryVariable,supportingVariables,restrainedVariables,visualEvents,sceneStatePatch]) => ({
    id, label, narrativeBeat, agency, primaryVariable, supportingVariables, restrainedVariables, visualEvents, sceneStatePatch,
    rationale: `${label} advances the selected directing mechanism without letting every variable peak at once.`
  })) } };

  return { interpret, strategy, sequence, legacySequence };
});

(() => {
  if (typeof document === 'undefined') return;
  const load = (src, globalName) => {
    if (window[globalName]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => window[globalName] ? resolve() : reject(new Error(`${globalName} unavailable after ${src}`));
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  };
  load('narrative-apply.js?v=20260817-1928', 'VDOSNarrativeApply')
    .then(() => load('narrative-apply-ui.js?v=20260817-1928', 'VDOSNarrativeApplyUI'))
    .catch(error => console.error(error));
})();