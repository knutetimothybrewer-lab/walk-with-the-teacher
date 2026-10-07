// Google Sheet backend: client (js/sync.js) + Apps Script (apps-script/Code.gs) against an in-memory fake of Apps Script.
// Run: node tests/sync-tests.js   (cannot prove the deployed script runs in Google; it checks logic and syntax)
const fs = require('fs'), path = require('path'), vm = require('vm');
const { load } = require('./load');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL:', m); } };

function makeBackend() {
  const sheets = new Map(), props = {};
  class Range {
    constructor(sh, r, c, nr = 1, nc = 1) { Object.assign(this, { sh, r, c, nr, nc }); }
    getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.cells[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? '' : v); } o.push(row); } return o; }
    getValue() { return this.getValues()[0][0]; }
    setValues(v) { v.forEach((row, i) => row.forEach((x, j) => this.sh.set(this.r + i, this.c + j, x))); return this; }
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
  const ctx = { SpreadsheetApp: { getActiveSpreadsheet: () => book }, ContentService: { createTextOutput: t => ({ t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k], setProperty: (k, v) => { props[k] = v; }, deleteAllProperties() { for (const k in props) delete props[k]; } }) }, console };
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

  console.log('== results screen wiring');
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'shell.js'), 'utf8') + fs.readFileSync(path.join(__dirname, '..', 'js', 'views.js'), 'utf8');
  ok(/Sync\.queue/.test(src) && /syncCard/.test(src) && /classcode/.test(src), 'submit queues a send; results show a status card; setup has a class code field');
  console.log(`\n${passes} passed, ${fails} failed`); process.exit(fails ? 1 : 0);
})().catch(e => { console.log('  FAIL: threw', e && e.stack || e); console.log('0 passed, 1 failed'); process.exit(1); });
