import { ColorModel } from '../model/color-model.js';
import { MODEL_CONFIG } from '../view/app-view.js';
import { calculateRgbXyzMatrices } from '../model/illuminants.js';

export class ColorController {
  constructor(view) {
    this.view = view;
    this.settings = {
      algorithm: 'gcr',
      blackGeneration: 100,
      ucrThreshold: 55,
      gamutStrategy: 'clipping',
      illuminant: 'D65',
    };
    this.matrixInfo = calculateRgbXyzMatrices(this.settings.illuminant);
    this.state = ColorModel.fromRgb({ r: 59, g: 130, b: 246 }, this.settings);
    this.view.bindController(this);
    this.refresh();
  }

  setColor(model, values) {
    if (model === 'rgb') this.state = ColorModel.fromRgb(values, this.settings);
    if (model === 'cmyk') this.state = ColorModel.fromCmyk(values, this.settings);
    if (model === 'hls') this.state = ColorModel.fromHls(values, this.settings);
    this.refresh();
  }

  setFromPalette(hex) {
    this.state = ColorModel.fromHex(hex, this.settings);
    this.refresh();
  }

  updateSettings(patch) {
    this.settings = { ...this.settings, ...patch };
    if (Object.hasOwn(patch, 'illuminant')) {
      this.matrixInfo = calculateRgbXyzMatrices(this.settings.illuminant);
    }
    this.state = ColorModel.fromRgb(this.state.rgb, this.settings);
    this.refresh();
  }

  refresh() {
    this.view.update(this.state, this.settings, this.buildGradients());
  }

  buildGradients() {
    const result = {};
    Object.entries(MODEL_CONFIG).forEach(([model, config]) => {
      result[model] = {};
      config.channels.forEach((channel) => {
        result[model][channel.key] = this.gradientFor(model, channel);
      });
    });
    return result;
  }

  gradientFor(model, channel) {
    const config = MODEL_CONFIG[model];
    const stopCount = model === 'hls' && channel.key === 'h' ? 12 : 8;
    const stops = [];

    for (let i = 0; i <= stopCount; i += 1) {
      const ratio = i / stopCount;
      const value = channel.min + (channel.max - channel.min) * ratio;
      const sample = { ...this.state[model], [channel.key]: value };
      let rgb;
      if (model === 'rgb') rgb = sample;
      if (model === 'cmyk') rgb = ColorModel.cmykToRgb(sample);
      if (model === 'hls') rgb = ColorModel.hlsToRgb(sample);
      stops.push(`${ColorModel.rgbToHex(rgb)} ${ratio * 100}%`);
    }

    return `linear-gradient(90deg, ${stops.join(', ')})`;
  }
}
