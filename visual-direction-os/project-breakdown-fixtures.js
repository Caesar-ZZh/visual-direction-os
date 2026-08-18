((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectBreakdownFixtures = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';
  const breakdown = {
    projectReading: {
      narrativeProblem: 'Compliance gradually becomes recognition of control.',
      coreConflict: 'Institutional order versus personal agency.',
      startingState: 'The system defines the available decisions.',
      endingState: 'The character acts outside the system-defined role.',
      agencyArc: ['world','contested','character']
    },
    scenes: [
      {
        id:'proposal-scene-01', title:'COMPLIANCE', role:'setup',
        narrativeFunction:'Establish willing participation inside the institutional order.',
        startingState:'The system is accepted as normal.', endingState:'The character accepts the assignment.',
        turningPoint:'The assignment becomes personally binding.', agencyTransition:['world','world'], relationToPrevious:null,
        sourceBasis:'The opening presents the assignment as routine work.',
        breakBasis:'The first scene establishes the baseline before the meaning of the assignment changes.'
      },
      {
        id:'proposal-scene-02', title:'RECOGNITION', role:'recognition',
        narrativeFunction:'Turn routine compliance into awareness that the assignment is a form of control.',
        startingState:'The character still operates inside the expected role.', endingState:'The role is understood as coercive.',
        turningPoint:'A detail in the conversation changes the meaning of the assignment.', agencyTransition:['world','contested'], relationToPrevious:'Routine acceptance becomes active interpretation.',
        sourceBasis:'The character notices that refusal is not treated as a real option.',
        breakBasis:'The governing state changes from unexamined compliance to contested meaning.'
      },
      {
        id:'proposal-scene-03', title:'REFUSAL', role:'rupture',
        narrativeFunction:'Convert recognition into explicit action against the expected role.',
        startingState:'Agency is contested but the system still expects compliance.', endingState:'The character openly refuses the assignment.',
        turningPoint:'The character states that the assignment itself is the mechanism of control.', agencyTransition:['contested','character'], relationToPrevious:'Recognition becomes action.',
        sourceBasis:'The story explicitly describes a refusal after the realization.',
        breakBasis:'The character moves from interpreting control to acting against it.'
      },
      {
        id:'proposal-scene-04', title:'EXIT', role:'resolution',
        narrativeFunction:'Establish the consequence of acting from self-authored agency.',
        startingState:'The relationship with the institution has been ruptured.', endingState:'The character leaves under a self-defined next action.',
        turningPoint:'Leaving becomes a chosen action rather than an imposed outcome.', agencyTransition:['character','character'], relationToPrevious:'Refusal becomes a new operating state.',
        sourceBasis:'The story ends with the character leaving after refusing.',
        breakBasis:'The final scene resolves the immediate ownership question without returning control to the institution.'
      }
    ]
  };
  return { breakdown };
});
