/*
 * storage.js — safe localStorage wrapper. Everything stays on the student's own computer.
 * If localStorage is blocked (private mode, school policy) the app still works for the current
 * tab using an in-memory fallback — it just can't restore after a refresh.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};
  var PREFIX = 'parlaylab.v1.';
  var memory = {};
  var persistent = true;

  function test() {
    try {
      var k = PREFIX + 'probe';
      root.localStorage.setItem(k, '1'); root.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  }
  persistent = typeof root.localStorage !== 'undefined' && test();

  function get(key, fallback) {
    try {
      var raw = persistent ? root.localStorage.getItem(PREFIX + key) : memory[key];
      if (raw === null || raw === undefined) return fallback;
      return JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function set(key, value) {
    var raw = JSON.stringify(value);
    try { if (persistent) root.localStorage.setItem(PREFIX + key, raw); else memory[key] = raw; return true; }
    catch (e) { memory[key] = raw; return false; }
  }
  function remove(key) {
    try { if (persistent) root.localStorage.removeItem(PREFIX + key); } catch (e) { /* ignore */ }
    delete memory[key];
  }

  PL.Storage = {
    get: get, set: set, remove: remove, isPersistent: function () { return persistent; },
    loadSession: function () { return get('session', null); },
    saveSession: function (s) { return set('session', s); },
    clearSession: function () { remove('session'); },
    loadTeacher: function () { return get('teacher', null); },
    saveTeacher: function (c) { return set('teacher', c); }
  };
})(typeof window !== 'undefined' ? window : globalThis);
