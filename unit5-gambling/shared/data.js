/* =====================================================================================================
 * shared/data.js: FICTIONAL data shared by the simulations (browser) and the question bank (server).
 * Everything here is invented for teaching.  No real teams, players, companies or people.  Not secret.
 * Keeping one copy guarantees that the numbers a student sees in a simulation are the numbers that are graded.
 * ===================================================================================================== */
(function (root) {
  'use strict';

  // ---------------------------------------------------------------------------------------- odds math
  // American odds: -110 means risk 110 to win 100; +150 means risk 100 to win 150.
  function amProfit(a) { return a > 0 ? a / 100 : 100 / -a; }                // profit per $1 staked if the bet wins
  function amDecimal(a) { return 1 + amProfit(a); }                          // total return per $1 staked if it wins
  function amImplied(a) { return a > 0 ? 100 / (a + 100) : -a / (-a + 100); } // break-even win probability
  function decToAmerican(d) { return d >= 2 ? Math.round((d - 1) * 100) : -Math.round(100 / (d - 1)); }
  function roundTo5(x) { return Math.round(x / 5) * 5; }
  function fmtAm(a) { return a > 0 ? '+' + a : '−' + Math.abs(a); }     // uses a true minus sign
  function evPer1(p, a) { return p * amProfit(a) - (1 - p); }                // expected profit per $1 staked
  function parlay(ps, as) {
    var p = 1, d = 1;
    for (var i = 0; i < ps.length; i++) { p *= ps[i]; d *= amDecimal(as[i]); }
    return { p: p, dec: d, ev: p * d - 1, fairDec: 1 / p };
  }

  // ---------------------------------------------------------------------------------------- fictional league
  // The Atlantic Valley Basketball League (the same fictional league used in Parlay Lab).
  var TEAMS = [
    { id: 'HCW', city: 'Harbor City', nick: 'Waves', rating: 1580, color: '#22b8e0' },
    { id: 'MTF', city: 'Metro', nick: 'Falcons', rating: 1555, color: '#f4b942' },
    { id: 'IWB', city: 'Ironwood', nick: 'Bears', rating: 1490, color: '#b5651d' },
    { id: 'SMS', city: 'Summit', nick: 'Storm', rating: 1530, color: '#8b7cf6' },
    { id: 'RWR', city: 'Redwood', nick: 'Raptors', rating: 1510, color: '#e5484d' },
    { id: 'CPK', city: 'Capital', nick: 'Knights', rating: 1470, color: '#4f7cff' },
    { id: 'LKL', city: 'Lakeside', nick: 'Lightning', rating: 1495, color: '#d7e02b' },
    { id: 'VLF', city: 'Valley', nick: 'Foxes', rating: 1450, color: '#ff8a3d' }
  ];
  var HOME_EDGE = 40;                // rating points of home-court advantage (model assumption)
  var MARGIN = 0.05;                 // the fictional sportsbook's built-in margin on each side
  var byId = {}; TEAMS.forEach(function (t) { byId[t.id] = t; });
  // Elo-style model: P(home wins) = 1 / (1 + 10^(-(Rh - Ra + HOME_EDGE) / 400)), shown to students rounded to 2 decimals.
  function modelP(home, away) {
    var d = byId[home].rating - byId[away].rating + HOME_EDGE;
    return Math.round(100 / (1 + Math.pow(10, -d / 400))) / 100;
  }
  function priceSide(p) { var a = roundTo5(decToAmerican((1 / p) * (1 - MARGIN))); return a === -100 ? 100 : a; }
  var SLATE = [['HCW', 'IWB'], ['MTF', 'VLF'], ['SMS', 'RWR'], ['CPK', 'LKL']].map(function (g, i) {
    var ph = modelP(g[0], g[1]), pa = Math.round((1 - ph) * 100) / 100;
    return { id: 'G' + (i + 1), home: g[0], away: g[1], pHome: ph, pAway: pa, oddsHome: priceSide(ph), oddsAway: priceSide(pa) };
  });

  // ---------------------------------------------------------------------------------------- class lab stations (from the Gambling Brain Lab packet)
  var STATION1 = { cost: 2, sections: [[3, 0], [2, 1], [1, 2], [1, 4], [1, 8]] };    // [number of sections, tokens returned]
  var STATION4 = { cost: 1, faces: [[3, 0], [2, 1], [1, 3]] };                         // [number of die faces, tokens returned]
  function stationEV(st, perOutcomeTotal) {
    var n = 0, ret = 0; (st.sections || st.faces).forEach(function (s) { n += s[0]; ret += s[0] * s[1]; });
    return { outcomes: n, expectedReturn: ret / n, net: ret / n - st.cost };
  }

  // ---------------------------------------------------------------------------------------- mock advertisements (teacher-written, fictional brands)
  // phrases: persuasion wording that the Ad Lab highlights; missing: what the ad does NOT tell you.
  var ADS = [
    { id: 'ad1', brand: 'BetPeak Sportsbook', head: 'New members get a $500 RISK-FREE FIRST BET!',
      body: 'Sign up today, place your first wager, and if it doesn\u2019t win, we\u2019ll refund you \u2014 up to $500. Zero risk, all reward. Download the app and claim your welcome bonus now!',
      phrases: ['RISK-FREE', 'Zero risk, all reward', 'claim your welcome bonus now'],
      fine: 'Refunds are paid as bonus bets (site credit), not cash. A bonus bet returns winnings only. Unused credit expires in 7 days.',
      placement: 'Pop-up the first time the app opens; push notification right after download.',
      viewers: [['14\u201317', 11], ['18\u201320', 24], ['21\u201324', 29], ['25\u201334', 22], ['35+', 14]], cta: 'Download now' },
    { id: 'ad2', brand: 'GoldStreak Rewards', head: 'Keep your streak alive!',
      body: 'Bet 3 days in a row to unlock Bronze status. Hit a 7-day streak for a free bet token. Reach 30 days for VIP perks like faster payouts and exclusive odds boosts. Don\u2019t break the streak \u2014 come back tomorrow!',
      phrases: ['Keep your streak alive', 'VIP perks', 'Don\u2019t break the streak'],
      fine: 'Your streak resets to zero if you miss a day. Free bet tokens return winnings only. VIP perks are subject to account review.',
      placement: 'Daily in-app notification and a loyalty-tier progress bar on the home screen.',
      viewers: [['14\u201317', 9], ['18\u201320', 26], ['21\u201324', 31], ['25\u201334', 23], ['35+', 11]], cta: 'Come back tomorrow' },
    { id: 'ad3', brand: 'PlayLine App', head: '\u201CI use PlayLine every single game day.\u201D',
      body: 'Featuring former pro athlete \u201CAce\u201D Dawson: \u201CIt\u2019s how I stay connected to the sport I love.\u201D Join Ace and thousands of fans \u2014 download PlayLine today and get in on the action.',
      phrases: ['Ace', 'thousands of fans', 'get in on the action'],
      fine: 'Sponsored content. Must be of legal betting age in your state to wager. Please play responsibly.',
      placement: 'Social media posts, sponsored videos, and television ads during games.',
      viewers: [['14\u201317', 15], ['18\u201320', 27], ['21\u201324', 28], ['25\u201334', 19], ['35+', 11]], cta: 'Download PlayLine' },
    { id: 'ad4', brand: 'Fantasy Champs League', head: 'This isn\u2019t gambling \u2014 it\u2019s a game of SKILL.',
      body: 'Draft your dream roster, compete against friends, and win cash prizes based on real player stats. Test your sports knowledge \u2014 enter a contest for as little as $5!',
      phrases: ['This isn\u2019t gambling', 'game of SKILL', 'as little as $5'],
      fine: 'Entry fees are not refundable. Prize amounts depend on how many people enter. Void where prohibited.',
      placement: 'App store description, fantasy-sports commercials, and the fine-print disclaimer page.',
      viewers: [['14\u201317', 13], ['18\u201320', 25], ['21\u201324', 27], ['25\u201334', 24], ['35+', 11]], cta: 'Enter a contest' },
    { id: 'ad5', brand: 'LuckyLine Live', head: 'The game\u2019s not over till we say it\u2019s over.',
      body: 'Bet on every play, every quarter, every moment. Odds update in real time so the action never stops. Cash out anytime\u2026 if you want to.',
      phrases: ['every play, every quarter, every moment', 'the action never stops', 'Cash out anytime'],
      fine: 'Cash-out values change with the live odds and can be less than your original stake.',
      placement: 'Push notifications during live games and an in-app banner on the game screen.',
      viewers: [['14\u201317', 10], ['18\u201320', 21], ['21\u201324', 30], ['25\u201334', 26], ['35+', 13]], cta: 'Bet live' },
    { id: 'ad6', brand: 'WinWell Referral Bonus', head: 'Refer a friend and you BOTH get a $50 bonus bet!',
      body: 'Share the fun with your squad \u2014 the more friends you invite, the more you earn.',
      phrases: ['you BOTH get', 'your squad', 'the more friends you invite'],
      fine: 'Bonus bets expire in 14 days. New users must deposit $20. Limit of five referrals.',
      placement: 'Share button inside the app, group-chat links, and friends\u2019 social feeds.',
      viewers: [['14\u201317', 14], ['18\u201320', 28], ['21\u201324', 30], ['25\u201334', 19], ['35+', 9]], cta: 'Invite friends' }
  ];

  var SLOGANS = [
    { id: 's1', text: '“Your First Bet Is On Us — Sign Up Free!”', hook: 'free' },
    { id: 's2', text: '“Everyone’s Talking About the Game. Are You In?”', hook: 'belong' },
    { id: 's3', text: '“Win Bigger Tonight — One Tap Away.”', hook: 'speed' }
  ];

  var POSTS = [
    { id: 'p1', who: '@tylerbets', t: 'LET’S GO!!! Turned $10 into $240 tonight 🔥🔥🔥', kind: 'win' },
    { id: 'p2', who: '@jordan_picks', t: 'Tough night. Lost 7 bets. Down $185.', kind: 'loss' },
    { id: 'p3', who: '@morgan.sports', t: 'Use my code when you sign up. I get credit when you join.', kind: 'referral' }
  ];

  var api = {
    amProfit: amProfit, amDecimal: amDecimal, amImplied: amImplied, decToAmerican: decToAmerican, fmtAm: fmtAm, evPer1: evPer1, parlay: parlay,
    TEAMS: TEAMS, HOME_EDGE: HOME_EDGE, MARGIN: MARGIN, modelP: modelP, SLATE: SLATE, teamName: function (id) { return byId[id].city + ' ' + byId[id].nick; }, team: function (id) { return byId[id]; },
    STATION1: STATION1, STATION4: STATION4, stationEV: stationEV, ADS: ADS, SLOGANS: SLOGANS, POSTS: POSTS
  };
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  root.U5D = api;
})(typeof globalThis !== 'undefined' ? globalThis : (typeof self !== 'undefined' ? self : this));
