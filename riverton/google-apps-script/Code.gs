/**
 * Riverton class sync (optional). Paste into Extensions > Apps Script in a Google Sheet owned by the teacher's SCHOOL account.
 * Setup: see SETUP.md. Deploy as a Web App (Execute as: Me, Who has access: Anyone) and set CLASS_CODE in Script Properties.
 * The web app URL and class code are entered in Riverton's Teacher Mode and travel inside the assignment preset; they are never in the public repo.
 */
var TABS = {
  Roster: ['student', 'period', 'first_seen', 'last_seen'],
  Events: ['id', 'timestamp', 'student', 'period', 'module', 'item', 'concept', 'type', 'correct', 'attempts', 'hint_used', 'prediction', 'chosen'],
  Written: ['id', 'timestamp', 'student', 'period', 'module', 'kind', 'item', 'text', 'teacher_score'],
  Progress: ['key', 'student', 'period', 'module', 'completed', 'minutes', 'mastery_pct_by_concept', 'updated'],
  Gradebook: ['student', 'period', 'accuracy', 'checks_answered', 'modules_with_progress', 'written_responses', 'avg_teacher_score']
};
var ID_SHEET = '_ids';
var MAX_ITEMS = 200;

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function secret_() { return PropertiesService.getScriptProperties().getProperty('CLASS_CODE'); }

function ensureTabs_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABS).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) { sh = ss.insertSheet(name); sh.appendRow(TABS[name]); sh.setFrozenRows(1); }
  });
  if (!ss.getSheetByName(ID_SHEET)) { var h = ss.insertSheet(ID_SHEET); h.appendRow(['id']); }
  buildGradebook_(ss.getSheetByName('Gradebook'));
  return ss;
}

/** Gradebook is formulas only: it reads Roster, Events, Written and Progress, and pulls in the teacher's rubric scores from Written. */
function buildGradebook_(sh) {
  if (sh.getLastRow() > 1) return;
  for (var r = 2; r <= 201; r++) {
    sh.getRange(r, 1, 1, 7).setFormulas([[
      '=IF(Roster!A' + r + '="","",Roster!A' + r + ')',
      '=IF(A' + r + '="","",Roster!B' + r + ')',
      '=IF(A' + r + '="","",IFERROR(COUNTIFS(Events!C:C,A' + r + ',Events!I:I,TRUE)/COUNTIFS(Events!C:C,A' + r + ',Events!I:I,"<>"),""))',
      '=IF(A' + r + '="","",COUNTIFS(Events!C:C,A' + r + '))',
      '=IF(A' + r + '="","",COUNTIFS(Progress!B:B,A' + r + '))',
      '=IF(A' + r + '="","",COUNTIFS(Written!C:C,A' + r + '))',
      '=IF(A' + r + '="","",IFERROR(AVERAGEIFS(Written!I:I,Written!C:C,A' + r + ',Written!I:I,"<>"),""))'
    ]]);
  }
}

function str_(v, max) { return typeof v === 'string' ? v.slice(0, max || 2000) : (v === undefined || v === null ? '' : String(v).slice(0, max || 2000)); }

function validItem_(it) {
  if (!it || typeof it !== 'object' || typeof it.kind !== 'string') return false;
  if (it.kind === 'event') return typeof it.id === 'string' && !!it.module && !!it.item;
  if (it.kind === 'written') return typeof it.id === 'string' && typeof it.text === 'string';
  if (it.kind === 'progress') return !!it.module;
  return false;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var body;
    try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
    var code = secret_();
    if (!code || !body || body.code !== code) return json_({ ok: false, error: 'bad class code' });
    if (body.test) return json_({ ok: true, test: true });
    if (!body.student || typeof body.student.name !== 'string' || !body.student.name) return json_({ ok: false, error: 'missing student' });
    if (!Array.isArray(body.items) || body.items.length > MAX_ITEMS) return json_({ ok: false, error: 'bad items' });

    var ss = ensureTabs_();
    var name = str_(body.student.name, 80), period = str_(body.student.period, 20), now = new Date();
    var idSheet = ss.getSheetByName(ID_SHEET), seen = {}, last = idSheet.getLastRow();
    if (last > 1) idSheet.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { seen[r[0]] = true; });

    var accepted = [], events = [], written = [], newIds = [];
    body.items.forEach(function (it) {
      if (!validItem_(it)) return;
      if (it.kind === 'progress') { upsertProgress_(ss.getSheetByName('Progress'), name, period, it, now); accepted.push(it.id || ('progress:' + it.module)); return; }
      if (seen[it.id]) { accepted.push(it.id); return; } // duplicate from a retry: acknowledge, do not append
      seen[it.id] = true; newIds.push([it.id]); accepted.push(it.id);
      if (it.kind === 'event') events.push([it.id, new Date(it.t || now), name, period, str_(it.module, 30), str_(it.item, 80), str_(it.concept, 60), str_(it.type, 20), it.correct === null || it.correct === undefined ? '' : !!it.correct, Number(it.attempts) || 1, !!it.hint, str_(it.prediction, 600), str_(it.chosen, 80)]);
      else written.push([it.id, new Date(it.t || now), name, period, str_(it.module, 30), str_(it.wkind, 20), str_(it.item, 80), str_(it.text, 8000), '']);
    });
    appendRows_(ss.getSheetByName('Events'), events);
    appendRows_(ss.getSheetByName('Written'), written);
    appendRows_(idSheet, newIds);
    upsertRoster_(ss.getSheetByName('Roster'), name, period, now);
    return json_({ ok: true, accepted: accepted });
  } finally {
    lock.releaseLock();
  }
}

function appendRows_(sh, rows) {
  if (!rows.length) return;
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}
function upsertRoster_(sh, name, period, now) {
  var last = sh.getLastRow();
  if (last > 1) {
    var vals = sh.getRange(2, 1, last - 1, 4).getValues();
    for (var i = 0; i < vals.length; i++) if (vals[i][0] === name && String(vals[i][1]) === String(period)) { sh.getRange(i + 2, 4).setValue(now); return; }
  }
  sh.appendRow([name, period, now, now]);
}
function upsertProgress_(sh, name, period, it, now) {
  var key = name + '|' + period + '|' + it.module;
  var row = [key, name, period, str_(it.module, 30), (it.completed || []).join(', '), Number(it.minutes) || 0, JSON.stringify(it.mastery || {}).slice(0, 4000), now];
  var last = sh.getLastRow();
  if (last > 1) {
    var keys = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) if (keys[i][0] === key) { sh.getRange(i + 2, 1, 1, row.length).setValues([row]); return; }
  }
  sh.appendRow(row);
}

/** Optional: Riverton's class roll-up can load results from here. Requires ?code=CLASS_CODE&action=rollup. */
function doGet(e) {
  var code = secret_();
  if (!code || !e || !e.parameter || e.parameter.code !== code) return json_({ ok: false, error: 'bad class code' });
  if (e.parameter.action !== 'rollup') return json_({ ok: true, hello: 'riverton' });
  var ss = ensureTabs_(), out = { ok: true };
  ['Events', 'Written', 'Progress', 'Roster'].forEach(function (n) {
    var sh = ss.getSheetByName(n), last = sh.getLastRow(), head = TABS[n];
    out[n.toLowerCase()] = last > 1 ? sh.getRange(2, 1, last - 1, head.length).getValues().map(function (r) { var o = {}; head.forEach(function (h, i) { o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; }); return o; }) : [];
  });
  return json_(out);
}
