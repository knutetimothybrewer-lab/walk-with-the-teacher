/* State, local persistence, one-session lock, import/export and teacher reset (DOM-free; storage is injected so it can be tested in Node).
 *
 * HONEST LIMITS: everything here runs in the student's browser. Clearing site data, another browser/device, or editing the code bypasses it.
 */
(function (root) {
  'use strict';
  var W = root.WWQ, U = W.U, P = W.Policy;
  var St = W.Store = { storage: null, storageOK: false, lastError: '' };
  var SCHEMA = 1;

  function ver() { return W.CONFIG.assessmentVersion; }
  St.keys = function () { var v = 'wwq:' + ver(); return { active: v + ':active', submitted: v + ':submitted', history: v + ':history', cool: v + ':cool' }; };

  /* ---------- storage (injected) ---------- */
  St.useStorage = function (s) {
    St.storage = null; St.storageOK = false; St.lastError = '';
    try {
      if (!s) throw new Error('no storage');
      var k = 'wwq:probe'; s.setItem(k, '1'); if (s.getItem(k) !== '1') throw new Error('storage readback failed'); s.removeItem(k);
      St.storage = s; St.storageOK = true;
    } catch (e) { St.lastError = String(e && e.message || e); }
    return St.storageOK;
  };
  function rd(key) { if (!St.storageOK) return null; try { var t = St.storage.getItem(key); return t ? JSON.parse(t) : null; } catch (e) { St.lastError = String(e); return null; } }
  function wr(key, obj) { if (!St.storageOK) return false; try { St.storage.setItem(key, JSON.stringify(obj)); return true; } catch (e) { St.lastError = String(e && e.message || e); St.storageOK = false; return false; } }
  function rm(key) { if (!St.storageOK) return; try { St.storage.removeItem(key); } catch (e) { /* ignore */ } }

  /* ---------- state ---------- */
  St.newSessionId = function () { return 'WWQ-' + U.randomHex(6); };
  St.newState = function (extra) {
    var now = U.nowISO(); extra = extra || {};
    return {
      schema: SCHEMA, assessmentVersion: ver(),
      session: { id: St.newSessionId(), createdAt: now, status: 'ACTIVE', submittedAt: null, resetCount: extra.resetCount || 0, reset: extra.reset || null },
      student: { alias: '', period: '', code: '', avatar: 'a1' },
      progress: { pos: { m: 0, s: '0.1' }, started: false, activities: {}, view: 'stage' },
      items: {}, practice: { tut: P.newRec() }, optPractice: {},
      sim: { picks: {}, finished: false, compare: null },
      reflections: { m3: '', m7: '', share: false },
      settings: { motion: 'auto', textScale: 1, pacing: false },
      timing: { startedAt: now, beganAt: '', missions: {} },
      meta: { savedAt: now, saveCount: 0, imports: [] },
      final: null
    };
  };
  St.ensureItem = function (state, id) {
    // practice records live outside state.items so they can never enter scoring, completion or the exported grade record
    if (id === 'pr.tut') return state.practice.tut;
    if (id.indexOf('po.') === 0) { state.optPractice = state.optPractice || {}; return state.optPractice[id] || (state.optPractice[id] = P.newRec()); }
    if (!state.items[id]) state.items[id] = P.newRec(); return state.items[id];
  };

  St.hasProgress = function (state) {
    if (Object.keys(state.items).some(function (k) { return state.items[k].attempts.length; })) return true;
    if (Object.keys(state.progress.activities).length) return true;
    return !!Object.keys(state.sim.picks || {}).length;
  };

  /* ---------- load / save ---------- */
  St.init = function () {
    var K = St.keys(), marker = rd(K.submitted), active = rd(K.active), res = { state: null, mode: 'new', notices: [] };
    if (!St.storageOK) res.notices.push('storage-unavailable');
    if (marker && marker.state && marker.state.session) {
      var chk = St.sanitize(marker.state, { allowSubmitted: true });
      if (chk.ok) { res.state = chk.state; res.mode = 'submitted'; return res; }
      res.notices.push('marker-inconsistent');
    }
    if (active) {
      var c2 = St.sanitize(active, { allowSubmitted: true });
      if (c2.ok) { res.state = c2.state; res.mode = c2.state.session.status === 'SUBMITTED' ? 'submitted' : 'resumed'; if (c2.problems.length) res.notices.push('repaired:' + c2.problems.length); return res; }
      res.notices.push('active-inconsistent'); res.problems = c2.problems;
    }
    res.state = St.newState(); return res;
  };
  St.save = function (state) {
    state.meta.savedAt = U.nowISO(); state.meta.saveCount++;
    var ok = wr(St.keys().active, state);
    return ok;
  };

  /* ---------- sanitize / validate / recompute (never trust stored numbers) ---------- */
  var ALIAS_MAX = 60;
  function str(x, max) { return typeof x === 'string' ? x.slice(0, max) : ''; }
  St.sanitize = function (raw, opts) {
    opts = opts || {}; var problems = [], out = St.newState();
    if (!U.isObj(raw)) return { ok: false, problems: ['not an object'] };
    if (raw.schema !== SCHEMA) return { ok: false, problems: ['unsupported schema ' + raw.schema] };
    if (raw.assessmentVersion !== ver()) return { ok: false, problems: ['assessment version mismatch (' + raw.assessmentVersion + ')'] };
    var s = raw.session; if (!U.isObj(s) || typeof s.id !== 'string' || !/^WWQ-[0-9a-f]{12}$/.test(s.id)) return { ok: false, problems: ['invalid session id'] };
    out.session = { id: s.id, createdAt: str(s.createdAt, 40) || out.session.createdAt, status: s.status === 'SUBMITTED' ? 'SUBMITTED' : 'ACTIVE', timedOut: s.timedOut === true, submittedAt: s.submittedAt ? str(s.submittedAt, 40) : null, resetCount: Math.max(0, s.resetCount | 0), reset: U.isObj(s.reset) ? { at: str(s.reset.at, 40), previousSessionId: str(s.reset.previousSessionId, 20), authorizedVia: str(s.reset.authorizedVia, 120), note: str(s.reset.note, 200) } : null };
    var stu = U.isObj(raw.student) ? raw.student : {};
    out.student = { alias: str(stu.alias, ALIAS_MAX), period: str(stu.period, 20), code: str(stu.code, 40), avatar: W.AVATARS.some(function (a) { return a.id === stu.avatar; }) ? stu.avatar : 'a1' };
    var pr = U.isObj(raw.progress) ? raw.progress : {};
    out.progress.started = !!pr.started;
    if (U.isObj(pr.pos) && W.MISSION[pr.pos.m | 0] && W.MISSION[pr.pos.m | 0].stages.some(function (x) { return x.id === pr.pos.s; })) out.progress.pos = { m: pr.pos.m | 0, s: pr.pos.s };
    ['view'].forEach(function (k) { out.progress.view = ['stage', 'map', 'review'].indexOf(pr.view) >= 0 ? pr.view : 'stage'; });
    var acts = U.isObj(pr.activities) ? pr.activities : {};
    W.ACTIVITIES.forEach(function (a) { if (acts[a.id] === true) out.progress.activities[a.id] = true; });
    // items: recompute every attempt from the key
    var items = U.isObj(raw.items) ? raw.items : {};
    Object.keys(items).forEach(function (id) {
      var it = W.ITEM_BY_ID[id]; if (!it) { problems.push('unknown item ' + id); return; }
      var rec = P.newRec(), src = items[id]; if (!U.isObj(src) || !Array.isArray(src.attempts)) { problems.push('bad record ' + id); return; }
      var limit = P.limitFor(it);
      if (src.attempts.length > limit) { problems.push(id + ': more attempts than allowed'); src = { attempts: src.attempts.slice(0, limit), finalized: src.finalized, finalizedReason: src.finalizedReason, retryReady: src.retryReady }; }
      var bad = false;
      src.attempts.forEach(function (a, idx) {
        if (bad) return;
        var variant = P.variantAt(it, idx);
        if (!U.isObj(a) || a.n !== idx + 1 || a.variantId !== variant.id || !U.isObj(a.response)) { bad = true; problems.push(id + ': attempt ' + (idx + 1) + ' inconsistent'); return; }
        var res = P.scoreResponse(variant, a.response);
        if (!res.valid) { bad = true; problems.push(id + ': attempt ' + (idx + 1) + ' response invalid'); return; }
        var cap = P.capFor(idx + 1), aw = res.raw * it.pts * cap;
        if (Math.abs(aw - (a.awarded || 0)) > 1e-6) problems.push(id + ': attempt ' + (idx + 1) + ' score recomputed');
        rec.attempts.push({ n: idx + 1, variantId: variant.id, response: U.clone(a.response), raw: res.raw, rawPoints: res.raw * it.pts, cap: cap, awarded: aw, parts: res.parts.map(function (p) { return { id: p.id, credit: p.credit }; }), hintShown: res.raw < 1 - 1e-9, at: str(a.at, 40) });
        rec.best = Math.max(rec.best, aw);
      });
      if (bad) { out.__bad = true; return; }
      var n = rec.attempts.length;
      if (n) {
        var last = rec.attempts[n - 1];
        var shouldFinal = n >= limit || last.raw >= 1 - 1e-9 || rec.best >= it.pts * P.capFor(n + 1) - 1e-9;
        if (shouldFinal || src.finalized === true) {
          rec.finalized = true; rec.finalizedAt = str(src.finalizedAt, 40) || last.at;
          rec.finalizedReason = n >= limit ? 'exhausted' : last.raw >= 1 - 1e-9 ? (n === 1 ? 'full' : 'full-on-retry') : rec.best >= it.pts * P.capFor(n + 1) - 1e-9 ? 'no-gain' : 'kept';
        } else rec.retryReady = src.retryReady === true;
      } else if (out.session.timedOut && src.finalized === true) { rec.finalized = true; rec.finalizedReason = 'timeout'; rec.finalizedAt = str(src.finalizedAt, 40); }
      if (!rec.finalized && U.isObj(src.draft)) rec.draft = St.cleanDraft(it, rec, src.draft);
      out.items[id] = rec;
    });
    if (out.__bad) return { ok: false, problems: problems };
    var sim = U.isObj(raw.sim) ? raw.sim : {}, picks = U.isObj(sim.picks) ? sim.picks : {};
    W.DECISIONS.forEach(function (d) { if (['A', 'B', 'C'].indexOf(picks[d.id]) >= 0) out.sim.picks[d.id] = picks[d.id]; });
    out.sim.finished = sim.finished === true && Object.keys(out.sim.picks).length === W.DECISIONS.length;
    out.sim.compare = U.isObj(sim.compare) && W.DECISIONS.some(function (d) { return d.id === sim.compare.id; }) && ['A', 'B', 'C'].indexOf(sim.compare.to) >= 0 ? { id: sim.compare.id, to: sim.compare.to } : null;
    // practice (never scored)
    if (U.isObj(raw.practice) && U.isObj(raw.practice.tut) && Array.isArray(raw.practice.tut.attempts)) {
      var ps = St.rebuildPractice(raw.practice.tut); if (ps) out.practice.tut = ps;
    }
    var rf = U.isObj(raw.reflections) ? raw.reflections : {};
    out.reflections = { m3: str(rf.m3, 1200), m7: str(rf.m7, 1200), share: rf.share === true };
    var se = U.isObj(raw.settings) ? raw.settings : {};
    out.settings = { motion: ['auto', 'on', 'off'].indexOf(se.motion) >= 0 ? se.motion : 'auto', textScale: [1, 1.125, 1.25].indexOf(se.textScale) >= 0 ? se.textScale : 1, pacing: se.pacing === true };
    var tm = U.isObj(raw.timing) ? raw.timing : {};
    out.timing = { startedAt: str(tm.startedAt, 40) || out.timing.startedAt, beganAt: str(tm.beganAt, 40), missions: {} };
    if (U.isObj(tm.missions)) Object.keys(tm.missions).forEach(function (k) { if (W.MISSION[k | 0] && U.isObj(tm.missions[k])) out.timing.missions[k] = { first: str(tm.missions[k].first, 40), last: str(tm.missions[k].last, 40) }; });
    out.meta = { savedAt: str(raw.meta && raw.meta.savedAt, 40) || U.nowISO(), saveCount: Math.max(0, (raw.meta && raw.meta.saveCount) | 0), imports: Array.isArray(raw.meta && raw.meta.imports) ? raw.meta.imports.slice(-10).map(function (x) { return { at: str(x.at, 40), kind: str(x.kind, 40) }; }) : [] };
    if (out.session.status === 'SUBMITTED') {
      if (!opts.allowSubmitted) return { ok: false, problems: ['submitted record not allowed here'] };
      var allDone = W.ITEMS.every(function (i) { return out.items[i.id] && out.items[i.id].finalized; });
      if (!allDone && !out.session.timedOut) return { ok: false, problems: ['submitted record has unfinalized items'] };
      var rep = W.Report.build(out, { submittedAt: out.session.submittedAt });
      out.final = { submittedAt: out.session.submittedAt, report: rep };
    }
    return { ok: true, state: out, problems: problems };
  };
  St.cleanDraft = function (item, rec, draft) {
    var v = P.variantAt(item, rec.attempts.length), out = {};
    v.parts.forEach(function (p) {
      var x = draft[p.id]; if (x === undefined || x === null) return;
      var ids = p.opts.map(function (o) { return o.id; });
      if (p.type === 'num') { if (x === '' || isFinite(Number(x))) out[p.id] = x === '' ? '' : Number(x); }
      else if (p.type === 'multi') { if (Array.isArray(x)) out[p.id] = x.filter(function (i, k) { return ids.indexOf(i) >= 0 && x.indexOf(i) === k; }).slice(0, p.pick); }
      else if (typeof x === 'string' && ids.indexOf(x) >= 0) out[p.id] = x;
    });
    return out;
  };
  St.rebuildPractice = function (src) {
    var it = W.PRACTICE.tut, rec = P.newRec(), lim = it.practiceLimit || 3, bad = false;
    src.attempts.slice(0, lim).forEach(function (a, idx) {
      if (bad) return; var variant = P.variantAt(it, idx);
      if (!U.isObj(a) || !U.isObj(a.response) || a.variantId !== variant.id) { bad = true; return; }
      var res = P.scoreResponse(variant, a.response); if (!res.valid) { bad = true; return; }
      rec.attempts.push({ n: idx + 1, variantId: variant.id, response: U.clone(a.response), raw: res.raw, rawPoints: res.raw * it.pts, cap: P.capFor(idx + 1), awarded: res.raw * it.pts * P.capFor(idx + 1), parts: res.parts.map(function (p) { return { id: p.id, credit: p.credit }; }), hintShown: res.raw < 1 });
      rec.best = Math.max(rec.best, res.raw * it.pts * P.capFor(idx + 1));
    });
    if (bad) return null;
    if (rec.attempts.length) { var last = rec.attempts[rec.attempts.length - 1]; if (rec.attempts.length >= lim || last.raw >= 1 - 1e-9 || src.finalized === true) { rec.finalized = true; rec.finalizedReason = 'practice'; } else rec.retryReady = src.retryReady === true; }
    return rec;
  };

  /* ---------- practice: same engine, different limit, never scored ---------- */
  St.practiceLimit = function () { return W.PRACTICE.tut.practiceLimit || 3; };

  /* ---------- final submission ---------- */
  St.canSubmit = function (state) {
    if (state.session.status !== 'ACTIVE') return { ok: false, reason: 'already submitted' };
    var open = W.ITEMS.filter(function (i) { return !(state.items[i.id] && state.items[i.id].finalized); });
    var acts = W.ACTIVITIES.filter(function (a) { return !state.progress.activities[a.id]; });
    return { ok: !open.length && !acts.length, openItems: open.map(function (i) { return i.id; }), openActivities: acts.map(function (a) { return a.id; }) };
  };
  /* opts.force (time limit reached): lock the session even though work is unfinished. Unfinished items keep whatever they
     have already earned (0 if never submitted) and are marked 'timeout'. */
  St.submitFinal = function (state, opts) {
    var K = St.keys(), existing = rd(K.submitted), force = !!(opts && opts.force);
    if (state.session.status === 'SUBMITTED' || (existing && existing.state && existing.state.session && existing.state.session.id === state.session.id)) return { ok: true, already: true, state: state };
    if (force) {
      state.session.timedOut = true;
      W.ITEMS.forEach(function (i) { var rec = St.ensureItem(state, i.id); if (!rec.finalized) P.finalize(rec, 'timeout'); });
    } else { var can = St.canSubmit(state); if (!can.ok) return { ok: false, reason: 'incomplete', detail: can }; }
    state.session.status = 'SUBMITTED'; state.session.submittedAt = U.nowISO(); state.progress.view = 'review';
    var rep = W.Report.build(state, { submittedAt: state.session.submittedAt });
    state.final = U.deepFreeze({ submittedAt: state.session.submittedAt, report: rep });
    var marker = { schema: SCHEMA, sessionId: state.session.id, submittedAt: state.session.submittedAt, state: JSON.parse(JSON.stringify(state)) };
    var okM = wr(K.submitted, marker), okA = wr(K.active, state);
    return { ok: true, state: state, persisted: okM && okA };
  };

  /* ---------- export ---------- */
  St.exportRecord = function (state) {
    var obj = { format: 'wwq-record', schema: SCHEMA, assessmentVersion: ver(), kind: state.session.status === 'SUBMITTED' ? 'final-readonly' : 'recovery', exportedAt: U.nowISO(), state: JSON.parse(JSON.stringify(state)) };
    delete obj.state.final; delete obj.state.optPractice;
    obj.report = W.Report.build(state);
    obj.checksum = U.sha256hex(U.stableStringify(obj.state));
    obj.checksumNote = 'Detects accidental corruption only; it is not a security measure.';
    return JSON.stringify(obj, null, 2);
  };

  /* ---------- import (recovery only; never a way to start over) ---------- */
  St.importRecord = function (text, current) {
    var fail = function (msg, extra) { return { ok: false, message: msg, problems: extra || [] }; };
    if (typeof text !== 'string' || text.length > 4000000) return fail('That file is empty or too large to be an assessment record. Your current work was not changed.');
    var obj; try { obj = JSON.parse(text); } catch (e) { return fail('That file is not valid JSON. Your current work was not changed.'); }
    if (!U.isObj(obj) || obj.format !== 'wwq-record' || !U.isObj(obj.state)) return fail('That file is not a Wildcats Wellness Quest record. Your current work was not changed.');
    var chk = St.sanitize(obj.state, { allowSubmitted: true });
    if (!chk.ok) return fail('This record looks inconsistent and could not be used (' + chk.problems.slice(0, 3).join('; ') + '). Your current work was not changed. Ask your teacher for help.', chk.problems);
    var inc = chk.state, K = St.keys(), marker = rd(K.submitted);
    var cur = current;
    if (marker && marker.state && marker.state.session) {
      if (marker.state.session.id === inc.session.id) return { ok: true, state: cur, readOnly: true, message: 'This assessment was already submitted on this device. It stays locked and read-only.', noChange: true };
      return fail('A submitted assessment is already locked on this device. A teacher reset is needed before another record can be loaded. Your current work was not changed.');
    }
    if (cur && cur.session.id === inc.session.id) {
      // monotonic merge: attempt counts can never go down
      var merged = JSON.parse(JSON.stringify(cur)), changed = 0;
      Object.keys(inc.items).forEach(function (id) {
        var a = inc.items[id], b = merged.items[id];
        if (!b || a.attempts.length > b.attempts.length || (a.attempts.length === b.attempts.length && a.finalized && !b.finalized)) { merged.items[id] = a; changed++; }
      });
      Object.keys(inc.progress.activities).forEach(function (k) { if (!merged.progress.activities[k]) { merged.progress.activities[k] = true; changed++; } });
      Object.keys(inc.sim.picks).forEach(function (k) { if (!merged.sim.picks[k]) { merged.sim.picks[k] = inc.sim.picks[k]; changed++; } });
      if (!merged.student.alias && inc.student.alias) merged.student = inc.student;
      if (inc.session.status === 'SUBMITTED') {
        // the same session was already submitted elsewhere: honor the lock
        inc.meta.imports.push({ at: U.nowISO(), kind: 'final-for-active-session' });
        wr(K.submitted, { schema: SCHEMA, sessionId: inc.session.id, submittedAt: inc.session.submittedAt, state: JSON.parse(JSON.stringify(inc)) });
        return { ok: true, state: inc, readOnly: true, message: 'This session was already submitted. The final report is now locked and read-only on this device.' };
      }
      var rs = St.sanitize(merged, { allowSubmitted: false });
      if (rs.ok) { rs.state.meta.imports.push({ at: U.nowISO(), kind: 'merge' }); return { ok: true, state: rs.state, message: changed ? 'Your backup was merged without lowering any attempt counts (' + changed + ' updates).' : 'This backup had nothing newer than your current work, so nothing changed.', merged: true }; }
      return fail('Merging produced inconsistent data, so nothing was changed.', rs.problems);
    }
    if (cur && St.hasProgress(cur)) return fail('This record belongs to a different session than the work on this device. It cannot replace work already in progress. A teacher reset is required to start a different assessment. Your current work was not changed.');
    inc.meta.imports.push({ at: U.nowISO(), kind: 'replace-empty' });
    if (inc.session.status === 'SUBMITTED') {
      var rep = W.Report.build(inc, { submittedAt: inc.session.submittedAt }); inc.final = { submittedAt: inc.session.submittedAt, report: rep };
      wr(K.submitted, { schema: SCHEMA, sessionId: inc.session.id, submittedAt: inc.session.submittedAt, state: JSON.parse(JSON.stringify(inc)) });
      return { ok: true, state: inc, readOnly: true, message: 'Final report loaded as read-only and locked on this device.' };
    }
    return { ok: true, state: inc, message: 'Your work was restored from the file.' };
  };

  /* ---------- teacher passcode (interface deterrent only) ---------- */
  St.passcodeConfigured = function () { var t = W.CONFIG.teacher; return !!(t && t.configured && t.salt && t.verifier && t.iterations > 0); };
  St.attemptPasscode = function (pass, nowMs) {
    var t = W.CONFIG.teacher, K = St.keys(), cool = rd(K.cool) || { fails: 0, until: 0 };
    nowMs = nowMs || Date.now();
    if (!St.passcodeConfigured()) return { ok: false, notConfigured: true };
    if (cool.until && nowMs < cool.until) return { ok: false, locked: true, wait: Math.ceil((cool.until - nowMs) / 1000) };
    var good = U.constEq(U.deriveVerifier(String(pass), t.salt, t.iterations), t.verifier);
    if (good) { wr(K.cool, { fails: 0, until: 0 }); return { ok: true }; }
    cool.fails = (cool.fails | 0) + 1;
    var free = t.freeTries || 3;
    if (cool.fails >= free) { var secs = Math.min(300, (t.cooldownSeconds || 30) * Math.pow(2, cool.fails - free)); cool.until = nowMs + secs * 1000; }
    wr(K.cool, cool);
    return { ok: false, wrong: true, remaining: Math.max(0, free - cool.fails), locked: cool.until > nowMs, wait: cool.until > nowMs ? Math.ceil((cool.until - nowMs) / 1000) : 0 };
  };
  /* Call only after a valid passcode AND an explicit confirmation. Records that the reset was teacher-authorized via the UI (local, unverified). */
  St.teacherReset = function (previous) {
    var K = St.keys(), h = rd(K.history) || [];
    h.push({ sessionId: previous.session.id, endedAt: U.nowISO(), status: previous.session.status });
    wr(K.history, h.slice(-50));
    rm(K.active); rm(K.submitted);
    var s = St.newState({ resetCount: (previous.session.resetCount | 0) + 1, reset: { at: U.nowISO(), previousSessionId: previous.session.id, authorizedVia: 'teacher passcode dialog (recorded locally; not independently verified)', note: 'New assessment attempt authorized by a teacher reset.' } });
    wr(K.active, s);
    return s;
  };
})(typeof window !== 'undefined' ? window : globalThis);
