// Small utilities. NOTE: the UI never uses innerHTML. Everything is built with h() and textContent, so item content
// (and anything a student could type into the name fields) can never inject markup.

const SVGNS = 'http://www.w3.org/2000/svg';

function applyProps(el, props, isSvg) {
  for (const k of Object.keys(props || {})) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class' || k === 'className') el.setAttribute('class', Array.isArray(v) ? v.filter(Boolean).join(' ') : v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (!isSvg && (k === 'value' || k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden' || k === 'draggable')) el[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
}
function appendKids(el, kids) {
  for (const c of kids) {
    if (c == null || c === false || c === true) continue;
    if (Array.isArray(c)) appendKids(el, c);
    else if (c.nodeType) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}
const isProps = (p) => p && typeof p === 'object' && !p.nodeType && !Array.isArray(p);

/** h('div.card#x', {onclick}, children...) */
export function h(tag, props, ...kids) {
  if (!isProps(props)) { if (props !== undefined && props !== null) kids.unshift(props); props = null; }
  const m = /^([a-zA-Z][\w-]*)((?:[.#][\w-]+)*)$/.exec(tag);
  const el = document.createElement(m[1]);
  const cls = [];
  (m[2].match(/[.#][\w-]+/g) || []).forEach((t) => (t[0] === '.' ? cls.push(t.slice(1)) : el.setAttribute('id', t.slice(1))));
  if (cls.length) el.setAttribute('class', cls.join(' '));
  if (props) {
    if (props.class || props.className) props = { ...props, class: [cls.join(' '), Array.isArray(props.class) ? props.class.filter(Boolean).join(' ') : (props.class || props.className)].filter(Boolean).join(' ') };
    applyProps(el, props, false);
  }
  appendKids(el, kids);
  return el;
}
/** svg('path', {d:'...'}, children) */
export function svg(tag, props, ...kids) {
  if (!isProps(props)) { if (props !== undefined && props !== null) kids.unshift(props); props = null; }
  const el = document.createElementNS(SVGNS, tag);
  applyProps(el, props, true);
  appendKids(el, kids);
  return el;
}
export const $ = (sel, root) => (root || document).querySelector(sel);
export const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
export function mount(el, ...kids) { clear(el); appendKids(el, kids); return el; }

/** **bold** inline markup only. Everything else is plain text. */
export function rich(text) {
  const parts = String(text).split('**');
  return parts.map((p, i) => (i % 2 ? h('strong', p) : p));
}

/* ---------- announcements for screen readers ---------- */
export function announce(msg, level) {
  const id = level === 'assertive' ? 'live-assertive' : 'live-polite';
  const node = document.getElementById(id);
  if (!node) return;
  node.textContent = '';
  setTimeout(() => { node.textContent = msg; }, 30);
}

/* ---------- seeded shuffle (stable within one attempt, different on the next) ---------- */
export function fnv1a(str) {
  let x = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { x ^= str.charCodeAt(i); x = Math.imul(x, 0x01000193); }
  return x >>> 0;
}
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffleSeeded(arr, seedStr) {
  const a = arr.slice(), r = mulberry32(fnv1a(seedStr));
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/* ---------- formatting ---------- */
export const pad2 = (n) => String(n).padStart(2, '0');
export function fmtClock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hh = Math.floor(total / 3600), mm = Math.floor((total % 3600) / 60), ss = total % 60;
  return hh ? hh + ':' + pad2(mm) + ':' + pad2(ss) : mm + ':' + pad2(ss);
}
export function fmtMinutes(ms) {
  const m = Math.round(ms / 60000);
  return m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min';
}
export function fmtTime(ms) { return ms ? new Date(ms).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''; }
export const pct = (n) => (n == null ? '—' : (Math.round(n * 10) / 10) + '%');
export const normCode = (s) => String(s || '').trim().toUpperCase().replace(/\s+/g, '');

/* ---------- storage (session only, so a shared Chromebook never resumes someone else's work) ---------- */
export const session = {
  get(k) { try { const v = sessionStorage.getItem('w8:' + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { sessionStorage.setItem('w8:' + k, JSON.stringify(v)); } catch (e) { /* storage blocked: the app works without it */ } },
  del(k) { try { sessionStorage.removeItem('w8:' + k); } catch (e) { /* ignore */ } }
};
export const prefs = {
  get(k) { try { return localStorage.getItem('w8p:' + k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('w8p:' + k, v); } catch (e) { /* ignore */ } }
};

/* ---------- CSV (formula-injection safe) ---------- */
export function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = "'" + s;
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
export function toCsv(rows) { return rows.map((r) => r.map(csvCell).join(',')).join('\r\n'); }
export function download(filename, text, mime) {
  const url = URL.createObjectURL(new Blob([text], { type: mime || 'text/csv;charset=utf-8' }));
  const a = h('a', { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------- focus trap for dialogs ---------- */
export function trapFocus(container, onEscape) {
  const sel = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const prev = document.activeElement;
  function key(e) {
    if (e.key === 'Escape' && onEscape) { e.stopPropagation(); onEscape(); return; }
    if (e.key !== 'Tab') return;
    const f = $$(sel, container).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  container.addEventListener('keydown', key);
  const f0 = $$(sel, container)[0];
  if (f0) setTimeout(() => f0.focus(), 0);
  return () => { container.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
