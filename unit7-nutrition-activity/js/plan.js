// Weekly activity-plan evaluation (teen recommendations). Pure functions, shared by the UI, tests and the build.
// Each activity block: [label, minutes, intensity('light'|'mod'|'vig'), tags (a=aerobic, m=muscle-strengthening, b=bone-strengthening)]
export const ACTIVITY_BLOCKS = {
  walk: ['Brisk walk', 30, 'mod', 'a'],
  stroll: ['Easy stroll (can sing)', 30, 'light', ''],
  yoga: ['Gentle stretching / yoga', 20, 'light', ''],
  bike: ['Steady bike ride', 30, 'mod', 'a'],
  dance: ['Dance class', 40, 'mod', 'a'],
  swim: ['Swim laps (hard effort)', 30, 'vig', 'a'],
  run: ['Run / jog intervals', 30, 'vig', 'ab'],
  rope: ['Jump rope', 20, 'vig', 'ab'],
  hoops: ['Basketball game', 30, 'vig', 'ab'],
  soccer: ['Soccer practice', 60, 'vig', 'ab'],
  bands: ['Resistance-band circuit', 20, 'mod', 'm'],
  body: ['Bodyweight circuit (push-ups, squats, planks)', 20, 'mod', 'm'],
  climb: ['Climbing wall', 30, 'mod', 'am']
};
export const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** days: array of 7 arrays of block keys (including fixed blocks). Returns {flags, detail}. */
export function evalPlan(days, blocks = ACTIVITY_BLOCKS) {
  let mvpaAll = true, vig = 0, mus = 0, bone = 0;
  const perDay = days.map((d) => {
    let mins = 0, v = false, m = false, b = false;
    for (const k of d) {
      const blk = blocks[k]; if (!blk) continue;
      if (blk[2] !== 'light') mins += blk[1];
      if (blk[2] === 'vig') v = true;
      if (blk[3].includes('m')) m = true;
      if (blk[3].includes('b')) b = true;
    }
    if (mins < 60) mvpaAll = false;
    if (v) vig++; if (m) mus++; if (b) bone++;
    return mins;
  });
  const f = [mvpaAll, vig >= 3, mus >= 3, bone >= 3];
  return { flags: `m${+f[0]}v${+f[1]}s${+f[2]}b${+f[3]}`, met: f.filter(Boolean).length, perDay, vigDays: vig, musDays: mus, boneDays: bone };
}
export const ALL_FLAGS = (() => { const out = []; for (let i = 0; i < 16; i++) out.push(`m${i & 1}v${(i >> 1) & 1}s${(i >> 2) & 1}b${(i >> 3) & 1}`); return out; })();
