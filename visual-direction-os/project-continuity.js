((root, factory) => {
  const arc = typeof module === 'object' && module.exports
    ? require('./project-arc.js')
    : root?.VDOSProjectArc;
  const api = factory(arc);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectContinuity = api;
})(typeof window !== 'undefined' ? window : globalThis, arc => {
  'use strict';

  if (!arc) throw new Error('VDOSProjectArc is required before project-continuity.js');
  const { deriveProjectArc } = arc;
  const AUTHORITY_SCORE = { WORLD:0, CONTESTED:1, CHARACTER:2 };
  const LEVEL_SCORE = { LOW:0, MEDIUM:1, HIGH:2 };
  const ROLE_CAUSE = new Set(['pressure','recognition','escalation','rupture','reversal','release','resolution']);

  const clone = value => JSON.parse(JSON.stringify(value));

  function expectedAgency(scene) {
    const transition = scene?.narrativeRole?.agencyTransition;
    const value = Array.isArray(transition) && transition.length ? transition[transition.length - 1] : null;
    if (value === 'world') return 'WORLD';
    if (value === 'character') return 'CHARACTER';
    if (['contested','shared'].includes(value)) return 'CONTESTED';
    return null;
  }

  function finding({ id, status, rule, sceneIds, title, detail }) {
    const boundary = sceneIds.length === 2 ? `${sceneIds[0]} → ${sceneIds[1]}` : sceneIds[0] || null;
    return { id, status, rule, sceneIds:sceneIds.slice(), boundary, title, detail };
  }

  function scoreDistance(a, b, table) {
    if (!(a in table) || !(b in table)) return null;
    return Math.abs(table[a] - table[b]);
  }

  function semanticChanges(a, b) {
    const pairs = [
      ['camera', a.cameraAuthority, b.cameraAuthority, AUTHORITY_SCORE],
      ['color', a.colorTerritory, b.colorTerritory, AUTHORITY_SCORE],
      ['space', a.spatialPressure, b.spatialPressure, LEVEL_SCORE],
      ['density', a.graphicDensity, b.graphicDensity, LEVEL_SCORE],
      ['rhythm', a.rhythmicEnergy, b.rhythmicEnergy, LEVEL_SCORE]
    ];
    return pairs.map(([key, from, to, table]) => ({ key, from, to, distance:scoreDistance(from, to, table) }));
  }

  function deriveContinuity(projectState = {}) {
    const project = clone(projectState);
    const arcState = deriveProjectArc(project);
    const findings = [];
    const order = Array.isArray(project.sceneOrder) ? project.sceneOrder : [];
    if (!order.length) return { status:'UNRESOLVED', findings:[] };

    order.forEach((id, index) => {
      const scene = project.scenes?.[id];
      const arcScene = arcState.scenes[index];
      if (!scene || scene.status?.visual !== 'directed') {
        findings.push(finding({
          id:`unresolved-${id}`,
          status:'UNRESOLVED',
          rule:'unresolved-scene',
          sceneIds:[id],
          title:'Scene has no confirmed visual direction',
          detail:`${scene?.title || id} cannot contribute visual continuity until it has been directed.`
        }));
        return;
      }
      const expected = expectedAgency(scene);
      if (expected && arcScene?.visualAgency && expected !== arcScene.visualAgency) {
        const severeFinalMismatch = index === order.length - 1 && scene.narrativeRole?.role === 'resolution' && expected === 'CHARACTER' && arcScene.visualAgency === 'WORLD';
        findings.push(finding({
          id:`agency-${id}`,
          status:severeFinalMismatch ? 'FAIL' : 'WARN',
          rule:'agency-alignment',
          sceneIds:[id],
          title:'Narrative agency and visual ownership diverge',
          detail:`Narrative intent resolves to ${expected}, while directed visual agency remains ${arcScene.visualAgency}.`
        }));
      }
    });

    for (let index = 1; index < order.length; index += 1) {
      const previousId = order[index - 1];
      const currentId = order[index];
      const previous = project.scenes?.[previousId];
      const current = project.scenes?.[currentId];
      const a = arcState.scenes[index - 1];
      const b = arcState.scenes[index];
      if (!previous || !current || previous.status?.visual !== 'directed' || current.status?.visual !== 'directed') continue;

      const changes = semanticChanges(a, b);
      const changed = changes.filter(item => item.distance != null && item.distance > 0);
      const maxJumps = changes.filter(item => item.distance === 2);
      const previousNarrativeEnd = expectedAgency(previous);
      const currentNarrativeEnd = expectedAgency(current);
      const narrativeAgencyChanged = previousNarrativeEnd && currentNarrativeEnd && previousNarrativeEnd !== currentNarrativeEnd;
      const currentRole = current.narrativeRole?.role;
      const hasNarrativeCause = narrativeAgencyChanged || ROLE_CAUSE.has(currentRole);

      const authorityJump = changes.some(item => ['camera','color'].includes(item.key) && item.distance === 2);
      if (authorityJump && !hasNarrativeCause) {
        findings.push(finding({
          id:`cause-${previousId}-${currentId}`,
          status:'WARN',
          rule:'change-without-narrative-cause',
          sceneIds:[previousId,currentId],
          title:'Visual authority changes without a corresponding narrative transition',
          detail:'A major Camera or Color ownership transfer occurs while the narrative structure does not register a comparable state change.'
        }));
      }

      if (['rupture','reversal'].includes(currentRole) && changed.length === 0) {
        findings.push(finding({
          id:`rupture-${previousId}-${currentId}`,
          status:'WARN',
          rule:'rupture-without-visual-response',
          sceneIds:[previousId,currentId],
          title:'Narrative rupture has no visible system response',
          detail:'The Scene boundary is structurally marked as rupture or reversal, but Camera, Color, Space, Density and Rhythm remain unchanged.'
        }));
      }

      if (maxJumps.length >= 4) {
        findings.push(finding({
          id:`peak-${previousId}-${currentId}`,
          status:'WARN',
          rule:'simultaneous-maximum-escalation',
          sceneIds:[previousId,currentId],
          title:'Multiple visual systems peak at the same boundary',
          detail:`${maxJumps.map(item => item.key.toUpperCase()).join(', ')} make maximum jumps together. Consider whether one system should lead the transition.`
        }));
      }
    }

    if (!findings.length && order.length) {
      findings.push(finding({
        id:'project-continuity-pass',
        status:'PASS',
        rule:'continuity-pass',
        sceneIds:order.slice(0, Math.min(2, order.length)),
        title:'Directed Scene relationships are explainably coherent',
        detail:'No v1 continuity rule found an unexplained mismatch in the currently directed Scenes.'
      }));
    }

    const precedence = { PASS:0, UNRESOLVED:1, WARN:2, FAIL:3 };
    const status = findings.reduce((current, item) => precedence[item.status] > precedence[current] ? item.status : current, 'PASS');
    return { status, findings };
  }

  return { deriveContinuity };
});
