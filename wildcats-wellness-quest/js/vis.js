/* Visual builders for item context: gauges, ratings, habit loop, goal, SMART sentence, media posts, STOP flow, calculations, charts, tables. */
(function (root) {
  'use strict';
  var W = root.WWQ, U = W.U, h = U.h, S = W.Sim, A = W.Art, UI = W.UI;
  var V = W.Vis = { seenTabs: {}, openTab: {} };
  var M = U.fmtSigned;
  var NS = 'http://www.w3.org/2000/svg';

  /* ---------- gauge: value on a numeric scale with unlabeled cut-points (categories come from the reference panel) ---------- */
  V.gauge = function (g) {
    var range = g.max - g.min, pctOf = function (v) { return Math.max(0, Math.min(100, (v - g.min) / range * 100)); };
    var track = h('div.gauge-track', { role: 'img', 'aria-label': g.label + ': reading ' + g.value + ' ' + g.unit + ' on a scale from ' + g.min + ' to ' + g.max + '. Cut-points at ' + g.zones.slice(1).map(function (z) { return z.from; }).join(', ') + '. Use the reference panel to interpret it.' });
    g.zones.forEach(function (z, i) { var seg = h('div.gauge-zone', { style: { width: ((z.to - z.from) / range * 100) + '%', background: i % 2 ? '#e6ebf8' : '#f5f7fd' } }); track.appendChild(seg); });
    track.appendChild(h('div.gauge-mark', { style: { left: pctOf(g.value) + '%' }, 'data-v': g.value + ' ' + g.unit }));
    var ticks = h('div.gauge-scale', { 'aria-hidden': 'true' });
    [g.min].concat(g.zones.slice(1).map(function (z) { return z.from; }), [g.max]).forEach(function (v, i, arr) { ticks.appendChild(h('span', { style: { left: pctOf(v) + '%', transform: i === 0 ? 'none' : i === arr.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)' } }, String(v))); });
    return h('div.gauge', h('div.gauge-label', h('span', g.label), h('span.chip.brand', g.value + ' ' + g.unit)), track, ticks);
  };

  V.reading = function (vis, ctx) {
    var box = h('div');
    vis.gauges.forEach(function (g) { box.appendChild(V.gauge(g)); });
    box.appendChild(h('p.hint-line', 'Scale shows cut-points only. Category names are in the reference panel above. Fictional adult patient.'));
    return box;
  };

  /* ---------- ratings ---------- */
  V.ratings = function (vis) {
    var wrap = h('div.ratings', { role: 'img', 'aria-label': vis.who + ' ratings: ' + S.DOMAINS.map(function (d) { return d.n + ' ' + vis.vals[d.id] + ' of 5'; }).join(', ') });
    S.DOMAINS.forEach(function (d) {
      var bar = h('div.rbar'); for (var i = 1; i <= 5; i++) bar.appendChild(h('i' + (i <= vis.vals[d.id] ? '.on' : '')));
      wrap.appendChild(h('div.rrow.dom-' + d.id, h('div.lab', A.iconEl(d.ico), d.n), bar, h('div.val', String(vis.vals[d.id]))));
    });
    return h('div', wrap, h('div.scale-note', h('span', '1 = needs attention'), h('span', '3 = doing okay'), h('span', '5 = thriving')));
  };

  /* ---------- habit loop ---------- */
  V.loop = function (vis) {
    var b = vis.broken;
    var node = function (t, txt) { return h('div.loopnode.broken', h('b', t), h('span', txt)); };
    return h('div', h('div.loopbox', node('Cue', b.cue), h('div.looparrow', { 'aria-hidden': 'true' }, '→'), node('Routine', b.routine), h('div.looparrow', { 'aria-hidden': 'true' }, '→'), node('Reward', b.reward), h('div.loopback', 'Cue → routine → reward. Repetition can make a behavior more automatic. This is the classroom habit model.')));
  };

  V.goal = function (vis) {
    var LBL = { S: 'Specific', M: 'Measurable', A: 'Achievable', R: 'Relevant', T: 'Time-bound' }, box = h('div.goalbox', { 'aria-label': 'Draft goal' });
    box.appendChild(h('b', 'Draft goal: '));
    vis.clauses.forEach(function (c) { box.appendChild(h('span.cl', h('span.tagk', { title: LBL[c.k] }, c.k), c.cur + ' ')); });
    return box;
  };

  /* ---------- SMART builder: live sentence from the current selections ---------- */
  V.builder = function (vis, ctx) {
    var v = ctx.variant, pick = function (pid) { var sel = ctx.draftOf(pid); if (!sel) return null; var p = v.parts.filter(function (x) { return x.id === pid; })[0]; var o = p.opts.filter(function (x) { return x.id === sel; })[0]; return o ? o.t : null; };
    var blank = function (t, lab) { return t ? h('span.blank', t) : h('span.empty', '[' + lab + ']'); };
    var s = h('div.buildsent', { 'aria-live': 'polite' }, h('b', 'Your goal so far: '), 'I will ', blank(pick('action'), 'specific action'), ', tracking it by ', blank(pick('track'), 'tracking method'), ', ', blank(pick('amount'), 'feasible amount'), ', ', blank(pick('why') && pick('why').toLowerCase(), 'purpose'), ', ', blank(pick('time') && pick('time').toLowerCase(), 'timeframe'), '.');
    return s;
  };

  /* ---------- media post with four evidence tabs ---------- */
  var TABS = [['post', 'Post'], ['author', 'Author'], ['evidence', 'Evidence'], ['purpose', 'Purpose'], ['indep', 'Independent sources']];
  V.post = function (vis, ctx) {
    var p = vis.post, key = ctx.variant.id, cur = V.openTab[key] || 'post', seen = V.seenTabs[key] = V.seenTabs[key] || { post: true };
    var panel = h('div.tabpanel#tp-' + key.replace(/\./g, '-'), { role: 'tabpanel', tabindex: '0', 'aria-labelledby': 'tb-' + key.replace(/\./g, '-') + '-' + cur });
    if (cur === 'post') { panel.appendChild(h('div.art', U.svg(A.postArt(p.art)))); panel.appendChild(h('p', p.text)); }
    else { var T = { author: 'Who is behind this?', evidence: 'What evidence is shown?', purpose: 'Why was it posted?', indep: 'Do independent sources agree?' }; panel.appendChild(h('h3', T[cur])); panel.appendChild(h('p', p.tabs[cur])); }
    var list = h('div.tabs', { role: 'tablist', 'aria-label': 'Investigate the post' });
    TABS.forEach(function (t, i) {
      list.appendChild(h('button.tab', { type: 'button', role: 'tab', id: 'tb-' + key.replace(/\./g, '-') + '-' + t[0], 'aria-selected': String(cur === t[0]), 'aria-controls': 'tp-' + key.replace(/\./g, '-'), tabindex: cur === t[0] ? '0' : '-1', 'data-fk': 'tab-' + key + t[0],
        onclick: function () { V.openTab[key] = t[0]; seen[t[0]] = true; ctx.rerender(); },
        onkeydown: function (e) { var idx = i; if (e.key === 'ArrowRight') idx = (i + 1) % TABS.length; else if (e.key === 'ArrowLeft') idx = (i + TABS.length - 1) % TABS.length; else return; e.preventDefault(); V.openTab[key] = TABS[idx][0]; seen[TABS[idx][0]] = true; ctx.rerender(); setTimeout(function () { var n = document.getElementById('tb-' + key.replace(/\./g, '-') + '-' + TABS[idx][0]); if (n) n.focus(); }, 0); } },
        t[1], seen[t[0]] && t[0] !== 'post' ? h('span.seen', { 'aria-label': 'opened' }, '✓') : null));
    });
    return h('div', h('div.post', h('div.post-top', h('span.handle', p.handle), h('span.chip', p.platform), h('span.chip.warn.fict', 'FICTIONAL EXAMPLE')), list, panel),
      h('p.hint-line', 'Invented for this activity. Opening tabs earns no points; your reasoning does.'));
  };

  /* ---------- STOP flow ---------- */
  V.stop = function (vis, ctx) {
    var flow = h('div.stopflow', [['S', 'State the decision'], ['T', 'Think of options'], ['O', 'Observe consequences'], ['P', 'Pick a responsible choice']].map(function (x) { return h('div', h('b', x[0]), x[1]); }));
    var optab = h('div.optab', h('div', h('b', 'Option A'), vis.optA), h('div', h('b', 'Option B'), vis.optB));
    var out = h('div', flow, h('p.hint-line', 'In step O you will compare these two options.'), optab);
    var rec = ctx.rec;
    if (rec.attempts.length && ctx.mode !== 'draft') {
      var last = rec.attempts[rec.attempts.length - 1], v = W.Policy.variantAt(ctx.item, last.n - 1), pid = last.response.p;
      if (v.branches && v.branches[pid]) {
        var po = v.parts.filter(function (x) { return x.id === 'p'; })[0].opts.filter(function (o) { return o.id === pid; })[0];
        out.appendChild(h('div.branch.rise', { 'aria-live': 'polite' }, h('div.path', A.iconEl('compass'), 'What happens next if you pick: “' + po.t + '”'), h('p', v.branches[pid]), h('p.hint-line', 'This shows one plausible path. It is not a grade.')));
      }
    }
    return out;
  };

  V.calc = function (vis) {
    var li = function (a) { return h('ul', a.map(function (x) { return h('li', h('span', x.n || x.d), h('b', M(x.v))); })); };
    return h('div.calc', h('div', h('h3', 'Part 1 · ' + vis.domName + ' on ' + vis.domDay), li(vis.cells)),
      h('div', h('h3', 'Part 2 · ' + vis.totalDay + ' domain subtotals'), li(vis.subs)),
      h('div', h('h3', 'Part 3 · Daily totals through ' + vis.throughDay), li(vis.totals)));
  };

  V.finalcase = function (vis, ctx) {
    var c = W.FINALCASES[vis.idx], out = h('div.finalcase');
    if (vis.show.indexOf('post') >= 0) out.appendChild(h('div.full', V.post({ post: c.post }, { variant: { id: 'final.' + c.id }, rerender: ctx.rerender })));
    if (vis.show.indexOf('resp') >= 0) out.appendChild(h('div', h('h3', 'Responsibilities'), h('p', c.resp)));
    if (vis.show.indexOf('pattern') >= 0) out.appendChild(h('div', h('h3', 'Wellness pattern this week'), h('ul.pat', c.pattern.map(function (p) { return h('li', h('b', p[0] + ': '), p[1]); }))));
    if (vis.show.indexOf('goal') >= 0) out.appendChild(h('div', h('h3', 'Proposed goal'), h('p', c.goal)));
    return out;
  };

  /* ---------- charts ---------- */
  V.lineChart = function (cfg) {
    var Wd = 560, Ht = 250, L = 46, R = 16, T = 20, B = 36, n = 7, all = [];
    cfg.series.forEach(function (s) { s.values.forEach(function (v) { all.push(v); }); });
    var lo = Math.min.apply(null, all.concat([0])), hi = Math.max.apply(null, all.concat([0]));
    var step = (hi - lo) > 120 ? 40 : (hi - lo) > 60 ? 20 : 10; lo = Math.floor(lo / step) * step - (lo % step === 0 ? 0 : 0); hi = Math.ceil(hi / step) * step; if (lo === hi) { lo -= step; hi += step; }
    var x = function (i) { return L + (Wd - L - R) * i / (n - 1); }, y = function (v) { return T + (Ht - T - B) * (hi - v) / (hi - lo); };
    var s = '<svg viewBox="0 0 ' + Wd + ' ' + Ht + '" role="img" aria-labelledby="lc-t lc-d" focusable="false"><title id="lc-t">' + U.esc(cfg.title) + '</title><desc id="lc-d">' + U.esc(cfg.desc) + '</desc>';
    for (var g = lo; g <= hi; g += step) s += '<line x1="' + L + '" x2="' + (Wd - R) + '" y1="' + y(g) + '" y2="' + y(g) + '" stroke="' + (g === 0 ? '#14213d' : '#e1e6f2') + '" stroke-width="' + (g === 0 ? 2 : 1) + '"/><text x="' + (L - 6) + '" y="' + (y(g) + 4) + '" font-size="12" text-anchor="end" fill="#39466a" font-family="system-ui,sans-serif">' + M(g) + '</text>';
    S.DAYS.forEach(function (d, i) { s += '<text x="' + x(i) + '" y="' + (Ht - 12) + '" font-size="12.5" text-anchor="middle" font-weight="700" fill="#39466a" font-family="system-ui,sans-serif">' + d + '</text>'; });
    cfg.series.forEach(function (ser, si) {
      var pts = ser.values.map(function (v, i) { return x(i) + ',' + y(v); }), len = 0;
      for (var i = 1; i < ser.values.length; i++) { var dx = x(i) - x(i - 1), dy = y(ser.values[i]) - y(ser.values[i - 1]); len += Math.sqrt(dx * dx + dy * dy); }
      s += '<polyline class="' + (ser.dash ? '' : 'draw') + '" style="--len:' + Math.ceil(len) + '" points="' + pts.join(' ') + '" fill="none" stroke="' + ser.color + '" stroke-width="' + (ser.dash ? 2.5 : 4) + '" ' + (ser.dash ? 'stroke-dasharray="8 6"' : '') + ' stroke-linecap="round" stroke-linejoin="round"/>';
      ser.values.forEach(function (v, i) { s += '<circle cx="' + x(i) + '" cy="' + y(v) + '" r="' + (ser.dash ? 3.5 : 5) + '" fill="' + (ser.dash ? '#fff' : ser.color) + '" stroke="' + ser.color + '" stroke-width="2"/>'; if (!ser.dash || cfg.labelAll) s += '<text x="' + x(i) + '" y="' + (y(v) + (si ? 18 : -10)) + '" font-size="12" font-weight="800" text-anchor="middle" fill="' + ser.color + '" font-family="system-ui,sans-serif">' + M(v) + '</text>'; });
    });
    return U.svg(s + '</svg>');
  };
  V.runChart = function (weeks, opts) {
    opts = opts || {};
    var series = weeks.map(function (w) { return { values: S.running(w.week), color: w.color, dash: w.dash, label: w.label }; });
    var desc = weeks.map(function (w) { return w.label + ' running total by day: ' + S.running(w.week).map(function (v, i) { return S.DAYS[i] + ' ' + M(v); }).join(', '); }).join('. ');
    var box = h('div.chartbox', h('h3', opts.title || 'Running total by day'), V.lineChart({ series: series, title: opts.title || 'Running total by day', desc: desc }),
      h('div.legend', weeks.map(function (w) { return h('span', h('span.sw' + (w.dash ? '.dash' : '')), w.label); })));
    return box;
  };

  V.dailyTable = function (wk) {
    var c = S.compute(wk), tbl = h('table.tbl', h('caption.sr-only', 'Daily totals and running totals'), h('thead', h('tr', h('th', 'Day'), S.DAYS.map(function (d) { return h('th', d); }))));
    tbl.appendChild(h('tbody', h('tr.sub', h('th', 'Daily total'), c.dayTotals.map(function (v) { return h('td', M(v)); })), h('tr.tot', h('th', 'Running total'), c.running.map(function (v) { return h('td', M(v)); }))));
    return h('div.tblwrap', tbl);
  };

  V.logTable = function (wk, opts) {
    opts = opts || {}; var dec = {}; (W.DECISIONS || []).forEach(function (d) { dec[d.cat + d.day] = true; });
    var c = S.compute(wk), tbl = h('table.tbl'); tbl.appendChild(h('caption.sr-only', 'Full 7-day log: 20 categories with points by day, domain subtotals, daily totals and running totals'));
    tbl.appendChild(h('thead', h('tr', h('th', 'Category (weight)'), S.DAYS.map(function (d) { return h('th', d); }), h('th', 'Week'))));
    var body = h('tbody');
    S.DOMAINS.forEach(function (d) {
      body.appendChild(h('tr.sub.dom.dom-' + d.id, h('td', A.iconEl(d.ico), ' ' + d.n + ' subtotal (max ±' + S.domDailyMax(d.id) + '/day)'), c.domainDay[d.id].map(function (v) { return h('td', M(v)); }), h('td', M(c.domainWeek[d.id]))));
      S.catsOf(d.id).forEach(function (ct) {
        var tr = h('tr', h('td', ct.n + ' (±' + ct.w + ')'));
        for (var i = 0; i < 7; i++) { var g = S.grade(wk, ct.id, i), p = S.points(ct.id, g); var td = h('td' + (p < 0 ? '.neg' : p > 0 ? '.pos' : '') + (opts.stars && dec[ct.id + i] ? '.star' : ''), M(p), h('span.g', g)); tr.appendChild(td); }
        tr.appendChild(h('td', M(S.catWeek(wk, ct.id)))); body.appendChild(tr);
      });
    });
    body.appendChild(h('tr.sub', h('td', 'Daily total'), c.dayTotals.map(function (v) { return h('td', M(v)); }), h('td', M(c.total))));
    body.appendChild(h('tr.tot', h('td', 'Running total'), c.running.map(function (v) { return h('td', M(v)); }), h('td', M(c.total))));
    tbl.appendChild(body);
    return h('div.tblwrap', tbl);
  };

  V.domainBars = function (wk, base) {
    var c = S.compute(wk), cb = base ? S.compute(base) : null, wrap = h('div.chartbox', h('h3', 'Domain balance: each bar is compared to that domain’s OWN weekly maximum'));
    var box = h('div.dbars');
    S.DOMAINS.forEach(function (d) {
      var nv = c.normalized[d.id], left = nv < 0 ? 50 + nv * 50 : 50, width = Math.abs(nv) * 50;
      var track = h('div.dtrack', { role: 'img', 'aria-label': d.n + ' ' + M(c.domainWeek[d.id]) + ' of plus or minus ' + S.domWeekMax(d.id) + ', ' + (Math.round(nv * 1000) / 10) + ' percent of its own maximum' }, h('div.dfill', { style: { left: left + '%', width: width + '%' } }));
      if (cb) { var bv = cb.normalized[d.id]; track.appendChild(h('div', { style: { position: 'absolute', left: (50 + bv * 50) + '%', top: '-3px', bottom: '-3px', borderLeft: '3px dashed #14213d' }, title: 'Baseline marker' })); }
      box.appendChild(h('div.dbar.dom-' + d.id, h('div.lab', A.iconEl(d.ico), d.n), h('div', track, h('div.dtext', M(c.domainWeek[d.id]) + ' of ±' + S.domWeekMax(d.id) + ' possible = ' + (nv >= 0 ? '+' : '−') + (Math.abs(Math.round(nv * 1000) / 10)).toFixed(1) + '% of its own maximum' + (cb ? ' · baseline ' + M(cb.domainWeek[d.id]) : '')))));
    });
    wrap.appendChild(box);
    wrap.appendChild(h('p.hint-line', 'Maximums differ by domain (Physical ±56, Mental ±49, Emotional ±49, Social ±56, Environmental ±35), so raw points alone can mislead. Centre line = 0.' + (cb ? ' Dashed marker = baseline.' : '')));
    return wrap;
  };

  V.caseweek = function (vis, ctx) {
    var ds = W.CASEWEEKS[vis.ds], wk = S.makeWeek(ds.rows), out = h('div', h('p.muted.small', 'Case file for ' + ds.name + ' (fictional). Points are worksheet scoring rules: A = +weight, B = 0, C = −weight.'));
    if (vis.show.indexOf('run') >= 0) out.appendChild(V.runChart([{ week: wk, color: '#2b3a8c', label: ds.name + '’s case week' }]));
    if (vis.show.indexOf('daily') >= 0) out.appendChild(V.dailyTable(wk));
    if (vis.show.indexOf('domain') >= 0) out.appendChild(V.domainBars(wk));
    if (vis.show.indexOf('log') >= 0) { var d = h('details', { open: vis.show.indexOf('daily') >= 0 || vis.show.length === 1 ? true : null }, h('summary', { style: { cursor: 'pointer', fontWeight: '800', margin: '8px 0' } }, 'Full daily log (20 categories × 7 days)'), V.logTable(wk)); out.appendChild(d); }
    return out;
  };

  V.render = function (vis, ctx) {
    if (!vis || !V[vis.type]) return null;
    return V[vis.type](vis, ctx);
  };
})(typeof window !== 'undefined' ? window : globalThis);
