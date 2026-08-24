const assert = require('node:assert/strict');
const { measurePixels, ratioToNumber, compareRatio } = require('./image-measurements.js');

function image(width, height, pixelAt) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a = 255] = pixelAt(x, y);
      const i = (y * width + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
    }
  }
  return { width, height, data };
}

const black = measurePixels(image(4, 4, () => [0, 0, 0]));
const white = measurePixels(image(4, 4, () => [255, 255, 255]));
const gray = measurePixels(image(4, 4, () => [128, 128, 128]));
const red = measurePixels(image(4, 4, () => [255, 0, 0]));
const checker = measurePixels(image(8, 8, (x, y) => ((x + y) % 2 ? [255, 255, 255] : [0, 0, 0])));
const gradient = measurePixels(image(16, 2, (x) => {
  const v = Math.round(x / 15 * 255);
  return [v, v, v];
}));

assert.equal(black.meanLuminance, 0);
assert.equal(black.luminanceStdDev, 0);
assert.equal(black.edgeDensity, 0);
assert.equal(white.meanLuminance, 1);
assert.ok(red.meanSaturation > gray.meanSaturation + 0.8, 'saturated red should be far more saturated than gray');
assert.ok(checker.edgeDensity > black.edgeDensity, 'checkerboard should have more edges than a flat image');
assert.ok(checker.localContrast > black.localContrast, 'checkerboard should have more local contrast than a flat image');
assert.ok(checker.entropyProxy > black.entropyProxy, 'checkerboard should have more histogram entropy than a flat image');
assert.ok(gradient.luminanceStdDev > gray.luminanceStdDev, 'gradient should have wider luminance distribution than flat gray');
assert.equal(black.aspectRatio, 1);

assert.equal(ratioToNumber('16:9'), 16 / 9);
assert.equal(ratioToNumber('3:4'), 3 / 4);
assert.equal(compareRatio(1600, 900, '16:9').status, 'pass');
assert.equal(compareRatio(1200, 900, '16:9').status, 'warn');
assert.throws(() => ratioToNumber('bad'), /ratio/i);

console.log('image measurement tests passed');
