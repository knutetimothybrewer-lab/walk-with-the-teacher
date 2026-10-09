// Simulation C: Sports Analytics Desk.  FICTIONAL league, teams, players and sportsbook.  Probabilities come from a
// disclosed rating model; legs from different games are treated as independent and legs from one game are flagged.
import { h, md, clear, fmt, money, announce } from '../util.js';
import { barChart, lineChart } from '../charts.js';
import { stat, tabs, note } from './kit.js';

const PLAYERS = [
  { n: 'Rowan Kiel', t: 'HCW', pts: 25.1, sd: 6.2, reb: 5.2, tp: 38.5 }, { n: 'Tobias Marlowe', t: 'MTF', pts: 22.4, sd: 5.8, reb: 7.9, tp: 34.1 },
  { n: 'Santiago Reyes-Holt', t: 'IWB', pts: 19.7, sd: 5.5, reb: 9.4, tp: 29.8 }, { n: 'Anika Brandt', t: 'SMS', pts: 23.3, sd: 6.0, reb: 4.6, tp: 40.2 },
  { n: 'Devon Achterberg', t: 'RWR', pts: 18.2, sd: 5.1, reb: 6.1, tp: 36.4 }, { n: 'Priyanka Voss', t: 'CPK', pts: 21.0, sd: 5.9, reb: 5.5, tp: 35.0 },
  { n: 'Leif Hanrahan', t: 'LKL', pts: 17.5, sd: 4.9, reb: 8.2, tp: 31.7 }, { n: 'Jun Castellano', t: 'VLF', pts: 20.6, sd: 5.7, reb: 4.9, tp: 37.3 }
];
const normCdf = (z) => { const t = 1 / (1 + 0.2316419 * Math.abs(z)), d = 0.3989423 * Math.exp((-z * z) / 2); const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274)))); return z > 0 ? 1 - p : p; };
const st = { legs: [], stake: 100, acts: new Set() };

export function mount(container, ctx) {
  const D = window.U5D, U5 = window.U5, slate = D.SLATE;
  const rowan = PLAYERS[0], pOver = Math.round((1 - normCdf((24.5 - rowan.pts) / rowan.sd)) * 100) / 100;
  const PROP = { id: 'prop', game: 'G1', label: 'Rowan Kiel (Waves) over 24.5 points', p: pOver, odds: D.price(pOver), player: true };
  const mark = (k) => { st.acts.add(k); ctx.report('sports', st.acts.size); };
  const live = h('div', { class: 'sr-only', 'aria-live': 'polite' });

  // ---------- slate
  function slatePane(pane) {
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'Today’s slate (FICTIONAL)'),
      h('p', { class: 'muted small' }, 'Model chance of winning, the odds the fictional sportsbook offers, and what those odds imply. Expected value uses the model chance as the true chance.'),
      h('table', { class: 'mini' }, h('thead', null, h('tr', null, ['Game', 'Side', 'Model chance', 'Odds', 'Break-even rate', 'Expected result per $100'].map((x) => h('th', null, x)))),
        h('tbody', null, slate.flatMap((g) => [['home', g.home, g.pHome, g.oddsHome], ['away', g.away, g.pAway, g.oddsAway]].map((s, i) => h('tr', null, i === 0 ? h('td', { rowspan: 2 }, `${g.id}: ${D.teamName(g.home)} vs ${D.teamName(g.away)}`) : null, h('td', null, D.team(s[1]).nick + (s[0] === 'home' ? ' (home)' : '')), h('td', { class: 'num' }, fmt(s[2], 2)), h('td', { class: 'num' }, D.fmtAm(s[3])), h('td', { class: 'num' }, fmt(D.amImplied(s[3]) * 100, 1) + '%'), h('td', { class: 'num' }, money(100 * D.evPer1(s[2], s[3])))))))),
      h('p', { class: 'muted small' }, 'The two break-even rates in each game add up to more than 100%. The extra is the sportsbook’s built-in margin.')),
    h('div', { class: 'sim-grid2' },
      h('div', { class: 'panel' }, h('h3', null, 'Team ratings (FICTIONAL)'), h('table', { class: 'mini' }, h('thead', null, h('tr', null, h('th', null, 'Team'), h('th', null, 'Rating'))), h('tbody', null, D.TEAMS.slice().sort((a, b) => b.rating - a.rating).map((t) => h('tr', null, h('td', null, t.city + ' ' + t.nick), h('td', { class: 'num' }, String(t.rating)))))), note('Model: chance the home team wins = 1 ÷ (1 + 10^(−(home rating − away rating + 40) ÷ 400)). A 40-point home-court edge is built in.')),
      h('div', { class: 'panel' }, h('h3', null, 'Player stats (FICTIONAL)'), h('table', { class: 'mini' }, h('thead', null, h('tr', null, ['Player', 'Team', 'Pts', 'Reb', '3PT%'].map((x) => h('th', null, x)))), h('tbody', null, PLAYERS.map((p) => h('tr', null, h('td', null, p.n), h('td', null, D.team(p.t).nick), h('td', { class: 'num' }, fmt(p.pts, 1)), h('td', { class: 'num' }, fmt(p.reb, 1)), h('td', { class: 'num' }, fmt(p.tp, 1)))))),
        note(`Prop bet example: ${PROP.label} → model chance ${fmt(pOver, 2)}, odds ${D.fmtAm(PROP.odds)}.`))));
    mark('slate');
  }

  // ---------- parlay builder
  const slipHost = h('div'), chartHost = h('div'), warnHost = h('div');
  function legObj(g, side) { const home = side === 'home'; return { id: g.id + side, game: g.id, label: `${D.teamName(home ? g.home : g.away)} to win`, p: home ? g.pHome : g.pAway, odds: home ? g.oddsHome : g.oddsAway }; }
  function toggle(leg) {
    const i = st.legs.findIndex((l) => l.id === leg.id);
    if (i >= 0) st.legs.splice(i, 1);
    else {
      const sameGameSide = st.legs.findIndex((l) => l.game === leg.game && !l.player && !leg.player);
      if (sameGameSide >= 0) st.legs.splice(sameGameSide, 1);               // one side per game (the other side would cancel it out)
      if (st.legs.length >= 8) { announce('A slip holds at most 8 legs.'); return; }
      st.legs.push(leg);
    }
    drawSlip(); drawButtons();
  }
  const buttons = [];
  function drawButtons() { buttons.forEach((b) => { const on = st.legs.some((l) => l.id === b.leg.id); b.el.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
  function drawSlip() {
    clear(slipHost); clear(chartHost); clear(warnHost);
    const L = st.legs;
    if (!L.length) { slipHost.append(h('p', { class: 'muted' }, 'Pick sides from the slate to build a parlay. Every leg must win.')); return; }
    const par = D.parlay(L.map((l) => l.p), L.map((l) => l.odds)), S = st.stake;
    const dup = L.some((a, i) => L.some((b, j) => i < j && a.game === b.game));
    slipHost.append(h('div', { class: 'slip' }, h('ol', null, L.map((l) => h('li', null, `${l.label} (${fmt(l.p, 2)}, ${D.fmtAm(l.odds)}) `, h('button', { class: 'btn-link', type: 'button', onclick: () => toggle(l) }, 'remove')))),
      h('div', { class: 'stat-grid' }, stat('Chance ALL legs win', fmt(par.p * 100, 2) + '%', 'p₁ × p₂ × …', true), stat('Payout multiplier', fmt(par.dec, 2) + '×', 'offered (total returned)'), stat('Fair multiplier', fmt(par.fairDec, 2) + '×', '1 ÷ chance'), stat('Profit if it wins', money(S * (par.dec - 1)), `on a ${money(S)} stake`), stat('Expected result', money(S * par.ev), 'average per slip'), stat('Margin on this slip', fmt(-par.ev * 100, 1) + '%', 'expected loss per $ staked'))));
    if (dup) warnHost.append(h('div', { class: 'warn-note' }, '⚠ Two legs come from the same game. Those results are related (correlated), so multiplying their probabilities is not reliable. The desk still multiplies so you can see the number; treat it as an estimate only.'));
    const pts = L.map((_, k) => { const q = D.parlay(L.slice(0, k + 1).map((l) => l.p), L.slice(0, k + 1).map((l) => l.odds)); return { label: String(k + 1), value: Math.round(q.p * 1000) / 10, ev: q.ev }; });
    chartHost.append(barChart(pts.map((x) => ({ label: x.label + (x.label === '1' ? ' leg' : ' legs'), value: x.value })), { unit: '%', title: 'Chance that ALL legs win, as legs are added', alt: 'Bar chart: chance all legs win falls as legs are added' }),
      barChart(pts.map((x) => ({ label: x.label, value: Math.round(-x.ev * 1000) / 10, color: 'var(--bad)' })), { unit: '%', title: 'Expected loss per $ staked (the sportsbook’s margin) by number of legs', alt: 'Bar chart: expected loss per dollar grows with each added leg' }));
    if (L.length >= 3) mark('built3');
    live.textContent = `${L.length} legs. Chance all win ${fmt(par.p * 100, 2)} percent. Expected result ${money(S * par.ev)}.`;
  }
  function parlayPane(pane) {
    const rows = slate.map((g) => h('div', { class: 'slate-row' }, h('div', null, h('b', null, g.id), ' ', D.teamName(g.home), ' vs ', D.teamName(g.away)),
      ...['home', 'away'].map((side) => { const leg = legObj(g, side), b = h('button', { class: 'pick', type: 'button', 'aria-pressed': 'false' }, D.team(side === 'home' ? g.home : g.away).nick, h('small', null, `${Math.round(leg.p * 100)}% chance · ${D.fmtAm(leg.odds)}`)); b.addEventListener('click', () => toggle(leg)); buttons.push({ el: b, leg }); return b; })));
    const pb = h('button', { class: 'pick', type: 'button', 'aria-pressed': 'false' }, PROP.label, h('small', null, `${Math.round(PROP.p * 100)}% chance · ${D.fmtAm(PROP.odds)} · same game as G1`)); pb.addEventListener('click', () => toggle(PROP)); buttons.push({ el: pb, leg: PROP });
    const stakeSel = h('select', { class: 'input', style: 'max-width:150px', 'aria-label': 'Stake' }, [10, 50, 100].map((s) => h('option', { value: s }, '$' + s))); stakeSel.value = st.stake; stakeSel.addEventListener('change', () => { st.stake = +stakeSel.value; drawSlip(); });
    pane.append(h('div', { class: 'sim-grid2' }, h('div', { class: 'panel' }, h('h3', null, 'Build a parlay (one side per game)'), ...rows, h('div', { class: 'slate-row' }, h('div', null, h('b', null, 'Player prop')), pb, h('span'))), h('div', { class: 'panel' }, h('div', { class: 'row' }, h('h3', { style: 'margin:0' }, 'Your slip'), h('label', null, 'Stake ', stakeSel)), warnHost, slipHost)), h('div', { class: 'panel', style: 'margin-top:1rem' }, chartHost), live);
    drawSlip(); drawButtons();
  }

  // ---------- 10,000 slips
  function slipsPane(pane) {
    const out = h('div');
    function run10k() {
      const L = st.legs.length ? st.legs : slate.slice(0, 3).map((g) => legObj(g, 'home'));
      const par = D.parlay(L.map((l) => l.p), L.map((l) => l.odds)), r = U5.rng('slips|' + L.map((l) => l.id).join(',')), N = 10000, S = st.stake;
      let wins = 0; for (let i = 0; i < N; i++) { let ok = true; for (const l of L) if (r.next() >= l.p) { ok = false; break; } if (ok) wins++; }
      const paid = wins * S * par.dec, staked = N * S, net = paid - staked;
      clear(out);
      out.append(h('p', { class: 'muted' }, `Slip tested: ${L.map((l) => l.label.replace(' to win', '')).join(' + ')} · stake ${money(S)} each.`),
        h('div', { class: 'stat-grid' }, stat('Slips that won', `${wins.toLocaleString('en-US')}`, fmt((100 * wins) / N, 1) + '% of 10,000', true), stat('Total staked', money(staked)), stat('Total paid back', money(paid)), stat('Net for all bettors', money(net), net < 0 ? 'the sportsbook kept this' : 'bettors ahead'), stat('Average per slip', money(net / N), `expected ${money(S * par.ev)}`)),
        note('This is a computer simulation. A slip that wins pays a lot, but it wins rarely, and across many slips the total paid back is less than the total staked.'));
      mark('ran10k'); announce(`10,000 slips: ${wins} won. Net for bettors ${money(net)}.`);
    }
    function oneBettor() {
      const L = st.legs.length ? st.legs : slate.slice(0, 3).map((g) => legObj(g, 'home')), par = D.parlay(L.map((l) => l.p), L.map((l) => l.odds)), r = U5.rng('one|' + Date.now()), S = st.stake;
      let bal = 0; const pts = [[0, 0]], ex = [[0, 0]];
      for (let i = 1; i <= 200; i++) { let ok = true; for (const l of L) if (r.next() >= l.p) { ok = false; break; } bal += ok ? S * (par.dec - 1) : -S; pts.push([i, Math.round(bal)]); ex.push([i, Math.round(i * S * par.ev)]); }
      clear(out); out.append(lineChart([{ name: 'One bettor, same slip 200 times', color: 'var(--accent)', points: pts }, { name: 'Expected (average)', color: 'var(--accent2)', dash: '6 5', points: ex }], { xmax: 200, ymin: Math.min(...pts.map((p) => p[1]), ...ex.map((p) => p[1])) - 50, ymax: Math.max(...pts.map((p) => p[1]), 100) + 50, refY: 0, refLabel: 'break-even', xlabel: 'slips placed', yunit: '', title: 'One bettor’s running profit (dollars)', alt: 'Running profit of one simulated bettor compared with the expected loss line', noAnim: true }), note('Short runs can look lucky or unlucky. The dashed line is what the math expects on average.'));
      mark('ran10k');
    }
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'Run the slip many times'), h('p', { class: 'muted' }, 'Uses the slip from the Parlay builder (or a 3-leg slip of home teams if yours is empty).'), h('div', { class: 'controls' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: run10k }, 'Run 10,000 slips'), h('button', { class: 'btn', type: 'button', onclick: oneBettor }, 'One bettor, 200 slips'))), out);
  }
  const t = tabs([{ id: 'slate', label: 'Slate and stats', build: slatePane }, { id: 'parlay', label: 'Parlay builder', build: parlayPane }, { id: 'slips', label: '10,000-slip test', build: slipsPane }]);
  container.append(h('div', { class: 'sim' }, note('**FICTIONAL.** Teams, players, odds and the sportsbook are invented. Probabilities come from the disclosed model; legs in different games are treated as independent. Large possible payouts do **not** mean a bet is favorable.'), t.bar, t.body)); t.show(0);
  return { destroy() {} };
}
