/*
 * data/players.js — fictional players for every team.
 *
 * Each player line is:  [ 'Name', 'Position', jerseyNumber, 'archetype', quality ]
 *
 *   Position  : G (guard), F (forward), C (center)
 *   archetype : the player's STYLE. It sets a starting point for every rating:
 *                 scorer    – high-usage shot creator
 *                 playmaker – passer, sets up teammates
 *                 wing      – three-point shooter and defender
 *                 forward   – all-around player
 *                 stretch   – big man who shoots threes
 *                 big       – rim protector and rebounder
 *   quality   : overall skill, about 55 (bench) to 92 (superstar). Higher = better at everything.
 *
 * The FIRST FIVE players on each team are the starters; the last three come off the bench.
 * You can edit names, numbers and quality freely. Keep exactly 8 players per team.
 * Statistics created from these ratings influence the simulation but NEVER guarantee a result.
 */
(function (root) {
  'use strict';
  var PL = root.PL = root.PL || {};
  PL.Data = PL.Data || {};

  PL.Data.ROSTERS = {
    HCW: [
      ['Jordan Ellis',   'G', 3,  'scorer',    88],
      ['Devin Brooks',   'G', 11, 'playmaker', 79],
      ['Cole Whitaker',  'F', 24, 'wing',      74],
      ['Marcus Reed',    'F', 32, 'forward',   80],
      ['Omar Haddad',    'C', 44, 'big',       77],
      ['Nico Alvarez',   'G', 8,  'wing',      66],
      ['Theo Lindgren',  'F', 15, 'stretch',   64],
      ['Bram Okonkwo',   'C', 51, 'big',       60]
    ],
    MTF: [
      ['Tyler Morgan',   'G', 7,  'wing',      82],
      ['Kai Donovan',    'G', 1,  'playmaker', 78],
      ['Rashad Pierce',  'F', 22, 'scorer',    81],
      ['Lucas Fenwick',  'F', 34, 'forward',   72],
      ['Dmitri Sokol',   'C', 40, 'big',       75],
      ['Andre Castillo', 'G', 12, 'scorer',    65],
      ['Ewan Prescott',  'F', 18, 'stretch',   63],
      ['Hector Banda',   'C', 55, 'big',       58]
    ],
    IWB: [
      ['Gabe Thornton',  'G', 5,  'playmaker', 74],
      ['Silas Kowalski', 'G', 14, 'wing',      70],
      ['Brandon Achebe', 'F', 21, 'scorer',    79],
      ['Wyatt Hollis',   'F', 33, 'forward',   71],
      ['Leon Marchetti', 'C', 45, 'big',       80],
      ['Jonah Pruitt',   'G', 9,  'scorer',    63],
      ['Felix Doyle',    'F', 27, 'forward',   62],
      ['Arlo Svensson',  'C', 52, 'stretch',   59]
    ],
    SMS: [
      ['Calvin Rhodes',  'G', 2,  'scorer',    84],
      ['Ibrahim Soto',   'G', 10, 'playmaker', 72],
      ['Declan Mercer',  'F', 23, 'wing',      73],
      ['Everett Nash',   'F', 30, 'stretch',   74],
      ['Viktor Lund',    'C', 42, 'big',       71],
      ['Pablo Ferreira', 'G', 6,  'playmaker', 64],
      ['Quincy Abbott',  'F', 19, 'wing',      62],
      ['Rowan Teague',   'C', 50, 'big',       57]
    ],
    RWR: [
      ['Mateo Valdez',   'G', 4,  'playmaker', 77],
      ['Jaylen Frost',   'G', 13, 'scorer',    80],
      ['Anders Holm',    'F', 25, 'wing',      70],
      ['Terrence Boyd',  'F', 31, 'forward',   75],
      ['Samir Qureshi',  'C', 43, 'big',       73],
      ['Chase Winslow',  'G', 20, 'wing',      64],
      ['Dominic Reyes',  'F', 16, 'forward',   63],
      ['Kofi Mensah',    'C', 54, 'big',       58]
    ],
    CPK: [
      ['Julian Ashford', 'G', 0,  'scorer',    86],
      ['Reggie Tran',    'G', 17, 'playmaker', 76],
      ['Nolan Pascal',   'F', 26, 'wing',      72],
      ['Oscar Delgado',  'F', 35, 'forward',   74],
      ['Magnus Eriksen', 'C', 41, 'stretch',   73],
      ['Tobias Wren',    'G', 3,  'wing',      65],
      ['Idris Bellamy',  'F', 28, 'forward',   63],
      ['Cyrus Yamada',   'C', 53, 'big',       59]
    ],
    LKL: [
      ['Xavier Lockhart','G', 6,  'playmaker', 81],
      ['Dante Whitmore', 'G', 15, 'scorer',    77],
      ['Emil Navarro',   'F', 29, 'wing',      69],
      ['Percy Anselm',   'F', 36, 'forward',   70],
      ['Gideon Boateng', 'C', 46, 'big',       72],
      ['Landon Pike',    'G', 11, 'scorer',    66],
      ['Soren Calloway', 'F', 20, 'stretch',   62],
      ['Tariq Hendry',   'C', 56, 'big',       57]
    ],
    VLF: [
      ['Roman Delacroix','G', 9,  'scorer',    75],
      ['Misha Petrov',   'G', 21, 'playmaker', 68],
      ['Jasper Quill',   'F', 32, 'wing',      66],
      ['Ellis Granger',  'F', 37, 'forward',   69],
      ['Bruno Castellan','C', 47, 'big',       70],
      ['Zane Whitlock',  'G', 14, 'wing',      60],
      ['Otis Brennan',   'F', 25, 'forward',   59],
      ['Harlan Deveraux','C', 58, 'big',       56]
    ]
  };

  // Starting ratings per archetype (0–100) plus how many rating points each quality point is worth.
  var ARCH = {
    scorer:    { usage: 1.35, finishing: 72, three: 74, ft: 80, reb: 42, play: 60, def: 52, stamina: 78, threeRate: 0.36 },
    playmaker: { usage: 1.00, finishing: 62, three: 68, ft: 78, reb: 38, play: 86, def: 58, stamina: 80, threeRate: 0.34 },
    wing:      { usage: 0.85, finishing: 62, three: 72, ft: 74, reb: 52, play: 52, def: 72, stamina: 76, threeRate: 0.48 },
    forward:   { usage: 1.00, finishing: 70, three: 58, ft: 70, reb: 66, play: 60, def: 64, stamina: 74, threeRate: 0.24 },
    stretch:   { usage: 0.85, finishing: 64, three: 70, ft: 72, reb: 62, play: 42, def: 56, stamina: 72, threeRate: 0.42 },
    big:       { usage: 0.90, finishing: 78, three: 26, ft: 58, reb: 86, play: 40, def: 78, stamina: 70, threeRate: 0.03 }
  };
  var PER_QUALITY = { finishing: 0.9, three: 0.9, ft: 0.6, reb: 0.9, play: 0.9, def: 0.9, stamina: 0.3 };

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  /** Turn the compact roster lines into full player objects with ratings. */
  PL.Data.buildRoster = function (teamId) {
    var lines = PL.Data.ROSTERS[teamId];
    return lines.map(function (ln, i) {
      var a = ARCH[ln[3]], q = ln[4], d = q - 75, r = {};
      Object.keys(PER_QUALITY).forEach(function (k) { r[k] = Math.round(clamp(a[k] + d * PER_QUALITY[k], 22, 97)); });
      r.usage = clamp(a.usage + d * 0.012, 0.55, 1.9);
      r.threeRate = a.threeRate;
      return {
        id: teamId + '-' + ln[2],
        name: ln[0],
        pos: ln[1],
        num: ln[2],
        arch: ln[3],
        quality: q,
        starter: i < 5,
        rating: r
      };
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
