// Minimal Google Apps Script mock so Code.gs + KeyData.gs can be exercised in Node.
import vm from 'node:vm';
import fs from 'node:fs';
import crypto from 'node:crypto';

export function makeEnv(root) {
  const book = new Map(); // name -> 2D array
  const props = {}, cache = new Map();
  const sheetObj = (name) => {
    const data = book.get(name);
    const ensure = (r, c) => { while (data.length < r) data.push([]); for (let i = 0; i < r; i++) while (data[i].length < c) data[i].push(''); };
    const rangeObj = (r, c, nr = 1, nc = 1) => ({
      getValues: () => { ensure(r + nr - 1, c + nc - 1); return Array.from({ length: nr }, (_, i) => data[r - 1 + i].slice(c - 1, c - 1 + nc)); },
      getValue: () => { ensure(r, c); return data[r - 1][c - 1]; },
      setValues(v) { ensure(r + v.length - 1, c + v[0].length - 1); v.forEach((row, i) => row.forEach((x, j) => { data[r - 1 + i][c - 1 + j] = x; })); return this; },
      setValue(v) { ensure(r, c); data[r - 1][c - 1] = v; return this; },
      setFontWeight() { return this; }, setBackground() { return this; }, setFontColor() { return this; },
      createTextFinder: (text) => { let entire = false; const f = { matchEntireCell(v) { entire = v; return f; }, findNext() { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) { ensure(r + i, c + j); const v = String(data[r - 1 + i][c - 1 + j]); if (entire ? v === text : v.includes(text)) return { getRow: () => r + i }; } return null; } }; return f; }
    });
    return {
      getLastRow: () => { let n = data.length; while (n > 0 && data[n - 1].every((x) => x === '' || x === undefined)) n--; return n; },
      getRange: rangeObj, appendRow(row) { data.push(row.slice()); }, setFrozenRows() {}, clear() { data.length = 0; }, autoResizeColumns() {},
      getName: () => name, _data: data
    };
  };
  const ss = {
    getSheetByName: (n) => (book.has(n) ? sheetObj(n) : null),
    insertSheet: (n) => { book.set(n, []); return sheetObj(n); },
    getName: () => 'Test Book', toast() {}
  };
  const sandbox = {
    SpreadsheetApp: { getActive: () => ss, getUi: () => { throw new Error('no ui'); } },
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
