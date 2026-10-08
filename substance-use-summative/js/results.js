// Final results dashboard. Shows scores by domain, never the answer key.
import { h, fmtDur } from './util.js';
import { DOMAINS, DOMAIN_NAME } from './scoring.js';

function ring(pct, label, sub) {
  const C = 2 * Math.PI * 54;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 120 120'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `${label}: ${Math.round(pct)} percent`);
  svg.innerHTML = `<circle class="track" cx="60" cy="60" r="54"/><circle class="val" cx="60" cy="60" r="54" style="stroke-dasharray:${C};stroke-dashoffset:${C}"/>`;
  setTimeout(() => svg.querySelector('.val').style.strokeDashoffset = C * (1 - pct / 100), 120);
  return h('div.ring.panel', svg, h('div.pct', Math.round(pct) + '%'), h('div', h('strong', label)), sub ? h('div.small.muted', sub) : '');
}
function countUp(el, to, dur = 1400, suffix = '', decimals = 0) {
  const reduced = document.documentElement.dataset.motion === 'reduced' || (matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.motion !== 'full');
  if (reduced) { el.textContent = to.toFixed(decimals) + suffix; return; }
  const t0 = performance.now();
  (function f(now) { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(decimals) + suffix; if (k < 1) requestAnimationFrame(f); })(t0);
}

export function renderResults(host, { session, totals, submit, onRetry, onDownload, previewNote }) {
  const s = session.state, t = totals;
  const big = h('div.bigscore', '0%');
  const pts = h('div.big-sub', { style: { fontSize: '1.2rem' } });
  const wall = (s.completedAt || Date.now()) - s.startedAt;
  const statusBox = h('div.panel', { 'aria-live': 'polite' });
  function paintStatus() {
    const st = submit;
    statusBox.replaceChildren();
    if (st.status === 'done') statusBox.append(h('h3', 'Your responses have been submitted.'), h('p', 'Your teacher can see your results. This attempt is now locked.'), h('p', 'Confirmation ID: ', h('span.confirm-id', st.confirm)));
    else if (st.status === 'sending') statusBox.append(h('h3', 'Submitting your responses…'), h('p.muted', 'Please keep this tab open.'));
    else if (st.status === 'nobackend') statusBox.append(h('h3', 'Your responses are saved on this device.'), h('p', 'This assessment is not connected to a results sheet. Show this screen to your teacher.'), h('p', 'Reference ID: ', h('span.confirm-id', st.confirm)));
    else statusBox.append(h('h3', 'Saved on this device. Waiting to send.'), h('p', 'We could not reach the results server. Your work is safe. Stay on this page, check your connection, and press Try again.'), h('button.btn.primary', { type: 'button', onclick: onRetry }, 'Try again'), h('p.small.muted', 'Reference ID: ' + st.confirm));
  }
  paintStatus();
  const rows = DOMAINS.filter(([k]) => t.byDomain[k].possible > 0).map(([k, name]) => {
    const d = t.byDomain[k], p = d.possible ? (d.earned / d.possible) * 100 : 0;
    const fill = h('div.bfill'); setTimeout(() => (fill.style.width = p + '%'), 200);
    return h('div.brow', { role: 'group', 'aria-label': `${name}: ${Math.round(p)} percent` }, h('span', name), h('div.btrack', fill), h('span.bpct', Math.round(p) + '%'));
  });
  const screen = h('section.screen', { 'aria-labelledby': 'rh' },
    h('div.kicker', 'Mission complete'), h('h1#rh', 'Summative complete'),
    h('div.row', { style: { marginBottom: '.4rem' } }, h('span', h('strong', s.student.name)), h('span.pill', `Period ${s.student.period}`), h('span.pill', s.student.code.toUpperCase()), s.demo ? h('span.pill.demo', 'DEMO') : '', previewNote ? h('span.pill.demo', 'PREVIEW') : ''),
    s.timedOut ? h('div.panel', { role: 'status' }, h('strong', 'Time limit reached.'), ` The ${Math.round((s.completedAt - s.startedAt) / 60000)}-minute limit ended, so your answers so far were submitted automatically. Anything left unanswered counts as 0.`) : '',
    h('div.grid2', { style: { alignItems: 'stretch' } },
      h('div.panel', big, pts, h('p.muted', { style: { marginTop: '.5rem' } }, `Completion time: ${fmtDur(s.activeMs)} active (${fmtDur(wall)} total)`),
        h('p.small.muted', `Version ${s.versionId}. First try: ${t.first} • second try: ${t.second} • third try: ${t.third} • not answered correctly: ${t.missed}`)),
      statusBox),
    h('h2', { style: { marginTop: '1.4rem' } }, 'Performance by area'),
    h('div.panel.bars', rows),
    h('div.rings', { style: { marginTop: '1rem' } }, ...DOMAINS.filter(([k]) => t.byDomain[k].possible > 0).slice(0, 7).map(([k, name]) => { const d = t.byDomain[k]; return ring(d.possible ? d.earned / d.possible * 100 : 0, name.replace('Opioids, Fentanyl & Emergency Response', 'Opioids & Emergency Response'), `${d.earned} of ${d.possible} points`); })),
    h('div.panel', { style: { marginTop: '1rem' } }, h('p', 'Your teacher will review your results with you. The answer key is not shown here.'), h('div.row', h('button.btn', { type: 'button', onclick: onDownload }, 'Download my receipt'))));
  host.replaceChildren(screen);
  countUp(big, t.pct, 1500, '%', 1);
  pts.textContent = `${t.earned} of ${t.possible} points`;
  return { paintStatus: (st) => { Object.assign(submit, st); paintStatus(); } };
}
