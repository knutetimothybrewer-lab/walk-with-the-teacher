/* Wildcats Wellness Quest study guide: landscape map, zone panels, labs, quizzes, summit review. No network, no libraries. */
(function () {
  'use strict';
  var G = window.GUIDE;
  var KEY = 'wwq-study-guide-v1';
  var Z = G.ZONES, ZBY = {};
  Z.forEach(function (z) { ZBY[z.id] = z; });
  var DIM = {}; G.DIMS.forEach(function (d) { DIM[d.id] = d; });

  var SHORT = { hub: 'Hub', numbers: 'Numbers', habits: 'Habits', media: 'Media Lab', stop: 'STOP', sim: 'Simulator', final: 'Final Challenge', summit: 'Summit Review' };
  var POS = { hub: [105, 440], numbers: [255, 380], habits: [405, 448], media: [555, 380], stop: [705, 448], sim: [855, 390], final: [985, 335], summit: [1105, 222] };
  var ORDER = Z.map(function (z) { return z.id; }).concat(['summit']);

  /* ---------------------------------------------------------------- state */
  var S = { seen: {}, done: {}, first: {}, best: 0 };
  try { var raw = localStorage.getItem(KEY); if (raw) { var p = JSON.parse(raw); if (p && typeof p === 'object') { S.seen = p.seen || {}; S.done = p.done || {}; S.first = p.first || {}; S.best = +p.best || 0; } } } catch (e) { /* storage unavailable: still works this session */ }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ } }
  function seenCount() { return Z.filter(function (z) { return S.seen[z.id]; }).length; }
  function doneCount(id) { var d = S.done[id] || {}; return Object.keys(d).length; }
  function zoneMastered(z) { return doneCount(z.id) >= z.quiz.length; }
  function masteredCount() { return Z.filter(zoneMastered).length; }
  function summitOpen() { return seenCount() === Z.length; }

  /* ---------------------------------------------------------------- dom helpers */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(el, x); });
    else el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  function $(id) { return document.getElementById(id); }
  var uid = 0; function nid(p) { return p + (++uid); }
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* ---------------------------------------------------------------- landscape */
  function icon(id) {
    var o = '<g stroke="#14213d" stroke-width="2.5" stroke-linejoin="round">';
    switch (id) {
      case 'hub': return o + '<rect x="-34" y="-30" width="68" height="30" fill="#fff"/><path d="M-42 -30 L0 -62 L42 -30 Z" fill="#0b8585"/><circle cx="-24" cy="-14" r="6" fill="#d9482b"/><circle cx="-12" cy="-14" r="6" fill="#6544c2"/><circle cx="0" cy="-14" r="6" fill="#cc2f7d"/><circle cx="12" cy="-14" r="6" fill="#0b8585"/><circle cx="24" cy="-14" r="6" fill="#2c8a3a"/></g>';
      case 'numbers': return o + '<rect x="-34" y="-52" width="68" height="52" fill="#fff"/><rect x="-34" y="-52" width="68" height="10" fill="#cc4a3a"/><path d="M-7 -36 h14 v9 h9 v14 h-9 v9 h-14 v-9 h-9 v-14 h9 z" fill="#cc4a3a" stroke="none"/><rect x="-6" y="-12" width="12" height="12" fill="#cde" /></g>';
      case 'habits': return o + '<rect x="-34" y="-34" width="68" height="34" fill="#fff"/><path d="M-42 -34 L-34 -56 L34 -56 L42 -34 Z" fill="#c98a0a"/><path d="M-12 -18 a12 12 0 1 1 6 11" fill="none" stroke="#c98a0a" stroke-width="5"/><path d="M-12 -18 l-6 -3 l0 8 z" fill="#c98a0a" stroke="none"/></g>';
      case 'media': return o + '<rect x="-34" y="-30" width="68" height="30" fill="#fff"/><path d="M-38 -30 a38 38 0 0 1 76 0 Z" fill="#6a3fc0"/><circle cx="-4" cy="-15" r="9" fill="#fff" stroke="#14213d"/><path d="M3 -8 l10 10" stroke-width="5" stroke-linecap="round"/></g>';
      case 'stop': return o + '<rect x="-4" y="-30" width="8" height="30" fill="#8b6b4a"/><path d="M-14 -66 h28 l14 14 v22 l-14 14 h-28 l-14 -14 v-22 z" transform="translate(0,22) scale(.9) translate(0,-6)" fill="#d33" /><text x="0" y="-12" font-family="Arial" font-weight="900" font-size="14" fill="#fff" stroke="none" text-anchor="middle">STOP</text></g>';
      case 'sim': return o + '<rect x="-36" y="-52" width="72" height="52" fill="#fff"/><rect x="-26" y="-22" width="10" height="22" fill="#3f4ec0"/><rect x="-10" y="-38" width="10" height="38" fill="#7b5ea7"/><rect x="6" y="-30" width="10" height="30" fill="#0b8585"/><rect x="22" y="-44" width="8" height="44" fill="#d9482b"/></g>';
      case 'final': return o + '<rect x="-20" y="-64" width="40" height="64" fill="#fff"/><rect x="-24" y="-72" width="48" height="10" fill="#1f2b6b"/><rect x="-6" y="-48" width="12" height="14" fill="#f5b83d"/><path d="M0 -72 V-92" stroke-width="3"/><path d="M0 -92 l22 6 l-22 6 z" fill="#f5b83d"/></g>';
      case 'summit': return o + '<path d="M0 -8 V-70" stroke-width="3.5"/><path d="M0 -70 l34 10 l-34 12 z" fill="#d33"/></g>';
    }
    return '';
  }
  function smoothPath(pts) {
    var d = 'M' + pts[0][0] + ',' + pts[0][1];
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      var c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6], c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ' C' + c1[0] + ',' + c1[1] + ' ' + c2[0] + ',' + c2[1] + ' ' + p2[0] + ',' + p2[1];
    }
    return d;
  }
  function scene() {
    var trailPts = ORDER.map(function (id) { return [POS[id][0], POS[id][1] + 6]; });
    var tp = smoothPath(trailPts);
    var s = '<svg id="map" viewBox="0 0 1200 560" role="group" aria-label="Interactive landscape map with eight landmarks. Use the Tab key to move between landmarks, Enter to open one." xmlns="http://www.w3.org/2000/svg">';
    s += '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc3f2"/><stop offset=".7" stop-color="#d6efff"/><stop offset="1" stop-color="#fff4d6"/></linearGradient></defs>';
    s += '<rect width="1200" height="560" fill="url(#sky)"/>';
    s += '<circle cx="150" cy="95" r="44" fill="#ffe27a"/><circle cx="150" cy="95" r="62" fill="#ffe27a" opacity=".3"/>';
    s += '<g class="cloud" opacity=".95"><ellipse cx="300" cy="90" rx="60" ry="20" fill="#fff"/><ellipse cx="340" cy="78" rx="40" ry="20" fill="#fff"/></g>';
    s += '<g class="cloud c2" opacity=".9"><ellipse cx="620" cy="140" rx="70" ry="20" fill="#fff"/><ellipse cx="660" cy="126" rx="42" ry="20" fill="#fff"/></g>';
    s += '<g class="cloud c3" opacity=".85"><ellipse cx="900" cy="70" rx="55" ry="16" fill="#fff"/><ellipse cx="930" cy="60" rx="34" ry="16" fill="#fff"/></g>';
    /* far ridges and the summit mountain */
    s += '<path d="M0 330 L120 250 L230 320 L360 230 L500 320 L640 240 L780 330 L900 260 L1010 340 L1200 300 V560 H0Z" fill="#b6c8e8"/>';
    s += '<path d="M900 440 L1105 95 L1300 440Z" fill="#8fa3cc"/><path d="M1105 95 L1060 170 L1090 160 L1105 185 L1125 158 L1150 172 Z" fill="#fff"/>';
    s += '<path d="M0 400 Q150 330 300 380 T600 370 T900 400 T1200 360 V560 H0Z" fill="#a8dcae"/>';
    s += '<path d="M0 470 Q200 410 420 455 T820 450 T1200 430 V560 H0Z" fill="#7ccb8c"/>';
    s += '<path d="M0 520 Q300 480 600 515 T1200 500 V560 H0Z" fill="#5fb878"/>';
    /* trees and flowers */
    [[40, 500], [190, 520], [330, 510], [480, 520], [630, 505], [780, 520], [930, 510], [1060, 520], [1160, 505]].forEach(function (t) {
      s += '<g transform="translate(' + t[0] + ',' + t[1] + ')"><rect x="-3" y="-14" width="6" height="16" fill="#7a5a3a"/><circle cy="-26" r="15" fill="#2c8a3a"/><circle cx="-8" cy="-20" r="10" fill="#37a34a"/></g>';
    });
    [[60, 535], [260, 540], [520, 538], [700, 540], [880, 536], [1010, 540]].forEach(function (f, i) {
      var c = ['#ff7a90', '#ffd166', '#c9a7ff'][i % 3];
      s += '<g transform="translate(' + f[0] + ',' + f[1] + ')"><circle r="5" fill="' + c + '"/><circle r="2" fill="#fff"/></g>';
    });
    /* trail */
    s += '<path d="' + tp + '" fill="none" stroke="#f1dfb0" stroke-width="22" stroke-linecap="round"/>';
    s += '<path class="trail-anim" d="' + tp + '" fill="none" stroke="#c9a85c" stroke-width="3" stroke-linecap="round"/>';
    /* landmarks */
    ORDER.forEach(function (id) {
      var x = POS[id][0], y = POS[id][1], z = ZBY[id], n = z ? z.n : '★';
      var name = id === 'summit' ? 'Summit Review' : z.name;
      s += '<g class="spot" id="spot-' + id + '" data-id="' + id + '" role="button" tabindex="0" transform="translate(' + x + ',' + y + ')">';
      s += '<title>' + name + '</title><circle class="ring" cx="0" cy="-32" r="56"/><circle cx="0" cy="-32" r="56" fill="transparent"/>' + icon(id);
      s += '<g transform="translate(0,26)"><circle cx="-' + (SHORT[id].length * 4.3 + 14) + '" cy="-5" r="11" fill="' + (z ? z.color : '#d99a14') + '" stroke="#fff" stroke-width="2.5"/><text x="-' + (SHORT[id].length * 4.3 + 14) + '" y="0" text-anchor="middle" font-family="Arial" font-weight="800" font-size="13" fill="#fff">' + n + '</text><text class="lbl" x="4" y="0">' + SHORT[id] + '</text></g>';
      s += '<g class="badge" id="badge-' + id + '" transform="translate(30,-72)"></g></g>';
    });
    /* mascot */
    s += '<g id="pounce" style="transform:translate(60px,420px)" aria-hidden="true"><g class="bob"><circle r="16" fill="#f0902f" stroke="#14213d" stroke-width="2.5"/><path d="M-14 -8 L-12 -26 L-3 -14 Z M14 -8 L12 -26 L3 -14 Z" fill="#f0902f" stroke="#14213d" stroke-width="2.5" stroke-linejoin="round"/><circle cx="-6" cy="-2" r="2.5" fill="#14213d"/><circle cx="6" cy="-2" r="2.5" fill="#14213d"/><path d="M-3 5 q3 3 6 0" fill="none" stroke="#14213d" stroke-width="2" stroke-linecap="round"/><path d="M-16 2 h-10 M16 2 h10" stroke="#14213d" stroke-width="2" stroke-linecap="round"/></g></g>';
    return s + '</svg>';
  }
  function movePounce(id) {
    var p = $('pounce'); if (!p) return;
    var pos = POS[id]; p.style.transform = 'translate(' + (pos[0] - 62) + 'px,' + (pos[1] - 6) + 'px)';
    var sc = document.querySelector('.land-scroll'), sp = $('spot-' + id);
    if (sc && sp && sc.scrollWidth > sc.clientWidth) {
      var scale = sc.scrollWidth / 1200; sc.scrollTo({ left: Math.max(0, pos[0] * scale - sc.clientWidth / 2), behavior: 'smooth' });
    }
  }
  function refreshMap() {
    ORDER.forEach(function (id) {
      var b = $('badge-' + id), sp = $('spot-' + id); if (!b || !sp) return;
      var z = ZBY[id], locked = id === 'summit' && !summitOpen();
      var state = id === 'summit' ? (S.best >= 8 ? 'done' : (S.best > 0 ? 'seen' : '')) : (zoneMastered(z) ? 'done' : (S.seen[id] ? 'seen' : ''));
      var label = id === 'summit' ? 'Summit Review' : z.name;
      var status = locked ? 'locked until you have visited all seven landmarks' : (state === 'done' ? 'complete' : state === 'seen' ? 'visited' : 'not visited');
      sp.setAttribute('aria-label', label + ', ' + status);
      sp.setAttribute('aria-disabled', locked ? 'true' : 'false');
      sp.classList.toggle('locked', locked);
      if (locked) b.innerHTML = '<circle r="14" fill="#55607c" stroke="#fff" stroke-width="3"/><text y="5" text-anchor="middle" font-size="14">🔒</text>';
      else if (state === 'done') b.innerHTML = '<circle r="14" class="badge-done"/><path d="M-6 0 l5 5 l9 -10" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>';
      else if (state === 'seen') b.innerHTML = '<circle r="14" class="badge-seen"/><text y="5" text-anchor="middle" font-size="15" font-weight="900" fill="#3a2800">•</text>';
      else b.innerHTML = '';
    });
    var tn = $('trailnav');
    if (tn) Array.prototype.forEach.call(tn.querySelectorAll('.tn'), function (btn) {
      var id = btn.getAttribute('data-id'), z = ZBY[id];
      var st = id === 'summit' ? (summitOpen() ? (S.best ? 'best ' + S.best + '/10' : 'open') : 'locked') : (zoneMastered(z) ? '✓ ' + doneCount(id) + '/' + z.quiz.length : doneCount(id) + '/' + z.quiz.length);
      btn.querySelector('.st').textContent = st; btn.disabled = (id === 'summit' && !summitOpen());
    });
    var sc = seenCount(), mc = masteredCount();
    $('p1').style.width = (sc / Z.length * 100) + '%'; $('p1t').textContent = sc + ' of ' + Z.length;
    $('p2').style.width = (mc / Z.length * 100) + '%'; $('p2t').textContent = mc + ' of ' + Z.length;
  }

  /* ---------------------------------------------------------------- panel */
  var cur = { id: null, tab: 'notes' };
  var TABS = [['notes', 'Field notes'], ['lab', 'Try it'], ['quiz', 'Check yourself']];

  function openZone(id, tab) {
    if (id === 'summit' && !summitOpen()) { announce('Visit all seven landmarks first to unlock the Summit Review.'); return; }
    cur.id = id; cur.tab = tab || 'notes';
    Array.prototype.forEach.call(document.querySelectorAll('.spot'), function (s) { s.classList.toggle('on', s.getAttribute('data-id') === id); });
    Array.prototype.forEach.call(document.querySelectorAll('.tn'), function (b) { b.setAttribute('aria-current', b.getAttribute('data-id') === id ? 'true' : 'false'); });
    if (ZBY[id] && !S.seen[id]) { S.seen[id] = true; save(); }
    movePounce(id); refreshMap(); renderPanel(true);
  }
  function announce(msg) { var a = $('live'); a.textContent = ''; setTimeout(function () { a.textContent = msg; }, 30); }

  function renderPanel(focus) {
    var host = $('panel'); host.innerHTML = ''; host.hidden = false;
    if (cur.id === 'summit') { host.style.setProperty('--zc', '#d99a14'); host.appendChild(summitPanel()); }
    else {
      var z = ZBY[cur.id]; host.style.setProperty('--zc', z.color);
      var head = h('div', { class: 'panel-h' },
        h('div', null, h('div', { class: 'kick' }, 'Landmark ' + z.n + ' · ' + z.mission), h('h2', { id: 'ph', tabindex: '-1' }, z.name), h('div', { class: 'muted' }, z.sub)),
        h('div', { class: 'muted small' }, 'Quiz: ' + doneCount(z.id) + ' of ' + z.quiz.length + ' answered correctly'));
      host.appendChild(head);
      host.appendChild(h('p', { class: 'pounce-say' }, '🐾 Pounce says: ' + z.pounce));
      var tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': z.name + ' sections' });
      TABS.forEach(function (t, i) {
        tabs.appendChild(h('button', { class: 'tab', role: 'tab', id: 'tab-' + t[0], 'aria-selected': cur.tab === t[0] ? 'true' : 'false', 'aria-controls': 'tp', tabindex: cur.tab === t[0] ? '0' : '-1',
          onclick: function () { cur.tab = t[0]; renderPanel(false); document.getElementById('tab-' + t[0]).focus(); },
          onkeydown: function (e) { var k = e.key, n = k === 'ArrowRight' ? i + 1 : k === 'ArrowLeft' ? i - 1 : null; if (n == null) return; e.preventDefault(); n = (n + TABS.length) % TABS.length; cur.tab = TABS[n][0]; renderPanel(false); document.getElementById('tab-' + TABS[n][0]).focus(); } }, t[1]));
      });
      host.appendChild(tabs);
      var body = h('div', { class: 'tabpanel', role: 'tabpanel', id: 'tp', 'aria-labelledby': 'tab-' + cur.tab, tabindex: '0' });
      if (cur.tab === 'notes') body.appendChild(notesView(z)); else if (cur.tab === 'lab') body.appendChild(labView(z)); else body.appendChild(quizView(z));
      host.appendChild(body);
    }
    if (focus) { host.scrollIntoView({ behavior: 'smooth', block: 'start' }); var ph = $('ph') || $('sh'); if (ph) ph.focus({ preventScroll: true }); }
  }

  /* ---------------------------------------------------------------- notes */
  function notesView(z) {
    var w = h('div');
    z.notes.forEach(function (n) {
      var d = h('section', { class: 'note' }, h('h3', null, n.h), n.p ? h('p', null, n.p) : null);
      if (n.list) d.appendChild(h('ul', null, n.list.map(function (t) { return h('li', null, t); })));
      if (n.dims) d.appendChild(flips());
      if (n.table) d.appendChild(h('div', { class: 'tbl-wrap' }, h('table', null, h('thead', null, h('tr', null, n.head.map(function (x) { return h('th', { scope: 'col' }, x); }))),
        h('tbody', null, n.table.map(function (r) { return h('tr', null, r.map(function (c, i) { return i === 0 ? h('th', { scope: 'row' }, c) : h('td', null, c); })); })))));
      if (n.loop) d.appendChild(h('div', { class: 'loop' },
        h('div', { class: 'loopcard' }, h('b', null, '1. Cue'), 'The trigger. Example: I sit down at my desk.'),
        h('div', { class: 'loopcard' }, h('b', null, '2. Routine'), 'The small action. Example: open my planner and write one task.'),
        h('div', { class: 'loopcard' }, h('b', null, '3. Reward'), 'A quick, connected payoff. Example: check a box and play a favorite song.')));
      if (n.smart) d.appendChild(h('div', { class: 'smart' }, [['S', 'Specific'], ['M', 'Measurable'], ['A', 'Achievable'], ['R', 'Relevant'], ['T', 'Time-bound']].map(function (x) { return h('span', null, h('b', null, x[0]), ' ' + x[1]); })));
      if (n.fourtabs) d.appendChild(h('div', { class: 'fourcards' },
        h('div', { class: 'fc' }, h('b', null, 'Author'), 'Who made it? Are credentials named and checkable?'),
        h('div', { class: 'fc' }, h('b', null, 'Evidence'), 'What research actually supports the claim? Testimonials are not research.'),
        h('div', { class: 'fc' }, h('b', null, 'Purpose'), 'Why was it posted? To inform, entertain, or sell?'),
        h('div', { class: 'fc' }, h('b', null, 'Independent'), 'Do separate sources confirm it, or are they copies?')));
      if (n.stop) d.appendChild(h('div', { class: 'stopcards' }, [['S', 'State', 'State the decision or problem clearly.'], ['T', 'Think', 'Think of at least two options.'], ['O', 'Observe', 'Observe consequences: right away and repeated over time.'], ['P', 'Pick', 'Pick a responsible, health-enhancing choice and explain why.']].map(function (x) {
        return h('div', { class: 'sc' }, h('div', { class: 'big' }, x[0]), h('b', null, x[1]), x[2]); })));
      if (n.cats) d.appendChild(h('div', { class: 'tbl-wrap' }, h('table', null, h('thead', null, h('tr', null, ['Domain', 'Categories (weight)', 'Daily max', 'Weekly limit'].map(function (x) { return h('th', { scope: 'col' }, x); }))),
        h('tbody', null, G.DIMS.map(function (dm) {
          var cs = G.CATS.filter(function (c) { return c.dom === dm.id; }), mx = cs.reduce(function (a, c) { return a + c.w; }, 0);
          return h('tr', null, h('th', { scope: 'row' }, dm.name), h('td', null, cs.map(function (c) { return c.n + ' (' + c.w + ')'; }).join(', ')), h('td', null, '+' + mx), h('td', null, '±' + mx * 7));
        })))));
      if (n.cer) d.appendChild(h('div', { class: 'fourcards' },
        h('div', { class: 'fc' }, h('b', null, 'Claim'), 'Your answer. Example: Skipping lunch is rippling into Mental and Social wellness.'),
        h('div', { class: 'fc' }, h('b', null, 'Evidence'), 'A fact in the case. Example: headache by afternoon, snapped at a friend.'),
        h('div', { class: 'fc' }, h('b', null, 'Reasoning'), 'The “because.” Example: Not eating lowers energy and concentration, which can shorten patience.')));
      w.appendChild(d);
    });
    w.appendChild(h('section', { class: 'note' }, h('h3', null, 'Key terms'), h('ul', { class: 'terms' }, z.keyTerms.map(function (k) { return h('li', null, h('b', null, k[0]), k[1]); }))));
    w.appendChild(h('div', { class: 'chips' }, h('button', { class: 'btn primary', onclick: function () { cur.tab = 'lab'; renderPanel(false); document.getElementById('tab-lab').focus(); } }, 'Next: Try it →')));
    return w;
  }
  function flips() {
    var box = h('div', { class: 'flips' });
    G.DIMS.forEach(function (d) {
      var b = h('button', { class: 'flip', 'aria-pressed': 'false', style: '--dc:' + d.color + ';--ds:' + d.soft });
      function paint(open) { b.innerHTML = ''; b.setAttribute('aria-pressed', open ? 'true' : 'false'); add(b, [h('span', { class: 't' }, d.ico + ' ' + d.name), open ? h('span', null, d.what + ' Example: ' + d.ex) : h('span', null, 'What do you think this covers?'), h('span', { class: 'hint' }, open ? 'Tap to flip back' : 'Tap to reveal')]); }
      b.addEventListener('click', function () { paint(b.getAttribute('aria-pressed') !== 'true'); }); paint(false); box.appendChild(b);
    });
    return box;
  }

  /* ---------------------------------------------------------------- labs */
  function labView(z) {
    var w = h('div', { class: 'lab' });
    var t = z.lab.type;
    ({ ripple: labRipple, dials: labDials, habitlab: labHabit, inspector: labInspector, stoplab: labStop, calc: labCalc, cer: labCer })[t](w);
    var nav = h('div', { class: 'chips' }, h('button', { class: 'btn primary', onclick: function () { cur.tab = 'quiz'; renderPanel(false); document.getElementById('tab-quiz').focus(); } }, 'Next: Check yourself →'));
    return h('div', null, w, nav);
  }
  function dimTag(id) { var d = DIM[id]; return h('span', { class: 'dimtag', style: 'background:' + d.color }, d.ico + ' ' + d.name); }

  function labRipple(w) {
    w.appendChild(h('h3', null, 'Ripple Maker'));
    w.appendChild(h('p', null, 'Pick a starting action, then follow the ripple one link at a time.'));
    var chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Starting actions' }), out = h('div', { 'aria-live': 'polite' });
    G.RIPPLES.forEach(function (r) {
      var b = h('button', { class: 'chip', 'aria-pressed': 'false', onclick: function () {
        Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); run(r); } }, r.start.split('.')[0].split(' ').slice(0, 3).join(' ') + '…');
      b.textContent = ({ sleep: 'Late-night gaming', walk: 'Walking to school', argument: 'Argument at lunch', band: 'Joining band' })[r.id]; chips.appendChild(b);
    });
    function run(r) {
      out.innerHTML = ''; var i = 0;
      out.appendChild(h('div', { class: 'link' }, dimTag(r.main), h('span', null, r.start)));
      var btn = h('button', { class: 'btn gold', onclick: function () {
        var l = r.chain[i++]; out.insertBefore(h('div', { class: 'link arrowdown' }, dimTag(l[0]), h('span', null, l[1])), btn.parentNode);
        if (i >= r.chain.length) { btn.parentNode.replaceWith(h('div', { class: 'result' }, h('b', null, 'Takeaway'), r.fix)); } } }, 'Follow the ripple →');
      out.appendChild(h('div', null, btn));
    }
    w.appendChild(chips); w.appendChild(out);
  }

  function labDials(w) {
    w.appendChild(h('h3', null, 'Number Dials'));
    w.appendChild(h('p', { class: 'muted' }, 'Fictional adult readings. Slide to see how the reference ranges work. Reference examples only, not medical advice.'));
    var grid = h('div', { class: 'grid2' });
    function dial(title, sliders, calc) {
      var res = h('div', { class: 'result', role: 'status' }), box = h('div', { class: 'dial' }, h('h4', null, title));
      var vals = sliders.map(function (s) {
        var id = nid('s'), out = h('output', { for: id }, s.v), inp = h('input', { type: 'range', id: id, min: s.min, max: s.max, value: s.v, 'aria-label': s.l });
        inp.addEventListener('input', update); box.appendChild(h('label', { for: id }, s.l + ': ', out, ' ' + s.u)); box.appendChild(inp); return { inp: inp, out: out };
      });
      function update() { var v = vals.map(function (x) { x.out.textContent = x.inp.value; return +x.inp.value; }); var r = calc.apply(null, v); res.className = 'result' + (r.tone === 'ok' ? '' : ' ' + r.tone); res.innerHTML = ''; res.appendChild(h('b', null, r.cat)); res.appendChild(document.createTextNode(r.msg)); }
      box.appendChild(res); update(); grid.appendChild(box);
    }
    dial('Blood pressure (mmHg)', [{ l: 'Top number', min: 90, max: 200, v: 118, u: 'mmHg' }, { l: 'Bottom number', min: 50, max: 125, v: 84, u: 'mmHg' }], G.METRIC_NOTES.bp);
    dial('Resting heart rate', [{ l: 'Beats per minute', min: 40, max: 130, v: 72, u: 'bpm' }], G.METRIC_NOTES.hr);
    dial('Fasting blood glucose', [{ l: 'Glucose', min: 60, max: 180, v: 92, u: 'mg/dL' }], G.METRIC_NOTES.glu);
    w.appendChild(grid);
    w.appendChild(h('p', { class: 'small muted', style: 'margin-top:10px' }, 'Try 118 over 84: the bottom number puts it in the Stage 1 category even though the top is under 130.'));
  }

  function labHabit(w) {
    w.appendChild(h('h3', null, 'SMART Checker'));
    w.appendChild(h('p', null, 'Tick every SMART part the goal already has, then check. (S Specific, M Measurable, A Achievable, R Relevant, T Time-bound.)'));
    G.SMART_GOALS.forEach(function (g, gi) {
      var fs = h('fieldset', { class: 'post' }, h('legend', null, 'Goal ' + (gi + 1) + ': “' + g.text + '”')), boxes = {}, res = h('div', { 'aria-live': 'polite' });
      var row = h('div', { class: 'chips' });
      ['S', 'M', 'A', 'R', 'T'].forEach(function (k) { var id = nid('c'), cb = h('input', { type: 'checkbox', id: id }); boxes[k] = cb; row.appendChild(h('label', { class: 'chip', for: id }, cb, ' ' + k)); });
      fs.appendChild(row);
      fs.appendChild(h('button', { class: 'btn sm', onclick: function () {
        var wrong = []; Object.keys(g.has).forEach(function (k) { if (!!g.has[k] !== boxes[k].checked) wrong.push(k); });
        res.innerHTML = ''; res.appendChild(h('div', { class: 'result' + (wrong.length ? ' warn' : '') }, h('b', null, wrong.length ? 'Not quite: look again at ' + wrong.join(', ') : 'Yes, all correct'), g.why));
      } }, 'Check'));
      fs.appendChild(res); w.appendChild(fs); fs.style.marginBottom = '10px';
    });
    w.appendChild(h('h3', { style: 'margin-top:18px' }, 'Habit Stacker'));
    var sel = {}, out = h('div', { class: 'sentence', 'aria-live': 'polite' });
    function s(label, arr) { var id = nid('sel'), el = h('select', { id: id }, arr.map(function (o) { return h('option', { value: o }, o); })); sel[label] = el; el.addEventListener('change', up); return h('label', { for: id }, label + ' ', el); }
    var row = h('div', { class: 'chips' }, s('After I', G.HABIT_STACK.anchors), s('I will', G.HABIT_STACK.actions), s('Then I will', G.HABIT_STACK.rewards));
    function up() { out.textContent = 'After I ' + sel['After I'].value + ', I will ' + sel['I will'].value + '. Then I will ' + sel['Then I will'].value + '.  (Cue → Routine → Reward)'; }
    w.appendChild(h('p', null, 'Build a stack: an existing routine is the cue, a tiny action is the routine, and a quick reward closes the loop.')); w.appendChild(row); w.appendChild(out); up();
  }

  function labInspector(w) {
    w.appendChild(h('h3', null, 'Post Inspector (fictional posts)'));
    w.appendChild(h('p', null, 'Open all four tabs, then rate the post.'));
    var wrap = h('div'); w.appendChild(wrap);
    var names = { author: 'Author', evidence: 'Evidence', purpose: 'Purpose', indep: 'Independent' };
    G.POSTS.forEach(function (p) {
      var opened = {}, nOpen = 0, content = h('div', { class: 'tabcontent', 'aria-live': 'polite' }, 'Choose a tab to investigate.'), res = h('div', { 'aria-live': 'polite' });
      var rate = h('div', { class: 'chips', role: 'group', 'aria-label': 'Rating' });
      var tabs = h('div', { class: 'chips', role: 'group', 'aria-label': 'Investigation tabs' });
      Object.keys(names).forEach(function (k) {
        tabs.appendChild(h('button', { class: 'chip', 'aria-pressed': 'false', onclick: function (e) {
          Array.prototype.forEach.call(tabs.children, function (c) { c.setAttribute('aria-pressed', 'false'); }); e.currentTarget.setAttribute('aria-pressed', 'true');
          content.textContent = p.tabs[k]; if (!opened[k]) { opened[k] = 1; nOpen++; if (nOpen === 4) Array.prototype.forEach.call(rate.children, function (c) { c.disabled = false; }); }
        } }, names[k]));
      });
      [['cred', 'Credible'], ['quest', 'Questionable'], ['not', 'Not Credible']].forEach(function (r) {
        rate.appendChild(h('button', { class: 'chip', disabled: true, onclick: function () {
          var ok = r[0] === p.answer; res.innerHTML = ''; res.appendChild(h('div', { class: 'result' + (ok ? '' : ' warn') }, h('b', null, ok ? 'Good call: ' + r[1] : 'Not quite. Review all four tabs again.'), p.why));
        } }, r[1]));
      });
      wrap.appendChild(h('div', { class: 'post', style: 'margin-bottom:12px' }, h('div', { class: 'hd' }, h('span', { class: 'av', 'aria-hidden': 'true' }, '👤'), p.handle + ' · ' + p.platform), h('q', null, p.text), tabs, content, h('div', { class: 'small', style: 'margin-top:8px' }, 'Rate it (unlocks after all four tabs):'), rate, res));
    });
  }

  function labStop(w) {
    var c = G.STOP_CASE, i = 0;
    w.appendChild(h('h3', null, 'STOP Walkthrough: ' + c.title));
    w.appendChild(h('p', null, c.story));
    var out = h('div', { 'aria-live': 'polite' }); w.appendChild(out);
    function step() {
      var s = c.steps[i]; var box = h('div', { class: 'q' }, h('div', { class: 'qt' }, s.k + ' = ' + s.t + '. ' + s.q));
      var fb = h('div');
      s.o.forEach(function (t, oi) {
        var b = h('button', { class: 'qo', onclick: function () {
          if (oi !== s.a) { b.classList.add('wrong'); b.disabled = true; fb.innerHTML = ''; fb.appendChild(h('div', { class: 'fb no' }, 'Not that one. Try another option.')); return; }
          Array.prototype.forEach.call(box.querySelectorAll('.qo'), function (x) { x.disabled = true; }); b.classList.add('right'); fb.innerHTML = ''; fb.appendChild(h('div', { class: 'fb ok' }, s.why));
          if (++i < c.steps.length) fb.appendChild(h('div', { style: 'margin-top:8px' }, h('button', { class: 'btn sm gold', onclick: function () { step(); } }, 'Next step →')));
          else fb.appendChild(h('div', { class: 'result', style: 'margin-top:8px' }, h('b', null, 'STOP complete'), 'More than one pick could be responsible. What matters is a safe, feasible choice with reasons that match the facts.'));
        } }, t); box.appendChild(b);
      });
      box.appendChild(fb); out.appendChild(box); box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    step();
  }

  function labCalc(w) {
    w.appendChild(h('h3', null, 'Physical Domain Calculator'));
    w.appendChild(h('p', null, 'A = +weight, B = 0, C = −weight. Set today’s grades and watch the subtotal.'));
    var cats = G.CATS.filter(function (c) { return c.dom === 'phys'; }), grade = {}, sub = h('div', { class: 'result', role: 'status' });
    cats.forEach(function (c) { grade[c.id] = 'B'; });
    var rows = h('div');
    cats.forEach(function (c) {
      var g = h('div', { class: 'g', role: 'group', 'aria-label': c.n + ' grade' });
      ['A', 'B', 'C'].forEach(function (x) { g.appendChild(h('button', { class: 'gradebtn', 'aria-pressed': x === 'B' ? 'true' : 'false', 'aria-label': c.n + ' grade ' + x, onclick: function () { grade[c.id] = x; Array.prototype.forEach.call(g.children, function (b) { b.setAttribute('aria-pressed', b.textContent === x ? 'true' : 'false'); }); up(); } }, x)); });
      rows.appendChild(h('div', { class: 'crow' }, h('span', null, c.n + ' (weight ' + c.w + ')'), g));
    });
    function up() { var t = 0, parts = []; cats.forEach(function (c) { var v = grade[c.id] === 'A' ? c.w : grade[c.id] === 'C' ? -c.w : 0; t += v; parts.push((v >= 0 ? '+' : '−') + Math.abs(v)); }); sub.innerHTML = ''; sub.appendChild(h('b', null, 'Physical subtotal: ' + (t > 0 ? '+' : t < 0 ? '−' : '') + Math.abs(t) + ' of a possible +8')); sub.appendChild(document.createTextNode(parts.join(' ') + ' = ' + t)); }
    w.appendChild(rows); w.appendChild(sub); up();
    w.appendChild(h('h3', { style: 'margin-top:20px' }, 'The Maxima Trap'));
    w.appendChild(h('p', null, 'Domains have different maximums. Toggle the view and find the domain that is weakest compared with its OWN maximum.'));
    var mode = 'raw', chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'View' }), bars = h('div', { class: 'bars', 'aria-live': 'polite' });
    [['raw', 'Raw points'], ['pct', '% of own maximum']].forEach(function (m) { var b = h('button', { class: 'chip', 'aria-pressed': m[0] === 'raw' ? 'true' : 'false', onclick: function () { mode = m[0]; Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute('aria-pressed', c === b ? 'true' : 'false'); }); draw(); } }, m[1]); chips.appendChild(b); });
    function draw() {
      bars.innerHTML = ''; var vals = G.TRAP.map(function (t) { return mode === 'raw' ? t.val : t.val / t.max * 100; }), lo = Math.min.apply(null, vals), lim = mode === 'raw' ? 25 : 60;
      G.TRAP.forEach(function (t, i) {
        var v = vals[i], pct = Math.min(50, Math.abs(v) / lim * 50), fill = h('div', { class: 'bfill ' + (v < 0 ? 'neg' : 'pos'), style: 'width:' + pct + '%;' + (v < 0 ? 'right:50%' : 'left:50%') });
        bars.appendChild(h('div', { class: 'brow' + (v === lo ? ' low' : '') }, h('span', null, DIM[t.dom].name), h('div', { class: 'btrack' }, fill), h('span', null, mode === 'raw' ? (v > 0 ? '+' : '') + v : (v > 0 ? '+' : '') + v.toFixed(1) + '%')));
      });
    }
    w.appendChild(chips); w.appendChild(bars); draw();
    w.appendChild(h('p', { class: 'small muted', style: 'margin-top:8px' }, 'Raw view: Social (−21 of 56) looks lowest. Percent view: Environmental (−14 of 35 = −40%) is weakest relative to its own maximum.'));
  }

  function labCer(w) {
    var c = G.CER_CASE;
    w.appendChild(h('h3', null, 'CER Builder'));
    w.appendChild(h('p', null, c.story));
    var picks = {}, res = h('div', { 'aria-live': 'polite' });
    [['claim', 'Claim: what is happening?'], ['evidence', 'Evidence: which fact is actually in the case?'], ['reasoning', 'Reasoning: why does the evidence support the claim?']].forEach(function (s) {
      var fs = h('fieldset', null, h('legend', null, s[1])), name = nid('cer');
      c[s[0]].forEach(function (o) { var id = nid('o'); fs.appendChild(h('div', { class: 'opt' }, h('input', { type: 'radio', name: name, id: id, onchange: function () { picks[s[0]] = o[2]; } }), h('label', { for: id }, o[1]))); });
      w.appendChild(fs);
    });
    w.appendChild(h('button', { class: 'btn primary', onclick: function () {
      res.innerHTML = '';
      if (['claim', 'evidence', 'reasoning'].some(function (k) { return picks[k] == null; })) { res.appendChild(h('div', { class: 'result warn' }, h('b', null, 'Choose one from each part first.'))); return; }
      var bad = ['claim', 'evidence', 'reasoning'].filter(function (k) { return !picks[k]; });
      res.appendChild(bad.length ? h('div', { class: 'result warn' }, h('b', null, 'Check your ' + bad.join(' and ') + '.'), 'Evidence must be a fact in the case, and reasoning must link it to your claim.')
        : h('div', { class: 'result' }, h('b', null, 'Strong, matching C-E-R'), c.plan));
    } }, 'Check my argument'));
    w.appendChild(res);
  }

  /* ---------------------------------------------------------------- quiz */
  function quizQuestion(zid, qi, q, opts) {
    var done = opts && opts.review ? null : (S.done[zid] || {})[qi];
    var box = h('div', { class: 'q' + (done ? ' done' : ''), role: 'group', 'aria-labelledby': 'q-' + zid + qi }), fb = h('div', { 'aria-live': 'polite' }), btns = [];
    box.appendChild(h('div', { class: 'qt', id: 'q-' + zid + qi }, (qi + 1) + '. ' + q.q));
    q.o.forEach(function (t, oi) {
      var b = h('button', { class: 'qo' + (done && oi === q.a ? ' right' : ''), disabled: !!done, onclick: function () { pick(oi, b); } }, t); btns.push(b); box.appendChild(b);
    });
    box.appendChild(fb);
    if (done) fb.appendChild(h('div', { class: 'fb ok' }, '✓ ' + q.why));
    function pick(oi, b) {
      if (oi === q.a) {
        btns.forEach(function (x) { x.disabled = true; }); b.classList.add('right'); box.classList.add('done'); fb.innerHTML = ''; fb.appendChild(h('div', { class: 'fb ok' }, '✓ Correct. ' + q.why));
        if (opts && opts.onRight) opts.onRight(oi === q.a, !b.dataset.miss);
        else { S.done[zid] = S.done[zid] || {}; S.done[zid][qi] = true; S.first[zid] = S.first[zid] || {}; if (S.first[zid][qi] == null) S.first[zid][qi] = !box.dataset.miss; save(); refreshMap(); zoneProgress(); }
      } else {
        b.classList.add('wrong'); b.disabled = true; box.dataset.miss = '1'; fb.innerHTML = ''; fb.appendChild(h('div', { class: 'fb no' }, 'Not quite. Re-read the field notes and try another answer.'));
        if (opts && opts.onWrong) opts.onWrong();
      }
    }
    return box;
  }
  function zoneProgress() {
    var z = ZBY[cur.id]; if (!z) return; var el = $('qscore'); if (!el) return;
    var n = doneCount(z.id); el.textContent = n + ' of ' + z.quiz.length + ' correct';
    var hd = document.querySelector('.panel-h .muted.small'); if (hd) hd.textContent = 'Quiz: ' + n + ' of ' + z.quiz.length + ' answered correctly';
    var c = $('qdone'); if (n >= z.quiz.length) { c.hidden = false; }
  }
  function quizView(z) {
    var w = h('div');
    w.appendChild(h('p', null, 'Practice questions. Wrong answers do not cost anything: use the hint and try again. Answer all of them correctly to earn this landmark’s check mark.'));
    w.appendChild(h('div', { class: 'score', id: 'qscore' }, doneCount(z.id) + ' of ' + z.quiz.length + ' correct'));
    z.quiz.forEach(function (q, i) { w.appendChild(quizQuestion(z.id, i, q)); });
    var idx = ORDER.indexOf(z.id), nxt = ORDER[idx + 1];
    w.appendChild(h('div', { class: 'congrats', id: 'qdone', hidden: !zoneMastered(z) }, h('span', null, '🎉 Landmark complete! ' + z.name + ' mastered.'),
      h('button', { class: 'btn primary', onclick: function () { if (nxt === 'summit' && !summitOpen()) { announce('Visit the remaining landmarks to unlock the Summit.'); return; } openZone(nxt); } }, nxt === 'summit' ? 'Go to the Summit →' : 'Next landmark: ' + SHORT[nxt] + ' →')));
    return w;
  }

  /* ---------------------------------------------------------------- summit review */
  var summit = null;
  function newSummit() {
    var pool = []; Z.forEach(function (z) { z.quiz.forEach(function (q, i) { pool.push({ z: z, q: q }); }); });
    summit = { items: shuffle(pool).slice(0, 10), right: 0, answered: 0, missed: {} };
  }
  function summitPanel() {
    if (!summit) newSummit();
    var w = h('div'), head = h('div', { class: 'panel-h' }, h('div', null, h('div', { class: 'kick' }, 'Landmark ★'), h('h2', { id: 'sh', tabindex: '-1' }, 'Summit Review'), h('div', { class: 'muted' }, 'Ten mixed questions from every landmark')),
      h('div', { class: 'muted small' }, 'Best score: ' + S.best + ' of 10'));
    w.appendChild(head);
    w.appendChild(h('p', { class: 'pounce-say' }, '🐾 Pounce says: Questions are drawn from all seven landmarks. Tap “New set” for a fresh mix.'));
    var body = h('div', { class: 'tabpanel' }), score = h('div', { class: 'score', 'aria-live': 'polite' }, 'First-try correct: 0 of 0 answered');
    body.appendChild(score);
    var res = h('div');
    summit.items.forEach(function (it, i) {
      body.appendChild(quizQuestion('sm', i, it.q, { review: true,
        onRight: function (ok, first) { summit.answered++; if (!summit.items[i].miss) summit.right++; progress(); },
        onWrong: function () { summit.items[i].miss = true; summit.missed[it.z.id] = true; } }));
    });
    function progress() {
      score.textContent = 'First-try correct: ' + summit.right + ' of ' + summit.answered + ' answered';
      if (summit.answered === 10) {
        if (summit.right > S.best) { S.best = summit.right; save(); refreshMap(); }
        res.innerHTML = ''; var miss = Object.keys(summit.missed);
        res.appendChild(h('div', { class: 'congrats' }, h('span', null, summit.right >= 8 ? '🏔️ You reached the summit! ' + summit.right + ' of 10 on the first try.' : 'You finished: ' + summit.right + ' of 10 on the first try. Review and try a new set.'),
          h('span', { class: 'chips' }, miss.map(function (id) { return h('button', { class: 'btn sm', onclick: function () { openZone(id); } }, 'Review ' + SHORT[id]); }), h('button', { class: 'btn sm primary', onclick: function () { newSummit(); renderPanel(false); } }, 'New set'))));
        res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
    body.appendChild(res);
    body.appendChild(h('div', { class: 'chips' }, h('button', { class: 'btn', onclick: function () { newSummit(); renderPanel(false); } }, '↻ New set')));
    w.appendChild(body); return w;
  }

  /* ---------------------------------------------------------------- print sheet */
  function printSheet() {
    var root = $('printRoot'); root.innerHTML = '';
    root.appendChild(h('h1', null, 'Wildcats Wellness Quest: Study Sheet'));
    root.appendChild(h('p', null, 'Small Choices, Whole Health. Fictional examples; general adult reference values for education, not medical advice.'));
    Z.forEach(function (z) {
      var d = h('div', { class: 'zone' }, h('h2', null, z.n + '. ' + z.name + ' (' + z.mission + ')'));
      z.notes.forEach(function (n) {
        d.appendChild(h('h3', null, n.h)); if (n.p) d.appendChild(h('p', null, n.p));
        if (n.list) d.appendChild(h('ul', null, n.list.map(function (t) { return h('li', null, t); })));
        if (n.dims) d.appendChild(h('ul', null, G.DIMS.map(function (x) { return h('li', null, x.name + ': ' + x.what + ' Example: ' + x.ex); })));
        if (n.table) d.appendChild(h('table', null, h('thead', null, h('tr', null, n.head.map(function (x) { return h('th', null, x); }))), h('tbody', null, n.table.map(function (r) { return h('tr', null, r.map(function (c) { return h('td', null, c); })); }))));
        if (n.cats) d.appendChild(h('ul', null, G.DIMS.map(function (x) { var cs = G.CATS.filter(function (c) { return c.dom === x.id; }); return h('li', null, x.name + ': ' + cs.map(function (c) { return c.n + ' (' + c.w + ')'; }).join(', ')); })));
        if (n.stop) d.appendChild(h('p', null, 'S = State the decision. T = Think of options. O = Observe consequences. P = Pick a responsible, health-enhancing choice and explain why.'));
        if (n.smart) d.appendChild(h('p', null, 'S Specific · M Measurable · A Achievable · R Relevant · T Time-bound'));
        if (n.loop) d.appendChild(h('p', null, 'Cue → Routine → Reward'));
        if (n.fourtabs) d.appendChild(h('p', null, 'Author · Evidence · Purpose · Independent verification'));
        if (n.cer) d.appendChild(h('p', null, 'Claim · Evidence (a fact in the case) · Reasoning (the because)'));
      });
      d.appendChild(h('h3', null, 'Key terms')); d.appendChild(h('ul', null, z.keyTerms.map(function (k) { return h('li', null, k[0] + ': ' + k[1]); })));
      root.appendChild(d);
    });
    window.print();
  }

  /* ---------------------------------------------------------------- boot */
  function init() {
    $('mapHost').innerHTML = scene();
    var tn = $('trailnav');
    ORDER.forEach(function (id) {
      var z = ZBY[id];
      tn.appendChild(h('button', { class: 'tn', 'data-id': id, style: '--zc:' + (z ? z.color : '#d99a14'), 'aria-current': 'false', onclick: function () { openZone(id); } }, h('span', { class: 'num', 'aria-hidden': 'true' }, z ? z.n : '★'), SHORT[id], h('span', { class: 'st muted' }, '')));
    });
    Array.prototype.forEach.call(document.querySelectorAll('.spot'), function (sp) {
      var id = sp.getAttribute('data-id');
      sp.addEventListener('click', function () { openZone(id); });
      sp.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openZone(id); } });
    });
    $('printBtn').addEventListener('click', printSheet);
    $('resetBtn').addEventListener('click', function () {
      if (!confirm('Clear your progress on this device?')) return;
      S = { seen: {}, done: {}, first: {}, best: 0 }; save(); summit = null; cur = { id: null, tab: 'notes' };
      $('panel').hidden = true; Array.prototype.forEach.call(document.querySelectorAll('.spot'), function (s) { s.classList.remove('on'); }); refreshMap(); movePounce('hub'); announce('Progress cleared.');
    });
    refreshMap(); movePounce('hub');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
