/* dom.js — tiny DOM helpers (no framework). */
import { settings } from './settings.js';

/** h('div', {class:'x', onclick:fn, 'aria-label':'..'}, child, 'text', [children]) */
export function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'text') el.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  append(el, kids);
  return el;
}

export function append(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
  return el;
}

/** **bold** and line breaks (\n) only. Everything else is plain text (safe). */
export function rich(text) {
  const frag = document.createDocumentFragment();
  String(text).split('\n').forEach((line, li) => {
    if (li) frag.append(document.createElement('br'));
    line.split(/(\*\*[^*]+\*\*)/g).forEach(part => {
      if (!part) return;
      if (part.startsWith('**')) frag.append(h('strong', {}, part.slice(2, -2)));
      else frag.append(document.createTextNode(part));
    });
  });
  return frag;
}

export const plain = (text) => String(text).replace(/\*\*/g, '');

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }

/** Screen-reader announcement via the polite live region in index.html. */
export function announce(msg) {
  const live = document.getElementById('live');
  if (!live) return;
  live.textContent = '';
  // re-set on next tick so repeated identical messages are announced
  setTimeout(() => { live.textContent = msg; }, 30);
}

export function motionOK() { return !settings.reducedMotion(); }

/** Gentle celebration: a few soft sparkles that fade. */
export function sparkle(host, n = 10) {
  if (!motionOK() || !host) return;
  const layer = h('span', { class: 'sparkles', 'aria-hidden': 'true' });
  for (let i = 0; i < n; i++) {
    const s = h('i', { class: 'sp' });
    const ang = (Math.PI * 2 * i) / n + Math.random() * 0.5;
    const dist = 40 + Math.random() * 50;
    s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(ang) * dist - 10}px`);
    s.style.setProperty('--d', `${Math.random() * 120}ms`);
    layer.append(s);
  }
  host.append(layer);
  setTimeout(() => layer.remove(), 1100);
}

export function shake(el) {
  if (!el || !motionOK()) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 600);
}

/* ---- Read aloud (Web Speech API; no network) ---- */
export function speakSupported() { return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window; }
export function speak(text) {
  if (!speakSupported()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(plain(text));
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}
export function stopSpeak() { if (speakSupported()) window.speechSynthesis.cancel(); }

/** A "Listen" button that reads `getText()` aloud. */
export function listenButton(getText, label = 'Listen') {
  if (!settings.get().readAloud || !speakSupported()) return null;
  let playing = false;
  const b = h('button', { type: 'button', class: 'btn-ghost listen', 'aria-label': `${label} (read aloud)` }, '🔊 ', label);
  b.addEventListener('click', () => {
    if (playing) { stopSpeak(); playing = false; b.classList.remove('on'); return; }
    speak(typeof getText === 'function' ? getText() : getText);
    playing = true; b.classList.add('on');
    const u = window.speechSynthesis;
    const poll = setInterval(() => { if (!u.speaking) { playing = false; b.classList.remove('on'); clearInterval(poll); } }, 400);
  });
  return b;
}

/** Trap Tab inside a dialog and return a release function. */
export function trapFocus(dialog) {
  const sel = 'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])';
  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const f = $$(sel, dialog).filter(x => x.offsetParent !== null || x === document.activeElement);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  dialog.addEventListener('keydown', onKey);
  return () => dialog.removeEventListener('keydown', onKey);
}

/** Open a native <dialog> modal with a focus trap; focus returns to the opener on close. */
export function openDialog(d, opener) {
  if (typeof d.showModal !== 'function') { d.setAttribute('open', ''); return; }
  if (!d.open) d.showModal();
  if (d._release) d._release();
  d._release = trapFocus(d);
  d._opener = opener || document.activeElement;
}
