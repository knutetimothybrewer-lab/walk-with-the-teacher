/* svg.js — create SVG elements declaratively. */
const NS = 'http://www.w3.org/2000/svg';

export function s(tag, attrs, ...kids) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'text') el.textContent = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat(Infinity)) {
    if (k === null || k === undefined || k === false) continue;
    el.append(k.nodeType ? k : document.createTextNode(String(k)));
  }
  return el;
}

export function svgRoot(viewBox, label, extra = {}) {
  // Charts with focusable parts use role="group" so keyboard users can reach them.
  return s('svg', { viewBox, role: extra.interactive ? 'group' : 'img', 'aria-label': label, xmlns: NS, class: 'viz', ...(extra.interactive ? {} : extra) });
}
