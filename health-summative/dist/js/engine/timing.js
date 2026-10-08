/* timing.js — estimated seconds for a typical student. Used by the gentle pace
   hint in the app and by tools/timing.js to produce TIMING.md. Guidance only; the enforced limit is config.timeLimitMinutes. */

const WPS = 3.5; // typical 15-year-old, easy text on a screen: about 210 words per minute

const words = (s) => (s ? String(s).split(/\s+/).filter(Boolean).length : 0);

/** @param passages map id -> {text} */
export function estimateSeconds(item, passages = {}) {
  let w = words(item.prompt) + words(item.friendSays);
  let base = 0;
  if (item.type === 'mc') {
    w += item.options.reduce((s, o) => s + words(o.t), 0) * 0.8;
    base = 6;
  } else if (item.type === 'multi') {
    w += item.options.reduce((s, o) => s + words(o.t), 0) * 0.85;
    base = 12;
  } else if (item.type === 'place') {
    w += item.tokens.reduce((s, t) => s + words(t.t), 0) * 0.9;
    base = 8 + item.tokens.length * (item.mode === 'tag' ? 4 : 5);
  }
  if (item.chat) base -= 2;
  let secs = base + w / WPS;
  // Passages are shared by 2+ questions: read in full once, skimmed afterwards.
  if (item.passage && passages[item.passage]) secs += 0.6 * words(passages[item.passage].text) / WPS;
  if (item.visual) secs += item.visualSeconds ?? 5;
  secs += 4; // reading feedback / moving on
  secs *= 1.12; // retries and hints
  return Math.round(secs);
}

/** Seconds for station intro cards and unscored explorers. */
export const INTRO_SECONDS = 12;
