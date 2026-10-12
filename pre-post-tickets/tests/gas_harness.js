/**
 * gas_harness.js - runs the real apps-script/*.gs files in Node against an in-memory "Google Sheet".
 * Only the handful of Google services the code uses are faked (SpreadsheetApp, LockService, PropertiesService,
 * CacheService, ContentService, Utilities, ScriptApp). The code under test is not modified or mirrored.
 */
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GS_FILES = ['Stats.gs', 'Grading.gs', 'Data.gs', 'Code.gs', 'Reports.gs', 'Setup.gs', 'SeedData.gs'];

class Sheet {
  constructor(name) { this.name = name; this.data = []; this.frozen = 0; }
  getName() { return this.name; }
  _blank(v) { return v === '' || v === null || v === undefined; }
  getLastRow() { for (let i = this.data.length - 1; i >= 0; i--) if (this.data[i].some(v => !this._blank(v))) return i + 1; return 0; }
  getLastColumn() {
    let m = 0;
    this.data.forEach(r => { for (let j = r.length - 1; j >= 0; j--) if (!this._blank(r[j])) { m = Math.max(m, j + 1); break; } });
    return m;
  }
  getMaxRows() { return Math.max(1000, this.data.length); }
  setFrozenRows(n) { this.frozen = n; }
  getRange(r, c, nr = 1, nc = 1) {
    const sh = this;
    return {
      getValues() {
        const out = [];
        for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) { const v = (sh.data[r - 1 + i] || [])[c - 1 + j]; row.push(v === undefined || v === null ? '' : v); } out.push(row); }
        return out;
      },
      setValues(vals) {
        if (vals.length !== nr || vals.some(v => v.length !== nc)) throw new Error(`setValues size mismatch on ${sh.name}: range ${nr}x${nc}, data ${vals.length}x${vals[0] && vals[0].length}`);
        vals.forEach((row, i) => { const R = r - 1 + i; sh.data[R] = sh.data[R] || []; row.forEach((v, j) => { sh.data[R][c - 1 + j] = v; }); });
        return this;
      },
      clearContent() { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { if (sh.data[r - 1 + i]) sh.data[r - 1 + i][c - 1 + j] = ''; } return this; },
      setFontWeight() { return this; }, setNumberFormat() { return this; }
    };
  }
}

function parseCsv(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function createEnv() {
  const tabs = {}, props = {}, cache = {};
  const triggers = [];
  const ss = {
    getSheetByName: n => tabs[n] || null,
    insertSheet: n => (tabs[n] = new Sheet(n)),
    getSheets: () => Object.values(tabs)
  };
  const sandbox = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, getUi: () => { throw new Error('no UI in tests'); } },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => (k in cache ? cache[k] : null), put: (k, v) => { cache[k] = v; }, remove: k => { delete cache[k]; } }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ getContent: () => s, setMimeType() { return this; } }) },
    Utilities: { sleep() {}, getUuid: () => 'uuid' },
    ScriptApp: {
      getProjectTriggers: () => triggers.slice(),
      deleteTrigger: t => { triggers.splice(triggers.indexOf(t), 1); },
      newTrigger: fn => ({ timeBased() { return this; }, everyDays() { return this; }, atHour() { return this; }, create() { triggers.push({ getHandlerFunction: () => fn }); } })
    }
  };
  const ctx = vm.createContext(sandbox);
  GS_FILES.forEach(f => vm.runInContext(fs.readFileSync(path.join(ROOT, 'apps-script', f), 'utf8'), ctx, { filename: f }));
  const run = code => vm.runInContext(code, ctx);

  const env = {
    ctx, tabs, props, triggers, run,
    call(action, body = {}) {
      const out = ctx.doPost({ postData: { contents: JSON.stringify(Object.assign({ action }, body)) } });
      return JSON.parse(out.getContent());
    },
    clearCache() { Object.keys(cache).forEach(k => delete cache[k]); },
    setup() { return run('setupSheet()'); },
    schema(name) { return run(`SCHEMA.${name}`); },
    /** Replace a tab's rows from objects (or arrays in schema order). */
    setRows(name, rows) {
      const cols = env.schema(name), sh = tabs[name];
      sh.data = [cols.slice()];
      rows.forEach(r => sh.data.push(Array.isArray(r) ? r : cols.map(c => (r[c] === undefined ? '' : r[c]))));
      env.clearCache();
    },
    rows(name) {
      const sh = tabs[name]; if (!sh || sh.data.length < 2) return [];
      const head = sh.data[0];
      return sh.data.slice(1).filter(r => r.some(v => v !== '' && v !== undefined)).map(r => Object.fromEntries(head.map((h, i) => [h, r[i] === undefined ? '' : r[i]])));
    },
    /** Load the real item bank (data/items_import.csv) into the ItemBank tab. */
    loadItemBank() {
      const csv = parseCsv(fs.readFileSync(path.join(ROOT, 'data', 'items_import.csv'), 'utf8'));
      const head = csv[0], cols = env.schema('ItemBank');
      if (head.join('|') !== cols.join('|')) throw new Error('items_import.csv columns do not match the ItemBank schema:\n' + head + '\n' + cols);
      env.setRows('ItemBank', csv.slice(1).filter(r => r.length === head.length));
    },
    setConfig(key, value) {
      const rows = env.rows('Config'), hit = rows.find(r => r.key === key);
      if (hit) hit.value = value; else rows.push({ key, value, notes: '' });
      env.setRows('Config', rows);
    },
    /** The answer key, read straight from data/items.json (never sent to a client). */
    keys() {
      const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'items.json'), 'utf8'));
      const m = {};
      [].concat(d.items, d.items_b, d.review_items, d.review_items_b).forEach(i => { m[i.item_id] = i; });
      return m;
    }
  };
  return env;
}

/** Answers for a ticket's items: perfect, or wrong on the items listed in `miss`. */
function answerFor(env, items, { miss = [] } = {}) {
  const keys = env.keys(), out = {};
  items.forEach(it => {
    const k = keys[it.item_id];
    let a = k.correct.slice();
    if (miss.includes(it.item_id)) {
      if (it.type === 'match') a = a.map((v, i) => (i === 0 ? (v + 1) % it.options.length : v));
      else if (it.type === 'mc') a = [(k.correct[0] + 1) % it.options.length];
      else a = [(k.correct[0] + 1) % it.options.length].filter(x => !k.correct.includes(x)).slice(0, 1);
    }
    out[it.item_id] = a;
  });
  return out;
}

module.exports = { createEnv, answerFor, parseCsv, ROOT };
