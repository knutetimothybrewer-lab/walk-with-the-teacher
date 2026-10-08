// Final results screen. Shows scores by domain; never the answer key.
import { h, fmtDur } from './util.js';
import { DOMAINS, masteryLabel } from './scoring.js';

function countUp(el, to, dur = 1400, suffix = '', decimals = 0) {
  const reduced = document.documentElement.dataset.motion === 'reduced' || (matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.motion !== 'full');
  if (reduced) { el.textContent = to.toFixed(decimals) + suffix; return; }
  const t0 = performance.now();
  (function f(now) { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (to * e).toFixed(decimals) + suffix; if (k < 1) requestAnimationFrame(f); })(t0);
}
const cls = (label) => (label.startsWith('Strong') ? 'strong' : label.startsWith('Dev') ? 'developing' : 'review');

export function renderResults(host, { session, totals, submit, onRetry, onDownload, previewNote, mode = 'full', scoring }) {
  const s = session.state, t = totals, st = s.student;
  const big = h('div.bigscore', mode === 'hidden' ? '✓' : '0%'), pts = h('div.big-sub', { style: { fontSize: '1.2rem' } });
  const wall = (s.completedAt || Date.now()) - s.startedAt;
  const statusBox = h('div.panel', { 'aria-live': 'polite' });
  function paintStatus() {
    const x = submit; statusBox.replaceChildren();
    if (x.status === 'done') statusBox.append(h('h3', 'Your assessment has been submitted.'), h('p', 'Your teacher can see your results. This attempt is now locked and cannot be changed.'), h('p', 'Confirmation ID: ', h('span.confirm-id', x.confirm)));
    else if (x.status === 'sending') statusBox.append(h('h3', 'Submitting your assessment…'), h('p.muted', 'Please keep this tab open.'));
    else if (x.status === 'nobackend') statusBox.append(h('h3', 'Your responses are saved on this device.'), h('p', 'This assessment is not connected to a results sheet. Show this screen to your teacher.'), h('p', 'Reference ID: ', h('span.confirm-id', x.confirm)));
    else statusBox.append(h('h3', 'Saved on this device. Waiting to send.'), h('p', 'We could not reach the results server. Your work is safe. Stay on this page, check your connection, and press Try again.'), h('button.btn.primary', { type: 'button', onclick: onRetry }, 'Try again'), h('p.small.muted', 'Reference ID: ' + x.confirm));
  }
  paintStatus();
  const rows = DOMAINS.filter(([k]) => t.byDomain[k].possible > 0).map(([k, name]) => {
    const d = t.byDomain[k], p = d.possible ? (d.earned / d.possible) * 100 : 0, lab = masteryLabel(p, scoring);
    const fill = h('div.bfill'); setTimeout(() => (fill.style.width = p + '%'), 200);
    return h('div.brow', { role: 'group', 'aria-label': `${name}: ${Math.round(p)} percent, ${lab}` }, h('span', name), h('div.btrack', fill), h('span.bpct', Math.round(p) + '%'), h('span.mastery.' + cls(lab), lab));
  });
  const screen = h('section.screen', { 'aria-labelledby': 'rh' },
    h('div.kicker', 'Mission complete'), h('h1.complete-banner#rh', 'UNIT 7 COMPLETE'),
    h('div.row', { style: { marginBottom: '.6rem' } }, h('strong', `${st.first} ${st.last}`), h('span.pill', st.block), previewNote ? h('span.pill.demo', 'PREVIEW') : ''),
    s.timedOut ? h('div.panel', { role: 'status' }, h('strong', 'Time limit reached.'), ` The ${Math.round((s.completedAt - s.startedAt) / 60000)}-minute limit ended, so your answers so far were submitted automatically. Anything left unanswered counts as 0.`) : '',
    h('div.grid2', { style: { alignItems: 'stretch' } },
      h('div.panel', big, mode === 'hidden' ? h('p.lead', 'Your score will be shared by your teacher.') : pts, h('p.muted', { style: { marginTop: '.5rem' } }, `Completion time: ${fmtDur(s.activeMs)} active (${fmtDur(wall)} total)`)),
      statusBox),
    mode === 'full' ? [h('h2', { style: { marginTop: '1.4rem' } }, 'Performance by area'), h('div.panel.bars.wide', rows),
      h('p.small.muted', { style: { marginTop: '.6rem' } }, `Strong Understanding is ${scoring.strongAt}% or higher; Developing is ${scoring.developingAt}% to ${scoring.strongAt - 1}%; Review Recommended is below ${scoring.developingAt}%.`)] : '',
    h('div.panel', { style: { marginTop: '1rem' } }, h('p', 'Your teacher will review results with the class. The answer key is not shown here.'), h('div.row', h('button.btn', { type: 'button', onclick: onDownload }, 'Download my receipt'))));
  host.replaceChildren(screen);
  if (mode !== 'hidden') countUp(big, t.pct, 1500, '%', 1);
  pts.textContent = mode === 'hidden' ? '' : `${t.earned} of ${t.possible} points`;
  return { paintStatus: (x) => { Object.assign(submit, x); paintStatus(); } };
}
