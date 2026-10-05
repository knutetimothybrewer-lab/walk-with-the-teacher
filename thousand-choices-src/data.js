// ===== SCENARIOS: 50 decisions in 4 life phases =====
// o(grade, text, "what happens", animation, acuteStatChanges, habitChanges, pointsOverride)
//   grade A = health-enhancing (+w), B = mixed/neutral (0), C = risky (-w)   (worksheet scale)
//   habit keys: plain = set the habit, "key+" = raise to at least, "key-" = lower to at most
// sc: dom = health domain, w = worksheet points weight, k = default habit this choice sets (A:+2 B:0 C:-2)
const o = (g, t, fb, fx, s, h, p) => ({ g, t, fb, fx, s, h, p });
const S = (id, dom, w, cat, k, title, text, opts, extra) => Object.assign({ id, dom, w, cat, k, title, text, opts }, extra);

const PHASES = [
  { name: 'Teen Years', range: 'ages 14–18', blurb: 'Habits start here. Many of them will stick around for decades.' },
  { name: 'Young Adult', range: 'ages 19–32', blurb: 'Independence means every choice is now yours alone.' },
  { name: 'Adulthood', range: 'ages 33–50', blurb: 'Work, family, and stress make healthy habits harder, and more important.' },
  { name: 'Midlife & Beyond', range: 'ages 51–65', blurb: 'The body now shows the sum of thousands of small choices.' }
];

const PHASE_SCENARIOS = [
// ---------------------------------------------------------------- PHASE 1: TEEN
[
  S('sleep1', 'phys', 3, 'Sleep', 'sleep', 'Game night vs. the big test',
    'It’s 11:30 p.m. You have a major test tomorrow, you’re tired, and friends invite you to join an online game.', [
    o('A', 'Say goodnight, put the phone away, and go to sleep now.', 'You get a full eight hours. Your brain files away what you studied and you wake up sharp.', 'sleep', { brain: 2, immune: 1, mood: 4, stress: -6 }),
    o('B', 'Play “just 15 minutes,” then go to bed.', '15 minutes turns into 45. You get about six hours and feel a bit foggy during the test.', 'game', { brain: -1, stress: 1 }),
    o('C', 'Play the whole game. The test can’t be that bad.', 'You crash at 2 a.m. and get under five hours of sleep. Your body runs on stress hormones all day.', 'game', { brain: -3, immune: -2, mood: -6, stress: 9 })
  ]),
  S('break1', 'phys', 2, 'Nutrition', 'diet', 'Late for school',
    'You overslept and the bus comes in five minutes. There’s no time for a normal breakfast.', [
    o('A', 'Grab a banana and yogurt (or peanut butter toast) to eat on the way.', 'Steady fuel keeps your blood sugar level and your mind on class.', 'eat_good', { metab: 1, mood: 2 }),
    o('B', 'Grab a pastry from the vending machine.', 'A quick sugar rush, then a crash by second period.', 'eat_junk', { metab: -1, bmi: 0.2, mood: -1 }),
    o('C', 'Skip breakfast, and probably lunch too.', 'Your stomach growls, your focus drops, and you get light-headed by afternoon.', 'hunger', { brain: -1, mood: -4, stress: 3, bmi: -0.3 })
  ]),
  S('water1', 'phys', 1, 'Hydration', 'water', 'Water or energy drink?',
    'Your friends split energy drinks before practice. A water fountain is right there.', [
    o('A', 'Refill your water bottle.', 'Hydrated muscles and brain, with no jitters.', 'water', { skin: 1 }),
    o('C', 'Chug an energy drink.', 'Your heart races, your hands shake, and you crash later. All that sugar and caffeine strain your heart.', 'energy', { heart: -2, metab: -2, stress: 5, teeth: -2, bmi: 0.2 })
  ]),
  S('lunch1', 'phys', 2, 'Nutrition', 'diet', 'Lunch with friends',
    'Lunch is short. Your friends want to talk instead of eating, and you’re tempted to skip lunch to spend more time with them.', [
    o('A', 'Grab a balanced tray and eat while you chat. You get both.', 'Friends and fuel. You feel connected and energized all afternoon.', 'eat_good', { social: 3, mood: 3, metab: 1 }),
    o('B', 'Nibble a few snacks and keep talking.', 'You don’t starve, but you’re running low by sixth period.', 'eat_junk', { metab: -1 }),
    o('C', 'Skip lunch entirely and hang out.', 'Skipping meals becomes a habit. By afternoon you’re shaky and cranky.', 'hunger', { brain: -2, mood: -4, stress: 3, bmi: -0.4 })
  ]),
  S('vape1', 'soc', 3, 'Peer Pressure', null, 'The vape at the party',
    'At a party, someone passes you a vape. Everyone is watching to see what you’ll do.', [
    o('A', 'Say “No thanks, I’m good,” and grab a soda.', 'Nobody cares as much as you feared. You stay true to yourself and your lungs stay clean.', 'shield', { social: 4, mood: 4 }, { smoke: 0 }),
    o('A', 'Laugh it off and suggest music or food. The group joins in.', 'Leaders change the mood, and your friends were relieved someone said it first.', 'shield', { social: 6, mood: 5 }, { smoke: 0 }),
    o('B', 'Say “maybe later” and awkwardly hold it without using it.', 'You dodge the first hit, but you spend the night feeling anxious and on guard.', 'shrug', { stress: 5 }, { smoke: 0 }),
    o('C', 'Take a hit so you don’t look lame.', 'Nicotine floods your brain and your lungs take in chemicals that scar them. Nicotine is addictive, and one hit can lead to many.', 'vape', { lungs: -6, brain: -3, mood: -2, stress: 4 }, { 'smoke+': 2 })
  ]),
  S('drink1', 'soc', 3, 'Peer Pressure', null, 'No adults, plenty of drinks',
    'At a house party with no adults, someone hands you a drink. “One won’t hurt.”', [
    o('A', 'Politely decline, stick with water, and text a trusted adult your location.', 'You remember the whole night, and you’re ready to help if a friend needs it.', 'shield', { social: 4, mood: 4 }, { drink: 0 }),
    o('B', 'Take a cup so people stop asking, but don’t drink it.', 'The pressure fades and you keep control. It was a small step toward staying safe.', 'shrug', { stress: 2 }, { drink: 0 }),
    o('C', 'Drink up (and keep drinking) to fit in.', 'A teen brain is still developing, and alcohol disrupts it. You feel sick, embarrassed, and foggy the next day.', 'drink', { liver: -4, brain: -4, mood: -5, social: -3 }, { 'drink+': 2 })
  ]),
  S('ride1', 'soc', 3, 'Peer Pressure', null, 'The risky ride home',
    'A friend who has been drinking offers to drive everyone home from the party.', [
    o('A', 'Refuse, call a parent or rideshare, and urge others not to ride.', 'You get home safe. The friend is annoyed, but he’s alive to be annoyed.', 'shield', { social: 4, mood: 5 }),
    o('A', 'Find a sober driver, or stay over at the host’s house.', 'Planning an alternative keeps everyone safe.', 'shield', { social: 4, mood: 4 }),
    o('B', 'Say “he’s probably fine” and wait to see what happens.', 'Nothing happens tonight, but you were lucky, not safe.', 'shrug', { stress: 6 }),
    o('C', 'Hop in. It’s only ten minutes.', 'The car swerves and you slam into a curb. Everyone is shaken, you’re bruised, and nobody feels okay for days.', 'car', { bone: -3, mood: -8, stress: 14, heart: -1, social: -2 })
  ]),
  S('move1', 'phys', 2, 'Movement', 'move', 'After-school plans',
    'After school a few classmates start a pickup game at the park.', [
    o('A', 'Join in and play hard for 45 minutes.', 'Your heart pumps, muscles work, and endorphins flood your brain. You sleep better, too.', 'run', { fit: 3, muscle: 2, heart: 1, mood: 5, stress: -6, bmi: -0.2 }),
    o('B', 'Walk home like usual.', 'A bit of movement, but nothing that challenges your body.', 'walk', {}),
    o('C', 'Go straight home and sit on the couch all evening.', 'Your muscles and heart get no workout, and you feel a little more sluggish each day.', 'sit', { fit: -2, muscle: -1, mood: -2, bmi: 0.3 })
  ]),
  S('screen1', 'ment', 2, 'Screens / Media', 'screen', 'Homework vs. the phone',
    'Homework is due tomorrow, but your phone keeps buzzing with notifications and new videos.', [
    o('A', 'Finish homework first, then enjoy 30 minutes of phone time as a reward.', 'Done and guilt-free. Your brain gets a clean break when you’ve earned it.', 'study', { brain: 1, mood: 3, stress: -4 }),
    o('B', 'Do both at once, jumping back and forth.', 'It all gets done, but slowly and badly. Multitasking splits your focus.', 'phone', { stress: 2 }),
    o('C', 'Scroll for hours and panic at midnight.', 'The work isn’t done, you’re stressed, and you lose sleep. The scroll never ends.', 'phone', { brain: -2, mood: -5, stress: 8 })
  ]),
  S('stress1', 'ment', 2, 'Stress Management', 'coping', 'Everything at once',
    'Tests, practice, and friend drama are piling up. You’ve stopped exercising and aren’t sleeping enough.', [
    o('A', 'Talk to a trusted adult, make a to-do plan, and take a 20-minute walk.', 'Naming the problem shrinks it. A plan and fresh air lower your stress hormones.', 'calm', { mood: 6, stress: -12, heart: 1 }),
    o('B', 'Ignore it and hope it passes.', 'The stress sits in your shoulders and doesn’t get better or worse.', 'shrug', { stress: 2 }),
    o('C', 'Let it build and stay up late stewing. Snap at people.', 'Stress becomes a storm: poor sleep, short temper, and a pounding heart.', 'stress', { heart: -1, mood: -6, stress: 14, immune: -2, social: -2 })
  ]),
  S('conflict1', 'soc', 2, 'Conflict Resolution', 'connect', 'The argument',
    'You had a big argument with a close friend. You’re upset and deciding how to respond.', [
    o('A', 'Cool off, then say calmly, “I felt hurt when…”', 'Honest, respectful words repair the friendship, and you both feel lighter.', 'talk', { social: 7, mood: 5, stress: -6 }),
    o('B', 'Avoid them for a few days.', 'No blow-up, but the issue just sits there between you.', 'shrug', { social: -1 }),
    o('C', 'Blast them in the group chat, or give the silent treatment.', 'You feel powerful for five minutes, then lonely. Grudges drain energy and friendships.', 'angry', { social: -8, mood: -5, stress: 8 })
  ]),
  S('talk1', 'emo', 2, 'Handling Setbacks', 'mind', 'The bombed quiz',
    'You bombed a quiz you studied for. The voice in your head starts talking.', [
    o('A', 'Reframe it: “I can study differently. I’ll ask for help.”', 'Setbacks become information. You feel more in control and learn something real.', 'idea', { mood: 8, stress: -6, brain: 1 }),
    o('B', 'Shrug it off. “Whatever.”', 'You keep going but skip the lesson inside the setback.', 'shrug', {}),
    o('C', 'Spiral: “I’m so stupid. Why even try?”', 'Harsh self-talk makes the stress worse and the next test harder.', 'storm', { mood: -10, stress: 9, brain: -1 })
  ]),
  S('sun1', 'phys', 2, 'Sun Protection', 'sun', 'A day at the beach',
    'Noon at the beach, UV index 9. The sun is strong and the whole day is planned outside.', [
    o('A', 'Apply SPF 30+, wear a hat, reapply every two hours, and take shade breaks.', 'You have fun with no burn. Skin cells stay undamaged, and sunscreen is cheaper than skin cancer treatment.', 'sunscreen', { mood: 3, skin: 1 }),
    o('B', 'Put on sunscreen once in the morning and forget about it.', 'It wears off by noon. You come home pink and sore.', 'sun', { skin: -3, burn: 0.35 }),
    o('C', 'No sunscreen. You want a deep tan.', 'Your skin burns red and blisters. Sunburns damage DNA in skin cells, and the damage adds up for life.', 'burn', { skin: -9, burn: 1, mood: -3 })
  ]),
  S('space1', 'env', 1, 'Personal Space', 'tidy', 'The disaster room',
    'Your room has laundry piles, old cups, and nowhere clear to study.', [
    o('A', 'Spend 20 minutes tidying and clearing your desk.', 'A clear space is a clear mind. You can find things and focus.', 'clean', { env: 10, mood: 3, stress: -4 }),
    o('B', 'Ignore it. You know where everything is.', 'It stays the same, just a little bit worse each week.', 'shrug', { env: -1 }),
    o('C', 'Let it get worse. Eat in your room, toss clothes anywhere.', 'Clutter adds stress, makes sleep worse, and invites pests and mold.', 'mess', { env: -12, mood: -3, stress: 4, immune: -1 })
  ])
],
// ---------------------------------------------------------------- PHASE 2: YOUNG ADULT
[
  S('focus1', 'ment', 2, 'Focus & Follow-Through', 'sleep', 'The paper due tomorrow',
    'A big paper is due tomorrow and you haven’t started.', [
    o('A', 'Work in 25-minute blocks, finish by 10 p.m., and sleep seven-plus hours.', 'Focused work and a rested brain. You turn in solid work and feel in control.', 'study', { brain: 2, mood: 4, stress: -6 }),
    o('B', 'Work until 1 a.m. and sleep about five hours.', 'You finish, but you’re groggy and irritable the next day.', 'study', { brain: -1, stress: 3 }),
    o('C', 'Pull an all-nighter with energy drinks.', 'Your heart pounds, your thoughts blur, and you crash hard. Procrastination just moves the pain.', 'energy', { brain: -3, heart: -1, mood: -6, stress: 10 })
  ]),
  S('smoke1', 'soc', 3, 'Peer Pressure', null, 'The smoke break',
    'At your new job, coworkers take smoke breaks together and invite you along. You’re feeling stressed.', [
    o('A', 'Say “no thanks” and take a walk or call a friend instead.', 'A walk clears your head better than nicotine, and you keep your lungs and your money.', 'shield', { social: 3, mood: 4, stress: -5, fit: 1 }, { smoke: 0 }),
    o('B', 'Join them outside but don’t smoke.', 'You bond a bit, but you breathe secondhand smoke for 10 minutes each break.', 'smoke', { lungs: -1, social: 3 }, { 'smoke+': 0.5 }),
    o('C', 'Try “just one cigarette” to fit in.', 'Nicotine hooks you faster than most people expect. Each cigarette brings tar, carbon monoxide, and cancer-causing chemicals into your lungs.', 'smoke', { lungs: -6, heart: -2, stress: 3, mood: 1 }, { 'smoke+': 2 }, -2),
    o('C', 'Start smoking regularly to cope with stress.', 'It feels like relief, but it’s just withdrawal being fed. Your lungs, heart, and skin start taking daily damage.', 'smoke', { lungs: -9, heart: -3, skin: -2, stress: 4 }, { smoke: 3 })
  ]),
  S('drink2', 'phys', 3, 'Alcohol', 'drink', 'Big night out',
    'Your group is planning a heavy drinking night this weekend.', [
    o('A', 'Go, but be the designated driver and drink water.', 'You have fun, remember everything, and become the hero who gets everyone home.', 'cheers', { social: 4, mood: 4 }, { drink: 0 }),
    o('B', 'Have a few drinks with food and take a rideshare home.', 'Moderate, but alcohol still strains your liver and slows your reflexes.', 'drink', { liver: -1, brain: -1 }, { drink: 1 }),
    o('C', 'Binge. Keep up with the group.', 'You get sick, your memory goes dark, and your liver and brain take a hit. Repeating this speeds up lasting damage.', 'drink', { liver: -6, brain: -4, heart: -1, mood: -5, social: -2 }, { drink: 3 })
  ]),
  S('diet2', 'phys', 2, 'Nutrition', 'diet', 'First apartment, tight budget',
    'You’re on your own for meals, and the drive-thru is right on your way home.', [
    o('A', 'Meal prep on Sunday: beans, rice, veggies, chicken.', 'Cheaper, healthier, and way less stress during the week.', 'eat_good', { metab: 2, mood: 3, bmi: -0.2 }),
    o('B', 'Mix of home cooking and takeout.', 'Not terrible, not great.', 'eat_junk', {}),
    o('C', 'Fast food, ramen, and soda most days.', 'Lots of salt, sugar, and unhealthy fat. Blood sugar, cholesterol, and waistline all creep up.', 'eat_junk', { metab: -4, heart: -2, bmi: 0.8, mood: -2 })
  ]),
  S('move2', 'phys', 2, 'Movement', 'move', 'The desk job',
    'Your new job means eight hours of sitting every day.', [
    o('A', 'Schedule workouts (30+ min, four days a week) and take walking breaks.', 'Your heart gets stronger, your mood lifts, and sitting stops being a health risk.', 'run', { fit: 4, muscle: 3, heart: 2, bone: 1, mood: 4, stress: -6, bmi: -0.4 }),
    o('B', 'Walk to the bus. That’s about it.', 'Some movement, but not enough to build fitness.', 'walk', {}),
    o('C', 'Sit all day, then sit at home too.', 'Sitting for hours slows your metabolism and weakens your heart and muscles.', 'sit', { fit: -4, muscle: -2, heart: -1, metab: -2, bmi: 0.6, mood: -2 })
  ]),
  S('stress2', 'ment', 2, 'Stress Management', 'coping', 'Deadlines, rent, and relationships',
    'Work deadlines, rent, and relationship stress hit all at the same time.', [
    o('A', 'Journal, exercise, and talk with a friend. Ask your boss to help prioritize.', 'Stress becomes manageable when you give it outlets and ask for help.', 'calm', { mood: 6, stress: -12, heart: 1 }),
    o('B', 'Ignore it and push through.', 'Stress doesn’t get worse right away, but it doesn’t go away.', 'shrug', { stress: 2 }),
    o('C', 'Let it build and numb it with late-night scrolling and drinks.', 'Numbing hides the feeling but feeds the problem, and the stress comes back stronger.', 'stress', { heart: -1, mood: -6, stress: 12, liver: -1 }, { coping: -2, 'drink+': 1.5 })
  ]),
  S('lonely1', 'soc', 2, 'Quality Connection', 'connect', 'New city, no friends',
    'You moved for work (or school) and you don’t know anyone.', [
    o('A', 'Join a club, gym class, or volunteer group. Invite people to coffee.', 'Connection takes effort, but real friendships grow, and they protect your mood and health.', 'friends', { social: 10, mood: 6, stress: -5 }),
    o('B', 'Chat with coworkers only at surface level.', 'It’s pleasant, but nobody really knows you yet.', 'shrug', { social: 1 }),
    o('C', 'Stay home and avoid everyone.', 'Isolation raises stress and depression. Loneliness affects health as much as smoking does.', 'alone', { social: -9, mood: -7, stress: 6, immune: -2 })
  ]),
  S('help1', 'emo', 2, 'Emotional Expression', 'mind', 'Down for weeks',
    'You’ve felt down and numb for weeks. Sleep, appetite, and motivation are all off.', [
    o('A', 'Tell a trusted adult, doctor, or counselor how you feel, and ask for help.', 'Asking for help is a strength. Counselors teach real tools, and feelings get lighter once they’re shared. (If you’re ever struggling in real life, tell a trusted adult or school counselor, or call or text 988.)', 'talk', { mood: 9, stress: -9, social: 3 }, { mind: 2, coping: 2 }),
    o('B', 'Wait and see if it gets better on its own.', 'Some days are better, but the weight stays.', 'shrug', { mood: -1 }, { mind: 0 }),
    o('C', 'Hide it. Pull away and tell everyone “I’m fine.”', 'Bottling it up makes it heavier and pushes away the people who could help.', 'storm', { mood: -9, stress: 8, social: -5 }, { mind: -2, coping: -2 })
  ]),
  S('setback2', 'emo', 2, 'Handling Setbacks', 'mind', 'Laid off',
    'You lose your job (or fail a class you needed).', [
    o('A', 'Reframe: “What can I learn?” Ask for feedback and make a plan.', 'It hurts, but you turn it into direction, and you bounce back stronger.', 'idea', { mood: 8, stress: -5, brain: 1 }),
    o('B', 'Shrug it off and move on.', 'You get through it, but without learning much.', 'shrug', {}),
    o('C', 'Spiral: give up and sleep all day.', 'Hopelessness feeds on itself, and the longer you wait, the heavier it gets.', 'storm', { mood: -10, stress: 9, social: -3 })
  ]),
  S('dental1', 'phys', 1, 'Dental Care', 'dental', 'Sensitive teeth',
    'Your teeth are sensitive. You’ve been skipping floss and the dentist, and you drink soda daily.', [
    o('A', 'Brush twice, floss daily, visit the dentist, and swap soda for water.', 'Healthy gums and teeth, which also protect your heart.', 'tooth', { teeth: 7, mood: 2 }),
    o('B', 'Brush most days.', 'Better than nothing, but plaque still builds up.', 'shrug', { teeth: -1 }),
    o('C', 'Skip it all. Pop and sweets are life.', 'Cavities, gum disease, and painful dental work. Mouth bacteria can travel to the heart.', 'cavity', { teeth: -9, mood: -3, heart: -1 })
  ]),
  S('outdoor1', 'env', 1, 'Time Outdoors', 'outdoor', 'A free weekend',
    'You have a free weekend with nothing planned.', [
    o('A', 'Hike, bike, or picnic at a park.', 'Fresh air, sunlight, and movement. Nature lowers stress hormones.', 'nature', { env: 8, fit: 1, mood: 5, stress: -6 }),
    o('B', 'Stay in, as usual.', 'Relaxing, but the same old four walls.', 'shrug', { env: -1 }),
    o('C', 'Stay in a cluttered room all weekend.', 'Stale air, no sunlight, and clutter. You feel more tired every hour.', 'indoor', { env: -8, mood: -4, fit: -1 })
  ]),
  S('kind1', 'soc', 1, 'Kindness', 'connect', 'A neighbor in need',
    'A neighbor is struggling to carry groceries. Your day is already full.', [
    o('A', 'Help. Maybe even organize a neighborhood food drive.', 'Helping releases feel-good chemicals and builds trust that supports your own wellbeing.', 'kind', { social: 7, mood: 6, stress: -3 }),
    o('B', 'Smile and keep walking.', 'Nothing bad, nothing good.', 'shrug', {}),
    o('C', 'Brush it off: “not my problem.”', 'Small acts of indifference weaken community, and they leave you feeling a little more alone.', 'bad', { social: -5, mood: -2 })
  ]),
  S('eco1', 'env', 1, 'Sustainable Choices', 'eco', 'Daily footprint',
    'Your daily routine decides how much you waste or protect the world around you.', [
    o('A', 'Bike, walk, or take transit, recycle, and bring a reusable bottle.', 'Cleaner air, less waste, and the commute doubles as exercise.', 'eco', { env: 8, fit: 1, mood: 3, lungs: 1 }),
    o('C', 'Idle the car, litter, and waste water and energy.', 'Dirtier air and a messier neighborhood, and you breathe it too.', 'litter', { env: -9, lungs: -1, mood: -2 })
  ]),
  S('pill1', 'soc', 3, 'Peer Pressure', null, 'The study pill',
    'Before finals a classmate offers a pill “to focus all night.” It’s not prescribed to you.', [
    o('A', 'Say no and study with a plan, or visit tutoring.', 'You avoid a dangerous drug and learn better habits for the future.', 'shield', { social: 3, mood: 3, brain: 1 }, { drugs: 0 }),
    o('B', 'Say “maybe,” pocket it, and never take it.', 'You avoided the pill, but carrying it was a risk of its own.', 'shrug', { stress: 3 }, { drugs: 0 }),
    o('C', 'Take it.', 'Your heart races, you can’t sleep, and the crash is brutal. Misusing someone else’s medication can be dangerous, and it can become a habit.', 'pill', { heart: -4, brain: -4, stress: 10, mood: -5 }, { 'drugs+': 2 })
  ])
],
// ---------------------------------------------------------------- PHASE 3: ADULTHOOD
[
  S('sleep2', 'phys', 3, 'Sleep', 'sleep', 'Crunch time',
    'A work crunch and a toddler (or a busy family) leave almost no time for sleep.', [
    o('A', 'Protect a bedtime: share duties, screens off, aim for seven-plus hours.', 'A rested brain handles stress better and your immune system gets stronger.', 'sleep', { brain: 2, immune: 2, mood: 5, stress: -6 }),
    o('B', 'Get five to six hours and hope for the best.', 'You function, but you’re dragging by afternoon.', 'sleep', { brain: -1 }),
    o('C', 'Run on under five hours and lots of caffeine.', 'Chronic sleep loss raises blood pressure, blood sugar, and the risk of accidents.', 'game', { brain: -3, heart: -2, immune: -3, mood: -6, stress: 9 })
  ]),
  S('screen2', 'ment', 2, 'Screens / Media', 'screen', 'After-work scrolling',
    'After work you collapse on the couch with the TV on and your phone in hand.', [
    o('A', 'Set a screen limit and spend 30 minutes on a hobby or a book.', 'Your brain gets real rest instead of constant noise.', 'study', { brain: 1, mood: 4, stress: -5 }),
    o('B', 'Some screens, but you still handle what matters.', 'Not great, not terrible.', 'phone', {}),
    o('C', 'Hours of scrolling in bed.', 'Blue light delays sleep, and endless feeds leave you more anxious and drained.', 'phone', { brain: -2, mood: -5, stress: 6 })
  ]),
  S('rest1', 'ment', 1, 'Mental Rest', 'mind', 'No break in months',
    'You haven’t had a real break in months. Your calendar is packed.', [
    o('A', 'Schedule screen-free downtime for a hobby, quiet time, or nature.', 'Rest makes you more creative and less irritable.', 'calm', { mood: 6, stress: -8, brain: 1 }),
    o('B', 'No rest, but you’re not overloaded.', 'Holding steady, but with no reserves.', 'shrug', {}),
    o('C', 'Say yes to everything and run on empty.', 'Burnout creeps in: exhaustion, cynicism, and aches.', 'stress', { mood: -6, stress: 9, immune: -2 })
  ]),
  // slot 4: conditional. Smokers face a quit-or-not decision; non-smokers face secondhand smoke at home.
  S('quit1', 'phys', 3, 'Smoking', null, 'A doctor’s warning',
    'Your doctor says your cough is a warning sign, and your lungs and heart need you to quit.', [
    o('A', 'Quit with support: patches, a counselor, and a quit line.', 'Withdrawal is hard, but within weeks your breathing improves, and lungs and heart begin to heal.', 'good', { lungs: 6, heart: 4, mood: -4, stress: 5 }, { smoke: 0 }),
    o('B', 'Cut down but not quit.', 'Fewer cigarettes help a little, but any smoking keeps damaging lungs, heart, and skin.', 'smoke', { lungs: 1, stress: 3 }, { 'smoke-': 1.5 }, 0),
    o('C', 'Keep going. You’ll quit “tomorrow.”', 'Another day, another round of tar and chemicals. Each year of smoking costs more lung function.', 'smoke', { lungs: -4, heart: -2, mood: -2 })
  ], { cond: st => st.h.smoke > 0,
       alt: S('second1', 'phys', 3, 'Smoking', null, 'Smoke in the apartment',
    'Your partner (or roommate) smokes inside, and the smoke fills the apartment.', [
    o('A', 'Set a smoke-free home rule and offer help to quit.', 'You protect your lungs and give them a push toward quitting.', 'shield', { lungs: 2, mood: 3, social: 2 }),
    o('B', 'Open a window and put up with it.', 'Less smoke, but you’re still breathing some of it every day.', 'smoke', { lungs: -1 }, { 'smoke+': 0.4 }),
    o('C', 'Say nothing and breathe it every day.', 'Secondhand smoke harms the lungs and heart, even if you never light up.', 'smoke', { lungs: -4, immune: -2, heart: -1 }, { 'smoke+': 0.8 })
  ]) }),
  S('diet3', 'phys', 2, 'Nutrition', 'diet', 'The creeping scale',
    'Your busy life has let your weight creep up. Your doctor mentions cholesterol.', [
    o('A', 'Cook veggies and whole grains, and watch portions of treats.', 'Your blood sugar and cholesterol improve, and you feel lighter and sharper.', 'eat_good', { metab: 4, heart: 1, mood: 3, bmi: -0.6 }),
    o('B', 'Eat better some days, worse others.', 'Holding steady, but not improving.', 'eat_junk', {}),
    o('C', 'Skip meals, then binge on processed snacks at night.', 'Blood sugar swings, cholesterol rises, and your waistline grows.', 'eat_junk', { metab: -4, heart: -2, bmi: 0.9, mood: -3 })
  ]),
  S('move3', 'phys', 2, 'Movement', 'move', 'The 5K group',
    'A friend invites you to a 5K training group. Your knees creak just thinking about it.', [
    o('A', 'Join in. Start with walk/jog intervals and strength work three times a week.', 'Muscles, bones, and heart all get stronger, and you’ve gained a team.', 'run', { fit: 5, muscle: 3, heart: 2, bone: 2, mood: 5, social: 5, stress: -6, bmi: -0.5 }),
    o('B', 'Walk the dog now and then.', 'Better than sitting, but not building much.', 'walk', {}),
    o('C', 'Say you’re too busy and stay on the sofa.', 'Muscle and bone density keep shrinking, and joints get stiffer.', 'sit', { fit: -4, muscle: -3, bone: -1, bmi: 0.5, mood: -2 })
  ]),
  S('check1', 'phys', 2, 'Preventive Care', 'care', 'Warning signs',
    'There’s a new mole on your arm and your chest feels tight on stairs. Your annual physical is overdue.', [
    o('A', 'Book a physical with bloodwork, a dental visit, and a skin check.', 'Problems caught early are easier to treat. You get peace of mind and a plan.', 'doctor', { stress: -3, mood: 3, immune: 1 }),
    o('B', 'Go only if it gets worse.', 'Waiting means small problems can become big ones.', 'shrug', {}),
    o('C', 'Ignore all of it.', 'Ignoring symptoms lets silent conditions grow, from heart disease to skin cancer.', 'bad', { stress: 5, mood: -2 })
  ]),
  S('sun2', 'phys', 2, 'Sun Protection', 'sun', 'Family beach vacation',
    'Your family vacation includes long days outdoors in the sun.', [
    o('A', 'SPF 30+, UV clothing, a hat, and shade breaks. Reapply often.', 'Memories made, skin protected.', 'sunscreen', { mood: 3, skin: 1 }),
    o('B', 'Sunscreen once in the morning.', 'Some protection, but you get a little burned.', 'sun', { skin: -3, burn: 0.35 }),
    o('C', 'No sunscreen. A tan looks healthy.', 'Tans and burns are both signs of skin damage, and years of it add up to wrinkles and skin cancer risk.', 'burn', { skin: -9, burn: 1, mood: -2 })
  ]),
  S('conflict2', 'soc', 2, 'Conflict Resolution', 'connect', 'Money talk',
    'You and your partner (or a coworker) disagree about money and chores.', [
    o('A', 'Listen, use “I” statements, and look for a compromise.', 'You solve the problem and the relationship grows stronger.', 'talk', { social: 7, mood: 5, stress: -6 }),
    o('B', 'Avoid the topic.', 'Peace for now, but tension builds under the surface.', 'shrug', { social: -1 }),
    o('C', 'Yell, hold a grudge, or give the silent treatment.', 'Chronic conflict raises blood pressure and wears relationships down.', 'angry', { social: -8, mood: -5, stress: 8, heart: -1 })
  ]),
  S('happy1', 'soc', 3, 'Peer Pressure', 'drink', 'Happy hour',
    'Your team’s happy hour is in full swing, they’re pushing shots, and you have an early meeting.', [
    o('A', 'Order one mocktail and leave on time.', 'You still enjoyed the team, and you’re clear-headed at the meeting.', 'cheers', { social: 4, mood: 4 }, { drink: 0 }),
    o('B', 'Stay for one drink and eat something.', 'Moderate and manageable.', 'drink', { liver: -1 }, { drink: 1 }),
    o('C', 'Do shots to impress everyone.', 'A hangover, a bad meeting, and a bit more strain on your liver and brain.', 'drink', { liver: -6, brain: -4, mood: -5, stress: 4 }, { drink: 3 })
  ]),
  S('express1', 'emo', 2, 'Emotional Expression', 'coping', 'Money worries at 2 a.m.',
    'Money worries are keeping you up at night. You haven’t told anyone.', [
    o('A', 'Talk to a partner, friend, or counselor.', 'A problem shared is lighter, and others often have ideas you didn’t.', 'talk', { mood: 8, stress: -10, social: 4 }),
    o('B', 'Keep it to yourself. You’re okay for now.', 'You manage, but the worry stays.', 'shrug', { stress: 2 }),
    o('C', 'Bottle it up, then explode at your family.', 'Pressure builds until it blows up the people you care about most.', 'angry', { mood: -7, stress: 10, social: -6 })
  ]),
  S('work1', 'env', 2, 'Work Environment', 'tidy', 'The chaotic desk',
    'Your home office is cluttered, noisy, and full of notifications.', [
    o('A', 'Set up a clear, quiet, well-lit workspace.', 'Focus returns, and so does your energy.', 'clean', { env: 11, mood: 3, stress: -5, brain: 1 }),
    o('B', 'It’s a so-so space. You manage.', 'Productive enough.', 'shrug', {}),
    o('C', 'Keep working in the chaos.', 'Distractions and clutter chop your focus and add stress all day.', 'mess', { env: -11, mood: -3, stress: 6, brain: -1 })
  ])
],
// ---------------------------------------------------------------- PHASE 4: MIDLIFE & BEYOND
[
  S('move4', 'phys', 2, 'Movement', 'move', 'Stiff mornings',
    'Your joints are stiff in the morning, and your doctor mentions bone health.', [
    o('A', 'A daily brisk walk plus strength and balance work.', 'Muscles and bones respond at any age. You stay strong and steady.', 'run', { fit: 4, muscle: 4, bone: 3, heart: 1, mood: 4, stress: -5 }),
    o('B', 'Just chores around the house.', 'Some movement, but little challenge.', 'walk', {}),
    o('C', 'Rest more: “my body’s old now.”', 'Inactivity speeds up muscle loss and bone thinning. Resting more makes you weaker.', 'sit', { fit: -4, muscle: -4, bone: -2, mood: -3, bmi: 0.5 })
  ]),
  S('bp1', 'phys', 3, 'Preventive Care', 'care', 'The doctor’s warning',
    'Your doctor says your blood pressure and blood sugar are creeping up.', [
    o('A', 'Follow the plan: less salt and sugar, daily movement, and take any medication.', 'Numbers come back down, and your risk of heart attack and stroke drops sharply.', 'doctor', { heart: 4, metab: 4, stress: -4, bmi: -0.5 }, { care: 2, diet: 2 }),
    o('B', 'Try it for a week, then drift back.', 'Little changes, so the risk stays.', 'shrug', {}, { care: 0, diet: 0 }),
    o('C', 'Ignore it. You feel fine.', 'High blood pressure is silent. It damages arteries for years before you feel anything.', 'bad', { heart: -3, stress: 3 }, { care: -2, diet: -2 })
  ]),
  S('grat1', 'emo', 1, 'Gratitude / Perspective', 'mind', 'The end of the day',
    'Another day is ending. You can reflect on it however you like.', [
    o('A', 'Write down three good things from the day.', 'Gratitude trains your brain to notice what’s going well, and lifts your mood.', 'good', { mood: 5, stress: -4 }),
    o('B', 'Don’t think about it.', 'Neutral.', 'shrug', {}),
    o('C', 'Dwell on everything that went wrong.', 'Focusing only on the negative feeds stress and worry.', 'storm', { mood: -5, stress: 5 })
  ]),
  S('social4', 'soc', 2, 'Quality Connection', 'connect', 'The quiet house',
    'The kids have moved out and old friends have moved away. It would be easy to drift into isolation.', [
    o('A', 'Schedule weekly calls or walks, join a club, and host dinners.', 'Strong relationships are among the best predictors of a long, healthy life.', 'friends', { social: 10, mood: 6, stress: -5, immune: 1 }),
    o('B', 'Reach out only when you remember to.', 'Occasional contact, but no deep connection.', 'shrug', { social: 1 }),
    o('C', 'Withdraw. Fewer people means fewer problems.', 'Loneliness raises the risk of heart disease, memory loss, and early death.', 'alone', { social: -9, mood: -7, stress: 6, immune: -2, brain: -1 })
  ]),
  S('image1', 'emo', 2, 'Self-Talk', 'mind', 'The mirror',
    'You catch your reflection and notice wrinkles and gray hair.', [
    o('A', 'Appreciate what your body has done, and keep caring for it.', 'Respect for yourself fuels healthy habits, and you feel at peace.', 'heart', { mood: 7, stress: -5 }),
    o('B', 'Shrug it off.', 'You move on.', 'shrug', {}),
    o('C', 'Harsh self-talk, and a crash diet to “fix” it.', 'Self-criticism and crash diets harm your mood and your metabolism.', 'storm', { mood: -7, stress: 6, metab: -2, bmi: -0.3 })
  ]),
  S('drink4', 'phys', 2, 'Alcohol', 'drink', 'Nightly “unwinding”',
    'You’ve fallen into pouring a drink every night to unwind.', [
    o('A', 'Swap it for tea, a walk, or stretching. Keep alcohol rare.', 'Your liver gets a break, you sleep better, and you start feeling clearer.', 'calm', { liver: 4, brain: 2, mood: 4, stress: -4 }, { drink: 0 }),
    o('B', 'Weekends only.', 'Better, but still some strain.', 'drink', { liver: 1 }, { drink: 1 }),
    o('C', 'Two or three drinks every night.', 'Daily drinking damages the liver, raises blood pressure, and disrupts sleep.', 'drink', { liver: -6, brain: -3, heart: -2, mood: -4 }, { drink: 3 })
  ]),
  S('goal1', 'ment', 2, 'Focus & Follow-Through', 'mind', 'The health goal',
    'You’ve set a goal: get healthier this year.', [
    o('A', 'Make a SMART plan, track it weekly, and ask a friend to check in.', 'Specific plans and a support buddy turn good intentions into real change.', 'idea', { brain: 1, mood: 6, stress: -4, fit: 1 }),
    o('B', 'Try for a week, then drift.', 'A little progress, but no staying power.', 'shrug', {}),
    o('C', 'Keep saying “I’ll start Monday.”', 'Putting it off becomes a habit, and the months slip by.', 'bad', { mood: -4, stress: 3 })
  ]),
  S('sleep3', 'phys', 3, 'Sleep', 'sleep', 'Restless nights',
    'Your sleep has gotten worse: you snore, wake up often, and drink coffee late.', [
    o('A', 'Keep a regular schedule, no caffeine after noon, screens off, and get checked for sleep apnea.', 'Deeper sleep rebuilds your heart, brain, and immune system.', 'sleep', { brain: 3, heart: 2, immune: 2, mood: 5, stress: -6 }),
    o('B', 'Try, but not consistently.', 'Some nights are better.', 'sleep', {}),
    o('C', 'Late screens, coffee at 8 p.m., and four-five hours a night.', 'Chronic sleep loss raises the risks of heart attack, diabetes, and memory loss.', 'game', { brain: -3, heart: -3, immune: -3, mood: -6, stress: 8 })
  ]),
  S('air1', 'env', 2, 'Healthy Home', 'tidy', 'The stale house',
    'Your home smells musty, with dust, mold, and clutter everywhere.', [
    o('A', 'Fix the leak, add an air filter, declutter, and open the windows.', 'Cleaner air means easier breathing and fewer sick days.', 'clean', { env: 11, lungs: 2, immune: 2, mood: 3 }),
    o('B', 'Ignore it.', 'It slowly gets worse.', 'shrug', { env: -1 }),
    o('C', 'Let it pile up and keep the windows shut.', 'Mold and dust inflame the lungs and trigger allergies, asthma, and infections.', 'mess', { env: -11, lungs: -3, immune: -3, mood: -3 })
  ]),
  S('legacy1', 'soc', 2, 'Kindness / Helping Others', 'connect', 'The retirement plan',
    'You finally have lots of free time. What shape will your days take?', [
    o('A', 'Volunteer, mentor, or walk with friends. Stay involved.', 'Purpose and company keep body and mind sharp.', 'kind', { social: 9, mood: 7, fit: 1, brain: 1, stress: -5 }),
    o('A', 'Join a garden club or swim class.', 'Movement, sunshine, and friends all in one place.', 'nature', { social: 6, mood: 6, fit: 2, env: 4, stress: -4 }),
    o('B', 'Relax at home. You’ve earned it.', 'Comfortable, but a little quiet.', 'shrug', { social: -1 }),
    o('C', 'Recliner, TV, and no plans, all day, every day.', 'Inactivity and isolation speed up decline, and the days start to blur together.', 'alone', { social: -9, mood: -6, fit: -3, muscle: -3, brain: -2 })
  ])
]
];

const ALL_SCENARIOS = PHASE_SCENARIOS.flat();
const TOTAL_CHOICES = 50;
// age at each decision (phase-aware, ends at 65)
function ageAt(i) {
  if (i < 14) return 14 + i * 0.35;
  if (i < 28) return 19 + (i - 14) * 1.0;
  if (i < 40) return 33 + (i - 28) * 1.5;
  return 51 + (i - 40) * 1.55;
}
const FINAL_AGE = 65;
const MAX_DOM = { phys: 0, ment: 0, emo: 0, soc: 0, env: 0 };
ALL_SCENARIOS.forEach(sc => { MAX_DOM[sc.dom] += sc.w; });
