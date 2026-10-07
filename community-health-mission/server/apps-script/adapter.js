// =====================================================================================================
// Google Apps Script adapter: Google Sheets store + web-app entry points + teacher menu.
// This file is concatenated (by tools/build.js) AFTER content, grading.js and core.js into Code.gs.
// =====================================================================================================

var CHM_SHEETS = {
  classes: ['Code', 'Name', 'Section', 'Version', 'Status', 'OpensAt', 'ClosesAt', 'RequireRoster', 'RevealMode', 'PacingFactor'],
  roster: ['ClassCode', 'RosterID', 'Name', 'AccessToken'],
  sessions: ['SessionId', 'Class', 'Section', 'RosterID', 'Name', 'Period', 'Version', 'Status', 'Started', 'LastSaved', 'Completed', 'ElapsedMin', 'Earned', 'Possible', 'Percent', 'FirstTryAccuracyPct', 'UnitsCompleted', 'Gradebook', 'Receipt', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'],
  responses: ['SessionId', 'Class', 'Section', 'RosterID', 'Version', 'TaskId', 'Module', 'Concept', 'Attempt', 'Response', 'AcceptedAt', 'Correct', 'Earned', 'Possible', 'RequestId'],
  resetAudit: ['At', 'Action', 'SessionId', 'Class', 'RosterID', 'PreviousStatus', 'Reason', 'Version', 'By'],
  state: ['SessionId', 'Class', 'RosterID', 'Version', 'Status', 'UpdatedAt', 'Json'],
  deliveryTest: ['At', 'TestId', 'Note']
};

function chmSafeCell_(v) {            // formula-injection guard for student-entered text
  if (typeof v !== 'string') return v;
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}

function chmSheetStore_(ss) {
  var cache = CacheService.getScriptCache();
  var store = {
    engine: null, after: [],
    sheet: function (name, header, hidden) {
      var sh = ss.getSheetByName(name);
      if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold'); sh.setFrozenRows(1); if (hidden) sh.hideSheet(); }
      return sh;
    },
    withLock: function (fn) {
      var lock = LockService.getScriptLock();
      if (!lock.tryLock(20000)) throw new Error('BUSY');
      var r;
      try { r = fn(); } finally { lock.releaseLock(); }
      var q = store.after; store.after = [];
      q.forEach(function (f) { try { f(); } catch (e) { /* derived views are rebuilt on next save */ } });
      return r;
    },
    // ---- classes / roster
    listClasses: function () {
      var sh = this.sheet('Classes', CHM_SHEETS.classes), n = sh.getLastRow();
      if (n < 2) return [];
      return sh.getRange(2, 1, n - 1, CHM_SHEETS.classes.length).getValues().filter(function (r) { return r[0]; }).map(function (r) {
        return { code: String(r[0]).toUpperCase().replace(/\s+/g, ''), name: String(r[1]), section: String(r[2]), version: String(r[3]), status: String(r[4] || 'open').toLowerCase(),
          opensAt: r[5] ? new Date(r[5]).toISOString() : '', closesAt: r[6] ? new Date(r[6]).toISOString() : '', requireRoster: String(r[7]).toLowerCase() === 'true' || r[7] === true,
          revealMode: String(r[8] || 'final'), pacingFactor: Number(r[9]) || 1 };
      });
    },
    getClass: function (code) { var l = this.listClasses().filter(function (c) { return c.code === code; }); return l[0] || null; },
    saveClass: function (c) {
      var sh = this.sheet('Classes', CHM_SHEETS.classes), n = sh.getLastRow(), row = [c.code, c.name, c.section, c.version, c.status, c.opensAt, c.closesAt, c.requireRoster, c.revealMode, c.pacingFactor];
      for (var i = 2; i <= n; i++) if (String(sh.getRange(i, 1).getValue()).toUpperCase().replace(/\s+/g, '') === c.code) { sh.getRange(i, 1, 1, row.length).setValues([row]); return; }
      sh.appendRow(row);
    },
    getRoster: function (code, rosterId) {
      var sh = this.sheet('Roster', CHM_SHEETS.roster), n = sh.getLastRow();
      if (n < 2) return null;
      var rows = sh.getRange(2, 1, n - 1, 4).getValues();
      for (var i = 0; i < rows.length; i++) if (String(rows[i][0]).toUpperCase().replace(/\s+/g, '') === code && String(rows[i][1]).toLowerCase() === rosterId.toLowerCase()) return { accessToken: String(rows[i][3]) };
      return null;
    },
    // ---- session state (authoritative) in hidden _State sheet
    stateRow_: function (id) {
      var sh = this.sheet('_State', CHM_SHEETS.state, true), hint = cache.get('row:' + id);
      if (hint) { var r = Number(hint); if (r >= 2 && r <= sh.getLastRow() && sh.getRange(r, 1).getValue() === id) return r; }
      if (sh.getLastRow() < 2) return 0;
      var f = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
      if (!f) return 0;
      cache.put('row:' + id, String(f.getRow()), 21600);
      return f.getRow();
    },
    getSession: function (id) {
      var r = this.stateRow_(id); if (!r) return null;
      var sh = this.sheet('_State', CHM_SHEETS.state, true);
      var json = sh.getRange(r, 7).getValue();
      return json ? JSON.parse(json) : null;
    },
    putSession: function (s) {
      var sh = this.sheet('_State', CHM_SHEETS.state, true), r = this.stateRow_(s.id), json = JSON.stringify(s);
      if (json.length > 49000) { s.requests = s.requests.slice(-2); s.activity = {}; json = JSON.stringify(s); }
      if (json.length > 49500) throw new Error('state too large');
      var row = [s.id, s.classCode, s.rosterId, s.version, s.status, new Date(s.lastSaved).toISOString(), json];
      if (r) sh.getRange(r, 1, 1, 7).setValues([row]);
      else { sh.appendRow(row); r = sh.getLastRow(); cache.put('row:' + s.id, String(r), 21600); }
      cache.put('idx:' + s.classCode + '|' + String(s.rosterId).toLowerCase() + '|' + s.version, s.status === 'reset' ? '' : s.id, 21600);
      var self = this; this.after.push(function () { self.upsertSessionRow_(s); });
    },
    findSessionId: function (code, rosterId, version) {
      var key = 'idx:' + code + '|' + rosterId.toLowerCase() + '|' + version, hit = cache.get(key);
      if (hit) { var s = this.getSession(hit); if (s && s.status !== 'reset') return hit; }
      var sh = this.sheet('_State', CHM_SHEETS.state, true), n = sh.getLastRow();
      if (n < 2) return null;
      var rows = sh.getRange(2, 1, n - 1, 5).getValues();
      for (var i = 0; i < rows.length; i++) if (rows[i][1] === code && String(rows[i][2]).toLowerCase() === rosterId.toLowerCase() && String(rows[i][3]) === version && rows[i][4] !== 'reset') { cache.put(key, rows[i][0], 21600); return rows[i][0]; }
      return null;
    },
    listSessions: function (code) {
      var sh = this.sheet('_State', CHM_SHEETS.state, true), n = sh.getLastRow();
      if (n < 2) return [];
      return sh.getRange(2, 1, n - 1, 7).getValues().filter(function (r) { return r[6] && (!code || r[1] === code); }).map(function (r) { return JSON.parse(r[6]); });
    },
    // ---- derived, human-readable views
    upsertSessionRow_: function (s) {
      var sh = this.sheet('Sessions', CHM_SHEETS.sessions), row = this.sessionRowValues_(s), r = 0, hint = cache.get('srow:' + s.id);
      if (hint && sh.getRange(Number(hint), 1).getValue() === s.id) r = Number(hint);
      else if (sh.getLastRow() > 1) { var f = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(s.id).matchEntireCell(true).findNext(); if (f) r = f.getRow(); }
      if (!r) { sh.appendRow(row); r = sh.getLastRow(); sh.getRange(r, 4, 1, 3).setNumberFormat('@'); }
      else sh.getRange(r, 1, 1, row.length).setValues([row]);
      cache.put('srow:' + s.id, String(r), 21600);
      return r;
    },
    sessionRowValues_: function (s) {
      var e = this.engine, x = e.sessionRow(s);
      return [x.sessionId, x.classCode, chmSafeCell_(x.section), chmSafeCell_(x.rosterId), chmSafeCell_(x.name), chmSafeCell_(x.period), x.version, x.status, x.startedAt, x.lastSaved, x.completedAt, x.elapsedMin, x.earned, x.possible, x.pct, x.firstTryAcc, x.completed, x.gradebook, x.receiptId]
        .concat(x.modules);
    },
    appendResponses: function (rows) {
      var sh = this.sheet('Responses', CHM_SHEETS.responses);
      var vals = rows.map(function (r) { return [r.sessionId, r.classCode, chmSafeCell_(r.section), chmSafeCell_(r.rosterId), r.version, r.taskId, r.module, r.concept, r.attempt, r.response, r.acceptedAt, r.correct, r.earned, r.possible, r.requestId]; });
      if (!vals.length) return;
      sh.getRange(sh.getLastRow() + 1, 1, vals.length, vals[0].length).setValues(vals);
    },
    listResponses: function (code) {
      var sh = this.sheet('Responses', CHM_SHEETS.responses), n = sh.getLastRow();
      if (n < 2) return [];
      return sh.getRange(2, 1, n - 1, 15).getValues().filter(function (r) { return !code || r[1] === code; });
    },
    writeGradebook: function (s, results) {
      var r = this.upsertSessionRow_(s);
      var sh = this.sheet('Sessions', CHM_SHEETS.sessions);
      if (sh.getRange(r, 1).getValue() !== s.id) throw new Error('read-back mismatch');   // confirm the row really holds this session
      // Status column shows what the teacher sees; "Gradebook" column is set after the read-back check.
      sh.getRange(r, 18).setValue('recorded');
      if (sh.getRange(r, 18).getValue() !== 'recorded') throw new Error('gradebook write not confirmed');
    },
    markGradebookReset: function (s) { var r = this.upsertSessionRow_(s); this.sheet('Sessions', CHM_SHEETS.sessions).getRange(r, 8).setValue('reset'); },
    appendAudit: function (a) { this.sheet('ResetAudit', CHM_SHEETS.resetAudit).appendRow([a.at, a.action, a.sessionId, a.classCode, chmSafeCell_(a.rosterId), a.previousStatus, chmSafeCell_(a.reason), a.version, chmSafeCell_(a.by)]); },
    // ---- preview + key/value live in CacheService (never in the gradebook tables)
    getPreview: function (id) { var j = cache.get('pv:' + id); return j ? JSON.parse(j) : null; },
    putPreview: function (s) { cache.put('pv:' + s.id, JSON.stringify(s), 21600); },
    kvGet: function (k) { var j = cache.get('kv:' + k); return j == null ? null : JSON.parse(j); },
    kvPut: function (k, v, ttl) { cache.put('kv:' + k, JSON.stringify(v), Math.max(1, Math.min(21600, ttl || 21600))); },
    getTeacherConfig: function () {
      var p = PropertiesService.getScriptProperties();
      var h = p.getProperty('TEACHER_HASH');
      return h ? { salt: p.getProperty('TEACHER_SALT'), hash: h, emails: (p.getProperty('TEACHER_EMAILS') || '').toLowerCase().split(',').map(function (x) { return x.trim(); }).filter(Boolean) } : null;
    },
    testDelivery: function (rec) {
      var sh = this.sheet('DeliveryTest', CHM_SHEETS.deliveryTest);
      sh.appendRow([rec.at, rec.id, 'Isolated test row. Excluded from Sessions, Responses and Summary.']);
      var last = sh.getLastRow();
      var back = sh.getRange(last, 2).getValue();
      return { readBack: back === rec.id, destination: 'Google Sheet tab "DeliveryTest" in "' + ss.getName() + '"' };
    }
  };
  return store;
}

// ---------------------------------------------------------------------------------------------- engine
var CHM_ENGINE_ = null;
function chmEnv_() {
  return {
    sha256: function (s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8).map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); },
    randomId: function (n) { var s = ''; while (s.length < n) s += Utilities.getUuid().replace(/-/g, ''); return s.slice(0, n); },
    activeUserEmail: function () { try { return Session.getActiveUser().getEmail(); } catch (e) { return ''; } }
  };
}
function chmEngine_() {
  if (CHM_ENGINE_) return CHM_ENGINE_;
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Not set up: run "Community Health Mission > 1. Set up this spreadsheet" first.');
  var store = chmSheetStore_(SpreadsheetApp.openById(id));
  var engine = CHM_core.createEngine({ pub: CHM_PUB, priv: CHM_PRIV, store: store, env: chmEnv_() });
  store.engine = engine;
  CHM_ENGINE_ = engine;
  return engine;
}

// ---------------------------------------------------------------------------------------------- web app
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index').setTitle('Community Health Mission').addMetaTag('viewport', 'width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Called by the browser through google.script.run.api(jsonString). Returns a JSON string (a readable acknowledgment).
function api(requestJson) {
  var res;
  try {
    if (typeof requestJson !== 'string' || requestJson.length > 40000) throw new Error('bad request');
    var req = JSON.parse(requestJson);
    res = chmEngine_().handle(String(req.action), req.payload || {});
  } catch (err) {
    var busy = String(err && err.message) === 'BUSY';
    res = { ok: false, code: busy ? 'BUSY' : 'SERVER_ERROR', message: busy ? 'The server is busy. Trying again…' : 'The server could not process that request. Nothing was lost.', retryable: true };
  }
  return JSON.stringify(res);
}

// ---------------------------------------------------------------------------------------------- teacher menu (runs as the signed-in editor of the spreadsheet)
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Community Health Mission')
    .addItem('1. Set up this spreadsheet', 'chmSetup')
    .addItem('2. Set teacher passcode', 'chmSetPasscode')
    .addItem('3. Add or update a class code', 'chmAddClass')
    .addSeparator()
    .addItem('Refresh Summary tab', 'chmRefreshSummary')
    .addItem('Test gradebook delivery (isolated record)', 'chmTestDelivery')
    .addItem('Reset a student session (with audit)', 'chmResetSession')
    .addToUi();
}
function chmSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  CHM_ENGINE_ = null;
  var st = chmSheetStore_(ss);
  st.sheet('Classes', CHM_SHEETS.classes); st.sheet('Roster', CHM_SHEETS.roster); st.sheet('Sessions', CHM_SHEETS.sessions); st.sheet('Responses', CHM_SHEETS.responses);
  st.sheet('Summary', ['Summary']); st.sheet('ResetAudit', CHM_SHEETS.resetAudit); st.sheet('_State', CHM_SHEETS.state, true); st.sheet('DeliveryTest', CHM_SHEETS.deliveryTest);
  SpreadsheetApp.getUi().alert('Set up complete.\nNext: set the teacher passcode, add a class code, then deploy as a web app (see README).');
}
function chmSetPasscode() {
  var ui = SpreadsheetApp.getUi(), r = ui.prompt('Teacher passcode', 'Choose a passcode (8+ characters). It is stored hashed on the server and is never shown to students.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var pass = r.getResponseText();
  if (pass.length < 8) { ui.alert('Use at least 8 characters.'); return; }
  var env = chmEnv_(), salt = env.randomId(16), p = PropertiesService.getScriptProperties();
  p.setProperty('TEACHER_SALT', salt); p.setProperty('TEACHER_HASH', env.sha256(salt + pass));
  ui.alert('Teacher passcode saved.');
}
function chmAddClass() {
  var ui = SpreadsheetApp.getUi();
  var code = ui.prompt('Class code', 'Letters/numbers, 4-24 characters (for example HEALTH3A). Students type this to join.', ui.ButtonSet.OK_CANCEL);
  if (code.getSelectedButton() !== ui.Button.OK) return;
  var name = ui.prompt('Class name', 'For example "Health, Period 3".', ui.ButtonSet.OK_CANCEL);
  if (name.getSelectedButton() !== ui.Button.OK) return;
  var engine = chmEngine_(), tok = chmAdminToken_(engine);
  var r = engine.handle('teacherSaveClass', { teacherToken: tok, cls: { code: code.getResponseText(), name: name.getResponseText(), section: name.getResponseText(), status: 'open', revealMode: 'final', pacingFactor: 1 } });
  ui.alert(r.ok ? 'Saved class ' + r.cls.code + '. Edit the Classes tab to set Section, open/closed, time window, reveal mode and pacing.' : r.message);
}
function chmAdminToken_(engine) {
  var env = chmEnv_(), tok = env.randomId(32);
  chmEngine_(); PropertiesService.getScriptProperties();
  CacheService.getScriptCache().put('kv:tt:' + env.sha256(tok), '1', 600);
  return tok;
}
function chmRefreshSummary() {
  var engine = chmEngine_(), id = PropertiesService.getScriptProperties().getProperty('SHEET_ID'), ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName('Summary') || ss.insertSheet('Summary');
  sh.clear();
  var sessions = chmSheetStore_(ss).listSessions(null).filter(function (s) { return s.status !== 'reset'; });
  var sm = engine.buildSummary(sessions), rows = [];
  rows.push(['Community Health Mission: summary (rebuilt ' + new Date().toISOString() + ')']); rows.push(['Students joined', sm.students, 'Finalized', sm.finalized, 'Average %', sm.avgPct == null ? '' : Math.round(sm.avgPct * 10) / 10]); rows.push([]);
  rows.push(['SECTION SUMMARIES (live formulas over the Sessions tab)']); rows.push(['Class', 'Finalized', 'Average %']);
  var codes = {}; sessions.forEach(function (s) { codes[s.classCode] = 1; });
  Object.keys(codes).forEach(function (c, i) { var r = rows.length + 1; rows.push([c, '=COUNTIFS(Sessions!B:B,A' + r + ',Sessions!H:H,"finalized")', '=IFERROR(AVERAGEIFS(Sessions!O:O,Sessions!B:B,A' + r + ',Sessions!H:H,"finalized"),"")']); });
  rows.push([]); rows.push(['MODULE AVERAGES (finalized students)']); rows.push(['Module', 'Average %']);
  var modStart = rows.length + 1;
  sm.modules.forEach(function (m) { rows.push(['M' + m.id + ' ' + m.title, m.avgPct == null ? '' : Math.round(m.avgPct * 10) / 10]); });
  rows.push([]); rows.push(['ITEMS']); rows.push(['Task', 'Module', 'Concept', 'Students attempted', 'First-attempt accuracy', 'Retries', 'Locked incorrect']);
  sm.items.forEach(function (i) { rows.push([i.id, i.module, i.concept, i.answered, i.firstTryAcc == null ? '' : Math.round(i.firstTryAcc * 100) / 100, i.retries, i.exhausted]); });
  rows.push([]); rows.push(['COMMON MISSED CONCEPTS (lowest first-attempt accuracy)']);
  sm.commonMissed.forEach(function (i) { rows.push([i.id + ' ' + i.title, i.concept, i.firstTryAcc == null ? '' : Math.round(i.firstTryAcc * 100) / 100]); });
  var w = rows.reduce(function (a, r) { return Math.max(a, r.length); }, 1);
  sh.getRange(1, 1, rows.length, w).setValues(rows.map(function (r) { var c = r.slice(); while (c.length < w) c.push(''); return c; }));
  try {
    var chart = sh.newChart().setChartType(Charts.ChartType.BAR).addRange(sh.getRange(modStart, 1, sm.modules.length, 2)).setPosition(2, 8, 0, 0).setOption('title', 'Average % by module').build();
    sh.getCharts().forEach(function (c) { sh.removeChart(c); }); sh.insertChart(chart);
  } catch (e) { /* chart is optional */ }
  SpreadsheetApp.getActive().toast('Summary refreshed');
}
function chmTestDelivery() {
  var engine = chmEngine_(), r = engine.handle('previewDeliveryTest', { teacherToken: chmAdminToken_(engine) });
  SpreadsheetApp.getUi().alert(r.ok ? 'TEST OK: wrote isolated row ' + r.id + ' to ' + r.destination + ' and read it back.\nThis is separate from the test of the web-app link: also use the "Teacher" page of the deployed link to test the browser-to-server path.' : 'TEST FAILED: ' + r.message);
}
function chmResetSession() {
  var ui = SpreadsheetApp.getUi();
  var sid = ui.prompt('Reset a student session', 'Paste the SessionId from the Sessions tab:', ui.ButtonSet.OK_CANCEL); if (sid.getSelectedButton() !== ui.Button.OK) return;
  var why = ui.prompt('Reason (kept in the ResetAudit tab)', 'Example: "Student lost connection; teacher approved a retake".', ui.ButtonSet.OK_CANCEL); if (why.getSelectedButton() !== ui.Button.OK) return;
  var engine = chmEngine_();
  var r = engine.handle('teacherReset', { teacherToken: chmAdminToken_(engine), sessionId: sid.getResponseText().trim(), reason: why.getResponseText(), by: Session.getActiveUser().getEmail() || 'sheet editor' });
  ui.alert(r.ok ? 'Session reset. The student can re-enter the class code to start fresh. The old responses stay in the Responses tab.' : r.message);
}
