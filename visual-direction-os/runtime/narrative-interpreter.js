(function attachNarrativeInterpreter(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function interpreterFactory() {
  'use strict';

  const groups = {
    boundary: ['argument', 'father', 'mother', 'alone', 'lonely', 'distance', 'relationship', 'withdraw', 'empty station', 'isolation', '疏离', '争吵', '独自', '父亲'],
    space: ['escape route', 'own route', 'create route', 'path', 'run through', 'crowd', 'escape', 'route', 'freedom', '路线', '逃', '人群', '奔跑'],
    medium: ['guitarist', 'rebellious', 'without blending', 'does not blend', 'refuse', 'institutional space', 'punk', 'guitar', '不融入', '反叛', '吉他'],
    institution: ['institution', 'authority', 'tribunal', 'regulated', 'system', 'orderly', 'assigned', '制度', '机构', '秩序']
  };

  function score(text, words) { return words.reduce((sum, word) => sum + (text.includes(word) ? 1 : 0), 0); }

  function interpretNarrative(rawBrief) {
    const brief = String(rawBrief || '').trim();
    const text = brief.toLocaleLowerCase();
    const scores = {
      boundary: score(text, groups.boundary),
      space: score(text, groups.space),
      medium: score(text, groups.medium),
      institution: score(text, groups.institution)
    };

    let grammarId = 'institutional-authority';
    let primaryVariable = 'Focus';
    let narrativeVerb = 'REFOCUS';
    let narrativeState = 'pressure';
    let relationshipState = 'contested';
    let worldRelation = 'Resist';
    let intensity = 0.52;
    let shotIntent = 'attention conflict';
    let agencyMode = 'attention authorship';

    if (scores.medium >= Math.max(scores.boundary, scores.space, 1)) {
      grammarId = 'medium-locality'; primaryVariable = 'Time / Medium'; narrativeVerb = 'REMAIN DISTINCT';
      narrativeState = 'agency'; relationshipState = 'non-assimilation'; worldRelation = 'Resist'; intensity = 0.66;
      shotIntent = 'preserve character-local medium against orderly host'; agencyMode = 'selective synchronization';
    } else if (scores.space >= Math.max(scores.boundary, 1)) {
      grammarId = 'spatial-authorship'; primaryVariable = 'Space'; narrativeVerb = 'CREATE ROUTE';
      narrativeState = 'agency'; relationshipState = 'self-direction'; worldRelation = 'Rewrite'; intensity = 0.78;
      shotIntent = 'make route authorship legible before speed'; agencyMode = 'route authorship';
    } else if (scores.boundary > 0) {
      grammarId = 'boundary-relational'; primaryVariable = 'Boundary'; narrativeVerb = 'WITHDRAW';
      narrativeState = 'pressure'; relationshipState = 'relational isolation'; worldRelation = 'Resist'; intensity = 0.55;
      shotIntent = 'hold relational distance through negative space'; agencyMode = 'boundary ownership';
    }

    return {
      raw: brief,
      grammarId,
      primaryVariable,
      narrativeVerb,
      narrativeState,
      relationshipState,
      worldRelation,
      intensity,
      shotIntent,
      agencyMode,
      scores,
      confidence: Math.min(0.94, 0.64 + Math.max(...Object.values(scores)) * 0.07)
    };
  }

  return { interpretNarrative };
});
