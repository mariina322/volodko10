export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export const normalizeHue = (hue) => {
  if (!Number.isFinite(hue)) return 0;
  const normalized = hue % 360;
  return normalized < 0 ? normalized + 360 : normalized;
};

export const round = (value, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export const rgbToHex = ({ r, g, b }) => {
  const values = [r, g, b].map((value) => Math.round(clamp(value, 0, 255)));
  return `#${values.map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
};

export const hexToRgb = (hex) => {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error('Некорректное HEX-значение');
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
};

export const approximatelyEqual = (a, b, epsilon = 1e-9) => Math.abs(a - b) <= epsilon;
