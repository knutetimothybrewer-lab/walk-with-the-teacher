// ===== FX: one-shot animations tied to each choice =====
// Each takes the figure F. They set a pose / prop / face and emit particles. F.inside (optional) is the organ view.
const em = (F, text, x, y, o) => F.emit('text', x, y, Object.assign({ text }, o));
const burst = (F, list, x, y, o) => list.forEach((t, i) => em(F, t, x + (i - (list.length - 1) / 2) * 30, y, Object.assign({ delay: i * 220, dy: -70, dur: 1900, s0: .6, s1: 1.15 }, o)));
const zzz = F => [0, 1, 2, 3].forEach(i => em(F, 'Z', 238 + i * 12, 96 - i * 4, { size: 20 + i * 5, fill: '#4c6ef5', bold: 1, dx: 18, dy: -50, delay: i * 520, dur: 2000, rot: 12 }));
const smokePuffs = (F, col, n, from) => { for (let i = 0; i < n; i++) F.emit('circle', from ? from[0] : 214, from ? from[1] : 150, { r: 7 + i % 3 * 2, fill: col || '#b9bcc4', dx: -20 + Math.random() * 60, dy: -90 - Math.random() * 40, dur: 2400, delay: i * 260, s0: .6, s1: 2.6, peak: .8 }); };
const sparkles = (F, col, n, cx, cy, spread) => { for (let i = 0; i < n; i++) em(F, '✦', (cx || 200) + (Math.random() - .5) * (spread || 160), (cy || 150) + (Math.random() - .5) * (spread || 160), { size: 16 + Math.random() * 14, fill: col || '#fcc419', dy: -26, dur: 1500, delay: i * 140, s1: 1.4 }); };
const sweatDrops = (F, n) => { for (let i = 0; i < n; i++) em(F, '💧', i % 2 ? 252 : 148, 98, { size: 16, dx: i % 2 ? 22 : -22, dy: 40, dur: 1000, delay: i * 250, s0: .8, s1: 1 }); };
const rays = F => { const g = F.svg.querySelector('[id$=fxBack]'); const w = document.createElementNS(NS, 'g'); w.setAttribute('transform', 'translate(70 70)');
  w.innerHTML = '<circle r="34" fill="#ffd43b"/><g stroke="#ffd43b" stroke-width="7" stroke-linecap="round">' + [...Array(12)].map((_, i) => `<line x1="0" y1="-48" x2="0" y2="-70" transform="rotate(${i * 30})"/>`).join('') + '</g>';
  g.appendChild(w); try { const a = w.animate([{ opacity: 0, transform: 'translate(70px,70px) scale(.4)' }, { opacity: 1, transform: 'translate(70px,70px) scale(1) rotate(30deg)', offset: .3 }, { opacity: 1, transform: 'translate(70px,70px) scale(1.1) rotate(60deg)', offset: .8 }, { opacity: 0, transform: 'translate(70px,70px) scale(1.1) rotate(80deg)' }], { duration: 3000 }); a.onfinish = () => w.remove(); } catch (e) { w.remove(); } };
const raysBeams = F => { for (let i = 0; i < 6; i++) F.emit('line', 60 + i * 12, 70, { len: 80 + i * 6, fill: '#ffe066', w: 5, dx: 150 + i * 10, dy: 130 + i * 20, dur: 2200, delay: i * 120, s0: 1, s1: 1, rot: 38, peak: .8 }); };

const FX = {
  sleep: F => { F.pose('rest'); F.set('eyesClosed', 1, 2800); F.face('happy', 2800); zzz(F); F.tintFlash('#10204d', .5, 2800); em(F, '🌙', 70, 80, { size: 40, dy: 0, dur: 2800, s0: 1, s1: 1 }); },
  game: F => { F.pose('hold', 2800); F.set('glow', 1, 2800); F.tintFlash('#4dabf7', .22, 2800); em(F, '🎮', 200, 300, { size: 34, dy: -10, dur: 2800, s0: 1, s1: 1 }); sparkles(F, '#74c0fc', 6, 200, 130, 140); F.face('happy', 1400); },
  eat_good: F => { F.pose('mouth', 2400); burst(F, ['🍎', '🥦', '🍌'], 200, 250, { dy: -90 }); F.face('happy', 2400); sparkles(F, '#51cf66', 5); },
  eat_junk: F => { F.pose('mouth', 2400); burst(F, ['🍩', '🍕', '🍟'], 200, 250, { dy: -90 }); },
  hunger: F => { F.pose('stomach', 2600); F.face('sad', 2600); em(F, 'grrr…', 200, 330, { size: 20, fill: '#555', bold: 1, dy: -26, dur: 2200, s1: 1.2 }); em(F, 'grrr…', 170, 350, { size: 16, fill: '#555', bold: 1, dy: -24, dur: 2200, delay: 600 }); },
  water: F => { F.pose('mouth', 2400); F.prop('bottle', 2400); burst(F, ['💧', '💧', '💧'], 200, 230, { dy: -60 }); F.face('happy', 2400); sparkles(F, '#4dabf7', 4); },
  mix: F => { F.pose('mouth', 2200); F.prop('cup', 2200); burst(F, ['🥤', '💧'], 200, 230); },
  energy: F => { F.pose('mouth', 2200); F.prop('can', 2200); F.set('shake', 2.6, 2400); sweatDrops(F, 4); burst(F, ['⚡', '⚡', '⚡'], 200, 180, { dy: -50 }); if (F.inside) F.inside.boost(4000, 1.6, 1.2); },
  shield: F => { F.pose('stop', 2400); em(F, '🛡️', 292, 190, { size: 52, dy: -18, dur: 2400, s0: .4, s1: 1.2 }); sparkles(F, '#fcc419', 7, 200, 160, 180); F.face('happy', 2400); },
  vape: F => { F.pose('mouth', 2600); F.prop('vape', 2600); smokePuffs(F, '#b197fc', 6); F.later(900, () => { F.cough(); F.face('ouch', 900); }); if (F.inside) { F.inside.smoke(); F.later(900, () => F.inside.smoke()); } },
  smoke: F => { F.pose('mouth', 2800); F.prop('cig', 2800); smokePuffs(F, '#aeb1b8', 7); F.later(1100, () => { F.cough(); F.face('ouch', 900); }); if (F.inside) { F.inside.smoke(); F.later(1000, () => F.inside.smoke()); } },
  drink: F => { F.pose('mouth', 2200); F.prop('cup', 2200); F.set('wobble', 4, 3200); F.set('dizzy', 1, 3200); F.later(1200, () => burst(F, ['💫', '💫', '💫'], 200, 90, { dy: -26, dur: 2000 })); },
  cheers: F => { F.pose('mouth', 2000); F.prop('cup', 2000); F.face('happy', 2400); sparkles(F, '#fcc419', 6); burst(F, ['🥂'], 200, 150, { dy: -40 }); },
  car: F => { F.set('shake', 5, 1600); F.tintFlash('#e03131', .45, 1200); em(F, '🚗', 60, 470, { size: 56, dx: 280, dy: -20, dur: 1100, s0: 1, s1: 1, peak: 1 }); em(F, 'SCREEECH', 200, 100, { size: 24, fill: '#c92a2a', bold: 1, dy: -14, dur: 1800, s1: 1.2 }); F.face('ouch', 2200); F.set('dizzy', 1, 2400); },
  run: F => { F.set('run', 1, 3000); F.set('bob', 7, 3000); F.pose('rest'); sweatDrops(F, 8); for (let i = 0; i < 5; i++) F.emit('line', 330, 200 + i * 40, { len: 50, fill: '#adb5bd', w: 4, dx: -90, dy: 0, dur: 600, delay: i * 120, s0: 1, s1: 1, peak: .7 }); F.face('happy', 3000); if (F.inside) F.inside.boost(3200, 1.9, 2.2); },
  walk: F => { F.set('bob', 3, 2600); F.set('run', 0); F.pose('rest'); burst(F, ['🌿', '🍃'], 200, 180); F.face('happy', 2600); },
  sit: F => { F.face('slump', 2800); F.pose('rest'); em(F, '🛋️', 70, 480, { size: 56, dy: 0, dur: 2800, s0: 1, s1: 1 }); em(F, '🕒', 336, 60, { size: 36, dy: 0, dur: 2800, s0: 1, s1: 1 }); F.set('cloud', 1, 2400); },
  phone: F => { F.pose('phone', 2800); F.prop('phone', 2800); F.set('glow', 1, 2800); F.tintFlash('#4dabf7', .18, 2800); burst(F, ['💬', '❤️', '🔔', '📸'], 200, 110, { dy: -50, dx: 24 }); },
  study: F => { F.pose('book', 2600); F.prop('book', 2600); burst(F, ['💡'], 200, 50, { dy: -20, dur: 2400, s1: 1.4 }); sparkles(F, '#fcc419', 4, 200, 90, 120); F.face('happy', 2400); },
  calm: F => { F.pose('rest'); F.face('happy', 2800); F.set('eyesClosed', 1, 1800); for (let i = 0; i < 3; i++) F.emit('circle', 200, 260, { r: 54, fill: '#63e6be55', dy: 0, dur: 2400, delay: i * 700, s0: .6, s1: 2.2, back: 1 }); burst(F, ['🌿', '☮️'], 200, 80, { dy: -30 }); },
  stress: F => { F.pose('head', 2800); F.set('cloud', 2, 3000); F.set('shake', 1.8, 2600); F.face('sad', 2800); sweatDrops(F, 6); for (let i = 0; i < 8; i++) F.emit('line', 150 + i * 14, 70, { len: 18, fill: '#74c0fc', w: 3, dx: -10, dy: 90, dur: 900, delay: i * 140, s0: 1, s1: 1, peak: .8, rot: 70 }); F.tintFlash('#343a40', .3, 2400); if (F.inside) F.inside.boost(3000, 1.5, 1.4); },
  talk: F => { F.pose('wave', 2600); F.face('happy', 2400); burst(F, ['💬', '💬', '❤️'], 120, 120, { dy: -40, dx: -10 }); em(F, '💬', 290, 140, { size: 36, dy: -30, dur: 2200, delay: 600 }); },
  shrug: F => { F.pose('shrug', 2200); em(F, '…', 200, 70, { size: 38, fill: '#666', bold: 1, dy: -14, dur: 2000 }); },
  angry: F => { F.pose('hips', 2600); F.face('angry', 2600); F.tintFlash('#e03131', .3, 2200); for (let i = 0; i < 6; i++) { em(F, '💢', 150 + (i % 2) * 100, 100, { size: 22, dx: (i % 2 ? 1 : -1) * 26, dy: -30, delay: i * 260, dur: 1400 }); F.emit('circle', 150 + (i % 2) * 100, 120, { r: 8, fill: '#ffffffcc', dx: (i % 2 ? 1 : -1) * 20, dy: -40, delay: i * 220, dur: 1300, s1: 2 }); } F.set('shake', 1.6, 2000); if (F.inside) F.inside.boost(3000, 1.6, 1.4); },
  idea: F => { F.pose('cheer', 2200); F.face('happy', 2600); burst(F, ['💡'], 200, 60, { dy: -30, s1: 1.6, dur: 2400 }); sparkles(F, '#fcc419', 6); },
  storm: F => { F.set('cloud', 2, 3000); F.face('sad', 3000); F.pose('head', 2400); F.tintFlash('#343a40', .35, 2600); for (let i = 0; i < 10; i++) F.emit('line', 140 + i * 12, 70, { len: 18, fill: '#74c0fc', w: 3, dx: -10, dy: 110, dur: 900, delay: i * 160, s0: 1, s1: 1, peak: .8, rot: 70 }); },
  sun: F => { rays(F); raysBeams(F); sweatDrops(F, 5); F.tintFlash('#ff922b', .28, 2800); em(F, '🥵', 330, 220, { size: 30, dy: -20, dur: 2200 }); },
  burn: F => { rays(F); raysBeams(F); sweatDrops(F, 6); F.tintFlash('#ff6b6b', .4, 3000); F.face('ouch', 2800); em(F, 'OUCH!', 200, 80, { size: 26, fill: '#c92a2a', bold: 1, dy: -30, dur: 2200, s1: 1.2 }); F.pose('cheek', 2600); },
  sunscreen: F => { F.set('hat', 1, 3000); F.pose('hold'); rays(F); F.face('happy', 3000); burst(F, ['🧴', '🧢', '😎'], 200, 220, { dy: -80, dur: 2200 }); F.emit('circle', 200, 250, { r: 120, fill: '#74c0fc33', dy: 0, dur: 2400, s0: .5, s1: 1.6, back: 1 }); sparkles(F, '#e9ecef', 8, 200, 220, 220); },
  clean: F => { F.pose('hold', 2400); sparkles(F, '#fcc419', 10, 200, 280, 300); burst(F, ['🧹', '✨'], 120, 460, { dy: -60 }); F.face('happy', 2400); },
  mess: F => { F.face('sad', 2200); for (let i = 0; i < 6; i++) em(F, ['🧦', '🥤', '🍕', '📄', '👕', '🍟'][i], 60 + i * 52, 200, { size: 28, dy: 270, dur: 1100, delay: i * 180, s0: 1, s1: 1, rot: 180, peak: 1 }); },
  nature: F => { F.pose('cheer', 2400); F.face('happy', 2800); rays(F); burst(F, ['🌳', '🦋', '🌸'], 200, 180, { dy: -70, dur: 2200 }); sparkles(F, '#51cf66', 5); },
  indoor: F => { F.face('sad', 2600); F.tintFlash('#343a40', .35, 2600); burst(F, ['🪟', '🕰️'], 200, 130, { dy: -20 }); F.pose('rest'); },
  friends: F => { F.pose('wave', 3000); F.face('happy', 3000); burst(F, ['😄', '👋', '❤️', '🎉'], 200, 130, { dy: -70, dur: 2200 }); sparkles(F, '#f06595', 6); },
  alone: F => { F.set('cloud', 1, 3000); F.face('sad', 3000); F.tintFlash('#343a40', .32, 2800); for (let i = 0; i < 7; i++) F.emit('line', 150 + i * 14, 70, { len: 16, fill: '#74c0fc', w: 3, dx: -10, dy: 100, dur: 900, delay: i * 190, s0: 1, s1: 1, peak: .8, rot: 70 }); em(F, '📵', 330, 200, { size: 30, dy: -10, dur: 2600 }); },
  kind: F => { F.pose('give', 2600); F.face('happy', 2800); burst(F, ['🎁', '❤️', '🤝'], 240, 230, { dy: -80, dur: 2200 }); sparkles(F, '#f06595', 6); },
  eco: F => { F.pose('cheer', 2400); F.face('happy', 2600); burst(F, ['♻️', '🚲', '🌍'], 200, 190, { dy: -80, dur: 2200 }); sparkles(F, '#51cf66', 6); },
  litter: F => { F.face('sad', 2200); for (let i = 0; i < 5; i++) em(F, ['🥤', '🍟', '🛍️', '📦', '🥫'][i], 100 + i * 50, 230, { size: 26, dy: 240, dur: 1000, delay: i * 200, s0: 1, s1: 1, rot: 220 }); smokePuffs(F, '#6c6f78', 4, [330, 440]); },
  pill: F => { F.pose('mouth', 2200); F.prop('pill', 2200); F.set('shake', 2.2, 3000); sweatDrops(F, 5); burst(F, ['⚡', '💓'], 200, 170, { dy: -50 }); if (F.inside) F.inside.boost(5000, 1.9, 1.5); },
  doctor: F => { F.pose('rest'); F.prop('pad', 2400); F.face('happy', 2600); burst(F, ['🩺', '➕', '📋'], 200, 160, { dy: -80, dur: 2200 }); sparkles(F, '#4dabf7', 4); },
  tooth: F => { F.face('happy', 2800); F.pose('rest'); burst(F, ['🪥', '✨', '🦷'], 200, 200, { dy: -60 }); sparkles(F, '#e9ecef', 8, 200, 165, 70); },
  cavity: F => { F.pose('cheek', 2600); F.face('ouch', 2600); burst(F, ['🦷', '😖'], 220, 200, { dy: -60 }); em(F, 'ouch!', 255, 150, { size: 18, fill: '#c92a2a', bold: 1, dx: 24, dy: -14, dur: 1800 }); },
  heart: F => { F.pose('hold', 2400); F.face('happy', 2800); burst(F, ['❤️', '💖', '❤️'], 200, 220, { dy: -90, dur: 2200 }); },
  good: F => { F.face('happy', 2400); F.pose('cheer', 1800); sparkles(F, '#fcc419', 9); },
  bad: F => { F.face('sad', 2400); F.tintFlash('#343a40', .25, 2200); em(F, '😟', 200, 60, { size: 34, dy: -16, dur: 2000 }); }
};
