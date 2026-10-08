'use strict';
/*
 * Content builder: authoring source (content + answer keys together)  ->  public content + private item bank.
 *
 *   public  : what GitHub Pages serves (content/items.json). NO keys, hints or explanations.
 *             Option/card/target ids are opaque and the display order is scrambled with a seeded shuffle, so even
 *             the public file cannot leak the key through ids ("correct") or ordering (correct answer listed first).
 *   private : the item bank the server grades against (ItemBank sheet in production). Keys, 2 hints, explanation.
 *
 * Also enforces the item-writing rules from the build brief (see lint()).
 */
const W8 = require('../../server/core.js');
const sha = (s) => W8.sha256Hex(s);

const COG = ['remember', 'understand', 'apply', 'analyze', 'evaluate'];
const COG_GROUP = { remember: 'R/U', understand: 'R/U', apply: 'Apply', analyze: 'Analyze', evaluate: 'Evaluate' };
const COG_TARGET = { 'R/U': 15, Apply: 30, Analyze: 35, Evaluate: 20 };
const TYPES = ['single', 'multi', 'assign', 'order', 'numeric'];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const seedOf = (s) => parseInt(sha(s).slice(0, 8), 16) >>> 0;
function shuffled(arr, seedStr) {
  const a = arr.slice(), r = mulberry32(seedOf(seedStr));
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function opaque(prefix, itemId, text, used) {
  for (let n = 5; n < 40; n++) {
    const id = prefix + sha(itemId + '|' + text).slice(0, n);
    if (!used.has(id)) { used.add(id); return id; }
  }
  throw new Error('id collision for ' + itemId);
}

/* ---- readability: Flesch-Kincaid grade (rough; used only as a report/lint warning) ---- */
function syllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!word) return 0;
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const m = word.match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}
function fkGrade(text) {
  const sentences = Math.max(1, (text.match(/[.!?]+(\s|$)/g) || []).length);
  const words = text.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (!words.length) return 0;
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  return Math.round((0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59) * 10) / 10;
}

function itemTextForReading(it) {
  const parts = [it.prompt];
  (it.options || []).forEach((o) => parts.push(o.t));
  (it.cards || []).forEach((c) => parts.push(c.t));
  (it.steps || []).forEach((s) => parts.push(s));
  return parts.join('. ').replace(/\.\s*\./g, '.');
}

/* =========================================================================================== build */
function build(src, opts) {
  opts = opts || {};
  const errors = [], warnings = [];
  const E = (id, msg) => errors.push(id + ': ' + msg);
  const Wn = (id, msg) => warnings.push(id + ': ' + msg);

  const pub = {
    schema: 1,
    meta: src.meta,
    objectives: {},
    decisionModel: src.decisionModel || null,
    figures: src.figures || {},
    chapters: []
  };
  Object.keys(src.objectives || {}).forEach((k) => { pub.objectives[k] = { text: src.objectives[k].text, basis: src.objectives[k].basis }; });
  const bank = { meta: {}, items: {} };
  const flat = [];
  const ids = new Set();
  let order = 0;

  src.chapters.forEach((ch) => {
    const pch = { id: ch.id, n: ch.n, title: ch.title, theme: ch.theme, intro: ch.intro, targetMinutes: ch.targetMinutes, units: [] };
    ch.units.forEach((u) => {
      const pu = { id: u.id, title: u.title, intro: u.intro || null, stimulus: u.stimulus || [], gate: u.gate || null, readSecs: u.readSecs || 0, items: [] };
      u.items.forEach((it0) => {
        const it = normalizeItem(it0);
        order++;
        if (ids.has(it.id)) E(it.id, 'duplicate item id');
        ids.add(it.id);
        const { pubItem, bankItem } = buildItem(it, ch, u, order, src, E, Wn);
        pu.items.push(pubItem);
        bank.items[it.id] = bankItem;
        flat.push({ it, ch, u });
      });
      pch.units.push(pu);
    });
    pub.chapters.push(pch);
  });

  /* structure hash: changes only when ids/types/points change, not when wording is edited */
  const structure = {};
  Object.keys(bank.items).forEach((id) => { const b = bank.items[id]; structure[id] = { t: b.type, p: b.points, s: b.struct, u: b.unlockAfter || null }; });
  const structureHash = sha(W8.canon(structure));
  const totalPoints = flat.reduce((a, f) => a + f.it.points, 0);
  pub.structureHash = structureHash;
  pub.points = totalPoints;
  bank.meta = { contentSet: src.meta.contentSet, structureHash, itemCount: flat.length, points: totalPoints, version: src.meta.version };

  /* unlockAfter must point to an earlier item in the same unit */
  flat.forEach(({ it, u }) => {
    if (it.unlockAfter) {
      const idxPrev = u.items.findIndex((x) => x.id === it.unlockAfter), idxMe = u.items.findIndex((x) => x.id === it.id);
      if (idxPrev < 0 || idxPrev >= idxMe) E(it.id, 'unlockAfter must be an earlier item in the same unit');
    }
  });

  const report = lint(src, flat, totalPoints, opts, E, Wn);
  return { publicContent: pub, bank, errors, warnings, report, structureHash };
}

/* thread items: the chronological chat IS the interface. Messages with a `to` become the cards to tag. */
function normalizeItem(it) {
  if (it.type === 'assign' && it.layout === 'thread') {
    return { ...it, cards: (it.thread || []).filter((m) => m.to).map((m) => ({ t: m.t, to: m.to, who: m.who })) };
  }
  return it;
}

function buildItem(it, ch, u, order, src, E, Wn) {
  const id = it.id;
  if (!TYPES.includes(it.type)) E(id, 'unknown type ' + it.type);
  const used = new Set();
  const pubItem = {
    id, type: it.type, topic: it.topic, prompt: it.prompt, points: it.points, cog: it.cog, obj: it.obj, secs: it.secs,
    unlockAfter: it.unlockAfter || null
  };
  if (it.scene) { pubItem.scene = it.scene; pubItem.sceneTitle = it.sceneTitle || null; }
  if (it.stage) pubItem.stage = it.stage;
  const bankItem = {
    id, chapter: ch.id, type: it.type, points: it.points, order, unlockAfter: it.unlockAfter || null,
    struct: {}, key: {}, hints: it.hints || [], explanation: it.explanation || '', feedback: null
  };

  if (it.type === 'single' || it.type === 'multi') {
    const opts = (it.options || []).map((o) => ({ ...o, oid: opaque('o', id, o.t, used) }));
    const sc = shuffled(opts, id + ':opts');
    pubItem.options = sc.map((o) => ({ id: o.oid, text: o.t }));
    bankItem.struct = { optionIds: opts.map((o) => o.oid).sort() };
    const ok = opts.filter((o) => o.ok).map((o) => o.oid);
    if (it.type === 'single') {
      bankItem.key = { correct: ok[0] };
      if (ok.length !== 1) E(id, 'single needs exactly one ok option (has ' + ok.length + ')');
      const fb = {}; let any = false;
      opts.forEach((o) => { if (o.fb) { fb[o.oid] = o.fb; any = true; } });
      if (any) bankItem.feedback = fb;
    } else {
      bankItem.key = { correct: ok.slice().sort() };
    }
  } else if (it.type === 'assign') {
    const mode = it.mode || 'classify';
    const fill = mode === 'classify' ? 'cards' : 'targets';
    const tUsed = new Set();
    const targets = (it.targets || []).map((t) => ({ ...t, tid: mode === 'label' ? t.k : opaque('g', id, t.k, tUsed) }));
    const cards = (it.cards || []).map((c) => ({ ...c, cid: opaque('c', id, c.t, used) }));
    const tMap = {}; targets.forEach((t) => { tMap[t.k] = t.tid; });
    const pTargets = (mode === 'classify' ? targets : shuffled(targets, id + ':targets'));
    const isThread = it.layout === 'thread';
    pubItem.assign = {
      mode, fill, figure: it.figure || null, layout: it.layout || null, pick: it.pick || null,
      cards: (isThread ? cards : shuffled(cards, id + ':cards')).map((c) => { const o = { id: c.cid, text: c.t }; if (c.sub) o.sub = c.sub; if (c.meta) o.meta = c.meta; if (c.who) o.who = c.who; return o; }),
      targets: pTargets.map((t) => { const o = { id: t.tid, label: t.label }; if (t.desc) o.desc = t.desc; return o; })
    };
    if (isThread) {
      let ci = 0;
      pubItem.assign.people = it.people || [];
      pubItem.assign.thread = (it.thread || []).map((m) => (m.to ? { who: m.who, text: m.t, id: cards[ci++].cid } : { who: m.who, text: m.t }));
    }
    bankItem.struct = { fill, cardIds: cards.map((c) => c.cid).sort(), targetIds: targets.map((t) => t.tid).sort() };
    const map = {};
    if (mode === 'classify') {
      cards.forEach((c) => { if (!c.to || !tMap[c.to]) E(id, 'card "' + c.t.slice(0, 30) + '" has no valid "to"'); else map[c.cid] = tMap[c.to]; });
    } else {
      cards.forEach((c) => {
        if (!c.to) return; // decoy
        if (!tMap[c.to]) { E(id, 'card "' + c.t + '" targets unknown ' + c.to); return; }
        if (map[tMap[c.to]]) E(id, 'two cards for target ' + c.to);
        map[tMap[c.to]] = c.cid;
      });
      targets.forEach((t) => { if (!map[t.tid]) E(id, 'target ' + t.k + ' has no card'); });
      if (cards.every((c) => c.to)) Wn(id, 'match/label item has no decoy card (process of elimination gets easy)');
      if (mode === 'label') {
        const fig = (src.figures || {})[it.figure];
        if (!fig) E(id, 'label item needs a known figure'); else targets.forEach((t) => { if (!fig.markers.some((m) => m.id === t.k)) E(id, 'figure ' + it.figure + ' has no marker ' + t.k); });
      }
    }
    bankItem.key = { map };
  } else if (it.type === 'order') {
    const steps = (it.steps || []).map((s) => ({ t: s, sid: opaque('s', id, s, used) }));
    let sc = shuffled(steps, id + ':steps'), n = 0;
    while (sc.every((s, i) => s.sid === steps[i].sid) && n++ < 20) sc = shuffled(steps, id + ':steps' + n);
    pubItem.steps = sc.map((s) => ({ id: s.sid, text: s.t }));
    bankItem.struct = { stepIds: steps.map((s) => s.sid).sort() };
    bankItem.key = { order: steps.map((s) => s.sid) };
  } else if (it.type === 'numeric') {
    const nm = it.numeric || {};
    pubItem.numeric = { unit: nm.unit || '', range: nm.range || [0, 100], decimals: nm.decimals || 0, label: nm.label || 'Your answer' };
    bankItem.struct = { range: pubItem.numeric.range };
    bankItem.key = { value: it.answer, tolerance: it.tolerance || 0 };
  }
  return { pubItem, bankItem };
}

/* =========================================================================================== lint */
function lint(src, flat, totalPoints, opts, E, Wn) {
  const objIds = Object.keys(src.objectives || {});
  const rep = { cog: {}, byChapter: {}, reading: [], chapterTime: {}, objectiveCoverage: {} };
  objIds.forEach((o) => { rep.objectiveCoverage[o] = []; });
  flat.forEach(({ it, ch }) => {
    const id = it.id;
    if (!it.prompt || it.prompt.length < 10) E(id, 'missing prompt');
    if (!it.topic) E(id, 'missing topic');
    if (!Number.isInteger(it.points) || it.points < 1) E(id, 'points must be a positive integer');
    if (!COG.includes(it.cog)) E(id, 'bad cognitive tag ' + it.cog);
    if (!Array.isArray(it.obj) || !it.obj.length) E(id, 'needs objective ids');
    (it.obj || []).forEach((o) => { if (!objIds.includes(o)) E(id, 'unknown objective ' + o); else rep.objectiveCoverage[o].push(id); });
    if (!it.secs || it.secs < 20) E(id, 'missing time estimate (secs)');
    if (!Array.isArray(it.hints) || it.hints.length !== 2 || it.hints.some((h) => !h || h.length < 20)) E(id, 'needs exactly two real hints');
    if (!it.explanation || it.explanation.length < 40) E(id, 'needs an explanation');
    // §4: no standalone true/false; single-answer MC needs >=5 options
    if (it.type === 'single' && (it.options || []).length < 5) E(id, 'single-answer MC needs >=5 options');
    if (it.type === 'multi') {
      const n = (it.options || []).length, ok = (it.options || []).filter((o) => o.ok).length;
      if (n < 6) E(id, 'multi-select needs >=6 options'); if (ok < 2 || n - ok < 2) E(id, 'multi-select needs >=2 correct and >=2 incorrect');
    }
    if (it.type === 'assign') {
      const n = (it.cards || []).length;
      if (it.mode === 'classify' || !it.mode) {
        if (n < 5) E(id, 'classification needs >=5 cards');
        const per = {}; it.cards.forEach((c) => { per[c.to] = (per[c.to] || 0) + 1; });
        if (Object.keys(per).length < 2) E(id, 'all cards in one bucket');
      }
    }
    if (it.type === 'order' && (it.steps || []).length < 4) E(id, 'ordering needs >=4 steps');
    // hints must not hand over the answer: compare against correct option / card text
    const correctTexts = [];
    if (it.type === 'single' || it.type === 'multi') (it.options || []).filter((o) => o.ok).forEach((o) => correctTexts.push(o.t));
    (it.hints || []).forEach((h, i) => {
      correctTexts.forEach((t) => { if (t.length > 25 && h.toLowerCase().includes(t.toLowerCase().slice(0, Math.min(t.length, 60)))) E(id, 'hint ' + (i + 1) + ' repeats a correct answer'); });
      if (/<|>/.test(h)) E(id, 'hint contains < or >');
      if (h.length > 320) Wn(id, 'hint ' + (i + 1) + ' is long');
    });
    ['prompt', 'explanation'].forEach((k) => { if (/[<>]/.test(it[k] || '')) E(id, k + ' contains < or >'); });
    // cognitive distribution
    const g = COG_GROUP[it.cog]; rep.cog[g] = (rep.cog[g] || 0) + it.points;
    // per-chapter
    const bc = rep.byChapter[ch.id] || (rep.byChapter[ch.id] = { items: 0, points: 0, secs: 0 });
    bc.items++; bc.points += it.points; bc.secs += it.secs;
    // reading level
    const fk = fkGrade(itemTextForReading(it));
    rep.reading.push({ id, fk });
    if (fk > 11.5) Wn(id, 'reading level looks high (FK ' + fk + ')');
  });
  // unit read time counts toward chapter time
  src.chapters.forEach((ch) => {
    const bc = rep.byChapter[ch.id] || (rep.byChapter[ch.id] = { items: 0, points: 0, secs: 0 });
    ch.units.forEach((u) => { bc.secs += u.readSecs || 0; });
    rep.chapterTime[ch.id] = { target: ch.targetMinutes * 60, est: bc.secs, pct: Math.round((bc.secs / (ch.targetMinutes * 60) - 1) * 1000) / 10 };
    if (!opts.demo && Math.abs(bc.secs / (ch.targetMinutes * 60) - 1) > 0.15) E(ch.id, 'estimated time is not within +/-15% of the ' + ch.targetMinutes + ' min target (' + Math.round(bc.secs / 6) / 10 + ' min)');
  });
  if (!opts.demo) {
    if (totalPoints !== 100) E('TOTAL', 'points total ' + totalPoints + ', expected 100');
    Object.keys(COG_TARGET).forEach((g) => { const have = rep.cog[g] || 0; if (Math.abs(have - COG_TARGET[g]) > 3) Wn('COG', g + ' has ' + have + ' points vs target ' + COG_TARGET[g]); });
    Object.keys(rep.objectiveCoverage).forEach((o) => { if (!rep.objectiveCoverage[o].length) E('OBJ', 'objective ' + o + ' has no item'); });
    // overall option-position sanity: the correct option should not sit first/last disproportionately in the PUBLIC order
  }
  rep.totalPoints = totalPoints;
  rep.itemCount = flat.length;
  rep.readingMax = rep.reading.reduce((a, r) => Math.max(a, r.fk), 0);
  rep.readingMean = Math.round(rep.reading.reduce((a, r) => a + r.fk, 0) / Math.max(1, rep.reading.length) * 10) / 10;
  return rep;
}

module.exports = { build, lint, fkGrade, shuffled, COG, COG_GROUP, COG_TARGET };
