import { boot } from './game.js';
// Give the loading screen a frame to paint before generating card art.
requestAnimationFrame(() => setTimeout(boot, 30));
