/*
 * court.js — the stylized SVG court and the Playback clock.
 *
 * Playback only DISPLAYS a predetermined timeline. It never creates or changes game results.
 * 1X speed compresses a full 48-minute game into about 4 minutes (12 game-seconds per real second).
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};
  var RATE = 12; // game seconds per real second at 1X
  var SVGNS = 'http://www.w3.org/2000/svg';

  function esc(s) { return PL.Charts.esc(s); }

  // ------------------------------------------------------------------ court drawing
  function courtMarkup() {
    var L = 'stroke="rgba(255,255,255,.55)" stroke-width=".25" fill="none"';
    return '' +
      '<rect x="0" y="0" width="94" height="50" fill="#1b2a44"/>' +
      '<rect x="1" y="1" width="92" height="48" rx="1" fill="#22344f" stroke="rgba(255,255,255,.6)" stroke-width=".35"/>' +
      '<line x1="47" y1="1" x2="47" y2="49" ' + L + '/><circle cx="47" cy="25" r="6" ' + L + '/>' +
      // left half
      '<rect x="1" y="17" width="19" height="16" ' + L + '/><circle cx="20" cy="25" r="6" ' + L + '/>' +
      '<path d="M1 3 H15.5 A23.75 23.75 0 0 1 15.5 47 H1" ' + L + '/><circle cx="5.25" cy="25" r="0.9" stroke="#ff9d4d" stroke-width=".35" fill="none"/>' +
      '<line x1="4" y1="22" x2="4" y2="28" stroke="rgba(255,255,255,.7)" stroke-width=".3"/>' +
      // right half
      '<rect x="74" y="17" width="19" height="16" ' + L + '/><circle cx="74" cy="25" r="6" ' + L + '/>' +
      '<path d="M93 3 H78.5 A23.75 23.75 0 0 0 78.5 47 H93" ' + L + '/><circle cx="88.75" cy="25" r="0.9" stroke="#ff9d4d" stroke-width=".35" fill="none"/>' +
      '<line x1="90" y1="22" x2="90" y2="28" stroke="rgba(255,255,255,.7)" stroke-width=".3"/>';
  }

  /** Offense / defense formation slots relative to the attacked hoop (x measured away from the hoop). */
  var OFF_SLOTS = [[26, 0], [20, -15], [20, 15], [10, -10], [8, 8]];
  var DEF_SLOTS = [[22, 1.5], [16.5, -13], [16.5, 13], [8, -8], [6, 6]];

  function Court(container, game) {
    this.game = game;
    this.players = game.players;
    this.el = container;
    var H = game.matchup.home, A = game.matchup.away;
    var html = '<svg class="court" viewBox="0 0 94 50" role="img" aria-label="Basketball court showing the simulated game">' +
      '<defs><filter id="glow"><feGaussianBlur stdDeviation=".6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      courtMarkup() + '<g id="shotmarks"></g><g id="court-players"></g><circle id="court-ball" class="ball" r="1.1" cx="47" cy="25"/></svg>' +
      '<div class="court-banner" id="court-banner" aria-hidden="true"></div>';
    container.innerHTML = html;
    this.svg = container.querySelector('svg');
    this.gPlayers = container.querySelector('#court-players');
    this.gMarks = container.querySelector('#shotmarks');
    this.ball = container.querySelector('#court-ball');
    this.banner = container.querySelector('#court-banner');
    this.nodes = {};
    var self = this;
    this.players.forEach(function (p) {
      var t = p.teamIdx === 0 ? H : A;
      var g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'pl');
      g.style.transform = 'translate(47px,25px)';
      g.innerHTML = '<circle r="1.75" fill="' + t.color + '" stroke="#fff" stroke-width=".3"/><text y=".85" text-anchor="middle">' + p.num + '</text>';
      g.style.display = 'none';
      g.setAttribute('data-gid', p.gid);
      self.gPlayers.appendChild(g); self.nodes[p.gid] = g;
    });
    this.onCourt = [[], []];
    this.offTeam = 0; this.period = 1; this.moveMs = 700;
  }

  Court.prototype.dir = function (team, period) { // +1: attacking right hoop
    var homeRight = period <= 2;
    return (team === 0) === homeRight ? 1 : -1;
  };

  Court.prototype.setSpeed = function (speed) { this.speed = speed; this.moveMs = Math.round(700 / Math.max(1, speed)); this.svg.style.setProperty('--move', this.moveMs + 'ms'); };

  /** Place all ten players in a half-court set. offTeam attacks; defenders mirror. */
  Court.prototype.layout = function (offTeam, period) {
    this.offTeam = offTeam; this.period = period;
    var dir = this.dir(offTeam, period), hx = dir > 0 ? 88.75 : 5.25, self = this;
    [0, 1].forEach(function (t) {
      var slots = t === offTeam ? OFF_SLOTS : DEF_SLOTS;
      self.onCourt[t].forEach(function (gid, i) {
        var s = slots[i % 5], n = self.nodes[gid];
        n.style.display = '';
        n.style.transform = 'translate(' + (hx - dir * s[0]).toFixed(1) + 'px,' + (25 + s[1]).toFixed(1) + 'px)';
      });
    });
  };

  Court.prototype.setLineups = function (onCourt, offTeam, period) {
    var self = this;
    Object.keys(this.nodes).forEach(function (g) { self.nodes[g].style.display = 'none'; });
    this.onCourt = [onCourt[0].slice(), onCourt[1].slice()];
    this.layout(offTeam === undefined ? this.offTeam : offTeam, period || this.period);
  };

  Court.prototype.ballTo = function (x, y) { this.ball.style.transform = 'translate(' + (x - 47).toFixed(1) + 'px,' + (y - 25).toFixed(1) + 'px)'; };

  Court.prototype.mark = function (x, y, made) {
    var m = document.createElementNS(SVGNS, 'g');
    m.setAttribute('class', 'smark ' + (made ? 'made' : 'miss'));
    m.innerHTML = made ? '<circle cx="' + x + '" cy="' + y + '" r="1.3"/><path d="M' + (x - .6) + ' ' + y + ' l.5 .6 l.9 -1.2"/>'
                       : '<path d="M' + (x - .9) + ' ' + (y - .9) + ' l1.8 1.8 M' + (x + .9) + ' ' + (y - .9) + ' l-1.8 1.8"/>';
    this.gMarks.appendChild(m);
    var gm = this.gMarks;
    setTimeout(function () { if (m.parentNode === gm) gm.removeChild(m); }, 2200);
    while (this.gMarks.childNodes.length > 14) this.gMarks.removeChild(this.gMarks.firstChild);
  };

  Court.prototype.banner_ = function (text) {
    this.banner.textContent = text || '';
    this.banner.classList.toggle('show', !!text);
  };

  /** Animate one event. `live` is the live state AFTER the event. */
  Court.prototype.onEvent = function (ev, live) {
    var t = ev.type;
    if (t === 'tip' || t === 'startq') {
      this.setLineups(live.onCourt, ev.team, ev.q);
      this.ballTo(47, 25);
      this.banner_(t === 'startq' ? ev.text : '');
      return;
    }
    if (t === 'sub') {
      this.onCourt = [live.onCourt[0].slice(), live.onCourt[1].slice()];
      this.nodes[ev.out].style.display = 'none';
      this.layout(this.offTeam, this.period);
      return;
    }
    if (t === 'endq' || t === 'final' || t === 'timeout' || t === 'run') {
      this.banner_(t === 'run' || t === 'timeout' || t === 'endq' || t === 'final' ? ev.text : '');
      var self = this; clearTimeout(this._bt);
      if (t !== 'final') this._bt = setTimeout(function () { self.banner_(''); }, Math.max(1200, 2200 / (this.speed || 1)));
      return;
    }
    var dir = this.dir(this.offTeam, ev.q);
    if (t === 'made2' || t === 'made3' || t === 'miss2' || t === 'miss3' || t === 'block') {
      if (ev.team !== this.offTeam || ev.q !== this.period) this.layout(ev.team, ev.q);
      var shooter = t === 'block' ? ev.player2 : ev.player;
      var hx = dir > 0 ? 88.75 : 5.25;
      var node = this.nodes[shooter];
      if (node && ev.x !== undefined) {
        node.style.transform = 'translate(' + ev.x.toFixed(1) + 'px,' + ev.y.toFixed(1) + 'px)';
        this.ballTo(ev.x, ev.y);
        var self2 = this;
        setTimeout(function () { self2.ballTo(hx, 25); }, Math.min(260, this.moveMs * 0.4));
        this.mark(ev.x, ev.y, t.indexOf('made') === 0);
      }
      return;
    }
    if (t === 'rebound' || t === 'steal' || t === 'turnover' || t === 'foul' || t === 'ft') {
      var newOff = (t === 'rebound') ? ev.team : (t === 'steal' || t === 'turnover') ? 1 - ev.team : (t === 'foul') ? 1 - ev.team : ev.team;
      if (t === 'ft') { this.ballTo(dir > 0 ? 88.75 - 15 : 5.25 + 15, 25); return; }
      this.layout(newOff, ev.q);
      var holder = (t === 'rebound') ? ev.player : (t === 'steal') ? ev.player2 : (t === 'foul') ? ev.player2 : null;
      var pn = holder !== null && holder !== undefined && holder >= 0 ? this.nodes[holder] : null;
      if (pn && pn.style.transform) {
        var m = /translate\(([\d.\-]+)px,\s*([\d.\-]+)px\)/.exec(pn.style.transform);
        if (m) this.ballTo(parseFloat(m[1]), parseFloat(m[2]));
      }
    }
  };

  // ------------------------------------------------------------------ playback clock
  function Playback(game, hooks) {
    this.game = game; this.hooks = hooks;
    this.index = 0; this.gameTime = 0; this.speed = 1; this.playing = false; this.hold = 0; this.raf = 0; this.last = 0; this.finished = false;
    this._tick = this.tick.bind(this);
  }
  Playback.prototype.setSpeed = function (s) { this.speed = s; if (this.hooks.onSpeed) this.hooks.onSpeed(s); };
  Playback.prototype.play = function () {
    if (this.finished) return;
    this.playing = true; this.last = 0;
    if (!this.raf) this.raf = requestAnimationFrame(this._tick);
    if (this.hooks.onState) this.hooks.onState(true);
  };
  Playback.prototype.pause = function () {
    this.playing = false;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = 0; }
    if (this.hooks.onState) this.hooks.onState(false);
  };
  Playback.prototype.tick = function (ts) {
    this.raf = 0;
    if (!this.playing) return;
    var dt = this.last ? Math.min(0.1, (ts - this.last) / 1000) : 0;
    this.last = ts;
    if (this.hold > 0) { this.hold -= dt * this.speed; }
    else {
      this.gameTime += dt * this.speed * RATE;
      var ev = this.game.events, n = ev.length, processed = 0;
      while (this.index < n && ev[this.index].t <= this.gameTime && processed < 40) {
        var e = ev[this.index++]; processed++;
        this.hooks.onEvent(e, this.index);
        if (e.pause) { this.hold = e.pause; this.gameTime = Math.max(this.gameTime, e.t); break; }
        if (e.type === 'final') { this.finished = true; this.playing = false; this.hooks.onEnd(); if (this.hooks.onState) this.hooks.onState(false); return; }
      }
    }
    if (this.hooks.onTick) this.hooks.onTick(this.clockInfo());
    this.raf = requestAnimationFrame(this._tick);
  };
  Playback.prototype.clockInfo = function () {
    var ev = this.game.events, i = this.index, last = ev[i - 1], next = ev[i], total = this.game.totalTime || 1;
    var period = last ? last.q : 1, clock = last ? last.clock : this.game.quarterSeconds;
    if (last && next && next.q === last.q && next.t > last.t && last.type !== 'endq') {
      var f = Math.max(0, Math.min(1, (this.gameTime - last.t) / (next.t - last.t)));
      clock = last.clock + (next.clock - last.clock) * f;
    } else if (last && last.type === 'endq') { clock = 0; }
    return { period: period, clock: clock, progress: Math.min(1, this.gameTime / total), holding: this.hold > 0 };
  };
  /** Jump to a position (rebuilds everything silently through hooks.onSeek). */
  Playback.prototype.seek = function (index) {
    var ev = this.game.events;
    index = Math.max(0, Math.min(ev.length, index));
    this.index = index; this.gameTime = index > 0 ? ev[index - 1].t : 0; this.hold = 0;
    this.finished = index >= ev.length;
    this.hooks.onSeek(index);
    if (this.finished) { this.pause(); this.hooks.onEnd(); }
  };
  Playback.prototype.seekToPeriod = function (q) {
    var ev = this.game.events;
    for (var i = 0; i < ev.length; i++) if (ev[i].type === 'startq' && ev[i].q === q) { this.seek(i + 1); return true; }
    return false;
  };
  Playback.prototype.destroy = function () { this.pause(); };

  PL.Court = Court;
  PL.Playback = Playback;
  PL.PLAY_RATE = RATE;
})(typeof window !== 'undefined' ? window : globalThis);
