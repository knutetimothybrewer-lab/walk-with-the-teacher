'use strict';
// Illustrated SVG maps: the county hub (with the moving guide) and the Riverbend neighborhood map.

CHM.STATIONS = [
  { id: 1, x: 140, y: 350, glyph: '🏘️', color: '#0f766e' },
  { id: 2, x: 300, y: 170, glyph: '🏥', color: '#1e3a8a' },
  { id: 3, x: 470, y: 372, glyph: '🧪', color: '#b45309' },
  { id: 4, x: 570, y: 130, glyph: '📊', color: '#4338ca' },
  { id: 5, x: 730, y: 280, glyph: '📱', color: '#6d28d9' },
  { id: 6, x: 680, y: 418, glyph: '🏛️', color: '#047857' }
];

CHM.guideSvg = function (size) {
  size = size || 40;
  return S('svg', { viewBox: '0 0 40 48', width: size, height: size * 1.2, 'aria-hidden': 'true', class: 'guide-svg' },
    S('ellipse', { cx: 20, cy: 45, rx: 11, ry: 2.5, fill: 'rgba(0,0,0,.18)' }),
    S('rect', { x: 11, y: 22, width: 18, height: 20, rx: 7, fill: '#0f766e' }),
    S('rect', { x: 8, y: 25, width: 5, height: 14, rx: 2.5, fill: '#f59e0b' }),
    S('circle', { cx: 20, cy: 15, r: 10, fill: '#f2c9a0' }),
    S('path', { d: 'M10 13a10 10 0 0 1 20 0z', fill: '#134e4a' }),
    S('rect', { x: 18, y: 5, width: 4, height: 5, rx: 1, fill: '#fff' }),
    S('rect', { x: 16.5, y: 6.5, width: 7, height: 2, rx: 1, fill: '#fff' }),
    S('circle', { cx: 16.5, cy: 16, r: 1.3, fill: '#16212e' }), S('circle', { cx: 23.5, cy: 16, r: 1.3, fill: '#16212e' }),
    S('path', { d: 'M16.5 20c1.8 1.6 5.2 1.6 7 0', stroke: '#16212e', 'stroke-width': 1.2, fill: 'none', 'stroke-linecap': 'round' }));
};

// ---- County hub -------------------------------------------------------------------------------------
CHM.countyMap = function (opts) {
  // opts: {progress:{id:{done,total,correct}}, current, onGo(id), guideAt}
  var mods = CHM.content.modules, st = CHM.STATIONS.slice(0, mods.length);
  var svg = S('svg', { viewBox: '0 0 860 520', class: 'county', role: 'group', 'aria-label': 'Illustrated map of the county with six mission locations' });
  var defs = S('defs',
    S('linearGradient', { id: 'sky', x1: 0, y1: 0, x2: 0, y2: 1 }, S('stop', { offset: '0', 'stop-color': '#cfe8f7' }), S('stop', { offset: '1', 'stop-color': '#eaf6ee' })),
    S('linearGradient', { id: 'grass', x1: 0, y1: 0, x2: 0, y2: 1 }, S('stop', { offset: '0', 'stop-color': '#bfe3b4' }), S('stop', { offset: '1', 'stop-color': '#9ccf94' })));
  svg.appendChild(defs);
  svg.appendChild(S('rect', { width: 860, height: 520, fill: 'url(#sky)' }));
  svg.appendChild(S('path', { d: 'M0 150 C120 90 220 150 330 110 C450 70 560 140 680 100 C760 75 820 110 860 95 L860 520 L0 520Z', fill: 'url(#grass)' }));
  svg.appendChild(S('path', { d: 'M0 200 C100 170 200 230 320 210 C430 190 520 250 640 230 C740 215 800 250 860 240 L860 520 L0 520Z', fill: '#a9d7a0', opacity: .55 }));
  // river
  svg.appendChild(S('path', { d: 'M-10 300 C120 250 210 330 330 300 C430 275 470 220 560 250 C650 280 700 360 870 330', fill: 'none', stroke: '#8fc8ec', 'stroke-width': 26, 'stroke-linecap': 'round' }));
  svg.appendChild(S('path', { class: 'river-flow', d: 'M-10 300 C120 250 210 330 330 300 C430 275 470 220 560 250 C650 280 700 360 870 330', fill: 'none', stroke: '#ffffff', 'stroke-width': 3, 'stroke-dasharray': '2 22', opacity: .8 }));
  // highway
  svg.appendChild(S('path', { d: 'M-10 440 C140 420 300 470 470 440 C620 412 740 420 870 400', fill: 'none', stroke: '#6b7686', 'stroke-width': 14 }));
  svg.appendChild(S('path', { d: 'M-10 440 C140 420 300 470 470 440 C620 412 740 420 870 400', fill: 'none', stroke: '#fff', 'stroke-width': 2, 'stroke-dasharray': '10 12' }));
  [0, 1, 2].forEach(function (i) { svg.appendChild(S('circle', { class: 'car c' + i, r: 4.5, cx: 0, cy: 0, fill: ['#ef4444', '#f59e0b', '#2563eb'][i] })); });
  // trees
  [[60, 120], [90, 150], [780, 170], [820, 200], [420, 60], [450, 90], [230, 260], [610, 330], [60, 260]].forEach(function (p) {
    svg.appendChild(S('g', { transform: 'translate(' + p[0] + ',' + p[1] + ')' }, S('rect', { x: -2, y: 8, width: 4, height: 8, fill: '#7a5a3a' }), S('circle', { r: 11, cy: 2, fill: '#4f9a5a' })));
  });
  // clouds
  [[120, 50, 0], [520, 40, 1], [760, 70, 2]].forEach(function (c) {
    svg.appendChild(S('g', { class: 'cloud cl' + c[2], transform: 'translate(' + c[0] + ',' + c[1] + ')' }, S('ellipse', { rx: 34, ry: 12, fill: '#fff', opacity: .9 }), S('ellipse', { rx: 20, ry: 14, cx: -12, cy: -6, fill: '#fff', opacity: .9 }), S('ellipse', { rx: 18, ry: 12, cx: 14, cy: -5, fill: '#fff', opacity: .9 })));
  });
  // suggested route
  var d = 'M' + st.map(function (s) { return s.x + ' ' + s.y; }).join(' Q 0 0 ').replace(/ Q 0 0 /g, ' L ');
  var pts = st.map(function (s) { return [s.x, s.y]; }), path = 'M' + pts[0].join(' ');
  for (var i = 1; i < pts.length; i++) { var a = pts[i - 1], b = pts[i], mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2 - 36; path += ' Q ' + mx + ' ' + my + ' ' + b[0] + ' ' + b[1]; }
  svg.appendChild(S('path', { d: path, fill: 'none', stroke: '#16212e', 'stroke-width': 3, 'stroke-dasharray': '3 9', 'stroke-linecap': 'round', opacity: .5 }));

  var guide = S('g', { class: 'guide', style: { transform: 'translate(' + (st[0].x - 20) + 'px,' + (st[0].y - 78) + 'px)' } }, CHM.guideSvg(40));
  var stations = st.map(function (s, i) {
    var m = mods[i], p = (opts.progress || {})[m.id] || { done: 0, total: m.units.length, correct: 0 };
    var complete = p.done === p.total, label = m.place + ': ' + (complete ? 'complete' : p.done + ' of ' + p.total + ' questions finished');
    var g = S('g', { class: 'station' + (complete ? ' done' : ''), tabindex: 0, role: 'button', 'aria-label': 'Go to ' + label, onclick: function () { opts.onGo(m.id); },
      onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onGo(m.id); } }, transform: 'translate(' + s.x + ',' + s.y + ')' },
      S('circle', { class: 'halo', r: 34, fill: s.color, opacity: .18 }),
      S('circle', { r: 26, fill: s.color, stroke: '#fff', 'stroke-width': 4 }),
      S('text', { 'text-anchor': 'middle', y: 9, 'font-size': 26, 'aria-hidden': 'true' }, s.glyph),
      S('rect', { x: -85, y: 34, width: 170, height: 38, rx: 8, fill: '#ffffff', stroke: s.color, 'stroke-width': 2 }),
      S('text', { 'text-anchor': 'middle', y: 50, 'font-size': 11.5, 'font-weight': 700, fill: '#16212e' }, m.id + '. ' + m.title.replace('Public Health ', 'PH ').replace('Neighborhood Investigation', 'Neighborhood')),
      S('text', { 'text-anchor': 'middle', y: 65, 'font-size': 11.5, fill: complete ? '#0b6b3a' : '#44566a', 'font-weight': 600 }, (complete ? '✓ Complete' : p.done + '/' + p.total + ' finished')));
    return g;
  });
  stations.forEach(function (g) { svg.appendChild(g); });
  svg.appendChild(guide);
  var api = { svg: svg, moveGuide: function (id, instant) {
    var s = st[id - 1]; if (!s) return;
    guide.style.transition = (instant || !CHM.motionOn()) ? 'none' : 'transform 800ms cubic-bezier(.4,.1,.2,1)';
    guide.style.transform = 'translate(' + (s.x - 20) + 'px,' + (s.y - 78) + 'px)';
  } };
  api.moveGuide(opts.current || 1, true);
  return api;
};

// ---- Riverbend neighborhood map ---------------------------------------------------------------------
// opts: {spots, selected[], onToggle(id)?, onSelect(id)?, route:'none'|'car'|'nocar', active, compact, labelFor}
CHM.riverbendMap = function (opts) {
  var spots = opts.spots, sel = opts.selected || [], routes = (CHM.content.modules[0].explorer.data.routes || []);
  var svg = S('svg', { viewBox: '0 0 640 400', class: 'rbmap' + (opts.compact ? ' compact' : ''), role: 'group', 'aria-label': 'Map of the Riverbend neighborhood' });
  svg.appendChild(S('rect', { width: 640, height: 400, fill: '#d9efd0' }));
  svg.appendChild(S('rect', { x: 0, y: 0, width: 640, height: 400, fill: 'none' }));
  // streets
  [['M0 200H440', 14], ['M200 0V400', 12], ['M330 120V400', 10], ['M0 300H440', 10]].forEach(function (p) { svg.appendChild(S('path', { d: p[0], stroke: '#fff', 'stroke-width': p[1], fill: 'none' })); });
  // highway
  svg.appendChild(S('rect', { x: 440, y: 0, width: 34, height: 400, fill: '#6b7686' }));
  svg.appendChild(S('path', { d: 'M457 0V400', stroke: '#fff', 'stroke-width': 2, 'stroke-dasharray': '12 12', fill: 'none' }));
  svg.appendChild(S('text', { x: 457, y: 395, 'font-size': 10, fill: '#fff', 'text-anchor': 'middle', transform: 'rotate(-90 457 200)', 'letter-spacing': 2 }, 'HIGHWAY (no sidewalk crossing)'));
  [0, 1].forEach(function (i) { svg.appendChild(S('circle', { class: 'hcar hc' + i, r: 4, cx: 450 + i * 14, cy: 0, fill: i ? '#f59e0b' : '#ef4444' })); });
  // homes
  [[150, 160], [180, 240], [250, 160], [260, 250], [110, 250], [380, 240], [390, 160]].forEach(function (p) {
    svg.appendChild(S('g', { transform: 'translate(' + p[0] + ',' + p[1] + ')', 'aria-hidden': 'true' }, S('rect', { x: -10, y: -6, width: 20, height: 14, fill: '#e9d3b4' }), S('path', { d: 'M-12 -6L0 -16L12 -6Z', fill: '#c0634a' })));
  });
  var home = { x: 200, y: 200 };
  svg.appendChild(S('g', { transform: 'translate(' + home.x + ',' + home.y + ')' }, S('circle', { r: 11, fill: '#1e3a8a', stroke: '#fff', 'stroke-width': 3 }), S('text', { y: 4, 'text-anchor': 'middle', fill: '#fff', 'font-size': 11, 'font-weight': 700 }, 'H'), S('text', { y: 26, 'text-anchor': 'middle', 'font-size': 10, fill: '#16212e', 'font-weight': 600 }, 'Home')));
  // routes (explorer only)
  if (opts.route && opts.route !== 'none') {
    routes.forEach(function (r) {
      var sp = spots.filter(function (s) { return s.id === r.to; })[0]; if (!sp) return;
      var car = opts.route === 'car';
      var d = car ? 'M' + home.x + ' ' + home.y + ' L' + sp.x + ' ' + sp.y : 'M' + home.x + ' ' + home.y + ' L150 250 L' + (sp.x > 400 ? 330 : sp.x) + ' 330 L330 ' + (sp.y > 200 ? 360 : 60) + ' L' + sp.x + ' ' + sp.y;
      svg.appendChild(S('path', { class: 'route ' + (car ? 'car' : 'nocar'), d: d, fill: 'none', stroke: car ? '#0f766e' : '#b45309', 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': car ? '6 8' : '2 9' }));
      var mx = home.x + (sp.x - home.x) * 0.72, my = home.y + (sp.y - home.y) * 0.72 + (car ? 0 : 0);
      svg.appendChild(S('g', { transform: 'translate(' + mx + ',' + my + ')' }, S('rect', { x: -44, y: -12, width: 88, height: 22, rx: 11, fill: '#fff', stroke: car ? '#0f766e' : '#b45309', 'stroke-width': 2 }), S('text', { 'text-anchor': 'middle', y: 3, 'font-size': 11, 'font-weight': 700, fill: '#16212e' }, '≈' + (car ? r.car : r.noCar) + ' min ' + (car ? 'by car' : 'bus/walk'))));
    });
  }
  var glyph = { transport: '🚌', food: '🛒', care: '🏥', strength: '🌳', school: '🏫' };
  var g2 = { park: '🌳', hall: '🤝', garden: '🥕', corner: '🏪' };
  spots.forEach(function (s) {
    var isSel = sel.indexOf(s.id) >= 0, isAct = opts.active === s.id;
    var click = function () { if (opts.onToggle) opts.onToggle(s.id); if (opts.onSelect) opts.onSelect(s.id); };
    var g = S('g', { class: 'spot' + (isSel ? ' sel' : '') + (isAct ? ' act' : ''), transform: 'translate(' + s.x + ',' + s.y + ')', tabindex: 0, role: opts.onToggle ? 'checkbox' : 'button', 'aria-checked': opts.onToggle ? String(isSel) : null,
      'aria-label': s.t + (isSel ? ' (selected)' : ''), onclick: click, onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); click(); } } },
      S('circle', { r: 20, fill: '#fff', stroke: isSel ? '#1d4ed8' : '#16212e', 'stroke-width': isSel ? 4 : 2 }),
      S('text', { 'text-anchor': 'middle', y: 7, 'font-size': 20, 'aria-hidden': 'true' }, g2[s.id] || glyph[s.kind] || '📍'),
      isSel ? S('text', { x: 15, y: -12, 'font-size': 14, 'font-weight': 900, fill: '#1d4ed8', 'aria-hidden': 'true' }, '✓') : null,
      S('text', { 'text-anchor': 'middle', y: 36, 'font-size': 11, 'font-weight': 700, fill: '#16212e', stroke: '#ffffff', 'stroke-width': 3, 'paint-order': 'stroke' }, opts.compact ? s.t.replace('Neighborhood association hall', 'Assoc. hall').replace('Community ', '') : s.t));
    svg.appendChild(g);
  });
  return svg;
};
