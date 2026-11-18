/* =====================================================================
   OUTBREAK CITY: USER INTERFACE (DOM HUD, screens, report)
   Methods are mixed into App (see app.js). Everything lives inside .oc-root.
   ===================================================================== */
(function (root) {
  'use strict';
  var NS = root.OutbreakCity = root.OutbreakCity || {};
  var C = NS.core, D = NS.data, esc = C.esc;
  var U = NS.UI = {};

  function el(tag, cls, html) { var e = root.document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }
  var ICONS = {
    hall: '<svg class="oc-ico" viewBox="0 0 20 20"><path d="M3 9a7 5 0 0 1 14 0z" fill="#5FA8A0"/><rect x="3" y="9" width="14" height="8" fill="#E8E4DA"/><rect x="8.5" y="12" width="3" height="5" fill="#2A2320"/><path d="M10 4V1" stroke="#ddd" stroke-width="1.4"/></svg>',
    budget: '<svg class="oc-ico" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="#F0E442"/><text x="10" y="14" font-size="11" text-anchor="middle" font-weight="900" fill="#5a4a00">$</text></svg>',
    vaccines: '<svg class="oc-ico" viewBox="0 0 20 20"><path d="M3 17l9-9" stroke="#36d19a" stroke-width="3" stroke-linecap="round"/><path d="M11 9l3-3M13 4l3 3M15 5l2-2" stroke="#36d19a" stroke-width="2" stroke-linecap="round"/></svg>',
    beds: '<svg class="oc-ico" viewBox="0 0 20 20"><rect x="2" y="9" width="16" height="5" rx="1" fill="#F2A6D6"/><rect x="3" y="6" width="5" height="3" rx="1" fill="#fff"/><path d="M2 6v11M18 11v6" stroke="#F2A6D6" stroke-width="2"/></svg>',
    trust: '<svg class="oc-ico" viewBox="0 0 20 20"><path d="M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5z" fill="#56B4E9"/><path d="M6.5 10l2.5 2.5 4.5-5" stroke="#06202f" stroke-width="2" fill="none"/></svg>',
    panic: '<svg class="oc-ico" viewBox="0 0 20 20"><path d="M10 2l9 16H1z" fill="#ff8a5c"/><rect x="9" y="7" width="2" height="6" fill="#331"/><rect x="9" y="14.5" width="2" height="2" fill="#331"/></svg>',
    equity: '<svg class="oc-ico" viewBox="0 0 20 20"><path d="M10 3v14M4 17h12M3 7h14" stroke="#CC79A7" stroke-width="2"/><path d="M3 7l-2 5h4zM17 7l-2 5h4z" fill="#CC79A7"/></svg>'
  };
  var SHAPES = {
    healthy: '<svg class="oc-shape" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="#56B4E9"/></svg>',
    known: '<svg class="oc-shape" viewBox="0 0 12 12"><path d="M6 0.5L11.5 6 6 11.5 0.5 6z" fill="#E69F00"/></svg>',
    infected: '<svg class="oc-shape" viewBox="0 0 12 12"><path d="M6 1L11.5 11H0.5z" fill="#D55E00"/></svg>',
    dead: '<svg class="oc-shape" viewBox="0 0 12 12"><path d="M2 2l8 8M10 2l-8 8" stroke="#9AA5B1" stroke-width="2.5"/></svg>'
  };
  var STYLE_NAMES = { mansion: 'Hillside mansion', tower: 'Office & apartment tower', brick: 'Apartment block', warehouse: 'Warehouse & lofts', house: 'Family house' };

  /* ================= DOM skeleton ================= */
  U.buildDom = function () {
    var self = this;
    var r = this.root = el('div', 'oc-root');
    r.setAttribute('role', 'application'); r.setAttribute('aria-label', D.GAME_TITLE + ', a public health tower defense game');
    this.el.appendChild(r);
    this.canvas = el('canvas', 'oc-canvas'); this.canvas.setAttribute('aria-label', 'Isometric map of ' + D.CITY_NAME + '. Use the build bar or number keys to place interventions.');
    this.canvas.tabIndex = 0;
    r.appendChild(this.canvas);
    var hud = this.hud = el('div', 'oc-hud oc-hidden');
    r.appendChild(hud);

    // --- top bar ---
    var top = el('div', 'oc-top');
    this.waveBox = el('div', 'oc-box oc-wave', '<b>PLANNING</b><small></small>');
    this.waveBox.setAttribute('aria-live', 'polite');
    top.appendChild(this.waveBox);
    this.meters = {};
    var mk = function (key, label, bar) {
      var m = el('div', 'oc-box oc-meter', '<div class="lbl">' + ICONS[key] + label + '</div><div class="val">-</div>' + (bar ? '<div class="oc-bar"><i></i></div>' : ''));
      m.tabIndex = 0; m.setAttribute('role', 'group'); m.setAttribute('aria-label', label);
      self.bindTip(m, function () { return '<b>' + esc(D.METERS[key].name) + '</b>' + esc(D.METERS[key].text); });
      top.appendChild(m);
      self.meters[key] = { el: m, val: m.querySelector('.val'), bar: m.querySelector('.oc-bar i'), last: '' };
    };
    mk('hall', 'City Hall', true);
    mk('budget', 'Budget'); mk('vaccines', 'Vaccines'); mk('beds', 'Beds');
    mk('trust', 'Trust', true); mk('panic', 'Panic', true); mk('equity', 'Equity', true);
    top.appendChild(el('div', 'oc-spacer'));
    var ctr = el('div', 'oc-box oc-ctrls');
    var btn = function (label, aria, fn, key) { var b = el('button', 'oc-btn', label); b.type = 'button'; b.setAttribute('aria-label', aria); b.title = aria + (key ? ' (' + key + ')' : ''); b.addEventListener('click', function () { self.sfx.unlock(); fn(); }); ctr.appendChild(b); return b; };
    this.bPause = btn('❚❚', 'Pause', function () { self.togglePause(); }, 'Space');
    this.bSpeed = btn('1x', 'Game speed', function () { self.cycleSpeed(); }, 'F');
    this.bLens = btn('◉ Lens', 'Data lens', function () { self.toggleLens(); }, 'L');
    this.bCenter = btn('⌖', 'Recenter map', function () { self.renderer.recenter(); }, 'C');
    this.bSound = btn('♪', 'Sound', function () { self.toggleMute(); }, 'M');
    this.bSettings = btn('⚙', 'Settings', function () { self.showSettings(); });
    this.bHelp = btn('?', 'Help and guide', function () { self.showHelp(); }, 'H');
    top.appendChild(ctr);
    hud.appendChild(top);

    // --- side panel ---
    var side = this.side = el('div', 'oc-box oc-side');
    side.innerHTML = '<div class="oc-side-head"><span>Outbreak status</span><button class="oc-btn" type="button" aria-label="Collapse status panel" title="Collapse (T)" style="min-height:24px;padding:0 6px">▾</button></div>' +
      '<div class="oc-side-body"><div class="oc-counts">' +
      '<div class="oc-count" data-k="healthy" tabindex="0">' + SHAPES.healthy + '<div><b>-</b><small>Look healthy</small></div></div>' +
      '<div class="oc-count" data-k="known" tabindex="0">' + SHAPES.known + '<div><b>-</b><small>Known exposed</small></div></div>' +
      '<div class="oc-count" data-k="infected" tabindex="0">' + SHAPES.infected + '<div><b>-</b><small>Infected</small></div></div>' +
      '<div class="oc-count" data-k="dead" tabindex="0">' + SHAPES.dead + '<div><b>-</b><small>Lost</small></div></div>' +
      '</div><div class="oc-reff" tabindex="0"><span class="muted oc-small">R<sub>eff</sub> estimate</span><b>-</b></div>' +
      '<canvas class="oc-chart" width="440" height="190" aria-label="Epidemic curve"></canvas>' +
      '<div class="oc-legend"><span><i style="border-color:#D55E00"></i>Infected</span><span><i style="border-color:#E69F00;border-top-style:dashed"></i>Known exposed</span><span><i style="border-color:#F2A6D6;border-top-style:dotted"></i>Hospital beds</span></div></div>';
    side.querySelector('button').addEventListener('click', function () { side.classList.toggle('collapsed'); });
    this.counts = {};
    side.querySelectorAll('.oc-count').forEach(function (c) { self.counts[c.getAttribute('data-k')] = c.querySelector('b'); self.bindTip(c, function () { return '<b>' + esc(D.METERS.counts.name) + '</b>' + esc(D.METERS.counts.text); }); });
    this.reffEl = side.querySelector('.oc-reff b');
    this.bindTip(side.querySelector('.oc-reff'), function () { return '<b>' + esc(D.METERS.reff.name) + '</b>' + esc(D.METERS.reff.text) + (self.game && self.game.reffConf < 0.2 ? '<span class="c">Low confidence: few residents are covered by testing.</span>' : ''); });
    this.chart = side.querySelector('canvas');
    if (root.innerWidth < 860) side.classList.add('collapsed');
    hud.appendChild(side);

    // --- selection panel ---
    this.sel = el('div', 'oc-box oc-sel oc-hidden'); hud.appendChild(this.sel);

    // --- bottom build bar ---
    var bottom = el('div', 'oc-bottom');
    var build = this.buildBar = el('div', 'oc-box oc-build'); build.setAttribute('role', 'toolbar'); build.setAttribute('aria-label', 'Build interventions');
    this.tbtns = {};
    D.TOWER_ORDER.forEach(function (type) {
      var def = D.TOWERS[type];
      var b = el('button', 'oc-tbtn'); b.type = 'button';
      b.setAttribute('aria-label', def.name + ', costs ' + def.cost + '. ' + def.short);
      b.innerHTML = '<span class="key">' + def.key + '</span><span class="ic" style="background:' + def.color + '"></span><span class="nm">' + esc(def.name.replace('Community Health Workers', 'Health Workers').replace('Testing & Tracing Lab', 'Testing Lab').replace('Vaccination Clinic', 'Vaccine Clinic').replace('Quarantine Barricade', 'Barricade')) + '</span><span class="cost">$' + def.cost + '</span>';
      var cv = el('canvas'); cv.width = 60; cv.height = 60;
      var cx = cv.getContext('2d');
      NS.Renderer.prototype.glyph.call(null, cx, def.glyph, 30, 30, 34, type === 'barricade' || type === 'radio' ? '#14202b' : '#fff');
      b.querySelector('.ic').appendChild(cv);
      b.addEventListener('click', function () { self.sfx.unlock(); self.selectTower(type); });
      self.bindTip(b, function () {
        return '<b>' + esc(def.name) + ' · $' + self.game.placeCost(type) + ' · key ' + def.key + '</b>' + esc(def.short) + '<span class="c">' + esc(def.concept) + '</span>';
      }, true);
      build.appendChild(b);
      self.tbtns[type] = b;
    });
    bottom.appendChild(build);
    this.startBtn = el('button', 'oc-btn primary oc-start', '▶ Start Wave 1'); this.startBtn.type = 'button';
    this.startBtn.addEventListener('click', function () { self.sfx.unlock(); self.doStartWave(); });
    bottom.appendChild(this.startBtn);
    hud.appendChild(bottom);

    // --- ticker & misc ---
    var tk = el('div', 'oc-ticker', '<div class="tag">NEWS</div><div class="track"></div>');
    tk.setAttribute('aria-live', 'off');
    this.tickerTrack = tk.querySelector('.track'); this.tickerEl = tk;
    hud.appendChild(tk);
    this.seedEl = el('div', 'oc-seed'); hud.appendChild(this.seedEl);
    this.toastsEl = el('div', 'oc-toasts'); this.toastsEl.setAttribute('aria-live', 'polite'); r.appendChild(this.toastsEl);
    this.bannerEl = el('div', 'oc-banner oc-hidden'); r.appendChild(this.bannerEl);
    this.pausedEl = el('div', 'oc-paused oc-hidden', 'PAUSED'); hud.appendChild(this.pausedEl);
    this.tutEl = el('div', 'oc-box oc-tut oc-hidden'); this.tutEl.setAttribute('role', 'dialog'); this.tutEl.setAttribute('aria-live', 'polite'); hud.appendChild(this.tutEl);
    this.tipEl = el('div', 'oc-box oc-tip oc-hidden'); this.tipEl.setAttribute('role', 'tooltip'); r.appendChild(this.tipEl);
    this.screen = el('div', 'oc-screen oc-hidden'); r.appendChild(this.screen);
    this.tickerQueue = []; this.tickerX = 0; this.tickerHold = 0;
  };

  /* ================= tooltips ================= */
  U.bindTip = function (node, htmlFn, above) {
    var self = this;
    var show = function () {
      var r = node.getBoundingClientRect(), rr = self.root.getBoundingClientRect();
      self.tipEl.innerHTML = htmlFn();
      self.tipEl.classList.remove('oc-hidden');
      var tw = self.tipEl.offsetWidth, th = self.tipEl.offsetHeight;
      var x = C.clamp(r.left - rr.left + r.width / 2 - tw / 2, 6, rr.width - tw - 6);
      var y = above ? r.top - rr.top - th - 8 : r.bottom - rr.top + 6;
      if (y + th > rr.height - 4) y = r.top - rr.top - th - 8;
      self.tipEl.style.left = x + 'px'; self.tipEl.style.top = Math.max(4, y) + 'px';
    };
    node.addEventListener('mouseenter', show); node.addEventListener('focus', show);
    node.addEventListener('mouseleave', function () { self.hideTip(); }); node.addEventListener('blur', function () { self.hideTip(); });
  };
  U.hideTip = function () { if (this.tipEl) this.tipEl.classList.add('oc-hidden'); };
  U.placeTipAt = function (sx, sy) {
    var rr = this.root.getBoundingClientRect(), tw = this.tipEl.offsetWidth, th = this.tipEl.offsetHeight;
    this.tipEl.style.left = C.clamp(sx + 16, 6, rr.width - tw - 6) + 'px';
    this.tipEl.style.top = C.clamp(sy + 16, 6, rr.height - th - 40) + 'px';
  };
  U.showBuildingTip = function (sx, sy, bi) {
    var g = this.game, cb = g.city.buildings[bi], b = g.blds[bi];
    var alive = b.S + b.E + b.Ek + b.V + b.R, imm = alive ? Math.round(100 * (b.V + b.R) / alive) : 0;
    var seen = g.flags.wastewater || g.t - b.seenT < 12;
    var pressure = b.E + b.Ek + b.Z;
    var name = cb.landmarkName || STYLE_NAMES[cb.style];
    var html = '<b>' + esc(name) + '</b>' + esc(D.DISTRICTS[cb.d].name) + ' · ' + alive + ' residents' + (b.D ? ' · ' + b.D + ' lost' : '') +
      '<br>Protected (vaccinated or recovered): ' + imm + '%' +
      (seen ? '<span class="c">' + (pressure ? '◆ Testing shows ' + pressure + ' infected here' + (b.Ek ? ' (' + b.Ek + ' known, isolating)' : '') : 'Testing shows no infections here') + '</span>'
        : '<span class="c">No recent testing data. Infections here would be invisible.</span>');
    this.tipEl.innerHTML = html; this.tipEl.classList.remove('oc-hidden'); this.placeTipAt(sx, sy);
  };
  U.showPlaceTip = function (sx, sy, tx, ty, chk) {
    var g = this.game, type = this.ui.placeType, def = D.TOWERS[type];
    var html = '<b>' + esc(def.name) + ' · $' + g.placeCost(type) + '</b>';
    if (!chk.ok) html += '<span style="color:#ffb27a">' + esc(chk.reason) + '</span>';
    else if (def.range > 1) {
      var n = 0, pop = 0, r2 = def.range * def.range;
      for (var i = 0; i < g.blds.length; i++) { var b = g.blds[i], dx = b.cx - tx - 0.5, dy = b.cy - ty - 0.5; if (dx * dx + dy * dy <= r2) { n++; pop += b.S + b.E + b.Ek + b.V + b.R; } }
      html += 'Covers ' + n + ' buildings · ' + pop + ' residents<br><span class="c">' + esc(D.DISTRICTS[g.city.district[ty * g.W + tx]].name) + '</span>';
    } else html += esc(def.short);
    html += '<span class="oc-small muted">Click to place · Shift-click to keep placing · Esc to cancel</span>';
    this.tipEl.innerHTML = html; this.tipEl.classList.remove('oc-hidden'); this.placeTipAt(sx, sy);
  };

  /* ================= HUD updates ================= */
  var barColor = function (v, invert) { var x = invert ? 100 - v : v; return x < 25 ? '#D55E00' : x < 50 ? '#E69F00' : '#36d19a'; };
  U.setMeter = function (key, text, pct, invert, warn) {
    var m = this.meters[key];
    if (m.last !== text) { m.val.textContent = text; m.last = text; m.el.setAttribute('aria-label', D.METERS[key].name + ': ' + text); }
    if (m.bar && pct !== undefined) { m.bar.style.width = C.clamp(pct, 0, 100) + '%'; m.bar.style.background = barColor(pct, invert); }
    m.el.classList.toggle('warn', !!warn);
  };
  U.flashMeter = function (key) { var m = this.meters[key]; if (!m) return; m.el.classList.remove('flash'); void m.el.offsetWidth; m.el.classList.add('flash'); };

  U.updateHud = function (force) {
    var g = this.game, self = this;
    if (!g || g.attract) return;
    var t = g.totals;
    var wb = this.waveBox;
    var title, sub;
    if (g.phase === 'build') { title = g.wave === 0 ? 'PLANNING' : 'BETWEEN WAVES'; sub = 'Next: wave ' + (g.wave + 1) + ' of ' + g.totalWaves; }
    else if (g.phase === 'wave') { title = g.overtime ? 'FINAL PUSH' : 'WAVE ' + g.wave + ' / ' + g.totalWaves; sub = C.fmtTime(g.waveDuration + (g.overtime ? D.CONFIG.finalPush : 0) - g.waveTime) + ' left' + (g.weather !== 'clear' ? ' · ' + g.weather : ''); }
    else if (g.phase === 'briefing') { title = 'MAYOR’S BRIEFING'; sub = 'After wave ' + g.wave; }
    else { title = 'OUTBREAK OVER'; sub = D.ENDINGS[g.ending] ? D.ENDINGS[g.ending].title : ''; }
    var wtxt = title + '|' + sub;
    if (this.lastWaveTxt !== wtxt) { wb.querySelector('b').textContent = title; wb.querySelector('small').textContent = sub; this.lastWaveTxt = wtxt; }

    var nh = g.countTowers('hospital'), beds = 0, used = 0;
    g.towers.forEach(function (tw) { if (tw.type === 'hospital') { beds += tw.st.beds + Math.floor(g.bonusBeds / Math.max(1, nh)); used += tw.patients.length; } });
    var hallPct = Math.round(100 * g.hallHp / g.hallMax);
    this.setMeter('hall', hallPct + '%', hallPct, false, hallPct < 35);
    this.setMeter('budget', '$' + Math.floor(g.budget));
    this.setMeter('vaccines', '' + Math.floor(g.vaccines), undefined, false, g.vaccines < 1);
    this.setMeter('beds', beds ? used + ' / ' + beds : 'none', undefined, false, beds > 0 && used >= beds);
    this.setMeter('trust', Math.round(g.trust) + '', g.trust, false, g.trust < 25);
    this.setMeter('panic', Math.round(g.panic) + '', g.panic, true, g.panic > 65);
    this.setMeter('equity', Math.round(g.equity) + '', g.equity, false, g.equity < 40);
    this.counts.healthy.textContent = t.healthyLooking;
    this.counts.known.textContent = t.knownE;
    this.counts.infected.textContent = t.zombies;
    this.counts.dead.textContent = g.stats.deaths;
    var rv = g.reff, conf = g.reffConf;
    if (!g.reffReady) { this.reffEl.textContent = '—'; this.reffEl.style.color = '#a9b8c4'; }
    else {
      this.reffEl.textContent = (conf < 0.2 ? '~' : '') + rv.toFixed(2) + (rv > 1.05 ? ' ▲' : rv < 0.95 ? ' ▼' : '');
      this.reffEl.style.color = rv > 1.05 ? '#ff8a5c' : rv < 0.95 ? '#36d19a' : '#F0E442';
    }

    D.TOWER_ORDER.forEach(function (type) {
      var b = self.tbtns[type], cost = g.placeCost(type);
      b.setAttribute('aria-pressed', self.ui.placeType === type ? 'true' : 'false');
      b.classList.toggle('poor', g.budget < cost);
      var fr = b.querySelector('.free');
      if (g.freeTowers[type] && !fr) { fr = el('span', 'free', 'FREE'); b.appendChild(fr); }
      if (!g.freeTowers[type] && fr) fr.remove();
      var costEl = b.querySelector('.cost'), ctext = cost ? '$' + cost : 'FREE';
      if (costEl.textContent !== ctext) costEl.textContent = ctext;
    });
    var showStart = g.phase === 'build';
    this.startBtn.classList.toggle('oc-hidden', !showStart);
    if (showStart) this.startBtn.textContent = '▶ Start Wave ' + (g.wave + 1);
    this.bPause.innerHTML = this.paused ? '▶' : '❚❚'; this.bPause.setAttribute('aria-pressed', this.paused ? 'true' : 'false');
    this.bSpeed.textContent = this.speed + 'x';
    this.bLens.setAttribute('aria-pressed', this.ui.lens ? 'true' : 'false');
    this.bSound.innerHTML = this.settings.muted ? '♪̸' : '♪'; this.bSound.setAttribute('aria-pressed', this.settings.muted ? 'false' : 'true');
    this.bSound.title = this.settings.muted ? 'Sound off (M)' : 'Sound on (M)';
    var tutP = this.tut && this.tutPauses();
    this.pausedEl.classList.toggle('oc-hidden', !(g.phase === 'wave' && (this.paused || tutP)));
    this.pausedEl.textContent = tutP ? 'TUTORIAL: BUILD TO CONTINUE' : 'PAUSED · you can still build';
    var sd = 'Seed ' + g.seed + ' · ' + g.diff.label + ' · ' + (g.quick ? 'Quick' : 'Full');
    if (this.seedEl.textContent !== sd) this.seedEl.textContent = sd;
    this.updateSelPanel(force);
    if (this.tut) this.checkTutorial();
  };

  U.updateSelPanel = function (force) {
    var g = this.game, tw = this.ui.selected, self = this;
    if (tw && g.towers.indexOf(tw) < 0) { tw = this.ui.selected = null; }
    if (!tw) { this.sel.classList.add('oc-hidden'); this.selKey = null; return; }
    var def = D.TOWERS[tw.type], st = tw.st, rows = [];
    var nh = Math.max(1, g.countTowers('hospital'));
    switch (tw.type) {
      case 'militia': rows = [['Damage', Math.round(st.damage * g.em.militiaDamage)], ['Range', st.range.toFixed(1) + ' tiles' + (g.weather === 'fog' ? ' (fog: less)' : '')], ['Fire rate', st.rate + '/s'], ['Stray-fire risk', st.strayMult < 1 ? 'reduced' : 'high near crowds']]; break;
      case 'lab': rows = [['Range', st.range.toFixed(1) + ' tiles'], ['Scans every', (st.scanInterval / tw.boost).toFixed(1) + 's'], ['Contact tracing', st.trace ? 'yes' : 'no (upgrade)'], ['Health-worker boost', tw.boost > 1 ? '×' + tw.boost.toFixed(1) : 'none']]; break;
      case 'clinic': rows = [['Range', st.range.toFixed(1) + ' tiles'], ['Doses/sec', (st.rate * tw.boost * tw.uptakeMult * g.uptake(g.city.district[tw.tile])).toFixed(2)], ['Vaccine uptake here', Math.round(100 * g.uptake(g.city.district[tw.tile])) + '%'], ['Buildings covered', tw.bld.length]]; break;
      case 'hospital': rows = [['Beds in use', tw.patients.length + ' / ' + (st.beds + Math.floor(g.bonusBeds / nh))], ['Range', st.range.toFixed(1) + ' tiles'], ['Admits every', st.admitInterval + 's'], ['Overflow', g.t - (tw.overflow || -99) < 3 ? 'YES: beds full' : 'no']]; break;
      case 'barricade': rows = [['Strength', Math.round(tw.hp) + ' / ' + st.hp], ['Slows zombies to', Math.round(st.slow * 100) + '%'], ['Residents', 'can’t travel through']]; break;
      case 'radio': rows = [['Range', st.range + ' tiles'], ['Compliance', '+' + Math.round(st.complianceBonus * 100) + '%'], ['Vaccine uptake', '×' + st.uptakeMult]]; break;
      case 'chw': rows = [['Range', st.range + ' tiles'], ['Boost to nearby health towers', '×' + st.boost + ' (×' + st.boostUnderserved + ' underserved)'], ['Status', tw.moving ? 'on the move' : 'working here']]; break;
      case 'pantry': rows = [['Range', st.range + ' tiles'], ['Compliance', '+' + Math.round(st.complianceBonus * 100) + '%'], ['Trips cut', Math.round(st.tripCut * 100) + '%']]; break;
    }
    var upCost = g.upgradeCost(tw), upLabel = upCost !== null ? def.upgrades[tw.level - 1].label : null;
    var key = tw.id + '|' + tw.level + '|' + JSON.stringify(rows) + '|' + (g.budget >= (upCost || 0)) + '|' + this.ui.moveTeam;
    if (!force && key === this.selKey) return;
    this.selKey = key;
    var html = '<h3><span class="oc-info-glyph" style="width:22px;height:22px;background:' + def.color + '"></span>' + esc(def.name) + ' <span class="lv">' + '★'.repeat(tw.level) + '</span></h3>' +
      '<p>' + esc(def.concept) + '</p><div class="stats">' + rows.map(function (r) { return '<span>' + esc(r[0]) + '</span><span>' + esc(String(r[1])) + '</span>'; }).join('') + '</div>' +
      (tw.type === 'chw' ? '<p style="color:#F0E442">Tap any road to send this team there.</p>' : '') +
      '<div class="row">' + (upCost !== null ? '<button class="oc-btn primary" data-a="up" type="button"' + (g.budget < upCost ? ' disabled' : '') + '>⬆ ' + esc(upLabel) + ' $' + upCost + '</button>' : '<button class="oc-btn" disabled type="button">Max level</button>') +
      '<button class="oc-btn warn" data-a="sell" type="button">Sell $' + Math.floor(tw.spent * D.CONFIG.sellRefund) + '</button>' +
      '<button class="oc-btn" data-a="info" type="button">ⓘ Learn</button><button class="oc-btn" data-a="close" type="button" aria-label="Close">✕</button></div>';
    this.sel.innerHTML = html;
    this.sel.classList.remove('oc-hidden');
    this.sel.querySelectorAll('button[data-a]').forEach(function (b) {
      b.addEventListener('click', function () {
        var a = b.getAttribute('data-a');
        if (a === 'up') self.doUpgrade(tw); else if (a === 'sell') self.doSell(tw); else if (a === 'info') self.showHelp('towers', tw.type);
        else { self.ui.selected = null; self.updateSelPanel(true); }
      });
    });
  };

  /* ================= epidemic curve ================= */
  U.drawEpiChart = function (cv, big, annos) {
    var g = this.game; if (!g || !cv) return;
    var ctx = cv.getContext('2d'), w = cv.width, h = cv.height, hist = g.history;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, w, h);
    var padL = big ? 46 : 26, padR = 10, padT = big ? 22 : 10, padB = big ? 26 : 16;
    var tMax = Math.max(60, hist.length ? hist[hist.length - 1].t : 60);
    var yMax = 10;
    var nh = g.countTowers('hospital'), beds = 0;
    g.towers.forEach(function (tw) { if (tw.type === 'hospital') beds += tw.st.beds + Math.floor(g.bonusBeds / Math.max(1, nh)); });
    hist.forEach(function (p) { yMax = Math.max(yMax, p.z, big ? p.e : p.ek); });
    yMax = Math.max(yMax, beds * 1.1) * 1.1;
    var X = function (t) { return padL + (w - padL - padR) * t / tMax; }, Y = function (v) { return h - padB - (h - padT - padB) * v / yMax; };
    ctx.font = (big ? 13 : 17) + 'px Oswald, system-ui, sans-serif'; ctx.fillStyle = '#6f8494';
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1;
    // wave bands
    var lastW = -1;
    hist.forEach(function (p) { if (p.w !== lastW) { lastW = p.w; ctx.beginPath(); ctx.moveTo(X(p.t), padT); ctx.lineTo(X(p.t), h - padB); ctx.stroke(); if (big && p.w > 0) ctx.fillText('W' + p.w, X(p.t) + 2, padT - 6); } });
    ctx.fillText(Math.round(yMax), 2, padT + 8); ctx.fillText('0', 2, h - padB);
    if (big) { ctx.fillText('time →', w - 60, h - 6); }
    var line = function (key, color, dash, width) {
      ctx.strokeStyle = color; ctx.lineWidth = width || (big ? 2.4 : 3); ctx.setLineDash(dash || []);
      ctx.beginPath();
      hist.forEach(function (p, i) { var x = X(p.t), y = Y(p[key]); if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
      ctx.stroke(); ctx.setLineDash([]);
    };
    if (beds) { ctx.strokeStyle = '#F2A6D6'; ctx.setLineDash([3, 5]); ctx.lineWidth = big ? 1.6 : 2.4; ctx.beginPath(); ctx.moveTo(padL, Y(beds)); ctx.lineTo(w - padR, Y(beds)); ctx.stroke(); ctx.setLineDash([]); if (big) { ctx.fillStyle = '#F2A6D6'; ctx.fillText('hospital beds', w - 100, Y(beds) - 4); } }
    if (big) line('e', 'rgba(230,159,0,0.6)', [2, 3], 1.6);
    line('ek', '#E69F00', [8, 5]);
    line('z', '#D55E00');
    if (big && annos) {
      ctx.font = '700 11px Oswald, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      annos.forEach(function (a, i) {
        var x = X(a.t);
        ctx.strokeStyle = 'rgba(240,228,66,0.35)'; ctx.beginPath(); ctx.moveTo(x, padT); ctx.lineTo(x, h - padB); ctx.stroke();
        var y = padT + 10 + (i % 4) * 16;
        ctx.fillStyle = a.kind === 'decision' ? '#56B4E9' : a.kind === 'consequence' ? '#F0E442' : a.kind === 'build' ? '#009E73' : '#CC79A7';
        ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.fill();
        ctx.fillStyle = '#0b1520'; ctx.fillText(String(i + 1), x, y + 0.5);
      });
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
  };

  /* ================= ticker / toasts / banner ================= */
  U.fillNews = function (key, vars) {
    var list = D.TICKER[key] || D.TICKER.filler, s = list[Math.floor(Math.random() * list.length)];
    return s.replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] !== undefined ? vars[k] : m; });
  };
  U.pushNews = function (s) { if (this.tickerQueue.length > 5) this.tickerQueue.shift(); this.tickerQueue.push(s); };
  U.updateTicker = function (dt) {
    if (!this.tickerTrack || this.hud.classList.contains('oc-hidden')) return;
    var reduced = this.settings.reducedMotion;
    var cw = this.tickerEl.offsetWidth;
    if (!this.tickerCur || (reduced ? this.tickerHold <= 0 : this.tickerX < -this.tickerW)) {
      var next = this.tickerQueue.shift() || D.TICKER.filler[Math.floor(Math.random() * D.TICKER.filler.length)];
      this.tickerCur = next;
      this.tickerTrack.textContent = '◆ ' + next;
      this.tickerW = this.tickerTrack.offsetWidth + 40;
      this.tickerX = reduced ? 0 : cw;
      this.tickerHold = 7;
    }
    if (reduced) { this.tickerHold -= dt; this.tickerTrack.style.transform = 'none'; }
    else { this.tickerX -= dt * 80; this.tickerTrack.style.transform = 'translateX(' + Math.round(this.tickerX) + 'px)'; }
  };
  U.toast = function (msg, kind, ms) {
    var t = el('div', 'oc-toast ' + (kind || ''), esc(msg));
    this.toastsEl.appendChild(t);
    while (this.toastsEl.children.length > 3) this.toastsEl.removeChild(this.toastsEl.firstChild);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, ms || 4500);
  };
  U.banner = function (title, sub) {
    var b = this.bannerEl, self = this;
    b.innerHTML = '<div>' + esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</div>';
    b.classList.remove('oc-hidden');
    clearTimeout(this.bannerT);
    this.bannerT = setTimeout(function () { b.classList.add('oc-hidden'); }, 2000);
  };

  /* ================= modal screens ================= */
  U.showScreen = function (node, opts) {
    opts = opts || {};
    this.screen.innerHTML = '';
    this.screen.appendChild(node);
    this.screen.classList.remove('oc-hidden');
    this.screen.classList.toggle('clear', !!opts.clear);
    this.modalOpen = true; this.modalKey = opts.onKey || null;
    this.hideTip();
    var f = node.querySelector('[autofocus]') || node.querySelector('button, input');
    if (f) setTimeout(function () { try { f.focus({ preventScroll: true }); } catch (e) { } }, 30);
  };
  U.hideScreen = function () { this.screen.classList.add('oc-hidden'); this.screen.innerHTML = ''; this.modalOpen = false; this.modalKey = null; this.endArt = null; this.endArtCanvas = null; };
  U.showLoading = function (msg) { this.showScreen(el('div', 'oc-card', '<h2>' + esc(msg) + '</h2><p class="muted">Replaying your saved decisions...</p>')); };

  U.showTitle = function () {
    var self = this, st = this.store, sv = st.save;
    var tag = D.TITLE_TAGLINES[Math.floor(Math.random() * D.TITLE_TAGLINES.length)];
    var diff = this.opts.difficulty && D.DIFFICULTY[this.opts.difficulty] ? this.opts.difficulty : 'normal';
    var quick = !!this.opts.quick;
    var seed = this.seedFromUrl || C.randomSeed();
    var card = el('div', 'oc-card oc-title');
    card.innerHTML =
      '<div class="oc-logo">' + esc(D.GAME_TITLE) + '</div><div class="oc-tag">' + esc(tag) + '</div>' +
      '<p class="muted oc-small">Defend ' + esc(D.CITY_NAME) + ' from a zombie outbreak with real public health tools. Different strategies lead to very different cities.</p>' +
      '<label class="oc-field"><span>Your name (optional)</span><input type="text" maxlength="24" data-f="name" placeholder="First name and last initial" value="' + esc(st.lastName || '') + '"></label>' +
      '<div class="oc-field"><span>Difficulty</span><div class="oc-seg" data-f="diff">' + ['easy', 'normal', 'hard'].map(function (k) { return '<button type="button" data-v="' + k + '" aria-pressed="' + (k === diff) + '">' + D.DIFFICULTY[k].label + '</button>'; }).join('') + '</div></div>' +
      '<div class="oc-field"><span>Length</span><div class="oc-seg" data-f="len"><button type="button" data-v="full" aria-pressed="' + !quick + '">Full: 9 waves (~30 min)</button><button type="button" data-v="quick" aria-pressed="' + quick + '">Quick: 6 waves (~15 min)</button></div></div>' +
      '<label class="oc-field"><span>Outbreak seed ' + (this.seedFromUrl ? '(set by your class link)' : '') + '</span><div class="oc-row"><input type="text" data-f="seed" maxlength="20" value="' + esc(seed) + '" style="flex:1;text-transform:uppercase"><button type="button" class="oc-btn" data-a="rand" title="Random seed">↻ Random</button><button type="button" class="oc-btn" data-a="daily">Daily outbreak</button></div></label>' +
      '<p class="oc-small muted" style="margin-top:-4px">Same seed = same city, same outbreak, same briefing cards. Great for comparing strategies in class.</p>' +
      '<label class="oc-check"><input type="checkbox" data-f="tut"' + (st.tutorialDone ? '' : ' checked') + '> Play the tutorial (first wave with tips)</label>' +
      '<div class="oc-row" style="justify-content:center;margin-top:10px"><button type="button" class="oc-btn primary oc-big" data-a="start" autofocus>▶ Start the outbreak</button>' +
      (sv ? '<button type="button" class="oc-btn oc-big" data-a="resume">Continue (wave ' + Math.max(1, sv.wave) + ', seed ' + esc(sv.opts.seed) + ')</button>' : '') + '</div>' +
      '<div class="oc-row" style="justify-content:center;margin-top:8px"><button type="button" class="oc-link" data-a="help">How to play</button> · <button type="button" class="oc-link" data-a="settings">Settings</button></div>' +
      '<details class="oc-details"><summary>Teacher tools</summary>' +
      '<p class="oc-small">Class link (everyone gets the same outbreak):</p><div class="oc-row"><input type="text" readonly data-f="link" style="flex:1"><button type="button" class="oc-btn" data-a="copylink">Copy</button></div>' +
      '<p class="oc-small" style="margin-top:8px">Check a student’s completion code:</p><div class="oc-row"><input type="text" data-f="code" placeholder="OC1-..." style="flex:1"><button type="button" class="oc-btn" data-a="decode">Decode</button></div><div data-f="decoded" class="oc-small"></div>' +
      '<p class="oc-small muted">Teacher logging to Google Sheets is ' + (this.webhook ? '<b>ON</b>' : 'off') + ' (see README).</p></details>';
    var q = function (s) { return card.querySelector(s); };
    var state = { diff: diff, len: quick ? 'quick' : 'full' };
    card.querySelectorAll('.oc-seg').forEach(function (seg) {
      seg.addEventListener('click', function (e) {
        var b = e.target.closest('button'); if (!b) return;
        seg.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        state[seg.getAttribute('data-f')] = b.getAttribute('data-v'); updLink();
      });
    });
    var updLink = function () {
      var base = (root.location && root.location.href ? root.location.href.split('?')[0].split('#')[0] : '');
      q('[data-f=link]').value = base + '?seed=' + encodeURIComponent(C.cleanSeed(q('[data-f=seed]').value)) + '&diff=' + state.diff + (state.len === 'quick' ? '&mode=quick' : '');
    };
    updLink();
    q('[data-f=seed]').addEventListener('input', updLink);
    card.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      self.sfx.unlock(); self.sfx.play('click');
      if (a === 'rand') { q('[data-f=seed]').value = C.randomSeed(); updLink(); self.startAttract(q('[data-f=seed]').value); }
      if (a === 'daily') { q('[data-f=seed]').value = C.dailySeed(); updLink(); self.startAttract(q('[data-f=seed]').value); }
      if (a === 'copylink') self.copyText(q('[data-f=link]').value, 'Class link copied.');
      if (a === 'decode') { var dcd = self.decodeCode(q('[data-f=code]').value); q('[data-f=decoded]').innerHTML = dcd; }
      if (a === 'help') self.showHelp(null, null, function () { self.showTitle(); });
      if (a === 'settings') self.showSettings(function () { self.showTitle(); });
      if (a === 'resume') self.resume();
      if (a === 'start') {
        var name = q('[data-f=name]').value.trim().slice(0, 24);
        self.store.lastName = name; saveStore(self.store);
        self.newGame({ seed: C.cleanSeed(q('[data-f=seed]').value), difficulty: state.diff, quick: state.len === 'quick', tutorial: q('[data-f=tut]').checked, name: name });
      }
    });
    this.hud.classList.add('oc-hidden');
    this.showScreen(card, { clear: true, onKey: function (e) { if (e.key === 'Enter' && e.target.tagName !== 'INPUT') q('[data-a=start]').click(); } });
  };
  function saveStore(o) { try { root.localStorage.setItem('outbreakCity.v1', JSON.stringify(o)); } catch (e) { } }

  U.copyText = function (text, okMsg) {
    var self = this;
    var fallback = function () {
      var ta = el('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'; self.root.appendChild(ta); ta.select();
      try { root.document.execCommand('copy'); self.toast(okMsg || 'Copied.', 'good'); } catch (e) { self.toast('Could not copy. Select the text and copy it yourself.', 'bad'); }
      ta.remove();
    };
    try { if (root.navigator.clipboard && root.isSecureContext) root.navigator.clipboard.writeText(text).then(function () { self.toast(okMsg || 'Copied.', 'good'); }, fallback); else fallback(); } catch (e) { fallback(); }
  };

  U.showSettings = function (back) {
    var self = this, s = this.settings;
    var card = el('div', 'oc-card');
    var chk = function (k, label, desc) { return '<label class="oc-check"><input type="checkbox" data-k="' + k + '"' + (s[k] ? ' checked' : '') + '> <span><b>' + label + '</b><br><span class="oc-small muted">' + desc + '</span></span></label>'; };
    card.innerHTML = '<h2>Settings</h2>' +
      '<div class="oc-field"><span>Text size</span><div class="oc-seg" data-f="text">' + [['normal', 'Normal'], ['large', 'Large'], ['xlarge', 'Extra large']].map(function (o) { return '<button type="button" data-v="' + o[0] + '" aria-pressed="' + (s.text === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div></div>' +
      chk('reducedMotion', 'Reduced motion', 'No screen shake, fewer particles, a still news ticker.') +
      chk('lowFx', 'Low effects', 'Fewer particles, no weather or water animation, lower-resolution map. Turns on automatically on slow devices.') +
      chk('badges', 'Population badges', 'Show resident counts above buildings when zoomed in.') +
      chk('edgePan', 'Edge scrolling', 'Move the map when the mouse touches the screen edge.') +
      chk('muted', 'Mute sound', 'All sound is generated in your browser.') +
      '<div class="oc-row" style="margin-top:12px"><button type="button" class="oc-btn primary" data-a="done" autofocus>Done</button><button type="button" class="oc-btn" data-a="tut">Show the tutorial next game</button><button type="button" class="oc-btn warn" data-a="erase">Erase saved data on this device</button></div>';
    card.querySelector('[data-f=text]').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      card.querySelectorAll('[data-f=text] button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      s.text = b.getAttribute('data-v'); self.applySettings(); self.saveSettings();
    });
    card.querySelectorAll('input[data-k]').forEach(function (inp) {
      inp.addEventListener('change', function () {
        var k = inp.getAttribute('data-k');
        if (k === 'lowFx') self.setLowFx(inp.checked); else s[k] = inp.checked;
        self.applySettings(); self.saveSettings(); self.resize();
      });
    });
    var close = function () { if (back) back(); else self.hideScreen(); self.updateHud(true); };
    card.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'done') close();
      if (a === 'tut') { self.store.tutorialDone = false; saveStore(self.store); self.toast('The tutorial will be offered next game.', 'good'); }
      if (a === 'erase') { if (b.getAttribute('data-sure')) { self.store = {}; saveStore({}); self.toast('Saved data erased.', 'good'); } else { b.setAttribute('data-sure', '1'); b.textContent = 'Tap again to confirm'; } }
    });
    this.showScreen(card, { onKey: function (e) { if (e.key === 'Escape') close(); } });
  };

  U.showHelp = function (tab, focusTower, back) {
    var self = this;
    tab = tab || 'play';
    var card = el('div', 'oc-card'); card.style.width = 'min(760px, 100%)';
    var tabs = [['play', 'How to play'], ['towers', 'Interventions'], ['meters', 'Meters'], ['concepts', 'Real-world concepts']];
    var body = '';
    if (tab === 'play') {
      body = '<p><b>Goal:</b> get ' + esc(D.CITY_NAME) + ' through every wave with as many residents, as much trust and as much fairness as possible. How you win matters: your ending depends on survival, trust, equity and your choices.</p>' +
        '<p><b>The catch:</b> bitten people look healthy while they incubate (the orange ◆ only appears once a Testing Lab finds them). Shooting visible zombies never finds them.</p>' +
        '<h3>Controls</h3><ul class="oc-small"><li>Drag (or WASD / arrow keys) to move the map. Scroll, pinch or +/− to zoom. C to recenter.</li><li>1–8 or the build bar to pick an intervention, then click a spot. Shift-click to place several. Esc or right-click cancels.</li><li>Click a tower to upgrade (U), sell (X) or learn about it. Health Worker vans move when you tap a road.</li><li>Space pauses (you can still build). F changes speed (1x/2x/3x). L opens the Data Lens. Enter starts the next wave.</li></ul>' +
        '<h3>Map legend</h3><ul class="oc-small"><li><b style="color:#E69F00">◆ orange diamond</b>: a known Exposed person or building (found by testing).</li><li><b style="color:#CC79A7">? pink circle</b>: an unmasked Carrier (looked like a citizen).</li><li>Zombies reach forward with both arms. Sprinters lean and leave speed lines. Brutes are big and armored. <b style="color:#B7E34A">Super-Spreaders</b> (from wave 5) are giants with a green toxic ring: they infect several people per attack, smash barricades and can’t be captured by hospitals.</li><li>Buildings change for good once residents are infected: a red quarantine X, then smashed windows and vines, then a smoking ruin.</li><li><b style="color:#FFB27A">▼ INCOMING</b>: glowing cracks where the next wave will claw up out of the ground. Once open, these hell holes keep producing zombies.</li><li><b style="color:#56B4E9">City Hall</b> (center) is your command bunker. Zombies march on it. If its integrity hits 0, the game ends.</li><li>Building badges show residents; orange badges show infections that testing has found.</li></ul>';
    } else if (tab === 'towers') {
      body = D.TOWER_ORDER.map(function (k) {
        var t = D.TOWERS[k];
        return '<div class="oc-concept" style="margin-bottom:8px' + (k === focusTower ? ';outline:2px solid #F0E442' : '') + '"><b>' + t.key + '. ' + esc(t.name) + ' · $' + t.cost + '</b><br>' + esc(t.short) + '<span class="you">' + esc(t.concept) + '</span><span class="real">Real world: ' + esc(D.TOWER_REAL[k]) + '</span><span class="oc-small muted">Upgrades: ' + t.upgrades.map(function (u) { return esc(u.label) + ' ($' + u.cost + ')'; }).join(', ') + '</span></div>';
      }).join('');
    } else if (tab === 'meters') {
      body = Object.keys(D.METERS).map(function (k) { return '<div class="oc-concept" style="margin-bottom:8px"><b>' + esc(D.METERS[k].name) + '</b><br>' + esc(D.METERS[k].text) + '</div>'; }).join('');
    } else {
      body = '<div class="oc-concepts">' + Object.keys(D.CONCEPTS).map(function (k) { var c = D.CONCEPTS[k]; return '<div class="oc-concept"><b>' + esc(c.name) + '</b><br>' + esc(c.text) + '<span class="real">' + esc(c.real) + '</span></div>'; }).join('') + '</div>';
    }
    card.innerHTML = '<div class="oc-row" style="justify-content:space-between"><h2 style="margin:0">Guide</h2><button type="button" class="oc-btn" data-a="close" autofocus>Close ✕</button></div>' +
      '<div class="oc-seg" style="margin:8px 0">' + tabs.map(function (t) { return '<button type="button" data-tab="' + t[0] + '" aria-pressed="' + (t[0] === tab) + '">' + t[1] + '</button>'; }).join('') + '</div>' + body;
    var close = function () { if (back) back(); else self.hideScreen(); };
    card.addEventListener('click', function (e) {
      var t = e.target.closest('[data-tab]'); if (t) { self.showHelp(t.getAttribute('data-tab'), null, back); return; }
      if (e.target.closest('[data-a=close]')) close();
    });
    this.showScreen(card, { onKey: function (e) { if (e.key === 'Escape') close(); } });
    if (focusTower) setTimeout(function () { var f = card.querySelector('[style*="outline"]'); if (f) f.scrollIntoView({ block: 'center' }); }, 50);
  };

  /* ================= Mayor's Briefing ================= */
  U.drawSpeaker = function (cv, key) {
    var sp = D.SPEAKERS[key] || D.SPEAKERS.mayor, ctx = cv.getContext('2d'), w = cv.width;
    ctx.clearRect(0, 0, w, w);
    var s = w / 72;
    ctx.save(); ctx.scale(s, s);
    ctx.fillStyle = '#2B4458'; ctx.beginPath(); ctx.arc(36, 36, 36, 0, 7); ctx.fill();
    ctx.fillStyle = sp.color; ctx.beginPath(); ctx.ellipse(36, 74, 26, 22, 0, 0, 7); ctx.fill();
    var skin = { mayor: '#E8B98F', brick: '#C98E6A', okafor: '#7A4E33', skip: '#F1C9A5', gold: '#F1D2B5', cora: '#A86F4C', lin: '#E8C29A' }[key] || '#E8B98F';
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(36, 32, 15, 0, 7); ctx.fill();
    ctx.fillStyle = '#1A1A1A'; ctx.beginPath(); ctx.arc(31, 31, 1.8, 0, 7); ctx.arc(41, 31, 1.8, 0, 7); ctx.fill();
    ctx.strokeStyle = '#5A3A2A'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(36, 37, 5, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.fillStyle = '#3A2A20';
    if (sp.hat === 'bun') { ctx.beginPath(); ctx.arc(36, 20, 13, Math.PI, 0); ctx.fill(); ctx.beginPath(); ctx.arc(36, 13, 6, 0, 7); ctx.fill(); }
    else if (sp.hat === 'beret') { ctx.fillStyle = '#3D4A2E'; ctx.beginPath(); ctx.ellipse(33, 19, 16, 6, -0.2, 0, 7); ctx.fill(); }
    else if (sp.hat === 'cap') { ctx.fillStyle = '#0072B2'; ctx.beginPath(); ctx.arc(36, 22, 14, Math.PI, 0); ctx.fill(); ctx.fillRect(36, 19, 18, 4); }
    else if (sp.hat === 'top') { ctx.fillStyle = '#1A1A1A'; ctx.fillRect(24, 4, 24, 14); ctx.fillRect(18, 17, 36, 4); }
    else { ctx.beginPath(); ctx.arc(36, 25, 15, Math.PI * 1.05, Math.PI * 1.95); ctx.fill(); }
    if (key === 'okafor') { ctx.fillStyle = '#FFF'; ctx.fillRect(22, 52, 28, 20); ctx.fillStyle = '#009E73'; ctx.fillRect(34, 56, 4, 10); ctx.fillRect(31, 59, 10, 4); }
    if (key === 'lin') { ctx.strokeStyle = '#333'; ctx.lineWidth = 1.2; ctx.strokeRect(26, 28, 8, 6); ctx.strokeRect(38, 28, 8, 6); }
    ctx.restore();
  };

  U.fxChips = function (fx) {
    var out = [], g = this.game;
    if (!fx) return out;
    var pct = function (v) { return Math.round(Math.abs(v - 1) * 100) + '%'; };
    var add = function (text, good) { out.push({ t: text, c: good === null ? '' : good ? 'up' : 'down' }); };
    if (fx.budget) add((fx.budget > 0 ? '+$' : '−$') + Math.abs(fx.budget), fx.budget > 0);
    if (fx.vaccines) add((fx.vaccines > 0 ? '+' : '−') + Math.abs(fx.vaccines) + ' doses', fx.vaccines > 0);
    if (fx.trust) add('Trust ' + (fx.trust > 0 ? '+' : '−') + Math.abs(fx.trust), fx.trust > 0);
    if (fx.panic) add('Panic ' + (fx.panic > 0 ? '+' : '−') + Math.abs(fx.panic), fx.panic < 0);
    if (fx.beds) add('+' + fx.beds + ' beds', true);
    var modChips = function (m, suffix) {
      var names = { transmission: ['Spread', -1], mobility: ['Travel', 0], income: ['Income', 1], uptake: ['Vaccine uptake', 1], reveal: ['Detection', 1], selfReport: ['Self-reporting', 1],
        spawn: ['Arriving zombies', -1], imports: ['Hidden arrivals', -1], hospitalSpeed: ['Treatment speed', 1], militiaDamage: ['Militia damage', 0], militiaStray: ['Stray fire', -1],
        capture: ['Hospitals catch early cases', 1], militiaTrust: ['Militia trust cost', -1] };
      for (var k in m) {
        var v = m[k];
        if (k === 'compliance') { add('Compliance ' + (v > 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + '%' + suffix, v > 0); continue; }
        if (k === 'vaxEff') { add('Vaccine efficacy ' + (v > 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + '%' + suffix, v > 0); continue; }
        if (k === 'cureEff') { add('Cure efficacy +' + Math.round(v * 100) + '%' + suffix, true); continue; }
        var n = names[k]; if (!n) continue;
        var upDir = v > 1;
        add(n[0] + (upDir ? ' ↑' : ' ↓') + pct(v) + suffix, n[1] === 0 ? (k === 'mobility' ? !upDir : null) : (upDir ? n[1] > 0 : n[1] < 0));
      }
    };
    if (fx.mods) modChips(fx.mods, '');
    if (fx.temp) modChips(fx.temp.mods, ' (' + fx.temp.waves + ' waves)');
    if (fx.access) for (var k in fx.access) { var dd = D.DISTRICTS.filter(function (x) { return x.id === k; })[0]; if (dd) add(dd.short + ' access ' + (fx.access[k] > 0 ? '↑' : '↓'), fx.access[k] > 0); }
    if (fx.inc && fx.inc.auth) add('Coercion ↑', false);
    if (fx.inc && fx.inc.spin) add('Spin', false);
    if (fx.freeTower) add('Free ' + D.TOWERS[fx.freeTower].name, true);
    if (fx.flags) { if (fx.flags.wastewater) add('Citywide monitoring', true); if (fx.flags.honest) add('Honest data', true); if (fx.flags.bounty) add('Bounties', null); }
    if (fx.custom === 'detain') add('Forced detention', false);
    return out;
  };

  U.showBriefing = function () {
    var g = this.game, self = this, br = g.briefing;
    if (!br) return;
    var card = br.card, sp = D.SPEAKERS[card.speaker] || D.SPEAKERS.mayor, ws = g.waveSummary || {};
    this.sfx.play('briefing');
    var text = card.text.replace('{true}', g.totals.knownE + g.totals.zombies).replace('{city}', D.CITY_NAME);
    var node = el('div', 'oc-card oc-brief');
    node.setAttribute('role', 'dialog'); node.setAttribute('aria-label', 'Mayor’s Briefing: ' + card.title);
    node.innerHTML = '<div class="oc-summary"><span>✔ Wave ' + ws.wave + ' complete</span><span>+$' + ws.grant + ' emergency funds</span><span>+' + ws.doses + ' vaccine doses</span><span>' + ws.infections + ' new infections</span><span>' + ws.deaths + ' residents lost</span></div>' +
      '<div class="head"><canvas width="144" height="144" aria-hidden="true"></canvas><div><div class="kicker">Mayor’s Briefing</div><h2>' + esc(card.title) + '</h2><div class="who">' + esc(sp.name) + ', ' + esc(sp.role) + '</div></div></div>' +
      '<div class="quote">' + esc(text) + '</div><div class="oc-opts"></div>';
    this.drawSpeaker(node.querySelector('canvas'), card.speaker);
    var opts = node.querySelector('.oc-opts');
    card.options.forEach(function (o, i) {
      var fx = typeof o.fx === 'function' ? o.fx(g) : o.fx;
      var chips = self.fxChips(fx);
      var b = el('button', 'oc-opt'); b.type = 'button';
      b.innerHTML = '<b>' + (i + 1) + '. ' + esc(o.label) + '</b><span class="hint">' + esc(o.hint || '') + '</span>' +
        (chips.length ? '<div class="oc-chips">' + chips.map(function (c) { return '<span class="oc-chip ' + c.c + '">' + esc(c.t) + '</span>'; }).join('') + '</div>' : '') +
        (o.later ? '<div class="oc-later">⏳ This choice may have consequences in a later wave.</div>' : '');
      b.addEventListener('click', function () { self.chooseOption(i); });
      opts.appendChild(b);
    });
    this.showScreen(node, { onKey: function (e) { var n = +e.key; if (n >= 1 && n <= card.options.length) self.chooseOption(n - 1); } });
  };

  U.chooseOption = function (i) {
    var g = this.game, self = this, card = g.briefing && g.briefing.card;
    if (!card) return;
    var r = this.doChoose(i);
    if (!r.ok) return;
    this.sfx.play('click');
    var res = g.lastResult, chips = this.fxChips(res.fx);
    var node = el('div', 'oc-card oc-brief');
    node.innerHTML = '<div class="kicker">Decision: ' + esc(card.title) + '</div><h2>' + esc(card.options[i].label) + '</h2><div class="quote">' + esc(res.text) + '</div>' +
      (chips.length ? '<div class="oc-chips" style="margin-top:8px">' + chips.map(function (c) { return '<span class="oc-chip ' + c.c + '">' + esc(c.t) + '</span>'; }).join('') + '</div>' : '') +
      (card.options[i].later ? '<p class="oc-later">⏳ Something about this decision will come back in a later wave.</p>' : '') +
      '<div class="oc-row" style="margin-top:12px;justify-content:flex-end"><button type="button" class="oc-btn primary oc-big" autofocus>Plan wave ' + (g.wave + 1) + ' ▸</button></div>';
    node.querySelector('button').addEventListener('click', function () { self.hideScreen(); self.updateHud(true); });
    this.pushNews(card.title.toUpperCase() + ': ' + card.options[i].label.toUpperCase());
    this.showScreen(node, { onKey: function (e) { if (e.key === 'Enter' || e.key === 'Escape') { self.hideScreen(); self.updateHud(true); } } });
  };

  /* ================= endings & report ================= */
  U.showEnd = function () {
    var g = this.game, self = this, end = D.ENDINGS[g.ending], r = g.report();
    this.store.endings = this.store.endings || {};
    var firstTime = !this.store.endings[g.ending];
    this.store.endings[g.ending] = true; saveStore(this.store);
    var node = el('div', 'oc-paper');
    var now = new Date();
    node.innerHTML = '<div class="mast">' + esc(D.NEWSPAPER.toUpperCase()) + '</div><div class="date">' + now.toDateString() + ' · Seed ' + esc(g.seed) + ' · ' + esc(g.diff.label) + (r.name ? ' · Acting Health Commissioner ' + esc(r.name) : '') + '</div>' +
      '<canvas width="760" height="380" aria-hidden="true"></canvas>' +
      '<span class="endtag">' + esc(end.title.toUpperCase()) + (end.secret && firstTime ? ' · SECRET UNLOCKED!' : '') + '</span>' +
      '<h1>' + esc(end.headline) + '</h1><p class="sub">' + esc(end.sub) + '</p><p>' + esc(end.body) + '</p>' +
      '<div class="oc-stats">' +
      stat(Math.round(r.survival * 100) + '%', 'residents survived') + stat(r.deaths, 'residents lost') + stat(r.peakR || '-', 'peak R_eff') +
      stat(r.trust, 'final trust') + stat(r.equity, 'equity index') + stat(r.strayDeaths, 'hit by stray fire') + '</div>' +
      '<div class="oc-row" style="justify-content:center"><button type="button" class="oc-btn primary oc-big" autofocus data-a="results">My Results page (screenshot this) ▸</button><button type="button" class="oc-btn oc-big" data-a="report">After-Action Report</button><button type="button" class="oc-btn oc-big" data-a="again">Play again</button></div>';
    this.endArt = end.art; this.endArtT = 0; this.endArtCanvas = node.querySelector('canvas');
    node.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var act = b.getAttribute('data-a');
      if (act === 'report') self.showReport();
      else if (act === 'results') self.showResults();
      else { self.startAttract(C.randomSeed()); self.showTitle(); }
    });
    this.showScreen(node);
    this.endArt = end.art; this.endArtT = 0; this.endArtCanvas = node.querySelector('canvas');
    // Teacher logging (optional)
    this.submitResults(this.telemetryPayload());
  };
  function stat(v, label) { return '<div class="oc-stat"><b>' + esc(String(v)) + '</b><span>' + esc(label) + '</span></div>'; }


  /* ================= Results page (one screen, made for a screenshot) ================= */
  U.showResults = function () {
    var g = this.game, self = this, end = D.ENDINGS[g.ending], r = g.report();
    var good = ['eradication', 'endemic', 'modelCity'].indexOf(g.ending) >= 0;
    var now = new Date();
    var when = now.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) + ' · ' + now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    var node = el('div', 'oc-card oc-results');
    var render = function () {
      var code = self.completionCode();
      var nm = g.opts.name || '';
      node.innerHTML =
        '<div class="oc-res-head"><div><div class="oc-res-game">' + esc(D.GAME_TITLE) + ' · RESULTS</div>' +
        '<div class="oc-res-name">' + (nm ? esc(nm) : '<span style="color:#ff8a5c">Type your name below ↓</span>') + '</div>' +
        '<div class="oc-small muted">' + esc(when) + ' · Seed ' + esc(g.seed) + ' · ' + esc(g.diff.label) + ' · ' + (g.quick ? 'Quick (6 waves)' : 'Full (9 waves)') + '</div></div>' +
        '<div class="oc-stamp' + (good ? '' : ' warn') + '">✔ COMPLETE</div></div>' +
        '<div class="oc-res-end"><span class="oc-res-tag">' + esc(end.title.toUpperCase()) + '</span><b>' + esc(end.headline) + '</b></div>' +
        '<div class="oc-stats">' + stat(Math.round(r.survival * 100) + '%', 'residents survived') + stat(r.deaths, 'residents lost') + stat(r.peakR || '-', 'peak R_eff') +
        stat(r.trust, 'final trust') + stat(r.equity, 'equity index') + stat(r.detectionPct + '%', 'infections detected') + stat(r.vaxPct + '%', 'vaccinated') +
        stat(r.cured, 'cured') + stat(r.strayDeaths, 'stray-fire deaths') + stat(g.decisions.length, 'briefing decisions') + stat(r.wave + ' / ' + r.totalWaves, 'waves played') +
        stat(D.TOWER_ORDER.reduce(function (n, k) { return n + r.towerCounts[k]; }, 0), 'interventions built') + stat(r.hallPct + '%', 'City Hall integrity') + stat(r.overrun, 'buildings overrun') + stat(r.megas, 'super-spreaders faced') + '</div>' +
        '<div class="oc-res-code"><span class="oc-small muted">Completion code</span><div class="oc-code">' + esc(code) + '</div></div>' +
        '<div class="oc-res-howto">📸 <b>Take a screenshot of this whole page</b> and submit it to your teacher' + (self.webhook ? ' (your results were also sent automatically)' : '') + '.<br><span class="oc-small muted">Chromebook: Ctrl + Show windows (or Ctrl + Shift + Show windows for part of the screen). Windows: Win + Shift + S. Mac: Cmd + Shift + 4. iPad: top button + volume up.</span></div>' +
        '<div class="oc-row oc-res-actions"><label class="oc-row" style="gap:6px"><span class="oc-small muted">Name:</span><input type="text" maxlength="24" data-f="rname" value="' + esc(nm) + '" placeholder="First name + last initial"></label>' +
        '<button type="button" class="oc-btn" data-a="report">After-Action Report</button><button type="button" class="oc-btn" data-a="copy">Copy results</button><button type="button" class="oc-btn" data-a="again">Play again</button></div>';
      var inp = node.querySelector('[data-f=rname]');
      inp.addEventListener('change', function () {
        g.opts.name = inp.value.trim().slice(0, 24); self.store.lastName = g.opts.name; saveStore(self.store);
        render();
      });
    };
    node.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'report') self.showReport();
      if (a === 'copy') { var rr = g.report(); self.copyText(self.resultsText(rr, self.completionCode(), self.buildReflections(rr)), 'Results copied.'); }
      if (a === 'again') { self.startAttract(C.randomSeed()); self.showTitle(); }
    });
    render();
    this.showScreen(node);
  };

  U.completionCode = function () {
    var g = this.game, r = g.report();
    var tc = D.TOWER_ORDER.map(function (k) { return Math.min(35, r.towerCounts[k]).toString(36); }).join('');
    var decs = g.decisions.map(function (d) { var ev = D.EVENTS.filter(function (e) { return e.id === d.id; })[0]; return d.id + (ev ? ev.options.map(function (o) { return o.label; }).indexOf(d.choice) : ''); }).join('.');
    var parts = ['1', (r.name || '').replace(/\|/g, ''), g.seed, g.diffKey[0], g.quick ? 'Q' : 'F', g.ending, Math.round(r.survival * 100), r.trust, r.equity, Math.round(r.peakR * 10), r.deaths, r.strayDeaths, r.vaxPct, r.detectionPct, tc, decs, r.t];
    var payload = parts.join('|');
    return 'OC1-' + C.b64e(payload) + '-' + C.checksum(payload);
  };

  U.decodeCode = function (code) {
    try {
      code = String(code).trim();
      var m = /^OC1-([A-Za-z0-9_-]+)-([A-Z0-9]{4})$/.exec(code);
      if (!m) return '<span style="color:#ffb27a">That does not look like a completion code.</span>';
      var payload = C.b64d(m[1]);
      var ok = C.checksum(payload) === m[2];
      var p = payload.split('|');
      var tc = p[14] || '', towers = D.TOWER_ORDER.map(function (k, i) { return D.TOWERS[k].name + ': ' + parseInt(tc[i] || '0', 36); }).join(', ');
      var rows = [['Valid', ok ? 'Yes (checksum matches)' : 'NO: the code was changed'], ['Name', p[1] || '(none)'], ['Seed', p[2]], ['Difficulty', { e: 'Easy', n: 'Normal', h: 'Hard' }[p[3]]], ['Length', p[4] === 'Q' ? 'Quick' : 'Full'],
        ['Ending', (D.ENDINGS[p[5]] || {}).title || p[5]], ['Survival', p[6] + '%'], ['Trust', p[7]], ['Equity', p[8]], ['Peak R_eff', (p[9] / 10).toFixed(1)], ['Deaths', p[10]], ['Stray-fire deaths', p[11]],
        ['Vaccinated', p[12] + '%'], ['Infections detected', p[13] + '%'], ['Towers', towers], ['Decisions', (p[15] || '').split('.').join(', ')], ['Sim time', p[16] + 's']];
      return '<div class="oc-stats" style="grid-template-columns:auto 1fr">' + rows.map(function (r) { return '<span class="muted">' + esc(r[0]) + '</span><span>' + esc(String(r[1])) + '</span>'; }).join('') + '</div>';
    } catch (e) { return '<span style="color:#ffb27a">Could not read that code.</span>'; }
  };

  U.telemetryPayload = function () {
    var g = this.game, r = g.report();
    return { name: r.name, seed: g.seed, difficulty: g.diffKey, mode: g.quick ? 'quick' : 'full', ending: g.ending, endingTitle: D.ENDINGS[g.ending].title,
      survivalPct: Math.round(r.survival * 100), deaths: r.deaths, trust: r.trust, equity: r.equity, panic: r.panic, peakR: r.peakR, strayDeaths: r.strayDeaths,
      vaccinatedPct: r.vaxPct, detectedPct: r.detectionPct, cured: r.cured, towers: r.towerCounts,
      decisions: g.decisions.map(function (d) { return 'W' + d.wave + ' ' + d.title + ': ' + d.choice; }), code: this.completionCode(), simSeconds: r.t, submittedAt: new Date().toISOString() };
  };

  U.updateSubmitStatus = function () {
    var s = this.screen.querySelector('[data-f=submit]');
    if (!s) return;
    s.textContent = this.submitStatus === 'waiting' ? 'Sending results to your teacher’s sheet...' : this.submitStatus === 'sent' ? 'Results sent to your teacher’s sheet. Still paste your code in case it didn’t arrive.' : this.submitStatus === 'failed' ? 'Could not reach your teacher’s sheet. Paste the completion code instead.' : '';
  };

  U.buildReflections = function (r) {
    var dist = this.districtRows(), worst = dist.slice().sort(function (a, b) { return b.rate - a.rate; })[0];
    var vars = { hallPct: r.hallPct, megaInf: r.megaInf, ruined: r.ruined, strayDeaths: r.strayDeaths, detectionPct: r.detectionPct, vaxPct: r.vaxPct, equity: r.equity, worstDistrict: worst ? worst.name : '', spin: r.spin, overflowSeconds: r.overflowSeconds, peakR: r.peakR, barricades: r.barricades, seed: r.seed };
    var qs = [];
    D.REFLECTIONS.forEach(function (q) { try { if (q.when(r) && qs.length < 6) qs.push(q.q.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] !== undefined ? vars[k] : m; })); } catch (e) { } });
    return qs;
  };

  U.districtRows = function () {
    var g = this.game;
    return D.DISTRICTS.map(function (d, k) {
      var orig = g.distOrig[k] || 1, deaths = g.stats.distDeaths[k];
      return { name: d.name, deaths: deaths, rate: deaths / orig, per100: Math.round(1000 * deaths / orig) / 10, vax: Math.round(100 * g.stats.distVax[k] / orig), access: g.access[k], baseAccess: d.baseAccess, orig: orig };
    });
  };

  U.essentialServices = function (r) {
    var g = this.game, tc = r.towerCounts, dec = {};
    g.decisions.forEach(function (d) { dec[d.id] = d.choice; });
    var chose = function (id, i) { var ev = D.EVENTS.filter(function (e) { return e.id === id; })[0]; return ev && dec[id] === ev.options[i].label; };
    var underserved = g.towers.some(function (tw) { var d = D.DISTRICTS[g.city.district[g.tileOf(tw.x, tw.y)]]; return (tw.type === 'clinic' || tw.type === 'hospital' || tw.type === 'lab' || tw.type === 'chw') && d.baseAccess < 0.25; });
    var upgraded = g.towers.some(function (tw) { return tw.type === 'hospital' && tw.level > 1; });
    return [tc.lab > 0 || !!g.flags.wastewater, r.revealed > 20, tc.radio > 0 || !!g.flags.honest || chose('rumor', 0) || chose('language', 0), tc.chw > 0 || tc.pantry > 0 || chose('volunteers', 0),
      g.decisions.length >= 3, tc.barricade > 0 || g.counters.auth > 0 || chose('masks', 0), underserved && r.equity >= 50, tc.chw > 0 || upgraded || chose('surge', 1),
      chose('research', 0) || chose('app', 1) || !!g.flags.wastewater, tc.hospital >= 2 || g.bonusBeds > 0];
  };

  U.showReport = function () {
    var g = this.game, self = this, r = g.report(), end = D.ENDINGS[g.ending];
    var dist = this.districtRows(), maxRate = Math.max.apply(null, dist.map(function (d) { return d.rate; }).concat([0.01]));
    var annos = g.annotations.filter(function (a) { return a.kind !== 'wave'; }).slice(0, 24);
    var immune = Math.round(100 * (g.totals.V + g.totals.R) / g.totalPop);
    var code = this.completionCode();
    var eps = this.essentialServices(r);
    var qs = this.buildReflections(r);
    var hiddenPct = r.infections ? Math.round(100 * (1 - r.detectionRate)) : 0;
    var concepts = [
      ['r0', 'Your R_eff peaked at about ' + (r.peakR || '-') + '. Above 1, each case made more than one new case; below 1, the outbreak shrank.'],
      ['incubation', 'Exposed residents looked healthy for about ' + D.CONFIG.incubationMean + ' seconds on average. About ' + hiddenPct + '% of the ' + r.infections + ' infections were never detected before they turned.'],
      ['prevention', 'Primary: ' + r.vaccinated + ' vaccinated. Secondary: ' + r.revealed + ' cases found early. Tertiary: ' + r.cured + ' cured in hospitals.'],
      ['herd', immune + '% of residents ended up immune (vaccinated or recovered). With this pathogen, roughly 55–60% immunity stops sustained spread.'],
      ['surveillance', 'You built ' + r.towerCounts.lab + ' Testing Lab(s)' + (g.flags.wastewater ? ' and funded wastewater monitoring' : '') + '. Detection rate: ' + r.detectionPct + '%.'],
      ['quarantine', r.contained + ' known-exposed people isolated safely (they could not infect their households). You placed ' + r.barricades + ' quarantine barricade(s).' + (r.detained ? ' ' + r.detained + ' people were forcibly detained.' : '')],
      ['sdoh', 'Eastside Flats started with ' + Math.round(D.DISTRICTS[2].baseAccess * 100) + '% health-care access vs ' + Math.round(D.DISTRICTS[0].baseAccess * 100) + '% in Gilded Heights, before you did anything.'],
      ['equity', 'Final equity index: ' + r.equity + '. Highest death rate: ' + dist.slice().sort(function (a, b) { return b.rate - a.rate; })[0].name + '.'],
      ['riskcomm', (g.flags.honest ? 'You published honest numbers. ' : '') + (r.spin ? 'You spun the facts ' + r.spin + ' time(s). ' : '') + 'You built ' + r.towerCounts.radio + ' Radio Tower(s). Final trust: ' + r.trust + '.'],
      ['superspread', r.megas + ' Super-Spreader zombies reached the city and caused ' + r.megaInf + ' infections. ' + r.overrun + ' buildings were overrun (' + r.ruined + ' left in ruins).'],
      ['ethics', r.strayDeaths + ' bystanders were hit by militia fire. Coercive choices: ' + r.auth + '. Ask: was each measure necessary, effective, proportional and fair?']
    ];
    var node = el('div', 'oc-card oc-report');
    node.innerHTML = '<div class="oc-row" style="justify-content:space-between"><div><div class="kicker" style="color:#E69F00;font-weight:800;letter-spacing:.1em;font-size:.75em">AFTER-ACTION REPORT</div><h2 style="margin:0">' + esc(end.title) + '</h2><div class="muted oc-small">' + esc(r.name || 'Unnamed commissioner') + ' · Seed ' + esc(g.seed) + ' · ' + esc(g.diff.label) + ' · ' + (g.quick ? 'Quick' : 'Full') + ' game · ' + r.wave + ' waves</div></div>' +
      '<div class="oc-row"><button type="button" class="oc-btn primary" data-a="results">My Results page</button><button type="button" class="oc-btn" data-a="copy">Copy results</button><button type="button" class="oc-btn" data-a="end">Back</button><button type="button" class="oc-btn" data-a="again">Play again</button></div></div>' +
      '<section><h3>Your completion code</h3><p class="oc-small muted">Paste this into your class assignment. It encodes your name, seed, ending and key scores.</p><div class="oc-code" tabindex="0">' + esc(code) + '</div><p class="oc-small" data-f="submit"></p></section>' +
      '<section><div class="oc-stats">' + stat(Math.round(r.survival * 100) + '%', 'survived') + stat(r.deaths, 'lost') + stat(r.infections, 'infections') + stat(r.peakR || '-', 'peak R_eff') + stat(r.peakZ, 'peak infected') +
      stat(r.detectionPct + '%', 'infections detected') + stat(r.vaxPct + '%', 'vaccinated') + stat(r.cured, 'cured') + stat(r.strayDeaths, 'stray-fire deaths') + stat(r.trust, 'final trust') + stat(r.equity, 'equity') + stat(r.overrun, 'buildings overrun') + '</div></section>' +
      '<section><h2>Your epidemic curve</h2><canvas class="oc-bigchart" width="1600" height="480" aria-label="Epidemic curve with annotations"></canvas>' +
      '<div class="oc-legend"><span><i style="border-color:#D55E00"></i>Infected (zombies)</span><span><i style="border-color:#E69F00;border-top-style:dashed"></i>Known exposed</span><span><i style="border-color:rgba(230,159,0,.6);border-top-style:dotted"></i>All exposed (the hidden iceberg)</span><span><i style="border-color:#F2A6D6;border-top-style:dotted"></i>Hospital beds</span></div>' +
      '<ol class="oc-annos">' + annos.map(function (a) { return '<li>' + esc(a.label) + ' <span class="muted">(' + C.fmtTime(a.t) + ')</span></li>'; }).join('') + '</ol></section>' +
      '<section><h2>Deaths by district</h2><p class="oc-small muted">Per 100 residents. Starting health-care access in brackets: the social determinants you inherited.</p><div class="oc-dbars">' +
      dist.map(function (d) { return '<span>' + esc(d.name) + ' <span class="muted oc-small">[' + Math.round(d.baseAccess * 100) + '%]</span></span><span class="b"><i style="width:' + Math.round(100 * d.rate / maxRate) + '%;background:' + (d.rate >= maxRate * 0.99 && d.rate > 0 ? '#D55E00' : '#56B4E9') + '"></i></span><span>' + d.per100 + ' / 100</span>'; }).join('') + '</div></section>' +
      '<section><h2>Your decisions and what happened</h2>' + (g.decisions.length ? '<ul class="oc-decs">' + g.decisions.map(function (d) { return '<li><b>Wave ' + d.wave + ' · ' + esc(d.title) + ':</b> ' + esc(d.choice) + '<br><span class="muted">' + esc(d.result) + '</span>' + d.consequences.map(function (c) { return '<span class="cons">⏳ Later: ' + esc(c) + '</span>'; }).join('') + '</li>'; }).join('') + '</ul>' : '<p class="muted">No briefings were reached.</p>') + '</section>' +
      '<section><h2>Public health concepts in your game</h2><div class="oc-concepts">' + concepts.map(function (c) { var k = D.CONCEPTS[c[0]]; return '<div class="oc-concept"><b>' + esc(k.name) + '</b><br>' + esc(k.text) + '<span class="you">In your game: ' + esc(c[1]) + '</span><span class="real">Real life: ' + esc(k.real) + '</span></div>'; }).join('') + '</div></section>' +
      '<section><h2>The 10 Essential Public Health Services</h2><p class="oc-small muted">' + esc(D.CONCEPTS.essential.text) + '</p><ul class="oc-eps">' + D.ESSENTIAL_SERVICES.map(function (s, i) { return '<li><span class="' + (eps[i] ? 'ok' : 'no') + '">' + (eps[i] ? '✔' : '·') + '</span><span><b>' + s.n + '.</b> ' + esc(s.label) + '<br><span class="oc-small muted">' + esc(s.how) + '</span></span></li>'; }).join('') + '</ul></section>' +
      '<section><h2>What really happens in real life</h2><div class="oc-concepts">' + D.TOWER_ORDER.map(function (k) { return '<div class="oc-concept"><b>' + esc(D.TOWERS[k].name) + '</b><span class="real">' + esc(D.TOWER_REAL[k]) + '</span></div>'; }).join('') + '</div></section>' +
      '<section><h2>Reflection questions</h2><ol class="oc-qs">' + qs.map(function (q) { return '<li>' + esc(q) + '</li>'; }).join('') + '</ol></section>';
    node.addEventListener('click', function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return;
      var a = b.getAttribute('data-a');
      if (a === 'copy') self.copyText(self.resultsText(r, code, qs), 'Results and completion code copied.');
      if (a === 'end') self.showEnd();
      if (a === 'results') self.showResults();
      if (a === 'again') { self.startAttract(C.randomSeed()); self.showTitle(); }
    });
    this.showScreen(node);
    this.updateSubmitStatus();
    var big = node.querySelector('.oc-bigchart');
    this.drawEpiChart(big, true, annos);
  };

  U.resultsText = function (r, code, qs) {
    var g = this.game, end = D.ENDINGS[g.ending];
    return [D.GAME_TITLE + ' — After-Action Report', 'Name: ' + (r.name || '(none)'), 'Seed: ' + g.seed + ' (' + g.diff.label + ', ' + (g.quick ? 'Quick' : 'Full') + ')', 'Ending: ' + end.title + ' — ' + end.headline,
      'Survived: ' + Math.round(r.survival * 100) + '%  Lost: ' + r.deaths + '  Peak R_eff: ' + r.peakR + '  Trust: ' + r.trust + '  Equity: ' + r.equity,
      'Detected: ' + r.detectionPct + '%  Vaccinated: ' + r.vaxPct + '%  Cured: ' + r.cured + '  Stray-fire deaths: ' + r.strayDeaths,
      'Decisions:'].concat(g.decisions.map(function (d) { return '  Wave ' + d.wave + ' ' + d.title + ': ' + d.choice; })).concat(['Reflection questions:']).concat(qs.map(function (q, i) { return '  ' + (i + 1) + '. ' + q; })).concat(['Completion code: ' + code]).join('\n');
  };

  /* ================= tutorial ================= */
  U.renderTutorial = function () {
    var self = this, t = this.tut;
    D.TOWER_ORDER.forEach(function (k) { self.tbtns[k].classList.remove('pulse'); });
    this.startBtn.classList.remove('pulse');
    this.ui.highlightBld = null;
    if (!t) { this.tutEl.classList.add('oc-hidden'); return; }
    var step = D.TUTORIAL[t.i];
    if (!step) { this.finishTutorial(); return; }
    this.tutEl.innerHTML = '<p>' + esc(step.text.replace('{city}', D.CITY_NAME)) + '</p><div class="row"><span class="step">Tutorial ' + (t.i + 1) + ' / ' + D.TUTORIAL.length + '</span>' +
      (step.until === 'next' ? '<button type="button" class="oc-btn primary" data-a="next">Got it</button>' : '') + '<button type="button" class="oc-btn" data-a="skip">Skip tutorial</button></div>';
    this.tutEl.classList.remove('oc-hidden');
    this.tutEl.querySelectorAll('[data-a]').forEach(function (b) {
      b.addEventListener('click', function () { if (b.getAttribute('data-a') === 'next') self.advanceTutorial(); else self.finishTutorial(); });
    });
    if (step.highlight === 'start') this.startBtn.classList.add('pulse');
    else if (step.highlight && this.tbtns[step.highlight]) this.tbtns[step.highlight].classList.add('pulse');
    if (step.id === 'lab') {
      this.ui.highlightBld = this.game.patientZero;
      var b = this.game.blds[this.game.patientZero];
      this.renderer.focus(b.cx, b.cy, Math.max(this.renderer.cam.tz, 0.9));
    }
    if (step.id === 'militia') {
      var e = this.game.plans[0].entries[0], W = this.game.W;
      this.renderer.focus(e % W + 0.5, ((e / W) | 0) + 0.5, Math.max(this.renderer.cam.tz, 0.9));
    }
  };
  U.advanceTutorial = function () { if (!this.tut) return; this.tut.i++; this.tut.t = 0; this.renderTutorial(); this.updateHud(true); };
  U.finishTutorial = function () { this.tut = null; this.store.tutorialDone = true; saveStore(this.store); this.renderTutorial(); this.updateHud(true); };
  U.tutPauses = function () { var t = this.tut, g = this.game; if (!t || !g) return false; var s = D.TUTORIAL[t.i]; return !!(s && /^built:/.test(s.until) && g.phase === 'wave' && !g.stats.everBuilt[s.until.slice(6)]); };
  U.tutEvent = function () { };
  U.checkTutorial = function () {
    var t = this.tut, g = this.game; if (!t) return;
    var s = D.TUTORIAL[t.i]; if (!s) return;
    t.t += 0.15;
    var done = false;
    if (/^built:/.test(s.until)) done = !!g.stats.everBuilt[s.until.slice(6)];
    else if (s.until === 'wave') done = g.phase === 'wave';
    else if (s.until === 'reveal') done = (g.stats.revealed > 0 && t.t > 3) || t.t > 30;
    if (done) this.advanceTutorial();
  };
})(typeof window !== 'undefined' ? window : globalThis);
