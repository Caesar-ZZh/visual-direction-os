const assert = require('node:assert/strict');
const {
  AGNES_MODEL,
  AGNES_ENDPOINT,
  AGNES_SIZES,
  AGNES_RATIOS,
  buildAgnesPrompt,
  buildAgnesRequest
} = require('./agnes-adapter.js');

const compiled = {
  version: '0.1.0',
  engine: 'deterministic-v0.1',
  grammarId: 'boundary-relational',
  must: [
    'Narrative verb: WITHDRAW; preserve the narrative function before surface styling.',
    'Primary variable: Boundary; it must carry the main visual storytelling load.',
    'Composition: medium wide, small subject, high negative space; keep the platform geometry dominant.'
  ],
  should: [
    'Camera: witness; static with restrained distance.',
    'Color: relational ownership; boundary-local migration.'
  ],
  optional: ['Texture: selective paper grain.'],
  antiRules: ['no global watercolor filter', 'no generic cinematic teal-orange grade'],
  evidenceGaps: [{ field: 'temporal.signature', status: 'evidence_incomplete', confidence: 0.42 }]
};

assert.equal(AGNES_MODEL, 'agnes-image-2.1-flash');
assert.equal(AGNES_ENDPOINT, 'https://apihub.agnes-ai.com/v1/images/generations');
assert.ok(AGNES_SIZES.includes('2K'));
assert.ok(AGNES_RATIOS.includes('16:9'));

const prompt = buildAgnesPrompt(compiled);
assert.match(prompt, /Visual hierarchy and narrative intent:/);
assert.match(prompt, /WITHDRAW/);
assert.match(prompt, /Boundary/);
assert.match(prompt, /Do not:/);
assert.match(prompt, /no global watercolor filter/);
assert.doesNotMatch(prompt, /EVIDENCE GAPS:/, 'evidence gaps are provenance, not generation instructions');

const textRequest = buildAgnesRequest({ compiled, size: '2K', ratio: '16:9' });
assert.equal(textRequest.model, AGNES_MODEL);
assert.equal(textRequest.size, '2K');
assert.equal(textRequest.ratio, '16:9');
assert.equal(textRequest.extra_body.response_format, 'url');
assert.equal('image' in textRequest, false, 'image must never be sent at the top level');
assert.equal('image' in textRequest.extra_body, false, 'text-to-image should omit image input');

const textBase64Request = buildAgnesRequest({ compiled, size: '1K', ratio: '1:1', responseFormat: 'b64_json' });
assert.equal(textBase64Request.return_base64, true, 'text-to-image Base64 should keep return_base64 for Agnes compatibility');
assert.equal(textBase64Request.extra_body.response_format, 'b64_json', 'text-to-image Base64 should explicitly request b64_json so the provider cannot fall back to URL');

const refs = [
  { source: 'data:image/png;base64,AAAA', role: 'character', preserve: ['identity', 'silhouette'] },
  { source: 'https://example.com/composition.png', role: 'composition', preserve: ['camera angle'] }
];
const imageRequest = buildAgnesRequest({ compiled, size: '1K', ratio: '3:4', references: refs, responseFormat: 'b64_json' });
assert.deepEqual(imageRequest.extra_body.image, refs.map((ref) => ref.source));
assert.equal('image' in imageRequest, false);
assert.equal(imageRequest.extra_body.response_format, 'b64_json');
assert.match(imageRequest.prompt, /Reference image 1/i);
assert.match(imageRequest.prompt, /character identity/i);
assert.match(imageRequest.prompt, /Reference image 2/i);
assert.match(imageRequest.prompt, /composition/i);

assert.throws(() => buildAgnesRequest({ compiled, size: '8K', ratio: '16:9' }), /Unsupported Agnes size/);
assert.throws(() => buildAgnesRequest({ compiled, size: '2K', ratio: '5:4' }), /Unsupported Agnes ratio/);
assert.throws(() => buildAgnesRequest({ compiled, references: [{ source: '', role: 'character' }] }), /reference source/i);

console.log('agnes adapter tests passed');
