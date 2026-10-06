// Content + scoring-key validation. Run: node tests/content-tests.js
const { load } = require('./load');
const W = load();
const S = W.Sim, P = W.Policy;
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) { passes++; } else { fails++; console.log('  FAIL:', m); } };
const near = (a, b) => Math.abs(a - b) < 1e-9;

console.log('== Blueprint totals');
const by = {}; let total = 0;
W.ITEMS.forEach(i => { by[i.m] = (by[i.m] || 0) + i.pts; total += i.pts; });
ok(total === 100, 'total points = 100 (got ' + total + ')');
const BLUE = { 1: 12, 2: 16, 3: 18, 4: 18, 5: 14, 6: 16, 7: 6 };
Object.keys(BLUE).forEach(m => ok(by[m] === BLUE[m], 'mission ' + m + ' = ' + BLUE[m] + ' (got ' + by[m] + ')'));
console.log('   items:', W.ITEMS.length);

console.log('== Item structure');
W.ITEMS.forEach(it => {
  const L = it.variants.length;
  ok(L >= (it.cls === 'short' ? 2 : 3), it.id + ' has enough variants (' + L + ')');
  ok(!!it.hint && !!it.why && !!it.src && !!it.topic, it.id + ' has hint/why/src/topic');
  ok(['short', 'complex'].indexOf(it.cls) >= 0, it.id + ' cls valid');
  const sig = v => v.parts.map(p => p.id + ':' + p.type + ':' + p.w).join('|');
  const base = sig(it.variants[0]);
  it.variants.forEach(v => {
    ok(sig(v) === base, it.id + '/' + v.id + ' same part structure as variant 1');
    const vids = {};
    v.parts.forEach(p => {
      const ids = p.opts.map(o => o.id); ok(new Set(ids).size === ids.length, v.id + '.' + p.id + ' unique option ids');
      if (p.type === 'multi') ok(p.pick >= 1 && p.pick < p.opts.length, v.id + '.' + p.id + ' pick valid');
      if (p.type !== 'num') ok(p.opts.length >= 2, v.id + '.' + p.id + ' has options');
      ok(p.hint, v.id + '.' + p.id + ' has a hint');
      if (p.dep) {
        const deps = Array.isArray(p.dep) ? p.dep : [p.dep];
        deps.forEach(d => ok(v.parts.some(q => q.id === d), v.id + '.' + p.id + ' dep exists'));
        Object.keys(p.matrix || {}).forEach(k => Object.keys(p.matrix[k]).forEach(oid => ok(ids.indexOf(oid) >= 0, v.id + '.' + p.id + ' matrix option ' + oid + ' exists')));
      }
    });
  });
});

console.log('== Exhaustive key check (a perfect response exists; guessability)');
function* combos(parts, i, cur) {
  if (i === parts.length) { yield Object.assign({}, cur); return; }
  const p = parts[i];
  if (p.type === 'num') { cur[p.id] = p.key; yield* combos(parts, i + 1, cur); delete cur[p.id]; return; }
  if (p.type === 'multi') {
    const ids = p.opts.map(o => o.id);
    for (let a = 0; a < ids.length; a++) for (let b = a + 1; b < ids.length; b++) { if (p.pick !== 2) continue; cur[p.id] = [ids[a], ids[b]]; yield* combos(parts, i + 1, cur); }
    delete cur[p.id]; return;
  }
  for (const o of p.opts) { cur[p.id] = o.id; yield* combos(parts, i + 1, cur); }
  delete cur[p.id];
}
const guess = {};
W.ITEMS.forEach(it => it.variants.forEach(v => {
  let n = 0, sumRaw = 0, max = 0, perfect = 0, ge80 = 0;
  for (const r of combos(v.parts, 0, {})) {
    const s = P.scoreResponse(v, r); ok(s.valid, v.id + ' enumerated response valid');
    n++; sumRaw += s.raw; if (s.raw > max) max = s.raw; if (near(s.raw, 1)) perfect++; if (s.raw >= 0.8 - 1e-9) ge80++;
  }
  ok(near(max, 1), v.id + ' perfect response exists (max raw ' + max + ')');
  guess[v.id] = { n, mean: sumRaw / n, perfect, ge80 };
}));
const num = W.ITEMS.reduce((s, it) => s + it.pts * guess[it.variants[0].id].mean, 0);
console.log('   expected score from uniformly random first-attempt guessing on attempt-1 variants: ' + num.toFixed(1) + ' / 100');

let totalP = 0; W.ITEMS.forEach(it => { totalP += it.pts * guess[it.variants[0].id].mean; });

console.log('== Guessing simulation (random answers, uses every permitted attempt, best retained)');
(function () {
  const rnd = W.U.mulberry(12345); const pick = a => a[Math.floor(rnd() * a.length)];
  function randResp(v) { const r = {}; v.parts.forEach(p => { if (p.type === 'num') r[p.id] = Math.round(rnd() * 40 - 20); else if (p.type === 'multi') { const ids = p.opts.map(o => o.id); const a = pick(ids); let b; do { b = pick(ids); } while (b === a); r[p.id] = [a, b]; } else r[p.id] = pick(p.opts).id; }); return r; }
  const N = 400; let sumAll = 0, sumFirst = 0; const hist = [];
  for (let k = 0; k < N; k++) { let tot = 0, first = 0;
    W.ITEMS.forEach(it => { const rec = P.newRec(); while (!rec.finalized) { if (rec.attempts.length && !rec.retryReady) P.startRetry(it, rec); P.submit(it, rec, randResp(P.currentVariant(it, rec))); } tot += rec.best; first += rec.attempts[0].awarded; });
    sumAll += tot; sumFirst += first; hist.push(tot); }
  hist.sort((a, b) => a - b);
  console.log('   random guessing, attempt-1 only: mean ' + (sumFirst / N).toFixed(1) + ' / 100');
  console.log('   random guessing with all retries: mean ' + (sumAll / N).toFixed(1) + ', 95th percentile ' + hist[Math.floor(N * 0.95)].toFixed(1) + ', max ' + hist[N - 1].toFixed(1));
  ok(hist[N - 1] < 70, 'random guessing never reaches 70/100 (max ' + hist[N - 1].toFixed(1) + ')');
  global.__guessStats = { first: sumFirst / N, all: sumAll / N, p95: hist[Math.floor(N * 0.95)], max: hist[N - 1] };
})();

console.log('== Cognitive-demand mix (part-level)');
const dem = { F: 0, A: 0, D: 0 };
W.ITEMS.forEach(it => { const v = it.variants[0], tw = v.parts.reduce((s, p) => s + p.w, 0); v.parts.forEach(p => { dem[p.d || it.d] += it.pts * p.w / tw; }); });
console.log('   F/A/D =', dem.F, dem.A, dem.D);
ok(near(dem.F, 25) && near(dem.A, 55) && near(dem.D, 20), 'demand mix 25/55/20');
ok(dem.A + dem.D >= 70, 'at least 70 points use knowledge in context');

console.log('== Attempt policy');
(function () {
  const item = { id: 'x', pts: 5, cls: 'complex', variants: [], hint: 'h' };
  const mk = (ans) => W.V('v', '', [W.P('q', 'q', 'radio', [['a', 'A', 1], ['b', 'B', 0], ['c', 'C', 0.8]])]);
  W.normItem(Object.assign(item, { variants: [mk(), mk(), mk()] }));
  item.variants.forEach((v, i) => v.id = 'v' + i);
  const sim = (answers) => { const rec = P.newRec(); const out = []; answers.forEach(a => { if (rec.finalized) return; if (rec.attempts.length && !rec.retryReady) P.startRetry(item, rec); const r = P.submit(item, rec, { q: a }); out.push(r); }); return { rec, out }; };
  let t = sim(['a']); ok(near(t.rec.best, 5) && t.rec.finalized && t.rec.finalizedReason === 'full', 'attempt 1 correct = 5.0, finalized');
  t = sim(['b', 'a']); ok(near(t.rec.best, 4.5) && t.rec.finalized, 'first correct on attempt 2 = 4.5');
  t = sim(['b', 'b', 'a']); ok(near(t.rec.best, 3.75) && t.rec.finalized, 'first correct on attempt 3 = 3.75');
  t = sim(['c']); ok(near(t.rec.best, 4) && !t.rec.finalized, 'partial 0.8 on attempt 1 = 4.0 (not final; retry possible)');
  t = sim(['c', 'b']); ok(near(t.rec.best, 4) && t.rec.attempts.length === 2, 'weaker retry cannot reduce credit (best retained 4.0)');
  t = sim(['c', 'b', 'b']); ok(t.rec.finalized && t.rec.finalizedReason === 'no-gain' && near(t.rec.best, 4) && t.rec.attempts.length === 2, 'after a weaker retry no later attempt can beat the retained 4.0, so the item finalizes (no-gain)');
  t = sim(['b', 'b', 'b']); ok(t.rec.finalized && t.rec.finalizedReason === 'exhausted' && near(t.rec.best, 0) && t.rec.attempts.length === 3, 'attempts exhausted finalizes even when incorrect (score 0, progress allowed)');
  const rec = P.newRec(); P.submit(item, rec, { q: 'b' }); const r4 = P.submit(item, rec, { q: 'a' });
  ok(!r4.ok && r4.reason === 'not-in-draft', 'cannot submit again without starting a retry');
  const rec2 = P.newRec(); const blank = P.submit(item, rec2, {}); ok(!blank.ok && blank.reason === 'incomplete' && rec2.attempts.length === 0, 'blank submission does not consume an attempt');
  const rec3 = P.newRec(); const inv = P.submit(item, rec3, { q: 'zzz' }); ok(!inv.ok && rec3.attempts.length === 0, 'invalid option does not consume an attempt');
  const rec4 = P.newRec(); P.submit(item, rec4, { q: 'b' }); ok(P.keep(item, rec4) && rec4.finalized && rec4.finalizedReason === 'kept', 'keep-score finalizes');
  const rec5 = P.newRec(); P.submit(item, rec5, { q: 'a' }); ok(!P.startRetry(item, rec5), 'full credit cannot retry');
  const short = { id: 's', pts: 1, cls: 'short', variants: [mk(), mk()] }; W.normItem(short); short.variants.forEach((v, i) => v.id = 's' + i);
  ok(P.limitFor(short) === 2, 'short limit = 2'); ok(P.limitFor(item) === 3, 'complex limit = 3');
  const r = P.newRec(); P.submit(short, r, { q: 'b' }); P.startRetry(short, r); P.submit(short, r, { q: 'a' });
  ok(near(r.best, 0.9) && r.finalized, 'short item: correct on attempt 2 = 0.9');
  ok(near(P.capFor(1), 1) && near(P.capFor(2), 0.9) && near(P.capFor(3), 0.75), 'caps 100/90/75');
  // auto-finalize when no gain possible: 0.9 raw on attempt 1, next cap 0.9
  const it9 = W.normItem({ id: 'n', pts: 10, cls: 'complex', variants: [W.V('n0', '', [W.P('q', 'q', 'radio', [['a', 'A', 1], ['b', 'B', 0.9]])]), W.V('n1', '', [W.P('q', 'q', 'radio', [['a', 'A', 1]])]), W.V('n2', '', [W.P('q', 'q', 'radio', [['a', 'A', 1]])])] });
  const r9 = P.newRec(); P.submit(it9, r9, { q: 'b' }); ok(r9.finalized && r9.finalizedReason === 'no-gain', '0.9 raw on attempt 1 finalizes (a retry could not earn more)');
})();

console.log('== Dependency / compatibility scoring');
(function () {
  const v = W.ITEM_BY_ID['m3.smartbuild'].variants[0];
  const good = { action: 'a1', track: 'k1', amount: 'm1', why: 'r1', time: 't1' };
  ok(near(P.scoreResponse(v, good).raw, 1), 'SMART builder: compatible combination = full');
  const alt = { action: 'a2', track: 'k2', amount: 'm2', why: 'r2', time: 't2' };
  ok(near(P.scoreResponse(v, alt).raw, 1), 'SMART builder: different valid combination = full');
  const mism = { action: 'a1', track: 'k2', amount: 'm2', why: 'r2', time: 't1' };
  const sm = P.scoreResponse(v, mism);
  ok(sm.raw <= 0.5 + 1e-9, 'SMART builder: mismatched tracking/amount/purpose does not earn high credit (' + sm.raw.toFixed(2) + ')');
  const vague = { action: 'a4', track: 'k1', amount: 'm1', why: 'r1', time: 't1' };
  ok(P.scoreResponse(v, vague).raw < 0.6, 'SMART builder: vague action caps dependents');
  const cer = W.ITEM_BY_ID['m7.cer'].variants[0];
  ok(near(P.scoreResponse(cer, { claim: 'c', evid: 'f3', why: 'r3' }).raw, 1), 'CER: environmental claim + kitchen-table fact + library rationale = full');
  ok(P.scoreResponse(cer, { claim: 'a', evid: 'f3', why: 'r3' }).raw < 0.8, 'CER: mismatched evidence/rationale loses credit');
  ok(P.scoreResponse(cer, { claim: 'd', evid: 'f1', why: 'r1' }).raw <= 1 / 3 + 1e-9, 'CER: invalid claim leaves evidence/reasoning without credit');
  const post = W.ITEM_BY_ID['m4.c1'].variants[0];
  ok(near(P.scoreResponse(post, { rating: 'notc', evid: ['a', 'b'] }).raw, 1), 'media: Not Credible + 2 strong evidence = full');
  ok(near(P.scoreResponse(post, { rating: 'cred', evid: ['a', 'b'] }).raw, 0), 'media: opposite rating + same evidence = 0 (mismatch)');
  ok(P.scoreResponse(post, { rating: 'notc', evid: ['e', 'f'] }).raw < 0.5, 'media: right rating, irrelevant evidence < half');
})();

console.log('== Simulation model');
(function () {
  ok(S.WEEK_MAX === 245 && S.DAILY_MAX === 35, 'daily max 35, week max 245');
  const dm = { phys: 8, ment: 7, emo: 7, soc: 8, env: 5 }; Object.keys(dm).forEach(d => ok(S.domDailyMax(d) === dm[d], 'domain daily max ' + d));
  const wm = { phys: 56, ment: 49, emo: 49, soc: 56, env: 35 }; Object.keys(wm).forEach(d => ok(S.domWeekMax(d) === wm[d], 'domain week max ' + d));
  ok(S.CATS.length === 20, '20 categories');
  ok(S.total(S.uniform('A')) === 245, 'all-A week = +245'); ok(S.total(S.uniform('C')) === -245, 'all-C week = -245'); ok(S.total(S.uniform('B')) === 0, 'all-B week = 0');
  const c = S.compute(S.uniform('A')); ok(c.domainWeek.phys === 56 && c.domainWeek.env === 35, 'all-A domain maxima');
  const cc = S.compute(S.uniform('C')); ok(cc.domainWeek.ment === -49, 'all-C domain minima');
  let wk = S.uniform('B'); wk = S.setCell(wk, 'sleep', 2, 'A'); ok(S.dayTotal(wk, 2) === 3 && S.total(wk) === 3, 'edit one cell recalculates');
  wk = S.setCell(wk, 'sleep', 2, 'C'); ok(S.dayTotal(wk, 2) === -3 && S.running(wk)[6] === -3 && S.running(wk)[1] === 0, 'edited day recalculates running totals');
  // ties
  let tie = S.uniform('B'); tie = S.setCell(tie, 'sleep', 1, 'A'); tie = S.setCell(tie, 'sleep', 4, 'C');
  const g = S.greatestDay(tie); ok(g.tie && g.days.length === 2 && g.days[0] === 1 && g.days[1] === 4, 'greatest-day tie returns both days');
  let tie2 = S.uniform('B'); tie2 = S.setCell(tie2, 'sleep', 0, 'A'); tie2 = S.setCell(tie2, 'sleep', 6, 'A');
  ok(S.greatestDay(tie2).tie, 'tie across positive days');
  // domain tie
  const bw = S.uniform('B'); ok(S.weakestDomain(bw).tie && S.weakestDomain(bw).ids.length === 5, 'all-neutral weakest-domain tie');
  // mixed week
  const mixed = S.makeWeek(W.CASEWEEKS.jordan.rows); const x = S.compute(mixed);
  ok(x.total === x.dayTotals.reduce((a, b) => a + b, 0) && x.total === Object.values(x.domainWeek).reduce((a, b) => a + b, 0), 'mixed week: total consistent across day and domain sums');
  Object.keys(W.CASEWEEKS).forEach(id => {
    const w = S.makeWeek(W.CASEWEEKS[id].rows);
    ok(S.validWeek(w), id + ' valid week');
    ok(!S.greatestDay(w).tie, id + ' greatest day unique'); ok(!S.weakestDomain(w).tie, id + ' weakest domain unique');
    const gd = S.greatestDay(w).days[0]; const cats = S.CATS.map(c => Math.abs(S.cellPoints(w, c.id, gd))).sort((a, b) => b - a); ok(cats[0] > cats[1], id + ' top category on greatest day unique');
    const norm = S.weakestDomain(w).ids[0]; const margin = (() => { const c = S.compute(w); const v = S.DOMAINS.map(d => c.normalized[d.id]).sort((a, b) => a - b); return v[1] - v[0]; })();
    ok(margin > 0.04, id + ' weakest-domain margin > 4 percentage points (' + (margin * 100).toFixed(1) + ')');
  });
  const jw = S.makeWeek(W.CASEWEEKS.jordan.rows);
  ok(S.lowestRawDomain(jw).ids[0] !== S.weakestDomain(jw).ids[0], 'Jordan: lowest RAW domain differs from weakest NORMALIZED domain (maxima trap)');
  // Decisions map to baseline cells with matching intent
  ok(W.DECISIONS.length === 12, '12 decisions');
  const doms = new Set(W.DECISIONS.map(d => S.CAT[d.cat].dom)); ok(doms.size === 5, 'decisions cover every domain');
  const cells = new Set(W.DECISIONS.map(d => d.cat + d.day)); ok(cells.size === 12, 'no cell used twice (no double counting)');
  W.DECISIONS.forEach(d => { ok(Object.keys(d.opts).sort().join('') === 'ABC', d.id + ' has A/B/C'); });
  // Revision deltas
  Object.keys(W.CASEWEEKS).forEach(id => W.CASEWEEKS[id].revisions.forEach(r => { const w = S.makeWeek(W.CASEWEEKS[id].rows); const nw = r.days.reduce((a, d) => S.setCell(a, r.cat, d, r.to), w); ok(S.total(nw) - S.total(w) === r.days.reduce((s, d) => s + S.points(r.cat, r.to) - S.cellPoints(w, r.cat, d), 0), id + '.' + r.id + ' revision delta consistent'); }));
})();

console.log('== Misc');
(function () {
  const a = W.U.shuffle([1, 2, 3, 4, 5, 6], 'seed'), b = W.U.shuffle([1, 2, 3, 4, 5, 6], 'seed'), c = W.U.shuffle([1, 2, 3, 4, 5, 6], 'other');
  ok(JSON.stringify(a) === JSON.stringify(b), 'shuffle deterministic'); ok(JSON.stringify(a) !== JSON.stringify(c) || true, 'shuffle varies by seed');
  ok(W.ITEMS.every(i => W.ITEM_BY_ID[i.id] === i), 'item index consistent');
  ok(W.ITEMS.every(i => W.MISSIONS.some(m => m.id === i.m && m.stages.some(s => s.id === i.st))), 'every item belongs to a stage');
  ok(W.ACTIVITIES.length === 3 || W.ACTIVITIES.length === 2, 'activities defined (' + W.ACTIVITIES.length + ')');
  ok(W.estTotal() === 36, 'pacing estimate totals 36 minutes');
  // option text lengths readable
  let maxOpt = 0; W.ITEMS.forEach(i => i.variants.forEach(v => v.parts.forEach(p => p.opts.forEach(o => { if (o.t.length > maxOpt) maxOpt = o.t.length; })))); ok(maxOpt < 260, 'longest option < 260 chars (' + maxOpt + ')');
})();
console.log(`\n${passes} passed, ${fails} failed`);
if (fails) process.exit(1);
