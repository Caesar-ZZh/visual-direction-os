(function attachGrammarRegistry(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function grammarFactory() {
  'use strict';

  const grammarRegistry = {
    'boundary-relational': {
      id: 'boundary-relational',
      label: 'Relational Boundary System',
      mechanismReference: 'boundary-driven relationship grammar',
      primaryVariable: 'Boundary',
      conditions: ['relational isolation', 'intimacy conflict', 'withdrawal', 'protected vulnerability'],
      preferredMechanisms: ['negative-space ownership', 'selective lost edges', 'relational color territory', 'environment suppression'],
      protectedAnchors: ['silhouette', 'face landmarks', 'gesture line'],
      allowedBreaks: ['environment edge loss', 'physical description suppression', 'relational color override'],
      antiRules: ['no global watercolor filter', 'no fixed emotion palette', 'no uniform comic outline', 'no full-frame FX leakage'],
      evidence: { status: 'calibrated', confidence: 0.91, tags: ['earth65-relational-corpus', 'boundary-ownership', 'environment-suppression'] },
      temporal: { evidenceStatus: 'supported', confidence: 0.78 }
    },
    'spatial-authorship': {
      id: 'spatial-authorship',
      label: 'Spatial Authorship System',
      mechanismReference: 'route-creation and authored-space grammar',
      primaryVariable: 'Space',
      conditions: ['route creation', 'freedom conflict', 'movement through infrastructure', 'self-directed escape'],
      preferredMechanisms: ['hero-direction uniqueness', 'route legibility', 'environmental infrastructure', 'predictive framing'],
      protectedAnchors: ['silhouette', 'direction vector', 'compact accent mark'],
      allowedBreaks: ['local authored surfaces', 'directional deformation', 'camera anticipation'],
      antiRules: ['no global graffiti treatment', 'no random motion directions', 'no background detail equalization', 'no full-frame anomaly contamination'],
      evidence: { status: 'calibrated', confidence: 0.9, tags: ['brooklyn-authorship-corpus', 'route-ownership', 'host-autonomy'] },
      temporal: { evidenceStatus: 'supported', confidence: 0.8 }
    },
    'medium-locality': {
      id: 'medium-locality',
      label: 'Local Heterogeneous Medium System',
      mechanismReference: 'character-owned medium independence',
      primaryVariable: 'Time / Medium',
      conditions: ['nonconformity', 'institutional contrast', 'medium independence', 'refusal to visually assimilate'],
      preferredMechanisms: ['character-local collage', 'print/xerox heterogeneity', 'typography as spatial material', 'host autonomy'],
      protectedAnchors: ['dark value skeleton', 'silhouette', 'global gesture'],
      allowedBreaks: ['local registration mismatch', 'character-owned type', 'medium layer divergence'],
      antiRules: ['no global collage treatment', 'no host medium contamination', 'no random texture everywhere', 'no forced synchronization'],
      evidence: { status: 'calibrated', confidence: 0.89, tags: ['hobie-medium-locality-corpus', 'host-autonomy', 'typography-material'] },
      temporal: { evidenceStatus: 'evidence_incomplete', confidence: 0.42 }
    },
    'institutional-authority': {
      id: 'institutional-authority',
      label: 'Institutional Authority System',
      mechanismReference: 'role-space and system-owned information grammar',
      primaryVariable: 'Focus',
      conditions: ['institutional authority', 'regulated attention', 'role hierarchy', 'system pressure'],
      preferredMechanisms: ['vertical authority architecture', 'role-space', 'system-owned UI', 'density partition'],
      protectedAnchors: ['hero silhouette', 'role distinction', 'primary read'],
      allowedBreaks: ['proxy-object authority', 'system color fields', 'information-density zoning'],
      antiRules: ['no hologram-by-default', 'no uniform information density', 'no cyberpunk-neon shortcut', 'no maximum-noise authority'],
      evidence: { status: 'calibrated', confidence: 0.87, tags: ['spider-society-authority-corpus', 'role-space', 'proxy-authority'] },
      temporal: { evidenceStatus: 'supported', confidence: 0.71 }
    }
  };

  function getGrammar(id) { return grammarRegistry[id] || null; }
  function listGrammars() { return Object.values(grammarRegistry); }

  return { grammarRegistry, getGrammar, listGrammars };
});
