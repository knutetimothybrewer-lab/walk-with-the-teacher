/* server/stores/memory.js: in-memory store used by unit tests, the dev server (file-backed subclass) and the
 * in-browser demo.  Implements exactly the interface the engine expects; values are deep-copied on the way in
 * and out so callers cannot mutate "stored" records by accident (this mimics a real database / spreadsheet). */
(function (root) {
  'use strict';
  function copy(o) { return o == null ? o : JSON.parse(JSON.stringify(o)); }

  function MemoryStore(opts) {
    opts = opts || {};
    this.now = opts.now || function () { return new Date().getTime(); };
    this.d = {
      config: opts.config || { codes: {}, settings: {} }, teacher: opts.teacher || null, kv: {},
      sessions: {}, byKey: {}, archive: [], preview: {}, demo: {}, touch: {}, roster: opts.roster || null,
      testRecords: [], audit: [], dirty: false
    };
    this.lastReport = null;
    this.flushCount = 0;
    this.onChange = null;
  }
  var P = MemoryStore.prototype;
  P.changed = function () { if (this.onChange) this.onChange(); };
  P.withLock = function (fn) {
    // Apps Script's script lock is not reentrant, so nested use is a bug; fail loudly in tests.
    if (this._locked) throw new Error('nested withLock');
    this._locked = true;
    try { return fn(); } finally { this._locked = false; }
  };

  P.getConfig = function () { return copy(this.d.config); };
  P.saveConfig = function (c) { this.d.config = copy(c); this.changed(); };
  P.getTeacher = function () { return copy(this.d.teacher); };
  P.setTeacher = function (t) { this.d.teacher = copy(t); this.changed(); };

  P.kvGet = function (k) { var e = this.d.kv[k]; if (!e) return null; if (e.exp && e.exp < this.now()) { delete this.d.kv[k]; return null; } return copy(e.v); };
  P.kvPut = function (k, v, ttlSec) { this.d.kv[k] = { v: copy(v), exp: ttlSec ? this.now() + ttlSec * 1000 : 0 }; };
  P.kvDel = function (k) { delete this.d.kv[k]; };

  P.getSession = function (id) { return copy(this.d.sessions[id] || null); };
  P.putSession = function (s) { this.d.sessions[s.id] = copy(s); this.d.byKey[s.key] = s.id; this.changed(); };
  P.findByKey = function (key) { return this.d.byKey[key] || null; };
  P.listSessions = function () { var self = this; return Object.keys(this.d.sessions).map(function (id) { return copy(self.d.sessions[id]); }); };
  P.listHeaders = function () { var self = this; return Object.keys(this.d.sessions).map(function (id) { var s = self.d.sessions[id]; return { id: s.id, key: s.key, block: s.block, status: s.status, deadline: s.deadline }; }); };
  P.replaceSession = function (oldId, fresh) { delete this.d.sessions[oldId]; this.d.touch[oldId] = undefined; this.putSession(fresh); };
  P.archiveSession = function (s, meta) {
    var row = meta.row || {};
    this.d.archive.push({ key: s.key, archivedAt: new Date(meta.at).toISOString(), by: meta.by, reason: meta.reason, status: s.status, pct: row.pct, snapshot: copy(s) });
    this.changed();
  };
  P.listArchive = function (key) { return this.d.archive.filter(function (a) { return !key || a.key === key; }).map(function (a) { return { key: a.key, archivedAt: a.archivedAt, by: a.by, reason: a.reason, status: a.status, pct: a.pct }; }); };

  P.getPreview = function (id) { return copy(this.d.preview[id] || null); };
  P.putPreview = function (s) { this.d.preview[s.id] = copy(s); this.changed(); };

  P.listDemo = function () { var self = this; return Object.keys(this.d.demo).map(function (id) { return copy(self.d.demo[id]); }); };
  P.putDemo = function (s) { this.d.demo[s.id] = copy(s); this.changed(); };
  P.clearDemo = function () { this.d.demo = {}; this.changed(); };
  P.writeTestRecords = function (rows) { var self = this; rows.forEach(function (r) { self.d.testRecords.push(r); }); this.changed(); return rows.length; };

  P.getTouch = function (id) { return copy(this.d.touch[id] || null); };
  P.touch = function (id, tk) { this.d.touch[id] = copy(tk); };
  P.clearTouch = function (id) { delete this.d.touch[id]; };

  P.hasRoster = function () { return !!(this.d.roster && Object.keys(this.d.roster).length); };
  P.getRoster = function (id) { return this.d.roster ? copy(this.d.roster[id] || null) : null; };

  P.markDirty = function () { this.d.dirty = true; };
  P.flushReports = function (builder, force) { this.d.dirty = false; this.flushCount++; this.lastReport = builder('real'); return true; };
  P.appendAudit = function (a) { this.d.audit.push(copy(a)); this.changed(); };
  P.testSheets = function (rec) { this.d.testRecords.push([rec.at, 'SHEETS TEST', rec.id]); return { readBack: true, destination: 'in-memory test store', tabs: ['Test Records'] }; };

  var api = { MemoryStore: MemoryStore };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  root.U5Memory = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
