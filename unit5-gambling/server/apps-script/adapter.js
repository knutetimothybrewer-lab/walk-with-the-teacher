// =====================================================================================================
// Google Apps Script adapter: Google Sheets store, web-app entry points, setup menu, 1-minute watcher.
// Concatenated (by tools/build.js) AFTER shared/core.js, seeds.js, data.js, grading.js and engine.js into Code.gs.
// Container-bound: create the script from the results spreadsheet (Extensions > Apps Script).
// This file contains NO answer key. The question bank (with answers) lives in KeyData.gs, which is private.
// =====================================================================================================

var U5_TABS = {
  master: 'Master Dashboard',
  blocks: ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9'],
  config: 'Config', roster: 'Roster', responses: 'Question Responses', audit: 'Audit History', tests: 'Test Records',
  sessions: '_Sessions', preview: '_Preview', demo: '_Demo'
};
var U5_HEAD = {
  sessions: ['StudentKey', 'SessionId', 'Block', 'Status', 'Deadline(ms)', 'Updated(ms)', 'Json'],
  preview: ['SessionId', 'Json'],
  audit: ['Time (UTC)', 'Event', 'By', 'Reason / Detail', 'Student ID', 'Name', 'Block', 'Previous Status', 'Previous %', 'Times Reset', 'Snapshot (JSON)'],
  tests: ['Time (UTC)', 'First Name', 'Last Name', 'Student ID', 'Class Block', 'Status', 'Percent', 'Score', 'Note'],
  roster: ['Student ID', 'First Name', 'Last Name', 'Class Block']
};
var U5_CACHE_TTL = 21600;

function u5Safe_(v) {              // spreadsheet formula-injection guard for any text a student typed
  if (typeof v !== 'string') return v;
  return /^[=+\-@\t\r]/.test(v) ? "'" + v : v;
}
function u5Ts_(ms) { return ms ? new Date(ms).toISOString().replace('T', ' ').slice(0, 19) : ''; }

function u5SheetStore_(ss) {
  var cache = CacheService.getScriptCache(), props = PropertiesService.getScriptProperties();
  var store = {};
  function sh(name) { var s = ss.getSheetByName(name); if (!s) throw new Error('Missing tab "' + name + '". Run the menu item "1. Set up this spreadsheet" again.'); return s; }
  function cget(k) { var v = cache.get(k); return v == null ? null : JSON.parse(v); }
  function cput(k, v, ttl) { try { cache.put(k, JSON.stringify(v), Math.max(1, Math.min(U5_CACHE_TTL, ttl || U5_CACHE_TTL))); } catch (e) { /* too large or cache full: sheet remains authoritative */ } }

  // ---- locks (script lock is NOT reentrant: the engine never nests)
  store.withLock = function (fn) {
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(25000)) throw new Error('BUSY');
    try { return fn(); } finally { lock.releaseLock(); }
  };

  // ---- configuration lives in the Config tab (codes + settings): single source of truth, editable in the sheet
  store.getConfig = function () {
    var c = cget('cfg'); if (c) return c;
    var s = sh(U5_TABS.config), vals = s.getRange(1, 1, Math.max(2, s.getLastRow()), 4).getValues(), codes = {}, settings = {}, mode = '';
    for (var i = 0; i < vals.length; i++) {
      var a = String(vals[i][0] || ''), b = vals[i][1], c3 = vals[i][2];
      if (a === 'CLASS ACCESS CODES') { mode = 'codes'; continue; }
      if (a === 'SETTINGS') { mode = 'settings'; continue; }
      if (!a || a === 'Block' || a === 'Setting') continue;
      if (mode === 'codes' && U5.BLOCKS.indexOf(a) >= 0) codes[a] = { code: String(b || ''), open: c3 === true || String(c3).toUpperCase() === 'TRUE' };
      if (mode === 'settings') settings[a] = (b === true || b === false) ? b : (String(b).toUpperCase() === 'TRUE' ? true : String(b).toUpperCase() === 'FALSE' ? false : b);
    }
    c = { codes: codes, settings: settings }; cput('cfg', c, 60);
    return c;
  };
  store.saveConfig = function (c) {
    var s = sh(U5_TABS.config), vals = s.getRange(1, 1, Math.max(2, s.getLastRow()), 4).getValues(), mode = '';
    for (var i = 0; i < vals.length; i++) {
      var a = String(vals[i][0] || '');
      if (a === 'CLASS ACCESS CODES') { mode = 'codes'; continue; }
      if (a === 'SETTINGS') { mode = 'settings'; continue; }
      if (mode === 'codes' && c.codes && c.codes[a]) { s.getRange(i + 1, 2, 1, 2).setValues([[c.codes[a].code, !!c.codes[a].open]]); }
      if (mode === 'settings' && c.settings && c.settings[a] != null) { s.getRange(i + 1, 2).setValue(c.settings[a]); }
    }
    cache.remove('cfg');
  };
  store.getTeacher = function () {
    var h = props.getProperty('TEACHER_HASH');
    return h ? { salt: props.getProperty('TEACHER_SALT'), hash: h } : null;
  };
  store.setTeacher = function (t) { props.setProperty('TEACHER_SALT', t.salt); props.setProperty('TEACHER_HASH', t.hash); };

  // ---- small key/value store (rate limits, teacher tokens) in the script cache
  store.kvGet = function (k) { return cget('kv:' + k); };
  store.kvPut = function (k, v, ttl) { cput('kv:' + k, v, ttl); };
  store.kvDel = function (k) { cache.remove('kv:' + k); };

  // ---- sessions: authoritative rows in the hidden _Sessions tab, write-through script cache
  function rowOf(id) {
    var s = sh(U5_TABS.sessions), hint = cache.get('r:' + id), n = s.getLastRow();
    if (hint) { var r = Number(hint); if (r >= 2 && r <= n && String(s.getRange(r, 2).getValue()) === id) return r; }
    if (n < 2) return 0;
    var f = s.getRange(2, 2, n - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
    if (!f) return 0;
    cache.put('r:' + id, String(f.getRow()), U5_CACHE_TTL);
    return f.getRow();
  }
  store.getSession = function (id) {
    var c = cget('s:' + id); if (c) return c;
    var r = rowOf(id); if (!r) return null;
    var j = sh(U5_TABS.sessions).getRange(r, 7).getValue();
    if (!j) return null;
    var s = JSON.parse(j); cput('s:' + id, s); return s;
  };
  function slim(s) {
    var json = JSON.stringify(s);
    if (json.length <= 48000) return json;
    Object.keys(s.items).forEach(function (k) { if (s.items[k].st !== 'open') s.items[k].att.forEach(function (a) { delete a.r; }); });
    s.requests = s.requests.slice(-3);
    json = JSON.stringify(s);
    if (json.length > 49500) throw new Error('session record too large');
    return json;
  }
  store.putSession = function (s) {
    var json = slim(s), sheet = sh(U5_TABS.sessions), r = rowOf(s.id);
    var row = [s.key, s.id, s.block, s.status, s.deadline || 0, new Date().getTime(), json];
    if (r) sheet.getRange(r, 1, 1, 7).setValues([row]);
    else { sheet.appendRow(row); r = sheet.getLastRow(); cache.put('r:' + s.id, String(r), U5_CACHE_TTL); }
    cput('s:' + s.id, s); cache.put('k:' + s.key, s.id, U5_CACHE_TTL);
  };
  store.findByKey = function (key) {
    var hit = cache.get('k:' + key);
    if (hit && store.getSession(hit)) return hit;
    var s = sh(U5_TABS.sessions), n = s.getLastRow(); if (n < 2) return null;
    var f = s.getRange(2, 1, n - 1, 1).createTextFinder(key).matchEntireCell(true).findNext();
    if (!f) return null;
    var id = String(s.getRange(f.getRow(), 2).getValue());
    cache.put('k:' + key, id, U5_CACHE_TTL); cache.put('r:' + id, String(f.getRow()), U5_CACHE_TTL);
    return id;
  };
  store.listSessions = function () {
    var s = sh(U5_TABS.sessions), n = s.getLastRow(); if (n < 2) return [];
    return s.getRange(2, 1, n - 1, 7).getValues().filter(function (r) { return r[6]; }).map(function (r) { return JSON.parse(r[6]); });
  };
  store.listHeaders = function () {
    var s = sh(U5_TABS.sessions), n = s.getLastRow(); if (n < 2) return [];
    return s.getRange(2, 1, n - 1, 5).getValues().filter(function (r) { return r[1]; }).map(function (r) { return { key: r[0], id: r[1], block: r[2], status: r[3], deadline: Number(r[4]) || 0 }; });
  };
  store.replaceSession = function (oldId, fresh) {
    var r = rowOf(oldId);
    cache.remove('s:' + oldId); cache.remove('r:' + oldId); cache.remove('t:' + oldId);
    if (!r) { store.putSession(fresh); return; }
    var json = slim(fresh);
    sh(U5_TABS.sessions).getRange(r, 1, 1, 7).setValues([[fresh.key, fresh.id, fresh.block, fresh.status, fresh.deadline || 0, new Date().getTime(), json]]);
    cache.put('r:' + fresh.id, String(r), U5_CACHE_TTL); cput('s:' + fresh.id, fresh); cache.put('k:' + fresh.key, fresh.id, U5_CACHE_TTL);
  };
  store.archiveSession = function (s, meta) {
    var row = meta.row || {}, snap = JSON.stringify(s);
    if (snap.length > 49000) { var c = JSON.parse(snap); c.requests = []; Object.keys(c.items).forEach(function (k) { c.items[k].att.forEach(function (a) { delete a.r; }); }); snap = JSON.stringify(c).slice(0, 49000); }
    sh(U5_TABS.audit).appendRow([u5Ts_(meta.at), 'RESET: previous record archived', meta.by || 'teacher', u5Safe_(meta.reason || ''), s.studentId, u5Safe_(s.first + ' ' + s.last), s.block, s.status, row.pct == null ? '' : row.pct, (s.resetCount || 0) + 1, snap]);
  };
  store.listArchive = function (key) {
    var s = sh(U5_TABS.audit), n = s.getLastRow(); if (n < 2) return [];
    return s.getRange(2, 1, n - 1, 11).getValues().filter(function (r) { return String(r[1]).indexOf('RESET') === 0 && String(r[4]).toUpperCase() === key; }).map(function (r) { return { key: key, archivedAt: String(r[0]), by: r[2], reason: r[3], status: r[7], pct: r[8] }; });
  };
  store.appendAudit = function (a) { sh(U5_TABS.audit).appendRow([u5Ts_(a.at), String(a.action || '').toUpperCase(), a.who || '', u5Safe_(a.detail || ''), '', '', '', '', '', '', '']); };

  // ---- preview (teacher) and fictional demo sessions: never in _Sessions
  function jsonStore(tab) {
    return {
      get: function (id) { var s = sh(tab), n = s.getLastRow(); if (n < 2) return null; var f = s.getRange(2, 1, n - 1, 1).createTextFinder(id).matchEntireCell(true).findNext(); if (!f) return null; var j = s.getRange(f.getRow(), 2).getValue(); return j ? JSON.parse(j) : null; },
      put: function (o) { var s = sh(tab), json = JSON.stringify(o), n = s.getLastRow(); if (n >= 2) { var f = s.getRange(2, 1, n - 1, 1).createTextFinder(o.id).matchEntireCell(true).findNext(); if (f) { s.getRange(f.getRow(), 1, 1, 2).setValues([[o.id, json]]); return; } } s.appendRow([o.id, json]); },
      list: function () { var s = sh(tab), n = s.getLastRow(); if (n < 2) return []; return s.getRange(2, 1, n - 1, 2).getValues().filter(function (r) { return r[1]; }).map(function (r) { return JSON.parse(r[1]); }); },
      clear: function () { var s = sh(tab), n = s.getLastRow(); if (n >= 2) s.getRange(2, 1, n - 1, 2).clearContent(); }
    };
  }
  var pv = jsonStore(U5_TABS.preview), dm = jsonStore(U5_TABS.demo);
  store.getPreview = function (id) { return pv.get(id); };
  store.putPreview = function (s) { pv.put(s); };
  store.listDemo = function () { return dm.list(); };
  store.putDemo = function (s) { dm.put(s); };
  store.clearDemo = function () { dm.clear(); };
  store.writeTestRecords = function (rows) {
    var s = sh(U5_TABS.tests); if (!rows.length) return 0;
    var vals = rows.map(function (r) { return r.map(function (v, i) { return typeof v === 'string' ? u5Safe_(v) : v; }); });
    s.getRange(s.getLastRow() + 1, 1, vals.length, vals[0].length).setValues(vals);
    return vals.length;
  };
  store.testSheets = function (rec) {
    var s = sh(U5_TABS.tests);
    s.appendRow([rec.at, 'SHEETS TEST', rec.id, '', '', '', '', '', 'Connection test row. Not a student. Not in the gradebook.']);
    var last = s.getLastRow(), back = String(s.getRange(last, 3).getValue());
    var tabs = ss.getSheets().map(function (x) { return x.getName(); });
    return { readBack: back === rec.id, destination: 'Google Sheet "' + ss.getName() + '", tab "' + U5_TABS.tests + '"', tabs: tabs };
  };

  // ---- heartbeat data (position, simulation counters, time in chapter): cache only
  store.getTouch = function (id) { return cget('t:' + id); };
  store.touch = function (id, tk) { cput('t:' + id, tk); };
  store.clearTouch = function (id) { cache.remove('t:' + id); };

  // ---- optional roster
  function rosterMap() {
    var m = cget('roster'); if (m) return m;
    m = {}; var s = sh(U5_TABS.roster), n = s.getLastRow();
    if (n >= 2) s.getRange(2, 1, n - 1, 4).getValues().forEach(function (r) { var id = U5.normId(r[0]); if (id) m[id] = { first: String(r[1]), last: String(r[2]), block: String(r[3]) }; });
    cput('roster', m, 300); return m;
  }
  store.hasRoster = function () { return Object.keys(rosterMap()).length > 0; };
  store.getRoster = function (id) { return rosterMap()[id] || null; };

  // ---- reports: dirty flag + rebuild of the five primary tabs (derived views; _Sessions is the source of truth)
  store.markDirty = function () { props.setProperty('DIRTY', '1'); };
  store.isDirty = function () { return props.getProperty('DIRTY') === '1'; };
  store.flushReports = function (builder, force) {
    if (!force && !store.isDirty()) return true;
    var lock = LockService.getDocumentLock();
    if (!lock.tryLock(0)) return false;                       // another request is already writing; it loops until clean
    try {
      var guard = 0;
      do { props.deleteProperty('DIRTY'); u5WriteReports_(ss, builder('real')); guard++; } while (store.isDirty() && guard < 3);
      props.setProperty('LAST_FLUSH', String(new Date().getTime()));
    } finally { lock.releaseLock(); }
    return true;
  };
  return store;
}

// ---------------------------------------------------------------------------------------------- report writer
function u5Pad_(rows, width) { return rows.map(function (r) { var c = r.slice(); while (c.length < width) c.push(''); return c; }); }
function u5WriteGrid_(sheet, grid) {
  var width = grid.reduce(function (a, r) { return Math.max(a, r.length); }, 1), rows = u5Pad_(grid, width);
  if (sheet.getMaxColumns() < width) sheet.insertColumnsAfter(sheet.getMaxColumns(), width - sheet.getMaxColumns());
  if (sheet.getMaxRows() < rows.length + 20) sheet.insertRowsAfter(sheet.getMaxRows(), rows.length + 20 - sheet.getMaxRows());
  sheet.clearContents();
  sheet.getRange(1, 1, rows.length, width).setValues(rows);
  return { width: width, height: rows.length };
}
function u5SummaryRow_(label, s) {
  return [label, s.registered, s.notStarted, s.inProgress, s.submitted, s.autoSubmitted, s.avgPct == null ? '' : s.avgPct, s.medianPct == null ? '' : s.medianPct, s.high == null ? '' : s.high, s.low == null ? '' : s.low, s.bands['90-100'], s.bands['80-89'], s.bands['70-79'], s.bands['60-69'], s.bands['Below 60']];
}
var U5_SUMMARY_HEAD = ['Class Block', 'Registered', 'Not Started', 'In Progress', 'Submitted', 'Auto-Submitted (time expired)', 'Average %', 'Median %', 'High %', 'Low %', '90-100', '80-89', '70-79', '60-69', 'Below 60'];

function u5WriteReports_(ss, t) {
  var stamp = 'Updated ' + new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  function safeRows(rows) { return rows.map(function (r) { return r.map(function (v) { return typeof v === 'string' ? u5Safe_(v) : v; }); }); }
  // Master Dashboard
  var m = ss.getSheetByName(U5_TABS.master), grid = [];
  grid.push(['Gambling: Behind the Odds — Master Dashboard (all four class blocks)']);
  grid.push([stamp + '   |   Scores are out of 100   |   This tab is rebuilt automatically from the protected _Sessions tab. Do not type here.']);
  grid.push([]);
  grid.push(U5_SUMMARY_HEAD);
  U5.BLOCKS.forEach(function (b) { grid.push(u5SummaryRow_(b, t.summary[b])); });
  grid.push(u5SummaryRow_('All blocks', t.summary.all));
  grid.push([]);
  grid.push(['STUDENT RESULTS — every student from every block']);
  var headRow = grid.length + 1;
  grid.push(t.master.head);
  safeRows(t.master.rows).forEach(function (r) { grid.push(r); });
  var dim = u5WriteGrid_(m, grid);
  u5Style_(m, headRow, dim, 4);
  // one tab per class block
  U5.BLOCKS.forEach(function (b) {
    var sheet = ss.getSheetByName(b), bt = t.blocks[b], g = [];
    g.push(['Gambling: Behind the Odds — ' + b + ' results']);
    g.push([stamp + '   |   Only students who selected ' + b + ' appear here   |   Rebuilt automatically. Do not type here.']);
    g.push([]);
    g.push(U5_SUMMARY_HEAD);
    g.push(u5SummaryRow_(b, bt.summary));
    g.push([]);
    var hr = g.length + 1;
    g.push(bt.head);
    safeRows(bt.rows).forEach(function (r) { g.push(r); });
    var d = u5WriteGrid_(sheet, g);
    u5Style_(sheet, hr, d, 4);
  });
  // question-level responses
  var q = ss.getSheetByName(U5_TABS.responses);
  var qg = [t.responses.head].concat(safeRows(t.responses.rows));
  var qd = u5WriteGrid_(q, qg); u5Style_(q, 1, qd, 0);
}
function u5Style_(sheet, headRow, dim, summaryHeadRow) {
  try {
    sheet.getRange(1, 1, 1, 1).setFontWeight('bold').setFontSize(14);
    if (summaryHeadRow) sheet.getRange(summaryHeadRow, 1, 1, Math.min(15, dim.width)).setFontWeight('bold').setBackground('#d9ead3');
    sheet.getRange(headRow, 1, 1, dim.width).setFontWeight('bold').setBackground('#cfe2f3').setWrap(true);
    sheet.setFrozenRows(headRow);
  } catch (e) { /* formatting is cosmetic; never block grade reporting */ }
}

// ---------------------------------------------------------------------------------------------- engine wiring
var U5_ENGINE_ = null;
function u5Env_() {
  return {
    sha256: function (s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8).map(function (b) { return ('0' + ((b + 256) % 256).toString(16)).slice(-2); }).join(''); },
    randomId: function (n) { var s = ''; while (s.length < n + 4) s += Utilities.getUuid().replace(/-/g, ''); return s.slice(0, n); }
  };
}
function u5Engine_() {
  if (U5_ENGINE_) return U5_ENGINE_;
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('Not set up. Open the spreadsheet and use the menu "Gambling Assessment > 1. Set up this spreadsheet".');
  var store = u5SheetStore_(SpreadsheetApp.openById(id));
  U5_ENGINE_ = U5E.createEngine({ bank: u5LoadBank_(), store: store, env: u5Env_() });
  U5_ENGINE_.store = store;
  return U5_ENGINE_;
}

// ---------------------------------------------------------------------------------------------- web app
function doPost(e) {
  var res;
  try {
    var body = e && e.postData && e.postData.contents;
    if (typeof body !== 'string' || body.length > 60000) throw new Error('bad request');
    var req = JSON.parse(body);
    res = u5Engine_().handle(String(req.action || ''), req.payload || {});
  } catch (err) {
    res = { ok: false, code: 'SERVER_ERROR', message: 'The server could not process that request. Nothing was lost; try again.', retryable: true };
  }
  return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e) {
  var ok = true, msg = 'Gambling: Behind the Odds backend is running.';
  try { u5Engine_(); } catch (err) { ok = false; msg = String(err.message || err); }
  return ContentService.createTextOutput(JSON.stringify({ ok: ok, service: 'unit5-gambling', message: msg, time: new Date().toISOString() })).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------------------------- watcher (runs every minute)
function u5Tick() {
  var eng = u5Engine_(), store = eng.store;
  var expired = eng.sweepExpired();
  var active = store.listHeaders().filter(function (h) { return h.status === 'active'; }).length;
  var last = Number(PropertiesService.getScriptProperties().getProperty('LAST_FLUSH') || 0);
  if (store.isDirty() || expired || (active > 0 && new Date().getTime() - last > 120000)) store.flushReports(function (src) { return eng.reportTables(src); }, false);
}

// ---------------------------------------------------------------------------------------------- spreadsheet menu (runs as the teacher who owns the sheet)
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Gambling Assessment')
    .addItem('1. Set up this spreadsheet', 'u5Setup')
    .addItem('2. Set teacher password', 'u5SetPassword')
    .addItem('3. Show class access codes', 'u5ShowCodes')
    .addSeparator()
    .addItem('Start auto-submit watcher (every minute)', 'u5InstallTrigger')
    .addItem('Stop auto-submit watcher', 'u5RemoveTrigger')
    .addItem('Rebuild reports now', 'u5RebuildNow')
    .addItem('Test Google Sheets connection', 'u5TestSheets')
    .addItem('Clear fictional test records', 'u5ClearTestRecords')
    .addToUi();
}
function u5MakeTab_(ss, name, header, hidden) {
  var s = ss.getSheetByName(name);
  if (!s) { s = ss.insertSheet(name); if (header) { s.getRange(1, 1, 1, header.length).setValues([header]).setFontWeight('bold'); s.setFrozenRows(1); } }
  if (hidden) { try { s.hideSheet(); } catch (e) { /* already hidden */ } }
  return s;
}
function u5Protect_(s, desc, warnOnly) {
  try {
    var p = s.protect().setDescription(desc);
    if (warnOnly) p.setWarningOnly(true);
    else { try { var eds = p.getEditors(); if (eds && eds.length) p.removeEditors(eds); } catch (e) { /* owner stays */ } try { if (p.canDomainEdit()) p.setDomainEdit(false); } catch (e2) { /* ignore */ } }
  } catch (e3) { /* protection is a safeguard, not required for operation */ }
}
function u5Setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), ui = SpreadsheetApp.getUi();
  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  U5_ENGINE_ = null;
  // the five primary tabs, in this order
  var master = u5MakeTab_(ss, U5_TABS.master, null, false);
  U5_TABS.blocks.forEach(function (b) { u5MakeTab_(ss, b, null, false); });
  var cfg = ss.getSheetByName(U5_TABS.config);
  if (!cfg) {
    cfg = ss.insertSheet(U5_TABS.config);
    var rows = [['Gambling: Behind the Odds — configuration (protected)', '', '', ''], ['Students never see this tab. Change a code here or in Teacher Mode. Use a different code for each block.', '', '', ''], ['', '', '', ''], ['CLASS ACCESS CODES', '', '', ''], ['Block', 'Access code', 'Open (TRUE/FALSE)', ''] ];
    U5.BLOCKS.forEach(function (b, i) { rows.push([b, 'GAMB' + (i + 1) + '-' + u5Env_().randomId(4).toUpperCase().replace(/[^A-Z0-9]/g, 'X'), false, '']); });
    rows.push(['', '', '', '']); rows.push(['SETTINGS', '', '', '']); rows.push(['Setting', 'Value', 'Meaning', '']);
    rows.push(['studentResults', 'full', 'full = score + chapter breakdown, score = percent only, hidden = confirmation only', '']);
    rows.push(['calculator', true, 'Show the on-screen calculator', '']); rows.push(['referenceSheet', true, 'Show the formula reference sheet', '']);
    cfg.getRange(1, 1, rows.length, 4).setValues(rows); cfg.getRange(1, 1).setFontWeight('bold').setFontSize(14); cfg.setColumnWidth(1, 200); cfg.setColumnWidth(2, 160); cfg.setColumnWidth(3, 420);
  }
  u5MakeTab_(ss, U5_TABS.roster, U5_HEAD.roster, false);
  u5MakeTab_(ss, U5_TABS.responses, null, false);
  u5MakeTab_(ss, U5_TABS.audit, U5_HEAD.audit, false);
  u5MakeTab_(ss, U5_TABS.tests, U5_HEAD.tests, false);
  u5MakeTab_(ss, U5_TABS.sessions, U5_HEAD.sessions, true);
  u5MakeTab_(ss, U5_TABS.preview, U5_HEAD.preview, true);
  u5MakeTab_(ss, U5_TABS.demo, U5_HEAD.preview, true);
  // order: Master, blocks, then support tabs
  var order = [U5_TABS.master].concat(U5_TABS.blocks, [U5_TABS.config, U5_TABS.roster, U5_TABS.responses, U5_TABS.audit, U5_TABS.tests]);
  order.forEach(function (n, i) { var s = ss.getSheetByName(n); if (s) { ss.setActiveSheet(s); ss.moveActiveSheet(i + 1); } });
  ss.setActiveSheet(master);
  var def = ss.getSheetByName('Sheet1'); if (def && def.getLastRow() <= 1 && ss.getSheets().length > 1) { try { ss.deleteSheet(def); } catch (e) { /* ignore */ } }
  // protections
  [U5_TABS.master].concat(U5_TABS.blocks).forEach(function (n) { u5Protect_(ss.getSheetByName(n), 'Auto-generated report. Do not edit.', true); });
  [U5_TABS.config, U5_TABS.responses, U5_TABS.audit, U5_TABS.tests, U5_TABS.sessions, U5_TABS.preview, U5_TABS.demo].forEach(function (n) { u5Protect_(ss.getSheetByName(n), 'Protected: owner only.', false); });
  u5InstallTrigger_(true);
  u5Engine_().store.flushReports(function (src) { return U5_ENGINE_.reportTables(src); }, true);
  ui.alert('Set up complete.\n\nNext:\n  2. Set teacher password\n  3. Show class access codes\n  Then: Deploy > New deployment > Web app (Execute as: Me, Access: Anyone) and paste the /exec URL into js/config.js.\n\nThe auto-submit watcher is now running every minute.');
}
function u5SetPassword() {
  var ui = SpreadsheetApp.getUi(), r = ui.prompt('Teacher password', 'Choose a private password (10+ characters). It is stored only as a salted hash inside this script. Students never see it.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var pw = r.getResponseText();
  if (pw.length < 10) { ui.alert('Use at least 10 characters.'); return; }
  var eng = u5Engine_(), env = u5Env_(), salt = env.randomId(16);
  eng.store.setTeacher({ salt: salt, hash: eng.pwHash(salt, pw) });
  ui.alert('Teacher password saved. In the assessment, type the teacher entry code into the class code box, then this password.');
}
function u5ShowCodes() {
  var c = u5Engine_().store.getConfig(), lines = U5.BLOCKS.map(function (b) { var x = c.codes[b] || {}; return b + ':  ' + (x.code || '(none)') + '   ' + (x.open ? '[open]' : '[CLOSED]'); });
  SpreadsheetApp.getUi().alert('Class access codes\n\n' + lines.join('\n') + '\n\nBlocks start CLOSED. Open each block in Teacher Mode (Access codes) or set TRUE in the Config tab when students are ready.');
}
function u5InstallTrigger_(quiet) {
  var have = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'u5Tick'; });
  if (!have) ScriptApp.newTrigger('u5Tick').timeBased().everyMinutes(1).create();
  if (!quiet) SpreadsheetApp.getUi().alert(have ? 'The watcher was already running.' : 'Auto-submit watcher started (every minute).');
}
function u5InstallTrigger() { u5InstallTrigger_(false); }
function u5RemoveTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'u5Tick') ScriptApp.deleteTrigger(t); });
  SpreadsheetApp.getUi().alert('Auto-submit watcher stopped. Expired sessions will then be finalized only when someone opens the app or the Teacher dashboard.');
}
function u5RebuildNow() { var e = u5Engine_(); e.store.flushReports(function (s) { return e.reportTables(s); }, true); SpreadsheetApp.getActive().toast('Reports rebuilt'); }
function u5TestSheets() {
  var e = u5Engine_(), id = 'MENU-TEST-' + u5Env_().randomId(6);
  try { var r = e.store.testSheets({ id: id, at: new Date().toISOString() }); SpreadsheetApp.getUi().alert(r.readBack ? 'OK: wrote and read back a labelled test row in the "Test Records" tab.\nPrimary tabs were not touched.' : 'The row was written but could not be read back.'); }
  catch (err) { SpreadsheetApp.getUi().alert('FAILED: ' + err.message); }
}
function u5ClearTestRecords() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), s = ss.getSheetByName(U5_TABS.tests), n = s.getLastRow();
  if (n > 1) s.getRange(2, 1, n - 1, U5_HEAD.tests.length).clearContent();
  var d = ss.getSheetByName(U5_TABS.demo), m = d.getLastRow(); if (m > 1) d.getRange(2, 1, m - 1, 2).clearContent();
  SpreadsheetApp.getUi().alert('Fictional test records cleared.');
}
