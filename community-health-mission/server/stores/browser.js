(function (root) {
  'use strict';
  // Browser store for the static ("play") build. The engine runs in the student's browser, progress is kept in
  // localStorage so a reload resumes, and the finished result is queued for the Google Sheet receiver.
  // Any class code is accepted locally; the Sheet receiver decides which codes are real (ClassCodes tab).
  var Base = (typeof require === 'function' && typeof module !== 'undefined') ? require('./memory') : root.CHM_MemoryStore;

  function BrowserStore(opts) {
    Base.call(this, opts);
    opts = opts || {};
    this.pub = opts.pub; this.storage = opts.storage || null; this.key = opts.key || 'chm.store.v1';
    this.acked = {}; this.outbox = {};
    this._load();
    var self = this;
    ['putSession', 'appendResponses', 'saveClass', 'setRoster', 'markGradebookReset', 'appendAudit', 'putPreview', 'kvPut'].forEach(function (n) {
      var orig = self[n]; self[n] = function () { var r = orig.apply(self, arguments); self._save(); return r; };
    });
  }
  BrowserStore.prototype = Object.create(Base.prototype);
  var P = BrowserStore.prototype;
  var FIELDS = ['classes', 'roster', 'sessions', 'previews', 'responses', 'gradebook', 'audit', 'kv', 'acked'];

  P._load = function () {
    try {
      var t = this.storage && this.storage.getItem(this.key); if (!t) return;
      var d = JSON.parse(t), self = this; FIELDS.forEach(function (f) { if (d[f]) self[f] = d[f]; });
    } catch (e) { /* storage unavailable or corrupt: start clean */ }
  };
  P._save = function () {
    if (!this.storage) return;
    try { var d = {}, self = this; FIELDS.forEach(function (f) { d[f] = self[f]; }); this.storage.setItem(this.key, JSON.stringify(d)); } catch (e) { /* ignore */ }
  };

  // Every non-empty class code is open locally.
  P.getClass = function (code) {
    if (!code) return null;
    return { code: code, name: code, section: '', version: this.pub.version, status: 'open', opensAt: '', closesAt: '', requireRoster: false, revealMode: 'final', pacingFactor: 1 };
  };

  // Build what the Sheet receives for one finished student.
  P.buildPayload = function (s, results) {
    var self = this, byId = {};
    this.pub.modules.forEach(function (m) { m.units.forEach(function (u) { byId[u.id] = { module: m.id, points: u.points }; }); });
    return {
      v: 1, sessionId: s.id, receiptId: s.final.receiptId, classCode: s.classCode, rosterId: s.rosterId, name: s.name, period: s.period,
      startedAt: new Date(s.createdAt).toISOString(), finalizedAt: new Date(s.final.finalizedAt).toISOString(),
      earned: results.earned, possible: results.possible, pct: results.pct, completed: results.completed, firstTryCorrect: results.firstTryCorrect, attempts: results.attempts,
      minutes: Math.round((s.final.finalizedAt - s.createdAt) / 600) / 100,
      modules: results.modules.map(function (m) { return { id: m.id, earned: m.earned, possible: m.possible }; }),
      units: Object.keys(s.units).map(function (id) { var x = s.units[id]; return { id: id, module: (byId[id] || {}).module, points: (byId[id] || {}).points, earned: x.earned, attempts: x.attempts, status: x.status, correctOn: x.correctOn || 0 }; }),
      responses: this.responses.filter(function (r) { return r.sessionId === s.id; }).map(function (r) {
        return { taskId: r.taskId, module: r.module, concept: r.concept, attempt: r.attempt, correct: r.correct, earned: r.earned, possible: r.possible, acceptedAt: r.acceptedAt };
      })
    };
  };

  // Delivery to the Sheet is asynchronous, so the first call queues the payload and reports "pending".
  // After the Sheet acknowledges, the page calls retryGradebook and this call succeeds.
  P.writeGradebook = function (s, results) {
    if (this.acked[s.id]) { this.gradebook[s.id] = { sessionId: s.id, classCode: s.classCode, rosterId: s.rosterId, name: s.name, earned: results.earned, possible: results.possible, pct: results.pct, receiptId: s.final.receiptId, status: 'finalized' }; this._save(); return; }
    this.outbox[s.id] = this.buildPayload(s, results);
    throw new Error('Waiting to send results to your teacher');
  };
  P.markAcked = function (id) { this.acked[id] = true; delete this.outbox[id]; this._save(); };

  if (typeof module !== 'undefined' && module.exports) module.exports = BrowserStore; else root.CHM_BrowserStore = BrowserStore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
