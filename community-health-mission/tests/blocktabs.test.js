// Runs server/apps-script/block-tabs.gs against a small fake of Google's services (no answer key needed).
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');

function makeBook(sessionRows) {
  const sheets = new Map();
  class Sheet {
    constructor(n) { this.name = n; this.cells = []; }
    set(r, c, v) { while (this.cells.length < r) this.cells.push([]); const row = this.cells[r - 1]; while (row.length < c) row.push(''); row[c - 1] = v; }
    getLastRow() { let l = 0; this.cells.forEach((r, i) => { if (r.some((x) => x !== '' && x !== undefined)) l = i + 1; }); return l; }
    getDataRange() { return { getValues: () => this.cells.map((r) => r.slice()) }; }
    getRange(r, c, nr = 1, nc = 1) { const me = this; const rg = { setValues(v) { v.forEach((row, i) => row.forEach((x, j) => me.set(r + i, c + j, x))); return rg; }, setValue(v) { me.set(r, c, v); return rg; }, setFormula(f) { me.set(r, c, f); return rg; }, setFontWeight() { return rg; }, setBackground() { return rg; }, setNumberFormat() { return rg; } }; return rg; }
    clear() { this.cells = []; } setFrozenRows() {}
  }
  const book = { getSheetByName: (n) => sheets.get(n) || null, insertSheet: (n) => { const s = new Sheet(n); sheets.set(n, s); return s; } };
  const s = book.insertSheet('Sessions'); sessionRows.forEach((r, i) => r.forEach((x, j) => s.set(i + 1, j + 1, x)));
  return { book, sheets };
}
function load(rows) {
  const { book, sheets } = makeBook(rows), triggers = [];
  const ctx = { SpreadsheetApp: { getActiveSpreadsheet: () => book, getUi: () => ({ alert() {} }) }, LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => '' }) },
    ScriptApp: { getProjectTriggers: () => triggers.slice(), deleteTrigger: (t) => triggers.splice(triggers.indexOf(t), 1), newTrigger: (fn) => ({ timeBased() { return this; }, everyMinutes() { return this; }, create() { triggers.push({ getHandlerFunction: () => fn }); } }) } };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'server', 'apps-script', 'block-tabs.gs'), 'utf8'), ctx);
  return { ctx, sheets, triggers };
}
const HEAD = ['SessionId', 'Class', 'Section', 'RosterID', 'Name', 'Period', 'Version', 'Status', 'Started', 'LastSaved', 'Completed', 'ElapsedMin', 'Earned', 'Possible', 'Percent', 'FirstTryAccuracyPct', 'UnitsCompleted'];
const row = (id, name, period, status, pct) => [id, 'HEALTH2', 'A', 'r-' + id, name, period, '1', status, 's', 'l', 'c', 30, pct, 100, pct, 50, 12];

test('block tabs: one tab per block, sorted, resets left out, average row', () => {
  const { ctx, sheets } = load([HEAD, row('1', 'Zed Zane', 'Block 1/2', 'finalized', 80), row('2', 'Amy Adams', 'Block 1/2', 'finalized', 90), row('3', 'Bo Reset', 'Block 1/2', 'reset', 10), row('4', 'Cy Clark', 'Block 6/7', 'in-progress', 55)]);
  ctx.chmBlockTabsRefresh();
  assert.deepEqual([...sheets.keys()].filter((k) => k.startsWith('Block')).sort(), ['Block 1-2', 'Block 3-4', 'Block 6-7', 'Block 8-9']);
  const b12 = sheets.get('Block 1-2').cells;
  assert.equal(b12[0][0], 'Name'); assert.equal(b12[1][0], 'Amy Adams'); assert.equal(b12[2][0], 'Zed Zane');
  assert.ok(!b12.flat().includes('Bo Reset'), 'a reset session is not listed');
  assert.ok(b12.flat().includes('=IFERROR(AVERAGE(E2:E3),"")'), 'class-average formula covers the students');
  assert.equal(sheets.get('Block 6-7').cells[1][0], 'Cy Clark');
  assert.equal(sheets.get('Block 3-4').getLastRow(), 1, 'an empty block still gets a header-only tab');
});
test('block tabs: refreshing twice does not duplicate rows; install adds one timer', () => {
  const { ctx, sheets, triggers } = load([HEAD, row('1', 'Amy Adams', 'Block 3/4', 'finalized', 90)]);
  ctx.chmBlockTabsRefresh(); ctx.chmBlockTabsRefresh();
  assert.equal(sheets.get('Block 3-4').cells.filter((r) => r[0] === 'Amy Adams').length, 1);
  ctx.chmBlockTabsInstall(); ctx.chmBlockTabsInstall();
  assert.equal(triggers.length, 1);
});
test('block tabs: works before any student has joined', () => {
  const { ctx, sheets } = load([HEAD]);
  ctx.chmBlockTabsRefresh();
  assert.equal(sheets.get('Block 1-2').getLastRow(), 1);
});
