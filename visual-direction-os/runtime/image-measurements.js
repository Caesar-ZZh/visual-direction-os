(function attachImageMeasurements(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.VisualDirectionRuntime = Object.assign(root.VisualDirectionRuntime || {}, api);
})(typeof globalThis !== 'undefined' ? globalThis : this, function imageMeasurementsFactory() {
  'use strict';

  const round = (value, digits = 4) => Number(Number(value || 0).toFixed(digits));

  function ratioToNumber(ratio) {
    const match = String(ratio || '').trim().match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/);
    if (!match) throw new Error(`Invalid ratio: ${ratio}`);
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (!(width > 0) || !(height > 0)) throw new Error(`Invalid ratio: ${ratio}`);
    return width / height;
  }

  function compareRatio(width, height, targetRatio, tolerance = 0.03) {
    if (!(width > 0) || !(height > 0)) throw new Error('Image width and height must be positive');
    const target = ratioToNumber(targetRatio);
    const actual = width / height;
    const relativeError = Math.abs(actual - target) / target;
    return {
      target: round(target),
      actual: round(actual),
      relativeError: round(relativeError),
      status: relativeError <= tolerance ? 'pass' : 'warn'
    };
  }

  function pixelLuminance(r, g, b) {
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }

  function pixelSaturation(r, g, b) {
    const max = Math.max(r, g, b) / 255;
    const min = Math.min(r, g, b) / 255;
    return max <= 0 ? 0 : (max - min) / max;
  }

  function measurePixels({ width, height, data }) {
    if (!Number.isInteger(width) || width <= 0 || !Number.isInteger(height) || height <= 0) {
      throw new Error('measurePixels requires positive integer width and height');
    }
    if (!data || typeof data.length !== 'number' || data.length < width * height * 4) {
      throw new Error('measurePixels requires RGBA pixel data');
    }

    const luminance = new Float64Array(width * height);
    const histogram = new Uint32Array(16);
    let count = 0;
    let luminanceSum = 0;
    let luminanceSqSum = 0;
    let saturationSum = 0;
    let shadowCount = 0;
    let highlightCount = 0;
    let highSaturationCount = 0;

    for (let p = 0; p < width * height; p += 1) {
      const i = p * 4;
      const alpha = data[i + 3] / 255;
      if (alpha <= 0) continue;
      const lum = pixelLuminance(data[i], data[i + 1], data[i + 2]);
      const sat = pixelSaturation(data[i], data[i + 1], data[i + 2]);
      luminance[p] = lum;
      count += 1;
      luminanceSum += lum;
      luminanceSqSum += lum * lum;
      saturationSum += sat;
      if (lum < 0.25) shadowCount += 1;
      if (lum > 0.75) highlightCount += 1;
      if (sat > 0.65) highSaturationCount += 1;
      histogram[Math.min(15, Math.floor(lum * 16))] += 1;
    }

    if (!count) throw new Error('measurePixels found no visible pixels');
    const meanLuminance = luminanceSum / count;
    const variance = Math.max(0, luminanceSqSum / count - meanLuminance * meanLuminance);

    let gradientCount = 0;
    let edgeCount = 0;
    let contrastSum = 0;
    const EDGE_THRESHOLD = 0.12;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const p = y * width + x;
        const here = luminance[p];
        if (x + 1 < width) {
          const diff = Math.abs(here - luminance[p + 1]);
          contrastSum += diff; gradientCount += 1;
          if (diff >= EDGE_THRESHOLD) edgeCount += 1;
        }
        if (y + 1 < height) {
          const diff = Math.abs(here - luminance[p + width]);
          contrastSum += diff; gradientCount += 1;
          if (diff >= EDGE_THRESHOLD) edgeCount += 1;
        }
      }
    }

    let entropy = 0;
    for (const bin of histogram) {
      if (!bin) continue;
      const probability = bin / count;
      entropy -= probability * Math.log2(probability);
    }

    return {
      width,
      height,
      aspectRatio: round(width / height),
      meanLuminance: round(meanLuminance),
      luminanceStdDev: round(Math.sqrt(variance)),
      shadowShare: round(shadowCount / count),
      highlightShare: round(highlightCount / count),
      meanSaturation: round(saturationSum / count),
      highSaturationShare: round(highSaturationCount / count),
      edgeDensity: round(gradientCount ? edgeCount / gradientCount : 0),
      localContrast: round(gradientCount ? contrastSum / gradientCount : 0),
      entropyProxy: round(entropy / 4)
    };
  }

  return { measurePixels, ratioToNumber, compareRatio };
});
