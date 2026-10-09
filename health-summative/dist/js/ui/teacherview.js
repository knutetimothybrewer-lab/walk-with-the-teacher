/* teacherview.js — the teacher view inside the app: every finished student with their score, class averages,
   and what to reteach, without opening the Google Sheet. Opened by typing the teacher code in the Class code box;
   the data itself is protected by the passcode stored in the Apps Script project (Wildcat Trail menu).
   Works with the older Code.gs too (it falls back to the basic list until Code.gs is updated). */
import { h, clear } from './dom.js';

const num = (v, d = 1) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Math.round(Number(v) * 10 ** d) / 10 ** d);
const pct = (v) => (num(v) == null ? '—' : num(v) + '%');
const mins = (sec) => (num(sec, 0) == null ? '—' : Math.max(1, Math.round(Number(sec) / 60)));
const safeCell = (v) => { const t = String(v ?? ''); return /^[=+\-@]/.test(t) ? "'" + t : t; };

export function mountTeacher({ root, cfg, onPreview, onExit }) {
  let pass = '', data = null, legacy = false, gone = false, timer = null, period = 'ALL', klass = 'ALL', lastPulled = null;
  const say = (m) => { const live = document.getElementById('live') || document.getElementById('announcer'); if (live) live.textContent = m; };
  const stop = () => { gone = true; clearInterval(timer); };
  const exit = () => { stop(); pass = ''; if (onExit) onExit(); };
  const show = (node) => { clear(root); root.append(node); window.scrollTo(0, 0); };

  async function call(op, extra = {}) {
    const r = await fetch(cfg.backend.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'teacher', op, passcode: pass, ...extra }) });
    return r.json();
  }

  function login(msg) {
    clearInterval(timer);
    const inp = h('input', { id: 'tv-pass', type: 'password', autocomplete: 'off', 'aria-label': 'Teacher passcode' });
    const err = h('p', { class: 'form-err', role: 'alert' }, msg || '');
    const form = h('form', { class: 'card', novalidate: true },
      h('h1', {}, 'Teacher view'),
      cfg.backend && cfg.backend.url
        ? h('p', { class: 'small' }, 'Enter your teacher passcode (the one you set from the Sheet’s Wildcat Trail menu). You will see every finished student and what to reteach.')
        : h('p', { class: 'form-err' }, 'No backend URL is set in config.js yet, so there is no data to show.'),
      h('div', { class: 'field', style: 'max-width:340px' }, h('label', { for: 'tv-pass' }, 'Teacher passcode'), inp), err,
      h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn-primary' }, 'Open teacher view'),
        onPreview ? h('button', { type: 'button', class: 'btn-quiet', onclick: onPreview }, 'Preview the assessment') : null,
        onExit ? h('button', { type: 'button', class: 'btn-quiet', onclick: exit }, 'Back') : null));
    form.addEventListener('submit', async (e) => { e.preventDefault(); pass = inp.value; await load(); });
    show(h('div', { class: 'tv' }, form)); inp.focus();
  }

  async function load(quiet) {
    if (gone) return;
    if (!cfg.backend || !cfg.backend.url) return login();
    if (!quiet) show(h('div', { class: 'tv' }, h('p', {}, 'Loading from your Google Sheet…')));
    let r;
    try {
      r = await call('dashboard');
      if (r && r.reason === 'unknown-op') { legacy = true; r = await call('list'); } else if (r && r.ok) legacy = false;
    } catch { if (quiet) return; return login('Could not reach the Sheet. Check Wi-Fi and the backend URL in config.js.'); }
    if (gone) return;
    if (!r || !r.ok) {
      if (quiet && r && r.reason !== 'passcode') return;   // keep what is on screen through a hiccup
      return login(r && r.reason === 'passcode' ? 'That passcode did not match.' : 'Something went wrong: ' + ((r && r.reason) || 'no answer'));
    }
    data = r; lastPulled = new Date(); render(); say('Teacher view updated.');
    clearInterval(timer); timer = setInterval(() => { if (!document.hidden && !gone) load(true); }, 30000);
  }

  const filtered = () => data.students.filter((s) => (period === 'ALL' || String(s.period) === period) && (klass === 'ALL' || String(s.code) === klass));

  function render() {
    const rows = filtered().slice().sort((a, b) => String(a.last).localeCompare(String(b.last)) || String(a.first).localeCompare(String(b.first)));
    const scores = rows.map((s) => num(s.percent)).filter((v) => v != null);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : null;
    const periods = [...new Set(data.students.map((s) => String(s.period)))].sort();
    const codes = [...new Set(data.students.map((s) => String(s.code)))].sort();
    const tile = (label, val, note) => h('div', { class: 'tv-tile' }, h('div', { class: 'small' }, label), h('div', { class: 'tv-big' }, String(val)), note ? h('div', { class: 'small' }, note) : null);
    const select = (label, opts, cur, set) => h('label', { class: 'tv-sel' }, label, h('select', { onchange: (e) => { set(e.target.value); render(); } }, h('option', { value: 'ALL', selected: cur === 'ALL' }, 'All'), opts.map((o) => h('option', { value: o, selected: o === cur }, o))));

    const table = h('table', { class: 'tv-table' },
      h('caption', {}, `${rows.length} finished${avg != null ? ' • class average ' + avg + '%' : ''}`),
      h('thead', {}, h('tr', {}, ['Last', 'First', 'Period', 'Code', 'Score', 'Points', legacy ? null : 'Minutes', legacy ? null : 'Skips', legacy ? null : 'Help opens', ''].filter((x) => x !== null).map((x) => h('th', { scope: 'col' }, x)))),
      h('tbody', {}, rows.length ? rows.map((s) => h('tr', {},
        h('td', {}, s.last), h('td', {}, s.first), h('td', {}, s.period), h('td', {}, s.code), h('td', { class: 'tv-score' }, pct(s.percent)),
        h('td', {}, `${num(s.earned) ?? '—'}/${num(s.possible, 0) ?? '—'}`),
        legacy ? null : [h('td', {}, mins(s.activeSec)), h('td', {}, s.skips ?? '—'), h('td', {}, s.helpOpens ?? '—')],
        h('td', {}, h('button', { type: 'button', class: 'btn-quiet small', onclick: () => reset(s) }, 'Reset')))) : [h('tr', {}, h('td', { colspan: legacy ? 7 : 10 }, 'No finished students yet.'))]));

    const rate = (o) => Math.round((o.rate || 0) * 100) + '%';
    const tableOf = (heads, bodyRows, emptyText) => h('table', { class: 'tv-table' },
      h('thead', {}, h('tr', {}, heads.map((x) => h('th', { scope: 'col' }, x)))),
      h('tbody', {}, bodyRows.length ? bodyRows.map((cells) => h('tr', {}, cells.map((c) => h('td', {}, c)))) : [h('tr', {}, h('td', { colspan: heads.length }, emptyText))]));
    const rateRows = (list) => (list || []).map((t) => [t.name, t.n, t.miss, rate(t)]);
    const itemRows = (data.items || []).map((it) => [it.id, it.station, it.label, it.n, Math.round(it.firstPct * 100) + '%', it.top ? it.top + ' (' + it.topCount + ')' : '', it.flag ? 'Review' : '']);
    const analysis = legacy
      ? h('div', { class: 'note calm' }, h('strong', {}, 'More is available. '), 'Time, skips and the question analysis appear after you paste the newest Code.gs into Apps Script and deploy a new version (Deploy > Manage deployments > pencil > New version).')
      : h('div', {},
        h('div', { class: 'card' }, h('h2', {}, 'What to reteach'),
          h('div', { class: 'grid2' },
            h('div', {}, h('h3', {}, 'Lesson topics, most missed first'), tableOf(['Topic', 'Answers', 'Missed on try 1', 'Miss rate'], rateRows(data.topics), 'No data yet.')),
            h('div', {}, h('h3', {}, 'Stations, most missed first'), tableOf(['Station', 'Answers', 'Missed on try 1', 'Miss rate'], rateRows(data.stations), 'No data yet.')))),
        h('div', { class: 'card' }, h('h2', {}, 'Hardest questions'),
          h('p', { class: 'small' }, 'Lowest share correct on the first try. Items marked Review are below 40% and may be a bad question.'),
          h('div', { class: 'tv-scroll' }, tableOf(['Item', 'Station', 'Question (start)', 'Students', 'Right on try 1', 'Most common wrong answer', ''], itemRows, 'No question data yet.'))));

    show(h('div', { class: 'tv' },
      h('div', { class: 'card row tv-head' }, h('div', {}, h('h1', {}, 'Teacher view'), h('div', { class: 'small' }, `Updated ${lastPulled.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })} • refreshes about every 30 seconds`)),
        h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn-quiet', onclick: () => load() }, 'Refresh now'), h('button', { type: 'button', class: 'btn-quiet', onclick: csv }, 'Download CSV'),
          onPreview ? h('button', { type: 'button', class: 'btn-quiet', onclick: onPreview }, 'Preview the assessment') : null, onExit ? h('button', { type: 'button', class: 'btn-quiet', onclick: exit }, 'Sign out') : null)),
      h('div', { class: 'tv-tiles' }, tile('Finished', rows.length), tile('Class average', avg != null ? avg + '%' : '—'), tile('Highest', scores.length ? Math.max(...scores) + '%' : '—'), tile('Lowest', scores.length ? Math.min(...scores) + '%' : '—'), tile('Below 70%', scores.filter((v) => v < 70).length)),
      h('div', { class: 'card' }, h('div', { class: 'row' }, select('Period', periods, period, (v) => { period = v; }), select('Class code', codes, klass, (v) => { klass = v; })), h('div', { class: 'tv-scroll' }, table),
        h('p', { class: 'small' }, 'Only finished students appear here. Reset moves a student’s row to the Archive tab so they can start again.')),
      analysis));
  }

  async function reset(s) {
    if (!confirm(`Reset ${s.first} ${s.last} (period ${s.period})? Their row moves to the Archive tab and they can start again.`)) return;
    try {
      const r = await call('reset', { student: { first: s.first, last: s.last, period: s.period, code: s.code } });
      say(r.ok ? 'Reset. They can start again.' : 'Could not reset: ' + (r.reason || 'not found'));
    } catch { say('Could not reach the Sheet.'); }
    load();
  }

  function csv() {
    const q = (v) => `"${safeCell(v).replace(/"/g, '""')}"`;
    const head = ['Last', 'First', 'Period', 'Class code', 'Percent', 'Points earned', 'Points possible'].concat(legacy ? [] : ['Active minutes', 'Skips', 'Help opens', 'Code check']);
    const lines = filtered().map((s) => [s.last, s.first, s.period, s.code, s.percent, s.earned, s.possible].concat(legacy ? [] : [mins(s.activeSec), s.skips, s.helpOpens, s.verified]).map(q).join(','));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([[head.map(q).join(','), ...lines].join('\n')], { type: 'text/csv' })); a.download = 'trail-gradebook.csv'; a.click();
  }

  login();
  return { stop };
}
