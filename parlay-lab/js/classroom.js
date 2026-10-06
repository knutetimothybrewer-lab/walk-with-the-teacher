/*
 * classroom.js — class codes, teacher settings, student session state, and game preparation.
 *
 * GAME STATE  (decided only by the class code):  matchup, rosters, pregame stats, probabilities, timeline.
 * STUDENT STATE (decided by the student):         predictions, slips, tokens, answers, history.
 * The two are kept in separate objects. prepareGame() builds game state from the seed alone — it
 * never receives any student information, so a student cannot influence a game.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};

  // ------------------------------------------------------------------ teacher configuration
  var DEFAULT_CONFIG = {
    startTokens: 1000,      // Lab Tokens each student begins with
    maxStake: 100,          // most Lab Tokens allowed on one slip
    maxLegs: 8,             // most predictions allowed on one slip (1–12)
    speed: 1,               // starting playback speed (1, 2 or 4)
    houseMargin: 0.05,      // built-in margin per leg (0.05 = 5%)
    reflectionFreq: 'sometimes', // off | sometimes | often | always
    difficulty: 'standard', // intro | standard | advanced  (changes what is shown, never the game)
    probVisibility: 'auto', // auto (follows mode) | visible | on-request | after-lock
    quarterMinutes: 12,     // 6 (short), 9 (medium) or 12 (full) minute quarters
    modelSamples: 500       // how many replays estimate each probability
  };

  function num(v, lo, hi, dflt) {
    v = Number(v);
    if (!isFinite(v)) return dflt;
    return Math.max(lo, Math.min(hi, v));
  }
  function oneOf(v, list, dflt) { return list.indexOf(v) >= 0 ? v : dflt; }

  function sanitizeConfig(raw) {
    raw = raw || {};
    var d = DEFAULT_CONFIG, c = {};
    c.startTokens = Math.round(num(raw.startTokens, 100, 100000, d.startTokens));
    c.maxStake = Math.round(num(raw.maxStake, 1, c.startTokens, Math.min(d.maxStake, c.startTokens)));
    c.maxLegs = Math.round(num(raw.maxLegs, 1, 12, d.maxLegs));
    c.speed = oneOf(Number(raw.speed), [1, 2, 4], d.speed);
    c.houseMargin = Math.round(num(raw.houseMargin, 0, 0.25, d.houseMargin) * 1000) / 1000;
    c.reflectionFreq = oneOf(raw.reflectionFreq, ['off', 'sometimes', 'often', 'always'], d.reflectionFreq);
    c.difficulty = oneOf(raw.difficulty, ['intro', 'standard', 'advanced'], d.difficulty);
    c.probVisibility = oneOf(raw.probVisibility, ['auto', 'visible', 'on-request', 'after-lock'], d.probVisibility);
    c.quarterMinutes = oneOf(Number(raw.quarterMinutes), [6, 9, 12], d.quarterMinutes);
    c.modelSamples = Math.round(num(raw.modelSamples, 200, 1500, d.modelSamples));
    return c;
  }

  /** Is probability shown right now, given mode + teacher setting + whether slip is locked? */
  function probabilityMode(cfg, mode) {
    if (cfg.probVisibility !== 'auto') return cfg.probVisibility;
    return mode === 'experience' ? 'on-request' : 'visible';
  }

  // ------------------------------------------------------------------ seeds & links
  function gameSeed(classSeed, gameNo) { return gameNo <= 1 ? classSeed : classSeed + '#' + gameNo; }

  var LINK_KEYS = { startTokens: 't', maxStake: 's', maxLegs: 'l', houseMargin: 'm', quarterMinutes: 'q', difficulty: 'd',
    probVisibility: 'v', reflectionFreq: 'r', speed: 'sp', modelSamples: 'n' };

  /** Student link that carries the class code and any non-default teacher settings. */
  function buildStudentLink(baseUrl, code, cfg, mode) {
    var parts = ['c=' + encodeURIComponent(code)];
    Object.keys(LINK_KEYS).forEach(function (k) {
      if (cfg[k] !== DEFAULT_CONFIG[k]) parts.push(LINK_KEYS[k] + '=' + encodeURIComponent(k === 'houseMargin' ? Math.round(cfg[k] * 1000) / 10 : cfg[k]));
    });
    if (mode) parts.push('md=' + mode);
    return baseUrl.split('#')[0] + '#' + parts.join('&');
  }
  function parseLink(hash) {
    var h = String(hash || '').replace(/^#/, '');
    if (!h) return null;
    var params = {};
    h.split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i > 0) { try { params[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); } catch (e) { /* ignore */ } }
    });
    if (!params.c) return null;
    var raw = {};
    Object.keys(LINK_KEYS).forEach(function (k) {
      var v = params[LINK_KEYS[k]];
      if (v !== undefined) raw[k] = (k === 'houseMargin') ? Number(v) / 100 : (k === 'difficulty' || k === 'probVisibility' || k === 'reflectionFreq') ? v : Number(v);
    });
    var merged = Object.assign({}, DEFAULT_CONFIG, raw);
    return { code: params.c, config: sanitizeConfig(merged), mode: ['guided', 'experience', 'stats'].indexOf(params.md) >= 0 ? params.md : null };
  }

  // ------------------------------------------------------------------ pregame information
  function buildPregame(matchup, model, seed) {
    var rng = PL.createSeededRandom(seed + '|pregame');
    var cal = PL.League.calibrate();
    var season = PL.League.buildSeason(seed);
    var byId = {}; season.forEach(function (r) { byId[r.id] = r; });
    function teamRow(team) {
      var c = cal[team.id], s = byId[team.id];
      return { id: team.id, name: team.name, record: s.w + '-' + s.l, w: s.w, l: s.l, last5: s.last5.join(' '), streak: s.streak,
        ppg: c.ppg, papg: c.papg, ortg: c.ortg, drtg: c.drtg, homePpg: c.homePpg, awayPpg: c.awayPpg, homeMargin: c.homeMargin, awayMargin: c.awayMargin, net: c.net };
    }
    var playerRows = matchup.players.map(function (p) {
      var pr = {
        gid: p.gid, id: p.id, name: p.name, pos: p.pos, num: p.num, teamIdx: p.teamIdx, starter: p.starter,
        mpg: model.sumMin[p.gid] / model.N,
        fg: model.sumFga[p.gid] ? model.sumFgm[p.gid] / model.sumFga[p.gid] : 0,
        ppg: model.mean('pts:' + p.id) * (1 + rng.normal(0, 0.03)),
        rpg: model.mean('reb:' + p.id) * (1 + rng.normal(0, 0.03)),
        apg: model.mean('ast:' + p.id) * (1 + rng.normal(0, 0.03)),
        tpg: model.mean('tpm:' + p.id) * (1 + rng.normal(0, 0.03)),
        rating: p.rating
      };
      pr.recent = model.mean('pts:' + p.id) * (1 + rng.normal(0, 0.10));
      return pr;
    });
    // Gambler's-fallacy scenario: a team on a losing streak (cosmetic — the engine ignores streaks)
    var story = null, tms = [matchup.home, matchup.away];
    for (var i = 0; i < tms.length; i++) {
      var st = byId[tms[i].id].streak;
      if (st.type === 'L' && st.n >= 3 && (!story || st.n > story.n)) story = { team: tms[i].name, n: st.n, elsewhere: false };
    }
    if (!story) {
      season.forEach(function (r) { if (r.streak.type === 'L' && r.streak.n >= 3 && (!story || r.streak.n > story.n)) story = { team: r.name, n: r.streak.n, elsewhere: true }; });
    }
    if (!story) story = { team: tms[0].name, n: 4, elsewhere: false, hypothetical: true };
    return { season: season, teams: [teamRow(matchup.home), teamRow(matchup.away)], players: playerRows, story: story };
  }

  /**
   * Build EVERYTHING that belongs to a game from the seed alone.
   * Returns a promise so the screen can show a progress bar while the replays run.
   */
  function prepareGame(classSeed, gameNo, cfg, onProgress) {
    var seed = gameSeed(classSeed, gameNo);
    var qSec = cfg.quarterMinutes * 60;
    var matchup = PL.League.createMatchup(seed);
    var result = PL.Basketball.simulateGame(matchup, PL.createSeededRandom(seed + '|game'), { record: true, quarterSeconds: qSec });
    var game = {
      seed: seed, gameNo: gameNo, matchup: matchup, players: matchup.players, events: result.events,
      quarterSeconds: qSec, result: result, totalTime: result.events.length ? result.events[result.events.length - 1].t : 0
    };
    return PL.Model.buildAsync(matchup, seed, { N: cfg.modelSamples, quarterSeconds: qSec }, onProgress).then(function (model) {
      var market = PL.Props.buildMarket(matchup, model);
      var pregame = buildPregame(matchup, model, seed);
      return { seed: seed, gameNo: gameNo, game: game, model: model, market: market, pregame: pregame };
    });
  }

  /** Synchronous variant for tests. */
  function prepareGameSync(classSeed, gameNo, cfg) {
    var seed = gameSeed(classSeed, gameNo), qSec = cfg.quarterMinutes * 60;
    var matchup = PL.League.createMatchup(seed);
    var result = PL.Basketball.simulateGame(matchup, PL.createSeededRandom(seed + '|game'), { record: true, quarterSeconds: qSec });
    var game = { seed: seed, gameNo: gameNo, matchup: matchup, players: matchup.players, events: result.events, quarterSeconds: qSec, result: result,
      totalTime: result.events.length ? result.events[result.events.length - 1].t : 0 };
    var model = PL.Model.build(matchup, seed, { N: cfg.modelSamples, quarterSeconds: qSec });
    return { seed: seed, gameNo: gameNo, game: game, model: model, market: PL.Props.buildMarket(matchup, model), pregame: buildPregame(matchup, model, seed) };
  }

  // ------------------------------------------------------------------ student session state
  function createSession(o) {
    var cfg = sanitizeConfig(o.config);
    return {
      version: 1, id: PL.generateClassCode(8), createdAt: Date.now(),
      classCode: o.classCode, practice: !!o.practice, mode: o.mode || 'guided', teacher: !!o.teacher,
      config: cfg, startTokens: cfg.startTokens, balance: cfg.startTokens,
      gameNo: 1, phase: 'prep',
      draft: { legs: [], stake: Math.min(25, cfg.maxStake) },
      slips: [],            // slips locked for the CURRENT game
      history: [],          // every resolved slip, all games
      games: [],            // one summary per finished game
      balanceAtGameStart: cfg.startTokens,
      playback: { index: 0, speed: cfg.speed },
      answers: { addLeg: [], nearMiss: [], fallacy: [], reflections: [], peeks: 0 },
      seenLessons: {}
    };
  }

  /** Lock the draft as a slip. Tokens leave the balance immediately. Returns the slip or throws a message. */
  function lockSlip(state, market) {
    var cfg = state.config, d = state.draft;
    if (state.phase !== 'prep') throw new Error('Predictions are locked once the game starts.');
    if (!d.legs.length) throw new Error('Add at least one prediction first.');
    var chk = PL.Parlay.checkStake(d.stake, state.balance, cfg);
    if (!chk.ok) throw new Error(chk.reason);
    var slip = PL.Parlay.createSlip(d.legs, chk.value, market, cfg, state.gameNo, state.slips.length + 1);
    state.balance -= chk.value;
    state.slips.push(slip);
    state.draft = { legs: [], stake: Math.min(d.stake, cfg.maxStake) };
    return slip;
  }

  /** After the game: resolve every locked slip, credit tokens, write history. Idempotent per game. */
  function settleGame(state, prepared) {
    if (state.games.some(function (g) { return g.gameNo === state.gameNo; })) return null;
    var stats = prepared.game.result.stats, bal = state.balanceAtGameStart, outcomes = [];
    state.slips.forEach(function (slip) {
      var r = PL.Parlay.resolveSlip(slip, stats, prepared.market);
      slip.result = r.win ? 'WIN' : 'LOSS'; slip.hits = r.hits; slip.returned = r.returned; slip.nearMiss = r.nearMiss; slip.legResults = r.legResults;
      state.balance += r.returned;
      bal += r.returned - slip.stake;
      state.history.push({
        gameNo: slip.gameNo, slipNo: slip.slipNo, round: slip.gameNo + '.' + slip.slipNo, legs: slip.legs.length, stake: slip.stake,
        potentialReturn: slip.potentialReturn, p: slip.p, pInd: slip.pInd, firstLegP: slip.legsSnap[0].p, result: slip.result, hits: r.hits,
        returned: r.returned, endBalance: bal, nearMiss: r.nearMiss, legsSnap: slip.legsSnap, legResults: r.legResults
      });
      outcomes.push({ slip: slip, resolution: r });
    });
    var res = prepared.game.result;
    state.games.push({ gameNo: state.gameNo, seed: prepared.seed, home: prepared.game.matchup.home.name, away: prepared.game.matchup.away.name,
      score: res.score.slice(), ot: res.ot, net: state.balance - state.balanceAtGameStart, slips: state.slips.length });
    state.phase = 'post';
    return outcomes;
  }

  function startNextGame(state) {
    state.gameNo += 1;
    state.phase = 'prep';
    state.slips = [];
    state.draft = { legs: [], stake: Math.min(state.draft.stake || 25, state.config.maxStake) };
    state.balanceAtGameStart = state.balance;
    state.playback = { index: 0, speed: state.playback.speed };
  }

  /** Should "Add one more leg?" appear for this lock-in? (frequency set by teacher) */
  function shouldPromptAddLeg(state) {
    var f = state.config.reflectionFreq, n = state.answers.addLeg.length + (state._addLegSkips || 0);
    if (f === 'off') return false;
    if (f === 'always') return true;
    var every = f === 'often' ? 2 : 3;
    return state.history.length + state.slips.length >= 0 && ((state.slips.length + state.history.length) % every === 0);
  }

  PL.Classroom = {
    DEFAULT_CONFIG: DEFAULT_CONFIG, sanitizeConfig: sanitizeConfig, probabilityMode: probabilityMode,
    gameSeed: gameSeed, buildStudentLink: buildStudentLink, parseLink: parseLink,
    buildPregame: buildPregame, prepareGame: prepareGame, prepareGameSync: prepareGameSync,
    createSession: createSession, lockSlip: lockSlip, settleGame: settleGame, startNextGame: startNextGame,
    shouldPromptAddLeg: shouldPromptAddLeg
  };
})(typeof window !== 'undefined' ? window : globalThis);
