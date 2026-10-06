/* Utilities: safe DOM builder, SHA-256 (sync, so it works on file:// and in Node), seeded RNG, formatting. */
(function (root) {
  'use strict';
  var W = root.WWQ = root.WWQ || {};
  var U = W.U = {};

  /* ---------- safe DOM builder (never uses innerHTML for text) ---------- */
  U.h = function (spec, props) {
    var parts = String(spec).split(/(?=[.#])/), tag = 'div', el;
    if (parts[0] && !/^[.#]/.test(parts[0])) tag = parts.shift();
    var SVGNS = { svg: 1, g: 1, path: 1, circle: 1, rect: 1, line: 1, text: 1, ellipse: 1, polygon: 1, polyline: 1, defs: 1, use: 1, tspan: 1, title: 1, desc: 1 };
    el = SVGNS[tag] ? document.createElementNS('http://www.w3.org/2000/svg', tag) : document.createElement(tag);
    parts.forEach(function (p) {
      if (p[0] === '.') el.classList.add(p.slice(1)); else if (p[0] === '#') el.id = p.slice(1);
    });
    var start = 1, pr = props;
    if (pr && (typeof pr !== 'object' || pr.nodeType || Array.isArray(pr))) { pr = null; start = 1; }
    else if (pr) { start = 2; }
    if (pr) {
      Object.keys(pr).forEach(function (k) {
        var v = pr[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') { String(v).split(/\s+/).forEach(function (c) { if (c) el.classList.add(c); }); }
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') Object.keys(v).forEach(function (s) { el.style.setProperty(s, v[s]); });
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset') Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
        else if (k === 'value' && tag !== 'svg') { el.value = v; el.setAttribute('value', v); }
        else if (k === 'checked' || k === 'disabled' || k === 'hidden' || k === 'selected' || k === 'open') { if (v) el.setAttribute(k, ''); if (k === 'checked') el.checked = !!v; if (k === 'disabled') el.disabled = !!v; }
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    var add = function (c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) { c.forEach(add); return; }
      if (c.nodeType) { el.appendChild(c); return; }
      el.appendChild(document.createTextNode(String(c)));
    };
    for (var i = start; i < arguments.length; i++) add(arguments[i]);
    return el;
  };

  /* Authored text with **bold** and _italic_ and \n paragraphs -> DOM nodes (still no innerHTML). */
  U.rich = function (str) {
    var frag = document.createDocumentFragment();
    String(str == null ? '' : str).split(/\n\n+/).forEach(function (para, pi) {
      var p = U.h('p');
      para.split(/(\*\*[^*]+\*\*)/).forEach(function (seg) {
        if (/^\*\*[^*]+\*\*$/.test(seg)) p.appendChild(U.h('strong', seg.slice(2, -2)));
        else if (seg) p.appendChild(document.createTextNode(seg));
      });
      frag.appendChild(p);
    });
    return frag;
  };
  U.inline = function (str) {
    var span = U.h('span');
    String(str == null ? '' : str).split(/(\*\*[^*]+\*\*)/).forEach(function (seg) {
      if (/^\*\*[^*]+\*\*$/.test(seg)) span.appendChild(U.h('strong', seg.slice(2, -2)));
      else if (seg) span.appendChild(document.createTextNode(seg));
    });
    return span;
  };
  /* Trusted, authored SVG markup only (never put student text in it). */
  U.svg = function (markup, cls) {
    var tpl = document.createElement('template');
    tpl.innerHTML = markup.trim();
    var el = tpl.content.firstChild;
    if (cls && el.classList) cls.split(' ').forEach(function (c) { el.classList.add(c); });
    return el;
  };
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  };
  U.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  /* ---------- SHA-256 (synchronous) ---------- */
  var K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2]);
  var Wk = new Uint32Array(64);
  U.sha256 = function (bytes) {
    var l = bytes.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb);
    m.set(bytes); m[l] = 0x80;
    var bits = l * 8, dv = new DataView(m.buffer);
    dv.setUint32(nb - 8, Math.floor(bits / 4294967296)); dv.setUint32(nb - 4, bits >>> 0);
    var H = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
    for (var o = 0; o < nb; o += 64) {
      var i, a, b, c, d, e, f, g, hh, t1, t2, s0, s1;
      for (i = 0; i < 16; i++) Wk[i] = dv.getUint32(o + i * 4);
      for (i = 16; i < 64; i++) {
        s0 = ((Wk[i - 15] >>> 7) | (Wk[i - 15] << 25)) ^ ((Wk[i - 15] >>> 18) | (Wk[i - 15] << 14)) ^ (Wk[i - 15] >>> 3);
        s1 = ((Wk[i - 2] >>> 17) | (Wk[i - 2] << 15)) ^ ((Wk[i - 2] >>> 19) | (Wk[i - 2] << 13)) ^ (Wk[i - 2] >>> 10);
        Wk[i] = (Wk[i - 16] + s0 + Wk[i - 7] + s1) | 0;
      }
      a = H[0]; b = H[1]; c = H[2]; d = H[3]; e = H[4]; f = H[5]; g = H[6]; hh = H[7];
      for (i = 0; i < 64; i++) {
        s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        t1 = (hh + s1 + ((e & f) ^ (~e & g)) + K[i] + Wk[i]) | 0;
        s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        t2 = (s0 + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += hh;
    }
    var out = new Uint8Array(32), ov = new DataView(out.buffer);
    for (var j = 0; j < 8; j++) ov.setUint32(j * 4, H[j]);
    return out;
  };
  U.utf8 = function (s) { return new TextEncoder().encode(s); };
  U.toHex = function (u8) { var s = ''; for (var i = 0; i < u8.length; i++) s += (u8[i] < 16 ? '0' : '') + u8[i].toString(16); return s; };
  U.sha256hex = function (str) { return U.toHex(U.sha256(U.utf8(str))); };
  U.randomHex = function (nBytes) {
    var a = new Uint8Array(nBytes);
    try { (root.crypto || {}).getRandomValues(a); } catch (e) { for (var i = 0; i < nBytes; i++) a[i] = Math.floor(Math.random() * 256); }
    if (!a.some(function (x) { return x; })) for (var j = 0; j < nBytes; j++) a[j] = Math.floor(Math.random() * 256);
    return U.toHex(a);
  };
  /* Salted, iterated SHA-256 verifier. Deterrent only: a client-side check is never real security. */
  U.deriveVerifier = function (passcode, saltHex, iterations) {
    var pass = U.utf8(String(passcode)), salt = U.utf8(String(saltHex));
    var first = new Uint8Array(salt.length + 1 + pass.length);
    first.set(salt, 0); first[salt.length] = 58; first.set(pass, salt.length + 1);
    var cur = U.sha256(first);
    for (var i = 1; i < iterations; i++) {
      var buf = new Uint8Array(cur.length + salt.length + pass.length);
      buf.set(cur, 0); buf.set(salt, cur.length); buf.set(pass, cur.length + salt.length);
      cur = U.sha256(buf);
    }
    return U.toHex(cur);
  };
  U.constEq = function (a, b) { if (a.length !== b.length) return false; var r = 0; for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

  /* ---------- seeded RNG (stable shuffles across reloads) ---------- */
  U.seedFrom = function (str) { var h = U.sha256(U.utf8(String(str))); return (h[0] << 24 | h[1] << 16 | h[2] << 8 | h[3]) >>> 0; };
  U.mulberry = function (seed) {
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  };
  U.shuffle = function (arr, seedStr) {
    var r = U.mulberry(U.seedFrom(seedStr)), a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };

  /* ---------- misc ---------- */
  U.clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  U.deepFreeze = function (o) { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); Object.keys(o).forEach(function (k) { U.deepFreeze(o[k]); }); } return o; };
  U.fmt1 = function (n) { return (Math.round((n + 1e-9) * 10) / 10).toFixed(1); };
  U.fmt2 = function (n) { var r = Math.round((n + 1e-9) * 100) / 100; return (Math.abs(r - Math.round(r * 10) / 10) < 1e-9 ? r.toFixed(1) : r.toFixed(2)); };
  U.fmtSigned = function (n) { return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n); };
  U.sum = function (a) { return a.reduce(function (s, x) { return s + x; }, 0); };
  U.nowISO = function () { return new Date().toISOString(); };
  U.isObj = function (o) { return o !== null && typeof o === 'object' && !Array.isArray(o); };
  U.pct = function (n, d) { return d ? Math.round((n / d) * 100) : 0; };
  U.stableStringify = function (o) {
    if (Array.isArray(o)) return '[' + o.map(U.stableStringify).join(',') + ']';
    if (o && typeof o === 'object') return '{' + Object.keys(o).sort().map(function (k) { return JSON.stringify(k) + ':' + U.stableStringify(o[k]); }).join(',') + '}';
    return JSON.stringify(o);
  };
})(typeof window !== 'undefined' ? window : globalThis);
