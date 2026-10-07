(function (root) {
  'use strict';
  // In-memory store: used by tests and by the browser DEMO. Values are JSON-serialized on every get/put to mimic
  // a real datastore (no shared object references).
  function MemoryStore(opts) {
    opts = opts || {};
    this.classes = {}; this.roster = {}; this.sessions = {}; this.previews = {}; this.responses = []; this.gradebook = {}; this.audit = []; this.kv = {}; this.tests = [];
    this.teacher = opts.teacher || null; this.lockDepth = 0; this.faults = {}; this.clock = opts.now || function () { return Date.now(); };
  }
  var P = MemoryStore.prototype;
  var J = function (x) { return JSON.parse(JSON.stringify(x)); };
  P.failNext = function (op) { this.faults[op] = true; };
  P._fault = function (op) { if (this.faults[op]) { delete this.faults[op]; throw new Error('injected failure: ' + op); } };
  P.withLock = function (fn) { if (this.lockDepth > 0) throw new Error('lock re-entered'); this.lockDepth++; try { return fn(); } finally { this.lockDepth--; } };
  P.getClass = function (code) { return this.classes[code] ? J(this.classes[code]) : null; };
  P.listClasses = function () { var self = this; return Object.keys(this.classes).map(function (k) { return J(self.classes[k]); }); };
  P.saveClass = function (c) { this.classes[c.code] = J(c); };
  P.setRoster = function (code, rosterId, accessToken) { this.roster[code + '|' + rosterId] = { accessToken: accessToken }; };
  P.getRoster = function (code, rosterId) { var r = this.roster[code + '|' + rosterId]; return r ? J(r) : null; };
  P.findSessionId = function (code, rosterId, version) {
    var self = this, hit = null;
    Object.keys(this.sessions).forEach(function (id) { var s = JSON.parse(self.sessions[id]); if (s.classCode === code && s.rosterId.toLowerCase() === rosterId.toLowerCase() && s.version === version && s.status !== 'reset') hit = id; });
    return hit;
  };
  P.getSession = function (id) { return this.sessions[id] ? JSON.parse(this.sessions[id]) : null; };
  P.putSession = function (s) { this._fault('putSession'); this.sessions[s.id] = JSON.stringify(s); };
  P.listSessions = function (code) { var self = this; return Object.keys(this.sessions).map(function (k) { return JSON.parse(self.sessions[k]); }).filter(function (s) { return !code || s.classCode === code; }); };
  P.appendResponses = function (rows) { this._fault('appendResponses'); var self = this; rows.forEach(function (r) { self.responses.push(J(r)); }); };
  P.listResponses = function (code) { return this.responses.filter(function (r) { return !code || r.classCode === code; }).map(J); };
  P.writeGradebook = function (s, results) { this._fault('writeGradebook'); this.gradebook[s.id] = { sessionId: s.id, classCode: s.classCode, rosterId: s.rosterId, name: s.name, earned: results.earned, possible: results.possible, pct: results.pct, receiptId: s.final.receiptId, status: 'finalized' }; };
  P.markGradebookReset = function (s) { if (this.gradebook[s.id]) this.gradebook[s.id].status = 'reset'; };
  P.appendAudit = function (a) { this.audit.push(J(a)); };
  P.getPreview = function (id) { return this.previews[id] ? JSON.parse(this.previews[id]) : null; };
  P.putPreview = function (s) { this.previews[s.id] = JSON.stringify(s); };
  P.kvGet = function (k) { var e = this.kv[k]; if (!e) return null; if (e.exp && e.exp < this.clock()) { delete this.kv[k]; return null; } return e.v; };
  P.kvPut = function (k, v, ttl) { this.kv[k] = { v: v, exp: ttl ? this.clock() + ttl * 1000 : 0 }; };
  P.getTeacherConfig = function () { return this.teacher; };
  P.testDelivery = function (rec) { this._fault('testDelivery'); this.tests.push(J(rec)); return { readBack: true, destination: 'memory test table (DeliveryTest)' }; };

  if (typeof module !== 'undefined' && module.exports) module.exports = MemoryStore; else root.CHM_MemoryStore = MemoryStore;
})(typeof globalThis !== 'undefined' ? globalThis : this);
