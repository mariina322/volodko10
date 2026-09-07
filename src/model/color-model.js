import { clamp, hexToRgb, normalizeHue, rgbToHex } from './color-utils.js';
import { mapRgbToGamut } from './gamut.js';
import { rgbToCmyk, cmykToRgb } from './rgb-cmyk.js';
import { rgbToHls, hlsToRgb } from './rgb-hls.js';

const sanitizeCmyk = (cmyk) => ({
  c: clamp(Number(cmyk.c), 0, 100),
  m: clamp(Number(cmyk.m), 0, 100),
  y: clamp(Number(cmyk.y), 0, 100),
  k: clamp(Number(cmyk.k), 0, 100),
});

const sanitizeHls = (hls) => ({
  h: normalizeHue(Number(hls.h)),
  l: clamp(Number(hls.l), 0, 100),
  s: clamp(Number(hls.s), 0, 100),
});

const finishFromRgb = (rgb, settings, meta = {}) => {
  const gamut = mapRgbToGamut(rgb, settings.gamutStrategy);
  const actualRgb = gamut.rgb;
  return {
    rgb: actualRgb,
    cmyk: rgbToCmyk(actualRgb, settings),
    hls: rgbToHls(actualRgb),
    hex: rgbToHex(actualRgb),
    warning: gamut.changed ? {
      type: 'gamut',
      original: gamut.original,
      strategy: settings.gamutStrategy,
    } : meta.warning ?? null,
  };
};

export const fromRgb = (rgb, settings) => finishFromRgb({
  r: Number(rgb.r),
  g: Number(rgb.g),
  b: Number(rgb.b),
}, settings);

export const fromCmyk = (cmyk, settings) => {
  const clean = sanitizeCmyk(cmyk);
  const changed = ['c', 'm', 'y', 'k'].some((key) => Number(cmyk[key]) !== clean[key]);
  const rgb = cmykToRgb(clean);
  return {
    rgb,
    cmyk: clean,
    hls: rgbToHls(rgb),
    hex: rgbToHex(rgb),
    warning: changed ? { type: 'input', model: 'CMYK' } : null,
  };
};

export const fromHls = (hls, settings) => {
  const clean = sanitizeHls(hls);
  const rawH = Number(hls.h);
  const changed = rawH !== clean.h || Number(hls.l) !== clean.l || Number(hls.s) !== clean.s;
  return finishFromRgb(hlsToRgb(clean), settings, {
    warning: changed ? { type: 'input', model: 'HLS' } : null,
  });
};

export const fromHex = (hex, settings) => finishFromRgb(hexToRgb(hex), settings);

export const ColorModel = {
  fromRgb,
  fromCmyk,
  fromHls,
  fromHex,
  rgbToCmyk,
  cmykToRgb,
  rgbToHls,
  hlsToRgb,
  rgbToHex,
  hexToRgb,
};
