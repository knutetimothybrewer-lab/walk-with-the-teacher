// Google Sheet backend: client (js/sync.js) + Apps Script (apps-script/Code.gs) against an in-memory fake of Apps Script.
// Run: node tests/sync-tests.js   (cannot prove the deployed script runs in Google; it checks logic and syntax)
const fs = require('fs'), path = require('path'), vm = require('vm');
const { load } = require('./load');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL:', m); } };

function makeBackend() {
  const sheets = new Map(), props = {}, cache = new Map();
  class Range {
    constructor(sh, r, c, nr = 1, nc = 1) { Object.assign(this, { sh, r, c, nr, nc }); }
    getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.cells[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? '' : v); } o.push(row); } return o; }
    getValue() { return this.getValues()[0][0]; }
    setValues(v) { v.forEach((row, i) => row.forEach((x, j) => this.sh.set(this.r + i, this.c + j, x))); return this; }
    setFormula(f) { this.sh.set(this.r, this.c, f); return this; } setFontWeight() { return this; } setBackground() { return this; } setNumberFormat() { return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.cells = []; }
    set(r, c, v) { while (this.cells.length < r) this.cells.push([]); const row = this.cells[r - 1]; while (row.length < c) row.push(undefined); row[c - 1] = v; }
    getLastRow() { let last = 0; this.cells.forEach((row, i) => { if (row.some(x => x !== undefined && x !== '')) last = i + 1; }); return last; }
    getRange(r, c, nr, nc) { return new Range(this, r, c, nr, nc); }
    appendRow(row) { const r = this.getLastRow() + 1; row.forEach((x, j) => this.set(r, j + 1, x)); }
    clear() { this.cells = []; } clearContents() { this.cells = []; } setFrozenRows() {}
  }
  const book = { getSheetByName: n => sheets.get(n) || null, insertSheet: n => { const s = new Sheet(n); sheets.set(n, s); return s; } };
  const ctx = { SpreadsheetApp: { getActiveSpreadsheet: () => book, getUi: () => ({ alert: () => 'YES', ButtonSet: { YES_NO: 1 }, Button: { YES: 'YES' } }) }, ContentService: { createTextOutput: t => ({ t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k], setProperty: (k, v) => { props[k] = v; }, deleteAllProperties() { for (const k in props) delete props[k]; }, getProperties: () => ({ ...props }), deleteProperty: k => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: k => (cache.has(k) ? cache.get(k) : null), put: (k, v) => { cache.set(k, String(v)); }, remove: k => { cache.delete(k); } }) }, console };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8'), ctx);
  vm.runInContext('ensureSheets_()', ctx);
  const call = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).t);
  return { ctx, call, sheets };
}

(async () => {
  const W = load(), ctx = load.ctx, Y = W.Sync, P = W.Policy, St = W.Store;
  const be = makeBackend();
  ok(!Y.enabled(), 'backend is off by default (config.backend.url is empty)');
  W.applyConfig({ backend: { url: 'https://script.example/exec' } }); ok(Y.enabled(), 'backend on once a url is set');

  // wire fetch to the fake Apps Script
  let online = true, calls = 0;
  ctx.fetch = async (url, init) => { calls++; if (!online) throw new Error('offline'); const out = be.call(JSON.parse(init.body)); return { ok: true, json: async () => out }; };
  ctx.AbortController = AbortController;
  const mem = {}; St.useStorage({ getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } });

  console.log('== class codes');
  ok((await be.call({ action: 'start', student: { alias: 'a1', code: 'nope' } })).reason === 'code', 'unknown code rejected');
  ok((await be.call({ action: 'start', student: { alias: '', code: 'QUEST1' } })).reason === 'incomplete', 'blank alias rejected');
  ok((await Y.checkCode({ alias: 'stu-01', period: '3', code: 'quest1' })).ok === true, 'client accepts a valid code (case-insensitive)');
  ok((await Y.checkCode({ alias: 'stu-01', period: '3', code: 'bad' })).reason === 'code', 'client reports a bad code');
  online = false; ok((await Y.checkCode({ alias: 'stu-01', code: 'quest1' })).via === 'offline', 'offline start allowed when the server is unreachable');
  W.applyConfig({ backend: { allowOfflineStart: false } }); ok((await Y.checkCode({ alias: 'stu-01', code: 'quest1' })).reason === 'network', 'offline start blocked when allowOfflineStart is false');
  W.applyConfig({ backend: { allowOfflineStart: true } }); online = true;

  console.log('== real run -> payload -> Sheet');
  function finish(alias, code, mode) {
    const s = St.newState(); s.student.alias = alias; s.student.period = '3'; s.student.code = code; s.progress.started = true;
    W.ITEMS.forEach(it => { const rec = St.ensureItem(s, it.id); while (!rec.finalized) { if (rec.attempts.length && !rec.retryReady) P.startRetry(it, rec); const dir = mode === 'best' ? 1 : -1; P.submit(it, rec, extreme(P.currentVariant(it, rec), dir)); } });
    W.ACTIVITIES.forEach(a => s.progress.activities[a.id] = true);
    const r = St.submitFinal(s); if (!r.ok) throw new Error('submit failed'); return r.state;
  }
  function extreme(v, dir) {
    const r = {}; v.parts.slice().sort((a, b) => (a.dep ? 1 : 0) - (b.dep ? 1 : 0)).forEach(p => {
      if (p.type === 'num') { r[p.id] = dir > 0 ? p.key : p.key + 999; return; }
      const credit = o => { if (p.dep) { const k = Array.isArray(p.dep) ? p.dep.map(d => r[d]).join('|') : r[p.dep]; const row = (p.matrix || {})[k] || (p.matrix || {})['*'] || {}; return row[o.id] || 0; } return o.c || 0; };
      const s = p.opts.slice().sort((a, b) => dir * (credit(b) - credit(a))); r[p.id] = p.type === 'multi' ? s.slice(0, p.pick).map(o => o.id) : s[0].id;
    }); return r;
  }
  const best = finish('Stu-01', 'quest1', 'best'), pl = Y.payload(best, best.final.report);
  ok(Math.abs(pl.scores.earned - 100) < 1e-6 && pl.items.length === W.ITEMS.length, 'payload carries 100 points and every item');
  ok(!JSON.stringify(pl).match(/reflection|response/i), 'payload contains no responses or reflections');
  ok(JSON.stringify(pl).length < 40000, 'payload is small (' + JSON.stringify(pl).length + ' bytes)');
  Y.queue(pl); ok(Y.pending() === 1, 'queued before sending');
  online = false; let r = await Y.flush(); ok(r.sent === 0 && r.pending === 1, 'offline: stays queued');
  online = true; r = await Y.flush(); ok(r.sent === 1 && r.pending === 0, 'online: sent and queue cleared');
  const sum = be.sheets.get('Summary'); ok(sum.getLastRow() === 2, 'one Summary row');
  const row = sum.getRange(2, 1, 1, 22).getValues()[0]; ok(row[1] === 'Stu-01' && row[4] === 100 && row[5] === 100, 'Summary row has alias, percent and points');
  ok(be.sheets.get('Detail').getLastRow() === 1 + W.ITEMS.length, 'Detail has one row per item');
  ok(be.sheets.get('Reteach').getLastRow() > 5, 'Reteach built');

  console.log('== duplicates, resubmissions, bad payloads');
  Y.queue(pl); r = await Y.flush(); ok(r.sent === 1 && r.duplicate === true && sum.getLastRow() === 2, 'same session sent again = no new row');
  const again = finish('stu-01', 'QUEST1', 'worst'); // same student ID, different session
  Y.queue(Y.payload(again, again.final.report)); r = await Y.flush();
  ok(sum.getLastRow() === 2 && r.duplicate === true, 'a second session under the same ID does not overwrite the first');
  ok(be.sheets.get('Resubmissions').getLastRow() === 2, 'the second session is kept on Resubmissions');
  const other = finish('stu-02', 'quest2', 'worst'); Y.queue(Y.payload(other, other.final.report)); await Y.flush();
  ok(sum.getLastRow() === 3 && be.sheets.get('Detail').getLastRow() === 1 + 2 * W.ITEMS.length, 'a different student adds a row');
  const bad = Y.payload(other, other.final.report); bad.session.id = 'WWQ-xxxxxxxxxxxx'; bad.student.code = 'wrong'; Y.queue(bad); r = await Y.flush();
  ok(r.rejected === 'code' && sum.getLastRow() === 3, 'a wrong code at send time is rejected, not stored');
  ok(be.call({ action: 'submit', payload: { student: {} } }).reason === 'bad-payload', 'malformed payload rejected');
  const inj = Y.payload(other, other.final.report); inj.session.id = 'WWQ-injectinject'; inj.student.alias = '=HYPERLINK("x")'; delete mem[Y.key()]; Y._mem = []; Y.queue(inj); await Y.flush();
  ok(sum.getRange(4, 2, 1, 1).getValue() === "'=HYPERLINK(\"x\")", 'aliases that look like formulas are stored as plain text');

  console.log('== class tabs');
  const rows2 = n => be.sheets.get(n) ? be.sheets.get(n).cells.slice(1).filter(r => r[1] && r[0] !== 'Class average' && r[0] !== 'Students').map(r => r[1]) : null;
  ok(rows2('Class - QUEST1') && rows2('Class - QUEST2'), 'a tab exists for each class code');
  ok(JSON.stringify(rows2('Class - QUEST1')) === JSON.stringify(['Stu-01']), 'QUEST1 tab holds only its student (' + JSON.stringify(rows2('Class - QUEST1')) + ')');
  ok(rows2('Class - QUEST2').includes('stu-02'), 'QUEST2 tab holds the other class student');
  ok(be.sheets.get('Class - QUEST1').cells.flat().some(c => typeof c === 'string' && /^=AVERAGE\(E2:E2\)$/.test(c)), 'class average formula present');
  be.ctx.rebuildClassTabs_(); ok(rows2('Class - QUEST1').length === 1, 'rebuilding is idempotent (no duplicate rows)');

  console.log('== results screen wiring');
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'shell.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'js', 'views.js'), 'utf8');
  ok(/Sync\.queue/.test(src) && /syncCard/.test(src) && /classcode/.test(src), 'submit queues a send; results show a status card; setup has a class code field');

  console.log('== teacher view (server side)');
  const tcall = (over) => be.call(Object.assign({ action: 'teacher', op: 'dashboard' }, over));
  const props = be.ctx.PropertiesService.getScriptProperties();
  ok(tcall({ passcode: 'anything' }).reason === 'not-set', 'no passcode set yet: the teacher view refuses everyone');
  props.setProperty('TEACHER_PASSCODE', 'correct-horse-9');
  ok(tcall({ passcode: 'nope' }).reason === 'passcode' && tcall({}).reason === 'passcode', 'a wrong or missing passcode is refused');
  const dash = tcall({ passcode: 'correct-horse-9' });
  ok(dash.ok && dash.students.length === sum.getLastRow() - 1, 'the right passcode returns every Summary row (' + (dash.students && dash.students.length) + ')');
  const s1 = dash.students.find(x => x.alias === 'Stu-01');
  ok(s1 && typeof s1.percent === 'number' && s1.max > 0 && s1.missions.length === 7, 'a student row carries the score, points and 7 mission scores');
  ok(dash.topics.length > 0 && dash.topics[0].pct <= dash.topics[dash.topics.length - 1].pct, 'topics are listed weakest first');
  ok(dash.items.length > 0 && dash.items.length <= 15 && dash.resubs.length === 1, 'hardest items and the resubmission list are included');
  ok(tcall({ passcode: 'correct-horse-9', op: 'nonsense' }).reason === 'unknown-op', 'an unknown teacher operation is refused');
  for (let i = 0; i < 6; i++) tcall({ passcode: 'bad' + i });
  ok(tcall({ passcode: 'correct-horse-9' }).reason === 'locked-out', 'six wrong tries lock the teacher view, even for the right passcode');
  be.ctx.CacheService.getScriptCache().remove('tfail');
  const before = sum.getRange(2, 5, 1, 1).getValue(), rs = tcall({ passcode: 'correct-horse-9', op: 'resub', alias: 'stu-01' });
  ok(rs.ok && sum.getRange(2, 5, 1, 1).getValue() !== before, 'using a resubmission from the teacher view swaps it onto Summary');
  ok(tcall({ passcode: 'correct-horse-9', op: 'resub', alias: 'nobody' }).reason === 'not-found', 'a resubmission for an unknown student is reported, not applied');
  be.ctx.wipeAll();
  ok(props.getProperty('TEACHER_PASSCODE') === 'correct-horse-9' && sum.getLastRow() <= 1, 'wiping results keeps the teacher passcode');
  console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('  FAIL: threw', e && e.stack || e); console.log('0 passed, 1 failed'); process.exit(1); });
