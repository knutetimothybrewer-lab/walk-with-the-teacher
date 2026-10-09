'use strict';
/*
 * A strict simulation of the Google Apps Script services used by apps-script/Code.gs, so the REAL generated Code.gs can be
 * exercised in Node. It is deliberately stricter than Google in the places that bite:
 *   - ranges outside the grid throw; setValues() must match the range dimensions exactly
 *   - the cache enforces the 100 KB value limit and expires entries by TTL (and can be wiped to test the sheet fallback)
 *   - the script lock really blocks: a second waitLock() while it is held times out
 *   - EVERY request runs in a FRESH VM context (new globals), like a real Apps Script execution
 * It is a simulation. It does not prove behavior on Google's servers (see docs/TESTING.md).
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');

function createWorld(opts) {
  opts = opts || {};
  const clock = { t: Date.UTC(2026, 9, 8, 14, 0, 0) };
  const stats = { reads: 0, writes: 0, appends: 0, cacheHits: 0, cacheMisses: 0, cachePuts: 0, lockWaits: 0, byOp: {} };
  const op = (k) => { stats.byOp[k] = (stats.byOp[k] || 0) + 1; };
  const props = {};
  const cacheStore = new Map();
  const triggers = [];
  const ui = { alerts: [], promptResponse: null };
  let lockHeld = false;

  /* ---------------- sheets ---------------- */
  class Protection {
    constructor() { this.warn = false; this.desc = ''; this.editors = ['owner@example.org']; }
    setDescription(d) { this.desc = d; return this; } setWarningOnly(b) { this.warn = b; return this; }
    addEditor() { return this; } getEditors() { return this.editors.map((e) => ({ getEmail: () => e })); }
    removeEditors(list) { this.editors = this.editors.filter((e) => !list.some((u) => u.getEmail() === e)); return this; }
    canDomainEdit() { return false; } setDomainEdit() { return this; }
  }
  class Range {
    constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
    _check() {
      const { sh, r, c, nr, nc } = this;
      if (r < 1 || c < 1 || nr < 1 || nc < 1) throw new Error('The coordinates or dimensions of the range are invalid.');
      if (r + nr - 1 > sh.maxRows) throw new Error('Those rows are out of bounds. (' + sh.name + ' row ' + (r + nr - 1) + ' > ' + sh.maxRows + ')');
      if (c + nc - 1 > sh.maxCols) throw new Error('Those columns are out of bounds. (' + sh.name + ' column ' + (c + nc - 1) + ' > ' + sh.maxCols + ')');
    }
    getValues() { this._check(); stats.reads++; op('getValues'); const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) row.push(this.sh._get(this.r + i, this.c + j)); o.push(row); } return o; }
    getValue() { this._check(); stats.reads++; op('getValue'); return this.sh._get(this.r, this.c); }
    setValues(v) {
      this._check();
      if (!Array.isArray(v) || v.length !== this.nr) throw new Error('The number of rows in the data does not match the number of rows in the range. The data has ' + (v && v.length) + ' but the range has ' + this.nr + '.');
      v.forEach((row) => { if (row.length !== this.nc) throw new Error('The number of columns in the data does not match the number of columns in the range. The data has ' + row.length + ' but the range has ' + this.nc + '.'); });
      stats.writes++; op('setValues');
      v.forEach((row, i) => row.forEach((x, j) => this.sh._set(this.r + i, this.c + j, x)));
      return this;
    }
    setValue(x) { this._check(); stats.writes++; op('setValue'); this.sh._set(this.r, this.c, x); return this; }
    clearContent() { this._check(); stats.writes++; op('clearContent'); for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) this.sh._set(this.r + i, this.c + j, ''); return this; }
    setFontWeight() { return this; } setFontSize() { return this; } setBackground() { return this; } setNumberFormat() { return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.rows = []; this.maxRows = 1000; this.maxCols = 26; this.hidden = false; this.protections = []; this.frozen = 0; }
    _get(r, c) { const row = this.rows[r - 1]; const v = row ? row[c - 1] : ''; return v === undefined || v === null ? '' : v; }
    _set(r, c, v) { while (this.rows.length < r) this.rows.push([]); const row = this.rows[r - 1]; while (row.length < c) row.push(''); row[c - 1] = v === undefined ? '' : v; }
    getName() { return this.name; }
    getRange(r, c, nr, nc) { const rg = new Range(this, r, c, nr === undefined ? 1 : nr, nc === undefined ? 1 : nc); rg._check(); return rg; }
    getLastRow() { for (let i = this.rows.length - 1; i >= 0; i--) if (this.rows[i].some((x) => x !== '' && x !== null && x !== undefined)) return i + 1; return 0; }
    getMaxRows() { return this.maxRows; } getMaxColumns() { return this.maxCols; }
    appendRow(arr) { stats.appends++; op('appendRow'); const r = this.getLastRow() + 1; if (r > this.maxRows) this.maxRows = r; if (arr.length > this.maxCols) this.maxCols = arr.length; arr.forEach((x, j) => this._set(r, j + 1, x)); }
    insertRowsAfter(after, n) { this.maxRows += n; } insertColumnsAfter(after, n) { this.maxCols += n; }
    setFrozenRows(n) { this.frozen = n; } hideSheet() { this.hidden = true; }
    protect() { const p = new Protection(); this.protections.push(p); return p; }
    getProtections() { return this.protections; }
  }
  const sheets = [];
  const spreadsheet = {
    getName: () => 'Unit 8 Gradebook (sim)',
    getSheetByName: (n) => sheets.find((s) => s.name === n) || null,
    insertSheet: (n, i) => { if (sheets.find((s) => s.name === n)) throw new Error('A sheet with the name "' + n + '" already exists.'); const s = new Sheet(n); if (i === undefined || i >= sheets.length) sheets.push(s); else sheets.splice(i, 0, s); return s; },
    getSheets: () => sheets
  };

  /* ---------------- other services ---------------- */
  const cache = {
    get: (k) => { const e = cacheStore.get(k); if (!e || e.exp <= clock.t) { cacheStore.delete(k); stats.cacheMisses++; return null; } stats.cacheHits++; return e.v; },
    put: (k, v, ttl) => { if (String(k).length > 250) throw new Error('Argument too large: key'); if (String(v).length > 100 * 1024) throw new Error('Argument too large: value'); const t = Math.min(ttl === undefined ? 600 : ttl, 21600); stats.cachePuts++; cacheStore.set(k, { v: String(v), exp: clock.t + t * 1000 }); },
    remove: (k) => { cacheStore.delete(k); },
    removeAll: (ks) => { ks.forEach((k) => cacheStore.delete(k)); }
  };
  const lockService = {
    getScriptLock: () => {
      let mine = false;
      return {
        waitLock(ms) { if (lockHeld) { stats.lockWaits++; throw new Error('Lock timeout: another process was holding the lock for too long.'); } lockHeld = true; mine = true; },
        tryLock() { if (lockHeld) return false; lockHeld = true; mine = true; return true; },
        releaseLock() { if (mine) { lockHeld = false; mine = false; } },
        hasLock() { return mine; }
      };
    }
  };
  const services = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      getUi: () => (opts.noUi ? (() => { throw new Error('Cannot call SpreadsheetApp.getUi() from this context.'); })() : {
        alert: (t, m) => { ui.alerts.push([t, m]); return 'OK'; },
        prompt: () => ({ getSelectedButton: () => (ui.promptResponse == null ? 'CANCEL' : 'OK'), getResponseText: () => ui.promptResponse }),
        createMenu: () => { const m = { addItem: () => m, addSeparator: () => m, addToUi: () => { ui.menu = true; } }; return m; },
        ButtonSet: { OK: 'OK', OK_CANCEL: 'OK_CANCEL' }, Button: { OK: 'OK' }
      }),
      ProtectionType: { SHEET: 'SHEET' }
    },
    CacheService: { getScriptCache: () => cache },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; } }) },
    LockService: lockService,
    Utilities: {
      getUuid: () => crypto.randomUUID(), sleep: (ms) => { clock.t += 0; stats.slept = (stats.slept || 0) + ms; },
      formatDate: (d, tz, f) => new Date(d).toISOString().replace('T', ' ').slice(0, 19)
    },
    Session: { getScriptTimeZone: () => 'America/New_York', getEffectiveUser: () => ({ getEmail: () => 'owner@example.org' }) },
    ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: (t) => { const o = { text: t, mime: null, setMimeType(m) { o.mime = m; return o; }, getContent: () => t }; return o; } },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: (t) => { const i = triggers.indexOf(t); if (i >= 0) triggers.splice(i, 1); },
      newTrigger: (fn) => ({ timeBased() { return { everyMinutes(n) { return { create() { const t = { fn, every: n, getHandlerFunction: () => fn }; triggers.push(t); return t; } }; } }; } })
    },
    Logger: { log: (m) => { (world.logs = world.logs || []).push(String(m)); } }
  };

  const world = { clock, stats, props, cacheStore, triggers, ui, sheets, spreadsheet, logs: [], services, holdLock: () => { lockHeld = true; }, freeLock: () => { lockHeld = false; }, evictCache: () => cacheStore.clear(), code: null };

  /** A fresh JS context = one Apps Script execution. State that must persist lives in the services above. */
  function newContext() {
    const RealDate = Date;
    function FakeDate(...a) { return a.length ? new RealDate(...a) : new RealDate(clock.t); }
    FakeDate.now = () => clock.t; FakeDate.UTC = RealDate.UTC; FakeDate.parse = RealDate.parse; FakeDate.prototype = RealDate.prototype;
    const ctx = Object.assign({ console: { error: (m) => world.logs.push('ERR ' + m), log: () => {}, warn: () => {} }, JSON, Math, Object, Array, String, Number, Boolean, RegExp, Error, isFinite, parseInt, parseFloat, Date: FakeDate, Set, Map }, services);
    vm.createContext(ctx);
    return ctx;
  }
  const codeText = () => fs.readFileSync(path.join(ROOT, 'apps-script/Code.gs'), 'utf8');
  world.load = (extra) => {
    const ctx = newContext();
    vm.runInContext(codeText(), ctx, { filename: 'Code.gs' });
    if (extra) vm.runInContext(extra, ctx, { filename: 'ItemBankSeed.gs' });
    return ctx;
  };
  /** Runs one function as its own execution. */
  world.exec = (fn, ...args) => { const ctx = world.load(world.seedText); return ctx[fn](...args); };
  /** One web request = one execution. Returns the parsed JSON. */
  world.post = (req) => {
    const ctx = world.load(world.seedText);
    const out = ctx.doPost({ postData: { contents: typeof req === 'string' ? req : JSON.stringify(req) } });
    return JSON.parse(out.getContent());
  };
  world.get = () => JSON.parse(world.load().doGet({}).getContent());
  world.setSeed = (bank) => { world.seedText = 'var ITEM_BANK_SEED = ' + JSON.stringify(bank) + ';'; };
  world.sheet = (n) => spreadsheet.getSheetByName(n);
  world.table = (n, from) => { const s = world.sheet(n); const last = s.getLastRow(); const out = []; for (let r = from || 1; r <= last; r++) out.push(s.rows[r - 1].slice()); return out; };
  return world;
}

module.exports = { createWorld, ROOT };
