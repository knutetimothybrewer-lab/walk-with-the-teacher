// Small animated pictures of the gambling games a question is about (roulette wheel, slot reels, dice, coin, loot crate, parlay ticket, lottery draw).
// Pure illustration: random, NOT the seeded lab data, never sent to the server and never graded. Each one has a Play button, a text alternative
// and a live-region result. With reduced motion the result appears instantly and nothing auto-plays.
import { h, clear, announce, reducedMotion } from './util.js';
import { svg } from './charts.js';
import { dieFace, setDie } from './sims/kit.js';

// Which game illustrates which question (ids from docs/BLUEPRINT.md). Questions not listed here get no picture.
const BY_ITEM = {
  'c1-test': 'slots', 'c1-lootbox': 'lootbox',
  'c2-basics': 'dice', 'c2-lab': 'coin', 'c2-indep': 'coin', 'c2-house': 'dice', 'c2-roulette': 'roulette',
  'c3-variable': 'slots', 'c3-nearmiss': 'slots', 'c3-hot': 'slots',
  'c4-parlay': 'parlay', 'c4-parlay-table': 'parlay', 'c4-lottery': 'lottery', 'c4-regress': 'lottery'
};
const TITLE = { roulette: 'American roulette', slots: 'Slot machine', dice: 'Dice (High / Low)', coin: 'Coin flip', lootbox: 'Loot box', parlay: 'Three-leg parlay', lottery: 'Lottery draw' };
const BLURB = {
  roulette: 'Spin the wheel. The ball lands on one of 38 pockets: 18 red, 18 black and 2 green. Watch the tally over many spins.',
  slots: 'Pull the lever. Every spin is independent: the reels have no memory, and “almost” wins are just losses.',
  dice: 'Roll the die. Each roll is independent of the one before it.',
  coin: 'Flip the coin. Short runs can look streaky; long runs settle toward the theoretical probability.',
  lootbox: 'Open a crate. Rarer prizes are drawn far less often than common ones.',
  parlay: 'Every leg must win for the ticket to pay. Watch how often one leg sinks it.',
  lottery: 'Six balls are drawn from the drum. Compare them with the ticket numbers.'
};
const rnd = (n) => Math.floor(Math.random() * n);
const sleepFx = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? 0 : ms));

export function gameFor(itemId) { return BY_ITEM[itemId] || null; }

/** Returns a Node, or null when the question has no matching game. */
export function gameFx(itemId) {
  const kind = BY_ITEM[itemId]; if (!kind) return null;
  const root = h('div', { class: 'gamefx', 'data-game': kind, role: 'group', 'aria-label': 'Animated illustration: ' + TITLE[kind] });
  const stage = h('div', { class: 'gfx-stage' }), tally = h('div', { class: 'gfx-tally' }), live = h('div', { class: 'sr-only', 'aria-live': 'polite' });
  const go = h('button', { class: 'btn btn-sm btn-primary', type: 'button' }, 'Play');
  const ctl = { stage, tally, say: (t) => { live.textContent = t; }, alive: () => root.isConnected, busy: false };
  root.append(h('div', { class: 'gfx-head' }, h('strong', null, TITLE[kind]), h('span', { class: 'chip' }, 'ILLUSTRATION · NOT GRADED')), h('p', { class: 'gfx-blurb' }, BLURB[kind]), stage, tally, h('div', { class: 'gfx-ctl' }, go), live);
  const game = GAMES[kind](ctl);
  go.addEventListener('click', async () => { if (ctl.busy) return; ctl.busy = true; go.disabled = true; try { await game.play(); } finally { ctl.busy = false; go.disabled = false; go.textContent = 'Play again'; } });
  game.draw();
  return root;
}

const chip = (t, cls) => h('span', { class: 'gfx-count ' + (cls || '') }, t);
function setTally(el, parts) { clear(el); parts.forEach((p) => el.append(chip(p[0], p[1]))); }

const GAMES = {
  roulette(c) {
    // American double-zero wheel order, clockwise from 0.
    const ORDER = ['0', '28', '9', '26', '30', '11', '7', '20', '32', '17', '5', '22', '34', '15', '3', '24', '36', '13', '1', '00', '27', '10', '25', '29', '12', '8', '19', '31', '18', '6', '21', '33', '16', '4', '23', '35', '14', '2'];
    const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
    const colorOf = (s) => (s === '0' || s === '00' ? 'green' : RED.has(+s) ? 'red' : 'black');
    const FILL = { red: '#b3261e', black: '#1c1c24', green: '#1f7a4d' }, STEP = 360 / ORDER.length;
    const pt = (r, deg) => { const a = (deg - 90) * Math.PI / 180; return [100 + r * Math.cos(a), 100 + r * Math.sin(a)]; };
    const wheel = svg('g', { class: 'rw-wheel' });
    ORDER.forEach((s, i) => {
      const a0 = i * STEP, a1 = (i + 1) * STEP, p0 = pt(88, a0), p1 = pt(88, a1), q0 = pt(58, a1), q1 = pt(58, a0);
      wheel.append(svg('path', { d: `M${p0} A88 88 0 0 1 ${p1} L${q0} A58 58 0 0 0 ${q1}Z`, fill: FILL[colorOf(s)], stroke: '#d8d2c2', 'stroke-width': 1 }));
      const t = pt(73, a0 + STEP / 2); wheel.append(svg('text', { x: t[0], y: t[1] + 2.5, 'text-anchor': 'middle', 'font-size': 7, 'font-weight': 700, fill: '#fff', transform: `rotate(${a0 + STEP / 2} ${t[0]} ${t[1]})` }, s));
    });
    wheel.append(svg('circle', { cx: 100, cy: 100, r: 56, fill: '#3b3b48' }), svg('circle', { cx: 100, cy: 100, r: 12, fill: '#d8d2c2' }));
    const dot = svg('circle', { cx: 100, cy: 8, r: 4.5, fill: '#fff', stroke: '#888', 'stroke-width': 1, class: 'rw-dot' });
    const ball = svg('g', { class: 'rw-ball' }, dot);
    const art = svg('svg', { viewBox: '0 0 200 200', class: 'gfx-svg', role: 'img', 'aria-label': 'A roulette wheel with 38 pockets' }, svg('circle', { cx: 100, cy: 100, r: 96, fill: '#5a3d24' }), wheel, ball, svg('path', { d: 'M100 2 l-6 -0 6 9 6 -9z', fill: 'var(--accent)' }));
    c.stage.append(art);
    const n = { red: 0, black: 0, green: 0 }; let spins = 0, wr = 0, br = 0;
    const draw = () => setTally(c.tally, [[`Spins ${spins}`], [`Red ${n.red}`, 'is-red'], [`Black ${n.black}`, 'is-black'], [`Green ${n.green}`, 'is-green']]);
    return {
      draw,
      async play() {
        const k = rnd(ORDER.length), base = -(k + 0.5) * STEP, reduced = reducedMotion();
        wr = base + 360 * Math.ceil((wr + 1440 - base) / 360); br -= 1080;
        const set = (el, deg, ms, ease) => { el.style.transition = reduced ? 'none' : `transform ${ms}ms ${ease}`; el.style.transformOrigin = '100px 100px'; el.style.transform = `rotate(${deg}deg)`; };
        dot.style.transition = 'none'; dot.style.transform = 'translateY(0)';
        void dot.getBoundingClientRect();
        set(wheel, wr, 3600, 'cubic-bezier(.15,.6,.2,1)'); set(ball, br, 3600, 'cubic-bezier(.3,.4,.25,1)');
        await sleepFx(3000);
        dot.style.transition = reduced ? 'none' : 'transform .5s ease-in'; dot.style.transform = 'translateY(26px)';
        await sleepFx(800);
        if (!c.alive()) return;
        const s = ORDER[k], col = colorOf(s); n[col]++; spins++; draw(); c.say(`The ball landed on ${s}, ${col}. ${spins} spins so far.`);
      }
    };
  },

  slots(c) {
    const SYM = ['🍒', '🍋', '🔔', '⭐', '7️⃣'], reels = [0, 1, 2].map(() => h('div', { class: 'sl-reel', 'aria-hidden': 'true' }, '❔'));
    c.stage.append(h('div', { class: 'sl-machine', role: 'img', 'aria-label': 'A slot machine with three reels' }, h('div', { class: 'sl-window' }, reels), h('div', { class: 'sl-lever', 'aria-hidden': 'true' })));
    const msg = h('p', { class: 'gfx-result', 'aria-hidden': 'true' }, 'Press Play to spin.'); c.stage.append(msg);
    const t = { spins: 0, win: 0, near: 0 };
    const draw = () => setTally(c.tally, [[`Spins ${t.spins}`], [`Three match ${t.win}`, 'is-green'], [`Two match (“near miss”) ${t.near}`, 'is-warn']]);
    return {
      draw,
      async play() {
        reels.forEach((r) => r.classList.add('spinning'));
        const out = [0, 1, 2].map(() => rnd(SYM.length));
        for (let i = 0; i < 3; i++) {
          const timer = setInterval(() => { if (c.alive()) reels[i].textContent = SYM[rnd(SYM.length)]; }, 70);
          await sleepFx(600 + i * 450); clearInterval(timer);
          reels[i].textContent = SYM[out[i]]; reels[i].classList.remove('spinning');
        }
        if (!c.alive()) return;
        const same = new Set(out).size; t.spins++;
        let text;
        if (same === 1) { t.win++; text = 'Three match: a win this time. The next spin is still just as random.'; }
        else if (same === 2) { t.near++; text = 'Two match: it feels close, but it is a loss. The reels are not “almost” anything.'; }
        else text = 'No match: a loss.';
        msg.textContent = text; draw(); c.say(text);
      }
    };
  },

  dice(c) {
    const face = dieFace(1); c.stage.append(h('div', { class: 'gfx-center' }, face));
    const strip = h('div', { class: 'chips', 'aria-hidden': 'true' }); c.stage.append(strip);
    const t = { hi: 0, lo: 0, n: 0 };
    const draw = () => setTally(c.tally, [[`Rolls ${t.n}`], [`High (4–6) ${t.hi}`, 'is-green'], [`Low (1–3) ${t.lo}`, 'is-warn']]);
    return {
      draw,
      async play() {
        for (let i = 0; i < 6; i++) { setDie(face, 1 + rnd(6)); await sleepFx(110); }
        const v = 1 + rnd(6); setDie(face, v); await sleepFx(450);
        if (!c.alive()) return;
        t.n++; v >= 4 ? t.hi++ : t.lo++; strip.append(h('span', { class: v >= 4 ? 'chip-h' : 'chip-t' }, v)); while (strip.children.length > 24) strip.firstChild.remove();
        draw(); c.say(`Rolled ${v}, ${v >= 4 ? 'high' : 'low'}.`);
      }
    };
  },

  coin(c) {
    const coin = h('div', { class: 'coin3d', 'aria-hidden': 'true' }, '?'); c.stage.append(h('div', { class: 'gfx-center' }, coin));
    const strip = h('div', { class: 'chips', 'aria-hidden': 'true' }); c.stage.append(strip);
    const t = { h: 0, t: 0 };
    const draw = () => { const n = t.h + t.t; setTally(c.tally, [[`Flips ${n}`], [`Heads ${t.h}`, 'is-green'], [`Tails ${t.t}`, 'is-warn'], [n ? `Heads share ${Math.round(100 * t.h / n)}%` : 'Heads share —']]); };
    return {
      draw,
      async play() {
        coin.classList.remove('flip'); void coin.offsetWidth; if (!reducedMotion()) coin.classList.add('flip');
        await sleepFx(650); if (!c.alive()) return;
        const heads = Math.random() < 0.5; coin.textContent = heads ? 'H' : 'T'; heads ? t.h++ : t.t++;
        strip.append(h('span', { class: heads ? 'chip-h' : 'chip-t' }, heads ? 'H' : 'T')); while (strip.children.length > 40) strip.firstChild.remove();
        draw(); c.say(heads ? 'Heads.' : 'Tails.');
      }
    };
  },

  lootbox(c) {
    // Illustrative odds only (not from any real game).
    const TIERS = [['Common', 70, '#8a93a6'], ['Rare', 22, '#4aa3ff'], ['Epic', 7, '#b06cff'], ['Legendary', 1, '#ffc857']];
    const crate = h('div', { class: 'lb-crate', 'aria-hidden': 'true' }, '🎁'), prize = h('div', { class: 'lb-prize', 'aria-hidden': 'true' }, 'Tap Play to open a crate');
    c.stage.append(h('div', { class: 'gfx-center lb' }, crate, prize), h('p', { class: 'gfx-note' }, 'Illustrative odds for a pretend crate: Common 70%, Rare 22%, Epic 7%, Legendary 1%.'));
    const t = Object.fromEntries(TIERS.map((x) => [x[0], 0])); let n = 0;
    const draw = () => setTally(c.tally, [[`Crates ${n}`], ...TIERS.map((x) => [`${x[0]} ${t[x[0]]}`])]);
    return {
      draw,
      async play() {
        crate.classList.remove('open'); prize.textContent = '…'; prize.style.color = ''; crate.classList.add('shake'); await sleepFx(900); crate.classList.remove('shake');
        if (!c.alive()) return;
        let r = rnd(100), tier = TIERS[0]; for (const x of TIERS) { if (r < x[1]) { tier = x; break; } r -= x[1]; }
        crate.classList.add('open'); prize.textContent = tier[0] + ' item'; prize.style.color = tier[2]; t[tier[0]]++; n++; draw(); c.say(`You opened a ${tier[0]} item.`);
      }
    };
  },

  parlay(c) {
    const LEGS = ['Leg 1 wins', 'Leg 2 wins', 'Leg 3 wins'], rows = LEGS.map((l) => h('li', { class: 'pl-leg' }, h('span', { class: 'pl-mark', 'aria-hidden': 'true' }, '○'), h('span', null, l)));
    const verdict = h('div', { class: 'pl-verdict', 'aria-hidden': 'true' }, 'Ticket: waiting');
    c.stage.append(h('p', { class: 'gfx-note' }, 'The picture uses simple 50% legs. Your question uses its own numbers, so do not copy these.'), h('div', { class: 'pl-ticket' }, h('div', { class: 'pl-top' }, 'PARLAY TICKET · FICTIONAL'), h('ul', { class: 'pl-list' }, rows), verdict));
    const t = { n: 0, won: 0 };
    const draw = () => setTally(c.tally, [[`Tickets ${t.n}`], [`Paid ${t.won}`, 'is-green'], [`Busted ${t.n - t.won}`, 'is-warn']]);
    return {
      draw,
      async play() {
        rows.forEach((r) => { r.classList.remove('win', 'lose'); r.firstChild.textContent = '○'; }); verdict.textContent = 'Ticket: playing…'; verdict.className = 'pl-verdict';
        let all = true;
        for (const r of rows) {
          await sleepFx(750); if (!c.alive()) return;
          const ok = Math.random() < 0.5; all = all && ok; r.classList.add(ok ? 'win' : 'lose'); r.firstChild.textContent = ok ? '✓' : '✗';
        }
        t.n++; if (all) t.won++;
        verdict.textContent = all ? 'All three legs won: ticket pays.' : 'One missed leg: the whole ticket loses.'; verdict.className = 'pl-verdict ' + (all ? 'ok' : 'no');
        draw(); c.say(verdict.textContent);
      }
    };
  },

  lottery(c) {
    const MAX = 49, mine = [] ; while (mine.length < 6) { const x = 1 + rnd(MAX); if (!mine.includes(x)) mine.push(x); } mine.sort((a, b) => a - b);
    const balls = h('div', { class: 'lt-balls', 'aria-hidden': 'true' });
    c.stage.append(h('p', { class: 'gfx-note' }, 'Your ticket (pick 6 of 49): ' + mine.join(' · ')), balls);
    const t = { draws: 0, best: 0 };
    const draw = () => setTally(c.tally, [[`Draws ${t.draws}`], [`Most matched in one draw ${t.best} of 6`, 'is-green']]);
    return {
      draw,
      async play() {
        clear(balls); const pool = Array.from({ length: MAX }, (_, i) => i + 1), got = [];
        for (let i = 0; i < 6; i++) {
          await sleepFx(650); if (!c.alive()) return;
          const x = pool.splice(rnd(pool.length), 1)[0]; got.push(x);
          balls.append(h('span', { class: 'lt-ball' + (mine.includes(x) ? ' hit' : '') }, x));
        }
        const m = got.filter((x) => mine.includes(x)).length; t.draws++; t.best = Math.max(t.best, m); draw(); c.say(`Drawn: ${got.join(', ')}. You matched ${m} of 6.`);
      }
    };
  }
};
