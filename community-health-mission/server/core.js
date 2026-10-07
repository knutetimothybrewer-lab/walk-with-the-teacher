(function (root) {
  'use strict';
  var G = (typeof module !== 'undefined' && module.exports) ? require('./grading') : root.CHM_grading;

  // createEngine wires pure logic to (a) content {pub, priv}, (b) a store, and (c) environment helpers.
  // The store is synchronous (Apps Script is synchronous) and provides withLock for atomic read-modify-write.
  function createEngine(opts) {
    var pub = opts.pub, priv = opts.priv, store = opts.store, env = opts.env;
    var now = opts.now || function () { return new Date().getTime(); };
    var unitList = [];
    var unitById = {};
    pub.modules.forEach(function (m) { m.units.forEach(function (u) { u.module = m.id; unitList.push(u); unitById[u.id] = u; }); });
    var totalPoints = unitList.reduce(function (a, u) { return a + u.points; }, 0);
    var REQ_CACHE = 10, TOKEN_TTL = 2 * 60 * 60;

    function iso(t) { return new Date(t).toISOString(); }
    function fail(code, message, extra) { var r = { ok: false, code: code, message: message }; if (extra) for (var k in extra) r[k] = extra[k]; return r; }
    function clean(s, n) { return String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n); }
    function normCode(c) { return clean(c, 40).toUpperCase().replace(/\s+/g, ''); }
    function isPreviewId(id) { return typeof id === 'string' && id.indexOf('PV-') === 0; }
    function safeEq(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

    // ------------------------------------------------------------------ teacher auth
    function teacherAuth(p) {
      var tok = p && p.teacherToken;
      if (!tok || typeof tok !== 'string') return false;
      var rec = store.kvGet('tt:' + env.sha256(tok));
      return !!rec;
    }
    function requireTeacher(p) { return teacherAuth(p) ? null : fail('FORBIDDEN', 'Teacher authorization required.'); }

    function teacherLogin(p) {
      var cfg = store.getTeacherConfig();
      if (!cfg || !cfg.hash) return fail('NOT_CONFIGURED', 'Teacher passcode has not been set up yet. See the README.');
      var failKey = 'tf:login', fails = store.kvGet(failKey) || 0;
      if (fails >= 6) return fail('LOCKED', 'Too many attempts. Wait 10 minutes and try again.');
      var ok = typeof p.passcode === 'string' && p.passcode.length > 0 && safeEq(env.sha256(cfg.salt + p.passcode), cfg.hash);
      var ae = env.activeUserEmail ? String(env.activeUserEmail() || '').toLowerCase() : '';
      if (!ok && ae && cfg.emails && cfg.emails.indexOf(ae) >= 0 && p.useAccount === true) ok = true; // account email is read SERVER-side only
      if (!ok) { store.kvPut(failKey, fails + 1, 600); return fail('BAD_PASSCODE', 'That passcode is not correct.'); }
      store.kvPut(failKey, 0, 1);
      var token = env.randomId(32);
      store.kvPut('tt:' + env.sha256(token), 1, TOKEN_TTL);
      return { ok: true, teacherToken: token, expiresInSeconds: TOKEN_TTL };
    }

    // ------------------------------------------------------------------ sessions
    function newSessionState(id, cls, ident, preview) {
      var t = now();
      var s = { id: id, preview: !!preview, classCode: cls ? cls.code : 'PREVIEW', section: cls ? cls.section : '', rosterId: ident.rosterId, name: ident.name, period: ident.period,
        version: pub.version, status: 'active', token: env.randomId(24), createdAt: t, lastSaved: t, units: {}, ledger: [], activity: {}, position: { module: 0, unit: 0 },
        requests: [], rowsWritten: 0, revealMode: cls ? cls.revealMode : 'final', final: null, resets: 0 };
      unitList.forEach(function (u) { s.units[u.id] = { attempts: 0, status: 'open', earned: 0, last: null, hint: null, correctOn: null }; });
      return s;
    }
    function loadSession(id, tokenIn, p) {
      if (typeof id !== 'string' || id.length > 40) return { err: fail('NO_SESSION', 'Session not found.') };
      var preview = isPreviewId(id);
      if (preview) { var terr = requireTeacher(p); if (terr) return { err: terr }; }
      var s = preview ? store.getPreview(id) : store.getSession(id);
      if (!s || typeof tokenIn !== 'string' || !safeEq(s.token, tokenIn)) return { err: fail('NO_SESSION', 'Session not found or not authorized.') };
      if (s.status === 'reset') return { err: fail('RESET', 'This session was reset by your teacher. Re-enter your class code to start fresh.') };
      return { s: s, preview: preview };
    }
    function persist(s, preview) {
      s.lastSaved = now();
      if (s.requests.length > REQ_CACHE) s.requests = s.requests.slice(-REQ_CACHE);
      if (preview) store.putPreview(s); else store.putSession(s);
    }
    function maxCreditNext(sUnit, u) {
      var a = sUnit.attempts + 1;
      return a > G.MAX_ATTEMPTS ? 0 : G.round2(u.points * G.creditFor(a));
    }
    function publicState(s) {
      var us = {};
      unitList.forEach(function (u) {
        var x = s.units[u.id];
        us[u.id] = { attempts: x.attempts, status: x.status, last: x.last, hint: x.hint, next: x.status === 'open' ? { attempt: x.attempts + 1, maxCredit: maxCreditNext(x, u) } : null,
          earned: x.status === 'open' ? null : G.round2(x.earned), correctOn: x.correctOn };
      });
      return { sessionId: s.id, status: s.status, units: us, position: s.position, activity: s.activity, final: s.final ? finalPublic(s) : null, preview: !!s.preview, lastSaved: iso(s.lastSaved), createdAt: iso(s.createdAt) };
    }

    function classOpen(cls) {
      var t = now();
      if (cls.status !== 'open') return 'This assessment is not open right now. Ask your teacher.';
      if (cls.opensAt && t < Date.parse(cls.opensAt)) return 'This assessment is not open yet.';
      if (cls.closesAt && t > Date.parse(cls.closesAt)) return 'This assessment has closed.';
      return null;
    }

    function join(p) {
      var code = normCode(p.classCode), rosterId = clean(p.rosterId, 24), name = clean(p.name, 40), period = clean(p.period, 12);
      if (!code) return fail('BAD_INPUT', 'Enter your class code.');
      if (!/^[A-Za-z0-9_\-]{2,24}$/.test(rosterId)) return fail('BAD_INPUT', 'Roster ID should be 2-24 letters, numbers, - or _.');
      if (!name) return fail('BAD_INPUT', 'Enter your display name.');
      var cls = store.getClass(code);
      if (!cls) return fail('BAD_CLASS', 'That class code was not found. Check it with your teacher.');
      var why = classOpen(cls); if (why) return fail('CLOSED', why);
      if (cls.version !== pub.version) return fail('VERSION', 'This class code is set for a different version of the assessment. Ask your teacher.');
      if (cls.requireRoster) {
        var r = store.getRoster(code, rosterId);
        if (!r || !p.studentToken || !safeEq(r.accessToken, String(p.studentToken))) return fail('ROSTER', 'Your roster ID and access token were not recognized. Ask your teacher.');
      }
      return store.withLock(function () {
        var id = store.findSessionId(code, rosterId, pub.version), s = id ? store.getSession(id) : null;
        var created = false;
        if (!s) {
          s = newSessionState('S' + env.randomId(14), cls, { rosterId: rosterId, name: name, period: period }, false);
          created = true;
          store.putSession(s);
        }
        return { ok: true, created: created, sessionId: s.id, token: s.token, state: publicState(s), student: { name: s.name, rosterId: s.rosterId, period: s.period },
          cls: { name: cls.name, section: cls.section, revealMode: cls.revealMode, pacing: Number(cls.pacingFactor) || 1 }, version: pub.version, serverTime: iso(now()) };
      });
    }

    // Replay support: stored result for an already-processed requestId.
    function replayOf(s, requestId) {
      for (var i = 0; i < s.requests.length; i++) if (s.requests[i].id === requestId) return s.requests[i].res;
      return null;
    }
    function remember(s, requestId, res) { s.requests.push({ id: requestId, res: res }); }
    function okReq(rid) { return typeof rid === 'string' && /^[A-Za-z0-9_\-]{8,64}$/.test(rid); }

    function getState(p) {
      var L = loadSession(p.sessionId, p.token, p); if (L.err) return L.err;
      return { ok: true, state: publicState(L.s), serverTime: iso(now()) };
    }

    // Core attempt processing (shared by real, preview and scenario flows). Returns the response object.
    function processSubmit(s, preview, unitId, response, requestId, expectedAttempt) {
      var u = unitById[unitId];
      if (!u) return fail('BAD_UNIT', 'Unknown question.');
      var su = s.units[unitId];
      if (s.status === 'finalized') return fail('FINALIZED', 'This assessment was already submitted.');
      if (su.status !== 'open') return fail('LOCKED', 'This question is already finished.', { state: publicState(s) });
      if (expectedAttempt != null && expectedAttempt !== su.attempts + 1) return fail('STALE', 'This question changed in another tab. Your screen was refreshed; nothing was used.', { state: publicState(s) });
      var bad = G.validateUnit(pub, u, response);
      if (bad) return fail('INVALID', bad);
      var pu = priv.units[unitId];
      var correct = G.gradeUnit(pub, u, pu, response);
      su.attempts += 1;
      su.last = response;
      var attempt = su.attempts, res = { ok: true, unitId: unitId, attempt: attempt, correct: correct, requestId: requestId };
      var t = now();
      var earned = 0;
      if (correct) { su.status = 'correct'; su.correctOn = attempt; earned = G.round2(u.points * G.creditFor(attempt)); su.earned = earned; su.hint = null; }
      else if (attempt >= G.MAX_ATTEMPTS) { su.status = 'exhausted'; su.earned = 0; su.hint = null; }
      else { su.hint = pu.hints[attempt - 1] || pu.hints[pu.hints.length - 1]; }
      res.status = su.status; res.locked = su.status !== 'open';
      if (res.locked) res.earned = G.round2(su.earned), res.max = u.points;
      if (!correct && !res.locked) { res.hint = su.hint; res.next = { attempt: attempt + 1, maxCredit: G.round2(u.points * G.creditFor(attempt + 1)) }; }
      if (res.locked && s.revealMode === 'onLock') res.review = reviewUnit(s, u);
      s.ledger.push({ u: unitId, n: attempt, c: correct ? 1 : 0, e: G.round2(earned), t: t, r: requestId, p: JSON.stringify(response).slice(0, 1500) });
      return res;
    }

    function submitUnit(p) {
      if (!okReq(p.requestId)) return fail('BAD_REQUEST', 'Missing request id.');
      return store.withLock(function () {
        var L = loadSession(p.sessionId, p.token, p); if (L.err) return L.err;
        var s = L.s, rep = replayOf(s, p.requestId);
        if (rep) { var r = JSON.parse(JSON.stringify(rep)); r.replayed = true; r.state = publicState(s); r.savedAt = iso(s.lastSaved); return r; }
        var res = processSubmit(s, L.preview, p.unitId, p.response, p.requestId, p.expectedAttempt);
        if (!res.ok) return res;
        remember(s, p.requestId, res);
        persist(s, L.preview);
        if (!L.preview) flushRows(s);
        var out = JSON.parse(JSON.stringify(res)); out.state = publicState(s); out.savedAt = iso(s.lastSaved);
        return out;
      });
    }

    // Append not-yet-written ledger rows to the Responses table (state is authoritative; rows are derived).
    function flushRows(s) {
      if (s.rowsWritten >= s.ledger.length) return;
      var rows = [];
      for (var i = s.rowsWritten; i < s.ledger.length; i++) {
        var l = s.ledger[i], u = unitById[l.u];
        rows.push({ sessionId: s.id, classCode: s.classCode, section: s.section, rosterId: s.rosterId, version: s.version, taskId: l.u, module: u.module, concept: priv.units[l.u].target, attempt: l.n,
          response: l.p || '', acceptedAt: iso(l.t), correct: l.c ? 'TRUE' : 'FALSE', earned: l.e, possible: u.points, requestId: l.r });
      }
      store.appendResponses(rows);
      for (var j = s.rowsWritten; j < s.ledger.length; j++) delete s.ledger[j].p;
      s.rowsWritten = s.ledger.length;
      store.putSession(s);
    }

    function checkpoint(p) {
      if (!okReq(p.requestId)) return fail('BAD_REQUEST', 'Missing request id.');
      return store.withLock(function () {
        var L = loadSession(p.sessionId, p.token, p); if (L.err) return L.err;
        var s = L.s;
        if (s.status === 'finalized') return { ok: true, state: publicState(s) };
        if (replayOf(s, p.requestId)) return { ok: true, replayed: true };
        if (p.position && typeof p.position === 'object') {
          var mi = Number(p.position.module) | 0, ui = Number(p.position.unit) | 0;
          if (mi >= 0 && mi <= pub.modules.length && ui >= 0 && ui < 20) s.position = { module: mi, unit: ui };
        }
        if (p.activity && typeof p.activity === 'object') {
          var json = JSON.stringify(p.activity);
          if (json.length > 8000) return fail('TOO_BIG', 'Activity data is too large.');
          var keys = Object.keys(p.activity);
          for (var i = 0; i < keys.length; i++) {
            if (!/^[A-Za-z0-9_\-]{1,24}$/.test(keys[i])) return fail('BAD_INPUT', 'Bad activity key.');
            s.activity[keys[i]] = p.activity[keys[i]];
          }
          if (JSON.stringify(s.activity).length > 16000) { Object.keys(s.activity).slice(0, 2).forEach(function (k) { delete s.activity[k]; }); }
        }
        remember(s, p.requestId, { ok: true });
        persist(s, L.preview);
        return { ok: true, savedAt: iso(s.lastSaved) };
      });
    }

    // ------------------------------------------------------------------ results
    function computeResults(s) {
      var mods = pub.modules.map(function (m) { return { id: m.id, title: m.title, earned: 0, possible: 0, completed: 0, correct: 0, units: m.units.length, firstTry: 0, retries: 0 }; });
      var earned = 0, completed = 0, correct = 0, firstTry = 0, attempts = 0, exhausted = 0;
      unitList.forEach(function (u) {
        var x = s.units[u.id], m = mods[u.module - 1];
        m.possible += u.points; m.earned += x.earned; earned += x.earned; attempts += x.attempts;
        if (x.status !== 'open') { completed++; m.completed++; }
        if (x.status === 'correct') { correct++; m.correct++; if (x.correctOn === 1) { firstTry++; m.firstTry++; } }
        if (x.status === 'exhausted') exhausted++;
        if (x.attempts > 1) m.retries += x.attempts - 1;
      });
      mods.forEach(function (m) { m.earned = G.round2(m.earned); m.pct = m.possible ? m.earned / m.possible * 100 : 0; });
      var pct = totalPoints ? earned / totalPoints * 100 : 0;
      var ranked = mods.slice().sort(function (a, b) { return b.pct - a.pct; });
      return { earned: G.round2(earned), possible: totalPoints, pct: pct, pctDisplay: (Math.round(pct * 10) / 10).toFixed(1), completed: completed, correct: correct, units: unitList.length,
        firstTryCorrect: firstTry, firstTryAccuracy: unitList.length ? firstTry / unitList.length : 0, attempts: attempts, exhausted: exhausted, modules: mods,
        strengths: ranked.filter(function (m) { return m.pct >= 85; }).slice(0, 3).map(function (m) { return m.title; }),
        review: ranked.slice().reverse().filter(function (m) { return m.pct < 85; }).slice(0, 3).map(function (m) { return m.title; }) };
    }
    function finalPublic(s) {
      var f = s.final, r = computeResults(s);
      return { receiptId: f.receiptId, finalizedAt: iso(f.finalizedAt), elapsedMinutes: Math.round((f.finalizedAt - s.createdAt) / 600) / 100, gradebook: f.gradebook, results: r, student: { name: s.name, rosterId: s.rosterId, period: s.period, classCode: s.classCode, section: s.section },
        preview: !!s.preview, label: s.preview ? 'Teacher Preview — No Student Grade Recorded' : null, version: s.version };
    }
    function receiptId(s, t) { return (s.preview ? 'PV-' : 'CHM-') + env.sha256(s.id + '|' + t).slice(0, 8).toUpperCase(); }

    function finalize(p) {
      if (!okReq(p.requestId)) return fail('BAD_REQUEST', 'Missing request id.');
      if (p.confirm !== true) return fail('NOT_CONFIRMED', 'Please confirm that you are ready to submit.');
      return store.withLock(function () {
        var L = loadSession(p.sessionId, p.token, p); if (L.err) return L.err;
        var s = L.s;
        if (s.status === 'finalized') return { ok: true, already: true, state: publicState(s), final: finalPublic(s) };
        var open = unitList.filter(function (u) { return s.units[u.id].status === 'open'; });
        if (open.length && !L.preview) return fail('INCOMPLETE', open.length + ' question(s) are not finished yet.', { open: open.map(function (u) { return u.id; }) });
        var t = now();
        s.status = 'finalized';
        s.final = { receiptId: receiptId(s, t), finalizedAt: t, gradebook: L.preview ? 'simulated' : 'pending' };
        if (!L.preview) {
          flushRows(s);
          try { store.writeGradebook(s, computeResults(s)); s.final.gradebook = 'recorded'; } catch (e) { s.final.gradebook = 'pending'; s.final.error = String(e && e.message || e).slice(0, 120); }
        }
        persist(s, L.preview);
        return { ok: true, state: publicState(s), final: finalPublic(s) };
      });
    }

    function retryGradebook(p) {
      return store.withLock(function () {
        var L = loadSession(p.sessionId, p.token, p); if (L.err) return L.err;
        var s = L.s;
        if (s.status !== 'finalized') return fail('NOT_FINAL', 'Not submitted yet.');
        if (s.final.gradebook === 'recorded' || s.preview) return { ok: true, final: finalPublic(s) };
        try { flushRows(s); store.writeGradebook(s, computeResults(s)); s.final.gradebook = 'recorded'; delete s.final.error; } catch (e) { s.final.error = String(e && e.message || e).slice(0, 120); }
        persist(s, false);
        return { ok: true, final: finalPublic(s) };
      });
    }

    // ------------------------------------------------------------------ review
    function reviewUnit(s, u) {
      var pu = priv.units[u.id], x = s.units[u.id];
      return { id: u.id, title: u.title, module: u.module, points: u.points, status: x.status, attempts: x.attempts, earned: G.round2(x.earned), correctOn: x.correctOn,
        answer: u.fields.map(function (f) { return { label: f.label || u.title, text: G.formatKey(pub, f, pu.keys[f.id]) }; }), explanation: pu.explain };
    }
    function getReview(p) {
      var L = loadSession(p.sessionId, p.token, p); if (L.err) return L.err;
      var s = L.s;
      if (s.status !== 'finalized') {
        if (s.revealMode !== 'onLock') return fail('NOT_YET', 'Explanations unlock after you submit your final answers.');
        return { ok: true, partial: true, units: unitList.filter(function (u) { return s.units[u.id].status !== 'open'; }).map(function (u) { return reviewUnit(s, u); }) };
      }
      return { ok: true, units: unitList.map(function (u) { return reviewUnit(s, u); }), final: finalPublic(s) };
    }

    // ------------------------------------------------------------------ teacher
    function teacherAnswerView(p) {
      var e = requireTeacher(p); if (e) return e;
      return { ok: true, version: pub.version, totalPoints: totalPoints, modules: pub.modules.map(function (m) { return { id: m.id, title: m.title, points: m.points, minutes: m.minutes, units: m.units.map(function (u) {
        var pu = priv.units[u.id];
        return { id: u.id, title: u.title, points: u.points, minutes: u.minutes, target: pu.target, dok: pu.dok, cog: pu.cog, needsGraph: pu.needsGraph, src: pu.src, rubric: pu.rubric, explain: pu.explain, hints: pu.hints,
          credit: [u.points, G.round2(u.points * 0.85), G.round2(u.points * 0.75), 0],
          answer: u.fields.map(function (f) { return { id: f.id, type: f.type, text: G.formatKey(pub, f, pu.keys[f.id]) }; }) };
      }) }; }) };
    }
    function previewStart(p) {
      var e = requireTeacher(p); if (e) return e;
      var id = 'PV-' + env.randomId(12);
      var s = newSessionState(id, null, { rosterId: 'PREVIEW', name: 'Teacher Preview', period: '' }, true);
      s.revealMode = p.revealMode === 'onLock' ? 'onLock' : 'final';
      store.putPreview(s);
      return { ok: true, sessionId: id, token: s.token, state: publicState(s), student: { name: 'Teacher Preview', rosterId: 'PREVIEW', period: '' }, cls: { name: 'Teacher Preview', section: '', revealMode: s.revealMode, pacing: 1 }, version: pub.version, preview: true, label: 'Teacher Preview — No Student Grade Recorded' };
    }
    function previewReset(p) {
      var e = requireTeacher(p); if (e) return e;
      if (!isPreviewId(p.sessionId)) return fail('FORBIDDEN', 'Only preview sessions can be reset here.');
      var old = store.getPreview(p.sessionId);
      if (!old || !safeEq(old.token, String(p.token))) return fail('NO_SESSION', 'Preview session not found.');
      var s = newSessionState(old.id, null, { rosterId: 'PREVIEW', name: 'Teacher Preview', period: '' }, true);
      s.token = old.token; s.revealMode = old.revealMode;
      if (p.unitId && unitById[p.unitId]) { old.units[p.unitId] = s.units[p.unitId]; old.ledger = old.ledger.filter(function (l) { return l.u !== p.unitId; }); old.status = 'active'; old.final = null; store.putPreview(old); return { ok: true, state: publicState(old) }; }
      store.putPreview(s);
      return { ok: true, state: publicState(s) };
    }
    // Fill a preview session so outcomes can be inspected: mode = first | second | third | exhaust
    function previewScenario(p) {
      var e = requireTeacher(p); if (e) return e;
      if (!isPreviewId(p.sessionId)) return fail('FORBIDDEN', 'Preview sessions only.');
      var want = { first: 1, second: 2, third: 3, exhaust: 4 }[p.mode];
      if (!want) return fail('BAD_INPUT', 'Unknown scenario.');
      return store.withLock(function () {
        var L = loadSession(p.sessionId, p.token, p); if (L.err) return L.err;
        var s = L.s;
        var fresh = newSessionState(s.id, null, { rosterId: 'PREVIEW', name: 'Teacher Preview', period: '' }, true);
        fresh.token = s.token; fresh.revealMode = s.revealMode; s = fresh;
        unitList.forEach(function (u) {
          var pu = priv.units[u.id], k = 0;
          while (s.units[u.id].status === 'open') {
            k++;
            var resp = (want < 4 && k === want) ? G.makeCorrect(pub, u, pu) : G.makeWrong(pub, u, pu);
            var r = processSubmit(s, true, u.id, resp, 'scn' + k + u.id.replace(/\W/g, ''), k);
            if (!r.ok) throw new Error('scenario failed ' + JSON.stringify(r));
          }
        });
        persist(s, true);
        return { ok: true, state: publicState(s) };
      });
    }
    function previewDeliveryTest(p) {
      var e = requireTeacher(p); if (e) return e;
      return store.withLock(function () {
        var id = 'TEST-' + env.randomId(8), t = now();
        try {
          var info = store.testDelivery({ id: id, at: iso(t) });
          return { ok: true, id: id, readBack: !!info.readBack, destination: info.destination, label: 'Gradebook delivery TEST (isolated test record, excluded from reports)' };
        } catch (err) { return fail('DELIVERY_FAILED', 'Test delivery failed: ' + String(err && err.message || err)); }
      });
    }

    function teacherClasses(p) { var e = requireTeacher(p); if (e) return e; return { ok: true, classes: store.listClasses() }; }
    function teacherSaveClass(p) {
      var e = requireTeacher(p); if (e) return e;
      var c = p.cls || {}, code = normCode(c.code);
      if (!/^[A-Z0-9_\-]{4,24}$/.test(code)) return fail('BAD_INPUT', 'Class codes use 4-24 letters/numbers.');
      var rec = { code: code, name: clean(c.name, 60), section: clean(c.section, 20), version: pub.version, status: c.status === 'closed' ? 'closed' : 'open', opensAt: clean(c.opensAt, 30), closesAt: clean(c.closesAt, 30),
        requireRoster: !!c.requireRoster, revealMode: c.revealMode === 'onLock' ? 'onLock' : 'final', pacingFactor: Math.max(1, Math.min(3, Number(c.pacingFactor) || 1)) };
      store.saveClass(rec);
      return { ok: true, cls: rec };
    }
    function teacherSessions(p) {
      var e = requireTeacher(p); if (e) return e;
      var code = p.classCode ? normCode(p.classCode) : null;
      return { ok: true, sessions: store.listSessions(code).map(sessionRow) };
    }
    function sessionRow(s) {
      var r = computeResults(s);
      return { sessionId: s.id, classCode: s.classCode, section: s.section, rosterId: s.rosterId, name: s.name, period: s.period, version: s.version, status: s.status, startedAt: iso(s.createdAt), lastSaved: iso(s.lastSaved),
        completedAt: s.final ? iso(s.final.finalizedAt) : '', elapsedMin: Math.round(((s.final ? s.final.finalizedAt : s.lastSaved) - s.createdAt) / 600) / 100, earned: r.earned, possible: r.possible, pct: Math.round(r.pct * 10) / 10,
        firstTryAcc: Math.round(r.firstTryAccuracy * 1000) / 10, completed: r.completed, gradebook: s.final ? s.final.gradebook : '', receiptId: s.final ? s.final.receiptId : '', modules: r.modules.map(function (m) { return Math.round(m.earned * 100) / 100; }) };
    }
    function teacherReset(p) {
      var e = requireTeacher(p); if (e) return e;
      var reason = clean(p.reason, 200);
      if (reason.length < 5) return fail('BAD_INPUT', 'Enter a reason (at least 5 characters) for the audit log.');
      return store.withLock(function () {
        var s = store.getSession(String(p.sessionId));
        if (!s) return fail('NO_SESSION', 'Session not found.');
        if (s.status === 'reset') return { ok: true, already: true };
        var prev = s.status;
        s.status = 'reset'; s.resets = (s.resets || 0) + 1; s.lastSaved = now();
        store.putSession(s);
        store.markGradebookReset(s);
        store.appendAudit({ action: 'RESET', sessionId: s.id, classCode: s.classCode, rosterId: s.rosterId, previousStatus: prev, reason: reason, at: iso(now()), version: s.version, by: clean(p.by || 'teacher', 60) });
        return { ok: true };
      });
    }
    function csvCell(v) {
      var s = String(v == null ? '' : v);
      if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
      if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
      return s;
    }
    function teacherExport(p) {
      var e = requireTeacher(p); if (e) return e;
      var code = p.classCode ? normCode(p.classCode) : null;
      var rows = store.listSessions(code).filter(function (s) { return s.status !== 'reset'; }).map(sessionRow);
      var head = ['Class', 'Section', 'RosterID', 'Name', 'Period', 'Status', 'Started', 'Completed', 'ElapsedMin', 'Earned', 'Possible', 'Percent', 'FirstTryAccuracyPct', 'UnitsCompleted', 'Gradebook', 'Receipt'].concat(pub.modules.map(function (m) { return 'M' + m.id + ' ' + m.title + ' (/' + m.points + ')'; }));
      var lines = [head.map(csvCell).join(',')];
      rows.forEach(function (r) { lines.push([r.classCode, r.section, r.rosterId, r.name, r.period, r.status, r.startedAt, r.completedAt, r.elapsedMin, r.earned, r.possible, r.pct, r.firstTryAcc, r.completed, r.gradebook, r.receiptId].concat(r.modules).map(csvCell).join(',')); });
      return { ok: true, filename: 'results-' + (code || 'all') + '.csv', csv: '﻿' + lines.join('\r\n') + '\r\n' };
    }
    function teacherSummary(p) {
      var e = requireTeacher(p); if (e) return e;
      var code = p.classCode ? normCode(p.classCode) : null;
      return { ok: true, summary: buildSummary(store.listSessions(code).filter(function (s) { return s.status !== 'reset'; })) };
    }
    function buildSummary(sessions) {
      var done = sessions.filter(function (s) { return s.status === 'finalized'; });
      var items = unitList.map(function (u) {
        var n = 0, first = 0, retries = 0, exh = 0;
        sessions.forEach(function (s) { var x = s.units[u.id]; if (x.attempts > 0) { n++; if (x.correctOn === 1) first++; retries += Math.max(0, x.attempts - 1); if (x.status === 'exhausted') exh++; } });
        return { id: u.id, module: u.module, title: u.title, concept: priv.units[u.id].target, answered: n, firstTryAcc: n ? first / n : null, retries: retries, exhausted: exh };
      });
      var missed = items.filter(function (i) { return i.answered > 0; }).sort(function (a, b) { return (a.firstTryAcc - b.firstTryAcc) || (b.exhausted - a.exhausted); }).slice(0, 5);
      var mods = pub.modules.map(function (m) { var tot = 0, poss = 0; done.forEach(function (s) { unitList.forEach(function (u) { if (u.module === m.id) { tot += s.units[u.id].earned; poss += u.points; } }); }); return { id: m.id, title: m.title, avgPct: poss ? tot / poss * 100 : null }; });
      var avg = done.length ? done.reduce(function (a, s) { return a + computeResults(s).pct; }, 0) / done.length : null;
      return { students: sessions.length, finalized: done.length, avgPct: avg, modules: mods, items: items, commonMissed: missed };
    }

    // ------------------------------------------------------------------ dispatch
    var actions = { join: join, getState: getState, submitUnit: submitUnit, checkpoint: checkpoint, finalize: finalize, retryGradebook: retryGradebook, getReview: getReview,
      teacherLogin: teacherLogin, teacherAnswerView: teacherAnswerView, previewStart: previewStart, previewReset: previewReset, previewScenario: previewScenario, previewDeliveryTest: previewDeliveryTest,
      teacherClasses: teacherClasses, teacherSaveClass: teacherSaveClass, teacherSessions: teacherSessions, teacherReset: teacherReset, teacherExport: teacherExport, teacherSummary: teacherSummary };
    function handle(action, payload) {
      try {
        if (!Object.prototype.hasOwnProperty.call(actions, action)) return fail('BAD_ACTION', 'Unknown action.');
        if (!payload || typeof payload !== 'object') payload = {};
        return actions[action](payload);
      } catch (err) {
        if (String(err && err.message) === 'BUSY') return fail('BUSY', 'The server is busy. Trying again…', { retryable: true });
        return fail('SERVER_ERROR', 'The server had a problem. Nothing was lost; try again.', { retryable: true, detail: String(err && err.message || err).slice(0, 160) });
      }
    }
    return { handle: handle, computeResults: computeResults, buildSummary: buildSummary, publicState: publicState, unitList: unitList, totalPoints: totalPoints, csvCell: csvCell, sessionRow: sessionRow };
  }

  var api = { createEngine: createEngine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.CHM_core = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
