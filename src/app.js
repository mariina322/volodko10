import { AppView } from './view/app-view.js';
import { ColorController } from './controller/color-controller.js';

const root = document.querySelector('#app');
const view = new AppView(root);
new ColorController(view);
