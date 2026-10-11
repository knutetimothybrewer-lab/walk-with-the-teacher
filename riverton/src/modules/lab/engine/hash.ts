/** Deterministic hash -> [0,1). Common random numbers: the same (seed, ids) always give the same draw,
 *  so a counterfactual run differs from the actual run only because of the intervention. */
export function hash01(...n: number[]): number {
  let h = 0x811c9dc5;
  for (const x of n) {
    h ^= x | 0; h = Math.imul(h, 0x01000193);
    h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35);
  }
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d); h ^= h >>> 15;
  return ((h >>> 0) % 4294967296) / 4294967296;
}
export function normal(...n: number[]): number {
  const u1 = Math.max(1e-9, hash01(...n, 101)), u2 = hash01(...n, 202);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
export function poisson(mean: number, ...n: number[]): number {
  // normal approximation is fine for the counts used here (baseline ER visits)
  return Math.max(0, Math.round(mean + Math.sqrt(mean) * normal(...n)));
}
