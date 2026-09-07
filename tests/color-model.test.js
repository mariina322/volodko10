import test from 'node:test';
import assert from 'node:assert/strict';
import { ColorModel } from '../src/model/color-model.js';
import { clipRgb, scaleRgb } from '../src/model/gamut.js';
import { calculateRgbXyzMatrices } from '../src/model/illuminants.js';
import { multiplyMatrices } from '../src/model/math.js';

const settings = {
  algorithm: 'gcr',
  blackGeneration: 100,
  ucrThreshold: 55,
  gamutStrategy: 'clipping',
  illuminant: 'D65',
};

const near = (actual, expected, epsilon = 1e-6) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);

const nearRgb = (actual, expected, epsilon = 1e-6) => {
  near(actual.r, expected.r, epsilon);
  near(actual.g, expected.g, epsilon);
  near(actual.b, expected.b, epsilon);
};

test('RGB red converts to HLS(0, 50, 100)', () => {
  const hls = ColorModel.rgbToHls({ r: 255, g: 0, b: 0 });
  near(hls.h, 0);
  near(hls.l, 50);
  near(hls.s, 100);
});

test('RGB red converts to CMYK(0, 100, 100, 0)', () => {
  const cmyk = ColorModel.rgbToCmyk({ r: 255, g: 0, b: 0 }, settings);
  near(cmyk.c, 0);
  near(cmyk.m, 100);
  near(cmyk.y, 100);
  near(cmyk.k, 0);
});

test('HLS red converts back to RGB red', () => {
  nearRgb(ColorModel.hlsToRgb({ h: 0, l: 50, s: 100 }), { r: 255, g: 0, b: 0 });
});

test('RGB-HLS-RGB roundtrip for representative colors', () => {
  const samples = [
    { r: 0, g: 0, b: 0 },
    { r: 255, g: 255, b: 255 },
    { r: 12, g: 200, b: 91 },
    { r: 71, g: 22, b: 240 },
    { r: 128, g: 128, b: 128 },
  ];
  samples.forEach((rgb) => nearRgb(ColorModel.hlsToRgb(ColorModel.rgbToHls(rgb)), rgb, 1e-6));
});

test('CMYK-RGB formula matches the supplied RGB-CMYK relation', () => {
  nearRgb(ColorModel.cmykToRgb({ c: 20, m: 40, y: 10, k: 25 }), {
    r: 153,
    g: 114.75,
    b: 172.125,
  });
});


test('CMYK entered by the user remains the source representation', () => {
  const input = { c: 20, m: 40, y: 10, k: 25 };
  const state = ColorModel.fromCmyk(input, settings);
  near(state.cmyk.c, input.c);
  near(state.cmyk.m, input.m);
  near(state.cmyk.y, input.y);
  near(state.cmyk.k, input.k);
  nearRgb(state.rgb, ColorModel.cmykToRgb(input));
});

test('GCR separation is reversible', () => {
  const rgb = { r: 35, g: 52, b: 61 };
  const cmyk = ColorModel.rgbToCmyk(rgb, { ...settings, algorithm: 'gcr' });
  nearRgb(ColorModel.cmykToRgb(cmyk), rgb, 1e-6);
});

test('UCR separation is reversible', () => {
  const rgb = { r: 35, g: 52, b: 61 };
  const cmyk = ColorModel.rgbToCmyk(rgb, { ...settings, algorithm: 'ucr', ucrThreshold: 50 });
  nearRgb(ColorModel.cmykToRgb(cmyk), rgb, 1e-6);
});

test('GCR and UCR produce different black separation in shadows', () => {
  const rgb = { r: 35, g: 52, b: 61 };
  const gcr = ColorModel.rgbToCmyk(rgb, { ...settings, algorithm: 'gcr' });
  const ucr = ColorModel.rgbToCmyk(rgb, { ...settings, algorithm: 'ucr', ucrThreshold: 50 });
  assert.notEqual(Number(gcr.k.toFixed(6)), Number(ucr.k.toFixed(6)));
});

test('UCR does not introduce K below the selected shadow threshold', () => {
  const cmyk = ColorModel.rgbToCmyk({ r: 180, g: 190, b: 200 }, { ...settings, algorithm: 'ucr', ucrThreshold: 50 });
  near(cmyk.k, 0);
});

test('black generation strength changes GCR K amount', () => {
  const rgb = { r: 40, g: 50, b: 60 };
  const weak = ColorModel.rgbToCmyk(rgb, { ...settings, blackGeneration: 25 });
  const strong = ColorModel.rgbToCmyk(rgb, { ...settings, blackGeneration: 100 });
  assert.ok(strong.k > weak.k);
  nearRgb(ColorModel.cmykToRgb(weak), rgb, 1e-6);
  nearRgb(ColorModel.cmykToRgb(strong), rgb, 1e-6);
});

test('Clipping and Scaling are distinct gamut strategies', () => {
  const input = { r: -20, g: 120, b: 300 };
  assert.deepEqual(clipRgb(input), { r: 0, g: 120, b: 255 });
  const scaled = scaleRgb(input);
  near(scaled.r, 0);
  near(scaled.g, 111.5625);
  near(scaled.b, 255);
});

test('out-of-range RGB input is mapped and all models use the mapped RGB', () => {
  const state = ColorModel.fromRgb({ r: -20, g: 120, b: 300 }, settings);
  nearRgb(state.rgb, { r: 0, g: 120, b: 255 });
  nearRgb(ColorModel.hlsToRgb(state.hls), state.rgb, 1e-6);
  nearRgb(ColorModel.cmykToRgb(state.cmyk), state.rgb, 1e-6);
  assert.equal(state.warning.type, 'gamut');
});

test('HLS values outside the domain are normalized or clamped', () => {
  const state = ColorModel.fromHls({ h: 420, l: 120, s: -10 }, settings);
  assert.equal(state.warning.type, 'input');
  near(state.hls.h, 0);
  near(state.hls.l, 100);
  near(state.hls.s, 0);
});

test('CMYK values outside 0..100 are corrected', () => {
  const state = ColorModel.fromCmyk({ c: -5, m: 30, y: 120, k: 10 }, settings);
  assert.equal(state.warning.type, 'input');
  assert.ok(Object.values(state.cmyk).every((value) => value >= 0 && value <= 100));
});

test('palette HEX conversion roundtrip', () => {
  const rgb = ColorModel.hexToRgb('#3B82F6');
  assert.deepEqual(rgb, { r: 59, g: 130, b: 246 });
  assert.equal(ColorModel.rgbToHex(rgb), '#3B82F6');
});


test('D65 RGB-XYZ matrix is calculated dynamically and matches the supplied reference within rounding tolerance', () => {
  const matrix = calculateRgbXyzMatrices('D65').rgbToXyz;
  const reference = [
    [0.412453, 0.357580, 0.180423],
    [0.212671, 0.715160, 0.072169],
    [0.019334, 0.119193, 0.950227],
  ];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      near(matrix[row][column], reference[row][column], 1e-4);
    }
  }
});

test('D65, D50 and E produce different RGB-XYZ matrices', () => {
  const d65 = calculateRgbXyzMatrices('D65').rgbToXyz.flat();
  const d50 = calculateRgbXyzMatrices('D50').rgbToXyz.flat();
  const e = calculateRgbXyzMatrices('E').rgbToXyz.flat();
  assert.notDeepEqual(d65.map((v) => v.toFixed(8)), d50.map((v) => v.toFixed(8)));
  assert.notDeepEqual(d65.map((v) => v.toFixed(8)), e.map((v) => v.toFixed(8)));
});

test('calculated RGB-XYZ and XYZ-RGB matrices are inverses', () => {
  for (const illuminant of ['D65', 'D50', 'E']) {
    const matrices = calculateRgbXyzMatrices(illuminant);
    const identity = multiplyMatrices(matrices.rgbToXyz, matrices.xyzToRgb);
    for (let row = 0; row < 3; row += 1) {
      for (let column = 0; column < 3; column += 1) {
        near(identity[row][column], row === column ? 1 : 0, 1e-10);
      }
    }
  }
});
