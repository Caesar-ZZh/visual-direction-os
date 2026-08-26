(function attachProjectPackage(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function projectPackageFactory(root) {
  'use strict';

  const runtime = root?.VisualDirectionRuntime || {};
  let codec = runtime;
  let fingerprint = runtime;
  if (typeof require === 'function') {
    try { codec = Object.assign({}, runtime, require('./vdos-codec.js')); } catch (_) {}
    try { fingerprint = Object.assign({}, runtime, require('./runtime-fingerprint.js')); } catch (_) {}
  }

  const stableJsonBytes = codec.stableJsonBytes;
  const sha256Hex = codec.sha256Hex;
  const VDOS_PACKAGE_VERSION = fingerprint.VDOS_PACKAGE_VERSION || 1;
  const VDOS_SCHEMA_VERSION = fingerprint.VDOS_SCHEMA_VERSION || 1;
  const VDOS_RUNTIME_FINGERPRINT = fingerprint.VDOS_RUNTIME_FINGERPRINT || Object.freeze({});

  function requireDependencies() {
    if (typeof stableJsonBytes !== 'function' || typeof sha256Hex !== 'function') {
      throw new Error('VDOS project package requires the archive codec runtime');
    }
  }

  function cloneJson(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return JSON.parse(JSON.stringify(value));
  }

  function own(source, key) {
    return source != null && Object.prototype.hasOwnProperty.call(source, key);
  }

  function portableRequestV1(request) {
    const source = request && typeof request === 'object' ? request : {};
    const portable = {};
    for (const key of ['model', 'prompt', 'size', 'ratio', 'return_base64']) {
      if (own(source, key)) portable[key] = cloneJson(source[key]);
    }
    if (source.extra_body && typeof source.extra_body === 'object' && own(source.extra_body, 'response_format')) {
      portable.extra_body = { response_format:cloneJson(source.extra_body.response_format) };
    }
    return portable;
  }

  function compareArtifactsForExport(a, b) {
    const ai = Number(a?.generationIndex) || 0;
    const bi = Number(b?.generationIndex) || 0;
    if (ai !== bi) return ai - bi;
    const at = String(a?.createdAt || '');
    const bt = String(b?.createdAt || '');
    if (at !== bt) return at.localeCompare(bt);
    return String(a?.id || '').localeCompare(String(b?.id || ''));
  }

  function mergeRuntimeAndPersistedArtifacts(runtimeArtifacts = [], persistedArtifacts = []) {
    const merged = new Map();
    for (const persisted of Array.isArray(persistedArtifacts) ? persistedArtifacts : []) {
      if (!persisted?.id) continue;
      merged.set(persisted.id, { ...persisted });
    }
    for (const current of Array.isArray(runtimeArtifacts) ? runtimeArtifacts : []) {
      if (!current?.id) continue;
      const persisted = merged.get(current.id) || null;
      const row = { ...(persisted || {}), ...current };
      if (current.imageBlob == null && persisted?.imageBlob != null) row.imageBlob = persisted.imageBlob;
      if (current.imageMimeType == null && persisted?.imageMimeType != null) row.imageMimeType = persisted.imageMimeType;
      merged.set(current.id, row);
    }
    return [...merged.values()].sort(compareArtifactsForExport);
  }

  function normalizedParent(value) {
    return value == null || value === '' ? null : String(value);
  }

  function validateLineage({ project, artifacts = [], lineage } = {}) {
    if (!project?.id) throw new Error('Lineage validation requires a project ID');
    if (!Array.isArray(artifacts)) throw new Error('Lineage validation requires artifacts');
    if (!lineage || !Array.isArray(lineage.roots) || !Array.isArray(lineage.nodes)) {
      throw new Error('Lineage roots and nodes are required');
    }

    const artifactsById = new Map();
    for (const artifact of artifacts) {
      const id = String(artifact?.id || '');
      if (!id) throw new Error('Lineage artifact is missing an ID');
      if (artifactsById.has(id)) throw new Error(`Duplicate lineage artifact: ${id}`);
      if (artifact.projectId != null && String(artifact.projectId) !== String(project.id)) {
        throw new Error(`Artifact ${id} belongs to a different project`);
      }
      artifactsById.set(id, artifact);
    }

    const nodesById = new Map();
    for (const node of lineage.nodes) {
      const id = String(node?.artifactId || '');
      if (!id) throw new Error('Lineage node is missing artifactId');
      if (nodesById.has(id)) throw new Error(`Duplicate lineage node: ${id}`);
      if (!artifactsById.has(id)) throw new Error(`Lineage node references missing artifact: ${id}`);
      nodesById.set(id, node);
    }
    if (nodesById.size !== artifactsById.size) throw new Error('Lineage must contain exactly one node per artifact');

    for (const [id, artifact] of artifactsById) {
      const node = nodesById.get(id);
      if (!node) throw new Error(`Lineage node missing for artifact ${id}`);
      const artifactParent = normalizedParent(artifact.parentArtifactId);
      const nodeParent = normalizedParent(node.parentArtifactId);
      if (artifactParent !== nodeParent) throw new Error(`Lineage parent mismatch for artifact ${id}`);
      const artifactRoot = String(artifact.rootArtifactId || '');
      const nodeRoot = String(node.rootArtifactId || '');
      if (!artifactRoot || artifactRoot !== nodeRoot) throw new Error(`Lineage root mismatch for artifact ${id}`);
      if (artifactParent && !artifactsById.has(artifactParent)) throw new Error(`Lineage parent missing for artifact ${id}`);
    }

    const expectedRoots = [...artifactsById.values()]
      .filter((artifact) => normalizedParent(artifact.parentArtifactId) === null)
      .map((artifact) => String(artifact.id));
    const declaredRoots = lineage.roots.map((id) => String(id));
    if (new Set(declaredRoots).size !== declaredRoots.length) throw new Error('Lineage roots contain duplicates');
    if (declaredRoots.some((id) => !artifactsById.has(id))) throw new Error('Lineage root references a missing artifact');
    const expectedRootSet = new Set(expectedRoots);
    if (declaredRoots.length !== expectedRoots.length || declaredRoots.some((id) => !expectedRootSet.has(id))) {
      throw new Error('Lineage roots do not match null-parent artifacts');
    }

    for (const [id, artifact] of artifactsById) {
      const visited = new Set();
      let cursor = artifact;
      while (normalizedParent(cursor.parentArtifactId) !== null) {
        const cursorId = String(cursor.id);
        if (visited.has(cursorId)) throw new Error(`Lineage cycle detected at artifact ${cursorId}`);
        visited.add(cursorId);
        const parentId = normalizedParent(cursor.parentArtifactId);
        cursor = artifactsById.get(parentId);
        if (!cursor) throw new Error(`Lineage parent missing for artifact ${cursorId}`);
      }
      const rootId = String(cursor.id);
      if (String(artifact.rootArtifactId || '') !== rootId) throw new Error(`Lineage root mismatch for artifact ${id}`);
      if (String(cursor.rootArtifactId || '') !== rootId) throw new Error(`Lineage root artifact ${rootId} must point to itself`);
    }

    return true;
  }

  function assertSafeIdSegment(value, label) {
    const id = String(value || '');
    if (!id || id === '.' || id === '..' || /[\\/\u0000-\u001f\u007f]/.test(id)) {
      throw new Error(`${label || 'ID'} cannot be used in a VDOS archive path`);
    }
    return id;
  }

  function extensionForMime(mimeType, name = '') {
    const mime = String(mimeType || '').toLowerCase().split(';')[0].trim();
    const known = {
      'image/png':'png',
      'image/jpeg':'jpg',
      'image/jpg':'jpg',
      'image/webp':'webp',
      'image/gif':'gif',
      'image/avif':'avif',
      'image/svg+xml':'svg'
    };
    if (known[mime]) return known[mime];
    const match = String(name || '').match(/\.([A-Za-z0-9]{1,8})$/);
    return match ? match[1].toLowerCase() : 'bin';
  }

  function decodeBase64(value) {
    const text = String(value || '').replace(/\s+/g, '');
    if (typeof Buffer !== 'undefined') return Uint8Array.from(Buffer.from(text, 'base64'));
    if (typeof atob === 'function') {
      const decoded = atob(text);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i += 1) bytes[i] = decoded.charCodeAt(i);
      return bytes;
    }
    throw new Error('Base64 decoding is unavailable');
  }

  function parseDataUri(source) {
    const match = String(source || '').match(/^data:([^;,]*)(;base64)?,([\s\S]*)$/i);
    if (!match) return null;
    const mimeType = match[1] || 'application/octet-stream';
    if (match[2]) return { mimeType, bytes:decodeBase64(match[3]) };
    const decoded = decodeURIComponent(match[3]);
    return { mimeType, bytes:new TextEncoder().encode(decoded) };
  }

  function nonSecretOrigin(source) {
    try {
      const parsed = new URL(String(source));
      if (!['http:', 'https:'].includes(parsed.protocol)) return null;
      return `${parsed.protocol}//${parsed.host}`;
    } catch (_) {
      return null;
    }
  }

  async function responseBytes(response) {
    if (!response?.ok) throw new Error(`HTTP ${response?.status || 'error'}`);
    let mimeType = String(response.headers?.get?.('content-type') || '').split(';')[0].trim();
    if (typeof response.arrayBuffer === 'function') {
      return { bytes:new Uint8Array(await response.arrayBuffer()), mimeType:mimeType || 'application/octet-stream' };
    }
    if (typeof response.blob === 'function') {
      const blob = await response.blob();
      mimeType = mimeType || blob.type || 'application/octet-stream';
      return { bytes:new Uint8Array(await blob.arrayBuffer()), mimeType };
    }
    throw new Error('Reference response does not expose bytes');
  }

  async function captureReferenceSource(source, fetchImpl) {
    const value = String(source || '');
    const data = parseDataUri(value);
    if (data) return { status:'available', ...data };

    const originHint = nonSecretOrigin(value);
    const fetchable = originHint || value.startsWith('blob:');
    if (fetchable && typeof fetchImpl === 'function') {
      try {
        const result = await responseBytes(await fetchImpl(value));
        return { status:'available', ...result };
      } catch (_) {
        return { status:originHint ? 'remote_unavailable' : 'object_url_unavailable', originHint:originHint || null };
      }
    }
    if (originHint) return { status:'remote_unavailable', originHint };
    if (value.startsWith('blob:')) return { status:'object_url_unavailable', originHint:null };
    return { status:'reference_unavailable', originHint:null };
  }

  function richReferenceInputs(artifact) {
    if (Array.isArray(artifact?.references) && artifact.references.length) {
      return { references:artifact.references, legacy:false };
    }
    const legacyImages = artifact?.request?.extra_body?.image || artifact?.baseRequest?.extra_body?.image;
    if (!Array.isArray(legacyImages) || !legacyImages.length) return { references:[], legacy:false };
    return {
      legacy:true,
      references:legacyImages.map((source, index) => ({ source, name:`legacy-reference-${index + 1}` }))
    };
  }

  function portableReferenceUsageBase(reference) {
    const usage = {};
    if (reference?.name != null) usage.name = String(reference.name);
    if (reference?.role != null) usage.role = cloneJson(reference.role);
    if (Array.isArray(reference?.preserve)) usage.preserve = cloneJson(reference.preserve);
    return usage;
  }

  function pushMissing(missingAssets, row) {
    missingAssets.push(Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)));
  }

  function imageDescriptorUnavailable() {
    return { path:null, mimeType:null, sha256:null, status:'meta_only' };
  }

  async function imageAssetForArtifact(artifact, missingAssets) {
    if (artifact.persistenceStatus === 'not_persisted') {
      pushMissing(missingAssets, { artifactId:artifact.id, kind:'artifact', code:'not_persisted' });
      return { descriptor:imageDescriptorUnavailable(), asset:null };
    }
    const blob = artifact.imageBlob;
    if (!blob || typeof blob.arrayBuffer !== 'function') {
      pushMissing(missingAssets, { artifactId:artifact.id, kind:'image', code:'meta_only' });
      return { descriptor:imageDescriptorUnavailable(), asset:null };
    }
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const mimeType = String(artifact.imageMimeType || blob.type || 'application/octet-stream').split(';')[0].trim() || 'application/octet-stream';
    const sha256 = await sha256Hex(bytes);
    const id = assertSafeIdSegment(artifact.id, 'Artifact ID');
    const path = `images/${id}.${extensionForMime(mimeType)}`;
    return {
      descriptor:{ path, mimeType, sha256, status:'available' },
      asset:{ path, role:'asset', bytes }
    };
  }

  async function referenceUsagesForArtifact(artifact, fetchImpl, referenceAssetByHash, missingAssets) {
    const source = richReferenceInputs(artifact);
    const usages = [];
    if (source.legacy) {
      pushMissing(missingAssets, { artifactId:artifact.id, kind:'reference_metadata', code:'legacy_reference_metadata_incomplete' });
    }

    for (const reference of source.references) {
      const usage = portableReferenceUsageBase(reference);
      const captured = await captureReferenceSource(reference?.source, fetchImpl);
      if (captured.status !== 'available') {
        usage.status = captured.status;
        if (captured.originHint) usage.originHint = captured.originHint;
        pushMissing(missingAssets, {
          artifactId:artifact.id,
          kind:'reference',
          code:captured.status,
          name:reference?.name != null ? String(reference.name) : undefined,
          originHint:captured.originHint || undefined
        });
        usages.push(usage);
        continue;
      }

      const hash = await sha256Hex(captured.bytes);
      let asset = referenceAssetByHash.get(hash);
      if (!asset) {
        const mimeType = String(captured.mimeType || 'application/octet-stream').split(';')[0].trim() || 'application/octet-stream';
        const path = `references/${hash}.${extensionForMime(mimeType, reference?.name)}`;
        asset = { path, role:'asset', bytes:captured.bytes, mimeType, sha256:hash };
        referenceAssetByHash.set(hash, asset);
      }
      usage.assetId = `sha256:${hash}`;
      usage.path = asset.path;
      usage.mimeType = asset.mimeType;
      usage.status = 'available';
      usages.push(usage);
    }
    return usages;
  }

  function portableArtifactV1(artifact, references, image) {
    const generation = artifact.generation || {};
    const request = artifact.request || generation.request || {};
    const baseRequest = artifact.baseRequest || generation.baseRequest || request;
    const result = artifact.result || generation.resultMetadata || {};
    const sourceArtifactId = artifact.sourceIdentity?.sourceArtifactId ?? artifact.sourceArtifactId ?? null;
    return {
      schemaVersion:VDOS_SCHEMA_VERSION,
      id:String(artifact.id),
      projectId:String(artifact.projectId),
      rootArtifactId:String(artifact.rootArtifactId),
      parentArtifactId:normalizedParent(artifact.parentArtifactId),
      generationIndex:Number(artifact.generationIndex) || 0,
      createdAt:artifact.createdAt || null,
      sourceIdentity:{ sourceArtifactId:sourceArtifactId == null ? null : String(sourceArtifactId) },
      generation:{
        provider:String(artifact.provider || generation.provider || request.model || 'unknown'),
        request:portableRequestV1(request),
        baseRequest:portableRequestV1(baseRequest),
        resultMetadata:{
          kind:result.kind || null,
          revisedPrompt:result.revisedPrompt ?? result.revised_prompt ?? null
        },
        references
      },
      visualIR:cloneJson(artifact.visualIR ?? null),
      measurements:cloneJson(artifact.measurements ?? null),
      evaluation:cloneJson(artifact.evaluation ?? null),
      humanJudgments:cloneJson(artifact.humanJudgments ?? null),
      iterationDelta:cloneJson(artifact.iterationDelta ?? null),
      evaluationDelta:cloneJson(artifact.evaluationDelta ?? null),
      image
    };
  }

  function portableComparisonV1(row) {
    return {
      id:String(row?.id || ''),
      projectId:String(row?.projectId || ''),
      artifactAId:row?.artifactAId == null ? null : String(row.artifactAId),
      artifactBId:row?.artifactBId == null ? null : String(row.artifactBId),
      directorJudgments:cloneJson(row?.directorJudgments || {}),
      comparison:cloneJson(row?.comparison ?? null),
      updatedAt:row?.updatedAt || row?.createdAt || null
    };
  }

  function portableMemoryV1(snapshot, projectId) {
    const source = snapshot && typeof snapshot === 'object' ? snapshot : {};
    return {
      schemaVersion:VDOS_SCHEMA_VERSION,
      projectId:String(projectId),
      policyVersion:source.policyVersion ?? VDOS_RUNTIME_FINGERPRINT.memoryPolicyVersion ?? 1,
      computedAt:source.computedAt ?? null,
      pathHeadArtifactId:source.pathHeadArtifactId ?? source.pathArtifactIds?.at?.(-1) ?? null,
      pathArtifactIds:cloneJson(Array.isArray(source.pathArtifactIds) ? source.pathArtifactIds : []),
      locked:cloneJson(Array.isArray(source.locked) ? source.locked : []),
      active:cloneJson(Array.isArray(source.active) ? source.active : []),
      watch:cloneJson(Array.isArray(source.watch) ? source.watch : [])
    };
  }

  function buildLineage(projectId, artifacts) {
    const ordered = [...artifacts].sort(compareArtifactsForExport);
    return {
      schemaVersion:VDOS_SCHEMA_VERSION,
      projectId:String(projectId),
      roots:ordered.filter((artifact) => normalizedParent(artifact.parentArtifactId) === null).map((artifact) => String(artifact.id)),
      nodes:ordered.map((artifact) => ({
        artifactId:String(artifact.id),
        parentArtifactId:normalizedParent(artifact.parentArtifactId),
        rootArtifactId:String(artifact.rootArtifactId)
      }))
    };
  }

  function portableProjectV1(project, exportedAt, artifacts, comparisons, lineage) {
    const provenance = project?.provenance || {};
    return {
      schemaVersion:VDOS_SCHEMA_VERSION,
      id:String(project.id),
      title:String(project.title || 'Untitled Director Project'),
      createdAt:project.createdAt || null,
      updatedAt:project.updatedAt || null,
      exportedAt,
      provenance:{
        sourceProjectId:provenance.sourceProjectId ?? project.sourceProjectId ?? null,
        importedFromPackageId:provenance.importedFromPackageId ?? project.importedFromPackageId ?? null
      },
      stats:{
        artifactCount:artifacts.length,
        comparisonCount:comparisons.length,
        rootCount:lineage.roots.length
      }
    };
  }

  function validateComparisons(projectId, comparisons, artifactIds) {
    for (const row of comparisons) {
      if (!row.id) throw new Error('Comparison is missing an ID');
      if (row.projectId && row.projectId !== String(projectId)) throw new Error(`Comparison ${row.id} belongs to a different project`);
      if (!artifactIds.has(row.artifactAId) || !artifactIds.has(row.artifactBId)) {
        throw new Error(`Comparison ${row.id} references a missing artifact`);
      }
    }
  }

  async function buildExportStage({
    project,
    runtimeArtifacts = [],
    persistedArtifacts = [],
    comparisons = [],
    memorySnapshot = null,
    fetchImpl
  } = {}) {
    requireDependencies();
    if (!project?.id) throw new Error('Project export requires a project ID');
    const merged = mergeRuntimeAndPersistedArtifacts(runtimeArtifacts, persistedArtifacts).map((artifact) => ({
      ...artifact,
      projectId:artifact.projectId || project.id,
      rootArtifactId:artifact.rootArtifactId || artifact.id,
      parentArtifactId:normalizedParent(artifact.parentArtifactId)
    }));
    for (const artifact of merged) assertSafeIdSegment(artifact.id, 'Artifact ID');

    const lineage = buildLineage(project.id, merged);
    validateLineage({ project, artifacts:merged, lineage });

    const portableComparisons = (Array.isArray(comparisons) ? comparisons : []).map(portableComparisonV1);
    validateComparisons(String(project.id), portableComparisons, new Set(merged.map((artifact) => String(artifact.id))));

    const effectiveFetch = fetchImpl || root?.fetch;
    const missingAssets = [];
    const referenceAssetByHash = new Map();
    const imageAssets = [];
    const portableArtifacts = [];

    for (const artifact of merged) {
      const references = await referenceUsagesForArtifact(artifact, effectiveFetch, referenceAssetByHash, missingAssets);
      const imageResult = await imageAssetForArtifact(artifact, missingAssets);
      if (imageResult.asset) imageAssets.push(imageResult.asset);
      portableArtifacts.push(portableArtifactV1(artifact, references, imageResult.descriptor));
    }

    const exportedAt = new Date().toISOString();
    const portableProject = portableProjectV1(project, exportedAt, portableArtifacts, portableComparisons, lineage);
    const memory = portableMemoryV1(memorySnapshot, project.id);
    const packageCompleteness = missingAssets.length ? 'partial' : 'complete';
    const randomId = root?.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const packageId = `pkg-${randomId}`;
    const manifestBase = {
      format:'vdos-project',
      packageVersion:VDOS_PACKAGE_VERSION,
      schemaVersion:VDOS_SCHEMA_VERSION,
      packageId,
      createdBy:'Visual Direction OS',
      createdAt:exportedAt,
      exportedAt,
      createdWith:cloneJson(VDOS_RUNTIME_FINGERPRINT),
      project:{ id:portableProject.id, title:portableProject.title },
      packageCompleteness,
      missingAssets:cloneJson(missingAssets)
    };

    return {
      schemaVersion:VDOS_SCHEMA_VERSION,
      packageId,
      exportedAt,
      project:portableProject,
      artifacts:portableArtifacts,
      lineage,
      comparisons:{ schemaVersion:VDOS_SCHEMA_VERSION, projectId:String(project.id), comparisons:portableComparisons },
      memory,
      imageAssets,
      referenceAssets:[...referenceAssetByHash.values()],
      packageCompleteness,
      missingAssets,
      manifestBase
    };
  }

  function buildExportReport(stage) {
    if (!stage?.project || !Array.isArray(stage?.artifacts)) throw new Error('Export stage is required');
    return {
      projectId:stage.project.id,
      title:stage.project.title,
      packageCompleteness:stage.packageCompleteness,
      missingAssets:cloneJson(stage.missingAssets || []),
      artifactCount:stage.artifacts.length,
      imageAssetCount:Array.isArray(stage.imageAssets) ? stage.imageAssets.length : 0,
      referenceAssetCount:Array.isArray(stage.referenceAssets) ? stage.referenceAssets.length : 0
    };
  }

  function buildArchiveFiles(stage) {
    requireDependencies();
    if (!stage?.project || !stage?.lineage || !stage?.comparisons || !stage?.memory || !Array.isArray(stage?.artifacts)) {
      throw new Error('Complete export stage is required');
    }
    const files = [
      { path:'project.json', role:'core', bytes:stableJsonBytes(stage.project) },
      { path:'lineage.json', role:'core', bytes:stableJsonBytes(stage.lineage) },
      { path:'comparisons.json', role:'core', bytes:stableJsonBytes(stage.comparisons) },
      { path:'memory.json', role:'core', bytes:stableJsonBytes(stage.memory) }
    ];
    for (const artifact of stage.artifacts) {
      const id = assertSafeIdSegment(artifact.id, 'Artifact ID');
      files.push({ path:`artifacts/${id}.json`, role:'core', bytes:stableJsonBytes(artifact) });
    }
    for (const asset of stage.imageAssets || []) files.push({ path:asset.path, role:'asset', bytes:asset.bytes });
    for (const asset of stage.referenceAssets || []) files.push({ path:asset.path, role:'asset', bytes:asset.bytes });
    return files;
  }

  return {
    portableRequestV1,
    validateLineage,
    mergeRuntimeAndPersistedArtifacts,
    buildExportStage,
    buildExportReport,
    buildArchiveFiles
  };
});
