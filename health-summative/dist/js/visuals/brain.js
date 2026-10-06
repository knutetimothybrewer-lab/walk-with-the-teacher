/* brain.js — animated stress pathway:
   stressor -> amygdala -> hypothalamus -> adrenal glands -> body ready,
   then recovery (the "brake"). Step through with the buttons, click a part,
   or press Play. Simplified, friendly illustration (not anatomically exact). */
import { h } from '../ui/dom.js';
import { s, svgRoot } from './svg.js';
import { settings } from '../ui/settings.js';

const STEPS = [
  { id: 'stressor', title: 'A stressor shows up', text: 'Anything your brain reads as a demand: a test, an argument, a crowded hallway, even a worry. It can be physical, social, academic or internal.' },
  { id: 'amygdala', title: 'Amygdala: the alarm', text: 'The amygdala scans for threat and sounds the alarm, fast, before you have time to think it through.' },
  { id: 'hypo', title: 'Hypothalamus: the command center', text: 'The hypothalamus receives the alarm and sends messages to the body through nerves and hormones.' },
  { id: 'adrenal', title: 'Adrenal glands: the chemical messengers', text: 'The adrenal glands (on top of the kidneys) release adrenaline (fast boost) and cortisol (longer-lasting stress hormone).' },
  { id: 'body', title: 'Body ready: the "gas pedal"', text: 'Sympathetic activation: heart beats faster, breathing quickens, muscles prepare, digestion slows, and attention locks onto the threat.' },
  { id: 'recover', title: 'Recovery: the "brake pedal"', text: 'Parasympathetic recovery slows things down again. Sleep, slow breathing, movement, support and time all help the brake work.' },
];

export function mount(host, ctx) {
  const svg = svgRoot('0 0 640 300', 'Diagram: a stressor reaches the amygdala, then the hypothalamus, then the adrenal glands, and the body gets ready.', { interactive: true });
  const g = (id, ...kids) => s('g', { id: 'p-' + id, class: 'bp-node', 'data-id': id }, ...kids);

  // head + brain
  svg.append(s('ellipse', { cx: 150, cy: 135, rx: 112, ry: 102, class: 'bp-head' }));
  svg.append(s('rect', { x: 128, y: 220, width: 44, height: 40, rx: 10, class: 'bp-head' }));
  svg.append(s('path', { d: 'M70 125 C60 80 110 52 150 62 C195 48 245 80 232 125 C250 150 225 188 190 184 C170 200 120 198 105 182 C70 188 52 150 70 125 Z', class: 'bp-brain' }));
  svg.append(s('path', { d: 'M105 90 C125 75 150 95 170 80 M95 125 C120 110 140 130 165 115 C185 105 205 120 225 110 M110 160 C130 148 150 165 175 152', class: 'bp-folds' }));
  svg.append(s('text', { x: 150, y: 28, 'text-anchor': 'middle', class: 'bp-label' }, 'Brain'));

  const stressor = g('stressor',
    s('circle', { cx: 28, cy: 135, r: 22, class: 'bp-dot warn' }),
    s('text', { x: 28, y: 141, 'text-anchor': 'middle', class: 'bp-glyph' }, '!'),
    s('text', { x: 28, y: 175, 'text-anchor': 'middle', class: 'bp-label' }, 'Stressor'));
  const amy = g('amygdala', s('circle', { cx: 168, cy: 148, r: 13, class: 'bp-dot' }), s('text', { x: 168, y: 125, 'text-anchor': 'middle', class: 'bp-label' }, 'Amygdala'));
  const hyp = g('hypo', s('circle', { cx: 138, cy: 170, r: 11, class: 'bp-dot' }), s('text', { x: 100, y: 205, 'text-anchor': 'middle', class: 'bp-label' }, 'Hypothalamus'));

  // body
  svg.append(s('rect', { x: 400, y: 30, width: 200, height: 250, rx: 70, class: 'bp-body' }));
  svg.append(s('path', { d: 'M500 90 C485 70 455 78 460 100 C463 118 490 135 500 148 C510 135 537 118 540 100 C545 78 515 70 500 90 Z', class: 'bp-heart' }));
  const adr = g('adrenal',
    s('ellipse', { cx: 470, cy: 190, rx: 18, ry: 11, class: 'bp-dot' }), s('ellipse', { cx: 530, cy: 190, rx: 18, ry: 11, class: 'bp-dot' }),
    s('ellipse', { cx: 470, cy: 215, rx: 22, ry: 15, class: 'bp-kidney' }), s('ellipse', { cx: 530, cy: 215, rx: 22, ry: 15, class: 'bp-kidney' }),
    s('text', { x: 500, y: 255, 'text-anchor': 'middle', class: 'bp-label' }, 'Adrenal glands'));
  const body = g('body', s('rect', { x: 408, y: 38, width: 184, height: 232, rx: 66, class: 'bp-glow' }), s('text', { x: 500, y: 20, 'text-anchor': 'middle', class: 'bp-label' }, 'Body'));
  const brakeG = g('recover', s('path', { d: 'M440 150 h40 M520 150 h40', class: 'bp-brake' }));

  // pathway
  const path = s('path', { d: 'M50 135 C90 135 130 140 168 148 L138 170 C200 270 380 270 470 202', class: 'bp-path', id: 'bp-path' });
  svg.append(path, stressor, amy, hyp, body, adr, brakeG);
  const pulse = s('circle', { r: 7, class: 'bp-pulse', cx: 50, cy: 135, style: 'opacity:0' });
  svg.append(pulse);

  const title = h('h3', { class: 'bp-title' });
  const text = h('p', { class: 'bp-text' });
  const box = h('div', { class: 'bp-caption', role: 'status', 'aria-live': 'polite' }, title, text);
  const prev = h('button', { type: 'button', class: 'btn-ghost' }, '← Back');
  const next = h('button', { type: 'button', class: 'btn-ghost' }, 'Next step →');
  const play = h('button', { type: 'button', class: 'btn-ghost' }, '▶ Play it');
  const dots = h('ol', { class: 'bp-steps', 'aria-label': 'Steps' }, STEPS.map((st, i) => {
    const b = h('button', { type: 'button', class: 'bp-step', 'aria-label': `Step ${i + 1}: ${st.title}` }, String(i + 1));
    b.addEventListener('click', () => go(i));
    return h('li', {}, b);
  }));
  let cur = 0, timer = null;

  function go(i) {
    cur = Math.max(0, Math.min(STEPS.length - 1, i));
    const st = STEPS[cur];
    svg.querySelectorAll('.bp-node').forEach(n => {
      const idx = STEPS.findIndex(x => x.id === n.dataset.id);
      n.classList.toggle('on', idx === cur);
      n.classList.toggle('seen', idx >= 0 && idx < cur);
    });
    svg.classList.toggle('recovering', st.id === 'recover');
    title.textContent = `${cur + 1}. ${st.title}`;
    text.textContent = st.text;
    Array.from(dots.querySelectorAll('.bp-step')).forEach((b, k) => { b.classList.toggle('cur', k === cur); b.setAttribute('aria-current', k === cur ? 'step' : 'false'); });
    prev.disabled = cur === 0; next.disabled = cur === STEPS.length - 1;
    movePulse(cur);
  }
  const stops = [0, 0.1, 0.28, 0.95, 1, 1];
  function movePulse(i) {
    if (settings.reducedMotion()) { pulse.style.opacity = '0'; return; }
    const len = path.getTotalLength();
    const from = parseFloat(pulse.dataset.t || '0');
    const to = stops[i] * len;
    const t0 = performance.now(), dur = 700;
    pulse.style.opacity = i === 0 || i === STEPS.length - 1 ? '0' : '1';
    function frame(now) {
      const k = Math.min(1, (now - t0) / dur);
      const at = from + (to - from) * (k * k * (3 - 2 * k));
      const p = path.getPointAtLength(at);
      pulse.setAttribute('cx', p.x); pulse.setAttribute('cy', p.y);
      pulse.dataset.t = String(at);
      if (k < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  prev.addEventListener('click', () => { stop(); go(cur - 1); });
  next.addEventListener('click', () => { stop(); go(cur + 1); });
  function stop() { clearInterval(timer); timer = null; play.textContent = '▶ Play it'; }
  play.addEventListener('click', () => {
    if (timer) { stop(); return; }
    go(0); play.textContent = '❚❚ Pause';
    timer = setInterval(() => { if (cur >= STEPS.length - 1) { stop(); return; } go(cur + 1); }, 2600);
  });
  svg.querySelectorAll('.bp-node').forEach(n => {
    n.setAttribute('tabindex', '0'); n.setAttribute('role', 'button');
    const idx = STEPS.findIndex(x => x.id === n.dataset.id);
    n.setAttribute('aria-label', STEPS[idx].title);
    n.addEventListener('click', () => { stop(); go(idx); });
    n.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stop(); go(idx); } });
  });
  host.append(h('figure', { class: 'viz-fig bp' }, h('figcaption', {}, 'The stress pathway (simplified)'), svg, dots, h('div', { class: 'bp-ctl' }, prev, play, next), box));
  go(ctx.start ?? 0);
  return { stop };
}
