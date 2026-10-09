/* teacherview.js — Teacher Mode inside the app: who is signed in, who is working, every finished student with their score,
   class averages and what to reteach, with no trip to the Google Sheet. Opened by typing the teacher code in the Class code
   box; the data is protected by the passcode stored in the Apps Script project (Wildcat Trail menu).
   Works with the older Code.gs too (it falls back to the basic finished-student list until Code.gs is updated). */
import { h, clear } from './dom.js';

const num = (v, d = 1) => (v === '' || v == null || Number.isNaN(Number(v)) ? null : Math.round(Number(v) * 10 ** d) / 10 ** d);
const pct = (v) => (num(v) == null ? '—' : num(v) + '%');
const mins = (sec) => (num(sec, 0) == null ? '—' : Math.max(1, Math.round(Number(sec) / 60)));
const safeCell = (v) => { const t = String(v ?? ''); return /^[=+\-@]/.test(t) ? "'" + t : t; };
const TABS = [['overview', 'Overview'], ['students', 'Students and resets'], ['analytics', 'Analytics'], ['export', 'Export']];

export function mountTeacher({ root, cfg, onPreview, onExit }) {
  let pass = '', data = null, legacy = false, gone = false, timer = null, tab = 'overview', block = 'ALL', find = '', order = 'name', auto = true, pulled = null;
  const say = (m) => { const live = document.getElementById('live') || document.getElementById('announcer'); if (live) live.textContent = m; };
  const stop = () => { gone = true; clearInterval(timer); };
  const exit = () => { stop(); pass = ''; if (onExit) onExit(); };
  const show = (node) => { clear(root); root.append(node); window.scrollTo(0, 0); };
  const limit = cfg.timeLimitMinutes || 0;

  async function call(op, extra = {}) {
    const r = await fetch(cfg.backend.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'teacher', op, passcode: pass, ...extra }) });
    return r.json();
  }

  function login(msg) {
    clearInterval(timer);
    const inp = h('input', { id: 'tv-pass', type: 'password', autocomplete: 'off', 'aria-label': 'Teacher passcode' });
    const form = h('form', { class: 'card', novalidate: true },
      h('h1', {}, 'Teacher Mode'),
      cfg.backend && cfg.backend.url
        ? h('p', { class: 'small' }, 'Enter your teacher passcode (the one you set from the Sheet’s Wildcat Trail menu). You will see who is working, every finished student and what to reteach.')
        : h('p', { class: 'form-err' }, 'No backend URL is set in config.js yet, so there is no data to show.'),
      h('div', { class: 'field', style: 'max-width:340px' }, h('label', { for: 'tv-pass' }, 'Teacher passcode'), inp), h('p', { class: 'form-err', role: 'alert' }, msg || ''),
      h('div', { class: 'row' }, h('button', { type: 'submit', class: 'btn-primary' }, 'Open Teacher Mode'),
        onPreview ? h('button', { type: 'button', class: 'btn-quiet', onclick: onPreview }, 'Preview the assessment') : null,
        onExit ? h('button', { type: 'button', class: 'btn-quiet', onclick: exit }, 'Back') : null));
    form.addEventListener('submit', async (e) => { e.preventDefault(); pass = inp.value; await load(); });
    show(h('div', { class: 'tm' }, form)); inp.focus();
  }

  async function load(quiet) {
    if (gone) return;
    if (!cfg.backend || !cfg.backend.url) return login();
    if (!quiet) show(h('div', { class: 'tm' }, h('div', { class: 'card' }, 'Loading from your Google Sheet…')));
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
    data = r; data.sessions = data.sessions || []; pulled = new Date(); render(); say('Teacher Mode updated.');
    schedule();
  }
  function schedule() { clearInterval(timer); if (auto) timer = setInterval(() => { if (!document.hidden && !gone) load(true); }, 30000); }

  // ---------------------------------------------------------------- helpers
  const fullName = (s) => `${s.first} ${s.last}`.trim();
  const blocks = () => { const set = new Set(cfg.periods || []); data.students.concat(data.sessions).forEach((s) => s.period && set.add(String(s.period))); return [...set]; };
  const inBlock = (s) => block === 'ALL' || String(s.period) === block;
  const matches = (s) => !find || fullName(s).toLowerCase().includes(find.toLowerCase());
  const sorters = {
    name: (a, b) => String(a.last).localeCompare(String(b.last)) || String(a.first).localeCompare(String(b.first)),
    high: (a, b) => (num(b.percent) ?? -1) - (num(a.percent) ?? -1), low: (a, b) => (num(a.percent) ?? 999) - (num(b.percent) ?? 999),
    newest: (a, b) => new Date(b.when || b.started) - new Date(a.when || a.started),
  };
  const finished = () => data.students.filter(inBlock);
  const working = () => data.sessions.filter(inBlock);
  const average = (rows) => { const v = rows.map((s) => num(s.percent)).filter((x) => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length * 10) / 10 : null; };
  const minutesIn = (s) => { const t = new Date(s.started).getTime(); return Number.isNaN(t) ? null : Math.max(0, Math.round((Date.now() - t) / 60000)); };
  const tile = (label, val, note) => h('div', { class: 'tm-tile' }, h('div', { class: 'tm-label' }, label), h('div', { class: 'tm-big' }, String(val)), note ? h('div', { class: 'tm-note' }, note) : null);
  const tableOf = (heads, bodyRows, empty) => h('div', { class: 'tm-scroll' }, h('table', { class: 'tm-table' },
    h('thead', {}, h('tr', {}, heads.map((x) => h('th', { scope: 'col' }, x)))),
    h('tbody', {}, bodyRows.length ? bodyRows.map((cells) => h('tr', {}, cells.map((c) => h('td', {}, c)))) : [h('tr', {}, h('td', { colspan: heads.length }, empty))])));

  // ---------------------------------------------------------------- screens
  function controls() {
    return h('div', { class: 'card tm-controls' },
      h('label', { class: 'tm-field' }, 'Block', h('select', { onchange: (e) => { block = e.target.value; render(); } }, h('option', { value: 'ALL', selected: block === 'ALL' }, 'All blocks'), blocks().map((b) => h('option', { value: b, selected: b === block }, b)))),
      h('label', { class: 'tm-field grow' }, 'Find', h('input', { id: 'tm-find', type: 'search', placeholder: 'Search name', value: find, oninput: (e) => { find = e.target.value; renderBody(); } })),
      h('label', { class: 'tm-field' }, 'Order', h('select', { onchange: (e) => { order = e.target.value; render(); } }, [['name', 'Sort: name'], ['high', 'Sort: score, high first'], ['low', 'Sort: score, low first'], ['newest', 'Sort: newest first']].map(([v, t]) => h('option', { value: v, selected: v === order }, t)))),
      h('button', { type: 'button', class: 'btn-primary small', onclick: () => load() }, 'Refresh now'),
      h('button', { type: 'button', class: 'btn-quiet small', 'aria-pressed': String(auto), onclick: () => { auto = !auto; schedule(); render(); } }, 'Auto-refresh ' + (auto ? 'on' : 'off')),
      h('span', { class: 'tm-updated' }, 'Updated ' + pulled.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })));
  }

  function overview() {
    const fin = finished(), wk = working(), avg = average(fin), shownFin = fin.filter(matches).sort(sorters[order]), shownWk = wk.filter(matches).sort(sorters.name);
    const glance = blocks().map((b) => {
      const f = data.students.filter((s) => String(s.period) === b).length, w = data.sessions.filter((s) => String(s.period) === b).length, all = f + w;
      return h('div', { class: 'tm-block' }, h('b', {}, b), h('div', { class: 'tm-track' }, all ? [h('i', { class: 'tm-done', style: `width:${f / all * 100}%` }), h('i', { class: 'tm-work', style: `width:${w / all * 100}%` })] : h('span', {}, 'No students yet')),
        h('span', { class: 'tm-count' }, all + ' registered' + (all ? ' · ' + f + ' submitted' : '')));
    });
    return h('div', {},
      h('h1', { class: 'tm-h1' }, 'Class overview'),
      h('div', { class: 'tm-tiles' }, tile('Registered', fin.length + wk.length), tile('In progress', wk.length), tile('Submitted', fin.length), tile('Class average', avg != null ? avg + '%' : '—', fin.length ? '' : 'no one has finished yet')),
      legacy ? h('div', { class: 'note calm' }, h('strong', {}, 'More is available. '), 'Who is working right now, time, skips and the reteach analysis appear after you paste the newest Code.gs into Apps Script and deploy a new version (Deploy > Manage deployments > pencil > New version).') : null,
      h('div', { class: 'card' }, h('h2', {}, 'Blocks at a glance'), h('div', { class: 'tm-glance' }, glance)),
      wk.length ? h('div', { class: 'card' }, h('h2', {}, 'Working right now'), tableOf(['Student', 'Block', 'Time in'], shownWk.map((s) => { const m = minutesIn(s); return [fullName(s), s.period, m == null ? '—' : m + ' min' + (limit ? ' of ' + limit : '') + (limit && m >= limit - 15 ? ' (near the limit)' : '')]; }), 'Nobody is working right now.')) : null,
      h('div', { class: 'card' }, h('h2', {}, 'Finished'), tableOf(['Student', 'Block', 'Score', 'Points'], shownFin.map((s) => [fullName(s), s.period, h('b', {}, pct(s.percent)), `${num(s.earned) ?? '—'}/${num(s.possible, 0) ?? '—'}`]), 'No finished students yet.')));
  }

  function students() {
    const rows = finished().filter(matches).sort(sorters[order]);
    const heads = ['Student', 'Block', 'Code', 'Score', 'Points'].concat(legacy ? [] : ['Minutes', 'Skips', 'Help opens']).concat(['']);
    return h('div', {}, h('h1', { class: 'tm-h1' }, 'Students and resets'),
      h('div', { class: 'card' }, h('p', { class: 'small' }, `${rows.length} finished. Reset moves a student’s row to the Archive tab so they can start again.`),
        tableOf(heads, rows.map((s) => [fullName(s), s.period, s.code, h('b', {}, pct(s.percent)), `${num(s.earned) ?? '—'}/${num(s.possible, 0) ?? '—'}`]
          .concat(legacy ? [] : [mins(s.activeSec), s.skips ?? '—', s.helpOpens ?? '—']).concat([h('button', { type: 'button', class: 'btn-quiet small', onclick: () => reset(s) }, 'Reset')])), 'No finished students yet.')));
  }

  function analytics() {
    if (legacy) return h('div', {}, h('h1', { class: 'tm-h1' }, 'Analytics'), h('div', { class: 'note calm' }, h('strong', {}, 'Almost there. '), 'The reteach analysis appears after you paste the newest Code.gs into Apps Script and deploy a new version (Deploy > Manage deployments > pencil > New version).'));
    const rate = (o) => Math.round((o.rate || 0) * 100) + '%';
    const rateRows = (list) => (list || []).map((t) => [t.name, t.n, t.miss, rate(t)]);
    const items = (data.items || []).map((it) => [it.id, it.station, it.label, it.n, Math.round(it.firstPct * 100) + '%', it.top ? it.top + ' (' + it.topCount + ')' : '', it.flag ? 'Review' : '']);
    return h('div', {}, h('h1', { class: 'tm-h1' }, 'Analytics'),
      h('div', { class: 'card' }, h('h2', {}, 'What to reteach'), h('div', { class: 'grid2' },
        h('div', {}, h('h3', {}, 'Lesson topics, most missed first'), tableOf(['Topic', 'Answers', 'Missed on try 1', 'Miss rate'], rateRows(data.topics), 'No data yet.')),
        h('div', {}, h('h3', {}, 'Stations, most missed first'), tableOf(['Station', 'Answers', 'Missed on try 1', 'Miss rate'], rateRows(data.stations), 'No data yet.')))),
      h('div', { class: 'card' }, h('h2', {}, 'Hardest questions'), h('p', { class: 'small' }, 'Lowest share correct on the first try. Items marked Review are below 40% and may be a bad question.'),
        tableOf(['Item', 'Station', 'Question (start)', 'Students', 'Right on try 1', 'Most common wrong answer', ''], items, 'No question data yet.')));
  }

  function exportTab() {
    return h('div', {}, h('h1', { class: 'tm-h1' }, 'Export'), h('div', { class: 'card' }, h('p', {}, 'Download every finished student in the chosen block as a spreadsheet file. The full gradebook is also in your Google Sheet.'),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn-primary', onclick: csv }, 'Download CSV'))));
  }

  const views = { overview, students, analytics, export: exportTab };
  function renderBody() { const host = document.getElementById('tm-body'); if (host) { clear(host); host.append(views[tab]()); } }
  function render() {
    const keep = document.activeElement && document.activeElement.id === 'tm-find';
    show(h('div', { class: 'tm' },
      h('div', { class: 'tm-bar' }, h('div', {}, h('b', {}, 'Teacher Mode'), ` · ${cfg.appTitle} · signed in`),
        h('div', { class: 'row' }, onPreview ? h('button', { type: 'button', class: 'btn-quiet small', onclick: onPreview }, 'Open student preview') : null, h('button', { type: 'button', class: 'btn-quiet small', onclick: exit }, 'Sign out'))),
      h('nav', { class: 'tm-tabs', 'aria-label': 'Teacher sections' }, TABS.map(([id, label]) => h('button', { type: 'button', class: 'tm-tab', 'aria-current': id === tab ? 'page' : null, onclick: () => { tab = id; render(); } }, label))),
      controls(), h('div', { id: 'tm-body' }, views[tab]())));
    if (keep) { const f = document.getElementById('tm-find'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }
  }

  async function reset(s) {
    if (!confirm(`Reset ${fullName(s)} (period ${s.period})? Their row moves to the Archive tab and they can start again.`)) return;
    try {
      const r = await call('reset', { student: { first: s.first, last: s.last, period: s.period, code: s.code } });
      say(r.ok ? 'Reset. They can start again.' : 'Could not reset: ' + (r.reason || 'not found'));
    } catch { say('Could not reach the Sheet.'); }
    load();
  }

  function csv() {
    const q = (v) => `"${safeCell(v).replace(/"/g, '""')}"`;
    const head = ['Last', 'First', 'Block', 'Class code', 'Percent', 'Points earned', 'Points possible'].concat(legacy ? [] : ['Active minutes', 'Skips', 'Help opens', 'Code check']);
    const lines = finished().sort(sorters.name).map((s) => [s.last, s.first, s.period, s.code, s.percent, s.earned, s.possible].concat(legacy ? [] : [mins(s.activeSec), s.skips, s.helpOpens, s.verified]).map(q).join(','));
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([[head.map(q).join(','), ...lines].join('\n')], { type: 'text/csv' })); a.download = 'trail-gradebook.csv'; a.click();
  }

  login();
  return { stop };
}
