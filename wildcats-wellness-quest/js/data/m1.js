/* Mission 1 — Whole-Health Hub (12 points)
 * 10 classification items (1 pt, 2 attempts, 2 equivalent variants) + 1 ripple-effect item (2 pts, 3 attempts, 3 variants).
 * Source: Dimensions_of_Wellness deck (slide numbers not verifiable: file not supplied) + curriculum specification "Five dimensions".
 */
(function (root) {
  'use strict';
  var W = root.WWQ, P = W.P, V = W.V;

  var DOMS = [['phys', 'Physical'], ['ment', 'Mental'], ['emo', 'Emotional'], ['soc', 'Social'], ['env', 'Environmental']];
  function domOpts(key) { return DOMS.map(function (d) { return [d.id || d[0], d[1], d[0] === key ? 1 : 0]; }); }
  function card(id, text, key, hint) {
    return V(id, text, [P('dom', 'Primary dimension', 'radio', domOpts(key), { fixed: true, hint: hint })], { key: key });
  }

  // [id, demand, {cardA text, cardB text}, domain key, hint]
  var CARDS = [
    ['m1.c01', 'F', 'Lena eats fruit, protein and whole grains at lunch so her energy stays steady in the afternoon.', 'Priya’s annual check-up records her resting heart rate and blood pressure.', 'phys', 'Ask what part of the person is being cared for most directly: body function, thinking, feelings, relationships, or surroundings.'],
    ['m1.c02', 'F', 'Noor breaks a hard problem set into short, focused blocks so she can think it through.', 'Theo uses a flash-card routine to remember vocabulary for Friday’s quiz.', 'ment', 'Look for the skill being used: focus, memory, problem-solving, or thinking.'],
    ['m1.c03', 'F', 'After a low grade, Kai names feeling disappointed and tells himself, “This is hard, not hopeless.”', 'Zoe writes down that she feels nervous and why before a tryout.', 'emo', 'Naming a feeling and the self-talk that follows are about emotions, not the grade itself.'],
    ['m1.c04', 'F', 'Jada listens without interrupting while a teammate explains a disagreement, and they agree on a plan.', 'Luis tells friends he does not want to join something he is uncomfortable with, and they accept it.', 'soc', 'The key action happens between people: listening, communicating, or handling peer pressure.'],
    ['m1.c05', 'F', 'Ren clears clutter, opens a window and sets up good light before studying.', 'Sage sets up a quiet corner with a lamp for homework.', 'env', 'The change is to the space around the person.'],
    ['m1.c06', 'A', 'Marcus does a 20-minute bodyweight workout in his room.', 'Dev walks the long way home and drinks water instead of soda.', 'phys', 'Ask what the main benefit is. Other dimensions may also be touched, but pick the one most directly involved.'],
    ['m1.c07', 'A', 'Ava takes three slow breaths and a 5-minute break so she can keep thinking clearly about her deadline.', 'Ben splits a big project into smaller steps so the deadline feels manageable and he can keep working.', 'ment', 'The stated goal is thinking clearly and managing workload pressure.'],
    ['m1.c08', 'A', 'Mia writes three things she is grateful for after a rough day.', 'Omar reminds himself that one lost game does not define the season.', 'emo', 'Gratitude and perspective after a setback are about emotional well-being.'],
    ['m1.c09', 'A', 'A new student joins the lunch table, and the group makes space and asks about her interests.', 'Ari checks in with a classmate who seems left out and invites them to a project group.', 'soc', 'Belonging and supportive relationships point to one dimension.'],
    ['m1.c10', 'A', 'Cam sorts recycling and uses a refillable bottle at school.', 'Dana helps weed the school courtyard garden and then eats lunch there.', 'env', 'Look for sustainable choices and care for shared spaces or nature.']
  ];
  CARDS.forEach(function (c, i) {
    W.defItem({
      id: c[0], m: 1, st: '1.1', pts: 1, cls: 'short', d: c[1], topic: 'Five dimensions: primary dimension in context', src: 'Dimensions_of_Wellness deck + curriculum spec (Five dimensions)',
      kind: 'sort', hint: c[5],
      why: 'Many situations touch more than one dimension. The question asks which dimension is MOST directly involved in the action described.',
      variants: [card(c[0] + '.a', c[2], c[4], c[5]), card(c[0] + '.b', c[3], c[4], c[5])]
    });
  });

  /* ---------- Ripple effect (2 pts, 3 attempts) ---------- */
  function ripple(id, scene, from, conns, mechs, matrix) {
    return V(id, scene, [
      P('conn', 'Part 1 · Pick a valid connection to ANOTHER dimension', 'radio', conns, { hint: 'The connection must be to a different dimension and must be plausible for this situation.' }),
      P('mech', 'Part 2 · Pick the explanation that supports your connection', 'radio', mechs, { dep: 'conn', matrix: matrix, hint: 'The explanation has to match the connection you chose in Part 1. A true statement about a different dimension does not support it.' })
    ], { from: from });
  }
  W.defItem({
    id: 'm1.ripple', m: 1, st: '1.3', pts: 2, cls: 'complex', d: 'A', topic: 'Dimensions overlap (ripple effects)', src: 'Dimensions_of_Wellness deck + curriculum spec (Dimensions overlap)',
    kind: 'form', hint: 'Start from the main dimension in the story. Ask: what else gets harder or easier when that changes, and why?',
    why: 'Dimensions overlap. A strong answer names a different dimension and the mechanism that links them. Several connections can be valid; the explanation must fit the one you chose.',
    variants: [
      ripple('m1.ripple.a', 'Jordan games until 2 a.m. before a test and sleeps a few hours. (Main dimension: Physical)', 'phys',
        [['a', 'Mental: focus and memory get harder', 1], ['b', 'Emotional: mood is harder to manage', 1], ['c', 'Social: patience with friends drops', 1], ['d', 'Environmental: school recycling changes', 0], ['e', 'None: sleep only affects the body', 0]],
        [['m1', 'Sleep supports attention and memory, so studying and recall get harder.', 0], ['m2', 'Tired people react more strongly to stress and manage feelings less well.', 0], ['m3', 'Tired people have less patience, so listening and resolving conflict get harder.', 0], ['m4', 'Gaming earns points that help every dimension.', 0], ['m5', 'A test score is the only thing sleep affects.', 0]],
        { a: { m1: 1 }, b: { m2: 1 }, c: { m3: 1 } }),
      ripple('m1.ripple.b', 'Maya skips lunch and has a headache and low energy all afternoon. (Main dimension: Physical)', 'phys',
        [['a', 'Mental: concentrating gets harder', 1], ['b', 'Emotional: irritability is more likely', 1], ['c', 'Social: she may withdraw from group work', 1], ['d', 'Environmental: classroom temperature changes', 0], ['e', 'None: food only affects the stomach', 0]],
        [['m1', 'The brain needs steady fuel, so focus and problem-solving suffer.', 0], ['m2', 'Hunger and fatigue make small frustrations feel bigger.', 0], ['m3', 'Low energy makes it harder to join in and share the work.', 0], ['m4', 'Skipping lunch fixes stress.', 0], ['m5', 'Hunger has no link beyond the stomach.', 0]],
        { a: { m1: 1 }, b: { m2: 1 }, c: { m3: 1 } }),
      ripple('m1.ripple.c', 'Dev argues with a close friend and cannot stop thinking about it during homework. (Main dimension: Social)', 'soc',
        [['a', 'Mental: concentration drops', 1], ['b', 'Emotional: anger or worry builds', 1], ['c', 'Physical: sleep or appetite can slip', 1], ['d', 'Environmental: the room\u2019s air quality changes', 0], ['e', 'None: arguments only affect friendships', 0]],
        [['m1', 'Replaying the argument uses attention, so schoolwork gets harder.', 0], ['m2', 'Unresolved conflict triggers strong feelings that are hard to manage.', 0], ['m3', 'Conflict stress can interfere with sleep and eating.', 0], ['m4', 'The friend\u2019s opinion fixes homework.', 0], ['m5', 'Relationships never change how we feel.', 0]],
        { a: { m1: 1 }, b: { m2: 1 }, c: { m3: 1 } })
    ]
  });

  /* ---------- Unscored overlap exploration (required activity, no points) ---------- */
  W.defActivity({ id: 'overlap', m: 1, title: 'Overlap Lab exploration (unscored)' });
  W.OVERLAP = [
    { id: 'walk', card: 'A lunchtime walk with a friend', main: 'soc', lenses: {
      phys: 'Moving the body: steps, heart rate and energy.', ment: 'A short break can help the mind reset and focus later.', emo: 'Talking and fresh air can lift mood.', soc: 'Time with a friend builds connection and belonging.', env: 'Being outdoors is time in nature.' } },
    { id: 'quiet', card: 'A tidy, quiet study corner', main: 'env', lenses: {
      phys: 'Good light and posture are easier on the body.', ment: 'Fewer distractions make focus and memory easier.', emo: 'A calm space can lower stress feelings.', soc: 'It can help you keep a promise to a study partner.', env: 'The space itself is organized and supportive.' } },
    { id: 'sleep', card: 'Getting enough sleep on school nights', main: 'phys', lenses: {
      phys: 'The body repairs and restores itself.', ment: 'Memory, attention and problem-solving depend on rest.', emo: 'Moods are steadier when rested.', soc: 'Patience and listening are easier.', env: 'A dark, quiet room supports sleep.' } }
  ];
})(typeof window !== 'undefined' ? window : globalThis);
