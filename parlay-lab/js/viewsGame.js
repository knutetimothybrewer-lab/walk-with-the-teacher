/*
 * viewsGame.js — the Game tab: PREP (matchup + market + parlay builder), LIVE (scoreboard, court,
 * tracker) and POST (results + lessons).
 */
(function (root) {
  'use strict';
  var PL = root.PL, A = PL.App, UI = PL.UI, V = PL.Views, esc = UI.esc, L = PL.Lessons;
  var fmtPct = PL.Prob.fmtPct, fmtTok = PL.Prob.fmtTokens;

  function PREP() { return A.prepared; }
  function S() { return A.state; }
  function C() { return A.state.config; }

  function swatch(t) { return '<span class="swatch" style="background:' + t.color + '"></span>'; }
  function arrow(delta) { return delta > 0 ? '<span class="arr up" aria-label="increased">↑</span>' : delta < 0 ? '<span class="arr down" aria-label="decreased">↓</span>' : ''; }

  V.game = function () {
    if (!A.prepared) return '<main id="main" class="center-screen"><div class="card loadcard"><h2>No game is loaded</h2><p class="muted">Open the Teacher dashboard and choose Create Class Session or Replay Game.</p><button class="btn primary" data-act="openTeacher">Teacher dashboard</button></div></main>';
    var ph = S().phase;
    if (ph === 'live') { PL.Live.needsMount = true; return liveView(); }
    if (ph === 'post') return postView();
    return prepView();
  };

  // =====================================================================================================
  // PREP: matchup + market + builder
  // =====================================================================================================
  var MARKET_TABS = [['matchup', 'Matchup'], ['winner', 'Game Winner'], ['spread', 'Point Spread'], ['total', 'Total Score'], ['players', 'Player Props'], ['events', 'Game Events']];

  function modeHint() {
    var m = S().mode;
    if (m === 'guided') return '<b>Guided Mode:</b> probabilities and explanations are visible throughout.';
    if (m === 'experience') return '<b>Experience First:</b> decide first. Probabilities stay hidden until you reveal them or review your slip.';
    return '<b>Statistics Lab:</b> probability, expected value and simulation come first. Use “Show the math” on anything.';
  }

  function prepView() {
    var m = PREP().game.matchup, st = S();
    var steps = ['Study the matchup', 'Choose predictions', 'Allocate Lab Tokens', 'Lock in', 'Watch the game'];
    return '<main id="main" class="prep">' +
      '<section class="col-main">' +
      '<div class="steps" aria-label="Steps">' + steps.map(function (s, i) { return '<span class="step"><i>' + (i + 1) + '</i>' + s + '</span>'; }).join('') + '</div>' +
      '<div class="matchup-head card">' +
      teamBlock(m.away, 'AWAY', PREP().pregame.teams[1]) + '<div class="vs"><b>@</b><small>Game ' + st.gameNo + '</small><small>' + C().quarterMinutes + '-min quarters</small></div>' + teamBlock(m.home, 'HOME', PREP().pregame.teams[0]) + '</div>' +
      '<p class="modehint">' + modeHint() + '</p>' +
      '<div class="subtabs" role="tablist" aria-label="Prediction categories">' + marketTabsHtml() + '</div>' +
      '<div id="market-body" class="market-body" role="tabpanel">' + marketBody() + '</div>' +
      '</section>' +
      '<aside class="col-slip" id="slip" aria-label="Parlay builder">' + slipShell() + '</aside></main>';
  }

  function teamBlock(t, role, row) {
    return '<div class="teamblock" style="--tc:' + t.color + '"><div class="tb-bar"></div><small class="muted">' + role + '</small><h2>' + esc(t.name) + '</h2>' +
      '<div class="tb-meta"><span>' + row.record + '</span><span>Last 5: ' + row.last5 + '</span></div></div>';
  }

  function marketTabsHtml() {
    return MARKET_TABS.map(function (t) {
      var on = A.ui.marketTab === t[0];
      return '<button type="button" class="subtab' + (on ? ' on' : '') + '" role="tab" aria-selected="' + on + '" data-act="marketTab" data-tab="' + t[0] + '">' + t[1] + '</button>';
    }).join('');
  }
  PL.Actions.marketTab = function (el) {
    A.ui.marketTab = el.getAttribute('data-tab');
    document.querySelector('.subtabs').innerHTML = marketTabsHtml();
    document.getElementById('market-body').innerHTML = marketBody();
    applySelectionState();
  };

  function pickLabel(p) {
    if (p.cat === 'total' || p.cat === 'player') return (p.side === 'over' ? 'Over ' : 'Under ') + p.line.toFixed(1);
    if (p.cat === 'events' && (p.side === 'yes' || p.side === 'no')) return p.side === 'yes' ? 'Yes' : 'No';
    return p.short;
  }

  function pickBtn(p, opts) {
    opts = opts || {};
    var offered = PL.Props.isOffered(p, C().houseMargin);
    var mult = (1 - C().houseMargin) / p.p;
    var pv = A.probVisible();
    return '<button type="button" class="pick" data-act="pick" data-id="' + esc(p.id) + '" aria-pressed="false"' + (offered ? '' : ' disabled') + '>' +
      '<span class="pk-label">' + esc(opts.label || pickLabel(p)) + '</span>' +
      (offered ? '<span class="pk-meta">' + (pv ? '<span class="pk-p" title="Estimated probability">' + fmtPct(p.p) + '</span>' : '') + '<span class="pk-x" title="Return per token if it wins (single prediction)">pays ×' + mult.toFixed(2) + '</span></span>'
               : '<span class="pk-meta"><span class="pk-x">not offered</span></span>') +
      '<span class="pk-check" aria-hidden="true">✓</span></button>';
  }

  function groupRow(title, props, extra) {
    return '<div class="grp"><div class="grp-title">' + title + (extra || '') + '</div><div class="grp-picks">' + props.map(function (p) { return pickBtn(p); }).join('') + '</div></div>';
  }

  function marketBody() {
    var tab = A.ui.marketTab, mk = PREP().market, diff = C().difficulty, h = '';
    var by = function (f) { return mk.props.filter(f); };
    if (tab === 'matchup') return matchupTab();
    if (tab === 'winner') {
      h = '<div class="mkt-head"><h3>Game Winner ' + UI.tip(L.tooltips.winner) + '</h3></div><div class="bigpicks">' +
        mk.props.filter(function (p) { return p.cat === 'winner'; }).map(function (p) { return pickBtn(p); }).join('') + '</div>' +
        '<p class="muted">Picking the winner is a single event. Combine it with other predictions to build a parlay.</p>';
    } else if (tab === 'spread' || tab === 'total') {
      var cat = tab;
      h = '<div class="mkt-head"><h3>' + (tab === 'spread' ? 'Point Spread ' + UI.tip(L.tooltips.spread) : 'Total Score ' + UI.tip(L.tooltips.total)) + '</h3></div>';
      var orders = diff === 'intro' ? [0] : [-1, 0, 1].map(function (x) { return x; });
      var offs = {};
      by(function (p) { return p.cat === cat; }).forEach(function (p) { (offs[p.order] = offs[p.order] || []).push(p); });
      Object.keys(offs).map(Number).sort(function (a, b) { return a - b; }).forEach(function (o) {
        if (diff === 'intro' && o !== 0) return;
        var arr = offs[o].slice().sort(function (a, b) { return (a.side === 'home' || a.side === 'over') ? -1 : 1; });
        if (cat === 'spread') arr.sort(function (a, b) { return a.side === 'away' ? -1 : 1; });
        h += groupRow(o === 0 ? 'Main line' : 'Alternate line', arr, o === 0 ? '' : ' <span class="pill">alternate</span>');
      });
      h += '<p class="muted small">' + (tab === 'spread' ? 'Away team is shown on the left, home team on the right.' : '') + ' Moving a line changes both the probability and the payout.</p>';
    } else if (tab === 'players') {
      h = playersTab();
    } else if (tab === 'events') {
      h = '<div class="mkt-head"><h3>Game Events ' + UI.tip(L.tooltips.events) + '</h3></div>';
      var seen = {};
      mk.props.filter(function (p) { return p.cat === 'events'; }).forEach(function (p) {
        if (seen[p.group]) return; seen[p.group] = 1;
        var grp = mk.props.filter(function (q) { return q.group === p.group && q.cat === 'events'; });
        h += groupRow(esc(p.group), grp);
      });
    }
    return h;
  }

  function playersTab() {
    var mk = PREP().market, m = PREP().game.matchup, stat = A.ui.playerStat, diff = C().difficulty;
    var stats = [['pts', 'Points'], ['reb', 'Rebounds'], ['ast', 'Assists'], ['tpm', 'Three-Pointers']];
    if (diff === 'intro') stats = [['pts', 'Points']];
    var h = '<div class="mkt-head"><h3>Player Props ' + UI.tip(L.tooltips.player) + '</h3><div class="chips" role="tablist" aria-label="Statistic">' +
      stats.map(function (s) { return '<button type="button" class="chip-btn' + (stat === s[0] ? ' on' : '') + '" role="tab" aria-selected="' + (stat === s[0]) + '" data-act="playerStat" data-stat="' + s[0] + '">' + s[1] + '</button>'; }).join('') + '</div></div>';
    [1, 0].forEach(function (ti) {
      var team = ti === 0 ? m.home : m.away;
      h += '<h4 class="teamh">' + swatch(team) + esc(team.name) + '</h4><div class="plist">';
      m.players.filter(function (p) { return p.teamIdx === ti; }).forEach(function (pl) {
        var all = mk.props.filter(function (p) { return p.playerId === pl.id && p.statType === stat; });
        if (!all.length) return;
        var row = PREP().pregame.players[pl.gid];
        var avg = { pts: row.ppg, reb: row.rpg, ast: row.apg, tpm: row.tpg }[stat];
        var main = all.filter(function (p) { return p.main; }).sort(function (a, b) { return a.side === 'over' ? -1 : 1; });
        var alts = {};
        all.filter(function (p) { return !p.main; }).forEach(function (p) { (alts[p.order] = alts[p.order] || []).push(p); });
        var open = !!A.ui.expanded[pl.id + stat];
        h += '<div class="prow"><div class="pinfo"><b>' + esc(pl.name) + '</b><small>#' + pl.num + ' ' + pl.pos + ' • avg ' + avg.toFixed(1) + '</small></div><div class="ppicks">' +
          main.map(function (p) { return pickBtn(p); }).join('') + '</div>' +
          (diff === 'intro' || !Object.keys(alts).length ? '' : '<button type="button" class="linkbtn" data-act="toggleAlts" data-key="' + pl.id + stat + '" aria-expanded="' + open + '">' + (open ? 'Fewer lines' : 'More lines') + '</button>') + '</div>';
        if (open) {
          Object.keys(alts).map(Number).sort(function (a, b) { return a - b; }).forEach(function (o) {
            h += '<div class="prow alt"><div class="pinfo"><small>Alternate line</small></div><div class="ppicks">' +
              alts[o].sort(function (a, b) { return a.side === 'over' ? -1 : 1; }).map(function (p) { return pickBtn(p); }).join('') + '</div><span></span></div>';
          });
        }
      });
      h += '</div>';
    });
    return h;
  }
  PL.Actions.playerStat = function (el) { A.ui.playerStat = el.getAttribute('data-stat'); document.getElementById('market-body').innerHTML = marketBody(); applySelectionState(); };
  PL.Actions.toggleAlts = function (el) { var k = el.getAttribute('data-key'); A.ui.expanded[k] = !A.ui.expanded[k]; document.getElementById('market-body').innerHTML = marketBody(); applySelectionState(); var b = document.querySelector('[data-key="' + k + '"]'); if (b) b.focus(); };

  function matchupTab() {
    var pre = PREP().pregame, m = PREP().game.matchup, tA = pre.teams[1], tH = pre.teams[0];
    function row(label, a, h, tip) { return '<tr><td class="r">' + a + '</td><th scope="row">' + label + (tip ? ' ' + UI.tip(tip) : '') + '</th><td>' + h + '</td></tr>'; }
    var f1 = function (v) { return v.toFixed(1); };
    var h = '<div class="mkt-head"><h3>Study the matchup</h3></div>' +
      '<table class="cmp"><thead><tr><th scope="col" class="r">' + esc(m.away.name) + '</th><th scope="col"></th><th scope="col">' + esc(m.home.name) + '</th></tr></thead><tbody>' +
      row('Record', tA.record, tH.record) + row('Last 5', tA.last5, tH.last5) +
      row('Points per game', f1(tA.ppg), f1(tH.ppg)) + row('Points allowed', f1(tA.papg), f1(tH.papg)) +
      row('Offensive rating', f1(tA.ortg), f1(tH.ortg), 'Points scored per 100 possessions. Higher is better.') +
      row('Defensive rating', f1(tA.drtg), f1(tH.drtg), 'Points allowed per 100 possessions. <b>Lower</b> is better.') +
      row('Away performance (PPG)', f1(tA.awayPpg), '—') + row('Home performance (PPG)', '—', f1(tH.homePpg)) +
      row('Average margin', (tA.net >= 0 ? '+' : '') + f1(tA.net), (tH.net >= 0 ? '+' : '') + f1(tH.net)) +
      '</tbody></table>' +
      '<p class="muted small">Statistics influence the simulation but never guarantee a result: a strong team can lose, and a star can have a poor game.</p>';
    [1, 0].forEach(function (ti) {
      var team = ti === 0 ? m.home : m.away;
      h += '<h4 class="teamh">' + swatch(team) + esc(team.name) + ' <small class="muted">Coach ' + esc(team.coach) + '</small></h4>' +
        '<div class="tablewrap"><table class="stats"><thead><tr><th scope="col">Player</th><th scope="col">POS</th><th scope="col">MIN</th><th scope="col">PTS</th><th scope="col">REB</th><th scope="col">AST</th><th scope="col">3PM</th><th scope="col">FG%</th><th scope="col" title="Average points over the last 5 games">L5 PTS</th></tr></thead><tbody>';
      pre.players.filter(function (p) { return p.teamIdx === ti; }).forEach(function (p) {
        h += '<tr' + (p.starter ? '' : ' class="bench"') + '><th scope="row">#' + p.num + ' ' + esc(p.name) + '</th><td>' + p.pos + '</td><td>' + p.mpg.toFixed(0) + '</td><td>' + p.ppg.toFixed(1) + '</td><td>' + p.rpg.toFixed(1) + '</td><td>' + p.apg.toFixed(1) + '</td><td>' + p.tpg.toFixed(1) + '</td><td>' + (p.fg * 100).toFixed(0) + '%</td><td>' + p.recent.toFixed(1) + '</td></tr>';
      });
      h += '</tbody></table></div>';
    });
    h += fallacyCard('prep');
    h += '<details class="card standings"><summary>League standings (fictional)</summary><table class="stats"><thead><tr><th scope="col">Team</th><th scope="col">W-L</th><th scope="col">Last 5</th><th scope="col">Streak</th></tr></thead><tbody>' +
      pre.season.map(function (r) { return '<tr' + (r.id === m.home.id || r.id === m.away.id ? ' class="hl"' : '') + '><th scope="row">' + esc(r.name) + '</th><td>' + r.w + '-' + r.l + '</td><td>' + r.last5.join(' ') + '</td><td>' + r.streak.type + r.streak.n + '</td></tr>'; }).join('') + '</tbody></table></details>';
    return h;
  }

  // ---- gambler's fallacy quick-check card ----
  function fallacyCard(where) {
    var story = PREP().pregame.story, ans = S().answers.fallacy, f = L.fallacy(story);
    var last = ans.filter(function (a) { return a.gameNo === S().gameNo; })[0];
    var h = '<div class="card lesson" id="fallacy-card"><div class="lesson-tag">QUICK CHECK</div><p><b>' + esc(f.intro) + '</b></p><p>' + f.question + '</p>';
    if (!last) {
      h += '<div class="optrow" role="group" aria-label="' + esc(f.question) + '">' + f.options.map(function (o) { return '<button type="button" class="btn" data-act="answerFallacy" data-ans="' + esc(o) + '">' + o + '</button>'; }).join('') + '</div>';
    } else {
      h += '<p class="answered">Your answer: <b>' + esc(last.answer) + '</b></p><div class="explain">' + f.explanation + '</div>';
    }
    return h + '</div>';
  }
  PL.Actions.answerFallacy = function (el) {
    S().answers.fallacy.push({ gameNo: S().gameNo, answer: el.getAttribute('data-ans'), story: PREP().pregame.story.team + ' ' + PREP().pregame.story.n });
    A.save();
    var card = document.getElementById('fallacy-card');
    if (card) card.outerHTML = fallacyCard();
  };

  // ---- the slip panel ----
  function slipShell() {
    return '<div id="slip-head"></div><div id="slip-legs"></div><div id="slip-summary"></div><div id="slip-stake"></div><div id="slip-actions"></div><div id="slip-locked"></div>';
  }

  function evalDraft() { var d = S().draft; return PL.Parlay.evaluateSlip(d.legs, d.stake, PREP().market, C()); }

  function renderSlipHead() {
    var legs = S().draft.legs.length, mode = A.probMode();
    var reveal = mode === 'on-request' ? '<button type="button" class="btn sm' + (A.ui.revealProb ? ' primary' : '') + '" data-act="toggleReveal" aria-pressed="' + A.ui.revealProb + '">' + (A.ui.revealProb ? '👁 Hide probability' : '👁 Reveal probability') + '</button>' : '';
    return '<div class="slip-head"><div><h2>PARLAY BUILDER</h2><small>YOUR PARLAY ' + UI.tip(L.tooltips.leg, 'What is a leg?') + '</small></div>' + reveal + '</div>';
  }

  function legCard(p, i) {
    var pv = A.probVisible();
    return '<li class="legcard"><span class="legno">LEG ' + (i + 1) + '</span><div class="legbody"><b>' + esc(p.label) + '</b>' +
      '<small>' + (pv ? 'Est. probability <b>' + fmtPct(p.p) + '</b>' : 'Est. probability <i>hidden</i>') + '</small></div>' +
      '<button type="button" class="iconbtn" aria-label="Show the math for ' + esc(p.label) + '" title="Show the math" data-act="mathLeg" data-id="' + esc(p.id) + '">ƒ</button>' +
      '<button type="button" class="iconbtn" aria-label="Remove ' + esc(p.label) + ' from slip" data-act="pick" data-id="' + esc(p.id) + '">✕</button></li>';
  }

  function renderSlipLegs() {
    var legs = S().draft.legs.map(function (id) { return PREP().market.byId[id]; });
    if (!legs.length) return '<div class="empty-slip"><div class="big">☝</div><p><b>Click a prediction</b> on the left to add it as a leg.</p><p class="muted">A parlay pays only if <b>every</b> leg is correct.</p></div>';
    return '<ol class="legs">' + legs.map(legCard).join('') + '</ol>';
  }

  function renderSummary() {
    var ev = evalDraft(), d = S().draft, pv = A.probVisible(), prev = A.ui.prevEval, h = '';
    if (!ev) return '';
    var ret = ev.potentialReturn, dp = prev ? ev.p - prev.p : 0, dr = prev ? ret - prev.ret : 0;
    var showEV = pv && (C().difficulty !== 'intro' || S().mode === 'stats');
    h += '<div class="sumgrid" aria-live="polite">' +
      '<div class="sum"><small>NUMBER OF LEGS</small><b>' + UI.counter('s-legs', ev.n, 'int') + '</b></div>' +
      '<div class="sum"><small>TOKENS RISKED</small><b>' + UI.counter('s-stake', d.stake, 'tok') + '</b></div>' +
      '<div class="sum big ret"><small>POTENTIAL TOKEN RETURN</small><b>' + UI.counter('s-ret', ret, 'tok') + ' ' + arrow(dr) + '</b><span class="subtle">includes your stake</span></div>' +
      '<div class="sum big prob"><small>ESTIMATED PARLAY PROBABILITY</small><b>' + (pv ? UI.counter('s-prob', ev.p, 'pct') + ' ' + arrow(dp) : '<span class="hidden-val">hidden</span>') + '</b>' +
        (pv ? UI.meter(ev.p, 'wide') : '<span class="subtle">Press “Reveal probability” — it is always available.</span>') + '</div>' +
      (showEV ? '<div class="sum"><small>EXPECTED VALUE ' + UI.tip(L.tooltips.ev) + '</small><b class="' + (ev.expectedValue < 0 ? 'neg' : 'pos') + '">' + UI.counter('s-ev', ev.expectedValue, 'signed') + ' tokens</b><span class="subtle">average per slip</span></div>' : '') +
      '<div class="sum"><small>RISK LEVEL</small><b class="risk r' + ev.risk.level + '"><span aria-hidden="true">' + ev.risk.icon + '</span> ' + (pv ? ev.risk.label : 'revealed with probability') + '</b></div></div>';
    // signature interaction: adding this leg
    var dl = A.ui.lastDelta;
    if (dl) {
      h += '<div class="delta pop" role="status"><div class="delta-title">' + (dl.added ? 'ADDING THIS LEG' : 'REMOVING THIS LEG') + ' <span class="muted">· ' + esc(dl.label) + '</span></div>' +
        '<div class="delta-row"><div><small>Potential Return</small><b class="' + (dl.retPct >= 0 ? 'up' : 'down') + '">' + (dl.retPct >= 0 ? '+' : '') + Math.round(dl.retPct * 100) + '% ' + (dl.retPct >= 0 ? '↑' : '↓') + '</b><span>' + fmtTok(dl.beforeRet) + ' → ' + fmtTok(dl.afterRet) + '</span></div>' +
        '<div><small>Estimated Success Probability</small>' + (pv ? '<b class="' + (dl.probPct >= 0 ? 'up' : 'down') + '">' + (dl.probPct >= 0 ? '+' : '') + Math.round(dl.probPct * 100) + '% ' + (dl.probPct >= 0 ? '↑' : '↓') + '</b><span>' + fmtPct(dl.beforeP) + ' → ' + fmtPct(dl.afterP) + '</span>' : '<b class="hidden-val">hidden</b><span>reveal to compare</span>') + '</div></div></div>';
    }
    // house advantage block
    if (pv) {
      h += '<details class="house"><summary>House advantage in this slip ' + UI.tip(L.tooltips.margin) + '</summary>' +
        '<div class="hgrid"><div><small>Fair theoretical return</small><b>' + fmtTok(ev.fairReturn) + '</b></div><div><small>Offered return</small><b>' + fmtTok(ev.potentialReturn) + '</b></div><div><small>Difference</small><b>' + fmtTok(ev.fairReturn - ev.potentialReturn) + '</b></div></div>' +
        '<p class="small">This difference represents the mathematical advantage built into the simulated system. It compounds with every leg (margin ' + (C().houseMargin * 100).toFixed(1) + '% per leg).</p></details>';
    }
    ev.notes.forEach(function (n) { h += '<div class="note ' + n.type + '"><span aria-hidden="true">' + (n.type === 'correlated' || n.type === 'inverse' ? '🔗' : 'ℹ') + '</span> ' + esc(n.text) + '</div>'; });
    if (ev.approx) h += '<div class="note">Very small probability: estimate uses the independent product.</div>';
    h += '<button type="button" class="btn block" data-act="mathSlip">ƒ SHOW THE MATH</button>';
    return h;
  }

  function renderStake() {
    var s = S(), c = C(), d = s.draft, avail = s.balance;
    var presets = [10, 25, 50, 100].filter(function (v) { return v <= c.maxStake; });
    return '<div class="stakebox"><div class="stake-title">TOKENS TO ALLOCATE <small>(LAB TOKENS)</small></div><div class="presets">' +
      presets.map(function (v) { return '<button type="button" class="chip-btn' + (d.stake === v ? ' on' : '') + '" data-act="stakePreset" data-v="' + v + '" aria-pressed="' + (d.stake === v) + '"' + (v > avail ? ' disabled' : '') + '>' + v + '</button>'; }).join('') +
      '<label class="custom"><span class="sr">Custom Lab Tokens</span><input id="stake-input" type="number" inputmode="numeric" min="1" max="' + Math.min(c.maxStake, avail) + '" step="1" value="' + d.stake + '" data-in="stakeInput" aria-describedby="stake-note"></label></div>' +
      '<div class="small muted" id="stake-note">Available: <b>' + fmtTok(avail) + '</b> • Limit per slip: <b>' + fmtTok(c.maxStake) + '</b></div><div class="slipmsg" id="slip-msg" role="alert">' + esc(A.ui.slipMsg || '') + '</div></div>';
  }

  function renderActions() {
    var s = S(), n = s.draft.legs.length;
    return '<div class="actions"><button type="button" class="btn primary lg block" data-act="lockSlip"' + (n ? '' : ' disabled') + '>🔒 LOCK IN SLIP</button>' +
      (n ? '<button type="button" class="btn ghost block" data-act="clearSlip">Clear slip</button>' : '') + '</div>';
  }

  function renderLocked() {
    var s = S(), h = '';
    if (s.slips.length) {
      h += '<div class="locked"><h3>LOCKED FOR THIS GAME</h3><ul>' + s.slips.map(function (sl) {
        return '<li><b>' + sl.legs.length + '-leg ' + (sl.legs.length === 1 ? 'prediction' : 'parlay') + '</b><span>risked ' + fmtTok(sl.stake) + '</span><span>potential ' + fmtTok(sl.potentialReturn) + '</span><span>' + fmtPct(sl.p) + ' est.</span></li>';
      }).join('') + '</ul></div>';
    }
    h += '<button type="button" class="btn go lg block" data-act="watchGame">▶ ' + (s.slips.length ? 'WATCH THE GAME' : 'WATCH WITHOUT PREDICTIONS') + '</button>' +
      '<p class="small muted">Once the game starts, predictions are locked. The game is already determined by the class code — nothing you choose can change it.</p>';
    return h;
  }

  function renderAllSlip() {
    var $ = function (id) { return document.getElementById(id); };
    $('slip-head').innerHTML = renderSlipHead(); $('slip-legs').innerHTML = renderSlipLegs();
    $('slip-summary').innerHTML = S().draft.legs.length ? renderSummary() : '';
    $('slip-stake').innerHTML = renderStake(); $('slip-actions').innerHTML = renderActions(); $('slip-locked').innerHTML = renderLocked();
    UI.runCounters($('slip'));
  }

  function applySelectionState() {
    var legs = S().draft.legs, mk = PREP().market;
    UI.$$('.pick').forEach(function (b) {
      var id = b.getAttribute('data-id'), sel = legs.indexOf(id) >= 0, conflict = false;
      if (!sel && legs.length) {
        var p = mk.byId[id];
        conflict = legs.some(function (l) { return PL.Props.conflictBetween(p, mk.byId[l]); });
      }
      b.classList.toggle('sel', sel); b.classList.toggle('conflict', conflict);
      b.setAttribute('aria-pressed', sel ? 'true' : 'false');
      if (conflict) b.title = 'Conflicts with a selection already on your slip'; else b.removeAttribute('title');
    });
  }

  V.refreshBuilder = function (parts) {
    if (!document.getElementById('slip')) return;
    var $ = function (id) { return document.getElementById(id); };
    parts = parts || ['legs', 'summary', 'actions', 'stake', 'locked', 'head'];
    if (parts.indexOf('head') >= 0) $('slip-head').innerHTML = renderSlipHead();
    if (parts.indexOf('legs') >= 0) $('slip-legs').innerHTML = renderSlipLegs();
    if (parts.indexOf('summary') >= 0) { $('slip-summary').innerHTML = S().draft.legs.length ? renderSummary() : ''; }
    if (parts.indexOf('stake') >= 0) $('slip-stake').innerHTML = renderStake();
    if (parts.indexOf('actions') >= 0) $('slip-actions').innerHTML = renderActions();
    if (parts.indexOf('locked') >= 0) $('slip-locked').innerHTML = renderLocked();
    UI.runCounters($('slip'));
    applySelectionState();
  };
  V.afterPrepRender = function () { renderAllSlip(); applySelectionState(); };

  // After the shell is in the DOM, fill the slip. (A.render calls this via PL.Views.game → hook below.)
  var origGame = V.game;
  V.game = function () {
    var html = origGame();
    if (S().phase === 'prep') setTimeout(function () { if (document.getElementById('slip')) V.afterPrepRender(); }, 0);
    return html;
  };

  // ---- slip interactions ----
  PL.Actions.pick = function (el) {
    var id = el.getAttribute('data-id'), s = S(), d = s.draft, mk = PREP().market;
    if (s.phase !== 'prep') return;
    var idx = d.legs.indexOf(id), before = evalDraft();
    A.ui.slipMsg = '';
    if (idx >= 0) {
      d.legs.splice(idx, 1);
      var after = evalDraft();
      setDelta(before, after, mk.byId[id].label, false);
    } else {
      var chk = PL.Parlay.checkAdd(d.legs, id, mk, C());
      if (!chk.ok) {
        A.ui.slipMsg = chk.reason; UI.toast(chk.reason, 'warn');
        var msg = document.getElementById('slip-msg'); if (msg) msg.textContent = chk.reason;
        if (chk.kind === 'conflict') {
          el.classList.add('shake'); setTimeout(function () { el.classList.remove('shake'); }, 500);
        }
        return;
      }
      d.legs.push(id);
      var after2 = evalDraft();
      setDelta(before, after2, mk.byId[id].label, true);
    }
    A.save();
    V.refreshBuilder();
    var tgt = document.querySelector('.pick[data-id="' + CSS.escape(id) + '"]'); if (tgt && document.activeElement === document.body) tgt.focus();
  };
  function setDelta(before, after, label, added) {
    A.ui.prevEval = before ? { p: before.p, ret: before.potentialReturn } : null;
    if (before && after) {
      A.ui.lastDelta = { label: label, added: added, beforeRet: before.potentialReturn, afterRet: after.potentialReturn, beforeP: before.p, afterP: after.p,
        retPct: before.potentialReturn ? after.offeredReturn / before.offeredReturn - 1 : 0, probPct: before.p ? after.p / before.p - 1 : 0 };
    } else A.ui.lastDelta = null;
    if (!after) A.ui.prevEval = null;
  }
  PL.Actions.clearSlip = function () { S().draft.legs = []; A.ui.lastDelta = null; A.ui.prevEval = null; A.ui.slipMsg = ''; A.save(); V.refreshBuilder(); };
  PL.Actions.toggleReveal = function () {
    A.ui.revealProb = !A.ui.revealProb;
    if (A.ui.revealProb) { S().answers.peeks = (S().answers.peeks || 0) + 1; A.save(); }
    document.getElementById('market-body').innerHTML = marketBody(); V.refreshBuilder();
  };
  PL.Actions.stakePreset = function (el) {
    S().draft.stake = Math.min(parseInt(el.getAttribute('data-v'), 10), C().maxStake, Math.max(1, S().balance)); A.ui.slipMsg = ''; A.ui.lastDelta = null; A.ui.prevEval = null; A.save();
    V.refreshBuilder(['stake', 'summary', 'actions']);
  };
  PL.Actions.stakeInput = function (el) {
    var v = parseInt(el.value, 10);
    var chk = PL.Parlay.checkStake(isNaN(v) ? 0 : v, S().balance, C());
    A.ui.slipMsg = chk.ok ? '' : chk.reason;
    S().draft.stake = chk.ok ? chk.value : (v > 0 ? Math.min(v, C().maxStake, S().balance) : 0);
    var msg = document.getElementById('slip-msg'); if (msg) msg.textContent = A.ui.slipMsg;
    A.ui.lastDelta = null; A.ui.prevEval = null; A.save();
    document.getElementById('slip-summary').innerHTML = S().draft.legs.length ? renderSummary() : '';
    UI.runCounters(document.getElementById('slip-summary'));
    UI.$$('.presets .chip-btn').forEach(function (b) { var on = parseInt(b.getAttribute('data-v'), 10) === S().draft.stake; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  };

  // ---- math explanations ----
  function mathLegHtml(p) {
    var mult = (1 - C().houseMargin) / p.p, fairX = 1 / p.p;
    return '<p><b>' + esc(p.label) + '</b></p>' +
      '<div class="mathblock"><p>We replayed this exact matchup <b>' + p.n + '</b> times with the same game engine.</p>' +
      '<p>This prediction was correct in <b>' + p.k + '</b> of those ' + p.n + ' games.</p>' +
      '<p class="eq">' + p.k + ' ÷ ' + p.n + ' ≈ <b>' + fmtPct(p.p) + '</b> estimated probability</p></div>' +
      '<div class="mathblock"><p>Fair return per token = 1 ÷ ' + p.p.toFixed(3) + ' = <b>×' + fairX.toFixed(2) + '</b></p>' +
      '<p>The simulation reduces every leg by the house margin (' + (C().houseMargin * 100).toFixed(1) + '%): ×' + fairX.toFixed(2) + ' × ' + (1 - C().houseMargin).toFixed(3) + ' = <b>×' + mult.toFixed(2) + '</b> offered.</p></div>' +
      '<p class="muted small">The estimate comes from simulation, so it has a small sampling error (about ±' + (100 * Math.sqrt(p.p * (1 - p.p) / p.n)).toFixed(1) + ' percentage points). A real game is one more random draw from the same engine.</p>';
  }
  PL.Actions.mathLeg = function (el) {
    var p = PREP().market.byId[el.getAttribute('data-id')];
    UI.modal({ title: 'SHOW THE MATH', html: mathLegHtml(p), actions: [{ label: 'Close', act: 'closeModal', cls: 'primary' }] });
  };
  V.mathSlipHtml = function (ev, cfg) {
    var legs = ev.legs, h = '<ol class="mathlegs">' + legs.map(function (l) { return '<li>' + esc(l.label) + ': <b>' + fmtPct(l.p) + '</b></li>'; }).join('') + '</ol>';
    if (legs.length > 1) {
      h += '<div class="mathblock"><p>If we temporarily assume the events are <b>independent</b>:</p><p class="eq">' + legs.map(function (l) { return l.p.toFixed(2); }).join(' × ') + ' = <b>' + ev.pInd.toFixed(4) + '</b> → ' + fmtPct(ev.pInd) + '</p>' +
        '<p>Requiring <b>ALL</b> of these events to happen means multiplying numbers smaller than 1 — so the result is smaller than any single leg.</p></div>';
      var diff = ev.p / ev.pInd - 1;
      h += '<div class="mathblock"><p>But basketball events are often <b>related</b>. Using all ' + 500 + ' simulated games together (so relationships are included), the estimated probability of all legs happening is <b>' + fmtPct(ev.p) + '</b>' +
        (Math.abs(diff) > 0.03 ? ' (' + (diff > 0 ? '+' : '') + Math.round(diff * 100) + '% compared with the independent estimate).' : ' — close to the independent estimate, so these legs are nearly independent.') + '</p></div>';
    } else h += '<div class="mathblock"><p class="eq">Single prediction: <b>' + fmtPct(ev.p) + '</b></p></div>';
    h += '<div class="mathblock"><p>Fair theoretical return = ' + fmtTok(ev.stake) + ' ÷ ' + ev.p.toFixed(4) + ' = <b>' + fmtTok(ev.fairReturn) + '</b> tokens</p>' +
      '<p>House margin ' + (cfg.houseMargin * 100).toFixed(1) + '% on each of ' + ev.n + ' leg' + (ev.n === 1 ? '' : 's') + ': × ' + (1 - cfg.houseMargin).toFixed(3) + (ev.n > 1 ? '<sup>' + ev.n + '</sup>' : '') + ' = × ' + Math.pow(1 - cfg.houseMargin, ev.n).toFixed(3) + '</p>' +
      '<p>Offered return = <b>' + fmtTok(ev.potentialReturn) + '</b> tokens • Difference = <b>' + fmtTok(ev.fairReturn - ev.potentialReturn) + '</b> tokens</p></div>' +
      '<div class="mathblock"><p>Expected value = ' + ev.p.toFixed(4) + ' × ' + fmtTok(ev.potentialReturn) + ' − ' + fmtTok(ev.stake) + ' = <b>' + (ev.expectedValue >= 0 ? '+' : '') + ev.expectedValue.toFixed(1) + '</b> tokens on average</p>' +
      '<p class="muted small">“Average” means the result you would approach by repeating this exact slip many times. Any single slip either wins or loses.</p></div>';
    return h;
  };
  PL.Actions.mathSlip = function () {
    var ev = evalDraft(); if (!ev) return;
    UI.modal({ title: 'SHOW THE MATH', html: V.mathSlipHtml(ev, C()), wide: true, actions: [{ label: 'Close', act: 'closeModal', cls: 'primary' }] });
  };

  // ---- locking in ----
  PL.Actions.lockSlip = function () {
    var s = S(), d = s.draft;
    var chk = PL.Parlay.checkStake(d.stake, s.balance, C());
    if (!d.legs.length) return;
    if (!chk.ok) { A.ui.slipMsg = chk.reason; var m = document.getElementById('slip-msg'); if (m) m.textContent = chk.reason; UI.toast(chk.reason, 'warn'); return; }
    if (PL.Classroom.shouldPromptAddLeg(s) && d.legs.length < C().maxLegs) {
      var next = PL.Parlay.suggestNextLeg(d.legs, PREP().market, C());
      if (next) { addLegPrompt(next); return; }
    }
    confirmLock();
  };

  function addLegPrompt(next) {
    var pv = PL.Parlay.previewAdd(S().draft.legs, next.id, S().draft.stake, PREP().market, C());
    var b = pv.before, a = pv.after;
    var html = '<div class="addleg"><div class="al-col"><small>CURRENT PARLAY</small><p>Potential Return</p><b>' + fmtTok(b.potentialReturn) + ' Tokens</b><p>Probability</p><b>' + fmtPct(b.p) + '</b></div>' +
      '<div class="al-mid">→</div><div class="al-col"><small>WITH ONE MORE LEG</small><p>Potential Return</p><b>' + fmtTok(a.potentialReturn) + ' Tokens</b><p>Probability</p><b>' + fmtPct(a.p) + '</b></div></div>' +
      '<p class="muted center">Example extra leg: “' + esc(next.label) + '” (' + fmtPct(next.p) + ' on its own).</p>' +
      '<p class="muted small center">Both choices are fine to explore. This question is about noticing how the numbers change.</p>';
    UI.modal({ title: 'ADD ONE MORE LEG?', html: html, dismissible: false, actions: [
      { label: 'ADD LEG', act: 'addLegChoice', data: { choice: 'add', id: next.id } },
      { label: 'KEEP CURRENT PARLAY', act: 'addLegChoice', data: { choice: 'keep', id: next.id } }] });
  }
  PL.Actions.addLegChoice = function (el) {
    var added = el.getAttribute('data-choice') === 'add', id = el.getAttribute('data-id');
    var opts = L.influence.map(function (o, i) { return '<label class="radio"><input type="radio" name="infl" value="' + esc(o) + '"' + (i === 0 ? ' checked' : '') + '> ' + o + '</label>'; }).join('');
    UI.modal({ title: 'What influenced your decision?', html: '<p class="muted">You chose to <b>' + (added ? 'add the leg' : 'keep the current parlay') + '</b>.</p><div class="radios" role="radiogroup">' + opts + '</div>',
      dismissible: false, actions: [{ label: 'Save answer', act: 'saveInfluence', cls: 'primary', data: { added: added ? '1' : '0', id: id } }] });
  };
  PL.Actions.saveInfluence = function (el) {
    var added = el.getAttribute('data-added') === '1', id = el.getAttribute('data-id');
    var chosen = document.querySelector('input[name="infl"]:checked');
    S().answers.addLeg.push({ gameNo: S().gameNo, slipNo: S().slips.length + 1, added: added, influence: chosen ? chosen.value : '', legsBefore: S().draft.legs.length });
    UI.closeModal(true);
    if (added) {
      var mk = PREP().market, before = evalDraft();
      S().draft.legs.push(id);
      setDelta(before, evalDraft(), mk.byId[id].label, true);
      A.save(); V.refreshBuilder();
      UI.toast('Leg added. Check what changed in the slip.', 'ok');
    } else { A.save(); confirmLock(); }
  };

  function confirmLock() {
    var ev = evalDraft(), s = S();
    var html = '<p class="muted">Review before locking. Once locked, this slip cannot be changed.</p><ol class="mathlegs">' + ev.legs.map(function (l) { return '<li>' + esc(l.label) + ' <span class="muted">(' + fmtPct(l.p) + ')</span></li>'; }).join('') + '</ol>' +
      '<div class="review"><div><small>Legs</small><b>' + ev.n + '</b></div><div><small>Tokens risked</small><b>' + fmtTok(s.draft.stake) + '</b></div><div><small>Potential return</small><b>' + fmtTok(ev.potentialReturn) + '</b></div><div><small>Estimated probability</small><b>' + fmtPct(ev.p) + '</b></div><div><small>Expected value</small><b class="' + (ev.expectedValue < 0 ? 'neg' : 'pos') + '">' + (ev.expectedValue >= 0 ? '+' : '') + ev.expectedValue.toFixed(1) + '</b></div></div>' +
      '<p class="small muted">Probability and potential return always go together: the payout is large only because the combination is unlikely.</p>';
    UI.modal({ title: 'LOCK IN THIS SLIP?', html: html, actions: [{ label: 'Go back', act: 'closeModal' }, { label: 'LOCK IN', act: 'confirmLock', cls: 'primary' }] });
  }
  PL.Actions.confirmLock = function () {
    UI.closeModal(true);
    try {
      var slip = PL.Classroom.lockSlip(S(), PREP().market);
      A.ui.lastDelta = null; A.ui.prevEval = null; A.ui.revealProb = false; A.ui.slipMsg = '';
      A.save(true); A.refreshBalance();
      document.getElementById('market-body').innerHTML = marketBody();
      V.refreshBuilder();
      UI.toast('Slip locked. ' + fmtTok(slip.stake) + ' Lab Tokens allocated.', 'ok');
    } catch (e) { UI.toast(e.message, 'warn'); }
  };

  PL.Actions.watchGame = function () {
    var s = S();
    function go() {
      UI.closeModal(true);
      s.phase = 'live'; s.playback = { index: 0, speed: C().speed }; s._autoplay = true;
      A.save(true); A.render(); root.scrollTo(0, 0);
    }
    if (!s.slips.length) {
      UI.modal({ title: 'Watch without predictions?', html: '<p>You have not locked in any predictions for this game. You can still watch, but you will not be able to add predictions later.</p>', actions: [{ label: 'Back to predictions', act: 'closeModal' }, { label: 'Watch anyway', act: 'watchAnyway', cls: 'primary' }] });
      PL.Actions.watchAnyway = go;
    } else go();
  };

  // =====================================================================================================
  // LIVE
  // =====================================================================================================
  function mmss(sec) { sec = Math.max(0, sec); var m = Math.floor(sec / 60), s = Math.floor(sec % 60); return m + ':' + (s < 10 ? '0' : '') + s; }
  function periodLabel(q) { return q <= 4 ? 'Q' + q : (q === 5 ? 'OT' : (q - 4) + 'OT'); }

  function scoreboardHtml(game) {
    var m = game.matchup, pre = PREP().pregame;
    function side(t, row, id, role) {
      return '<div class="sb-team ' + role + '" style="--tc:' + t.color + '"><div class="sb-id"><b>' + esc(t.name) + '</b><small>' + role.toUpperCase() + ' • ' + row.record + '</small></div><div class="sb-score" id="' + id + '">0</div></div>';
    }
    return '<section class="scoreboard card" aria-label="Scoreboard">' + side(m.away, pre.teams[1], 'sb-away', 'away') +
      '<div class="sb-mid"><div class="sb-period" id="sb-period">Q1</div><div class="sb-clock" id="sb-clock" role="timer">' + mmss(game.quarterSeconds) + '</div><div class="sb-poss" id="sb-poss">Tip-off</div></div>' +
      side(m.home, pre.teams[0], 'sb-home', 'home') +
      '</section>';
  }

  function lineScoreHtml(game) {
    var m = game.matchup;
    return '<table class="linescore" aria-label="Score by quarter"><thead><tr><th></th><th>Q1</th><th>Q2</th><th>Q3</th><th>Q4</th><th id="ls-ot-h" class="hide">OT</th><th>T</th></tr></thead><tbody>' +
      ['away', 'home'].map(function (r) { return '<tr><th scope="row">' + (r === 'away' ? m.away.id : m.home.id) + '</th>' + [0, 1, 2, 3].map(function (i) { return '<td id="ls-' + r + i + '">–</td>'; }).join('') + '<td id="ls-' + r + '4" class="hide">–</td><td id="ls-' + r + 'T" class="tot">0</td></tr>'; }).join('') + '</tbody></table>';
  }

  function controlsHtml(teacherControls) {
    return '<div class="controls card" role="group" aria-label="Playback controls">' +
      '<button type="button" class="btn primary" id="pb-toggle" data-act="pbToggle" aria-label="Play">▶ PLAY</button>' +
      ['1', '2', '4'].map(function (sp) { return '<button type="button" class="btn speed" data-act="pbSpeed" data-speed="' + sp + '" aria-pressed="false">' + sp + 'X</button>'; }).join('') +
      (teacherControls ? '<span class="sep"></span><button type="button" class="btn" data-act="pbSkip" data-q="2">SKIP TO Q2</button><button type="button" class="btn" data-act="pbSkip" data-q="3">SKIP TO Q3</button><button type="button" class="btn" data-act="pbSkip" data-q="4">SKIP TO Q4</button><button type="button" class="btn" data-act="pbFinal">SHOW FINAL RESULT</button>' : '') +
      '<div class="pbar" aria-hidden="true"><span id="pb-prog"></span></div></div>';
  }

  function liveView() {
    var game = PREP().game, s = S();
    return '<main id="main" class="live">' + scoreboardHtml(game) + controlsHtml(A.isTeacher()) +
      '<div class="live-grid"><section class="live-left"><div class="court-wrap card" id="court-wrap"></div>' + '<div class="card">' + lineScoreHtml(game) + '</div>' +
      '<div class="runline" id="runline" aria-live="polite"></div>' +
      '<div class="card plays"><h3>RECENT PLAYS</h3><ol id="plays" aria-live="off"></ol></div></section>' +
      '<section class="live-right"><div id="tracker" aria-label="Live prediction status"></div><div class="card keyplayers"><h3>KEY PLAYERS</h3><div id="keystats"></div></div>' +
      '<div id="live-end"></div></section></div></main>';
  }

  PL.Live = (function () {
    var court, pb, live, game, prep, lastSave = 0, timerEls = {}, ended = false;
    var obj = { needsMount: false };

    function el(id) { return document.getElementById(id); }

    function updateScoreboard(info) {
      var h = live.score[0], a = live.score[1];
      setScore('sb-home', h); setScore('sb-away', a);
      var q = info ? info.period : live.period;
      el('sb-period').textContent = periodLabel(q);
      el('sb-clock').textContent = mmss(info ? info.clock : live.clock);
      el('sb-clock').classList.toggle('hold', !!(info && info.holding));
      var off = court ? court.offTeam : 0;
      el('sb-poss').textContent = live.final ? 'FINAL' : '▶ ' + game.matchup[off === 0 ? 'home' : 'away'].nickname + ' ball';
      // line score
      [0, 1].forEach(function (t) {
        var r = t === 0 ? 'home' : 'away';
        for (var i = 0; i < 5; i++) {
          var c = el('ls-' + r + i); if (!c) continue;
          var has = i < live.qs.length && (i < live.period - 1 || live.final || (i === live.period - 1 && live.started));
          if (i === 4) { c.classList.toggle('hide', live.qs.length < 5); el('ls-ot-h').classList.toggle('hide', live.qs.length < 5); }
          var ot = i === 4 ? (live.qs.slice(4).reduce(function (x, y) { return x + y[t]; }, 0)) : (live.qs[i] ? live.qs[i][t] : 0);
          c.textContent = has ? ot : '–';
        }
        el('ls-' + r + 'T').textContent = live.score[t];
      });
    }
    function setScore(id, v) {
      var n = el(id); if (!n) return;
      if (n.textContent !== String(v)) { n.textContent = v; n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump'); }
    }

    var PLAY_TYPES = { made2: 1, made3: 1, miss2: 1, miss3: 1, block: 1, steal: 1, turnover: 1, ft: 1, foul: 1, run: 1, timeout: 1, endq: 1, startq: 1, tip: 1, rebound: 1, final: 1 };
    function playHtml(ev) {
      var cls = 'p-' + ev.type + (ev.pts ? ' scored' : '');
      var tm = game.matchup[ev.team === 0 ? 'home' : 'away'];
      return '<li class="' + cls + '"><span class="pq">' + periodLabel(ev.q) + ' ' + mmss(ev.clock) + '</span><span class="pt" style="--tc:' + tm.color + '">' + esc(ev.text) + '</span>' +
        (ev.pts ? '<b class="pp">+' + ev.pts + '</b>' : '') + '</li>';
    }
    function pushPlay(ev) {
      if (!PLAY_TYPES[ev.type]) return;
      var ol = el('plays'); if (!ol) return;
      ol.insertAdjacentHTML('afterbegin', playHtml(ev));
      while (ol.children.length > 9) ol.removeChild(ol.lastChild);
      if (ev.type === 'run') el('runline').innerHTML = '<span class="runpill">🔥 ' + esc(ev.text) + '</span>'.replace('🔥', '▲');
      else if (ev.type === 'endq' || ev.type === 'startq') el('runline').innerHTML = '';
    }
    function rebuildPlays(idx) {
      var ol = el('plays'); if (!ol) return; ol.innerHTML = '';
      var picked = [];
      for (var i = idx - 1; i >= 0 && picked.length < 9; i--) if (PLAY_TYPES[game.events[i].type]) picked.push(game.events[i]);
      ol.innerHTML = picked.map(playHtml).join('');
      el('runline').innerHTML = '';
    }

    function legInfo(vec, p) {
      var st = PL.Props.legStatus(p, vec, live);
      return { status: st, prog: PL.Props.progressText(p, vec, game), req: PL.Props.requirement(p) };
    }
    var ICON = { pending: '○', live: '◔', hit: '✓', missed: '✕' };
    var LABEL = { pending: 'PENDING', live: 'LIVE', hit: 'HIT', missed: 'MISSED' };

    function trackerHtml() {
      var s = S(), slips = s.slips;
      if (A.view === 'replay' || !slips.length) return '<div class="card"><h3>LIVE PREDICTION STATUS</h3><p class="muted">' + (A.view === 'replay' ? 'Replay mode: no predictions are tracked.' : 'You have not locked any predictions for this game. Enjoy watching!') + '</p></div>';
      var vec = PL.Basketball.statVector(live, game.players);
      return '<div class="card tracker"><h3>LIVE PREDICTION STATUS</h3>' + slips.map(function (sl) {
        var infos = sl.legs.map(function (id) { return legInfo(vec, prep.market.byId[id]); });
        var hits = infos.filter(function (i) { return i.status === 'hit'; }).length, missed = infos.filter(function (i) { return i.status === 'missed'; }).length;
        var state, scls;
        if (!live.started) { state = 'PENDING'; scls = 'pending'; }
        else if (missed) { state = 'PARLAY LOST'; scls = 'lost'; }
        else if (hits === sl.legs.length) { state = 'PARLAY WON'; scls = 'won'; }
        else { state = 'IN PLAY'; scls = 'live'; }
        var summary = live.final ? hits + ' OF ' + sl.legs.length + ' CORRECT' : '';
        return '<div class="trk ' + scls + '"><div class="trk-top"><b>YOUR ' + sl.legs.length + '-LEG ' + (sl.legs.length === 1 ? 'PREDICTION' : 'PARLAY') + '</b><span class="trk-state">' + (scls === 'lost' ? '✕ ' : scls === 'won' ? '✓ ' : '') + state + '</span></div>' +
          '<div class="trk-sub">Risked ' + fmtTok(sl.stake) + ' • Potential ' + fmtTok(sl.potentialReturn) + ' • Est. ' + fmtPct(sl.p) + '</div>' +
          '<ul class="tlegs">' + sl.legs.map(function (id, i) {
            var p = prep.market.byId[id], inf = infos[i];
            return '<li class="tleg st-' + inf.status + '"><span class="ico" aria-hidden="true">' + ICON[inf.status] + '</span><div><b>' + esc(p.label) + '</b><small>' + (inf.status === 'pending' ? 'Not started' : esc(inf.prog) + (inf.status === 'live' && inf.req ? ' — needs ' + inf.req : '') + (live.final ? '' : ' — ' + periodLabel(live.period))) + '</small></div><span class="tag">' + LABEL[inf.status] + '</span></li>';
          }).join('') + '</ul>' + (summary ? '<div class="trk-final">' + summary + ' • PARLAY RESULT: ' + (scls === 'won' ? 'WIN' : 'LOSS') + '</div>' : '') + '</div>';
      }).join('') + '</div>';
    }
    function updateTracker() { var t = el('tracker'); if (t) t.innerHTML = trackerHtml(); }

    function updateKeyStats() {
      var ids = [], s = S();
      if (A.view !== 'replay') s.slips.forEach(function (sl) { sl.legs.forEach(function (id) { var p = prep.market.byId[id]; if (p.gid !== undefined && ids.indexOf(p.gid) < 0) ids.push(p.gid); }); });
      [0, 8, 1, 9, 2, 10].forEach(function (g) { if (ids.length < 7 && ids.indexOf(g) < 0) ids.push(g); });
      var h = '<table class="stats compact"><thead><tr><th scope="col">Player</th><th>PTS</th><th>REB</th><th>AST</th><th>3PM</th><th>PF</th></tr></thead><tbody>';
      ids.slice(0, 8).forEach(function (g) {
        var p = game.players[g], b = live.players[g], on = live.onCourt[p.teamIdx].indexOf(g) >= 0;
        h += '<tr><th scope="row">' + (on ? '<span class="onc" title="On court" aria-label="on court">●</span> ' : '') + esc(p.name) + '</th><td>' + b.pts + '</td><td>' + b.reb + '</td><td>' + b.ast + '</td><td>' + b.tpm + '</td><td>' + b.pf + '</td></tr>';
      });
      el('keystats').innerHTML = h + '</tbody></table>';
    }

    function updateControls() {
      var t = el('pb-toggle');
      if (t) {
        var playing = pb && pb.playing;
        t.textContent = ended ? '■ FINISHED' : (playing ? '❚❚ PAUSE' : (live.started && !live.final ? '▶ RESUME' : '▶ PLAY'));
        t.setAttribute('aria-label', playing ? 'Pause' : 'Play'); t.disabled = ended;
      }
      UI.$$('.speed').forEach(function (b) { var on = parseInt(b.getAttribute('data-speed'), 10) === (pb ? pb.speed : 1); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    }

    function onEnd() {
      ended = true;
      updateControls();
      var s = S();
      if (A.view !== 'replay' && s.phase === 'live') {
        PL.Classroom.settleGame(s, prep);
        A.save(true); A.refreshBalance();
      }
      updateTracker(); updateScoreboard();
      var h = '<div class="card endcard"><h3>FINAL</h3><p><b>' + esc(game.matchup.away.name) + ' ' + live.score[1] + ' – ' + esc(game.matchup.home.name) + ' ' + live.score[0] + '</b>' + (live.ot ? ' (OT)' : '') + '</p>' +
        (A.view === 'replay' ? '<button class="btn primary block" data-act="replayRevealOpen">Reveal the mathematics</button>' : '<button class="btn go lg block" data-act="viewResults">VIEW FULL RESULTS ▶</button>') + '</div>';
      el('live-end').innerHTML = h;
      var vb = document.querySelector('[data-act="viewResults"]'); if (vb) vb.focus();
    }

    obj.mount = function (App) {
      obj.needsMount = false; ended = false;
      prep = A.prepared; game = prep.game;
      var startIdx = A.view === 'replay' ? (A.replay.index || 0) : (S().playback.index || 0);
      var holder = A.view === 'replay' ? A.replay : S();
      var cw = el('court-wrap');
      court = new PL.Court(cw, game);
      live = PL.Basketball.liveAt(game, startIdx);
      pb = new PL.Playback(game, {
        onEvent: function (ev, idx) {
          PL.Basketball.applyEvent(live, ev);
          court.onEvent(ev, live);
          pushPlay(ev); updateScoreboard(); updateTracker(); updateKeyStats();
          if (A.view === 'replay') A.replay.index = idx; else S().playback.index = idx;
          var now = Date.now(); if (A.view !== 'replay' && now - lastSave > 1500) { lastSave = now; A.save(); }
        },
        onSeek: function (idx) {
          live = PL.Basketball.liveAt(game, idx);
          var last = game.events[idx - 1];
          var off = last ? ((last.type === 'steal' || last.type === 'turnover') ? 1 - last.team : (last.type === 'made2' || last.type === 'made3') ? 1 - last.team : last.team) : 0;
          court.setLineups(live.onCourt, off, live.period);
          rebuildPlays(idx); updateScoreboard(); updateTracker(); updateKeyStats();
          if (A.view === 'replay') A.replay.index = idx; else { S().playback.index = idx; A.save(); }
          updateControls();
        },
        onTick: function (info) {
          var c = el('sb-clock'); if (c) { c.textContent = mmss(info.clock); c.classList.toggle('hold', info.holding); }
          var p = el('pb-prog'); if (p) p.style.width = (info.progress * 100).toFixed(1) + '%';
        },
        onEnd: onEnd,
        onState: updateControls,
        onSpeed: function (sp) { court.setSpeed(sp); updateControls(); }
      });
      var sp = (holder.playback && holder.playback.speed) || holder.speed || C_speed();
      pb.speed = sp; court.setSpeed(sp);
      if (startIdx >= game.events.length) { pb.finished = true; pb.index = startIdx; pb.gameTime = game.totalTime; live = PL.Basketball.liveAt(game, startIdx); court.setLineups(live.onCourt, 0, 4); updateScoreboard(); updateTracker(); updateKeyStats(); onEnd(); rebuildPlays(startIdx); return; }
      pb.index = startIdx; pb.gameTime = startIdx > 0 ? game.events[startIdx - 1].t : 0;
      if (startIdx > 0) {
        var last = game.events[startIdx - 1];
        court.setLineups(live.onCourt, last.team, live.period);
        rebuildPlays(startIdx);
      } else {
        court.setLineups([[0, 1, 2, 3, 4], [8, 9, 10, 11, 12]], 0, 1);
        court.layout(0, 1);
      }
      updateScoreboard(); updateTracker(); updateKeyStats(); updateControls();
      var autoplay = A.view === 'replay' ? false : S()._autoplay;
      if (A.view !== 'replay') S()._autoplay = false;
      if (autoplay && startIdx === 0) setTimeout(function () { if (pb && !pb.finished) pb.play(); }, 700);
    };
    function C_speed() { return A.cfg().speed || 1; }

    obj.unmount = function () { if (pb) { pb.destroy(); } pb = null; court = null; obj.needsMount = false; };
    obj.pb = function () { return pb; };
    obj.setSpeedPersist = function (sp) { if (A.view === 'replay') A.replay.playback = { speed: sp }; else { S().playback.speed = sp; A.save(); } };
    return obj;
  })();

  PL.Actions.pbToggle = function () { var pb = PL.Live.pb(); if (!pb) return; if (pb.playing) pb.pause(); else pb.play(); };
  PL.Actions.pbSpeed = function (el) { var pb = PL.Live.pb(); if (!pb) return; var sp = parseInt(el.getAttribute('data-speed'), 10); pb.setSpeed(sp); PL.Live.setSpeedPersist(sp); };
  PL.Actions.pbSkip = function (el) { var pb = PL.Live.pb(); if (!pb || !A.isTeacher()) return; var was = pb.playing; pb.pause(); pb.seekToPeriod(parseInt(el.getAttribute('data-q'), 10)); if (was) pb.play(); };
  PL.Actions.pbFinal = function () { var pb = PL.Live.pb(); if (!pb || !A.isTeacher()) return; pb.pause(); pb.seek(PREP().game.events.length); };
  PL.Actions.viewResults = function () { A.save(true); A.render(); root.scrollTo(0, 0); };

  // =====================================================================================================
  // POST-GAME
  // =====================================================================================================
  function postView() {
    var s = S(), prep = PREP(), game = prep.game, res = game.result, m = game.matchup;
    var stats = res.stats, h = '';
    var risked = s.slips.reduce(function (a, x) { return a + x.stake; }, 0), returned = s.slips.reduce(function (a, x) { return a + x.returned; }, 0);
    h += '<main id="main" class="post">';
    // final score
    h += '<section class="card finalcard"><div class="fc-title">FINAL SCORE' + (res.ot ? ' <span class="pill">overtime</span>' : '') + '</div><div class="fc-score">' +
      '<div style="--tc:' + m.away.color + '"><small>AWAY</small><b>' + esc(m.away.name) + '</b><span class="n">' + res.score[1] + '</span></div><div class="dash">–</div>' +
      '<div style="--tc:' + m.home.color + '"><small>HOME</small><b>' + esc(m.home.name) + '</b><span class="n">' + res.score[0] + '</span></div></div>' +
      '<table class="linescore wide"><thead><tr><th></th>' + res.qScores.map(function (q, i) { return '<th>' + periodLabel(i + 1) + '</th>'; }).join('') + '<th>T</th></tr></thead><tbody>' +
      [[m.away, 1], [m.home, 0]].map(function (r) { return '<tr><th scope="row">' + esc(r[0].name) + '</th>' + res.qScores.map(function (q) { return '<td>' + q[r[1]] + '</td>'; }).join('') + '<td class="tot">' + res.score[r[1]] + '</td></tr>'; }).join('') + '</tbody></table></section>';

    // predictions
    h += '<section class="card"><h2>YOUR PREDICTIONS</h2>';
    if (!s.slips.length) h += '<p class="muted">You watched this game without locking in predictions.</p>';
    s.slips.forEach(function (sl) {
      var won = sl.result === 'WIN';
      h += '<div class="slipres ' + (won ? 'won' : 'lost') + '"><div class="sr-top"><b>' + sl.legs.length + '-LEG ' + (sl.legs.length === 1 ? 'PREDICTION' : 'PARLAY') + '</b><span class="badge">' + (won ? '✓ PARLAY RESULT: WIN' : '✕ PARLAY RESULT: LOSS') + '</span></div>' +
        '<div class="sr-hits">' + sl.hits + ' OF ' + sl.legs.length + ' CORRECT</div><ul class="tlegs">' +
        sl.legs.map(function (id, i) {
          var p = prep.market.byId[id], r = sl.legResults[i];
          return '<li class="tleg st-' + (r.hit ? 'hit' : 'missed') + '"><span class="ico" aria-hidden="true">' + (r.hit ? '✓' : '✕') + '</span><div><b>' + esc(p.label) + '</b><small>' + (r.hit ? 'Outcome Correct' : 'Outcome Not Met') + ' — ' + esc(PL.Props.progressText(p, stats, game)) + ' • Probability Before Game: ' + fmtPct(p.p) + '</small></div><span class="tag">' + (r.hit ? 'HIT' : 'MISSED') + '</span></li>';
        }).join('') + '</ul>' +
        '<div class="sr-nums"><div><small>TOKENS RISKED</small><b>' + fmtTok(sl.stake) + '</b></div><div><small>POTENTIAL RETURN</small><b>' + fmtTok(sl.potentialReturn) + '</b></div><div><small>TOKENS RETURNED</small><b>' + fmtTok(sl.returned) + '</b></div><div><small>NET RESULT</small><b class="' + (sl.returned - sl.stake >= 0 ? 'pos' : 'neg') + '">' + (sl.returned - sl.stake >= 0 ? '+' : '') + fmtTok(sl.returned - sl.stake) + '</b></div><div><small>ORIGINAL ESTIMATED PROBABILITY</small><b>' + fmtPct(sl.p) + '</b></div></div>' +
        (sl.nearMiss ? '<div class="nearmiss">' + esc(PL.Analytics.nearMissText({ legs: sl.legs.length, hits: sl.hits })) + '</div>' : '') + '</div>';
    });
    if (s.slips.length) {
      var net = returned - risked;
      h += '<div class="totals"><div><small>TOKENS RISKED</small><b>' + fmtTok(risked) + '</b></div><div><small>TOKENS RETURNED</small><b>' + fmtTok(returned) + '</b></div><div><small>NET RESULT</small><b class="' + (net >= 0 ? 'pos' : 'neg') + '">' + (net >= 0 ? '+' : '') + fmtTok(net) + '</b></div><div><small>TOKEN BALANCE</small><b>' + fmtTok(s.balance) + '</b></div></div>' +
        '<p class="muted small">Token Balance Changed: ' + fmtTok(s.balanceAtGameStart) + ' → ' + fmtTok(s.balance) + '.</p>';
    }
    h += '</section>';

    // probability message
    h += '<section class="card callout"><h2>' + L.afterGame.title + '</h2>' + L.afterGame.html + '</section>';

    // lesson cards
    h += '<section id="lessons">' + lessonCards() + '</section>';

    // same game, different decisions
    h += '<section class="card sgdd"><div class="sgdd-title">SAME GAME. DIFFERENT DECISIONS.</div><p class="muted">Every student with this class code watched the exact same game. Results differ because different combinations of events were required.</p><ul class="qlist">' +
      L.sameGame.map(function (q) { return '<li>' + q + '</li>'; }).join('') + '</ul><div class="btnrow"><button class="btn" data-act="copyResults">📋 Copy results summary</button></div></section>';

    // box score
    h += '<details class="card box"><summary>Box score</summary>' + boxScoreHtml(game) + '</details>';

    h += '<section class="card nextcard"><div class="btnrow"><button class="btn go lg" data-act="nextGame">NEXT GAME ▶</button><button class="btn" data-act="goTab" data-tab="lab">🧪 Explore Probability Lab</button><button class="btn" data-act="goTab" data-tab="report">📊 Session Report</button><button class="btn" data-act="goTab" data-tab="discuss">💬 Class Discussion</button></div>' +
      (s.balance < Math.max(1, 1) ? '<p class="muted">You are out of Lab Tokens. You can keep watching games, or review your report.</p>' : '') + '</section>';
    return h + '</main>';
  }

  function boxScoreHtml(game) {
    var h = '';
    [1, 0].forEach(function (ti) {
      var t = ti === 0 ? game.matchup.home : game.matchup.away;
      h += '<h4 class="teamh">' + swatch(t) + esc(t.name) + '</h4><div class="tablewrap"><table class="stats"><thead><tr><th scope="col">Player</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>STL</th><th>BLK</th><th>TO</th><th>PF</th><th>FG</th><th>3P</th><th>FT</th></tr></thead><tbody>';
      game.players.forEach(function (p, g) {
        if (p.teamIdx !== ti) return;
        var b = game.result.box[g];
        h += '<tr><th scope="row">' + esc(p.name) + '</th><td>' + b.min.toFixed(0) + '</td><td>' + b.pts + '</td><td>' + b.reb + '</td><td>' + b.ast + '</td><td>' + b.stl + '</td><td>' + b.blk + '</td><td>' + b.tov + '</td><td>' + b.pf + '</td><td>' + b.fgm + '/' + b.fga + '</td><td>' + b.tpm + '/' + b.tpa + '</td><td>' + b.ftm + '/' + b.fta + '</td></tr>';
      });
      h += '</tbody></table></div>';
    });
    return h;
  }

  // ---- lesson cards after the game ----
  function reflectionQuestionFor(s) {
    var f = s.config.reflectionFreq;
    if (f === 'off') return null;
    if (f === 'sometimes' && s.gameNo % 2 === 0) return null;
    return { idx: (s.gameNo - 1 + s.answers.reflections.length) % L.reflections.length };
  }
  function lessonCards() {
    var s = S(), h = '';
    if (s.config.reflectionFreq === 'off') return '';
    // near miss
    var nm = s.slips.filter(function (x) { return x.nearMiss; })[0];
    if (nm) {
      var ans = s.answers.nearMiss.filter(function (a) { return a.gameNo === s.gameNo; })[0];
      h += '<div class="card lesson" id="nm-card"><div class="lesson-tag">NEAR-MISS LESSON</div><div class="nearmiss big">' + esc(PL.Analytics.nearMissText({ legs: nm.legs.length, hits: nm.hits })) + '</div>' +
        '<p>' + L.nearMiss.question + '</p>';
      if (!ans) h += '<div class="optrow">' + L.nearMiss.options.map(function (o) { return '<button class="btn" data-act="answerNearMiss" data-ans="' + o + '">' + o + '</button>'; }).join('') + '</div>';
      else h += '<p class="answered">Your answer: <b>' + esc(ans.answer) + '</b></p><div class="explain">' + L.nearMiss.explanation + '</div>';
      h += '</div>';
    }
    if (!s.answers.fallacy.some(function (a) { return a.gameNo === s.gameNo; })) h += fallacyCard('post');
    var rq = reflectionQuestionFor(s);
    if (rq) {
      var q = L.reflections[rq.idx], saved = s.answers.reflections.filter(function (r) { return r.gameNo === s.gameNo; })[0];
      h += '<div class="card lesson" id="refl-card"><div class="lesson-tag">REFLECTION</div><p><b>' + esc(q) + '</b></p>' +
        (saved ? '<p class="answered">Saved: “' + esc(saved.text) + '”</p>' : '<textarea id="refl-text" rows="3" maxlength="600" placeholder="Write your thinking here (saved only on this computer)…" aria-label="Your reflection"></textarea><div class="btnrow"><button class="btn primary" data-act="saveReflection" data-q="' + rq.idx + '">Save reflection</button></div>') + '</div>';
    }
    return h;
  }
  PL.Actions.answerNearMiss = function (el) {
    S().answers.nearMiss.push({ gameNo: S().gameNo, answer: el.getAttribute('data-ans') }); A.save();
    document.getElementById('lessons').innerHTML = lessonCards();
  };
  PL.Actions.saveReflection = function (el) {
    var t = (document.getElementById('refl-text').value || '').trim();
    if (!t) { UI.toast('Write a sentence or two first.', 'warn'); return; }
    S().answers.reflections.push({ gameNo: S().gameNo, q: L.reflections[parseInt(el.getAttribute('data-q'), 10)], text: t });
    A.save(true); document.getElementById('lessons').innerHTML = lessonCards();
  };

  V.boxScoreHtml = boxScoreHtml;
  V.periodLabel = periodLabel;
  V.controlsHtml = controlsHtml;
  V.scoreboardHtml = scoreboardHtml; V.lineScoreHtml = lineScoreHtml;
})(typeof window !== 'undefined' ? window : globalThis);
