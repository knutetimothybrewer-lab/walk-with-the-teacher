# content/ — edit questions, hints, and readings here

Every question lives in a station file (`s1.js` … `s10.js`). You do not need to touch the app code. After editing: `npm test`, then `npm run timing` and `npm run map` if you added or removed questions.

## One question (single choice)

```js
mc('s1-01', {                                   // a unique id (shown in CONTENT-MAP.md and the Sheet)
  level: 'recall',                              // recall | apply | analyze   (for the audit only)
  src: 'A · Mental Health 101 › Continuum',     // where in your lesson it comes from
  prompt: 'Which statement is accurate?',
  right: 'The correct answer.',                 // exactly one
  wrong: [
    ['A wrong answer', 'Hint shown when a student picks THIS wrong answer'],   // misconception-specific hint
    'Another wrong answer (uses the general hint)',
  ],
  hint: 'General hint shown after a wrong try. Never give away the answer.',
  explain: 'Why: shown after the answer (or after the third try).',
  // optional: topic: 'EH', passage: 'connect', visual: 'yrbs', sensitive: true, points: 2, fixed: true, keepOrder: true
}),
```

## The other types

| Function | Use | Shape |
|---|---|---|
| `multi(id, {right:[…], wrong:[…]})` | Select all that apply | partial credit = (right − wrong) ÷ right |
| `sort(id, {slots:[[id,label,desc]], cards:[[text, slotId]]})` | Drop each card in a box | credit by cards in the right box |
| `match(id, {pairs:[[target, answer]]})` | Match answers to targets | credit by matches |
| `order(id, {steps:[…]})` | Put steps in order (list them in the **correct** order; the app shuffles) | credit by steps in the right place |
| `tag(id, {slots:[…], rows:[[statement, slotId]]})` | Give each statement a label (statements stay in order) | credit by rows labeled right |
| `scene(id, [chatStep(...), …])` | A chat scene: steps stay together; options carry `react` (the friend's reply) | each step is scored like single choice |
| `explore(id, {title, text, visual})` | An unscored explorer card | |

**Multi-select with an effect** (Recovery Dial): give each option `fx: [gasChange, brakeChange]` and set `visual: 'gauges'`.

## Readings, topics, order
`index.js` holds the short readings (`passages`), the topic names used in the final "Worth another look" list, and the station order. A question uses a reading with `passage: 'connect'`.

## Rules for new questions (keep the safety promises)
* One defensible right answer. Wrong answers plausible but clearly wrong.
* **No free-text questions** and nothing that asks about students' own feelings or experiences. Use hypothetical characters.
* No diagnosing: use patterns and behaviors. Condition names only in vocabulary or "pattern clue" matching.
* No methods, means, or graphic detail about self-harm. Red-flag items are about *recognizing signs and getting an adult*.
* Mark scenarios that some students may find heavy with `sensitive: true` (shows a Skip button).
* Every statistic needs a named source and year in `sources.js` and `SOURCES.md`.

## Variants (anti-copying later)
The brief asked for **one version per item**, so no item has variants and the engine shuffles options and question order per student instead. The engine already supports alternates: add `variants: [{ prompt: "…", options: […] }]` to an item (each variant overrides any fields of the base item) and each student is deterministically assigned the base or one variant.
