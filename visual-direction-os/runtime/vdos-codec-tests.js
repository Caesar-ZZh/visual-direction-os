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
  assert.deepEqual([...a], [...b]);
  assert.equal(await sha256Hex(text('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

  for (const unsafe of ['../evil.json','artifacts/../evil.json','artifacts\\..\\evil.json','/project.json','C:/project.json','artifacts/\u0000evil.json','./project.json','unknown.json','other/file.json']) {
    assert.throws(() => normalizeArchivePath(unsafe), /unsafe|allowed|path/i, unsafe);
  }
  for (const safe of ['project.json','sequences.json','shots.json','artifacts/gen-1.json','images/gen-1.png','references/abc.webp']) assert.equal(normalizeArchivePath(safe), safe);

  const png = Uint8Array.from([137,80,78,71,1,2,3]);
  const archive = await encodeVdos({
    manifestBase:{ format:'vdos-project', packageVersion:1, schemaVersion:2, packageId:'pkg-1', exportedAt:'2026-08-28T00:00:00Z', createdWith:{appVersion:'2.1-m6'}, project:{id:'p1',title:'P'}, packageCompleteness:'complete', missingAssets:[] },
    files:[
      { path:'project.json', role:'core', bytes:stableJsonBytes({schemaVersion:2,id:'p1'}) },
      { path:'sequences.json', role:'core', bytes:stableJsonBytes({schemaVersion:2,projectId:'p1',sequences:[{id:'q1'}]}) },
      { path:'shots.json', role:'core', bytes:stableJsonBytes({schemaVersion:2,projectId:'p1',shots:[{id:'s1'}]}) },
      { path:'lineage.json', role:'core', bytes:stableJsonBytes({schemaVersion:2,roots:['g1'],nodes:[{artifactId:'g1',parentArtifactId:null}]}) },
      { path:'comparisons.json', role:'core', bytes:stableJsonBytes({schemaVersion:2,comparisons:[]}) },
      { path:'memory.json', role:'core', bytes:stableJsonBytes({schemaVersion:2,snapshot:{locked:[],active:[],watch:[]}}) },
      { path:'artifacts/g1.json', role:'core', bytes:stableJsonBytes({schemaVersion:2,id:'g1'}) },
      { path:'images/g1.png', role:'asset', bytes:png }
    ]
  });

  const decoded = await decodeVdos(archive);
  assert.equal(decoded.manifest.schemaVersion,2);
  assert.equal(decoded.entries.has('sequences.json'),true);
  assert.equal(decoded.entries.has('shots.json'),true);
  assert.deepEqual([...decoded.entries.get('images/g1.png')],[...png]);
  const verification=await verifyManifestFiles(decoded);
  assert.deepEqual(verification.coreErrors,[]);
  assert.deepEqual(verification.assetErrors,[]);
  assert.equal(verification.verified,true);

  await assert.rejects(() => decodeVdos(archive,{maxEntries:2}),/entries|limit|archive/i);
  await assert.rejects(() => decodeVdos(archive,{maxInflatedBytes:10}),/inflated|bytes|limit|archive/i);
  await assert.rejects(() => decodeVdos(Uint8Array.of(1,2,3,4,5)),/zip|archive|invalid/i);
  const maliciousAdapter={unzipSync(){return{'manifest.json':text('{"format":"vdos-project","packageVersion":1,"schemaVersion":2,"files":[]}'),'../evil.json':text('{}')}}};
  await assert.rejects(()=>decodeVdos(Uint8Array.of(80,75,3,4),{zipAdapter:maliciousAdapter}),/unsafe|path/i);
  const duplicateAdapter={unzipSync(){return[['manifest.json',text('{"format":"vdos-project","packageVersion":1,"schemaVersion":2,"files":[]}')],['project.json',text('{}')],['project.json',text('{}')]]}};
  await assert.rejects(()=>decodeVdos(Uint8Array.of(80,75,3,4),{zipAdapter:duplicateAdapter}),/duplicate/i);
  console.log('vdos codec tests passed');
})().catch((error)=>{console.error(error);process.exitCode=1;});