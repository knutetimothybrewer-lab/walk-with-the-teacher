'use strict';
var CHM = window.CHM = { config: window.CHM_CONFIG || {}, content: window.CHM_CONTENT, bus: {}, shared: {} };

// Small DOM helper: h('div.cls#id', {attrs}, children...)
CHM.h = function (tag, attrs) {
  var sp = tag.indexOf(' '), extra = [];
  if (sp > 0) { extra = tag.slice(sp + 1).split(/\s+/).filter(Boolean); tag = tag.slice(0, sp); }
  var m = /^([a-z0-9]+)?((?:[.#][\w-]+)*)$/i.exec(tag) || [];
  var el = (/^svg:/.test(tag) ? null : document.createElement(m[1] || 'div'));
  if (!el) return CHM.s.apply(null, arguments);
  (m[2] || '').replace(/([.#])([\w-]+)/g, function (_, k, v) { if (k === '.') el.classList.add(v); else el.id = v; });
  extra.forEach(function (c) { el.classList.add(c); });
  var i = 1;
  if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    i = 2;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className += ' ' + v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (sk) { if (sk.slice(0, 2) === '--') el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; });
      else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'hidden' || k === 'open') { if (v) el[k] = true; }
      else if (k === 'value') el.value = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
  }
  CHM.append(el, Array.prototype.slice.call(arguments, i));
  return el;
};
CHM.append = function (el, kids) {
  kids.forEach(function (k) {
    if (k == null || k === false) return;
    if (Array.isArray(k)) CHM.append(el, k);
    else el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
  });
  return el;
};
var SVGNS = 'http://www.w3.org/2000/svg';
CHM.s = function (tag, attrs) {
  var el = document.createElementNS(SVGNS, tag.replace(/^svg:/, ''));
  var i = 1;
  if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs)) {
    i = 2;
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v == null || v === false) return;
      if (k === 'class') el.setAttribute('class', v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v);
    });
  }
  CHM.append(el, Array.prototype.slice.call(arguments, i));
  return el;
};
var h = CHM.h, S = CHM.s;
CHM.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
CHM.$ = function (sel, root) { return (root || document).querySelector(sel); };
CHM.announce = function (msg) { var l = document.getElementById('live'); if (l) { l.textContent = ''; setTimeout(function () { l.textContent = msg; }, 30); } };
CHM.fmt = function (n) { return (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1'); };
CHM.pts = function (n) { return (Math.round(n * 100) / 100).toFixed(2); };
CHM.uid = function () { var a = new Uint8Array(12); (window.crypto || window.msCrypto).getRandomValues(a); return 'r' + Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); };
CHM.ls = {
  get: function (k) { try { return JSON.parse(localStorage.getItem('chm.' + k)); } catch (e) { return null; } },
  set: function (k, v) { try { localStorage.setItem('chm.' + k, JSON.stringify(v)); } catch (e) { /* cache only */ } },
  del: function (k) { try { localStorage.removeItem('chm.' + k); } catch (e) { /* ignore */ } }
};
CHM.motionOn = function () {
  var m = document.documentElement.getAttribute('data-motion');
  if (m === 'off') return false;
  return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
};
CHM.setMotion = function (on) { document.documentElement.setAttribute('data-motion', on ? 'on' : 'off'); CHM.ls.set('motion', on ? 'on' : 'off'); };
CHM.debounce = function (fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; };
CHM.download = function (name, text, type) {
  var blob = new Blob([text], { type: type || 'text/plain;charset=utf-8' });
  if (window.navigator.msSaveOrOpenBlob) { window.navigator.msSaveOrOpenBlob(blob, name); return; }
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
};
CHM.unitById = function (id) { var r = null; CHM.content.modules.forEach(function (m) { m.units.forEach(function (u) { if (u.id === id) { r = u; r.module = m.id; } }); }); return r; };
CHM.optText = function (list, id) { var o = (list || []).filter(function (x) { return x.id === id; })[0]; return o ? o.t : id; };
CHM.sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
CHM.icon = { ok: '✓', bad: '✕', open: '○', prog: '◐', lock: '🔒' };
