/* plan.js — turns the authored content into the per-student plan:
   station order stays fixed; items inside a station are shuffled with the
   student's seed; option/token order is shuffled per item.                  */
import { orderEntries, rngFrom, shuffle } from './rng.js';
import { pointsFor } from './scoring.js';

/** Number of gradable sub-parts of an item (drives points). */
export function subparts(item) {
  if (item.type === 'mc') return 1;
  if (item.type === 'multi') return item.options.filter(o => o.ok).length;
  if (item.type === 'place') return item.tokens.length;
  return 1;
}

/** Shuffle the displayed order of options/tokens for this student. */
function viewFor(item, seed) {
  const rng = rngFrom(`${seed}|opt|${item.id}`);
  if (item.type === 'mc' || item.type === 'multi') {
    const idx = item.options.map((_, i) => i);
    const order = item.keepOrder ? idx : shuffle(idx, rng);
    return { optionOrder: order };
  }
  if (item.type === 'place') {
    const idx = item.tokens.map((_, i) => i);
    return { tokenOrder: shuffle(idx, rng) };
  }
  return {};
}

/**
 * Optional alternate versions. An item may carry `variants: [{...overrides}]`;
 * the engine picks base + variants deterministically per student (seeded), so
 * adding alternates later needs no code change. Empty by default.
 */
export function resolveVariant(item, seed) {
  if (!item.variants || !item.variants.length) return item;
  const pool = [null, ...item.variants];
  const pick = pool[Math.floor(rngFrom(`${seed}|variant|${item.id}`)() * pool.length)];
  return pick ? { ...item, ...pick, id: item.id, variants: undefined } : item;
}

function flatten(entries) {
  const out = [];
  entries.forEach((e, ei) => {
    const items = e.block ? e.block : [e];
    items.forEach((it, bi) => out.push({ item: it, blockId: e.block ? (e.id || `blk-${ei}`) : null, blockIndex: bi, blockSize: items.length, sensitiveScene: !!e.sensitiveScene }));
  });
  return out;
}

/**
 * Build the plan for a session.
 * @returns {{stations: Array, itemsById: Object, all: Array}}
 */
export function buildPlan(content, session, cfg) {
  const seed = session.seed;
  const stations = [];
  const itemsById = {};
  const all = [];
  content.stations.forEach((st, si) => {
    if (st.id === 'capstone' && !cfg.capstone.enabled) return;
    const off = new Set(cfg.disabledItems || []);
    const live = st.entries
      .map(e => (e.block ? { ...e, block: e.block.filter(b => !off.has(b.id)) } : e))
      .filter(e => (e.block ? e.block.length : !off.has(e.id)));
    const ordered = orderEntries(live, seed, st.id);
    let num = 0;
    const steps = flatten(ordered).map((s, i) => {
      const it = resolveVariant(s.item, seed);
      if (it.type === 'explore') return { id: it.id || `${st.id}-explore-${i}`, item: it, explore: true, station: st.id, stationIndex: stations.length, step: i, blockId: null, blockIndex: 0, blockSize: 1, points: 0, view: {} };
      const rec = {
        id: it.id, item: it, station: st.id, stationIndex: stations.length,
        step: i, blockId: s.blockId, blockIndex: s.blockIndex, blockSize: s.blockSize,
        points: pointsFor(it, subparts(it), cfg), view: viewFor(it, seed),
        topic: it.topic || st.topic, num: ++num, sensitiveScene: s.sensitiveScene,
      };
      itemsById[it.id] = rec;
      all.push(rec);
      return rec;
    });
    if (!steps.length) return;   // every question in this station was disabled
    steps.forEach(r => { r.total = num; r.stationLast = steps.length - 1; });
    stations.push({ ...st, index: stations.length, num: stations.length + 1, steps });
  });
  return { stations, itemsById, all, passages: content.passages };
}

/** Sum of estimated seconds for steps not yet done (for the pace hint). */
export function remainingSeconds(plan, session, secondsFor) {
  let s = 0;
  for (const rec of plan.all) {
    const st = session.items[rec.id];
    if (!st || !st.done) s += secondsFor(rec.item);
  }
  return s;
}
