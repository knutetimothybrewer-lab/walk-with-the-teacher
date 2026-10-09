// Simulation A: Probability Laboratory.  A coin and a die run on the student's OWN assigned random sequence
// (a fixed pseudo-random stream), so the server can re-compute every number graded from it.
import { h, md, clear, fmt, announce } from '../util.js';
import { barChart, lineChart } from '../charts.js';
import { stat, setStat, tabs, dieFace, setDie, note } from './kit.js';

const MAXN = 5000;
const state = { n: null, d: 0, k: 3, side: 'H' };    // survives closing and reopening the lab drawer

export function mount(container, ctx) {
  const seed = ctx.labs.coin;
  const U5 = window.U5;
  if (state.n == null) state.n = Math.min(1000, ctx.progress.coin || 0);
  // prefix sums over the stream (cheap: 5,000 numbers)
  const bits = new Uint8Array(MAXN), pref = new Int32Array(MAXN + 1);
  for (let i = 0; i < MAXN; i++) { bits[i] = U5.coinHeads(seed, i) ? 1 : 0; pref[i + 1] = pref[i] + bits[i]; }
  const heads = (n) => pref[n];
  function longest(n) { let best = 0, cur = 0, end = -1; for (let i = 0; i < n; i++) { cur = i && bits[i] === bits[i - 1] ? cur + 1 : 1; if (cur > best) { best = cur; end = i; } } return { best, end }; }

  const coin = h('div', { class: 'coin3d', 'aria-hidden': 'true' }, '?');
  const chips = h('div', { class: 'chips', 'aria-label': 'Most recent flips' });
  const live = h('div', { class: 'sr-only', 'aria-live': 'polite' });
  const S = { n: stat('Flips', '0'), h: stat('Heads', '0'), t: stat('Tails', '0'), p: stat('Experimental P(heads)', '0%', 'heads ÷ flips', true), th: stat('Theoretical P(heads)', '50%', 'fair coin'), d: stat('Difference', '0', 'percentage points'), g: stat('Heads − tails gap', '0', 'count difference'), l: stat('Longest streak', '0', 'same side in a row') };
  const lineHost = h('div'), histHost = h('div'), barHost = h('div');

  function setN(n, animate) {
    state.n = Math.max(0, Math.min(MAXN, n));
    const N = state.n, H = heads(N);
    setStat(S.n, N.toLocaleString('en-US')); setStat(S.h, String(H)); setStat(S.t, String(N - H));
    const pct = N ? (100 * H) / N : 0;
    setStat(S.p, N ? fmt(pct, 1) + '%' : '—'); setStat(S.d, N ? fmt(Math.abs(pct - 50), 1) : '—'); setStat(S.g, String(Math.abs(H - (N - H))), H === N - H ? 'even' : H > N - H ? 'more heads' : 'more tails');
    const L = longest(N); setStat(S.l, String(L.best));
    clear(chips); for (let i = Math.max(0, N - 40); i < N; i++) { const inStreak = L.best > 1 && i > L.end - L.best && i <= L.end; chips.append(h('span', { class: (bits[i] ? 'chip-h' : 'chip-t') + (inStreak ? ' streak' : ''), 'aria-hidden': 'true' }, bits[i] ? 'H' : 'T')); }
    coin.textContent = N ? (bits[N - 1] ? 'H' : 'T') : '?';
    if (animate && !ctx.reduced) { coin.classList.remove('flip'); void coin.offsetWidth; coin.classList.add('flip'); }
    drawLine(N); drawHist(N); drawBars(N);
    live.textContent = `${N} flips: ${H} heads, ${N - H} tails, ${fmt(pct, 1)} percent heads.`;
    ctx.report('coin', N);
  }
  function drawLine(N) {
    clear(lineHost);
    if (N < 2) { lineHost.append(h('p', { class: 'muted' }, 'Flip the coin to start the chart.')); return; }
    const step = Math.max(1, Math.floor(N / 160)), pts = [];
    for (let i = 1; i <= N; i += i < 40 ? 1 : step) pts.push([i, (100 * heads(i)) / i]); pts.push([N, (100 * heads(N)) / N]);
    lineHost.append(lineChart([{ name: 'Experimental percent heads', color: 'var(--accent)', points: pts }], { xmax: N, ymin: 0, ymax: 100, yunit: '%', xlabel: 'number of flips', refY: 50, refLabel: 'theoretical 50%', title: 'Percent heads as flips increase', alt: `Line chart: percent heads after ${N} flips is ${fmt((100 * heads(N)) / N, 1)} percent.`, noAnim: true }));
  }
  function drawHist(N) {
    clear(histHost);
    const blocks = Math.floor(N / 10);
    if (blocks < 1) { histHost.append(h('p', { class: 'muted' }, 'Flip at least 10 times to see the frequency distribution of heads per group of 10 flips.')); return; }
    const counts = Array(11).fill(0); for (let b = 0; b < blocks; b++) counts[heads(b * 10 + 10) - heads(b * 10)]++;
    const bino = [1, 10, 45, 120, 210, 252, 210, 120, 45, 10, 1];
    const bars = counts.map((c, k) => ({ label: String(k), value: c, color: 'var(--accent)' }));
    const expected = bino.map((b) => (b / 1024) * blocks);
    const chart = barChart(bars, { title: `Heads in each group of 10 flips (${blocks} groups)`, alt: 'Frequency distribution of heads per group of ten flips', max: Math.max(...counts, ...expected, 1) * 1.15 });
    const ex = h('p', { class: 'muted small' }, 'Expected counts if the coin is fair: ' + expected.map((e, k) => `${k}: ${fmt(e, 1)}`).join(' · '));
    histHost.append(chart, ex);
  }
  function drawBars(N) { clear(barHost); const H = heads(N); barHost.append(barChart([{ label: 'Heads', value: H, color: 'var(--accent)' }, { label: 'Tails', value: N - H, color: 'var(--accent2)' }], { title: 'Heads and tails so far', alt: `${H} heads and ${N - H} tails` })); }

  const add = (k) => h('button', { class: 'btn', type: 'button', onclick: () => { setN(state.n + k, k === 1); } }, '+' + k.toLocaleString('en-US'));
  const controls = h('div', { class: 'controls' }, h('button', { class: 'btn', type: 'button', onclick: () => setN(0) }, 'Reset to 0'), add(1), add(10), add(20), add(100), add(1000));

  // ---- die tab
  function dieTab(pane) {
    const dseed = seed;
    let d = state.d; const face = dieFace(1); const hist = h('div'), stats = h('p', { class: 'muted' });
    const cnt = (n) => U5.dieCounts(dseed, n);
    function setD(n) {
      state.d = Math.max(0, Math.min(MAXN, n)); d = state.d;
      if (d) setDie(face, U5.dieRoll(dseed, d - 1));
      const c = cnt(d); clear(hist);
      hist.append(barChart(c.map((v, i) => ({ label: String(i + 1), value: v, color: i % 2 ? 'var(--accent2)' : 'var(--accent)' })), { title: `Die faces after ${d} rolls`, alt: 'Frequency of each die face', ref: d ? { value: d / 6, label: 'expected ' + fmt(d / 6, 1) } : null, max: Math.max(...c, d / 6, 1) * 1.2 }));
      stats.textContent = d ? `${d} rolls. Each face has theoretical probability 1/6 ≈ 16.7%. Your most common face appeared ${fmt((100 * Math.max(...c)) / d, 1)}% of the time; your least common ${fmt((100 * Math.min(...c)) / d, 1)}%.` : 'Roll the die to begin.';
    }
    const btn = (k) => h('button', { class: 'btn', type: 'button', onclick: () => setD(state.d + k) }, '+' + k);
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'A fair six-sided die'), h('div', { class: 'row' }, face, h('div', { class: 'controls' }, h('button', { class: 'btn', type: 'button', onclick: () => setD(0) }, 'Reset'), btn(1), btn(6), btn(60), btn(600))), stats, hist));
    setD(state.d);
  }
  // ---- independence tab
  function streakTab(pane) {
    const out = h('div');
    function run() {
      const k = state.k, side = state.side === 'H' ? 1 : 0, N = state.n || 0; let occ = 0, nextSame = 0;
      for (let i = k; i < N; i++) { let all = true; for (let j = i - k; j < i; j++) if (bits[j] !== side) { all = false; break; } if (all) { occ++; if (bits[i] === side) nextSame++; } }
      clear(out);
      if (N < 100) { out.append(h('p', { class: 'muted' }, 'Flip at least 100 times on the Coin tab first (more is better).')); return; }
      out.append(h('table', { class: 'mini' }, h('thead', null, h('tr', null, h('th', null, 'What the lab found'), h('th', null, 'Count'))),
        h('tbody', null, h('tr', null, h('td', null, `Times ${k} ${side ? 'heads' : 'tails'} in a row appeared`), h('td', { class: 'num' }, String(occ))),
          h('tr', null, h('td', null, `...and the very next flip was ${side ? 'heads' : 'tails'} again`), h('td', { class: 'num' }, `${nextSame}${occ ? ` (${fmt((100 * nextSame) / occ, 0)}%)` : ''}`)),
          h('tr', null, h('td', null, `...and the next flip was the OTHER side`), h('td', { class: 'num' }, `${occ - nextSame}${occ ? ` (${fmt((100 * (occ - nextSame)) / occ, 0)}%)` : ''}`)))),
        note('After a streak, the other side is not "due." The next flip is still about 50/50. With few streaks the percent wobbles; try more flips or a shorter streak.'));
    }
    const kSel = h('select', { class: 'input', style: 'max-width:160px', 'aria-label': 'Streak length' }, [2, 3, 4, 5].map((k) => h('option', { value: k }, `${k} in a row`)));
    const sSel = h('select', { class: 'input', style: 'max-width:160px', 'aria-label': 'Streak side' }, h('option', { value: 'H' }, 'heads'), h('option', { value: 'T' }, 'tails'));
    kSel.value = state.k; sSel.value = state.side;
    kSel.addEventListener('change', () => { state.k = +kSel.value; run(); }); sSel.addEventListener('change', () => { state.side = sSel.value; run(); });
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'Does the past change the next flip?'), h('p', { class: 'muted' }, 'Look through the flips you have recorded for a streak, then see what came next.'), h('div', { class: 'controls' }, kSel, sSel, h('button', { class: 'btn', type: 'button', onclick: run }, 'Check my flips')), out));
    run();
  }

  const t = tabs([
    { id: 'coin', label: 'Coin lab', build: (pane) => pane.append(
      h('div', { class: 'sim-grid2' }, h('div', { class: 'panel' }, h('div', { class: 'row' }, coin, h('div', null, h('h3', { style: 'margin:0' }, 'Fair coin'), h('p', { class: 'muted small', style: 'margin:0' }, 'Your coin follows its own fixed random sequence.'))), controls, chips),
        h('div', { class: 'panel' }, h('div', { class: 'stat-grid' }, S.n, S.h, S.t, S.p))),
      h('div', { class: 'stat-grid', style: 'margin-top:1rem' }, S.th, S.d, S.g, S.l),
      h('div', { class: 'sim-grid2', style: 'margin-top:1rem' }, h('div', { class: 'panel' }, lineHost), h('div', { class: 'panel' }, histHost)), h('div', { class: 'panel', style: 'margin-top:1rem' }, barHost), live) },
    { id: 'die', label: 'Die lab', build: dieTab },
    { id: 'streak', label: 'Does the past matter?', build: streakTab }
  ], (i, d) => { if (i === 0) setN(state.n, false); if (i === 2) { /* rebuilt on demand */ } });
  container.append(h('div', { class: 'sim' }, t.bar, t.body));
  t.show(0); setN(state.n, false);
  return { destroy() {} };
}
