/** Public API of the City engine. Pure: no React or Pixi imports. Crossroads and Sim Lab import from here. */
export * from './types';
export * from './engine';
export { explainChange } from './explain';
export type { Chain, Explanation } from './explain';
export { hoodAt, labelOf } from './geometry';
export { next as rngNext } from './rng';
