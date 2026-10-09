// Live class monitor: who has started, who is working, who is close to the deadline.
import { h, clear, fmt, announce, fmtClock } from '../util.js';
import { serverNow } from '../api.js';
import { tcall, fmtTime } from './tapi.js';

const STATUS_CLASS = { registered: 'st-wait', active: 'st-work', final: 'st-done' };

export async function build(host, ctx) {
  let block = 'all', q = '', sort = 'name', rows = [], timer = null, tick = null, paused = false, last = '';
  const blockSel = h('select', { class: 'input', 'aria-label': 'Class block' }, h('option', { value: 'all' }, 'All blocks'), ctx.blocks.map((b) => h('option', { value: b }, b)));
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Search name or ID', 'aria-label': 'Search students' });
  const sortSel = h('select', { class: 'input', 'aria-label': 'Sort by' }, [['name', 'Sort: name'], ['status', 'Sort: status'], ['remaining', 'Sort: least time left'], ['score', 'Sort: score (low first)']].map((x) => h('option', { value: x[0] }, x[1])));
  const pauseBtn = h('button', { class: 'btn btn-sm', type: 'button', 'aria-pressed': 'false', onclick: () => { paused = !paused; pauseBtn.setAttribute('aria-pressed', String(paused)); pauseBtn.textContent = paused ? 'Auto-refresh paused' : 'Auto-refresh on'; } }, 'Auto-refresh on');
  const refreshBtn = h('button', { class: 'btn btn-sm btn-primary', type: 'button', onclick: () => load(true) }, 'Refresh now');
  const stamp = h('span', { class: 'small muted', 'aria-live': 'off' });
  const summary = h('div', { class: 'stat-grid' }), blocks = h('div'), table = h('div'), alerts = h('div');
  host.append(h('h2', null, 'Class overview'),
    h('div', { class: 'controls t-controls' }, h('label', { class: 'pv-f' }, h('span', null, 'Block'), blockSel), h('label', { class: 'pv-f grow' }, h('span', null, 'Find'), search), h('label', { class: 'pv-f' }, h('span', null, 'Order'), sortSel), refreshBtn, pauseBtn, stamp),
    alerts, summary, h('h3', null, 'Blocks at a glance'), blocks, h('h3', null, 'Students'), table,
    h('p', { class: 'muted small' }, 'Times are kept by the server. A student whose clock reaches 0:00 is submitted automatically, even if their device is off. The table updates about every 30 seconds.'));
  blockSel.addEventListener('change', () => { block = blockSel.value; load(true); });
  search.addEventListener('input', () => { q = search.value; draw(); });
  sortSel.addEventListener('change', () => { sort = sortSel.value; draw(); });

  const statCard = (k, v, s, hot) => h('div', { class: 'stat' + (hot ? ' hot' : '') }, h('div', { class: 'k' }, k), h('div', { class: 'v' }, String(v)), s ? h('div', { class: 's' }, s) : null);
  function remainingSec(r) { return r.status === 'active' ? Math.max(0, (Date.parse(r.deadline) - serverNow()) / 1000) : null; }

  async function load(manual) {
    const r = await tcall('teacherOverview', { block });
    if (!r.ok) { clear(alerts); alerts.append(h('div', { class: 'notice bad', role: 'alert' }, r.message || 'Could not load the overview.')); return; }
    rows = r.rows; clear(alerts); last = new Date().toLocaleTimeString(); stamp.textContent = 'Updated ' + last;
    const s = r.summary;
    clear(summary); summary.append(statCard('Registered', s.registered), statCard('Not started', s.notStarted), statCard('In progress', s.inProgress, '', s.inProgress > 0), statCard('Submitted', s.submitted), statCard('Auto-submitted', s.autoSubmitted, 'time expired'), statCard('Class average', s.avgPct == null ? '—' : fmt(s.avgPct, 1) + '%', s.submitted ? `median ${fmt(s.medianPct, 1)}%` : 'no one has finished yet'));
    drawBlocks(r); draw();
    if (manual) announce('Overview updated.');
  }
  function drawBlocks(r) {
    clear(blocks);
    const byBlock = {}; ctx.blocks.forEach((b) => { byBlock[b] = { reg: 0, wait: 0, work: 0, done: 0, auto: 0 }; });
    rows.forEach((x) => { const o = byBlock[x.block]; if (!o) return; o.reg++; if (x.status === 'registered') o.wait++; else if (x.status === 'active') o.work++; else { o.done++; if (x.submissionType && /expired/i.test(x.submissionType)) o.auto++; } });
    ctx.blocks.filter((b) => block === 'all' || b === block).forEach((b) => {
      const o = byBlock[b], tot = Math.max(1, o.reg), seg = (n, c, l) => n ? h('span', { class: 'seg ' + c, style: `width:${(100 * n) / tot}%`, title: `${l}: ${n}` }, n) : null;
      blocks.append(h('div', { class: 'blockrow' }, h('div', { class: 'bname' }, b), h('div', { class: 'segbar', role: 'img', 'aria-label': `${b}: ${o.wait} not started, ${o.work} in progress, ${o.done} submitted` }, o.reg ? [seg(o.done - o.auto, 'seg-done', 'Submitted'), seg(o.auto, 'seg-auto', 'Auto-submitted'), seg(o.work, 'seg-work', 'In progress'), seg(o.wait, 'seg-wait', 'Not started')] : h('span', { class: 'muted small', style: 'padding-left:.5rem' }, 'No students yet')), h('div', { class: 'small muted' }, `${o.reg} registered`)));
    });
    blocks.append(h('div', { class: 'legend' }, [['seg-done', 'Submitted'], ['seg-auto', 'Auto-submitted'], ['seg-work', 'In progress'], ['seg-wait', 'Not started']].map((x) => h('span', null, h('i', { class: 'swatch ' + x[0] }), x[1]))));
  }
  function view() {
    const nq = q.trim().toLowerCase();
    let v = rows.filter((r) => !nq || (r.first + ' ' + r.last + ' ' + r.studentId).toLowerCase().includes(nq));
    const key = { name: (a, b) => a.last.localeCompare(b.last) || a.first.localeCompare(b.first), status: (a, b) => ({ active: 0, registered: 1, final: 2 }[a.status] - { active: 0, registered: 1, final: 2 }[b.status]) || a.last.localeCompare(b.last), remaining: (a, b) => (remainingSec(a) ?? 1e9) - (remainingSec(b) ?? 1e9), score: (a, b) => (a.status === 'registered' ? 1e9 : a.pct) - (b.status === 'registered' ? 1e9 : b.pct) }[sort];
    return v.sort(key);
  }
  function draw() {
    clear(table); const v = view();
    clear(alerts);
    const near = rows.filter((r) => r.status === 'active' && remainingSec(r) <= 15 * 60);
    if (near.length) alerts.append(h('div', { class: 'notice warn', role: 'status' }, h('strong', null, `${near.length} student${near.length === 1 ? ' is' : 's are'} within 15 minutes of the deadline: `), near.slice(0, 8).map((r) => `${r.first} ${r.last} (${fmtClock(remainingSec(r))})`).join(', ') + (near.length > 8 ? ', …' : '')));
    if (!v.length) { table.append(h('p', { class: 'muted' }, rows.length ? 'No one matches your search.' : 'No students have signed in for this selection yet.')); return; }
    table.append(h('div', { class: 't-scroll' }, h('table', { class: 't-table' },
      h('thead', null, h('tr', null, ['Student', 'Block', 'Status', 'Progress', 'Time left', 'Score', 'Last seen', ''].map((x) => h('th', { scope: 'col' }, x)))),
      h('tbody', null, v.map((r) => {
        const rem = remainingSec(r);
        return h('tr', { class: r.status === 'active' && rem <= 900 ? 'near' : '' },
          h('th', { scope: 'row' }, `${r.last}, ${r.first}`, h('div', { class: 'small muted' }, 'ID ' + r.studentId, r.resetCount ? ` · reset ${r.resetCount}×` : '', r.concurrent ? ' · signed in on more than one device' : '')),
          h('td', null, r.block), h('td', null, h('span', { class: 'badge ' + (STATUS_CLASS[r.status] || '') }, r.statusLabel)),
          h('td', null, h('div', { class: 'miniprog', role: 'img', 'aria-label': `${r.itemsDone} of ${r.itemsTotal} questions finished` }, h('span', { style: `width:${r.itemsTotal ? (100 * r.itemsDone) / r.itemsTotal : 0}%` })), h('span', { class: 'small' }, `${r.itemsDone}/${r.itemsTotal}`)),
          h('td', { class: 'num rem', 'data-dl': r.status === 'active' ? r.deadline : null }, r.status === 'active' ? fmtClock(rem) : r.status === 'final' ? fmt(r.timeUsedMin, 1) + ' min used' : '—'),
          h('td', { class: 'num' }, r.status === 'registered' ? '—' : `${fmt(r.earned, 1)} / ${r.possible} (${fmt(r.pct, 1)}%)`),
          h('td', { class: 'small' }, fmtTime(r.lastSeen).slice(11)),
          h('td', null, h('button', { class: 'btn btn-sm', type: 'button', onclick: () => ctx.goto('students', { id: r.studentId }) }, 'Details')));
      })))));
  }
  tick = setInterval(() => {      // only the countdown cells change each second, so keyboard focus and screen readers are not disturbed
    host.querySelectorAll('td.rem[data-dl]').forEach((td) => { const sec = Math.max(0, (Date.parse(td.dataset.dl) - serverNow()) / 1000); td.textContent = fmtClock(sec); td.parentNode.classList.toggle('near', sec <= 900); });
  }, 1000);
  timer = setInterval(() => { if (!paused && document.visibilityState === 'visible') load(false); }, 30000);
  await load(false);
  return { destroy() { clearInterval(timer); clearInterval(tick); } };
}
