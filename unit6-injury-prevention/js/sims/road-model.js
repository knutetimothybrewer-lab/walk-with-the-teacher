// Mission 5 model: how a phone choice changes reaction time and stopping distance, and how a ruler drop becomes a reaction time.
// Pure functions (no DOM) so the page and the tests share them.
//
// The numbers are an ILLUSTRATIVE teaching model: a baseline reaction time per mode, an added delay for each kind of distraction,
// and ordinary physics for the rest (distance = speed x time; braking distance = speed squared / (2 x deceleration)).
// Nothing here is quoted data. The scene never uses the formal names of the three kinds of distraction: it shows eyes, hands and mind.

export const FT_PER_S_PER_MPH = 1.4667;
export const G_FT = 32.17;
export const G_M = 9.81;

export const MODES = {
  drive: { id: 'drive', label: 'Driving', speeds: [25, 35, 45, 55], speed: 35, hazardFt: 150, base: 1.5, mu: 0.7, hazard: 'The car ahead slams on its brakes', who: 'the driver', unit: 'ft' },
  bike: { id: 'bike', label: 'Biking', speeds: [12], speed: 12, hazardFt: 45, base: 1.0, mu: 0.5, hazard: 'A parked car’s door swings open ahead', who: 'the rider', unit: 'ft' },
  walk: { id: 'walk', label: 'Walking', speeds: [3], speed: 3, hazardFt: 9, base: 0.9, mu: 0.4, hazard: 'A scooter rolls out from behind a bus stop', who: 'the walker', unit: 'ft' }
};

/** What a person does when the phone buzzes. `types` are the ways it pulls attention; `delay` is the extra reaction time it adds. */
export const CHOICES = {
  ignore: { id: 'ignore', label: 'Ignore it and keep your eyes up', types: [], delay: 0, text: 'You let it buzz and keep watching the road.' },
  glance: { id: 'glance', label: 'Take a quick look at the screen', types: ['eyes'], delay: 0.7, text: 'You glance down at the message for a moment.' },
  read: { id: 'read', label: 'Read the whole message', types: ['eyes', 'mind'], delay: 1.1, text: 'You read the message and start thinking about your answer.' },
  type: { id: 'type', label: 'Read it and type a reply', types: ['eyes', 'hands', 'mind'], delay: 1.9, text: 'You read the message and tap out a reply.' },
  voice: { id: 'voice', label: 'Dictate a reply out loud', types: ['mind'], delay: 0.6, text: 'You speak a reply. Your eyes and hands stay free, but your mind is on the message.' },
  stop: { id: 'stop', label: 'Wait until you have safely stopped, then reply', types: [], delay: 0, text: 'You wait. At the next safe stop you will answer.' }
};
export const DND = { id: 'dnd', label: 'Do Not Disturb', text: 'Do Not Disturb is on, so the phone stays quiet for the whole trip.' };

export function feetPerSecond(mph) { return mph * FT_PER_S_PER_MPH; }

/** Reaction time for a choice in a mode; `dnd` means there was no notification at all. */
export function reactionTime(modeId, choiceId) {
  const m = MODES[modeId];
  if (choiceId === 'dnd') return m.base;
  return m.base + CHOICES[choiceId].delay;
}

/** One trip. Returns the distances, whether the hazard was hit, and the speed at impact if it was. */
export function trip(modeId, mph, choiceId) {
  const m = MODES[modeId];
  const v = feetPerSecond(mph), a = m.mu * G_FT;
  const t = reactionTime(modeId, choiceId);
  const react = v * t, brake = (v * v) / (2 * a);
  const total = react + brake;
  const hit = total > m.hazardFt;
  let impact = 0;
  if (hit) impact = Math.sqrt(Math.max(0, v * v - 2 * a * Math.max(0, m.hazardFt - react))) / FT_PER_S_PER_MPH;
  const types = choiceId === 'dnd' ? [] : CHOICES[choiceId].types;
  return { mode: modeId, mph, choice: choiceId, reactionTime: t, reactFt: react, brakeFt: brake, totalFt: total, hazardFt: m.hazardFt, margin: m.hazardFt - total, hit, impactMph: impact, types, brakeSeconds: v / a };
}

/** Position of the vehicle (feet from the start) at time s after the hazard appears, and whether it has stopped or hit. */
export function positionAt(tr, s) {
  const m = MODES[tr.mode], v = feetPerSecond(tr.mph), a = m.mu * G_FT;
  let x;
  if (s <= tr.reactionTime) x = v * s;
  else { const b = Math.min(s - tr.reactionTime, v / a); x = v * tr.reactionTime + v * b - 0.5 * a * b * b; }
  const wall = tr.hazardFt;
  const hitNow = tr.hit && x >= wall;
  return { x: hitNow ? wall : x, hit: hitNow, braking: s > tr.reactionTime, stopped: !hitNow && s >= tr.reactionTime + v / a };
}

/** The ruler drop. Distance fallen (cm) after t seconds, and reaction time (s) from a caught distance (cm). */
export function fallCm(t) { return 0.5 * G_M * t * t * 100; }
export function reactionFromCm(cm) { return Math.sqrt(2 * (cm / 100) / G_M); }
export const RULER_CM = 30;

/** A plain-language line for the log. */
export function describe(tr) {
  const c = tr.choice === 'dnd' ? DND.label : CHOICES[tr.choice].label;
  return c + ': reaction ' + tr.reactionTime.toFixed(1) + ' s, total stopping ' + Math.round(tr.totalFt) + ' ft of ' + tr.hazardFt + ' ft, ' + (tr.hit ? 'hit at about ' + Math.round(tr.impactMph) + ' mph' : 'stopped ' + Math.round(tr.margin) + ' ft short');
}
