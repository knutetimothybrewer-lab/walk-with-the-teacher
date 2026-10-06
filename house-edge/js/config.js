/* THE HOUSE EDGE — central configuration.
   EVERYTHING mathematical lives here: probabilities, payouts, simulation sizes,
   zone requirements, levels. Gameplay, X-Ray Mode, charts and the 10,000-player
   simulations all read these same objects. Edit here, nothing else needs changing. */
(function (root) {
  'use strict';
  var HE = root.HE = root.HE || {};

  HE.CONFIG = {
    version: '1.0.0',
    storageKey: 'houseEdge.v1',
    startTokens: 1000,
    tokenNotice: 'Tokens have no monetary value.',

    /* ---------- GAMES -------------------------------------------------------
       Each game is a list of mutually exclusive outcomes.
       p   = probability of the outcome (must sum to 1)
       ret = tokens RETURNED per 1 token wagered (stake included).
       Net profit per token = ret - 1.                                        */
    games: {
      slots: {
        id: 'slots', name: 'Neon Orchard', kind: 'slot', wagers: [5, 10, 20],
        blurb: 'A fictional 3-reel slot-style machine.',
        outcomes: [
          { id: 'jackpot', label: 'Triple Star',    p: 0.004, ret: 50,  show: 'TRIPLE_STAR' },
          { id: 'gems',    label: 'Triple Gem',     p: 0.02,  ret: 10,  show: 'TRIPLE_GEM' },
          { id: 'fruit',   label: 'Triple Berry',   p: 0.06,  ret: 4,   show: 'TRIPLE_BERRY' },
          { id: 'pair',    label: 'Matching Pair',  p: 0.17,  ret: 1.5, show: 'PAIR' },
          { id: 'near',    label: 'Near Miss (two stars, third reel misses)', p: 0.15, ret: 0, show: 'NEAR' },
          { id: 'loss',    label: 'No Match',       p: 0.596, ret: 0,   show: 'NONE' }
        ]
      },
      wheel: {
        id: 'wheel', name: 'Prism Wheel (color bet)', kind: 'wheel', wagers: [10, 25, 50, 100],
        blurb: 'A fictional wheel with 18 red, 18 black and 2 green slices. You bet on a color.',
        outcomes: [
          { id: 'hit',  label: 'Your color',  p: 18 / 38, ret: 2 },
          { id: 'miss', label: 'Other color', p: 18 / 38, ret: 0 },
          { id: 'zero', label: 'Green slice', p: 2 / 38,  ret: 0 }
        ]
      },
      dice: {
        id: 'dice', name: 'Twin Dice (bet on doubles)', kind: 'dice', wagers: [10, 25, 50, 100],
        blurb: 'Roll two dice. You win if both dice match.',
        outcomes: [
          { id: 'doubles', label: 'Doubles', p: 6 / 36,  ret: 5.5 },
          { id: 'nodbl',   label: 'No doubles', p: 30 / 36, ret: 0 }
        ]
      },
      coin: {
        id: 'coin', name: 'Fair Flip (teaching game)', kind: 'coin', wagers: [10],
        blurb: 'A perfectly fair even-money coin game used only for teaching.',
        outcomes: [
          { id: 'win',  label: 'Win',  p: 0.5, ret: 2 },
          { id: 'lose', label: 'Lose', p: 0.5, ret: 0 }
        ]
      }
    },

    /* The EV Lab teaching bet: 50% gain 8, 50% lose 10 (net tokens, not returns). */
    evGame: { win: { p: 0.5, net: 8 }, lose: { p: 0.5, net: -10 } },

    /* Hypothetical "educational simulation" games for the House Edge Experiment.
       Each is an even-money bet (return 2x) whose win chance is (1 - edge) / 2.   */
    edgeLab: { edges: [0, 0.02, 0.05, 0.10], betsPerPlayer: 100, wager: 10 },

    /* ---------- SLOT SESSION (Zone 2) ---------- */
    slotSession: { minSpins: 12, maxSpins: 20, bigWinMultiple: 4, startBalance: 1000 },

    /* ---------- SPORTS (all fictional) ---------- */
    sports: {
      margin: 0.045,           // book keeps 4.5% on every leg: offered = (1 - margin) / p
      minLegs: 2, maxLegs: 6, stakes: [5, 10, 20],
      teams: {
        MET: { name: 'Metro Meteors',       color: '#ff6b6b' },
        HAR: { name: 'Harbor Hawks',        color: '#4dabf7' },
        CAP: { name: 'Capital Comets',      color: '#ffd43b' },
        RIV: { name: 'River City Raptors',  color: '#51cf66' },
        COA: { name: 'Coastal Cyclones',    color: '#74c0fc' },
        SUM: { name: 'Summit Foxes',        color: '#ff922b' }
      },
      slate: [  // pHome = TRUE win probability of the home team (hidden until X-Ray)
        { id: 'g1', home: 'MET', away: 'HAR', pHome: 0.50 },
        { id: 'g2', home: 'CAP', away: 'RIV', pHome: 0.55 },
        { id: 'g3', home: 'COA', away: 'SUM', pHome: 0.45 },
        { id: 'g4', home: 'HAR', away: 'CAP', pHome: 0.50 },
        { id: 'g5', home: 'RIV', away: 'MET', pHome: 0.60 },
        { id: 'g6', home: 'SUM', away: 'COA', pHome: 0.50 }
      ],
      referenceLegP: 0.5       // the simplified "independent 50/50" teaching model
    },

    /* ---------- SIMULATION ---------- */
    sim: {
      sizes: [10, 100, 1000, 10000],
      bins: 41,
      breakEvenBandPct: 0.02,   // "near break-even" = within +/-2% of tokens wagered
      varianceBets: [10, 100, 1000, 10000],
      varianceWager: 10,
      rtpSizes: [10, 100, 1000, 10000],
      standardSession: { game: 'slots', spins: 40, wager: 10 }, // used in Classroom Debrief
      claim: { game: 'slots', start: 500, spins: 40, wager: 10, end: 1400 } // "But I won" claim
    },

    /* ---------- BEAT THE HOUSE (Zone 8) ---------- */
    beat: {
      bankroll: 1000, maxBets: 50,
      games: ['slots', 'wheel', 'dice', 'rotate'],
      baseWagers: [10, 25, 50, 100],
      afterLoss: ['same', 'double'],
      stopWin: [0, 200, 500],        // 0 = no stop
      stopLoss: [0, 200, 500],
      doubleCap: 400
    },

    /* ---------- TIMING (milliseconds) ---------- */
    timing: { reelStops: [700, 1000, 1300], celebrateMs: 2300, randomScanMs: 1400, strategyStepMs: 110, parlayStepMs: 650 },

    /* ---------- LEVELS ---------- */
    levels: [
      { n: 0, name: 'PLAYER', vision: null, msg: 'You see the games, the tokens and the lights.' },
      { n: 1, name: 'ODDS SPOTTER', vision: 'PROBABILITY VISION', msg: 'Probabilities now appear on selected games.', requires: ['z1.flip', 'z1.dice'] },
      { n: 2, name: 'PATTERN BREAKER', vision: 'PATTERN VISION', msg: 'You can tell real randomness from "patterns" and streaks.', requires: ['z1.streak'] },
      { n: 3, name: 'VALUE DETECTIVE', vision: 'EXPECTED VALUE VISION', msg: 'You can inspect probability × outcome to see who a game favors.', zone: 'z3' },
      { n: 4, name: 'HOUSE EDGE HUNTER', vision: 'HOUSE EDGE VISION', msg: 'You can expose RTP, expected loss and house advantage.', zone: 'z4' },
      { n: 5, name: 'PARLAY DECODER', vision: 'PARLAY VISION', msg: 'You can inspect combined probabilities and bookmaker margin.', zone: 'z5' },
      { n: 6, name: 'BIAS BREAKER', vision: 'BRAIN X-RAY', msg: 'You can spot the thinking traps that games exploit.', zone: 'z6' },
      { n: 7, name: 'SIMULATION SCIENTIST', vision: 'THE 10,000 PLAYERS LAB', msg: 'You can test expectations against thousands of simulated outcomes.', zone: 'z7' },
      { n: 8, name: 'ANALYST', vision: 'X-RAY EVERYTHING', msg: 'You can see through the system.', zone: 'z9' }
    ],

    /* ---------- ZONES & REQUIRED STEPS ---------- */
    zones: [
      { id: 'z0', num: 0, icon: '★', title: 'Enter the Floor', sub: 'Make your prediction', steps: [
        ['i.predict', 'Make your starting prediction'], ['i.survive', 'Answer the business question'] ] },
      { id: 'z1', num: 1, icon: '🎲', title: 'Probability Training', sub: 'Coins, dice and streaks', steps: [
        ['z1.flip', 'Flip 1,000 coins and explain what you see'], ['z1.dice', 'Predict, roll and calculate with dice'], ['z1.streak', 'Test streaks in 100-flip sequences'] ] },
      { id: 'z2', num: 2, icon: '🎰', title: 'Slot Machine Lab', sub: 'Play, then X-ray the machine', steps: [
        ['z2.spins', 'Play the machine for your session'], ['z2.xray', 'X-ray the machine: random value, wager, return, profit'] ] },
      { id: 'z3', num: 3, icon: '⚖', title: 'Expected Value Lab', sub: 'Probability × outcome', steps: [
        ['z3.coin', 'Decide, simulate and reveal a bet\'s expected value'], ['z3.challenges', 'Solve the EV challenges'], ['z3.slotev', 'Compute the slot machine\'s expected value'] ] },
      { id: 'z4', num: 4, icon: '🏠', title: 'House Edge & Variance', sub: 'RTP, luck and the long run', steps: [
        ['z4.edge', 'X-ray the house edge'], ['z4.rtp', 'Test return-to-player at four sizes'], ['z4.variance', 'See short-term luck vs long-term math'] ] },
      { id: 'z5', num: 5, icon: '🏟', title: 'Fictional Sportsbook & Parlays', sub: 'Why big payouts are rare', steps: [
        ['z5.straight', 'Place a single fictional bet'], ['z5.build', 'Build a parlay with 3+ legs'], ['z5.xray', 'Predict, then X-ray the parlay'], ['z5.sim', 'Run 10,000 parlays'] ] },
      { id: 'z6', num: 6, icon: '🧠', title: 'Brain vs Randomness', sub: 'Biases & interface design', steps: [
        ['z6.gf', 'Gambler\'s Fallacy'], ['z6.hot', 'Hot-Hand Thinking'], ['z6.control', 'Illusion of Control'], ['z6.near', 'Near-Miss Effect'],
        ['z6.chase', 'Loss Chasing'], ['z6.memory', 'Selective Memory'], ['z6.sunk', 'Sunk-Cost Thinking'],
        ['z6.interface', 'X-ray the interface'], ['z6.lights', 'Remove the lights experiment'] ] },
      { id: 'z7', num: 7, icon: '👥', title: 'The 10,000 Players Lab', sub: 'One result is one sample', steps: [
        ['z7.run', 'Simulate 10, 100, 1,000 and 10,000 players'], ['z7.compare', 'Interpret your result'], ['z7.house', 'Switch to HOUSE VIEW'],
        ['z7.rerun', 'Run another 10,000 and explain it'], ['z7.edgelab', 'Complete the House Edge Experiment'] ] },
      { id: 'z8', num: 8, icon: '🎯', title: 'Can You Beat the House?', sub: 'Strategy vs mathematics', steps: [
        ['z8.play', 'Play your strategy'], ['z8.sim', 'Send it through 10,000 players'], ['z8.claim', 'Evaluate the "But I won" claim'] ] },
      { id: 'z9', num: 9, icon: '🔓', title: 'Mastery Challenge', sub: 'Escape the casino with scenarios', steps: [] },   // steps filled from questions
      { id: 'z10', num: 10, icon: '✨', title: 'X-Ray Everything', sub: 'See the whole system', steps: [
        ['z10.xray', 'X-ray everything'], ['z10.reveal', 'Watch the 10,000-player reveal'], ['z10.compare', 'Compare with your first prediction'], ['z10.reflect', 'Write your reflection'] ] }
    ],

    /* ---------- CONCEPTS (mastery tracking & report) ---------- */
    concepts: [
      { id: 'probability', name: 'PROBABILITY' }, { id: 'randomness', name: 'RANDOMNESS' },
      { id: 'ev', name: 'EXPECTED VALUE' }, { id: 'houseEdge', name: 'HOUSE EDGE' },
      { id: 'rtp', name: 'RTP' }, { id: 'variance', name: 'VARIANCE' },
      { id: 'parlays', name: 'PARLAYS' }, { id: 'biases', name: 'COGNITIVE BIASES' },
      { id: 'longRun', name: 'LONG-RUN THINKING' }
    ],

    /* ---------- REUSABLE EXPLANATION TEXT ---------- */
    text: {
      simNote: 'This classroom simulation chooses outcomes with randomized JavaScript. It does not describe how every commercial gambling machine works.',
      independence: 'This simplified calculation assumes the legs are independent. Real sports events and prop outcomes can sometimes be correlated.',
      longRunVsSession: 'LONG-RUN EXPECTATION is a mathematical average over many wagers. An INDIVIDUAL SESSION can land well above or below it.',
      houseNeed: 'THE HOUSE DOES NOT NEED TO WIN EVERY BET. IT NEEDS THE MATHEMATICS TO FAVOR IT ACROSS MANY WAGERS.'
    },

    labels: { fact: 'MATHEMATICAL FACT', assumption: 'SIMULATION ASSUMPTION', research: 'RESEARCH FINDING', example: 'ILLUSTRATIVE EXAMPLE' },

    /* Teacher-configurable. Names are never collected by default. */
    printNameLine: false,

    sources: [
      { id: 's1', tag: 'research', title: 'Clark, Lawrence, Astley-Jones & Gray (2009). Gambling near-misses enhance motivation to gamble and recruit win-related brain circuitry. Neuron, 61(3).',
        url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC2658737/', use: 'Near-miss effect (Zone 6). Lab study in adults; findings are about motivation and brain activity, not proof that every near miss causes problems.', verified: 'Checked via search of the open-access article page.' },
      { id: 's2', tag: 'research', title: 'Dixon, Harrigan, Sandhu, Collins & Fugelsang (2010). Losses disguised as wins in modern multi-line video slot machines. Addiction, 105(10), 1819-1824.',
        url: 'https://uwaterloo.ca/reasoning-decision-making-lab/sites/default/files/uploads/files/DixFugetal_10c.pdf', use: 'Interface design: celebrating returns smaller than the wager (Zone 6). Small lab sample of novice players.', verified: 'Citation confirmed by search; read the paper before quoting details.' },
      { id: 's3', tag: 'research', title: 'Langer, E. (1975). The illusion of control. Journal of Personality and Social Psychology, 32(2), 311-328.',
        url: 'https://noosphere.princeton.edu/ejap/abstracts/Langer_1975.html', use: 'Illusion of control: skill-like cues (such as choosing) in chance situations (Zone 6).', verified: 'Citation confirmed by search.' },
      { id: 's4', tag: 'research', title: 'Miller & Sanjurjo (2018). Surprised by the Hot Hand Fallacy? A Truth in the Law of Small Numbers. Econometrica, 86(6), 2019-2047.',
        url: 'https://econometricsociety.org/publications/econometrica/2018/11/01/surprised-hot-hand-fallacy-truth-law-small-numbers', use: 'Why "hot hand" in real sports is still debated, while a fair coin has no hot hand (Zone 6).', verified: 'Citation confirmed by search.' },
      { id: 's5', tag: 'fact', title: 'National Council on Problem Gambling: help and treatment (helpline, text and chat).',
        url: 'https://ncpgambling.org/help-treatment/national-helpline-1-800-522-4700/', use: 'Help & Support. The national helpline number has changed hands recently; always confirm the current number on this page.', verified: 'Search found 1-800-522-4700 listed by NCPG as of the last check. CONFIRM BEFORE CLASS.' },
      { id: 's6', tag: 'fact', title: 'Expected value, independence, Law of Large Numbers (any standard high-school/AP statistics text; e.g. OpenStax Introductory Statistics, Khan Academy "Probability").',
        url: 'https://openstax.org/details/books/introductory-statistics-2e', use: 'Mathematical definitions used throughout. TEACHER: confirm the chapter that matches your course.', verified: 'PLACEHOLDER: general reference, verify chapter before citing.' },
      { id: 's7', tag: 'research', title: 'Gilovich, Vallone & Tversky (1985). The hot hand in basketball: On the misperception of random sequences. Cognitive Psychology, 17(3), 295-314.',
        url: 'https://doi.org/10.1016/0010-0285(85)90010-6', use: 'Original hot-hand study referenced in Zone 6.', verified: 'PLACEHOLDER: citation from memory and cited by s4; verify before quoting.' },
      { id: 's8', tag: 'assumption', title: 'Gambler\'s fallacy, sunk-cost fallacy and loss chasing: summaries from your state\'s problem-gambling agency or NCPG education pages.',
        url: 'https://www.ncpgambling.org/', use: 'Plain-language descriptions of loss chasing. PLACEHOLDER: add your state agency link.', verified: 'PLACEHOLDER: requires teacher to add a state-specific link.' }
    ]
  };

  /* Fill mastery steps from the question bank once it loads (see questions.js). */
  HE.CONFIG.zoneById = function (id) { for (var i = 0; i < HE.CONFIG.zones.length; i++) if (HE.CONFIG.zones[i].id === id) return HE.CONFIG.zones[i]; };
})(typeof window !== 'undefined' ? window : globalThis);
