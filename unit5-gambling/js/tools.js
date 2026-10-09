// Calculator and formula reference sheet (drawers).  The calculator never uses eval().
import { h, md, clear } from './util.js';

function calcEval(src) {
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/\s+/g, '').replace(/,/g, '');
  let i = 0;
  const peek = () => s[i];
  function num() { const m = /^\d*\.?\d+(e[+-]?\d+)?/i.exec(s.slice(i)); if (!m) throw new Error('number'); i += m[0].length; let v = parseFloat(m[0]); while (s[i] === '%') { v /= 100; i++; } return v; }
  function prim() {
    if (s.startsWith('sqrt(', i)) { i += 5; const v = expr(); if (s[i++] !== ')') throw new Error('paren'); if (v < 0) throw new Error('sqrt'); return Math.sqrt(v); }
    if (peek() === '(') { i++; const v = expr(); if (s[i++] !== ')') throw new Error('paren'); return v; }
    return num();
  }
  function un() { if (peek() === '-') { i++; return -un(); } if (peek() === '+') { i++; return un(); } return pow(); }
  function pow() { const b = prim(); if (peek() === '^') { i++; return Math.pow(b, un()); } return b; }
  function term() { let v = un(); while (peek() === '*' || peek() === '/') { const o = s[i++]; const r = un(); v = o === '*' ? v * r : v / r; } return v; }
  function expr() { let v = term(); while (peek() === '+' || peek() === '-') { const o = s[i++]; const r = term(); v = o === '+' ? v + r : v - r; } return v; }
  const v = expr(); if (i !== s.length) throw new Error('syntax');
  if (!isFinite(v)) throw new Error('math');
  return v;
}
export function calcEvalForTest(s) { return calcEval(s); }

export function calculatorPanel() {
  const disp = h('input', { class: 'input disp', 'aria-label': 'Calculator display. Type an expression and press Enter.', inputmode: 'decimal', autocomplete: 'off', spellcheck: 'false' });
  const msg = h('div', { class: 'muted small', 'aria-live': 'polite' }, 'Type or tap. Supports + − × ÷ ^ ( ) % and sqrt(…).');
  const press = (t) => { disp.value += t; disp.focus(); };
  const equals = () => { try { const v = calcEval(disp.value); disp.value = String(Math.round(v * 1e10) / 1e10); msg.textContent = 'Result shown.'; } catch { msg.textContent = 'That expression is not valid.'; } };
  disp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); equals(); } });
  const keys = [['7', '8', '9', '÷'], ['4', '5', '6', '×'], ['1', '2', '3', '−'], ['0', '.', '(', '+'], [')', '^', '%', 'sqrt(']];
  const grid = h('div', { class: 'calc' });
  keys.forEach((r) => r.forEach((k) => grid.append(h('button', { type: 'button', class: /[÷×−+^]/.test(k) ? 'op' : '', onclick: () => press(k) }, k))));
  grid.append(h('button', { type: 'button', onclick: () => { disp.value = disp.value.slice(0, -1); disp.focus(); } }, '⌫'), h('button', { type: 'button', onclick: () => { disp.value = ''; msg.textContent = ''; disp.focus(); } }, 'Clear'), h('button', { type: 'button', class: 'op', style: 'grid-column: span 2', onclick: equals }, '='));
  return h('div', null, h('h3', null, 'Calculator'), disp, msg, h('div', { style: 'height:.5rem' }), grid);
}

export function referencePanel() {
  const rows = [
    ['Probability', 'P(event) = favorable outcomes ÷ total possible outcomes'],
    ['Odds', 'favorable : unfavorable (not the same as probability)'],
    ['Independent events', 'P(A and B) = P(A) × P(B)'],
    ['Expected value (EV)', 'EV = sum of (chance × amount). Net EV = expected return − cost.'],
    ['House edge', 'house edge = expected loss ÷ amount bet × 100'],
    ['Percent', 'percent = part ÷ whole × 100'],
    ['American odds: −X', 'risk X to win 100. Break-even win rate = X ÷ (X + 100)'],
    ['American odds: +X', 'risk 100 to win X. Break-even win rate = 100 ÷ (X + 100)'],
    ['Payout multiplier', 'total returned per $1 = 1 + (profit ÷ stake)'],
    ['Parlay', 'chance all win = p1 × p2 × …; payout multiplier = m1 × m2 × …']
  ];
  return h('div', { class: 'ref' }, h('h3', null, 'Formula reference'), h('p', { class: 'muted small' }, 'Formulas only. Definitions and concepts are not listed here.'), h('dl', null, rows.map((r) => [h('dt', null, r[0]), h('dd', null, md(r[1]))])));
}
