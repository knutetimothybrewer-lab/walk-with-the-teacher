/* Runs apps-script/Code.gs in Node against an in-memory fake of the Google
   Apps Script services, to check the backend logic (codes, duplicates, reset,
   reports). It cannot prove the deployed script runs in Google, but it catches
   logic and syntax errors. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function makeEnv() {
  const sheets = new Map();
  const props = { TEACHER_PASSCODE: 'secret' };
  class Range {
    constructor(sh, r, c, nr = 1, nc = 1) { Object.assign(this, { sh, r, c, nr, nc }); }
    getValues() { const o = []; for (let i = 0; i < this.nr; i++) { const row = []; for (let j = 0; j < this.nc; j++) { const v = (this.sh.cells[this.r - 1 + i] || [])[this.c - 1 + j]; row.push(v === undefined ? '' : v); } o.push(row); } return o; }
    setValues(v) { v.forEach((row, i) => row.forEach((x, j) => this.sh.set(this.r + i, this.c + j, x))); return this; }
    setFormula(f) { this.sh.set(this.r, this.c, f); return this; }
    setFontWeight() { return this; } setBackground() { return this; } setFontSize() { return this; } setNumberFormat() { return this; }
  }
  class Sheet {
    constructor(name) { this.name = name; this.cells = []; this.frozen = 0; }
    set(r, c, v) { while (this.cells.length < r) this.cells.push([]); const row = this.cells[r - 1]; while (row.length < c) row.push(undefined); row[c - 1] = v; }
    getLastRow() { let last = 0; this.cells.forEach((row, i) => { if (row.some(x => x !== undefined && x !== '')) last = i + 1; }); return last; }
    getRange(r, c, nr, nc) { return new Range(this, r, c, nr, nc); }
    appendRow(row) { const r = this.getLastRow() + 1; row.forEach((x, j) => this.set(r, j + 1, x)); }
    deleteRow(n) { this.cells.splice(n - 1, 1); }
    deleteRows(n, k) { this.cells.splice(n - 1, k); }
    clear() { this.cells = []; }
    setFrozenRows(n) { this.frozen = n; } setColumnWidth() {}
  }
  const book = {
    getSheetByName: (n) => sheets.get(n) || null,
    insertSheet: (n) => { const s = new Sheet(n); sheets.set(n, s); return s; },
  };
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => book, getUi: () => ({ alert() {}, prompt() {}, ButtonSet: {}, Button: {}, createMenu: () => ({ addItem() { return this; }, addSeparator() { return this; }, addToUi() {} }) }) },
    ContentService: { createTextOutput: (t) => ({ t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k], setProperty: (k, v) => { props[k] = v; } }) },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL('../../apps-script/Code.gs', import.meta.url), 'utf8'), ctx);
  const call = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).t);
  call({ action: 'start', student: { first: 'x', last: 'y', period: '1', code: 'zzz' } }); // forces nothing; sets up below
  vm.runInContext('ensureSheets_()', ctx);
  return { ctx, call, sheets };
}

const student = { first: 'Alex', last: 'Rivera', period: '3', code: 'trail1' };
const payload = (over = {}) => ({
  student, completion: 'WWT-AAAA-BBBB', percent: 80, earned: 80, possible: 100, totalSeconds: 2400, activeSeconds: 2000, skips: 1, helpOpens: 2, codeVerified: 'server', retakeNo: 0,
  stations: { s1: { percent: 90 }, capstone: { percent: 70 } }, topics: { MH101: { percent: 85 } },
  items: [
    { id: 'q1', station: 's1', topic: 'MH101', label: 'Question one', points: 1, earned: 1, attempts: 1, first: 1, skipped: false, firstWrong: '' },
    { id: 'q2', station: 's1', topic: 'MH101', label: 'Question two', points: 2, earned: 0, attempts: 3, first: 0, skipped: false, firstWrong: 'chose B' },
    { id: 'q3', station: 's2', topic: 'EH', label: 'Skipped one', points: 1, earned: 1, attempts: 0, first: '', skipped: true, firstWrong: '' },
  ], ...over,
});

test('start: valid code (any case) is accepted, bad code rejected', () => {
  const { call } = makeEnv();
  assert.deepEqual(call({ action: 'start', student }), { ok: true, status: 'new' });
  assert.equal(call({ action: 'start', student: { ...student, code: 'nope' } }).reason, 'code');
  assert.equal(call({ action: 'start', student: { ...student, first: '' } }).reason, 'incomplete');
});

test('submit stores summary + detail, then flags duplicates', () => {
  const { call, sheets } = makeEnv();
  assert.deepEqual(call({ action: 'submit', payload: payload() }), { ok: true });
  assert.equal(sheets.get('Summary').getLastRow(), 2);
  assert.equal(sheets.get('Detail').getLastRow(), 4);
  assert.equal(call({ action: 'start', student }).status, 'duplicate');
  // same completion code again = lost-response retry, idempotent
  assert.equal(call({ action: 'submit', payload: payload() }).dedup, true);
  assert.equal(sheets.get('Summary').getLastRow(), 2);
  // a different attempt for the same student is a duplicate
  assert.equal(call({ action: 'submit', payload: payload({ completion: 'WWT-CCCC-DDDD' }) }).reason, 'duplicate');
  // different student with the same name in another period is fine
  assert.equal(call({ action: 'submit', payload: payload({ student: { ...student, period: '4' }, completion: 'WWT-EEEE-FFFF' }) }).ok, true);
});

test('submit rejects an invalid class code', () => {
  const { call } = makeEnv();
  assert.equal(call({ action: 'submit', payload: payload({ student: { ...student, code: 'bad' } }) }).reason, 'code');
});

test('reports: Items, Reteach and flags', () => {
  const { call, sheets } = makeEnv();
  // three students all miss q2 on attempt 1 with the same wrong answer
  ['A', 'B', 'C'].forEach((n, i) => call({ action: 'submit', payload: payload({ student: { ...student, first: n }, completion: 'WWT-X' + i }) }));
  const items = sheets.get('Items');
  const ids = items.cells.map(r => r[0]);
  assert.ok(ids.includes('q1') && ids.includes('q2'));
  const q2 = items.cells.find(r => r[0] === 'q2');
  assert.match(q2[10], /chose B \(3\)/);
  assert.match(q2[11], /Possibly a bad question/);
  const q1 = items.cells.find(r => r[0] === 'q1');
  assert.equal(q1[11], '');
  const q3 = items.cells.find(r => r[0] === 'q3');
  assert.equal(q3[9], 3); // skipped counted separately, excluded from n
  const rt = sheets.get('Reteach').cells.flat().join(' | ');
  assert.match(rt, /10 MOST-MISSED QUESTIONS/);
  assert.match(rt, /q2/);
});

test('teacher: passcode required; list; reset allows a retake', () => {
  const { call, sheets } = makeEnv();
  call({ action: 'submit', payload: payload() });
  assert.equal(call({ action: 'teacher', op: 'list', passcode: 'wrong' }).reason, 'passcode');
  const list = call({ action: 'teacher', op: 'list', passcode: 'secret' });
  assert.equal(list.students.length, 1);
  assert.equal(list.students[0].first, 'Alex');
  assert.equal(call({ action: 'teacher', op: 'reset', passcode: 'secret', student }).ok, true);
  assert.equal(sheets.get('Summary').getLastRow(), 1);
  assert.equal(sheets.get('Detail').getLastRow(), 1);
  assert.equal(sheets.get('Archive').getLastRow(), 2);
  assert.equal(call({ action: 'start', student }).status, 'new');
  assert.equal(call({ action: 'submit', payload: payload({ completion: 'WWT-NEW1' }) }).ok, true);
});

test('teacher: dashboard needs the passcode and returns students, topics, stations and hardest questions', () => {
  const { call } = makeEnv();
  call({ action: 'submit', payload: payload() });
  assert.equal(call({ action: 'teacher', op: 'dashboard', passcode: 'wrong' }).reason, 'passcode');
  const d = call({ action: 'teacher', op: 'dashboard', passcode: 'secret' });
  assert.equal(d.ok, true);
  assert.equal(d.students.length, 1);
  const s = d.students[0];
  assert.deepEqual([s.first, s.last, s.period, s.code, s.percent, s.activeSec, s.skips, s.helpOpens, s.verified], ['Alex', 'Rivera', '3', 'TRAIL1', 80, 2000, 1, 2, 'server']);
  assert.ok(d.topics.length > 0 && d.stations.length > 0);
  assert.equal(d.topics[0].name.length > 0, true);
  assert.equal(d.items[0].id, 'q2');            // hardest first
  assert.equal(d.items.every((it) => it.id !== 'q3'), true); // skipped items are not analysed
});

test('teacher: dashboard lists students who started but have not finished, and clears them on submit', () => {
  const { call } = makeEnv();
  const bob = { first: 'Bob', last: 'Builder', period: '3', code: 'trail1' };
  assert.equal(call({ action: 'start', student: bob }).status, 'new');
  call({ action: 'start', student: bob });                       // a refresh must not add a second row
  let d = call({ action: 'teacher', op: 'dashboard', passcode: 'secret' });
  assert.equal(d.sessions.length, 1); assert.equal(d.sessions[0].first, 'Bob'); assert.equal(d.students.length, 0);
  assert.equal(call({ action: 'submit', payload: payload({ student: bob, completion: 'WWT-BOB1' }) }).ok, true);
  d = call({ action: 'teacher', op: 'dashboard', passcode: 'secret' });
  assert.equal(d.sessions.length, 0); assert.equal(d.students.length, 1);
  assert.equal(call({ action: 'teacher', op: 'reset', passcode: 'secret', student: bob }).ok, true);
  assert.equal(call({ action: 'teacher', op: 'dashboard', passcode: 'secret' }).sessions.length, 0);
});

test('unknown action and bad json are handled', () => {
  const { ctx, call } = makeEnv();
  assert.equal(call({ action: 'nope' }).reason, 'unknown-action');
  assert.equal(JSON.parse(ctx.doPost({ postData: { contents: '{bad' } }).t).reason, 'bad-request');
});

test('class tabs: one tab per class code, only that class, sorted by name, with an average; updates on reset', () => {
  const { call, sheets, ctx } = makeEnv();
  const cs = sheets.get('ClassCodes'); // TRAIL1..TRAIL4 are the samples
  assert.ok(cs.getLastRow() >= 3);
  const mk = (first, last, code, pct, n) => payload({ student: { first, last, period: '3', code }, percent: pct, earned: pct, completion: 'WWT-T' + n });
  call({ action: 'submit', payload: mk('Zed', 'Young', 'trail1', 70, 1) });
  call({ action: 'submit', payload: mk('Amy', 'Adams', 'TRAIL1', 90, 2) });
  call({ action: 'submit', payload: mk('Bo', 'Baker', 'trail2', 50, 3) });
  const t1 = sheets.get('Class - TRAIL1'), t2 = sheets.get('Class - TRAIL2');
  assert.ok(t1 && t2, 'a tab exists for each class code');
  const names = t1.cells.slice(1, 3).map(r => r[1]);
  assert.deepEqual(names, ['Adams', 'Young'], 'TRAIL1 holds only its two students, sorted by last name');
  assert.equal(t2.cells[1][1], 'Baker');
  assert.equal(t1.cells.flat().includes('Baker'), false, 'students of another class are not on this tab');
  assert.match(String(t1.cells.flat().find(c => typeof c === 'string' && c.startsWith('=AVERAGE'))), /^=AVERAGE\(F2:F3\)$/, 'class average formula covers the class rows');
  assert.equal(sheets.get('Summary').getLastRow(), 4, 'Summary still lists everyone');
  call({ action: 'teacher', op: 'reset', passcode: 'secret', student: { first: 'Amy', last: 'Adams', period: '3', code: 'TRAIL1' } });
  assert.deepEqual(sheets.get('Class - TRAIL1').cells.slice(1, 2).map(r => r[1]), ['Young'], 'a reset removes the student from the class tab');
  void ctx;
});
