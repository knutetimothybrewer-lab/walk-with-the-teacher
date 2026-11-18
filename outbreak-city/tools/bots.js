// Headless balance bots: node tools/bots.js [seeds] [difficulty] [quick]
// Strategies: nothing, shooter (militia only, tough-guy choices), shooterNeutral
// (militia only, mild choices), balanced (full public-health toolkit), random.
const NS = require('./load.js')();
const D = NS.data;

const CHOICES = {
  tough: { honesty: 1, curfew: 0, schools: 2, masks: 2, donors: 0, batch: 0, rumor: 1, stockpile: 1, patrol: 0, surge: 2, stadium: 0,
    influencer: 2, gates: 0, sickleave: 1, research: 1, hoarding: 1, mall: 0, app: 0, transit: 0, volunteers: 1, inspector: 1,
    language: 1, premium: 0, memorial: 1, families: 1, evictions: 1, blame: 2, neighbor: 1, wastewater: 1, bounty: 0 },
  good: { honesty: 0, curfew: 1, schools: 1, masks: 1, donors: 1, batch: 2, rumor: 0, stockpile: 0, patrol: 1, surge: 0, stadium: 1,
    influencer: 0, gates: 1, sickleave: 0, research: 0, hoarding: 0, mall: 1, app: 1, transit: 2, volunteers: 0, inspector: 0,
    language: 0, premium: 1, memorial: 0, families: 0, evictions: 0, blame: 0, neighbor: 0, wastewater: 0, bounty: 1 }
};

function candidates(g, type, district) {
  const def = D.TOWERS[type], out = [];
  const r = def.range, r2 = r * r;
  for (let ty = 1; ty < g.H - 1; ty++) for (let tx = 1; tx < g.W - 1; tx++) {
    const i = ty * g.W + tx;
    if (district !== undefined && g.city.district[i] !== district) continue;
    const save = g.budget; g.budget = 1e9; const ok = g.canPlace(type, tx, ty).ok; g.budget = save;
    if (!ok) continue;
    let pop = 0;
    for (const b of g.blds) { const dx = b.cx - tx - 0.5, dy = b.cy - ty - 0.5; if (dx * dx + dy * dy <= r2) pop += b.S + b.V + b.R + b.E + b.Ek; }
    // spread out from same-type towers
    let near = 0;
    for (const tw of g.towers) if (tw.type === type) { const dx = tw.x - tx - 0.5, dy = tw.y - ty - 0.5; if (dx * dx + dy * dy < (r * 1.6) ** 2) near++; }
    out.push({ tx, ty, score: pop / (1 + near * 3) });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}
function placeBest(g, type, district) {
  if (g.budget < g.placeCost(type)) return false;
  const c = candidates(g, type, district);
  for (const k of c.slice(0, 5)) if (g.place(type, k.tx, k.ty).ok) return true;
  return false;
}
function placeNearEntries(g, type) {
  if (g.budget < g.placeCost(type)) return false;
  const plan = g.plans[Math.min(g.wave, g.plans.length - 1)];
  const c = candidates(g, type).map(k => {
    let s = 0;
    for (const e of plan.entries) { const ex = e % g.W, ey = (e / g.W) | 0; const d = Math.hypot(ex - k.tx, ey - k.ty); s += d < 5 ? 1 / (1 + d) : 0; }
    // avoid stacking turrets on the same entrance
    for (const tw of g.towers) if (tw.type === type) { const d = Math.hypot(tw.x - k.tx - 0.5, tw.y - k.ty - 0.5); if (d < 4) s *= 0.3; }
    return { tx: k.tx, ty: k.ty, score: s };
  }).filter(k => k.score > 0).sort((a, b) => b.score - a.score);
  for (const k of c.slice(0, 5)) if (g.place(type, k.tx, k.ty).ok) return true;
  return false;
}
function upgradeAny(g, types) {
  for (const type of types) for (const tw of g.towers) if (tw.type === type) {
    const c = g.upgradeCost(tw); if (c !== null && g.budget >= c) { g.upgrade(tw.id); return true; }
  }
  return false;
}
let rs = 12345; const rnd = () => ((rs = (rs * 1103515245 + 12345) >>> 0) / 4294967296);
const DI = {}; D.DISTRICTS.forEach((d, i) => DI[d.id] = i);

const STRATS = {
  nothing: { build() {}, choose: (g, card) => card.options.length - 1 },
  shooter: {
    build(g) { let guard = 0; while (guard++ < 40 && (placeBest(g, 'militia') || upgradeAny(g, ['militia']))); },
    choose: (g, card) => CHOICES.tough[card.id] ?? 0
  },
  shooterNeutral: {
    build(g) { let guard = 0; while (guard++ < 40 && (placeBest(g, 'militia') || upgradeAny(g, ['militia']))); },
    choose: (g, card) => card.options.length - 1
  },
  balanced: {
    init(g) {
      this.q = [
        ['lab', 'down'], ['lab', 'east'], ['clinic', 'east'], ['militia'],
        ['hospital', 'down'], ['clinic', 'down'], ['lab', 'sub'], ['chw', 'east'],
        ['radio', 'down'], ['lab', 'port'], ['clinic', 'sub'], ['up:lab'], ['lab', 'hill'], ['hospital', 'east'], ['clinic', 'port'],
        ['pantry', 'east'], ['up:lab'], ['clinic', 'hill'], ['radio', 'east'], ['militia'], ['chw', 'port'], ['up:lab'],
        ['hospital', 'sub'], ['pantry', 'port'], ['militia']
      ];
    },
    build(g) {
      if (!this.q) (this.init || STRATS.balanced.init).call(this, g);
      let guard = 0;
      while (this.q.length && guard++ < 30) {
        const [type, d] = this.q[0];
        if (type.startsWith('up:')) { if (upgradeAny(g, [type.slice(3)])) { this.q.shift(); continue; } if (g.budget < 120) break; this.q.shift(); continue; }
        if (type === 'gate') { if (g.budget < 60) break; placeNearEntries(g, 'militia') || placeBest(g, 'militia'); this.q.shift(); continue; }
        if (g.budget < g.placeCost(type)) break;
        if (placeBest(g, type, d === undefined ? undefined : DI[d]) || placeBest(g, type)) this.q.shift(); else this.q.shift();
      }
      if (!this.q.length) { guard = 0; while (guard++ < 20 && upgradeAny(g, ['lab', 'clinic', 'hospital', 'chw', 'radio'])); }
    },
    choose: (g, card) => CHOICES.good[card.id] ?? 0
  },
  expert: {
    init(g) {
      this.q = [
        ['lab', 'down'], ['lab', 'east'], ['clinic', 'east'], ['clinic', 'down'], ['gate'],
        ['up:lab'], ['gate'], ['hospital', 'east'], ['chw', 'east'], ['lab', 'sub'], ['up:lab'], ['clinic', 'sub'], ['gate'],
        ['radio', 'down'], ['lab', 'port'], ['hospital', 'down'], ['clinic', 'port'], ['gate'], ['up:clinic'], ['lab', 'hill'],
        ['pantry', 'east'], ['up:lab'], ['chw', 'port'], ['clinic', 'hill'], ['gate'], ['up:lab'], ['radio', 'east'], ['up:hospital'], ['gate'], ['hospital', 'sub']
      ];
    },
    build(g) { return STRATS.balanced.build.call(this, g); },
    choose: (g, card) => CHOICES.good[card.id] ?? 0
  },
  rich: {
    init(g) {
      this.q = [['lab', 'hill'], ['clinic', 'hill'], ['hospital', 'hill'], ['lab', 'down'], ['clinic', 'sub'], ['lab', 'sub'], ['clinic', 'down'],
        ['hospital', 'sub'], ['radio', 'hill'], ['up:clinic'], ['up:lab'], ['clinic', 'hill'], ['up:clinic'], ['hospital', 'down'], ['up:lab']];
    },
    build(g) { return STRATS.balanced.build.call(this, g); },
    choose: (g, card) => ({ donors: 0, stockpile: 1, premium: 0, transit: 0, hoarding: 1, language: 1, blame: 2, sickleave: 1, evictions: 1, patrol: 0 })[card.id] ?? (CHOICES.good[card.id] ?? 0)
  },
  random: {
    build(g) {
      const r = g.rng; // use a separate deterministic stream
      let guard = 0;
      while (guard++ < 10 && g.budget > 60) { const t = D.TOWER_ORDER[Math.floor(rnd() * 8)]; placeBest(g, t); }
    },
    choose: (g, card) => Math.floor(rnd() * card.options.length)
  }
};

function run(stratName, seed, difficulty, quick) {
  const strat = Object.assign({}, STRATS[stratName]); strat.q = null;
  const g = new NS.sim.Game({ seed, difficulty, quick, fx: false });
  const t0 = Date.now(); let ticks = 0;
  while (g.phase !== 'ended') {
    if (g.phase === 'build') { strat.build(g); g.startWave(); }
    else if (g.phase === 'briefing') g.choose(strat.choose(g, g.briefing.card));
    else { g.step(); ticks++; if (strat.during && g.tick % 300 === 0) strat.during(g); }
  }
  const r = g.report();
  return { strat: stratName, seed, ending: r.ending, surv: (r.survival * 100).toFixed(0) + '%', deaths: r.deaths, trust: r.trust, equity: r.equity,
    peakR: r.peakR, peakZ: r.peakZ, stray: r.strayDeaths, vax: r.vaxPct + '%', det: r.detectionPct + '%', cured: r.cured, wave: r.wave + '/' + r.totalWaves,
    auth: g.authScore.toFixed(1), active: r.active, ms: Date.now() - t0, msPerTick: ((Date.now() - t0) / ticks).toFixed(3), log: g.log, tick: g.tick, g };
}

module.exports = { run, STRATS, candidates, placeBest };

if (require.main === module) {
  const seeds = (process.argv[2] || 'TEST01,ABC,K7Q2MX').split(',');
  const diff = process.argv[3] || 'normal', quick = process.argv[4] === 'quick';
  const strats = (process.argv[5] || 'nothing,shooter,shooterNeutral,balanced').split(',');
  const rows = [];
  for (const s of strats) for (const seed of seeds) { const r = run(s, seed, diff, quick); delete r.log; delete r.g; rows.push(r); }
  console.table(rows);
}
