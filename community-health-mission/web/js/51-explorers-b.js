'use strict';
// ---------------------------------------------------------------------------------------------- M4
CHM.explorers.data = function (data, ctx) {
  var T = data.table, COLORS = ['#4338ca', '#4338ca', '#4338ca', '#4338ca'];
  function charts() {
    var host = h('div.smult'), hi = null;
    function draw() {
      CHM.clear(host);
      T.cols.forEach(function (c) {
        var fig = h('figure.chart', h('figcaption', h('strong', c.t), h('span.small', ' (' + c.unit + '; scale 0 to ' + c.max + ')')));
        var svg = S('svg', { viewBox: '0 0 300 130', class: 'bars', role: 'img', 'aria-label': c.t + ': ' + T.rows.map(function (r) { return r.t + ' ' + r[c.id] + (c.fmt === 'pct' ? '%' : c.fmt === 'yrs' ? ' years' : ' per 1,000'); }).join('; ') });
        T.rows.forEach(function (r, i) {
          var w = r[c.id] / c.max * 170, y = 8 + i * 29, on = hi === r.id;
          svg.appendChild(S('text', { x: 98, y: y + 15, 'text-anchor': 'end', 'font-size': 11.5, fill: '#16212e', 'font-weight': on ? 800 : 500 }, r.t));
          var bar = S('rect', { class: 'bar', x: 104, y: y, height: 20, rx: 3, fill: on ? '#1d4ed8' : COLORS[i], width: CHM.motionOn() ? 0 : w });
          svg.appendChild(bar);
          if (CHM.motionOn()) requestAnimationFrame(function () { requestAnimationFrame(function () { bar.setAttribute('width', w); }); });
          svg.appendChild(S('text', { x: 108 + w, y: y + 15, 'font-size': 12, 'font-weight': 700, fill: '#16212e' }, r[c.id] + (c.fmt === 'pct' ? '%' : c.fmt === 'yrs' ? ' yrs' : '')));
        });
        svg.appendChild(S('line', { x1: 104, y1: 4, x2: 104, y2: 126, stroke: '#44566a' }));
        fig.appendChild(svg); host.appendChild(fig);
      });
    }
    draw();
    var sel = h('div.row', h('label.sel', 'Highlight a community', h('select', { onchange: function (e) { hi = e.target.value || null; draw(); } }, [h('option', { value: '' }, 'None')].concat(T.rows.map(function (r) { return h('option', { value: r.id }, r.t); })))));
    return h('div', h('p.callout', h('strong', 'Fictional classroom data. '), 'Four invented communities; community averages only. Each chart has its own units and its own scale starting at 0, so bar lengths are honest and charts are not compared across measures.'), sel, host);
  }
  function table() {
    return h('div', h('p.small', T.title + '. Fictional classroom data.'), h('table.dt', h('caption', 'Community health measures (fictional classroom data)'),
      h('thead', h('tr', [h('th', { scope: 'col' }, 'Community')].concat(T.cols.map(function (c) { return h('th', { scope: 'col' }, c.t); })))),
      h('tbody', T.rows.map(function (r) { return h('tr', [h('th', { scope: 'row' }, r.t)].concat(T.cols.map(function (c) { return h('td.n', r[c.id] + (c.fmt === 'pct' ? '%' : c.fmt === 'yrs' ? ' years' : '')); }))); }))));
  }
  function scatter() {
    var ax = 'food', ay = 'life', host = h('div'), plot = h('div');
    function draw() {
      CHM.clear(plot);
      var cx = T.cols.filter(function (c) { return c.id === ax; })[0], cy = T.cols.filter(function (c) { return c.id === ay; })[0];
      function rng(c) { var v = T.rows.map(function (r) { return r[c.id]; }), lo = Math.min.apply(null, v), hi = Math.max.apply(null, v), pad = (hi - lo) * 0.2 || 1; return [Math.floor(lo - pad), Math.ceil(hi + pad)]; }
      var rx = rng(cx), ry = rng(cy), W = 420, H = 260, L = 60, B = 40;
      var X = function (v) { return L + (v - rx[0]) / (rx[1] - rx[0]) * (W - L - 20); }, Y = function (v) { return H - B - (v - ry[0]) / (ry[1] - ry[0]) * (H - B - 20); };
      var svg = S('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'scatter', role: 'img', 'aria-label': 'Scatterplot of ' + cy.t + ' against ' + cx.t + ' for four communities. ' + T.rows.map(function (r) { return r.t + ' (' + r[ax] + ', ' + r[ay] + ')'; }).join('; ') });
      svg.appendChild(S('line', { x1: L, y1: H - B, x2: W - 10, y2: H - B, stroke: '#44566a' })); svg.appendChild(S('line', { x1: L, y1: 10, x2: L, y2: H - B, stroke: '#44566a' }));
      [0, 1, 2, 3, 4].forEach(function (i) { var vx = rx[0] + (rx[1] - rx[0]) * i / 4, vy = ry[0] + (ry[1] - ry[0]) * i / 4; svg.appendChild(S('text', { x: X(vx), y: H - B + 14, 'text-anchor': 'middle', 'font-size': 10, fill: '#16212e' }, Math.round(vx * 10) / 10)); svg.appendChild(S('text', { x: L - 6, y: Y(vy) + 3, 'text-anchor': 'end', 'font-size': 10, fill: '#16212e' }, Math.round(vy * 10) / 10)); });
      T.rows.forEach(function (r) { svg.appendChild(S('circle', { cx: X(r[ax]), cy: Y(r[ay]), r: 7, fill: '#4338ca', stroke: '#fff', 'stroke-width': 2 })); svg.appendChild(S('text', { x: X(r[ax]) + 10, y: Y(r[ay]) + 4, 'font-size': 11, 'font-weight': 700, fill: '#16212e' }, r.t)); });
      svg.appendChild(S('text', { x: (L + W) / 2, y: H - 6, 'text-anchor': 'middle', 'font-size': 11.5, fill: '#16212e' }, cx.t + ' (' + cx.unit + ')'));
      svg.appendChild(S('text', { x: 12, y: H / 2, 'text-anchor': 'middle', 'font-size': 11.5, fill: '#16212e', transform: 'rotate(-90 12 ' + H / 2 + ')' }, cy.t + ' (' + cy.unit + ')'));
      plot.appendChild(svg);
      plot.appendChild(h('p.callout', 'Only four points, and each is an average for a whole community. A pattern here is a reason to ask more questions, not proof that one measure causes another. Axes do not start at 0 in this optional view.'));
    }
    function sel(label, which) { return h('label.sel', label, h('select', { onchange: function (e) { if (which === 'x') ax = e.target.value; else ay = e.target.value; draw(); } }, T.cols.map(function (c) { return h('option', { value: c.id, selected: (which === 'x' ? ax : ay) === c.id }, c.t); }))); }
    host.appendChild(h('p.small', 'Optional exploration (not required for any question).')); host.appendChild(h('div.ctlrow', sel('Horizontal axis', 'x'), sel('Vertical axis', 'y'))); host.appendChild(plot); draw(); return host;
  }
  return CHM.tabs([{ id: 'charts', label: 'Charts', render: charts }, { id: 'table', label: 'Data table', render: table }, { id: 'scatter', label: 'Scatterplot (optional)', render: scatter }], ctx.saved && ctx.saved.tab, function (t) { ctx.save({ tab: t }); });
};

// ---------------------------------------------------------------------------------------------- M5
CHM.explorers.media = function (data, ctx) {
  var P = data.post, cueById = {}; P.cues.forEach(function (c) { cueById[c.id] = c; });
  function feed() {
    var showAll = false, info = h('div.infocard', { 'aria-live': 'polite' }, h('p', 'Select any highlighted part of the post to inspect it.')), host = h('div.feedwrap'), post;
    function cue(id, text) {
      return h('button.cue' + (showAll ? '.all' : ''), { type: 'button', 'data-cue': id, onclick: function () { var c = cueById[id]; CHM.clear(info); info.appendChild(h('div', h('span.badge', c.kind), h('p', h('strong', c.t)), h('p', c.note))); }, 'aria-label': 'Inspect: ' + text }, text, showAll ? h('span.kindtag', cueById[id].kind) : null);
    }
    function draw() {
      CHM.clear(host);
      post = h('article.post', { 'aria-label': 'Constructed example of a sponsored social media post' },
        h('div.phead', h('span.avatar', { 'aria-hidden': 'true' }, 'M'), h('div', cue('influencer', P.user), h('div.small', P.followers + ' · ', cue('disclosure', 'Official SparkUp Partner')))),
        h('div.pbody', cue('identity', 'Be the athlete you\'re meant to be!'), ' SparkUp Boost is ', cue('halo', 'all-natural, plant-powered'), ' energy that ', cue('claim', 'boosts your focus'), '. Over ', cue('social', '50,000 cans sold THIS WEEK'), '! ', cue('scarcity', 'Only 2 hours left'), ' for 30% off with code ', cue('code', 'MAYA30'), '!'),
        h('div.ptags', '#fuelyourgame #teamsparkup #grind ', cue('disclosure', '#sp')),
        h('div.pfoot', cue('social', P.stats.likes), ' · ', cue('social', P.stats.rating)),
        h('div.prod', h('div.can', { 'aria-hidden': 'true' }, '⚡'), h('div.label', h('strong', 'Product label'), h('div', P.label.serving), h('div', P.label.caffeine), h('div', P.label.sugar), h('div', P.label.blend))));
      host.appendChild(h('p.src', P.note));
      host.appendChild(h('label.chk', h('input', { type: 'checkbox', checked: showAll, onchange: function (e) { showAll = e.target.checked; draw(); } }), ' Label every technique in the post'));
      host.appendChild(post); host.appendChild(info);
    }
    var chain = h('div.chain', { 'aria-label': 'How the post is built' }, [['Audience', 'Teen athletes who want to improve and belong'], ['Emotion', 'Ambition, belonging and urgency'], ['Message', '“Natural” energy makes you the athlete you want to be'], ['Action', 'Buy now with the code']].map(function (s, i) { return h('div.chainstep', { 'data-i': i }, h('strong', s[0]), h('span', s[1])); }));
    var playBtn = h('button.btn.sm', { type: 'button', onclick: function () {
      var steps = chain.children; Array.prototype.forEach.call(steps, function (x) { x.classList.remove('lit'); });
      if (!CHM.motionOn()) { Array.prototype.forEach.call(steps, function (x) { x.classList.add('lit'); }); return; }
      Array.prototype.forEach.call(steps, function (x, i) { setTimeout(function () { x.classList.add('lit'); }, i * 700); });
    } }, '▶ Show how the post works');
    draw();
    return h('div', h('p.small', 'Audience → Emotion → Message → Action'), h('div.row', playBtn), chain, host);
  }
  function guides() {
    return h('div.cards3', h('article.pcard', h('h4', 'P.A.U.S.E.'), h('ul', data.pause.map(function (p) { return h('li', h('strong', p[0] + ' ' + p[1] + ': '), p[2]); }))),
      h('article.pcard', h('h4', 'S.T.O.P.'), h('ul', data.stop.map(function (p) { return h('li', h('strong', p[0] + ' ' + p[1] + ': '), p[2]); }))),
      h('article.pcard', h('h4', 'Remember'), h('ul', h('li', 'A technique does not make a claim false; check the evidence.'), h('li', 'Popularity is not proof.'), h('li', 'A .gov label alone does not decide which source answers your question.'), h('li', 'Disclosures of paid relationships should be clear and easy to notice (FTC guidance).'))));
  }
  function cards() {
    return h('div', h('p.callout', 'All cards are constructed classroom examples. Names, numbers and findings are fictional and not attributed to any real agency.'),
      h('div.srcgrid', data.sources.map(function (s) {
        return h('article.scard', h('div.shead', h('span.badge', 'Card ' + s.id), h('strong', s.t)), h('div.small', s.type),
          h('dl', [['Author', s.author], ['Purpose', s.purpose], ['Date', s.date], ['Place', s.place], ['Methods', s.methods], ['Sample', s.n], ['Citations', s.cites]].map(function (r) { return [h('dt', r[0]), h('dd', r[1])]; })));
      })));
  }
  return CHM.tabs([{ id: 'feed', label: 'Sponsored feed', render: feed }, { id: 'guides', label: 'P.A.U.S.E. and STOP', render: guides }, { id: 'cards', label: 'Source cards', render: cards }], ctx.saved && ctx.saved.tab, function (t) { ctx.save({ tab: t }); });
};

// ---------------------------------------------------------------------------------------------- M6
CHM.explorers.action = function (data, ctx) {
  var board = h('div.board'), poster = h('div.poster'), prev = {};
  function opt(ctls, cid, oid) { var c = ctls.filter(function (x) { return x.id === cid; })[0]; return c ? CHM.optText(c.options, oid) : ''; }
  var drafts = CHM.drafts || (CHM.drafts = {});
  function cards() {
    var adv = CHM.shared.adv || {}, ev = drafts['M6-U5'] && drafts['M6-U5'].ev;
    var weak = data.weak, slots = [
      { k: 'Problem', v: data.problem, fixed: true },
      { k: 'Evidence', v: ev ? CHM.optText(data.evidence, ev) : null, empty: 'Choose evidence in Question 5.' },
      { k: 'Audience', v: adv.aud ? opt(data.advocacyControls, 'aud', adv.aud) : null, weak: opt(data.advocacyControls, 'aud', weak.aud), id: 'aud' },
      { k: 'Solution', v: adv.sol ? opt(data.advocacyControls, 'sol', adv.sol) : null, weak: opt(data.advocacyControls, 'sol', weak.sol), id: 'sol' },
      { k: 'Message', v: adv.msg ? opt(data.advocacyControls, 'msg', adv.msg) : null, weak: opt(data.advocacyControls, 'msg', weak.msg), id: 'msg' },
      { k: 'Action', v: 'Present the proposal to the decision-makers and ask for a vote at their next meeting.', fixed: true },
      { k: 'Evaluation', v: adv.eval ? opt(data.advocacyControls, 'eval', adv.eval) : null, weak: opt(data.advocacyControls, 'eval', weak.eval), id: 'eval' },
      { k: 'Personal protection', v: adv.pers ? opt(data.advocacyControls, 'pers', adv.pers) : null, weak: opt(data.advocacyControls, 'pers', weak.pers), id: 'pers' }
    ];
    CHM.clear(board);
    slots.forEach(function (s, i) {
      var cur = s.v || (s.weak ? null : null), changed = prev[s.k] !== undefined && prev[s.k] !== s.v;
      prev[s.k] = s.v;
      board.appendChild(h('div.bcard' + (s.v ? ' filled' : '') + (changed ? ' pop' : '') + (s.weak && !s.v ? ' weak' : ''), { style: { '--i': i } },
        h('div.bk', (i + 1) + '. ' + s.k, s.v && !s.fixed ? h('span.chosen', ' ✓ chosen') : null, s.weak && !s.v ? h('span.wk', ' ⚠ weak starting plan') : null),
        h('div.bv', s.v || (s.weak ? s.weak : (s.empty || ''))), s.weak && !s.v ? h('div.small', 'Repair this in Question 2.') : null));
    });
    var c = CHM.shared.counter || {}, cc = data.counterControls;
    CHM.clear(poster); poster.appendChild(h('div.pk', 'Counter-message draft (to the SparkUp post)'));
    [['fact', 'Fact and source'], ['alt', 'Healthier alternative'], ['vis', 'Visual'], ['cta', 'Call to action'], ['tone', 'Tone']].forEach(function (r) { poster.appendChild(h('div.prow', h('strong', r[1] + ': '), c[r[0]] ? opt(cc, r[0], c[r[0]]) : h('em', 'not chosen yet'))); });
  }
  cards();
  CHM.on('plan', function (sid) { if (board.isConnected && (sid === 'adv' || sid === 'counter')) cards(); });
  CHM.on('draft', function (d) { if (board.isConnected && d.unit === 'M6-U5') cards(); });
  return h('div', h('p.small', 'Your plan assembles here as you choose. A chosen option is not necessarily the best one: use the questions to check your reasoning.'), board, poster);
};

CHM.explorers.plain = function (data) { return h('div.callout', data.note || ''); };
