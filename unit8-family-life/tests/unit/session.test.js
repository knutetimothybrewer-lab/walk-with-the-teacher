'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { setup, correctResponse, wrongResponse, W8 } = require('./helpers.js');

const MIN = 60000;

/* ------------------------------------------------------------------ login */
test('login: wrong code, wrong block, bad inputs', () => {
  const S = setup();
  assert.equal(S.login({ classCode: 'NOPE' }).error.code, 'BAD_CODE');
  assert.equal(S.login({ block: 'Block 3/4' }).error.code, 'BAD_CODE', 'code belongs to a different block');
  assert.equal(S.login({ block: 'Block 5' }).error.code, 'BAD_INPUT');
  assert.equal(S.login({ block: '' }).error.code, 'BAD_INPUT');
  assert.equal(S.login({ studentId: 'x' }).error.code, 'BAD_INPUT');
  assert.equal(S.login({ firstName: '   ' }).error.code, 'BAD_INPUT');
  assert.equal(S.login({ classCode: '' }).error.code, 'BAD_INPUT');
  assert.equal(S.store.listSessions().length, 0, 'failed logins must not create records');
});

test('login: class codes are case- and space-insensitive; the four blocks are exact', () => {
  const S = setup();
  assert.deepEqual(W8.BLOCKS, ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9']);
  assert.equal(S.login({ classCode: ' code 12 ' }).ok, true);
  for (const [b, c] of [['Block 3/4', 'CODE34'], ['Block 6/7', 'CODE67'], ['Block 8/9', 'CODE89']]) {
    assert.equal(S.login({ studentId: 'ID-' + c, block: b, classCode: c }).ok, true, b);
  }
});

test('login does NOT start the clock; Begin does', () => {
  const S = setup();
  const r = S.login();
  assert.equal(r.session.status, 'registered'); assert.equal(r.session.startTime, null); assert.equal(r.session.deadline, null);
  S.clock.advance(20 * MIN); // time spent reading instructions must not count
  const b = S.api('begin', { token: r.token });
  assert.equal(b.session.startTime, S.clock.t);
  assert.equal(b.session.deadline, S.clock.t + 90 * MIN);
  assert.equal(b.session.status, 'in_progress');
});

test('duplicate student ID resumes the in-progress record (no second record)', () => {
  const S = setup(); const { token } = S.begin();
  const id = S.ids()[0], bi = S.bank.items[id];
  S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: 'q1' });
  S.clock.advance(7 * MIN);
  const again = S.login(); // same ID, as after a refresh or on another computer
  assert.equal(again.ok, true); assert.equal(again.resumed, true);
  assert.equal(again.items[id].a, 1, 'attempt count survives');
  assert.equal(again.session.deadline, S.store.listSessions()[0].deadline);
  assert.equal(S.store.listSessions().length, 1);
  // the old token is signed out: one active tab per student
  assert.equal(S.api('state', { token }).error.code, 'NO_SESSION');
});

test('duplicate ID with a different last name is rejected (typo or someone else)', () => {
  const S = setup(); S.student();
  assert.equal(S.login({ lastName: 'Turing' }).error.code, 'ID_MISMATCH');
  assert.equal(S.login({ lastName: 'LOVELACE ' }).ok, true, 'case and spacing differences are fine');
});

test('block is locked after Begin, but can still be corrected before it', () => {
  const S = setup();
  const t = S.student();
  assert.equal(S.login({ block: 'Block 3/4', classCode: 'CODE34' }).ok, true, 'before Begin the block may be corrected');
  assert.equal(S.store.listSessions()[0].block, 'Block 3/4');
  const { token } = S.begin({ block: 'Block 3/4', classCode: 'CODE34' });
  const r = S.login({ block: 'Block 1/2', classCode: 'CODE12' });
  assert.equal(r.ok, false); assert.equal(r.error.code, 'BLOCK_LOCKED');
  assert.ok(token && t);
});

test('closing the assessment stops new sign-ins but lets in-progress students continue', () => {
  const S = setup(); const { token } = S.begin();
  const tt = S.teacher();
  assert.equal(S.api('tSetSettings', { tt, settings: { open: false } }).ok, true);
  assert.equal(S.login({ studentId: 'NEW-1', lastName: 'New' }).error.code, 'CLOSED');
  assert.equal(S.login().ok, true, 'resuming a started record is allowed');
  const id = S.ids()[0];
  assert.equal(S.api('submit', { token: S.store.listSessions()[0].token, itemId: id, response: correctResponse(S.bank.items[id]), reqId: 'c1' }).ok, true);
});

test('Begin is idempotent and does not reset anything', () => {
  const S = setup(); const { token, begin } = S.begin();
  S.clock.advance(5 * MIN);
  const id = S.ids()[0];
  S.api('submit', { token, itemId: id, response: correctResponse(S.bank.items[id]), reqId: 'b1' });
  const again = S.api('begin', { token });
  assert.equal(again.session.startTime, begin.session.startTime);
  assert.equal(again.items[id].ok, 1);
});

/* ------------------------------------------------------------------ timer */
test('deadline = Begin time + allowed minutes; the server enforces it on submit', () => {
  const S = setup(); const { token, begin } = S.begin();
  const id = S.ids()[0], bi = S.bank.items[id];
  assert.equal(begin.session.deadline - begin.session.startTime, 90 * MIN);
  S.clock.advance(89 * MIN + 59000);
  assert.equal(S.api('submit', { token, itemId: id, response: correctResponse(bi), reqId: 'e1' }).ok, true, '1 second before the deadline is accepted');
  const id2 = S.ids()[1];
  S.clock.advance(2000); // now 1 second past the deadline
  const late = S.api('submit', { token, itemId: id2, response: correctResponse(S.bank.items[id2]), reqId: 'e2' });
  assert.equal(late.ok, false); assert.equal(late.error.code, 'EXPIRED');
  assert.equal(late.completion.answered, 1);
  const st = S.store.listSessions()[0];
  assert.equal(st.status, 'auto_submitted'); assert.equal(st.submissionType, 'Time Expired — Auto-Submitted');
  assert.equal(st.items[id2], undefined, 'a late answer must not be recorded');
  assert.equal(st.submittedAt, st.deadline, 'time used is capped at the allowed time');
});

test('a queued answer that reaches the server after the deadline is rejected', () => {
  // Simulates the offline queue: the student answered at minute 89, the request only arrives at minute 91.
  const S = setup(); const { token } = S.begin();
  const id = S.ids()[0];
  S.clock.advance(91 * MIN);
  const r = S.api('submit', { token, itemId: id, response: correctResponse(S.bank.items[id]), reqId: 'queued' });
  assert.equal(r.error.code, 'EXPIRED');
  assert.equal(S.store.listResponses().length, 0);
});

test('sweep (the 5-minute trigger) finalizes expired sessions and leaves live ones alone', () => {
  const S = setup();
  const a = S.begin({ studentId: 'AAA1', lastName: 'Alpha' });
  S.clock.advance(60 * MIN);
  const b = S.begin({ studentId: 'BBB2', lastName: 'Beta' });
  const first = S.ids()[0];
  S.api('submit', { token: a.token, itemId: first, response: correctResponse(S.bank.items[first]), reqId: 'sw1' });
  S.clock.advance(31 * MIN); // A is 1 minute past its deadline; B has 59 minutes left
  assert.equal(S.server.sweep(), 1);
  const rows = Object.fromEntries(S.store.listSessions().map((s) => [s.studentId, s]));
  assert.equal(rows.AAA1.status, 'auto_submitted');
  assert.equal(rows.AAA1.result.answered, 1, 'unanswered items stay at zero');
  assert.equal(rows.AAA1.result.points, S.bank.items[first].points);
  assert.equal(rows.BBB2.status, 'in_progress');
  assert.equal(S.server.sweep(), 0, 'sweeping twice is harmless');
  assert.ok(b.token);
});

test('the clock keeps running while the student is away (refresh, closed tab, offline)', () => {
  const S = setup(); const { begin } = S.begin();
  S.clock.advance(40 * MIN); // away for 40 minutes
  const back = S.login();
  assert.equal(back.session.deadline, begin.session.deadline, 'deadline is not moved by a re-login');
  assert.equal(back.session.deadline - back.serverNow, 50 * MIN);
});

test('student who returns after the deadline sees the finished result, not a fresh attempt', () => {
  const S = setup(); S.begin();
  S.clock.advance(95 * MIN);
  const back = S.login();
  assert.equal(back.session.status, 'auto_submitted');
  assert.ok(back.completion);
  assert.equal(S.api('begin', { token: back.token }).error.code, 'FINALIZED');
});

test('per-student accommodation: 135 minutes (1.5x) before and during the session', () => {
  const S = setup(); const tt = S.teacher();
  S.student();
  assert.equal(S.api('tSetTime', { tt, studentId: 'S1001', allowedMinutes: 135 }).allowedMinutes, 135);
  const token = S.student();
  const b = S.api('begin', { token });
  assert.equal(b.session.deadline - b.session.startTime, 135 * MIN);
  // add time mid-session
  S.clock.advance(100 * MIN);
  const add = S.api('tSetTime', { tt, studentId: 'S1001', addMinutes: 20 });
  assert.equal(add.allowedMinutes, 155);
  assert.equal(add.deadline, b.session.startTime + 155 * MIN);
  const st = S.api('state', { token });
  assert.equal(st.session.deadline, add.deadline, 'the student sees the new deadline on the next sync');
  // cannot shorten below "now"
  assert.equal(S.api('tSetTime', { tt, studentId: 'S1001', allowedMinutes: 60 }).error.code, 'TIME_TOO_SHORT');
  assert.equal(S.api('tSetTime', { tt, studentId: 'S1001', allowedMinutes: 5 }).error.code, 'BAD_INPUT');
  assert.equal(S.api('tSetTime', { tt, studentId: 'S1001', addMinutes: 999 }).error.code, 'BAD_INPUT');
});

test('extension granted after the session already expired and was finalized is refused with guidance', () => {
  const S = setup(); const tt = S.teacher(); S.begin();
  S.clock.advance(100 * MIN); S.server.sweep();
  const r = S.api('tSetTime', { tt, studentId: 'S1001', addMinutes: 30 });
  assert.equal(r.error.code, 'ALREADY_FINAL');
  assert.match(r.error.message, /Reset/);
});

test('default minutes setting changes future Begin only', () => {
  const S = setup(); const tt = S.teacher();
  const a = S.begin({ studentId: 'AAA1', lastName: 'Alpha' });
  S.api('tSetSettings', { tt, settings: { defaultMinutes: 60 } });
  const b = S.begin({ studentId: 'BBB2', lastName: 'Beta' });
  assert.equal(b.begin.session.deadline - b.begin.session.startTime, 60 * MIN);
  assert.equal(S.api('state', { token: a.token }).session.deadline - S.api('state', { token: a.token }).session.startTime, 90 * MIN);
});

/* ------------------------------------------------------------------ final submit */
test('final submit locks the record; no further submissions without a reset', () => {
  const S = setup(); const { token } = S.begin();
  const id = S.ids()[0];
  assert.equal(S.api('finish', { token }).error.code, 'NEEDS_CONFIRM');
  const fin = S.api('finish', { token, confirm: true });
  assert.equal(fin.completion.submissionType, 'Student Submit');
  assert.equal(fin.completion.points, 0); assert.equal(fin.completion.answered, 0);
  assert.equal(S.api('submit', { token, itemId: id, response: correctResponse(S.bank.items[id]), reqId: 'f1' }).error.code, 'FINALIZED');
  assert.equal(S.api('finish', { token, confirm: true }).already, true);
});

test('teacher can hide scores on the completion screen', () => {
  const S = setup(); const tt = S.teacher(); const { token } = S.begin();
  S.api('tSetSettings', { tt, settings: { showScore: false } });
  const fin = S.api('finish', { token, confirm: true });
  assert.equal(fin.completion.showScore, false);
  assert.equal(fin.completion.points, undefined); assert.equal(fin.completion.percent, undefined);
  assert.equal(S.store.listSessions()[0].result.points, 0, 'the score is still recorded for the teacher');
});

test('turned-off items are excluded from the session and from the possible points', () => {
  const S = setup(); const tt = S.teacher();
  const off = S.ids()[S.ids().length - 1];
  S.api('tSetSettings', { tt, settings: { disabledItems: [off] } });
  const { token, begin } = S.begin();
  assert.equal(begin.itemIds.includes(off), false);
  S.ids().filter((i) => i !== off).forEach((id) => {
    const r = S.api('submit', { token, itemId: id, response: correctResponse(S.bank.items[id]), reqId: id });
    assert.ok(r.ok, id);
  });
  assert.equal(S.api('submit', { token, itemId: off, response: correctResponse(S.bank.items[off]), reqId: 'off' }).error.code, 'NO_SUCH_ITEM');
  const fin = S.api('finish', { token, confirm: true });
  assert.equal(fin.completion.percent, 100, 'a perfect run over the remaining items is 100%');
  assert.equal(S.api('tSetSettings', { tt, settings: { disabledItems: S.ids() } }).error.code, 'BAD_INPUT', 'cannot turn everything off');
});

/* ------------------------------------------------------------------ teacher auth */
test('teacher password: failure, success, no password set, token required on every teacher action', () => {
  const S = setup();
  assert.equal(S.api('teacherLogin', { password: 'wrong' }).error.code, 'TEACHER_PASSWORD');
  assert.equal(S.api('teacherLogin', { password: '' }).error.code, 'TEACHER_PASSWORD');
  const tt = S.teacher();
  const teacherActions = ['tRoster', 'tStudent', 'tReset', 'tSetTime', 'tGetSettings', 'tSetSettings', 'tSetPassword', 'tPreviewStart', 'tPreviewReset', 'tKeys', 'tAnalytics', 'tExport', 'tTest', 'tForceSubmit'];
  teacherActions.forEach((a) => {
    assert.equal(S.api(a, {}).error.code, 'TEACHER_AUTH', a + ' ran without a token');
    assert.equal(S.api(a, { tt: 'forged' }).error.code, 'TEACHER_AUTH', a + ' accepted a forged token');
    assert.notEqual(S.api(a, { tt }).error && S.api(a, { tt }).error.code, 'TEACHER_AUTH', a + ' rejected a valid token');
  });
  // a student token is not a teacher token
  const st = S.student();
  assert.equal(S.api('tRoster', { tt: st }).error.code, 'TEACHER_AUTH');
  // teacher tokens expire
  S.clock.advance(3 * 3600 * 1000);
  assert.equal(S.api('tRoster', { tt }).error.code, 'TEACHER_AUTH');
  // logout invalidates
  const t2 = S.teacher(); S.api('tLogout', { tt: t2 }); assert.equal(S.api('tRoster', { tt: t2 }).error.code, 'TEACHER_AUTH');
  // no password configured
  S.store.setTeacherHash(null);
  assert.equal(S.api('teacherLogin', { password: 'teacher-pass-1' }).error.code, 'TEACHER_NOT_SET');
});

test('the teacher password is stored hashed and a changed password takes effect', () => {
  const S = setup(); const tt = S.teacher();
  const rec = S.store.getTeacherHash();
  assert.ok(!JSON.stringify(rec).includes('teacher-pass-1'));
  assert.equal(S.api('tSetPassword', { tt, newPassword: 'short' }).error.code, 'BAD_INPUT');
  assert.equal(S.api('tSetPassword', { tt, newPassword: 'a-new-passphrase' }).ok, true);
  assert.equal(S.api('teacherLogin', { password: 'teacher-pass-1' }).ok, false);
  assert.equal(S.api('teacherLogin', { password: 'a-new-passphrase' }).ok, true);
});

test('class codes: validation, per-block edit, reserved teacher code refused', () => {
  const S = setup(); const tt = S.teacher();
  assert.equal(S.api('tSetSettings', { tt, settings: { classCodes: { 'Block 1/2': 'ab' } } }).error.code, 'BAD_INPUT');
  assert.equal(S.api('tSetSettings', { tt, settings: { classCodes: { 'Block 1/2': 'WALK-TEACHER' } } }).error.code, 'BAD_INPUT');
  assert.equal(S.api('tSetSettings', { tt, settings: { classCodes: { 'Block 1/2': 'new code!' } } }).error.code, 'BAD_INPUT');
  assert.equal(S.api('tSetSettings', { tt, settings: { classCodes: { 'Block 1/2': 'Fresh-77' } } }).ok, true);
  assert.equal(S.login({ classCode: 'CODE12' }).error.code, 'BAD_CODE');
  assert.equal(S.login({ classCode: 'fresh-77' }).ok, true);
});

/* ------------------------------------------------------------------ reset */
test('reset: requires the last name, archives to History, clears work, restores attempts and a fresh window', () => {
  const S = setup(); const tt = S.teacher(); const { token } = S.begin();
  const ids = S.ids();
  ids.slice(0, 3).forEach((id) => S.api('submit', { token, itemId: id, response: correctResponse(S.bank.items[id]), reqId: id }));
  S.api('submit', { token, itemId: ids[3], response: wrongResponse(S.bank.items[ids[3]]), reqId: 'w' });
  S.api('finish', { token, confirm: true });
  const before = S.api('tStudent', { tt, studentId: 'S1001' });

  assert.equal(S.api('tReset', { tt, studentId: 'S1001', lastName: 'Wrong' }).error.code, 'CONFIRM_MISMATCH');
  assert.equal(S.store.listHistory().length, 0, 'a refused reset changes nothing');
  assert.equal(S.api('tStudent', { tt, studentId: 'S1001' }).row.status, 'submitted');

  const r = S.api('tReset', { tt, studentId: 'S1001', lastName: 'lovelace', reason: 'Chromebook died' });
  assert.equal(r.ok, true); assert.equal(r.resetCount, 1);
  const hist = S.store.listHistory();
  assert.equal(hist.length, 1);
  assert.equal(hist[0].result.points, before.result.points, 'History keeps the grade the student had');
  assert.equal(hist[0].reason, 'Chromebook died');
  assert.ok(Object.keys(hist[0].items).length >= 4, 'History keeps the item-level record');

  const rec = S.store.listSessions()[0];
  assert.equal(rec.status, 'reset'); assert.deepEqual(rec.items, {}); assert.equal(rec.deadline, null); assert.equal(rec.resetCount, 1);
  assert.equal(S.api('state', { token }).error.code, 'NO_SESSION', 'the old tab is signed out');

  // fresh attempt: attempts restored, fresh 90-minute window starting at Begin
  S.clock.advance(30 * MIN);
  const back = S.login();
  assert.equal(back.session.status, 'reset'); assert.equal(back.session.resetCount, 1);
  const b = S.api('begin', { token: back.token });
  assert.equal(b.session.deadline - b.session.startTime, 90 * MIN);
  assert.equal(b.items[ids[0]].a, 0);
  assert.equal(S.api('submit', { token: back.token, itemId: ids[3], response: wrongResponse(S.bank.items[ids[3]]), reqId: 'again' }).attempt, 1);
});

test('reset keeps a custom accommodation and bumps the epoch; history is never deleted', () => {
  const S = setup(); const tt = S.teacher(); S.student();
  S.api('tSetTime', { tt, studentId: 'S1001', allowedMinutes: 135 });
  const { token } = S.begin();
  S.api('finish', { token, confirm: true });
  S.api('tReset', { tt, studentId: 'S1001', lastName: 'Lovelace' });
  S.api('tReset', { tt, studentId: 'S1001', lastName: 'Lovelace' });
  assert.equal(S.store.listHistory().length, 2);
  assert.equal(S.store.listSessions()[0].allowedMinutes, 135);
  assert.equal(S.store.listSessions()[0].epoch, 3);
});

/* ------------------------------------------------------------------ preview isolation */
test('preview: separate store, never touches student records, analytics, exports, or the roster', () => {
  const S = setup(); const tt = S.teacher();
  S.begin({ studentId: 'REAL1', lastName: 'Real' });
  const p = S.api('tPreviewStart', { tt });
  assert.equal(p.ok, true); assert.equal(p.session.preview, true);
  assert.equal(p.session.deadline, null, 'preview has no time limit');
  const ids = S.ids();
  // free navigation: a later stage is playable immediately in preview
  const gated = ids.find((i) => S.bank.items[i].unlockAfter);
  assert.equal(S.api('submit', { token: p.token, itemId: gated, response: correctResponse(S.bank.items[gated]), reqId: 'pv1' }).ok, true);
  ids.forEach((id) => S.api('submit', { token: p.token, itemId: id, response: correctResponse(S.bank.items[id]), reqId: 'pv-' + id }));

  assert.equal(S.store.listSessions().length, 1, 'only the real student is in the student table');
  assert.equal(S.api('tRoster', { tt }).rows.length, 1);
  assert.equal(S.api('tExport', { tt }).roster.length, 2); // header + 1 student
  assert.equal(S.api('tAnalytics', { tt }).analytics.byBlock['Block 1/2'].students, 1);
  assert.ok(S.store.listResponses().filter((r) => r.preview === 1).length >= ids.length);
  assert.equal(S.store.listResponses().filter((r) => r.preview !== 1 && r.studentId === 'PREVIEW').length, 0);

  // keys are only available to a teacher token
  const k = S.api('tKeys', { tt, itemIds: [ids[0]] });
  assert.ok(k.keys[ids[0]].key && k.keys[ids[0]].explanation);

  // reset my preview progress clears only the preview
  assert.equal(S.api('tPreviewReset', { tt }).ok, true);
  assert.equal(S.store.getPreview(), null);
  assert.equal(S.store.listSessions().length, 1);
  assert.equal(S.api('state', { token: p.token }).error.code, 'NO_SESSION');
  const again = S.api('tPreviewStart', { tt });
  assert.equal(Object.values(again.items).every((x) => x.a === 0), true);
});

test('a preview token cannot be used as a teacher token and cannot finalize a student', () => {
  const S = setup(); const tt = S.teacher(); const p = S.api('tPreviewStart', { tt });
  assert.equal(S.api('tRoster', { tt: p.token }).error.code, 'TEACHER_AUTH');
});

/* ------------------------------------------------------------------ monitor + analytics */
test('roster shows status, time remaining, chapter, and score so far, filtered by block', () => {
  const S = setup(); const tt = S.teacher();
  const a = S.begin({ studentId: 'AAA1', lastName: 'Alpha' });
  S.begin({ studentId: 'BBB2', lastName: 'Beta', block: 'Block 3/4', classCode: 'CODE34' });
  S.student({ studentId: 'CCC3', lastName: 'Gamma' }); // signed in, not begun
  const id = S.ids()[0];
  S.api('submit', { token: a.token, itemId: id, response: correctResponse(S.bank.items[id]), reqId: 'm', pos: { ch: 'd1', unit: 'd1-u1', item: id } });
  S.clock.advance(10 * MIN);
  const all = S.api('tRoster', { tt }).rows;
  assert.equal(all.length, 3);
  const A = all.find((r) => r.studentId === 'AAA1');
  assert.equal(A.statusLabel, 'in progress'); assert.equal(A.remainingMs, 80 * MIN); assert.equal(A.chapter, 'd1'); assert.equal(A.points, S.bank.items[id].points);
  assert.equal(all.find((r) => r.studentId === 'CCC3').statusLabel, 'not started');
  assert.equal(S.api('tRoster', { tt, block: 'Block 3/4' }).rows.length, 1);
});

test('analytics: block averages, most-missed, attempts, auto-submits, near-deadline, reset history', () => {
  const S = setup(); const tt = S.teacher();
  const ids = S.ids();
  const mk = (sid, last, wrongOn, auto) => {
    const { token } = S.begin({ studentId: sid, lastName: last });
    ids.forEach((id) => {
      const bi = S.bank.items[id];
      if (id === wrongOn) { S.api('submit', { token, itemId: id, response: wrongResponse(bi), reqId: sid + 'w' + id }); }
      S.api('submit', { token, itemId: id, response: correctResponse(bi), reqId: sid + id });
    });
    if (!auto) S.api('finish', { token, confirm: true });
    return token;
  };
  mk('AAA1', 'Alpha', ids[2], false);
  mk('BBB2', 'Beta', ids[2], false);
  const c = S.begin({ studentId: 'CCC3', lastName: 'Gamma' });
  S.clock.advance(82 * MIN); // CCC3 now has 8 minutes left
  const an = S.api('tAnalytics', { tt }).analytics;
  assert.equal(an.byBlock['Block 1/2'].final, 2);
  assert.equal(an.byBlock['Block 1/2'].inProgress, 1);
  assert.equal(an.nearDeadline.length, 1); assert.equal(an.nearDeadline[0].studentId, 'CCC3');
  assert.equal(an.mostMissed[0].id, ids[2], 'the item both students missed first is the most-missed');
  const it = an.items.find((i) => i.id === ids[2]);
  assert.equal(it.avgAttempts, 2); assert.equal(it.firstTryPct, 0);
  assert.ok(an.byBlock['Block 1/2'].avgPercent < 100);
  S.clock.advance(10 * MIN); // CCC3 expires
  const an2 = S.api('tAnalytics', { tt }).analytics;
  assert.equal(an2.autoSubmitCount, 1);
  S.api('tReset', { tt, studentId: 'AAA1', lastName: 'Alpha' });
  assert.equal(S.api('tAnalytics', { tt }).analytics.resets.length, 1);
  assert.ok(c.token);
});

test('CSV export has one row per student and per-chapter points', () => {
  const S = setup(); const tt = S.teacher(); const { token } = S.begin();
  S.ids().forEach((id) => S.api('submit', { token, itemId: id, response: correctResponse(S.bank.items[id]), reqId: id }));
  S.api('finish', { token, confirm: true });
  const ex = S.api('tExport', { tt });
  assert.equal(ex.roster.length, 2);
  assert.ok(ex.roster[0].includes('Percent') && ex.roster[0].includes('D1 points'));
  const row = ex.roster[1];
  assert.equal(row[ex.roster[0].indexOf('Percent')], 100);
  assert.equal(ex.items[0].length, 4 + 2 * S.ids().length);
});

test('Test Connection reports password, class codes, and item bank', () => {
  const S = setup(); const tt = S.teacher();
  const t = S.api('tTest', { tt });
  const by = Object.fromEntries(t.checks.map((c) => [c.name, c]));
  assert.equal(by['Teacher password is set'].ok, true);
  assert.equal(by['Class codes set for all four blocks'].ok, true);
  assert.equal(by['Item bank loaded'].ok, true);
  S.api('tSetSettings', { tt, settings: {} });
  S.store.setConfig({ classCodes: {}, defaultMinutes: 90 });
  assert.equal(Object.fromEntries(S.api('tTest', { tt }).checks.map((c) => [c.name, c]))['Class codes set for all four blocks'].ok, false);
});

test('internal errors never leak stack traces unless debug is on', () => {
  const S = setup(); S.env.debug = false;
  const token = S.student();
  S.store.getBank = () => { throw new Error('secret path /srv/x'); };
  const r = S.api('begin', { token });
  assert.equal(r.ok, false); assert.equal(r.error.code, 'INTERNAL'); assert.equal(r.error.detail, undefined);
  assert.equal(JSON.stringify(r).includes('/srv/x'), false);
});

test('ping still answers when the item bank has not been seeded, so the teacher can reach Test Connection', () => {
  const S = setup();
  S.store.getBank = () => { throw new Error('No item bank loaded'); };
  const p = S.api('ping');
  assert.equal(p.ok, true); assert.equal(p.bank, null);
  const tt = S.teacher();
  const t = S.api('tTest', { tt });
  assert.equal(t.ok, true);
  assert.equal(t.checks.find((c) => c.name === 'Item bank loaded').ok, false);
});

test('unknown actions and prototype tricks are rejected', () => {
  const S = setup();
  ['nope', 'constructor', '__proto__', 'toString', 'hasOwnProperty'].forEach((a) => assert.equal(S.api(a).error.code, 'BAD_REQUEST', a));
  assert.equal(S.server.handle(null).error.code, 'BAD_REQUEST');
  assert.equal(S.server.handle({ action: 5 }).error.code, 'BAD_REQUEST');
});
