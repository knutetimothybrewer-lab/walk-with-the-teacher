/* Optional Google Sheet backend (Apps Script web app). OFF unless config.backend.url is set.
 *
 * What is sent, and only when a student submits the final assessment: alias, period, class code, scores,
 * per-item points and attempt counts. Never free-text reflections. A failed send is queued in the browser and retried.
 * Requests are text/plain POSTs (no CORS preflight). Honest limit: the browser decides what to send, so a technically
 * capable user could send altered numbers. Treat the Sheet like any other student-submitted record.
 */
(function (root) {
  'use strict';
  var W = root.WWQ, U = W.U, St = W.Store, Y = W.Sync = {};

  function cfg() { return W.CONFIG.backend || {}; }
  Y.enabled = function () { return !!cfg().url; };
  Y.key = function () { return 'wwq:' + W.CONFIG.assessmentVersion + ':outbox'; };

  function rd() { if (!St.storageOK) return Y._mem || []; try { var t = St.storage.getItem(Y.key()); return t ? JSON.parse(t) : []; } catch (e) { return []; } }
  function wr(q) { Y._mem = q; if (!St.storageOK) return; try { St.storage.setItem(Y.key(), JSON.stringify(q)); } catch (e) { /* ignore */ } }
  Y.pending = function () { return rd().length; };

  function post(body, timeoutMs) {
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null, timer = ctrl && setTimeout(function () { ctrl.abort(); }, timeoutMs || 15000);
    return root.fetch(cfg().url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { if (timer) clearTimeout(timer); return j; }, function (e) { if (timer) clearTimeout(timer); throw e; });
  }

  /* Check the class code with the server. Resolves {ok, via, reason?}. A network failure may allow an offline start
     (the code is then checked again when the result is sent). */
  Y.checkCode = function (student) {
    if (!Y.enabled()) return Promise.resolve({ ok: true, via: 'off' });
    return post({ action: 'start', student: { alias: student.alias, period: student.period, code: student.code } }, 12000).then(
      function (r) { return r && r.ok ? { ok: true, via: 'server', status: r.status } : { ok: false, via: 'server', reason: (r && r.reason) || 'code' }; },
      function () { return cfg().allowOfflineStart ? { ok: true, via: 'offline' } : { ok: false, via: 'offline', reason: 'network' }; });
  };

  /* Teacher view (js/teacherview.js): a passcode-protected request to the same Apps Script. Only sent when a teacher opens that view. */
  Y.teacher = function (op, passcode, extra) {
    var body = { action: 'teacher', op: op, passcode: passcode };
    Object.keys(extra || {}).forEach(function (k) { body[k] = extra[k]; });
    return post(body, 20000);
  };

  /* Compact payload from the final report (no free-text, no raw responses). */
  Y.payload = function (state, rep) {
    var s = rep.session, started = state.timing && state.timing.startedAt, ended = s.submittedAt;
    var mins = started && ended ? Math.max(0, Math.round((Date.parse(ended) - Date.parse(started)) / 60000)) : null;
    return {
      v: 1, assessmentVersion: rep.assessmentVersion,
      session: { id: s.id, submittedAt: ended, resetCount: s.resetCount || 0 },
      student: { alias: rep.student.identifier, period: rep.student.period, code: (state.student.code || '') },
      scores: { earned: rep.scores.earnedPoints, max: rep.scores.maxPoints, percent: rep.scores.percent, letter: rep.scores.letter || '',
        firstAttempt: rep.firstAttemptEvidence.points, completion: rep.completion.percent, attemptsUsed: rep.attemptUsage.attemptsUsed, attemptsAllowed: rep.attemptUsage.attemptsAllowed, minutes: mins },
      missions: rep.missions.map(function (m) { return { id: m.id, earned: m.earned, max: m.max }; }),
      topics: rep.topics.map(function (t) { return { group: t.group, earned: t.earned, max: t.max }; }),
      items: rep.items.map(function (i) { return { id: i.id, m: i.mission, topic: i.group, pts: i.pts, best: i.best, first: i.firstAttempt ? i.firstAttempt.points : 0, n: i.attempts.length, limit: i.attemptLimit }; })
    };
  };

  Y.queue = function (payload) {
    var q = rd().filter(function (p) { return p.session.id !== payload.session.id; }); q.push(payload); wr(q);
  };

  /* Send everything queued. Resolves {sent, pending, rejected?, duplicate?}. */
  Y.flush = function () {
    if (!Y.enabled()) return Promise.resolve({ sent: 0, pending: 0, off: true });
    var q = rd(), out = { sent: 0, pending: q.length, rejected: '', duplicate: false };
    return q.reduce(function (chain, p) {
      return chain.then(function () {
        if (out.stop) return;
        return post({ action: 'submit', payload: p }).then(function (r) {
          if (r && (r.ok || r.reason === 'duplicate')) { out.duplicate = out.duplicate || r.reason === 'duplicate' || r.status === 'resubmission'; wr(rd().filter(function (x) { return x.session.id !== p.session.id; })); out.sent++; }
          else if (r && r.reason === 'code') { out.rejected = 'code'; out.stop = true; }
          else out.stop = true;
        }, function () { out.stop = true; });
      });
    }, Promise.resolve()).then(function () { out.pending = rd().length; return out; });
  };

  Y.retryLoop = function (onStatus) {
    var n = 0, timer = null;
    function go() { clearTimeout(timer); return Y.flush().then(function (r) { if (onStatus) onStatus(r); if (r.pending > 0 && !r.rejected) timer = setTimeout(go, Math.min(60000, 5000 * Math.pow(2, n++))); return r; }); }
    if (root.addEventListener) root.addEventListener('online', function () { n = 0; go(); });
    return { now: function () { n = 0; return go(); } };
  };
})(typeof window !== 'undefined' ? window : globalThis);
