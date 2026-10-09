/* =====================================================================================================
 * server/engine.js: the assessment backend.  Platform independent: it talks to storage through the small
 * `store` interface (memory/file stores for Node, a Google Sheets store in Apps Script) and to the world
 * through `env` {sha256, randomId}.  Everything that matters is enforced HERE, never in the browser:
 *   - class-code validation per block          - answer keys (the bank lives only on the server)
 *   - official start time and 90-minute deadline - attempt counting and scoring (100/85/75/0)
 *   - submission locking                         - teacher authentication, resets, audit history
 * ===================================================================================================== */
(function (root) {
  'use strict';
  var NODE = typeof module === 'object' && module && module.exports;
  var U5 = NODE ? require('../shared/core.js') : root.U5;
  var G = NODE ? require('./grading.js') : root.U5G;
  var SEEDS = NODE ? require('../shared/seeds.js') : root.U5_SEEDS;

  var CHAPTER_COUNT = 6;
  var TOKEN_TTL = 6 * 60 * 60;            // teacher login lasts 6 hours (CacheService maximum)
  var PW_ITER = 3000;
  var SUBMISSION = { submitted: 'Submitted', expired: 'Time Expired — Auto-Submitted', teacher: 'Submitted by Teacher' };
  var STATUS = { registered: 'Not Started', active: 'In Progress', final: 'Submitted' };
  var DEFAULT_SETTINGS = { studentResults: 'full', calculator: true, referenceSheet: true };

  function createEngine(opts) {
    var bank = opts.bank, store = opts.store, env = opts.env;
    var now = opts.now || function () { return new Date().getTime(); };
    var LIMIT_MIN = opts.timeLimitMin != null ? opts.timeLimitMin : U5.TIME_LIMIT_MIN;
    var LIMIT_MS = LIMIT_MIN * 60000;
    var pwIter = opts.pwIter || PW_ITER;
    var idx = G.buildIndex(bank);
    var chapMeta = {};
    bank.chapters.forEach(function (c) { chapMeta[c.id] = c; });

    // total points and per-chapter points are static (variants never change points)
    var dummy = { seed: 'static' };
    var totalPts = 0, chapPts = {};
    idx.order.forEach(function (id) {
      var it = G.instantiate(idx.items[id], dummy);
      totalPts += it.pts; chapPts[it.ch] = (chapPts[it.ch] || 0) + it.pts;
    });
    totalPts = U5.round2(totalPts);

    // ------------------------------------------------------------------------------------ small helpers
    function iso(t) { return t ? new Date(t).toISOString() : ''; }
    function fail(code, message, extra) { var r = { ok: false, code: code, message: message }; if (extra) for (var k in extra) r[k] = extra[k]; return r; }
    function safeEq(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
    function okReq(rid) { return typeof rid === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(rid); }
    function isPreviewId(id) { return typeof id === 'string' && id.indexOf('PV-') === 0; }
    function copy(o) { return JSON.parse(JSON.stringify(o)); }
    function pwHash(salt, pw) { var h = salt + '|' + pw; for (var i = 0; i < pwIter; i++) h = env.sha256(h + salt); return h; }
    function settings() { var c = store.getConfig(); var s = {}; var cs = (c && c.settings) || {}; Object.keys(DEFAULT_SETTINGS).forEach(function (k) { s[k] = cs[k] != null ? cs[k] : DEFAULT_SETTINGS[k]; }); return s; }
    function instantiate(session, itemId) { return G.instantiate(idx.items[itemId], session); }
    function labSeeds(s) {
      return { coin: SEEDS.coin[U5.hashStr(String(s.seed) + '|coin') % SEEDS.coin.length], house: SEEDS.house[U5.hashStr(String(s.seed) + '|house') % SEEDS.house.length] };
    }

    // ------------------------------------------------------------------------------------ teacher auth
    function teacherOk(p) {
      var tok = p && p.teacherToken;
      if (!tok || typeof tok !== 'string' || tok.length < 20) return false;
      return !!store.kvGet('tt:' + env.sha256(tok));
    }
    function needTeacher(p) { return teacherOk(p) ? null : fail('FORBIDDEN', 'Teacher sign-in required.'); }

    function teacherLogin(p) {
      var cfg = store.getTeacher();
      if (!cfg || !cfg.hash) return fail('NOT_CONFIGURED', 'The teacher password has not been set yet. In the Google Sheet use the menu "Gambling Assessment > 2. Set teacher password".');
      var fails = store.kvGet('tf:login') || 0;
      if (fails >= 6) return fail('LOCKED', 'Too many incorrect tries. Wait 10 minutes and try again.');
      var good = typeof p.password === 'string' && p.password.length > 0 && p.password.length <= 128 && safeEq(pwHash(cfg.salt, p.password), cfg.hash);
      if (!good) { store.kvPut('tf:login', fails + 1, 600); return fail('BAD_PASSWORD', 'That password is not correct.'); }
      store.kvPut('tf:login', 0, 1);
      var token = env.randomId(40);
      store.kvPut('tt:' + env.sha256(token), 1, TOKEN_TTL);
      return { ok: true, teacherToken: token, expiresInSeconds: TOKEN_TTL, serverTime: iso(now()) };
    }
    function teacherLogout(p) { if (p.teacherToken) store.kvDel('tt:' + env.sha256(p.teacherToken)); return { ok: true }; }

    // ------------------------------------------------------------------------------------ sessions
    function newSession(info, preview) {
      var t = now();
      return {
        v: 1, id: (preview ? 'PV-' : 'S') + env.randomId(preview ? 10 : 16), preview: !!preview,
        key: info.key, first: info.first, last: info.last, studentId: info.studentId, block: info.block,
        token: env.randomId(28), status: 'registered', createdAt: t, startedAt: 0, deadline: 0, finalAt: 0, processedAt: 0, finalType: '',
        seed: env.randomId(14), items: {}, position: { ch: 1, step: 0 }, chMs: {}, loginCount: 1, concurrent: 0, resetCount: 0, resetLog: [],
        events: [{ t: t, e: 'created' }], requests: [], result: null, reported: false, demo: !!info.demo
      };
    }
    function ev(s, e, d) { s.events.push(d ? { t: now(), e: e, d: d } : { t: now(), e: e }); if (s.events.length > 40) s.events = s.events.slice(-40); }
    function loadSession(p) {
      var id = p && p.sessionId;
      if (typeof id !== 'string' || id.length > 40) return { err: fail('NO_SESSION', 'Session not found.') };
      if (isPreviewId(id)) {
        var e = needTeacher(p); if (e) return { err: e };
        var ps = store.getPreview(id);
        if (!ps) return { err: fail('NO_SESSION', 'Preview session not found. Start the preview again.') };
        return { s: ps, preview: true };
      }
      var s = store.getSession(id);
      if (!s || typeof p.token !== 'string' || !safeEq(s.token, p.token)) return { err: fail('NO_SESSION', 'Your session is no longer valid. Sign in again (your teacher may have reset it).') };
      return { s: s, preview: false };
    }
    function persist(s) {
      mergeTouch(s);
      if (s.requests.length > 12) s.requests = s.requests.slice(-12);
      if (s.preview) store.putPreview(s); else store.putSession(s);
    }
    function mergeTouch(s) {
      var tk = store.getTouch(s.id);
      if (!tk) return;
      Object.keys(tk.ms || {}).forEach(function (c) { if ((tk.ms[c] || 0) > (s.chMs[c] || 0)) s.chMs[c] = tk.ms[c]; });
      if (tk.pos) s.position = tk.pos;
      if (tk.sims) s.sims = tk.sims;
      s.lastSeen = tk.t || s.lastSeen;
    }
    function deadlineOf(s) { return s.status === 'registered' ? 0 : s.deadline; }
    function isDue(s, slack) { return s.status === 'active' && now() >= s.deadline + (slack || 0); }

    // Items resolved = correct or locked.  Chapter k+1 opens when every item of chapter k is resolved.
    function itemRec(s, id) { return s.items[id] || null; }
    function resolved(s, id) { var r = s.items[id]; return !!r && r.st !== 'open'; }
    function chapterItems(ch) { return idx.chapters[ch - 1].steps.filter(function (x) { return x.kind === 'item'; }).map(function (x) { return x.id; }); }
    function unlockedThrough(s) {
      if (s.preview || s.status === 'final') return CHAPTER_COUNT;
      if (s.status !== 'active') return 0;
      var k = 1;
      while (k < CHAPTER_COUNT && chapterItems(k).every(function (id) { return resolved(s, id); })) k++;
      return k;
    }

    function totalsOf(s) {
      var earned = 0, chap = {}, done = 0, attempts = 0, first = 0, locked = 0;
      for (var c = 1; c <= CHAPTER_COUNT; c++) chap[c] = { id: c, title: chapMeta[c].title, earned: 0, possible: chapPts[c] || 0 };
      idx.order.forEach(function (id) {
        var it = instantiate(s, id), r = s.items[id];
        var e = r ? G.earnedOf(it, r) : 0;
        earned += e; chap[it.ch].earned += e;
        if (r) { attempts += r.n; if (r.st !== 'open') done++; if (r.st === 'correct' && r.n === 1) first++; if (r.st === 'locked') locked++; }
      });
      Object.keys(chap).forEach(function (k) { chap[k].earned = U5.round2(chap[k].earned); });
      earned = U5.round2(earned);
      return { earned: earned, possible: totalPts, pct: totalPts ? U5.round1(100 * earned / totalPts) : 0, chapters: chap, itemsDone: done, itemsTotal: idx.order.length, attempts: attempts, firstTry: first, lockedWrong: locked };
    }

    // what a student/teacher UI sees about their own progress (never keys)
    function publicState(s) {
      var tot = totalsOf(s);
      var items = {};
      idx.order.forEach(function (id) {
        var r = s.items[id], it = instantiate(s, id);
        var o = { pts: it.pts, ch: it.ch, st: r ? r.st : 'open', n: r ? r.n : 0, earned: r ? G.earnedOf(it, r) : 0 };
        if (o.st === 'open') {
          var nextCredit = U5.creditFor(o.n + 1);
          o.next = { attempt: o.n + 1, maxCredit: U5.round2(Math.max(o.earned, it.pts * nextCredit)) };
          if (r && r.hint) o.hint = r.hint;
          if (r && r.detail) o.detail = r.detail;
          if (r && r.att.length && r.att[r.att.length - 1].r) { try { o.last = JSON.parse(r.att[r.att.length - 1].r); } catch (e) { /* ignore */ } }
        } else if (r && r.st === 'locked') {
          o.explain = it.explain || '';
        }
        items[id] = o;
      });
      var out = {
        sessionId: s.id, preview: !!s.preview, status: s.status, statusLabel: STATUS[s.status], serverTime: iso(now()),
        student: { first: s.first, last: s.last, studentId: s.studentId, block: s.block },
        startedAt: iso(s.startedAt), deadline: iso(deadlineOf(s)), timeLimitMin: LIMIT_MIN,
        position: s.position, unlockedThrough: unlockedThrough(s), items: items,
        progress: { done: tot.itemsDone, total: tot.itemsTotal, earned: tot.earned, possible: tot.possible },
        labs: labSeeds(s), sims: s.sims || {}, settings: settings(), final: s.status === 'final' ? finalPublic(s) : null,
        resetCount: s.resetCount
      };
      return out;
    }
    function finalPublic(s) {
      var r = s.result || totalsOf(s), mode = s.preview ? 'full' : settings().studentResults;
      var out = { type: s.finalType, typeLabel: SUBMISSION[s.finalType] || s.finalType, submittedAt: iso(s.finalAt), timeUsedMin: U5.round1((s.finalAt - s.startedAt) / 60000), preview: !!s.preview, resultsShown: mode, receipt: 'U5-' + env.sha256(s.id + '|' + s.finalAt).slice(0, 8).toUpperCase() };
      if (mode === 'full' || mode === 'score') { out.earned = r.earned; out.possible = r.possible; out.pct = r.pct; }
      if (mode === 'full') out.chapters = Object.keys(r.chapters).map(function (k) { return r.chapters[k]; });
      out.itemsDone = r.itemsDone; out.itemsTotal = r.itemsTotal;
      return out;
    }

    // ------------------------------------------------------------------------------------ login
    function codeFor(block) { var c = store.getConfig(); return c && c.codes && c.codes[block] ? c.codes[block] : null; }
    function login(p) {
      var first = U5.cleanText(p.firstName, 40), last = U5.cleanText(p.lastName, 40), sid = U5.normId(p.studentId), block = String(p.block || '');
      if (!first) return fail('BAD_INPUT', 'Enter your first name.', { field: 'firstName' });
      if (!last) return fail('BAD_INPUT', 'Enter your last name.', { field: 'lastName' });
      if (!U5.validId(sid)) return fail('BAD_INPUT', 'Enter your Student ID (3-20 letters or numbers, no spaces).', { field: 'studentId' });
      if (U5.BLOCKS.indexOf(block) < 0) return fail('BAD_INPUT', 'Choose your class block.', { field: 'block' });
      var code = U5.normCode(p.code);
      if (!code) return fail('BAD_INPUT', 'Enter the class access code your teacher gave you.', { field: 'code' });
      var failKey = 'lf:' + sid, fails = store.kvGet(failKey) || 0;
      if (fails >= 8) return fail('LOCKED', 'Too many incorrect codes for this Student ID. Wait 10 minutes or ask your teacher.');
      var bc = codeFor(block);
      if (!bc || !bc.code) return fail('NOT_CONFIGURED', 'No access code has been set for ' + block + ' yet. Ask your teacher.');
      if (!safeEq(U5.normCode(bc.code), code)) { store.kvPut(failKey, fails + 1, 600); return fail('BAD_CODE', 'That access code does not match ' + block + '. Check the code and the block you selected.', { field: 'code' }); }
      if (!bc.open) return fail('CLOSED', 'The assessment is not open for ' + block + ' right now. Ask your teacher.');
      if (store.hasRoster()) {
        var ro = store.getRoster(sid);
        if (!ro || ro.block !== block || U5.normName(ro.first) !== U5.normName(first) || U5.normName(ro.last) !== U5.normName(last)) return fail('ROSTER', 'Your name, Student ID and block were not found on the class roster. Check each one, or ask your teacher.');
      }
      return store.withLock(function () {
        var id = store.findByKey(sid), s = id ? store.getSession(id) : null, resumed = false;
        if (s) {
          if (s.block !== block) return fail('BLOCK_MISMATCH', 'This Student ID is already registered in a different class block. Only your teacher can change that.');
          if (U5.normName(s.first) !== U5.normName(first) || U5.normName(s.last) !== U5.normName(last)) return fail('NAME_MISMATCH', 'This Student ID is already registered under a different name. Use the same name you started with, or ask your teacher.');
          var tk = store.getTouch(s.id);
          if (tk && tk.t && now() - tk.t < 45000 && s.status === 'active') { s.concurrent = (s.concurrent || 0) + 1; ev(s, 'concurrent-login'); }
          s.token = env.randomId(28); s.loginCount = (s.loginCount || 1) + 1; ev(s, 'resume'); resumed = true;
          if (isDue(s)) doFinalize(s, 'expired');
          persist(s);
        } else {
          s = newSession({ key: sid, first: first, last: last, studentId: sid, block: block }, false);
          store.putSession(s); store.markDirty();
        }
        var st = publicState(s);
        return { ok: true, resumed: resumed, sessionId: s.id, token: s.token, state: st, serverTime: iso(now()) };
      });
    }

    function begin(p) {
      return store.withLock(function () {
        var L = loadSession(p); if (L.err) return L.err;
        var s = L.s;
        if (s.status === 'final') return fail('FINALIZED', 'This assessment has already been submitted.', { state: publicState(s) });
        if (s.status === 'active') return { ok: true, already: true, state: publicState(s) };
        if (!s.preview) {
          var bc = codeFor(s.block);
          if (!bc || !bc.open) return fail('CLOSED', 'The assessment is not open for ' + s.block + ' right now. Ask your teacher.');
        }
        var t = now();
        s.status = 'active'; s.startedAt = t; s.deadline = t + LIMIT_MS; s.position = { ch: 1, step: 0 }; ev(s, 'begin');
        persist(s); if (!s.preview) store.markDirty();
        return { ok: true, state: publicState(s) };
      });
    }

    // ------------------------------------------------------------------------------------ content
    function stepPublic(s, st, ch) {
      if (st.kind === 'item') return { kind: 'item', id: st.id };
      var o = {};
      Object.keys(st).forEach(function (k) { o[k] = st[k]; });
      return o;
    }
    function content(p) {
      var L = loadSession(p); if (L.err) return L.err;
      var s = L.s, ch = Number(p.chapter) | 0;
      if (ch < 1 || ch > CHAPTER_COUNT) return fail('BAD_INPUT', 'Unknown chapter.');
      if (s.status === 'registered') return fail('NOT_STARTED', 'Click Begin Assessment first.');
      if (ch > unlockedThrough(s)) return fail('LOCKED_CHAPTER', 'Finish the earlier chapters to unlock this one.');
      var c = bank.chapters[ch - 1];
      var steps = c.steps.map(function (st) {
        if (st.kind === 'item') return { kind: 'item', id: st.id, item: G.publicItem(instantiate(s, st.id), s.seed) };
        return stepPublic(s, st, ch);
      });
      return { ok: true, chapter: { id: c.id, title: c.title, subtitle: c.subtitle, theme: c.theme, minutes: c.minutes, points: chapPts[c.id], steps: steps } };
    }
    function outline() {
      return bank.chapters.map(function (c) { return { id: c.id, title: c.title, subtitle: c.subtitle, theme: c.theme, minutes: c.minutes, points: chapPts[c.id], items: chapterItems(c.id).length }; });
    }

    // ------------------------------------------------------------------------------------ attempts
    function replayOf(s, rid) { for (var i = 0; i < s.requests.length; i++) if (s.requests[i].id === rid) return s.requests[i].res; return null; }
    function remember(s, rid, res) { s.requests.push({ id: rid, res: res }); }

    function submit(p) {
      if (!okReq(p.requestId)) return fail('BAD_REQUEST', 'Missing request id.');
      return store.withLock(function () {
        var L = loadSession(p); if (L.err) return L.err;
        var s = L.s, rep = replayOf(s, p.requestId);
        if (rep) { var r0 = copy(rep); r0.replayed = true; r0.state = publicState(s); return r0; }
        if (s.status === 'final') return fail('FINALIZED', 'This assessment has already been submitted. No more answers can be recorded.', { state: publicState(s) });
        if (s.status !== 'active') return fail('NOT_STARTED', 'Click Begin Assessment first.');
        if (isDue(s)) { doFinalize(s, 'expired'); persist(s); return fail('TIME_UP', 'Time is up. Your earlier answers were submitted automatically; this answer was not recorded.', { state: publicState(s) }); }
        var entry = idx.items[p.itemId];
        if (!entry) return fail('BAD_ITEM', 'Unknown question.');
        if (entry.ch > unlockedThrough(s)) return fail('LOCKED_CHAPTER', 'That chapter is not unlocked yet.');
        var rec = s.items[p.itemId] || (s.items[p.itemId] = G.newRec());
        if (rec.st !== 'open') return fail('ITEM_DONE', 'This question is already finished.', { state: publicState(s) });
        if (p.expectedAttempt != null && Number(p.expectedAttempt) !== rec.n + 1) return fail('STALE', 'This question changed in another window. Your screen was refreshed; no attempt was used.', { state: publicState(s) });
        var it = instantiate(s, p.itemId);
        var bad = G.validateResponse(it, p.response);
        if (bad) { if (!rec.att.length) delete s.items[p.itemId]; return fail('INVALID', bad); }
        var g = G.gradeItem(it, p.response);
        var respJson = JSON.stringify(p.response); if (respJson.length > 1200) respJson = '';
        var ap = G.applyAttempt(rec, g, now(), respJson);
        var res = { ok: true, itemId: p.itemId, attempt: rec.n, correct: g.ok, status: rec.st, requestId: p.requestId };
        var multiUnit = g.detail.reduce(function (a, d) { return a + d.total; }, 0) > 1;
        if (multiUnit && !g.ok) { res.detail = g.detail; rec.detail = g.detail; res.partial = g.f > 0; }
        res.earned = G.earnedOf(it, rec); res.max = it.pts;
        if (rec.st === 'open') {
          var hs = it.hints || [], h = hs[Math.min(rec.n - 1, hs.length - 1)] || '';
          rec.hint = h; res.hint = h;
          res.next = { attempt: rec.n + 1, maxCredit: U5.round2(Math.max(res.earned, it.pts * U5.creditFor(rec.n + 1))) };
        } else { rec.hint = ''; rec.detail = null; if (rec.st === 'locked') res.explain = it.explain || ''; }
        res.locked = rec.st !== 'open';
        remember(s, p.requestId, res);
        persist(s);
        var out = copy(res); out.state = publicState(s);
        return out;
      });
    }

    // Cheap keep-alive: records position/labs/time-in-chapter in the cache, not the sheet.
    function heartbeat(p) {
      var L = loadSession(p); if (L.err) return L.err;
      var s = L.s, t = now();
      if (s.status === 'final') return { ok: true, status: 'final', serverTime: iso(t), state: publicState(s) };
      if (isDue(s)) {
        return store.withLock(function () {
          var s2 = loadSession(p); if (s2.err) return s2.err; s2 = s2.s;
          if (isDue(s2)) { doFinalize(s2, 'expired'); persist(s2); }
          return { ok: true, status: s2.status, serverTime: iso(now()), state: publicState(s2) };
        });
      }
      var tk = store.getTouch(s.id) || { t: t, ch: s.position && s.position.ch || 1, ms: copy(s.chMs || {}) };
      var elapsed = Math.min(Math.max(0, t - (tk.t || t)), 90000);
      if (s.status === 'active') tk.ms[tk.ch] = (tk.ms[tk.ch] || 0) + elapsed;
      var pos = p.pos && typeof p.pos === 'object' ? { ch: Math.max(1, Math.min(CHAPTER_COUNT, Number(p.pos.ch) | 0)), step: Math.max(0, Math.min(60, Number(p.pos.step) | 0)) } : s.position;
      if (pos.ch > unlockedThrough(s)) pos = s.position;
      tk.ch = pos.ch; tk.pos = pos; tk.t = t;
      if (p.sims && typeof p.sims === 'object' && JSON.stringify(p.sims).length < 600) tk.sims = p.sims;
      store.touch(s.id, tk);
      return { ok: true, status: s.status, serverTime: iso(t), deadline: iso(deadlineOf(s)) };
    }
    function getState(p) {
      return store.withLock(function () {
        var L = loadSession(p); if (L.err) return L.err;
        var s = L.s;
        mergeTouch(s);
        if (isDue(s)) { doFinalize(s, 'expired'); persist(s); }
        return { ok: true, state: publicState(s), serverTime: iso(now()), outline: outline() };
      });
    }

    // ------------------------------------------------------------------------------------ finalization
    function doFinalize(s, type) {
      if (s.status === 'final') return;
      var t = now();
      s.status = 'final'; s.finalType = type;
      s.processedAt = t;
      s.finalAt = type === 'expired' ? Math.min(t, s.deadline) : t;
      s.result = totalsOf(s);
      ev(s, 'final', type);
      if (!s.preview) { store.markDirty(); s.reported = false; }
    }
    function finalize(p) {
      if (!okReq(p.requestId)) return fail('BAD_REQUEST', 'Missing request id.');
      return store.withLock(function () {
        var L = loadSession(p); if (L.err) return L.err;
        var s = L.s;
        if (s.status === 'final') return { ok: true, already: true, state: publicState(s) };
        if (s.status !== 'active') return fail('NOT_STARTED', 'Click Begin Assessment first.');
        if (isDue(s)) { doFinalize(s, 'expired'); persist(s); return { ok: true, expired: true, state: publicState(s) }; }
        if (p.confirm !== true) return fail('NOT_CONFIRMED', 'Please confirm that you are ready to submit.');
        var open = idx.order.filter(function (id) { return !resolved(s, id); });
        if (open.length && p.confirmIncomplete !== true) return fail('INCOMPLETE', open.length + ' question' + (open.length === 1 ? ' is' : 's are') + ' not finished. Unfinished questions earn 0 points.', { open: open.length });
        doFinalize(s, 'submitted');
        persist(s);
        return { ok: true, state: publicState(s) };
      });
    }

    // Finalize every real session whose deadline has passed (runs from a 1-minute trigger and on teacher requests).
    function sweepExpired() {
      var n = 0;
      (store.listHeaders ? store.listHeaders() : store.listSessions()).forEach(function (hdr) {
        if (hdr.status !== 'active' || hdr.deadline > now()) return;
        store.withLock(function () {
          var s = store.getSession(hdr.id);
          if (s && isDue(s)) { mergeTouch(s); doFinalize(s, 'expired'); persist(s); n++; }
        });
      });
      return n;
    }

    // ------------------------------------------------------------------------------------ reporting tables
    function sessionRow(s) {
      var tot = s.result && s.status === 'final' ? s.result : totalsOf(s);
      return {
        sessionId: s.id, studentId: s.studentId, first: s.first, last: s.last, block: s.block, status: s.status, statusLabel: s.status === 'final' ? (s.finalType === 'expired' ? SUBMISSION.expired : 'Submitted') : STATUS[s.status],
        startedAt: iso(s.startedAt), deadline: iso(s.deadline), submittedAt: s.status === 'final' ? iso(s.finalAt) : '', submissionType: s.status === 'final' ? SUBMISSION[s.finalType] : '',
        timeUsedMin: s.startedAt ? U5.round1(((s.status === 'final' ? s.finalAt : Math.min(now(), s.deadline)) - s.startedAt) / 60000) : 0,
        remainingMin: s.status === 'active' ? U5.round1(Math.max(0, s.deadline - now()) / 60000) : null,
        earned: tot.earned, possible: tot.possible, pct: tot.pct, chapters: tot.chapters, itemsDone: tot.itemsDone, itemsTotal: tot.itemsTotal, attempts: tot.attempts,
        resetCount: s.resetCount || 0, resetStatus: s.resetCount ? 'Reset ' + s.resetCount + 'x (last ' + (s.resetLog.length ? iso(s.resetLog[s.resetLog.length - 1].at).slice(0, 16).replace('T', ' ') : '') + ' UTC)' : '',
        lastSeen: iso(s.lastSeen || s.createdAt), concurrent: s.concurrent || 0, loginCount: s.loginCount || 1, position: s.position, demo: !!s.demo
      };
    }
    function itemLabel(id) { var e = idx.items[id]; var it = G.instantiate(e, dummy); return id + ' ' + it.title; }
    function sortRows(rows) {
      return rows.sort(function (a, b) {
        var ba = U5.BLOCKS.indexOf(a.block), bb = U5.BLOCKS.indexOf(b.block);
        return ba - bb || a.last.toLowerCase().localeCompare(b.last.toLowerCase()) || a.first.toLowerCase().localeCompare(b.first.toLowerCase());
      });
    }
    function allRows(filterBlock, source) {
      var list = source === 'demo' ? store.listDemo() : store.listSessions();
      var rows = list.map(function (hdr) { var s = hdr.items ? hdr : store.getSession(hdr.id); return s ? sessionRow(s) : null; }).filter(Boolean);
      if (filterBlock && filterBlock !== 'all') rows = rows.filter(function (r) { return r.block === filterBlock; });
      return sortRows(rows);
    }
    function sessionsFull(filterBlock, source) {
      var list = source === 'demo' ? store.listDemo() : store.listSessions();
      var out = list.map(function (hdr) { return hdr.items ? hdr : store.getSession(hdr.id); }).filter(Boolean);
      if (filterBlock && filterBlock !== 'all') out = out.filter(function (s) { return s.block === filterBlock; });
      return out;
    }
    function median(a) { if (!a.length) return null; var b = a.slice().sort(function (x, y) { return x - y; }), m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
    function avg(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }
    function blockSummary(rows) {
      var fin = rows.filter(function (r) { return r.status === 'final'; });
      var pcts = fin.map(function (r) { return r.pct; });
      var bands = { '90-100': 0, '80-89': 0, '70-79': 0, '60-69': 0, 'Below 60': 0 };
      pcts.forEach(function (x) { bands[x >= 90 ? '90-100' : x >= 80 ? '80-89' : x >= 70 ? '70-79' : x >= 60 ? '60-69' : 'Below 60']++; });
      return { registered: rows.length, notStarted: rows.filter(function (r) { return r.status === 'registered'; }).length, inProgress: rows.filter(function (r) { return r.status === 'active'; }).length,
        submitted: fin.length, autoSubmitted: fin.filter(function (r) { return r.submissionType === SUBMISSION.expired; }).length, avgPct: avg(pcts) == null ? null : U5.round1(avg(pcts)), medianPct: median(pcts),
        high: pcts.length ? Math.max.apply(null, pcts) : null, low: pcts.length ? Math.min.apply(null, pcts) : null, bands: bands };
    }
    // Pure table builder used by the Google Sheets writer and by CSV/Excel export.
    function reportTables(source) {
      var rows = allRows('all', source), sessions = {};
      sessionsFull('all', source).forEach(function (s) { sessions[s.id] = s; });
      var chHead = []; for (var c = 1; c <= CHAPTER_COUNT; c++) chHead.push('Ch ' + c + ' ' + chapMeta[c].title + ' (/' + chapPts[c] + ')');
      var masterHead = ['First Name', 'Last Name', 'Student ID', 'Class Block', 'Status', 'Start Time (UTC)', 'Deadline (UTC)', 'Submission Time (UTC)', 'Time Used (min)', 'Submission Type', 'Score (/' + totalPts + ')', 'Percent'].concat(chHead).concat(['Items Finished', 'Total Attempts', 'Reset Status', 'Last Active (UTC)']);
      function tsv(t) { return t ? t.replace('T', ' ').slice(0, 19) : ''; }
      function masterRow(r) {
        var ch = []; for (var c = 1; c <= CHAPTER_COUNT; c++) ch.push(r.chapters[c].earned);
        return [r.first, r.last, r.studentId, r.block, r.statusLabel, tsv(r.startedAt), tsv(r.deadline), tsv(r.submittedAt), r.timeUsedMin, r.submissionType, r.earned, r.pct].concat(ch).concat([r.itemsDone + '/' + r.itemsTotal, r.attempts, r.resetStatus, tsv(r.lastSeen)]);
      }
      var ptsHead = idx.order.map(function (id) { return id + ' pts'; }), attHead = idx.order.map(function (id) { return id + ' tries'; });
      var blockHead = masterHead.slice(0, 3).concat(masterHead.slice(4)).concat(ptsHead).concat(attHead);
      function blockRow(r) {
        var s = sessions[r.sessionId], m = masterRow(r), pts = [], att = [];
        idx.order.forEach(function (id) { var rec = s.items[id], it = instantiate(s, id); pts.push(rec ? G.earnedOf(it, rec) : ''); att.push(rec ? rec.n : ''); });
        return m.slice(0, 3).concat(m.slice(4)).concat(pts).concat(att);
      }
      var tables = { master: { head: masterHead, rows: rows.map(masterRow) }, blocks: {}, summary: {} };
      U5.BLOCKS.forEach(function (b) {
        var br = rows.filter(function (r) { return r.block === b; });
        tables.blocks[b] = { head: blockHead, rows: br.map(blockRow), summary: blockSummary(br) };
        tables.summary[b] = tables.blocks[b].summary;
      });
      tables.summary.all = blockSummary(rows);
      tables.itemHeads = idx.order.map(itemLabel);
      // one row per attempt (question-level responses) for the protected "Question Responses" tab
      var resp = [];
      rows.forEach(function (r) {
        var s = sessions[r.sessionId];
        idx.order.forEach(function (id) {
          var rec = s.items[id]; if (!rec) return;
          rec.att.forEach(function (a) { resp.push([tsv(iso(a.t)), s.studentId, s.first + ' ' + s.last, s.block, id, a.n, a.f, a.ok ? 'correct' : 'not correct', U5.round2(a.f * U5.creditFor(a.n)), a.r || '']); });
        });
      });
      tables.responses = { head: ['Time (UTC)', 'Student ID', 'Name', 'Class Block', 'Question', 'Attempt', 'Fraction Correct', 'Result', 'Credit This Attempt', 'Response (JSON)'], rows: resp };
      return tables;
    }

    // ------------------------------------------------------------------------------------ teacher: overview / analytics
    function teacherOverview(p) {
      var e = needTeacher(p); if (e) return e;
      sweepExpired();
      var rows = allRows(p.block, 'real');
      return { ok: true, rows: rows, summary: blockSummary(rows), serverTime: iso(now()), timeLimitMin: LIMIT_MIN, blocks: U5.BLOCKS, totalPts: totalPts };
    }
    function teacherAnalytics(p) {
      var e = needTeacher(p); if (e) return e;
      sweepExpired();
      var src = p.source === 'demo' ? 'demo' : 'real';
      var sess = sessionsFull(p.block, src), rows = sortRows(sess.map(sessionRow));
      var byBlock = {};
      U5.BLOCKS.forEach(function (b) { byBlock[b] = blockSummary(rows.filter(function (r) { return r.block === b; })); });
      var fin = rows.filter(function (r) { return r.status === 'final'; });
      var chAvg = []; for (var c = 1; c <= CHAPTER_COUNT; c++) {
        var vals = fin.map(function (r) { return chapPts[c] ? 100 * r.chapters[c].earned / chapPts[c] : 0; });
        var ms = sess.filter(function (s) { return s.chMs && s.chMs[c]; }).map(function (s) { return s.chMs[c] / 60000; });
        chAvg.push({ id: c, title: chapMeta[c].title, avgPct: avg(vals) == null ? null : U5.round1(avg(vals)), avgMinutes: avg(ms) == null ? null : U5.round1(avg(ms)), targetMinutes: chapMeta[c].minutes });
      }
      var items = idx.order.map(function (id) {
        var it = G.instantiate(idx.items[id], dummy), n = 0, first = 0, ok = 0, zero = 0, tries = 0, earned = 0;
        sess.forEach(function (s) {
          var r = s.items[id]; if (!r || !r.n) return;
          n++; tries += r.n; if (r.st === 'correct') ok++; if (r.st === 'correct' && r.n === 1) first++; if (r.best === 0) zero++;
          earned += r.best;
        });
        return { id: id, ch: it.ch, title: it.title, pts: it.pts, attempted: n, firstTryPct: n ? U5.round1(100 * first / n) : null, eventuallyPct: n ? U5.round1(100 * ok / n) : null, missRate: n ? U5.round1(100 * (n - first) / n) : null, zeroCredit: zero, avgAttempts: n ? U5.round2(tries / n) : null, avgCreditPct: n ? U5.round1(100 * earned / n) : null };
      });
      var allAtt = items.filter(function (i) { return i.avgAttempts != null; }).map(function (i) { return i.avgAttempts; });
      var times = fin.filter(function (r) { return r.submissionType === SUBMISSION.submitted; }).map(function (r) { return r.timeUsedMin; });
      var approaching = rows.filter(function (r) { return r.status === 'active' && r.remainingMin != null && r.remainingMin <= 15; }).map(function (r) { return { name: r.first + ' ' + r.last, block: r.block, remainingMin: r.remainingMin }; });
      return { ok: true, source: src, byBlock: byBlock, overall: blockSummary(rows), chapters: chAvg, items: items, mostMissed: items.filter(function (i) { return i.attempted >= 1; }).sort(function (a, b) { return (b.missRate - a.missRate) || (a.avgCreditPct - b.avgCreditPct); }).slice(0, 8),
        avgAttemptsPerItem: avg(allAtt) == null ? null : U5.round2(avg(allAtt)), avgCompletionMin: avg(times) == null ? null : U5.round1(avg(times)), autoSubmissions: fin.filter(function (r) { return r.submissionType === SUBMISSION.expired; }).length,
        approaching: approaching, totalPts: totalPts, serverTime: iso(now()) };
    }

    function teacherStudent(p) {
      var e = needTeacher(p); if (e) return e;
      var id = store.findByKey(U5.normId(p.studentId)); if (!id) return fail('NOT_FOUND', 'No student with that ID.');
      var s = store.getSession(id); mergeTouch(s);
      var row = sessionRow(s);
      var items = idx.order.map(function (iid) {
        var r = s.items[iid], it = instantiate(s, iid);
        return { id: iid, ch: it.ch, title: it.title, pts: it.pts, status: r ? r.st : 'open', attempts: r ? r.n : 0, earned: r ? G.earnedOf(it, r) : 0 };
      });
      return { ok: true, row: row, items: items, resetLog: s.resetLog, events: s.events.slice(-15).map(function (x) { return { at: iso(x.t), e: x.e, d: x.d || '' }; }), archive: store.listArchive(s.key).map(function (a) { return { archivedAt: a.archivedAt, by: a.by, reason: a.reason, pct: a.pct, status: a.status }; }), chMs: s.chMs };
    }
    function findStudent(p) {
      var e = needTeacher(p); if (e) return e;
      var q = U5.normName(p.query || ''), qid = U5.normId(p.query || '');
      if (!q) return { ok: true, matches: [] };
      var rows = allRows(p.block, 'real').filter(function (r) { return U5.normName(r.first + ' ' + r.last).indexOf(q) >= 0 || r.studentId.indexOf(qid) >= 0; }).slice(0, 25);
      return { ok: true, matches: rows };
    }

    // ------------------------------------------------------------------------------------ teacher: resets
    function resetStudent(p) {
      var e = needTeacher(p); if (e) return e;
      if (p.confirm !== true) return fail('NOT_CONFIRMED', 'Confirm the reset first.');
      var reason = U5.cleanText(p.reason, 160) || 'Teacher reset';
      return store.withLock(function () {
        var id = store.findByKey(U5.normId(p.studentId));
        if (!id) return fail('NOT_FOUND', 'No active record for that Student ID.');
        var old = store.getSession(id); mergeTouch(old);
        var snap = sessionRow(old);
        store.archiveSession(old, { by: 'teacher', reason: reason, at: now(), row: snap });
        var fresh = newSession({ key: old.key, first: old.first, last: old.last, studentId: old.studentId, block: old.block }, false);
        fresh.resetCount = (old.resetCount || 0) + 1;
        fresh.resetLog = (old.resetLog || []).concat([{ at: now(), reason: reason, prevStatus: old.status, prevPct: snap.pct }]);
        fresh.loginCount = old.loginCount; ev(fresh, 'reset', reason);
        store.replaceSession(old.id, fresh);
        store.markDirty();
        return { ok: true, row: sessionRow(fresh), archived: true };
      });
    }
    function moveBlock(p) {
      var e = needTeacher(p); if (e) return e;
      if (U5.BLOCKS.indexOf(p.block) < 0) return fail('BAD_INPUT', 'Unknown block.');
      return store.withLock(function () {
        var id = store.findByKey(U5.normId(p.studentId)); if (!id) return fail('NOT_FOUND', 'No active record for that Student ID.');
        var s = store.getSession(id);
        var from = s.block; s.block = p.block; ev(s, 'block-moved', from + ' -> ' + p.block);
        persist(s); store.markDirty();
        return { ok: true, row: sessionRow(s) };
      });
    }
    function finalizeNow(p) {   // teacher closes one student's active session (counts as Submitted by Teacher)
      var e = needTeacher(p); if (e) return e;
      return store.withLock(function () {
        var id = store.findByKey(U5.normId(p.studentId)); if (!id) return fail('NOT_FOUND', 'No active record for that Student ID.');
        var s = store.getSession(id); mergeTouch(s);
        if (s.status !== 'active') return fail('BAD_STATE', 'Only an in-progress assessment can be submitted for a student.');
        doFinalize(s, 'teacher'); persist(s);
        return { ok: true, row: sessionRow(s) };
      });
    }

    // ------------------------------------------------------------------------------------ teacher: codes / settings
    function getConfig(p) {
      var e = needTeacher(p); if (e) return e;
      var c = store.getConfig() || { codes: {}, settings: {} };
      return { ok: true, codes: c.codes || {}, settings: settings(), blocks: U5.BLOCKS, rosterLoaded: store.hasRoster(), timeLimitMin: LIMIT_MIN };
    }
    function saveConfig(p) {
      var e = needTeacher(p); if (e) return e;
      return store.withLock(function () {
        var c = store.getConfig() || { codes: {}, settings: {} };
        if (p.codes) {
          var seen = {}, next = {};
          for (var i = 0; i < U5.BLOCKS.length; i++) {
            var b = U5.BLOCKS[i], inc = p.codes[b] || c.codes[b] || {};
            var code = U5.normCode(inc.code != null ? inc.code : (c.codes[b] && c.codes[b].code));
            if (!/^[A-Z0-9-]{4,20}$/.test(code)) return fail('BAD_INPUT', 'The code for ' + b + ' must be 4-20 letters, numbers or hyphens.');
            if (seen[code]) return fail('BAD_INPUT', 'Each class block needs its own code. "' + code + '" is used twice.');
            seen[code] = 1;
            next[b] = { code: code, open: inc.open !== false };
          }
          c.codes = next;
        }
        if (p.settings) {
          c.settings = c.settings || {};
          if (['full', 'score', 'hidden'].indexOf(p.settings.studentResults) >= 0) c.settings.studentResults = p.settings.studentResults;
          if (p.settings.calculator != null) c.settings.calculator = !!p.settings.calculator;
          if (p.settings.referenceSheet != null) c.settings.referenceSheet = !!p.settings.referenceSheet;
        }
        store.saveConfig(c);
        store.appendAudit({ at: now(), action: 'config', who: 'teacher', detail: 'codes/settings updated' });
        return { ok: true, codes: c.codes, settings: settings() };
      });
    }
    function randomCode(blockIdx) { var A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', s = ''; for (var i = 0; i < 4; i++) s += A[U5.hashStr(env.randomId(12) + i) % A.length]; return 'GAMB' + (blockIdx + 1) + '-' + s; }
    function generateCodes(p) {
      var e = needTeacher(p); if (e) return e;
      var codes = {}; U5.BLOCKS.forEach(function (b, i) { codes[b] = { code: randomCode(i), open: false }; });
      return saveConfig({ teacherToken: p.teacherToken, codes: codes });
    }
    function testCode(p) {    // validates a block/code pair without creating a student record
      var e = needTeacher(p); if (e) return e;
      var bc = codeFor(String(p.block || ''));
      if (!bc) return { ok: true, valid: false, reason: 'No code is set for that block.' };
      var good = safeEq(U5.normCode(bc.code), U5.normCode(p.code));
      return { ok: true, valid: good, open: !!bc.open, reason: good ? (bc.open ? 'Valid and open: a student could sign in.' : 'Code is correct, but this block is closed.') : 'That code does not match this block.' };
    }

    // ------------------------------------------------------------------------------------ teacher: content / key
    function answerKey(p) {
      var e = needTeacher(p); if (e) return e;
      var ses = (p.preview && store.getPreview(PREVIEW_ID)) || { seed: p.seed || 'teacher-view' };      // preview: the SAME per-student numbers the preview session sees
      var chapters = bank.chapters.map(function (c) {
        return {
          id: c.id, title: c.title, subtitle: c.subtitle, minutes: c.minutes, points: chapPts[c.id],
          steps: c.steps.map(function (st) {
            if (st.kind !== 'item') return { kind: st.kind, id: st.id, title: st.title };
            var it = G.instantiate(idx.items[st.id], ses);
            var pub = G.publicItem(it, 'teacher-view');
            var multi = it.parts.map(function (pp) { return { id: pp.id, lvl: pp.lvl, w: pp.w != null ? pp.w : 1 }; });
            return { kind: 'item', id: st.id, item: pub, key: G.formatKey(it), hints: it.hints || [], explain: it.explain || '', lo: it.lo || [], parts: multi, pts: it.pts, min: it.min, levels: it.parts.map(function (pp) { return pp.lvl; }), variant: typeof idx.items[st.id].def === 'function' };
          })
        };
      });
      return { ok: true, chapters: chapters, totalPts: totalPts };
    }

    // ------------------------------------------------------------------------------------ teacher: preview (never touches student records)
    var PREVIEW_ID = 'PV-MAIN';
    function previewStart(p) {
      var e = needTeacher(p); if (e) return e;
      return store.withLock(function () {
        var s = p.fresh ? null : store.getPreview(PREVIEW_ID);
        if (!s) {
          s = newSession({ key: 'PREVIEW', first: 'Teacher', last: 'Preview', studentId: 'PREVIEW', block: U5.BLOCKS[0] }, true);
          s.id = PREVIEW_ID; s.status = 'active'; s.startedAt = now(); s.deadline = s.startedAt + LIMIT_MS; ev(s, 'preview-start');
          store.putPreview(s);
        }
        if (isDue(s)) { doFinalize(s, 'expired'); store.putPreview(s); }
        return { ok: true, sessionId: s.id, token: s.token, state: publicState(s), preview: true };
      });
    }
    function previewReset(p) {      // "Reset My Preview Progress": clears answers, sims, attempts, restarts timer, back to the start
      var e = needTeacher(p); if (e) return e;
      return store.withLock(function () {
        var s = newSession({ key: 'PREVIEW', first: 'Teacher', last: 'Preview', studentId: 'PREVIEW', block: U5.BLOCKS[0] }, true);
        s.id = PREVIEW_ID; s.status = 'active'; s.startedAt = now(); s.deadline = s.startedAt + LIMIT_MS; ev(s, 'preview-reset');
        store.putPreview(s); store.clearTouch(PREVIEW_ID);
        return { ok: true, sessionId: s.id, token: s.token, state: publicState(s), preview: true };
      });
    }
    function previewSetClock(p) {   // shorten the preview timer to test warnings / expiry
      var e = needTeacher(p); if (e) return e;
      var secs = Math.max(5, Math.min(LIMIT_MIN * 60, Number(p.seconds) | 0));
      return store.withLock(function () {
        var s = store.getPreview(PREVIEW_ID); if (!s) return fail('NO_SESSION', 'Start the preview first.');
        if (s.status === 'final') return fail('FINALIZED', 'The preview was already submitted. Use Reset My Preview Progress.');
        s.deadline = now() + secs * 1000; ev(s, 'preview-clock', secs + 's'); store.putPreview(s);
        return { ok: true, state: publicState(s) };
      });
    }
    function previewScenario(p) {   // fill the preview with 1st/2nd/3rd-attempt-correct or all-wrong answers (tests scoring)
      var e = needTeacher(p); if (e) return e;
      var want = { first: 1, second: 2, third: 3, wrong: 4 }[p.mode];
      if (!want) return fail('BAD_INPUT', 'Unknown scenario.');
      return store.withLock(function () {
        var s = store.getPreview(PREVIEW_ID); if (!s) return fail('NO_SESSION', 'Start the preview first.');
        if (s.status !== 'active') return fail('BAD_STATE', 'Reset the preview first.');
        s.items = {};
        idx.order.forEach(function (id) {
          var it = instantiate(s, id), rec = s.items[id] = G.newRec(), k = 0;
          while (rec.st === 'open') {
            k++;
            var resp = (want < 4 && k === want) ? G.makeCorrect(it) : G.makeWrong(it, k);
            G.applyAttempt(rec, G.gradeItem(it, resp), now(), '');
          }
        });
        store.putPreview(s);
        return { ok: true, state: publicState(s) };
      });
    }

    // Fictional submissions for testing dashboards and the Sheets connection.  They live in a SEPARATE store
    // (demo sessions + the protected "Test Records" tab) and never enter the real gradebook.
    var FIRST = ['Avery', 'Jordan', 'Riley', 'Casey', 'Morgan', 'Taylor', 'Quinn', 'Rowan', 'Sky', 'Devon', 'Emery', 'Harper'];
    var LAST = ['Test', 'Sample', 'Demo', 'Example', 'Fiction', 'Placeholder'];
    function generateDemo(p) {
      var e = needTeacher(p); if (e) return e;
      var n = Math.max(4, Math.min(48, Number(p.count) || 16)), r = U5.rng('demo|' + env.randomId(6)), made = [];
      store.clearDemo();
      for (var i = 0; i < n; i++) {
        var block = U5.BLOCKS[i % 4], s = newSession({ key: 'DEMO' + (100 + i), first: '[DEMO] ' + FIRST[i % FIRST.length], last: LAST[(i * 5) % LAST.length] + (i + 1), studentId: 'DEMO' + (100 + i), block: block, demo: true }, false);
        s.id = 'D' + env.randomId(12);
        var skill = 0.45 + r.next() * 0.5, t0 = now() - Math.floor(r.next() * 5000000);
        s.status = 'active'; s.startedAt = t0; s.deadline = t0 + LIMIT_MS;
        var chStop = r.next() < 0.15 ? r.int(2, 6) : 99;
        idx.order.forEach(function (id) {
          var it = instantiate(s, id); if (it.ch > chStop) return;
          var rec = s.items[id] = G.newRec(), k = 0, pAll = skill - (it.ch === 4 ? 0.12 : 0);
          while (rec.st === 'open') { k++; var good = r.next() < pAll + (k - 1) * 0.12; G.applyAttempt(rec, G.gradeItem(it, good ? G.makeCorrect(it) : G.makeWrong(it, k)), t0 + k * 1000, ''); }
        });
        for (var c = 1; c <= CHAPTER_COUNT; c++) s.chMs[c] = Math.floor((chapMeta[c].minutes * (0.6 + r.next() * 0.9)) * 60000);
        if (chStop === 99) { var typ = r.next() < 0.12 ? 'expired' : 'submitted'; s.status = 'active'; doFinalize(s, typ); s.finalAt = typ === 'expired' ? s.deadline : t0 + Math.floor((38 + r.next() * 40) * 60000); s.processedAt = s.finalAt; s.result = totalsOf(s); }
        store.putDemo(s); made.push(s);
      }
      var rows = made.map(sessionRow);
      var wrote = store.writeTestRecords(rows.map(function (rw) { return [new Date(now()).toISOString(), rw.first, rw.last, rw.studentId, rw.block, rw.statusLabel, rw.pct, rw.earned, 'DEMO / TEST RECORD: fictional, not in the gradebook']; }));
      return { ok: true, created: made.length, testRecordsWritten: wrote, message: 'Fictional students were created in the separate demo store and the protected "Test Records" tab. The real gradebook was not changed.' };
    }
    function testSheets(p) {
      var e = needTeacher(p); if (e) return e;
      var id = 'SHEETS-TEST-' + env.randomId(6);
      try {
        var info = store.testSheets({ id: id, at: new Date(now()).toISOString() });
        return { ok: true, id: id, readBack: !!info.readBack, destination: info.destination, tabs: info.tabs || [], message: info.readBack ? 'Wrote a labelled test row to the protected "Test Records" tab and read it back. Primary tabs were not touched.' : 'The row was written but could not be read back.' };
      } catch (err) { return fail('SHEETS_FAILED', 'Google Sheets test failed: ' + String(err && err.message || err)); }
    }
    function flushReports(p) {
      var force = false;
      if (p && p.teacherToken) { var e = needTeacher(p); if (e) return e; force = true; }
      var res = store.flushReports(function (src) { return reportTables(src); }, force);
      return { ok: true, flushed: !!res, serverTime: iso(now()) };
    }
    function exportData(p) {
      var e = needTeacher(p); if (e) return e;
      var t = reportTables(p.source === 'demo' ? 'demo' : 'real');
      var b = p.block && p.block !== 'all' ? t.blocks[p.block] : null;
      return { ok: true, master: t.master, block: b, blocks: Object.keys(t.blocks), summary: t.summary, items: t.itemHeads, responses: p.responses ? t.responses : undefined };
    }
    function teacherPing(p) { var e = needTeacher(p); if (e) return e; return { ok: true, serverTime: iso(now()), timeLimitMin: LIMIT_MIN, blocks: U5.BLOCKS, outline: outline(), totalPts: totalPts, settings: settings(), items: idx.order.length }; }

    // ------------------------------------------------------------------------------------ public config
    function publicConfig() {
      return { ok: true, title: bank.title, blocks: U5.BLOCKS, timeLimitMin: LIMIT_MIN, outline: outline(), totalPts: totalPts, items: idx.order.length, serverTime: iso(now()), version: bank.version };
    }

    var ACTIONS = {
      config: publicConfig, login: login, begin: begin, state: getState, content: content, submit: submit, heartbeat: heartbeat, finalize: finalize,
      teacherLogin: teacherLogin, teacherLogout: teacherLogout, teacherPing: teacherPing, teacherOverview: teacherOverview, teacherAnalytics: teacherAnalytics, teacherStudent: teacherStudent, findStudent: findStudent,
      resetStudent: resetStudent, moveBlock: moveBlock, finalizeNow: finalizeNow, getConfig: getConfig, saveConfig: saveConfig, generateCodes: generateCodes, testCode: testCode, answerKey: answerKey,
      previewStart: previewStart, previewReset: previewReset, previewSetClock: previewSetClock, previewScenario: previewScenario, generateDemo: generateDemo, testSheets: testSheets,
      flushReports: flushReports, exportData: exportData
    };
    function handle(action, payload) {
      var fn = Object.prototype.hasOwnProperty.call(ACTIONS, action) ? ACTIONS[action] : null;     // own actions only (never '__proto__' or 'constructor')
      if (typeof fn !== 'function') return fail('BAD_ACTION', 'Unknown request.');
      try { return fn(payload || {}); }
      catch (err) {
        var msg = String(err && err.message || err);
        if (msg === 'BUSY') return fail('BUSY', 'The server is busy. Trying again…', { retryable: true });
        if (opts.debug) throw err;
        return fail('SERVER_ERROR', 'The server could not process that request. Nothing was lost; try again.', { retryable: true });
      }
    }

    return { handle: handle, sweepExpired: sweepExpired, reportTables: reportTables, publicConfig: publicConfig, totalPts: totalPts, chapterPoints: chapPts, index: idx, pwHash: pwHash, flushReports: flushReports, sessionRow: sessionRow, limitMs: LIMIT_MS };
  }

  var api = { createEngine: createEngine, SUBMISSION: SUBMISSION, STATUS: STATUS, DEFAULT_SETTINGS: DEFAULT_SETTINGS, PW_ITER: PW_ITER };
  if (NODE) module.exports = api;
  root.U5E = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
