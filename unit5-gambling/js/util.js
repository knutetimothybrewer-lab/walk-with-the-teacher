// Small DOM and formatting helpers shared by every screen.  No innerHTML is ever used with server text.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** h('div', {class:'card', onclick: fn, 'aria-label':'x'}, 'text', childNode, ...) */
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (k === 'text') el.textContent = v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, String(v));
  }
  add(el, kids);
  return el;
}
export function add(el, kids) {
  for (const k of kids.flat(Infinity)) {
    if (k == null || k === false) continue;
    el.append(k instanceof Node ? k : document.createTextNode(String(k)));
  }
  return el;
}
export function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
export function mount(root, ...kids) { clear(root); add(root, kids); return root; }

/** Safe inline markup for server text: **bold**, *italic*, blank line = new paragraph. Everything else is plain text. */
export function md(s) {
  const frag = document.createDocumentFragment();
  String(s == null ? '' : s).split(/\n{2,}/).forEach((para, pi, arr) => {
    const host = arr.length > 1 ? h('p') : document.createDocumentFragment();
    const parts = para.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
    for (const p of parts) {
      if (!p) continue;
      if (p.startsWith('**') && p.endsWith('**') && p.length > 4) host.append(h('strong', null, p.slice(2, -2)));
      else if (p.startsWith('*') && p.endsWith('*') && p.length > 2) host.append(h('em', null, p.slice(1, -1)));
      else host.append(document.createTextNode(p));
    }
    frag.append(host);
  });
  return frag;
}
export const span = (s, cls) => h('span', cls ? { class: cls } : null, md(s));

export const pad2 = (n) => String(n).padStart(2, '0');
export function fmtClock(sec) {
  sec = Math.max(0, Math.floor(sec));
  const hh = Math.floor(sec / 3600), mm = Math.floor((sec % 3600) / 60), ss = sec % 60;
  return hh ? `${hh}:${pad2(mm)}:${pad2(ss)}` : `${pad2(mm)}:${pad2(ss)}`;
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const uid = (n = 16) => { const a = new Uint8Array(n); (crypto || window.msCrypto).getRandomValues(a); return Array.from(a, (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join(''); };
export const fmt = (x, dp = 2) => (typeof x === 'number' && isFinite(x) ? (Math.round(x * 10 ** dp) / 10 ** dp).toString() : String(x));
export const money = (x) => (x < 0 ? '-$' : '$') + Math.abs(x).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const pctFmt = (x, dp = 1) => (Math.round(x * 10 ** dp) / 10 ** dp) + '%';
export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduced';

// ---- storage that never throws (private windows, blocked storage)
const mem = {};
export const store = {
  get(k, fallback = null) { try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return k in mem ? mem[k] : fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { mem[k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } delete mem[k]; }
};
export const sstore = {
  get(k, fallback = null) { try { const v = sessionStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch { return k in mem ? mem[k] : fallback; } },
  set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch { mem[k] = v; } },
  del(k) { try { sessionStorage.removeItem(k); } catch { /* ignore */ } delete mem[k]; }
};

/** Polite and assertive screen-reader announcements. */
export function announce(msg, assertive) {
  const el = document.getElementById(assertive ? 'alert' : 'live'); if (!el) return;
  el.textContent = ''; setTimeout(() => { el.textContent = msg; }, 30);
}
export function toast(msg, ms = 2600) {
  const t = h('div', { class: 'toast', role: 'status' }, msg); document.body.append(t); setTimeout(() => t.remove(), ms);
}
export function download(name, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime + ';charset=utf-8' });
  const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
export function downloadBlob(name, blob) { const a = h('a', { href: URL.createObjectURL(blob), download: name }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
export function csvCell(v) { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
export const toCSV = (head, rows) => '﻿' + [head].concat(rows).map((r) => r.map(csvCell).join(',')).join('\r\n');
