'use strict';
// Minimal in-memory mock of the Apps Script services used by Code.gs, so the REAL generated Code.gs runs under Node.
const vm = require('vm'); const fs = require('fs'); const path = require('path'); const crypto = require('crypto');

function makeEnv() {
  const props = {}, cache = {}; let lockHeld = false; const stats = { lockWaits: 0, maxHeldConcurrent: 0, sheetWrites: 0, tryLockCalls: 0 };
  class Range {
    constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
    getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh.cell(this.r + i, this.c + j)); o.push(row); } return o; }
    getValue() { return this.sh.cell(this.r, this.c); }
    setValues(v) { stats.sheetWrites++; v.forEach((row, i) => row.forEach((x, j) => this.sh.set(this.r + i, this.c + j, x))); return this; }
    setValue(x) { stats.sheetWrites++; this.sh.set(this.r, this.c, x); return this; }
    setFontWeight() { return this; } setNumberFormat() { return this; }
    getRow() { return this.r; }
    createTextFinder(t) { const self = this; let entire = false; const tf = { matchEntireCell(b) { entire = b; return tf; }, findNext() { for (let i = 0; i < self.nr; i++) for (let j = 0; j < self.nc; j++) { const v = self.sh.cell(self.r + i, self.c + j); if (entire ? String(v) === t : String(v).includes(t)) return new Range(self.sh, self.r + i, self.c + j, 1, 1); } return null; } }; return tf; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.rows = []; this.hidden = false; }
    cell(r, c) { const row = this.rows[r - 1]; const v = row ? row[c - 1] : ''; return v === undefined ? '' : v; }
    set(r, c, v) { while (this.rows.length < r) this.rows.push([]); const row = this.rows[r - 1]; while (row.length < c) row.push(''); row[c - 1] = v; }
    getRange(r, c, nr, nc) { if (typeof r === 'string') { const m = /^([A-Z]):[A-Z]$/.exec(r); return new Range(this, 1, m[1].charCodeAt(0) - 64, this.rows.length, 1); } return new Range(this, r, c, nr || 1, nc || 1); }
    getLastRow() { return this.rows.length; }
    appendRow(a) { stats.sheetWrites++; this.rows.push(a.slice()); }
    setFrozenRows() {} hideSheet() { this.hidden = true; } getCharts() { return []; } clear() { this.rows = []; return this; }
  }
  class Spreadsheet { constructor() { this.sheets = {}; } getSheetByName(n) { return this.sheets[n] || null; } insertSheet(n) { return this.sheets[n] = new Sheet(n); } getName() { return 'Test Results'; } getId() { return 'SHEET123'; } toast() {} }
  const ss = new Spreadsheet();
  const ctx = {
    console, JSON, Date, Math, Object, Array, String, Number, Error, RegExp, isFinite, parseInt, parseFloat,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = String(v); } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => { stats.tryLockCalls++; if (lockHeld) { stats.lockWaits++; return false; } lockHeld = true; return true; }, releaseLock: () => { lockHeld = false; } }) },
    SpreadsheetApp: { openById: () => ss, getActiveSpreadsheet: () => ss, getActive: () => ss, getUi: () => ({}) },
    Utilities: { computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s).digest()).map(b => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 1 }, Charset: { UTF_8: 1 }, getUuid: () => crypto.randomUUID() },
    Session: { getActiveUser: () => ({ getEmail: () => '' }) },
    HtmlService: { createHtmlOutputFromFile: n => ({ setTitle() { return this; }, addMetaTag() { return this; }, setXFrameOptionsMode() { return this; }, name: n }), XFrameOptionsMode: { ALLOWALL: 1 } },
    Charts: { ChartType: { BAR: 1 } }
  };
  ctx.globalThis = ctx;
  return { ctx, ss, props, cache, stats, forceLock: v => { lockHeld = v; } };
}
function loadCode() {
  const env = makeEnv(); vm.createContext(env.ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'dist', 'apps-script', 'Code.gs'), 'utf8'), env.ctx, { filename: 'Code.gs' });
  return env;
}
module.exports = { loadCode };
