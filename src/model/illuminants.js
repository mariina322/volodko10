import { inverse3, multiplyMatrixVector } from './math.js';

const PRIMARIES = {
  r: { x: 0.64, y: 0.33 },
  g: { x: 0.30, y: 0.60 },
  b: { x: 0.15, y: 0.06 },
};

const ILLUMINANTS = {
  D65: { X: 95.047, Y: 100, Z: 108.883 },
  D50: { X: 96.4212, Y: 100, Z: 82.5188 },
  E: { X: 100, Y: 100, Z: 100 },
};

const xyToXyzUnitY = ({ x, y }) => ({
  X: x / y,
  Y: 1,
  Z: (1 - x - y) / y,
});

export const whitePoint = (name, scale = 100) => {
  const source = ILLUMINANTS[name] ?? ILLUMINANTS.D65;
  const factor = scale / source.Y;
  return { X: source.X * factor, Y: scale, Z: source.Z * factor };
};

export const calculateRgbXyzMatrices = (name = 'D65') => {
  const r = xyToXyzUnitY(PRIMARIES.r);
  const g = xyToXyzUnitY(PRIMARIES.g);
  const b = xyToXyzUnitY(PRIMARIES.b);
  const primaryMatrix = [
    [r.X, g.X, b.X],
    [r.Y, g.Y, b.Y],
    [r.Z, g.Z, b.Z],
  ];
  const wp = whitePoint(name, 1);
  const scale = multiplyMatrixVector(inverse3(primaryMatrix), [wp.X, wp.Y, wp.Z]);
  const rgbToXyz = primaryMatrix.map((row) => row.map((value, index) => value * scale[index]));
  const xyzToRgb = inverse3(rgbToXyz);
  return { rgbToXyz, xyzToRgb, whitePoint: whitePoint(name, 100) };
};

export const illuminantNames = Object.keys(ILLUMINANTS);
