const MODEL_CONFIG = {
  rgb: {
    title: 'RGB',
    channels: [
      { key: 'r', label: 'R', min: 0, max: 255, step: 0.01 },
      { key: 'g', label: 'G', min: 0, max: 255, step: 0.01 },
      { key: 'b', label: 'B', min: 0, max: 255, step: 0.01 },
    ],
  },
  cmyk: {
    title: 'CMYK',
    channels: [
      { key: 'c', label: 'C', min: 0, max: 100, step: 0.01 },
      { key: 'm', label: 'M', min: 0, max: 100, step: 0.01 },
      { key: 'y', label: 'Y', min: 0, max: 100, step: 0.01 },
      { key: 'k', label: 'K', min: 0, max: 100, step: 0.01 },
    ],
  },
  hls: {
    title: 'HLS',
    channels: [
      { key: 'h', label: 'H', min: 0, max: 360, step: 0.01 },
      { key: 'l', label: 'L', min: 0, max: 100, step: 0.01 },
      { key: 's', label: 'S', min: 0, max: 100, step: 0.01 },
    ],
  },
};

export class AppView {
  constructor(root) {
    this.root = root;
    this.controller = null;
    this.controls = {};
    this.pickers = {};
    this.renderShell();
  }

  bindController(controller) {
    this.controller = controller;
    this.bindGlobalControls();
    this.bindModelControls();
  }

  renderShell() {
    this.root.innerHTML = `
      <main class="app">
        <header class="header">
          <div>
            <h1>Цветовые модели</h1>
            <p>Лабораторная работа 1 · Вариант 6: CMYK ↔ RGB ↔ HLS</p>
          </div>
          <div class="color-preview">
            <div class="preview-box" id="previewSwatch"></div>
            <div class="preview-hex" id="hexValue">#3B82F6</div>
          </div>
        </header>

        <section class="settings" aria-label="Настройки преобразования">
          <label class="setting">
            <span>Освещение</span>
            <select id="illuminant">
              <option value="D65">D65</option>
              <option value="D50">D50</option>
              <option value="E">E</option>
            </select>
          </label>

          <label class="setting">
            <span>Цветоделение CMYK</span>
            <select id="separationAlgorithm">
              <option value="gcr">GCR</option>
              <option value="ucr">UCR</option>
            </select>
          </label>

          <label class="setting">
            <span>Выход за RGB</span>
            <select id="gamutStrategy">
              <option value="clipping">Clipping</option>
              <option value="scaling">Scaling</option>
            </select>
          </label>
        </section>

        <section class="extra-settings">
          <label class="range-setting">
            <span>Генерация чёрного</span>
            <input id="blackGeneration" type="range" min="0" max="100" step="1" value="100">
            <output id="blackGenerationOutput">100%</output>
          </label>

          <label class="range-setting" id="ucrThresholdWrap" hidden>
            <span>Порог теней UCR</span>
            <input id="ucrThreshold" type="range" min="0" max="95" step="1" value="55">
            <output id="ucrThresholdOutput">55%</output>
          </label>
        </section>

        <div class="notice" id="notice" hidden></div>
        <section class="models" id="modelGrid"></section>
      </main>
    `;

    const grid = this.root.querySelector('#modelGrid');
    ['cmyk', 'rgb', 'hls'].forEach((model) => grid.append(this.createModelCard(model)));
  }

  createModelCard(model) {
    const config = MODEL_CONFIG[model];
    const card = document.createElement('section');
    card.className = 'model-card';
    card.dataset.model = model;

    const rows = config.channels.map((channel) => `
      <div class="channel-row" data-channel="${channel.key}">
        <div class="channel-top">
          <span class="channel-name">${channel.label}</span>
          <span class="channel-range">${channel.min} … ${channel.max}</span>
          <input
            class="channel-number"
            type="number"
            min="${channel.min}"
            max="${channel.max}"
            step="${channel.step}"
            data-role="number"
            data-key="${channel.key}"
            aria-label="${config.title} ${channel.label}"
          >
        </div>
        <input
          class="channel-slider"
          type="range"
          min="${channel.min}"
          max="${channel.max}"
          step="${channel.step}"
          data-role="slider"
          data-key="${channel.key}"
          aria-label="Ползунок ${config.title} ${channel.label}"
        >
      </div>
    `).join('');

    card.innerHTML = `
      <div class="model-header">
        <h2>${config.title}</h2>
        <div class="palette-control">
          <input type="color" class="native-picker" value="#3B82F6" aria-label="Палитра ${config.title}">
          <button type="button" class="palette-button">Выбрать цвет</button>
        </div>
      </div>
      <div class="channels">${rows}</div>
    `;

    this.controls[model] = {};
    config.channels.forEach((channel) => {
      const row = card.querySelector(`[data-channel="${channel.key}"]`);
      this.controls[model][channel.key] = {
        slider: row.querySelector('[data-role="slider"]'),
        number: row.querySelector('[data-role="number"]'),
      };
    });

    this.pickers[model] = card.querySelector('.native-picker');
    card.querySelector('.palette-button').addEventListener('click', () => this.pickers[model].click());
    return card;
  }

  bindGlobalControls() {
    const algorithm = this.root.querySelector('#separationAlgorithm');
    const blackGeneration = this.root.querySelector('#blackGeneration');
    const ucrThreshold = this.root.querySelector('#ucrThreshold');
    const illuminant = this.root.querySelector('#illuminant');
    const gamutStrategy = this.root.querySelector('#gamutStrategy');

    algorithm.addEventListener('change', () => this.controller.updateSettings({ algorithm: algorithm.value }));
    blackGeneration.addEventListener('input', () => this.controller.updateSettings({ blackGeneration: Number(blackGeneration.value) }));
    ucrThreshold.addEventListener('input', () => this.controller.updateSettings({ ucrThreshold: Number(ucrThreshold.value) }));
    illuminant.addEventListener('change', () => this.controller.updateSettings({ illuminant: illuminant.value }));
    gamutStrategy.addEventListener('change', () => this.controller.updateSettings({ gamutStrategy: gamutStrategy.value }));
  }

  bindModelControls() {
    Object.entries(MODEL_CONFIG).forEach(([model, config]) => {
      config.channels.forEach((channel) => {
        const pair = this.controls[model][channel.key];

        pair.slider.addEventListener('input', () => {
          const values = {};
          config.channels.forEach((item) => {
            values[item.key] = Number(this.controls[model][item.key].slider.value);
          });
          this.controller.setColor(model, values);
        });

        const updateFromNumbers = () => {
          const values = {};
          config.channels.forEach((item) => {
            values[item.key] = Number(this.controls[model][item.key].number.value);
          });
          this.controller.setColor(model, values);
        };

        pair.number.addEventListener('change', updateFromNumbers);
        pair.number.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') updateFromNumbers();
        });
      });

      this.pickers[model].addEventListener('input', () => this.controller.setFromPalette(this.pickers[model].value));
    });
  }

  update(state, settings, gradients) {
    this.root.querySelector('#previewSwatch').style.background = state.hex;
    this.root.querySelector('#hexValue').textContent = state.hex;

    Object.entries(MODEL_CONFIG).forEach(([model, config]) => {
      config.channels.forEach((channel) => {
        const value = state[model][channel.key];
        const pair = this.controls[model][channel.key];
        pair.slider.value = value;
        pair.number.value = Number(value.toFixed(2));
        pair.slider.style.background = gradients[model][channel.key];
      });
      this.pickers[model].value = state.hex;
    });

    this.root.querySelector('#separationAlgorithm').value = settings.algorithm;
    this.root.querySelector('#blackGeneration').value = settings.blackGeneration;
    this.root.querySelector('#blackGenerationOutput').textContent = `${settings.blackGeneration}%`;
    this.root.querySelector('#ucrThreshold').value = settings.ucrThreshold;
    this.root.querySelector('#ucrThresholdOutput').textContent = `${settings.ucrThreshold}%`;
    this.root.querySelector('#ucrThresholdWrap').hidden = settings.algorithm !== 'ucr';
    this.root.querySelector('#illuminant').value = settings.illuminant;
    this.root.querySelector('#gamutStrategy').value = settings.gamutStrategy;

    this.showWarning(state.warning);
  }

  showWarning(warning) {
    const notice = this.root.querySelector('#notice');
    if (!warning) {
      notice.hidden = true;
      notice.textContent = '';
      return;
    }

    if (warning.type === 'gamut') {
      const { r, g, b } = warning.original;
      const strategy = warning.strategy === 'scaling' ? 'Scaling' : 'Clipping';
      notice.textContent = `RGB вышел за допустимый диапазон: (${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)}). Применён ${strategy}.`;
    } else {
      notice.textContent = `Значения ${warning.model} приведены к допустимому диапазону.`;
    }
    notice.hidden = false;
  }
}

export { MODEL_CONFIG };
