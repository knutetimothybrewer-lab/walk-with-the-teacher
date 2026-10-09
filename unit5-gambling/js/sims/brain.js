// Simulation D: Neuroscience Lab.  Four stations.  Models are SIMPLIFIED and labelled as such; they illustrate patterns
// described in research reviews and do not claim to measure any person's brain.
import { h, md, clear, fmt, announce } from '../util.js';
import { svg, barChart } from '../charts.js';
import { stat, tabs, note } from './kit.js';

const visited = new Set();
const log = [];       // dart throws (the student's own ratings)

export function mount(container, ctx) {
  const U5 = window.U5;
  const mark = (k) => { visited.add(k); ctx.report('brain', visited.size); };

  // ---------------- Station 1: reward signal (simplified reward-prediction-error model)
  function rewardPane(pane) {
    let mode = 'variable', p = 25;
    const host = h('div'), unc = h('div');
    const modeSel = h('select', { class: 'input', style: 'max-width:100%', 'aria-label': 'Reward schedule' }, h('option', { value: 'predictable' }, 'Predictable: a vending machine (reward every time)'), h('option', { value: 'variable' }, 'Variable: a slot machine or loot box (reward sometimes)'));
    const range = h('input', { type: 'range', min: 5, max: 95, step: 5, value: p, 'aria-label': 'Chance of a reward in percent' }), val = h('b', null, p + '%');
    modeSel.value = mode;
    function draw() {
      clear(host); clear(unc);
      const pp = mode === 'predictable' ? 1 : p / 100, r = U5.rng('reward|' + mode + '|' + p), N = 30, W = 560, H = 190, mid = 100, bw = (W - 60) / N;
      let e = 0; const bars = [], chips = [];
      for (let t = 0; t < N; t++) { const rew = r.next() < pp ? 1 : 0, delta = rew - e; bars.push({ rew, delta }); e = e + 0.3 * delta; }
      const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': mode === 'predictable' ? 'Surprise signal shrinks to nearly zero after a few trials' : 'Surprise signal keeps jumping up and down on a variable schedule' });
      root.append(svg('line', { x1: 40, x2: W - 10, y1: mid, y2: mid, stroke: 'var(--ink2)', 'stroke-width': 1.5 }), svg('text', { x: 36, y: mid + 4, class: 'ax', 'text-anchor': 'end' }, '0'), svg('text', { x: 36, y: 20, class: 'ax', 'text-anchor': 'end' }, '+'), svg('text', { x: 36, y: H - 12, class: 'ax', 'text-anchor': 'end' }, '−'));
      bars.forEach((b, t) => { const hh = Math.abs(b.delta) * 80, x = 46 + t * bw; const rect = svg('rect', { x, y: b.delta >= 0 ? mid : mid, width: bw * 0.7, height: 0, rx: 2, fill: b.delta >= 0 ? 'var(--accent)' : 'var(--accent2)' }); root.append(rect); requestAnimationFrame(() => { rect.style.transition = `y .5s ease ${t * 20}ms, height .5s ease ${t * 20}ms`; rect.setAttribute('y', b.delta >= 0 ? mid - hh : mid); rect.setAttribute('height', hh); }); root.append(svg('text', { x: x + bw * 0.35, y: H - 2, class: 'ax', 'text-anchor': 'middle', 'font-size': 8 }, b.rew ? '●' : '○')); });
      host.append(h('div', { class: 'chartbox' }, h('figcaption', null, 'Surprise signal on each of 30 trials (simplified model)'), root, h('div', { class: 'legend' }, h('span', null, h('i', { style: 'background:var(--accent)' }), 'better than expected'), h('span', null, h('i', { style: 'background:var(--accent2)' }), 'worse than expected'), h('span', null, '● reward · ○ no reward'))),
        note(mode === 'predictable' ? 'When a reward is completely predictable, the brain’s expectation catches up and the surprise signal fades to almost nothing.' : 'When a reward is unpredictable, the expectation never settles. Each win is a big positive surprise and each miss a negative one, so the learning signal stays strong.'));
      // uncertainty curve
      const c = svg('svg', { viewBox: '0 0 300 150', class: 'chart', role: 'img', 'aria-label': 'Uncertainty is highest when the chance of reward is 50 percent' });
      let d = ''; for (let q = 0; q <= 100; q += 2) { const u = (q / 100) * (1 - q / 100) * 4; d += (q ? 'L' : 'M') + (30 + q * 2.5).toFixed(1) + ' ' + (130 - u * 100).toFixed(1); }
      const pq = mode === 'predictable' ? 100 : p;
      c.append(svg('line', { x1: 30, x2: 280, y1: 130, y2: 130, stroke: 'var(--line)' }), svg('path', { d, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 3 }), svg('circle', { cx: 30 + pq * 2.5, cy: 130 - (pq / 100) * (1 - pq / 100) * 400, r: 6, fill: 'var(--warn)' }), svg('text', { x: 155, y: 146, class: 'ax', 'text-anchor': 'middle' }, 'chance of reward: 0% → 100%'), svg('text', { x: 155, y: 22, class: 'ax', 'text-anchor': 'middle' }, 'peak at 50%'));
      unc.append(h('div', { class: 'chartbox' }, h('figcaption', null, 'How uncertain is the reward? (p × (1 − p), scaled)'), c), note('In experiments with monkeys (Fiorillo, Tobler & Schultz, 2003), a dopamine-related signal that builds up before a possible reward was largest when the chance of reward was 50%. This lab is a simplified model, and human brains are more complicated.'));
    }
    modeSel.addEventListener('change', () => { mode = modeSel.value; range.disabled = mode === 'predictable'; draw(); mark('reward'); });
    range.addEventListener('input', () => { p = +range.value; val.textContent = p + '%'; draw(); });
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'Station 1: the reward signal'), h('div', { class: 'controls' }, modeSel), h('div', { class: 'slider-row', style: 'margin-top:.6rem' }, h('label', null, 'Chance of a reward: ', val), range)), h('div', { class: 'sim-grid2' }, h('div', { class: 'panel' }, host), h('div', { class: 'panel' }, unc)));
    draw(); mark('reward');
  }

  // ---------------- Station 2: near-miss darts
  function dartsPane(pane) {
    const seed = ctx.labs.coin, svgEl = svg('svg', { viewBox: '0 0 200 200', class: 'board-svg', role: 'img', 'aria-label': 'Dartboard: small bullseye, a ring for near misses, and the outer area for misses' });
    svgEl.append(svg('circle', { cx: 100, cy: 100, r: 92, fill: 'var(--panel2)', stroke: 'var(--line)', 'stroke-width': 3 }), svg('circle', { cx: 100, cy: 100, r: 52, fill: 'color-mix(in srgb, var(--accent2) 35%, transparent)', stroke: 'var(--accent2)', 'stroke-width': 2 }), svg('circle', { cx: 100, cy: 100, r: 16, fill: 'var(--accent)', stroke: 'var(--ink)', 'stroke-width': 2 }));
    const dot = svg('circle', { cx: -10, cy: -10, r: 6, fill: 'var(--bad)', stroke: '#fff', 'stroke-width': 2 }); svgEl.append(dot);
    const result = h('p', { class: 'muted' }, 'Each throw costs 2 tokens. Bullseye pays 8. A near miss and an ordinary miss both pay 0.'), tokens = stat('Tokens', '20'), table = h('div'), rate = h('div'), sum = h('div');
    let bal = 20, pending = false;
    const label = { bullseye: 'Bullseye (+8)', near: 'Near miss (0)', miss: 'Miss (0)' };
    function drawLog() {
      clear(table); clear(sum);
      if (!log.length) return;
      table.append(h('table', { class: 'mini' }, h('thead', null, h('tr', null, h('th', null, 'Throw'), h('th', null, 'Result'), h('th', null, 'Urge to throw again (1–5)'))), h('tbody', null, log.map((l, i) => h('tr', null, h('td', null, String(i + 1)), h('td', null, label[l.o]), h('td', { class: 'num' }, l.u == null ? '—' : String(l.u)))))));
      const avg = (o) => { const v = log.filter((l) => l.o === o && l.u != null).map((l) => l.u); return v.length ? fmt(v.reduce((a, b) => a + b, 0) / v.length, 2) : '—'; };
      if (log.filter((l) => l.u != null).length >= 5) sum.append(h('div', { class: 'stat-grid' }, stat('Your average urge after a near miss', avg('near')), stat('...after an ordinary miss', avg('miss'))), note('Both results pay 0 tokens. Published lab research (Clark et al., 2009) found that near-misses were less pleasant than full misses yet increased the desire to keep playing. Your own small sample cannot prove anything, but notice what you felt.'));
    }
    function askRate(idx) {
      clear(rate); pending = true;
      rate.append(h('fieldset', { class: 'part' }, h('legend', null, 'How much do you want to throw again? (1 = not at all, 5 = a lot)'), h('div', { class: 'controls' }, [1, 2, 3, 4, 5].map((u) => h('button', { class: 'btn', type: 'button', onclick: () => { log[idx].u = u; pending = false; clear(rate); drawLog(); } }, String(u))))));
      rate.querySelector('button').focus();
    }
    function throwDart() {
      if (pending) { announce('Rate the last throw first.'); return; }
      if (bal < 2 || log.length >= 14) { result.textContent = log.length >= 14 ? 'That is enough throws for the lab.' : 'Out of tokens.'; return; }
      const i = log.length, o = U5.dartOutcome(seed, i); bal -= 2; if (o === 'bullseye') bal += 8;
      const a = U5.u01(seed ^ 77, i) * Math.PI * 2, rr = o === 'bullseye' ? 5 + U5.u01(seed ^ 91, i) * 8 : o === 'near' ? 24 + U5.u01(seed ^ 91, i) * 24 : 58 + U5.u01(seed ^ 91, i) * 30;
      dot.setAttribute('cx', 100 + Math.cos(a) * rr); dot.setAttribute('cy', 100 + Math.sin(a) * rr);
      log.push({ o, u: null }); setStat2(tokens, bal); result.textContent = `Throw ${i + 1}: ${label[o]}.`; announce(label[o]); drawLog(); askRate(i);
      mark('darts');
    }
    const setStat2 = (el, v) => { el.querySelector('.v').textContent = String(v); };
    pane.append(h('div', { class: 'sim-grid2' }, h('div', { class: 'panel' }, h('h3', null, 'Station 2: the almost-won dartboard'), svgEl, h('div', { class: 'controls' }, h('button', { class: 'btn btn-primary', type: 'button', onclick: throwDart }, 'Throw a dart (2 tokens)')), result, rate), h('div', { class: 'panel' }, tokens, table, sum)));
    drawLog(); setStat2(tokens, bal); if (log.length) mark('darts');
  }

  // ---------------- Station 3: loss-chasing tracker
  function chasePane(pane) {
    let b0 = 10, n = 5; const out = h('div');
    const sel = h('select', { class: 'input', style: 'max-width:200px', 'aria-label': 'Starting bet' }, [5, 10, 20].map((v) => h('option', { value: v }, 'Start with $' + v))); sel.value = b0;
    const range = h('input', { type: 'range', min: 1, max: 8, value: n, 'aria-label': 'Losses in a row' }), val = h('b', null, n + ' losses in a row');
    function draw() {
      clear(out); const rows = []; let tot = 0;
      for (let i = 1; i <= n; i++) { const bet = b0 * Math.pow(2, i - 1); tot += bet; rows.push([i, bet, tot]); }
      const next = b0 * Math.pow(2, n), pr = Math.pow(0.5, n);
      out.append(h('table', { class: 'mini' }, h('thead', null, h('tr', null, h('th', null, 'Bet #'), h('th', null, 'Bet size'), h('th', null, 'Total lost so far'))), h('tbody', null, rows.map((r) => h('tr', null, h('td', null, String(r[0])), h('td', { class: 'num' }, '$' + r[1]), h('td', { class: 'num' }, '$' + r[2]))))),
        h('div', { class: 'stat-grid', style: 'margin-top:.7rem' }, stat('Next bet if he doubles again', '$' + next, 'to try to "win it back"', true), stat('Chance of this many losses in a row', fmt(pr * 100, 2) + '%', 'on a fair 50/50 bet'), stat('Out of 1,000 players, about', fmt(1000 * pr, 0) + ' will', 'hit this streak at some point')),
        barChart(rows.map((r) => ({ label: '#' + r[0], value: r[1] })), { title: 'Bet size grows each time Jordan doubles', unit: '', ref: { value: 100, label: 'bankroll $100' }, alt: 'Bets double after each loss and quickly pass a one hundred dollar bankroll' }),
        note('Each bet is independent: a loss never makes the next win "due." A bigger bet only raises what is at risk. Setting a limit before playing, and walking away, protects you.'));
      mark('chase');
    }
    sel.addEventListener('change', () => { b0 = +sel.value; draw(); }); range.addEventListener('input', () => { n = +range.value; val.textContent = n + ' losses in a row'; draw(); });
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'Station 3: chasing losses (FICTIONAL player "Jordan")'), h('p', { class: 'muted' }, 'Jordan loses a 50/50 bet, then doubles the bet after every loss to win the money back.'), h('div', { class: 'controls' }, sel), h('div', { class: 'slider-row', style: 'margin-top:.5rem' }, range, val)), h('div', { class: 'panel' }, out));
    draw();
  }

  // ---------------- Station 4: teen-brain timeline (schematic)
  function teenPane(pane) {
    let age = 16; const out = h('div'), chart = h('div');
    const reward = (a) => 100 * Math.exp(-Math.pow((a - 16) / 6.5, 2)), control = (a) => 100 / (1 + Math.exp(-(a - 17) / 3.4));
    function draw() {
      clear(chart); clear(out);
      const W = 560, H = 240, X = (a) => 46 + ((a - 10) / 20) * (W - 70), Y = (v) => 20 + (1 - v / 100) * (H - 60);
      const root = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': 'Schematic timeline: reward-seeking rises sharply in the teen years while the impulse-control system keeps maturing into the twenties' });
      for (let v = 0; v <= 100; v += 25) root.append(svg('line', { x1: 46, x2: W - 14, y1: Y(v), y2: Y(v), class: 'grid' }), svg('text', { x: 40, y: Y(v) + 4, class: 'ax', 'text-anchor': 'end' }, String(v)));
      for (let a = 10; a <= 30; a += 5) root.append(svg('text', { x: X(a), y: H - 26, class: 'ax', 'text-anchor': 'middle' }, String(a)));
      root.append(svg('text', { x: W / 2, y: H - 8, class: 'ax', 'text-anchor': 'middle' }, 'age (years)'));
      let gap = 'M', rd = '', cd = '', top = [], bot = [];
      for (let a = 10; a <= 30; a += 0.5) { rd += (a === 10 ? 'M' : 'L') + X(a).toFixed(1) + ' ' + Y(reward(a)).toFixed(1); cd += (a === 10 ? 'M' : 'L') + X(a).toFixed(1) + ' ' + Y(control(a)).toFixed(1); if (reward(a) > control(a)) { top.push([X(a), Y(reward(a))]); bot.push([X(a), Y(control(a))]); } }
      root.append(svg('path', { d: 'M' + top.concat(bot.reverse()).map((p) => p.map((x) => x.toFixed(1)).join(' ')).join('L') + 'Z', fill: 'color-mix(in srgb, var(--warn) 30%, transparent)', stroke: 'none' }), svg('path', { d: rd, fill: 'none', stroke: 'var(--accent)', 'stroke-width': 3.5 }), svg('path', { d: cd, fill: 'none', stroke: 'var(--accent2)', 'stroke-width': 3.5, 'stroke-dasharray': '7 5' }), svg('line', { x1: X(age), x2: X(age), y1: 20, y2: H - 40, stroke: 'var(--ink)', 'stroke-width': 2 }), svg('text', { x: X(14), y: 34, fill: 'var(--warn)', 'font-size': 11, 'font-weight': 700 }, 'gap'));
      chart.append(h('div', { class: 'chartbox' }, h('figcaption', null, 'Two systems, two timelines (a teaching sketch, not measured data)'), root, h('div', { class: 'legend' }, h('span', null, h('i', { style: 'background:var(--accent)' }), 'Reward-seeking system: highly responsive in adolescence'), h('span', null, h('i', { style: 'background:var(--accent2)' }), 'Impulse control (prefrontal cortex): keeps maturing'), h('span', null, h('i', { style: 'background:var(--warn)' }), 'gap'))));
      const lvl = (v, a, b) => (v >= b ? 'high' : v >= a ? 'medium' : 'low'), r = reward(age), c = control(age);
      out.append(h('div', { class: 'stat-grid' }, stat('Age', String(age)), stat('Reward-seeking system', lvl(r, 40, 70), 'how strongly it responds', true), stat('Impulse-control system', c >= 85 ? 'mostly mature' : c >= 45 ? 'still developing' : 'early development', 'prefrontal cortex'), stat('Timing gap', r - c >= 25 ? 'wide' : r - c >= 5 ? 'narrowing' : 'closed', 'wanting vs. controlling')));
    }
    const range = h('input', { type: 'range', min: 10, max: 30, value: age, 'aria-label': 'Age in years' }); range.addEventListener('input', () => { age = +range.value; draw(); });
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'Station 4: the teen brain'), h('div', { class: 'slider-row' }, h('label', null, 'Move through the ages: '), range), chart, out, note('This is a teaching sketch, not measured data. It illustrates ideas from research reviews (for example Casey, Jones & Hare, 2008) and the National Institute of Mental Health, which says the brain keeps developing and maturing into the mid-to-late 20s, with the prefrontal cortex among the last regions to mature. Real development varies by person and by brain region. This describes a timing mismatch, not a lack of willpower.')));
    draw(); mark('teen');
  }

  const t = tabs([{ id: 'reward', label: '1. Reward signal', build: rewardPane }, { id: 'darts', label: '2. Near-miss darts', build: dartsPane }, { id: 'chase', label: '3. Chasing losses', build: chasePane }, { id: 'teen', label: '4. Teen brain', build: teenPane }]);
  container.append(h('div', { class: 'sim' }, note('These stations use **simplified models**. They show patterns that researchers describe, not measurements of your own brain.'), t.bar, t.body)); t.show(0);
  return { destroy() {} };
}
