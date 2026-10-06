/* Mission 5 — STOP Crossroads (14 points)
 *  Situation A (6 pts) + Situation B (6 pts) + structured justification (2 pts)
 *  Each situation: State the decision (1) + Think of options (2) + Observe consequences (2: right away 1, if repeated 1) + Pick a responsible choice (1).
 *  Variants cover the taught scenarios: late-night gaming before a test; skipping meals; school stress with reduced exercise/sleep (A pool);
 *  a ride from someone who has been drinking; peer pressure to vape; responding after an argument (B pool);
 *  energy drink vs water; excessive scrolling; stress and reduced exercise (justification pool).
 * STOP = State the decision/problem, Think of options, Observe possible consequences, Pick a responsible, health-enhancing choice and explain why.
 * Source: Wildcats_Personal_Responsibility deck + curriculum spec (Personal responsibility and STOP).
 */
(function (root) {
  'use strict';
  var W = root.WWQ, P = W.P, V = W.V;

  function cmp(correct, w1, w2) { return [['c', correct, 1], ['w1', w1, 0], ['w2', w2, 0]]; }
  function scen(id, story, optA, optB, S, T, now, later, Pk, branches) {
    var parts = [
      P('s', 'S · State the decision', 'radio', S, { group: 'S', d: 'F', w: 1, hint: 'The decision is what the person must choose and why it matters, not a judgment about them.' }),
      P('t', 'T · Think of options: pick the 2 most reasonable', 'multi', T, { group: 'T', pick: 2, d: 'F', w: 2, hint: 'Reasonable options are realistic, honest and protect health and responsibilities. Several can qualify.' }),
      P('o1', 'O · Comparing A and B RIGHT AWAY', 'radio', now, { group: 'O', d: 'A', w: 1, hint: 'Think about what happens soon after, for health, safety, relationships and responsibilities.' }),
      P('o2', 'O · Comparing A and B IF REPEATED', 'radio', later, { group: 'O', d: 'A', w: 1, hint: 'Repeated choices add up. What happens if this becomes a habit?' }),
      P('p', 'P · Pick a responsible, health-enhancing choice', 'radio', Pk, { group: 'P', d: 'A', w: 1, hint: 'Responsible means it protects health and responsibilities and is feasible right now. More than one choice can meet this.' })
    ];
    return V(id, story, parts, { optA: optA, optB: optB, branches: branches, vis: { type: 'stop', optA: optA, optB: optB } });
  }
  function defSit(id, st, topic, variants) {
    W.defItem({ id: id, m: 5, st: st, pts: 6, cls: 'complex', d: 'A', topic: topic, src: 'Wildcats_Personal_Responsibility deck + curriculum spec (STOP)', kind: 'form',
      hint: 'Work through S, T, O, P in order. Compare the options right away AND over time, then pick a choice that protects health and responsibilities and is feasible.',
      why: 'STOP: State the decision, Think of options, Observe consequences (right away and repeated), Pick a responsible, health-enhancing choice and explain why. More than one choice can be responsible when it is safe, honest and feasible. Personal responsibility does not mean perfect decisions or total control over resources.',
      variants: variants });
  }

  /* ---------- Situation A pool ---------- */
  defSit('m5.a', '5.1', 'STOP: everyday health decision', [
    scen('m5.a.a', '**Late-night gaming.** Jordan has a science test tomorrow. It is 9:30 p.m. Friends are online for a team event ending at midnight, and Jordan promised to join.',
      'Skip the event, finish studying, sleep on time', 'Play the whole event until midnight',
      [['a', 'How to use tonight: the test, sleep and a promise to friends.', 1], ['b', 'Whether the test matters at all.', 0], ['c', 'Which friends are the most fun.', 0], ['d', 'How to earn the most game points.', 0]],
      [['a', 'Skip the event, study, sleep on time.', 1], ['b', 'Play one hour, log off, review, sleep.', 1], ['c', 'Ask a friend to cover; play Saturday.', 1], ['d', 'Play it all; study during the test.', 0], ['e', 'Say you are sick to skip the test.', 0], ['f', 'Stay up all night to do both.', 0]],
      cmp('A: friends are disappointed, but Jordan is rested and ready. B: fun, but little sleep and less prepared.', 'A: guaranteed to fail the test. B: no costs at all.', 'A and B feel the same tomorrow.'),
      cmp('A repeated supports sleep, focus and grades. B repeated builds lost sleep that hurts focus, mood and health.', 'B repeated is harmless if one test goes fine.', 'Skipping every event is the only responsible way.'),
      [['a', 'Skip the event, study, sleep on time.', 1], ['b', 'Join the first hour, then log off, review, sleep.', 1], ['c', 'Play it all and study in the morning.', 0], ['d', 'Say yes to everything and hope.', 0]],
      { a: 'Tired but calm, Jordan is less stressed on the test. Friends understand and plan the next event.', b: 'One fun hour, a short review, and close to normal sleep.', c: 'Jordan is exhausted, rushes the review and struggles to focus on the test.', d: 'With no plan the night slips away and the morning feels rushed.' }),
    scen('m5.a.b', '**Skipping meals.** Maya missed breakfast. Lunch is 15 minutes with a long line, and a friend is saving her a library seat before a big practice.',
      'Eat a quick packed lunch on the way', 'Skip lunch to save time',
      [['a', 'How to get enough food and energy without losing study time or practice.', 1], ['b', 'Whether eating matters.', 0], ['c', 'Which friend to impress.', 0], ['d', 'How many drinks to buy.', 0]],
      [['a', 'Eat a packed lunch on the way.', 1], ['b', 'Ask the friend to wait; eat; study a bit less.', 1], ['c', 'Grab the free breakfast bag at the express line.', 1], ['d', 'Skip lunch; drink an energy drink.', 0], ['e', 'Skip lunch; eat after practice.', 0], ['f', 'Say nothing and push through.', 0]],
      cmp('A: a little less study time, but steady energy for practice. B: saves time, but tired and lightheaded.', 'A: Maya plays her best because food never matters. B: extra study time, no downside.', 'A and B make no difference.'),
      cmp('Regular meals support energy, focus and mood; skipping often makes focus and energy harder.', 'Regular meals guarantee perfect grades.', 'Skipping meals builds endurance and never affects mood.'),
      [['a', 'Eat a packed lunch on the way.', 1], ['b', 'Ask her friend to wait, eat, study a bit less.', 1], ['c', 'Skip lunch and study.', 0], ['d', 'Drink an energy drink instead.', 0]],
      { a: 'Maya finishes her study task, eats on time and practices with steady energy.', b: 'The friend waits. Maya studies slightly less but feels much better at practice.', c: 'Maya studies, then feels lightheaded during warm-ups and sits out part of practice.', d: 'The drink gives a jittery lift that fades fast. She is still hungry at practice.' }),
    scen('m5.a.c', '**School stress.** Eli has three assignments due this week, stopped his evening walks, and goes to bed late. Now he is tired and short-tempered with family.',
      'Plan the work; keep a short walk and a bedtime', 'Cut sleep and movement to work more',
      [['a', 'How to handle the workload without dropping sleep and movement completely.', 1], ['b', 'Whether school matters.', 0], ['c', 'How to blame the family.', 0], ['d', 'How to avoid all homework.', 0]],
      [['a', 'List tasks, start two, ask about an extension.', 1], ['b', 'Keep a 20-minute walk and a bedtime; work in short blocks.', 1], ['c', 'Ask a counselor or adult to help plan.', 1], ['d', 'Stay up all night, every night.', 0], ['e', 'Ignore all assignments.', 0], ['f', 'Cancel sleep and exercise this week.', 0]],
      cmp('A: a bit less work time tonight, but calmer and clearer. B: more done tonight, but tired and tense.', 'A: Eli finishes nothing and feels worse. B: he feels relaxed.', 'A finishes everything instantly.'),
      cmp('A repeated protects mood and focus in a busy stretch. B repeated wears down sleep, mood, focus and family relationships.', 'B repeated builds resilience at no cost.', 'B repeated only affects sleep.'),
      [['a', 'List tasks, ask about an extension, keep a walk and bedtime.', 1], ['b', 'Ask a counselor to plan the week; keep a bedtime.', 1], ['c', 'Cut sleep and movement until the week ends.', 0], ['d', 'Ignore the assignments.', 0]],
      { a: 'Eli gets a one-day extension on one task, keeps a bedtime and finishes the rest with less stress.', b: 'The counselor splits the week into steps. Eli feels less alone with it.', c: 'Eli finishes some work but is exhausted, snaps at family and makes more mistakes.', d: 'The pile grows and so does Eli’s anxiety.' })
  ]);

  /* ---------- Situation B pool ---------- */
  defSit('m5.b', '5.2', 'STOP: safety and peer-pressure decision', [
    scen('m5.b.a', '**A ride home.** At a birthday dinner, Cam offers Dev a ride and says, “I only had two drinks, I’m fine.” A parent is 20 minutes away, Dev has $8, and the last bus is in 40 minutes.',
      'Call a parent or trusted adult for a ride', 'Ride with Cam',
      [['a', 'How to get home safely when the driver has been drinking.', 1], ['b', 'Whether Cam is a good person.', 0], ['c', 'How to avoid the party.', 0], ['d', 'Whether $8 covers dinner.', 0]],
      [['a', 'Call a parent or trusted adult.', 1], ['b', 'Take the last bus; text a parent the route.', 1], ['c', 'Ask a sober friend or approved ride service.', 1], ['d', 'Ride with Cam; it’s a short drive.', 0], ['e', 'Ride with Cam, sitting in back.', 0], ['f', 'Make Cam walk a line first.', 0]],
      cmp('A: maybe awkward, but Dev gets home safely. B: avoids awkwardness, but crash risk is higher because alcohol affects driving.', 'A: Dev is sure to be in trouble. B: just as safe as any ride.', 'A and B change nothing.'),
      cmp('A repeated builds trust and keeps safe options open. B repeated raises the chance of serious harm.', 'B repeated is harmless if nothing happens once.', 'Safe rides are never possible.'),
      [['a', 'Call a parent or trusted adult.', 1], ['b', 'Take the last bus; share the route with a parent.', 1], ['c', 'Ride with Cam; it’s a short drive.', 0], ['d', 'Ride with Cam but ask him to go slow.', 0]],
      { a: 'A parent says thanks for calling. Cam is annoyed briefly, but the night ends safely.', b: 'A 40-minute wait, but Dev gets home safely and a parent follows by text.', c: 'Alcohol slows reaction time even on a short drive. A safer alternative was available.', d: 'Driving slowly does not undo the effect of alcohol.' }),
    scen('m5.b.b', '**Pressure at a hangout.** Luis likes this group. Someone passes a vape and says, “Everyone’s doing it.” He doesn’t want to, and his ride isn’t until 10 p.m.',
      'Say no and suggest something else', 'Go along to fit in',
      [['a', 'How to respond to vape pressure while staying connected and safe.', 1], ['b', 'Whether the group is cool.', 0], ['c', 'How to leave the house.', 0], ['d', 'How to hide from everyone.', 0]],
      [['a', 'Say no; suggest snacks or another activity.', 1], ['b', 'Step away; text an adult for an earlier ride.', 1], ['c', 'Say “I’m good” and join another group.', 1], ['d', 'Take a puff so no one teases him.', 0], ['e', 'Pretend to vape to look cool.', 0], ['f', 'Stay silent as it is offered again and again.', 0]],
      cmp('A: a brief awkward moment, but Luis stays in control and avoids nicotine. B: fits in now, takes in addictive nicotine, may be pressured again.', 'A: everyone laughs forever. B: he stays healthy.', 'A and B change nothing.'),
      cmp('A repeated makes refusing easier, and good friendships respect “no.” B repeated can lead to dependence and makes refusing harder.', 'Saying no ends every friendship.', 'B repeated has no effect on the body.'),
      [['a', 'Say no and suggest something else.', 1], ['b', 'Step away; text an adult for an earlier ride.', 1], ['c', 'Take one puff to get it over with.', 0], ['d', 'Stay silent and wait it out.', 0]],
      { a: 'A couple of people shrug and join the snack run. Luis stays part of the group.', b: 'A parent agrees to come early. Luis leaves without drama and keeps his friends.', c: 'One puff doesn’t end the pressure. The next offer is harder to refuse.', d: 'The offer comes around again and the pressure builds.' }),
    scen('m5.b.c', '**After an argument.** Ari argued with a close friend and now sees a hurtful group-chat comment about them. Ari is angry and wants to reply right now. Practice starts in 30 minutes.',
      'Pause, then talk privately', 'Reply right away in the group chat',
      [['a', 'How to respond while angry without making the conflict worse.', 1], ['b', 'Who wins the argument.', 0], ['c', 'How to delete the chat forever.', 0], ['d', 'How to get everyone to take sides.', 0]],
      [['a', 'Wait until calm; talk privately with “I” statements.', 1], ['b', 'Walk or breathe first; ask a counselor if needed.', 1], ['c', 'Message: “I’m upset. Can we talk after practice?”', 1], ['d', 'Reply in the group chat now.', 0], ['e', 'Share screenshots to turn others against them.', 0], ['f', 'Never speak to them again.', 0]],
      cmp('A: still angry, but avoids escalating in public. B: brief relief, then a public argument that is harder to repair.', 'A: Ari instantly feels perfect. B: Ari feels calm and respected.', 'A and B make the argument vanish.'),
      cmp('A repeated: calm “I” statements help solve problems and keep trust. B repeated: blow-ups damage trust and raise stress.', 'B repeated strengthens friendships.', 'Talking never helps.'),
      [['a', 'Pause, then talk privately with “I” statements.', 1], ['b', 'Ask to talk after practice.', 1], ['c', 'Reply in the group chat now.', 0], ['d', 'Never speak to them again.', 0]],
      { a: 'After practice Ari explains how the comment felt. The friend apologizes and they agree how to handle disagreements.', b: 'The friend replies, “Yes, I’m sorry.” They talk after practice.', c: 'The chat piles on. Ari feels worse and now has more to repair.', d: 'The silence leaves the problem unresolved and both feel hurt.' })
  ]);

  /* ---------- Structured justification (2 pts) ---------- */
  function just(id, story, pick, ev, rat, matrix) {
    return V(id, story + '\n\n**Choice made:** ' + pick, [
      P('evidence', 'Part 1 · Most relevant case fact?', 'radio', ev, { w: 1, d: 'D', hint: 'The most relevant fact connects directly to a health outcome or to feasibility for this choice.' }),
      P('why', 'Part 2 · Which explanation connects that fact to the choice?', 'radio', rat, { w: 1, d: 'D', dep: 'evidence', matrix: matrix, hint: 'The explanation must use the fact you picked and show why it leads to the choice.' })
    ]);
  }
  W.defItem({ id: 'm5.j', m: 5, st: '5.3', pts: 2, cls: 'complex', d: 'D', topic: 'STOP: defend the choice with evidence and an explanation', src: 'Wildcats_Personal_Responsibility deck + curriculum spec (STOP “Pick and explain why”)', kind: 'form',
    hint: 'Pick the fact that most directly supports the choice, then the explanation that uses THAT fact.',
    why: 'A defensible choice uses relevant evidence from the case and an explanation linking it to health, safety or feasibility. A correct choice with a mismatched fact or reason does not earn full credit.',
    variants: [
      just('m5.j.a', '**Energy drink or water?** Kai has a math exam at 1 p.m. and is tired from a late night. A vending machine by the library sells energy drinks.', 'Kai chose water and a snack.',
        [['f1', 'Last time he drank one before a test, he felt jittery and got a headache.', 0], ['f2', 'Water is free at the fountain by the library.', 0], ['f3', 'The vending machine is next to the library.', 0], ['f4', 'His friend drinks one every day.', 0], ['f5', 'Energy drinks cost $3.', 0]],
        [['r1', 'His own experience shows energy drinks can hurt focus on test day; water avoids that.', 0], ['r2', 'Water is free and nearby, so it is feasible without money or a store.', 0], ['r3', 'The machine is close, so buying is the only option.', 0], ['r4', 'A friend does it, so it must be right.', 0]],
        { f1: { r1: 1, r2: 0 }, f2: { r2: 1, r1: 0 }, f3: { r3: 0.5 }, f4: { r4: 0 }, f5: { r2: 0.5 } }),
      just('m5.j.b', '**Scrolling at night.** Priya has been scrolling until midnight on school nights and wakes up tired.', 'Priya chose to charge her phone across the room at 10:30 p.m.',
        [['f1', 'She keeps missing first period because she wakes up too tired.', 0], ['f2', 'Her phone has a good camera.', 0], ['f3', 'A friend sent her a funny video.', 0], ['f4', 'She has a cheap alarm clock she can use.', 0], ['f5', 'The phone case is blue.', 0]],
        [['r1', 'Late scrolling cuts into needed sleep, so a clear cutoff protects it.', 0], ['r2', 'The alarm clock replaces the phone for waking up, so the plan is feasible.', 0], ['r3', 'The funny video means it is fine to scroll.', 0], ['r4', 'A good camera means she must stay online.', 0]],
        { f1: { r1: 1, r2: 0 }, f4: { r2: 1, r1: 0 }, f2: { r4: 0 }, f3: { r3: 0 }, f5: {} }),
      just('m5.j.c', '**Stress and movement.** Rin has skipped walks to study every evening and feels tense and tired.', 'Rin chose a 15-minute walk with a friend after dinner, then back to studying.',
        [['f1', 'Her notes say she focused better in the hour after earlier walks.', 0], ['f2', 'The friend lives on the same street.', 0], ['f3', 'Rin has a red jacket.', 0], ['f4', 'Rin has four hours of homework tonight.', 0], ['f5', 'The walk costs nothing and needs no equipment.', 0]],
        [['r1', 'Her notes show movement helps focus and stress, so a short walk supports studying.', 0], ['r2', 'It costs nothing and the friend is close, so it is feasible on a busy night.', 0], ['r3', 'With lots of homework, she should never take a break.', 0], ['r4', 'She owns a jacket, so she must go outside.', 0]],
        { f1: { r1: 1, r2: 0 }, f2: { r2: 0.5 }, f5: { r2: 1, r1: 0 }, f4: { r3: 0 }, f3: { r4: 0 } })
    ]
  });
  // evidence-part credits (the justification's first part uses its own credit map; the second part uses the matrix)
  var J = W.ITEM_BY_ID['m5.j'];
  var evCredit = [
    { f1: 1, f2: 0.5, f3: 0, f4: 0, f5: 0 },
    { f1: 1, f2: 0, f3: 0, f4: 0.5, f5: 0 },
    { f1: 1, f2: 0.5, f3: 0, f4: 0, f5: 0.5 }
  ];
  J.variants.forEach(function (v, i) { v.parts[0].opts.forEach(function (o) { o.c = evCredit[i][o.id] || 0; }); });
})(typeof window !== 'undefined' ? window : globalThis);
