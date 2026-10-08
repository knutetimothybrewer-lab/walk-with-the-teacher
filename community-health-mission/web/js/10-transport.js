'use strict';
// Transport layer. All calls return a Promise resolving to the server's parsed JSON.
// A request that fails in transit (no readable acknowledgment) is retried with the SAME payload (same requestId),
// so the server can replay the original result without consuming another attempt.
CHM.transport = (function () {
  var mode = CHM.config.transport || 'http';
  var demoEngine = null;

  function raw(action, payload) {
    var body = JSON.stringify({ action: action, payload: payload });
    if (mode === 'appsScript') {
      return new Promise(function (resolve, reject) {
        try {
          google.script.run.withSuccessHandler(function (s) { try { resolve(JSON.parse(s)); } catch (e) { reject(new Error('unreadable acknowledgment')); } })
            .withFailureHandler(function (e) { reject(new Error(String(e && e.message || e))); }).api(body);
        } catch (e) { reject(e); }
      });
    }
    if (mode === 'static') {   // engine runs in this page; CHM.staticHandle may answer asynchronously (delivery to the Sheet)
      return Promise.resolve(CHM.staticHandle(action, payload)).then(function (r) { return JSON.parse(JSON.stringify(r)); });
    }
    if (mode === 'demo') {
      return new Promise(function (resolve) { setTimeout(function () { resolve(JSON.parse(JSON.stringify(CHM.demoHandle(action, payload)))); }, 120); });
    }
    return fetch('api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body, credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  // call(): retries transport failures and retryable server responses (BUSY / SERVER_ERROR flagged retryable)
  function call(action, payload, opts) {
    opts = opts || {};
    var max = opts.retries == null ? 4 : opts.retries, n = 0;
    return new Promise(function (resolve, reject) {
      function go() {
        n++;
        raw(action, payload).then(function (res) {
          if (res && (res.code === 'BUSY' || (res.code === 'SERVER_ERROR' && res.retryable)) && n <= max) return later(res);
          resolve(res);
        }, function (err) { if (n <= max) later(err); else reject(Object.assign(new Error('transport'), { transport: true, cause: err })); });
      }
      function later() { setTimeout(go, Math.min(6000, 500 * Math.pow(2, n - 1)) + Math.random() * 300); if (opts.onRetry) opts.onRetry(n); }
      go();
    });
  }
  return { call: call, mode: function () { return mode; } };
})();

// Pending-request outbox: a mutating request that could not be acknowledged is kept and re-sent unchanged.
CHM.outbox = {
  key: function () { return 'outbox.' + (CHM.session ? CHM.session.sessionId : 'none'); },
  get: function () { return CHM.ls.get(this.key()); },
  put: function (req) { CHM.ls.set(this.key(), req); },
  clear: function () { CHM.ls.del(this.key()); }
};
