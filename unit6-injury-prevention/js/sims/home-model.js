// Mission 4 model: the practice house, the escape-plan checks, the two fire runs and the first-aid bench cases.
// Pure data and functions (no DOM) so the page and the tests share them.
// Content follows the Day 4 slides: alarms in every bedroom and outside sleeping areas, two ways out of every room, a meeting spot outside,
// get low and go low, close doors, never go back in, stop-drop-roll, fight only a small fire with a clear exit, and the cut and burn steps.

export const W = 780, H = 520;

export const ROOMS = [
  { id: 'br1', name: 'Bedroom 1', x: 60, y: 60, w: 200, h: 160, sleeping: true },
  { id: 'br2', name: 'Bedroom 2', x: 260, y: 60, w: 200, h: 160, sleeping: true },
  { id: 'bath', name: 'Bathroom', x: 460, y: 60, w: 120, h: 160 },
  { id: 'study', name: 'Study', x: 580, y: 60, w: 140, h: 160 },
  { id: 'hall', name: 'Hall', x: 60, y: 220, w: 660, h: 60 },
  { id: 'kitchen', name: 'Kitchen', x: 60, y: 280, w: 240, h: 120 },
  { id: 'living', name: 'Living room', x: 300, y: 280, w: 420, h: 120 }
];
export const roomById = Object.fromEntries(ROOMS.map((r) => [r.id, r]));
export function roomAt(x, y) { return ROOMS.find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) || null; }

/** Doors and windows. `out` is true when the exit leads straight outside (a window or an outside door). */
export const EXITS = [
  { id: 'br1-door', room: 'br1', kind: 'door', label: 'Bedroom 1 door to the hall', x: 160, y: 220, o: 'h', out: false },
  { id: 'br1-window', room: 'br1', kind: 'window', label: 'Bedroom 1 window', x: 60, y: 140, o: 'v', out: true },
  { id: 'br2-door', room: 'br2', kind: 'door', label: 'Bedroom 2 door to the hall', x: 360, y: 220, o: 'h', out: false },
  { id: 'br2-bathdoor', room: 'br2', kind: 'door', label: 'Bedroom 2 door to the bathroom', x: 460, y: 140, o: 'v', out: false },
  { id: 'br2-window', room: 'br2', kind: 'window', label: 'Bedroom 2 window', x: 360, y: 60, o: 'h', out: true },
  { id: 'study-door', room: 'study', kind: 'door', label: 'Study door to the hall', x: 650, y: 220, o: 'h', out: false },
  { id: 'study-window', room: 'study', kind: 'window', label: 'Study window', x: 650, y: 60, o: 'h', out: true },
  { id: 'kitchen-back', room: 'kitchen', kind: 'door', label: 'Kitchen back door', x: 60, y: 340, o: 'v', out: true },
  { id: 'living-front', room: 'living', kind: 'door', label: 'Front door', x: 500, y: 400, o: 'h', out: true },
  { id: 'living-window', room: 'living', kind: 'window', label: 'Living room window', x: 360, y: 400, o: 'h', out: true }
];
export const exitById = Object.fromEntries(EXITS.map((e) => [e.id, e]));
export const exitsOf = (roomId) => EXITS.filter((e) => e.room === roomId);

export const SPOTS = [
  { id: 'steps', label: 'The front steps', x: 500, y: 438, good: false, why: 'Too close to the house. Smoke and heat can still reach people standing right at the door.' },
  { id: 'mailbox', label: 'The mailbox at the curb', x: 130, y: 478, good: true, why: 'A fixed place, well away from the house, that everyone can find.' },
  { id: 'tree', label: 'The neighbor’s big tree across the street', x: 650, y: 482, good: true, why: 'A fixed place, a safe distance away, that is easy to see.' },
  { id: 'car', label: 'The family car in the driveway', x: 300, y: 450, good: false, why: 'A car can be moved and it sits close to the house. Pick a fixed place farther away.' }
];
export const spotById = Object.fromEntries(SPOTS.map((s) => [s.id, s]));

/* ---------------------------------------------------------------------------------------------- plan checks */
export function newPlan() { return { alarms: [], routes: { br1: [], br2: [] }, meet: null }; }

export function checkPlan(plan) {
  const items = [];
  const alarmIn = (id) => plan.alarms.some((a) => { const r = roomAt(a.x, a.y); return r && r.id === id; });
  ROOMS.filter((r) => r.sleeping).forEach((r) => items.push({ id: 'alarm-' + r.id, ok: alarmIn(r.id), label: 'A smoke alarm in ' + r.name, detail: alarmIn(r.id) ? 'Done.' : 'No alarm in this bedroom yet.' }));
  items.push({ id: 'alarm-hall', ok: alarmIn('hall'), label: 'A smoke alarm in the hall outside the bedrooms', detail: alarmIn('hall') ? 'Done.' : 'Nothing is covering the area just outside the sleeping rooms.' });
  ['br1', 'br2'].forEach((id) => {
    const marked = (plan.routes[id] || []).map((x) => exitById[x]).filter(Boolean);
    const outside = marked.some((e) => e.out);
    const ok = marked.length >= 2 && outside;
    let detail = 'Done.';
    if (marked.length < 2) detail = marked.length + ' of 2 ways out marked.';
    else if (!outside) detail = 'Both routes lead into the house. One should go straight outside, such as a window.';
    items.push({ id: 'exits-' + id, ok, label: 'Two ways out of ' + roomById[id].name, detail });
  });
  const spot = plan.meet ? spotById[plan.meet] : null;
  items.push({ id: 'meet', ok: !!(spot && spot.good), label: 'One outside meeting spot', detail: spot ? spot.why : 'No meeting spot chosen yet.' });
  return { ok: items.every((i) => i.ok), items };
}

/* ---------------------------------------------------------------------------------------------- fire runs */
export const ROOM_HEIGHT = 2.4;
export const HEAD = { sleep: 0.55, stand: 1.65, crouch: 1.0, crawl: 0.4, window: 1.3, roll: 0.3, out: 1.6 };
export const LIMIT_SECONDS = 120;       // the slides: about 1 to 2 minutes may be all the time you have once the alarm sounds

/** Depth of the smoke layer hanging from the ceiling, in metres, after `t` seconds (plus any boost from an opened door). */
export function smokeLayer(t, boost) { return Math.min(2.2, 0.25 + 0.03 * t + (boost || 0)); }

/** Smoke exposure gained while spending `dt` seconds at head height `head` starting at time `t` (0 to 100 scale). */
export function exposureGain(t, dt, head, boost) {
  let g = 0;
  for (let s = 0; s < dt; s++) { const bottom = ROOM_HEIGHT - smokeLayer(t + s, boost); g += Math.max(0, head - bottom) * 8; }
  return g;
}

export const SCENARIOS = {
  night: {
    id: 'night', title: 'Night fire at home', room: 'br2', origin: 'kitchen', startPose: 'sleep',
    intro: 'It is the middle of the night and you are asleep in Bedroom 2. A smoke alarm is screaming.',
    start: 's0',
    steps: {
      s0: { text: 'The alarm is loud. You can smell smoke, and a gray haze is creeping in under your door.', choices: [
        { id: 'low', label: 'Get low and crawl toward the door', dt: 4, pose: 'crawl', next: 's1', note: 'Smoke rises, so the clearest air is near the floor.' },
        { id: 'phone', label: 'Stand up and grab your phone and shoes first', dt: 25, pose: 'stand', next: 's1', note: 'That took 25 seconds, and you were standing where the smoke was gathering.' },
        { id: 'open', label: 'Stand and open the door wide to see what is happening', dt: 4, pose: 'stand', next: 's1', boost: 0.5, note: 'Opening the door let a rush of smoke and heat into the room.' },
        { id: 'wait', label: 'Pull the covers up and wait for someone to come', dt: 30, pose: 'sleep', next: 'fail', note: 'Waiting wastes the few minutes you have. Smoke filled the room before anyone arrived.' }
      ] },
      s1: { text: 'At the door you can see flames in the hall. Your way out through the hall is blocked.', choices: [
        { id: 'window', label: 'Use your second way out: the window', dt: 12, pose: 'window', next: 's2', requires: 'br2-window', note: 'This is why every room needs two ways out.' },
        { id: 'dash', label: 'Run through the hall to the front door', dt: 6, pose: 'stand', next: 'fail', note: 'Running through flames is far more dangerous than leaving a different way.' },
        { id: 'stay', label: 'Shut yourself in the closet and hope the fire goes out', dt: 20, pose: 'crouch', next: 'fail', note: 'Hiding keeps you in the fire’s path and rescuers may not find you.' }
      ] },
      s2: { text: 'You are at the open window with one foot out. The bedroom door is still open behind you.', choices: [
        { id: 'close', label: 'Close the bedroom door behind you, then climb out', dt: 5, pose: 'window', next: 's3', closed: true, note: 'A closed door slows the spread of fire and smoke.' },
        { id: 'leave', label: 'Climb out right away and leave the door open', dt: 0, pose: 'window', next: 's3', boost: 0.3, note: 'The door stayed open, so the fire reached the room sooner.' }
      ] },
      s3: { text: 'You are safe outside, but your little dog is still inside the house.', choices: [
        { id: 'meet', label: 'Go to your meeting spot and call 911', dt: 10, pose: 'out', next: 'end:safe', needsMeet: true, note: 'Everyone gathers at the same place and a grown-up or the fire department takes it from here.' },
        { id: 'back', label: 'Go back in through the window to get the dog', dt: 6, pose: 'crawl', next: 'fail', note: 'Never go back in. Not for pets, not for things.' }
      ] }
    }
  },
  kitchen: {
    id: 'kitchen', title: 'Small fire in the kitchen', room: 'kitchen', origin: 'kitchen', startPose: 'stand',
    intro: 'You are making dinner. Cooking oil in a frying pan catches fire. It is small and stays in the pan. A fire extinguisher hangs by the back door, and the door is right behind you.',
    start: 'k0',
    steps: {
      k0: { text: 'Flames are leaping above the pan. The fire is small and contained, and your way out is clear.', choices: [
        { id: 'fight', label: 'Take the extinguisher and stand with your back to the door', dt: 6, pose: 'stand', next: 'k1', note: 'A small, contained fire with a clear exit behind you is the only kind to fight.' },
        { id: 'water', label: 'Throw a cup of water on the pan', dt: 3, pose: 'stand', next: 'fail', note: 'Water on a grease fire makes it flare up.' },
        { id: 'leave', label: 'Leave at once, close the kitchen door and call 911 from outside', dt: 8, pose: 'out', next: 'end:safe', note: 'Leaving and calling for help is always a good choice. Run this again if you want to practice the extinguisher.' }
      ] },
      k1: { text: 'Three extinguishers hang on the wall. Each has a letter on its label. Which one do you pull?', pickClass: true, choices: [
        { id: 'A', label: 'The extinguisher marked A', dt: 4, pose: 'stand', note: 'You spray, but the flames in the pan do not go out. This extinguisher was not made for this kind of fire.' },
        { id: 'B', label: 'The extinguisher marked B', dt: 5, pose: 'stand', next: 'k2', note: 'The flames die down and go out. The extinguisher matched the fire.' },
        { id: 'C', label: 'The extinguisher marked C', dt: 4, pose: 'stand', note: 'You spray, but the flames in the pan do not go out. This extinguisher was not made for this kind of fire.' }
      ] },
      k2: { text: 'The fire is out, but as you step back a spark has landed on your sleeve and it is smoldering.', choices: [
        { id: 'sdr', label: 'Stop, drop and roll', dt: 6, pose: 'roll', next: 'k3', note: 'Rolling smothers the flames on your clothes.' },
        { id: 'run', label: 'Run to the sink and splash water on your sleeve', dt: 5, pose: 'stand', next: 'fail', note: 'Running feeds the flames. If your clothes catch fire, stop, drop and roll.' },
        { id: 'wave', label: 'Wave your arm to put it out', dt: 4, pose: 'stand', next: 'fail', note: 'Waving gives the flames more air.' }
      ] },
      k3: { text: 'You are not hurt and the pan is out. What now?', choices: [
        { id: 'report', label: 'Make sure everyone is out of the kitchen, tell an adult and call for help', dt: 10, pose: 'out', next: 'end:safe', note: 'Even a fire that is out should be reported, and the pan checked by an adult.' },
        { id: 'check', label: 'Lean over the pan to check that it is really out', dt: 4, pose: 'stand', next: 'fail', note: 'A pan that looks out can flare up again. Let an adult handle it.' }
      ] }
    }
  }
};

/** Start state for a run. */
export function startRun(id) {
  const s = SCENARIOS[id];
  return { id, step: s.start, t: 0, exposure: 0, boost: 0, pose: s.startPose, notes: [], wrong: 0, outcome: null, closed: false, usedWindow: false };
}
/** Is a choice available given the plan? Returns { ok, why }. */
export function choiceAvailable(choice, plan) {
  if (choice.requires && !((plan.routes.br2 || []).includes(choice.requires))) return { ok: false, why: 'Not on your plan. Go back to the plan tab and mark a second way out of Bedroom 2.' };
  if (choice.needsMeet && !(plan.meet && spotById[plan.meet] && spotById[plan.meet].good)) return { ok: false, why: 'Your plan has no good meeting spot yet. Choose one on the plan tab.' };
  return { ok: true };
}
/** Apply a choice. Returns a new state (does not mutate). */
export function applyChoice(state, choiceId, plan) {
  const scn = SCENARIOS[state.id], step = scn.steps[state.step];
  const choice = step.choices.find((c) => c.id === choiceId);
  if (!choice || state.outcome) return state;
  const av = choiceAvailable(choice, plan);
  if (!av.ok) return state;
  const st = Object.assign({}, state, { notes: state.notes.slice() });
  const head = HEAD[choice.pose] != null ? HEAD[choice.pose] : HEAD.stand;
  st.boost = state.boost + (choice.boost || 0);
  st.exposure = Math.min(100, state.exposure + exposureGain(state.t, choice.dt, state.id === 'night' ? head : Math.min(head, 0.9), st.boost));
  st.t = state.t + choice.dt; st.pose = choice.pose;
  st.notes.push({ step: state.step, choice: choice.id, label: choice.label, note: choice.note });
  if (choice.closed) st.closed = true;
  if (step.pickClass && !choice.next) { st.wrong = state.wrong + 1; return st; }       // wrong extinguisher: stay on this step
  if (choice.next === 'fail') st.outcome = 'fail';
  else if (choice.next === 'end:safe') st.outcome = 'safe';
  else st.step = choice.next;
  if (!st.outcome && st.exposure >= 100) { st.outcome = 'fail'; st.notes.push({ step: st.step, choice: 'smoke', label: 'Smoke overcame you', note: 'Too much smoke. Staying low and moving fast matters.' }); }
  if (!st.outcome && st.t > LIMIT_SECONDS) { st.outcome = 'fail'; st.notes.push({ step: st.step, choice: 'time', label: 'Out of time', note: 'It took too long. You may have only 1 to 2 minutes.' }); }
  return st;
}

/* ---------------------------------------------------------------------------------------------- first-aid bench */
export const BENCH = {
  scrape: {
    id: 'scrape', title: 'A scraped knee', who: 'You fell off a bike and scraped your knee. It is oozing but the scrape is small.',
    kind: 'steps',
    items: [
      { id: 'wash', label: 'Wash your hands with soap', order: 1, good: 'Hands first, so you do not add germs to the wound.' },
      { id: 'press', label: 'Press a clean cloth on the scrape', order: 2, good: 'Pressing stops the bleeding.' },
      { id: 'rinse', label: 'Rinse the scrape under running water', order: 3, good: 'Running water rinses dirt out.' },
      { id: 'cover', label: 'Put on ointment and a bandage', order: 4, good: 'Ointment and a bandage keep it clean.' },
      { id: 'ice', label: 'Rub it with an ice cube', bad: 'Ice does not clean or protect a scrape.' },
      { id: 'blow', label: 'Blow on it and leave it uncovered', bad: 'An open scrape can get dirty and infected.' },
      { id: 'scrub', label: 'Scrub it hard with a dry towel', bad: 'Scrubbing makes the wound worse.' }
    ],
    done: 'Scrape treated. You could treat this one yourself.'
  },
  burn: {
    id: 'burn', title: 'A burn from a hot pan', who: 'You touched a hot pan and have a red burn on your forearm, smaller than your palm. A small blister is starting.',
    kind: 'steps',
    items: [
      { id: 'cool', label: 'Cool it under running water for 10 to 20 minutes', order: 1, good: 'Cooling stops the burning and eases the pain.' },
      { id: 'cover', label: 'Cover it loosely with a clean, non-stick covering', order: 2, good: 'A loose covering protects the skin.' },
      { id: 'blister', label: 'Leave the blister alone', order: 3, good: 'An unbroken blister is a natural bandage.' },
      { id: 'ice', label: 'Put ice on it', bad: 'Never use ice, butter or toothpaste on a burn. Ice can damage the skin.' },
      { id: 'butter', label: 'Spread butter on it', bad: 'Never use ice, butter or toothpaste on a burn. Butter traps heat.' },
      { id: 'tooth', label: 'Dab toothpaste on it', bad: 'Never use ice, butter or toothpaste on a burn.' },
      { id: 'sticky', label: 'Wrap it tightly with a sticky bandage', bad: 'Skip sticky bandages. They can tear the skin when removed.' },
      { id: 'pop', label: 'Pop the blister', bad: 'Do not pop a blister. It protects the skin underneath.' }
    ],
    done: 'Burn treated. A small burn like this one you can treat yourself.'
  },
  infected: {
    id: 'infected', title: 'A cut that looks wrong', who: 'A cut on a friend’s foot from last week has not healed. The skin around it is red, swollen and warm, and it is oozing.',
    kind: 'decide', answer: 'help',
    why: 'Signs of infection mean the person should see a professional. Call urgent care or a doctor.', wrongWhy: 'These are signs of infection. This is not something to treat alone.'
  },
  outlet: {
    id: 'outlet', title: 'A shock from a cord', who: 'Someone touched a frayed charger cord and has a burn on a fingertip. They say they are fine.',
    kind: 'decide', answer: 'help',
    why: 'Burns from electricity need professional care, even if they look small. Call 911 or get urgent medical help.', wrongWhy: 'Electrical burns can hurt more deeply than they look. Get help.'
  }
};
/** Evaluate a click on a bench item. Returns { ok, text, advance }. */
export function benchPick(caseId, doneIds, itemId) {
  const c = BENCH[caseId], item = c.items.find((i) => i.id === itemId);
  if (!item) return { ok: false, text: '', advance: false };
  if (item.bad) return { ok: false, text: item.bad, advance: false };
  const next = c.items.filter((i) => i.order).find((i) => !doneIds.includes(i.id));
  if (next && next.id === itemId) return { ok: true, text: item.good, advance: true };
  return { ok: false, text: 'That is part of the treatment, but it is not the next step. Think about what has to come first.', advance: false };
}
export function benchDecide(caseId, choice) {
  const c = BENCH[caseId];
  return choice === c.answer ? { ok: true, text: c.why } : { ok: false, text: c.wrongWhy };
}
