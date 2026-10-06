/* Seeded randomness: the same student always gets the same shuffle, so a page
   refresh never reshuffles options or items. */

/** xmur3-style string hash -> unsigned 32-bit integer. */
export function hashStr(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/** mulberry32 PRNG -> function returning floats in [0,1). */
export function rngFrom(seedStr) {
  let a = hashStr(String(seedStr));
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates shuffle returning a new array. */
export function shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Interaction "kind" of an authored entry (used to avoid long runs of the same kind). */
export function kindOf(e) {
  if (e.block) return 'chat';
  if (e.type === 'place') return e.mode;
  return e.type;
}

function longestRun(list) {
  let best = 0, run = 0, prev = null;
  for (const e of list) { const k = kindOf(e); run = k === prev ? run + 1 : 1; prev = k; best = Math.max(best, run); }
  return best;
}

/**
 * Shuffle the entries of a station while keeping `fixed` entries where they
 * are and keeping `block` entries (scenes whose steps must stay together)
 * atomic. Tries up to 300 seeded shuffles and keeps the first one in which no
 * more than `maxRun` entries of the same interaction kind appear in a row
 * (or, if none exists, the shuffle with the shortest run). Deterministic.
 */
export function orderEntries(entries, seed, stationId, maxRun = 3) {
  const rng = rngFrom(`${seed}|order|${stationId}`);
  const movableIdx = [];
  entries.forEach((e, i) => { if (!e.fixed) movableIdx.push(i); });
  let best = null, bestRun = Infinity;
  for (let attempt = 0; attempt < 300; attempt++) {
    const shuffled = shuffle(movableIdx.map(i => entries[i]), rng);
    const out = entries.slice();
    movableIdx.forEach((slot, k) => { out[slot] = shuffled[k]; });
    const run = longestRun(out);
    if (run < bestRun) { best = out; bestRun = run; }
    if (run <= maxRun) break;
  }
  return best;
}
