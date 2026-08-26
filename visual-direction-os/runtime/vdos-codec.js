(function attachVdosCodec(root, factory) {
  const api = factory(root);
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function vdosCodecFactory(root) {
  'use strict';

  const ALLOWED_ROOT = new Set([
    'manifest.json',
    'project.json',
    'lineage.json',
    'comparisons.json',
    'memory.json'
  ]);
  const ALLOWED_PREFIXES = Object.freeze(['artifacts/', 'images/', 'references/']);
  const DEFAULT_LIMITS = Object.freeze({
    maxEntries:4096,
    maxInflatedBytes:512 * 1024 * 1024,
    maxArchiveBytes:256 * 1024 * 1024
  });

  const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
  const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

  function asBytes(value, label = 'bytes') {
    if (value instanceof Uint8Array) return value;
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
    throw new Error(`${label} must be a Uint8Array or ArrayBuffer`);
  }

  function canonicalize(value, seen = new Set()) {
    if (value == null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'bigint') throw new TypeError('BigInt is not supported in stable JSON');
    if (Array.isArray(value)) {
      if (seen.has(value)) throw new TypeError('Cannot encode cyclic data as stable JSON');
      seen.add(value);
      const result = value.map((item) => {
        if (item === undefined || typeof item === 'function' || typeof item === 'symbol') return null;
        return canonicalize(item, seen);
      });
      seen.delete(value);
      return result;
    }
    if (typeof value === 'object') {
      if (seen.has(value)) throw new TypeError('Cannot encode cyclic data as stable JSON');
      seen.add(value);
      const result = {};
      for (const key of Object.keys(value).sort()) {
        const item = value[key];
        if (item === undefined || typeof item === 'function' || typeof item === 'symbol') continue;
        result[key] = canonicalize(item, seen);
      }
      seen.delete(value);
      return result;
    }
    return null;
  }

  function stableJsonBytes(value) {
    if (!textEncoder) throw new Error('TextEncoder is unavailable');
    return textEncoder.encode(JSON.stringify(canonicalize(value)));
  }

  function cryptoApi() {
    if (root?.crypto?.subtle) return root.crypto;
    if (typeof require === 'function') {
      try { return require('node:crypto').webcrypto; } catch (_) {}
    }
    return null;
  }

  async function sha256Hex(value) {
    const crypto = cryptoApi();
    if (!crypto?.subtle?.digest) throw new Error('Web Crypto SHA-256 is unavailable');
    const bytes = asBytes(value);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    return [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  function normalizeArchivePath(input) {
    const path = String(input ?? '');
    if (!path || path !== path.trim()) throw new Error(`Unsafe VDOS archive path: ${path}`);
    if (/[\\\u0000-\u001f\u007f]/.test(path)) throw new Error(`Unsafe VDOS archive path: ${path}`);
    if (path.startsWith('/') || /^[A-Za-z]:\//.test(path)) throw new Error(`Unsafe VDOS archive path: ${path}`);
    const segments = path.split('/');
    if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
      throw new Error(`Unsafe VDOS archive path: ${path}`);
    }
    if (!ALLOWED_ROOT.has(path) && !ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix) && path.length > prefix.length)) {
      throw new Error(`VDOS archive path is outside the allowed package structure: ${path}`);
    }
    return path;
  }

  function defaultZipAdapter() {
    if (root?.fflate) return root.fflate;
    if (typeof require === 'function') {
      try { return require('../vendor/fflate.min.js'); } catch (_) {}
    }
    return null;
  }

  function resolveZipAdapter(explicit, capability) {
    if (explicit && typeof explicit[capability] === 'function') return explicit;
    const vendor = defaultZipAdapter();
    if (vendor && typeof vendor[capability] === 'function') return vendor;
    throw new Error(`Pinned fflate ZIP adapter is unavailable for ${capability}`);
  }

  function normalizeDecodedEntries(raw) {
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.entries(raw);
    throw new Error('Invalid ZIP adapter result');
  }

  function errorRow(path, code, expected = null, actual = null) {
    return { path, code, expected, actual };
  }

  async function encodeVdos({ files = [], manifestBase = {}, zipAdapter } = {}) {
    const zip = resolveZipAdapter(zipAdapter, 'zipSync');
    if (!Array.isArray(files)) throw new Error('VDOS files must be an array');
    const seen = new Set(['manifest.json']);
    const payload = {};
    const fileIndex = [];

    for (const file of files) {
      const path = normalizeArchivePath(file?.path);
      if (path === 'manifest.json') throw new Error('manifest.json is generated by the codec and cannot be supplied as a payload file');
      if (seen.has(path)) throw new Error(`Duplicate VDOS archive path: ${path}`);
      seen.add(path);
      if (!['core', 'asset'].includes(file?.role)) throw new Error(`Invalid VDOS file role for ${path}`);
      const bytes = asBytes(file?.bytes, path);
      payload[path] = bytes;
      fileIndex.push({
        path,
        role:file.role,
        size:bytes.byteLength,
        sha256:await sha256Hex(bytes)
      });
    }

    fileIndex.sort((a, b) => a.path.localeCompare(b.path));
    const manifest = { ...manifestBase, files:fileIndex };
    payload['manifest.json'] = stableJsonBytes(manifest);
    try {
      return asBytes(zip.zipSync(payload, { level:6 }), 'VDOS archive');
    } catch (error) {
      throw new Error(`Unable to encode VDOS ZIP archive: ${error?.message || error}`);
    }
  }

  async function decodeVdos(value, options = {}) {
    const bytes = asBytes(value, 'VDOS archive');
    const limits = {
      ...DEFAULT_LIMITS,
      ...(options || {})
    };
    if (!Number.isFinite(limits.maxEntries) || limits.maxEntries < 1) throw new Error('maxEntries must be positive');
    if (!Number.isFinite(limits.maxInflatedBytes) || limits.maxInflatedBytes < 1) throw new Error('maxInflatedBytes must be positive');
    if (!Number.isFinite(limits.maxArchiveBytes) || limits.maxArchiveBytes < 1) throw new Error('maxArchiveBytes must be positive');
    if (bytes.byteLength > limits.maxArchiveBytes) throw new Error('VDOS archive exceeds compressed byte limit');

    const zip = resolveZipAdapter(options.zipAdapter, 'unzipSync');
    let raw;
    try {
      raw = zip.unzipSync(bytes);
    } catch (error) {
      throw new Error(`Invalid VDOS ZIP archive: ${error?.message || error}`);
    }

    const pairs = normalizeDecodedEntries(raw);
    if (pairs.length > limits.maxEntries) throw new Error(`VDOS archive exceeds entry limit (${limits.maxEntries})`);
    const entries = new Map();
    let inflated = 0;
    for (const pair of pairs) {
      if (!Array.isArray(pair) || pair.length < 2) throw new Error('Invalid ZIP entry from adapter');
      const path = normalizeArchivePath(pair[0]);
      if (entries.has(path)) throw new Error(`Duplicate VDOS archive path: ${path}`);
      const entryBytes = asBytes(pair[1], path);
      inflated += entryBytes.byteLength;
      if (inflated > limits.maxInflatedBytes) throw new Error(`VDOS archive exceeds inflated byte limit (${limits.maxInflatedBytes})`);
      entries.set(path, entryBytes);
    }

    const manifestBytes = entries.get('manifest.json');
    if (!manifestBytes) throw new Error('Invalid VDOS archive: manifest.json is missing');
    let manifest;
    try {
      if (!textDecoder) throw new Error('TextDecoder is unavailable');
      manifest = JSON.parse(textDecoder.decode(manifestBytes));
    } catch (error) {
      throw new Error(`Invalid VDOS manifest JSON: ${error?.message || error}`);
    }
    if (!manifest || manifest.format !== 'vdos-project') throw new Error('Invalid VDOS manifest format');
    if (!Number.isInteger(Number(manifest.packageVersion)) || Number(manifest.packageVersion) < 1) throw new Error('Invalid VDOS packageVersion');
    if (!Number.isInteger(Number(manifest.schemaVersion)) || Number(manifest.schemaVersion) < 1) throw new Error('Invalid VDOS schemaVersion');

    return { manifest, entries, warnings:[], inflatedBytes:inflated, archiveBytes:bytes.byteLength };
  }

  async function verifyManifestFiles(decoded) {
    if (!decoded?.manifest || !(decoded?.entries instanceof Map)) throw new Error('Decoded VDOS archive is required');
    const listed = Array.isArray(decoded.manifest.files) ? decoded.manifest.files : null;
    if (!listed) throw new Error('VDOS manifest files index is required');
    const coreErrors = [];
    const assetErrors = [];
    const indexed = new Set();

    for (const row of listed) {
      let path;
      try { path = normalizeArchivePath(row?.path); }
      catch (_) {
        coreErrors.push(errorRow(String(row?.path || ''), 'unsafe_path'));
        continue;
      }
      if (path === 'manifest.json') {
        coreErrors.push(errorRow(path, 'self_indexed'));
        continue;
      }
      if (indexed.has(path)) {
        coreErrors.push(errorRow(path, 'duplicate_manifest_entry'));
        continue;
      }
      indexed.add(path);
      const errors = row?.role === 'asset' ? assetErrors : coreErrors;
      if (!['core', 'asset'].includes(row?.role)) {
        coreErrors.push(errorRow(path, 'invalid_role', 'core|asset', row?.role));
        continue;
      }
      const bytes = decoded.entries.get(path);
      if (!bytes) {
        errors.push(errorRow(path, 'missing'));
        continue;
      }
      if (Number(row.size) !== bytes.byteLength) {
        errors.push(errorRow(path, 'size_mismatch', Number(row.size), bytes.byteLength));
        continue;
      }
      const actualHash = await sha256Hex(bytes);
      if (String(row.sha256 || '').toLowerCase() !== actualHash) {
        errors.push(errorRow(path, 'checksum_mismatch', String(row.sha256 || ''), actualHash));
      }
    }

    for (const path of decoded.entries.keys()) {
      if (path === 'manifest.json') continue;
      if (!indexed.has(path)) coreErrors.push(errorRow(path, 'unindexed_payload'));
    }

    return {
      verified:coreErrors.length === 0 && assetErrors.length === 0,
      coreErrors,
      assetErrors
    };
  }

  return {
    VDOS_CODEC_LIMITS:DEFAULT_LIMITS,
    stableJsonBytes,
    sha256Hex,
    normalizeArchivePath,
    encodeVdos,
    decodeVdos,
    verifyManifestFiles
  };
});
