/* =====================================================================
   OUTBREAK CITY: SIMULATION (deterministic, no DOM)
   ---------------------------------------------------------------------
   Infection model (zombie costume on real epidemiology):
     Each building holds residents in compartments
        S  susceptible      E  exposed (bitten, incubating, looks healthy)
        Ek known exposed (found by testing)   V vaccinated   R recovered
        D  dead             Z  zombies trapped inside (agent cap overflow)
     Walkers are residents in transit; they carry their state across town.
     Exposed people turn after an exponential incubation period. A newly
     turned zombie first bites its own household, then hunts other buildings.
     Known exposed people isolate (if they comply) and turn harmlessly.
     Hospitals cure known exposed people and freshly turned zombies.
   Everything random uses seeded RNG streams so a seed + the same commands
   always gives the same game (used for class replays and save/resume).
   ===================================================================== */
(function (root) {
  'use strict';
  var NS = root.OutbreakCity = root.OutbreakCity || {};
  var C = NS.core, D = NS.data, CFG = D.CONFIG;
  var T = NS.city.T;
  var DT = 1 / CFG.simHz;
  var S = 0, E = 1, V = 2, R = 3;           // walker states
  var ADD_MODS = { compliance: 1, vaxEff: 1, cureEff: 1 };
  var DIST_IDX = {}; D.DISTRICTS.forEach(function (d, i) { DIST_IDX[d.id] = i; });
  var DEST_WEIGHT = { hill: 0.7, down: 2.0, east: 1.0, port: 1.1, sub: 1.0 };
  var WIN = 30; // seconds in rolling windows

  function Game(opts) {
    opts = opts || {};
    this.opts = opts;
    this.seed = C.cleanSeed(opts.seed);
    this.diffKey = D.DIFFICULTY[opts.difficulty] ? opts.difficulty : 'normal';
    var diff = this.diff = D.DIFFICULTY[this.diffKey];
    this.quick = !!opts.quick;
    this.attract = !!opts.attract;
    this.fxOn = opts.fx !== false;
    this.waveDefs = this.quick ? D.QUICK_WAVES.map(function (i) { return D.WAVES[i]; }) : D.WAVES.slice();
    this.totalWaves = this.waveDefs.length;
    this.waveDuration = this.quick ? CFG.quickWaveDuration : CFG.waveDuration;

    var city = this.city = NS.city.generate(this.seed, { popMult: diff.pop });
    var W = this.W = city.W, H = this.H = city.H, N = this.N = W * H;
    this.rng = new C.RNG(C.hashStr(this.seed + '|sim|' + this.diffKey + (this.quick ? 'q' : '')));
    this.pf = new C.Pathfinder(W, H);
    this.pathCache = new Map();

    this.tick = 0; this.t = 0; this.phase = this.attract ? 'attract' : 'build';
    this.wave = 0; this.waveTime = 0; this.weather = 'clear';
    var qb = this.quick ? CFG.quickBonus : 1;
    this.budget = Math.round(CFG.startBudget * diff.budget * qb);
    this.vaccines = Math.round(CFG.startVaccines * diff.vaccines * qb);
    this.trust = diff.trust; this.panic = CFG.startPanic; this.equity = 50;
    this.reff = 0; this.reffConf = 0; this.unrest = 0; this.overtime = false; this.bonusBeds = CFG.startBeds;
    this.mods = { transmission: diff.transmission, mobility: 1, income: 1, uptake: 1, reveal: 1, selfReport: 1, spawn: 1, imports: 1,
      hospitalSpeed: 1, militiaDamage: 1, militiaStray: 1, capture: 1, militiaTrust: 1, compliance: 0, vaxEff: 0, cureEff: 0 };
    this.temps = []; this.em = {}; this.flags = {}; this.counters = { spin: 0, auth: 0 };
    this.access = D.DISTRICTS.map(function (d) { return d.baseAccess; });
    this.localTrust = D.DISTRICTS.map(function (d) { return d.id === 'hill' ? 6 : d.id === 'east' ? -10 : d.id === 'port' ? -5 : 0; });
    this.freeTowers = {};
    this.pending = []; this.decisions = []; this.annotations = []; this.history = []; this.fx = []; this.log = [];
    this.briefing = null; this.lastResult = null; this.ending = null; this.endReason = null;
    this.nextId = 1;

    // Dynamic building state (parallel to city.buildings)
    this.blds = city.buildings.map(function (b) {
      return { id: b.id, tile: b.tile, x: b.x, y: b.y, cx: b.x + 0.5, cy: b.y + 0.5, d: b.d, door: b.door,
        S: b.pop, E: 0, Ek: 0, V: 0, R: 0, D: 0, Z: 0, zOff: 0, orig: b.pop,
        seenT: -999, breachT: -999, comp: 0.5, compBonus: 0, tripMult: 1, health: 0 };
    });
    this.totalPop = city.totalPop;
    this.distOrig = D.DISTRICTS.map(function () { return 0; });
    var self = this;
    this.blds.forEach(function (b) { self.distOrig[b.d] += b.orig; });

    // Agents and spatial buckets
    this.agents = []; this.nWalkers = 0; this.nZombies = 0;
    this.bucketHead = new Int32Array(N); this.bucketNext = new Int32Array(1024);
    this.launchAcc = 0; this.srcCum = new Float64Array(this.blds.length); this.srcTotal = 0;

    // Towers
    this.towers = []; this.towerAt = new Int32Array(N).fill(-1); this.barricadeAt = new Int32Array(N).fill(-1);

    // Stats
    var zeros = function () { return D.DISTRICTS.map(function () { return 0; }); };
    this.stats = { kills: 0, strayDeaths: 0, strayExposed: 0, deaths: 0, infections: 0, revealed: 0, vaccinated: 0, cured: 0,
      captured: 0, contained: 0, detained: 0, turnings: 0, imports: 0, overflowSeconds: 0, decays: 0, breaches: 0,
      built: {}, everBuilt: {}, peakR: 0, peakRt: 0, peakZ: 0, peakZt: 0, peakE: 0, maxDeathsWave: 0,
      distDeaths: zeros(), distInf: zeros(), distVax: zeros(), distCured: zeros(), stockouts: 0, firstBite: -1, firstTurn: -1 };
    this.win = { off: new Float64Array(WIN), rem: new Float64Array(WIN), turn: new Float64Array(WIN), cureE: new Float64Array(WIN),
      deaths: new Float64Array(WIN), shots: new Float64Array(WIN), exp: new Float64Array(WIN) };
    this.secIdx = 0;
    this.totals = {};
    this.newsFlags = {};

    // Pre-plan every wave from the seed so a whole class sees identical arrivals
    this.planWaves();
    // Pre-shuffle the briefing deck (identical order for everyone on this seed)
    this.planDeck();

    // Patient zero: an infected household somewhere in the city
    if (!this.attract) {
      var pz = this.blds[this.patientZero];
      var n0 = Math.min(3, pz.S - 1); pz.S -= n0; pz.E += n0;
    }
    this.recomputeMods();
    this.recomputeCoverage();
    this.perSecond(true);
  }

  var G = Game.prototype;

  /* ================= Planning ================= */
  G.planWaves = function () {
    var wr = new C.RNG(C.hashStr(this.seed + '|waves')), city = this.city, self = this;
    this.plans = this.waveDefs.map(function (def) {
      var entries = wr.shuffle(city.entries.slice()).slice(0, Math.max(1, def.entries));
      var z = D.ZOMBIE_ORDER.map(function (type, k) {
        var max = Math.ceil(def.z[k] * 2.6) + 2, list = [];
        for (var i = 0; i < max; i++) list.push({ t: wr.next(), entry: wr.pick(entries), type: type });
        return list;
      });
      var imports = [];
      for (var i = 0; i < Math.ceil(def.imports * 2.6) + 2; i++) imports.push({ t: wr.next(), entry: wr.pick(city.entries), dest: wr.int(self.blds.length), inc: wr.exp(CFG.incubationMean) + 6 });
      return { entries: entries, z: z, imports: imports };
    });
    // Patient zero: a mid-sized building (seeded), never in the first-placed district for variety
    var cands = this.blds.filter(function (b) { return b.orig >= 6; });
    this.patientZero = (wr.pick(cands) || this.blds[0]).id;
  };

  G.planDeck = function () {
    var dr = new C.RNG(C.hashStr(this.seed + '|deck'));
    var ids = D.EVENTS.map(function (e) { return e.id; });
    dr.shuffle(ids);
    // Priority cards (e.g. honesty) always appear in the first two briefings
    D.EVENTS.forEach(function (e) {
      if (!e.priority) return;
      var i = ids.indexOf(e.id); ids.splice(i, 1); ids.splice(dr.int(2), 0, e.id);
    });
    this.deck = ids;
  };

  /* ================= Helpers ================= */
  G.cmd = function (c, a) { this.log.push({ k: this.tick, c: c, a: a }); };
  G.emit = function (o) { if (this.fxOn && this.fx.length < 800) this.fx.push(o); };
  G.news = function (key, vars, once) {
    if (once) { if (this.newsFlags[key]) return; this.newsFlags[key] = true; }
    this.emit({ k: 'news', key: key, vars: vars || {} });
  };
  G.countTowers = function (type) { var n = 0; for (var i = 0; i < this.towers.length; i++) if (this.towers[i].type === type) n++; return n; };
  G.tileOf = function (x, y) { var tx = C.clamp(Math.floor(x), 0, this.W - 1), ty = C.clamp(Math.floor(y), 0, this.H - 1); return ty * this.W + tx; };
  G.vaxEff = function () { return C.clamp(CFG.vaccineEfficacy + this.em.vaxEff, 0.2, 0.99); };
  G.cureEff = function () { return C.clamp(CFG.cureEfficacy + this.em.cureEff, 0.2, 0.99); };
  G.weatherDef = function () { return D.WEATHER[this.weather] || D.WEATHER.clear; };
  G.districtTrust = function (d) { return C.clamp(this.trust + this.localTrust[d], 0, 100); };

  G.towerStats = function (tw) {
    var def = D.TOWERS[tw.type], s = {}, k;
    for (k in def) if (k !== 'upgrades') s[k] = def[k];
    for (var i = 0; i < tw.level - 1 && i < def.upgrades.length; i++) for (k in def.upgrades[i]) if (k !== 'cost' && k !== 'label') s[k] = def.upgrades[i][k];
    return s;
  };

  G.recomputeMods = function () {
    var em = {}, k;
    for (k in this.mods) em[k] = this.mods[k];
    for (var i = 0; i < this.temps.length; i++) {
      var tp = this.temps[i];
      if (this.wave > tp.until) continue;
      for (k in tp.mods) { if (ADD_MODS[k]) em[k] += tp.mods[k]; else em[k] *= tp.mods[k]; }
    }
    this.em = em;
  };

  /* ================= Paths ================= */
  G.getPath = function (from, to, zombie) {
    var key = (zombie ? 1 : 0) * this.N * this.N + from * this.N + to;
    var p = this.pathCache.get(key);
    if (p !== undefined) return p;
    var tiles = this.tiles || (this.tiles = this.city.tiles), bar = this.barricadeAt, zc = CFG.barricadeCostZombie;
    var cost = zombie
      ? function (i) { var t = tiles[i]; if (t !== T.ROAD && t !== T.BRIDGE) return Infinity; return bar[i] >= 0 ? zc : 1; }
      : function (i) { var t = tiles[i]; if (t !== T.ROAD && t !== T.BRIDGE) return Infinity; return bar[i] >= 0 ? Infinity : 1; };
    p = this.pf.find(from, to, cost);
    if (this.pathCache.size > 6000) this.pathCache.clear();
    this.pathCache.set(key, p);
    return p;
  };

  /* ================= Agents ================= */
  G.newAgent = function () {
    return { id: this.nextId++, kind: 0, st: S, known: false, inc: 0, x: 0, y: 0, px: 0, py: 0, path: null, pi: 0, endTile: -1, endFrac: 1,
      dest: -1, home: 0, flee: 0, dirx: 1, diry: 0, dead: false, isolating: false,
      type: null, hp: 0, maxhp: 0, age: 0, life: 0, biteCd: 0, breach: 0, biteT: 0, bitesLeft: 0, offspring: 0,
      revealed: false, roadTile: -1, lastBld: -1, zdef: null, hitT: -9, outsider: false };
  };

  G.spawnWalker = function (st, x, y, path, destBld, known, inc, home) {
    var a = this.newAgent();
    a.kind = 0; a.st = st; a.known = !!known; a.inc = inc || 0; a.x = a.px = x; a.y = a.py = y;
    a.path = path; a.pi = 0; a.dest = destBld; a.endTile = this.blds[destBld].tile; a.endFrac = 1; a.home = home;
    this.agents.push(a); this.nWalkers++;
    return a;
  };

  G.spawnZombie = function (type, x, y, roadTile, offspring, fromBld) {
    var z = D.ZOMBIES[type], a = this.newAgent();
    a.kind = 1; a.type = type; a.zdef = z; a.hp = a.maxhp = z.hp; a.life = z.life * this.rng.range(0.8, 1.2);
    a.x = a.px = x; a.y = a.py = y; a.roadTile = roadTile; a.offspring = offspring || 0; a.lastBld = fromBld === undefined ? -1 : fromBld;
    a.revealed = !z.stealth;
    this.agents.push(a); this.nZombies++;
    this.retarget(a);
    return a;
  };

  G.waypoint = function (a, out) {
    var W = this.W, p = a.path;
    if (p && a.pi < p.length) {
      var t = p[a.pi], cx = t % W + 0.5, cy = ((t / W) | 0) + 0.5;
      var prev = a.pi > 0 ? p[a.pi - 1] : (p.length > 1 ? 2 * t - p[1] : t);
      var dx = (t % W) - (prev % W), dy = ((t / W) | 0) - ((prev / W) | 0);
      if (a.pi === 0 && p.length > 1) { dx = (p[1] % W) - (t % W); dy = ((p[1] / W) | 0) - ((t / W) | 0); }
      var lane = a.kind === 0 ? 0.2 : 0.12;
      out.x = cx - dy * lane; out.y = cy + dx * lane;
      return true;
    }
    if (a.endTile >= 0 && p && a.pi === p.length) {
      var last = p.length ? p[p.length - 1] : a.endTile;
      var lx = last % W + 0.5, ly = ((last / W) | 0) + 0.5, ex = a.endTile % W + 0.5, ey = ((a.endTile / W) | 0) + 0.5;
      out.x = lx + (ex - lx) * a.endFrac; out.y = ly + (ey - ly) * a.endFrac;
      return true;
    }
    return false;
  };

  var WP = { x: 0, y: 0 };
  G.moveAgent = function (a, speed) {
    var step = speed * DT, guard = 0;
    while (step > 0 && guard++ < 6) {
      if (!this.waypoint(a, WP)) return true;
      var dx = WP.x - a.x, dy = WP.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d <= step) {
        a.x = WP.x; a.y = WP.y; step -= d; a.pi++;
        if (a.pi > (a.path ? a.path.length : 0) || (a.endTile < 0 && a.pi >= a.path.length)) return true;
      } else {
        a.x += dx / d * step; a.y += dy / d * step; a.dirx = dx / d; a.diry = dy / d; step = 0;
      }
    }
    return false;
  };

  G.rebuildBuckets = function () {
    var head = this.bucketHead, ag = this.agents;
    head.fill(-1);
    if (this.bucketNext.length < ag.length) this.bucketNext = new Int32Array(ag.length * 2);
    var next = this.bucketNext;
    for (var i = 0; i < ag.length; i++) {
      var a = ag[i]; if (a.dead) continue;
      var t = this.tileOf(a.x, a.y);
      next[i] = head[t]; head[t] = i;
    }
  };

  // Calls fn(agent, d2) for agents within r of (x,y); fn returns true to stop.
  G.near = function (x, y, r, fn) {
    var W = this.W, H = this.H, x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(W - 1, Math.floor(x + r));
    var y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(H - 1, Math.floor(y + r)), r2 = r * r;
    var head = this.bucketHead, next = this.bucketNext, ag = this.agents;
    for (var ty = y0; ty <= y1; ty++) for (var tx = x0; tx <= x1; tx++) {
      for (var i = head[ty * W + tx]; i >= 0; i = next[i]) {
        var a = ag[i]; if (a.dead) continue;
        var dx = a.x - x, dy = a.y - y, d2 = dx * dx + dy * dy;
        if (d2 <= r2 && fn(a, d2)) return;
      }
    }
  };

  G.removeAgent = function (a) {
    if (a.dead) return;
    a.dead = true;
    if (a.kind === 0) this.nWalkers--; else this.nZombies--;
  };

  G.compact = function () {
    var ag = this.agents, j = 0;
    for (var i = 0; i < ag.length; i++) if (!ag[i].dead) ag[j++] = ag[i];
    ag.length = j;
  };

  /* ================= Infection events ================= */
  G.onInfect = function (d, x, y) {
    this.stats.infections++; this.stats.distInf[d]++; this.win.exp[this.secIdx]++;
    if (this.stats.firstBite < 0) { this.stats.firstBite = this.t; this.news('firstBite', null, true); this.emit({ k: 'firstBite', x: x, y: y }); }
  };

  G.death = function (d, x, y, cause) {
    this.stats.deaths++; this.stats.distDeaths[d]++; this.win.deaths[this.secIdx]++;
    this.trust = Math.max(0, this.trust - CFG.deathTrustHit);
  };

  G.recordRemoval = function (off) { this.win.off[this.secIdx] += off; this.win.rem[this.secIdx] += 1; };

  // One bite attempt on a random household member. Returns true if it infected someone.
  G.biteBuilding = function (b, mult) {
    var n = b.S + b.E + b.Ek + b.V + b.R;
    if (n <= 0) return false;
    var r = this.rng.next() * n, p = CFG.biteSuccess * this.em.transmission * (mult || 1);
    b.breachT = this.t;
    if (r < b.S) {
      if (this.rng.next() < p) { b.S--; b.E++; this.onInfect(b.d, b.cx, b.cy); return true; }
    } else if (r < b.S + b.V) {
      if (this.rng.next() < p * (1 - this.vaxEff())) { b.V--; b.E++; this.onInfect(b.d, b.cx, b.cy); return true; }
    }
    return false;
  };

  G.turnInBuilding = function (b) {
    var off = 0, nb = CFG.turnBites;
    for (var k = 0; k < nb; k++) if (this.biteBuilding(b, CFG.householdMult)) off++;
    this.stats.turnings++; this.win.turn[this.secIdx]++;
    if (this.stats.firstTurn < 0) { this.stats.firstTurn = this.t; this.news('firstTurn', null, true); }
    var W = this.W, dx = b.door % W + 0.5, dy = ((b.door / W) | 0) + 0.5;
    if (this.nZombies < CFG.maxZombies) {
      var type = this.rng.next() < CFG.turnRunnerChance ? 'runner' : 'basic';
      this.spawnZombie(type, b.cx + (dx - b.cx) * 0.6, b.cy + (dy - b.cy) * 0.6, b.door, off, b.id);
    } else { b.Z++; b.zOff += off; }
    this.emit({ k: 'turn', x: b.cx, y: b.cy, b: b.id });
  };

  G.updateBuildings = function () {
    var rng = this.rng, pTurn = DT / CFG.incubationMean, zl = D.ZOMBIES.basic.life, blds = this.blds;
    for (var i = 0; i < blds.length; i++) {
      var b = blds[i], n, k;
      if (b.E > 0) {
        n = Math.min(b.E, rng.count(b.E * pTurn));
        for (k = 0; k < n; k++) { b.E--; this.turnInBuilding(b); }
      }
      if (b.Ek > 0) {
        n = Math.min(b.Ek, rng.count(b.Ek * pTurn));
        for (k = 0; k < n; k++) {
          b.Ek--;
          if (rng.next() < b.comp) {
            // Isolated: turns without biting anyone (the point of isolation)
            b.D++; this.death(b.d, b.cx, b.cy, 'isolated'); this.recordRemoval(0);
            this.stats.contained++; this.stats.turnings++; this.win.turn[this.secIdx]++;
            this.emit({ k: 'contained', x: b.cx, y: b.cy });
          } else this.turnInBuilding(b);
        }
      }
      if (b.Z > 0) {
        n = rng.count(b.Z * DT / CFG.insideBiteInterval);
        for (k = 0; k < n; k++) if (this.biteBuilding(b)) b.zOff++;
        n = Math.min(b.Z, rng.count(b.Z * DT / zl));
        for (k = 0; k < n; k++) {
          var share = b.zOff / b.Z; b.zOff -= share; b.Z--; b.D++;
          this.death(b.d, b.cx, b.cy, 'decay'); this.recordRemoval(share);
        }
        if (b.Z > 0 && this.nZombies < CFG.maxZombies && rng.next() < DT * 0.6 * b.Z) {
          var sh = b.zOff / b.Z; b.zOff -= sh; b.Z--;
          var W = this.W, dx = b.door % W + 0.5, dy = ((b.door / W) | 0) + 0.5;
          this.spawnZombie('basic', b.cx + (dx - b.cx) * 0.6, b.cy + (dy - b.cy) * 0.6, b.door, sh, b.id);
        }
      }
    }
  };

  /* ================= Walkers ================= */
  G.pickSource = function () {
    if (this.srcTotal <= 0) return null;
    var r = this.rng.next() * this.srcTotal, cum = this.srcCum, lo = 0, hi = cum.length - 1;
    while (lo < hi) { var mid = (lo + hi) >> 1; if (cum[mid] < r) lo = mid + 1; else hi = mid; }
    return this.blds[lo];
  };

  G.pickDest = function (src) {
    var rng = this.rng, city = this.city, list;
    if (rng.next() < CFG.sameDistrictTrips) list = city.byDistrict[src.d];
    else {
      var tot = 0, k;
      for (k = 0; k < D.DISTRICTS.length; k++) tot += city.byDistrict[k].length ? DEST_WEIGHT[D.DISTRICTS[k].id] : 0;
      var r = rng.next() * tot;
      for (k = 0; k < D.DISTRICTS.length; k++) { if (!city.byDistrict[k].length) continue; r -= DEST_WEIGHT[D.DISTRICTS[k].id]; if (r <= 0) break; }
      list = city.byDistrict[Math.min(k, D.DISTRICTS.length - 1)];
    }
    if (!list || !list.length) return null;
    var b = this.blds[list[rng.int(list.length)]];
    if (b === src) b = this.blds[list[rng.int(list.length)]];
    return b === src ? null : b;
  };

  G.launchWalkers = function () {
    this.launchAcc += this.commuteRate * DT;
    while (this.launchAcc >= 1) {
      this.launchAcc -= 1;
      if (this.nWalkers >= CFG.maxWalkers) { this.launchAcc = 0; break; }
      this.launchOne();
    }
  };

  G.launchOne = function () {
    var rng = this.rng, src = this.pickSource();
    if (!src) return;
    var mobileEk = src.Ek * (1 - src.comp);
    var n = src.S + src.E + src.V + src.R + mobileEk;
    if (n < 1) return;
    var dst = this.pickDest(src);
    if (!dst) return;
    var path = this.getPath(src.door, dst.door, false);
    if (!path) return;
    var r = rng.next() * n, st, known = false;
    if (r < src.S) { st = S; src.S--; }
    else if ((r -= src.S) < src.E) { st = E; src.E--; }
    else if ((r -= src.E) < src.V) { st = V; src.V--; }
    else if ((r -= src.V) < src.R) { st = R; src.R--; }
    else { if (src.Ek < 1) return; st = E; known = true; src.Ek--; }
    var inc = st === E ? rng.exp(CFG.incubationMean) : 0;
    this.spawnWalker(st, src.cx, src.cy, path, dst.id, known, inc, src.d);
  };

  G.arrive = function (a) {
    var b = this.blds[a.dest];
    if (a.st === S) b.S++;
    else if (a.st === E) { if (a.known) b.Ek++; else b.E++; }
    else if (a.st === V) b.V++;
    else b.R++;
    this.removeAgent(a);
  };

  // A revealed walker decides whether to go isolate at the nearest building
  G.onReveal = function (a) {
    var b0 = this.blds[a.dest];
    if (a.isolating || this.rng.next() > b0.comp) return;
    a.isolating = true;
    var cur = a.path && a.path.length ? a.path[Math.min(a.pi, a.path.length - 1)] : -1;
    if (cur < 0) return;
    // nearest building in the current district with a door
    var W = this.W, cx = cur % W, cy = (cur / W) | 0, best = null, bd = 1e9;
    var list = this.city.byDistrict[this.city.district[cur]];
    for (var i = 0; i < list.length; i++) {
      var b = this.blds[list[i]], d = Math.abs(b.x - cx) + Math.abs(b.y - cy);
      if (d < bd) { bd = d; best = b; }
    }
    if (!best) return;
    var path = this.getPath(cur, best.door, false);
    if (!path) return;
    a.path = path; a.pi = 0; a.dest = best.id; a.endTile = best.tile;
  };

  G.walkerTurns = function (a) {
    // An Exposed walker becomes a zombie in the street
    var tile = a.path && a.path.length ? a.path[Math.min(a.pi, a.path.length - 1)] : this.tileOf(a.x, a.y);
    this.removeAgent(a);
    this.stats.turnings++; this.win.turn[this.secIdx]++;
    if (this.stats.firstTurn < 0) { this.stats.firstTurn = this.t; this.news('firstTurn', null, true); }
    if (this.nZombies < CFG.maxZombies) {
      this.spawnZombie(this.rng.next() < CFG.turnRunnerChance ? 'runner' : 'basic', a.x, a.y, tile, 0, -1);
    } else {
      var b = this.blds[a.dest]; b.Z++;
    }
    this.emit({ k: 'turn', x: a.x, y: a.y });
  };

  /* ================= Zombies ================= */
  G.findLure = function (a) {
    var best = null, bd = 1e9;
    for (var i = 0; i < this.towers.length; i++) {
      var tw = this.towers[i];
      if (tw.type !== 'militia' || this.t - tw.lastFire > 3) continue;
      var dx = tw.tx + 0.5 - a.x, dy = tw.ty + 0.5 - a.y, d2 = dx * dx + dy * dy, nr = tw.st.noise;
      if (d2 < nr * nr && d2 < bd) { bd = d2; best = tw; }
    }
    return best;
  };

  G.retarget = function (a) {
    var rng = this.rng, blds = this.blds, W = this.W, best = null, bs = -1;
    var rx = a.roadTile % W, ry = (a.roadTile / W) | 0;
    var lure = this.findLure(a);
    if (lure && lure.nearBld >= 0 && lure.nearBld !== a.lastBld && rng.next() < 0.7) best = blds[lure.nearBld];
    else {
      for (var i = 0; i < 12; i++) {
        var b = blds[rng.int(blds.length)];
        if (b.id === a.lastBld) continue;
        var pop = b.S + b.E + b.Ek + b.V + b.R;
        if (pop <= 0) continue;
        var d = Math.abs(b.x - rx) + Math.abs(b.y - ry);
        var sc = pop / (3 + d * d * 0.15);
        if (sc > bs) { bs = sc; best = b; }
      }
    }
    if (!best) { a.path = [a.roadTile]; a.pi = 0; a.endTile = -1; a.dest = -1; a.breach = 1.5; return; }
    var path = this.getPath(a.roadTile, best.door, true);
    if (!path) { a.path = [a.roadTile]; a.pi = 0; a.endTile = -1; a.dest = -1; a.breach = 1.5; return; }
    a.path = path; a.pi = 0; a.dest = best.id; a.endTile = best.tile; a.endFrac = 0.42; a.breach = 0;
  };

  G.killZombie = function (a, cause) {
    var d = this.city.district[this.tileOf(a.x, a.y)];
    this.removeAgent(a);
    this.recordRemoval(a.offspring);
    if (a.outsider) this.stats.outsiders = (this.stats.outsiders || 0) + 1; // arrived from outside: not a resident
    else this.death(d, a.x, a.y, cause);
  };

  G.updateAgents = function () {
    var ag = this.agents, rng = this.rng, self = this, tick = this.tick;
    var walkSpeed = CFG.walkerSpeed * (1 + this.panic / 300);
    for (var i = 0; i < ag.length; i++) {
      var a = ag[i];
      if (a.dead) continue;
      a.px = a.x; a.py = a.y;
      if (a.kind === 0) {
        if (a.st === E) { a.inc -= DT; if (a.inc <= 0) { this.walkerTurns(a); continue; } }
        if (a.flee > 0) a.flee -= DT;
        if (((tick + a.id) & 3) === 0) {
          this.near(a.x, a.y, CFG.fleeRadius, function (z) {
            if (z.kind === 1 && z.revealed) { a.flee = 1.2; return true; }
            return false;
          });
        }
        if (this.moveAgent(a, walkSpeed * (a.flee > 0 ? CFG.fleeSpeedMult : 1))) this.arrive(a);
      } else {
        a.age += DT;
        if (a.age >= a.life) { this.stats.decays++; this.emit({ k: 'decay', x: a.x, y: a.y }); this.killZombie(a, 'decay'); continue; }
        if (a.biteCd > 0) a.biteCd -= DT;
        var z = a.zdef;
        if (a.breach > 0) {
          a.breach -= DT; a.biteT -= DT;
          if (a.biteT <= 0 && a.bitesLeft > 0 && a.dest >= 0) {
            a.bitesLeft--; a.biteT = CFG.breachTime / (z.bites + 0.5);
            var bb = this.blds[a.dest];
            if (this.biteBuilding(bb)) a.offspring++;
            this.emit({ k: 'breach', x: a.x, y: a.y, b: bb.id, quiet: z.stealth && !a.revealed });
          }
          if (a.breach <= 0) { a.lastBld = a.dest; a.roadTile = a.path && a.path.length ? a.path[a.path.length - 1] : a.roadTile; this.retarget(a); }
          continue;
        }
        var tile = this.tileOf(a.x, a.y), sp = z.speed;
        var bar = this.barricadeAt[tile];
        if (bar >= 0) {
          var btw = this.towerById(bar);
          if (btw) {
            sp *= btw.st.slow;
            btw.hp -= DT * (a.type === 'brute' ? 18 : 6);
            if (btw.hp <= 0) { this.emit({ k: 'barricadeBreak', x: btw.tx + 0.5, y: btw.ty + 0.5 }); this.removeTower(btw); }
          }
        }
        if (this.moveAgent(a, sp)) {
          if (a.dest >= 0) { a.breach = CFG.breachTime; a.bitesLeft = z.bites; a.biteT = 0.5; this.stats.breaches++; }
          else { a.roadTile = a.path && a.path.length ? a.path[a.path.length - 1] : a.roadTile; this.retarget(a); }
          continue;
        }
        if (a.path && a.pi < a.path.length) a.roadTile = a.path[Math.max(0, a.pi - 1)];
        // Street bites (stealthy carriers keep a low profile)
        if (a.biteCd <= 0 && !(z.stealth && !a.revealed) && ((tick + a.id) & 1) === 0) {
          var victim = null;
          this.near(a.x, a.y, CFG.biteRange, function (w) { if (w.kind === 0) { victim = w; return true; } return false; });
          if (victim) {
            a.biteCd = CFG.biteCooldown;
            var p = CFG.biteSuccess * CFG.streetBiteMult * this.em.transmission;
            if (victim.st === V) p *= (1 - this.vaxEff());
            if ((victim.st === S || victim.st === V) && rng.next() < p) {
              victim.st = E; victim.inc = rng.exp(CFG.incubationMean); victim.known = false; victim.isolating = false;
              a.offspring++;
              this.onInfect(this.city.district[tile], victim.x, victim.y);
            }
            this.emit({ k: 'bite', x: victim.x, y: victim.y });
          }
        }
      }
    }
  };

  /* ================= Towers ================= */
  G.towerById = function (id) { for (var i = 0; i < this.towers.length; i++) if (this.towers[i].id === id) return this.towers[i]; return null; };

  G.placeCost = function (type) { return this.freeTowers[type] ? 0 : D.TOWERS[type].cost; };

  G.canPlace = function (type, tx, ty) {
    var def = D.TOWERS[type];
    if (!def) return { ok: false, reason: 'Unknown tower' };
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return { ok: false, reason: 'Off the map' };
    if (this.phase === 'ended') return { ok: false, reason: 'Game over' };
    var i = ty * this.W + tx, t = this.city.tiles[i];
    if (this.towerAt[i] >= 0) return { ok: false, reason: 'Something is already here' };
    if (def.road) { if (t !== T.ROAD && t !== T.BRIDGE) return { ok: false, reason: 'Must go on a road' }; }
    else if (t !== T.GRASS && t !== T.PARK && t !== T.LOT && t !== T.PLAZA) return { ok: false, reason: t === T.ROAD || t === T.BRIDGE ? 'Not on roads (try an open lot or park)' : t === T.WATER ? 'Not in the river' : 'Buildings are occupied' };
    if (type === 'chw') { for (var k = 0; k < this.towers.length; k++) if (this.towers[k].type === 'chw' && this.towers[k].tile === i) return { ok: false, reason: 'A team is already here' }; }
    if (this.budget < this.placeCost(type)) return { ok: false, reason: 'Not enough budget' };
    return { ok: true };
  };

  G.place = function (type, tx, ty) {
    var chk = this.canPlace(type, tx, ty);
    if (!chk.ok) return chk;
    var def = D.TOWERS[type], cost = this.placeCost(type);
    if (this.freeTowers[type]) this.freeTowers[type]--;
    this.budget -= cost;
    var i = ty * this.W + tx;
    var tw = { id: this.nextId++, type: type, tx: tx, ty: ty, tile: i, level: 1, cd: 0.3, acc: 0, angle: 0.8, lastFire: -99, spent: cost,
      bld: [], rr: 0, patients: [], hp: def.hp || 0, x: tx + 0.5, y: ty + 0.5, path: null, pi: 0, boost: 1, uptakeMult: 1,
      nearBld: -1, placedT: this.t, scanT: -99, fxc: 0, sumE: 0, target: null };
    tw.st = this.towerStats(tw);
    this.towers.push(tw);
    if (type === 'barricade') { this.barricadeAt[i] = tw.id; this.pathCache.clear(); }
    if (type !== 'chw') this.towerAt[i] = tw.id;
    this.computeTowerBld(tw);
    this.stats.built[type] = (this.stats.built[type] || 0) + 1;
    if (!this.stats.everBuilt[type]) {
      this.stats.everBuilt[type] = true;
      this.annotations.push({ t: this.t, kind: 'build', label: 'First ' + def.name });
    }
    if (type === 'barricade' && this.countTowers('barricade') >= 4) this.news('barricades', null, true);
    if (type === 'militia' && this.countTowers('militia') >= 5) this.news('militiaMany', null, true);
    this.dirty = true;
    this.cmd('place', [type, tx, ty]);
    this.emit({ k: 'build', x: tx + 0.5, y: ty + 0.5, type: type });
    return { ok: true, tower: tw };
  };

  G.computeTowerBld = function (tw) {
    var r = tw.st.range, r2 = r * r, cx = tw.x, cy = tw.y, list = [], best = -1, bd = 1e9;
    for (var i = 0; i < this.blds.length; i++) {
      var b = this.blds[i], dx = b.cx - cx, dy = b.cy - cy, d2 = dx * dx + dy * dy;
      if (d2 <= r2) list.push(b.id);
      if (d2 < bd) { bd = d2; best = b.id; }
    }
    tw.bld = list; tw.nearBld = best;
  };

  G.upgradeCost = function (tw) {
    var def = D.TOWERS[tw.type];
    return tw.level - 1 < def.upgrades.length ? def.upgrades[tw.level - 1].cost : null;
  };

  G.upgrade = function (id) {
    var tw = this.towerById(id); if (!tw) return { ok: false, reason: 'No tower' };
    var cost = this.upgradeCost(tw);
    if (cost === null) return { ok: false, reason: 'Fully upgraded' };
    if (this.budget < cost) return { ok: false, reason: 'Not enough budget' };
    this.budget -= cost; tw.spent += cost; tw.level++;
    tw.st = this.towerStats(tw);
    if (tw.type === 'barricade') tw.hp = tw.st.hp;
    this.computeTowerBld(tw);
    this.dirty = true;
    this.cmd('upgrade', [id]);
    this.emit({ k: 'upgrade', x: tw.x, y: tw.y });
    return { ok: true };
  };

  G.removeTower = function (tw) {
    var i = this.towers.indexOf(tw); if (i < 0) return;
    this.towers.splice(i, 1);
    if (this.towerAt[tw.tile] === tw.id) this.towerAt[tw.tile] = -1;
    if (tw.type === 'barricade') { this.barricadeAt[tw.tile] = -1; this.pathCache.clear(); }
    // Hospital patients go home still infected-but-known
    for (var k = 0; k < tw.patients.length; k++) this.blds[tw.patients[k].bld].Ek++;
    tw.patients.length = 0;
    this.dirty = true;
  };

  G.sell = function (id) {
    var tw = this.towerById(id); if (!tw) return { ok: false };
    this.budget += Math.floor(tw.spent * CFG.sellRefund);
    this.removeTower(tw);
    this.cmd('sell', [id]);
    return { ok: true };
  };

  G.moveTeam = function (id, tx, ty) {
    var tw = this.towerById(id); if (!tw || tw.type !== 'chw') return { ok: false, reason: 'Not a mobile team' };
    if (tx < 0 || ty < 0 || tx >= this.W || ty >= this.H) return { ok: false, reason: 'Off the map' };
    var to = ty * this.W + tx, t = this.city.tiles[to];
    if (t !== T.ROAD && t !== T.BRIDGE) return { ok: false, reason: 'Teams travel by road: pick a road tile' };
    var from = this.tileOf(tw.x, tw.y);
    if (this.city.tiles[from] !== T.ROAD && this.city.tiles[from] !== T.BRIDGE) from = tw.tile;
    var path = this.getPath(from, to, true);
    if (!path) return { ok: false, reason: 'No route there' };
    tw.path = path; tw.pi = 0; tw.tile = to; tw.tx = tx; tw.ty = ty;
    this.cmd('move', [id, tx, ty]);
    return { ok: true };
  };

  G.militiaFire = function (tw) {
    var st = tw.st, range = st.range * this.weatherDef().militiaRange, target = null, bd = 1e9, self = this;
    this.near(tw.x, tw.y, range, function (a, d2) {
      if (a.kind === 1 && a.revealed && d2 < bd) { bd = d2; target = a; }
      return false;
    });
    if (!target) { tw.cd = 0.15; return; }
    tw.cd = 1 / st.rate; tw.lastFire = this.t;
    tw.angle = Math.atan2(target.y - tw.y, target.x - tw.x);
    this.win.shots[this.secIdx]++;
    var dmg = st.damage * this.em.militiaDamage * (1 - target.zdef.armor);
    target.hp -= dmg; target.hitT = this.t;
    // Stray fire: the more civilians around the target, the more likely a bystander is hit
    var civs = [];
    this.near(target.x, target.y, 1.3, function (w) { if (w.kind === 0) civs.push(w); return false; });
    var stray = null;
    if (civs.length) {
      var p = Math.min(0.5, (st.strayBase + st.strayPerCiv * civs.length) * st.strayMult * this.em.militiaStray);
      if (this.rng.next() < p) {
        stray = civs[this.rng.int(civs.length)];
        if (stray.st === E) this.stats.strayExposed++;
        this.stats.strayDeaths++;
        this.trust = Math.max(0, this.trust - CFG.strayTrustHit);
        this.panic = Math.min(100, this.panic + CFG.strayPanic);
        this.removeAgent(stray);
        this.death(this.city.district[this.tileOf(stray.x, stray.y)], stray.x, stray.y, 'stray');
        this.news('stray');
      }
    }
    this.emit({ k: 'shot', tw: tw.id, x0: tw.x, y0: tw.y, x1: target.x, y1: target.y, stray: !!stray, sx: stray ? stray.x : 0, sy: stray ? stray.y : 0 });
    this.panic = Math.min(100, this.panic + 0.03);
    if (target.hp <= 0) {
      this.stats.kills++;
      if (this.flags.bounty) this.budget += 3;
      this.emit({ k: 'kill', x: target.x, y: target.y, z: target.type });
      this.killZombie(target, 'shot');
    }
  };

  G.labScan = function (tw) {
    var st = tw.st, eff = tw.boost * this.em.reveal, rng = this.rng, self = this, found = 0;
    tw.scanT = this.t;
    this.near(tw.x, tw.y, st.range, function (a) {
      if (a.kind === 0 && a.st === E && !a.known && rng.next() < st.revealWalker * eff) {
        a.known = true; self.stats.revealed++; found++; self.onReveal(a);
        self.emit({ k: 'reveal', x: a.x, y: a.y });
      } else if (a.kind === 1 && !a.revealed && rng.next() < 0.5 * eff) {
        a.revealed = true; self.emit({ k: 'unmask', x: a.x, y: a.y }); self.news('carrier', null, true);
      }
      return false;
    });
    for (var i = 0; i < tw.bld.length; i++) {
      var b = this.blds[tw.bld[i]];
      b.seenT = this.t;
      if (b.E > 0) {
        var k = Math.min(b.E, rng.count(b.E * st.revealBuilding * eff));
        if (k > 0) {
          b.E -= k; b.Ek += k; this.stats.revealed += k; found += k;
          this.emit({ k: 'reveal', x: b.cx, y: b.cy, n: k });
          if (st.trace) {
            // Contact tracing: interview each new case and follow the chain to contacts' households
            var list = this.city.byDistrict[b.d], traced = 0;
            for (var c = 0; c < 8 && traced < k + 1; c++) {
              var ob = this.blds[list[rng.int(list.length)]];
              if (ob.E > 0) { ob.E--; ob.Ek++; ob.seenT = this.t; this.stats.revealed++; traced++; this.emit({ k: 'reveal', x: ob.cx, y: ob.cy, n: 1 }); }
            }
          }
        }
      }
    }
    if (found) this.news('reveal', null, true);
    this.emit({ k: 'scan', tw: tw.id, x: tw.x, y: tw.y, r: st.range });
  };

  G.clinicTick = function (tw) {
    var st = tw.st, d = this.city.district[tw.tile >= 0 ? tw.tile : 0];
    tw.acc += st.rate * tw.boost * tw.uptakeMult * this.uptake(d) * DT;
    var guard = 0;
    while (tw.acc >= 1 && guard++ < 4) {
      if (this.vaccines < 1) { tw.acc = 0; if (!this.stockout) { this.stockout = true; this.stats.stockouts++; this.emit({ k: 'stockout' }); } return; }
      if (!this.vaccinateIn(tw.bld, tw)) { tw.acc = Math.min(tw.acc, 1); return; }
      tw.acc -= 1;
    }
  };

  G.vaccinateIn = function (list, tw) {
    var n = list.length;
    for (var k = 0; k < n; k++) {
      var b = this.blds[list[(tw.rr++) % n]];
      if (b.S > 0) {
        b.S--; b.V++; this.vaccines--; this.stats.vaccinated++; this.stats.distVax[b.d]++;
        if ((tw.fxc++ % 3) === 0) this.emit({ k: 'vax', tw: tw.id, x0: tw.x, y0: tw.y, x: b.cx, y: b.cy });
        if (this.stats.vaccinated === 60) this.news('vaccinate', null, true);
        return true;
      }
    }
    return false;
  };

  G.hospitalTick = function (tw) {
    var st = tw.st, rng = this.rng, self = this;
    // Discharge
    for (var i = tw.patients.length - 1; i >= 0; i--) {
      var p = tw.patients[i];
      if (p.until > this.t) continue;
      tw.patients.splice(i, 1);
      var b = this.blds[p.bld];
      if (p.ok) {
        b.R++; this.stats.cured++; this.stats.distCured[b.d]++;
        this.emit({ k: 'cure', x: b.cx, y: b.cy, x0: tw.x, y0: tw.y });
        if (this.stats.cured === 25) this.news('cure', null, true);
      } else { b.D++; this.death(b.d, b.cx, b.cy, 'hospital'); }
    }
    tw.cd -= DT * this.em.hospitalSpeed * tw.boost;
    if (tw.cd > 0) return;
    var nh = Math.max(1, this.countTowers('hospital'));
    var beds = st.beds + Math.floor(this.bonusBeds / nh);
    var homeOf = function () { return tw.bld.length ? tw.bld[rng.int(tw.bld.length)] : tw.nearBld; };
    var cand = null, kind = 0, fresh = CFG.freshZombieWindow * st.freshWindowMult * this.em.capture;
    // 1) freshly turned zombies (early infectious)
    this.near(tw.x, tw.y, st.range, function (a) {
      if (a.kind === 1 && a.revealed && a.age < fresh && a.type !== 'brute') { cand = a; kind = 1; return true; }
      if (a.kind === 0 && a.known && a.st === E && !cand) { cand = a; kind = 2; }
      return false;
    });
    var bk = null;
    if (!cand) {
      for (var k = 0; k < tw.bld.length; k++) { var b2 = this.blds[tw.bld[(tw.rr + k) % tw.bld.length]]; if (b2.Ek > 0) { bk = b2; tw.rr += k + 1; break; } }
      if (bk) kind = 3;
    }
    if (!cand && !bk && tw.sumE > 0) {
      // 4) unknown cases walking in on their own (more likely when people trust you)
      var pSelf = Math.min(0.9, st.selfPresent * tw.sumE * (0.3 + this.trust / 100) * this.em.selfReport);
      if (rng.next() < pSelf) {
        for (k = 0; k < tw.bld.length; k++) { var b3 = this.blds[tw.bld[rng.int(tw.bld.length)]]; if (b3.E > 0) { bk = b3; kind = 4; break; } }
      }
    }
    if (!kind) { tw.cd = 0.25; return; }
    if (tw.patients.length >= beds) { this.stats.overflowSeconds += 0.3; tw.overflow = this.t; tw.cd = 0.3; if (!this.newsFlags.overflowNow) { this.newsFlags.overflowNow = true; this.news('overflow'); } return; }
    var ok = rng.next() < this.cureEff(), home;
    if (kind === 1) { home = homeOf(); this.removeAgent(cand); this.recordRemoval(cand.offspring); this.stats.captured++; ok = rng.next() < this.cureEff() * 0.85; }
    else if (kind === 2) { home = cand.dest; this.removeAgent(cand); this.win.cureE[this.secIdx] += ok ? 1 : 0; }
    else if (kind === 3) { bk.Ek--; home = bk.id; this.win.cureE[this.secIdx] += ok ? 1 : 0; }
    else { bk.E--; home = bk.id; this.win.cureE[this.secIdx] += ok ? 1 : 0; }
    if (kind !== 1 && !ok) { /* treatment failed: patient turns in the ward (contained) */ this.recordRemoval(0); this.stats.turnings++; this.win.turn[this.secIdx]++; }
    tw.patients.push({ until: this.t + st.stay, ok: ok, bld: home });
    var src = kind === 3 || kind === 4 ? bk : null;
    this.emit({ k: 'admit', tw: tw.id, x: src ? src.cx : cand.x, y: src ? src.cy : cand.y, x0: tw.x, y0: tw.y, zombie: kind === 1 });
    tw.cd = st.admitInterval;
  };

  G.chwTick = function (tw) {
    if (tw.path && tw.pi < tw.path.length) {
      var t = tw.path[tw.pi], W = this.W, tx = t % W + 0.5, ty = ((t / W) | 0) + 0.5;
      var dx = tx - tw.x, dy = ty - tw.y, d = Math.sqrt(dx * dx + dy * dy), step = tw.st.speed * DT;
      if (d <= step) { tw.x = tx; tw.y = ty; tw.pi++; }
      else { tw.x += dx / d * step; tw.y += dy / d * step; tw.angle = Math.atan2(dy, dx); }
      tw.moving = true;
    } else tw.moving = false;
  };

  G.chwSecond = function (tw) {
    var st = tw.st, r = st.range, W = this.W, H = this.H, rng = this.rng, inRange = [];
    var x0 = Math.max(0, Math.floor(tw.x - r)), x1 = Math.min(W - 1, Math.floor(tw.x + r));
    var y0 = Math.max(0, Math.floor(tw.y - r)), y1 = Math.min(H - 1, Math.floor(tw.y + r));
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var bi = this.city.bldAt[y * W + x];
      if (bi < 0) continue;
      var b = this.blds[bi], dx = b.cx - tw.x, dy = b.cy - tw.y;
      if (dx * dx + dy * dy <= r * r) inRange.push(bi);
    }
    tw.bld = inRange;
    if (!inRange.length) return;
    var d = this.city.district[this.tileOf(tw.x, tw.y)];
    var under = this.access[d] < 0.25 || D.DISTRICTS[d].baseAccess < 0.25;
    // Door-to-door vaccination and check-ins
    tw.acc += st.doorVax * (under ? 1.5 : 1) * this.uptake(d) * 1.3;
    while (tw.acc >= 1 && this.vaccines >= 1) { if (!this.vaccinateIn(inRange, tw)) { tw.acc = 0; break; } tw.acc -= 1; }
    if (tw.acc > 2) tw.acc = 2;
    for (var k = 0; k < inRange.length; k++) {
      var b2 = this.blds[inRange[k]];
      if (b2.E > 0 && rng.next() < st.doorReveal * (under ? 1.5 : 1)) { b2.E--; b2.Ek++; b2.seenT = this.t; this.stats.revealed++; this.emit({ k: 'reveal', x: b2.cx, y: b2.cy, n: 1 }); }
    }
    this.localTrust[d] = Math.min(14, this.localTrust[d] + (under ? 0.08 : 0.03));
  };

  G.updateTowers = function () {
    for (var i = 0; i < this.towers.length; i++) {
      var tw = this.towers[i];
      switch (tw.type) {
        case 'militia': tw.cd -= DT; if (tw.cd <= 0) this.militiaFire(tw); break;
        case 'lab': tw.cd -= DT * tw.boost; if (tw.cd <= 0) { tw.cd = tw.st.scanInterval; this.labScan(tw); } break;
        case 'clinic': this.clinicTick(tw); break;
        case 'hospital': this.hospitalTick(tw); break;
        case 'chw': this.chwTick(tw); break;
      }
    }
  };

  /* ================= Social meters ================= */
  G.uptake = function (d) {
    var tr = this.districtTrust(d) / 100;
    var acc = C.clamp(this.access[d] / 0.4 + this.chwCover[d], 0, 1);
    return C.clamp((CFG.uptakeBase + CFG.uptakeTrust * tr) * this.em.uptake * (0.55 + 0.45 * acc), 0.05, 1.5);
  };

  G.recomputeCoverage = function () {
    var self = this, blds = this.blds, i, k, tw;
    var nd = D.DISTRICTS.length;
    for (i = 0; i < blds.length; i++) { var b = blds[i]; b.cRadio = 0; b.cPantry = 0; b.tripMult = 1; b.health = 0; }
    this.chwCover = D.DISTRICTS.map(function () { return 0; });
    var chws = this.towers.filter(function (t) { return t.type === 'chw'; });
    for (k = 0; k < this.towers.length; k++) {
      tw = this.towers[k];
      var st = tw.st;
      if (tw.type === 'radio') for (i = 0; i < tw.bld.length; i++) blds[tw.bld[i]].cRadio = Math.max(blds[tw.bld[i]].cRadio, st.complianceBonus);
      if (tw.type === 'pantry') for (i = 0; i < tw.bld.length; i++) { var bp = blds[tw.bld[i]]; bp.cPantry = Math.max(bp.cPantry, st.complianceBonus); bp.tripMult = Math.min(bp.tripMult, 1 - st.tripCut); }
      var hv = tw.type === 'clinic' ? 0.4 : tw.type === 'lab' ? 0.3 : tw.type === 'hospital' ? 0.3 : tw.type === 'chw' ? 0.25 : 0;
      if (hv) for (i = 0; i < tw.bld.length; i++) blds[tw.bld[i]].health += hv;
      // CHW boost and radio uptake for health towers
      if (tw.type === 'lab' || tw.type === 'clinic' || tw.type === 'hospital') {
        var boost = 1, d = this.city.district[tw.tile];
        for (i = 0; i < chws.length; i++) {
          var c = chws[i], dx = c.x - tw.x, dy = c.y - tw.y;
          if (dx * dx + dy * dy <= c.st.range * c.st.range) boost = Math.max(boost, this.access[d] < 0.25 || D.DISTRICTS[d].baseAccess < 0.25 ? c.st.boostUnderserved : c.st.boost);
        }
        tw.boost = boost;
        var um = 1;
        for (i = 0; i < this.towers.length; i++) {
          var rt = this.towers[i]; if (rt.type !== 'radio') continue;
          var rx = rt.x - tw.x, ry = rt.y - tw.y;
          if (rx * rx + ry * ry <= rt.st.range * rt.st.range) um = Math.max(um, rt.st.uptakeMult);
        }
        tw.uptakeMult = um;
      }
    }
    var cov = D.DISTRICTS.map(function () { return 0; });
    for (i = 0; i < blds.length; i++) { blds[i].compBonus = blds[i].cRadio + blds[i].cPantry; cov[blds[i].d] += blds[i].orig * Math.min(1, blds[i].health); }
    for (i = 0; i < chws.length; i++) { var cd = this.city.district[this.tileOf(chws[i].x, chws[i].y)]; this.chwCover[cd] = Math.max(this.chwCover[cd], 0.5); }
    this.coverage = cov.map(function (v, j) { return self.distOrig[j] ? v / self.distOrig[j] : 0; });
    this.dirty = false;
  };

  G.perSecond = function (init) {
    var self = this, blds = this.blds, i, k;
    if (!init) {
      this.secIdx = (this.secIdx + 1) % WIN;
      for (k in this.win) this.win[k][this.secIdx] = 0;
    }
    this.recomputeMods();
    var hasChw = false;
    for (i = 0; i < this.towers.length; i++) if (this.towers[i].type === 'chw') { hasChw = true; if (!init) this.chwSecond(this.towers[i]); }
    if (this.dirty || hasChw || init) this.recomputeCoverage();

    // Totals
    var t = { S: 0, E: 0, Ek: 0, V: 0, R: 0, D: 0, Z: 0, zAgents: this.nZombies, walkers: this.nWalkers, knownWalk: 0, eWalk: 0 };
    var nd = D.DISTRICTS.length, dAlive = new Array(nd).fill(0), dImm = new Array(nd).fill(0), work = 0;
    var dComp = new Array(nd);
    for (k = 0; k < nd; k++) {
      dComp[k] = CFG.complianceBase + CFG.complianceTrust * this.districtTrust(k) / 100 - CFG.compliancePanic * this.panic / 100 + this.em.compliance;
    }
    this.srcTotal = 0;
    for (i = 0; i < blds.length; i++) {
      var b = blds[i];
      t.S += b.S; t.E += b.E; t.Ek += b.Ek; t.V += b.V; t.R += b.R; t.D += b.D; t.Z += b.Z;
      var alive = b.S + b.E + b.Ek + b.V + b.R;
      dAlive[b.d] += alive; dImm[b.d] += b.V + b.R;
      work += (b.S + b.E + b.V + b.R) * D.DISTRICTS[b.d].wealth;
      b.comp = C.clamp(dComp[b.d] + b.compBonus, 0.03, 0.97);
      var mobile = b.S + b.E + b.V + b.R + b.Ek * (1 - b.comp);
      this.srcTotal += mobile * b.tripMult;
      this.srcCum[i] = this.srcTotal;
    }
    for (i = 0; i < this.agents.length; i++) {
      var a = this.agents[i]; if (a.dead || a.kind !== 0) continue;
      if (a.st === E) { t.eWalk++; if (a.known) t.knownWalk++; }
      dAlive[this.city.district[this.tileOf(a.x, a.y)]]++;
      work += 0.6;
    }
    t.zombies = t.zAgents + t.Z;
    t.knownE = t.Ek + t.knownWalk;
    t.trueE = t.E + t.Ek + t.eWalk;
    t.healthyLooking = t.S + t.V + t.R + t.E + (t.walkers - t.knownWalk);
    t.aliveNonZ = t.S + t.E + t.Ek + t.V + t.R + t.walkers;
    t.active = t.zombies + t.trueE;
    this.totals = t;
    var em = this.em, wd = this.weatherDef();
    // Civil unrest: when trust collapses, people stop following guidance
    this.unrest = C.clamp((CFG.unrestTrust - this.trust) / CFG.unrestTrust, 0, 1);
    this.commuteRate = CFG.commuteRate * em.mobility * wd.mobility * (1 + this.panic / 120) * (1 + CFG.unrestMobility * this.unrest);
    if (init) return;
    var nBar = this.countTowers('barricade');

    // Income
    var inc = CFG.taxPerResident * work * em.income * Math.max(0.4, 1 - D.TOWERS.barricade.incomePenalty * nBar) *
      (1 - this.panic / 250) * (0.6 + 0.4 * this.trust / 100) * (1 - CFG.unrestIncome * this.unrest);
    this.budget += inc;

    // Trust
    var dTrust = 0, radioN = 0;
    for (i = 0; i < this.towers.length; i++) {
      var tw = this.towers[i], st = tw.st;
      if (tw.type === 'militia') dTrust -= st.trustDrain * st.trustDrainMult * em.militiaTrust;
      if (tw.type === 'radio') { dTrust += st.trustGain / (1 + 0.6 * radioN); radioN++; }
      if (tw.type === 'hospital') {
        var sumE = 0; for (k = 0; k < tw.bld.length; k++) sumE += blds[tw.bld[k]].E; tw.sumE = sumE;
      }
    }
    if (nBar > 3) dTrust -= (nBar - 3) * D.TOWERS.barricade.trustDrain;
    if (t.zombies < 5 && this.wave >= 1) dTrust += 0.025;
    if (this.panic > 60) dTrust -= 0.02;
    this.trust = C.clamp(this.trust + dTrust, 0, 100);

    // Panic: drifts toward a target set by what people see and hear
    var sum = function (arr) { var s = 0; for (var j = 0; j < arr.length; j++) s += arr[j]; return s; };
    var deaths30 = sum(this.win.deaths), shots30 = sum(this.win.shots);
    var target = 100 * (1 - Math.exp(-(t.zAgents * 0.5 + deaths30 * 0.6 + shots30 * 0.15) / 90));
    this.panic += (target - this.panic) * 0.05;
    for (i = 0; i < this.towers.length; i++) {
      var tw2 = this.towers[i];
      if (tw2.type === 'radio' || tw2.type === 'pantry') this.panic -= tw2.st.panicDrop;
    }
    this.panic = C.clamp(this.panic, 0, 100);

    // Equity: protection and survival, worst district vs. best district
    var P = [], Sv = [];
    for (k = 0; k < nd; k++) {
      if (!this.distOrig[k]) continue;
      var imm = dAlive[k] > 0 ? dImm[k] / dAlive[k] : 0;
      P.push(0.35 * Math.min(1, this.access[k]) + 0.35 * this.coverage[k] + 0.3 * imm);
      Sv.push(1 - this.stats.distDeaths[k] / this.distOrig[k]);
    }
    var minP = Math.min.apply(null, P), maxP = Math.max.apply(null, P), minS = Math.min.apply(null, Sv), maxS = Math.max.apply(null, Sv);
    this.equity = C.clamp(100 * (0.6 * (minP + 0.03) / (maxP + 0.03) + 0.4 * (Math.max(0, minS) + 0.01) / (maxS + 0.01)), 0, 100);

    // R_eff estimate from completed infectious "careers" in the last 30 s
    var off = sum(this.win.off), rem = sum(this.win.rem), turn = sum(this.win.turn), cureE = sum(this.win.cureE);
    if (rem >= 3) {
      var raw = (off / rem) * (turn / (turn + cureE + 0.001));
      this.reff += (raw - this.reff) * 0.25;
      if (rem >= 6 && this.t > 30 && this.reff > this.stats.peakR) { this.stats.peakR = this.reff; this.stats.peakRt = this.t; }
    } else if (t.active === 0) this.reff *= 0.8;
    // Confidence: share of residents covered by testing
    var tested = 0;
    for (i = 0; i < blds.length; i++) if (this.t - blds[i].seenT < 10) tested += blds[i].orig;
    this.reffConf = this.flags.wastewater ? 1 : tested / this.totalPop;

    if (t.zombies > this.stats.peakZ) { this.stats.peakZ = t.zombies; this.stats.peakZt = this.t; }
    if (t.trueE > this.stats.peakE) this.stats.peakE = t.trueE;
    if (this.vaccines >= 1) this.stockout = false;
    if (this.newsFlags.overflowNow && this.t % 20 < 1) this.newsFlags.overflowNow = false;

    // Reactive headlines
    if (this.trust < 25) this.news('lowTrust', null, true);
    if (this.panic > 65) this.news('highPanic', null, true);
    if (this.reff > 1.6 && t.zombies > 15) this.news('rising', { r: (Math.floor(this.reff * 10) / 10).toFixed(1) }, true);

    // Early collapse
    if (this.phase === 'wave' && t.aliveNonZ < CFG.collapseThreshold * this.totalPop) this.finish('collapse');
    // Final Push ends as soon as the city is clear
    if (this.phase === 'wave' && this.overtime && t.active === 0) this.finish('complete');
  };

  G.sample = function () {
    var t = this.totals;
    this.history.push({ t: Math.round(this.t), w: this.wave, z: t.zombies, ek: t.knownE, e: t.trueE, d: this.stats.deaths, v: this.stats.vaccinated, r: Math.round(this.reff * 100) / 100, tr: Math.round(this.trust), eq: Math.round(this.equity) });
  };

  /* ================= Waves ================= */
  G.step = function () {
    if (this.phase !== 'wave' && this.phase !== 'attract') return;
    this.tick++; this.t += DT;
    if (this.phase === 'wave') { this.waveTime += DT; this.updateSpawns(); }
    this.rebuildBuckets();
    this.updateBuildings();
    this.launchWalkers();
    this.updateAgents();
    if (this.phase === 'wave') this.updateTowers();
    this.compact();
    if (this.tick % CFG.simHz === 0) this.perSecond();
    if (this.phase === 'wave' && this.tick % (CFG.simHz * 2) === 0) this.sample();
    if (this.phase === 'wave' && this.waveTime >= this.waveDuration + (this.overtime ? CFG.finalPush : 0)) this.endWave();
  };

  G.updateSpawns = function () {
    var q = this.spawnQueue, W = this.W;
    while (q && q.length && q[0].t <= this.waveTime) {
      var s = q.shift(), ex = s.entry % W + 0.5, ey = ((s.entry / W) | 0) + 0.5;
      if (s.imp) {
        var dst = this.blds[s.dest], path = this.getPath(s.entry, dst.door, false);
        if (path && this.nWalkers < CFG.maxWalkers + 20) {
          this.spawnWalker(E, ex, ey, path, dst.id, false, s.inc, dst.d);
          this.stats.imports++;
        } else { dst.E++; this.stats.imports++; }
      } else if (this.nZombies < CFG.maxZombies + 10) {
        var oz = this.spawnZombie(s.type, ex, ey, s.entry, 0, -1);
        oz.outsider = true;
        this.stats.imports++;
        this.emit({ k: 'arrive', x: ex, y: ey, type: s.type });
      }
    }
  };

  G.startWave = function () {
    if (this.phase !== 'build') return { ok: false };
    this.wave++; this.waveTime = 0; this.phase = 'wave';
    var def = this.waveDefs[this.wave - 1], plan = this.plans[this.wave - 1];
    this.weather = def.weather;
    // Delayed consequences that come due this wave
    for (var i = 0; i < this.pending.length; i++) {
      var p = this.pending[i];
      if (p.done || p.wave > this.wave) continue;
      p.done = true;
      this.applyFx(p.fx);
      this.annotations.push({ t: this.t, kind: 'consequence', label: p.text });
      var dec = this.decisions[p.decision]; if (dec) dec.consequences.push(p.text);
      this.emit({ k: 'consequence', text: p.text });
    }
    this.recomputeMods();
    var mil = this.countTowers('militia');
    var mult = this.diff.spawn * this.em.spawn * (1 + mil * D.TOWERS.militia.spawnPenalty);
    var dur = this.waveDuration * CFG.spawnWindow, q = [];
    D.ZOMBIE_ORDER.forEach(function (type, k) {
      var n = Math.min(plan.z[k].length, Math.round(def.z[k] * mult));
      for (var j = 0; j < n; j++) q.push({ t: plan.z[k][j].t * dur, entry: plan.z[k][j].entry, type: type });
    });
    var ni = Math.min(plan.imports.length, Math.round(def.imports * this.em.imports * this.diff.spawn));
    for (i = 0; i < ni; i++) { var im = plan.imports[i]; q.push({ t: im.t * dur, entry: im.entry, imp: true, dest: im.dest, inc: im.inc }); }
    q.sort(function (a, b) { return a.t - b.t; });
    this.spawnQueue = q;
    this.waveSpawnCount = q.length;
    this.annotations.push({ t: this.t, kind: 'wave', label: 'Wave ' + this.wave });
    this.cmd('start', []);
    this.news('waveStart', { w: this.wave });
    this.emit({ k: 'waveStart', w: this.wave });
    this.waveStartStats = { deaths: this.stats.deaths, infections: this.stats.infections, budget: this.budget };
    return { ok: true };
  };

  G.endWave = function () {
    if (this.wave >= this.totalWaves) {
      // Final Push: a short overtime with no new arrivals to clear the last cases
      if (!this.overtime && this.totals.active > 0) {
        this.overtime = true; this.emit({ k: 'finalPush' }); this.annotations.push({ t: this.t, kind: 'wave', label: 'Final Push' });
        return;
      }
      this.finish('complete'); return;
    }
    var qb = this.quick ? CFG.quickBonus : 1;
    var grant = Math.round(CFG.waveGrant * this.diff.grant * qb * (this.flags.honest ? 1.1 : 1));
    var doses = Math.round(CFG.waveVaccines * this.diff.vaccines * qb);
    this.budget += grant; this.vaccines += doses;
    var ws = this.waveStartStats || { deaths: 0, infections: 0 };
    this.waveSummary = { wave: this.wave, grant: grant, doses: doses, deaths: this.stats.deaths - ws.deaths, infections: this.stats.infections - ws.infections };
    this.stats.maxDeathsWave = Math.max(this.stats.maxDeathsWave, this.waveSummary.deaths);
    this.sample();
    var card = this.drawCard();
    if (card) { this.phase = 'briefing'; this.briefing = { card: card, wave: this.wave }; }
    else this.phase = 'build';
    this.emit({ k: 'waveEnd', w: this.wave });
  };

  G.drawCard = function () {
    for (var i = 0; i < this.deck.length; i++) {
      var ev = null;
      for (var j = 0; j < D.EVENTS.length; j++) if (D.EVENTS[j].id === this.deck[i]) ev = D.EVENTS[j];
      if (!ev) continue;
      if (ev.minWave && this.wave < ev.minWave) continue;
      if (ev.minDeaths && this.stats.deaths < ev.minDeaths) continue;
      this.deck.splice(i, 1);
      return ev;
    }
    return null;
  };

  G.choose = function (idx) {
    if (this.phase !== 'briefing' || !this.briefing) return { ok: false };
    var card = this.briefing.card, opt = card.options[idx];
    if (!opt) return { ok: false };
    var fx = typeof opt.fx === 'function' ? opt.fx(this) : opt.fx;
    this.applyFx(fx);
    var di = this.decisions.length;
    this.decisions.push({ wave: this.wave, id: card.id, title: card.title, choice: opt.label, result: opt.result, consequences: [], fx: fx });
    var self = this;
    (opt.later || []).forEach(function (l) { self.pending.push({ wave: self.wave + l.waves, fx: l.fx, text: l.text, decision: di }); });
    this.annotations.push({ t: this.t, kind: 'decision', label: card.title + ': ' + opt.label });
    this.lastResult = { title: card.title, text: opt.result, fx: fx };
    this.briefing = null; this.phase = 'build';
    this.cmd('choose', [idx]);
    this.recomputeMods();
    return { ok: true };
  };

  G.applyFx = function (fx) {
    if (!fx) return;
    var k;
    if (fx.budget) this.budget = Math.max(0, this.budget + fx.budget);
    if (fx.vaccines) this.vaccines = Math.max(0, this.vaccines + fx.vaccines);
    if (fx.trust) this.trust = C.clamp(this.trust + fx.trust, 0, 100);
    if (fx.panic) this.panic = C.clamp(this.panic + fx.panic, 0, 100);
    if (fx.beds) this.bonusBeds += fx.beds;
    if (fx.mods) for (k in fx.mods) { if (ADD_MODS[k]) this.mods[k] += fx.mods[k]; else this.mods[k] *= fx.mods[k]; }
    if (fx.temp) this.temps.push({ until: this.wave + fx.temp.waves, mods: fx.temp.mods });
    if (fx.access) for (k in fx.access) { var di = DIST_IDX[k]; if (di !== undefined) this.access[di] = C.clamp(this.access[di] + fx.access[k], 0, 1); }
    if (fx.flags) for (k in fx.flags) this.flags[k] = fx.flags[k];
    if (fx.inc) for (k in fx.inc) this.counters[k] = (this.counters[k] || 0) + fx.inc[k];
    if (fx.freeTower) this.freeTowers[fx.freeTower] = (this.freeTowers[fx.freeTower] || 0) + 1;
    if (fx.custom === 'detain') this.detainKnown();
    if (fx.access && fx.access.east < 0) this.localTrust[DIST_IDX.east] -= 3;
    this.recomputeMods();
    this.dirty = true;
  };

  // Stadium detention: known-exposed people are removed from their homes. Without care, they are lost.
  G.detainKnown = function () {
    var n = 0, i;
    for (i = 0; i < this.blds.length; i++) {
      var b = this.blds[i];
      while (b.Ek > 0) { b.Ek--; b.D++; n++; this.death(b.d, b.cx, b.cy, 'detained'); this.recordRemoval(0); }
    }
    for (i = 0; i < this.agents.length; i++) {
      var a = this.agents[i];
      if (!a.dead && a.kind === 0 && a.known && a.st === E) { this.removeAgent(a); n++; this.death(this.blds[a.dest].d, a.x, a.y, 'detained'); this.recordRemoval(0); }
    }
    this.stats.detained += n;
    this.localTrust[DIST_IDX.east] -= 8;
  };

  /* ================= Endings ================= */
  G.finish = function (reason) {
    if (this.phase === 'ended') return;
    this.perSecond(true);
    this.sample();
    this.phase = 'ended'; this.endReason = reason;
    this.ending = this.computeEnding();
    this.annotations.push({ t: this.t, kind: 'end', label: D.ENDINGS[this.ending].title });
    this.emit({ k: 'ended', ending: this.ending });
  };

  G.survival = function () { return this.totals.aliveNonZ / this.totalPop; };

  G.computeEnding = function () {
    var t = this.totals, surv = this.survival(), active = t.active;
    var auth = this.counters.auth + this.countTowers('militia') * 0.35 + Math.max(0, this.countTowers('barricade') - 3) * 0.3;
    this.authScore = auth;
    if (this.endReason === 'collapse' || surv < 0.55 || active > 0.12 * this.totalPop) return 'collapse';
    if (this.counters.spin >= 3 && this.trust < 30) return 'zombieMayor';
    var clear = Math.max(3, Math.round(0.003 * this.totalPop));
    if (active <= 3 && surv >= 0.85 && this.trust >= 72 && this.equity >= 70 && !this.stats.everBuilt.militia) return 'modelCity';
    if (this.trust < 20 || (auth >= 4 && this.trust < 35)) return 'hollow';
    if (this.equity < 40) return 'twoTier';
    if (active <= clear && this.reff < 1 && surv >= 0.8) return 'eradication';
    return 'endemic';
  };

  /* ================= Report data ================= */
  G.report = function () {
    var st = this.stats, t = this.totals, self = this;
    var tc = {}; D.TOWER_ORDER.forEach(function (k) { tc[k] = st.built[k] || 0; });
    var worst = 0, worstRate = -1;
    D.DISTRICTS.forEach(function (d, k) {
      var rate = self.distOrig[k] ? st.distDeaths[k] / self.distOrig[k] : 0;
      if (rate > worstRate) { worstRate = rate; worst = k; }
    });
    var detectionRate = st.infections ? Math.min(1, st.revealed / st.infections) : 0;
    return {
      name: this.opts.name || '', seed: this.seed, difficulty: this.diffKey, quick: this.quick, ending: this.ending,
      survival: this.survival(), deaths: st.deaths, infections: st.infections, trust: Math.round(this.trust), equity: Math.round(this.equity),
      panic: Math.round(this.panic), peakR: Math.round(st.peakR * 10) / 10, peakZ: st.peakZ, strayDeaths: st.strayDeaths, kills: st.kills,
      revealed: st.revealed, vaccinated: st.vaccinated, cured: st.cured, captured: st.captured, contained: st.contained, detained: st.detained,
      detectionRate: detectionRate, detectionPct: Math.round(detectionRate * 100),
      vaxCoverage: st.vaccinated / this.totalPop, vaxPct: Math.round(100 * st.vaccinated / this.totalPop),
      towerCounts: tc, barricades: tc.barricade, spin: this.counters.spin, auth: Math.round(this.counters.auth * 10) / 10, flags: this.flags,
      overflowSeconds: Math.round(st.overflowSeconds), worstDistrict: D.DISTRICTS[worst].name, wave: this.wave, totalWaves: this.totalWaves,
      budget: Math.round(this.budget), vaccines: Math.round(this.vaccines), decisions: this.decisions, active: t.active, t: Math.round(this.t)
    };
  };

  /* ================= Replay (save / resume, class replays) ================= */
  G.apply = function (e) {
    switch (e.c) {
      case 'place': return this.place(e.a[0], e.a[1], e.a[2]);
      case 'upgrade': return this.upgrade(e.a[0]);
      case 'sell': return this.sell(e.a[0]);
      case 'move': return this.moveTeam(e.a[0], e.a[1], e.a[2]);
      case 'start': return this.startWave();
      case 'choose': return this.choose(e.a[0]);
    }
  };

  // Rebuilds a game from its command log, a few thousand ticks per slice.
  function replay(opts, log, toTick, onDone, slice) {
    var g = new Game(Object.assign({}, opts, { fx: false })), i = 0;
    var run = function () {
      var budget = slice || 1e9;
      while (budget-- > 0) {
        if (i < log.length && log[i].k <= g.tick) { g.apply(log[i]); i++; continue; }
        if (g.tick >= toTick && i >= log.length) break;
        if (g.phase !== 'wave') { if (i < log.length) { g.apply(log[i]); i++; continue; } break; }
        g.step();
      }
      if ((i < log.length || (g.tick < toTick && g.phase === 'wave')) && slice) return setTimeout(run, 0);
      g.fxOn = opts.fx !== false; g.fx.length = 0;
      onDone(g);
    };
    run();
  }

  NS.sim = { Game: Game, DT: DT, replay: replay, STATES: { S: S, E: E, V: V, R: R } };
})(typeof window !== 'undefined' ? window : globalThis);
