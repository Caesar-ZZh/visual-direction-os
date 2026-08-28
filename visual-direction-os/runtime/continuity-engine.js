(function attachContinuityEngine(root, factory) {
  const dependencies = typeof module !== 'undefined' && module.exports
    ? require('./sequence-model.js')
    : (root?.VisualDirectionRuntime || {});
  const api = factory(dependencies);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function continuityEngineFactory(dependencies) {
  'use strict';

  const sortShots = typeof dependencies?.sortShots === 'function'
    ? dependencies.sortShots
    : (rows = []) => [...rows].sort((a,b) => (Number(a?.order) || 0) - (Number(b?.order) || 0) || String(a?.id || '').localeCompare(String(b?.id || '')));

  function sequenceShots(shot, shots = []) {
    return sortShots(shots.filter((row) => row?.sequenceId === shot?.sequenceId));
  }

  function previousShot(shot, shots = []) {
    if (!shot?.id || !shot?.sequenceId) return null;
    const ordered = sequenceShots(shot, shots);
    const index = ordered.findIndex((row) => row.id === shot.id);
    return index > 0 ? ordered[index - 1] : null;
  }

  function sourceShotFor(shot, shots = []) {
    if (!shot?.id || !shot?.sequenceId) return null;
    if (shot.continuityMode === 'manual') {
      const sourceId = String(shot.continuitySourceShotId || '').trim();
      if (!sourceId) return null;
      return shots.find((row) => row?.id === sourceId && row?.sequenceId === shot.sequenceId) || null;
    }
    return previousShot(shot, shots);
  }

  function manualSourceOutOfOrder(shot, sourceShot, shots = []) {
    if (shot?.continuityMode !== 'manual' || !sourceShot) return false;
    const ordered = sequenceShots(shot, shots);
    const currentIndex = ordered.findIndex((row) => row.id === shot.id);
    const sourceIndex = ordered.findIndex((row) => row.id === sourceShot.id);
    return currentIndex >= 0 && sourceIndex >= currentIndex;
  }

  function hasUsableAsset(artifact) {
    if (!artifact) return false;
    if (artifact.imageBlob && (typeof artifact.imageBlob.size !== 'number' || artifact.imageBlob.size > 0)) return true;
    const src = String(artifact.result?.src || artifact.imageSource || '').trim();
    return /^(?:data:image\/|https?:\/\/)/i.test(src);
  }

  function resolveContinuitySource({ shot, shots = [], artifactsById = new Map() } = {}) {
    if (!shot?.id || !shot?.sequenceId) {
      return { status:'missing', sourceShotId:null, sourceArtifactId:null, sourceArtifact:null, reason:'invalid_shot' };
    }

    const ordered = sequenceShots(shot, shots);
    const currentIndex = ordered.findIndex((row) => row.id === shot.id);
    const sourceShot = sourceShotFor(shot, shots);

    if (shot.continuityMode !== 'manual' && currentIndex === 0) {
      return { status:'not_applicable', sourceShotId:null, sourceArtifactId:null, sourceArtifact:null, reason:'first_shot' };
    }

    if (shot.continuityMode === 'manual') {
      const requestedId = String(shot.continuitySourceShotId || '').trim();
      const requested = requestedId ? shots.find((row) => row?.id === requestedId) : null;
      if (requested && requested.sequenceId !== shot.sequenceId) {
        return { status:'missing', sourceShotId:requestedId, sourceArtifactId:null, sourceArtifact:null, reason:'cross_sequence_source' };
      }
      if (manualSourceOutOfOrder(shot, sourceShot, shots)) {
        return { status:'out_of_order', sourceShotId:sourceShot.id, sourceArtifactId:sourceShot.approvedArtifactId || null, sourceArtifact:null, reason:'manual_source_not_earlier' };
      }
    }

    if (!sourceShot) {
      return {
        status:'missing',
        sourceShotId:shot.continuityMode === 'manual' ? (shot.continuitySourceShotId || null) : null,
        sourceArtifactId:null,
        sourceArtifact:null,
        reason:'source_shot_missing'
      };
    }

    const sourceArtifactId = sourceShot.approvedArtifactId ? String(sourceShot.approvedArtifactId) : null;
    if (!sourceArtifactId) {
      return { status:'missing', sourceShotId:sourceShot.id, sourceArtifactId:null, sourceArtifact:null, reason:'source_has_no_approved_frame' };
    }

    const sourceArtifact = artifactsById instanceof Map
      ? artifactsById.get(sourceArtifactId)
      : artifactsById?.[sourceArtifactId];
    if (!sourceArtifact || sourceArtifact.shotId !== sourceShot.id) {
      return { status:'missing', sourceShotId:sourceShot.id, sourceArtifactId, sourceArtifact:null, reason:'approved_artifact_missing_or_wrong_shot' };
    }
    if (!hasUsableAsset(sourceArtifact)) {
      return { status:'unavailable', sourceShotId:sourceShot.id, sourceArtifactId, sourceArtifact, reason:'approved_asset_unavailable' };
    }

    return { status:'resolved', sourceShotId:sourceShot.id, sourceArtifactId, sourceArtifact, reason:null };
  }

  function isContinuityReviewCurrent({ shot, resolution } = {}) {
    const review = shot?.continuityReview;
    return Boolean(
      review?.status === 'accepted'
      && shot?.approvedArtifactId
      && review.reviewedArtifactId === shot.approvedArtifactId
      && resolution?.status === 'resolved'
      && review.sourceArtifactId === resolution.sourceArtifactId
    );
  }

  function deriveContinuityStatus({ shot, shots = [], artifactsById = new Map() } = {}) {
    const resolution = resolveContinuitySource({ shot, shots, artifactsById });
    if (resolution.status === 'not_applicable') return 'not_applicable';
    if (resolution.status === 'out_of_order') return 'source_out_of_order';
    if (resolution.status === 'missing') return 'source_missing';
    if (resolution.status === 'unavailable') return 'source_unavailable';
    if (shot?.continuityInvalidation && !isContinuityReviewCurrent({ shot, resolution })) return 'review_required';
    return 'current';
  }

  function buildContinuityDependents(shots = []) {
    const map = new Map();
    for (const shot of shots) {
      const source = sourceShotFor(shot, shots);
      if (!source) continue;
      const dependents = map.get(source.id) || [];
      if (!dependents.includes(shot.id)) dependents.push(shot.id);
      map.set(source.id, dependents);
    }
    return map;
  }

  function collectContinuityDescendants(sourceShotId, shots = []) {
    const dependents = buildContinuityDependents(shots);
    const seen = new Set();
    const queue = [...(dependents.get(sourceShotId) || [])];
    while (queue.length) {
      const id = queue.shift();
      if (seen.has(id)) continue;
      seen.add(id);
      for (const childId of dependents.get(id) || []) if (!seen.has(childId)) queue.push(childId);
    }
    return [...seen];
  }

  function autoSourceId(shotId, shots = []) {
    const shot = shots.find((row) => row?.id === shotId);
    if (!shot || shot.continuityMode === 'manual') return null;
    return previousShot(shot, shots)?.id || null;
  }

  function detectAutoSourceChange({ shotId, beforeShots = [], afterShots = [] } = {}) {
    const before = beforeShots.find((row) => row?.id === shotId);
    const after = afterShots.find((row) => row?.id === shotId);
    if (!before || !after || before.continuityMode === 'manual' || after.continuityMode === 'manual') return null;
    const previousSourceShotId = autoSourceId(shotId, beforeShots);
    const currentSourceShotId = autoSourceId(shotId, afterShots);
    return previousSourceShotId === currentSourceShotId ? null : { previousSourceShotId, currentSourceShotId };
  }

  return {
    previousShot,
    sourceShotFor,
    resolveContinuitySource,
    deriveContinuityStatus,
    buildContinuityDependents,
    collectContinuityDescendants,
    detectAutoSourceChange,
    isContinuityReviewCurrent
  };
});
