// Small animated "quick look" infographics shown at the start of each mission. They explain the ideas the mission
// is about, but never state an answer to a question in that mission. Animation is CSS-driven so the global
// reduced-motion setting calms it automatically.
import { h } from './util.js';
import { icon } from './visuals.js';

const T = (x, y, txt, cls = 't', anchor = 'middle') => `<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${txt}</text>`;
const wrapSvg = (label, inner) => `<svg viewBox="0 0 640 150" role="img" aria-label="${label}">${inner}</svg>`;

const ART = {
  // 1. Brain: two cells passing a message across a gap
  brain: () => {
    const mols = [0, 1, 2, 3, 4].map((i) => `<circle class="ig-mol" r="3.6" cx="283" cy="${60 + i * 7}" style="--dx:${82 + (i % 2) * 6}px;--dy:${(i - 2) * 3}px;animation-delay:${(1.6 + i * .28).toFixed(2)}s"/>`).join('');
    const recs = [58, 68, 78, 88].map((y) => `<path class="ig-rec" d="M366 ${y} q-9 5 0 10" />`).join('');
    return wrapSvg('Two brain cells. A signal runs along the first, crosses the gap between the cells as tiny chemical messengers, and starts the second cell responding.', `
      <path class="ig-line" d="M104 75 C170 75 210 75 266 75"/><path class="ig-line" d="M388 75 C440 75 490 75 534 75"/>
      <circle class="ig-cell" cx="78" cy="75" r="28"/><circle class="ig-cell" cx="562" cy="75" r="28"/>
      <circle class="ig-cell" cx="276" cy="75" r="15"/><path class="ig-cell" d="M366 75 m0 -20 q22 20 0 40 z" />
      <path class="ig-pulse" pathLength="100" d="M104 75 C170 75 210 75 266 75"/>
      <path class="ig-pulse late" pathLength="100" d="M388 75 C440 75 490 75 534 75"/>
      ${mols}${recs}
      ${T(78, 128, 'sending cell')}${T(562, 128, 'receiving cell')}${T(321, 128, 'the gap')}
      <path d="M290 112 H352" class="ig-tick"/><path d="M290 108 v8 M352 108 v8" class="ig-tick"/>`);
  },
  // 2. Nicotine: different products, one shared ingredient headed for the same place
  nicotine: () => {
    const prod = (x, label, body) => `<g transform="translate(${x} 0)">${body}${T(0, 124, label)}</g>`;
    const cig = '<rect x="-34" y="52" width="52" height="11" rx="3" class="ig-body"/><rect x="18" y="52" width="16" height="11" rx="3" class="ig-tip"/><path class="ig-smoke" d="M-34 50 q-8 -12 2 -22 q8 -10 0 -20"/>';
    const vape = '<rect x="-34" y="44" width="62" height="24" rx="8" class="ig-body"/><rect x="28" y="52" width="10" height="8" rx="2" class="ig-tip"/><circle cx="-18" cy="56" r="3" class="ig-led"/><path class="ig-smoke" d="M40 54 q10 -8 20 0 q10 8 20 0"/>';
    const pod = '<rect x="-16" y="30" width="36" height="52" rx="9" class="ig-body"/><rect x="-6" y="22" width="16" height="10" rx="3" class="ig-tip"/><circle cx="2" cy="56" r="4" class="ig-led"/><path class="ig-smoke" d="M2 20 q-8 -10 0 -18"/>';
    return wrapSvg('Three different nicotine products, each with an arrow pointing to the same place: the brain.', `
      ${prod(88, 'product', cig)}${prod(226, 'product', vape)}${prod(360, 'product', pod)}
      <path class="ig-arrow" d="M440 60 H520"/><path class="ig-arrowhead" d="M514 52 l10 8 l-10 8"/>
      <g class="ig-brainmini" transform="translate(556 60)"><path class="ig-cell" d="M-30 6 C-36 -18 -12 -34 8 -30 C30 -34 44 -12 36 6 C42 24 20 34 6 30 C-12 36 -34 28 -30 6 Z"/><path class="ig-tick" d="M-14 -8 q8 8 16 0 q8 -8 16 2 M-18 10 q10 6 20 0 q10 -6 18 2"/></g>
      ${T(556, 124, 'same destination')}
      `);
  },
  // 3. Alcohol: a curve that climbs, peaks and eases back over time
  alcohol: () => wrapSvg('A line graph. Over time the level in the body climbs, peaks, and then slowly comes back down.', `
      <path class="ig-axis" d="M60 20 V118 H600"/>
      <path class="ig-grid" d="M60 90 H600 M60 62 H600 M60 34 H600"/>
      <path class="ig-draw" pathLength="100" d="M60 118 C120 118 150 36 210 34 C270 32 300 60 360 78 C430 100 520 112 600 116"/>
      <circle class="ig-trav" r="6" style="offset-path:path('M60 118 C120 118 150 36 210 34 C270 32 300 60 360 78 C430 100 520 112 600 116')"/>
      ${T(330, 142, 'time')}<g transform="translate(24 70) rotate(-90)">${T(0, 0, 'level in the body')}</g>
      <g class="ig-glass" transform="translate(96 40)"><path d="M0 0 h18 l-3 22 h-12 z" class="ig-body"/><path d="M9 22 v10 M3 32 h12" class="ig-tick"/></g>`),
  // 4. Other substances: the same substance is not the same situation
  cannabis: () => {
    const knob = (x, label, delay) => `<g transform="translate(${x} 0)"><rect class="ig-slot" x="-6" y="22" width="12" height="70" rx="6"/><circle class="ig-knob" cx="0" cy="30" r="10" style="animation-delay:${delay}s"/>${T(0, 118, label)}</g>`;
    return wrapSvg('Four sliders labelled dose, form, timing and person, with a central gauge that moves as each one changes.', `
      ${knob(70, 'dose', 0)}${knob(170, 'form', -1.2)}${knob(270, 'timing', -2.4)}${knob(370, 'person', -3.6)}
      <g transform="translate(520 70)"><path class="ig-gauge" d="M-70 30 A70 70 0 0 1 70 30"/><path class="ig-gauge on" pathLength="100" d="M-70 30 A70 70 0 0 1 70 30"/><g class="ig-needle"><path d="M0 30 L0 -34" class="ig-needle-l"/><circle r="6" cy="30" class="ig-led"/></g>${T(0, 58, 'the picture')}</g>`);
  },
  // 5. Overdose: oxygen is a clock
  opioid: () => wrapSvg('A clock and an oxygen gauge. As time passes the oxygen level slowly drops, while a breathing line shows long gaps between breaths.', `
      <g transform="translate(70 66)"><circle class="ig-clock" r="42"/><path class="ig-tick" d="M0 -42 v8 M42 0 h-8 M0 42 v-8 M-42 0 h8"/><path class="ig-hand" d="M0 0 V-32"/><circle r="4" class="ig-led"/></g>
      ${T(70, 128, 'every minute counts')}
      <rect class="ig-slot" x="170" y="44" width="150" height="22" rx="11"/><rect class="ig-drain" x="172" y="46" width="146" height="18" rx="9"/>${T(245, 38, 'oxygen')}
      <path class="ig-axis" d="M356 66 H620"/>
      <path class="ig-ecg" pathLength="100" d="M356 66 H400 q6 -26 12 0 H520 q6 -26 12 0 H620"/>
      ${T(488, 104, 'breaths')}${T(488, 124, 'the pattern is the clue', 't s')}`),
  // 6. Pressure: words and options change where it goes
  pressure: () => wrapSvg('A group chat. A pushy message arrives and a pressure bar rises. A calm reply with an alternative arrives and the bar falls.', `
      <g class="ig-b b1"><rect class="ig-bub" x="30" y="14" width="190" height="34" rx="14"/><rect class="ig-bl" x="46" y="26" width="140" height="6" rx="3"/><rect class="ig-bl" x="46" y="36" width="90" height="5" rx="2.5"/></g>
      <g class="ig-b b2"><rect class="ig-bub mine" x="150" y="58" width="190" height="34" rx="14"/><rect class="ig-bl" x="166" y="70" width="140" height="6" rx="3"/><rect class="ig-bl" x="166" y="80" width="100" height="5" rx="2.5"/></g>
      <g class="ig-b b3"><rect class="ig-bub" x="30" y="102" width="190" height="34" rx="14"/><rect class="ig-bl" x="46" y="114" width="120" height="6" rx="3"/><rect class="ig-bl" x="46" y="124" width="150" height="5" rx="2.5"/></g>
      ${T(560, 28, 'pressure')}
      <rect class="ig-slot" x="540" y="38" width="40" height="86" rx="10"/><rect class="ig-press" x="544" y="42" width="32" height="78" rx="7"/>
      ${T(430, 118, 'options', 't s')}<path class="ig-arrow" d="M400 76 H500"/><path class="ig-arrowhead" d="M494 68 l10 8 l-10 8"/>`),
  // 7. Claims: a claim is only as strong as its evidence
  claim: () => {
    const card = (x, label, d) => `<g transform="translate(${x} 0)"><rect class="ig-card" x="0" y="52" width="120" height="66" rx="8"/><rect class="ig-bl" x="14" y="68" width="92" height="6" rx="3"/><rect class="ig-bl" x="14" y="82" width="70" height="6" rx="3"/><rect class="ig-bl" x="14" y="96" width="80" height="6" rx="3"/>${T(60, 140, label)}</g>`;
    return wrapSvg('A claim at the top, three evidence cards beneath it (who says it, what the data show, what is missing), and a magnifying glass scanning across them.', `
      <rect class="ig-claim" x="200" y="6" width="240" height="32" rx="16"/>${T(320, 27, '“a claim”', 'tb')}
      ${card(130, 'who says it?')}${card(260, 'what does it show?')}${card(390, 'what is missing?')}
      <path class="ig-tick" d="M320 38 V52 M190 52 V44 H450 V52 M320 44 V52" />
      <g class="ig-lens"><circle class="ig-lens-c" cx="0" cy="0" r="22"/><path class="ig-lens-h" d="M16 16 L34 34"/></g>`);
  },
  // 8. Final: it all connects
  final: () => {
    const nodes = [['brain', 50, 'M1'], ['drink', 130, 'M3'], ['pill', 210, 'M5'], ['chat', 290, 'M6'], ['lens', 370, 'M7']];
    const pos = nodes.map((_, i) => { const a = (-90 + i * 72) * Math.PI / 180; return [320 + Math.cos(a) * 130 * 1.25, 74 + Math.sin(a) * 52]; });
    return wrapSvg('Five circles for brain science, alcohol, medications, pressure and evidence, each linked to one central circle labelled decide.', `
      ${pos.map((p, i) => `<path class="ig-link" pathLength="100" d="M${p[0].toFixed(0)} ${p[1].toFixed(0)} L320 74" style="animation-delay:${i * .35}s"/>`).join('')}
      ${pos.map((p, i) => `<g transform="translate(${p[0].toFixed(0)} ${p[1].toFixed(0)})"><circle class="ig-node" r="17" style="animation-delay:${i * .35}s"/>${T(0, 4, ['1', '3', '5', '6', '7'][i], 'tb s')}</g>`).join('')}
      <circle class="ig-hub" cx="320" cy="74" r="30"/>${T(320, 79, 'decide', 'tb')}`);
  }
};

const COPY = {
  brain: ['Quick look: how brain cells talk', 'Brain cells pass messages across a tiny gap. Anything that changes how that handoff works changes the message.'],
  nicotine: ['Quick look: many products, one ingredient', 'Products and trends change over time. What matters for the brain is what is inside them.'],
  alcohol: ['Quick look: levels over time', 'The amount in the body changes with time. Reading the shape of a curve is a skill you will use here.'],
  cannabis: ['Quick look: it depends', 'Dose, form, timing and the person all shape the picture. Change one and the outcome moves.'],
  opioid: ['Quick look: why minutes matter', 'A body needs a steady supply of oxygen. Notice what changes, then act without delay.'],
  pressure: ['Quick look: pressure is a back-and-forth', 'Wording, tone and the options you offer all change where a conversation goes.'],
  claim: ['Quick look: claims need support', 'A claim is only as strong as the evidence behind it. Check the source, the data and what is left out.'],
  final: ['Quick look: it all connects', 'Real situations mix everything you have practiced. Decide which details matter.']
};

// Returns a collapsible, replayable panel for a mission theme (null if there is none).
export function missionInfographic(theme) {
  const art = ART[theme], copy = COPY[theme];
  if (!art) return null;
  const stage = h('div.ig-stage');
  const draw = () => { stage.innerHTML = art(); };
  draw();
  const replay = h('button.btn.ghost.ig-replay', { type: 'button', 'aria-label': 'Replay animation', onclick: (e) => { e.preventDefault(); stage.replaceChildren(); void stage.offsetWidth; draw(); } }, icon('reload', 16), 'Replay');
  return h('details.infog', { open: true }, h('summary', h('span.ig-ttl', copy[0]), h('span.ig-hint', 'show / hide')), stage, h('div.ig-foot', h('p', copy[1]), replay));
}
