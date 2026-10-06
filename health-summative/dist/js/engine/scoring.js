/* ==========================================================================
   scoring.js — pure functions, no DOM. See GRADING.md for the written rules.

   An ITEM has `points` (default from config) and up to `maxAttempts` tries.
   On every try the item type produces a `fraction` in [0,1]:
     mc     -> 1 if right, else 0
     multi  -> (right picks - wrong picks) / number of right options, min 0
     place  -> (tokens in the right slot) / (all tokens)
   Credit for that try = points x fraction x attemptCredit[tryNumber-1].
   The item's score is the BEST credit over its tries.
   Skipped items earn full points.
   ========================================================================== */

/** Points an item is worth, from its number of sub-parts (or its own `points`). */
export function pointsFor(item, subparts, cfg) {
  if (typeof item.points === 'number') return item.points;
  let pts = 1;
  for (const [min, p] of cfg.pointsBySubparts) if (subparts >= min) pts = p;
  return pts;
}

export function multiplier(attemptNo, cfg) {
  const m = cfg.attemptCredit[attemptNo - 1];
  return typeof m === 'number' ? m : 0;
}

export function attemptCredit(points, fraction, attemptNo, cfg) {
  return round4(points * clamp01(fraction) * multiplier(attemptNo, cfg));
}

/** Multi-select fraction. `selected`/`correct` are arrays of ids. */
export function fractionMulti(selected, correct) {
  const c = new Set(correct);
  let tp = 0, fp = 0;
  for (const s of new Set(selected)) { if (c.has(s)) tp++; else fp++; }
  if (c.size === 0) return selected.length === 0 ? 1 : 0;
  return clamp01((tp - fp) / c.size);
}

/** Place fraction: `placements` maps tokenId -> slotId (or undefined). */
export function fractionPlace(placements, tokens) {
  if (!tokens.length) return 1;
  let ok = 0;
  for (const t of tokens) if (placements[t.id] !== undefined && placements[t.id] === t.slot) ok++;
  return ok / tokens.length;
}

/**
 * Final record for one item given its attempts.
 * attempts: [{fraction}] in order. Returns {earned, best, solved, attemptsUsed}
 */
export function itemOutcome(points, attempts, cfg, skipped = false) {
  if (skipped) return { earned: points, solved: true, attemptsUsed: 0, skipped: true };
  let earned = 0;
  attempts.forEach((a, i) => { earned = Math.max(earned, attemptCredit(points, a.fraction, i + 1, cfg)); });
  const solved = attempts.some(a => a.fraction >= 1 - 1e-9);
  return { earned, solved, attemptsUsed: attempts.length, skipped: false };
}

/** Percent shown to students: half-up rounding of earned/possible x 100. */
export function percentOf(earned, possible) {
  if (!possible) return 0;
  return Math.floor((earned / possible) * 100 + 0.5 + 1e-9);
}

/**
 * Totals. `rows`: [{id, station, topic, points, earned}] for every scored item.
 */
export function totals(rows) {
  const sum = (arr, k) => arr.reduce((s, r) => s + r[k], 0);
  const earned = round4(sum(rows, 'earned'));
  const possible = round4(sum(rows, 'points'));
  const group = (key) => {
    const m = {};
    rows.forEach(r => { (m[r[key]] ||= []).push(r); });
    return Object.fromEntries(Object.entries(m).map(([k, v]) => {
      const e = round4(sum(v, 'earned')), p = round4(sum(v, 'points'));
      return [k, { earned: e, possible: p, percent: percentOf(e, p) }];
    }));
  };
  return { earned, possible, percent: percentOf(earned, possible), byStation: group('station'), byTopic: group('topic') };
}

export const round4 = (n) => Math.round(n * 10000) / 10000;
export const clamp01 = (n) => Math.max(0, Math.min(1, n));
