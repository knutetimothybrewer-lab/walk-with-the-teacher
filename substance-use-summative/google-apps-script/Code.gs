/**
 * SIGNAL: Substance Use Summative. Results backend for Google Sheets.
 *
 * Paste this file into an Apps Script project as Code.gs, and paste the generated KeyData.gs next to it.
 * Then run setup() once, and deploy as a Web App (see docs/GOOGLE_SHEETS_SETUP.md).
 *
 * What it does
 *   - validate : checks a class code against the "Config" tab (DEMO2026 is always accepted and marked DEMO)
 *   - start    : registers a session (one row in the hidden-ish "Sessions" tab)
 *   - check    : (server-grading mode) grades one attempt and counts it on the server
 *   - submit   : re-scores the submission from the recorded attempts, writes the Summary and Questions tabs
 *   - status   : lets a student's browser learn that the teacher reset the assessment
 *   - t_*      : teacher dashboard calls, protected by the TEACHER_PASSCODE script property
 *
 * Security note: a web page cannot be made tamper-proof. This script re-checks every submitted attempt against
 * the key in KeyData.gs, enforces the 3-attempt limit per question, refuses duplicates, and flags mismatches.
 */

var APP_VERSION = '1.0.0';
var TABS = { summary: 'Summary', questions: 'Questions', analytics: 'Analytics', config: 'Config', sessions: 'Sessions' };
var CREDIT = [1, 0.85, 0.75];
var DOMAIN_NAMES = {
  brain: 'Brain & Addiction', nicotine: 'Nicotine, Tobacco & Vaping', alcohol: 'Alcohol',
  cannabisRx: 'Cannabis & Prescription Drugs', opioid: 'Opioids, Fentanyl & Emergency Response',
  decision: 'Decision-Making & Refusal', literacy: 'Health Literacy'
};
var DOMAIN_ORDER = ['brain', 'nicotine', 'alcohol', 'cannabisRx', 'opioid', 'decision', 'literacy'];
var DEMO_CODE = 'DEMO2026';

var SUMMARY_HEADERS = ['Timestamp', 'Student Name', 'Class Code', 'Period', 'Assessment Version', 'Version ID', 'Start Time', 'Completion Time',
  'Total Time (min)', 'Raw Score', 'Points Possible', 'Percentage', 'Questions Correct First Attempt', 'Questions Correct Second Attempt',
  'Questions Correct Third Attempt', 'Questions Missed', 'Completion Status', 'Mode', 'Integrity', 'Session ID', 'Confirmation ID']
  .concat(DOMAIN_ORDER.map(function (d) { return 'Domain: ' + DOMAIN_NAMES[d] + ' (%)'; }));
var QUESTION_HEADERS = ['Timestamp', 'Student', 'Class Code', 'Period', 'Session ID', 'Mode', 'Question ID', 'Topic', 'Domain', 'Question Type',
  'Attempt 1', 'Attempt 2', 'Attempt 3', 'Final Result', 'Points Earned', 'Points Possible', 'Last Attempt Time', 'Responses (canonical)'];
var SESSION_HEADERS = ['Session ID', 'Name', 'NameKey', 'Period', 'Class Code', 'Mode', 'Version ID', 'Content Version', 'Started', 'Last Seen', 'Status', 'Attempts JSON', 'Stage IDs', 'Confirmation ID'];
var CONFIG_HEADERS = ['Class Code', 'Label', 'Active', 'Period'];

// ============================================================================================ entry points
function doGet() { return json_({ ok: true, app: 'SIGNAL', version: APP_VERSION, contentVersion: typeof CONTENT_VERSION !== 'undefined' ? CONTENT_VERSION : null }); }

function doPost(e) {
  var out;
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try { out = route_(body); } finally { lock.releaseLock(); }
  } catch (err) {
    out = { ok: false, error: 'server-error', detail: String(err && err.message || err) };
  }
  return json_(out);
}

function route_(b) {
  switch (b.action) {
    case 'ping': return { ok: true, app: 'SIGNAL', version: APP_VERSION, sheets: ss_().getName() };
    case 'validate': return validate_(b);
    case 'classes': return classes_();
    case 'start': return start_(b);
    case 'check': return check_(b);
    case 'submit': return submit_(b);
    case 'status': return status_(b);
    case 't_dashboard': return teacher_(b, dashboard_);
    case 't_reset': return teacher_(b, reset_);
    case 't_analytics': return teacher_(b, function () { rebuildAnalytics(); return { ok: true }; });
    default: return { ok: false, error: 'unknown-action' };
  }
}

// ============================================================================================ setup (run once)
/** Creates the tabs with headers, example class codes, and a default teacher passcode. Safe to run again. */
function setup() {
  var ss = ss_();
  ensureSheet_(ss, TABS.summary, SUMMARY_HEADERS);
  ensureSheet_(ss, TABS.questions, QUESTION_HEADERS);
  var cfg = ensureSheet_(ss, TABS.config, CONFIG_HEADERS);
  if (String(cfg.getRange(1, 4).getValue()) === '') cfg.getRange(1, 4).setValue('Period').setFontWeight('bold').setBackground('#10203a').setFontColor('#ffffff');
  ensureSheet_(ss, TABS.sessions, SESSION_HEADERS);
  ensureSheet_(ss, TABS.analytics, ['Analytics are written here by "Rebuild analytics" (SIGNAL menu) and after each real submission.']);
  if (cfg.getLastRow() < 2) {
    cfg.getRange(2, 1, 3, 4).setValues([['HEALTH2', 'Period 2 (EXAMPLE: CHANGE ME)', true, '2'], ['HEALTH3', 'Period 3 (EXAMPLE: CHANGE ME)', true, '3'], ['HEALTH5', 'Period 5 (EXAMPLE: CHANGE ME)', true, '5']]);
  }
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TEACHER_PASSCODE')) props.setProperty('TEACHER_PASSCODE', 'ChangeMe-' + Math.floor(1000 + Math.random() * 9000));
  createClassTabs();
  Logger.log('Setup complete. Teacher dashboard passcode: ' + props.getProperty('TEACHER_PASSCODE') + '  (change it in Project Settings > Script properties)');
  SpreadsheetApp.getActive().toast('SIGNAL setup complete. See View > Logs for your teacher passcode.');
}

/** Creates one empty results tab per active class in the Config tab. Run from the SIGNAL menu or after editing Config. */
function createClassTabs() {
  var sh = sheet_(TABS.config), rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues() : [], made = [];
  rows.forEach(function (r) {
    var active = r[2]; if (!r[0] || active === false || ['FALSE', 'NO'].indexOf(String(active).toUpperCase()) >= 0) return;
    var cls = { demo: false, label: String(r[1] || ''), period: String(r[3] || '') };
    made.push(classTab_(cls, r[0]).getName());
  });
  try { SpreadsheetApp.getActive().toast('Class tabs ready: ' + made.join(', ')); } catch (e) { /* no UI */ }
  return made;
}
function onOpen() {
  try { SpreadsheetApp.getUi().createMenu('SIGNAL').addItem('Create class tabs', 'createClassTabs').addItem('Rebuild analytics', 'rebuildAnalytics').addItem('Run setup', 'setup').addToUi(); } catch (e) { /* not bound to a sheet */ }
}
function ensureSheet_(ss, name, headers) {
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0 || String(sh.getRange(1, 1).getValue()) === '') {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#10203a').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  }
  return sh;
}

// ============================================================================================ helpers
function ss_() { var a = SpreadsheetApp.getActive(); if (a) return a; var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID'); if (id) return SpreadsheetApp.openById(id); throw new Error('Open the script from inside your Google Sheet (Extensions > Apps Script), or set the SHEET_ID script property.'); }
function sheet_(name) { var s = ss_().getSheetByName(name); if (!s) { setup(); s = ss_().getSheetByName(name); } return s; }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function norm_(s) { return String(s || '').trim().replace(/\s+/g, ' '); }
function nameKey_(n) { return norm_(n).toLowerCase(); }
function codeKey_(c) { return norm_(c).toUpperCase(); }
function sha256hex_(s) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8).map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function ansHash_(qid, canon) { return sha256hex_(KEY_SALT + '|' + qid + '|' + canon).slice(0, 20); }
function round2_(x) { return Math.round(x * 100) / 100; }
function confirmId_(sid) { return 'SIG-' + sha256hex_('confirm|' + sid).slice(0, 8).toUpperCase(); }

function classLookup_(code) {
  var c = codeKey_(code);
  if (c === DEMO_CODE) return { ok: true, label: 'DEMO', demo: true };
  var sh = sheet_(TABS.config), rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues() : [];
  for (var i = 0; i < rows.length; i++) {
    if (codeKey_(rows[i][0]) === c) {
      var active = rows[i][2]; if (active === false || String(active).toUpperCase() === 'FALSE' || String(active).toUpperCase() === 'NO') return { ok: false, error: 'invalid-code' };
      return { ok: true, label: String(rows[i][1] || ''), demo: false, period: String(rows[i][3] || '') };
    }
  }
  return { ok: false, error: 'invalid-code' };
}

/** Finds session rows. Returns {row, vals} or null. Searches column A for the session id. */
function findSession_(sid) {
  var sh = sheet_(TABS.sessions); if (sh.getLastRow() < 2) return null;
  var f = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(sid).matchEntireCell(true).findNext();
  if (!f) return null;
  var row = f.getRow(); return { sh: sh, row: row, vals: sh.getRange(row, 1, 1, SESSION_HEADERS.length).getValues()[0] };
}
/** The most recent non-demo session row for a student + class code. */
function latestFor_(name, code) {
  var sh = sheet_(TABS.sessions); if (sh.getLastRow() < 2) return null;
  var rows = sh.getRange(2, 1, sh.getLastRow() - 1, SESSION_HEADERS.length).getValues(), nk = nameKey_(name), ck = codeKey_(code), best = null;
  for (var i = 0; i < rows.length; i++) if (rows[i][2] === nk && codeKey_(rows[i][4]) === ck && rows[i][5] !== 'DEMO') best = { row: i + 2, vals: rows[i] };
  return best;
}


/** One tab per class: named after the Config tab's Label (or Period, or the code). DEMO runs go to a "DEMO" tab. */
function classTabName_(cls, code) {
  var raw = cls.demo ? 'DEMO' : String(cls.label || cls.period || code);
  var name = raw.replace(/[\[\]*?:\/\\]/g, '-').trim().slice(0, 90) || codeKey_(code);
  for (var k in TABS) if (TABS[k].toLowerCase() === name.toLowerCase()) name = name + ' (class)';
  return name;
}
function classTab_(cls, code) { return ensureSheet_(ss_(), classTabName_(cls, code), SUMMARY_HEADERS); }

// ============================================================================================ actions
/** Public list for the sign-in drop-down: class labels and periods only. Codes are never returned. */
function classes_() {
  var sh = sheet_(TABS.config), rows = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues() : [], seen = {}, out = [];
  rows.forEach(function (r) {
    var active = r[2]; if (!r[0] || active === false || ['FALSE', 'NO'].indexOf(String(active).toUpperCase()) >= 0) return;
    var period = String(r[3] || '').trim(), label = String(r[1] || '').trim(), value = period || label || String(r[0]);
    if (seen[value]) return; seen[value] = true; out.push({ value: value, label: label || ('Period ' + period) });
  });
  return { ok: true, classes: out };
}

function validate_(b) {
  var cls = classLookup_(b.code); if (!cls.ok) return cls;
  if (!cls.demo && b.name) {
    var l = latestFor_(b.name, b.code);
    if (l) { if (l.vals[10] === 'completed') return { ok: false, error: 'already-completed' }; if (l.vals[10] === 'reset') return { ok: true, label: cls.label, demo: false, reset: true }; }
  }
  return { ok: true, label: cls.label, demo: cls.demo, period: cls.period || '' };
}

function start_(b) {
  var s = b.student || {}, cls = classLookup_(s.code); if (!cls.ok) return cls;
  var sid = String(b.sid || ''); if (!sid) return { ok: false, error: 'bad-request' };
  if (findSession_(sid)) return { ok: true, resumed: true };
  if (!cls.demo) { var l = latestFor_(s.name, s.code); if (l && l.vals[10] === 'completed') return { ok: false, error: 'already-completed' }; }
  sheet_(TABS.sessions).appendRow([sid, norm_(s.name), nameKey_(s.name), String(cls.period || s.period), codeKey_(s.code), cls.demo ? 'DEMO' : 'LIVE', b.versionId || '', b.contentVersion || '',
    new Date(b.startedAt || Date.now()), new Date(), 'started', '{}', JSON.stringify(b.stageIds || []), '']);
  return { ok: true };
}

/** Server-grading mode: grade one attempt and count it here. Idempotent per (session, question, attempt number). */
function check_(b) {
  var se = findSession_(String(b.sid || '')); if (!se) return { ok: false, error: 'no-session' };
  if (se.vals[10] === 'completed') return { ok: false, error: 'already-completed' };
  var k = KEY[b.qid]; if (!k) return { ok: false, error: 'unknown-question' };
  var att = {}; try { att = JSON.parse(se.vals[11] || '{}'); } catch (e) { att = {}; }
  var list = att[b.qid] || [];
  var n = Number(b.n);
  if (n >= 1 && n <= list.length) { var prev = list[n - 1]; return { ok: true, correct: !!prev.c, replay: true, explain: prev.c ? undefined : (list.length >= 3 ? k.x : undefined) }; }
  if (list.some(function (x) { return x.c; }) || list.length >= 3) return { ok: false, error: 'locked' };
  if (n !== list.length + 1) return { ok: false, error: 'out-of-order' };
  var correct = k.h.indexOf(ansHash_(b.qid, String(b.resp))) >= 0;
  list.push({ r: String(b.resp).slice(0, 400), c: correct, t: Date.now() }); att[b.qid] = list;
  se.sh.getRange(se.row, 10).setValue(new Date()); se.sh.getRange(se.row, 12).setValue(JSON.stringify(att));
  return { ok: true, correct: correct, explain: !correct && list.length >= 3 ? k.x : undefined };
}

function status_(b) {
  var se = b.sid ? findSession_(String(b.sid)) : null;
  if (se && se.vals[10] === 'reset') return { ok: true, reset: true };
  if (!se && b.name && b.code) { var l = latestFor_(b.name, b.code); if (l && l.vals[10] === 'reset') return { ok: true, reset: true }; }
  return { ok: true, reset: false, status: se ? se.vals[10] : 'unknown' };
}

/** Scores a list of attempts [{q, n, c}] against KEY for the questions in the student's plan. */
function score_(stageIds, attempts) {
  var plan = {}; (stageIds || []).forEach(function (s) { plan[s] = true; });
  var byQ = {}; (attempts || []).forEach(function (a) { (byQ[a.q] = byQ[a.q] || []).push(a); });
  var rows = [], tot = { earned: 0, possible: 0, first: 0, second: 0, third: 0, missed: 0, byDomain: {} };
  DOMAIN_ORDER.forEach(function (d) { tot.byDomain[d] = { e: 0, p: 0 }; });
  Object.keys(KEY).forEach(function (qid) {
    var k = KEY[qid]; if (!plan[k.s]) return;
    var list = (byQ[qid] || []).filter(function (a) { return a.n >= 1 && a.n <= 3; }).sort(function (x, y) { return x.n - y.n; });
    var seen = {}, results = [], earned = 0, final = 'Not answered', hitN = 0;
    list.forEach(function (a) {
      if (seen[a.n] || hitN) return; seen[a.n] = true;
      var ok = k.h.indexOf(ansHash_(qid, String(a.c))) >= 0;
      results.push({ ok: ok, resp: String(a.c), t: a.t }); if (ok) hitN = a.n;
    });
    if (hitN) { earned = round2_(k.p * CREDIT[hitN - 1]); final = hitN === 1 ? 'Correct (attempt 1)' : hitN === 2 ? 'Correct (attempt 2)' : 'Correct (attempt 3)'; if (hitN === 1) tot.first++; else if (hitN === 2) tot.second++; else tot.third++; }
    else if (results.length >= 3) { final = 'Missed (locked)'; tot.missed++; } else if (results.length) { final = 'Incomplete'; tot.missed++; } else tot.missed++;
    tot.earned += earned; tot.possible += k.p; tot.byDomain[k.d].e += earned; tot.byDomain[k.d].p += k.p;
    rows.push({ qid: qid, k: k, results: results, earned: earned, final: final });
  });
  tot.earned = round2_(tot.earned); tot.possible = round2_(tot.possible);
  return { tot: tot, rows: rows };
}

function submit_(b) {
  var s = b.student || {}, cls = classLookup_(s.code); if (!cls.ok) return cls;
  var sid = String(b.sid || ''); if (!sid) return { ok: false, error: 'bad-request' };
  var se = findSession_(sid);
  if (se && se.vals[10] === 'completed') return { ok: true, confirmationId: se.vals[13] || confirmId_(sid), duplicate: true };
  if (!cls.demo) { var l = latestFor_(s.name, s.code); if (l && l.vals[10] === 'completed' && l.vals[0] !== sid) return { ok: false, error: 'already-completed' }; }
  // Prefer the attempts recorded by the server (server-grading mode); otherwise use what the browser sent.
  var attempts = (b.attempts || []);
  if (se) { var att = {}; try { att = JSON.parse(se.vals[11] || '{}'); } catch (e) { att = {}; } var srv = []; Object.keys(att).forEach(function (q) { att[q].forEach(function (x, i) { srv.push({ q: q, n: i + 1, c: x.r, t: x.t }); }); }); if (srv.length) attempts = srv; }
  var stageIds = b.stageIds || (se ? JSON.parse(se.vals[12] || '[]') : []);
  var sc = score_(stageIds, attempts), t = sc.tot;
  var mismatch = b.clientScore && Math.abs(Number(b.clientScore.earned) - t.earned) > 0.01;
  var pct = t.possible ? Math.round(t.earned / t.possible * 1000) / 10 : 0;
  var mode = cls.demo ? 'DEMO' : 'LIVE', now = new Date(), conf = confirmId_(sid);
  var started = new Date(b.startedAt || now), done = new Date(b.completedAt || now);
  var integrity = (b.tamper ? 'Local data modified' : 'OK') + (mismatch ? '; client/server score mismatch' : '');
  var displayName = (cls.demo ? '[DEMO] ' : '') + norm_(s.name);
  var doms = DOMAIN_ORDER.map(function (d) { var x = t.byDomain[d]; return x.p ? Math.round(x.e / x.p * 1000) / 10 : ''; });
  sheet_(TABS.summary).appendRow([now, displayName, codeKey_(s.code), String(cls.period || s.period), b.contentVersion || CONTENT_VERSION, b.versionId || '', started, done,
    Math.round((Number(b.activeMs) || (done - started)) / 600) / 100, t.earned, t.possible, pct, t.first, t.second, t.third, t.missed,
    cls.demo ? 'DEMO: completed' : 'Completed', mode, integrity, sid, conf].concat(doms));
  var summaryRow = sheet_(TABS.summary).getRange(sheet_(TABS.summary).getLastRow(), 1, 1, SUMMARY_HEADERS.length).getValues()[0];
  try { classTab_(cls, s.code).appendRow(summaryRow); } catch (e) { /* the master Summary row is already saved */ }
  var qrows = sc.rows.map(function (r) {
    var cell = function (i) { return r.results[i] ? (r.results[i].ok ? 'Correct' : 'Incorrect') : ''; };
    var last = r.results.length ? new Date(r.results[r.results.length - 1].t || now) : '';
    return [now, displayName, codeKey_(s.code), String(cls.period || s.period), sid, mode, r.qid, r.k.t, DOMAIN_NAMES[r.k.d], r.k.y, cell(0), cell(1), cell(2), r.final, r.earned, r.k.p, last,
      r.results.map(function (x) { return x.resp; }).join(' || ').slice(0, 500)];
  });
  if (qrows.length) { var qs = sheet_(TABS.questions); qs.getRange(qs.getLastRow() + 1, 1, qrows.length, QUESTION_HEADERS.length).setValues(qrows); }
  if (se) { se.sh.getRange(se.row, 10, 1, 1).setValue(now); se.sh.getRange(se.row, 11).setValue('completed'); se.sh.getRange(se.row, 14).setValue(conf); }
  else sheet_(TABS.sessions).appendRow([sid, norm_(s.name), nameKey_(s.name), String(cls.period || s.period), codeKey_(s.code), mode, b.versionId || '', b.contentVersion || '', started, now, 'completed', '{}', JSON.stringify(stageIds), conf]);
  if (!cls.demo) { try { rebuildAnalytics(); } catch (e) { /* analytics are optional */ } }
  return { ok: true, confirmationId: conf, score: { earned: t.earned, possible: t.possible }, mismatch: !!mismatch };
}

// ============================================================================================ teacher
function teacher_(b, fn) {
  var cache = CacheService.getScriptCache(), fails = Number(cache.get('tfail') || 0);
  if (fails >= 8) return { ok: false, error: 'locked-out' };
  var real = PropertiesService.getScriptProperties().getProperty('TEACHER_PASSCODE');
  if (!real || String(b.pass) !== real) { cache.put('tfail', String(fails + 1), 600); return { ok: false, error: 'bad-passcode' }; }
  cache.remove('tfail'); return fn(b);
}
function dashboard_() {
  var sum = sheet_(TABS.summary), qs = sheet_(TABS.questions), ses = sheet_(TABS.sessions);
  var sRows = sum.getLastRow() > 1 ? sum.getRange(2, 1, sum.getLastRow() - 1, SUMMARY_HEADERS.length).getValues() : [];
  var qRows = qs.getLastRow() > 1 ? qs.getRange(2, 1, qs.getLastRow() - 1, QUESTION_HEADERS.length).getValues() : [];
  var sessRows = ses.getLastRow() > 1 ? ses.getRange(2, 1, ses.getLastRow() - 1, SESSION_HEADERS.length).getValues() : [];
  var students = sessRows.map(function (r) {
    var sm = sRows.filter(function (x) { return x[19] === r[0]; })[0];
    var att = {}; try { att = JSON.parse(r[11] || '{}'); } catch (e) { att = {}; }
    var used = 0; Object.keys(att).forEach(function (q) { used += att[q].length; });
    return { sid: r[0], name: r[1], period: r[3], code: r[4], mode: r[5], versionId: r[6], started: r[8], status: r[10], attemptsServer: used,
      score: sm ? sm[9] : null, possible: sm ? sm[10] : null, pct: sm ? sm[11] : null, minutes: sm ? sm[8] : null, domains: sm ? sm.slice(21) : null, integrity: sm ? sm[18] : null, confirmation: r[13] };
  });
  var stats = {};
  qRows.forEach(function (r) {
    if (r[5] !== 'LIVE') return; var q = r[6]; var s = stats[q] || (stats[q] = { qid: q, topic: r[7], domain: r[8], n: 0, first: 0, correct: 0, missed: 0, attempts: 0 });
    s.n++; s.attempts += (r[10] ? 1 : 0) + (r[11] ? 1 : 0) + (r[12] ? 1 : 0);
    if (r[13] === 'Correct (attempt 1)') s.first++; if (String(r[13]).indexOf('Correct') === 0) s.correct++; if (String(r[13]).indexOf('Missed') === 0) s.missed++;
  });
  var qstats = Object.keys(stats).map(function (q) { var s = stats[q]; return { qid: q, topic: s.topic, domain: s.domain, n: s.n, firstPct: Math.round(s.first / s.n * 100), correctPct: Math.round(s.correct / s.n * 100), missedPct: Math.round(s.missed / s.n * 100), avgAttempts: Math.round(s.attempts / s.n * 100) / 100 }; });
  var byClass = {};
  sRows.forEach(function (r) { if (r[17] !== 'LIVE') return; var c = r[2]; var o = byClass[c] || (byClass[c] = { code: c, n: 0, sum: 0 }); o.n++; o.sum += Number(r[11]) || 0; });
  var classes = Object.keys(byClass).map(function (c) { return { code: c, n: byClass[c].n, avg: Math.round(byClass[c].sum / byClass[c].n * 10) / 10 }; });
  return { ok: true, students: students, questions: qstats, classes: classes, domainNames: DOMAIN_NAMES, domainOrder: DOMAIN_ORDER, serverTime: new Date() };
}
/** Teacher reset: marks the student's session "reset" so they can start a fresh attempt. Old rows are kept and flagged. */
function reset_(b) {
  var se = b.sid ? findSession_(String(b.sid)) : null;
  if (!se && b.name && b.code) { var l = latestFor_(b.name, b.code); if (l) se = { sh: sheet_(TABS.sessions), row: l.row, vals: l.vals }; }
  if (!se) return { ok: false, error: 'not-found' };
  se.sh.getRange(se.row, 11).setValue('reset'); se.sh.getRange(se.row, 10).setValue(new Date());
  var sum = sheet_(TABS.summary);
  var tabs = [sum]; try { tabs.push(classTab_(classLookup_(se.vals[4]), se.vals[4])); } catch (e) { /* class tab optional */ }
  tabs.forEach(function (t) { if (t.getLastRow() > 1) { var f = t.getRange(2, 20, t.getLastRow() - 1, 1).createTextFinder(String(se.vals[0])).matchEntireCell(true).findNext(); if (f) t.getRange(f.getRow(), 17).setValue('Reset by teacher (superseded)'); } });
  return { ok: true };
}

// ============================================================================================ analytics tab
function rebuildAnalytics() {
  var ss = ss_(), sh = ss.getSheetByName(TABS.analytics) || ss.insertSheet(TABS.analytics);
  var sum = sheet_(TABS.summary), qs = sheet_(TABS.questions);
  var sRows = sum.getLastRow() > 1 ? sum.getRange(2, 1, sum.getLastRow() - 1, SUMMARY_HEADERS.length).getValues().filter(function (r) { return r[17] === 'LIVE' && String(r[16]).indexOf('Reset') !== 0; }) : [];
  var qRows = qs.getLastRow() > 1 ? qs.getRange(2, 1, qs.getLastRow() - 1, QUESTION_HEADERS.length).getValues().filter(function (r) { return r[5] === 'LIVE'; }) : [];
  var liveSids = {}; sRows.forEach(function (r) { liveSids[r[19]] = true; }); qRows = qRows.filter(function (r) { return liveSids[r[4]]; });
  var out = [['SIGNAL analytics (LIVE submissions only; demo and reset attempts excluded). Updated ' + new Date()], []];
  out.push(['CLASS SUMMARY']); out.push(['Class code', 'Students', 'Average %', 'Highest %', 'Lowest %']);
  var cls = {}; sRows.forEach(function (r) { (cls[r[2]] = cls[r[2]] || []).push(Number(r[11]) || 0); });
  Object.keys(cls).sort().forEach(function (c) { var a = cls[c]; out.push([c, a.length, round1_(avg_(a)), Math.max.apply(null, a), Math.min.apply(null, a)]); });
  if (sRows.length) { var all = sRows.map(function (r) { return Number(r[11]) || 0; }); out.push(['ALL', all.length, round1_(avg_(all)), Math.max.apply(null, all), Math.min.apply(null, all)]); }
  out.push([]); out.push(['AVERAGE SCORE BY CONTENT DOMAIN (%)']); out.push(['Domain', 'Average %']);
  var firstDom = SUMMARY_HEADERS.length - DOMAIN_ORDER.length;
  DOMAIN_ORDER.forEach(function (d, i) { var vals = sRows.map(function (r) { return r[firstDom + i]; }).filter(function (v) { return v !== ''; }).map(Number); out.push([DOMAIN_NAMES[d], vals.length ? round1_(avg_(vals)) : '']); });
  var stats = {};
  qRows.forEach(function (r) { var q = r[6]; var s = stats[q] || (stats[q] = { topic: r[7], dom: r[8], n: 0, first: 0, ok: 0, miss: 0, att: 0, pts: 0, poss: 0 });
    s.n++; s.att += (r[10] ? 1 : 0) + (r[11] ? 1 : 0) + (r[12] ? 1 : 0); s.pts += Number(r[14]) || 0; s.poss += Number(r[15]) || 0;
    if (r[13] === 'Correct (attempt 1)') s.first++; if (String(r[13]).indexOf('Correct') === 0) s.ok++; if (String(r[13]).indexOf('Missed') === 0) s.miss++; });
  out.push([]); out.push(['QUESTION DIFFICULTY (sorted from hardest)']); out.push(['Question ID', 'Topic', 'Domain', 'Students', '% correct first attempt', '% eventually correct', '% missed', 'Average attempts used', 'Average % of points']);
  var list = Object.keys(stats).map(function (q) { var s = stats[q]; return [q, s.topic, s.dom, s.n, Math.round(s.first / s.n * 100), Math.round(s.ok / s.n * 100), Math.round(s.miss / s.n * 100), Math.round(s.att / s.n * 100) / 100, s.poss ? Math.round(s.pts / s.poss * 100) : '']; });
  list.sort(function (a, b) { return a[4] - b[4]; }); list.forEach(function (r) { out.push(r); });
  var topics = {}; Object.keys(stats).forEach(function (q) { var s = stats[q]; var t = topics[s.topic] || (topics[s.topic] = { n: 0, miss: 0, pts: 0, poss: 0 }); t.n += s.n; t.miss += s.n - s.ok; t.pts += s.pts; t.poss += s.poss; });
  out.push([]); out.push(['MOST-MISSED CONCEPTS (share of responses not eventually correct)']); out.push(['Concept (topic)', 'Responses', '% not eventually correct', 'Average % of points']);
  Object.keys(topics).map(function (k) { return [k, topics[k].n, Math.round(topics[k].miss / topics[k].n * 100), topics[k].poss ? Math.round(topics[k].pts / topics[k].poss * 100) : '']; }).sort(function (a, b) { return b[2] - a[2]; }).slice(0, 15).forEach(function (r) { out.push(r); });
  sh.clear(); var w = out.reduce(function (m, r) { return Math.max(m, r.length); }, 1);
  var padded = out.map(function (r) { var c = r.slice(); while (c.length < w) c.push(''); return c; });
  sh.getRange(1, 1, padded.length, w).setValues(padded); sh.getRange(1, 1).setFontWeight('bold');
  sh.autoResizeColumns(1, Math.min(w, 9));
}
function avg_(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
function round1_(x) { return Math.round(x * 10) / 10; }

// ============================================================================================ self-test (run from the editor)
/** Step 9 of the setup guide: sends a fake DEMO submission and prints the result. Check the Summary tab afterwards. */
function sampleSubmission() {
  setup();
  var sid = 'S-TEST' + Math.floor(Math.random() * 1e6), stageIds = [];
  var seenStage = {}; Object.keys(KEY).forEach(function (q) { if (!seenStage[KEY[q].s]) { seenStage[KEY[q].s] = true; stageIds.push(KEY[q].s); } });
  var student = { name: 'Sample Student', period: '1', code: DEMO_CODE };
  Logger.log(JSON.stringify(start_({ sid: sid, student: student, versionId: 'V-TEST', contentVersion: CONTENT_VERSION, startedAt: Date.now() - 3000000, stageIds: stageIds })));
  var res = submit_({ sid: sid, student: student, versionId: 'V-TEST', contentVersion: CONTENT_VERSION, startedAt: Date.now() - 3000000, completedAt: Date.now(), activeMs: 2900000, stageIds: stageIds, attempts: [], clientScore: { earned: 0, possible: 100 } });
  Logger.log(JSON.stringify(res));
  SpreadsheetApp.getActive().toast('Sample DEMO row written to Summary and Questions. Result: ' + JSON.stringify(res));
}
