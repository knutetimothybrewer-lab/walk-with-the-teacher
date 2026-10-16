// Mission 2 model: how a press-and-hold becomes a compression, and what the live meters read.
// Pure functions (no DOM) so the page and the tests share them.
//
// A "compression" is one press-and-hold of the chest pad. The length of the hold stands in for how deep the push went, and the gap
// before the next press stands in for whether the chest was allowed to come all the way back up (recoil). This is a teaching model:
// it gives the same feel as a real manikin feedback device without needing a force sensor.

export const MODES = {
  adult: {
    id: 'adult', label: 'Adult collapse', who: 'a teen or adult who collapsed suddenly', breaths: false,
    depthPerMs: 0.0085, depthBand: [2.0, 2.4], rateBand: [100, 120], technique: 'Heel of one hand on the center of the chest, other hand on top, arms straight.'
  },
  drowning: {
    id: 'drowning', label: 'Drowning victim', who: 'a swimmer pulled from the water, not breathing', breaths: true,
    depthPerMs: 0.0085, depthBand: [2.0, 2.4], rateBand: [100, 120], technique: 'Same hand position as an adult, with rescue breaths added.'
  },
  infant: {
    id: 'infant', label: 'Infant', who: 'a baby who is not responding', breaths: true,
    depthPerMs: 0.0058, depthBand: [1.4, 1.6], rateBand: [100, 120], technique: 'Two fingers just below the line between the nipples; gentle, about one third of the chest depth.'
  }
};

export const RECOIL_MIN_GAP_MS = 120;   // a press that starts sooner than this after the last release is leaning on the chest
export const PAUSE_MS = 2000;           // a gap this long between compressions counts as a pause
export const MAX_DEPTH_IN = 3.6;

export function depthFromHold(holdMs, mode) {
  const m = MODES[mode] || MODES.adult;
  return Math.min(MAX_DEPTH_IN, Math.max(0, holdMs * m.depthPerMs));
}

/**
 * events: [{ t0, t1 }] press start and release times in ms, oldest first.
 * Returns what the meters show right now.
 */
export function analyze(events, mode) {
  const m = MODES[mode] || MODES.adult;
  const n = events.length;
  const out = { count: n, rate: null, depth: null, recoil: null, pause: false, depthState: null, rateState: null, recoilState: null, pauses: 0, fraction: null };
  if (!n) return out;
  const last = events[n - 1];
  out.depth = depthFromHold(last.t1 - last.t0, mode);
  out.depthState = out.depth < m.depthBand[0] ? 'shallow' : out.depth > m.depthBand[1] ? 'deep' : 'good';
  if (n >= 2) {
    const prev = events[n - 2];
    const gap = last.t0 - prev.t1;
    out.recoil = gap >= RECOIL_MIN_GAP_MS ? 'full' : 'leaning';
    out.recoilState = out.recoil;
    const k = Math.min(n, 8);
    const first = events[n - k];
    const span = last.t0 - first.t0;
    if (k >= 3 && span > 0) {
      out.rate = 60000 / (span / (k - 1));
      out.rateState = out.rate < m.rateBand[0] ? 'slow' : out.rate > m.rateBand[1] ? 'fast' : 'good';
    }
  }
  for (let i = 1; i < n; i++) if (events[i].t0 - events[i - 1].t1 > PAUSE_MS) out.pauses++;
  if (n >= 2) {
    const total = last.t1 - events[0].t0;
    let on = 0; events.forEach((e) => { on += e.t1 - e.t0; });
    out.fraction = total > 0 ? on / total : null;
  }
  return out;
}

/** Idle time since the last release, for the "pause" warning. */
export function pausedFor(events, now) {
  if (!events.length) return 0;
  return now - events[events.length - 1].t1;
}

/** Chest-contact check for the placement inset. Positions are fractions of the torso picture: x from the left, y from the neck down. */
export const CHEST = { cx: 0.5, lowerHalf: [0.47, 0.64], width: 0.07, infantLine: 0.40 };
export function placementFeedback(x, y, mode) {
  if (mode === 'infant') {
    if (Math.abs(x - CHEST.cx) > CHEST.width) return { ok: false, text: 'Off the middle of the chest. Move your fingers toward the center line.' };
    if (y < CHEST.infantLine + 0.02) return { ok: false, text: 'Too high: on or above the line between the nipples. Move your fingers just below it.' };
    if (y > 0.62) return { ok: false, text: 'Too low, near the soft part of the belly. Move up to just below the nipple line.' };
    return { ok: true, text: 'Two fingers on the lower half of the breastbone, just below the nipple line.' };
  }
  if (Math.abs(x - CHEST.cx) > CHEST.width) return { ok: false, text: 'Off to the side. Move your hands onto the center line of the chest.' };
  if (y < CHEST.lowerHalf[0]) return { ok: false, text: 'Too high on the chest. Slide down to the lower half of the breastbone.' };
  if (y > CHEST.lowerHalf[1]) return { ok: false, text: 'Too low, near the bottom of the ribs. Slide up onto the lower half of the breastbone.' };
  return { ok: true, text: 'Heel of the hand on the lower half of the breastbone, in the center of the chest.' };
}

/** What a scene still needs before its progress chip is checked. Returns a list of plain-language leftovers (empty = done). */
export function sceneNeeds(mode, s) {
  const need = [];
  if (!s.responseChecked) need.push('check for a response');
  if (!s.breathingChecked) need.push('check for breathing');
  if (!s.called) need.push('call 911');
  const m = MODES[mode];
  if (m.breaths && !s.airwayOpened) need.push('open the airway');
  if (!s.placed) need.push('find the right hand position');
  if (s.compressions < 30) need.push('give 30 compressions (' + s.compressions + ' so far)');
  if (m.breaths && s.breaths < 2) need.push('give 2 rescue breaths');
  return need;
}
