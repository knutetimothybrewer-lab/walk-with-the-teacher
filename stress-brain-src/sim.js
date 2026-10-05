/* Stress model: stressors -> amygdala -> sympathetic / HPA -> body, with parasympathetic recovery
   and slow "wear & tear" (allostatic load). All values are 0..1 unless noted. Time is compressed. */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const SIM = {
  t: 0, days: 0, lapse: 0,
  st: {}, cp: {},                // active stressors {on,level,until} / coping {on,until}
  A: 0.03, SNS: 0.05, PNS: 0.85, Ad: 0, Co: 0.05, L: 0, R: 0.2,
  out: {}, log: [], listeners: [],
  chain: { t0: -99 },            // alarm animation start time
  say(txt, kind) { this.log.unshift({ t: this.t, txt, kind: kind || 'info' }); this.log.length = Math.min(this.log.length, 12); this.emit('log', txt); },
  on(fn) { this.listeners.push(fn); },
  emit(ev, data) { this.listeners.forEach(f => f(ev, data)); },
  stressor(id) { return SB.STRESSORS.find(s => s.id === id); },
  coper(id) { return SB.COPING.find(s => s.id === id); },
  toggleStress(id, force) {
    const d = this.stressor(id); if (!d) return;
    const cur = this.st[id] && this.st[id].on;
    const on = force === undefined ? !cur : force;
    if (on && !cur) {
      if (id === 'sleep' && this.cp.sleepgood && this.cp.sleepgood.on) { this.say('You are protecting your sleep, so short sleep can\'t be on at the same time.', 'info'); return; }
      this.st[id] = { on: true, level: (this.st[id] && this.st[id].level) || 1, until: this.t + (d.dur || 0) };
      this.say(d.log, 'stress'); this.startChain(); this.emit('stressOn', d);
    } else if (!on && cur) {
      this.st[id].on = false; this.say('Removed: ' + d.name + '.', 'calm'); this.emit('stressOff', d);
    }
    this.emit('change');
  },
  setLevel(id, v) { if (this.st[id]) { this.st[id].level = v; this.emit('level'); } },
  toggleCope(id, force) {
    const d = this.coper(id); if (!d) return;
    const cur = this.cp[id] && this.cp[id].on;
    const on = force === undefined ? !cur : force;
    if (on && !cur) {
      this.cp[id] = { on: true, until: d.dur ? this.t + d.dur : 0 };
      if (id === 'sleepgood' && this.st.sleep && this.st.sleep.on) { this.st.sleep.on = false; }
      this.say(d.log, 'calm'); this.emit('copeOn', d);
    } else if (!on && cur) { this.cp[id].on = false; }
    this.emit('change');
  },
  clearStress() { Object.keys(this.st).forEach(k => this.st[k].on = false); this.say('All stressors removed. Now recovery can take over.', 'calm'); this.emit('change'); },
  clearCope() { Object.keys(this.cp).forEach(k => this.cp[k].on = false); this.emit('change'); },
  reset() { this.st = {}; this.cp = {}; this.A = 0.03; this.SNS = 0.05; this.PNS = 0.85; this.Ad = 0; this.Co = 0.05; this.L = 0; this.days = 0; this.lapse = 0; this.chain.t0 = -99; this.say('Brain reset to a calm baseline.', 'calm'); this.emit('change'); },
  skip(days) { this.lapse += days; this.say('Time passes… ' + days + ' days, with the same stressors and coping tools.', 'info'); this.emit('change'); },
  startChain() { if (this.t - this.chain.t0 > 2.5) { this.chain.t0 = this.t; this.emit('chain'); } },
  activeStress() { return SB.STRESSORS.filter(s => this.st[s.id] && this.st[s.id].on); },
  activeCope() { return SB.COPING.filter(c => this.cp[c.id] && this.cp[c.id].on); },
  /* Alarm chain progress: 0..4 steps lit */
  chainStep() {
    const e = this.t - this.chain.t0, forced = e < 3.2 ? (e > 2.4 ? 4 : e > 1.5 ? 3 : e > 0.7 ? 2 : e >= 0 ? 1 : 0) : 4;
    const live = (this.A > 0.12 ? 1 : 0) + (this.A > 0.2 ? 1 : 0) + ((this.Ad > 0.15 || this.Co > 0.15) ? 1 : 0) + (this.SNS > 0.2 ? 1 : 0);
    return Math.min(forced, live);
  },
  tick(dt) {
    dt = Math.min(dt, 0.05);
    const lapsing = this.lapse > 0.001;
    this.t += dt;
    let dDays = 0.04 * dt;
    let boost = 1;
    if (lapsing) { dDays = Math.min(this.lapse, 2.2 * dt); this.lapse -= dDays; boost = 14; }
    this.days += dDays;
    // expire timed items
    for (const s of SB.STRESSORS) { const x = this.st[s.id]; if (x && x.on && s.acute && this.t > x.until) { x.on = false; this.say(s.name + ' is over. The brake can take over now.', 'calm'); } }
    for (const c of SB.COPING) { const x = this.cp[c.id]; if (x && x.on && c.dur && this.t > x.until) { x.on = false; this.emit('change'); } }
    // demand
    let Draw = 0;
    for (const s of SB.STRESSORS) {
      const x = this.st[s.id]; if (!x || !x.on) continue;
      if (s.acute && lapsing) continue;
      if (s.id === 'sleep' && this.cp.sleepgood && this.cp.sleepgood.on) continue;
      Draw += s.w * x.level;
    }
    let dm = 1, rec = 0.2;
    for (const c of SB.COPING) {
      const x = this.cp[c.id]; if (!x || !x.on) continue;
      if (c.dem) dm *= (1 - c.dem);
      if (c.rec) rec += c.rec;
    }
    this.demandMult = Math.max(0.35, dm);
    const R = this.R = clamp(rec);
    let D = (1 - Math.exp(-1.1 * Draw)) * (1 + 0.5 * this.L);
    const Deff = clamp(D * this.demandMult);
    this.Draw = Draw; this.Deff = Deff;
    const f = (cur, tar, up, down) => cur + (tar - cur) * (1 - Math.exp(-(tar > cur ? up : down) * dt * boost));
    this.A = f(this.A, Deff, 2.2, 0.30 + 0.9 * R);
    this.SNS = f(this.SNS, clamp(this.A * 1.05 - 0.12 * R), 1.6, 0.45 + 0.9 * R);
    this.PNS = f(this.PNS, clamp(0.8 - 0.75 * this.SNS + 0.25 * R), 0.25 + 0.8 * R, 1.2);
    this.Ad = f(this.Ad, Math.pow(this.SNS, 1.3), 1.8, 0.8);
    this.Co = f(this.Co, clamp(this.A * 0.95 + 0.15 * this.L), 0.22, 0.05 + 0.3 * R);
    // wear & tear (per simulated day)
    const up = 0.06 * Math.max(0, this.SNS - 0.3) * (1 - 0.6 * R);
    const down = 0.06 * (0.2 + R) * (this.SNS < 0.3 ? 1 : 0.3);
    this.L = clamp(this.L + (up - down) * dDays * (lapsing ? 1 : 1));
    this.derive();
  },
  derive() {
    const { A, SNS, PNS, Ad, Co, L } = this, o = this.out;
    o.hr = 68 + 82 * SNS + 6 * (0.6 - PNS);
    o.rr = 13 + 17 * SNS;
    o.sys = 108 + 40 * SNS + 10 * L; o.dia = 68 + 18 * SNS + 6 * L;
    o.digest = clamp(1 - 0.85 * SNS + 0.2 * PNS - 0.1);
    o.tension = clamp(0.08 + 0.85 * SNS + 0.25 * L);
    o.attention = clamp(SNS * 0.95);                  // 0 broad -> 1 narrow
    o.arousal = Math.max(SNS, A * 0.9);
    o.perf = clamp((0.3 + 0.7 * Math.exp(-Math.pow((o.arousal - 0.38) / 0.3, 2))) * (1 - 0.4 * L));
    o.pfc = clamp(1 - (0.50 * SNS + 0.30 * Co + 0.35 * L), 0.08, 1);
    o.memory = clamp(1 - (0.40 * Co + 0.45 * L), 0.08, 1);
    o.mood = clamp(1 - (A * 0.5 + L * 0.5));
    o.sleepQ = clamp(0.92 - 0.45 * Co - 0.40 * L, 0.05, 1);
    o.immune = clamp(1 - 0.25 * Co - 0.7 * L, 0.05, 1);
    o.amySens = clamp(L);
    o.moodLabel = A < 0.12 && L < 0.2 ? 'Calm' : (L > 0.55 && A < 0.5 ? 'Worn down' : A < 0.3 ? 'Alert' : A < 0.55 ? 'Tense' : A < 0.78 ? 'Anxious' : 'Overwhelmed');
    o.state = SNS > 0.3 && SNS > PNS ? 'Gas pedal on (sympathetic)' : PNS > 0.5 ? 'Brake pedal on (parasympathetic)' : 'Shifting…';
  },
  thought() {
    const act = this.activeStress().sort((a, b) => b.w - a.w);
    const cp = this.activeCope();
    if (this.cp.breath && this.cp.breath.on && this.A < 0.6) return 'In… and out. Okay. I can think again.';
    if (act.length && this.SNS > 0.25) {
      if (this.L > 0.55) return 'I\'m so tired of this. I can\'t focus and everything feels like too much.';
      return act[0].say;
    }
    if (cp.length && this.L > 0.1) return 'Things feel more manageable. My body is settling down.';
    if (this.L > 0.5) return 'I\'m wiped out, even though nothing is happening right now.';
    if (this.A > 0.1 || this.SNS > 0.15) return 'Okay… it\'s over. My heart is still pounding.';
    return 'I feel okay. Ready for the day.';
  }
};
SIM.derive();
