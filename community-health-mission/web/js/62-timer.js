'use strict';
// Countdown for the hard time limit. The server owns the deadline (state.deadline) and enforces it; this file only shows
// the clock and, at zero, submits what is there. Preview sessions have no deadline, so nothing here applies to them.
(function () {
  var iv = null, offset = 0, busy = false, warned = {}, bannerTimer = null;

  function leftMs() { var d = CHM.state && CHM.state.deadline; return d ? Date.parse(d) - (Date.now() + offset) : null; }
  function fmt(ms) {
    var t = Math.max(0, Math.ceil(ms / 1000)), hh = Math.floor(t / 3600), mm = Math.floor(t % 3600 / 60), ss = t % 60;
    return hh ? hh + ':' + (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss : mm + ':' + (ss < 10 ? '0' : '') + ss;
  }
  function active() { return !!(CHM.session && !CHM.session.preview && CHM.state && CHM.state.status !== 'finalized' && CHM.state.deadline); }

  // Shown in the top bar by 60-app.js.
  CHM.timeChipEl = function () {
    if (!active()) return null;
    return h('span#timechip.timechip', { role: 'timer' }, h('span.sr-only', 'Time remaining: '), h('span#timetxt', fmt(leftMs())));
  };

  function banner(msg) {
    var b = document.getElementById('timebanner');
    if (!b) { b = h('div#timebanner.timebanner', { role: 'alert' }); document.body.appendChild(b); }
    b.textContent = msg; b.hidden = false; clearTimeout(bannerTimer);
    bannerTimer = setTimeout(function () { b.hidden = true; }, 9000);
    CHM.announce(msg);
  }

  // Submit any answer that is complete but not yet submitted (it counts as the next attempt), then finalize.
  function submitDrafts(deadlineWall) {
    var open = [];
    CHM.content.modules.forEach(function (m) { m.units.forEach(function (u) { var s = CHM.state.units[u.id]; if (s.status === 'open' && CHM.drafts[u.id]) open.push(u); }); });
    return open.reduce(function (p, u) {
      return p.then(function () {
        if (Date.now() > deadlineWall) return;
        var resp = CHM.drafts[u.id], s = CHM.state.units[u.id];
        if (CHM_grading.validateUnit(CHM.content, u, resp)) return;
        return CHM.api('submitUnit', { requestId: CHM.uid(), unitId: u.id, response: resp, expectedAttempt: s.next && s.next.attempt }, { retries: 1 }).then(function (r) {
          if (r && r.state) CHM.state = Object.assign(r.state, { activity: CHM.state.activity });
        }, function () { /* the server will still finalize with what it has */ });
      });
    }, Promise.resolve());
  }

  function expire() {
    if (busy) return; busy = true;
    banner('Time is up. Submitting your answers now.');
    submitDrafts(Date.now() + 10000).then(function () {
      return CHM.api('finalize', { requestId: CHM.uid(), confirm: true }, { retries: 6 });
    }).then(function (res) {
      busy = false;
      if (res && res.ok) { CHM.state = Object.assign(res.state, { activity: CHM.state.activity }); CHM.final = res.final; CHM.go('results'); }
    }, function () { busy = false; /* offline: the next tick tries again; the server also finalizes on its own */ });
  }

  function tick() {
    if (!CHM.session || CHM.session.preview || !CHM.state) return;
    if (CHM.state.status === 'finalized') {   // the server already closed it (for example, on a refresh after time ran out)
      if (CHM.view && CHM.view.name !== 'results' && CHM.state.final) { CHM.final = CHM.state.final; CHM.go('results'); }
      return;
    }
    if (!active()) return;
    var l = leftMs(), mins = l / 60000, chip = document.getElementById('timechip'), txt = document.getElementById('timetxt');
    if (txt) txt.textContent = fmt(l);
    if (chip) { chip.classList.toggle('warn', mins <= 15 && mins > 5); chip.classList.toggle('crit', mins <= 5); }
    [15, 5, 1].some(function (m) {
      if (mins <= m && mins > 0 && !warned[m]) { warned[m] = 1; banner(m + ' minute' + (m > 1 ? 's' : '') + ' left. Your answers will be submitted automatically when time runs out.'); return true; }
    });
    if (l <= 0) expire();
  }

  CHM.timerStart = function (serverTime) {
    var t = Date.parse(serverTime); offset = isNaN(t) ? 0 : t - Date.now();
    clearInterval(iv); iv = setInterval(tick, 1000); tick();
  };
})();
