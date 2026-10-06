/* sky.js — the sky brightens from storm to sunrise as the student progresses. */
const KEYS = [
  [0.00, '#0b1030', '#1d2b64'],
  [0.25, '#16256b', '#35579a'],
  [0.50, '#1b6784', '#6fb0c4'],
  [0.75, '#6d62b8', '#e9a9bd'],
  [1.00, '#ff9a8b', '#ffd9a0'],
];
const hex = (c) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, k) => `rgb(${hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * k)).join(',')})`;

let stars, walker, trail, trailLen;

export function initSky() {
  stars = document.getElementById('stars');
  walker = document.getElementById('walker');
  trail = document.getElementById('trailpath');
  if (stars && !stars.childNodes.length) {
    const NS = 'http://www.w3.org/2000/svg';
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 70; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', String(Math.round(rnd() * 1200)));
      c.setAttribute('cy', String(Math.round(rnd() * 420)));
      c.setAttribute('r', String((0.6 + rnd() * 1.4).toFixed(1)));
      c.setAttribute('class', 'star');
      c.style.animationDelay = `${(rnd() * 4).toFixed(1)}s`;
      stars.append(c);
    }
  }
  trailLen = trail ? trail.getTotalLength() : 0;
  setSky(0);
}

export function setSky(p) {
  p = Math.max(0, Math.min(1, p));
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
  const [p0, t0, b0] = KEYS[i], [p1, t1, b1] = KEYS[i + 1];
  const k = (p - p0) / (p1 - p0);
  const r = document.documentElement.style;
  r.setProperty('--sky-top', mix(t0, t1, k));
  r.setProperty('--sky-bot', mix(b0, b1, k));
  r.setProperty('--p', String(p));
  r.setProperty('--star-o', String(Math.max(0, 1 - p * 1.7).toFixed(2)));
  r.setProperty('--sun-y', `${Math.round(190 - p * 190)}px`);
  r.setProperty('--sun-o', String(Math.min(1, 0.15 + p * 0.9).toFixed(2)));
  document.body.dataset.stage = String(Math.min(4, Math.floor(p * 5)));
  if (walker && trail && trailLen) {
    const pt = trail.getPointAtLength(trailLen * p);
    walker.setAttribute('cx', pt.x.toFixed(1)); walker.setAttribute('cy', pt.y.toFixed(1));
  }
}
