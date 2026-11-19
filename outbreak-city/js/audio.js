/* OUTBREAK CITY: synthesized sound effects (Web Audio API, no files).
   Audio only starts after the first click/tap (browser rule). */
(function (root) {
  'use strict';
  var NS = root.OutbreakCity = root.OutbreakCity || {};

  function Sfx(settings) {
    this.settings = settings;
    this.ctx = null; this.master = null; this.noiseBuf = null;
    this.last = {};
  }
  var S = Sfx.prototype;

  S.unlock = function () {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ctx.destination);
      var len = this.ctx.sampleRate * 0.5, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    } catch (e) { this.ctx = null; }
  };

  S.ok = function (name, gap) {
    if (!this.ctx || this.settings.muted) return false;
    var now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < (gap || 0.05)) return false;
    this.last[name] = now;
    return true;
  };

  S.tone = function (freq, dur, type, vol, slide, delay) {
    var c = this.ctx, t = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.3, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  };
  S.noise = function (dur, vol, freq, q, delay) {
    var c = this.ctx, t = c.currentTime + (delay || 0);
    var s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noiseBuf; f.type = 'bandpass'; f.frequency.value = freq || 1500; f.Q.value = q || 0.8;
    g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t); s.stop(t + dur + 0.02);
  };

  S.play = function (name) {
    var self = this;
    switch (name) {
      case 'shot': if (this.ok(name, 0.07)) { this.noise(0.09, 0.22, 1800, 0.6); this.tone(140, 0.08, 'square', 0.06, 0.5); } break;
      case 'kill': if (this.ok(name, 0.12)) { this.noise(0.2, 0.15, 400, 0.7); this.tone(110, 0.18, 'sine', 0.1, 0.6); } break;
      case 'stray': if (this.ok(name, 0.3)) { this.tone(520, 0.12, 'square', 0.12, 0.7); this.tone(330, 0.3, 'square', 0.1, 0.8, 0.12); } break;
      case 'groan': if (this.ok(name, 1.4)) { this.tone(95 + Math.random() * 30, 0.7, 'sawtooth', 0.05, 0.75); } break;
      case 'reveal': if (this.ok(name, 0.25)) { this.tone(880, 0.12, 'sine', 0.12); this.tone(1320, 0.16, 'sine', 0.09, 1, 0.07); } break;
      case 'vax': if (this.ok(name, 0.18)) { this.tone(1046, 0.1, 'triangle', 0.08); } break;
      case 'cure': if (this.ok(name, 0.3)) { [523, 659, 784].forEach(function (f, i) { self.tone(f, 0.22, 'sine', 0.1, 1, i * 0.06); }); } break;
      case 'build': if (this.ok(name, 0.1)) { this.noise(0.12, 0.25, 300, 1); this.tone(180, 0.15, 'triangle', 0.15, 0.7); } break;
      case 'upgrade': if (this.ok(name, 0.2)) { [523, 659, 784, 1046].forEach(function (f, i) { self.tone(f, 0.14, 'triangle', 0.1, 1, i * 0.05); }); } break;
      case 'click': if (this.ok(name, 0.04)) this.tone(660, 0.05, 'triangle', 0.07); break;
      case 'error': if (this.ok(name, 0.2)) { this.tone(180, 0.18, 'square', 0.08, 0.8); } break;
      case 'wave': if (this.ok(name, 1)) { this.tone(440, 0.9, 'sawtooth', 0.06, 1.6); this.tone(660, 0.9, 'sawtooth', 0.05, 0.6, 0.9); } break;
      case 'briefing': if (this.ok(name, 1)) { this.noise(0.25, 0.1, 3000, 0.5); [392, 494, 587].forEach(function (f, i) { self.tone(f, 0.5, 'sine', 0.07, 1, i * 0.03); }); } break;
      case 'barricade': if (this.ok(name, 0.3)) { this.noise(0.35, 0.3, 200, 0.6); } break;
      case 'win': if (this.ok(name, 2)) { [523, 659, 784, 1046, 1318].forEach(function (f, i) { self.tone(f, 0.4, 'triangle', 0.1, 1, i * 0.12); }); } break;
      case 'lose': if (this.ok(name, 2)) { [392, 349, 311, 262].forEach(function (f, i) { self.tone(f, 0.5, 'sawtooth', 0.06, 1, i * 0.22); }); } break;
      case 'boom': if (this.ok(name, 0.25)) { this.noise(0.35, 0.3, 160, 0.7); this.tone(70, 0.3, 'sine', 0.18, 0.5); } break;
      case 'scream': if (this.ok(name, 1.5)) { this.tone(1400, 0.5, 'sawtooth', 0.04, 0.6); this.tone(1900, 0.4, 'square', 0.025, 0.7, 0.05); } break;
      case 'nuke': if (this.ok(name, 5)) { this.tone(600, 1.2, 'sine', 0.06, 0.4); } break;
      case 'boomBig': if (this.ok(name, 5)) { this.noise(2.5, 0.6, 90, 0.5); this.tone(45, 2.5, 'sine', 0.3, 0.5); this.noise(1.5, 0.3, 400, 0.6, 0.2); } break;
      case 'alert': if (this.ok(name, 0.8)) { this.tone(740, 0.15, 'square', 0.06); this.tone(740, 0.15, 'square', 0.06, 1, 0.22); } break;
    }
  };


  /* Ambient loops: fire and helicopter. Built once, then only their volumes move,
     so they cost almost nothing (Web Audio mixes on its own thread). */
  S.buildAmbient = function () {
    var c = this.ctx, sr = c.sampleRate, i;
    var out = this.amb = {};
    // fire: a low roar (filtered noise)...
    var roar = c.createBufferSource(); roar.buffer = this.noiseBuf; roar.loop = true;
    var lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
    out.fireRoar = c.createGain(); out.fireRoar.gain.value = 0;
    roar.connect(lp); lp.connect(out.fireRoar); out.fireRoar.connect(this.master); roar.start();
    // ...plus crackle: a 3-second loop of random pops
    var len = sr * 3, cb = c.createBuffer(1, len, sr), d = cb.getChannelData(0), r = 12345;
    var rnd = function () { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
    for (var k = 0; k < 140; k++) {
      var at = Math.floor(rnd() * (len - 400)), amp = 0.3 + rnd() * 0.7, dur = 40 + Math.floor(rnd() * 260);
      for (i = 0; i < dur; i++) d[at + i] += (rnd() * 2 - 1) * amp * Math.exp(-i / (dur * 0.25));
    }
    var crk = c.createBufferSource(); crk.buffer = cb; crk.loop = true;
    var hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    out.fireCrackle = c.createGain(); out.fireCrackle.gain.value = 0;
    crk.connect(hp); hp.connect(out.fireCrackle); out.fireCrackle.connect(this.master); crk.start();
    // helicopter: low noise chopped by a ~13 Hz rotor beat
    var hn = c.createBufferSource(); hn.buffer = this.noiseBuf; hn.loop = true;
    var hlp = c.createBiquadFilter(); hlp.type = 'lowpass'; hlp.frequency.value = 340;
    var chop = c.createGain(); chop.gain.value = 0.5;
    var lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 13;
    var lfoAmt = c.createGain(); lfoAmt.gain.value = 0.5; lfo.connect(lfoAmt); lfoAmt.connect(chop.gain); lfo.start();
    out.heli = c.createGain(); out.heli.gain.value = 0;
    hn.connect(hlp); hlp.connect(chop); chop.connect(out.heli); out.heli.connect(this.master); hn.start();
  };

  // fire, heli: 0..1 loudness wanted right now
  S.ambient = function (fire, heli) {
    if (!this.ctx || !this.noiseBuf) return;
    if (!this.amb) { if (fire <= 0 && heli <= 0) return; this.buildAmbient(); }
    var off = this.settings.muted || this.settings.lowFx, t = this.ctx.currentTime;
    this.amb.fireRoar.gain.setTargetAtTime(off ? 0 : fire * 0.22, t, 0.4);
    this.amb.fireCrackle.gain.setTargetAtTime(off ? 0 : fire * 0.3, t, 0.4);
    this.amb.heli.gain.setTargetAtTime(off ? 0 : heli * 0.2, t, 0.5);
  };

  NS.Sfx = Sfx;
})(typeof window !== 'undefined' ? window : globalThis);
