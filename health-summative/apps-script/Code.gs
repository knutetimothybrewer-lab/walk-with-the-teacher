/**
 * Wildcat Wellness Trail — Google Apps Script backend
 * ---------------------------------------------------------------------------
 * Paste this whole file into a Google Sheet's Apps Script editor and deploy it
 * as a Web app (README §6). It does five things:
 *   1. Checks class codes on the SERVER (so codes are not readable in the page).
 *   2. Stores one final record per student (name + period + code) — no duplicates.
 *   3. Writes tabs: Summary, Detail, Items, Reteach, Class, Gradebook, Archive, and one "Class - <code>" tab per class code.
 *   4. Lets YOU (passcode-protected) list students and reset one for a retake.
 *   5. Adds a "Wildcat Trail" menu to the Sheet for the same teacher tools.
 *
 * Privacy: it stores only first name, last name or initial, period, the class
 * code, scores, per-question attempts and counts of skips / help-button opens.
 * No third-party services are called.
 */

var VERSION = '1.0';
var SHEETS = {
  summary: 'Summary', detail: 'Detail', items: 'Items', reteach: 'Reteach',
  klass: 'Class', gradebook: 'Gradebook', archive: 'Archive', codes: 'ClassCodes', log: 'Log',
};
// Keep these two lists in sync with the content files (content/index.js).
var STATIONS = ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 'capstone'];
var TOPICS = {
  MH101: 'Mental Health 101',
  EH: 'Understanding Emotional Health (patterns, D.I.I.S., data, red flags)',
  STRESS: 'Stress and the Brain',
  COMM: 'Communication (Listen, Validate, Ask, Connect)',
  HELP: 'Help-Seeking',
  INFO: 'Infographic Project',
};
var SUMMARY_FIXED = ['Timestamp', 'Last', 'First', 'Period', 'Class code', 'Percent', 'Points earned', 'Points possible',
  'Total seconds', 'Active seconds', 'Skips', 'Help opens', 'Completion code', 'Code verified', 'Retake #'];
var DETAIL_HEAD = ['Timestamp', 'Student key', 'Last', 'First', 'Period', 'Item', 'Station', 'Topic', 'Question (start)', 'Points',
  'Earned', 'Attempts', 'First attempt correct (1/0)', 'Skipped', 'First wrong answer'];
var FLAG_BELOW = 0.4;   // flag items answered correctly on attempt 1 by fewer than 40%
var FLAG_MIN_N = 3;     // ...once at least this many students have answered

/* ------------------------------------------------------------------ web app */

function doGet(e) {
  return json_({ ok: true, service: 'Wildcat Wellness Trail', version: VERSION });
}

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, reason: 'bad-request' }); }
  try {
    switch (body.action) {
      case 'start': return json_(handleStart_(body.student));
      case 'submit': return json_(handleSubmit_(body.payload));
      case 'teacher': return json_(handleTeacher_(body));
      default: return json_({ ok: false, reason: 'unknown-action' });
    }
  } catch (err) {
    log_('error', String(err && err.stack || err));
    return json_({ ok: false, reason: 'server-error' });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------------------------------------------------------- helpers */

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(name) {
  var s = ss_().getSheetByName(name);
  return s || ss_().insertSheet(name);
}
function norm_(s) { return String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' '); }
function keyOf_(st) { return norm_(st.first + ' ' + st.last) + '|' + norm_(st.period) + '|' + norm_(st.code); }
function log_(kind, msg) { try { sheet_(SHEETS.log).appendRow([new Date(), kind, String(msg).slice(0, 500)]); } catch (e) { /* ignore */ } }

function validCodes_() {
  var s = ss_().getSheetByName(SHEETS.codes);
  if (!s || s.getLastRow() < 2) return [];
  return s.getRange(2, 1, s.getLastRow() - 1, 1).getValues().map(function (r) { return norm_(r[0]); }).filter(Boolean);
}
function codeOk_(code) { return validCodes_().indexOf(norm_(code)) >= 0; }

function findSummaryRow_(key) {
  var s = ss_().getSheetByName(SHEETS.summary);
  if (!s || s.getLastRow() < 2) return -1;
  var keyCol = summaryHeader_().length;
  var keys = s.getRange(2, keyCol, s.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < keys.length; i++) if (keys[i][0] === key) return i + 2;
  return -1;
}

function summaryHeader_() {
  var h = SUMMARY_FIXED.slice();
  STATIONS.forEach(function (id) { h.push('Station ' + id + ' %'); });
  Object.keys(TOPICS).forEach(function (id) { h.push('Topic ' + id + ' %'); });
  h.push('Key');
  return h;
}

/* --------------------------------------------------------------- handlers */

function handleStart_(st) {
  if (!st || !st.first || !st.last || !st.period || !st.code) return { ok: false, reason: 'incomplete' };
  if (!codeOk_(st.code)) return { ok: false, reason: 'code' };
  var exists = findSummaryRow_(keyOf_(st)) > 0;
  return { ok: true, status: exists ? 'duplicate' : 'new' };
}

function handleSubmit_(p) {
  if (!p || !p.student) return { ok: false, reason: 'bad-payload' };
  var st = p.student;
  if (!codeOk_(st.code)) return { ok: false, reason: 'code' };
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    ensureSheets_();
    var sum = ss_().getSheetByName(SHEETS.summary);
    // Same completion code already stored => a retry after a lost response.
    if (sum.getLastRow() > 1) {
      var codes = sum.getRange(2, 13, sum.getLastRow() - 1, 1).getValues();
      for (var i = 0; i < codes.length; i++) if (codes[i][0] === p.completion) return { ok: true, dedup: true };
    }
    var key = keyOf_(st);
    if (findSummaryRow_(key) > 0) return { ok: false, reason: 'duplicate' };
    var now = new Date();
    var row = [now, st.last, st.first, st.period, String(st.code).toUpperCase(), p.percent, p.earned, p.possible,
      p.totalSeconds, p.activeSeconds, p.skips, p.helpOpens, p.completion, p.codeVerified, p.retakeNo || 0];
    STATIONS.forEach(function (id) { row.push(p.stations && p.stations[id] ? p.stations[id].percent : ''); });
    Object.keys(TOPICS).forEach(function (id) { row.push(p.topics && p.topics[id] ? p.topics[id].percent : ''); });
    row.push(key);
    sum.appendRow(row);
    var det = ss_().getSheetByName(SHEETS.detail);
    var rows = (p.items || []).map(function (it) {
      return [now, key, st.last, st.first, st.period, it.id, it.station, it.topic, it.label, it.points, it.earned,
        it.attempts, it.first === '' ? '' : it.first, it.skipped ? 1 : 0, it.firstWrong || ''];
    });
    if (rows.length) det.getRange(det.getLastRow() + 1, 1, rows.length, DETAIL_HEAD.length).setValues(rows);
    rebuildReports_();
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function handleTeacher_(b) {
  var pass = PropertiesService.getScriptProperties().getProperty('TEACHER_PASSCODE');
  if (!pass || String(b.passcode || '') !== pass) return { ok: false, reason: 'passcode' };
  if (b.op === 'list') {
    var s = ss_().getSheetByName(SHEETS.summary);
    var out = [];
    if (s && s.getLastRow() > 1) {
      var vals = s.getRange(2, 1, s.getLastRow() - 1, 8).getValues();
      vals.forEach(function (r) { out.push({ when: r[0], last: r[1], first: r[2], period: r[3], code: r[4], percent: r[5], earned: r[6], possible: r[7] }); });
    }
    return { ok: true, students: out, codes: validCodes_().length };
  }
  if (b.op === 'reset') { return { ok: resetStudent_(b.student), reason: '' }; }
  return { ok: false, reason: 'unknown-op' };
}

/**
 * Move one student's rows to Archive and delete them from Summary and Detail so
 * they can take the assessment again (retake or absence make-up).
 */
function resetStudent_(st) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    ensureSheets_();
    var key = keyOf_(st);
    var row = findSummaryRow_(key);
    if (row < 0) return false;
    var sum = ss_().getSheetByName(SHEETS.summary), arch = ss_().getSheetByName(SHEETS.archive), det = ss_().getSheetByName(SHEETS.detail);
    arch.appendRow(['RESET ' + new Date().toISOString()].concat(sum.getRange(row, 1, 1, summaryHeader_().length).getValues()[0]));
    sum.deleteRow(row);
    if (det.getLastRow() > 1) {
      var keys = det.getRange(2, 2, det.getLastRow() - 1, 1).getValues();
      for (var i = keys.length - 1; i >= 0; i--) if (keys[i][0] === key) det.deleteRow(i + 2);
    }
    log_('reset', key);
    rebuildReports_();
    return true;
  } finally { lock.releaseLock(); }
}

/* -------------------------------------------------------------- set up tabs */

function ensureSheets_() {
  var book = ss_();
  function make(name, header) {
    var s = book.getSheetByName(name);
    if (!s) { s = book.insertSheet(name); }
    if (header && s.getLastRow() === 0) {
      s.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#e8ebf7');
      s.setFrozenRows(1);
    }
    return s;
  }
  make(SHEETS.summary, summaryHeader_());
  make(SHEETS.detail, DETAIL_HEAD);
  make(SHEETS.archive, ['Reset at'].concat(summaryHeader_()));
  make(SHEETS.log, ['When', 'Kind', 'Message']);
  var codes = make(SHEETS.codes, ['Class code (any capitalization)', 'Note (period, teacher...)']);
  if (codes.getLastRow() < 2) codes.getRange(2, 1, 4, 2).setValues([['TRAIL1', 'Period 1'], ['TRAIL2', 'Period 2'], ['TRAIL3', 'Period 3'], ['TRAIL4', 'Period 4']]);
  make(SHEETS.items, null); make(SHEETS.reteach, null); make(SHEETS.klass, null); make(SHEETS.gradebook, null);
  buildClassTab_();
}

/** Run once from the menu: creates every tab and the formula tabs. */
function setupSheets() {
  ensureSheets_();
  rebuildReports_();
  SpreadsheetApp.getUi().alert('Done. Tabs created. Edit class codes on the ClassCodes tab, then set your teacher passcode from the menu.');
}

function buildClassTab_() {
  var s = ss_().getSheetByName(SHEETS.klass);
  if (s.getLastRow() > 0) return;
  var S = SHEETS.summary;
  var rows = [
    ['Class snapshot (formulas update automatically)', ''],
    ['Students finished', '=COUNTA(' + S + '!A2:A)'],
    ['Class average %', '=IFERROR(AVERAGE(' + S + '!F2:F),"")'],
    ['Median %', '=IFERROR(MEDIAN(' + S + '!F2:F),"")'],
    ['Lowest %', '=IFERROR(MIN(' + S + '!F2:F),"")'],
    ['Highest %', '=IFERROR(MAX(' + S + '!F2:F),"")'],
    ['Average total minutes', '=IFERROR(AVERAGE(' + S + '!I2:I)/60,"")'],
    ['Average active minutes', '=IFERROR(AVERAGE(' + S + '!J2:J)/60,"")'],
    ['Average skips per student', '=IFERROR(AVERAGE(' + S + '!K2:K),"")'],
    ['Average help-button opens', '=IFERROR(AVERAGE(' + S + '!L2:L),"")'],
    ['', ''],
    ['By period', ''],
  ];
  s.getRange(1, 1, rows.length, 2).setValues(rows);
  s.getRange(1, 1).setFontWeight('bold').setFontSize(13);
  s.getRange(rows.length, 1).setFontWeight('bold');
  s.getRange(rows.length + 1, 1).setFormula('=IFERROR(QUERY(' + S + '!A2:F,"select D, count(A), avg(F) where A is not null group by D label count(A) \'Students\', avg(F) \'Average %\'",0),"")');
  s.setColumnWidth(1, 260); s.setColumnWidth(2, 120);
  var g = ss_().getSheetByName(SHEETS.gradebook);
  g.getRange(1, 1).setFormula('=IFERROR(QUERY(' + S + '!A2:F,"select B, C, D, F where A is not null order by D, B label B \'Last\', C \'First\', D \'Period\', F \'Percent\'",0),"")');
  g.setColumnWidth(1, 160);
}

/* -------------------------------------------------------- reports (rebuilt) */

function rebuildReports_() {
  var det = ss_().getSheetByName(SHEETS.detail);
  var items = {};          // id -> aggregate
  var topics = {}, stations = {};
  if (det && det.getLastRow() > 1) {
    var vals = det.getRange(2, 1, det.getLastRow() - 1, DETAIL_HEAD.length).getValues();
    vals.forEach(function (r) {
      var id = r[5], station = r[6], topic = r[7], label = r[8], pts = Number(r[9]) || 0, earned = Number(r[10]) || 0;
      var attempts = Number(r[11]) || 0, first = r[12], skipped = Number(r[13]) === 1, wrong = r[14];
      var it = items[id] || (items[id] = { id: id, station: station, topic: topic, label: label, n: 0, firstOk: 0, attempts: 0, earnedPct: 0, wrongs: {}, skipped: 0 });
      it.label = label || it.label;
      if (skipped) { it.skipped++; return; }
      it.n++; it.attempts += attempts; it.earnedPct += pts ? earned / pts : 0;
      if (first === 1 || first === '1') it.firstOk++;
      else if (wrong) it.wrongs[wrong] = (it.wrongs[wrong] || 0) + 1;
      [[topics, topic], [stations, station]].forEach(function (pair) {
        var o = pair[0][pair[1]] || (pair[0][pair[1]] = { n: 0, miss: 0 });
        o.n++; if (!(first === 1 || first === '1')) o.miss++;
      });
    });
  }
  var list = Object.keys(items).map(function (k) { return items[k]; });
  list.forEach(function (it) {
    it.firstPct = it.n ? it.firstOk / it.n : null;
    it.top = Object.keys(it.wrongs).sort(function (a, b) { return it.wrongs[b] - it.wrongs[a]; })[0] || '';
    it.topCount = it.top ? it.wrongs[it.top] : 0;
  });

  // ---- Items tab (item difficulty; the % columns are live formulas on Detail)
  var s = ss_().getSheetByName(SHEETS.items);
  s.clear();
  var head = ['Item', 'Station', 'Topic', 'Question (start)', 'Answered (n)', 'Correct on attempt 1 (n)', '% correct on attempt 1', 'Avg attempts', 'Avg credit %', 'Skipped (n)', 'Most common wrong answer (attempt 1)', 'Flag'];
  s.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#e8ebf7');
  list.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
  var D = SHEETS.detail;
  var rows = list.map(function (it, i) {
    var r = i + 2;
    var flag = it.n >= FLAG_MIN_N && it.firstPct !== null && it.firstPct < FLAG_BELOW ? 'Possibly a bad question: review' : '';
    return [it.id, it.station, it.topic, it.label,
      '=COUNTIFS(' + D + '!F:F,A' + r + ',' + D + '!N:N,0)',
      '=COUNTIFS(' + D + '!F:F,A' + r + ',' + D + '!M:M,1)',
      '=IFERROR(F' + r + '/E' + r + ',"")',
      it.n ? it.attempts / it.n : '', it.n ? it.earnedPct / it.n : '', it.skipped,
      it.top ? it.top + ' (' + it.topCount + ')' : '', flag];
  });
  if (rows.length) {
    s.getRange(2, 1, rows.length, head.length).setValues(rows.map(function (r) { return r.map(function (c) { return typeof c === 'string' && c.charAt(0) === '=' ? '' : c; }); }));
    rows.forEach(function (r, i) { [5, 6, 7].forEach(function (c) { s.getRange(i + 2, c).setFormula(r[c - 1]); }); });
    s.getRange(2, 7, rows.length, 1).setNumberFormat('0%'); s.getRange(2, 9, rows.length, 1).setNumberFormat('0%'); s.getRange(2, 8, rows.length, 1).setNumberFormat('0.0');
  }
  s.setFrozenRows(1); s.setColumnWidth(4, 360); s.setColumnWidth(11, 360); s.setColumnWidth(12, 220);

  // ---- Reteach tab
  var rt = ss_().getSheetByName(SHEETS.reteach);
  rt.clear();
  var out = [['Reteach list (updates after every submission)', '', '', '', ''], ['', '', '', '', '']];
  out.push(['LESSON TOPICS, most missed first (miss = not fully correct on attempt 1)', '', '', '', '']);
  out.push(['Topic', 'Answers (n)', 'Missed on attempt 1', 'Miss rate', '']);
  Object.keys(topics).map(function (k) { return { k: k, n: topics[k].n, m: topics[k].miss, rate: topics[k].n ? topics[k].miss / topics[k].n : 0 }; })
    .sort(function (a, b) { return b.rate - a.rate; })
    .forEach(function (t) { out.push([TOPICS[t.k] || t.k, t.n, t.m, t.rate, '']); });
  out.push(['', '', '', '', '']);
  out.push(['STATIONS, most missed first', '', '', '', '']);
  out.push(['Station', 'Answers (n)', 'Missed on attempt 1', 'Miss rate', '']);
  Object.keys(stations).map(function (k) { return { k: k, n: stations[k].n, m: stations[k].miss, rate: stations[k].n ? stations[k].miss / stations[k].n : 0 }; })
    .sort(function (a, b) { return b.rate - a.rate; })
    .forEach(function (t) { out.push([t.k, t.n, t.m, t.rate, '']); });
  out.push(['', '', '', '', '']);
  out.push(['10 MOST-MISSED QUESTIONS', '', '', '', '']);
  out.push(['Item', 'Question (start)', '% correct on attempt 1 (n)', 'Most common wrong answer', 'Flag']);
  list.filter(function (it) { return it.n > 0; }).sort(function (a, b) { return a.firstPct - b.firstPct || b.n - a.n; }).slice(0, 10)
    .forEach(function (it) {
      out.push([it.id, it.label, Math.round(it.firstPct * 100) + '% (n=' + it.n + ')', it.top ? it.top + ' (' + it.topCount + ')' : '',
        it.n >= FLAG_MIN_N && it.firstPct < FLAG_BELOW ? 'Possibly a bad question: review' : '']);
    });
  var width = 5;
  out = out.map(function (r) { while (r.length < width) r.push(''); return r; });
  rt.getRange(1, 1, out.length, width).setValues(out);
  rt.getRange(1, 1).setFontWeight('bold').setFontSize(13);
  out.forEach(function (r, i) {
    if (r[0] === 'LESSON TOPICS, most missed first (miss = not fully correct on attempt 1)' || r[0] === 'STATIONS, most missed first' || r[0] === '10 MOST-MISSED QUESTIONS') rt.getRange(i + 1, 1, 1, width).setFontWeight('bold').setBackground('#e8ebf7');
    if (typeof r[3] === 'number') rt.getRange(i + 1, 4).setNumberFormat('0%');
  });
  rt.setColumnWidth(1, 330); rt.setColumnWidth(2, 360); rt.setColumnWidth(3, 200); rt.setColumnWidth(4, 360); rt.setColumnWidth(5, 220);
  rebuildClassTabs_();
}

/* ------------------------------------------------------- per-class tabs */
/* One tab per class code ("Class - <code>"), rebuilt from Summary: only that class's students, sorted by name,
   with a class-average row. Summary stays the master list. Rebuilt after every submission, reset and wipe, and from the menu. */
var CLASS_TAB_PREFIX = 'Class - ';
var CLASS_COL = 5, SORT_COLS = [2, 3], PCT_COL = 6;   // 1-based columns on Summary: class code, sort-by, percent

function classTabName_(code) { return (CLASS_TAB_PREFIX + String(code).replace(/[\[\]*?:\/\\]/g, '-')).slice(0, 99); }

function rebuildClassTabs_(onlyCode) {
  try {
    var cs = ss_().getSheetByName(SHEETS.codes), codes = [], seen = {};
    if (cs && cs.getLastRow() > 1) cs.getRange(2, 1, cs.getLastRow() - 1, 1).getValues().forEach(function (r) {
      var raw = String(r[0]).trim(), k = norm_(raw);
      if (k && !seen[k]) { seen[k] = 1; codes.push(raw); }
    });
    if (onlyCode) codes = codes.filter(function (c) { return norm_(c) === norm_(onlyCode); });
    if (!codes.length) return;
    var sum = ss_().getSheetByName(SHEETS.summary), hlen = summaryHeader_().length, head = summaryHeader_().slice(0, hlen - 1);
    var all = sum && sum.getLastRow() > 1 ? sum.getRange(2, 1, sum.getLastRow() - 1, hlen).getValues() : [];
    codes.forEach(function (code) {
      var rows = all.filter(function (r) { return norm_(r[CLASS_COL - 1]) === norm_(code); })
        .sort(function (a, b) {
          for (var i = 0; i < SORT_COLS.length; i++) { var x = norm_(a[SORT_COLS[i] - 1]), y = norm_(b[SORT_COLS[i] - 1]); if (x !== y) return x < y ? -1 : 1; }
          return 0;
        }).map(function (r) { return r.slice(0, hlen - 1); });
      var tab = sheet_(classTabName_(code)); tab.clear();
      tab.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#e8ebf7'); tab.setFrozenRows(1);
      if (!rows.length) return;
      tab.getRange(2, 1, rows.length, head.length).setValues(rows);
      var last = rows.length + 1, pc = PCT_COL, r0 = last + 2, col = function (n) { return String.fromCharCode(64 + n); };
      tab.getRange(r0, 1, 1, 1).setValues([['Class average']]).setFontWeight('bold');
      tab.getRange(r0, pc).setFormula('=AVERAGE(' + col(pc) + '2:' + col(pc) + last + ')').setNumberFormat('0.0');
      tab.getRange(r0, pc + 1).setFormula('=AVERAGE(' + col(pc + 1) + '2:' + col(pc + 1) + last + ')').setNumberFormat('0.0');
      tab.getRange(r0 + 1, 1, 1, 2).setValues([['Students', rows.length]]).setFontWeight('bold');
    });
  } catch (err) { log_('class-tabs', String(err && err.stack || err)); }
}


/* ------------------------------------------------------------- teacher menu */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Wildcat Trail')
    .addItem('1. Set up tabs (first time)', 'setupSheets')
    .addItem('2. Set teacher passcode', 'menuSetPasscode')
    .addSeparator()
    .addItem('Reset one student (retake / makeup)', 'menuReset')
    .addItem('Rebuild Items, Reteach and class tabs', 'menuRebuild')
    .addSeparator()
    .addItem('Wipe ALL results (use after the pilot)', 'menuWipe')
    .addToUi();
}

function menuSetPasscode() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Teacher passcode', 'Choose a passcode for the teacher page (teacher.html). It is stored privately in this script, not in the Sheet.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK || !r.getResponseText().trim()) return;
  PropertiesService.getScriptProperties().setProperty('TEACHER_PASSCODE', r.getResponseText().trim());
  ui.alert('Passcode saved.');
}

function menuReset() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Reset a student', 'Type: first name, last name, period, class code (separated by commas). Example: Alex, Rivera, 3, TRAIL3', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var p = r.getResponseText().split(',').map(function (x) { return x.trim(); });
  if (p.length < 4) { ui.alert('Please give all four: first, last, period, code.'); return; }
  var ok = resetStudent_({ first: p[0], last: p[1], period: p[2], code: p[3] });
  ui.alert(ok ? 'Reset. That student can start again. Their old row is saved on the Archive tab.' : 'No finished record found for that name, period and code.');
}

function menuRebuild() { ensureSheets_(); rebuildReports_(); SpreadsheetApp.getUi().alert('Rebuilt.'); }

function menuWipe() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.alert('Wipe ALL results?', 'This deletes every row on Summary, Detail, Items, Reteach and Archive. Class codes stay. This cannot be undone. Use it to clear pilot data.', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  [SHEETS.summary, SHEETS.detail, SHEETS.archive].forEach(function (n) {
    var s = ss_().getSheetByName(n);
    if (s && s.getLastRow() > 1) s.deleteRows(2, s.getLastRow() - 1);
  });
  rebuildReports_();
  ui.alert('All results cleared.');
}
