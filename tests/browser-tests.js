import { ColorModel } from '../src/model/color-model.js';

const settings = { algorithm: 'gcr', blackGeneration: 100, ucrThreshold: 55, gamutStrategy: 'clipping' };
const tests = [];
const add = (name, fn) => tests.push({ name, fn });
const near = (a, b, eps = 1e-6) => { if (Math.abs(a - b) > eps) throw new Error(`${a} != ${b}`); };

add('RGB red → HLS', () => {
  const hls = ColorModel.rgbToHls({ r: 255, g: 0, b: 0 });
  near(hls.h, 0); near(hls.l, 50); near(hls.s, 100);
});
add('RGB red → CMYK', () => {
  const c = ColorModel.rgbToCmyk({ r: 255, g: 0, b: 0 }, settings);
  near(c.c, 0); near(c.m, 100); near(c.y, 100); near(c.k, 0);
});
add('HLS → RGB roundtrip', () => {
  const rgb = { r: 37, g: 140, b: 211 };
  const back = ColorModel.hlsToRgb(ColorModel.rgbToHls(rgb));
  near(back.r, rgb.r); near(back.g, rgb.g); near(back.b, rgb.b);
});
add('CMYK → RGB', () => {
  const rgb = ColorModel.cmykToRgb({ c: 0, m: 100, y: 100, k: 0 });
  near(rgb.r, 255); near(rgb.g, 0); near(rgb.b, 0);
});
add('CMYK source remains unchanged', () => {
  const input = { c: 20, m: 40, y: 10, k: 25 };
  const state = ColorModel.fromCmyk(input, settings);
  near(state.cmyk.c, 20); near(state.cmyk.m, 40); near(state.cmyk.y, 10); near(state.cmyk.k, 25);
});
add('GCR reversible', () => {
  const rgb = { r: 35, g: 52, b: 61 };
  const back = ColorModel.cmykToRgb(ColorModel.rgbToCmyk(rgb, settings));
  near(back.r, rgb.r); near(back.g, rgb.g); near(back.b, rgb.b);
});
add('UCR reversible', () => {
  const rgb = { r: 35, g: 52, b: 61 };
  const c = ColorModel.rgbToCmyk(rgb, { ...settings, algorithm: 'ucr', ucrThreshold: 50 });
  const back = ColorModel.cmykToRgb(c);
  near(back.r, rgb.r); near(back.g, rgb.g); near(back.b, rgb.b);
});
add('UCR threshold', () => {
  const c = ColorModel.rgbToCmyk({ r: 180, g: 190, b: 200 }, { ...settings, algorithm: 'ucr', ucrThreshold: 50 });
  near(c.k, 0);
});
add('HEX palette', () => {
  const state = ColorModel.fromHex('#FF0000', settings);
  near(state.hls.h, 0); near(state.hls.l, 50); near(state.hls.s, 100);
});

const list = document.querySelector('#results');
let passed = 0;
for (const test of tests) {
  const row = document.createElement('li');
  try {
    test.fn();
    row.textContent = `✓ ${test.name}`;
    row.className = 'pass';
    passed += 1;
  } catch (error) {
    row.textContent = `✗ ${test.name}: ${error.message}`;
    row.className = 'fail';
  }
  list.append(row);
}
document.querySelector('#summary').textContent = `${passed} / ${tests.length} тестов пройдено`;
