/*
 * gameEngine.js — possession-by-possession basketball simulation (fictional league).
 *
 * simulateGame(matchup, rng, opts) plays a whole game and returns:
 *   { events, live (final live state), score, qScores, ot, players (box score), stats }
 *
 * IMPORTANT DESIGN RULES
 *  - Only the seeded `rng` is used. Math.random() is never called here.
 *  - The engine knows NOTHING about students, predictions or tokens, so nothing a student does
 *    can change a game.
 *  - With opts.record = false the engine skips play-by-play text (used for fast Monte Carlo
 *    "model" runs). The cosmetic stream is a separate RNG so record on/off never changes results.
 *  - A "live" state object is the single source of truth for scores and stats. The engine updates
 *    it directly, and the playback screen rebuilds the very same state from the recorded events
 *    with applyEvent() — so what you watch always matches the final numbers.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};

  var STAT_KEYS = ['pts', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'reb', 'oreb', 'ast', 'stl', 'blk', 'tov', 'pf'];

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lastName(n) { var p = n.split(' '); return p[0].charAt(0) + '. ' + p.slice(1).join(' '); }

  function emptyPlayerStats() {
    var o = {};
    for (var i = 0; i < STAT_KEYS.length; i++) o[STAT_KEYS[i]] = 0;
    return o;
  }

  /** Fresh live state for a game with `nPlayers` players. */
  function newLive(nPlayers, quarterSeconds) {
    var players = [];
    for (var i = 0; i < nPlayers; i++) players.push(emptyPlayerStats());
    return {
      score: [0, 0], qs: [[0, 0]], period: 1, clock: quarterSeconds,
      players: players, firstScorer: null, maxLead: [0, 0],
      onCourt: [[], []], ot: false, regulationOver: false,
      started: false, final: false
    };
  }

  function recordScore(live, team, pts, period) {
    live.score[team] += pts;
    while (live.qs.length < period) live.qs.push([0, 0]);
    live.qs[period - 1][team] += pts;
    if (live.firstScorer === null) live.firstScorer = team;
    var diff = live.score[0] - live.score[1];
    if (diff > live.maxLead[0]) live.maxLead[0] = diff;
    if (-diff > live.maxLead[1]) live.maxLead[1] = -diff;
  }

  /** Apply one recorded event to a live state (used by the playback screen). */
  function applyEvent(live, ev) {
    live.started = true;
    live.period = ev.q;
    live.clock = ev.clock;
    if (ev.d) {
      for (var i = 0; i < ev.d.length; i++) live.players[ev.d[i][0]][ev.d[i][1]] += ev.d[i][2];
    }
    if (ev.pts) recordScore(live, ev.team, ev.pts, ev.q);
    if (ev.type === 'sub') {
      var oc = live.onCourt[ev.team], k = oc.indexOf(ev.out);
      if (k >= 0) oc[k] = ev.in;
    } else if (ev.type === 'tip') {
      live.onCourt = [ev.lineups[0].slice(), ev.lineups[1].slice()];
    } else if (ev.type === 'endq') {
      while (live.qs.length < ev.q) live.qs.push([0, 0]);
      if (ev.q >= 4) {
        live.regulationOver = true;
        if (ev.q === 4) live.ot = live.score[0] === live.score[1];
      }
    } else if (ev.type === 'final') {
      live.final = true;
      live.regulationOver = true;
    }
    return live;
  }

  /** Rebuild the live state from the first `count` events (used for pause/skip/restore). */
  function liveAt(game, count) {
    var live = newLive(game.players.length, game.quarterSeconds);
    var n = Math.min(count, game.events.length);
    for (var i = 0; i < n; i++) applyEvent(live, game.events[i]);
    return live;
  }

  /**
   * Convert a live state into the numbers predictions are made about.
   * Same function is used for the finished game and for the in-progress tracker.
   */
  function statVector(live, players) {
    var s = {};
    var h = live.score[0], a = live.score[1];
    s.margin = h - a;
    s.total = h + a;
    s.maxLead = Math.max(live.maxLead[0], live.maxLead[1]);
    s.ot = live.ot ? 1 : 0;
    s.homeFirst = live.firstScorer === null ? null : (live.firstScorer === 0 ? 1 : 0);
    var q1 = live.qs[0] || [0, 0];
    s.q1min = Math.min(q1[0], q1[1]);
    s.minScore = Math.min(h, a);
    var maxPts = 0;
    for (var g = 0; g < players.length; g++) {
      var p = live.players[g], id = players[g].id;
      s['pts:' + id] = p.pts;
      s['reb:' + id] = p.reb;
      s['ast:' + id] = p.ast;
      s['tpm:' + id] = p.tpm;
      if (p.pts > maxPts) maxPts = p.pts;
    }
    s.maxPts = maxPts;
    return s;
  }

  // ---------------------------------------------------------------------------------------------
  // The simulation itself
  // ---------------------------------------------------------------------------------------------

  var COURT_L = 94, COURT_W = 50, HOOP_X = 5.25;

  function simulateGame(matchup, rng, opts) {
    opts = opts || {};
    var record = !!opts.record;
    var qSec = opts.quarterSeconds || 720;
    var otSec = Math.round(qSec * 5 / 12);
    var cos = record ? rng.fork('cosmetic') : null;

    var teams = [matchup.home, matchup.away];
    var players = matchup.players; // 16 entries, gid = teamIdx*8 + i
    var live = newLive(players.length, qSec);
    var events = [];

    // ---- per-game "form" (the source of surprise nights) ----
    var teamForm = [rng.normal(0, 0.009), rng.normal(0, 0.009)];
    var pForm = [], fatigue = [], secs = [], out = [], onFloor = [];
    var g;
    for (g = 0; g < players.length; g++) {
      var wild = rng.chance(0.05) ? 2.2 : 1;           // occasional outlier night
      pForm.push(rng.normal(0, 0.034) * wild);
      fatigue.push(0); secs.push(0); out.push(false); onFloor.push(false);
    }
    var lineup = [[0, 1, 2, 3, 4], [8, 9, 10, 11, 12]];
    lineup[0].concat(lineup[1]).forEach(function (x) { onFloor[x] = true; });
    live.onCourt = [lineup[0].slice(), lineup[1].slice()];

    var avgPace = (teams[0].pace + teams[1].pace) / 2;
    var meanDur = 1.07 * 2880 / (2 * avgPace);
    var homeAdj = [teams[0].boost, 0];

    var period = 1, clock = qSec, elapsed = 0;
    var timeoutsLeft = [7, 7];
    var runPts = [0, 0], runTier = [0, 0];
    var possCount = [0, 0];
    var tipWinner = rng.chance(0.5) ? 0 : 1;
    var off = tipWinner;
    var putback = false;

    // ---- helpers ----
    var curDelta = null;
    function inc(gid, key, amt) {
      live.players[gid][key] += amt;
      if (record) curDelta.push([gid, key, amt]);
    }
    function tm(gid) { return gid < 8 ? 0 : 1; }
    function R(gid) { return players[gid].rating; }

    function emit(type, fields) {
      if (!record) return;
      var ev = {
        i: events.length, type: type, q: period, clock: Math.max(0, Math.round(clock * 10) / 10),
        t: Math.round(elapsed * 10) / 10, team: fields.team === undefined ? off : fields.team,
        score: [live.score[0], live.score[1]]
      };
      for (var k in fields) if (Object.prototype.hasOwnProperty.call(fields, k)) ev[k] = fields[k];
      ev.team = fields.team === undefined ? off : fields.team;
      if (curDelta && curDelta.length) ev.d = curDelta;
      curDelta = [];
      events.push(ev);
    }

    function lineupAgg(t) {
      var L = lineup[t], def = 0, reb = 0, play = 0, i;
      for (i = 0; i < 5; i++) {
        var r = R(L[i]), perf = 1 - 0.6 * fatigue[L[i]] * fatigue[L[i]];
        def += r.def * perf; reb += r.reb * perf; play += r.play;
      }
      return { def: def / 5, reb: reb / 5, play: play / 5 };
    }

    function weightedPlayer(t, weightFn) {
      var L = lineup[t], w = [], i;
      for (i = 0; i < 5; i++) w.push(Math.max(0.001, weightFn(L[i])));
      return L[rng.weighted(w)];
    }

    function scoreTeam(team, pts) {
      recordScore(live, team, pts, period);
      runPts[team] += pts; runPts[1 - team] = 0; runTier[1 - team] = 0;
    }

    function maybeRunAndTimeout(scorer) {
      var other = 1 - scorer, rp = runPts[scorer];
      var tiers = [8, 12, 16, 20, 24];
      for (var i = 0; i < tiers.length; i++) {
        if (rp >= tiers[i] && runTier[scorer] < tiers[i]) {
          runTier[scorer] = tiers[i];
          emit('run', { team: scorer, run: rp,
            text: teams[scorer].nickname + ' are on a ' + rp + '-0 run.' });
        }
      }
      if (rp >= 8 && timeoutsLeft[other] > 0 && clock > 20 && rng.chance(rp >= 10 ? 0.7 : 0.4)) {
        timeoutsLeft[other]--;
        runPts[scorer] = 0; runTier[scorer] = 0;
        for (var k = 0; k < 5; k++) {
          var a = lineup[other][k]; fatigue[a] = Math.max(0, fatigue[a] - 0.03);
        }
        emit('timeout', { team: other, pause: 2.2,
          text: 'Timeout, ' + teams[other].nickname + ' (' + rp + '-0 run against them).' });
      }
    }

    // ---- free throws ----
    // returns true when the last free throw missed (live ball)
    function freeThrows(shooter, n, ctxText) {
      var r = R(shooter), made = 0, lastMiss = false;
      for (var i = 0; i < n; i++) {
        var p = clamp(0.44 + r.ft * 0.0046 + pForm[shooter] * 0.3, 0.4, 0.95);
        inc(shooter, 'fta', 1);
        if (rng.chance(p)) { made++; inc(shooter, 'ftm', 1); inc(shooter, 'pts', 1); lastMiss = false; }
        else lastMiss = true;
      }
      var t = tm(shooter);
      if (made) scoreTeam(t, made);
      if (record) {
        emit('ft', { team: t, player: shooter, pts: made, n: n, made: made,
          text: lastName(players[shooter].name) + ' makes ' + made + ' of ' + n + ' free throw' + (n > 1 ? 's' : '') + (ctxText || '') + '.' });
      }
      if (made) maybeRunAndTimeout(t);
      return lastMiss;
    }

    function rebound(offTeam, afterFt) {
      var d = 1 - offTeam;
      var oa = lineupAgg(offTeam), da = lineupAgg(d);
      var pOr = clamp((afterFt ? 0.14 : 0.255) + (oa.reb - da.reb) * 0.0022, 0.1, 0.36);
      var isOff = rng.chance(pOr);
      var rbTeam = isOff ? offTeam : d;
      var gid = weightedPlayer(rbTeam, function (x) { var q = R(x).reb; return q * q * q / 1000; });
      inc(gid, 'reb', 1);
      if (isOff) inc(gid, 'oreb', 1);
      emit('rebound', { team: rbTeam, player: gid, offensive: isOff,
        text: lastName(players[gid].name) + ' grabs the ' + (isOff ? 'offensive' : 'defensive') + ' rebound.' });
      return isOff ? offTeam : d;
    }

    function shotLocation(isThree, dir) {
      var ang = cos.range(-1.25, 1.25), dist = isThree ? cos.range(23, 26) : cos.range(2, 19);
      var hx = dir > 0 ? COURT_L - HOOP_X : HOOP_X;
      return { x: hx - dir * dist * Math.cos(ang), y: COURT_W / 2 + dist * Math.sin(ang) };
    }
    function attackDir(team) { // +1 means attacking the right-hand basket
      var homeRight = period <= 2;
      return (team === 0) === homeRight ? 1 : -1;
    }

    // ---- the heart of the simulation: one possession ----
    function possession() {
      var o = off, d = 1 - o;
      possCount[o]++;
      var oa = lineupAgg(o), da = lineupAgg(d);

      var dur = clamp(rng.normal(meanDur, 4.6), 3, 24);
      if (putback) dur = clamp(dur * 0.5, 2, 12);
      var finalShot = false;
      if (dur >= clock) { dur = clock; finalShot = true; }
      clock -= dur; elapsed += dur;
      for (var i = 0; i < 16; i++) {
        if (onFloor[i]) { secs[i] += dur; fatigue[i] = Math.min(1, fatigue[i] + dur / (550 + 9 * R(i).stamina)); }
        else fatigue[i] = Math.max(0, fatigue[i] - dur / 800);
      }
      putback = false;
      curDelta = [];

      // 1) turnover?
      var pTO = clamp(0.128 - 0.0007 * (oa.play - 60) + 0.0008 * (da.def - 62), 0.07, 0.2);
      if (rng.chance(pTO)) {
        var culprit = weightedPlayer(o, function (x) { return R(x).usage; });
        inc(culprit, 'tov', 1);
        var stealer = -1;
        if (rng.chance(0.55)) {
          stealer = weightedPlayer(d, function (x) { var q = R(x).def; return q * q * q / 1000; });
          inc(stealer, 'stl', 1);
        }
        emit(stealer >= 0 ? 'steal' : 'turnover', { team: o, player: culprit, player2: stealer,
          text: stealer >= 0 ? lastName(players[stealer].name) + ' steals it from ' + lastName(players[culprit].name) + '.'
                             : lastName(players[culprit].name) + ' turns it over.' });
        off = d; return;
      }

      // 2) non-shooting foul (team in the bonus) -> two free throws
      if (rng.chance(0.045)) {
        var fouler = weightedPlayer(d, function (x) { return 110 - R(x).def; });
        inc(fouler, 'pf', 1);
        var fouled = weightedPlayer(o, function (x) { return R(x).usage; });
        emit('foul', { team: d, player: fouler, player2: fouled,
          text: 'Foul on ' + lastName(players[fouler].name) + '.' });
        var miss = freeThrows(fouled, 2, '');
        if (miss) { off = rebound(o, true); putback = off === o; }
        else off = d;
        return;
      }

      // 3) a shot
      var sh = weightedPlayer(o, function (x) { return R(x).usage * (1 - 0.35 * fatigue[x]) * Math.max(0.3, 1 + pForm[x] * 2.5); });
      var rs = R(sh);
      var isThree = rng.chance(clamp(rs.threeRate * (1 + (oa.play - 60) * 0.002), 0.01, 0.62));
      var perf = 0.05 * fatigue[sh] * fatigue[sh];
      var base = isThree
        ? 0.342 + (rs.three - 66) * 0.0034 - (da.def - 62) * 0.0021 + teamForm[o] * 0.7 + pForm[sh] * 0.85 + homeAdj[o]
        : 0.524 + (rs.finishing - 68) * 0.0042 - (da.def - 62) * 0.0036 + teamForm[o] + pForm[sh] + homeAdj[o];
      var pMake = clamp(base - perf, 0.18, 0.78);
      var made = rng.chance(pMake);
      var fouledShot = rng.chance(isThree ? 0.035 : 0.105);
      inc(sh, 'fga', 1); if (isThree) inc(sh, 'tpa', 1);

      var dir = record ? attackDir(o) : 1;
      var loc = record ? shotLocation(isThree, dir) : null;
      var pts = isThree ? 3 : 2;

      if (made) {
        inc(sh, 'fgm', 1); inc(sh, 'pts', pts); if (isThree) inc(sh, 'tpm', 1);
        var assister = -1;
        var pAst = clamp((isThree ? 0.82 : 0.58) + (oa.play - 60) * 0.003, 0.3, 0.95);
        if (rng.chance(pAst)) {
          assister = weightedPlayer(o, function (x) { if (x === sh) return 0; var q = R(x).play; return q * q / 100; });
          inc(assister, 'ast', 1);
        }
        scoreTeam(o, pts);
        var txt;
        if (record) {
          var nm = lastName(players[sh].name);
          txt = isThree ? cos.pick([nm + ' drains a three', nm + ' hits from deep', nm + ' knocks down the three'])
                        : cos.pick([nm + ' scores inside', nm + ' hits the jumper', nm + ' finishes at the rim', nm + ' sinks a mid-range shot']);
          if (assister >= 0) txt += ' (' + lastName(players[assister].name) + ' assist)';
          txt += fouledShot ? ' and is fouled!' : '.';
        }
        emit(isThree ? 'made3' : 'made2', { team: o, player: sh, player2: assister, pts: pts, x: loc && loc.x, y: loc && loc.y, text: txt });
        maybeRunAndTimeout(o);
        if (fouledShot) {
          var fd = weightedPlayer(d, function (x) { return 110 - R(x).def; });
          inc(fd, 'pf', 1);
          var mm = freeThrows(sh, 1, ' (and-one)');
          if (mm) { off = rebound(o, true); putback = off === o; return; }
        }
        off = d; return;
      }

      // missed shot
      if (fouledShot) {
        var fd2 = weightedPlayer(d, function (x) { return 110 - R(x).def; });
        inc(fd2, 'pf', 1);
        if (record) emit(isThree ? 'miss3' : 'miss2', { team: o, player: sh, x: loc.x, y: loc.y,
          text: lastName(players[sh].name) + ' misses but is fouled by ' + lastName(players[fd2].name) + '.' });
        var lastMiss = freeThrows(sh, isThree ? 3 : 2, '');
        if (lastMiss) { off = rebound(o, true); putback = off === o; }
        else off = d;
        return;
      }
      var blocker = -1;
      if (rng.chance(isThree ? 0.02 : 0.058)) {
        blocker = weightedPlayer(d, function (x) { var q = R(x).def; return q * q * q * (players[x].pos === 'C' ? 2 : 1) / 1000; });
        inc(blocker, 'blk', 1);
      }
      if (record) {
        var nm2 = lastName(players[sh].name);
        if (blocker >= 0) emit('block', { team: o, player: blocker, player2: sh, x: loc.x, y: loc.y,
          text: lastName(players[blocker].name) + ' blocks ' + nm2 + '!' });
        else emit(isThree ? 'miss3' : 'miss2', { team: o, player: sh, x: loc.x, y: loc.y,
          text: isThree ? cos.pick([nm2 + ' misses the three.', nm2 + ' rattles out a three.'])
                        : cos.pick([nm2 + ' misses the shot.', nm2 + ' can\'t convert at the rim.', nm2 + ' misses the jumper.']) });
      }
      off = rebound(o, false);
      putback = off === o;
    }

    // ---- substitutions (only at dead balls, so after possessions) ----
    function trySubs(t) {
      var swaps = 0;
      var closing = period >= 4 && clock < 360 && Math.abs(live.score[0] - live.score[1]) <= 10;
      for (var n = 0; n < 5 && swaps < 2; n++) {
        var L = lineup[t], pick = -1, need = 0;
        for (var i = 0; i < 5; i++) {
          var gg = L[i], nd = 0;
          var isStarter = players[gg].starter;
          var thr = (isStarter ? 0.52 : 0.40) + (closing && isStarter ? 0.28 : 0);
          if (out[gg]) nd = 3;
          else if (live.players[gg].pf >= 5 && period < 4) nd = 1.5;
          else if (live.players[gg].pf >= 4 && period < 3) nd = 1.2;
          else if (fatigue[gg] > thr) nd = 0.5 + (fatigue[gg] - thr);
          if (nd > need) { need = nd; pick = i; }
        }
        if (pick < 0) break;
        var outG = L[pick], bestB = -1, bestScore = -1e9;
        for (var b = t * 8; b < t * 8 + 8; b++) {
          if (onFloor[b] || out[b]) continue;
          if (fatigue[b] > 0.5 && need < 1) continue;
          var posFit = players[b].pos === players[outG].pos ? 1 : (players[b].pos === 'C' || players[outG].pos === 'C' ? 0.88 : 0.95);
          var sc = players[b].quality * (1 - 0.5 * fatigue[b]) * posFit - (live.players[b].pf >= 5 ? 14 : 0);
          if (sc > bestScore) { bestScore = sc; bestB = b; }
        }
        if (bestB < 0) break;
        var curScore = players[outG].quality * (1 - 0.5 * fatigue[outG]);
        if (need < 1 && bestScore < curScore - 6 && !closing) { break; }
        onFloor[outG] = false; onFloor[bestB] = true;
        lineup[t][pick] = bestB;
        var o2 = outG;
        var oc = live.onCourt[t]; oc[oc.indexOf(outG)] = bestB;
        emit('sub', { team: t, out: o2, in: bestB, player: bestB, player2: o2,
          text: lastName(players[bestB].name) + ' checks in for ' + lastName(players[o2].name) + '.' });
        swaps++;
      }
    }

    // ---- foul-outs ----
    function checkFoulOuts() {
      for (var x = 0; x < 16; x++) if (!out[x] && live.players[x].pf >= 6) out[x] = true;
    }

    // ---- game loop ----
    curDelta = [];
    emit('tip', { team: tipWinner, lineups: [lineup[0].slice(), lineup[1].slice()],
      text: 'Tip-off! ' + teams[tipWinner].nickname + ' win the opening tip.' });

    var done = false;
    while (!done) {
      while (clock > 0.01) {
        possession();
        checkFoulOuts();
        trySubs(0); trySubs(1);
        // reset fatigue effect of timeouts handled inside
      }
      // end of period
      clock = 0;
      emit('endq', { team: 0, text: period <= 4 ? 'End of Q' + period + ': ' + teams[0].nickname + ' ' + live.score[0] + ', ' + teams[1].nickname + ' ' + live.score[1] + '.'
                       : 'End of overtime: ' + live.score[0] + '-' + live.score[1] + '.', pause: 2.6 });
      while (live.qs.length < period) live.qs.push([0, 0]);
      if (period >= 4 && live.score[0] !== live.score[1]) { done = true; break; }
      if (period === 4) live.ot = true;
      // rest between periods
      var rest = period === 2 ? 0.28 : 0.1;
      for (var z = 0; z < 16; z++) fatigue[z] = Math.max(0, fatigue[z] - rest);
      period++;
      clock = period <= 4 ? qSec : otSec;
      timeoutsLeft = [Math.max(timeoutsLeft[0], period === 3 ? 7 : 2), Math.max(timeoutsLeft[1], period === 3 ? 7 : 2)];
      runPts = [0, 0]; runTier = [0, 0];
      off = (period === 2 || period === 3) ? 1 - tipWinner : (period === 4 ? tipWinner : (rng.chance(0.5) ? 0 : 1));
      putback = false;
      emit('startq', { team: off, text: (period <= 4 ? 'Start of Q' + period : 'Overtime') + ' — ' + teams[off].nickname + ' have the ball.' });
    }
    live.regulationOver = true;
    live.final = true;
    emit('final', { team: live.score[0] > live.score[1] ? 0 : 1,
      text: 'FINAL: ' + teams[0].nickname + ' ' + live.score[0] + ', ' + teams[1].nickname + ' ' + live.score[1] + (live.ot ? ' (OT)' : '') + '.' });

    // final box score with minutes
    var box = [];
    for (g = 0; g < players.length; g++) {
      var b = {}; for (var k = 0; k < STAT_KEYS.length; k++) b[STAT_KEYS[k]] = live.players[g][STAT_KEYS[k]];
      b.min = Math.round(secs[g] / 6) / 10;
      box.push(b);
    }
    return {
      events: events, live: live, score: live.score.slice(), qScores: live.qs.map(function (q) { return q.slice(); }),
      ot: live.ot, box: box, possessions: possCount, stats: statVector(live, players), quarterSeconds: qSec
    };
  }

  PL.Basketball = {
    STAT_KEYS: STAT_KEYS, COURT_L: COURT_L, COURT_W: COURT_W, HOOP_X: HOOP_X,
    simulateGame: simulateGame, newLive: newLive, applyEvent: applyEvent, liveAt: liveAt,
    statVector: statVector, lastName: lastName
  };
})(typeof window !== 'undefined' ? window : globalThis);
