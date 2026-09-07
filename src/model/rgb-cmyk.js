import { clamp } from './color-utils.js';

const normalizeRgb = ({ r, g, b }) => ({
  r: clamp(r, 0, 255) / 255,
  g: clamp(g, 0, 255) / 255,
  b: clamp(b, 0, 255) / 255,
});

const separateWithBlack = (c0, m0, y0, k) => {
  const black = clamp(k, 0, Math.min(c0, m0, y0));
  if (black >= 1 - 1e-12) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  const denominator = 1 - black;
  return {
    c: ((c0 - black) / denominator) * 100,
    m: ((m0 - black) / denominator) * 100,
    y: ((y0 - black) / denominator) * 100,
    k: black * 100,
  };
};

export const rgbToCmyk = ({ r, g, b }, settings = {}) => {
  const { algorithm = 'gcr', blackGeneration = 100, ucrThreshold = 55 } = settings;
  const rgb = normalizeRgb({ r, g, b });
  const c0 = 1 - rgb.r;
  const m0 = 1 - rgb.g;
  const y0 = 1 - rgb.b;
  const neutral = Math.min(c0, m0, y0);
  const strength = clamp(blackGeneration, 0, 100) / 100;

  if (neutral <= 1e-12) {
    return { c: c0 * 100, m: m0 * 100, y: y0 * 100, k: 0 };
  }

  let k = 0;
  if (algorithm === 'ucr') {
    const threshold = clamp(ucrThreshold, 0, 99.999) / 100;
    if (neutral > threshold) {
      const shadowShare = (neutral - threshold) / (1 - threshold);
      k = Math.min(neutral, shadowShare * strength);
    }
  } else {
    k = neutral * strength;
  }

  return separateWithBlack(c0, m0, y0, k);
};

export const cmykToRgb = ({ c, m, y, k }) => {
  const cn = clamp(c, 0, 100) / 100;
  const mn = clamp(m, 0, 100) / 100;
  const yn = clamp(y, 0, 100) / 100;
  const kn = clamp(k, 0, 100) / 100;
  return {
    r: 255 * (1 - cn) * (1 - kn),
    g: 255 * (1 - mn) * (1 - kn),
    b: 255 * (1 - yn) * (1 - kn),
  };
};
