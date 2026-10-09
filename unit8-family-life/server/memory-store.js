/*
 * Reference storage adapter for server/core.js: everything in memory.
 * Used by the unit tests, the mock HTTP server (end-to-end tests) and the in-browser demo mode.
 *
 * It deliberately deep-copies on every read and write. Google Sheets storage behaves that way (you always
 * get a fresh copy), and copying here exposes any code path that mutates a session but forgets to save it.
 *
 * Store contract (every method is synchronous):
 *   withLock(fn)                       re-entrant critical section
 *   getConfig() / setConfig(cfg)       class codes, default minutes, showScore, open, disabledItems
 *   getTeacherHash() / setTeacherHash  { salt, hash } — never the password itself
 *   getBank()                          { meta, items } including keys (the ItemBank sheet in production)
 *   findSessionByToken / findSessionById / saveSession / listSessions({preview})
 *   getPreview() / clearPreview()      the teacher's preview session lives apart from student records
 *   appendResponse(row) / appendHistory(rec) / listHistory()
 *   putTeacherToken / getTeacherTokenExp / delTeacherToken
 *   getCounter / bumpCounter / clearCounter   login-failure throttle
 *   onSessionChanged(session, reason), onSweep(list)   optional hooks (Sheets dashboards)
 */
var W8MemoryStore = (function () {
  'use strict';

  function clone(o) { return o === undefined || o === null ? o : JSON.parse(JSON.stringify(o)); }

  function create(opts) {
    opts = opts || {};
    var clock = opts.now || function () { return Date.now(); };
    var persist = opts.persist || null; // { load():state|null, save(state) } — browser demo only
    var state = (persist && persist.load && persist.load()) || null;
    if (!state) {
      state = {
        config: clone(opts.config) || { classCodes: {}, defaultMinutes: 90, showScore: true, open: true, disabledItems: [] },
        teacherHash: clone(opts.teacherHash) || null,
        sessions: {}, preview: null, history: [], responses: [], teacherTokens: {}, counters: {}
      };
    }
    var bank = clone(opts.bank);
    var depth = 0;
    var stats = { saves: 0, locks: 0 };

    function flush() { if (persist && persist.save) persist.save(state); }

    var store = {
      stats: stats,
      withLock: function (fn) {
        if (depth > 0) return fn();
        depth++; stats.locks++;
        try { return fn(); } finally { depth--; if (depth === 0) flush(); }
      },
      getConfig: function () { return clone(state.config); },
      setConfig: function (c) { state.config = clone(c); flush(); },
      getTeacherHash: function () { return clone(state.teacherHash); },
      setTeacherHash: function (h) { state.teacherHash = clone(h); flush(); },
      getBank: function () {
        if (!bank) throw new Error('No item bank loaded');
        return bank; // read-only by convention; the core never mutates it
      },
      setBank: function (b) { bank = clone(b); },
      findSessionByToken: function (tok) {
        if (state.preview && state.preview.token === tok) return clone(state.preview);
        var ids = Object.keys(state.sessions);
        for (var i = 0; i < ids.length; i++) if (state.sessions[ids[i]].token === tok) return clone(state.sessions[ids[i]]);
        return null;
      },
      findSessionById: function (id) { return clone(state.sessions[id]) || null; },
      saveSession: function (s) {
        stats.saves++;
        if (s.preview) state.preview = clone(s); else state.sessions[s.studentId] = clone(s);
        if (depth === 0) flush();
      },
      listSessions: function (f) {
        f = f || {};
        if (f.preview) return state.preview ? [clone(state.preview)] : [];
        return Object.keys(state.sessions).map(function (id) { return clone(state.sessions[id]); });
      },
      getPreview: function () { return clone(state.preview); },
      clearPreview: function () { state.preview = null; flush(); },
      appendResponse: function (row) { state.responses.push(clone(row)); },
      listResponses: function () { return clone(state.responses); },
      appendHistory: function (rec) { state.history.push(clone(rec)); },
      listHistory: function () { return clone(state.history); },
      putTeacherToken: function (tok, exp) { state.teacherTokens[tok] = exp; },
      getTeacherTokenExp: function (tok) { return state.teacherTokens[tok] || 0; },
      delTeacherToken: function (tok) { delete state.teacherTokens[tok]; },
      getCounter: function (k) { var c = state.counters[k]; return c && c.exp > clock() ? c.n : 0; },
      bumpCounter: function (k, ttlSec) { var c = state.counters[k]; var n = c && c.exp > clock() ? c.n + 1 : 1; state.counters[k] = { n: n, exp: clock() + ttlSec * 1000 }; },
      clearCounter: function (k) { delete state.counters[k]; },
      sleep: opts.sleep || null,
      selfTest: function (add) { add('Storage', true, 'in-memory (' + (persist ? 'saved in this browser — demo' : 'test') + ')'); },
      _state: state
    };
    return store;
  }

  return { create: create };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = W8MemoryStore;
