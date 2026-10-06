// Pacing ESTIMATE from content word counts. This is a design estimate, NOT a validated classroom duration (see docs/PILOT_CHECKLIST.md).
// node tools/pacing.js [--wpm 180]
const { load } = require('../tests/load'); const W = load();
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? +process.argv[i + 1] : d; };
const wpm = arg('wpm', 220), SEC_PER_CHOICE = arg('choice', 5), SEC_PER_SUBMIT = arg('submit', 10), RETRY_RATE = arg('retry', 0.2);
const words = s => String(s || '').split(/\s+/).filter(Boolean).length;
const partWords = v => v.parts.reduce((t, p) => t + words(p.label) + p.opts.reduce((a, o) => a + words(o.t), 0), 0);
const rows = []; let totalMin = 0;
W.MISSIONS.forEach(m => {
  let w = words(m.intro) + words(m.guide) + 20, choices = 0, submits = 0, extra = 0;
  m.stages.forEach(st => { const ex = W.EXAMPLES[st.example]; if (ex) w += words(ex.scenario) + ex.steps.reduce((a, s) => a + words(s), 0) + words(ex.reasoning);
    const items = W.itemsForStage(st.id); if (items.length) submits++;
    items.forEach(it => { const v = it.variants[0]; let ctxw = (v.vis && v.vis.type === 'finalcase' && v.vis.show.includes('resp')) ? 8 : words(v.ctx); const vis = v.vis; if (vis && vis.type === 'post') ctxw += words(vis.post.text) + Object.values(vis.post.tabs).reduce((a, t) => a + words(t), 0);
      if (vis && vis.type === 'finalcase') { const c = W.FINALCASES[vis.idx], sh = vis.show; if (sh.includes('resp')) ctxw += words(c.resp); if (sh.includes('pattern')) ctxw += c.pattern.reduce((a, p) => a + words(p[1]), 0); if (sh.includes('goal')) ctxw += words(c.goal); if (sh.includes('post')) ctxw += words(c.post.text) + Object.values(c.post.tabs).reduce((a, t) => a + words(t), 0); }
      if (vis && vis.type === 'reading') ctxw += 20; if (vis && vis.type === 'caseweek') ctxw += 60; if (vis && vis.type === 'calc') ctxw += 40;
      w += ctxw + partWords(v); choices += v.parts.length; extra += RETRY_RATE * (ctxw + partWords(v)); }); });
  if (m.id === 2) w += 170 * 0.5; // reference panel (students consult about half of it)
  if (m.id === 1) { w += 90; choices += 3; }          // overlap lab lenses
  if (m.id === 6) { w += W.DECISIONS.reduce((a, d) => a + words(d.scene) + Object.values(d.opts).reduce((x, o) => x + words(o), 0), 0); choices += 12; submits += 1; }
  if (m.id === 0) { w += 250; choices += 2; submits += 1; }
  const readMin = (w + extra) / wpm, actMin = (choices * SEC_PER_CHOICE + submits * SEC_PER_SUBMIT) / 60, tot = readMin + actMin; totalMin += tot;
  rows.push({ id: m.id, title: m.title, words: Math.round(w), retryWords: Math.round(extra), choices, readMin: readMin.toFixed(1), actMin: actMin.toFixed(1), est: tot.toFixed(1), target: m.est });
});
console.log('Assumptions: ' + wpm + ' wpm reading of task text, ' + SEC_PER_CHOICE + ' s per selection, ' + SEC_PER_SUBMIT + ' s per submit/feedback glance, ' + (RETRY_RATE * 100) + '% of item text re-read for retries.');
console.table(rows); console.log('Estimated total: ' + totalMin.toFixed(1) + ' min (blueprint target ' + W.estTotal() + ' min)');
if (process.argv.includes('--json')) console.log(JSON.stringify({ wpm, rows, totalMin }));
