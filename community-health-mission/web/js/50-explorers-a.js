'use strict';
CHM.explorers = {};

CHM.tabs = function (defs, initial, onChange) {
  var cur = initial || defs[0].id, list = h('div.tablist', { role: 'tablist' }), panel = h('div.tabpanel', { role: 'tabpanel', tabindex: 0 });
  var wrap = h('div.tabs', list, panel), btns = {};
  function show(id, focus) {
    cur = id; CHM.clear(panel);
    defs.forEach(function (d) { var b = btns[d.id]; b.setAttribute('aria-selected', d.id === id ? 'true' : 'false'); b.tabIndex = d.id === id ? 0 : -1; if (d.id === id) { panel.setAttribute('aria-labelledby', b.id); } });
    var d = defs.filter(function (x) { return x.id === id; })[0];
    panel.appendChild(d.render()); if (focus) btns[id].focus(); if (onChange) onChange(id);
  }
  defs.forEach(function (d, i) {
    var b = h('button.tab', { type: 'button', role: 'tab', id: 'tab-' + d.id + '-' + Math.random().toString(36).slice(2, 6), onclick: function () { show(d.id); },
      onkeydown: function (e) { var k = e.key, n = defs.length, j = i; if (k === 'ArrowRight') j = (i + 1) % n; else if (k === 'ArrowLeft') j = (i - 1 + n) % n; else if (k === 'Home') j = 0; else if (k === 'End') j = n - 1; else return; e.preventDefault(); show(defs[j].id, true); } }, d.label);
    btns[d.id] = b; list.appendChild(b);
  });
  show(cur);
  wrap.select = function (id) { if (btns[id]) show(id); };
  wrap.current = function () { return cur; };
  return wrap;
};

// ---------------------------------------------------------------------------------------------- M1
CHM.explorers.neighborhood = function (data, ctx) {
  var seen = (ctx.saved && ctx.saved.seen) || [], route = 'none', active = null;
  function save() { ctx.save({ seen: seen }); }
  var info = h('div.infocard', { 'aria-live': 'polite' }, h('p', 'Select a place on the map to read its evidence card.'));
  var mapHost = h('div.mapwrap');
  function drawMap() {
    CHM.clear(mapHost);
    mapHost.appendChild(CHM.riverbendMap({ spots: data.spots, selected: [], active: active, route: route, onSelect: function (id) {
      active = id; var s = data.spots.filter(function (x) { return x.id === id; })[0];
      if (seen.indexOf(id) < 0) { seen.push(id); save(); }
      CHM.clear(info); info.appendChild(h('div', h('h4', s.t), h('p', s.info), h('p.small', { class: 'tagline' }, 'Type: ' + ({ transport: 'Transportation', food: 'Food environment', care: 'Healthcare access', strength: 'Community strength', school: 'School / recreation' })[s.kind])));
      drawMap();
    } }));
  }
  var routeCtl = h('div.seg', { role: 'radiogroup', 'aria-label': 'Route view' },
    [['none', 'No routes'], ['car', 'With a car'], ['nocar', 'Without a car']].map(function (r) {
      return h('label.segopt', h('input', { type: 'radio', name: 'route', value: r[0], checked: r[0] === 'none', onchange: function () { route = r[0]; drawMap(); CHM.announce(r[1] + ' routes shown'); } }), h('span', r[1]));
    }));
  function seenList() { return h('p.small', 'Evidence cards you have opened: ', seen.length ? seen.map(function (id) { return CHM.optText(data.spots.map(function (s) { return { id: s.id, t: s.t }; }), id); }).join(', ') : 'none yet.'); }
  return CHM.tabs([
    { id: 'compare', label: 'County profiles', render: function () {
      return h('div', h('p.small', 'Brief comparison of three communities in the case files. Only Riverbend is scored; the others show how conditions differ from place to place.'),
        h('div.cards3', data.profiles.map(function (p) { return h('article.pcard' + (p.id === 'riverbend' ? '.hl' : ''), h('span.badge', p.tag), h('h4', p.name), h('p.sub', p.summary), h('ul', p.facts.map(function (f) { return h('li', f); }))); })),
        h('p.src', data.note));
    } },
    { id: 'map', label: 'Riverbend map', render: function () { drawMap(); return h('div', h('p.small', 'Explore freely. Open each place to read its evidence card, then compare routes with and without a car.'), routeCtl, mapHost, info, seenList()); } },
    { id: 'budget', label: 'Budget options', render: function () {
      var tb = h('table.dt', h('caption', 'Interventions for the $1 million challenge (costs in $ thousands)'), h('thead', h('tr', ['Intervention', 'Cost', 'What it targets'].map(function (x) { return h('th', { scope: 'col' }, x); }))),
        h('tbody', data.budgetOptions.map(function (o) { return h('tr', h('td', o.t), h('td.n', '$' + o.cost + 'k'), h('td', o.note)); })));
      var live = h('p.callout', { 'aria-live': 'polite' }, 'Your current selection appears here once you start Question 5.');
      CHM.onBudget = function () { var b = CHM.bus.budget; if (live.isConnected) live.textContent = b && b.selected.length ? 'Your current selection: ' + b.selected.map(function (id) { return CHM.optText(data.budgetOptions, id); }).join(' + ') + ' = $' + b.total + 'k' : 'Nothing selected yet.'; };
      return h('div', tb, live);
    } }
  ], ctx.saved && ctx.saved.tab, function (t) { ctx.save({ tab: t }); });
};

// ---------------------------------------------------------------------------------------------- M2
CHM.explorers.ops = function (data, ctx) {
  var day = 0, timer = null;
  function cluster() {
    var host = h('div.cluster'), grid = h('div.people', { role: 'img', 'aria-label': 'Thirty interviewed attendees; ill attendees are shown filled with a plus sign' }), note = h('p.callout', { 'aria-live': 'polite' }), count = h('p.big');
    var people = [];
    for (var i = 0; i < data.total; i++) { var p = h('span.person', { 'aria-hidden': 'true' }, '☺'); people.push(p); grid.appendChild(p); }
    function draw(d) {
      day = d; var n = data.timeline[d].cases;
      people.forEach(function (p, i) { var ill = i < n; p.className = 'person' + (ill ? ' ill' : ''); p.textContent = ill ? '✚' : '☺'; });
      note.textContent = data.timeline[d].day + ': ' + data.timeline[d].note; count.textContent = n + ' reported ill so far (of ' + data.total + ' interviewed by Tuesday)';
      Array.prototype.forEach.call(daysEl.children, function (b, k) { b.setAttribute('aria-pressed', k === d ? 'true' : 'false'); });
    }
    var daysEl = h('div.seg', data.timeline.map(function (t, k) { return h('button.segbtn', { type: 'button', 'aria-pressed': 'false', onclick: function () { stop(); draw(k); } }, t.day); }));
    function stop() { if (timer) { clearInterval(timer); timer = null; play.textContent = '▶ Play'; } }
    var play = h('button.btn.sm', { type: 'button', onclick: function () {
      if (timer) { stop(); return; }
      if (!CHM.motionOn()) { draw(data.timeline.length - 1); return; }
      var k = 0; draw(0); play.textContent = '⏸ Pause'; timer = setInterval(function () { k++; if (k >= data.timeline.length) { stop(); return; } draw(k); }, 1200);
    } }, '▶ Play');
    draw(0);
    host.appendChild(h('div.row', daysEl, play)); host.appendChild(grid); host.appendChild(count); host.appendChild(note);
    host.appendChild(h('p.small', 'A cluster of illness shows that people were sickened around the same time and place. It does not by itself show what caused it. ', h('em', 'Collecting case reports (surveillance) is different from investigating causes.')));
    return host;
  }
  function exposure() {
    var showBars = false, host = h('div'), bars = h('div');
    function drawTable() {
      var tb = h('table.dt', h('caption', 'Interviews of 30 attendees (15 ill, 15 well). Counts of people.'),
        h('thead', h('tr', h('th', { scope: 'col', rowspan: 2 }, 'Food'), h('th', { scope: 'colgroup', colspan: 2 }, 'Ate it'), h('th', { scope: 'colgroup', colspan: 2 }, 'Did not eat it')),
          h('tr', ['Ill', 'Well', 'Ill', 'Well'].map(function (x) { return h('th', { scope: 'col' }, x); }))),
        h('tbody', data.foods.map(function (f) { return h('tr', h('th', { scope: 'row' }, f.t), h('td.n', f.ate.ill), h('td.n', f.ate.well), h('td.n', f.notAte.ill), h('td.n', f.notAte.well)); })));
      CHM.clear(bars);
      if (showBars) {
        data.foods.forEach(function (f) {
          function bar(lbl, g) { var t = g.ill + g.well; return h('div.sbar', h('span.sl', lbl), h('span.sb', { role: 'img', 'aria-label': lbl + ': ' + g.ill + ' ill, ' + g.well + ' well' }, h('i.ill', { style: { width: g.ill / 20 * 100 + '%' } }, g.ill ? '✚ ' + g.ill : ''), h('i.well', { style: { width: g.well / 20 * 100 + '%' } }, g.well ? g.well : ''))); }
          bars.appendChild(h('div.sgroup', h('strong', f.t), bar('Ate', f.ate), bar('Did not eat', f.notAte)));
        });
        bars.appendChild(h('p.small', 'Bars use the same scale for every food (one block = one person). ✚ = ill, plain = well.'));
      }
      CHM.clear(host); host.appendChild(h('p.small', 'For each food, compare the share ill among those who ate it with the share ill among those who did not. Work out the percentages yourself for Question 2.'));
      host.appendChild(h('label.chk', h('input', { type: 'checkbox', checked: showBars, onchange: function (e) { showBars = e.target.checked; drawTable(); } }), ' Show picture view'));
      host.appendChild(tb); host.appendChild(bars);
    }
    drawTable(); return host;
  }
  function board() {
    var agencies = [
      ['Local health department', 'Tracks local cases, inspects restaurants and facilities, runs clinics, talks with the community.', 'Calls attendees; inspects the caterer.'],
      ['State health department', 'Coordinates across counties, runs state labs, supports local investigations, enforces state rules.', 'Tests patient and food samples.'],
      ['CDC (federal)', 'Tracks disease nationally, provides guidance and technical help, assists outbreak investigations on request.', 'Helps compare cases across states.'],
      ['FDA (federal)', 'Oversees safety of most foods, drugs and medical products; can coordinate recalls.', 'Works on a recalled food product.'],
      ['NIH (federal)', 'Funds and carries out medical research on causes and treatments.', 'Funds research on foodborne illness.'],
      ['Environmental agencies', 'Set and enforce air, water and waste rules (federal EPA and state agencies).', 'Responds to a contaminated water supply.']
    ];
    return h('div', h('p.small', 'Typical roles only: responsibilities vary by state and county.'), h('div.cards3', agencies.map(function (a) { return h('article.pcard', h('h4', a[0]), h('p', a[1]), h('p.small', h('strong', 'Example: '), a[2])); })));
  }
  return CHM.tabs([{ id: 'cluster', label: 'Cluster timeline', render: cluster }, { id: 'exposure', label: 'Exposure table', render: exposure }, { id: 'board', label: 'Agency board', render: board }], ctx.saved && ctx.saved.tab, function (t) { ctx.save({ tab: t }); });
};

// ---------------------------------------------------------------------------------------------- M3
CHM.explorers.lab = function (data, ctx) {
  var sc = data.scenarios, noise = data.noise;
  var unitScenario = { 'M3-U2': 'smoke', 'M3-U3': 'uv', 'M3-U4': 'noise', 'M3-U5': 'heat', 'M3-U6': 'water' };
  function level(s) {
    var shared = CHM.shared[s.id] || {}, tot = 0, max = 0, chosen = 0;
    s.exposure.forEach(function (cid) {
      var c = s.controls.filter(function (x) { return x.id === cid; })[0], m = Math.max.apply(null, c.options.map(function (o) { return o.w; }));
      max += m; var o = c.options.filter(function (x) { return x.id === shared[cid]; })[0]; if (o) { tot += o.w; chosen++; }
    });
    if (chosen < s.exposure.length) return null;
    var r = tot / max; return r <= 0.25 ? 0 : r <= 0.5 ? 1 : r <= 0.75 ? 2 : 3;
  }
  var LV = [['Lower', '▁'], ['Moderate', '▃'], ['Higher', '▅'], ['Highest', '█']];
  function meter(s) {
    var lv = level(s), host = h('div.meter', { role: 'status' });
    host.appendChild(h('div.mtitle', 'Relative exposure for this plan'));
    var row = h('div.mrowbars');
    for (var i = 0; i < 4; i++) row.appendChild(h('span.mbar' + (lv != null && i <= lv ? '.on l' + lv : ''), { 'aria-hidden': 'true' }));
    host.appendChild(row);
    host.appendChild(h('div.mtext', lv == null ? 'Choose the highlighted exposure options in the plan to see the indicator.' : LV[lv][1] + ' ' + LV[lv][0] + ' exposure (qualitative)'));
    host.appendChild(h('p.src', 'Comparison tool only. It is not a medical risk score or a prediction for any person.'));
    return host;
  }
  function stageSmoke(s) {
    var v = CHM.shared.smoke || {}, indoor = v.loc === 'in', d = ({ 30: 1, 60: 2, 90: 3, 120: 4 })[v.dur] || 2, haze = indoor ? .12 : .55;
    return S('svg', { viewBox: '0 0 480 190', class: 'stage', role: 'img', 'aria-label': indoor ? 'Players practicing indoors in a gym with lighter haze' : 'Players practicing outdoors under smoky, hazy air' },
      S('rect', { width: 480, height: 190, fill: indoor ? '#d9e0e8' : '#b8d9a8' }),
      indoor ? S('rect', { x: 20, y: 30, width: 440, height: 130, fill: '#c3ccd8', stroke: '#6b7686', 'stroke-width': 3 }) : S('rect', { x: 20, y: 30, width: 440, height: 130, fill: 'none', stroke: '#fff', 'stroke-width': 3 }),
      [80, 150, 220, 290, 360, 420].map(function (x, i) { return S('g', { transform: 'translate(' + x + ',' + (90 + (i % 2) * 28) + ')' }, S('circle', { r: 9, fill: i === 2 ? '#f59e0b' : '#1e3a8a' }), S('rect', { x: -6, y: 8, width: 12, height: 16, rx: 3, fill: i === 2 ? '#f59e0b' : '#1e3a8a' })); }),
      S('rect', { class: 'haze', width: 480, height: 190, fill: '#c05a1c', opacity: haze }),
      S('text', { x: 14, y: 20, 'font-size': 13, 'font-weight': 700, fill: '#16212e' }, (indoor ? 'Indoor gym' : 'Outdoor field') + ' · ' + (d * 30) + ' min planned'));
  }
  function stageUv(s) {
    var v = CHM.shared.uv || {}, shade = v.shade === 'shade';
    return S('svg', { viewBox: '0 0 480 190', class: 'stage', role: 'img', 'aria-label': shade ? 'Lifeguard stand with a shade canopy under a strong sun' : 'Lifeguard stand in full sun with no shade' },
      S('rect', { width: 480, height: 190, fill: '#bfe4f7' }), S('rect', { y: 120, width: 480, height: 70, fill: '#4aa3d6' }),
      S('g', { class: 'sun', transform: 'translate(410,50)' }, S('circle', { r: 24, fill: '#fbbf24' }), [0, 45, 90, 135, 180, 225, 270, 315].map(function (a) { return S('line', { x1: 32, y1: 0, x2: 46, y2: 0, stroke: '#f59e0b', 'stroke-width': 4, 'stroke-linecap': 'round', transform: 'rotate(' + a + ')' }); })),
      S('rect', { x: 150, y: 90, width: 8, height: 60, fill: '#7a5a3a' }), S('rect', { x: 130, y: 86, width: 48, height: 8, fill: '#a07850' }),
      S('circle', { cx: 154, cy: 70, r: 9, fill: '#f2c9a0' }), S('rect', { x: 148, y: 78, width: 12, height: 10, fill: v.cover === 'tank' || !v.cover ? '#ef4444' : '#0f766e' }),
      shade ? S('path', { d: 'M110 58 Q154 30 198 58 Z', fill: '#16212e', opacity: .8 }) : null,
      S('text', { x: 14, y: 20, 'font-size': 13, 'font-weight': 700, fill: '#16212e' }, 'UV Index 10 (Very High)'));
  }
  function stageHeat(s) {
    var v = CHM.shared.heat || {}, hot = v.time === 'am' ? 0 : v.time === 'eve' ? 1 : 2;
    return S('svg', { viewBox: '0 0 480 190', class: 'stage', role: 'img', 'aria-label': 'Football field with a thermometer showing heat level' },
      S('rect', { width: 480, height: 190, fill: ['#e8f3fb', '#fde8c8', '#fbd5a5'][hot] }), S('rect', { y: 110, width: 480, height: 80, fill: '#6aa84f' }),
      [60, 120, 180, 240].map(function (x) { return S('line', { x1: x, y1: 110, x2: x, y2: 190, stroke: '#fff', 'stroke-width': 2 }); }),
      [100, 160, 220, 280].map(function (x, i) { return S('g', { transform: 'translate(' + x + ',' + (130 + (i % 2) * 20) + ')' }, S('circle', { r: 8, fill: '#1e3a8a' }), S('rect', { x: -9, y: 7, width: 18, height: 14, rx: 4, fill: '#1e3a8a' })); }),
      [0, 1, 2].map(function (i) { return S('path', { class: 'shimmer s' + i, d: 'M' + (40 + i * 140) + ' 100 q10 -10 20 0 t20 0 t20 0', stroke: '#c2410c', 'stroke-width': 3, fill: 'none', opacity: hot ? .6 : .15 }); }),
      S('rect', { x: 400, y: 20, width: 14, height: 90, rx: 7, fill: '#fff', stroke: '#16212e', 'stroke-width': 2 }), S('rect', { x: 403, y: 110 - (hot + 1) * 24, width: 8, height: (hot + 1) * 24, fill: '#dc2626' }), S('circle', { cx: 407, cy: 116, r: 12, fill: '#dc2626', stroke: '#16212e', 'stroke-width': 2 }),
      S('text', { x: 14, y: 20, 'font-size': 13, 'font-weight': 700, fill: '#16212e' }, 'Heat index near 98 °F (in sun)'));
  }
  function scenarioPanel(id) {
    var s = sc[id], stage = { smoke: stageSmoke, uv: stageUv, heat: stageHeat }[id], host = h('div.scen');
    function draw() { CHM.clear(host); host.appendChild(h('div.badge2', s.badge)); host.appendChild(h('h4', s.title)); host.appendChild(h('p', s.setup)); host.appendChild(stage(s)); host.appendChild(meter(s));
      host.appendChild(h('p.small', 'Open the matching question to change the plan. The picture and indicator update as you choose. Exposure options: ' + s.exposure.map(function (cid) { return s.controls.filter(function (x) { return x.id === cid; })[0].label; }).join(', ') + '.'));
      if (id === 'smoke') host.appendChild(aqiKey()); }
    draw(); var off = CHM.on('plan', function (sid) { if (sid === id && host.isConnected) draw(); else if (!host.isConnected) off(); });
    return host;
  }
  function aqiKey() {
    return h('div.aqikey', { role: 'list', 'aria-label': 'AQI categories' }, data.aqi.map(function (a) { return h('span.aqi', { role: 'listitem', style: { background: a.c, color: a.fg } }, a.r + ' ' + a.n); }));
  }
  function noisePanel() {
    var st = { level: '100', minutes: 30, protect: 'none', dist: 'near' }, host = h('div'), out = h('div.meter', { role: 'status' }), chart = h('div');
    function allowed(db) { return 480 / Math.pow(2, (db - noise.rel) / noise.exchange); }
    function calc() {
      var db = noise.controls.level.filter(function (x) { return x.id === st.level; })[0].db + noise.controls.protect.filter(function (x) { return x.id === st.protect; })[0].adj + noise.controls.dist.filter(function (x) { return x.id === st.dist; })[0].adj;
      var pct = st.minutes / allowed(db) * 100, band = pct < 50 ? 'under half' : pct <= 100 ? 'between half and all' : 'over';
      CHM.clear(out); out.appendChild(h('div.mtitle', 'Effect of your choices (illustrative)'));
      out.appendChild(h('div.mtext', 'About ' + db + ' dBA at the ear · ' + st.minutes + ' min · uses ' + band + ' of the occupational recommended daily time for that level.'));
      out.appendChild(h('p.src', noise.caution));
      drawChart(db);
    }
    function drawChart(db) {
      CHM.clear(chart);
      var W = 480, H = 220, mx = 480, svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'nchart', role: 'img', 'aria-label': 'Bar chart: recommended minutes per day falls by half for every 3 dBA increase, from 480 minutes at 85 dBA to 3.75 minutes at 106 dBA' });
      svg.appendChild(S('line', { x1: 50, y1: 10, x2: 50, y2: 180, stroke: '#44566a' })); svg.appendChild(S('line', { x1: 50, y1: 180, x2: 470, y2: 180, stroke: '#44566a' }));
      noise.table.forEach(function (r, i) {
        var bh = Math.max(2, r.minutes / mx * 160), x = 62 + i * 51;
        svg.appendChild(S('rect', { x: x, y: 180 - bh, width: 36, height: bh, fill: '#b45309' }));
        svg.appendChild(S('text', { x: x + 18, y: 174 - bh, 'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#16212e' }, (r.minutes >= 10 ? Math.round(r.minutes) : r.minutes.toFixed(1)) + ' min'));
        svg.appendChild(S('text', { x: x + 18, y: 196, 'text-anchor': 'middle', 'font-size': 11, fill: '#16212e' }, r.db));
      });
      svg.appendChild(S('text', { x: 260, y: 214, 'text-anchor': 'middle', 'font-size': 12, fill: '#16212e' }, 'Sound level (dBA)'));
      svg.appendChild(S('text', { x: 12, y: 100, 'font-size': 11, fill: '#16212e', transform: 'rotate(-90 12 100)', 'text-anchor': 'middle' }, 'Minutes per day (linear, from 0)'));
      var near = noise.table.reduce(function (b, r, i) { return Math.abs(r.db - db) < Math.abs(noise.table[b].db - db) ? i : b; }, 0);
      var nb = Math.max(2, noise.table[near].minutes / mx * 160), nx = 80 + near * 51, ny = Math.max(14, 180 - nb - 34);
      svg.appendChild(S('polygon', { points: nx + ',' + (ny + 12) + ' ' + (nx - 8) + ',' + ny + ' ' + (nx + 8) + ',' + ny, fill: '#1d4ed8' })); svg.appendChild(S('text', { x: nx, y: ny - 3, 'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#1d4ed8' }, 'your choice'));
      chart.appendChild(svg);
      chart.appendChild(h('details.dtwrap', h('summary', 'Data table version of this chart'), h('table.dt', h('caption', 'NIOSH recommended exposure limit (occupational guidance): 85 dBA for 8 hours; time halves for every 3 dBA increase'), h('thead', h('tr', h('th', { scope: 'col' }, 'Sound level (dBA)'), h('th', { scope: 'col' }, 'Recommended minutes per day'))), h('tbody', noise.table.map(function (r) { return h('tr', h('td.n', r.db), h('td.n', r.minutes >= 10 ? Math.round(r.minutes) : r.minutes.toFixed(2))); })))));
    }
    function sel(label, key, opts) { return h('label.sel', label, h('select', { onchange: function (e) { st[key] = e.target.value; if (key === 'minutes') st[key] = Number(e.target.value); calc(); } }, opts.map(function (o) { return h('option', { value: o.v, selected: String(st[key]) === String(o.v) }, o.t); }))); }
    host.appendChild(h('p', 'A fictional concert series. Explore how level, time, protection and distance interact. No audio is played.'));
    host.appendChild(h('div.ctlrow', sel('Venue level', 'level', noise.controls.level.map(function (x) { return { v: x.id, t: x.t }; })), sel('Time at the event', 'minutes', noise.controls.minutes.map(function (m) { return { v: m, t: m + ' minutes' }; })), sel('Protection', 'protect', noise.controls.protect.map(function (x) { return { v: x.id, t: x.t }; })), sel('Position', 'dist', noise.controls.dist.map(function (x) { return { v: x.id, t: x.t }; }))));
    host.appendChild(chart); host.appendChild(out); calc(); return host;
  }
  function waterPanel() {
    var host = h('div'), cont = 'germs', result = h('div.callout', { 'aria-live': 'polite' }, 'Choose what is in the water, then try boiling it.'), pot = h('div.pot', { 'aria-hidden': 'true' }, '🫕');
    host.appendChild(h('div.cards3', data.advisories.map(function (a) { return h('article.pcard', h('h4', a.t), h('p', a.d)); })));
    host.appendChild(h('div.seg', { role: 'radiogroup', 'aria-label': 'Contaminant' }, [['germs', 'Germs (microbes)'], ['chem', 'Chemicals']].map(function (r) { return h('label.segopt', h('input', { type: 'radio', name: 'cont', value: r[0], checked: r[0] === cont, onchange: function () { cont = r[0]; result.textContent = 'Now try boiling it.'; pot.className = 'pot'; } }), h('span', r[1])); })));
    host.appendChild(h('button.btn.sm', { type: 'button', onclick: function () { pot.className = 'pot boil'; result.textContent = cont === 'germs' ? '✓ Boiling kills germs. Follow the advisory\'s instructions for how long to boil.' : '✕ Boiling does NOT remove chemicals. Use the safe water the advisory names, such as bottled water.'; CHM.announce(result.textContent); } }, 'Boil it'));
    host.appendChild(pot); host.appendChild(result);
    host.appendChild(h('p.small', 'Always follow the exact instructions in the advisory your local officials issue.'));
    return host;
  }
  function refs() {
    return h('div', h('p.small', 'Reference panel (supplied; short citations).'), h('ul.refs', data.refs.map(function (r) { return h('li', r.t); })), aqiKey());
  }
  var tabsDef = [
    { id: 'ref', label: 'Reference', render: refs },
    { id: 'smoke', label: 'Smoke', render: function () { return scenarioPanel('smoke'); } },
    { id: 'uv', label: 'UV', render: function () { return scenarioPanel('uv'); } },
    { id: 'noise', label: 'Noise', render: noisePanel },
    { id: 'heat', label: 'Heat', render: function () { return scenarioPanel('heat'); } },
    { id: 'water', label: 'Water', render: waterPanel }
  ];
  var t = CHM.tabs(tabsDef, (ctx.saved && ctx.saved.tab) || 'ref', function (x) { ctx.save({ tab: x }); });
  var off = CHM.on('unit', function (uid) { if (!t.isConnected) { off(); return; } if (unitScenario[uid]) t.select(unitScenario[uid]); });
  if (ctx.currentUnit && unitScenario[ctx.currentUnit]) t.select(unitScenario[ctx.currentUnit]);
  return t;
};
