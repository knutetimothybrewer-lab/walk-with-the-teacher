import { pointsFor } from '../js/engine/scoring.js';
export function subpartsOf(it, cfg) {
  const n = it.type === 'mc' ? 1 : it.type === 'multi' ? it.options.filter(o => o.ok).length : it.tokens.length;
  return pointsFor(it, n, cfg);
}
