/* person.js — a small animated character (head and shoulders) whose face and
   motion match the mood of a scenario. Pure SVG + CSS, decorative only
   (aria-hidden); the scenario text carries all the meaning.
   Moods: sad, worried, stressed, tired, quiet, calm, hopeful, happy, scared.   */
import { h } from '../ui/dom.js';
import { s } from './svg.js';

/* brows: [left rotate, right rotate, y offset]; eye: open amount 0..1; mouth: path */
const MOODS = {
  happy:   { brow: [0, 0, -2],    eye: 1,   mouth: 'M45 69 Q60 88 75 69 Z' },
  hopeful: { brow: [-6, 6, -2],   eye: 1,   mouth: 'M48 71 Q60 82 72 71' },
  calm:    { brow: [0, 0, 0],     eye: .8,  mouth: 'M50 73 Q60 79 70 73' },
  quiet:   { brow: [-4, 4, 1],    eye: .9,  mouth: 'M51 75 L69 75' },
  sad:     { brow: [-16, 16, 1],  eye: .85, mouth: 'M47 79 Q60 66 73 79' },
  worried: { brow: [-12, 12, -1], eye: 1,   mouth: 'M48 77 Q54 71 60 76 Q66 81 72 75' },
  stressed:{ brow: [14, -14, 2],  eye: 1,   mouth: 'M47 77 Q53 70 60 77 Q67 84 73 77' },
  tired:   { brow: [-4, 4, 3],    eye: .25, mouth: 'M52 76 Q60 73 68 76' },
  scared:  { brow: [-10, 10, -6], eye: 1.15, mouth: 'M54 72 Q60 86 66 72 Q60 68 54 72 Z' },
};
export const MOOD_NAMES = Object.keys(MOODS);

const LOOKS = {
  Maya:   { skin: '#c68a63', hair: '#2b1d16', shirt: '#7a6bd6', style: 'long' },
  Jordan: { skin: '#8d5a3c', hair: '#1c1512', shirt: '#2a8c8f', style: 'short' },
  Riley:  { skin: '#f0c6a0', hair: '#9a5b2a', shirt: '#6c5fc7', style: 'bun' },
  Sasha:  { skin: '#e2ac84', hair: '#222a3d', shirt: '#e0793d', style: 'long' },
  Noor:   { skin: '#d49c74', hair: '#1f1b2e', shirt: '#2f6fb0', style: 'long' },
  Nia:    { skin: '#7b4a33', hair: '#150f0d', shirt: '#d1566f', style: 'bun' },
  Mateo:  { skin: '#e0a47a', hair: '#3a2417', shirt: '#4c9a6b', style: 'short' },
  Kai:    { skin: '#f3cfae', hair: '#3b3d52', shirt: '#8b6bd0', style: 'short' },
  Lena:   { skin: '#e8b890', hair: '#a8552d', shirt: '#2a9d9f', style: 'long' },
  Ben:    { skin: '#b97d57', hair: '#20170f', shirt: '#6a7389', style: 'short' },
  Student:{ skin: '#d9a47c', hair: '#30221a', shirt: '#7a6bd6', style: 'short' },
  Friend: { skin: '#cf9a72', hair: '#25201f', shirt: '#2a8c8f', style: 'long' },
};
const DEFAULT_LOOK = LOOKS.Student;

function hair(style, c) {
  if (style === 'long') return [s('path', { d: 'M28 62 Q24 20 60 22 Q96 20 92 62 L92 92 Q80 96 78 84 L78 52 Q60 44 42 52 L42 84 Q40 96 28 92 Z', fill: c, class: 'hair-back' })];
  if (style === 'bun') return [s('circle', { cx: 60, cy: 18, r: 11, fill: c }), s('path', { d: 'M29 58 Q26 22 60 24 Q94 22 91 58 Q80 40 60 42 Q40 40 29 58 Z', fill: c })];
  return [s('path', { d: 'M29 56 Q27 22 60 23 Q93 22 91 56 Q84 38 66 39 Q44 36 29 56 Z', fill: c })];
}

/** Build the character. Returns { el, setMood(m), hop() }. */
export function person({ who = 'Student', mood = 'quiet', size = 120, label = '' } = {}) {
  const look = LOOKS[who] || DEFAULT_LOOK;
  const eyeL = s('g', { class: 'p-eye' }, s('ellipse', { cx: 49, cy: 57, rx: 4.2, ry: 5, fill: '#1c1f3a' }), s('circle', { cx: 50.5, cy: 55, r: 1.4, fill: '#fff' }));
  const eyeR = s('g', { class: 'p-eye' }, s('ellipse', { cx: 71, cy: 57, rx: 4.2, ry: 5, fill: '#1c1f3a' }), s('circle', { cx: 72.5, cy: 55, r: 1.4, fill: '#fff' }));
  const browL = s('rect', { x: 41, y: 45, width: 16, height: 3.4, rx: 1.7, fill: look.hair, class: 'p-brow' });
  const browR = s('rect', { x: 63, y: 45, width: 16, height: 3.4, rx: 1.7, fill: look.hair, class: 'p-brow' });
  const mouth = s('path', { d: MOODS.quiet.mouth, fill: '#b8504f', stroke: '#8c3a3a', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', class: 'p-mouth' });
  const head = s('g', { class: 'p-head' },
    ...(look.style === 'long' ? hair('long', look.hair).slice(0, 1) : []),
    s('rect', { x: 52, y: 84, width: 16, height: 14, fill: look.skin }),
    s('circle', { cx: 60, cy: 58, r: 31, fill: look.skin }),
    s('circle', { cx: 44, cy: 68, r: 5, fill: '#f08a7e', opacity: .35, class: 'p-cheek' }),
    s('circle', { cx: 76, cy: 68, r: 5, fill: '#f08a7e', opacity: .35, class: 'p-cheek' }),
    ...(look.style === 'long' ? [] : hair(look.style, look.hair)),
    ...(look.style === 'long' ? [s('path', { d: 'M29 58 Q27 22 60 23 Q93 22 91 58 Q84 38 66 39 Q44 36 29 58 Z', fill: look.hair })] : []),
    eyeL, eyeR, browL, browR, mouth,
    s('path', { class: 'x-tear', d: 'M45 64 Q42 71 45 74 Q48 71 45 64 Z', fill: '#7fc4f0' }),
    s('path', { class: 'x-sweat', d: 'M90 38 Q85 47 90 51 Q95 47 90 38 Z', fill: '#9bd3f5', stroke: '#6bb2dc', 'stroke-width': 1 }));
  const body = s('path', { d: 'M14 140 Q14 100 44 96 L60 106 L76 96 Q106 100 106 140 Z', fill: look.shirt });
  const extras = s('g', { class: 'p-extras' },
    s('g', { class: 'x-cloud' }, s('ellipse', { cx: 96, cy: 20, rx: 17, ry: 9, fill: '#6b6f93' }), s('ellipse', { cx: 86, cy: 24, rx: 11, ry: 7, fill: '#6b6f93' }), s('path', { d: 'M92 30 L88 40 L94 38 L90 48', stroke: '#ffcf70', 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })),
    s('text', { class: 'x-zzz z1', x: 90, y: 34, 'font-size': 15, 'font-weight': 800, fill: '#8f88d8' }, 'z'),
    s('text', { class: 'x-zzz z2', x: 100, y: 22, 'font-size': 19, 'font-weight': 800, fill: '#8f88d8' }, 'Z'),
    s('path', { class: 'x-spark sp1', d: 'M100 30 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z', fill: '#ffcf70' }),
    s('path', { class: 'x-spark sp2', d: 'M16 38 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2 z', fill: '#ffcf70' }));
  const svg = s('svg', { viewBox: '0 0 120 140', width: size, height: Math.round(size * 140 / 120), class: 'person-svg', 'aria-hidden': 'true', focusable: 'false' }, body, head, extras);
  const wrap = h('span', { class: 'person', 'data-mood': mood, title: label || null }, svg);

  function setMood(m) {
    const d = MOODS[m] || MOODS.quiet;
    wrap.dataset.mood = m in MOODS ? m : 'quiet';
    browL.setAttribute('transform', `rotate(${d.brow[0]} 49 46.7) translate(0 ${d.brow[2]})`);
    browR.setAttribute('transform', `rotate(${d.brow[1]} 71 46.7) translate(0 ${d.brow[2]})`);
    mouth.setAttribute('d', d.mouth);
    mouth.setAttribute('fill', /Z$/.test(d.mouth) ? '#b8504f' : 'none');
    [eyeL, eyeR].forEach(e => { e.style.setProperty('--open', String(d.eye)); });
  }
  function hop() { wrap.classList.remove('hop'); void wrap.offsetWidth; wrap.classList.add('hop'); }
  setMood(mood);
  return { el: wrap, setMood, hop };
}

/** A person plus an optional speech/thought bubble, for scenario questions. */
export function scenarioPerson(spec) {
  const list = Array.isArray(spec) ? spec : [spec];
  const people = list.map(p => ({ ...p, c: person({ who: p.who, mood: p.mood, size: list.length > 1 ? 92 : 112, label: `${p.who} looks ${p.mood}` }) }));
  const el = h('div', { class: 'scenario-people', 'aria-hidden': 'true' },
    ...people.map(p => h('div', { class: 'sp-one' }, p.c.el, h('span', { class: 'sp-name' }, p.who), p.says ? h('span', { class: 'sp-says' }, p.says) : null)));
  return {
    el,
    /** After a correct answer the person relaxes. */
    relieve() { people.forEach(p => { if (p.after !== false) { p.c.setMood(p.after || 'hopeful'); p.c.hop(); } }); },
  };
}
