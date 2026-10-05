/* Grading: unlimited attempts. First-try correct = 1 point, correct after a retry = 0.5, unanswered = 0.
   "Attempts" are whole runs: a new attempt clears answers and archives the old score. Saved in this browser only. */
const GRADE = (() => {
  const KEY = 'stressBrainLab.v1';
  let st = { name: '', attempt: 1, ans: {}, hist: [], exit: { stressor: '', signal: '', recovery: '' } };
  try { const raw = localStorage.getItem(KEY); if (raw) st = Object.assign(st, JSON.parse(raw)); } catch (e) { /* storage blocked: still works for this session */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ } };
  const total = () => SB.QUESTION_IDS.length;
  const pts = id => (st.ans[id] ? st.ans[id].pts : 0);
  const score = () => SB.QUESTION_IDS.reduce((s, id) => s + pts(id), 0);
  const pct = () => Math.round(score() / total() * 100);
  const letter = p => SB.GRADES.find(g => p >= g[0])[1];
  const answered = () => SB.QUESTION_IDS.filter(id => st.ans[id] && st.ans[id].done).length;
  const get = id => st.ans[id] || { tries: 0, done: false, pts: 0 };
  /* record a submission; returns {correct, first} */
  function submit(id, correct) {
    const a = st.ans[id] || (st.ans[id] = { tries: 0, done: false, pts: 0 });
    if (a.done) return { correct, first: false, already: true };
    a.tries++;
    if (correct) { a.done = true; a.pts = a.tries === 1 ? 1 : 0.5; }
    save(); return { correct, first: a.tries === 1 };
  }
  function topics() {
    const m = {}; SB.QUESTION_IDS.forEach(id => { const t = SB.Q[id].topic; (m[t] = m[t] || { got: 0, n: 0 }); m[t].n++; m[t].got += pts(id); });
    return m;
  }
  function newAttempt() {
    if (answered() > 0) st.hist.push({ n: st.attempt, pct: pct(), date: new Date().toLocaleString(), answered: answered() });
    st.attempt++; st.ans = {}; save();
  }
  return { st, submit, get, score, pct, letter, answered, total, topics, newAttempt, save,
    best() { return Math.max(pct(), ...st.hist.map(h => h.pct)); },
    setName(n) { st.name = n; save(); }, setExit(k, v) { st.exit[k] = v; save(); }, clearAll() { st.hist = []; st.attempt = 1; st.ans = {}; save(); } };
})();
