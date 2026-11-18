/* =====================================================================
   OUTBREAK CITY: CONFIG & BALANCE  (safe to edit)
   ---------------------------------------------------------------------
   Everything a teacher might want to change lives here or in content.js:
   names, the optional Google Sheets webhook, and every balance number.
   Simulation times are in SIM SECONDS (1 sim second = 1 real second at 1x).
   ===================================================================== */
(function (root) {
  'use strict';
  var NS = root.OutbreakCity = root.OutbreakCity || {};
  var D = NS.data = NS.data || {};

  /* ---- TEACHER LOGGING (optional) -----------------------------------
     Paste your Google Apps Script web-app URL between the quotes to have
     final results POSTed to your Google Sheet. Leave blank to turn off.
     See README.md for the Apps Script code. The completion code always
     works as a fallback. */
  D.SHEETS_WEBHOOK_URL = "";

  /* ---- NAMES (easy to change) --------------------------------------- */
  D.GAME_TITLE = 'OUTBREAK CITY';
  D.CITY_NAME = 'Mercy Falls';
  D.NEWSPAPER = 'The Mercy Falls Gazette';

  /* Five districts. baseAccess = health-care access before you build anything
     (0..1). This is the "social determinants of health" starting point.
     wealth affects tax income, density affects how crowded buildings are. */
  D.DISTRICTS = [
    { id: 'hill', popShare: 0.14, name: 'Gilded Heights', short: 'Heights', wealth: 1.0, density: 0.75, baseAccess: 0.55, park: 0.26, fill: 0.55, style: 'mansion',
      blurb: 'Hillside mansions, private doctors, two-car garages.', center: [0.22, 0.2] },
    { id: 'down', popShare: 0.25, name: 'Downtown Core', short: 'Downtown', wealth: 0.7, density: 1.25, baseAccess: 0.34, park: 0.07, fill: 0.92, style: 'tower',
      blurb: 'Glass towers, commuters, and everybody\'s office.', center: [0.47, 0.44] },
    { id: 'east', popShare: 0.27, name: 'Eastside Flats', short: 'Eastside', wealth: 0.3, density: 1.35, baseAccess: 0.1, park: 0.05, fill: 0.94, style: 'brick',
      blurb: 'Crowded apartments, essential workers, one bus line.', center: [0.8, 0.3] },
    { id: 'port', popShare: 0.13, name: 'Rustwater Port', short: 'Port', wealth: 0.45, density: 0.6, baseAccess: 0.18, park: 0.1, fill: 0.62, style: 'warehouse',
      blurb: 'Docks, warehouses, night shifts, few clinics.', center: [0.74, 0.8] },
    { id: 'sub', popShare: 0.21, name: 'Maple Sprawl', short: 'Suburbs', wealth: 0.75, density: 0.7, baseAccess: 0.38, park: 0.18, fill: 0.62, style: 'house',
      blurb: 'Cul-de-sacs, a mega mall, and strong opinions on lawns.', center: [0.22, 0.74] }
  ];

  /* ---- CORE BALANCE --------------------------------------------------- */
  D.CONFIG = {
    simHz: 20,               // fixed simulation steps per second
    mapSize: 43,             // tiles per side (roads every 5 tiles)
    population: 2600,        // residents at the start (Normal)

    // --- Pathogen ("the zombie virus") ---
    biteSuccess: 0.3,         // chance a bite on a Susceptible person causes infection (Exposed)
    incubationMean: 34,      // average seconds an Exposed person incubates before turning
    turnBites: 2,            // bites a newly turned zombie makes on its own household before leaving
    householdMult: 1.35,      // close contact at home: those bites succeed more often
    insideBiteInterval: 2.2, // seconds between bites for a zombie trapped inside a building
    vaccineEfficacy: 0.9,    // fraction of bites a vaccinated person resists
    cureEfficacy: 0.85,      // chance hospital treatment of an Exposed person works
    freshZombieWindow: 8,    // hospitals can still treat zombies younger than this (seconds)
    turnRunnerChance: 0.15,  // chance a turned resident becomes a Sprinter instead of a Shambler

    // --- Agents ---
    maxWalkers: 150,         // residents walking the streets at once (simulation cap)
    maxZombies: 140,         // zombie agents on the streets at once (extra wait inside buildings)
    commuteRate: 3.2,        // trips started per second citywide (before mobility modifiers)
    sameDistrictTrips: 0.55, // share of trips that stay in the home district
    walkerSpeed: 1.15,       // tiles per second
    fleeRadius: 1.6,         // walkers this close to a zombie run
    fleeSpeedMult: 1.7,
    biteRange: 0.55,         // tiles
    biteCooldown: 3.0,       // seconds between street bites per zombie
    streetBiteMult: 0.6,     // people outdoors can run: street bites succeed less often
    breachTime: 5,           // seconds a zombie spends attacking a building
    barricadeCostZombie: 6,  // pathfinding cost of crossing a barricade for zombies
    importedEntryWalk: true,

    // --- Economy ---
    startBudget: 520,
    waveGrant: 210,          // emergency funds after each wave
    taxPerResident: 0.00042, // $ per healthy resident per second
    waveVaccines: 200,       // vaccine doses shipped after each wave
    startVaccines: 320,
    startBeds: 0,            // extra citywide beds (hospitals add their own)
    sellRefund: 0.6,

    // --- Social ---
    startTrust: 60,
    startPanic: 8,
    complianceBase: 0.2,     // compliance = base + trustWeight*trust - panicWeight*panic + bonuses
    complianceTrust: 0.72,
    compliancePanic: 0.25,
    uptakeBase: 0.25,        // vaccine uptake = base + trustWeight*trust (times rumor modifiers)
    uptakeTrust: 0.75,
    deathTrustHit: 0.015,    // trust lost per death
    strayTrustHit: 1.3,      // trust lost per civilian hit by stray fire
    strayPanic: 3,
    unrestTrust: 25,         // below this trust, civil unrest: people defy guidance, travel more, stop paying taxes
    unrestMobility: 0.45,
    unrestIncome: 0.4,

    // --- Waves ---
    waveDuration: 90,        // seconds per wave (full game)
    quickWaveDuration: 70,   // seconds per wave (quick game)
    quickBonus: 1.3,         // quick games start with this much more budget and vaccine (fewer refills)
    spawnWindow: 0.45,       // zombies arrive during the first 45% of a wave
    finalPush: 75,           // after the last wave, up to this many extra seconds to clear remaining cases
    collapseThreshold: 0.38, // game ends early if healthy residents fall below this share

    // --- Performance ---
    lowFxFrameMs: 20,        // auto "Low effects" if average frame time exceeds this...
    lowFxSeconds: 5          // ...for this many seconds in a row
  };

  /* Difficulty multipliers */
  D.DIFFICULTY = {
    easy:   { label: 'Easy',   budget: 1.3,  trust: 68, transmission: 0.85, spawn: 0.75, grant: 1.2,  vaccines: 1.3, pop: 0.9 },
    normal: { label: 'Normal', budget: 1.0,  trust: 60, transmission: 1.0,  spawn: 1.0,  grant: 1.0,  vaccines: 1.0, pop: 1.0 },
    hard:   { label: 'Hard',   budget: 0.9,  trust: 52, transmission: 1.08, spawn: 1.2,  grant: 0.9,  vaccines: 0.85, pop: 1.1 }
  };

  /* ---- TOWERS / INTERVENTIONS ---------------------------------------
     cost, range (tiles), and per-level upgrade overrides. Colors are the
     Okabe-Ito colorblind-safe palette; every tower also has a unique glyph. */
  D.TOWERS = {
    militia: {
      key: '1', name: 'Militia Turret', glyph: 'crosshair', color: '#D55E00',
      cost: 60, range: 4.0, rate: 1.1, damage: 20, strayBase: 0.02, strayPerCiv: 0.035,
      trustDrain: 0.006, noise: 5.5, spawnPenalty: 0.05, strayMult: 1, trustDrainMult: 1,
      short: 'Shoots visible zombies. Cheap, loud, and not picky.',
      concept: 'Containment by force: it works on what you can see, and it costs trust, autonomy and justice.',
      upgrades: [
        { cost: 70, label: 'Heavier Ordnance', damage: 34, range: 4.6 },
        { cost: 90, label: 'De-escalation Training', rate: 1.3, strayMult: 0.4, trustDrainMult: 0.5 }
      ]
    },
    lab: {
      key: '2', name: 'Testing & Tracing Lab', glyph: 'magnifier', color: '#0072B2',
      cost: 90, range: 6.5, scanInterval: 1.5, revealWalker: 0.5, revealBuilding: 0.3, trace: false,
      short: 'Finds Exposed people who look healthy. Lets hospitals target them.',
      concept: 'Surveillance, screening and contact tracing (secondary prevention): you cannot fight what you cannot see.',
      upgrades: [
        { cost: 80, label: 'Rapid Tests', scanInterval: 1.0, range: 7.3 },
        { cost: 100, label: 'Contact Tracing Team', trace: true, revealBuilding: 0.3 }
      ]
    },
    clinic: {
      key: '3', name: 'Vaccination Clinic', glyph: 'syringe', color: '#009E73',
      cost: 120, range: 5.5, rate: 2.4,
      short: 'Immunizes people in range before they are bitten. Uses vaccine stock.',
      concept: 'Primary prevention: protect people before exposure. Enough immunity gives herd immunity.',
      upgrades: [
        { cost: 90, label: 'Extra Nurses', rate: 3.4 },
        { cost: 110, label: 'Mobile Outreach', rate: 4.4, range: 6.5 }
      ]
    },
    hospital: {
      key: '4', name: 'Field Hospital', glyph: 'h', color: '#CC79A7',
      cost: 150, range: 5.0, beds: 10, admitInterval: 0.8, stay: 14, selfPresent: 0.03, freshWindowMult: 1,
      short: 'Cures known Exposed and freshly turned people. Limited beds.',
      concept: 'Treatment and surge capacity (tertiary care). When beds run out, care runs out.',
      upgrades: [
        { cost: 120, label: 'Surge Ward', beds: 18 },
        { cost: 140, label: 'ICU & Antivirals', beds: 26, admitInterval: 0.5, freshWindowMult: 1.6 }
      ]
    },
    barricade: {
      key: '5', name: 'Quarantine Barricade', glyph: 'barrier', color: '#F0E442', road: true,
      cost: 40, range: 0.6, hp: 220, slow: 0.3, trustDrain: 0.01, incomePenalty: 0.03,
      short: 'Placed on a road. Slows zombies and blocks travel. Hurts trust and business.',
      concept: 'Quarantine and movement restrictions: they slow spread, but every barrier has social and economic costs.',
      upgrades: [
        { cost: 40, label: 'Reinforced', hp: 450 }
      ]
    },
    radio: {
      key: '6', name: 'Radio Tower', glyph: 'waves', color: '#56B4E9',
      cost: 90, range: 8, trustGain: 0.03, panicDrop: 0.06, complianceBonus: 0.12, uptakeMult: 1.25,
      short: 'Clear, honest health messages. Raises trust and compliance, calms panic.',
      concept: 'Risk communication: people follow guidance they understand and trust.',
      upgrades: [
        { cost: 80, label: 'Multilingual Broadcasts', complianceBonus: 0.2, uptakeMult: 1.4, trustGain: 0.045 }
      ]
    },
    chw: {
      key: '7', name: 'Community Health Workers', glyph: 'heart', color: '#E69F00', mobile: true, road: true,
      cost: 80, range: 3.5, boost: 1.4, boostUnderserved: 1.9, speed: 1.3, doorVax: 0.35, doorReveal: 0.08,
      short: 'Mobile team from the neighborhood. Boosts nearby labs, clinics and hospitals, most in underserved areas.',
      concept: 'Community-based approaches and health equity: trusted local messengers reach people systems miss.',
      upgrades: [
        { cost: 70, label: 'Bigger Team', range: 4.5, boost: 1.6, boostUnderserved: 2.2, doorVax: 0.6 }
      ]
    },
    pantry: {
      key: '8', name: 'Mutual-Aid Pantry', glyph: 'basket', color: '#A0785A',
      cost: 70, range: 4, panicDrop: 0.05, complianceBonus: 0.15, tripCut: 0.3,
      short: 'Food and supplies so people can stay home. Cuts trips and panic.',
      concept: 'Social determinants of health: people can only isolate if they can afford to stay home.',
      upgrades: [
        { cost: 60, label: 'Delivery Bikes', range: 5.5, complianceBonus: 0.22, tripCut: 0.45 }
      ]
    }
  };
  D.TOWER_ORDER = ['militia', 'lab', 'clinic', 'hospital', 'barricade', 'radio', 'chw', 'pantry'];

  /* ---- ZOMBIE TYPES --------------------------------------------------- */
  D.ZOMBIES = {
    basic:   { name: 'Shambler', hp: 60,  speed: 0.75, life: 32, bites: 1, armor: 0,    stealth: false, size: 1 },
    runner:  { name: 'Sprinter', hp: 35,  speed: 1.6,  life: 26, bites: 1, armor: 0,    stealth: false, size: 0.9 },
    brute:   { name: 'Brute',    hp: 220, speed: 0.5,  life: 60, bites: 3, armor: 0.45, stealth: false, size: 1.35 },
    carrier: { name: 'Carrier',  hp: 50,  speed: 0.95, life: 75, bites: 1, armor: 0,    stealth: true,  size: 1 },
    // SUPER ZOMBIE: huge, armored, infects many people per attack (a "super-spreader").
    // Hospitals can't capture it; it smashes barricades. Vaccinated residents resist its bites.
    mega:    { name: 'Super-Spreader', hp: 600, speed: 0.42, life: 55, bites: 4, armor: 0.35, stealth: false, size: 2.2, boss: true, streetRange: 1.8, barricadeDps: 45 }
  };
  D.ZOMBIE_ORDER = ['basic', 'runner', 'brute', 'carrier', 'mega'];

  /* ---- WAVES -----------------------------------------------------------
     z: arriving zombies [shambler, sprinter, brute, carrier, super-spreader]
     imports: infected-but-healthy-looking travelers arriving from outside
     entries: how many road entrances zombies use
     night: [start, end] darkness 0..1 across the wave; weather: clear/fog/rain */
  D.WAVES = [
    { z: [4, 0, 0, 0, 0],  imports: 2, entries: 1, night: [0, 0.05],   weather: 'clear' },
    { z: [6, 2, 0, 0, 0],  imports: 3, entries: 2, night: [0.05, 0.25], weather: 'clear' },
    { z: [7, 3, 1, 1, 0],  imports: 3, entries: 2, night: [0.25, 0.75], weather: 'clear' },
    { z: [8, 4, 1, 2, 0],  imports: 4, entries: 2, night: [0.75, 0.95], weather: 'fog' },
    { z: [9, 5, 2, 2, 1],  imports: 4, entries: 3, night: [0.9, 0.2],  weather: 'clear' },
    { z: [10, 6, 2, 3, 1], imports: 5, entries: 3, night: [0.1, 0.15], weather: 'rain' },
    { z: [11, 7, 3, 3, 2], imports: 5, entries: 3, night: [0.15, 0.6], weather: 'clear' },
    { z: [12, 8, 3, 4, 2], imports: 6, entries: 3, night: [0.6, 1.0],  weather: 'fog' },
    { z: [14, 9, 4, 4, 3], imports: 6, entries: 4, night: [1.0, 0.55], weather: 'rain' }
  ];
  D.QUICK_WAVES = [0, 1, 3, 5, 7, 8]; // which of the above a Quick game uses
  D.WEATHER = {
    clear: { mobility: 1, militiaRange: 1 },
    fog:   { mobility: 1, militiaRange: 0.85 },
    rain:  { mobility: 0.85, militiaRange: 1 }
  };
})(typeof window !== 'undefined' ? window : globalThis);
