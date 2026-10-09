// Simulation B: House Edge Investigation.  The class High/Low dice game with pretend tokens.
// The student's own lab uses a fixed random sequence (so the server can re-compute the graded balance);
// the 1,000-player view uses a separate generator and is labelled as a simulation.
import { h, md, clear, fmt, announce } from '../util.js';
import { lineChart, barChart } from '../charts.js';
import { stat, setStat, tabs, dieFace, setDie, note } from './kit.js';

const START = 100, BASE_BET = 2, BASE_WIN = 1.8;
const st = { plan: [], side: 'high', bet: 2 };          // survives closing and reopening the lab drawer

export function mount(container, ctx) {
  const U5 = window.U5, seed = ctx.labs.house, rollSeed = seed ^ 0x2545F491;
  if (!st.plan.length && (ctx.progress.house || 0) >= 200) st.plan = Array.from({ length: 200 }, () => ({ side: 'high', bet: BASE_BET }));
  const winOf = (bet) => Math.round(bet * (BASE_WIN / BASE_BET) * 100) / 100;           // 0.9 x bet: same 5% edge at any bet size
  const roll = (i) => U5.dieRoll(rollSeed, i);

  function series() {
    const bal = [START], exp = [START]; let b = START, e = START, wins = 0;
    st.plan.forEach((p, i) => { const high = roll(i) >= 4, won = p.side === 'high' ? high : !high; if (won) { b += winOf(p.bet); wins++; } else b -= p.bet; e -= 0.05 * p.bet; bal.push(Math.round(b * 100) / 100); exp.push(Math.round(e * 100) / 100); });
    return { bal, exp, wins, losses: st.plan.length - wins };
  }

  const face = dieFace(1), live = h('div', { class: 'sr-only', 'aria-live': 'polite' });
  const S = { bal: stat('Token balance', '100', 'start: 100', true), n: stat('Rounds played', '0'), w: stat('Wins / losses', '0 / 0'), net: stat('Net result', '0'), exp: stat('Expected net so far', '0', 'average, not a promise'), ev: stat('Expected result per round', '', 'for your bet size') };
  const chartHost = h('div'), lastHost = h('p', { class: 'muted' }, 'No rounds yet.');
  const sideSel = h('select', { class: 'input', style: 'max-width:200px', 'aria-label': 'Which side to bet' }, h('option', { value: 'high' }, 'High (4, 5 or 6)'), h('option', { value: 'low' }, 'Low (1, 2 or 3)'));
  const betSel = h('select', { class: 'input', style: 'max-width:150px', 'aria-label': 'Bet size in tokens' }, [1, 2, 5, 10].map((b) => h('option', { value: b }, b + ' token' + (b > 1 ? 's' : ''))));
  sideSel.value = st.side; betSel.value = st.bet;
  sideSel.addEventListener('change', () => { st.side = sideSel.value; }); betSel.addEventListener('change', () => { st.bet = +betSel.value; refresh(); });

  function refresh(rolled) {
    const s = series(), N = st.plan.length, b = s.bal[N], net = Math.round((b - START) * 100) / 100, en = Math.round((s.exp[N] - START) * 100) / 100;
    setStat(S.bal, fmt(b, 2)); setStat(S.n, String(N)); setStat(S.w, `${s.wins} / ${s.losses}`); setStat(S.net, (net > 0 ? '+' : '') + fmt(net, 2), net >= 0 ? 'ahead of start' : 'behind start'); setStat(S.exp, (en > 0 ? '+' : '') + fmt(en, 2));
    const ev = 0.5 * winOf(st.bet) - 0.5 * st.bet; setStat(S.ev, (ev > 0 ? '+' : '') + fmt(ev, 3), `edge ${fmt((-ev / st.bet) * 100, 1)}% of the bet`);
    if (rolled != null) { setDie(face, rolled); }
    clear(chartHost);
    if (N === 0) chartHost.append(h('p', { class: 'muted' }, 'Play some rounds to draw the chart.'));
    else chartHost.append(lineChart([{ name: 'Your balance', color: 'var(--accent)', points: s.bal.map((v, i) => [i, v]) }, { name: 'Expected balance (average)', color: 'var(--accent2)', dash: '6 5', points: s.exp.map((v, i) => [i, v]) }], { xmax: Math.max(N, 10), ymin: Math.min(60, ...s.bal) - 2, ymax: Math.max(110, ...s.bal) + 2, refY: START, refLabel: 'start (100)', xlabel: 'rounds', title: 'Your balance versus the expected balance', alt: `Balance after ${N} rounds is ${fmt(b, 2)} tokens; expected about ${fmt(s.exp[N], 2)}.`, noAnim: true }));
    live.textContent = `${N} rounds played. Balance ${fmt(b, 2)} tokens.`;
    ctx.report('house', N);
  }
  function play(k) {
    let last = null;
    for (let j = 0; j < k && st.plan.length < 2000; j++) { st.plan.push({ side: st.side, bet: st.bet }); last = roll(st.plan.length - 1); }
    const d = st.plan.length ? roll(st.plan.length - 1) : null;
    if (d != null) lastHost.textContent = `Last roll: ${d} → ${(st.plan[st.plan.length - 1].side === 'high') === (d >= 4) ? 'you won ' + fmt(winOf(st.plan[st.plan.length - 1].bet), 2) : 'you lost ' + st.plan[st.plan.length - 1].bet} tokens.`;
    refresh(d);
  }
  function classRun() { st.plan = Array.from({ length: 200 }, () => ({ side: 'high', bet: BASE_BET })); st.side = 'high'; st.bet = 2; sideSel.value = 'high'; betSel.value = '2'; lastHost.textContent = 'Class experiment complete: High, 2 tokens, 200 rounds.'; refresh(roll(199)); announce('Class experiment complete.'); }
  const rules = h('div', { class: 'panel' }, h('h3', null, 'The rules (pretend tokens)'), h('ul', { class: 'b-ul' },
    h('li', null, md('Bet tokens on **High** (die shows 4–6) or **Low** (1–3). The die is fair, so the chance of winning is **1/2**.')),
    h('li', null, md('A win pays **+1.8 tokens of profit on a 2-token bet** (+0.9 per token bet). A fair game would pay +2. A loss costs the bet.')),
    h('li', null, md('Start with **100 tokens**. Tokens have no value and this is not a game to play for money.'))));
  function labPane(pane) {
    pane.append(h('div', { class: 'sim-grid2' },
      h('div', null, rules, h('div', { class: 'panel', style: 'margin-top:1rem' }, h('div', { class: 'row' }, face, h('div', null, lastHost)),
        h('div', { class: 'controls', style: 'margin-top:.7rem' }, sideSel, betSel), h('div', { class: 'controls', style: 'margin-top:.5rem' }, h('button', { class: 'btn', type: 'button', onclick: () => play(1) }, 'Play 1'), h('button', { class: 'btn', type: 'button', onclick: () => play(10) }, 'Play 10'), h('button', { class: 'btn', type: 'button', onclick: () => play(50) }, 'Play 50'), h('button', { class: 'btn', type: 'button', onclick: () => { st.plan = []; refresh(); lastHost.textContent = 'Lab reset.'; } }, 'Reset')),
        h('div', { class: 'controls', style: 'margin-top:.7rem' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: classRun }, 'Run the class experiment (High · 2 tokens · 200 rounds)')))),
      h('div', null, h('div', { class: 'stat-grid' }, S.bal, S.n, S.w, S.net, S.exp, S.ev), h('div', { class: 'panel', style: 'margin-top:1rem' }, chartHost))), live);
    refresh();
  }
  function crowdPane(pane) {
    const out = h('div'), pay = h('select', { class: 'input', style: 'max-width:260px', 'aria-label': 'Payout when you win a 2-token bet' }, h('option', { value: '1.8' }, 'Class game: win pays +1.8'), h('option', { value: '2' }, 'Fair game: win pays +2.0'), h('option', { value: '1.6' }, 'Bigger edge: win pays +1.6'));
    function run() {
      const r = U5.rng('crowd|' + pay.value), w = +pay.value, N = 1000, R = 200, fin = [];
      for (let p = 0; p < N; p++) { let b = START; for (let i = 0; i < R; i++) b += r.next() < 0.5 ? w : -BASE_BET; fin.push(b); }
      const mean = fin.reduce((a, x) => a + x, 0) / N, ahead = fin.filter((x) => x > START).length, kept = N * START - fin.reduce((a, x) => a + x, 0);
      const lo = Math.floor(Math.min(...fin) / 10) * 10, hi = Math.ceil(Math.max(...fin) / 10) * 10, bins = []; for (let x = lo; x < hi; x += 10) bins.push({ label: String(x), value: fin.filter((v) => v >= x && v < x + 10).length, color: x + 10 <= START ? 'var(--accent2)' : 'var(--accent)' });
      clear(out);
      out.append(h('div', { class: 'stat-grid' }, stat('Average final balance', fmt(mean, 1), 'start: 100', true), stat('Players ahead', `${ahead} of ${N}`, fmt((100 * ahead) / N, 1) + '%'), stat('Players behind', `${N - ahead - fin.filter((x) => x === START).length} of ${N}`), stat('Tokens the house kept', Math.round(kept).toLocaleString('en-US'), 'from all players')),
        h('div', { class: 'panel', style: 'margin-top:1rem' }, barChart(bins.length > 22 ? bins.filter((_, i) => i % 2 === 0) : bins, { title: '1,000 simulated players: final balance after 200 rounds (groups of 10 tokens)', alt: `Histogram of 1000 final balances. Average ${fmt(mean, 1)}; ${ahead} players finished ahead.` })),
        note('**This is a computer simulation with its own random numbers, not your lab.** Some players finish ahead, but the group as a whole falls toward the expected result, and a fair game (+2.0) has no house edge.'));
      announce(`Simulated 1000 players. Average final balance ${fmt(mean, 1)}.`);
    }
    pay.addEventListener('change', run);
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'What happens across 1,000 players?'), h('div', { class: 'controls' }, pay, h('button', { class: 'btn btn-primary', type: 'button', onclick: run }, 'Simulate 1,000 players × 200 rounds'))), out);
    run();
  }
  const t = tabs([{ id: 'lab', label: 'Your lab', build: labPane }, { id: 'crowd', label: '1,000 players', build: crowdPane }]);
  container.append(h('div', { class: 'sim' }, t.bar, t.body)); t.show(0);
  return { destroy() {} };
}
