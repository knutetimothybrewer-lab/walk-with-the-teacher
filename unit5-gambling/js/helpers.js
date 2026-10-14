// Question helpers: look-alike skins, a bag of marbles, walk-through calculators, nudges, a bonus-bet explainer and an ad gallery.
// Everything here is keyed by question id (see docs/BLUEPRINT.md) and works from what the question already shows, so it needs no change to the
// private question bank.  Helpers NEVER state an answer: they show the setup (what to plug in) and the student does the arithmetic.
// Nothing here is graded, stored or sent to the server.
import { h, md, clear, fmt, announce, reducedMotion } from './util.js';
import { adArt } from './fxads.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? 0 : ms));
const num = (s) => parseFloat(String(s == null ? '' : s).replace(/[−–]/g, '-').replace(/[,%$\s]/g, ''));
const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, ...kids) => { const el = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v); kids.flat().forEach((k) => el.append(k instanceof Node ? k : document.createTextNode(String(k)))); return el; };

/** All the readable text of an item (prompt and stimulus), used only to find numbers the question already shows. */
function itemText(item) {
  const out = [item.prompt || ''];
  (item.stim || []).forEach((b) => {
    ['t', 'body', 'head', 'cap'].forEach((k) => b[k] && out.push(b[k]));
    (b.items || []).forEach((x) => out.push(x));
    (b.cols || []).forEach((x) => out.push(x));
    (b.rows || []).forEach((r) => out.push(r.join(' ')));
    (b.msgs || []).forEach((m) => out.push(m.t));
  });
  return out.join('\n');
}

// ============================================================================================ skins
// Look-alike chrome around a question's own data: a sportsbook "My Bets" screen and an event-contract market.  The data is never changed.
const SKIN = { 'c1-ledger': 'book', 'c1-market': 'market' };
const ODDS = /^[+−\-–]\s?\d{3,4}$/, RESULT = /^(won|win|lost|loss|push|void|pending|open|cashed out)$/i, PRICE = /^(\$?0?\.\d{1,2}|\d{1,2}\s?¢|\d{1,3}(\.\d+)?\s?%)$/;

function decorateBook(root) {
  root.querySelectorAll('table.b-table').forEach((t) => {
    t.classList.add('bk-table');
    t.querySelectorAll('td, th[scope="row"]').forEach((c) => {
      const s = c.textContent.trim();
      if (ODDS.test(s)) { c.textContent = ''; c.append(h('span', { class: 'odds-pill ' + (/^\+/.test(s) ? 'pos' : 'neg') }, s)); }
      else if (RESULT.test(s)) { c.textContent = ''; c.append(h('span', { class: 'res-badge res-' + (/^(won|win|cashed out)$/i.test(s) ? 'won' : /^(lost|loss)$/i.test(s) ? 'lost' : 'push') }, s)); }
      else if (/^[−\-–]\s?\$/.test(s)) c.classList.add('money-neg');
      else if (/^\+\s?\$/.test(s)) c.classList.add('money-pos');
    });
  });
}
function decorateMarket(root) {
  root.querySelectorAll('table.b-table').forEach((t) => {
    t.classList.add('mk-table');
    const heads = Array.from(t.querySelectorAll('thead th')).map((th) => th.textContent.trim());
    heads.forEach((txt, i) => { const th = t.querySelectorAll('thead th')[i]; if (/\byes\b/i.test(txt)) th.classList.add('yes'); else if (/^no\b|\bno\s*\(|\bno price/i.test(txt)) th.classList.add('no'); });
    t.querySelectorAll('tbody tr').forEach((tr) => Array.from(tr.children).forEach((c, i) => {
      const s = c.textContent.trim(), col = heads[i] || '';
      if (!PRICE.test(s)) return;
      const kind = /\byes\b/i.test(col) ? 'yes' : /^no\b|\bno\s*\(|\bno price/i.test(col) ? 'no' : '';
      c.textContent = '';
      if (kind) c.append(h('span', { class: 'mk-btn ' + kind }, (kind === 'yes' ? 'Yes ' : 'No ') + s));
      else if (/chance|prob|implied|odds|likel/i.test(col) && /%$/.test(s)) c.append(h('span', { class: 'mk-meter', 'aria-label': s }, h('i', { style: `width:${Math.min(100, Math.max(0, parseFloat(s)))}%` }), h('b', null, s)));
      else c.append(h('span', { class: 'mk-price' }, s));
    }));
  });
}
export function skinFor(item, node) {
  const kind = SKIN[item.id]; if (!kind) return node;
  const head = kind === 'book'
    ? h('div', { class: 'skin-head' }, h('span', { class: 'skin-logo' }, h('i', { 'aria-hidden': 'true' }, '▲'), 'BETPEAK'), h('span', { class: 'skin-tabs', 'aria-hidden': 'true' }, h('b', null, 'Sportsbook'), h('b', null, 'Live'), h('b', { class: 'on' }, 'My Bets')), h('span', { class: 'chip' }, 'FICTIONAL SPORTSBOOK'))
    : h('div', { class: 'skin-head' }, h('span', { class: 'skin-logo' }, h('i', { 'aria-hidden': 'true' }, '◆'), 'FICTIONMARKET'), h('span', { class: 'skin-tabs', 'aria-hidden': 'true' }, h('b', { class: 'on' }, 'Event contracts'), h('b', null, 'Economy'), h('b', null, 'Weather'), h('b', null, 'Sports')), h('span', { class: 'chip' }, 'FICTIONAL MARKET'));
  const box = h('div', { class: 'skin skin-' + kind }, head, h('div', { class: 'skin-body' }, node));
  (kind === 'book' ? decorateBook : decorateMarket)(box);
  return box;
}

// ============================================================================================ bag of marbles
const MCOL = { red: '#e5484d', blue: '#3b82f6', green: '#2fb36d', yellow: '#f5c542', purple: '#8b5cf6', orange: '#f97316', white: '#f1f5f9', black: '#1f2937', pink: '#ec6aa5' };
const WORDN = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
function parseMarbles(text) {
  const names = Object.keys(MCOL).join('|'), re = new RegExp(`\\b(\\d+|${Object.keys(WORDN).join('|')})\\s+(?:more\\s+)?(${names})\\b`, 'gi'), got = {};
  for (let m; (m = re.exec(text));) { const c = m[2].toLowerCase(), n = /^\d+$/.test(m[1]) ? +m[1] : WORDN[m[1].toLowerCase()]; if (!(c in got) && n >= 0 && n <= 40) got[c] = n; }
  return Object.keys(got).length >= 2 ? got : null;
}
export function marbleBag(start, parsed) {
  const counts = Object.assign({}, start), draws = {};
  let nDraws = 0, busy = false;
  const stage = h('div', { class: 'mb-stage' }), tally = h('div', { class: 'gfx-tally' }), live = h('div', { class: 'sr-only', 'aria-live': 'polite' });
  const total = () => Object.values(counts).reduce((a, b) => a + b, 0);
  function pieces() { const list = []; Object.entries(counts).forEach(([c, n]) => { for (let i = 0; i < n; i++) list.push(c); }); return list; }
  function drawBag() {
    clear(stage);
    const list = pieces(), box = sv('svg', { viewBox: '0 0 260 220', class: 'mb-svg', role: 'img', 'aria-label': 'A bag holding ' + (Object.entries(counts).filter((e) => e[1]).map((e) => `${e[1]} ${e[0]}`).join(', ') || 'no') + ' marbles' });
    box.append(sv('path', { d: 'M82 70C70 90 40 112 40 156c0 38 40 58 90 58s90-20 90-58c0-44-30-66-42-86z', fill: 'color-mix(in srgb, var(--accent) 16%, var(--panel2))', stroke: 'var(--accent)', 'stroke-width': 4 }));
    list.forEach((c, i) => {
      const a = i * 2.39996, r = 16 + Math.sqrt(i) * 22, x = 130 + Math.cos(a) * Math.min(r, 74), y = 152 + Math.sin(a) * Math.min(r * 0.6, 46);
      const gx = sv('g', { class: 'mb-marble', 'data-i': i, style: `animation-delay:${(i % 7) * 0.23}s`, transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})` },
        sv('circle', { r: 11, fill: MCOL[c], stroke: 'rgba(0,0,0,.45)', 'stroke-width': 1.5 }), sv('circle', { cx: -3.5, cy: -4, r: 3, fill: 'rgba(255,255,255,.55)' }),
        sv('text', { 'text-anchor': 'middle', y: 4, 'font-size': 10, 'font-weight': 800, fill: ['white', 'yellow', 'pink'].includes(c) ? '#222' : '#fff' }, c[0].toUpperCase()));
      box.append(gx);
    });
    box.append(sv('path', { d: 'M82 70c14 10 32 14 48 14s34-4 48-14l-6-14c-12 8-26 10-42 10s-30-2-42-10z', fill: 'var(--accent)', opacity: .85 }));
    stage.append(box);
    drawTally();
  }
  function drawTally() {
    clear(tally);
    tally.append(h('span', { class: 'gfx-count' }, `In the bag: ${Object.entries(counts).filter((e) => e[1]).map((e) => `${e[1]} ${e[0]}`).join(' · ') || 'empty'}`));
    if (nDraws) Object.keys(counts).filter((c) => counts[c]).forEach((c) => tally.append(h('span', { class: 'gfx-count' }, `${c}: drawn ${draws[c] || 0} of ${nDraws}`)));
  }
  function pick() { const list = pieces(); return list.length ? list[Math.floor(Math.random() * list.length)] : null; }
  async function drawOne() {
    if (busy || !total()) return; busy = true;
    const i = Math.floor(Math.random() * total()), list = pieces(), c = list[i], el = stage.querySelector(`.mb-marble[data-i="${i}"]`);
    if (el) { el.classList.add('out'); await sleep(900); el.classList.remove('out'); }
    draws[c] = (draws[c] || 0) + 1; nDraws++; drawTally(); live.textContent = `Drew ${c}. Put it back.`; busy = false;
  }
  function drawMany(n) { if (!total()) return; for (let k = 0; k < n; k++) { const c = pick(); draws[c] = (draws[c] || 0) + 1; nDraws++; } drawTally(); live.textContent = `${n} more draws done. ${nDraws} draws in all.`; }
  const editor = h('details', { class: 'mb-edit', open: parsed ? null : '' }, h('summary', null, parsed ? 'Does the bag not match your question? Change it' : 'Set the bag to match your question'),
    h('div', { class: 'mb-inputs' }, Object.keys(MCOL).map((c) => { const id = 'mb-' + c + Math.random().toString(36).slice(2, 6), inp = h('input', { class: 'input num', type: 'number', min: 0, max: 40, value: counts[c] || 0, id, inputmode: 'numeric' }); inp.addEventListener('input', () => { counts[c] = Math.max(0, Math.min(40, Math.floor(+inp.value) || 0)); Object.keys(draws).forEach((k) => delete draws[k]); nDraws = 0; drawBag(); }); return h('label', { for: id, class: 'mb-in' }, h('i', { style: `background:${MCOL[c]}` }), c, inp); })));
  const root = h('div', { class: 'helper mbag', role: 'group', 'aria-label': 'Animated bag of marbles' },
    h('div', { class: 'gfx-head' }, h('strong', null, 'The bag of marbles'), h('span', { class: 'chip' }, 'ILLUSTRATION · NOT GRADED')),
    h('p', { class: 'gfx-blurb' }, parsed ? 'This bag is built from the numbers in the question. Draw a marble: it goes back in the bag every time.' : 'Enter the counts from the question, then draw. Each marble goes back in the bag after it is drawn.'),
    stage, tally, h('div', { class: 'gfx-ctl' }, h('button', { class: 'btn btn-sm btn-primary', type: 'button', onclick: drawOne }, 'Draw one marble'), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => drawMany(10) }, 'Draw 10'), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => drawMany(100) }, 'Draw 100'),
      h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { Object.keys(draws).forEach((k) => delete draws[k]); nDraws = 0; drawTally(); } }, 'Clear tally')),
    editor, live);
  drawBag();
  return root;
}

// ============================================================================================ walk-through calculators
// Each mode lists the numbers to plug in, one step at a time.  The student does the arithmetic on the calculator; no mode shows a final result.
const joinX = (a) => a.join(' × ');
const MODES = {
  implied: {
    title: 'Odds walk-through', intro: 'Type the odds from the question and I will show you which numbers to plug in. You do the division.',
    fields: [{ id: 'odds', label: 'The American odds (like −150 or +200)', ph: '−150' }],
    steps(v) {
      const raw = String(v.odds || '').trim(), n = Math.abs(num(raw)), neg = /^[−–-]/.test(raw);
      if (!raw) return { hint: 'Type the odds first.' };
      if (!(n >= 100)) return { hint: 'American odds are written like −150 or +200: the number is 100 or more.' };
      const top = neg ? n : 100, bottom = n + 100;
      return [
        { t: 'Is it a minus or a plus?', b: neg ? `**Minus (−${n})** means a favorite: you must risk **$${n}** to win **$100**.` : `**Plus (+${n})** means an underdog: you risk **$100** to win **$${n}**.` },
        { t: 'Find the two numbers', b: `Top number: **${top}**.\n\nBottom number: **${n} + 100 = ${bottom}**.` },
        { t: 'Type this into the calculator', plug: `${top} ÷ ${bottom}`, b: 'The calculator shows a decimal.' },
        { t: 'Make it a percent', b: 'Multiply the decimal by 100 (or slide the point two places right). Round the way the question asks.' },
        { t: 'What the number means', b: 'This is the **break-even rate**: the share of bets you must win just to get your money back. A fair coin flip is 50%. Now compare this rate with the team’s real chance of winning.' }
      ];
    }
  },
  parlay: {
    title: 'Parlay walk-through', intro: 'Type the chance each leg wins (separate with commas). I will set up the multiplication. You do it on the calculator.',
    fields: [{ id: 'legs', label: 'Chance each leg wins (like 60, 55, 70)', ph: '60, 55, 70' }],
    steps(v) {
      const vals = String(v.legs || '').split(/[,;\n]| and /).map((s) => num(s)).filter((x) => isFinite(x) && x > 0);
      if (!vals.length) return { hint: 'Type each leg’s chance with a comma between them.' };
      const dec = vals.map((x) => (x > 1 ? x / 100 : x)); if (dec.some((x) => x > 1)) return { hint: 'A chance can’t be more than 100%.' };
      const lowest = Math.round(Math.min(...dec) * 1000) / 10;
      return [
        { t: 'Change each chance to a decimal', b: dec.map((d, i) => `Leg ${i + 1}: **${fmt(d, 4)}**`).join('\n\n') },
        { t: 'Every leg must win', b: 'The word **and** means **multiply**.', plug: joinX(dec.map((d) => fmt(d, 4))) },
        { t: 'Make it a percent', b: 'Multiply the decimal you get by 100.' },
        { t: 'Reality check', b: `Your answer must be **smaller than ${lowest}%** (your weakest leg). If it is not, check the multiplication.` }
      ];
    }
  },
  skill: {
    title: 'Skill-or-luck walk-through', intro: 'Fill in what the question tells you. I will show the comparison to make. You do the arithmetic.',
    fields: [{ id: 'bets', label: 'How many bets did she make?', ph: '50' }, { id: 'rate', label: 'What % would she win by luck alone?', ph: '50' }, { id: 'wins', label: 'How many did she actually win?', ph: '31' }],
    steps(v) {
      const bets = num(v.bets), rate = num(v.rate), wins = num(v.wins);
      if (![bets, rate, wins].every((x) => isFinite(x) && x >= 0)) return { hint: 'Fill in all three boxes with numbers.' };
      return [
        { t: 'What luck alone would give', b: 'Expected wins = bets × chance of winning one.', plug: `${bets} × ${rate} ÷ 100` },
        { t: 'Compare with her real record', b: `She really won **${wins}**. Subtract the expected wins you just found from **${wins}**.`, plug: `${wins} − (your answer to step 1)` },
        { t: 'Is the gap big?', b: 'Divide the gap by the number of bets to see how many wins per bet she is ahead. A small gap over a short record is easy to get by luck. Try “One bettor, 200 slips” in the lab to see how streaks happen with no skill at all.' },
        { t: 'Think like a scientist', b: 'Proof of skill needs a **big gap** and a **long record** that holds up. One hot streak is not proof.' }
      ];
    }
  }
};
export function walkCalc(mode, opts) {
  const M = MODES[mode], vals = {}, o = opts || {};
  let shown = 1;
  const stepsHost = h('ol', { class: 'wk-steps', 'aria-live': 'polite' }), more = h('button', { class: 'btn btn-sm btn-primary', type: 'button' }, 'Show the next step'), msg = h('p', { class: 'muted small' });
  const inputs = M.fields.map((f) => {
    const id = 'wk-' + Math.random().toString(36).slice(2, 8), inp = h('input', { class: 'input', id, placeholder: f.ph, autocomplete: 'off', spellcheck: 'false', inputmode: 'text' });
    if (o.prefill && o.prefill[f.id]) { inp.value = o.prefill[f.id]; vals[f.id] = inp.value; }
    inp.addEventListener('input', () => { vals[f.id] = inp.value; shown = 1; draw(); });
    return h('label', { class: 'wk-f', for: id }, h('span', null, f.label), inp);
  });
  function draw() {
    clear(stepsHost); clear(msg);
    const s = M.steps(vals);
    if (!Array.isArray(s)) { msg.textContent = s.hint; more.hidden = true; return; }
    s.slice(0, shown).forEach((st, i) => stepsHost.append(h('li', { class: 'wk-step' }, h('b', null, `Step ${i + 1}: ${st.t}`), h('div', null, md(st.b)), st.plug ? h('div', { class: 'wk-plug' }, h('span', null, 'Type this: '), h('code', null, st.plug)) : null)));
    more.hidden = shown >= s.length;
    if (shown >= s.length) msg.textContent = 'That is the whole set-up. The Calculator button at the top of the page is there if you need it.';
  }
  more.addEventListener('click', () => { shown++; draw(); announce('Next step shown'); const last = stepsHost.lastElementChild; if (last) last.scrollIntoView({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' }); });
  const root = h('div', { class: 'helper wk', role: 'group', 'aria-label': M.title },
    h('div', { class: 'gfx-head' }, h('strong', null, '🧮 ' + M.title), h('span', { class: 'chip' }, 'HELPER · NOT GRADED')), h('p', { class: 'gfx-blurb' }, M.intro), h('div', { class: 'wk-fields' }, inputs), stepsHost, msg, h('div', { class: 'gfx-ctl' }, more));
  draw();
  return root;
}

// ============================================================================================ nudges (no answers, no attempts used)
const NUDGES = {
  'c1-ledger': ['Each row is one bet. Look at the stake and what came back.', 'Profit on a bet = what you got back − what you staked. A loss gets back $0.', 'Add the wins and the losses separately, then compare the two totals.'],
  'c1-market': ['A price in cents is also a rough chance: 40¢ means about 40%.', 'A contract pays a fixed amount if the event happens and nothing if it does not.', 'Ask two things: does chance decide the outcome, and is money put at risk to join?'],
  'c2-basics': ['Probability compares the marbles you want with **all** the marbles. Find the total first.', 'Odds compare the marbles you want with the marbles you **don’t** want. Which marbles are “not this color”?', 'Probability can be a fraction, decimal or percent. Odds use a colon, like 2 : 5. Check which one each box asks for.'],
  'c2-indep': ['“Independent” means one result does not change the next one.', 'The chance that two independent things both happen: multiply their separate chances.', 'A streak does not make the next flip “due”. The coin has no memory.'],
  'c2-house': ['House edge is the average loss for every dollar bet, written as a percent.', 'House edge = expected loss ÷ amount bet × 100.', 'Short runs wobble. Compare your run with the expected number before deciding anything.'],
  'c2-roulette': ['Count every pocket on the wheel first, green ones too.', 'Chance = pockets that win ÷ all pockets.', 'More spins pull results closer to the math, but the count of wins and losses can still drift apart.'],
  'c4-implied': ['The odds tell you how much you risk to win $100, or how much you win on $100.', 'Use the Odds walk-through below to see which numbers to plug in.', 'The break-even rate is the share of bets you must win just to get your money back.'],
  'c4-parlay': ['Every leg has to win. “And” means multiply.', 'Change each chance to a decimal before you multiply.', 'Turn your final decimal into a percent by multiplying by 100.'],
  'c4-parlay-table': ['Compare each row with the one above it. What changed?', 'Each new leg multiplies by a number smaller than 1, so the total chance shrinks.', 'Compare the chance of winning with how big the payout is. Is the payout big enough to make up for it?'],
  'c4-eval': ['Expected wins from luck alone = bets × chance of winning one.', 'Compare her real wins with that number. How far apart are they?', 'One hot streak is not proof. A long record matters.'],
  'c4-lottery': ['Ask: how many different tickets are possible in all?', 'Your ticket is one of them, so your chance is 1 out of that total.', 'Compare how tiny that chance is with the price of the ticket.'],
  'c5-riskfree': ['Read exactly what Kai receives: cash, or a bonus bet?', 'A bonus bet’s stake is not paid back, only the winnings.', 'Expected value = (chance × what you receive) added up over every outcome.']
};
// Worked examples: the same steps as the question, on DIFFERENT invented numbers, so a student can copy the method and plug in their own.
const EXAMPLES = {
  'c1-ledger': ['Bet A: staked **$40**, got back **$90**. Profit = 90 − 40 = **$50**.', 'Bet B: staked **$25**, got back **$0**. Profit = 0 − 25 = **−$25**.', 'Net result = 50 + (−25) = **$25**.'],
  'c1-market': ['A contract costs **35¢**. That is about a **35%** chance.', 'It pays **$1.00** if the event happens, **$0** if not.', 'If it happens: profit = 100¢ − 35¢ = **65¢**. If not: you lose the **35¢**.'],
  'c2-basics': ['Bag: **6 purple** and **9 orange**. Total = 6 + 9 = **15**.', 'Probability of purple = 6 ÷ 15 = **0.4**, which is **40%**.', 'Odds of purple = purple : not purple = 6 : 9, which simplifies to **2 : 3**.'],
  'c2-indep': ['Chance of rolling a 6 is **1 ÷ 6** each time, and each roll is independent.', 'Two sixes in a row: 1/6 × 1/6 = **1/36**.', '1 ÷ 36 = 0.0278, which is about **2.8%**.'],
  'c2-house': ['A game averages a loss of **$0.50** on every **$10** bet.', 'House edge = 0.50 ÷ 10 × 100 = **5%**.', 'Over 200 bets the expected loss is 200 × 0.50 = **$100**.'],
  'c2-roulette': ['An American wheel has **38** pockets. A “dozen” bet covers **12** of them.', 'Chance = 12 ÷ 38 = 0.3158, which is about **31.6%**.', 'In a short run the result can be far from 31.6%. Over thousands of spins it gets close.'],
  'c4-implied': ['Odds **−175**: top = **175**, bottom = 175 + 100 = **275**.', '175 ÷ 275 = 0.636, so break-even is about **63.6%**.', 'Odds **+240**: top = **100**, bottom = 240 + 100 = **340**. 100 ÷ 340 = 0.294, about **29.4%**.'],
  'c4-parlay': ['Legs win **80%**, **50%** and **40%** of the time. As decimals: 0.8, 0.5, 0.4.', 'Multiply: 0.8 × 0.5 × 0.4 = **0.16**, which is **16%**.', 'Check: 16% is smaller than the weakest leg (40%). Good.'],
  'c4-parlay-table': ['Every leg has a **60%** chance (0.6).', '1 leg: **60%**. 2 legs: 0.6 × 0.6 = **0.36** (36%). 3 legs: 0.36 × 0.6 = **0.216** (21.6%).', 'Each added leg multiplies by 0.6, so the chance keeps shrinking.'],
  'c4-eval': ['She makes **40** bets and luck alone would win **50%**.', 'Expected wins = 40 × 50 ÷ 100 = **20**. Suppose she won **27**: gap = 27 − 20 = **7**.', '7 ÷ 40 = 0.175, so she is about **17.5 points** ahead of luck. Is 40 bets long enough to prove skill?'],
  'c4-lottery': ['Pick **2 different digits** from 0 to 9, in order. First choice: **10** ways. Second: **9** ways left.', 'Total tickets = 10 × 9 = **90**.', 'Chance of winning = 1 ÷ 90 = 0.0111, about **1.1%**.'],
  'c5-riskfree': ['A bonus bet of **$40** wins **$120** cash with a **25%** chance, and $0 otherwise.', 'Expected value = 0.25 × 120 + 0.75 × 0 = **$30**.', 'Compare the **$30** with the **$40** face value of the bonus bet.']
};
export function nudgeBox(id) {
  const list = NUDGES[id]; if (!list) return null;
  const ex = EXAMPLES[id], total = list.length + (ex ? 1 : 0);
  let n = 0;
  const shown = h('ol', { class: 'nd-list', 'aria-live': 'polite' }), btn = h('button', { class: 'btn btn-sm', type: 'button' }, 'Stuck? Get a nudge');
  btn.addEventListener('click', () => {
    if (n < list.length) shown.append(h('li', null, md(list[n])));
    else shown.append(h('li', { class: 'nd-example-li' }, h('div', { class: 'nd-example' }, h('b', null, 'Worked example (different numbers from your question)'), h('ol', null, ex.map((x) => h('li', null, md(x)))), h('p', { class: 'muted small' }, 'Now repeat these same steps with the numbers in your question.'))));
    n++;
    btn.textContent = n >= total ? 'No more nudges' : n === total - 1 && ex ? `Show a worked example (${n} of ${total} used)` : `Another nudge (${n} of ${total} used)`; btn.disabled = n >= total;
  });
  return h('div', { class: 'helper nudge' }, h('div', { class: 'nd-row' }, btn, h('span', { class: 'muted small' }, 'Nudges never use your question’s numbers and never use up an attempt.')), shown);
}

// ============================================================================================ bonus bet explainer
export function bonusLab() {
  const st = { n: 0, cash: 0, wins: 0 }, out = h('div', { class: 'bl-out', 'aria-live': 'polite' }), coin = h('div', { class: 'coin3d bl-coin', 'aria-hidden': 'true' }, '$');
  const flip = () => Math.random() < 0.5;
  function show(last) {
    clear(out);
    out.append(h('div', { class: 'gfx-tally' }, h('span', { class: 'gfx-count' }, `Bonus bets played: ${st.n}`), h('span', { class: 'gfx-count' }, `Won: ${st.wins}`), h('span', { class: 'gfx-count' }, `Cash received in all: $${st.cash.toLocaleString('en-US')}`), st.n ? h('span', { class: 'gfx-count is-warn' }, `Average cash per bonus bet: $${fmt(st.cash / st.n, 2)}`) : null));
    if (last) out.append(h('p', { class: 'gfx-result' }, last));
  }
  async function once() { coin.classList.remove('flip'); void coin.offsetWidth; coin.classList.add('flip'); await sleep(620); const w = flip(); st.n++; if (w) { st.wins++; st.cash += 100; } show(w ? 'Won: Kai receives $100 cash. The $100 bonus token is used up.' : 'Lost: Kai receives $0.'); }
  function many() { for (let i = 0; i < 1000; i++) { st.n++; if (flip()) { st.wins++; st.cash += 100; } } show(`1,000 more bonus bets played.`); }
  show();
  return h('div', { class: 'helper bonus', role: 'group', 'aria-label': 'Bonus bet explainer' },
    h('div', { class: 'gfx-head' }, h('strong', null, 'How a bonus bet works'), h('span', { class: 'chip' }, 'ILLUSTRATION · NOT GRADED')),
    h('div', { class: 'bl-flow' },
      h('div', { class: 'bl-box' }, h('b', null, '1. First bet'), h('span', null, 'Kai bets $100 and loses.')), h('span', { class: 'bl-arrow', 'aria-hidden': 'true' }, '→'),
      h('div', { class: 'bl-box' }, h('b', null, '2. Bonus bet'), h('span', null, 'Kai gets a $100 bonus token. It is credit, not cash.')), h('span', { class: 'bl-arrow', 'aria-hidden': 'true' }, '→'),
      h('div', { class: 'bl-box' }, h('b', null, '3. Use it'), h('span', null, 'Even-money bet, 50% chance. Win: $100 cash. Lose: nothing.'))),
    h('div', { class: 'gfx-stage' }, coin), out,
    h('div', { class: 'gfx-ctl' }, h('button', { class: 'btn btn-sm btn-primary', type: 'button', onclick: once }, 'Use the bonus bet once'), h('button', { class: 'btn btn-sm', type: 'button', onclick: many }, 'Use it 1,000 times'), h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { st.n = st.cash = st.wins = 0; show(); } }, 'Clear')));
}

// ============================================================================================ ad gallery
export function adGallery() {
  const ADS = (window.U5D && window.U5D.ADS) || [];
  if (!ADS.length) return null;
  return h('div', { class: 'helper adgal', role: 'group', 'aria-label': 'The six fictional ads, animated' },
    h('div', { class: 'gfx-head' }, h('strong', null, 'The six ads in motion'), h('span', { class: 'chip' }, 'FICTIONAL ADS · NOT GRADED')),
    h('p', { class: 'gfx-blurb' }, 'Each picture goes with one ad. Watch what the animation makes you feel, then decide what technique the ad is using.'),
    h('div', { class: 'adgal-grid' }, ADS.map((a) => h('figure', { class: 'adgal-card' }, h('div', { class: 'adfx' }, adArt(a.id)), h('figcaption', null, h('b', null, a.brand), h('span', { class: 'muted small' }, a.head.replace(/[“”]/g, '')))))));
}

// ============================================================================================ what each question gets
/** Returns a Node holding every helper this question has, or null. */
export function helperFor(item) {
  const id = item.id, nodes = [];
  if (id === 'c2-basics') { const found = parseMarbles(itemText(item)); nodes.push(marbleBag(found || { red: 3, blue: 5 }, !!found)); }
  if (id === 'c4-implied') nodes.push(walkCalc('implied'));
  if (id === 'c4-parlay' || id === 'c4-parlay-table') nodes.push(walkCalc('parlay'));
  if (id === 'c4-eval') nodes.push(walkCalc('skill'));
  if (id === 'c5-match') nodes.push(adGallery());
  if (id === 'c5-riskfree') nodes.push(bonusLab());
  const nd = nudgeBox(id); if (nd) nodes.push(nd);
  const real = nodes.filter(Boolean);
  return real.length ? h('div', { class: 'helpers' }, real) : null;
}
