import { clamp } from './color-utils.js';

export const isRgbInGamut = ({ r, g, b }) => [r, g, b].every((value) => Number.isFinite(value) && value >= 0 && value <= 255);

export const clipRgb = ({ r, g, b }) => ({
  r: clamp(Number.isFinite(r) ? r : 0, 0, 255),
  g: clamp(Number.isFinite(g) ? g : 0, 0, 255),
  b: clamp(Number.isFinite(b) ? b : 0, 0, 255),
});

export const scaleRgb = ({ r, g, b }) => {
  const values = [r, g, b].map((value) => Number.isFinite(value) ? value : 0);
  const low = Math.min(0, ...values);
  const high = Math.max(255, ...values);
  if (high === low) return { r: 0, g: 0, b: 0 };
  const scale = (value) => (value - low) * 255 / (high - low);
  return { r: scale(values[0]), g: scale(values[1]), b: scale(values[2]) };
};

export const mapRgbToGamut = (rgb, strategy = 'clipping') => {
  if (isRgbInGamut(rgb)) {
    return { rgb: { ...rgb }, changed: false, original: { ...rgb } };
  }
  const mapped = strategy === 'scaling' ? scaleRgb(rgb) : clipRgb(rgb);
  return { rgb: mapped, changed: true, original: { ...rgb } };
};
