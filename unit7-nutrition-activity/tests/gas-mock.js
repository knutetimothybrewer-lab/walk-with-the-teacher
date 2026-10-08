// Minimal Google Apps Script mock so Code.gs + KeyData.gs can be exercised in Node (no Google account needed).
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';

export function makeEnv(root) {
  const book = new Map(); // name -> 2D array of cell values (formulas are stored as their text)
  const props = {}, cache = new Map();
  const chain = () => new Proxy(function () {}, { get: (t, p) => (p === 'build' ? () => ({}) : chain()), apply: () => chain() });
  const sheetObj = (name) => {
    const data = book.get(name);
    const ensure = (r, c) => { while (data.length < r) data.push([]); for (let i = 0; i < r; i++) while (data[i].length < c) data[i].push(''); };
    const rangeObj = (r, c, nr = 1, nc = 1) => {
      const o = {
        getValues: () => { ensure(r + nr - 1, c + nc - 1); return Array.from({ length: nr }, (_, i) => data[r - 1 + i].slice(c - 1, c - 1 + nc)); },
        getValue: () => { ensure(r, c); return data[r - 1][c - 1]; },
        setValues(v) { ensure(r + v.length - 1, c + v[0].length - 1); v.forEach((row, i) => row.forEach((x, j) => { data[r - 1 + i][c - 1 + j] = x; })); return o; },
        setValue(v) { ensure(r, c); data[r - 1][c - 1] = v; return o; },
        setFormula(f) { ensure(r, c); data[r - 1][c - 1] = f; return o; },
        setFormulas(v) { return o.setValues(v); },
        createFilter() { return {}; },
        createTextFinder: (text) => { let entire = false; const f = { matchEntireCell(v) { entire = v; return f; }, findNext() { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { ensure(r + i, c + j); const v = String(data[r - 1 + i][c - 1 + j]); if (entire ? v === text : v.includes(text)) return { getRow: () => r + i }; } return null; } }; return f; }
      };
      for (const m of ['setFontWeight', 'setBackground', 'setFontColor', 'setWrap', 'setVerticalAlignment', 'setNumberFormat', 'setFontSize', 'setFontStyle', 'setDataValidation', 'setBold']) o[m] = () => o;
      return o;
    };
    const sh = {
      getLastRow: () => { let n = data.length; while (n > 0 && data[n - 1].every((x) => x === '' || x === undefined)) n--; return n; },
      getMaxRows: () => data.length + 1000,
      getRange(a, b, c, d) { if (typeof a === 'string') { const m = /^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(a); const col = (s) => [...s].reduce((x, ch) => x * 26 + ch.charCodeAt(0) - 64, 0); const c1 = col(m[1]), r1 = +m[2]; return rangeObj(r1, c1, m[4] ? +m[4] - r1 + 1 : 1, m[3] ? col(m[3]) - c1 + 1 : 1); } return rangeObj(a, b, c, d); },
      appendRow(row) { data.push(row.slice()); },
      deleteRows(start, n) { data.splice(start - 1, n); },
      clear() { data.length = 0; },
      getFilter: () => null, hideSheet() {}, getName: () => name, _data: data
    };
    for (const m of ['setFrozenRows', 'setRowHeight', 'setColumnWidth', 'setColumnWidths', 'setConditionalFormatRules', 'autoResizeColumns']) sh[m] = () => sh;
    return sh;
  };
  const ss = {
    getSheetByName: (n) => (book.has(n) ? sheetObj(n) : null),
    insertSheet: (n) => { book.set(n, []); return sheetObj(n); },
    getName: () => 'Test Book', getId: () => 'test-id', toast() {}, setActiveSheet() {}, moveActiveSheet() {}
  };
  const sandbox = {
    SpreadsheetApp: { getActive: () => ss, getUi: () => { throw new Error('no ui'); }, newConditionalFormatRule: chain, newDataValidation: chain },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v), remove: (k) => cache.delete(k) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { createTextOutput: (s) => ({ _s: s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    Utilities: { computeDigest: (alg, s) => Array.from(crypto.createHash('sha256').update(s).digest(), (b) => (b > 127 ? b - 256 : b)), DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' } },
    Logger: { log() {} }, console, JSON, Math, Date, Object, Array, String, Number
  };
  vm.createContext(sandbox);
  for (const f of ['KeyData.gs', 'Code.gs']) vm.runInContext(fs.readFileSync(`${root}/google-apps-script/${f}`, 'utf8'), sandbox, { filename: f });
  const call = (body) => JSON.parse(sandbox.doPost({ postData: { contents: JSON.stringify(body) } })._s);
  return { sandbox, call, book, props, run: (code) => vm.runInContext(code, sandbox) };
}
