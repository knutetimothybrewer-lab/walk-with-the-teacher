/*
 * Google Sheets storage adapter for server/core.js. Google Apps Script only (uses SpreadsheetApp, CacheService, LockService,
 * PropertiesService). Concatenated into apps-script/Code.gs by tools/build-apps-script.js. Contract: see server/memory-store.js.
 *
 * Where things live
 *   Sessions         one row per student: key columns + the whole session as JSON in column H. THE source of truth.
 *                    Fronted by a write-through CacheService copy so most requests never read the sheet.
 *   PreviewSessions  the teacher's preview session (never mixed with Sessions)
 *   Responses        append-only audit log: one row per graded attempt
 *   History          one row per reset (the full record is kept, never deleted)
 *   ItemBank         answer keys, hints, explanations (hidden + protected). Cached.
 *   Config           class codes, default minutes, show score, open/closed, turned-off items
 *   Script Properties  the teacher password HASH (never the password)
 *   Master Dashboard + one tab per block: human-readable VIEWS rebuilt from Sessions (events + every 5 minutes)
 */
var W8_TABS = { MASTER: 'Master Dashboard', CONFIG: 'Config', BANK: 'ItemBank', RESP: 'Responses', SESS: 'Sessions', HIST: 'History', PREV: 'PreviewSessions' };
var W8_SESS_COLS = ['Student ID', 'Token', 'Token expires', 'Status', 'Block', 'Last name', 'First name', 'Session JSON', 'Updated'];
var W8_CACHE_TTL = 21600; // 6 hours, the maximum
var W8_MASTER_HEADER_ROW = 11;
var W8_BLOCK_HEADER_ROW = 3;

function createSheetsStore_() {
  var depth = 0;
  var cache = CacheService.getScriptCache();
  var props = PropertiesService.getScriptProperties();
  var tz = Session.getScriptTimeZone() || 'America/New_York';
  var memo = {};

  function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
  function sheet(name) {
    if (memo[name]) return memo[name];
    var sh = ss().getSheetByName(name);
    if (!sh) throw new Error('Missing tab "' + name + '". Run Unit 8 > 1. Set up workbook.');
    memo[name] = sh; return sh;
  }
  function cget(k) { var v = cache.get(k); if (v == null) return null; try { return JSON.parse(v); } catch (e) { return null; } }
  function cput(k, v, ttl) { try { var s = JSON.stringify(v); if (s.length < 95000) cache.put(k, s, ttl || W8_CACHE_TTL); } catch (e) { /* cache is best effort */ } }
  function cdel(k) { try { cache.remove(k); } catch (e) { /* ignore */ } }
  function fmt(ms) { return ms ? Utilities.formatDate(new Date(ms), tz, 'yyyy-MM-dd HH:mm:ss') : ''; }

  /* ---------------- sessions ---------------- */
  function sessRow(sh, id) {
    var rc = cache.get('r:' + id);
    if (rc) { var row = Number(rc); if (row >= 2 && row <= sh.getLastRow() && String(sh.getRange(row, 1).getValue()) === id) return row; }
    var last = sh.getLastRow();
    if (last < 2) return 0;
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) { cache.put('r:' + id, String(i + 2), W8_CACHE_TTL); return i + 2; }
    return 0;
  }
  function parse(v) { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function rowFor(s) {
    return [s.studentId, s.token || '', s.tokenExp || '', s.status, s.block, s.lastName, s.firstName, JSON.stringify(s), fmt(Date.now())];
  }

  var store = {
    /* ---- locking: re-entrant script lock; a busy lock becomes a retryable API error instead of a crash ---- */
    withLock: function (fn) {
      if (depth > 0) return fn();
      var lock = LockService.getScriptLock();
      try { lock.waitLock(20000); } catch (e) { throw new W8Core.ApiError('BUSY', 'The server is busy right now. Your answer was not lost; it is sent again automatically.'); }
      depth++;
      try { return fn(); } finally { depth--; lock.releaseLock(); }
    },

    /* ---- config ---- */
    getConfig: function () {
      var c = cget('cfg'); if (c) return c;
      var sh = sheet(W8_TABS.CONFIG), last = sh.getLastRow();
      var vals = last >= 2 ? sh.getRange(2, 1, last - 1, 2).getValues() : [];
      var cfg = { classCodes: {}, defaultMinutes: 90, showScore: true, open: true, disabledItems: [] };
      vals.forEach(function (r) {
        var k = String(r[0]), v = r[1];
        if (k.indexOf('code:') === 0) { if (String(v).trim()) cfg.classCodes[k.slice(5)] = String(v).trim(); }
        else if (k === 'defaultMinutes') cfg.defaultMinutes = Number(v) || 90;
        else if (k === 'showScore') cfg.showScore = !(v === false || String(v).toUpperCase() === 'FALSE');
        else if (k === 'open') cfg.open = !(v === false || String(v).toUpperCase() === 'FALSE');
        else if (k === 'disabledItems') cfg.disabledItems = String(v || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      });
      cput('cfg', cfg, 30); // 30 s: a code typed directly into the Config tab takes effect within half a minute
      return cfg;
    },
    setConfig: function (cfg) {
      var sh = sheet(W8_TABS.CONFIG);
      var rows = [];
      W8Core.BLOCKS.forEach(function (b) { rows.push(['code:' + b, cfg.classCodes[b] || '', 'Class code for ' + b]); });
      rows.push(['defaultMinutes', cfg.defaultMinutes, 'Minutes allowed from the moment a student presses Begin']);
      rows.push(['showScore', !!cfg.showScore, 'TRUE shows the score on the completion page']);
      rows.push(['open', !!cfg.open, 'FALSE stops new sign-ins']);
      rows.push(['disabledItems', (cfg.disabledItems || []).join(','), 'Comma-separated item ids that are turned off']);
      var meta = []; var last = sh.getLastRow();
      var existing = last >= 2 ? sh.getRange(2, 1, last - 1, 3).getValues() : [];
      existing.forEach(function (r) { var k = String(r[0]); if (!/^(code:|defaultMinutes|showScore|open|disabledItems)/.test(k) && k) meta.push([r[0], r[1], r[2]]); });
      var all = rows.concat(meta);
      sh.getRange(2, 1, Math.max(sh.getMaxRows() - 1, all.length), 3).clearContent();
      sh.getRange(2, 2, all.length, 1).setNumberFormat('@');
      sh.getRange(2, 1, all.length, 3).setValues(all);
      cdel('cfg');
    },
    getTeacherHash: function () { return parse(props.getProperty('TEACHER_HASH')); },
    setTeacherHash: function (h) { props.setProperty('TEACHER_HASH', JSON.stringify(h)); },

    /* ---- item bank ---- */
    getBank: function () {
      if (memo.bank) return memo.bank;
      var n = Number(cache.get('bank:n') || 0), bank = null;
      if (n) {
        var parts = [];
        for (var i = 0; i < n; i++) { var p = cache.get('bank:' + i); if (p == null) { parts = null; break; } parts.push(p); }
        if (parts) bank = parse(parts.join(''));
      }
      if (!bank) {
        var sh = sheet(W8_TABS.BANK), last = sh.getLastRow();
        if (last < 2) throw new Error('The item bank is empty. Run Unit 8 > 4. Load item bank (see SETUP.md step 6).');
        var rows = sh.getRange(2, 1, last - 1, 7).getValues();
        var metaRaw = props.getProperty('BANK_META');
        bank = { meta: parse(metaRaw) || {}, items: {} };
        rows.forEach(function (r) {
          var j = parse(r[6]); if (!j) return;
          bank.items[String(r[0])] = { id: String(r[0]), chapter: r[1], type: r[2], points: Number(r[3]), order: Number(r[4]), unlockAfter: r[5] ? String(r[5]) : null, struct: j.struct, key: j.key, hints: j.hints, explanation: j.explanation, feedback: j.feedback || null };
        });
        var s = JSON.stringify(bank), chunks = Math.ceil(s.length / 90000);
        try { for (var c = 0; c < chunks; c++) cache.put('bank:' + c, s.slice(c * 90000, (c + 1) * 90000), W8_CACHE_TTL); cache.put('bank:n', String(chunks), W8_CACHE_TTL); } catch (e) { /* best effort */ }
      }
      memo.bank = bank; return bank;
    },

    /* ---- sessions ---- */
    findSessionById: function (id) {
      var c = cget('s:' + id); if (c) return c;
      var sh = sheet(W8_TABS.SESS), row = sessRow(sh, id); if (!row) return null;
      var s = parse(sh.getRange(row, 8).getValue()); if (s) cput('s:' + id, s);
      return s;
    },
    findSessionByToken: function (tok) {
      if (!tok) return null;
      var id = cache.get('t:' + tok);
      if (id === 'PREVIEW') { var p = store.getPreview(); return p && p.token === tok ? p : null; }
      if (id) { var s = store.findSessionById(id); if (s && s.token === tok) return s; }
      var prev = store.getPreview(); if (prev && prev.token === tok) return prev;
      var sh = sheet(W8_TABS.SESS), last = sh.getLastRow(); if (last < 2) return null;
      var toks = sh.getRange(2, 2, last - 1, 1).getValues();
      for (var i = 0; i < toks.length; i++) if (String(toks[i][0]) === tok) { var found = parse(sh.getRange(i + 2, 8).getValue()); if (found && found.token === tok) { cput('s:' + found.studentId, found); cache.put('t:' + tok, found.studentId, W8_CACHE_TTL); return found; } }
      return null;
    },
    saveSession: function (s) {
      if (s.preview) {
        var ps = sheet(W8_TABS.PREV); ps.getRange(2, 1, 1, 9).setValues([rowFor(s)]);
        cput('p', s); if (s.token) cache.put('t:' + s.token, 'PREVIEW', W8_CACHE_TTL); return;
      }
      var sh = sheet(W8_TABS.SESS), row = sessRow(sh, s.studentId), vals = rowFor(s);
      if (!row) { sh.appendRow(vals); row = sh.getLastRow(); cache.put('r:' + s.studentId, String(row), W8_CACHE_TTL); }
      else sh.getRange(row, 1, 1, 9).setValues([vals]);
      cput('s:' + s.studentId, s);
      if (s.token) cache.put('t:' + s.token, s.studentId, W8_CACHE_TTL);
    },
    listSessions: function (f) {
      if (f && f.preview) { var p = store.getPreview(); return p ? [p] : []; }
      var sh = sheet(W8_TABS.SESS), last = sh.getLastRow(); if (last < 2) return [];
      return sh.getRange(2, 8, last - 1, 1).getValues().map(function (r) { return parse(r[0]); }).filter(Boolean);
    },
    getPreview: function () {
      var c = cget('p'); if (c) return c;
      var v = sheet(W8_TABS.PREV).getRange(2, 8).getValue(); var s = parse(v); if (s) cput('p', s); return s;
    },
    clearPreview: function () { sheet(W8_TABS.PREV).getRange(2, 1, 1, 9).clearContent(); cdel('p'); },

    /* ---- logs ---- */
    appendResponse: function (r) {
      if (r.preview) return; // preview answers live only in the PreviewSessions row, never in the student log
      sheet(W8_TABS.RESP).appendRow([fmt(r.ts), r.studentId, r.block, r.epoch, r.itemId, r.attempt, r.correct, r.credit == null ? '' : r.credit, JSON.stringify(r.response), r.reqId, r.ts]);
    },
    appendHistory: function (h) {
      sheet(W8_TABS.HIST).appendRow([fmt(h.resetAt), h.studentId, h.lastName, h.firstName, h.block, h.resetNo, h.status, h.result ? h.result.percent : '', h.result ? h.result.points : '', h.reason || '', JSON.stringify(h)]);
    },
    listHistory: function () {
      var sh = sheet(W8_TABS.HIST), last = sh.getLastRow(); if (last < 2) return [];
      return sh.getRange(2, 11, last - 1, 1).getValues().map(function (r) { return parse(r[0]); }).filter(Boolean);
    },

    /* ---- teacher tokens + throttle (cache only: a lost token just means the teacher signs in again) ---- */
    putTeacherToken: function (tok, exp) { cache.put('tt:' + tok, String(exp), 7200); },
    getTeacherTokenExp: function (tok) { return Number(cache.get('tt:' + tok) || 0); },
    delTeacherToken: function (tok) { cdel('tt:' + tok); },
    getCounter: function (k) { return Number(cache.get('ctr:' + k) || 0); },
    bumpCounter: function (k, ttl) { cache.put('ctr:' + k, String(Number(cache.get('ctr:' + k) || 0) + 1), ttl); },
    clearCounter: function (k) { cdel('ctr:' + k); },
    sleep: function (ms) { Utilities.sleep(ms); },

    /* ---- sheet views: refreshed on key events here, and rebuilt in full by the 5-minute trigger ---- */
    onSessionChanged: function (s, reason) {
      if (['begin', 'final', 'auto', 'reset', 'time'].indexOf(reason) < 0) return;
      try { w8UpsertDashboardRows_(s, store); } catch (e) { console.error('dashboard upsert failed: ' + e); }
    },
    syncNow: function () { w8SyncDashboards_(store); },
    selfTest: function (add) {
      try { add('Google Sheet', true, ss().getName()); } catch (e) { add('Google Sheet', false, String(e)); }
      var missing = [];
      [W8_TABS.MASTER, W8_TABS.CONFIG, W8_TABS.BANK, W8_TABS.RESP, W8_TABS.SESS, W8_TABS.HIST, W8_TABS.PREV].concat(W8Core.BLOCKS).forEach(function (n) { if (!ss().getSheetByName(n)) missing.push(n); });
      add('All tabs exist', !missing.length, missing.length ? 'Missing: ' + missing.join(', ') + '. Run Unit 8 > 1. Set up workbook.' : '');
      var trig = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'sweepExpired'; });
      add('5-minute auto-submit timer installed', trig.length > 0, trig.length ? '' : 'Run Unit 8 > 5. Install timer.');
      try { var l = LockService.getScriptLock(); var got = l.tryLock(2000); if (got) l.releaseLock(); add('Locking works', got, got ? '' : 'Could not get the lock (busy?)'); } catch (e) { add('Locking works', false, String(e)); }
      try { var t = 'selftest-' + Date.now(); cache.put(t, '1', 30); add('Cache works', cache.get(t) === '1', ''); } catch (e) { add('Cache works', false, String(e)); }
      add('Web app execution identity', true, 'Runs as the account that deployed it (' + (Session.getEffectiveUser().getEmail() || 'owner') + ').');
    }
  };
  return store;
}
