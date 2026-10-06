/* app.js — boot, navigation, chrome (header, sky, points, pace). */
import config from '../config.js';
import content from '../content/index.js';
import { Session, studentKey } from './engine/session.js';
import { buildPlan } from './engine/plan.js';
import { estimateSeconds, INTRO_SECONDS } from './engine/timing.js';
import { settings } from './ui/settings.js';
import { h, $, clear, announce, openDialog } from './ui/dom.js';
import { renderItem, renderExplore } from './ui/runner.js';
import { screens } from './ui/screens.js';
import { checkClassCode, queueFinal, startRetryLoop } from './engine/sync.js';
import { completionCode } from './engine/code.js';
import { plain } from './ui/dom.js';
import { initSky, setSky } from './ui/sky.js';

const cfg = config;
const root = $('#app');

export const app = {
  cfg, content, session: null, plan: null, retry: null,

  /* ---------- lifecycle ---------- */
  boot() {
    settings.apply();
    $('#brandName').textContent = cfg.appTitle;
    document.title = `${cfg.appTitle} — ${cfg.unitName}`;
    initSky();
    wireDialogs();
    const sk = Session.activeKey(cfg);
    const existing = sk ? Session.load(cfg, sk) : null;
    if (existing) { this.session = existing; this.plan = buildPlan(content, existing, cfg); }
    screens.welcome(this, existing);
    this.chrome();
  },

  async start(student, { retakeOf } = {}) {
    const check = await checkClassCode(cfg, student);
    if (!check.ok) return check;
    const sk = studentKey(student);
    const local = Session.load(cfg, sk);
    const override = cfg.studentOverrides[`${`${student.first} ${student.last}`.trim().toLowerCase().replace(/\s+/g, ' ')}|${String(student.period).toLowerCase()}`] || null;
    if (check.status === 'duplicate' && !(local && local.status === 'final')) return { ok: false, reason: 'duplicate' };
    if (local && local.status === 'final') {
      const serverSaysNew = check.via === 'server' && check.status === 'new';
      const allowed = serverSaysNew || (override && override.retakeAllowed);
      if (!allowed) { this.session = local; this.plan = buildPlan(content, local, cfg); return { ok: true, resumed: 'final' }; }
      Session.remove(cfg, sk);
      return this.begin(student, check, (local.retakeNo || 0) + 1, override);
    }
    if (local) { this.session = local; this.plan = buildPlan(content, local, cfg); settings.applyOverride(override); return { ok: true, resumed: 'progress' }; }
    void retakeOf;
    return this.begin(student, check, 0, override);
  },

  begin(student, check, retakeNo, override) {
    const sess = Session.create(student, cfg, { retakeNo, codeVerified: check.via, settings: override || {} });
    settings.applyOverride(override);
    this.session = sess; this.plan = buildPlan(content, sess, cfg);
    sess.save();
    return { ok: true, resumed: null };
  },

  switchStudent() {
    Session.clearActive(cfg);
    this.session = null; this.plan = null;
    setSky(0);
    screens.welcome(this, null);
    this.chrome();
  },

  /* ---------- navigation ---------- */
  render() {
    const s = this.session;
    if (!s) return screens.welcome(this, null);
    if (s.status === 'final') { this.chrome(); return screens.final(this); }
    const { station, step, phase } = s.pos;
    const st = this.plan.stations[station];
    clear(root);
    window.scrollTo(0, 0);
    this.chrome();
    if (phase === 'intro') return screens.stationIntro(this, st);
    if (phase === 'end') return screens.stationEnd(this, st);
    const rec = st.steps[step];
    const view = rec.explore ? renderExplore(this, rec, root) : renderItem(this, rec, root);
    requestAnimationFrame(() => view.focus && view.focus());
  },

  go(pos) { this.session.pos = { ...this.session.pos, ...pos }; this.session.touch(); this.session.save(); this.render(); },

  beginStation() { this.go({ phase: 'item', step: 0 }); },

  next() {
    const s = this.session; const st = this.plan.stations[s.pos.station];
    if (s.pos.step < st.steps.length - 1) return this.go({ step: s.pos.step + 1 });
    s.stationsDone[s.pos.station] = true;
    return this.go({ phase: 'end' });
  },

  /** After skipping, move past the whole scene (or just the one question). */
  skipPast(rec) {
    const st = this.plan.stations[this.session.pos.station];
    const nxt = st.steps.findIndex((r, i) => i > rec.step && (!rec.blockId || r.blockId !== rec.blockId));
    if (nxt < 0) { this.session.stationsDone[this.session.pos.station] = true; return this.go({ phase: 'end' }); }
    return this.go({ step: nxt });
  },

  nextStation() {
    const s = this.session;
    s.stationsDone[s.pos.station] = true;
    if (s.pos.station >= this.plan.stations.length - 1) return this.finish();
    this.go({ station: s.pos.station + 1, step: 0, phase: 'intro' });
  },

  afterAttempt() { this.session.save(); this.chrome(); },
  afterAnswer() { this.session.save(); this.chrome(true); },

  /* ---------- finishing ---------- */
  finish() {
    const s = this.session;
    s.endedAt = Date.now(); s.touch();
    const t = s.totals(this.plan);
    s.result = { percent: t.percent, earned: t.earned, possible: t.possible, byStation: t.byStation, byTopic: t.byTopic };
    s.completion = completionCode({ first: s.student.first, last: s.student.last, code: s.student.code, percent: t.percent, earned: t.earned, endedAt: s.endedAt });
    s.status = 'final';
    s.save();
    queueFinal(cfg, this.payload());
    this.retry = startRetryLoop(cfg, (r) => { s.sent = r.pending === 0 && !r.noBackend; s.save(); screens.updateSync && screens.updateSync(this, r); });
    this.render();
  },

  payload() {
    const s = this.session; const t = s.result;
    const items = this.plan.all.map(r => {
      const st = s.items[r.id] || { attempts: [], earned: 0 };
      return {
        id: r.id, station: r.station, topic: r.topic, label: plain(r.item.prompt).slice(0, 90),
        points: r.points, earned: st.earned, attempts: st.attempts.length,
        first: st.skipped ? '' : (st.attempts[0] && st.attempts[0].fraction >= 1 ? 1 : 0),
        skipped: !!st.skipped, firstWrong: st.skipped ? '' : (st.firstWrong || ''),
      };
    });
    return {
      v: 1, assessmentVersion: cfg.assessmentVersion, student: s.student, retakeNo: s.retakeNo,
      startedAt: s.startedAt, endedAt: s.endedAt, totalSeconds: Math.round((s.endedAt - s.startedAt) / 1000),
      activeSeconds: Math.round(s.activeMs / 1000),
      percent: t.percent, earned: t.earned, possible: t.possible, completion: s.completion,
      codeVerified: s.codeVerified, stations: t.byStation, topics: t.byTopic,
      skips: items.filter(i => i.skipped).length, helpOpens: s.helpOpens, items,
    };
  },

  /* ---------- chrome: header, progress, sky, pace ---------- */
  secondsFor(rec) { return rec.explore ? 30 : estimateSeconds(rec.item, content.passages); },

  chrome(animatePts) {
    const s = this.session, p = this.plan;
    const active = s && s.status !== 'final' && p;
    $('#barMid').hidden = !s;
    $('#trailBtn').hidden = !(s && p);
    if (!s || !p) { setSky(0); return; }
    const total = p.all.length;
    const done = p.all.filter(r => s.items[r.id] && s.items[r.id].done).length;
    const frac = s.status === 'final' ? 1 : done / total;
    setSky(frac);
    const pr = $('#progress'); pr.setAttribute('aria-valuenow', String(Math.round(frac * 100)));
    $('#progressFill').style.width = Math.round(frac * 100) + '%';
    const st = p.stations[Math.min(s.pos.station, p.stations.length - 1)];
    $('#stationChip').textContent = s.status === 'final' ? 'Sunrise reached' : `Station ${st.num} of ${p.stations.length}`;
    const earned = s.totals(p).earned;
    const pts = $('#ptsChip'); pts.hidden = false;
    const val = $('#ptsVal');
    const target = Math.round(earned * 10) / 10;
    if (animatePts && !settings.reducedMotion()) countTo(val, parseFloat(val.textContent) || 0, target);
    else val.textContent = String(target);
    // gentle pace hint (never a cutoff)
    const pace = $('#paceChip');
    const ov = s.settings || {};
    const showPace = cfg.features.paceIndicator && !ov.extendedTime && s.status !== 'final';
    pace.hidden = !showPace;
    if (showPace) {
      let sec = 0;
      const passed = (stn, r) => stn.index < s.pos.station || (stn.index === s.pos.station && (s.pos.phase === 'end' || r.step < s.pos.step));
      p.stations.forEach(stn => {
        if (stn.index >= s.pos.station && !(stn.index === s.pos.station && s.pos.phase !== 'intro')) sec += INTRO_SECONDS;
        stn.steps.forEach(r => {
          const d = r.explore ? passed(stn, r) : !!(s.items[r.id] && s.items[r.id].done);
          if (!d) sec += this.secondsFor(r);
        });
      });
      const min = Math.round(sec / 60);
      pace.textContent = min <= 1 ? 'Almost there' : `About ${min} min left at a typical pace`;
    }
  },
};

function countTo(el, from, to) {
  const t0 = performance.now(), dur = 600;
  const f = (now) => { const k = Math.min(1, (now - t0) / dur); el.textContent = String(Math.round((from + (to - from) * k) * 10) / 10); if (k < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}

/* ---------- dialogs ---------- */
function wireDialogs() {
  document.querySelectorAll('dialog').forEach(d => {
    d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    d.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => d.close()));
    d.addEventListener('close', () => { d._release && d._release(); d._opener && d._opener.focus && d._opener.focus(); });
  });
  $('#helpBtn').addEventListener('click', (e) => {
    if (app.session) { app.session.helpOpens++; app.session.save(); }
    openDialog($('#help'), e.currentTarget);
  });
  $('#settingsBtn').addEventListener('click', (e) => { screens.settings(app); openDialog($('#settings'), e.currentTarget); });
  $('#trailBtn').addEventListener('click', (e) => { screens.trailDialog(app); openDialog($('#trail'), e.currentTarget); });
  $('#sourcesBtn').addEventListener('click', (e) => { screens.sources(app); openDialog($('#sources'), e.currentTarget); });
}

window.__WWT__ = { app, cfg };  // used by automated tests only
app.boot();
