/**
 * Community Health Mission: results receiver (Google Apps Script)
 * ---------------------------------------------------------------------------
 * Paste this whole file into the Apps Script editor of your results Google Sheet and deploy it as a Web app
 * (Execute as: Me; Who has access: Anyone). It contains NO answers: students grade in their browser and this
 * only records the finished result. It:
 *   1. Checks class codes against the ClassCodes tab (codes are not in the web page).
 *   2. Writes ONE row per student on Summary (percent, module scores, one column per question).
 *   3. Writes every attempt on Responses.
 *   4. Builds a Reteach tab (live formulas) showing which questions the class missed most.
 * A repeat send of the same result is recognised and ignored, so a retry never double-counts.
 * Honest limit: the browser decides what to send, so a technically skilled student could send altered numbers.
 */

var VERSION = '1.0';
var TAB = { summary: 'Summary', responses: 'Responses', reteach: 'Reteach', codes: 'ClassCodes', log: 'Log' };
var UNITS = [{"id":"M1-U1","module":1,"points":4},{"id":"M1-U2","module":1,"points":3},{"id":"M1-U3","module":1,"points":4},{"id":"M1-U4","module":1,"points":3},{"id":"M1-U5","module":1,"points":4},{"id":"M2-U1","module":2,"points":3},{"id":"M2-U2","module":2,"points":3},{"id":"M2-U3","module":2,"points":3},{"id":"M2-U4","module":2,"points":3},{"id":"M3-U1","module":3,"points":3},{"id":"M3-U2","module":3,"points":4},{"id":"M3-U3","module":3,"points":4},{"id":"M3-U4","module":3,"points":4},{"id":"M3-U5","module":3,"points":4},{"id":"M3-U6","module":3,"points":3},{"id":"M4-U1","module":4,"points":3},{"id":"M4-U2","module":4,"points":3},{"id":"M4-U3","module":4,"points":3},{"id":"M4-U4","module":4,"points":3},{"id":"M5-U1","module":5,"points":3},{"id":"M5-U2","module":5,"points":3},{"id":"M5-U3","module":5,"points":3},{"id":"M5-U4","module":5,"points":3},{"id":"M5-U5","module":5,"points":4},{"id":"M6-U1","module":6,"points":4},{"id":"M6-U2","module":6,"points":4},{"id":"M6-U3","module":6,"points":4},{"id":"M6-U4","module":6,"points":4},{"id":"M6-U5","module":6,"points":4}];
var MODULE_COUNT = 6;
var SUMMARY_HEAD = ['Submitted', 'Class code', 'Block', 'Roster ID', 'Name', 'Percent', 'Points', 'Out of', 'Questions finished', 'First-try correct', 'Attempts', 'Minutes']
  .concat([1, 2, 3, 4, 5, 6].map(function (n) { return 'Module ' + n + ' points'; })).concat(['Receipt', 'Session ID'])
  .concat(UNITS.map(function (u) { return u.id + ' (/' + u.points + ')'; }));
var RESP_HEAD = ['Submitted', 'Session ID', 'Class code', 'Roster ID', 'Name', 'Question', 'Module', 'Concept', 'Attempt', 'Correct', 'Points earned', 'Points possible', 'Accepted at'];

function doGet() { return out_({ ok: true, service: 'Community Health Mission results', version: VERSION }); }

function doPost(e) {
  var body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return out_({ ok: false, reason: 'bad-request' }); }
  try {
    if (body.action === 'start') return out_({ ok: isCode_(body.classCode), reason: isCode_(body.classCode) ? '' : 'bad-code' });
    if (body.action === 'submit') return out_(submit_(body.payload));
    return out_({ ok: false, reason: 'unknown-action' });
  } catch (err) {
    log_('error', String(err && err.stack || err));
    return out_({ ok: false, reason: 'server-error' });
  }
}

function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function tab_(name) { return ss_().getSheetByName(name) || ss_().insertSheet(name); }
function norm_(s) { return String(s == null ? '' : s).trim().toUpperCase().replace(/\s+/g, ''); }
function txt_(x, n) { return String(x == null ? '' : x).replace(/[\u0000-\u001f]/g, ' ').slice(0, n || 80); }
function num_(x) { var n = Number(x); return isFinite(n) ? n : 0; }
/* A cell starting with = + - @ would run as a formula; prefix a quote so typed text stays text. */
function safe_(x, n) { var s = txt_(x, n); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function log_(kind, msg) { try { tab_(TAB.log).appendRow([new Date(), kind, String(msg).slice(0, 500)]); } catch (e) { /* ignore */ } }

function codes_() {
  var s = ss_().getSheetByName(TAB.codes);
  if (!s || s.getLastRow() < 2) return [];
  return s.getRange(2, 1, s.getLastRow() - 1, 1).getValues().map(function (r) { return norm_(r[0]); }).filter(Boolean);
}
function isCode_(c) { return codes_().indexOf(norm_(c)) >= 0; }

function submit_(p) {
  if (!p || typeof p !== 'object' || !p.sessionId || !p.receiptId) return { ok: false, reason: 'bad-request' };
  if (JSON.stringify(p).length > 200000) return { ok: false, reason: 'too-large' };
  if (!isCode_(p.classCode)) return { ok: false, reason: 'bad-code' };
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var sum = tab_(TAB.summary);
    if (sum.getLastRow() < 1) setupTabs_();
    var ids = sum.getLastRow() > 1 ? sum.getRange(2, 1 + SUMMARY_HEAD.indexOf('Session ID'), sum.getLastRow() - 1, 1).getValues().map(function (r) { return r[0]; }) : [];
    if (ids.indexOf(String(p.sessionId)) >= 0) return { ok: true, duplicate: true, receiptId: txt_(p.receiptId, 40) };
    var mods = [1, 2, 3, 4, 5, 6].map(function (n) { var m = (p.modules || []).filter(function (x) { return x.id === n; })[0]; return m ? num_(m.earned) : 0; });
    var byUnit = {}; (p.units || []).forEach(function (u) { byUnit[u.id] = num_(u.earned); });
    var row = [new Date(), norm_(p.classCode), safe_(p.period, 12), safe_(p.rosterId, 24), safe_(p.name, 40), Math.round(num_(p.pct) * 10) / 10, num_(p.earned), num_(p.possible),
      num_(p.completed), num_(p.firstTryCorrect), num_(p.attempts), num_(p.minutes)].concat(mods).concat([safe_(p.receiptId, 40), safe_(p.sessionId, 40)])
      .concat(UNITS.map(function (u) { return byUnit[u.id] == null ? '' : byUnit[u.id]; }));
    sum.appendRow(row);
    var resp = tab_(TAB.responses);
    var rows = (p.responses || []).slice(0, 400).map(function (r) {
      return [new Date(), safe_(p.sessionId, 40), norm_(p.classCode), safe_(p.rosterId, 24), safe_(p.name, 40), safe_(r.taskId, 12), num_(r.module), safe_(r.concept, 12), num_(r.attempt),
        String(r.correct).toUpperCase() === 'TRUE' ? 'TRUE' : 'FALSE', num_(r.earned), num_(r.possible), safe_(r.acceptedAt, 40)];
    });
    if (rows.length) resp.getRange(resp.getLastRow() + 1, 1, rows.length, RESP_HEAD.length).setValues(rows);
    return { ok: true, receiptId: txt_(p.receiptId, 40) };
  } finally { lock.releaseLock(); }
}

/* ------------------------------------------------------------------ teacher menu */

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Community Health Mission')
    .addItem('1. Set up this spreadsheet', 'chmSetup')
    .addItem('2. Add a class code', 'chmAddCode')
    .addItem('3. Refresh Reteach tab', 'chmReteach')
    .addToUi();
}

function setupTabs_() {
  var s = tab_(TAB.summary);
  if (s.getLastRow() < 1) { s.getRange(1, 1, 1, SUMMARY_HEAD.length).setValues([SUMMARY_HEAD]).setFontWeight('bold').setBackground('#e6f4f1'); s.setFrozenRows(1); s.setFrozenColumns(5); }
  var r = tab_(TAB.responses);
  if (r.getLastRow() < 1) { r.getRange(1, 1, 1, RESP_HEAD.length).setValues([RESP_HEAD]).setFontWeight('bold').setBackground('#e6f4f1'); r.setFrozenRows(1); }
  var c = tab_(TAB.codes);
  if (c.getLastRow() < 1) { c.getRange(1, 1, 1, 2).setValues([['Class code', 'Note (optional)']]).setFontWeight('bold').setBackground('#e6f4f1'); }
  tab_(TAB.log);
}

function chmSetup() {
  setupTabs_();
  chmReteach();
  SpreadsheetApp.getUi().alert('Set up complete.\nNext: add a class code (menu 2), then deploy this script as a Web app and paste the /exec link into config.js.');
}

function chmAddCode() {
  var ui = SpreadsheetApp.getUi(), r = ui.prompt('Add a class code', 'Type a code students will enter (letters and numbers, e.g. HEALTH3A). Students type it in any capitalization.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var code = norm_(r.getResponseText());
  if (!/^[A-Z0-9_\-]{2,24}$/.test(code)) { ui.alert('Use 2 to 24 letters, numbers, - or _.'); return; }
  setupTabs_();
  if (codes_().indexOf(code) < 0) tab_(TAB.codes).appendRow([code, '']);
  ui.alert('Class code ' + code + ' is ready.');
}

/* Reteach: live formulas over the Summary question columns (percent of points earned, and how many students answered). */
function chmReteach() {
  var t = tab_(TAB.reteach); t.clear();
  var firstCol = SUMMARY_HEAD.length - UNITS.length + 1;
  t.getRange(1, 1, 1, 5).setValues([['Question', 'Module', 'Points possible', 'Class average % of points', 'Students']]).setFontWeight('bold').setBackground('#e6f4f1');
  var rows = UNITS.map(function (u, i) {
    var col = columnLetter_(firstCol + i), rng = TAB.summary + '!' + col + '2:' + col;
    return [u.id, u.module, u.points, '=IFERROR(AVERAGE(' + rng + ')/C' + (i + 2) + ',"")', '=COUNT(' + rng + ')'];
  });
  t.getRange(2, 1, rows.length, 5).setFormulas(rows);
  t.getRange(2, 4, rows.length, 1).setNumberFormat('0%');
  t.setFrozenRows(1);
  t.getRange(1, 7).setValue('Lowest percentages are the best candidates to reteach. Needs a few finished students to mean anything.');
}

function columnLetter_(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - m) / 26); } return s; }
