/**
 * Data.gs - the Google Sheet is the database. Everything that reads or writes a tab lives here, so the rest of the
 * code never touches the Sheet directly. Do not reorder or rename columns; the headers below are what the code expects.
 */

var SCHEMA = {
  Config:     ['key', 'value', 'notes'],
  Periods:    ['period', 'class_code', 'label'],
  Roster:     ['student_id', 'last', 'first', 'period', 'active'],
  Lessons:    ['sequence', 'lesson_id', 'unit', 'unit_title', 'day', 'title', 'objective', 'ticket_type'],
  Criteria:   ['criterion_id', 'lesson_id', 'text', 'observed'],
  ItemBank:   ['item_id', 'lesson_id', 'criterion_id', 'ticket_type', 'form', 'type', 'stem', 'options', 'rows', 'correct',
               'rationale', 'source_item_id', 'active'],
  Control:    ['period', 'lesson_id', 'phase', 'open', 'opened_at'],
  Responses:  ['timestamp', 'student_id', 'period', 'lesson_id', 'phase', 'item_id', 'criterion_id', 'ticket_type',
               'response', 'correct', 'points'],
  Scores:     ['timestamp', 'student_id', 'period', 'lesson_id', 'ticket_type', 'phase', 'raw', 'max', 'pct', 'seconds'],
  Growth:     ['student_id', 'last', 'first', 'period', 'lesson_id', 'ticket_type', 'sequence', 'pre_pct', 'post_pct', 'gain',
               'g', 'status', 'reached_mastery', 'ceiling'],
  ClassSummary: ['lesson_id', 'ticket_type', 'period', 'n_matched', 'n_pre_only', 'n_post_only', 'mean_pre', 'mean_post',
               'mean_gain', 'class_g', 'mean_individual_g', 'n_ceiling', 'dz', 'pct_mastery', 'pct_gained', 'pct_flat',
               'pct_declined'],
  CriterionMastery: ['criterion_id', 'lesson_id', 'period', 'n_students', 'pre_pct', 'post_pct', 'gain', 'reteach',
               'review_pre_pct', 'retention_drop', 'not_retained']
};

// Tabs the teacher edits (setup never wipes these) vs. tabs the system writes.
var TEXT_ID_COLUMNS = { Roster: 1, Responses: 2, Scores: 2, Growth: 1 };   // student_id columns kept as text (leading zeros)

var CONFIG_DEFAULTS = [
  ['ITEMS_PER_TICKET', 5, 'Items on a daily ticket (the item bank is written for 5).'],
  ['MASTERY_THRESHOLD', 80, 'Exit-ticket percent that counts as mastery.'],
  ['PARALLEL_FORMS', 'FALSE', 'TRUE = warm-up uses form A items and the exit ticket uses the matching form B items.'],
  ['PARTIAL_CREDIT', 'FALSE', 'TRUE = give partial credit on select-all and matching items.'],
  ['POST_FEEDBACK', 'full', 'full = students see right/wrong and the explanation after the exit ticket; score_only = just the scores.'],
  ['ONE_PER_SCREEN', 'FALSE', 'TRUE = students see one question at a time.'],
  ['SEMESTER_START', '', 'First day of the semester (YYYY-MM-DD). Used for weekly and semester summaries.'],
  ['SEMESTER_END', '', 'Last day of the semester (YYYY-MM-DD).']
];

var ctx_ = {};   // per-request memo; reset at the start of every request

function UserError(message) { this.message = message; this.isUserError = true; }
UserError.prototype = Object.create(Error.prototype);

function truthy_(v) { return v === true || /^(true|y|yes|1)$/i.test(String(v).trim()); }
function isDate_(v) { return Object.prototype.toString.call(v) === '[object Date]'; }
function iso_(v) { return isDate_(v) ? v.toISOString() : (v === null || v === undefined ? '' : String(v)); }
function str_(v) { return v === null || v === undefined ? '' : String(v).trim(); }

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(name) {
  var s = ss_().getSheetByName(name);
  if (!s) throw new UserError('The sheet is missing the "' + name + '" tab. Run Pre/Post Tickets > Set up sheet.');
  return s;
}

/** All rows of a tab as objects keyed by the header row. Blank rows are skipped. */
function table_(name) {
  var sh = sheet_(name), n = sh.getLastRow(), cols = sh.getLastColumn();
  if (n < 2 || cols < 1) return [];
  var vals = sh.getRange(1, 1, n, cols).getValues(), head = vals[0].map(str_), out = [];
  for (var i = 1; i < vals.length; i++) {
    var row = vals[i], empty = true, o = {};
    for (var j = 0; j < head.length; j++) { o[head[j]] = row[j]; if (row[j] !== '' && row[j] !== null) empty = false; }
    if (!empty) out.push(o);
  }
  return out;
}

/** Append rows (arrays in SCHEMA order) to a tab in one write. */
function append_(name, rows) {
  if (!rows.length) return;
  var sh = sheet_(name), at = sh.getLastRow() + 1;
  sh.getRange(at, 1, rows.length, rows[0].length).setValues(rows);
}

/** Replace the body of a tab (header stays). Used for the computed summary tabs. */
function replaceBody_(name, rows) {
  var sh = sheet_(name), cols = SCHEMA[name].length;
  var last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, cols).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, cols).setValues(rows);
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new UserError('The system is busy. Please try again in a moment.');
  try { return fn(); } finally { lock.releaseLock(); }
}

// ---------- config ----------
function config_() {
  if (ctx_.config) return ctx_.config;
  var c = {};
  CONFIG_DEFAULTS.forEach(function (d) { c[d[0]] = d[1]; });
  table_('Config').forEach(function (r) {
    var k = str_(r.key);
    if (k && r.value !== '' && r.value !== null) c[k] = r.value;
  });
  c.ITEMS_PER_TICKET = Number(c.ITEMS_PER_TICKET) || 5;
  c.MASTERY_THRESHOLD = Number(c.MASTERY_THRESHOLD) || 80;
  c.PARALLEL_FORMS = truthy_(c.PARALLEL_FORMS);
  c.PARTIAL_CREDIT = truthy_(c.PARTIAL_CREDIT);
  c.ONE_PER_SCREEN = truthy_(c.ONE_PER_SCREEN);
  c.POST_FEEDBACK = String(c.POST_FEEDBACK).toLowerCase() === 'score_only' ? 'score_only' : 'full';
  c.SEMESTER_START = iso_(c.SEMESTER_START).slice(0, 10);
  c.SEMESTER_END = iso_(c.SEMESTER_END).slice(0, 10);
  return (ctx_.config = c);
}

// ---------- periods and class codes ----------
function periods_() {
  if (ctx_.periods) return ctx_.periods;
  return (ctx_.periods = table_('Periods').map(function (r) {
    return { period: str_(r.period), class_code: str_(r.class_code).toUpperCase(), label: str_(r.label) || ('Period ' + str_(r.period)) };
  }).filter(function (p) { return p.period; }));
}

// A code only works if it has been changed from the placeholder the setup creates.
function codeIsUsable_(code) { return !!code && code.indexOf('CHANGEME') !== 0; }

function periodForCode_(code) {
  var hit = periods_().filter(function (p) { return codeIsUsable_(p.class_code) && p.class_code === code; });
  return hit.length ? hit[0] : null;
}

// ---------- roster ----------
function roster_() {
  if (ctx_.roster) return ctx_.roster;
  var cache = CacheService.getScriptCache(), hit = cache.get('roster_v1');
  if (hit) { try { return (ctx_.roster = JSON.parse(hit)); } catch (e) { /* fall through */ } }
  var list = table_('Roster').map(function (r) {
    return { student_id: str_(r.student_id), last: str_(r.last), first: str_(r.first), period: str_(r.period),
             active: str_(r.active).toUpperCase() !== 'N' };
  }).filter(function (r) { return r.student_id; });
  try { cache.put('roster_v1', JSON.stringify(list), 60); } catch (e) { /* too big for cache: fine */ }
  return (ctx_.roster = list);
}

function clearRosterCache_() { CacheService.getScriptCache().remove('roster_v1'); ctx_.roster = null; }

// ---------- lessons and items ----------
function lessons_() {
  if (ctx_.lessons) return ctx_.lessons;
  return (ctx_.lessons = table_('Lessons').map(function (r) {
    return { sequence: Number(r.sequence), lesson_id: str_(r.lesson_id), unit: Number(r.unit), unit_title: str_(r.unit_title),
             day: Number(r.day), title: str_(r.title), objective: str_(r.objective), ticket_type: str_(r.ticket_type) || 'daily' };
  }).filter(function (l) { return l.lesson_id; }).sort(function (a, b) { return a.sequence - b.sequence; }));
}

function lessonById_(id) {
  var l = lessons_().filter(function (x) { return x.lesson_id === id; });
  return l.length ? l[0] : null;
}

function bank_() {
  if (ctx_.bank) return ctx_.bank;
  var out = [];
  table_('ItemBank').forEach(function (r) {
    if (str_(r.active).toUpperCase() === 'N') return;
    try {
      out.push({
        item_id: str_(r.item_id), lesson_id: str_(r.lesson_id), criterion_id: str_(r.criterion_id),
        ticket_type: str_(r.ticket_type) || 'daily', form: str_(r.form) || 'A', type: str_(r.type),
        stem: str_(r.stem), options: JSON.parse(r.options), rows: r.rows ? JSON.parse(r.rows) : [],
        correct: JSON.parse(r.correct), rationale: str_(r.rationale), source_item_id: str_(r.source_item_id)
      });
    } catch (e) { console.error('Bad ItemBank row ' + str_(r.item_id) + ': ' + e); }
  });
  return (ctx_.bank = out);
}

/** The items a ticket uses for a lesson and phase (no keys attached yet; the caller strips them for students). */
function ticketItems_(lesson, phase) {
  var cfg = config_(), bank = bank_();
  var wantB = phase === 'post' && cfg.PARALLEL_FORMS;
  var mine = bank.filter(function (i) { return i.lesson_id === lesson.lesson_id; });
  var items = mine.filter(function (i) { return i.form === (wantB ? 'B' : 'A'); });
  if (!items.length) items = mine.filter(function (i) { return i.form === 'A'; });
  if (lesson.ticket_type !== 'unit_review') items = items.slice(0, cfg.ITEMS_PER_TICKET);
  return items;
}

// ---------- control (what is open right now) ----------
function control_() {
  return table_('Control').map(function (r) {
    return { period: str_(r.period), lesson_id: str_(r.lesson_id), phase: str_(r.phase), open: truthy_(r.open), opened_at: iso_(r.opened_at) };
  });
}

function controlFor_(period) {
  var hit = control_().filter(function (c) { return c.period === period; });
  return hit.length ? hit[0] : { period: period, lesson_id: '', phase: '', open: false, opened_at: '' };
}

function writeControl_(period, lessonId, phase, open) {
  var sh = sheet_('Control'), n = sh.getLastRow();
  var vals = n >= 2 ? sh.getRange(2, 1, n - 1, 5).getValues() : [];
  var row = [period, lessonId, phase, open ? 'Y' : 'N', open ? new Date() : ''];
  for (var i = 0; i < vals.length; i++) {
    if (str_(vals[i][0]) === period) {
      if (!open) { row[4] = vals[i][4]; }       // keep the last opened time when closing
      sh.getRange(i + 2, 1, 1, 5).setValues([row]);
      return;
    }
  }
  sh.getRange(n + 1 < 2 ? 2 : n + 1, 1, 1, 5).setValues([row]);
}

// ---------- scores and responses ----------
function scores_() {
  return table_('Scores').map(function (r) {
    return { timestamp: iso_(r.timestamp), student_id: str_(r.student_id), period: str_(r.period), lesson_id: str_(r.lesson_id),
             ticket_type: str_(r.ticket_type), phase: str_(r.phase), raw: Number(r.raw), max: Number(r.max), pct: Number(r.pct),
             seconds: r.seconds === '' ? null : Number(r.seconds) };
  });
}

function responses_() {
  return table_('Responses').map(function (r) {
    return { timestamp: iso_(r.timestamp), student_id: str_(r.student_id), period: str_(r.period), lesson_id: str_(r.lesson_id),
             phase: str_(r.phase), item_id: str_(r.item_id), criterion_id: str_(r.criterion_id), ticket_type: str_(r.ticket_type),
             response: r.response, correct: Number(r.correct), points: Number(r.points) };
  });
}
