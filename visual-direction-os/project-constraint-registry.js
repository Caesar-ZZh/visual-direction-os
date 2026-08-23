((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VDOSProjectConstraintRegistry = api;
})(typeof window !== 'undefined' ? window : globalThis, () => {
  'use strict';

  const REGISTRY_VERSION = '0.1.0';
  const AUTHORITY_CONTRACT_VERSION = '0.1.0';
  const MASK_64 = (1n << 64n) - 1n;
  const FNV_OFFSET = 0xcbf29ce484222325n;
  const FNV_PRIME = 0x100000001b3n;
  const DECISIONS = new Set(['confirmed', 'revoked']);
  const REVISION_STATES = new Set(['current', 'superseded']);
  const CONSTRAINT_TYPES = new Set(['ownership-carry', 'handoff-guard', 'transfer-completion']);

  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const nonEmpty = value => typeof value === 'string' && Boolean(value.trim());

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (!value || typeof value !== 'object') return value;
    const out = {};
    Object.keys(value).sort().forEach(key => {
      if (value[key] !== undefined) out[key] = canonicalize(value[key]);
    });
    return out;
  }

  function canonicalJSONString(value) {
    return JSON.stringify(canonicalize(value));
  }

  function fnv1a64(input) {
    let hash = FNV_OFFSET;
    for (const byte of new TextEncoder().encode(String(input))) {
      hash ^= BigInt(byte);
      hash = (hash * FNV_PRIME) & MASK_64;
    }
    return hash.toString(16).padStart(16, '0');
  }

  function fingerprintSnapshot(prefix, snapshot) {
    return `${String(prefix)}-${fnv1a64(canonicalJSONString(snapshot))}`;
  }

  function createEmptyRegistry() {
    return { schemaVersion: REGISTRY_VERSION, constraints: {}, dismissals: {} };
  }

  function constraintIdForCandidate(candidate) {
    const basis = {
      type: candidate?.type,
      family: candidate?.family,
      path: candidate?.path,
      scope: candidate?.scope
    };
    return `constraint-${fnv1a64(canonicalJSONString(basis))}`;
  }

  function revisionFromCandidate(candidate, revision) {
    return {
      revision,
      state: 'current',
      family: String(candidate.family),
      path: String(candidate.path),
      expected: clone(candidate.expected),
      scope: clone(candidate.scope),
      evidence: {
        contractVersion: AUTHORITY_CONTRACT_VERSION,
        fingerprint: fingerprintSnapshot('pcf', candidate.evidenceSnapshot),
        canonicalSnapshot: clone(candidate.evidenceSnapshot)
      },
      exceptions: []
    };
  }

  function validateRevision(value, key, errors) {
    const path = `revisions.${key}`;
    if (!isObject(value)) {
      errors.push(`${path} must be an object`);
      return;
    }
    const revision = Number(key);
    if (!Number.isInteger(revision) || revision < 1 || value.revision !== revision) errors.push(`${path}.revision must match its positive integer key`);
    if (!REVISION_STATES.has(value.state)) errors.push(`${path}.state is invalid`);
    if (!nonEmpty(value.family)) errors.push(`${path}.family is required`);
    if (!nonEmpty(value.path)) errors.push(`${path}.path is required`);
    if (value.expected == null || (typeof value.expected === 'string' && !value.expected.trim())) errors.push(`${path}.expected is required`);
    if (!isObject(value.scope)) errors.push(`${path}.scope must be an object`);
    else {
      if (!nonEmpty(value.scope.sourceSceneId)) errors.push(`${path}.scope.sourceSceneId is required`);
      if (!nonEmpty(value.scope.targetSceneId)) errors.push(`${path}.scope.targetSceneId is required`);
      if (!Array.isArray(value.scope.beatIds) || !value.scope.beatIds.length || value.scope.beatIds.some(id => !nonEmpty(id))) errors.push(`${path}.scope.beatIds must contain non-empty Beat IDs`);
    }
    if (!isObject(value.evidence)) errors.push(`${path}.evidence must be an object`);
    else {
      if (value.evidence.contractVersion !== AUTHORITY_CONTRACT_VERSION) errors.push(`${path}.evidence.contractVersion is invalid`);
      if (!/^pcf-[0-9a-f]{16}$/.test(String(value.evidence.fingerprint || ''))) errors.push(`${path}.evidence.fingerprint is invalid`);
      if (!isObject(value.evidence.canonicalSnapshot)) errors.push(`${path}.evidence.canonicalSnapshot is required`);
      else if (value.evidence.fingerprint !== fingerprintSnapshot('pcf', value.evidence.canonicalSnapshot)) errors.push(`${path}.evidence.fingerprint must match canonicalSnapshot`);
    }
    if (!Array.isArray(value.exceptions)) errors.push(`${path}.exceptions must be an array`);
    else value.exceptions.forEach((exception, index) => {
      const epath = `${path}.exceptions.${index}`;
      if (!isObject(exception)) {
        errors.push(`${epath} must be an object`);
        return;
      }
      if (exception.action !== 'release') errors.push(`${epath}.action must be release`);
      if (exception.revision !== value.revision) errors.push(`${epath}.revision must match containing revision`);
      if (!nonEmpty(exception.sceneId)) errors.push(`${epath}.sceneId is required`);
      if (!nonEmpty(exception.beatId)) errors.push(`${epath}.beatId is required`);
    });
  }

  function validateConstraint(value, id, errors) {
    const path = `constraints.${id}`;
    if (!isObject(value)) {
      errors.push(`${path} must be an object`);
      return;
    }
    if (value.constraintId !== id) errors.push(`${path}.constraintId must match key`);
    if (!CONSTRAINT_TYPES.has(value.type)) errors.push(`${path}.type is invalid`);
    if (!DECISIONS.has(value.decision)) errors.push(`${path}.decision is invalid`);
    if (!Number.isInteger(value.currentRevision) || value.currentRevision < 1) errors.push(`${path}.currentRevision must be a positive integer`);
    if (!isObject(value.revisions)) {
      errors.push(`${path}.revisions must be an object`);
      return;
    }
    Object.entries(value.revisions).forEach(([key, revision]) => validateRevision(revision, key, errors));
    const current = value.revisions[String(value.currentRevision)];
    if (!current) errors.push(`${path}.currentRevision must reference an existing revision`);
    else if (current.state !== 'current') errors.push(`${path}.currentRevision must reference state current`);
    Object.entries(value.revisions).forEach(([key, revision]) => {
      if (Number(key) !== value.currentRevision && revision?.state === 'current') errors.push(`${path}.revisions.${key}.state must be superseded`);
    });
  }

  function validateRegistry(registry) {
    const errors = [];
    if (!isObject(registry)) return { valid: false, errors: ['registry must be an object'] };
    if (registry.schemaVersion !== REGISTRY_VERSION) errors.push('schemaVersion is invalid');
    if (!isObject(registry.constraints)) errors.push('constraints must be an object');
    else Object.entries(registry.constraints).forEach(([id, value]) => validateConstraint(value, id, errors));
    if (!isObject(registry.dismissals)) errors.push('dismissals must be an object');
    else Object.entries(registry.dismissals).forEach(([fingerprint, dismissal]) => {
      if (!/^pcand-[0-9a-f]{16}$/.test(fingerprint)) errors.push(`dismissals.${fingerprint} key is invalid`);
      if (!isObject(dismissal) || dismissal.decision !== 'rejected') errors.push(`dismissals.${fingerprint}.decision must be rejected`);
    });
    return errors.length ? { valid: false, errors } : { valid: true, errors: [], value: clone(registry) };
  }

  function checkedRegistry(registry) {
    const checked = validateRegistry(registry);
    if (!checked.valid) throw new Error(`Invalid Project Constraint Registry: ${checked.errors.join('; ')}`);
    return checked.value;
  }

  function assertCandidate(candidate) {
    if (!isObject(candidate)) throw new Error('Project Constraint Candidate must be an object.');
    if (!CONSTRAINT_TYPES.has(candidate.type)) throw new Error('Project Constraint Candidate type is invalid.');
    if (!nonEmpty(candidate.family) || !nonEmpty(candidate.path)) throw new Error('Project Constraint Candidate family/path are required.');
    if (candidate.expected == null) throw new Error('Project Constraint Candidate expected value is required.');
    if (!isObject(candidate.scope) || !nonEmpty(candidate.scope.sourceSceneId) || !nonEmpty(candidate.scope.targetSceneId) || !Array.isArray(candidate.scope.beatIds) || !candidate.scope.beatIds.length) {
      throw new Error('Project Constraint Candidate scope is invalid.');
    }
    if (!isObject(candidate.evidenceSnapshot)) throw new Error('Project Constraint Candidate evidenceSnapshot is required.');
  }

  function confirmCandidate(registry, candidate) {
    assertCandidate(candidate);
    const next = checkedRegistry(registry);
    const id = constraintIdForCandidate(candidate);
    if (next.constraints[id]) throw new Error(`Project Constraint already exists: ${id}`);
    next.constraints[id] = {
      constraintId: id,
      type: candidate.type,
      decision: 'confirmed',
      currentRevision: 1,
      revisions: { '1': revisionFromCandidate(candidate, 1) }
    };
    return checkedRegistry(next);
  }

  function rejectCandidate(registry, candidate) {
    assertCandidate(candidate);
    if (!/^pcand-[0-9a-f]{16}$/.test(String(candidate.candidateFingerprint || ''))) throw new Error('Project Constraint Candidate fingerprint is invalid.');
    const next = checkedRegistry(registry);
    next.dismissals[candidate.candidateFingerprint] = { decision: 'rejected' };
    return checkedRegistry(next);
  }

  function getConstraint(registry, constraintId) {
    const next = checkedRegistry(registry);
    const constraint = next.constraints[constraintId];
    if (!constraint) throw new Error(`Unknown Project Constraint: ${constraintId}`);
    return { next, constraint };
  }

  function getCurrentRevision(constraint) {
    if (!constraint || !Number.isInteger(constraint.currentRevision)) return null;
    return clone(constraint.revisions?.[String(constraint.currentRevision)] || null);
  }

  function revokeConstraint(registry, constraintId) {
    const { next, constraint } = getConstraint(registry, constraintId);
    constraint.decision = 'revoked';
    return checkedRegistry(next);
  }

  function releaseConstraintScope(registry, constraintId, { sceneId, beatId } = {}) {
    if (!nonEmpty(sceneId) || !nonEmpty(beatId)) throw new Error('Release requires sceneId and beatId.');
    const { next, constraint } = getConstraint(registry, constraintId);
    if (constraint.decision !== 'confirmed') throw new Error('Only confirmed Project Constraints can be released.');
    const revision = constraint.revisions[String(constraint.currentRevision)];
    const exists = revision.exceptions.some(item => item.action === 'release' && item.sceneId === sceneId && item.beatId === beatId);
    if (!exists) revision.exceptions.push({ sceneId, beatId, action: 'release', revision: revision.revision });
    return checkedRegistry(next);
  }

  function reconfirmConstraint(registry, constraintId, candidate) {
    assertCandidate(candidate);
    const { next, constraint } = getConstraint(registry, constraintId);
    const current = constraint.revisions[String(constraint.currentRevision)];
    current.state = 'superseded';
    const revision = constraint.currentRevision + 1;
    constraint.currentRevision = revision;
    constraint.decision = 'confirmed';
    constraint.type = candidate.type;
    constraint.revisions[String(revision)] = revisionFromCandidate(candidate, revision);
    return checkedRegistry(next);
  }

  return {
    REGISTRY_VERSION,
    AUTHORITY_CONTRACT_VERSION,
    createEmptyRegistry,
    canonicalize,
    canonicalJSONString,
    fnv1a64,
    fingerprintSnapshot,
    validateRegistry,
    confirmCandidate,
    rejectCandidate,
    revokeConstraint,
    releaseConstraintScope,
    reconfirmConstraint,
    getCurrentRevision
  };
});
