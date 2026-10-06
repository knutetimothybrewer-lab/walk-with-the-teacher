/* ==========================================================================
   dsl.js — helpers that make question files short and easy to edit.
   You never need to touch this file to edit questions. See content/README.md.
   ========================================================================== */

/** Normalise a wrong option: 'text' or ['text', 'misconception hint']. */
const wrongOpt = (w) => (typeof w === 'string' ? { t: w } : { t: w[0], hint: w[1] });

/**
 * Single choice.  mc('id', { prompt, right:'...', wrong:[ 'text' | ['text','hint'] ],
 *   hint, explain, level, topic, src, passage, visual, sensitive, keepOrder, points })
 */
export function mc(id, o) {
  const { right, wrong, options, ...rest } = o;
  return {
    type: 'mc', id, level: 'apply', ...rest,
    options: options || [{ t: right, ok: true }, ...wrong.map(wrongOpt)],
  };
}

/** Select all that apply. right:[...], wrong:[...]. An option may carry fx:[gas,brake] (Recovery Dial). */
export function multi(id, o) {
  const { right, wrong, options, ...rest } = o;
  const norm = (x, ok) => (typeof x === 'string' ? { t: x, ok } : { ...x, ok });
  return {
    type: 'multi', id, level: 'apply', ...rest,
    options: options || [...right.map(r => norm(r, true)), ...wrong.map(w => norm(w, false))],
  };
}

const slotsOf = (arr) => arr.map(([id, t, desc, extra]) => ({ id: String(id), t, desc, ...(extra || {}) }));

/** Sort cards into boxes. slots:[[id,label,desc?]], cards:[[text, slotId]] */
export function sort(id, o) {
  const { slots, cards, ...rest } = o;
  return {
    type: 'place', mode: 'sort', id, level: 'apply', ...rest,
    slots: slotsOf(slots),
    tokens: cards.map(([t, slot], i) => ({ id: `t${i}`, t, slot: String(slot) })),
  };
}

/** Match answers to targets. pairs:[[targetText, answerText]] */
export function match(id, o) {
  const { pairs, ...rest } = o;
  return {
    type: 'place', mode: 'match', id, level: 'apply', ...rest,
    slots: pairs.map(([l], i) => ({ id: `r${i}`, t: l })),
    tokens: pairs.map(([, r], i) => ({ id: `t${i}`, t: r, slot: `r${i}` })),
  };
}

/** Put steps in order. steps are listed in the CORRECT order. */
export function order(id, o) {
  const { steps, ...rest } = o;
  return {
    type: 'place', mode: 'order', id, level: 'recall', ...rest,
    slots: steps.map((_, i) => ({ id: String(i + 1), t: String(i + 1) })),
    tokens: steps.map((t, i) => ({ id: `t${i}`, t, slot: String(i + 1) })),
  };
}

/** Label each statement. slots:[[id,label,desc?,{short}]], rows:[[text, slotId]] (shown in authored order). */
export function tag(id, o) {
  const { slots, rows, ...rest } = o;
  return {
    type: 'place', mode: 'tag', id, level: 'apply', ...rest,
    slots: slotsOf(slots),
    tokens: rows.map(([t, slot], i) => ({ id: `t${i}`, t, slot: String(slot) })),
  };
}

/** A non-scored explorer card (animated visual + a sentence). */
export function explore(id, o) { return { type: 'explore', id, fixed: true, ...o }; }

/** A conversation scene: steps stay together, in order. Each step is an mc written with chat:{...}. */
export function scene(id, steps, extra = {}) { return { id, block: steps, ...extra }; }

/** One step of a chat scene (an mc whose options carry `react`: the friend's reply). */
export function chatStep(id, who, o) {
  return mc(id, { ...o, chat: { who: who.name, color: who.color, scene: who.scene, step: o.step } });
}
