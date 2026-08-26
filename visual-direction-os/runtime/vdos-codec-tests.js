const assert = require('node:assert/strict');
const {
  stableJsonBytes,
  sha256Hex,
  encodeVdos,
  decodeVdos,
  verifyManifestFiles,
  normalizeArchivePath
} = require('./vdos-codec.js');

function text(value) { return new TextEncoder().encode(value); }

(async () => {
  const a = stableJsonBytes({ z:1, a:{ y:2, x:3 }, list:[{ b:2, a:1 }] });
  const b = stableJsonBytes({ list:[{ a:1, b:2 }], a:{ x:3, y:2 }, z:1 });
  assert.deepEqual([...a], [...b], 'stable JSON must recursively sort object keys');
  assert.equal(new TextDecoder().decode(a), '{"a":{"x":3,"y":2},"list":[{"a":1,"b":2}],"z":1}');
  assert.equal(await sha256Hex(text('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

  for (const unsafe of [
    '../evil.json',
    'artifacts/../evil.json',
    'artifacts\\..\\evil.json',
    '/project.json',
    'C:/project.json',
    'artifacts/\u0000evil.json',
    './project.json',
    'unknown.json',
    'other/file.json'
  ]) {
    assert.throws(() => normalizeArchivePath(unsafe), /unsafe|allowed|path/i, unsafe);
  }
  assert.equal(normalizeArchivePath('project.json'), 'project.json');
  assert.equal(normalizeArchivePath('artifacts/gen-1.json'), 'artifacts/gen-1.json');
  assert.equal(normalizeArchivePath('images/gen-1.png'), 'images/gen-1.png');
  assert.equal(normalizeArchivePath('references/abc.webp'), 'references/abc.webp');

  const png = Uint8Array.from([137,80,78,71,1,2,3]);
  const archive = await encodeVdos({
    manifestBase:{
      format:'vdos-project',
      packageVersion:1,
      schemaVersion:1,
      packageId:'pkg-1',
      exportedAt:'2026-08-26T00:00:00Z',
      createdWith:{ appVersion:'test' },
      project:{ id:'p1', title:'P' },
      packageCompleteness:'complete',
      missingAssets:[]
    },
    files:[
      { path:'project.json', role:'core', bytes:stableJsonBytes({ schemaVersion:1, id:'p1' }) },
      { path:'lineage.json', role:'core', bytes:stableJsonBytes({ schemaVersion:1, roots:['g1'], nodes:[{artifactId:'g1',parentArtifactId:null}] }) },
      { path:'comparisons.json', role:'core', bytes:stableJsonBytes({ schemaVersion:1, comparisons:[] }) },
      { path:'memory.json', role:'core', bytes:stableJsonBytes({ schemaVersion:1, snapshot:{locked:[],active:[],watch:[]} }) },
      { path:'artifacts/g1.json', role:'core', bytes:stableJsonBytes({ schemaVersion:1, id:'g1' }) },
      { path:'images/g1.png', role:'asset', bytes:png }
    ]
  });

  assert.ok(archive instanceof Uint8Array);
  assert.ok(archive.length > png.length);
  const decoded = await decodeVdos(archive);
  assert.equal(decoded.manifest.format, 'vdos-project');
  assert.equal(decoded.manifest.files.some((row) => row.path === 'manifest.json'), false, 'manifest must not hash itself');
  assert.deepEqual([...decoded.entries.get('images/g1.png')], [...png], 'binary bytes must round-trip exactly');
  assert.equal(decoded.entries.has('manifest.json'), true);

  const verification = await verifyManifestFiles(decoded);
  assert.deepEqual(verification.coreErrors, []);
  assert.deepEqual(verification.assetErrors, []);
  assert.equal(verification.verified, true);

  const tooFewEntries = await assert.rejects(
    () => decodeVdos(archive, { maxEntries:2 }),
    /entries|limit|archive/i
  );
  void tooFewEntries;
  await assert.rejects(
    () => decodeVdos(archive, { maxInflatedBytes:10 }),
    /inflated|bytes|limit|archive/i
  );
  await assert.rejects(
    () => decodeVdos(Uint8Array.of(1,2,3,4,5)),
    /zip|archive|invalid/i
  );

  // Codec accepts an injectable ZIP adapter so path safety can be tested before project parsing.
  const maliciousAdapter = {
    unzipSync() {
      return {
        'manifest.json': text('{"format":"vdos-project","packageVersion":1,"schemaVersion":1,"files":[]}'),
        '../evil.json': text('{}')
      };
    }
  };
  await assert.rejects(
    () => decodeVdos(Uint8Array.of(80,75,3,4), { zipAdapter:maliciousAdapter }),
    /unsafe|path/i
  );

  const duplicateAdapter = {
    unzipSync() {
      // Use an entries list hook because plain JS objects cannot represent duplicate keys.
      return [
        ['manifest.json', text('{"format":"vdos-project","packageVersion":1,"schemaVersion":1,"files":[]}')],
        ['project.json', text('{}')],
        ['project.json', text('{}')]
      ];
    }
  };
  await assert.rejects(
    () => decodeVdos(Uint8Array.of(80,75,3,4), { zipAdapter:duplicateAdapter }),
    /duplicate/i
  );

  console.log('vdos codec tests passed');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
