/**
 * Wildcats Wellness Quest — Google Apps Script backend (optional)
 * ---------------------------------------------------------------------------
 * Paste this whole file into a Google Sheet's Apps Script editor and deploy it as a
 * Web app (docs/TEACHER_SETUP.md, "Send results to a Google Sheet"). It:
 *   1. Checks class codes on the SERVER (codes live in the ClassCodes tab, not in the web page).
 *   2. Stores ONE row per student (alias + class code) on Summary, plus one row per question on Detail.
 *   3. Ranks topics and questions by how many points the class missed on Reteach.
 *   4. Keeps a second submission under the same ID on Resubmissions instead of overwriting the first.
 *      You choose which to keep: menu "Wildcats Quest -> Use a resubmission for one student".
 *
 * Privacy: stores only the alias/ID the student typed, period, class code, scores and per-question
 * points and attempt counts. No free-text answers, no reflections, no third-party calls.
 */

var VERSION = '1.0';
var SHEETS = { summary: 'Summary', detail: 'Detail', reteach: 'Reteach', resub: 'Resubmissions', codes: 'ClassCodes', log: 'Log' };
var MISSIONS = [1, 2, 3, 4, 5, 6, 7];
var SUMMARY_FIXED = ['Submitted', 'Alias / ID', 'Period', 'Class code', 'Percent', 'Points', 'Out of', 'Letter', 'Completion %',
  'First-attempt points', 'Attempts used', 'Attempts allowed', 'Minutes', 'Teacher resets (local)', 'Session ID'];
var DETAIL_HEAD = ['Submitted', 'Alias / ID', 'Period', 'Item', 'Mission', 'Topic', 'Points possible', 'Final points', 'First-attempt points', 'Attempts', 'Attempt limit'];
var FLAG_BELOW = 0.5;   // flag items where the class earned under 50% of the points on average
var FLAG_MIN_N = 3;     // ...once at least this many students have answered

/* ------------------------------------------------------------------ web app */

function doGet(e) { return json_({ ok: true, service: 'Wildcats Wellness Quest', version: VERSION }); }

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, reason: 'bad-request' }); }
  try {
    if (body.action === 'start') return json_(handleStart_(body.student));
    if (body.action === 'submit') return json_(handleSubmit_(body.payload));
    return json_({ ok: false, reason: 'unknown-action' });
  } catch (err) {
    log_('error', String(err && err.stack || err));
    return json_({ ok: false, reason: 'server-error' });
  }
}

function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

/* ---------------------------------------------------------------- helpers */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name) { return ss_().getSheetByName(name) || ss_().insertSheet(name); }
function norm_(s) { return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' '); }
function keyOf_(st) { return norm_(st.alias) + '|' + norm_(st.code); }
function log_(kind, msg) { try { sheet_(SHEETS.log).appendRow([new Date(), kind, String(msg).slice(0, 500)]); } catch (e) { /* ignore */ } }
function num_(x) { var n = Number(x); return isFinite(n) ? n : 0; }
function txt_(x, max) { return String(x == null ? '' : x).slice(0, max || 80); }
/* A cell that starts with = + - @ would be run as a formula; prefix a quote so typed text stays text. */
function safe_(x, max) { var s = txt_(x, max); return /^[=+\-@]/.test(s) ? "'" + s : s; }

function validCodes_() {
  var s = ss_().getSheetByName(SHEETS.codes);
  if (!s || s.getLastRow() < 2) return [];
  return s.getRange(2, 1, s.getLastRow() - 1, 1).getValues().map(function (r) { return norm_(r[0]); }).filter(Boolean);
}
function codeOk_(code) { return validCodes_().indexOf(norm_(code)) >= 0; }

function summaryHeader_() {
  var h = SUMMARY_FIXED.slice();
  MISSIONS.forEach(function (m) { h.push('Mission ' + m + ' pts'); });
  h.push('Key');
  return h;
}

function ensureSheets_() {
  var s = sheet_(SHEETS.summary); if (s.getLastRow() === 0) { s.appendRow(summaryHeader_()); s.setFrozenRows(1); }
  var d = sheet_(SHEETS.detail); if (d.getLastRow() === 0) { d.appendRow(DETAIL_HEAD); d.setFrozenRows(1); }
  var r = sheet_(SHEETS.resub); if (r.getLastRow() === 0) { r.appendRow(summaryHeader_()); r.setFrozenRows(1); }
  sheet_(SHEETS.reteach);
  var c = sheet_(SHEETS.codes); if (c.getLastRow() === 0) { c.appendRow(['Class code (one per row; not case-sensitive)']); c.appendRow(['QUEST1']); c.appendRow(['QUEST2']); }
  sheet_(SHEETS.log);
}

/* --------------------------------------------------------------- handlers */

function handleStart_(st) {
  if (!st || !norm_(st.alias) || !norm_(st.code)) return { ok: false, reason: 'incomplete' };
  if (!codeOk_(st.code)) return { ok: false, reason: 'code' };
  return { ok: true, status: findRow_(SHEETS.summary, summaryHeader_().length, keyOf_(st)) > 0 ? 'duplicate' : 'new' };
}

function findRow_(sheetName, keyCol, key) {
  var s = ss_().getSheetByName(sheetName);
  if (!s || s.getLastRow() < 2) return -1;
  var keys = s.getRange(2, keyCol, s.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) if (keys[i][0] === key) return i + 2;
  return -1;
}

function summaryRow_(p, when) {
  var sc = p.scores || {}, st = p.student || {}, s = p.session || {};
  var byM = {}; (p.missions || []).forEach(function (m) { byM[m.id] = num_(m.earned); });
  var row = [when, safe_(st.alias, 60), safe_(st.period, 20), safe_(st.code, 40), Math.round(num_(sc.percent) * 10) / 10, Math.round(num_(sc.earned) * 100) / 100, num_(sc.max), safe_(sc.letter, 4),
    Math.round(num_(sc.completion)), Math.round(num_(sc.firstAttempt) * 100) / 100, num_(sc.attemptsUsed), num_(sc.attemptsAllowed), sc.minutes == null ? '' : num_(sc.minutes), num_(s.resetCount), safe_(s.id, 24)];
  MISSIONS.forEach(function (m) { row.push(byM[m] == null ? '' : Math.round(byM[m] * 100) / 100); });
  row.push(keyOf_(st));
  return row;
}

function handleSubmit_(p) {
  if (!p || !p.student || !p.session || !p.session.id) return { ok: false, reason: 'bad-payload' };
  if (!codeOk_(p.student.code)) return { ok: false, reason: 'code' };
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    ensureSheets_();
    var key = keyOf_(p.student), when = new Date(), sid = txt_(p.session.id, 24);
    var hlen = summaryHeader_().length, sumRow = findRow_(SHEETS.summary, hlen, key);
    if (sumRow > 0) {
      var sum = sheet_(SHEETS.summary);
      if (String(sum.getRange(sumRow, 15).getValue()) === sid) return { ok: false, reason: 'duplicate' };        // a retry of the same submission
      var rs = sheet_(SHEETS.resub), rr = rs.getLastRow() > 1 ? rs.getRange(2, 15, rs.getLastRow() - 1, 1).getValues() : [];
      for (var i = 0; i < rr.length; i++) if (String(rr[i][0]) === sid) return { ok: false, reason: 'duplicate' };
      rs.appendRow(summaryRow_(p, when));
      writeDetail_(p, when, 'resub');
      return { ok: true, status: 'resubmission' };
    }
    sheet_(SHEETS.summary).appendRow(summaryRow_(p, when));
    writeDetail_(p, when, 'main');
    rebuildReteach_();
    return { ok: true, status: 'new' };
  } finally { lock.releaseLock(); }
}

/* Detail stays one row per student per item, so a resubmission's items are only stashed (in script properties)
   and are written to Detail if you choose "Use a resubmission for one student". */
function writeDetail_(p, when, kind) {
  if (kind !== 'main') { stash_(p); return; }
  var st = p.student, rows = (p.items || []).map(function (i) {
    return [when, safe_(st.alias, 60), safe_(st.period, 20), safe_(i.id, 24), num_(i.m), safe_(i.topic, 80), num_(i.pts), Math.round(num_(i.best) * 100) / 100, Math.round(num_(i.first) * 100) / 100, num_(i.n), num_(i.limit)];
  });
  if (!rows.length) return;
  var d = sheet_(SHEETS.detail); d.getRange(d.getLastRow() + 1, 1, rows.length, DETAIL_HEAD.length).setValues(rows);
}
function stash_(p) { PropertiesService.getScriptProperties().setProperty('resub:' + txt_(p.session.id, 24), JSON.stringify({ student: p.student, items: p.items, when: new Date().toISOString() }).slice(0, 8500)); }

/* ----------------------------------------------------------------- reteach */

function rebuildReteach_() {
  var d = sheet_(SHEETS.detail), r = sheet_(SHEETS.reteach);
  r.clear();
  if (d.getLastRow() < 2) return;
  var rows = d.getRange(2, 1, d.getLastRow() - 1, DETAIL_HEAD.length).getValues(), top = {}, items = {}, students = {}, sumPct = 0;
  rows.forEach(function (x) {
    students[norm_(x[1]) + '|' + norm_(x[2])] = 1;
    var t = top[x[5]] || (top[x[5]] = { e: 0, f: 0, m: 0 }); t.e += num_(x[7]); t.f += num_(x[8]); t.m += num_(x[6]);
    var it = items[x[3]] || (items[x[3]] = { id: x[3], topic: x[5], e: 0, f: 0, m: 0, n: 0, att: 0 }); it.e += num_(x[7]); it.f += num_(x[8]); it.m += num_(x[6]); it.n++; it.att += num_(x[9]);
  });
  var out = [['RETEACH: start at the top. Lower % = the class missed more of these points.', '', '', ''], ['Students counted', Object.keys(students).length, '', ''], ['', '', '', ''],
    ['Topic', 'Class % (final points)', 'Class % (first attempt)', 'Points possible (all students)']];
  Object.keys(top).map(function (k) { return { k: k, p: top[k].m ? top[k].e / top[k].m : 0, f: top[k].m ? top[k].f / top[k].m : 0, m: top[k].m }; })
    .sort(function (a, b) { return a.p - b.p; })
    .forEach(function (t) { out.push([t.k, Math.round(t.p * 1000) / 10, Math.round(t.f * 1000) / 10, t.m]); });
  out.push(['', '', '', ''], ['The 10 most-missed items', 'Class % (final points)', 'Class % (first attempt)', 'Avg attempts / flag']);
  Object.keys(items).map(function (k) { return items[k]; }).sort(function (a, b) { return (a.e / a.m) - (b.e / b.m); }).slice(0, 10).forEach(function (i) {
    out.push([i.id + '  (' + i.topic + ')', Math.round(i.e / i.m * 1000) / 10, Math.round(i.f / i.m * 1000) / 10,
      (Math.round(i.att / i.n * 10) / 10) + (i.n >= FLAG_MIN_N && i.e / i.m < FLAG_BELOW ? '  ← possibly a bad question: review' : '')]);
  });
  r.getRange(1, 1, out.length, 4).setValues(out);
}

/* ------------------------------------------------------------ teacher menu */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Wildcats Quest')
    .addItem('1. Set up tabs (first time)', 'setupTabs')
    .addItem('Use a resubmission for one student', 'useResubmission')
    .addItem('Wipe ALL results (keeps class codes)', 'wipeAll')
    .addToUi();
}
function setupTabs() { ensureSheets_(); SpreadsheetApp.getUi().alert('Done. Edit the ClassCodes tab, then Deploy -> New deployment -> Web app (Execute as: Me, Who has access: Anyone) and paste the URL into js/teacher-config.js.'); }

function useResubmission() {
  var ui = SpreadsheetApp.getUi(), r = ui.prompt('Use a resubmission', 'Type the student alias/ID exactly as shown on the Resubmissions tab:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var alias = norm_(r.getResponseText()), rs = sheet_(SHEETS.resub), sum = sheet_(SHEETS.summary);
  var hlen = summaryHeader_().length, n = rs.getLastRow() - 1, found = 0;
  if (n < 1) { ui.alert('The Resubmissions tab is empty.'); return; }
  var data = rs.getRange(2, 1, n, hlen).getValues();
  for (var i = data.length - 1; i >= 0; i--) if (norm_(data[i][1]) === alias) { found = i + 2; break; }
  if (!found) { ui.alert('No resubmission found for "' + r.getResponseText() + '".'); return; }
  var newRow = data[found - 2], key = newRow[hlen - 1], cur = findRow_(SHEETS.summary, hlen, key);
  if (cur < 1) { ui.alert('That student has no row on Summary.'); return; }
  var oldRow = sum.getRange(cur, 1, 1, hlen).getValues()[0];
  sum.getRange(cur, 1, 1, hlen).setValues([newRow]);
  rs.getRange(found, 1, 1, hlen).setValues([oldRow]);          // swap, so the earlier result is kept on Resubmissions
  var props = PropertiesService.getScriptProperties().getProperty('resub:' + newRow[14]);
  var saved = {}; try { saved = props ? JSON.parse(props) : {}; } catch (err) { saved = {}; }
  if (saved.items && saved.items.length) {
    var st = saved.student || {}, d = sheet_(SHEETS.detail), all = d.getLastRow() > 1 ? d.getRange(2, 1, d.getLastRow() - 1, DETAIL_HEAD.length).getValues() : [];
    var keep = all.filter(function (x) { return norm_(x[1]) !== alias; });
    var add = (saved.items || []).map(function (i) { return [new Date(saved.when), safe_(st.alias, 60), safe_(st.period, 20), safe_(i.id, 24), num_(i.m), safe_(i.topic, 80), num_(i.pts), num_(i.best), num_(i.first), num_(i.n), num_(i.limit)]; });
    d.clearContents(); d.appendRow(DETAIL_HEAD); var rows = keep.concat(add); if (rows.length) d.getRange(2, 1, rows.length, DETAIL_HEAD.length).setValues(rows);
  }
  rebuildReteach_();
  ui.alert('Done. The resubmission is now on Summary; the earlier result moved to Resubmissions.');
}

function wipeAll() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('Delete all results?', 'This clears Summary, Detail, Reteach, Resubmissions and Log. Class codes stay.', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  [SHEETS.summary, SHEETS.detail, SHEETS.resub, SHEETS.reteach, SHEETS.log].forEach(function (n) { var s = ss_().getSheetByName(n); if (s) s.clear(); });
  PropertiesService.getScriptProperties().deleteAllProperties();
  ensureSheets_();
}
