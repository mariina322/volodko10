export const multiplyMatrixVector = (matrix, vector) => matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));

export const multiplyMatrices = (a, b) => a.map((row) => b[0].map((_, column) => row.reduce((sum, value, index) => sum + value * b[index][column], 0)));

export const inverse3 = (m) => {
  const a = m[0][0], b = m[0][1], c = m[0][2];
  const d = m[1][0], e = m[1][1], f = m[1][2];
  const g = m[2][0], h = m[2][1], i = m[2][2];

  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const D = -(b * i - c * h);
  const E = a * i - c * g;
  const F = -(a * h - b * g);
  const G = b * f - c * e;
  const H = -(a * f - c * d);
  const I = a * e - b * d;

  const determinant = a * A + b * B + c * C;
  if (Math.abs(determinant) < 1e-14) throw new Error('Матрица вырождена');

  return [
    [A / determinant, D / determinant, G / determinant],
    [B / determinant, E / determinant, H / determinant],
    [C / determinant, F / determinant, I / determinant],
  ];
};
