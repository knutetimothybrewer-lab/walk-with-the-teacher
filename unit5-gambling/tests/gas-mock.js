'use strict';
// An in-memory mock of the Google Apps Script services used by Code.gs, detailed enough that the REAL generated
// Code.gs + KeyData.gs run under Node.  It is NOT Google: it cannot prove quotas, latency, permissions or
// real-spreadsheet behavior.  It does catch logic errors (wrong ranges, nested locks, missing tabs, wrong routing).
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function makeEnv(opts) {
  opts = opts || {};
  const props = {}, cache = {}, triggers = [], stats = { writes: 0, reads: 0, lockWaits: 0, docLockSkips: 0 };
  let clock = opts.now || (() => Date.now());
  let scriptLockHeld = false, docLockHeld = false;

  class Range {
    constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
    getValues() { stats.reads++; const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh.cell(this.r + i, this.c + j)); o.push(row); } return o; }
    getValue() { stats.reads++; return this.sh.cell(this.r, this.c); }
    setValues(v) { stats.writes++; this.sh.check(this.r + v.length - 1, this.c + (v[0] ? v[0].length : 1) - 1); v.forEach((row, i) => row.forEach((x, j) => this.sh.set(this.r + i, this.c + j, x))); return this; }
    setValue(x) { stats.writes++; this.sh.check(this.r, this.c); this.sh.set(this.r, this.c, x); return this; }
    clearContent() { for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh.set(this.r + i, this.c + j, ''); return this; }
    setFontWeight() { return this; } setFontSize() { return this; } setBackground() { return this; } setWrap() { return this; } setNumberFormat() { return this; }
    getRow() { return this.r; }
    createTextFinder(t) { const self = this; let entire = false; const tf = { matchEntireCell(b) { entire = b; return tf; }, findNext() { stats.reads++; for (let i = 0; i < self.nr; i++) for (let j = 0; j < self.nc; j++) { const v = self.sh.cell(self.r + i, self.c + j); if (entire ? String(v) === t : String(v).includes(t)) return new Range(self.sh, self.r + i, self.c + j, 1, 1); } return null; } }; return tf; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.rows = []; this.hidden = false; this.protections = []; this.maxR = 1000; this.maxC = 26; this.frozen = 0; }
    cell(r, c) { const row = this.rows[r - 1]; const v = row ? row[c - 1] : ''; return v === undefined || v === null ? '' : v; }
    set(r, c, v) { while (this.rows.length < r) this.rows.push([]); const row = this.rows[r - 1]; while (row.length < c) row.push(''); row[c - 1] = v; }
    check(r, c) { if (r > this.maxR || c > this.maxC) throw new Error(`The coordinates of the range are outside the dimensions of the sheet "${this.name}" (${r}x${c} > ${this.maxR}x${this.maxC})`); }
    getRange(r, c, nr, nc) { return new Range(this, r, c, nr || 1, nc || 1); }
    getLastRow() { let n = this.rows.length; while (n > 0 && this.rows[n - 1].every((x) => x === '' || x == null)) n--; return n; }
    getLastColumn() { return this.rows.reduce((a, r) => Math.max(a, r.length), 0); }
    getMaxRows() { return this.maxR; } getMaxColumns() { return this.maxC; }
    insertRowsAfter(_, n) { this.maxR += n; } insertColumnsAfter(_, n) { this.maxC += n; }
    appendRow(a) { stats.writes++; const r = this.getLastRow() + 1; this.check(r, a.length); a.forEach((x, j) => this.set(r, j + 1, x)); }
    setFrozenRows(n) { this.frozen = n; } hideSheet() { this.hidden = true; } getCharts() { return []; }
    clearContents() { this.rows = []; return this; } clear() { this.rows = []; return this; }
    setColumnWidth() {} getName() { return this.name; }
    protect() { const p = { desc: '', warn: false, setDescription(d) { this.desc = d; return this; }, setWarningOnly(b) { this.warn = b; return this; }, getEditors() { return []; }, removeEditors() { return this; }, canDomainEdit() { return false; }, setDomainEdit() { return this; } }; this.protections.push(p); return p; }
  }
  class Spreadsheet {
    constructor() { this.order = ['Sheet1']; this.sheets = { Sheet1: new Sheet('Sheet1') }; this.active = 'Sheet1'; }
    getSheetByName(n) { return this.sheets[n] || null; }
    insertSheet(n) { if (this.sheets[n]) throw new Error('A sheet with the name "' + n + '" already exists.'); this.sheets[n] = new Sheet(n); this.order.push(n); this.active = n; return this.sheets[n]; }
    getSheets() { return this.order.map((n) => this.sheets[n]); }
    setActiveSheet(s) { this.active = s.name; } moveActiveSheet(pos) { const i = this.order.indexOf(this.active); this.order.splice(i, 1); this.order.splice(pos - 1, 0, this.active); }
    deleteSheet(s) { delete this.sheets[s.name]; this.order = this.order.filter((n) => n !== s.name); }
    getName() { return 'Unit 5 Results (test)'; } getId() { return 'SHEET123'; } toast() {}
  }
  const ss = new Spreadsheet();
  const ui = { alerts: [], prompts: [], promptAnswers: [], alert(m) { this.alerts.push(m); }, prompt(t, m) { this.prompts.push(t); const a = this.promptAnswers.shift(); return { getSelectedButton: () => 'OK', getResponseText: () => a }; }, ButtonSet: { OK_CANCEL: 1 }, Button: { OK: 'OK' }, createMenu() { const m = { addItem() { return m; }, addSeparator() { return m; }, addToUi() {} }; return m; } };
  const lock = (get, set, key) => ({ tryLock: () => { if (get()) { stats[key]++; return false; } set(true); return true; }, releaseLock: () => set(false) });
  const ctx = {
    console, JSON, Date, Math, Object, Array, String, Number, Error, RegExp, isFinite, parseInt, parseFloat, Boolean, Map, Set, Uint8Array,
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => { const e = cache[k]; if (!e) return null; if (e.exp && e.exp < clock()) { delete cache[k]; return null; } return e.v; }, put: (k, v, ttl) => { if (String(v).length > 102400) throw new Error('Argument too large: value'); cache[k] = { v: String(v), exp: ttl ? clock() + ttl * 1000 : 0 }; }, remove: (k) => { delete cache[k]; } }) },
    LockService: {
      getScriptLock: () => lock(() => scriptLockHeld, (b) => { scriptLockHeld = b; }, 'lockWaits'),
      getDocumentLock: () => lock(() => docLockHeld, (b) => { docLockHeld = b; }, 'docLockSkips')
    },
    SpreadsheetApp: { openById: () => ss, getActiveSpreadsheet: () => ss, getActive: () => ss, getUi: () => ui },
    Utilities: { computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s).digest()).map((b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 }, getUuid: () => crypto.randomUUID() },
    ContentService: { createTextOutput: (t) => ({ text: t, mime: null, setMimeType(m) { this.mime = m; return this; }, getContent() { return this.text; } }), MimeType: { JSON: 'application/json' } },
    ScriptApp: { getProjectTriggers: () => triggers.slice(), newTrigger: (fn) => ({ timeBased() { return this; }, everyMinutes() { return this; }, create() { triggers.push({ getHandlerFunction: () => fn }); } }), deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); } },
    Session: { getActiveUser: () => ({ getEmail: () => '' }) }
  };
  ctx.globalThis = ctx;
  return { ctx, ss, props, cache, stats, triggers, ui, setClock: (f) => { clock = f; }, scriptLock: (b) => { scriptLockHeld = b; }, docLock: (b) => { docLockHeld = b; } };
}

function loadCode(opts) {
  opts = opts || {};
  const env = makeEnv(opts);
  vm.createContext(env.ctx);
  const root = path.join(__dirname, '..');
  // the engine reads the wall clock through Date; allow a controllable clock for deadline tests
  if (opts.now) {
    const RealDate = Date;
    env.ctx.Date = class extends RealDate { constructor(...a) { super(...(a.length ? a : [opts.now()])); } static now() { return opts.now(); } };
  }
  vm.runInContext(fs.readFileSync(path.join(root, 'dist', 'apps-script', 'Code.gs'), 'utf8'), env.ctx, { filename: 'Code.gs' });
  vm.runInContext(fs.readFileSync(path.join(root, 'private', 'KeyData.gs'), 'utf8'), env.ctx, { filename: 'KeyData.gs' });
  env.call = (fn, ...args) => vm.runInContext(fn, env.ctx)(...args);
  env.post = (action, payload) => JSON.parse(vm.runInContext('doPost', env.ctx)({ postData: { contents: JSON.stringify({ action, payload }) } }).getContent());
  env.get = () => JSON.parse(vm.runInContext('doGet', env.ctx)({}).getContent());
  return env;
}
module.exports = { loadCode, makeEnv };
