/* ============================================================================================================
 * Entry points and workbook tools. Google Apps Script only. Concatenated into Code.gs.
 * Teacher-facing steps are in the Unit 8 menu of the Google Sheet (see docs/SETUP.md).
 * ============================================================================================================ */

var w8EnvCache_ = null;
function w8Env_() {
  if (w8EnvCache_) return w8EnvCache_;
  var store = createSheetsStore_();
  var env = {
    now: function () { return Date.now(); },
    uuid: function () { return Utilities.getUuid(); },
    store: store, debug: false,
    log: function (m) { console.error(m); }
  };
  env.server = W8Core.createServer(env);
  w8EnvCache_ = env;
  return env;
}

/** Web app: all student and teacher traffic. POST with a text/plain JSON body (avoids a CORS preflight). */
function doPost(e) {
  var out;
  try {
    var req = JSON.parse(e && e.postData && e.postData.contents || '');
    out = w8Env_().server.handle(req);
  } catch (err) {
    out = { ok: false, error: { code: 'BAD_REQUEST', message: 'Malformed request.' }, serverNow: Date.now() };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** Opening the web app URL in a browser shows this. It reveals nothing. */
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, service: 'unit8-assessment', version: W8Core.VERSION, serverNow: Date.now() })).setMimeType(ContentService.MimeType.JSON);
}

/** Time-driven trigger (every 5 minutes): submits expired sessions, then refreshes the dashboard tabs. */
function sweepExpired() {
  var env = w8Env_();
  var n = env.server.sweep();
  try { w8SyncDashboards_(env.store); } catch (e) { console.error('dashboard sync failed: ' + e); }
  return n;
}

function say_(msg) {
  try { SpreadsheetApp.getUi().alert('Unit 8', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { Logger.log(msg); }
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Unit 8')
      .addItem('1. Set up workbook', 'setupWorkbook')
      .addItem('2. Set teacher password', 'setTeacherPasswordPrompt')
      .addItem('3. Show class codes', 'showClassCodes')
      .addItem('4. Load item bank', 'seedItemBank')
      .addItem('5. Install 5-minute timer', 'installTimer')
      .addSeparator()
      .addItem('Update dashboard tabs now', 'syncDashboardsNow')
      .addItem('Health check', 'healthCheck')
      .addToUi();
  } catch (e) { /* not opened from a sheet */ }
}

/* ---------------------------------------------------------------------------------------- setup */
function w8Ensure_(name, index) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name, index);
  return sh;
}
/** Sheets tabs start at 26 columns x 1000 rows. Make room BEFORE writing, or the write throws "out of bounds". */
function w8Grow_(sh, rows, cols) {
  if (cols > sh.getMaxColumns()) sh.insertColumnsAfter(sh.getMaxColumns(), cols - sh.getMaxColumns());
  if (rows > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), rows - sh.getMaxRows());
}
function w8Header_(sh, row, cols) {
  w8Grow_(sh, row, cols.length);
  sh.getRange(row, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#e3f3f5');
  sh.setFrozenRows(row);
}
function w8Lock_(sh, warnOnly, hide) {
  try {
    var p = sh.protect().setDescription('Unit 8 ' + (warnOnly ? 'generated view: do not edit' : 'internal data: do not edit'));
    if (warnOnly) p.setWarningOnly(true);
    else {
      var me = Session.getEffectiveUser();
      p.addEditor(me);
      p.removeEditors(p.getEditors().filter(function (u) { return u.getEmail() !== me.getEmail(); }));
      if (p.canDomainEdit()) p.setDomainEdit(false);
    }
  } catch (e) { Logger.log('Could not protect ' + sh.getName() + ': ' + e); }
  if (hide) { try { sh.hideSheet(); } catch (e) { Logger.log('Could not hide ' + sh.getName()); } }
}

/** Creates every tab, headers, protections, default settings (random class codes), and the 5-minute timer. Safe to run again. */
function setupWorkbook() {
  var tabs = [W8_TABS.MASTER].concat(W8Core.BLOCKS);
  tabs.forEach(function (n, i) { w8Ensure_(n, i); });
  var created = {};
  [W8_TABS.CONFIG, W8_TABS.BANK, W8_TABS.RESP, W8_TABS.SESS, W8_TABS.HIST, W8_TABS.PREV].forEach(function (n) {
    var existed = !!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n);
    created[n] = !existed; w8Ensure_(n);
  });
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  w8Header_(ss.getSheetByName(W8_TABS.CONFIG), 1, ['Setting', 'Value', 'Notes']);
  w8Header_(ss.getSheetByName(W8_TABS.BANK), 1, ['id', 'chapter', 'type', 'points', 'order', 'unlockAfter', 'json (key, hints, explanation)']);
  w8Header_(ss.getSheetByName(W8_TABS.RESP), 1, ['Time', 'Student ID', 'Block', 'Reset epoch', 'Item', 'Attempt', 'Correct (1/0)', 'Credit', 'Response', 'Request ID', 'Epoch ms']);
  w8Header_(ss.getSheetByName(W8_TABS.SESS), 1, W8_SESS_COLS);
  w8Header_(ss.getSheetByName(W8_TABS.HIST), 1, ['Reset at', 'Student ID', 'Last name', 'First name', 'Block', 'Reset no.', 'Status before reset', 'Percent', 'Points', 'Reason', 'Full record JSON']);
  w8Header_(ss.getSheetByName(W8_TABS.PREV), 1, W8_SESS_COLS);

  var store = createSheetsStore_();
  var cfg = store.getConfig();
  var changed = false;
  W8Core.BLOCKS.forEach(function (b) { if (!cfg.classCodes[b]) { cfg.classCodes[b] = W8Core.randomCode({ uuid: Utilities.getUuid }, 6); changed = true; } });
  if (changed || created[W8_TABS.CONFIG]) store.setConfig(cfg);

  w8WriteBaseHeaders_();
  Object.keys(created).forEach(function (n) { if (created[n]) w8Lock_(ss.getSheetByName(n), false, true); });
  tabs.forEach(function (n) { if (!ss.getSheetByName(n).getProtections(SpreadsheetApp.ProtectionType.SHEET).length) w8Lock_(ss.getSheetByName(n), true, false); });
  installTimer();
  say_('Workbook is ready.\n\nClass codes (also in the hidden Config tab):\n' + W8Core.BLOCKS.map(function (b) { return b + ': ' + cfg.classCodes[b]; }).join('\n') + '\n\nNext: 2. Set teacher password, then 4. Load item bank.');
}

function showClassCodes() {
  var cfg = createSheetsStore_().getConfig();
  say_('Class codes\n\n' + W8Core.BLOCKS.map(function (b) { return b + ': ' + (cfg.classCodes[b] || '(not set)'); }).join('\n') + '\n\nChange them in the teacher dashboard (Settings) or in the hidden Config tab.');
}

function setTeacherPasswordPrompt() {
  var ui;
  try { ui = SpreadsheetApp.getUi(); } catch (e) { Logger.log('Open the Google Sheet and use the Unit 8 menu to set the password.'); return; }
  var r = ui.prompt('Teacher password', 'Type a new teacher password (at least 8 characters). It is stored only as a salted hash and is never shown again.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  var pw = r.getResponseText();
  if (pw.length < 8) { ui.alert('Unit 8', 'That password is too short. Use at least 8 characters.', ui.ButtonSet.OK); return; }
  var salt = Utilities.getUuid();
  createSheetsStore_().setTeacherHash({ salt: salt, hash: W8Core.hashPassword(pw, salt) });
  ui.alert('Unit 8', 'Teacher password saved. In the student page, type WALK-TEACHER in the class code box to sign in as the teacher.', ui.ButtonSet.OK);
}

function installTimer() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'sweepExpired') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sweepExpired').timeBased().everyMinutes(5).create();
  Logger.log('Installed the 5-minute auto-submit timer.');
}

/** Loads the private answer bank (ITEM_BANK_SEED, from the separate ItemBankSeed.gs file) into the protected ItemBank tab. */
function seedItemBank() {
  if (typeof ITEM_BANK_SEED === 'undefined') { say_('No item bank found.\n\nCreate a second script file named ItemBankSeed, paste the contents of the ItemBankSeed.gs file your teacher kit includes, save, then run this again. (SETUP.md step 6.)'); return; }
  var seed = ITEM_BANK_SEED, ids = Object.keys(seed.items).sort(function (a, b) { return seed.items[a].order - seed.items[b].order; });
  var sh = w8Ensure_(W8_TABS.BANK), n = ids.length;
  sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, n), 7).clearContent();
  var rows = ids.map(function (id) { var b = seed.items[id]; return [id, b.chapter, b.type, b.points, b.order, b.unlockAfter || '', JSON.stringify({ struct: b.struct, key: b.key, hints: b.hints, explanation: b.explanation, feedback: b.feedback || null })]; });
  sh.getRange(2, 1, n, 7).setValues(rows);
  PropertiesService.getScriptProperties().setProperty('BANK_META', JSON.stringify(seed.meta));
  CacheService.getScriptCache().removeAll(['bank:n', 'bank:0', 'bank:1', 'bank:2', 'bank:3', 'bank:4']);
  try { w8SyncDashboards_(createSheetsStore_()); } catch (e) { Logger.log('Dashboard rebuild skipped: ' + e); }
  say_('Loaded ' + n + ' questions worth ' + seed.meta.points + ' points (content set "' + seed.meta.contentSet + '", structure ' + String(seed.meta.structureHash).slice(0, 8) + ').\n\nNow DELETE the ItemBankSeed file from the script editor so the answer key is not left in the project.');
}

function syncDashboardsNow() { w8SyncDashboards_(createSheetsStore_()); say_('Dashboard tabs updated.'); }

function healthCheck() {
  var lines = [], store = createSheetsStore_();
  store.selfTest(function (name, ok, detail) { lines.push((ok ? 'OK    ' : 'FIX   ') + name + (detail ? ': ' + detail : '')); });
  var pw = store.getTeacherHash(); lines.push((pw && pw.hash ? 'OK    ' : 'FIX   ') + 'Teacher password is set');
  var cfg = store.getConfig(); var miss = W8Core.BLOCKS.filter(function (b) { return !cfg.classCodes[b]; });
  lines.push((miss.length ? 'FIX   ' : 'OK    ') + 'Class codes for all four blocks' + (miss.length ? ': missing ' + miss.join(', ') : ''));
  try { var bank = store.getBank(); lines.push('OK    Item bank: ' + Object.keys(bank.items).length + ' items, ' + bank.meta.points + ' points'); } catch (e) { lines.push('FIX   Item bank: ' + e.message); }
  say_(lines.join('\n'));
}

/* ---------------------------------------------------------------------------------------- dashboard views */
var W8_STATUS_LABEL_ = { registered: 'Not started', reset: 'Reset (ready)', in_progress: 'In progress', submitted: 'Submitted', auto_submitted: 'Auto-submitted' };

function w8Chapters_(bank) {
  var out = [];
  Object.keys(bank.items).sort(function (a, b) { return bank.items[a].order - bank.items[b].order; }).forEach(function (id) { var c = bank.items[id].chapter; if (out.indexOf(c) < 0) out.push(c); });
  return out;
}
function w8MasterHeader_(chapters) {
  return ['Student ID', 'Last name', 'First name', 'Block', 'Status', 'Started', 'Deadline', 'Submitted', 'Minutes used', 'Submission type', 'Points', 'Possible', 'Percent']
    .concat(chapters.map(function (c) { return c.toUpperCase() + ' points'; })).concat(['Resets', 'Allowed minutes', 'Last activity']);
}
function w8F_(ms) { return ms ? Utilities.formatDate(new Date(ms), Session.getScriptTimeZone() || 'America/New_York', 'yyyy-MM-dd HH:mm:ss') : ''; }
function w8MasterRow_(s, bank, chapters, cfg) {
  var r = s.result || W8Core.computeResult(s, bank), now = Date.now();
  var used = s.startTime ? Math.round(((s.submittedAt || Math.min(now, s.deadline || now)) - s.startTime) / 6000) / 10 : '';
  return [s.studentId, s.lastName, s.firstName, s.block, W8_STATUS_LABEL_[s.status] || s.status, w8F_(s.startTime), w8F_(s.deadline), w8F_(s.submittedAt), used, s.submissionType || '', r.points, r.possible, r.percent]
    .concat(chapters.map(function (c) { return r.chapters[c] ? r.chapters[c].earned : ''; })).concat([s.resetCount || 0, s.allowedMinutes || cfg.defaultMinutes, w8F_(s.lastActionAt)]);
}
function w8BlockHeader_(bank, chapters) {
  var ids = Object.keys(bank.items).sort(function (a, b) { return bank.items[a].order - bank.items[b].order; });
  return w8MasterHeader_(chapters).concat(ids.reduce(function (a, id) { return a.concat([id + ' attempts', id + ' credit']); }, []));
}
function w8BlockRow_(s, bank, chapters, cfg) {
  var ids = Object.keys(bank.items).sort(function (a, b) { return bank.items[a].order - bank.items[b].order; });
  var row = w8MasterRow_(s, bank, chapters, cfg);
  ids.forEach(function (id) { var st = s.items && s.items[id]; row.push(st ? st.a || 0 : ''); row.push(st && (st.ok || st.l) ? st.c : ''); });
  return row;
}
function w8WriteBaseHeaders_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var m = ss.getSheetByName(W8_TABS.MASTER);
  m.getRange(1, 1).setValue('Unit 8 Family Life & Sexuality: Master Dashboard').setFontWeight('bold').setFontSize(14);
  w8Header_(m, W8_MASTER_HEADER_ROW, w8MasterHeader_([]));
  W8Core.BLOCKS.forEach(function (b) {
    var sh = ss.getSheetByName(b);
    sh.getRange(1, 1).setValue(b + ': students and per-question attempts').setFontWeight('bold').setFontSize(14);
    w8Header_(sh, W8_BLOCK_HEADER_ROW, w8MasterHeader_([]));
  });
}
function w8FindRow_(sh, startRow, id) {
  var last = sh.getLastRow(); if (last < startRow) return 0;
  var ids = sh.getRange(startRow, 1, last - startRow + 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return startRow + i;
  return 0;
}
/** One student's row on the Master Dashboard and on their block tab (upsert by student ID, so there are never duplicate rows). */
function w8UpsertDashboardRows_(s, store) {
  if (s.preview) return;
  var bank = store.getBank(), cfg = store.getConfig(), chapters = w8Chapters_(bank), ss = SpreadsheetApp.getActiveSpreadsheet();
  function put(sh, headerRow, header, row) {
    w8Grow_(sh, headerRow + 1, header.length);
    sh.getRange(headerRow, 1, 1, header.length).setValues([header]);
    var at = w8FindRow_(sh, headerRow + 1, s.studentId) || Math.max(sh.getLastRow() + 1, headerRow + 1);
    w8Grow_(sh, at, row.length);
    sh.getRange(at, 1, 1, row.length).setValues([row]);
  }
  put(ss.getSheetByName(W8_TABS.MASTER), W8_MASTER_HEADER_ROW, w8MasterHeader_(chapters), w8MasterRow_(s, bank, chapters, cfg));
  var bs = ss.getSheetByName(s.block); if (bs) put(bs, W8_BLOCK_HEADER_ROW, w8BlockHeader_(bank, chapters), w8BlockRow_(s, bank, chapters, cfg));
}
/** Rebuilds every dashboard tab from the Sessions tab (the source of truth). Also runs every 5 minutes. */
function w8SyncDashboards_(store) {
  var bank = store.getBank(), cfg = store.getConfig(), chapters = w8Chapters_(bank), ss = SpreadsheetApp.getActiveSpreadsheet();
  var sessions = store.listSessions({}).sort(function (a, b) { return (a.block + a.lastName + a.firstName).localeCompare(b.block + b.lastName + b.firstName); });
  function fill(sh, headerRow, header, rows) {
    w8Grow_(sh, headerRow + 1, header.length);
    sh.getRange(headerRow, 1, 1, header.length).setValues([header]).setFontWeight('bold').setBackground('#e3f3f5');
    sh.setFrozenRows(headerRow);
    var body = Math.max(1, sh.getMaxRows() - headerRow);
    sh.getRange(headerRow + 1, 1, body, Math.max(header.length, sh.getMaxColumns())).clearContent();
    if (rows.length) {
      w8Grow_(sh, headerRow + rows.length, header.length);
      sh.getRange(headerRow + 1, 1, rows.length, header.length).setValues(rows);
    }
  }
  var master = ss.getSheetByName(W8_TABS.MASTER);
  fill(master, W8_MASTER_HEADER_ROW, w8MasterHeader_(chapters), sessions.map(function (s) { return w8MasterRow_(s, bank, chapters, cfg); }));
  var sum = [['Block', 'Students', 'Submitted', 'In progress', 'Auto-submitted', 'Average %']];
  W8Core.BLOCKS.forEach(function (b) {
    var l = sessions.filter(function (s) { return s.block === b; }), fin = l.filter(function (s) { return s.status === 'submitted' || s.status === 'auto_submitted'; });
    var avg = fin.length ? Math.round(fin.reduce(function (a, s) { return a + (s.result ? s.result.percent : 0); }, 0) / fin.length * 10) / 10 : '';
    sum.push([b, l.length, fin.length, l.filter(function (s) { return s.status === 'in_progress'; }).length, l.filter(function (s) { return s.status === 'auto_submitted'; }).length, avg]);
  });
  master.getRange(2, 1).setValue('Updated ' + w8F_(Date.now()) + ' (rows for in-progress students refresh every 5 minutes; use the teacher dashboard Monitor for live data).');
  master.getRange(3, 1, sum.length, 6).setValues(sum);
  master.getRange(3, 1, 1, 6).setFontWeight('bold');
  W8Core.BLOCKS.forEach(function (b) {
    var sh = ss.getSheetByName(b); if (!sh) return;
    fill(sh, W8_BLOCK_HEADER_ROW, w8BlockHeader_(bank, chapters), sessions.filter(function (s) { return s.block === b; }).map(function (s) { return w8BlockRow_(s, bank, chapters, cfg); }));
  });
}
