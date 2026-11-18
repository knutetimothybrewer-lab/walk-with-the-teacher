/* =====================================================================
   OUTBREAK CITY: APP CONTROLLER
   Single entry point:  OutbreakCity.mount(element, options) -> { destroy }
   Owns the game loop (fixed-step sim + rAF render), input, save/resume,
   the auto "Low effects" switch and optional teacher logging.
   ===================================================================== */
(function (root) {
  'use strict';
  var NS = root.OutbreakCity = root.OutbreakCity || {};
  var C = NS.core, D = NS.data, CFG = D.CONFIG;
  var STORE = 'outbreakCity.v1';
  var DT = 1 / CFG.simHz;

  function loadStore() { try { return JSON.parse(root.localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function saveStore(o) { try { root.localStorage.setItem(STORE, JSON.stringify(o)); } catch (e) { /* storage blocked: play on */ } }

  function App(el, opts) {
    this.el = el; this.opts = opts || {};
    this.store = loadStore();
    var prefersReduced = false;
    try { prefersReduced = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { }
    this.settings = Object.assign({ muted: false, text: 'normal', reducedMotion: prefersReduced, lowFx: false, edgePan: true, badges: true, autoLowFx: false }, this.store.settings || {});
    this.webhook = this.opts.webhook !== undefined ? this.opts.webhook : D.SHEETS_WEBHOOK_URL;
    this.speed = 1; this.paused = false; this.acc = 0; this.last = 0;
    this.ui = { placeType: null, hover: null, hoverBld: null, selected: null, lens: false, canPlace: false, moveTeam: false, highlightBld: null, paused: false, speed: 1 };
    this.keys = {}; this.pointers = {}; this.mouse = null;
    this.perf = { acc: 0, frames: 0, slow: 0, avg: 16, history: [] };
    this.listeners = [];
    this.destroyed = false;
    this.buildDom();
    this.applySettings();
    this.renderer = new NS.Renderer(this.canvas, this.settings);
    this.sfx = new NS.Sfx(this.settings);
    this.bindInput();
    this.resize();
    // Map signs are pre-rendered into sprites; redraw them once the embedded fonts are ready
    var self0 = this;
    try { if (root.document.fonts && root.document.fonts.ready) root.document.fonts.ready.then(function () { if (!self0.destroyed && self0.renderer.game) self0.renderer.clearSprites(); }); } catch (e) { }
    this.seedFromUrl = this.opts.seed ? C.cleanSeed(this.opts.seed) : null;
    this.startAttract(this.seedFromUrl || C.randomSeed());
    this.showTitle();
    this.frameFn = this.frame.bind(this);
    this.raf = root.requestAnimationFrame(this.frameFn);
    NS._instances = NS._instances || [];
    NS._instances.push(this);
  }
  var A = App.prototype;
  Object.assign(A, NS.UI || {});

  A.on = function (target, type, fn, opt) { target.addEventListener(type, fn, opt); this.listeners.push([target, type, fn, opt]); };

  A.saveSettings = function () { this.store.settings = this.settings; saveStore(this.store); };

  A.applySettings = function () {
    this.root.setAttribute('data-text', this.settings.text);
    this.root.setAttribute('data-motion', this.settings.reducedMotion ? 'reduced' : 'full');
  };

  /* ---------------- game lifecycle ---------------- */
  A.startAttract = function (seed) {
    this.game = new NS.sim.Game({ seed: seed, attract: true });
    this.renderer.setGame(this.game);
    this.renderer.cam.tz *= 1.25;
  };

  A.newGame = function (cfg) {
    this.game = new NS.sim.Game({ seed: cfg.seed, difficulty: cfg.difficulty, quick: cfg.quick, name: cfg.name });
    this.afterGameReady(cfg.tutorial);
  };

  A.afterGameReady = function (tutorial) {
    var g = this.game;
    this.renderer.clearSprites();
    this.renderer.setGame(g);
    this.ui.placeType = null; this.ui.selected = null; this.ui.lens = false; this.ui.moveTeam = false; this.ui.highlightBld = null;
    this.paused = false; this.speed = 1; this.acc = 0;
    this.lastPhase = g.phase; this.endShown = false; this.submitted = false; this.hallWarn50 = this.hallWarn25 = false;
    this.tut = tutorial ? { i: 0, t: 0, start: Date.now() } : null;
    this.hideScreen();
    this.hud.classList.remove('oc-hidden');
    this.tickerQueue = [];
    this.pushNews(D.TICKER.filler[0]);
    this.updateHud(true);
    this.renderTutorial();
    this.autosave();
    if (g.phase === 'briefing') this.showBriefing();
    if (g.phase === 'ended') this.showEnd();
  };

  A.resume = function () {
    var sv = this.store.save, self = this;
    if (!sv) return;
    this.showLoading('Restoring ' + D.CITY_NAME + '...');
    NS.sim.replay(sv.opts, sv.log, sv.tick, function (g) {
      self.game = g;
      self.afterGameReady(false);
      if (g.phase === 'wave') self.paused = true;
      self.updateHud(true);
      self.toast('Welcome back! Your city was restored exactly where you left it. Press Space or \u25B6 to continue.', 'good', 6000);
    }, 3000);
  };

  A.autosave = function () {
    var g = this.game;
    if (!g || g.attract) return;
    if (g.phase === 'ended') { delete this.store.save; saveStore(this.store); return; }
    var o = g.opts;
    this.store.save = { opts: { seed: g.seed, difficulty: g.diffKey, quick: g.quick, name: o.name || '' }, log: g.log, tick: g.tick, wave: g.wave, savedAt: Date.now() };
    saveStore(this.store);
  };

  /* ---------------- commands (all go through here so they are saved) ---------------- */
  A.tryPlace = function (type, tx, ty) {
    var g = this.game, res = g.place(type, tx, ty);
    if (res.ok) {
      this.sfx.play('build');
      if (!this.shiftHeld || g.budget < g.placeCost(type)) this.ui.placeType = null;
      this.updateHud(true); this.autosave();
      if (type === 'chw') this.toast('Tip: select the van, then tap any road to send the team there.', 'good');
    } else { this.sfx.play('error'); this.toast(res.reason, 'bad'); }
    return res;
  };
  A.doUpgrade = function (tw) { var r = this.game.upgrade(tw.id); if (r.ok) { this.sfx.play('upgrade'); this.autosave(); } else { this.sfx.play('error'); this.toast(r.reason, 'bad'); } this.updateHud(true); };
  A.doSell = function (tw) { this.game.sell(tw.id); this.ui.selected = null; this.sfx.play('click'); this.autosave(); this.updateHud(true); };
  A.doMove = function (tw, tx, ty) { var r = this.game.moveTeam(tw.id, tx, ty); if (r.ok) { this.sfx.play('click'); this.autosave(); } else this.toast(r.reason, 'bad'); this.ui.moveTeam = false; return r; };
  A.doStartWave = function () {
    var g = this.game;
    if (g.phase !== 'build') return;
    g.startWave(); this.paused = false;
    this.sfx.play('wave');
    this.autosave(); this.updateHud(true);
  };
  A.doChoose = function (i) { var r = this.game.choose(i); this.autosave(); return r; };

  /* ---------------- main loop ---------------- */
  A.frame = function (ts) {
    if (this.destroyed) return;
    this.raf = root.requestAnimationFrame(this.frameFn);
    var dtMs = this.last ? ts - this.last : 16.7;
    this.last = ts;
    var dt = Math.min(0.1, dtMs / 1000);
    this.trackPerf(dtMs);
    var g = this.game;
    // tutorial may pause the wave until the player builds what it asks for
    var tutPause = this.tut && this.tutPauses();
    this.ui.paused = this.paused || tutPause;
    this.ui.speed = this.speed;
    if (g && (g.phase === 'attract' || (!this.ui.paused && !this.modalOpen && g.phase === 'wave'))) {
      this.acc += dt * (g.phase === 'attract' ? 1 : this.speed);
      var steps = 0;
      while (this.acc >= DT && steps < 14) { g.step(); this.acc -= DT; steps++; if (g.phase !== 'wave' && g.phase !== 'attract') { this.acc = 0; break; } }
      if (steps >= 14) this.acc = 0;
    }
    this.handleCameraKeys(dt);
    if (g) this.drainEvents();
    var alpha = C.clamp(this.acc / DT, 0, 1);
    if (g && g.phase === 'attract') { this.renderer.cam.tx += dt * 9; this.renderer.clampCam(); }
    this.renderer.draw(alpha, dt, g && g.phase !== 'attract' ? this.ui : null);
    if (g && g.phase !== 'attract') {
      this.hudT = (this.hudT || 0) + dt;
      if (this.hudT > 0.15) { this.hudT = 0; this.updateHud(false); }
      this.chartT = (this.chartT || 0) + dt;
      if (this.chartT > 0.5) { this.chartT = 0; this.drawEpiChart(this.chart, false); }
      this.saveT = (this.saveT || 0) + dt;
      if (this.saveT > 10 && g.phase === 'wave') { this.saveT = 0; this.autosave(); }
      this.checkPhase();
    }
    this.updateTicker(dt);
    this.ambT = (this.ambT || 0) + dt;
    if (this.ambT > 0.1) { this.ambT = 0; this.updateAmbient(); }
    if (this.endArt && this.endArtCanvas) { this.endArtT += dt; this.renderer.drawEndingArt(this.endArtCanvas, this.endArt, this.endArtT); }
  };

  // Ambient fire and helicopter: louder the more is burning near the camera
  A.updateAmbient = function () {
    var g = this.game, r = this.renderer;
    if (!g || g.attract || !g.chaos || g.phase === 'ended' || this.modalOpen && g.phase !== 'briefing' || (root.document && root.document.hidden)) { this.sfx.ambient(0, 0); return; }
    var c = r.screenToWorld(r.vw / 2, r.vh / 2), span = 14 / Math.max(0.4, r.cam.zoom), fire = 0, i;
    for (i = 0; i < g.chaos.length; i++) {
      var cc = g.city.centers[i], dd = Math.hypot(cc[0] - c.x, cc[1] - c.y);
      fire = Math.max(fire, g.chaos[i] * C.clamp(1.15 - dd / span, 0.15, 1));
    }
    fire = C.clamp((fire - 0.08) * 2, 0, 1);
    var heli = 0;
    if (r.heliPos) heli = C.clamp(1.1 - Math.hypot(r.heliPos.x - c.x, r.heliPos.y - c.y) / span, 0.15, 1);
    this.sfx.ambient(fire, heli);
  };

  A.trackPerf = function (dtMs) {
    if (dtMs > 250 || (root.document && root.document.hidden)) return;
    var p = this.perf;
    p.acc += dtMs; p.frames++;
    if (p.acc >= 1000) {
      p.avg = p.acc / p.frames;
      p.history.push(Math.round(p.avg * 10) / 10); if (p.history.length > 120) p.history.shift();
      if (p.avg > CFG.lowFxFrameMs && this.game && !this.game.attract) p.slow++; else p.slow = 0;
      if (p.slow >= CFG.lowFxSeconds && !this.settings.lowFx) {
        this.setLowFx(true);
        this.settings.autoLowFx = true; this.saveSettings();
        this.toast('This device was running slowly, so Low effects is now on. (Change it in Settings.)', 'warn');
      }
      p.acc = 0; p.frames = 0;
    }
  };

  A.setLowFx = function (on) {
    this.settings.lowFx = on;
    this.renderer.clearSprites();
    this.renderer.buildChunks();
    this.renderer.initCars();
    this.saveSettings();
  };

  A.checkPhase = function () {
    var g = this.game;
    if (g.phase === this.lastPhase) return;
    var prev = this.lastPhase; this.lastPhase = g.phase;
    if (g.phase === 'briefing') { this.autosave(); this.ui.placeType = null; this.showBriefing(); }
    if (g.phase === 'build' && prev === 'wave') { this.autosave(); this.toast('Wave ' + g.wave + ' survived. Plan your next move, then start Wave ' + (g.wave + 1) + '.', 'good'); }
    if (g.phase === 'ended' && !this.endShown) {
      this.endShown = true; this.autosave();
      var self = this;
      this.banner(g.endReason === 'hall' ? 'CITY HALL HAS FALLEN' : g.endReason === 'collapse' ? 'THE CITY HAS FALLEN' : 'OUTBREAK OVER', g.endReason === 'hall' ? 'The command bunker was overrun' : g.endReason === 'collapse' ? 'Too many residents were lost' : 'Let’s see what kind of city is left');
      setTimeout(function () { if (!self.destroyed) self.showEnd(); }, 1600);
    }
  };

  A.drainEvents = function () {
    var g = this.game, fx = g.fx, r = this.renderer, s = this.sfx;
    for (var i = 0; i < fx.length; i++) {
      var e = fx[i];
      r.onEvent(e);
      switch (e.k) {
        case 'shot': s.play(e.stray ? 'stray' : 'shot'); break;
        case 'kill': s.play('kill'); break;
        case 'turn': s.play('groan'); break;
        case 'reveal': s.play('reveal'); break;
        case 'unmask': s.play('alert'); break;
        case 'vax': s.play('vax'); break;
        case 'cure': s.play('cure'); break;
        case 'barricadeBreak': s.play('barricade'); this.toast('A barricade was broken through!', 'bad'); break;
        case 'news': this.pushNews(this.fillNews(e.key, e.vars)); break;
        case 'consequence': this.toast('⏳ ' + e.text, 'warn', 7000); this.pushNews('UPDATE: ' + e.text.toUpperCase()); s.play('alert'); break;
        case 'waveStart': this.banner('WAVE ' + e.w, e.w === g.totalWaves ? 'Final wave' : (g.weather !== 'clear' ? (g.weather === 'fog' ? 'Fog rolls in: turrets see less' : 'Rain: fewer people out') : 'Zombies approach')); break;
        case 'megaArrive': this.banner('SUPER-SPREADER!', 'A giant zombie that infects many people at once. Focus fire, barricades and high vaccination slow it.'); s.play('alert'); s.play('wave'); this.pushNews(this.fillNews('mega')); break;
        case 'ruin': s.play('barricade'); break;
        case 'chaos':
          var dn = D.DISTRICTS[e.d].name;
          if (e.lvl === 2) { this.banner(dn.toUpperCase() + ' IS BURNING', 'Half the district is overrun: fires, wrecks and panic in the streets'); s.play('lose'); }
          else this.toast('Fires and chaos are breaking out in ' + dn + '. Contain the outbreak there before it spreads.', 'bad', 6000);
          break;
        case 'hallHit':
          this.flashMeter('hall'); s.play('alert');
          var hp = e.hp / e.max;
          if (hp < 0.5 && !this.hallWarn50) { this.hallWarn50 = true; this.toast('City Hall is below 50%! Defend the roads into downtown.', 'bad', 6000); }
          if (hp < 0.25 && !this.hallWarn25) { this.hallWarn25 = true; this.banner('CITY HALL UNDER SIEGE', 'If the command bunker falls, the game is over'); }
          break;
        case 'finalPush': this.banner('FINAL PUSH', 'No more arrivals. Clear the remaining cases!'); s.play('alert'); break;
        case 'stockout': this.toast('Vaccine stock is empty. Clinics are idle until the next shipment.', 'bad'); this.flashMeter('vaccines'); break;
        case 'firstBite': if (this.tut) this.tutEvent('bite'); break;
        case 'ended': s.play(g.ending === 'collapse' || g.ending === 'hallFallen' || g.ending === 'hollow' || g.ending === 'zombieMayor' ? 'lose' : 'win'); break;
      }
    }
    fx.length = 0;
  };

  /* ---------------- input ---------------- */
  A.bindInput = function () {
    var self = this, cv = this.canvas;
    this.on(root, 'resize', function () { self.resize(); });
    this.on(cv, 'contextmenu', function (e) { e.preventDefault(); self.cancelModes(); });
    this.on(cv, 'pointerdown', function (e) {
      self.sfx.unlock();
      try { cv.setPointerCapture(e.pointerId); } catch (er) { }
      var p = self.localPos(e);
      self.pointers[e.pointerId] = { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, type: e.pointerType, button: e.button };
      var ids = Object.keys(self.pointers);
      if (ids.length === 2) {
        var a = self.pointers[ids[0]], b = self.pointers[ids[1]];
        self.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      }
      if (e.pointerType !== 'mouse') self.updateHover(p.x, p.y);
    });
    this.on(cv, 'pointermove', function (e) {
      var p = self.localPos(e);
      if (e.pointerType === 'mouse') self.mouse = { x: p.x, y: p.y };
      var ptr = self.pointers[e.pointerId];
      var ids = Object.keys(self.pointers);
      if (ids.length >= 2 && self.pinch && ptr) {
        ptr.x = p.x; ptr.y = p.y;
        var a = self.pointers[ids[0]], b = self.pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        if (self.pinch.d > 10) self.renderer.zoomAt(mx, my, d / self.pinch.d);
        self.renderer.pan(mx - self.pinch.mx, my - self.pinch.my);
        self.pinch = { d: d, mx: mx, my: my };
        a.moved = b.moved = true;
        return;
      }
      if (ptr) {
        var dx = p.x - ptr.x, dy = p.y - ptr.y;
        if (!ptr.moved && Math.hypot(p.x - ptr.sx, p.y - ptr.sy) > (e.pointerType === 'mouse' ? 5 : 10)) { ptr.moved = true; cv.classList.add('dragging'); }
        if (ptr.moved) self.renderer.pan(dx, dy);
        ptr.x = p.x; ptr.y = p.y;
      }
      self.updateHover(p.x, p.y);
    });
    var up = function (e) {
      var ptr = self.pointers[e.pointerId];
      delete self.pointers[e.pointerId];
      if (Object.keys(self.pointers).length < 2) self.pinch = null;
      cv.classList.remove('dragging');
      if (!ptr) return;
      if (!ptr.moved && ptr.button !== 2) self.onTap(ptr.x, ptr.y);
    };
    this.on(cv, 'pointerup', up);
    this.on(cv, 'pointercancel', function (e) { delete self.pointers[e.pointerId]; self.pinch = null; cv.classList.remove('dragging'); });
    this.on(cv, 'pointerleave', function (e) { if (e.pointerType === 'mouse') { self.mouse = null; self.hideTip(); self.ui.hover = null; } });
    this.on(cv, 'wheel', function (e) {
      e.preventDefault();
      var p = self.localPos(e);
      self.renderer.zoomAt(p.x, p.y, Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)));
    }, { passive: false });
    this.on(root, 'keydown', function (e) { self.onKey(e, true); });
    this.on(root, 'keyup', function (e) { self.onKey(e, false); });
    this.on(root, 'pagehide', function () { self.autosave(); });
    this.on(root.document, 'visibilitychange', function () { if (root.document.hidden) self.autosave(); });
    this.on(this.root, 'pointerdown', function () { self.sfx.unlock(); });
  };

  A.localPos = function (e) { var r = this.canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  A.resize = function () {
    var r = this.root.getBoundingClientRect();
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    if (this.settings.lowFx) dpr = Math.min(dpr, 1.25);
    this.renderer && this.renderer.resize(Math.max(320, r.width), Math.max(240, r.height), dpr);
  };

  A.cancelModes = function () { this.ui.placeType = null; this.ui.moveTeam = false; this.updateHud(true); };

  A.updateHover = function (sx, sy) {
    var g = this.game; if (!g || g.attract) return;
    var w = this.renderer.screenToWorld(sx, sy), tx = Math.floor(w.x), ty = Math.floor(w.y);
    if (tx < 0 || ty < 0 || tx >= g.W || ty >= g.H) { this.ui.hover = null; this.ui.hoverBld = null; this.hideTip(); return; }
    this.ui.hover = { x: tx, y: ty };
    var i = ty * g.W + tx;
    if (this.ui.placeType) {
      var save = g.budget; var chk = g.canPlace(this.ui.placeType, tx, ty); this.ui.canPlace = chk.ok;
      this.ui.placeReason = chk.reason;
      this.showPlaceTip(sx, sy, tx, ty, chk);
    } else if (this.ui.moveTeam) {
      var t = g.city.tiles[i]; this.ui.canPlace = t === NS.city.T.ROAD || t === NS.city.T.BRIDGE; this.hideTip();
    } else {
      var bi = g.city.bldAt[i];
      this.ui.hoverBld = bi >= 0 ? bi : null;
      if (bi >= 0 && this.mouse) this.showBuildingTip(sx, sy, bi); else this.hideTip();
    }
    this.canvas.classList.toggle('placing', !!(this.ui.placeType || this.ui.moveTeam));
  };

  A.pickTower = function (sx, sy) {
    var g = this.game, best = null, bd = 30;
    for (var i = 0; i < g.towers.length; i++) {
      var tw = g.towers[i], p = this.renderer.worldToScreen(tw.x, tw.y, 14);
      var d = Math.hypot(p.x - sx, p.y - sy) / Math.max(0.6, this.renderer.cam.zoom);
      if (d < bd) { bd = d; best = tw; }
    }
    return best;
  };

  A.onTap = function (sx, sy) {
    var g = this.game; if (!g || g.attract || this.modalOpen) return;
    var w = this.renderer.screenToWorld(sx, sy), tx = Math.floor(w.x), ty = Math.floor(w.y);
    var hi = this.renderer.hallIndicator;
    if (hi && Math.hypot(sx - hi.x, sy - hi.y) < 50) { this.goToHall(); return; }
    if (this.ui.placeType) { this.tryPlace(this.ui.placeType, tx, ty); this.updateHover(sx, sy); return; }
    var sel = this.ui.selected;
    if (sel && sel.type === 'chw' && (this.ui.moveTeam || this.isRoad(tx, ty)) && !this.pickTower(sx, sy)) { this.doMove(sel, tx, ty); return; }
    var tw = this.pickTower(sx, sy);
    if (tw) { this.ui.selected = tw; this.sfx.play('click'); this.updateSelPanel(true); return; }
    this.ui.selected = null; this.updateSelPanel(true);
    if (tx >= 0 && ty >= 0 && tx < g.W && ty < g.H) {
      var bi = g.city.bldAt[ty * g.W + tx];
      if (bi >= 0) this.showBuildingTip(sx, sy, bi, true); else this.hideTip();
    }
  };
  A.isRoad = function (tx, ty) { var g = this.game; if (tx < 0 || ty < 0 || tx >= g.W || ty >= g.H) return false; var t = g.city.tiles[ty * g.W + tx]; return t === NS.city.T.ROAD || t === NS.city.T.BRIDGE; };

  A.onKey = function (e, down) {
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!this.root.isConnected) return;
    var k = e.key;
    this.shiftHeld = e.shiftKey;
    var lk = k.length === 1 ? k.toLowerCase() : k;
    if (['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '_'].indexOf(lk) >= 0) {
      this.keys[lk] = down;
      if (down && this.game && !this.game.attract && !this.modalOpen) e.preventDefault();
    }
    if (!down) return;
    var g = this.game;
    if (this.modalOpen) {
      if (this.modalKey) this.modalKey(e);
      return;
    }
    if (!g || g.attract) return;
    if (k >= '1' && k <= '8') { this.selectTower(D.TOWER_ORDER[+k - 1]); e.preventDefault(); return; }
    switch (lk) {
      case 'Escape': this.cancelModes(); this.ui.selected = null; this.updateSelPanel(true); break;
      case ' ': this.togglePause(); e.preventDefault(); break;
      case 'f': this.cycleSpeed(); break;
      case 'c': this.renderer.recenter(); break;
      case 'l': this.toggleLens(); break;
      case 'm': this.toggleMute(); break;
      case 'h': case '?': this.showHelp(); break;
      case 't': this.side.classList.toggle('collapsed'); break;
      case 'u': if (this.ui.selected) this.doUpgrade(this.ui.selected); break;
      case 'x': case 'Delete': case 'Backspace': if (this.ui.selected) this.doSell(this.ui.selected); break;
      case 'Enter': if (g.phase === 'build') this.doStartWave(); break;
    }
  };

  A.handleCameraKeys = function (dt) {
    var k = this.keys, r = this.renderer, sp = 520 * dt;
    if (!this.game || this.game.attract || this.modalOpen) return;
    var dx = 0, dy = 0;
    if (k.w || k.ArrowUp) dy += sp; if (k.s || k.ArrowDown) dy -= sp;
    if (k.a || k.ArrowLeft) dx += sp; if (k.d || k.ArrowRight) dx -= sp;
    if (this.settings.edgePan && this.mouse && !Object.keys(this.pointers).length) {
      var m = 14, vw = r.vw, vh = r.vh;
      if (this.mouse.x < m) dx += sp; else if (this.mouse.x > vw - m) dx -= sp;
      if (this.mouse.y < m) dy += sp; else if (this.mouse.y > vh - m) dy -= sp;
    }
    if (dx || dy) r.pan(dx, dy);
    if (k['+'] || k['=']) r.zoomAt(r.vw / 2, r.vh / 2, 1 + dt * 1.5);
    if (k['-'] || k['_']) r.zoomAt(r.vw / 2, r.vh / 2, 1 - dt * 1.5);
  };

  A.selectTower = function (type) {
    var g = this.game;
    if (this.ui.placeType === type) { this.ui.placeType = null; }
    else { this.ui.placeType = type; this.ui.selected = null; this.ui.moveTeam = false; }
    this.sfx.play('click');
    if (this.mouse) this.updateHover(this.mouse.x, this.mouse.y);
    this.updateHud(true); this.updateSelPanel(true);
  };
  A.goToHall = function () { var g = this.game; if (!g || g.attract) return; var b = g.blds[g.hallId]; this.renderer.focus(b.cx, b.cy, Math.max(this.renderer.cam.tz, 1.1)); this.sfx.play('click'); };
  A.togglePause = function () { this.paused = !this.paused; this.updateHud(true); };
  A.cycleSpeed = function () { this.speed = this.speed >= 3 ? 1 : this.speed + 1; this.updateHud(true); };
  A.toggleLens = function () { this.ui.lens = !this.ui.lens; this.updateHud(true); if (this.ui.lens) this.toast('Data lens: district colors, tower coverage and green immunity bars (share vaccinated or recovered).', 'good'); };
  A.toggleMute = function () { this.settings.muted = !this.settings.muted; this.saveSettings(); this.updateHud(true); };

  /* ---------------- teacher logging ---------------- */
  A.submitResults = function (payload) {
    var url = this.webhook, self = this;
    if (!url || this.submitted) return;
    this.submitted = true;
    var body = JSON.stringify(payload);
    var send = function (attempt) {
      try {
        root.fetch(url, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: body })
          .then(function () { self.submitStatus = 'sent'; self.updateSubmitStatus(); })
          .catch(function () { if (attempt < 1) setTimeout(function () { send(attempt + 1); }, 3000 + Math.random() * 3000); else { self.submitStatus = 'failed'; self.updateSubmitStatus(); } });
      } catch (e) { self.submitStatus = 'failed'; self.updateSubmitStatus(); }
    };
    this.submitStatus = 'waiting'; this.updateSubmitStatus();
    // Spread out 30 near-simultaneous submissions from one classroom
    setTimeout(function () { send(0); }, Math.random() * 10000);
  };

  A.destroy = function () {
    this.destroyed = true;
    root.cancelAnimationFrame(this.raf);
    this.autosave();
    this.listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); });
    this.listeners = [];
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    var i = (NS._instances || []).indexOf(this); if (i >= 0) NS._instances.splice(i, 1);
  };

  /* ---------------- public mount ---------------- */
  NS.mount = function (el, opts) {
    if (typeof el === 'string') el = root.document.querySelector(el);
    var app = new App(el, opts);
    return { destroy: function () { app.destroy(); }, app: app };
  };
  NS.App = App;
})(typeof window !== 'undefined' ? window : globalThis);
