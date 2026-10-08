/**
 * UNIT 7: NUTRITION & PHYSICAL ACTIVITY  -  Google Sheets gradebook backend (Google Apps Script, V8 runtime)
 *
 * SETUP (details in README.md):
 *   1. Create a blank Google Sheet. Extensions > Apps Script. Paste this file as Code.gs and the generated KeyData.gs next to it.
 *   2. Run  setupGradebook()  once (authorize when asked). It builds EVERY tab, header, format, formula and rule for you.
 *   3. Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone). Copy the /exec URL into js/config.js (backendUrl).
 *
 * TABS THIS SCRIPT CREATES AND MAINTAINS
 *   MASTER RESULTS   every submission from every class (one row per student attempt)
 *   BLOCK 1-2, BLOCK 3-4, BLOCK 6-7, BLOCK 8-9   each submission is also routed to its block (names come from the SETTINGS tab)
 *   ITEM ANALYSIS    one row per student per question (attempts, points, responses)
 *   CLASS ANALYTICS  live formulas: per-block averages, domain mastery, first-attempt accuracy, per-question difficulty
 *   GRADE EXPORT     Last Name | First Name | Block | Final Percentage (live, ready to copy into another gradebook)
 *   SETTINGS         class codes, block list, thresholds, options
 *   SESSIONS         internal bookkeeping (started / completed / reset); you can ignore it
 *
 * Security note: a web page can never be made tamper-proof. This script re-checks every submitted attempt against the key in
 * KeyData.gs (hashed answers), enforces three attempts per question, refuses duplicates from the same student, and flags oddities.
 */

var APP_VERSION = '1.0.0';
var CREDIT = [1, 0.85, 0.75];
var TAB = { master: 'MASTER RESULTS', items: 'ITEM ANALYSIS', analytics: 'CLASS ANALYTICS', grade: 'GRADE EXPORT', settings: 'SETTINGS', sessions: 'SESSIONS' };
var DEFAULT_BLOCKS = ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9'];
var DEFAULT_CODES = ['UNIT7'];
var DEFAULT_ASSESSMENT_ID = 'unit7-nutrition-activity';
var REVIEW = { ok: 'OK', dupReview: 'DUPLICATE: REVIEW', dupAccepted: 'DUPLICATE: ACCEPTED', dupIgnored: 'DUPLICATE: IGNORED', reset: 'RESET: superseded' };
var REC = { live: 'LIVE', demo: 'DEMO DATA' };

// ---- MASTER / BLOCK column map (1-based) ---------------------------------------------------------------------
var MC = { ts: 1, type: 2, first: 3, last: 4, block: 5, assess: 6, version: 7, seed: 8, start: 9, sub: 10, dur: 11, raw: 12, poss: 13, pct: 14, d0: 15, f1: 22, f2: 23, f3: 24, zero: 25, status: 26, review: 27, dupOf: 28, integ: 29, sid: 30, conf: 31, counts: 32, choices: 33 };
var MASTER_HEADERS = ['Timestamp', 'Record Type', 'Student First Name', 'Student Last Name', 'Class Block', 'Assessment ID', 'Assessment Version', 'Randomization Seed', 'Start Time', 'Submission Time',
  'Total Duration (min)', 'Raw Points Earned', 'Total Points Possible', 'Final Percentage',
  'Nutrition Foundations %', 'Nutrition Labels %', 'Physical Activity/FITT %', 'Marketing Literacy %', 'SMART Goals %', 'Food Systems %', 'Integrated Decision-Making %',
  'First-Attempt Correct', 'Second-Attempt Correct', 'Third-Attempt Correct', 'Zero-Credit Questions', 'Completion Status', 'Review Status', 'Duplicate Of', 'Integrity Check',
  'Submission ID', 'Confirmation ID', 'Counts in Analytics (1/0)', 'Scenario Choices'];
// ITEM ANALYSIS columns
var IC = { ts: 1, type: 2, sid: 3, last: 4, first: 5, block: 6, qid: 7, slot: 8, domain: 9, concept: 10, skill: 11, diff: 12, qtype: 13, inter: 14, major: 15, poss: 16, earned: 17, used: 18, result: 19, a1: 20, a2: 21, a3: 22, counts: 23 };
var ITEM_HEADERS = ['Timestamp', 'Record Type', 'Submission ID', 'Last Name', 'First Name', 'Class Block', 'Question ID', 'Item (slot)', 'Content Domain', 'Concept', 'Skill', 'Difficulty (1-3)', 'Question Type', 'Interaction', 'Major Scenario/Simulation (1/0)',
  'Points Possible', 'Points Earned', 'Attempts Used', 'Result', 'Attempt 1 Response', 'Attempt 2 Response', 'Attempt 3 Response', 'Counts in Analytics (1/0)'];
var SESSION_HEADERS = ['Session ID', 'Name Key', 'First', 'Last', 'Block', 'Assessment ID', 'Record Type', 'Version', 'Seed', 'Started', 'Last Seen', 'Status', 'Attempts JSON', 'Stage IDs', 'Confirmation ID'];
var SC = { sid: 1, key: 2, first: 3, last: 4, block: 5, assess: 6, type: 7, version: 8, seed: 9, started: 10, seen: 11, status: 12, att: 13, stages: 14, conf: 15 };

// SETTINGS cell addresses
var SET = { strong: 'I3', dev: 'I4', includeDemo: 'I5', assess: 'I6' };

// ====================================================================================================== entry points
function doGet() { return json_({ ok: true, app: 'unit7-gradebook', version: APP_VERSION, contentVersion: typeof CONTENT_VERSION !== 'undefined' ? CONTENT_VERSION : null }); }

function doPost(e) {
  var out;
  try {
    var raw = (e && e.postData && e.postData.contents) || '{}';
    if (raw.length > 400000) throw new Error('payload-too-large');
    var body = JSON.parse(raw);
    var lock = LockService.getScriptLock();
    lock.waitLock(28000);
    try { out = route_(body); } finally { lock.releaseLock(); }
  } catch (err) {
    out = { ok: false, error: 'server-error', detail: String(err && err.message || err) };
  }
  return json_(out);
}

function route_(b) {
  switch (b.action) {
    case 'ping': return { ok: true, app: 'unit7-gradebook', version: APP_VERSION, sheet: ss_().getName() };
    case 'validate': return validate_(b);
    case 'start': return start_(b);
    case 'check': return check_(b);
    case 'submit': return submit_(b, false);
    case 'status': return status_(b);
    case 'reset_student': return resetStudentByCode_(b);
    case 't_data': return teacher_(b, dashboardData_);
    case 't_reset': return teacher_(b, function () { return resetStudent_(b.first, b.last, b.block, b.sid); });
    case 't_review': return teacher_(b, function () { return setReview_(b.sid, b.status); });
    case 't_demo_generate': return teacher_(b, function () { return generateDemoData_(Number(b.count) || 28); });
    case 't_demo_delete': return teacher_(b, function () { return deleteDemoData_(); });
    case 't_test_submit': return teacher_(b, function () { return submit_(b.payload || {}, true); });
    default: return { ok: false, error: 'unknown-action' };
  }
}

// ====================================================================================================== setup (run once)
/**
 * Builds the whole gradebook: tabs, headers, formats, freeze panes, filters, data validation, conditional formatting,
 * live analytics formulas, default class code and a teacher dashboard passcode. Safe to run again (never deletes student data).
 */
function setupGradebook() {
  var ss = ss_();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  var settings = ensureSheet_(ss, TAB.settings);
  buildSettings_(settings);
  var master = ensureSheet_(ss, TAB.master);
  writeHeader_(master, MASTER_HEADERS, '#143d2b');
  formatMaster_(master, true);
  getBlocks_().forEach(function (blk) {
    var sh = ensureSheet_(ss, blk.tab);
    writeHeader_(sh, MASTER_HEADERS, '#1f3b73');
    formatMaster_(sh, false);
  });
  var items = ensureSheet_(ss, TAB.items);
  writeHeader_(items, ITEM_HEADERS, '#4a2a6b');
  formatItems_(items);
  var ses = ensureSheet_(ss, TAB.sessions);
  writeHeader_(ses, SESSION_HEADERS, '#444444');
  ses.setFrozenRows(1);
  buildAnalytics_(ensureSheet_(ss, TAB.analytics));
  buildGradeExport_(ensureSheet_(ss, TAB.grade));
  orderTabs_(ss);
  var props = PropertiesService.getScriptProperties();
  var msg = '';
  if (!props.getProperty('TEACHER_PASSCODE')) {
    var p = 'DASH-' + Math.floor(100000 + Math.random() * 900000);
    props.setProperty('TEACHER_PASSCODE', p);
    msg = 'Your TEACHER DASHBOARD PASSCODE is: ' + p + '\n(Change it any time: menu Unit 7 Gradebook > Set dashboard passcode.)\n\n';
  } else msg = 'Dashboard passcode already set (unchanged).\n\n';
  msg += 'Setup complete. Next: Deploy > New deployment > Web app, then paste the /exec URL into js/config.js.';
  Logger.log(msg);
  try { SpreadsheetApp.getUi().alert('Unit 7 gradebook ready', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { /* run from editor without UI */ }
  return msg;
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Unit 7 Gradebook')
      .addItem('Set up / repair gradebook', 'setupGradebook')
      .addSeparator()
      .addItem('Generate DEMO DATA (28 fictional students)', 'menuGenerateDemo')
      .addItem('Delete DEMO DATA', 'menuDeleteDemo')
      .addSeparator()
      .addItem('Set dashboard passcode', 'setDashboardPasscode')
      .addItem('Set teacher reset code', 'setResetCode')
      .addToUi();
  } catch (e) { /* not bound to a sheet */ }
}
function menuGenerateDemo() { var r = generateDemoData_(28); toast_('Created ' + r.created + ' DEMO DATA submissions.'); }
function menuDeleteDemo() { var r = deleteDemoData_(); toast_('Deleted ' + r.deleted + ' DEMO DATA submissions. Real submissions were not touched.'); }
function setDashboardPasscode() { promptProperty_('TEACHER_PASSCODE', 'New teacher dashboard passcode (8+ characters):'); }
function setResetCode() { promptProperty_('RESET_CODE', 'New teacher reset code (must match the code you hash into js/config.js):'); }
function promptProperty_(prop, text) {
  var ui = SpreadsheetApp.getUi(), r = ui.prompt(text);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var v = String(r.getResponseText() || '').trim();
  if (v.length < 6) { ui.alert('Too short. Use at least 6 characters.'); return; }
  PropertiesService.getScriptProperties().setProperty(prop, v); ui.alert('Saved.');
}
function toast_(m) { try { SpreadsheetApp.getActive().toast(m, 'Unit 7 Gradebook', 8); } catch (e) { Logger.log(m); } }

/** onEdit: when you change "Review Status" in MASTER RESULTS (for example ACCEPT a duplicate), the block tab follows. */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet();
    if (sh.getName() !== TAB.master || e.range.getColumn() !== MC.review || e.range.getRow() < 2) return;
    var row = sh.getRange(e.range.getRow(), 1, 1, MASTER_HEADERS.length).getValues()[0];
    var blk = blockInfo_(row[MC.block - 1]); if (!blk) return;
    var tab = ss_().getSheetByName(blk.tab); if (!tab) return;
    var f = tab.getRange(2, MC.sid, Math.max(1, tab.getLastRow() - 1), 1).createTextFinder(String(row[MC.sid - 1])).matchEntireCell(true).findNext();
    if (f) tab.getRange(f.getRow(), MC.review).setValue(row[MC.review - 1]);
  } catch (err) { Logger.log(err); }
}

// ====================================================================================================== sheet builders
function ss_() {
  var a = SpreadsheetApp.getActive(); if (a) return a;
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  throw new Error('Open the script from inside your Google Sheet (Extensions > Apps Script), then run setupGradebook().');
}
function ensureSheet_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }
function sheet_(name) { var s = ss_().getSheetByName(name); if (!s) { setupGradebook(); s = ss_().getSheetByName(name); } return s; }
function colLetter_(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
function writeHeader_(sh, headers, color) {
  var r = sh.getRange(1, 1, 1, headers.length);
  r.setValues([headers]).setFontWeight('bold').setBackground(color).setFontColor('#ffffff').setWrap(true).setVerticalAlignment('middle');
  sh.setFrozenRows(1); sh.setRowHeight(1, 46);
}
function orderTabs_(ss) {
  var order = [TAB.master].concat(getBlocks_().map(function (b) { return b.tab; }), [TAB.items, TAB.analytics, TAB.grade, TAB.settings, TAB.sessions]);
  order.forEach(function (n, i) { var s = ss.getSheetByName(n); if (s) { ss.setActiveSheet(s); ss.moveActiveSheet(i + 1); } });
  ss.setActiveSheet(ss.getSheetByName(TAB.master));
  var s = ss.getSheetByName(TAB.sessions); if (s) { try { s.hideSheet(); } catch (e) { /* ignore */ } }
}

function buildSettings_(sh) {
  if (sh.getLastRow() < 3) {
    sh.getRange('A1').setValue('CLASS CODES (students must type one of these)').setFontWeight('bold');
    sh.getRange('A2:C2').setValues([['Class Code', 'Label (optional)', 'Active (TRUE/FALSE)']]).setFontWeight('bold').setBackground('#e8eef7');
    sh.getRange('A3:C' + (2 + DEFAULT_CODES.length)).setValues(DEFAULT_CODES.map(function (c) { return [c, 'Unit 7 (CHANGE ME)', true]; }));
    sh.getRange('E1').setValue('CLASS BLOCKS (names must match js/config.js)').setFontWeight('bold');
    sh.getRange('E2:F2').setValues([['Block name', 'Sheet tab']]).setFontWeight('bold').setBackground('#e8eef7');
    sh.getRange('E3:F' + (2 + DEFAULT_BLOCKS.length)).setValues(DEFAULT_BLOCKS.map(function (b) { return [b, defaultTab_(b)]; }));
    sh.getRange('H1').setValue('OPTIONS').setFontWeight('bold');
    sh.getRange('H2:I2').setValues([['Setting', 'Value']]).setFontWeight('bold').setBackground('#e8eef7');
    sh.getRange('H3:I6').setValues([['Strong understanding at (%)', 85], ['Developing at (%)', 70], ['Include DEMO DATA in CLASS ANALYTICS (YES/NO)', 'NO'], ['Assessment ID', DEFAULT_ASSESSMENT_ID]]);
    sh.setColumnWidths(1, 1, 150); sh.setColumnWidths(2, 1, 190); sh.setColumnWidths(3, 1, 150); sh.setColumnWidths(5, 1, 140); sh.setColumnWidths(6, 1, 140); sh.setColumnWidths(8, 1, 330); sh.setColumnWidths(9, 1, 220);
    sh.getRange('A9').setValue('Tip: add a row to CLASS CODES to add a code. Set Active to FALSE to turn one off. Block names must match js/config.js exactly.').setFontStyle('italic');
  }
  sh.getRange('I5').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['YES', 'NO'], true).build());
}
function defaultTab_(block) { return 'BLOCK ' + String(block).replace(/^Block\s*/i, '').replace('/', '-'); }
function getBlocks_() {
  var sh = ss_().getSheetByName(TAB.settings), out = [];
  if (sh && sh.getLastRow() >= 3) {
    var vals = sh.getRange(3, 5, Math.max(1, sh.getLastRow() - 2), 2).getValues();
    vals.forEach(function (r) { var n = norm_(r[0]); if (n) out.push({ name: n, tab: norm_(r[1]) || defaultTab_(n) }); });
  }
  if (!out.length) out = DEFAULT_BLOCKS.map(function (b) { return { name: b, tab: defaultTab_(b) }; });
  return out;
}
function blockInfo_(name) { var n = norm_(name).toLowerCase(), bs = getBlocks_(); for (var i = 0; i < bs.length; i++) if (bs[i].name.toLowerCase() === n) return bs[i]; return null; }
function getOption_(addr, dflt) { var sh = ss_().getSheetByName(TAB.settings); if (!sh) return dflt; var v = sh.getRange(addr).getValue(); return v === '' || v == null ? dflt : v; }

function formatMaster_(sh, isMaster) {
  var n = MASTER_HEADERS.length, rows = Math.max(sh.getMaxRows() - 1, 1);
  var widths = [150, 90, 120, 130, 90, 150, 100, 120, 140, 140, 80, 80, 80, 80, 90, 90, 90, 90, 90, 90, 90, 80, 80, 80, 80, 90, 150, 130, 160, 150, 120, 90, 160];
  widths.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(2, MC.ts, rows, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange(2, MC.start, rows, 2).setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange(2, MC.dur, rows, 1).setNumberFormat('0.0');
  sh.getRange(2, MC.pct, rows, 8).setNumberFormat('0.0%');
  if (sh.getFilter()) sh.getFilter().remove();
  sh.getRange(1, 1, Math.max(sh.getLastRow(), 2), n).createFilter();
  var pctCols = [MC.pct, MC.d0, MC.d0 + 1, MC.d0 + 2, MC.d0 + 3, MC.d0 + 4, MC.d0 + 5, MC.d0 + 6];
  var rules = [];
  var range = function (c) { return sh.getRange(2, c, rows, 1); };
  pctCols.forEach(function (c) {
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(0.85).setBackground('#cdeed6').setRanges([range(c)]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(0.7, 0.8499).setBackground('#fff2c2').setRanges([range(c)]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0.7).setBackground('#f8d0cc').setRanges([range(c)]).build());
  });
  var full = sh.getRange(2, 1, rows, n);
  rules.unshift(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=LEFT($' + colLetter_(MC.review) + '2,9)="DUPLICATE"').setBackground('#ffb4a8').setBold(true).setRanges([full]).build());
  rules.unshift(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$' + colLetter_(MC.type) + '2="DEMO DATA"').setBackground('#ffe0b2').setRanges([full]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=LEFT($' + colLetter_(MC.review) + '2,5)="RESET"').setFontColor('#999999').setRanges([full]).build());
  sh.setConditionalFormatRules(rules);
  if (isMaster) sh.getRange(2, MC.review, rows, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([REVIEW.ok, REVIEW.dupReview, REVIEW.dupAccepted, REVIEW.dupIgnored, REVIEW.reset], true).build());
}
function formatItems_(sh) {
  var rows = Math.max(sh.getMaxRows() - 1, 1);
  [150, 90, 130, 120, 110, 90, 90, 100, 150, 170, 110, 60, 80, 170, 70, 70, 70, 70, 130, 200, 200, 200, 80].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange(2, IC.ts, rows, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  if (sh.getFilter()) sh.getFilter().remove();
  sh.getRange(1, 1, Math.max(sh.getLastRow(), 2), ITEM_HEADERS.length).createFilter();
  var r = sh.getRange(2, IC.result, rows, 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenTextStartsWith('Zero').setBackground('#f8d0cc').setRanges([r]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains('attempt 1').setBackground('#cdeed6').setRanges([r]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains('attempt 2').setBackground('#fff2c2').setRanges([r]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenTextContains('attempt 3').setBackground('#ffe0b2').setRanges([r]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$B2="DEMO DATA"').setFontColor('#b45309').setRanges([sh.getRange(2, 1, rows, ITEM_HEADERS.length)]).build()
  ]);
}

/** CLASS ANALYTICS: live formulas. They recalculate by themselves; no script has to run. */
function buildAnalytics_(sh) {
  sh.clear();
  var M = function (c) { return "'" + TAB.master + "'!$" + colLetter_(c) + '$2:$' + colLetter_(c); };
  var I = function (c) { return "'" + TAB.items + "'!$" + colLetter_(c) + '$2:$' + colLetter_(c); };
  var blocks = getBlocks_().map(function (b) { return b.name; });
  var doms = typeof DOMAIN_ORDER !== 'undefined' ? DOMAIN_ORDER : [];
  var domNames = ['Nutrition Foundations', 'Nutrition Labels', 'Physical Activity/FITT', 'Marketing Literacy', 'SMART Goals', 'Food Systems', 'Integrated Decision-Making'];
  sh.getRange('A1').setValue('CLASS ANALYTICS (live formulas: counts only submitted, non-duplicate, non-reset attempts; DEMO DATA only if SETTINGS says YES)').setFontWeight('bold').setFontSize(12);
  var head = ['Class', 'Students submitted', 'Average %', 'Median %', 'Highest %', 'Lowest %', 'Avg time (min)', 'First-attempt accuracy', 'Mastery (>=85%)', 'Needs support (<70%)'].concat(domNames.map(function (d) { return d + ' %'; }));
  sh.getRange(3, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#143d2b').setFontColor('#ffffff').setWrap(true);
  var rows = ['All Classes'].concat(blocks), out = [];
  var qs = typeof KEY !== 'undefined';
  rows.forEach(function (name, i) {
    var r = 4 + i, all = i === 0, crit = all ? '' : ',' + M(MC.block) + ',$A' + r, cnt = M(MC.counts);
    var cntCrit = cnt + ',1' + crit;
    var firstAcc = '=IFERROR(SUMIFS(' + M(MC.f1) + ',' + cntCrit + ')/(COUNTIFS(' + cntCrit + ')*' + planSize_() + '),"")';
    var median = all ? '=IFERROR(MEDIAN(FILTER(' + M(MC.pct) + ',' + cnt + '=1)),"")' : '=IFERROR(MEDIAN(FILTER(' + M(MC.pct) + ',' + cnt + '=1,' + M(MC.block) + '=$A' + r + ')),"")';
    var line = [name,
      '=COUNTIFS(' + cntCrit + ')',
      '=IFERROR(AVERAGEIFS(' + M(MC.pct) + ',' + cntCrit + '),"")', median,
      '=IFERROR(MAXIFS(' + M(MC.pct) + ',' + cntCrit + '),"")', '=IFERROR(MINIFS(' + M(MC.pct) + ',' + cntCrit + '),"")',
      '=IFERROR(AVERAGEIFS(' + M(MC.dur) + ',' + cntCrit + '),"")', firstAcc,
      '=COUNTIFS(' + cntCrit + ',' + M(MC.pct) + ',">=0.85")', '=COUNTIFS(' + cntCrit + ',' + M(MC.pct) + ',"<0.7")'];
    for (var d = 0; d < 7; d++) line.push('=IFERROR(AVERAGEIFS(' + M(MC.d0 + d) + ',' + cntCrit + '),"")');
    out.push(line);
  });
  sh.getRange(4, 1, out.length, head.length).setFormulas(out);
  sh.getRange(4, 3, out.length, 4).setNumberFormat('0.0%'); sh.getRange(4, 7, out.length, 1).setNumberFormat('0.0'); sh.getRange(4, 8, out.length, 1).setNumberFormat('0.0%'); sh.getRange(4, 11, out.length, 7).setNumberFormat('0.0%');
  var dr = sh.getRange(4, 11, out.length, 7);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(0.85).setBackground('#cdeed6').setRanges([dr]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberBetween(0.7, 0.8499).setBackground('#fff2c2').setRanges([dr]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0.7).setBackground('#f8d0cc').setRanges([dr]).build()
  ]);
  // per-question summary (one row per logical item)
  var startRow = 4 + rows.length + 3;
  sh.getRange(startRow - 1, 1).setValue('QUESTION-LEVEL SUMMARY, all classes (live). Sort with Data > Sort range, or see the "Most missed" list below.').setFontWeight('bold');
  var qh = ['Item (slot)', 'Content domain', 'Concept', 'Question type', 'Responses', '% correct on 1st attempt', '% eventually correct', '% zero credit', 'Avg % of points', 'Avg attempts used'];
  sh.getRange(startRow, 1, 1, qh.length).setValues([qh]).setFontWeight('bold').setBackground('#4a2a6b').setFontColor('#ffffff').setWrap(true);
  var slots = {}, list = [];
  if (typeof KEY !== 'undefined') Object.keys(KEY).forEach(function (q) { var k = KEY[q]; if (!slots[k.sl]) { slots[k.sl] = true; list.push([k.sl, DOMAIN_NAMES[k.d], CONCEPT_NAMES[k.c] || k.c, k.qt]); } });
  var f = list.map(function (s, i) {
    var r = startRow + 1 + i, base = I(IC.slot) + ',$A' + r + ',' + I(IC.counts) + ',1';
    return s.concat(['=COUNTIFS(' + base + ')',
      '=IFERROR(COUNTIFS(' + base + ',' + I(IC.result) + ',"Correct (attempt 1)")/$E' + r + ',"")',
      '=IFERROR((COUNTIFS(' + base + ',' + I(IC.result) + ',"Correct (attempt 1)")+COUNTIFS(' + base + ',' + I(IC.result) + ',"Correct (attempt 2)")+COUNTIFS(' + base + ',' + I(IC.result) + ',"Correct (attempt 3)"))/$E' + r + ',"")',
      '=IFERROR(COUNTIFS(' + base + ',' + I(IC.result) + ',"Zero credit")/$E' + r + ',"")',
      '=IFERROR(SUMIFS(' + I(IC.earned) + ',' + base + ')/SUMIFS(' + I(IC.poss) + ',' + base + '),"")',
      '=IFERROR(AVERAGEIFS(' + I(IC.used) + ',' + base + '),"")']);
  });
  if (f.length) { sh.getRange(startRow + 1, 1, f.length, qh.length).setFormulas(f); sh.getRange(startRow + 1, 6, f.length, 4).setNumberFormat('0.0%'); sh.getRange(startRow + 1, 10, f.length, 1).setNumberFormat('0.00'); }
  // most-missed list
  var mm = startRow + f.length + 3;
  sh.getRange(mm - 1, 1).setValue('MOST MISSED QUESTIONS: lowest first-attempt accuracy first (top 12, live)').setFontWeight('bold');
  if (f.length) {
    sh.getRange(mm, 1).setFormula('=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER(A' + (startRow + 1) + ':J' + (startRow + f.length) + ',E' + (startRow + 1) + ':E' + (startRow + f.length) + '>0),6,TRUE),12,10),"No responses yet")');
    sh.getRange(mm, 6, 12, 4).setNumberFormat('0.0%');
  }
  sh.setFrozenRows(3); sh.setColumnWidth(1, 150); for (var c = 2; c <= 20; c++) sh.setColumnWidth(c, 110); sh.setColumnWidth(3, 190);
}
function planSize_() { var n = 0; (PLAN_UNITS || []).forEach(function (u) { n += u.p * u.a[0].length; }); return n || 53; }

function buildGradeExport_(sh) {
  sh.clear();
  var M = function (c) { return "'" + TAB.master + "'!$" + colLetter_(c) + '$2:$' + colLetter_(c); };
  sh.getRange('A1:D1').setValues([['Student Last Name', 'Student First Name', 'Block', 'Final Percentage']]).setFontWeight('bold').setBackground('#143d2b').setFontColor('#ffffff');
  sh.getRange('A2').setFormula('=IFERROR(ARRAY_CONSTRAIN(SORT(FILTER({' + M(MC.last) + ',' + M(MC.first) + ',' + M(MC.block) + ',' + M(MC.pct) + '},' + M(MC.counts) + '=1),3,TRUE,1,TRUE,2,TRUE),2000,4),"No submissions yet")');
  sh.getRange('D2:D2000').setNumberFormat('0.0%'); sh.setFrozenRows(1);
  [160, 160, 110, 120].forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });
  sh.getRange('F1').setValue('Live list of counted submissions, sorted by block then last name. File > Download > CSV for a gradebook import.').setFontStyle('italic');
}

// ====================================================================================================== helpers
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function norm_(s) { return String(s == null ? '' : s).trim().replace(/\s+/g, ' '); }
function nameKey_(first, last, block) { return norm_(first).toLowerCase() + '|' + norm_(last).toLowerCase() + '|' + norm_(block).toLowerCase(); }
function codeKey_(c) { return norm_(c).toUpperCase(); }
function sha256hex_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function ansHash_(qid, canon) { return sha256hex_(KEY_SALT + '|' + qid + '|' + canon).slice(0, 20); }
function round2_(x) { return Math.round(x * 100) / 100; }
function confirmId_(sid) { return 'U7-' + sha256hex_('confirm|' + sid).slice(0, 8).toUpperCase(); }
function okName_(s) { var n = norm_(s); return n.length >= 1 && n.length <= 60; }

function classLookup_(code) {
  var c = codeKey_(code), sh = sheet_(TAB.settings), n = Math.max(0, sh.getLastRow() - 2);
  var rows = n ? sh.getRange(3, 1, n, 3).getValues() : [];
  for (var i = 0; i < rows.length; i++) {
    if (codeKey_(rows[i][0]) === c && c) {
      var active = rows[i][2]; if (active === false || /^(false|no)$/i.test(String(active))) return { ok: false, error: 'invalid-code' };
      return { ok: true, label: String(rows[i][1] || '') };
    }
  }
  return { ok: false, error: 'invalid-code' };
}
function assessmentId_() { return String(getOption_(SET.assess, DEFAULT_ASSESSMENT_ID)); }

/** Session row finder: returns {sh,row,vals} for a session id. */
function findSession_(sid) {
  var sh = sheet_(TAB.sessions); if (sh.getLastRow() < 2) return null;
  var f = sh.getRange(2, SC.sid, sh.getLastRow() - 1, 1).createTextFinder(String(sid)).matchEntireCell(true).findNext();
  if (!f) return null;
  return { sh: sh, row: f.getRow(), vals: sh.getRange(f.getRow(), 1, 1, SESSION_HEADERS.length).getValues()[0] };
}
/** All non-demo session rows for a student key (most recent last). */
function sessionsFor_(key) {
  var sh = sheet_(TAB.sessions); if (sh.getLastRow() < 2) return [];
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, SESSION_HEADERS.length).getValues(), out = [];
  for (var i = 0; i < rows.length; i++) if (rows[i][SC.key - 1] === key && rows[i][SC.type - 1] !== REC.demo) out.push({ sh: sh, row: i + 2, vals: rows[i] });
  return out;
}
function latestStatus_(key) { var l = sessionsFor_(key); return l.length ? l[l.length - 1] : null; }

// ====================================================================================================== student actions
function validate_(b) {
  var cls = classLookup_(b.code); if (!cls.ok) return cls;
  if (!blockInfo_(b.block)) return { ok: false, error: 'invalid-block' };
  if (!okName_(b.first) || !okName_(b.last)) return { ok: false, error: 'invalid-name' };
  var l = latestStatus_(nameKey_(b.first, b.last, b.block));
  if (l) { if (l.vals[SC.status - 1] === 'completed') return { ok: false, error: 'already-completed' }; if (l.vals[SC.status - 1] === 'reset') return { ok: true, label: cls.label, reset: true }; }
  return { ok: true, label: cls.label };
}

function start_(b) {
  var s = b.student || {}, cls = classLookup_(s.code); if (!cls.ok) return cls;
  if (!blockInfo_(s.block) || !okName_(s.first) || !okName_(s.last)) return { ok: false, error: 'bad-request' };
  var sid = String(b.sid || ''); if (!sid) return { ok: false, error: 'bad-request' };
  if (findSession_(sid)) return { ok: true, resumed: true };
  var key = nameKey_(s.first, s.last, s.block), l = latestStatus_(key);
  if (l && l.vals[SC.status - 1] === 'completed') return { ok: false, error: 'already-completed' };
  sheet_(TAB.sessions).appendRow([sid, key, norm_(s.first), norm_(s.last), norm_(s.block), String(b.assessmentId || assessmentId_()), REC.live, b.versionId || '', b.seed || '', new Date(b.startedAt || Date.now()), new Date(), 'started', '{}', JSON.stringify(b.stageIds || []), '']);
  return { ok: true };
}

/** Server-grading mode: grade one attempt and count it here. Idempotent per (session, question, attempt number). */
function check_(b) {
  var se = findSession_(String(b.sid || '')); if (!se) return { ok: false, error: 'no-session' };
  if (se.vals[SC.status - 1] === 'completed') return { ok: false, error: 'already-completed' };
  var k = KEY[b.qid]; if (!k) return { ok: false, error: 'unknown-question' };
  var att = {}; try { att = JSON.parse(se.vals[SC.att - 1] || '{}'); } catch (e) { att = {}; }
  var list = att[b.qid] || [], n = Number(b.n);
  if (n >= 1 && n <= list.length) { var prev = list[n - 1]; return { ok: true, correct: !!prev.c, replay: true, explain: !prev.c && list.length >= 3 ? k.x : undefined }; }
  if (list.some(function (x) { return x.c; }) || list.length >= 3) return { ok: false, error: 'locked' };
  if (n !== list.length + 1) return { ok: false, error: 'out-of-order' };
  var resp = String(b.resp == null ? '' : b.resp).slice(0, 400);
  var correct = k.h.indexOf(ansHash_(b.qid, resp)) >= 0;
  list.push({ r: resp, c: correct, t: Date.now() }); att[b.qid] = list;
  se.sh.getRange(se.row, SC.seen).setValue(new Date()); se.sh.getRange(se.row, SC.att).setValue(JSON.stringify(att));
  return { ok: true, correct: correct, explain: !correct && list.length >= 3 ? k.x : undefined };
}

function status_(b) {
  var se = b.sid ? findSession_(String(b.sid)) : null;
  if (se && se.vals[SC.status - 1] === 'reset') return { ok: true, reset: true };
  if (!se && b.first) { var l = latestStatus_(nameKey_(b.first, b.last, b.block)); if (l && l.vals[SC.status - 1] === 'reset') return { ok: true, reset: true }; }
  return { ok: true, reset: false, status: se ? se.vals[SC.status - 1] : 'unknown' };
}

/**
 * Scores attempts [{q, n, c}] against KEY for the questions in the student's plan. Returns {rows, tot}.
 * Row: {qid, k, results:[{ok,resp,t}], hitN, earned, final}
 */
function score_(stageIds, attempts) {
  var plan = {}; (stageIds || []).forEach(function (s) { plan[s] = true; });
  var byQ = {}; (attempts || []).forEach(function (a) { if (a && KEY[a.q]) (byQ[a.q] = byQ[a.q] || []).push(a); });
  var rows = [];
  Object.keys(KEY).forEach(function (qid) {
    var k = KEY[qid]; if (!plan[k.s]) return;
    var list = (byQ[qid] || []).filter(function (a) { return a.n >= 1 && a.n <= 3; }).sort(function (x, y) { return x.n - y.n; });
    var seen = {}, results = [], hitN = 0;
    list.forEach(function (a) {
      if (seen[a.n] || hitN) return; seen[a.n] = true;
      var resp = String(a.c == null ? '' : a.c).slice(0, 400), ok = k.h.indexOf(ansHash_(qid, resp)) >= 0;
      results.push({ ok: ok, resp: resp, t: a.t }); if (ok) hitN = a.n;
    });
    rows.push({ qid: qid, k: k, results: results, hitN: hitN });
  });
  return assemble_(rows);
}
/** Adds earned/final text per row and totals. */
function assemble_(rows) {
  var tot = { earned: 0, possible: 0, first: 0, second: 0, third: 0, zero: 0, byDomain: {} };
  DOMAIN_ORDER.forEach(function (d) { tot.byDomain[d] = { e: 0, p: 0 }; });
  rows.forEach(function (r) {
    var p = r.k.p, e = 0, final;
    if (r.hitN) { e = round2_(p * CREDIT[r.hitN - 1]); final = 'Correct (attempt ' + r.hitN + ')'; if (r.hitN === 1) tot.first++; else if (r.hitN === 2) tot.second++; else tot.third++; }
    else { final = 'Zero credit'; tot.zero++; }
    r.earned = e; r.final = final;
    tot.earned += e; tot.possible += p; tot.byDomain[r.k.d].e += e; tot.byDomain[r.k.d].p += p;
  });
  tot.earned = round2_(tot.earned); tot.possible = round2_(tot.possible);
  return { tot: tot, rows: rows };
}

/**
 * Writes one submission to MASTER RESULTS, the block tab, ITEM ANALYSIS and SESSIONS.
 * rec: {sid, student, recordType, assessmentId, versionId, seed, startedAt, completedAt, activeMs, sc, integrity, choices, review, dupOf}
 */
function writeSubmission_(rec) {
  var sc = rec.sc, t = sc.tot, st = rec.student, now = new Date(), conf = confirmId_(rec.sid);
  var started = new Date(rec.startedAt || now), done = new Date(rec.completedAt || now);
  var dur = Math.round((Number(rec.activeMs) || (done - started)) / 600) / 100;
  var doms = DOMAIN_ORDER.map(function (d) { var x = t.byDomain[d]; return x.p ? Math.round(x.e / x.p * 1000) / 1000 : ''; });
  var review = rec.review || REVIEW.ok;
  var counts = (review === REVIEW.ok || review === REVIEW.dupAccepted) && (rec.recordType === REC.live || String(getOption_(SET.includeDemo, 'NO')).toUpperCase() === 'YES') ? 1 : 0;
  var row = [now, rec.recordType, norm_(st.first), norm_(st.last), norm_(st.block), rec.assessmentId, rec.versionId || '', rec.seed || '', started, done, dur, t.earned, t.possible, t.possible ? Math.round(t.earned / t.possible * 1000) / 1000 : 0]
    .concat(doms, [t.first, t.second, t.third, t.zero, 'Submitted', review, rec.dupOf || '', rec.integrity || 'OK', rec.sid, conf, counts, JSON.stringify(rec.choices || {})]);
  var master = sheet_(TAB.master), r0 = master.getLastRow() + 1;
  master.getRange(r0, 1, 1, row.length).setValues([row]);
  master.getRange(r0, MC.counts).setFormula(countsFormula_(r0));
  var blk = blockInfo_(st.block);
  if (blk) { var bs = sheet_(blk.tab); bs.getRange(bs.getLastRow() + 1, 1, 1, row.length).setValues([row]); }
  var irows = sc.rows.map(function (r) {
    var cell = function (i) { return r.results[i] ? r.results[i].resp : ''; };
    return [now, rec.recordType, rec.sid, norm_(st.last), norm_(st.first), norm_(st.block), r.qid, r.k.sl, DOMAIN_NAMES[r.k.d], CONCEPT_NAMES[r.k.c] || r.k.c, r.k.k || '', r.k.df, r.k.y, r.k.qt, r.k.mj, r.k.p, r.earned, r.results.length, r.final, cell(0), cell(1), cell(2), ''];
  });
  if (irows.length) {
    var is = sheet_(TAB.items), i0 = is.getLastRow() + 1;
    is.getRange(i0, 1, irows.length, ITEM_HEADERS.length).setValues(irows);
    is.getRange(i0, IC.counts, irows.length, 1).setFormulas(irows.map(function (_, i) { return ['=IFERROR(INDEX(\'' + TAB.master + '\'!$' + colLetter_(MC.counts) + ':$' + colLetter_(MC.counts) + ',MATCH($C' + (i0 + i) + ',\'' + TAB.master + '\'!$' + colLetter_(MC.sid) + ':$' + colLetter_(MC.sid) + ',0)),0)']; }));
  }
  var se = findSession_(rec.sid), key = nameKey_(st.first, st.last, st.block);
  if (se) { se.sh.getRange(se.row, SC.seen).setValue(now); se.sh.getRange(se.row, SC.status).setValue('completed'); se.sh.getRange(se.row, SC.conf).setValue(conf); }
  else sheet_(TAB.sessions).appendRow([rec.sid, key, norm_(st.first), norm_(st.last), norm_(st.block), rec.assessmentId, rec.recordType, rec.versionId || '', rec.seed || '', started, now, 'completed', '{}', '[]', conf]);
  return { conf: conf, counts: counts };
}
function countsFormula_(r) {
  var L = function (c) { return '$' + colLetter_(c) + r; };
  return '=IF(AND(' + L(MC.status) + '="Submitted",OR(' + L(MC.review) + '="' + REVIEW.ok + '",' + L(MC.review) + '="' + REVIEW.dupAccepted + '"),OR(' + L(MC.type) + '="' + REC.live + '",SETTINGS!$I$5="YES")),1,0)';
}

function submit_(b, asTest) {
  var s = b.student || {}, cls = classLookup_(s.code); if (!cls.ok && !asTest) return cls;
  if (!blockInfo_(s.block)) return { ok: false, error: 'invalid-block' };
  if (!okName_(s.first) || !okName_(s.last)) return { ok: false, error: 'invalid-name' };
  var sid = String(b.sid || ''); if (!sid || sid.length > 60) return { ok: false, error: 'bad-request' };
  var key = nameKey_(s.first, s.last, s.block), se = findSession_(sid);
  if (se && se.vals[SC.status - 1] === 'completed') return { ok: true, confirmationId: se.vals[SC.conf - 1] || confirmId_(sid), duplicate: true };
  // duplicate check: same first + last + block + assessment already counted?
  var assess = String(b.assessmentId || assessmentId_()), dupOf = '';
  if (!asTest) {
    var existing = sheet_(TAB.master), n = Math.max(0, existing.getLastRow() - 1);
    var rows = n ? existing.getRange(2, 1, n, MASTER_HEADERS.length).getValues() : [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r[MC.type - 1] === REC.live && nameKey_(r[MC.first - 1], r[MC.last - 1], r[MC.block - 1]) === key && String(r[MC.assess - 1]) === assess && r[MC.review - 1] !== REVIEW.reset && r[MC.review - 1] !== REVIEW.dupIgnored && r[MC.sid - 1] !== sid) { dupOf = r[MC.sid - 1]; break; }
    }
  }
  var attempts = Array.isArray(b.attempts) ? b.attempts.slice(0, 400) : [];
  if (se) { var att = {}; try { att = JSON.parse(se.vals[SC.att - 1] || '{}'); } catch (e) { att = {}; } var srv = []; Object.keys(att).forEach(function (q) { att[q].forEach(function (x, i) { srv.push({ q: q, n: i + 1, c: x.r, t: x.t }); }); }); if (srv.length) attempts = srv; }
  var stageIds = Array.isArray(b.stageIds) ? b.stageIds : (se ? JSON.parse(se.vals[SC.stages - 1] || '[]') : []);
  var sc = score_(stageIds, attempts), t = sc.tot;
  var mismatch = b.clientScore && Math.abs(Number(b.clientScore.earned) - t.earned) > 0.01;
  var flags = []; if (b.tamper) flags.push('Local data modified'); if (mismatch) flags.push('Client/server score mismatch'); if (t.possible !== 100) flags.push('Points possible = ' + t.possible);
  var wr = writeSubmission_({ sid: sid, student: s, recordType: asTest ? REC.demo : REC.live, assessmentId: assess, versionId: b.versionId, seed: b.seed, startedAt: b.startedAt, completedAt: b.completedAt, activeMs: b.activeMs, sc: sc, integrity: flags.length ? flags.join('; ') : 'OK', choices: b.choices, review: dupOf ? REVIEW.dupReview : REVIEW.ok, dupOf: dupOf });
  return { ok: true, confirmationId: wr.conf, score: { earned: t.earned, possible: t.possible }, mismatch: !!mismatch, duplicateFlag: !!dupOf };
}

// ====================================================================================================== teacher actions
function teacher_(b, fn) {
  var cache = CacheService.getScriptCache(), fails = Number(cache.get('tfail') || 0);
  if (fails >= 8) return { ok: false, error: 'locked-out' };
  var real = PropertiesService.getScriptProperties().getProperty('TEACHER_PASSCODE');
  if (!real || String(b.pass) !== real) { cache.put('tfail', String(fails + 1), 600); return { ok: false, error: 'bad-passcode' }; }
  cache.remove('tfail'); return fn(b);
}
function resetStudentByCode_(b) {
  var real = PropertiesService.getScriptProperties().getProperty('RESET_CODE');
  if (!real) return { ok: false, error: 'reset-code-not-set-on-server' };
  var cache = CacheService.getScriptCache(), fails = Number(cache.get('rfail') || 0);
  if (fails >= 8) return { ok: false, error: 'locked-out' };
  if (String(b.resetCode) !== real) { cache.put('rfail', String(fails + 1), 600); return { ok: false, error: 'bad-reset-code' }; }
  return resetStudent_(b.first, b.last, b.block, null);
}
/** Marks a student's earlier submission(s) superseded so they can retake. Old rows are kept and greyed out. */
function resetStudent_(first, last, block, sid) {
  var key;
  if (sid) { var se = findSession_(String(sid)); if (!se) return { ok: false, error: 'not-found' }; key = se.vals[SC.key - 1]; }
  else key = nameKey_(first, last, block);
  var n = 0;
  sessionsFor_(key).forEach(function (s) { if (s.vals[SC.status - 1] !== 'reset') { s.sh.getRange(s.row, SC.status).setValue('reset'); s.sh.getRange(s.row, SC.seen).setValue(new Date()); n++; } });
  var tabs = [TAB.master].concat(getBlocks_().map(function (x) { return x.tab; }));
  tabs.forEach(function (name) {
    var sh = ss_().getSheetByName(name); if (!sh || sh.getLastRow() < 2) return;
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, MASTER_HEADERS.length).getValues();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i][MC.type - 1] === REC.live && nameKey_(rows[i][MC.first - 1], rows[i][MC.last - 1], rows[i][MC.block - 1]) === key) { sh.getRange(i + 2, MC.review).setValue(REVIEW.reset); if (name !== TAB.master) sh.getRange(i + 2, MC.counts).setValue(0); }
    }
  });
  return { ok: true, reset: n };
}
function setReview_(sid, status) {
  var allowed = [REVIEW.ok, REVIEW.dupAccepted, REVIEW.dupIgnored, REVIEW.dupReview];
  if (allowed.indexOf(status) < 0) return { ok: false, error: 'bad-status' };
  var done = 0;
  [TAB.master].concat(getBlocks_().map(function (x) { return x.tab; })).forEach(function (name) {
    var sh = ss_().getSheetByName(name); if (!sh || sh.getLastRow() < 2) return;
    var f = sh.getRange(2, MC.sid, sh.getLastRow() - 1, 1).createTextFinder(String(sid)).matchEntireCell(true).findNext();
    if (f) { sh.getRange(f.getRow(), MC.review).setValue(status); if (name !== TAB.master) sh.getRange(f.getRow(), MC.counts).setValue(status === REVIEW.ok || status === REVIEW.dupAccepted ? 1 : 0); done++; }
  });
  return { ok: done > 0, updated: done };
}

/** Everything the teacher dashboard needs (it computes all statistics itself, so nothing is hard-coded). */
function dashboardData_() {
  var sh = sheet_(TAB.master), n = Math.max(0, sh.getLastRow() - 1);
  var rows = n ? sh.getRange(2, 1, n, MASTER_HEADERS.length).getValues() : [];
  var includeDemo = String(getOption_(SET.includeDemo, 'NO')).toUpperCase() === 'YES';
  var students = rows.map(function (r) {
    var review = r[MC.review - 1], counted = (review === REVIEW.ok || review === REVIEW.dupAccepted) && (r[MC.type - 1] === REC.live || includeDemo);
    var d = []; for (var i = 0; i < 7; i++) { var v = r[MC.d0 - 1 + i]; d.push(v === '' ? null : Math.round(Number(v) * 1000) / 10); }
    return { ts: r[0], type: r[MC.type - 1], first: r[MC.first - 1], last: r[MC.last - 1], block: r[MC.block - 1], assess: r[MC.assess - 1], version: r[MC.version - 1], seed: r[MC.seed - 1], start: r[MC.start - 1], sub: r[MC.sub - 1],
      min: Number(r[MC.dur - 1]), raw: r[MC.raw - 1], poss: r[MC.poss - 1], pct: Math.round(Number(r[MC.pct - 1]) * 1000) / 10, dom: d, f1: r[MC.f1 - 1], f2: r[MC.f2 - 1], f3: r[MC.f3 - 1], zero: r[MC.zero - 1],
      status: r[MC.status - 1], review: review, dupOf: r[MC.dupOf - 1], integ: r[MC.integ - 1], sid: r[MC.sid - 1], conf: r[MC.conf - 1], counted: counted ? 1 : 0, choices: r[MC.choices - 1] };
  });
  var is = sheet_(TAB.items), m = Math.max(0, is.getLastRow() - 1);
  var irows = m ? is.getRange(2, 1, m, ITEM_HEADERS.length).getValues() : [];
  var items = irows.map(function (r) { return [r[IC.sid - 1], r[IC.qid - 1], r[IC.used - 1], r[IC.earned - 1], r[IC.poss - 1], r[IC.result - 1], r[IC.a1 - 1], r[IC.a2 - 1], r[IC.a3 - 1]]; });
  var meta = {};
  Object.keys(KEY).forEach(function (q) { var k = KEY[q]; meta[q] = { sl: k.sl, d: k.d, c: k.c, cn: CONCEPT_NAMES[k.c] || k.c, k: k.k, df: k.df, y: k.y, qt: k.qt, p: k.p, mj: k.mj, x: k.x, a: k.a }; });
  return { ok: true, students: students, items: items, meta: meta, domainNames: DOMAIN_NAMES, domainOrder: DOMAIN_ORDER, blocks: getBlocks_().map(function (b) { return b.name; }),
    options: { strongAt: Number(getOption_(SET.strong, 85)), developingAt: Number(getOption_(SET.dev, 70)), includeDemo: includeDemo }, serverTime: new Date() };
}

// ====================================================================================================== DEMO DATA
var DEMO_FIRST = ['Avery', 'Jordan', 'Riley', 'Sam', 'Taylor', 'Morgan', 'Casey', 'Devon', 'Priya', 'Mateo', 'Amara', 'Luis', 'Mei', 'Noah', 'Zara', 'Kofi', 'Elena', 'Omar', 'Ines', 'Tariq', 'Hana', 'Diego', 'Quinn', 'Rowan', 'Sasha', 'Leilani', 'Emeka', 'Ravi'];
var DEMO_LAST = ['Quill', 'Marsh', 'Okafor', 'Lindqvist', 'Reyes', 'Tanaka', 'Brightwater', 'Castellanos', 'Nguyen', 'Abernathy', 'Petrov', 'Halloran', 'Mbeki', 'Fontaine', 'Sorensen', 'Alvarado', 'Whitlock', 'Desai', 'Kowalski', 'Ferreira', 'Bellamy', 'Ishikawa', 'Montague', 'Oyelaran', 'Delacroix', 'Hartwell', 'Vasquez', 'Pemberton'];
// Intentional strengths and weaknesses so the dashboard has something realistic to show.
var DEMO_CONCEPT_BIAS = { 'pct-dv': -1.1, 'resilience-efficiency': -0.8, 'causal-chain': -0.7, 'plan-build': -0.5, 'dual-column': -0.4, 'emerging-tech': -0.4, 'smart-components': 0.7, 'goal-repair': 0.5, 'myplate-build': 0.5, 'macro-roles': 0.4, 'pqvd': 0.4 };
var DEMO_BLOCK_BIAS = { 'Block 1/2': { labels: -0.1 }, 'Block 3/4': { labels: -0.5, marketing: 0.15 }, 'Block 6/7': { systems: -0.55, goals: 0.2 }, 'Block 8/9': { activity: 0.35, found: 0.2 } };
function seeded_(seed) { var a = seed >>> 0; return function () { a = (a + 0x6d2b79f5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gauss_(r) { var u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function sig_(x) { return 1 / (1 + Math.exp(-x)); }

function generateDemoData_(count) {
  var blocks = getBlocks_().map(function (b) { return b.name; }), r = seeded_(Date.now() % 100000);
  var per = []; for (var i = 0; i < count; i++) per.push(blocks[Math.min(blocks.length - 1, Math.floor(i * blocks.length / count))]);
  var created = 0, base = Date.now() - 6 * 86400000;
  for (var s = 0; s < count; s++) {
    var block = per[s], theta = gauss_(r) * 0.85 + (s % 9 === 0 ? -0.9 : 0) + (s % 11 === 0 ? 0.6 : 0);
    var ids = []; PLAN_UNITS.forEach(function (u) { var pool = u.a.slice(), pick = []; for (var k = 0; k < u.p; k++) { var j = Math.floor(r() * pool.length); pick.push(pool.splice(j, 1)[0]); } pick.forEach(function (a) { a.forEach(function (q) { ids.push(q); }); }); });
    var rows = [], stageIds = [];
    ids.forEach(function (qid) {
      var k = KEY[qid], z = 0.6 + theta + (DEMO_CONCEPT_BIAS[k.c] || 0) + ((DEMO_BLOCK_BIAS[block] || {})[k.d] || 0) - (k.df - 2) * 0.55 + gauss_(r) * 0.45;
      var t1 = sig_(1.5 * z + 0.3), t2 = t1 + (1 - t1) * 0.55 * sig_(z + 1), t3 = t2 + (1 - t2) * 0.5 * sig_(z + 0.8), u = r(), hit = u < t1 ? 1 : u < t2 ? 2 : u < t3 ? 3 : 0;
      var results = [], nWrong = hit ? hit - 1 : 3;
      for (var w = 0; w < nWrong; w++) results.push({ ok: false, resp: demoWrong_(k, qid, r), t: 0 });
      if (hit) results.push({ ok: true, resp: '(correct)', t: 0 });
      rows.push({ qid: qid, k: k, results: results, hitN: hit });
      if (stageIds.indexOf(k.s) < 0) stageIds.push(k.s);
    });
    var sc = assemble_(rows), pct = sc.tot.possible ? sc.tot.earned / sc.tot.possible : 0;
    var minutes = Math.max(33, Math.min(78, Math.round(52 - theta * 4 + gauss_(r) * 6)));
    var start = base + Math.floor(r() * 5 * 86400000), sid = 'DEMO-' + sha256hex_('demo' + s + Date.now() + r()).slice(0, 10).toUpperCase();
    var student = { first: '[DEMO] ' + DEMO_FIRST[s % DEMO_FIRST.length], last: DEMO_LAST[(s * 7) % DEMO_LAST.length], block: block };
    writeSubmission_({ sid: sid, student: student, recordType: REC.demo, assessmentId: assessmentId_(), versionId: 'V-DEMO' + (s % 9), seed: 'demo' + s, startedAt: start, completedAt: start + minutes * 60000, activeMs: minutes * 60000, sc: sc, integrity: 'DEMO DATA', choices: { focus: r() < 0.5 ? 'fuel' : 'move' }, review: REVIEW.ok });
    created++;
  }
  return { ok: true, created: created };
}
function demoWrong_(k, qid, r) { if (k.o && k.o.length) { var wrong = k.o.filter(function (x) { return k.h.indexOf(ansHash_(qid, x)) < 0; }); if (wrong.length) return wrong[Math.floor(r() * wrong.length)]; } return 'demo-incorrect-' + Math.floor(r() * 3); }

/** Removes ONLY rows whose Record Type is DEMO DATA, from every tab. Real submissions are never touched. */
function deleteDemoData_() {
  var deleted = 0, tabs = [TAB.master].concat(getBlocks_().map(function (b) { return b.tab; })), ss = ss_();
  var jobs = tabs.map(function (n) { return [n, MC.type]; }).concat([[TAB.items, IC.type], [TAB.sessions, SC.type]]);
  jobs.forEach(function (j) {
    var sh = ss.getSheetByName(j[0]); if (!sh || sh.getLastRow() < 2) return;
    var vals = sh.getRange(2, j[1], sh.getLastRow() - 1, 1).getValues(), rowsToDel = [];
    for (var i = 0; i < vals.length; i++) if (vals[i][0] === REC.demo) rowsToDel.push(i + 2);
    if (j[0] === TAB.master) deleted = rowsToDel.length;
    // delete contiguous groups from the bottom up
    var gi = rowsToDel.length - 1;
    while (gi >= 0) { var end = rowsToDel[gi], start = end; while (gi > 0 && rowsToDel[gi - 1] === start - 1) { gi--; start = rowsToDel[gi]; } sh.deleteRows(start, end - start + 1); gi--; }
  });
  return { ok: true, deleted: deleted };
}

// ====================================================================================================== self test
/** Setup step 6: writes one TEST submission (saved as DEMO DATA) so you can see the pipeline work. Delete it from the menu afterwards. */
function sampleSubmission() {
  setupGradebook();
  var stageIds = []; PLAN_UNITS.forEach(function (u) { u.a[0].forEach(function (q) { if (stageIds.indexOf(KEY[q].s) < 0) stageIds.push(KEY[q].s); }); });
  var res = submit_({ sid: 'S-TEST' + Math.floor(Math.random() * 1e6), student: { first: 'Sample', last: 'Student', block: getBlocks_()[0].name, code: 'TEST' }, assessmentId: assessmentId_(), versionId: 'V-TEST', seed: 'test', startedAt: Date.now() - 3000000, completedAt: Date.now(), activeMs: 2900000, stageIds: stageIds, attempts: [], clientScore: { earned: 0, possible: 100 } }, true);
  Logger.log(JSON.stringify(res)); toast_('Test row written (DEMO DATA). Result: ' + JSON.stringify(res));
  return res;
}
