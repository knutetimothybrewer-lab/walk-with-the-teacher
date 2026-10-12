/**
 * Code.gs - the web app. The student page and the teacher page both talk to this one URL.
 *
 * Every request is a POST with a JSON body {action: "...", ...}. (POST keeps the class code, student ID and teacher
 * passcode out of URLs and server logs.) Students use s_* actions; the teacher uses t_* actions with the passcode.
 *
 *   s_status  - "is a ticket open for my class?"        (polled by the waiting screen; no items, no keys)
 *   s_ticket  - the open ticket's questions, WITHOUT answers
 *   s_submit  - grade the answers on the server, store them, return the student's feedback
 *   t_*       - teacher controls and reports (see Reports.gs)
 *
 * Answer keys live only in the ItemBank tab and never leave the server except as the teacher's drill-down.
 */

var VERSION = '1.0.0';

function doGet() {
  return out_({ ok: true, service: 'pre-post-tickets', version: VERSION });
}

function doPost(e) {
  var res;
  try {
    ctx_ = {};
    var req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var fn = handlers_()[req.action];
    if (!fn) throw new UserError('Unknown request.');
    res = fn(req);
  } catch (err) {
    if (err && err.isUserError) {
      res = { ok: false, error: err.message };
    } else {
      console.error((err && err.stack) || err);
      res = { ok: false, error: 'Something went wrong. Please try again.' };
    }
  }
  return out_(res);
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// A function (not a top-level object) so it is built when a request arrives; Apps Script loads files in order and
// the t_* functions below live in other files.
function handlers_() {
  return {
    s_status: s_status, s_ticket: s_ticket, s_submit: s_submit,
    t_ping: t_ping, t_state: t_state, t_lessons: t_lessons, t_set: t_set, t_report: t_report,
    t_roster: t_roster, t_student: t_student, t_student_lesson: t_student_lesson, t_recompute: t_recompute
  };
}

// =====================================================================================================================
// Student side
// =====================================================================================================================

/** Class code -> period, student ID -> roster row. Throws a friendly error if either is wrong. */
function authStudent_(req) {
  var code = str_(req.code).toUpperCase(), sid = str_(req.student_id);
  if (!code || !sid) throw new UserError('Enter your class code and your student ID.');
  var period = periodForCode_(code);
  if (!period) throw new UserError('That class code is not right. Check it and try again.');
  var me = roster_().filter(function (r) { return r.student_id === sid && r.period === period.period && r.active; });
  if (!me.length) throw new UserError('We could not find that student ID in this class. Check the number and try again.');
  return { period: period, student: me[0] };
}

function ticketLabel_(lesson, phase) {
  var kind = phase === 'pre' ? 'Warm-Up' : 'Exit Ticket';
  return lesson.ticket_type === 'unit_review' ? 'Unit Review ' + kind : kind;
}

function s_status(req) {
  var who = authStudent_(req), ctl = controlFor_(who.period.period);
  var res = { ok: true, student: { first: who.student.first }, period: who.period.period, open: false };
  if (ctl.open) {
    var lesson = lessonById_(ctl.lesson_id);
    if (lesson) {
      res.open = true;
      res.ticket = { lesson_id: lesson.lesson_id, phase: ctl.phase, label: ticketLabel_(lesson, ctl.phase),
                     title: lesson.title, unit_title: lesson.unit_title, ticket_type: lesson.ticket_type };
    }
  }
  return res;
}

function s_ticket(req) {
  var who = authStudent_(req), ctl = controlFor_(who.period.period), cfg = config_();
  if (!ctl.open) return { ok: true, open: false };
  var lesson = lessonById_(ctl.lesson_id);
  if (!lesson) throw new UserError('This ticket is not set up yet. Tell your teacher.');
  var base = { ok: true, open: true, student: { first: who.student.first },
               ticket: { lesson_id: lesson.lesson_id, phase: ctl.phase, label: ticketLabel_(lesson, ctl.phase), title: lesson.title,
                         unit_title: lesson.unit_title, ticket_type: lesson.ticket_type },
               one_per_screen: cfg.ONE_PER_SCREEN };

  if (hasScore_(who.student.student_id, lesson.lesson_id, ctl.phase)) {
    base.already = true;
    base.result = ctl.phase === 'post' ? rebuildPostResult_(who.student.student_id, lesson) : { phase: 'pre', submitted: true };
    return base;
  }
  var items = ticketItems_(lesson, ctl.phase);
  if (!items.length) throw new UserError('This ticket has no questions yet. Tell your teacher.');
  base.items = items.map(function (i) {   // keys, rationale, and criterion tags are stripped
    return { item_id: i.item_id, type: i.type, stem: i.stem, options: i.options, rows: i.rows };
  });
  return base;
}

function s_submit(req) {
  var who = authStudent_(req), cfg = config_(), sid = who.student.student_id, period = who.period.period;
  var phase = req.phase === 'post' ? 'post' : 'pre';

  var ctl = controlFor_(period);
  if (!ctl.open || ctl.lesson_id !== str_(req.lesson_id) || ctl.phase !== phase) {
    throw new UserError('This ticket is closed, so your answers were not saved. Tell your teacher.');
  }
  var lesson = lessonById_(ctl.lesson_id);
  var items = ticketItems_(lesson, phase);
  var answers = (req.answers && typeof req.answers === 'object') ? req.answers : {};

  // Grade first (no lock needed), then take the lock only for the duplicate check and the write.
  var now = new Date(), raw = 0, graded = [], rows = [];
  items.forEach(function (it) {
    var g = Grading.gradeItem(it, answers[it.item_id], cfg.PARTIAL_CREDIT);
    raw += g.points;
    graded.push({ item: it, grade: g });
    rows.push([now, sid, period, lesson.lesson_id, phase, it.item_id, it.criterion_id, lesson.ticket_type,
               JSON.stringify(answers[it.item_id] === undefined ? null : answers[it.item_id]), g.correct, g.points]);
  });
  var max = items.length, pct = Stats.pct(raw, max);
  var seconds = Math.max(0, Math.min(7200, Math.round(Number(req.seconds) || 0)));

  var duplicate = false;
  withLock_(function () {
    var again = controlFor_(period);
    if (!again.open || again.lesson_id !== lesson.lesson_id || again.phase !== phase) {
      throw new UserError('This ticket was closed just now, so your answers were not saved. Tell your teacher.');
    }
    if (hasScore_(sid, lesson.lesson_id, phase)) { duplicate = true; return; }
    append_('Responses', rows);
    append_('Scores', [[now, sid, period, lesson.lesson_id, lesson.ticket_type, phase, raw, max, pct, seconds]]);
  });
  if (duplicate) throw new UserError('You already turned this in. Your first answers were kept.');

  return { ok: true, result: buildResult_(sid, lesson, phase, raw, max, pct, graded) };
}

function preScoreFor_(sid, lessonId) {
  var hit = scores_().filter(function (s) { return s.student_id === sid && s.lesson_id === lessonId && s.phase === 'pre'; });
  return hit.length ? hit[hit.length - 1] : null;
}

function buildResult_(sid, lesson, phase, raw, max, pct, graded) {
  if (phase === 'pre') return { phase: 'pre', submitted: true };      // no score after the warm-up
  var cfg = config_(), pre = preScoreFor_(sid, lesson.lesson_id);
  var res = { phase: 'post', raw: raw, max: max, pct: Stats.round(pct, 1), pre_pct: pre ? Stats.round(pre.pct, 1) : null,
              change: pre ? Stats.round(pct - pre.pct, 1) : null, objective: lesson.objective, feedback: cfg.POST_FEEDBACK, items: [] };
  if (cfg.POST_FEEDBACK === 'full') {
    res.items = graded.map(function (g) {
      return { item_id: g.item.item_id, stem: g.item.stem, type: g.item.type, correct: g.grade.correct, points: g.grade.points,
               rationale: g.item.rationale };
    });
  }
  return res;
}

// A student who comes back after finishing sees the same feedback again.
function rebuildPostResult_(sid, lesson) {
  var score = scores_().filter(function (s) { return s.student_id === sid && s.lesson_id === lesson.lesson_id && s.phase === 'post'; });
  if (!score.length) return { phase: 'post', submitted: true };
  var s = score[score.length - 1], byId = {};
  bank_().forEach(function (b) { byId[b.item_id] = b; });
  var graded = responses_().filter(function (r) { return r.student_id === sid && r.lesson_id === lesson.lesson_id && r.phase === 'post'; })
    .filter(function (r) { return byId[r.item_id]; })
    .map(function (r) { return { item: byId[r.item_id], grade: { correct: r.correct, points: r.points } }; });
  return buildResult_(sid, lesson, 'post', s.raw, s.max, s.pct, graded);
}

/** Cheap duplicate check: reads only the 5 columns it needs (student, period, lesson, ticket type, phase). */
function hasScore_(sid, lessonId, phase) {
  var sh = sheet_('Scores'), n = sh.getLastRow();
  if (n < 2) return false;
  var vals = sh.getRange(2, 2, n - 1, 5).getValues();   // columns B..F
  for (var i = 0; i < vals.length; i++) {
    if (str_(vals[i][0]) === sid && str_(vals[i][2]) === lessonId && str_(vals[i][4]) === phase) return true;
  }
  return false;
}

// =====================================================================================================================
// Teacher side
// =====================================================================================================================

function requireTeacher_(req) {
  var real = PropertiesService.getScriptProperties().getProperty('TEACHER_PASSCODE');
  if (!real) throw new UserError('No teacher passcode is set yet. In Apps Script, open Project Settings > Script properties and add TEACHER_PASSCODE.');
  if (str_(req.passcode) !== real) {
    Utilities.sleep(700);                       // slows down guessing
    throw new UserError('That passcode is not right.');
  }
}

function t_ping(req) { requireTeacher_(req); return { ok: true, version: VERSION }; }

/** Lessons for the dropdown, with how many questions each has (a lesson with 0 cannot be opened). */
function t_lessons(req) {
  requireTeacher_(req);
  var cfg = config_(), bank = bank_();
  return { ok: true, lessons: lessons_().map(function (l) {
    var n = bank.filter(function (i) { return i.lesson_id === l.lesson_id && i.form === 'A'; }).length;
    if (l.ticket_type !== 'unit_review') n = Math.min(n, cfg.ITEMS_PER_TICKET);
    return { lesson_id: l.lesson_id, sequence: l.sequence, unit: l.unit, unit_title: l.unit_title, day: l.day, title: l.title,
             ticket_type: l.ticket_type, n_items: n, ready: n > 0 };
  }) };
}

/** Everything the "Run class" screen shows: one card per period. */
function t_state(req) {
  requireTeacher_(req);
  var ps = periods_(), ctl = control_(), ros = roster_().filter(function (r) { return r.active; }), sc = scores_();
  var ls = lessons_(), bank = bank_();
  var ready = ls.filter(function (l) { return bank.some(function (i) { return i.lesson_id === l.lesson_id && i.form === 'A'; }); });
  return { ok: true, config: { mastery: config_().MASTERY_THRESHOLD, parallel_forms: config_().PARALLEL_FORMS },
    periods: ps.map(function (p) {
      var c = ctl.filter(function (x) { return x.period === p.period; })[0] || { lesson_id: '', phase: '', open: false, opened_at: '' };
      var students = ros.filter(function (r) { return r.period === p.period; });
      var done = {}, secs = [];
      sc.forEach(function (s) {
        if (s.period === p.period && s.lesson_id === c.lesson_id && s.phase === c.phase) {
          done[s.student_id] = true;
          if (s.seconds) secs.push(s.seconds);
        }
      });
      var waiting = c.lesson_id ? students.filter(function (r) { return !done[r.student_id]; })
        .map(function (r) { return (r.first + ' ' + r.last).trim() || r.student_id; }) : [];
      // Suggested next lesson: the one after the last lesson this period finished an exit ticket for.
      var lastSeq = 0;
      sc.forEach(function (s) {
        if (s.period === p.period && s.phase === 'post') { var l = lessonById_(s.lesson_id); if (l && l.sequence > lastSeq) lastSeq = l.sequence; }
      });
      var next = ready.filter(function (l) { return l.sequence > lastSeq; })[0] || ready[0];
      var lesson = c.lesson_id ? lessonById_(c.lesson_id) : null;
      secs.sort(function (a, b) { return a - b; });
      return { period: p.period, label: p.label, code: codeIsUsable_(p.class_code) ? p.class_code : '', code_needs_change: !codeIsUsable_(p.class_code),
               open: c.open, phase: c.phase, lesson_id: c.lesson_id, lesson_title: lesson ? lesson.title : '',
               ticket_label: lesson && c.phase ? ticketLabel_(lesson, c.phase) : '', opened_at: c.opened_at,
               roster: students.length, submitted: c.lesson_id ? Object.keys(done).length : 0, waiting: waiting,
               median_seconds: secs.length ? secs[Math.floor(secs.length / 2)] : null,
               suggested_lesson_id: next ? next.lesson_id : '' };
    }) };
}

/** Open or close a ticket for one period. Only one ticket per period is ever open. */
function t_set(req) {
  requireTeacher_(req);
  var period = str_(req.period);
  if (!periods_().some(function (p) { return p.period === period; })) throw new UserError('Unknown period.');
  return withLock_(function () {
    if (req.open) {
      var lesson = lessonById_(str_(req.lesson_id));
      if (!lesson) throw new UserError('Pick a lesson first.');
      var phase = req.phase === 'post' ? 'post' : 'pre';
      if (!ticketItems_(lesson, phase).length) throw new UserError(lesson.title + ' has no questions yet.');
      writeControl_(period, lesson.lesson_id, phase, true);
    } else {
      var cur = controlFor_(period);
      writeControl_(period, cur.lesson_id, cur.phase, false);
    }
    return { ok: true };
  });
}

function t_roster(req) {
  requireTeacher_(req);
  return { ok: true, students: roster_().filter(function (r) { return r.active; }) };
}

function t_recompute(req) {
  requireTeacher_(req);
  var n = recomputeSummaries();
  return { ok: true, rows: n };
}
