// State, persistence, lock, import and passcode tests. Run: node tests/store-tests.js
const { load } = require('./load');
const W = load();
const S = W.Sim, P = W.Policy, St = W.Store, U = W.U;
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL:', m); } };
const near = (a, b) => Math.abs(a - b) < 1e-6;
function fakeStorage(opts) { opts = opts || {}; const m = {}; return { m, getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { if (opts.fail) throw new Error('quota'); m[k] = String(v); }, removeItem: k => { delete m[k]; } }; }
function perfect(v) { const r = {}; v.parts.forEach(p => { if (p.type === 'num') r[p.id] = p.key; else if (p.type === 'multi') r[p.id] = null; else r[p.id] = null; }); return r; }
function extremeResponse(v, dir) {
  // dir=+1 picks max-credit options, dir=-1 picks min-credit options; parts with deps are resolved after their anchors
  const r = {};
  const order = v.parts.slice().sort((a, b) => (a.dep ? 1 : 0) - (b.dep ? 1 : 0));
  order.forEach(p => {
    if (p.type === 'num') { r[p.id] = dir > 0 ? p.key : p.key + 999; return; }
    const credit = o => { if (p.dep) { const rowKey = Array.isArray(p.dep) ? p.dep.map(d => r[d]).join('|') : r[p.dep]; const row = (p.matrix || {})[rowKey] || (p.matrix || {})['*'] || {}; return row[o.id] || 0; } return o.c || 0; };
    const sorted = p.opts.slice().sort((a, b) => dir * (credit(b) - credit(a)));
    r[p.id] = p.type === 'multi' ? sorted.slice(0, p.pick).map(o => o.id) : sorted[0].id;
  });
  return r;
}
const bestResponse = v => extremeResponse(v, +1), worstResponse = v => extremeResponse(v, -1);
function answerAll(state, fn) { W.ITEMS.forEach(it => { const rec = St.ensureItem(state, it.id); while (!rec.finalized) { if (rec.attempts.length && !rec.retryReady) P.startRetry(it, rec); P.submit(it, rec, fn(P.currentVariant(it, rec), it, rec)); } }); W.ACTIVITIES.forEach(a => state.progress.activities[a.id] = true); }

console.log('== Fresh state, save, resume');
let st = fakeStorage(); ok(St.useStorage(st), 'storage probe ok');
let init = St.init(); ok(init.mode === 'new', 'first load is new');
let s1 = init.state; s1.student.alias = 'wildcat42'; St.save(s1);
const it0 = W.ITEM_BY_ID['m1.c01']; const rec = St.ensureItem(s1, 'm1.c01'); P.submit(it0, rec, { dom: 'env' }); St.save(s1);
let init2 = St.init(); ok(init2.mode === 'resumed' && init2.state.session.id === s1.session.id, 'reload resumes same session');
ok(init2.state.items['m1.c01'].attempts.length === 1, 'attempt count survives reload');
ok(near(init2.state.items['m1.c01'].attempts[0].awarded, 0), 'wrong first answer score survives');
ok(init2.state.items['m1.c01'].retryReady === false, 'retry flag survives');

console.log('== Full perfect run -> submit -> lock');
let s2 = St.newState(); s2.student.alias = 'perfect'; answerAll(s2, (v) => bestResponse(v));
const tot = P.totals(s2); ok(near(tot.earned, 100), 'perfect first-attempt run = 100 (' + tot.earned + ')');
ok(near(tot.first, 100), 'first-attempt evidence = 100');
ok(P.completion(s2).pct === 100, 'completion 100%');
St.useStorage(fakeStorage()); St.save(s2);
let sub = St.submitFinal(s2); ok(sub.ok && s2.session.status === 'SUBMITTED' && s2.final.report.scores.earnedPoints === tot.earned, 'final submission locks and builds report');
ok(s2.final.report.scores.manualReviewPoints === 0 && s2.final.report.scores.pendingPoints === 0, 'no manual / pending points');
let sub2 = St.submitFinal(s2); ok(sub2.ok && sub2.already, 'second submit is a no-op (duplicate protection)');
let r3 = St.init(); ok(r3.mode === 'submitted' && r3.state.final && near(r3.state.final.report.scores.earnedPoints, 100), 'reopen shows locked final report');
// tamper: clear active but marker remains
St.storage.removeItem(St.keys().active); let r4 = St.init(); ok(r4.mode === 'submitted', 'marker alone still opens the locked report');
// the final report is not changed by viewing
ok(near(r4.state.final.report.scores.earnedPoints, 100), 'viewing does not change scores');

console.log('== Mixed run: wrong first, correct on retry; exhausted; partial');
let s5 = St.newState();
answerAll(s5, (v, it, rec) => rec.attempts.length === 0 ? worstResponse(v) : bestResponse(v));
const t5 = P.totals(s5);
let expect = 0; W.ITEMS.forEach(it => { expect += it.pts * 0.9; });
console.log('   wrong-then-right everywhere:', t5.earned.toFixed(2), '(short items 90%, complex items attempt-2 90% as well) expected', expect.toFixed(2));
ok(near(t5.earned, expect), 'wrong first then correct = 90% of every item');
ok(t5.first < 3.01, 'first-attempt evidence is near 0 when first answers were wrong (' + t5.first.toFixed(2) + '; the two Questionable-keyed posts give adjacent-rating half credit)');
let s6 = St.newState(); answerAll(s6, (v) => worstResponse(v)); ok(P.totals(s6).earned < 10, 'all wrong = low score (' + P.totals(s6).earned.toFixed(2) + ')'); ok(P.completion(s6).pct === 100, 'completion 100% even if all wrong (progress never trapped)');
ok(St.canSubmit(s6).ok, 'submission allowed after exhausting attempts');

console.log('== Sanitize / import protections');
St.useStorage(fakeStorage());
let a = St.newState(); a.student.alias = 'A'; const itx = W.ITEM_BY_ID['m4.c1']; const ra = St.ensureItem(a, 'm4.c1'); P.submit(itx, ra, { rating: 'cred', evid: ['a', 'b'] }); St.save(a);
let exp = St.exportRecord(a);
// malformed
['', 'not json', '{}', '{"format":"wwq-record"}', JSON.stringify({ format: 'wwq-record', schema: 1, state: { schema: 99 } })].forEach((t, i) => { const r = St.importRecord(t, a); ok(!r.ok && /not changed/i.test(r.message), 'malformed import #' + i + ' fails safely'); });
// tampered score is recomputed
let tam = JSON.parse(exp); tam.state.items['m4.c1'].attempts[0].awarded = 3; tam.state.items['m4.c1'].best = 3;
let rt = St.sanitize(tam.state, { allowSubmitted: true }); ok(rt.ok && near(rt.state.items['m4.c1'].best, 0), 'tampered awarded points are recomputed from the key');
// tampered invalid response
let tam2 = JSON.parse(exp); tam2.state.items['m4.c1'].attempts[0].response.rating = 'zzz'; ok(!St.sanitize(tam2.state, { allowSubmitted: true }).ok, 'invalid response rejects the record');
// extra attempts beyond limit are rejected/trimmed
let tam3 = JSON.parse(exp); const at = tam3.state.items['m4.c1'].attempts; for (let i = 2; i <= 6; i++) at.push(Object.assign({}, at[0], { n: i })); const t3 = St.sanitize(tam3.state, { allowSubmitted: true }); ok(!t3.ok || t3.state.items['m4.c1'].attempts.length <= 3, 'attempts beyond limit do not survive');
// older backup cannot lower attempt counts
let newer = JSON.parse(JSON.stringify(a)); const rn = newer.items['m4.c1']; P.startRetry(itx, rn); P.submit(itx, rn, { rating: 'notc', evid: ['a', 'b'] });
const older = St.exportRecord(a);   // 1 attempt
let imp = St.importRecord(older, newer); ok(imp.ok && imp.state.items['m4.c1'].attempts.length === 2, 'older backup cannot reduce attempt counts (merge keeps 2)');
// different session cannot replace work in progress
let other = St.newState(); const ro = St.ensureItem(other, 'm1.c01'); P.submit(W.ITEM_BY_ID['m1.c01'], ro, { dom: 'phys' });
let r5 = St.importRecord(St.exportRecord(other), a); ok(!r5.ok && /different session/.test(r5.message), 'different-session record cannot replace work in progress');
// empty device can recover
let empty = St.newState(); let r6 = St.importRecord(St.exportRecord(other), empty); ok(r6.ok && r6.state.session.id === other.session.id, 'empty device can restore a backup');
// submitted marker blocks other imports
let s7 = St.newState(); answerAll(s7, v => bestResponse(v)); St.useStorage(fakeStorage()); St.save(s7); St.submitFinal(s7);
let r7 = St.importRecord(exp, s7); ok(!r7.ok && /teacher reset/i.test(r7.message), 'submitted marker blocks importing another record');
let r8 = St.importRecord(St.exportRecord(s7), s7); ok(r8.ok && r8.readOnly, 'importing the same final record stays read-only');
// final record imports read-only on a fresh device
let fresh = St.useStorage(fakeStorage()); let r9 = St.importRecord(St.exportRecord(s7), St.newState()); ok(r9.ok && r9.readOnly && St.init().mode === 'submitted', 'final report imports as read-only and creates the lock');
// a fresh session id does not bypass: marker exists, init returns submitted
St.save(St.newState()); ok(St.init().mode === 'submitted', 'writing a new active state cannot bypass the submitted marker');

console.log('== Teacher passcode and reset');
St.useStorage(fakeStorage());
ok(!St.passcodeConfigured(), 'no passcode configured by default');
ok(St.attemptPasscode('1234').notConfigured, 'reset refuses when no passcode is configured (no default like 1234)');
const salt = U.randomHex(16); W.applyConfig({ teacher: { configured: true, salt, iterations: 2000, verifier: U.deriveVerifier('correct horse', salt, 2000), freeTries: 3, cooldownSeconds: 30 } });
ok(St.passcodeConfigured(), 'configured after setup');
const T0 = 1000000;
let w1 = St.attemptPasscode('nope', T0); ok(!w1.ok && w1.wrong && w1.remaining === 2, 'wrong passcode #1 rejected');
St.attemptPasscode('nope2', T0 + 1); let w3 = St.attemptPasscode('nope3', T0 + 2); ok(w3.locked && w3.wait >= 29, 'cooldown after several wrong entries');
let lk = St.attemptPasscode('correct horse', T0 + 3000); ok(lk.locked && !lk.ok, 'even the correct passcode is refused during cooldown');
let good = St.attemptPasscode('correct horse', T0 + 40000); ok(good.ok, 'correct passcode accepted after cooldown');
const stored = JSON.stringify(St.storage.m); ok(stored.indexOf('correct horse') < 0, 'entered passcode is not stored');
ok(JSON.stringify(W.CONFIG.teacher).indexOf('correct horse') < 0, 'config holds only salted verifier');
// reset flow
let s8 = St.newState(); s8.student.alias = 'student one'; answerAll(s8, v => bestResponse(v)); St.save(s8); St.submitFinal(s8);
ok(St.init().mode === 'submitted', 'locked before reset');
const newS = St.teacherReset(s8);
ok(newS.session.id !== s8.session.id && newS.session.reset && /teacher/i.test(newS.session.reset.authorizedVia) && newS.session.resetCount === 1, 'teacher reset creates a new session labeled as teacher-authorized');
ok(St.init().mode === 'resumed' && St.init().state.session.id === newS.session.id, 'device is clear for next student (new active session)');
ok(!St.hasProgress(newS) && newS.student.alias === '', 'new session is empty and has no previous student data');
ok(St.exportRecord(newS).indexOf('student one') < 0, 'new export contains no previous student alias');

console.log('== Storage failure');
const bad = fakeStorage({ fail: true }); ok(!St.useStorage(bad), 'storage failure detected'); ok(St.init().notices.indexOf('storage-unavailable') >= 0, 'init reports storage unavailable');
let sx = St.newState(); ok(St.save(sx) === false, 'save reports failure instead of pretending'); ok(St.exportRecord(sx).length > 100, 'recovery record still downloadable');

console.log('== Report content');
St.useStorage(fakeStorage());
let s9 = St.newState(); s9.student.alias = 'r'; answerAll(s9, (v, it, rec) => rec.attempts.length === 0 && it.m % 2 ? worstResponse(v) : bestResponse(v));
const rep = W.Report.build(s9); ok(rep.items.length === 49 && rep.items.every(i => i.attempts.length >= 1), 'report lists every item with attempts');
ok(rep.items.every(i => i.firstAttempt && 'rawFraction' in i.firstAttempt), 'first-attempt evidence preserved per item');
ok(rep.firstAttemptEvidence.points < rep.scores.earnedPoints, 'first-attempt points reported separately from final points');
ok(rep.missions.length === 7 && near(rep.missions.reduce((s, m) => s + m.earned, 0), rep.scores.earnedPoints), 'mission breakdown sums to total');
ok(rep.scores.percentDisplay === U.fmt1(rep.scores.earnedPoints) && rep.scores.maxPoints === 100, 'percent = points / 100 shown to one decimal');
W.applyConfig({ letterGrades: { enabled: true } }); ok(W.Report.build(s9).scores.letter !== null, 'optional letter grade when enabled');
const boundary = St.newState(); answerAll(boundary, v => bestResponse(v));
console.log(`\n${passes} passed, ${fails} failed`); if (fails) process.exit(1);
