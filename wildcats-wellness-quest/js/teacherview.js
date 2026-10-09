/* Teacher Mode inside the app: who is signed in, who is working, every submission with its score, resubmissions, and what to
 * reteach, without opening the Google Sheet. Opened by typing the teacher code in the Class code box (js/views.js). The data is
 * protected by the passcode stored in your Apps Script project (Sheet menu: Wildcats Quest > Set teacher view passcode);
 * nothing is kept in this browser. Needs the Google Sheet backend (config.backend.url); without it the teacher code opens the
 * click-through preview as before. All network access goes through js/sync.js.
 */
(function (root) {
  'use strict';
  var W = root.WWQ, U = W.U, h = U.h, UI = W.UI;
  var TV = W.TeacherView = {};
  var TABS = [['overview', 'Overview'], ['students', 'Students and resets'], ['analytics', 'Analytics'], ['export', 'Export']];

  function num(v, d) { if (v === '' || v == null || isNaN(Number(v))) return null; var k = Math.pow(10, d == null ? 1 : d); return Math.round(Number(v) * k) / k; }
  function pct(v) { var n = num(v); return n == null ? '—' : n + '%'; }
  function pct100(v) { var n = num(Number(v) * 100, 0); return n == null ? '—' : n + '%'; }
  function safeCell(v) { var t = String(v == null ? '' : v); return /^[=+\-@]/.test(t) ? "'" + t : t; }
  function when(v) { try { var d = new Date(v); return isNaN(d) ? '' : d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return ''; } }

  TV.open = function (opts) {
    opts = opts || {};
    var main = document.getElementById('main'), bar = document.getElementById('hudslot');
    var pass = '', data = null, gone = false, timer = null, tab = 'overview', block = 'ALL', find = '', order = 'name', auto = true, pulled = null;
    var limit = W.CONFIG.timeLimitMinutes || 0;
    function say(m, kind) { UI.announce(m); if (UI.toast) UI.toast(m, kind || 'ok'); }
    function stop() { gone = true; clearInterval(timer); }
    function exit() { stop(); pass = ''; root.location.reload(); }
    function show(node) { main.replaceChildren(node); root.scrollTo(0, 0); }
    function call(op, extra) { return W.Sync.teacher(op, pass, extra); }

    function login(msg) {
      clearInterval(timer);
      var inp = h('input.txt#tv-pass', { type: 'password', autocomplete: 'off', 'aria-label': 'Teacher passcode' });
      var form = h('form.card.stack', { novalidate: true },
        h('h1', 'Teacher Mode'),
        h('p', 'Enter your teacher view passcode (set from the Sheet menu: Wildcats Quest > Set teacher view passcode). You will see who is working and every submission.'),
        h('div', h('label.field', { 'for': 'tv-pass' }, 'Teacher passcode'), inp), h('p.hint-line', { role: 'alert' }, msg || ''),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 'var(--s3)' } },
          h('button.btn.primary', { type: 'submit' }, 'Open Teacher Mode'),
          opts.onPreview ? UI.btn('Preview the assessment', { onclick: opts.onPreview }) : null, UI.btn('Back', { onclick: exit })));
      form.addEventListener('submit', function (e) { e.preventDefault(); pass = inp.value; load(); });
      show(h('div.tm', form)); inp.focus();
    }

    function load(quiet) {
      if (gone) return;
      if (!quiet) show(h('div.tm', h('div.card', 'Loading from your Google Sheet…')));
      call('dashboard').then(function (r) {
        if (gone) return;
        if (!r || !r.ok) {
          if (quiet && r && r.reason !== 'passcode') return;      // keep what is on screen through a hiccup
          var m = !r ? 'No answer from the Sheet.' : r.reason === 'passcode' ? 'That passcode did not match.' : r.reason === 'locked-out' ? 'Too many wrong tries. Wait ten minutes.'
            : r.reason === 'not-set' ? 'No teacher view passcode is set yet. In the Sheet choose Wildcats Quest > Set teacher view passcode (and deploy the newest Code.gs as a new version).'
            : r.reason === 'unknown-action' ? 'Your Apps Script is the older version. Paste the newest Code.gs and deploy a new version.' : 'Something went wrong: ' + r.reason;
          return login(m);
        }
        data = r; data.sessions = data.sessions || []; data.resubs = data.resubs || []; pulled = new Date(); render(); schedule();
      }, function () { if (!quiet) login('Could not reach the Sheet. Check Wi-Fi and the backend URL.'); });
    }
    function schedule() { clearInterval(timer); if (auto) timer = setInterval(function () { if (!document.hidden && !gone) load(true); }, 30000); }

    // ------------------------------------------------------------ helpers
    function blocks() {
      var list = (W.CONFIG.blocks || ['Block 1/2', 'Block 3/4', 'Block 6/7', 'Block 8/9']).slice();
      data.students.concat(data.sessions).forEach(function (s) { if (s.period && list.indexOf(String(s.period)) < 0) list.push(String(s.period)); });
      return list;
    }
    function inBlock(s) { return block === 'ALL' || String(s.period) === block; }
    function matches(s) { return !find || String(s.alias).toLowerCase().indexOf(find.toLowerCase()) >= 0; }
    var sorters = {
      name: function (a, b) { return String(a.alias).toLowerCase() < String(b.alias).toLowerCase() ? -1 : 1; },
      high: function (a, b) { return (num(b.percent) == null ? -1 : num(b.percent)) - (num(a.percent) == null ? -1 : num(a.percent)); },
      low: function (a, b) { return (num(a.percent) == null ? 999 : num(a.percent)) - (num(b.percent) == null ? 999 : num(b.percent)); },
      newest: function (a, b) { return new Date(b.when || b.started) - new Date(a.when || a.started); }
    };
    function minutesIn(s) { var t = new Date(s.started).getTime(); return isNaN(t) ? null : Math.max(0, Math.round((Date.now() - t) / 60000)); }
    function tile(label, val, note) { return h('div.tm-tile', h('div.tm-label', label), h('div.tm-big', String(val)), note ? h('div.tm-note', note) : null); }
    function table(heads, body, empty) {
      return h('div.tm-scroll', h('table.tm-table', h('thead', h('tr', heads.map(function (x) { return h('th', { scope: 'col' }, x); }))),
        h('tbody', body.length ? body.map(function (cells) { return h('tr', cells.map(function (c) { return h('td', c); })); }) : [h('tr', h('td', { colspan: heads.length }, empty))])));
    }
    function avgOf(R) { var v = R.map(function (s) { return num(s.percent); }).filter(function (x) { return x != null; }); return v.length ? Math.round(v.reduce(function (a, b) { return a + b; }, 0) / v.length * 10) / 10 : null; }

    // ------------------------------------------------------------ screens
    function controls() {
      return h('div.card.tm-controls',
        h('label.tm-field', 'Block', h('select.txt', { onchange: function (e) { block = e.target.value; render(); } }, h('option', { value: 'ALL', selected: block === 'ALL' }, 'All blocks'), blocks().map(function (b) { return h('option', { value: b, selected: b === block }, b); }))),
        h('label.tm-field.grow', 'Find', h('input.txt#tm-find', { type: 'search', placeholder: 'Search alias or ID', value: find, oninput: function (e) { find = e.target.value; renderBody(); } })),
        h('label.tm-field', 'Order', h('select.txt', { onchange: function (e) { order = e.target.value; render(); } }, [['name', 'Sort: alias'], ['high', 'Sort: score, high first'], ['low', 'Sort: score, low first'], ['newest', 'Sort: newest first']].map(function (o) { return h('option', { value: o[0], selected: o[0] === order }, o[1]); }))),
        UI.btn('Refresh now', { cls: 'primary sm', onclick: function () { load(); } }),
        UI.btn('Auto-refresh ' + (auto ? 'on' : 'off'), { cls: 'sm', onclick: function () { auto = !auto; schedule(); render(); } }),
        h('span.tm-updated', 'Updated ' + pulled.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })));
    }

    function overview() {
      var fin = data.students.filter(inBlock), wk = data.sessions.filter(inBlock), avg = avgOf(fin);
      var shownFin = fin.filter(matches).sort(sorters[order]), shownWk = wk.filter(matches).sort(sorters.name);
      var glance = blocks().map(function (b) {
        var f = data.students.filter(function (s) { return String(s.period) === b; }).length, w = data.sessions.filter(function (s) { return String(s.period) === b; }).length, all = f + w;
        return h('div.tm-block', h('b', b), h('div.tm-track', all ? [h('i.tm-done', { style: { width: f / all * 100 + '%' } }), h('i.tm-work', { style: { width: w / all * 100 + '%' } })] : h('span', 'No students yet')),
          h('span.tm-count', all + ' registered' + (all ? ' · ' + f + ' submitted' : '')));
      });
      return h('div', h('h1.tm-h1', 'Class overview'),
        h('div.tm-tiles', tile('Registered', fin.length + wk.length), tile('In progress', wk.length), tile('Submitted', fin.length), tile('Class average', avg != null ? avg + '%' : '—', fin.length ? '' : 'no one has finished yet')),
        h('div.card', h('h2', 'Blocks at a glance'), h('div.tm-glance', glance)),
        wk.length ? h('div.card', h('h2', 'Working right now'), table(['Alias / ID', 'Block', 'Time in'], shownWk.map(function (s) { var m = minutesIn(s); return [s.alias, s.period, m == null ? '—' : m + ' min' + (limit ? ' of ' + limit : '') + (limit && m >= limit - 15 ? ' (near the limit)' : '')]; }), 'Nobody is working right now.')) : null,
        h('div.card', h('h2', 'Submitted'), table(['Alias / ID', 'Block', 'Score', 'Points', 'Completed'], shownFin.map(function (s) { return [s.alias, s.period, h('b', pct(s.percent)), (num(s.points, 2) == null ? '—' : num(s.points, 2)) + '/' + (num(s.max, 0) == null ? '—' : num(s.max, 0)), pct(s.completion)]; }), 'No submissions yet.')));
    }

    function students() {
      var R = data.students.filter(inBlock).filter(matches).sort(sorters[order]);
      var hasLetters = R.some(function (s) { return s.letter; });
      var heads = ['Alias / ID', 'Block', 'Class', 'Score', 'Points', hasLetters ? 'Letter' : null, 'Completed', 'Attempts used', 'Minutes', 'Submitted'].filter(function (x) { return x !== null; });
      var body = R.map(function (s) {
        return [s.alias, s.period, s.code, h('b', pct(s.percent)), (num(s.points, 2) == null ? '—' : num(s.points, 2)) + '/' + (num(s.max, 0) == null ? '—' : num(s.max, 0)), hasLetters ? s.letter : null,
          pct(s.completion), s.attemptsUsed === '' ? '—' : s.attemptsUsed + '/' + s.attemptsAllowed, s.minutes === '' ? '—' : s.minutes, when(s.when)].filter(function (x) { return x !== null; });
      });
      var rs = data.resubs.filter(function (r) { return inBlock(r) && matches(r); });
      return h('div', h('h1.tm-h1', 'Students and resets'), h('div.card', h('p.tm-small', R.length + ' submitted.'), table(heads, body, 'No submissions yet.')),
        h('div.card', h('h2', 'Resubmissions'), h('p.tm-small', 'These students submitted again. The first result stays on Summary until you choose "Use this one"; the earlier result is kept on the Resubmissions tab.'),
          table(['Alias / ID', 'Block', 'Class', 'Resubmitted score', 'Submitted', ''], rs.map(function (r) { return [r.alias, r.period, r.code, pct(r.percent), when(r.when), UI.btn('Use this one', { cls: 'sm', onclick: function () { useResub(r); } })]; }), 'No resubmissions.')));
    }

    function analytics() {
      return h('div', h('h1.tm-h1', 'Analytics'), h('div.card', h('h2', 'What to reteach'),
        h('div.tm-two',
          h('div', h('h3', 'Topics, weakest first'), table(['Topic', 'Class % (final)', 'Class % (first try)'], (data.topics || []).map(function (t) { return [t.name, pct100(t.pct), pct100(t.firstPct)]; }), 'No data yet.')),
          h('div', h('h3', 'Hardest questions'), table(['Item', 'Topic', 'Class % (final)', 'Avg attempts', ''], (data.items || []).map(function (i) { return [i.id, i.topic, pct100(i.pct), num(i.avgAttempts, 1), i.flag ? 'Review' : '']; }), 'No data yet.')))));
    }

    function exportTab() {
      return h('div', h('h1.tm-h1', 'Export'), h('div.card.stack', h('p', 'Download every submission in the chosen block as a spreadsheet file. The full gradebook is also in your Google Sheet.'), h('div', UI.btn('Download CSV', { cls: 'primary', onclick: csv }))));
    }

    var views = { overview: overview, students: students, analytics: analytics, 'export': exportTab };
    function renderBody() { var host = document.getElementById('tm-body'); if (host) host.replaceChildren(views[tab]()); }
    function render() {
      var keep = document.activeElement && document.activeElement.id === 'tm-find';
      show(h('div.tm',
        h('div.tm-bar', h('div', h('b', 'Teacher Mode'), ' · ' + (W.CONFIG.appName || 'Wildcats Wellness Quest') + ' · signed in'),
          h('div.tm-btns', opts.onPreview ? UI.btn('Open student preview', { cls: 'sm', onclick: opts.onPreview }) : null, UI.btn('Sign out', { cls: 'sm', onclick: exit }))),
        h('nav.tm-tabs', { 'aria-label': 'Teacher sections' }, TABS.map(function (t) { return h('button.tm-tab', { type: 'button', 'aria-current': t[0] === tab ? 'page' : null, onclick: function () { tab = t[0]; render(); } }, t[1]); })),
        controls(), h('div#tm-body', views[tab]())));
      UI.announce('Teacher Mode updated.');
      if (keep) { var f = document.getElementById('tm-find'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }
    }

    function useResub(r) {
      if (!root.confirm('Use ' + r.alias + '’s resubmission (' + pct(r.percent) + ') as their result? Their earlier result moves to the Resubmissions tab.')) return;
      call('resub', { alias: r.alias }).then(function (res) { say(res && res.ok ? 'Done. The resubmission is now their result.' : ((res && res.message) || 'Could not apply it.'), res && res.ok ? 'ok' : 'bad'); load(); },
        function () { say('Could not reach the Sheet.', 'bad'); });
    }

    function csv() {
      var q = function (v) { return '"' + safeCell(v).replace(/"/g, '""') + '"'; };
      var head = ['Alias / ID', 'Block', 'Class code', 'Percent', 'Points', 'Out of', 'Letter', 'Completion %', 'First-attempt points', 'Attempts used', 'Attempts allowed', 'Minutes', 'Mission 1', 'Mission 2', 'Mission 3', 'Mission 4', 'Mission 5', 'Mission 6', 'Mission 7', 'Submitted'];
      var lines = data.students.filter(inBlock).sort(sorters.name).map(function (s) { return [s.alias, s.period, s.code, s.percent, s.points, s.max, s.letter, s.completion, s.firstAttempt, s.attemptsUsed, s.attemptsAllowed, s.minutes].concat(s.missions || [], [when(s.when)]).map(q).join(','); });
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([[head.map(q).join(',')].concat(lines).join('\n')], { type: 'text/csv' })); a.download = 'wellness-quest-results.csv'; a.click();
    }

    if (bar) bar.replaceChildren();
    login();
  };
})(typeof window !== 'undefined' ? window : globalThis);
