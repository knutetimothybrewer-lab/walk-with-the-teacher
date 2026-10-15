// Question helpers: look-alike skins, a bag of marbles, walk-through calculators, nudges, a bonus-bet explainer and an ad gallery.
// Everything here is keyed by question id (see docs/BLUEPRINT.md) and works from what the question already shows, so it needs no change to the
// private question bank.  Helpers NEVER state an answer: they show the setup (what to plug in) and the student does the arithmetic.
// Nothing here is graded, stored or sent to the server.
import { h, md, clear, fmt, announce, reducedMotion } from './util.js';
import { adArt } from './fxads.js';
import { renderBlocks } from './blocks.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, reducedMotion() ? 0 : ms));
const num = (s) => parseFloat(String(s == null ? '' : s).replace(/[−–]/g, '-').replace(/[,%$\s]/g, ''));
const SVGNS = 'http://www.w3.org/2000/svg';
const sv = (tag, attrs, ...kids) => { const el = document.createElementNS(SVGNS, tag); for (const [k, v] of Object.entries(attrs || {})) el.setAttribute(k, v); kids.flat().forEach((k) => el.append(k instanceof Node ? k : document.createTextNode(String(k)))); return el; };

/** All the readable text of an item (prompt, stimulus, and the wording of its response parts), used only to find numbers the question already shows. */
function itemText(item) {
  const out = [item.prompt || ''];
  (item.stim || []).forEach((b) => {
    ['t', 'body', 'head', 'cap'].forEach((k) => b[k] && out.push(b[k]));
    (b.items || []).forEach((x) => out.push(x));
    (b.cols || []).forEach((x) => out.push(x));
    (b.rows || []).forEach((r) => out.push(r.join(' ')));
    (b.msgs || []).forEach((m) => out.push(m.t));
  });
  (item.parts || []).forEach((p) => { if (p.prompt) out.push(p.prompt); (p.fields || []).forEach((f) => out.push(f.label)); });
  return out.join('\n');
}
const tables = (item) => (item.stim || []).filter((b) => b.k === 'table');
const plain = (x) => String(x).replace(/[$,%×\s]/g, '').replace(/[−–]/g, '-').replace(/\*\*/g, '');
const dollars = (n) => '$' + Number(n).toLocaleString('en-US');

// ============================================================================================ skins
// Look-alike chrome around a question's own data: a sportsbook "My Bets" screen and an event-contract market.  The data is never changed.
const SKIN = { 'c1-ledger': 'book', 'c1-market': 'market' };
const ODDS = /^[+−\-–]\s?\d{3,4}$/, RESULT = /^(won|win|lost|loss|push|void|pending|open|cashed out)$/i, PRICE = /^(\$?0?\.\d{1,2}|\d{1,2}\s?¢|\d{1,3}(\.\d+)?\s?%)$/;

function decorateBook(root) {
  root.querySelectorAll('.b-tablewrap').forEach((wrap) => {
    const t = wrap.querySelector('table.b-table'); if (!t) return;
    const heads = Array.from(t.querySelectorAll('thead th')).map((th) => th.textContent.trim()), rows = Array.from(t.querySelectorAll('tbody tr'));
    if (heads.length === 2) {          // an account-statement style table: label + amount
      const box = h('div', { class: 'bk-statement', role: 'group', 'aria-label': t.querySelector('caption') ? t.querySelector('caption').textContent : 'Account statement' },
        h('div', { class: 'bk-st-head' }, h('span', null, heads[0]), h('span', null, heads[1])),
        rows.map((tr) => { const cells = Array.from(tr.children).map((c) => c.textContent.trim()); return h('div', { class: 'bk-st-row' }, h('span', { class: 'bk-st-k' }, cells[0]), h('b', { class: 'bk-st-v' + (/\(\d/.test(cells[1]) ? ' badge' : '') }, cells[1])); }));
      wrap.replaceWith(box); return;
    }
    t.classList.add('bk-table');
    t.querySelectorAll('td, th[scope="row"]').forEach((c) => {
      const x = c.textContent.trim();
      if (ODDS.test(x)) { c.textContent = ''; c.append(h('span', { class: 'odds-pill ' + (/^\+/.test(x) ? 'pos' : 'neg') }, x)); }
      else if (RESULT.test(x)) { c.textContent = ''; c.append(h('span', { class: 'res-badge res-' + (/^(won|win|cashed out)$/i.test(x) ? 'won' : /^(lost|loss)$/i.test(x) ? 'lost' : 'push') }, x)); }
      else if (/^[−\-–]\s?\$/.test(x)) c.classList.add('money-neg');
      else if (/^\+\s?\$/.test(x)) c.classList.add('money-pos');
    });
  });
}
function decorateMarket(root) {
  root.querySelectorAll('table.b-table').forEach((t) => {
    t.classList.add('mk-table');
    const heads = Array.from(t.querySelectorAll('thead th')).map((th) => th.textContent.trim());
    heads.forEach((txt, i) => { const th = t.querySelectorAll('thead th')[i]; if (/\byes\b/i.test(txt)) th.classList.add('yes'); else if (/^no\b|\bno\s*\(|\bno price/i.test(txt)) th.classList.add('no'); });
    t.querySelectorAll('tbody tr').forEach((tr) => Array.from(tr.children).forEach((c, i) => {
      const x = c.textContent.trim(), col = heads[i] || '';
      if (!PRICE.test(x)) return;
      const kind = /\byes\b/i.test(col) ? 'yes' : /^no\b|\bno\s*\(|\bno price/i.test(col) ? 'no' : '';
      c.textContent = '';
      if (kind) c.append(h('span', { class: 'mk-btn ' + kind }, (kind === 'yes' ? 'Yes ' : 'No ') + x));
      else if (/chance|prob|implied|odds|likel/i.test(col) && /%$/.test(x)) c.append(h('span', { class: 'mk-meter', 'aria-label': x }, h('i', { style: `width:${Math.min(100, Math.max(0, parseFloat(x)))}%` }), h('b', null, x)));
      else c.append(h('span', { class: 'mk-price' }, x));
    }));
  });
}
/** An event-contract card (question, big chance, Yes/No prices, rules) built from the text of a prediction-market ad block. Null if the ad has no price in cents. */
function marketCard(b) {
  const body = String(b.body || ''), q = (/Will [^?]+\?/.exec(body) || [])[0], cents = (/(\d{1,2})\s?¢/.exec(body) || [])[1];
  if (!q || !cents) return null;
  const yes = +cents, no = 100 - yes, rules = body.replace(q, '').trim();
  const pts = [yes + 9, yes + 4, yes + 11, yes + 2, yes + 6, yes - 3, yes + 3, yes - 5, yes + 1, yes].map((v) => Math.max(3, Math.min(97, v)));
  const spark = sv('svg', { viewBox: '0 0 160 48', class: 'mk-spark', role: 'img', 'aria-label': 'Decorative price history' },
    sv('polyline', { points: pts.map((v, i) => `${(i * 160 / 9).toFixed(1)},${(48 - v * 0.46).toFixed(1)}`).join(' '), fill: 'none', stroke: '#1f6feb', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }),
    sv('circle', { cx: 160, cy: (48 - yes * 0.46).toFixed(1), r: 4, fill: '#1f6feb', class: 'mk-dot' }));
  return h('div', { class: 'mk-card', role: 'group', 'aria-label': 'Fictional event contract from ' + b.brand },
    h('div', { class: 'mk-top' }, h('span', { class: 'mk-brand' }, b.brand), h('span', { class: 'mk-cat' }, 'Event contract')),
    h('h3', { class: 'mk-q' }, q),
    h('div', { class: 'mk-mid' }, h('div', { class: 'mk-big' }, h('b', null, yes + '%'), h('span', null, 'chance')), spark),
    h('div', { class: 'mk-buy' }, h('span', { class: 'mk-btn yes big' }, `Yes ${yes}¢`), h('span', { class: 'mk-btn no big' }, `No ${no}¢`)),
    h('p', { class: 'mk-rules' }, md(rules)));
}
export function skinFor(item) {
  const kind = SKIN[item.id]; if (!kind) return renderBlocks(item.stim);
  const brand = kind === 'book' ? 'MAPLE RIDGE' : 'EVENTX';
  const head = kind === 'book'
    ? h('div', { class: 'skin-head' }, h('span', { class: 'skin-logo' }, h('i', { 'aria-hidden': 'true' }, '▲'), brand), h('span', { class: 'skin-tabs', 'aria-hidden': 'true' }, h('b', null, 'Sportsbook'), h('b', null, 'Live'), h('b', { class: 'on' }, 'My Bets'), h('b', null, 'Account')), h('span', { class: 'chip' }, 'FICTIONAL SPORTSBOOK'))
    : h('div', { class: 'skin-head' }, h('span', { class: 'skin-logo' }, h('i', { 'aria-hidden': 'true' }, '◆'), brand), h('span', { class: 'skin-tabs', 'aria-hidden': 'true' }, h('b', { class: 'on' }, 'Markets'), h('b', null, 'Weather'), h('b', null, 'Economy'), h('b', null, 'Sports')), h('span', { class: 'chip' }, 'FICTIONAL MARKET'));
  const body = document.createDocumentFragment();
  (item.stim || []).forEach((b) => { const card = kind === 'market' && b.k === 'ad' ? marketCard(b) : null; body.append(card || renderBlocks([b])); });
  const box = h('div', { class: 'skin skin-' + kind }, head, h('div', { class: 'skin-body' }, body));
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
// Each mode lists the numbers to plug in, one step at a time, using the numbers the question already shows (prefilled, and editable).
// The student does the arithmetic on the calculator; no mode shows a final result.
const joinX = (a) => a.join(' × ');
const choose = (n, k) => { let c = 1; for (let i = 1; i <= k; i++) c = (c * (n - k + i)) / i; return Math.round(c); };
const amMult = (raw) => { const n = Math.abs(num(raw)), neg = /^[−–-]/.test(String(raw).trim()); return neg ? 1 + 100 / n : 1 + n / 100; };
const MODES = {
  marbles: {
    title: 'Marbles walk-through', intro: 'The numbers come from the bag in your question. Change them if they are wrong.',
    fields: [{ id: 'want', label: 'Marbles of the color you want', ph: '4' }, { id: 'other', label: 'All the other marbles', ph: '11' }],
    steps(v) {
      const a = num(v.want), b = num(v.other); if (![a, b].every((x) => isFinite(x) && x >= 0)) return { hint: 'Fill in both boxes with numbers.' };
      return [
        { t: 'Count all the marbles', b: `Total = ${a} + ${b}.`, plug: `${a} + ${b}` },
        { t: 'Probability: wanted out of ALL', b: 'Probability = marbles you want ÷ all the marbles. You can give it as a fraction, a decimal or a percent.', plug: `${a} ÷ (the total from step 1)` },
        { t: 'Odds: wanted compared with NOT wanted', b: `Odds use a colon: wanted : other. Here that is **${a} : ${b}**. Simplify it if both numbers share a factor (the question accepts it either way).` }
      ];
    }
  },
  hold: {
    title: 'Hold walk-through', intro: 'The numbers come from the ledger in your question. Change them if they are wrong.',
    fields: [{ id: 'w', label: 'Total wagered ($)', ph: '2400000' }, { id: 'p', label: 'Total paid back to bettors ($)', ph: '2148000' }],
    steps(v) {
      const w = num(v.w), p = num(v.p); if (![w, p].every((x) => isFinite(x) && x > 0)) return { hint: 'Fill in both boxes with dollar amounts.' };
      return [
        { t: 'Money the sportsbook kept', b: 'Kept = wagered − paid back.', plug: `${w} − ${p}` },
        { t: 'Turn it into a percent of the money wagered', b: 'Hold = kept ÷ wagered × 100.', plug: `(your answer to step 1) ÷ ${w} × 100` },
        { t: 'Part B: totals versus individuals', b: 'The hold looks at **all** the money together. Many individual bettors can finish ahead while the total still favors the sportsbook.' }
      ];
    }
  },
  market: {
    title: 'Expected profit walk-through', intro: 'The price comes from the contract in your question. Change it if it is wrong.',
    fields: [{ id: 'c', label: 'Price of one YES share (cents)', ph: '40' }, { id: 'fee', label: 'Fee on a winner’s profit (%)', ph: '2' }],
    steps(v) {
      const c = num(v.c), fee = num(v.fee); if (!(c > 0 && c < 100) || !(fee >= 0)) return { hint: 'Type the price in cents (like 40) and the fee percent (like 2).' };
      const price = c / 100;
      return [
        { t: 'Chance of winning and of losing', b: `Assume the price is the true chance. YES wins **${c}%** of the time, so it loses **${100 - c}%** of the time. As decimals: **${price}** and **${fmt(1 - price, 2)}**.` },
        { t: 'Profit if it wins', b: `A winning share pays $1.00 and cost $${price}.`, plug: `1 − ${price}` },
        { t: 'Take off the fee', b: `The fee is ${fee}% of that profit.`, plug: `(profit) − ${fee / 100} × (profit)` },
        { t: 'Put it together', b: `Expected profit = (chance of winning × profit after the fee) − (chance of losing × $${price}).`, plug: `${price} × (profit after fee) − ${fmt(1 - price, 2)} × ${price}` },
        { t: 'Read the sign', b: 'A negative answer means an expected **loss** per share. The question wants dollars, so keep the decimal.' }
      ];
    }
  },
  implied: {
    title: 'Odds walk-through', intro: 'Type odds (or tap one from your question) and I will show which numbers to plug in. You do the division.',
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
        { t: 'Make it a percent', b: 'Multiply the decimal by 100 (or slide the point two places right). Round to one decimal place.' },
        { t: 'What the number means', b: 'This is the **break-even rate**: the share of bets you must win just to get your money back. A fair coin flip is 50%.' }
      ];
    }
  },
  parlay: {
    title: 'Parlay walk-through', intro: 'The chances and odds come from the table in your question. Change them if they are wrong.',
    fields: [{ id: 'legs', label: 'Chance each leg wins (decimals or %, separated by commas)', ph: '0.68, 0.7, 0.59' }, { id: 'odds', label: 'Odds of each leg, same order (like −250, −280, −165)', ph: '−250, −280, −165' }],
    steps(v) {
      const vals = String(v.legs || '').split(/[,;\n]/).map((x) => num(x)).filter((x) => isFinite(x) && x > 0);
      if (!vals.length) return { hint: 'Type each leg’s chance with a comma between them.' };
      const dec = vals.map((x) => (x > 1 ? x / 100 : x)); if (dec.some((x) => x > 1)) return { hint: 'A chance can’t be more than 100%.' };
      const odds = String(v.odds || '').split(/[,;\n]/).map((x) => x.trim()).filter(Boolean), haveOdds = odds.length === dec.length && odds.every((o) => Math.abs(num(o)) >= 100);
      const out = [
        { t: 'Every leg must win', b: 'The word **and** means **multiply**. Use each chance as a decimal.', plug: joinX(dec.map((d) => fmt(d, 4))) },
        { t: 'Check your multiplication', b: `The answer must be **smaller than ${Math.round(Math.min(...dec) * 1000) / 10}%** (the weakest leg), because every extra leg can only lower it.` }
      ];
      if (haveOdds) {
        const mults = odds.map(amMult);
        out.push({ t: 'Payout multiplier for each leg', b: odds.map((o, i) => (/^[−–-]/.test(o) ? `${o}: 1 + 100 ÷ ${Math.abs(num(o))} = **${fmt(mults[i], 4)}**` : `${o}: 1 + ${Math.abs(num(o))} ÷ 100 = **${fmt(mults[i], 4)}**`)).join('\n\n') },
          { t: 'Multiply the payouts', b: 'The payouts multiply too.', plug: joinX(mults.map((m) => fmt(m, 4))) },
          { t: 'Expected result for $100', b: 'Expected result = (chance all win × $100 × payout multiplier) − $100.', plug: `(chance all win) × 100 × (payout multiplier) − 100` });
      } else out.push({ t: 'Expected result (optional)', b: 'Type the odds of each leg in the second box and I will set up the expected result too.' });
      return out;
    }
  },
  evrow: {
    title: 'Expected-result walk-through', intro: 'Tap a row from your table to fill in its numbers.',
    fields: [{ id: 'p', label: 'Chance all legs win (decimal)', ph: '0.0625' }, { id: 'm', label: 'Payout multiplier', ph: '13.25' }],
    steps(v) {
      const p = num(v.p), m = num(v.m); if (![p, m].every((x) => isFinite(x) && x > 0)) return { hint: 'Fill in both numbers from a row of the table.' };
      return [
        { t: 'Multiply the chance by the payout', b: 'This is what you expect to get back for every $1 staked.', plug: `${p} × ${m}` },
        { t: 'Subtract the $1 you staked', b: 'Expected result per $1 = (what you get back) − 1.', plug: `(your answer to step 1) − 1` },
        { t: 'Read the sign', b: 'A negative number is an expected **loss** per dollar. Keep it as a decimal, like −0.35.' }
      ];
    }
  },
  tail: {
    title: 'At-least-this-many walk-through', intro: 'The bets and wins come from the question. Every bet is a 50/50 for someone with no skill, so counting is all you need.',
    fields: [{ id: 'n', label: 'Number of bets', ph: '8' }, { id: 'k', label: 'Wins she had', ph: '6' }],
    steps(v) {
      const n = Math.round(num(v.n)), k = Math.round(num(v.k)); if (!(n >= 1 && n <= 20 && k >= 0 && k <= n)) return { hint: 'Type the number of bets (up to 20) and her wins.' };
      const ways = []; for (let j = k; j <= n; j++) ways.push({ j, c: choose(n, j) });
      return [
        { t: 'Count every way the bets could turn out', b: `Each bet can win or lose, so there are 2 × 2 × … (${n} times) different outcomes.`, plug: `2 ^ ${n}   (= ${Math.pow(2, n)})` },
        { t: `Count the ways to win ${k} or more`, b: `Ways to win exactly j bets out of ${n} (from Pascal’s triangle):\n\n${ways.map((w) => `win ${w.j}: **${w.c}** ${w.c === 1 ? "way" : "ways"}`).join('\n\n')}` },
        { t: 'Add those ways', b: 'Add up the ways from step 2.', plug: ways.map((w) => w.c).join(' + ') },
        { t: 'Turn it into a chance', b: 'Chance = (ways to win that many or more) ÷ (all possible outcomes), then × 100 for a percent. The question asks for the nearest percent.', plug: `(your sum) ÷ ${Math.pow(2, n)} × 100` },
        { t: 'Does it prove skill?', b: 'If a bettor with **no skill** gets this record this often, the record does not prove skill.' }
      ];
    }
  },
  lottery: {
    title: 'Lottery walk-through', intro: 'The numbers come from your question. Change them if they are wrong.',
    fields: [{ id: 'big', label: '“1 in …” for the jackpot', ph: '292201338' }, { id: 'small', label: '“1 in …” for the other event', ph: '1000000' }, { id: 'tix', label: 'Number of tickets bought', ph: '3120' }],
    steps(v) {
      const big = num(v.big), small = num(v.small), tix = num(v.tix); if (![big, small, tix].every((x) => isFinite(x) && x > 0)) return { hint: 'Fill in all three boxes with numbers.' };
      return [
        { t: 'How many times more likely?', b: 'A smaller “1 in …” number means more likely. Divide the bigger number by the smaller number.', plug: `${big} ÷ ${small}` },
        { t: 'Chance with many tickets', b: 'Chance of at least one jackpot ≈ tickets ÷ 1-in-N number.', plug: `${tix} ÷ ${big}` },
        { t: 'Make it a percent', b: 'Multiply the decimal by 100. It will be a very small percent, so keep the decimal places the question asks for.', plug: `(your answer to step 2) × 100` }
      ];
    }
  },
  house: {
    title: 'House-edge walk-through', intro: 'The numbers come from the rules table in your question.',
    fields: [{ id: 'win', label: 'Profit when you win (tokens)', ph: '1.8' }, { id: 'loss', label: 'Amount lost when you lose (tokens)', ph: '2' }, { id: 'start', label: 'Starting tokens', ph: '100' }, { id: 'rounds', label: 'Rounds played', ph: '200' }],
    steps(v) {
      const w = num(v.win), l = Math.abs(num(v.loss)), st = num(v.start), r = num(v.rounds); if (![w, l, st, r].every((x) => isFinite(x) && x >= 0)) return { hint: 'Fill in all four boxes.' };
      return [
        { t: 'Chance of winning and losing', b: 'High wins on 4, 5 or 6 and Low wins on 1, 2 or 3, so each round is a **1/2** chance of winning and a **1/2** chance of losing.' },
        { t: 'Expected result for one round', b: 'Multiply each result by its chance and add. A loss counts as negative.', plug: `0.5 × ${w} + 0.5 × (−${l})` },
        { t: 'Expected balance after all the rounds', b: 'Expected balance = starting tokens + rounds × expected result per round.', plug: `${st} + ${r} × (your answer to step 2)` },
        { t: 'Compare with your lab', b: 'Read your own balance in your lab, then subtract the expected balance from step 3: **your balance − expected balance**. A negative answer means you finished below it.' }
      ];
    }
  },
  roulette: {
    title: 'Roulette walk-through', intro: 'The numbers come from your question.',
    fields: [{ id: 'win', label: 'Pockets that win on red', ph: '18' }, { id: 'all', label: 'Pockets on the wheel', ph: '38' }, { id: 'bet', label: 'Total bet in one night ($)', ph: '1000000' }],
    steps(v) {
      const w = num(v.win), a = num(v.all), bet = num(v.bet); if (![w, a, bet].every((x) => isFinite(x) && x > 0) || w >= a) return { hint: 'Fill in all three boxes (winning pockets must be fewer than all pockets).' };
      return [
        { t: 'Winning and losing pockets', b: `**${w}** pockets win. The other **${a} − ${w} = ${a - w}** pockets lose (green ones lose too).` },
        { t: 'Expected result of a $1 bet', b: 'A win gains $1 and a loss costs $1.', plug: `(${w} ÷ ${a}) × 1 + (${a - w} ÷ ${a}) × (−1)` },
        { t: 'House edge', b: 'The house edge is the expected loss per $1, written as a percent. Drop the minus sign and multiply by 100.', plug: `(your answer to step 2, without the minus) × 100` },
        { t: 'The casino’s expected profit', b: 'Expected profit = total bet × house edge **as a decimal**.', plug: `${bet} × (your house edge ÷ 100)` }
      ];
    }
  }
};
export function walkCalc(mode, opts) {
  const M = MODES[mode], vals = {}, o = opts || {};
  let shown = 1;
  const stepsHost = h('ol', { class: 'wk-steps', 'aria-live': 'polite' }), more = h('button', { class: 'btn btn-sm btn-primary', type: 'button' }, 'Show the next step'), msg = h('p', { class: 'muted small' });
  const fieldEls = {};
  const inputs = M.fields.map((f) => {
    const id = 'wk-' + Math.random().toString(36).slice(2, 8), inp = h('input', { class: 'input', id, placeholder: f.ph, autocomplete: 'off', spellcheck: 'false', inputmode: 'text' });
    fieldEls[f.id] = inp;
    if (o.prefill && o.prefill[f.id] != null) { inp.value = o.prefill[f.id]; vals[f.id] = inp.value; }
    inp.addEventListener('input', () => { vals[f.id] = inp.value; shown = 1; draw(); });
    return h('label', { class: 'wk-f', for: id }, h('span', null, f.label), inp);
  });
  const chips = (o.chips || []).length ? h('div', { class: 'wk-chips' }, h('span', { class: 'muted small' }, 'From your question: '), o.chips.map((c) => h('button', { class: 'btn btn-sm', type: 'button', onclick: () => { Object.entries(c.values).forEach(([k, val]) => { if (fieldEls[k]) { fieldEls[k].value = val; vals[k] = val; } }); shown = 1; draw(); } }, c.label))) : null;
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
    h('div', { class: 'gfx-head' }, h('strong', null, '🧮 ' + M.title), h('span', { class: 'chip' }, 'HELPER · NOT GRADED')), h('p', { class: 'gfx-blurb' }, M.intro), chips, h('div', { class: 'wk-fields' }, inputs), stepsHost, msg, h('div', { class: 'gfx-ctl' }, more));
  draw();
  return root;
}

// ============================================================================================ nudges (concept hints, then a worked example on different numbers)
const NUDGES = {
  'c1-ledger': ['The money the sportsbook keeps = total wagered − total paid back.', 'Hold = money kept ÷ total wagered × 100.', 'For part B, compare the TOTAL money with the individual winners. The total can favor the house even when many people finish ahead.'],
  'c1-market': ['A price in cents is also a rough chance: 40¢ means about 40%. The chance of NO is what is left over.', 'Profit if you win = $1.00 − the price. The fee takes a percent of that profit.', 'Expected profit = (chance of winning × profit after fee) − (chance of losing × price).'],
  'c2-basics': ['Probability compares the marbles you want with **all** the marbles. Find the total first.', 'Odds compare the marbles you want with the marbles you **don’t** want. Which marbles are “not red”?', 'Probability can be a fraction, decimal or percent. Odds use a colon, like 2 : 5.'],
  'c2-lab': ['Experimental probability = heads ÷ flips × 100.', 'Count the heads in your first 20 flips in your lab log.', 'Compare the PERCENT of heads with the COUNT gap between heads and tails as the flips grow. They behave differently.'],
  'c2-indep': ['“Independent” means one result does not change the next one.', 'The chance that independent things all happen: multiply their chances. Here that is 1/2 multiplied by itself 7 times.', 'The streak is already over. Only the next flip is uncertain, and it is still 1/2.'],
  'c2-house': ['Expected result per round = (chance of winning × profit) + (chance of losing × the loss). A loss counts as negative.', 'Expected balance = starting tokens + rounds × expected result per round.', 'Your lab balance is one lucky or unlucky run. Compare it with the expected balance by subtracting.'],
  'c2-roulette': ['Count the pockets that win on red, and the pockets that lose (green ones lose too).', 'Expected result of a $1 bet = P(win) × (+1) + P(lose) × (−1). House edge = the expected loss as a percent.', 'Casino expected profit = total bet × house edge as a decimal.'],
  'c3-variable': ['Expected return = add up (sections × tokens) for every row, then divide by the number of sections.', 'Net = expected return − the cost of one spin.', 'A fair game has a net of 0. Then ask what else could explain the urge to keep playing.'],
  'c3-nearmiss': ['Average = add the ratings, then divide by how many ratings there are.', 'Do it twice: only the near-miss rows, then only the obvious-miss rows.', 'A near miss still pays 0. Be careful with strong words like “prove” and “all people.”'],
  'c3-chase': ['Each bet is double the one before it.', 'List the bets in order: first bet, then 2×, 4×, 8×… The 6th bet has doubled five times.', 'A bigger bet raises the money at risk. It does not change the odds.'],
  'c4-implied': ['The odds tell you how much you risk to win $100, or how much you win on $100.', 'Use the Odds walk-through below to see which numbers to plug in.', 'The break-even rate is the share of bets you must win just to get your money back.'],
  'c4-parlay': ['Every leg has to win. “And” means multiply.', 'Use each chance as a decimal. For payouts, a leg at −250 pays back 1 + 100 ÷ 250, and a leg at +150 pays back 1 + 150 ÷ 100.', 'The payout multipliers multiply too. Expected result = chance all win × total returned − the $100 stake.'],
  'c4-parlay-table': ['Multiply the chance of all legs winning by the payout multiplier.', 'Then subtract 1, the dollar you staked.', 'Compare the last column from 1 leg to 8 legs. Is the expected result getting better or worse?'],
  'c4-eval': ['Count how many outcomes there are in total when every bet is a 50/50.', 'Add up the number of ways to win her number of bets or more. Pascal’s triangle gives those counts.', 'Chance = ways ÷ total outcomes. For part B, one hot start is a small sample, and break-even at −110 is about 52.4%.'],
  'c4-lottery': ['To compare two “1 in …” numbers, divide the bigger one by the smaller one.', 'Chance of at least one jackpot ≈ tickets ÷ the “1 in” number.', 'Multiply that decimal by 100 to make it a percent.'],
  'c5-riskfree': ['Read exactly what Kai receives: the bonus bet, and what a win pays in cash.', 'Expected value = chance of winning × cash won. Losing pays $0.', 'Compare your result with the amount in the headline.'],
  'c5-survivor': ['Percent = part ÷ total × 100. Which number is the part, and which is the total?', 'For part B, ask who chooses what gets posted, and what the poster gains.', 'Compare the feed with the all-customer report: which is the fairer sample?']
};
// Worked examples: the same steps on DIFFERENT invented numbers, so a student can copy the method and plug in their own.
const EXAMPLES = {
  'c1-ledger': ['A sportsbook took in **$1,000,000** in bets and paid back **$920,000**.', 'Kept = 1,000,000 − 920,000 = **$80,000**.', 'Hold = 80,000 ÷ 1,000,000 × 100 = **8%**.'],
  'c1-market': ['A YES share costs **35¢** (a 35% chance) and the fee is **2%**.', 'Profit if it wins = 1.00 − 0.35 = **$0.65**. Fee = 2% of 0.65 = **$0.013**, so profit after fee = **$0.637**.', 'Expected = 0.35 × 0.637 − 0.65 × 0.35 = 0.22295 − 0.2275 = **−$0.00455**, a tiny expected loss.'],
  'c2-basics': ['Bag: **6 purple** and **9 orange**. Total = 6 + 9 = **15**.', 'Probability of purple = 6 ÷ 15 = **0.4**, which is **40%**.', 'Odds of purple = purple : not purple = 6 : 9, which simplifies to **2 : 3**.'],
  'c2-lab': ['In **25** flips you see **14** heads.', 'Experimental probability = 14 ÷ 25 × 100 = **56%**.', 'Heads − tails = 14 − 11 = **3**. As flips grow, that gap can grow even while the percent moves toward 50%.'],
  'c2-indep': ['Chance of rolling a 6 is **1 ÷ 6** each time, and each roll is independent.', 'Two sixes in a row: 1/6 × 1/6 = **1/36**.', '1 ÷ 36 = 0.0278, which is about **2.8%**. After the first six, the next roll is still 1/6.'],
  'c2-house': ['A game pays **+0.9** for a win and costs **1** for a loss, each with a 1/2 chance. You start with **50** tokens.', 'Per round: 0.5 × 0.9 + 0.5 × (−1) = **−0.05**.', 'After 100 rounds expect 50 + 100 × (−0.05) = **45** tokens. If you end with 48, then 48 − 45 = **+3**.'],
  'c2-roulette': ['A **37**-pocket wheel has 18 red, 18 black and 1 green. A $1 bet on red: 18 pockets win, **19** lose.', 'Expected = (18 ÷ 37)(+1) + (19 ÷ 37)(−1) = −1 ÷ 37 = **−0.027**, so the house edge is about **2.7%**.', 'On **$400,000** of bets the casino expects about 400,000 × 0.027 = **$10,800**.'],
  'c3-variable': ['A spinner has **5** equal sections: 2 pay 0, 2 pay +2, 1 pays +3. A spin costs **2** tokens.', 'Expected return = (2×0 + 2×2 + 1×3) ÷ 5 = 7 ÷ 5 = **1.4**.', 'Net = 1.4 − 2 = **−0.6** tokens per spin.'],
  'c3-nearmiss': ['Ratings after near misses: **4, 5, 3**. After obvious misses: **2, 1**.', 'Near misses: (4 + 5 + 3) ÷ 3 = 12 ÷ 3 = **4.00**.', 'Obvious misses: (2 + 1) ÷ 2 = 3 ÷ 2 = **1.50**.'],
  'c3-chase': ['Start with a **$3** bet and double after every loss.', 'Bets: $3, $6, $12, $24, $48. The 5th bet is **$48**.', 'The 6th bet doubles again: **$96** (which is 3 × 32).'],
  'c4-implied': ['Odds **−175**: top = **175**, bottom = 175 + 100 = **275**.', '175 ÷ 275 = 0.636, so break-even is about **63.6%**.', 'Odds **+240**: top = **100**, bottom = 240 + 100 = **340**. 100 ÷ 340 = 0.294, about **29.4%**.'],
  'c4-parlay': ['Three legs win **0.80**, **0.50** and **0.40** of the time. Chance all win = 0.8 × 0.5 × 0.4 = **0.16**.', 'Odds −400, −110, +140 pay back 1.25, 1.909 and 2.4. Multiply: 1.25 × 1.909 × 2.4 = **5.727**.', 'Expected for $100 = 0.16 × 100 × 5.727 − 100 = 91.64 − 100 = **−$8.36**.'],
  'c4-parlay-table': ['A row says chance all win = **0.36** and the payout multiplier = **3.6**.', 'Multiply: 0.36 × 3.6 = **1.296**.', 'Subtract 1: 1.296 − 1 = **0.296** per $1 (a gain). Do the same for your two empty rows and watch the sign.'],
  'c4-eval': ['Someone makes **6** bets that are 50/50 and wins **5** or more.', 'Total outcomes = 2^6 = **64**. Ways to win 5 or more: 6 + 1 = **7**.', 'Chance = 7 ÷ 64 × 100 = **10.9%**, about **11%**. That is not rare, so it does not prove skill.'],
  'c4-lottery': ['Event A is “1 in **500,000**” and event B is “1 in **4,000**”.', 'How many times more likely is B? 500,000 ÷ 4,000 = **125** times.', '30 tickets for A: 30 ÷ 500,000 = 0.00006, and × 100 = **0.006%**.'],
  'c5-riskfree': ['A bonus bet of **$60** is used on an even-money bet with a **35%** chance. A win pays $60 cash; a loss pays $0.', 'Expected value = 0.35 × 60 + 0.65 × 0 = **$21**.', 'Compare the **$21** with the **$60** headline: it is only 35% of it.'],
  'c5-survivor': ['**12** of **40** posts show a win.', 'Percent = 12 ÷ 40 × 100 = **30%**.', 'Then ask who chooses what gets posted: wins get shared and losses get hidden, so the feed is not a fair sample of what most customers experience.']
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
export function bonusLab(bonus, p) {
  const B = bonus || 100, P = p == null ? 0.5 : p;
  const st = { n: 0, cash: 0, wins: 0 }, out = h('div', { class: 'bl-out', 'aria-live': 'polite' }), coin = h('div', { class: 'coin3d bl-coin', 'aria-hidden': 'true' }, '$');
  const flip = () => Math.random() < P;
  function show(last) {
    clear(out);
    out.append(h('div', { class: 'gfx-tally' }, h('span', { class: 'gfx-count' }, `Bonus bets played: ${st.n}`), h('span', { class: 'gfx-count' }, `Won: ${st.wins}`), h('span', { class: 'gfx-count' }, `Cash received in all: $${st.cash.toLocaleString('en-US')}`), st.n ? h('span', { class: 'gfx-count is-warn' }, `Average cash per bonus bet: $${fmt(st.cash / st.n, 2)}`) : null));
    if (last) out.append(h('p', { class: 'gfx-result' }, last));
  }
  async function once() { coin.classList.remove('flip'); void coin.offsetWidth; coin.classList.add('flip'); await sleep(620); const w = flip(); st.n++; if (w) { st.wins++; st.cash += B; } show(w ? `Won: Kai receives $${B} cash. The $${B} bonus token is used up.` : 'Lost: Kai receives $0.'); }
  function many() { for (let i = 0; i < 1000; i++) { st.n++; if (flip()) { st.wins++; st.cash += B; } } show('1,000 more bonus bets played.'); }
  show();
  return h('div', { class: 'helper bonus', role: 'group', 'aria-label': 'Bonus bet explainer' },
    h('div', { class: 'gfx-head' }, h('strong', null, 'How a bonus bet works'), h('span', { class: 'chip' }, 'ILLUSTRATION · NOT GRADED')),
    h('div', { class: 'bl-flow' },
      h('div', { class: 'bl-box' }, h('b', null, '1. First bet'), h('span', null, 'Kai loses the first bet.')), h('span', { class: 'bl-arrow', 'aria-hidden': 'true' }, '→'),
      h('div', { class: 'bl-box' }, h('b', null, '2. Bonus bet'), h('span', null, `Kai gets a $${B} bonus bet. It is credit, not cash.`)), h('span', { class: 'bl-arrow', 'aria-hidden': 'true' }, '→'),
      h('div', { class: 'bl-box' }, h('b', null, '3. Use it'), h('span', null, `Even-money bet, ${Math.round(P * 100)}% chance. Win: $${B} cash. Lose: nothing.`))),
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
/** Prefill values, read from what the question already shows. Anything it cannot find is left blank for the student to type. */
function prefills(item, text) {
  const id = item.id, T = tables(item);
  if (id === 'c2-basics') { const m = parseMarbles(text); if (!m) return {}; const cols = Object.keys(m); return { prefill: { want: String(m[cols[0]]), other: String(cols.slice(1).reduce((a, c) => a + m[c], 0)) } }; }
  if (id === 'c1-ledger') {
    const rows = T.flatMap((t) => t.rows || []), w = rows.find((r) => /wagered/i.test(r[0])), pb = rows.find((r) => /paid back/i.test(r[0]));
    return w && pb ? { prefill: { w: plain(w[1]), p: plain(pb[1]) } } : {};
  }
  if (id === 'c1-market') { const ad = (item.stim || []).find((b) => b.k === 'ad'), c = ad && /(\d{1,2})\s?¢/.exec(ad.body || ''), fee = /keeps (\d+(?:\.\d+)?)%/.exec(ad ? ad.body || '' : ''); return { prefill: { c: c ? c[1] : '', fee: fee ? fee[1] : '2' } }; }
  if (id === 'c4-implied') { const odds = []; for (const m of text.matchAll(/Odds of ([+−\-–]?\d{3})/g)) odds.push(m[1]); return { chips: odds.slice(0, 2).map((o) => ({ label: o, values: { odds: o } })) }; }
  if (id === 'c4-parlay') {
    const t = T.find((x) => (x.cols || []).some((c) => /chance/i.test(c)) && (x.cols || []).some((c) => /odds/i.test(c)));
    if (!t) return {}; const ci = t.cols.findIndex((c) => /chance/i.test(c)), oi = t.cols.findIndex((c) => /odds/i.test(c));
    return { prefill: { legs: t.rows.map((r) => plain(r[ci])).join(', '), odds: t.rows.map((r) => String(r[oi]).trim()).join(', ') } };
  }
  if (id === 'c4-parlay-table') {
    const t = T[0]; if (!t) return {};
    return { chips: t.rows.filter((r) => r.some((c) => String(c).trim() === '?')).map((r) => ({ label: `${r[0]} legs`, values: { p: plain(r[1]), m: plain(r[2]) } })) };
  }
  if (id === 'c4-eval') { const m = /placed (\d+) bets.*?won (\d+)/s.exec(text); return m ? { prefill: { n: m[1], k: m[2] } } : {}; }
  if (id === 'c4-lottery') {
    const ins = [...text.matchAll(/1 in ([\d,]{5,})/g)].map((m) => plain(m[1])), tix = /\(([\d,]+) tickets\)/.exec(text);
    return { prefill: { big: ins[0] || '', small: ins[1] || '', tix: tix ? plain(tix[1]) : '' } };
  }
  if (id === 'c2-house') {
    const rows = T.flatMap((t) => t.rows || []), win = rows.find((r) => /you win/i.test(r[0])), loss = rows.find((r) => /you lose/i.test(r[0])), st = rows.find((r) => /start/i.test(r[0])), rd = /(\d+) rounds/.exec(text);
    const first = (x) => (x ? (/-?\d+(?:\.\d+)?/.exec(String(x[1]).replace(/−/g, '-')) || [''])[0] : '');
    return { prefill: { win: first(win), loss: first(loss).replace('-', ''), start: first(st), rounds: rd ? rd[1] : '' } };
  }
  if (id === 'c2-roulette') { const b = /if \$([\d,]+) is bet/.exec(text); return { prefill: { win: '18', all: '38', bet: b ? plain(b[1]) : '' } }; }
  return {};
}
const WALK = { 'c2-basics': null, 'c1-ledger': 'hold', 'c1-market': 'market', 'c4-implied': 'implied', 'c4-parlay': 'parlay', 'c4-parlay-table': 'evrow', 'c4-eval': 'tail', 'c4-lottery': 'lottery', 'c2-house': 'house', 'c2-roulette': 'roulette' };
/** Returns a Node holding every helper this question has, or null. */
export function helperFor(item) {
  const id = item.id, nodes = [], text = itemText(item);
  if (id === 'c2-basics') { const found = parseMarbles(text); nodes.push(marbleBag(found || { red: 3, blue: 5 }, !!found)); nodes.push(walkCalc('marbles', prefills(item, text))); }
  else if (WALK[id]) nodes.push(walkCalc(WALK[id], prefills(item, text)));
  if (id === 'c5-match') nodes.push(adGallery());
  if (id === 'c5-riskfree') { const b = /\$(\d+)\s+bonus bet/.exec(text), pr = /(\d+)%\s+chance/.exec(text); nodes.push(bonusLab(b ? +b[1] : 100, pr ? +pr[1] / 100 : 0.5)); }
  const nd = nudgeBox(id); if (nd) nodes.push(nd);
  const real = nodes.filter(Boolean);
  return real.length ? h('div', { class: 'helpers' }, real) : null;
}
