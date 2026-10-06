// Browser-side helpers injected with page.addInitScript / evaluate. They drive the REAL engine (WWQ.Policy / WWQ.Store).
module.exports.BROWSER = `
window.__T = {
  extreme(v, dir) {
    const r = {}; const order = v.parts.slice().sort((a, b) => (a.dep ? 1 : 0) - (b.dep ? 1 : 0));
    order.forEach(p => {
      if (p.type === 'num') { r[p.id] = dir > 0 ? p.key : p.key + 999; return; }
      const credit = o => { if (p.dep) { const k = Array.isArray(p.dep) ? p.dep.map(d => r[d]).join('|') : r[p.dep]; const row = (p.matrix || {})[k] || (p.matrix || {})['*'] || {}; return row[o.id] || 0; } return o.c || 0; };
      const s = p.opts.slice().sort((a, b) => dir * (credit(b) - credit(a)));
      r[p.id] = p.type === 'multi' ? s.slice(0, p.pick).map(o => o.id) : s[0].id;
    }); return r;
  },
  answerItem(id, mode) { // mode: 'best' | 'worst' | 'wrongfirst'
    const W = window.WWQ, P = W.Policy, St = W.Store, st = W.App.state, it = W.ITEM_BY_ID[id], rec = St.ensureItem(st, id);
    while (!rec.finalized) { if (rec.attempts.length && !rec.retryReady) P.startRetry(it, rec); const dir = mode === 'best' || (mode === 'wrongfirst' && rec.attempts.length) ? 1 : -1; P.submit(it, rec, this.extreme(P.currentVariant(it, rec), dir)); }
  },
  completeMission(m, mode) { const W = window.WWQ; W.ITEMS.filter(i => i.m === m).forEach(i => this.answerItem(i.id, mode || 'best')); W.ACTIVITIES.filter(a => a.m === m).forEach(a => W.App.state.progress.activities[a.id] = true); if (m === 6) { W.DECISIONS.forEach(d => { W.App.state.sim.picks[d.id] = 'A'; }); W.App.state.sim.finished = true; } },
  start(alias) { const W = window.WWQ, st = W.App.state; st.student.alias = alias || 'tester'; st.progress.started = true; st.progress.howto = true; st.progress.activities.tutorial = true; },
  go(m, s) { window.WWQ.App.save(true); window.WWQ.App.go(s ? { m, s } : { view: m }); }
};`;
