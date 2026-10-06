/*
 * league.js — builds matchups from the fictional league data, and creates the pregame
 * "storyline" (standings, records, streaks) that students study before predicting.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};

  function teamById(id) {
    var t = PL.Data.TEAMS;
    for (var i = 0; i < t.length; i++) if (t[i].id === id) return t[i];
    return null;
  }

  /** Build a matchup object for two team ids. */
  function matchupFor(homeId, awayId) {
    var sides = [homeId, awayId].map(function (id, idx) {
      var t = teamById(id);
      var team = {
        id: t.id, city: t.city, nickname: t.nickname, name: t.city + ' ' + t.nickname,
        color: t.color, color2: t.color2, pace: t.pace, boost: t.boost, coach: t.coach, arena: t.arena
      };
      return team;
    });
    var players = [];
    [homeId, awayId].forEach(function (id, idx) {
      PL.Data.buildRoster(id).forEach(function (p, i) {
        p.gid = idx * 8 + i; p.teamIdx = idx;
        players.push(p);
      });
    });
    return { home: sides[0], away: sides[1], players: players };
  }

  /** The seed decides which two teams meet and who is at home. */
  function createMatchup(seed) {
    var rng = PL.createSeededRandom(seed + '|matchup');
    var ids = PL.Data.TEAMS.map(function (t) { return t.id; });
    var order = rng.shuffle(ids);
    var m = matchupFor(order[0], order[1]);
    m.seed = seed;
    return m;
  }

  /**
   * Season-style team ratings measured by actually simulating each team against the others
   * (cached). These are what the "team statistics" tables show. They never decide a game by
   * themselves — the game simulation does.
   */
  var calibration = null;
  function calibrate() {
    if (calibration) return calibration;
    var teams = PL.Data.TEAMS, res = {};
    teams.forEach(function (t) { res[t.id] = { gp: 0, ptsFor: 0, ptsAg: 0, poss: 0, wins: 0, home: { n: 0, f: 0, a: 0 }, away: { n: 0, f: 0, a: 0 } }; });
    var rng = PL.createSeededRandom('LEAGUE-CALIBRATION');
    for (var i = 0; i < teams.length; i++) {
      for (var off = 1; off < teams.length; off++) {
        var h = teams[i], a = teams[(i + off) % teams.length];
        var m = matchupFor(h.id, a.id);
        var r = PL.Basketball.simulateGame(m, rng.fork(h.id + a.id), { record: false });
        var H = res[h.id], A = res[a.id];
        H.gp++; A.gp++;
        H.ptsFor += r.score[0]; H.ptsAg += r.score[1]; A.ptsFor += r.score[1]; A.ptsAg += r.score[0];
        H.poss += r.possessions[0]; A.poss += r.possessions[1];
        H.home.n++; H.home.f += r.score[0]; H.home.a += r.score[1];
        A.away.n++; A.away.f += r.score[1]; A.away.a += r.score[0];
      }
    }
    var out = {};
    teams.forEach(function (t) {
      var x = res[t.id];
      out[t.id] = {
        ppg: x.ptsFor / x.gp, papg: x.ptsAg / x.gp,
        ortg: 100 * x.ptsFor / x.poss, drtg: 100 * x.ptsAg / x.poss,
        homePpg: x.home.f / x.home.n, homeMargin: (x.home.f - x.home.a) / x.home.n,
        awayPpg: x.away.f / x.away.n, awayMargin: (x.away.f - x.away.a) / x.away.n,
        net: (x.ptsFor - x.ptsAg) / x.gp
      };
    });
    calibration = out;
    return out;
  }

  /** Seeded "season snapshot": records, last-5 results, streaks. Cosmetic context — the game engine ignores it. */
  function buildSeason(seed) {
    var rng = PL.createSeededRandom(seed + '|season');
    var cal = calibrate();
    var rows = PL.Data.TEAMS.map(function (t) {
      var gp = 26 + rng.int(0, 6);
      var pWin = Math.max(0.12, Math.min(0.88, 0.5 + 0.022 * cal[t.id].net));
      var w = 0, form = [];
      for (var i = 0; i < gp; i++) {
        var win = rng.chance(pWin);
        if (win) w++;
        form.push(win ? 'W' : 'L');
      }
      return { id: t.id, name: t.city + ' ' + t.nickname, gp: gp, w: w, l: gp - w, last5: form.slice(-5), form: form };
    });
    rows.forEach(function (r) {
      var last = r.form[r.form.length - 1], n = 0;
      for (var i = r.form.length - 1; i >= 0 && r.form[i] === last; i--) n++;
      r.streak = { type: last, n: n };
    });
    rows.sort(function (a, b) { return (b.w / b.gp) - (a.w / a.gp); });
    return rows;
  }

  PL.League = { teamById: teamById, matchupFor: matchupFor, createMatchup: createMatchup, calibrate: calibrate, buildSeason: buildSeason };
})(typeof window !== 'undefined' ? window : globalThis);
