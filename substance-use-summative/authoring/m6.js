// MISSION 6: PRESSURE & DECISION SIMULATOR
// Refusal-builder items use three slots: (1) say no, (2) hold the line, (3) plan B.
const slot = (k, label, a, b, c, d) => ({ k, label, opts: [a, b, c, d].filter(Boolean) });

export default {
  id: 'm6', num: 6, title: 'Pressure & Decision Simulator', theme: 'pressure', est: 7,
  kicker: 'MISSION 6',
  blurb: 'Real pressure is rarely a speech contest. Short, calm, safety-first responses usually work best, and a plan made ahead of time helps.',
  stages: [
    {
      kind: 'q', block: 'm6-a',
      q: {
        id: 'p1', domain: 'decision', topic: 'Direct and indirect pressure; perceived norms', lo: 'Classify pressure as direct or indirect, including perceived norms',
        type: 'sort', lvl: 'I', dok: 2, pts: 1, sec: 50,
        misc: 'Pressure only means someone directly pushing; perceived norms are accurate',
        prompt: 'Sort each example: direct pressure (someone pushes you) or indirect pressure (the situation, media or perceived norms push you).',
        bins: [['dir', 'Direct pressure'], ['ind', 'Indirect pressure']],
        items: [
          ['q1', 'A friend holds out a vape and says, \u201cJust try it.\u201d'],
          ['q2', 'Your feed is full of party posts, so it starts to feel like everyone is doing it.'],
          ['q3', 'A group chat asks, \u201cYou coming or are you scared?\u201d'],
          ['q4', 'You believe most students vape, even though surveys show most do not.'],
          ['q5', 'You see others laugh at someone who said no, and you worry it would happen to you.']
        ],
        ans: { q1: 'dir', q2: 'ind', q3: 'dir', q4: 'ind', q5: 'ind' },
        explain: 'Direct pressure is a person asking, urging or taunting you. Indirect pressure comes from the environment: media, what you think others do (perceived norms, which are often higher than the real numbers), and fear of rejection.'
      }
    },
    {
      kind: 'q', block: 'm6-a',
      q: {
        id: 'p2', domain: 'nicotine', topic: 'Marketing, flavors, product design, social media', lo: 'Identify persuasion techniques in a fictional nicotine ad',
        type: 'multi', lvl: 'I', dok: 3, pts: 2, sec: 60,
        misc: 'Ads only inform; social posts are neutral',
        stim: { ad: { brand: 'NOVA POD', lines: ['20 flavors. Pick yours: Mango Ice, Blue Razz, Peach Gummy.', 'Slim. Discreet. Fits in your pocket.', 'Share the vibe. #chill #squad'], note: 'Fictional ad for a classroom analysis' } },
        prompt: 'Select ALL techniques in this fictional ad that are likely to increase appeal to young people.',
        opts: [
          ['a', 'A wide range of sweet, candy-like flavors'],
          ['b', 'A small, discreet, technology-style design'],
          ['c', 'A belonging and lifestyle message (“Share the vibe,” “squad”)'],
          ['d', 'A plain statement of long-term health evidence'],
          ['e', 'A warning that nicotine is addictive in large type']
        ],
        ans: ['a', 'b', 'c'],
        explain: 'Flavors, discreet device design and social belonging messages all increase appeal to young people. The ad contains no health evidence and no prominent warning. Noticing these techniques is the first step in resisting them.'
      }
    },
    {
      kind: 'pool', id: 'refusal',
      groups: [
        {
          pick: 1, items: [
            {
              kind: 'q', q: {
                id: 'rf-vape', domain: 'decision', topic: 'Refusal skills: direct offer', lo: 'Build a short, assertive, safety-oriented refusal',
                type: 'slots', lvl: 'AP', dok: 3, pts: 2, sec: 65,
                misc: 'Refusing needs a perfect speech, or a lie, or an insult',
                stim: { chat: [['Jordan', 'Take a hit. Don’t be boring.'], ['Jordan', 'Everyone’s done it. It’s just flavor.']] },
                prompt: 'Build your reply. Choose one option for each part. Short and realistic beats long and perfect.',
                slots: [
                  slot('s1', '1. Say no', ['a', '“No thanks, I’m good.”'], ['b', '“Um… maybe… I don’t know…”'], ['c', '“You’re an idiot for even offering that.”'], ['d', '“Actually, nicotine affects the adolescent prefrontal cortex and a 2024 CDC report shows…”']),
                  slot('s2', '2. If they push', ['a', '“I said I’m good. Want to grab food instead?”'], ['b', '“Fine, I’ll try it, but only this one time.”'], ['c', '“I can’t right now. Ask me again later tonight.”']),
                  slot('s3', '3. Plan B', ['a', 'Walk away and sit with a friend who isn’t using, or head to class early.'], ['b', 'Stay right where you are and hope they eventually stop asking you.'], ['c', 'Take it, hold it, and just pretend to inhale so they leave you alone.'])
                ],
                ans: { s1: 'a', s2: 'a', s3: 'a' },
                explain: 'A short, calm no, a repeat or an alternative if they push, and a move to another place or person are realistic and effective. “Maybe later” leaves the door open, and insults or long lectures raise the pressure.'
              }
            },
            {
              kind: 'q', q: {
                id: 'rf-pill', domain: 'decision', topic: 'Refusal skills: unidentified pill', lo: 'Build a refusal for an unidentified pill',
                type: 'slots', lvl: 'AP', dok: 3, pts: 2, sec: 65,
                misc: 'It is polite or safe to accept something from someone you know',
                stim: { chat: [['Casey', 'It’s just a little pill to relax. My cousin gets them.'], ['Casey', 'Take half, you’ll be fine.']] },
                prompt: 'Build your reply. Choose one option for each part.',
                slots: [
                  slot('s1', '1. Say no', ['a', '“No, I’m not taking that.”'], ['b', '“Hmm, is it safe? I guess I’ll take half.”'], ['c', '“Wow, you’re trying to hurt people!”'], ['d', '“Let me tell you about fentanyl in counterfeit pills, starting with the history…”']),
                  slot('s2', '2. If they push', ['a', '“I don’t take pills if I don’t know what’s in them. Not happening.”'], ['b', '“Okay, but I’ll only take half if you take one first.”'], ['c', '“Maybe on a different night, when I’m feeling more relaxed.”']),
                  slot('s3', '3. Plan B', ['a', 'Move to a different room, stay with a trusted friend, and text an adult if you want to leave.'], ['b', 'Take the pill, slip it into your pocket, and tell them you swallowed it already.'], ['c', 'Stay close to the person offering it, in case something goes wrong later.'])
                ],
                ans: { s1: 'a', s2: 'a', s3: 'a' },
                explain: 'You cannot know what is in an unidentified pill. A short no, a steady repeat, and moving to people and places that feel safe protect you. Bargaining (“half”) and “maybe” keep the offer alive.'
              }
            },
            {
              kind: 'q', q: {
                id: 'rf-drink', domain: 'decision', topic: 'Refusal skills: group offer', lo: 'Build a refusal when a group is passing alcohol',
                type: 'slots', lvl: 'AP', dok: 3, pts: 2, sec: 65,
                misc: 'In a group, refusing means making a scene',
                stim: { chat: [['Teammate', 'You’re up, Captain. Everybody drinks.'], ['Teammate', 'Don’t leave us hanging.']] },
                prompt: 'Build your reply. Choose one option for each part.',
                slots: [
                  slot('s1', '1. Say no', ['a', '“I’m passing. Thanks.”'], ['b', '“Ah, I don’t know… maybe a sip…”'], ['c', '“You’re all losers.”'], ['d', '“I cannot consume alcohol because of the following twelve reasons…”']),
                  slot('s2', '2. If they push', ['a', '“I’m good. Pass it on, I’m not drinking.”'], ['b', '“Okay, just one sip so the team doesn’t get mad.”'], ['c', '“Yeah yeah, I’ll have some a little later, I promise.”']),
                  slot('s3', '3. Plan B', ['a', 'Leave with a ride you trust, or text a parent for a pickup if the plan changes.'], ['b', 'Stay in the car, keep quiet, and hope the drinking is over soon enough.'], ['c', 'Ride home with whoever still seems sober enough to drive “for now.”'])
                ],
                ans: { s1: 'a', s2: 'a', s3: 'a' },
                explain: 'A brief, friendly no, repeated if needed, with a plan to leave using a safe ride keeps you safe without a fight. “Maybe a sip” invites more pressure.'
              }
            }
          ]
        },
        {
          pick: 1, items: [
            {
              kind: 'q', q: {
                id: 'rf-ride', domain: 'decision', topic: 'Refusal skills: unsafe ride', lo: 'Build a refusal for an impaired driver',
                type: 'slots', lvl: 'AP', dok: 3, pts: 2, sec: 65,
                misc: 'Riding with a friend who “seems fine” is okay',
                stim: { chat: [['Kyle', 'Get in. I only had a few. I’m fine.'], ['Kyle', 'Don’t make this weird.']] },
                prompt: 'Build your reply. Choose one option for each part.',
                slots: [
                  slot('s1', '1. Say no', ['a', '“I’m not riding. I’m getting another ride.”'], ['b', '“Um… okay… I guess it’s a short drive.”'], ['c', '“You’re an irresponsible idiot.”'], ['d', '“Let me explain the physiology of reaction time…”']),
                  slot('s2', '2. If they push', ['a', '“I’m not riding. I’ll call my mom. Want me to call someone for you, too?”'], ['b', '“Okay, fine, but you have to drive slow and take side streets.”'], ['c', '“Maybe if you drink some water and wait ten minutes first.”']),
                  slot('s3', '3. Plan B', ['a', 'Call or text a parent or another sober driver, share your location, and wait somewhere safe.'], ['b', 'Sit in the back seat, buckle up, and keep your phone out in case it goes badly.'], ['c', 'Start walking home alone along the dark road so that nobody gets upset with you.'])
                ],
                ans: { s1: 'a', s2: 'a', s3: 'a' },
                explain: 'Seatbelts and slow driving do not fix impaired judgment and reaction time. Declining the ride and arranging another one does. Offering help to the driver shows care without enabling the drive.'
              }
            },
            {
              kind: 'q', q: {
                id: 'rf-chat', domain: 'decision', topic: 'Refusal skills: group-chat pressure', lo: 'Build a response to indirect, social-media pressure',
                type: 'slots', lvl: 'AP', dok: 3, pts: 2, sec: 65,
                misc: 'Online pressure does not count, or must be answered with a big public statement',
                stim: { chat: [['Group chat', 'Everyone’s at Mia’s tonight, BYOB. You in or are you too scared?'], ['Group chat', '“Scared” lol']] },
                prompt: 'Build your reply. Choose one option for each part.',
                slots: [
                  slot('s1', '1. Say no', ['a', '“Not tonight, I’m out.”'], ['b', '“Maybe, I’ll see how I feel…”'], ['c', '“You’re all pathetic.”'], ['d', '“Multiple paragraphs about why drinking is harmful, with sources…”']),
                  slot('s2', '2. If they push', ['a', '“Still no. Anyone want to see a movie Saturday instead?”'], ['b', '“Okay, fine, I’ll stop by for a little while tonight.”'], ['c', '“I’ll let you know later, I’m still deciding what to do.”']),
                  slot('s3', '3. Plan B', ['a', 'Make other plans with friends you trust and mute the chat for the night.'], ['b', 'Go anyway, but promise yourself you will leave early if it gets out of hand.'], ['c', 'Keep checking the chat all night and feel bad about missing out on it.'])
                ],
                ans: { s1: 'a', s2: 'a', s3: 'a' },
                explain: 'You do not owe a group chat an essay. A short no, an alternative plan, and a good plan for your evening work. “I’ll see how I feel” invites more pressure, and going “just to leave later” is a weaker plan than choosing a different evening.'
              }
            },
            {
              kind: 'q', q: {
                id: 'rf-study', domain: 'decision', topic: 'Refusal skills: peer offers a prescription', lo: 'Build a refusal for an offered prescription stimulant',
                type: 'slots', lvl: 'AP', dok: 3, pts: 2, sec: 65,
                misc: 'A prescription from a doctor makes sharing safe',
                stim: { chat: [['Sam', 'Take one of my pills tonight, you’ll focus way better.'], ['Sam', 'It’s prescribed, it’s totally safe.']] },
                prompt: 'Build your reply. Choose one option for each part.',
                slots: [
                  slot('s1', '1. Say no', ['a', '“No thanks. I’ll pass.”'], ['b', '“Hmm… how many would I take?”'], ['c', '“That’s cheating, you’re the worst.”'], ['d', '“Let me tell you a long story about stimulant side effects…”']),
                  slot('s2', '2. If they push', ['a', '“That’s your medicine. I’m not taking it. Want to quiz each other instead?”'], ['b', '“Okay, just half, then, and only for this one test.”'], ['c', '“Maybe before the next test, if I’m really struggling.”']),
                  slot('s3', '3. Plan B', ['a', 'Make a study plan, take a break, and talk to a teacher if you feel overwhelmed.'], ['b', 'Take it quietly later, when no one is looking, and tell nobody about it.'], ['c', 'Skip sleep and keep studying all night instead of asking anyone for help.'])
                ],
                ans: { s1: 'a', s2: 'a', s3: 'a' },
                explain: 'Your friend’s medicine is for your friend. A short no, an alternative way to help each other study, and real support for stress are safer than taking it.'
              }
            }
          ]
        }
      ]
    },
    {
      kind: 'scene', scene: 'chat', id: 'sim-chat', title: 'Simulation D: Saturday night at Marcus’s',
      lead: 'A fictional conversation. Your choices change four meters. Complete the conversation to submit your run. Each completed run uses one attempt.',
      qs: [{
        id: 'p-chat', domain: 'decision', topic: 'Pressure simulation', lo: 'Navigate a social-pressure scenario safely using refusal, exit and support-seeking',
        type: 'run', lvl: 'AP', dok: 3, pts: 5, sec: 150,
        misc: 'Going along keeps the peace; aggression is the only alternative to passivity',
        prompt: 'Finish the conversation in a way that keeps you safe, lowers the pressure and keeps support available.',
        chat: 'chat',
        explain: 'Strong runs use short, assertive refusals, offer an alternative or an exit, and reach for support (a parent or other trusted adult) before getting in an unsafe ride. Giving in, riding with a driver who has been drinking, or being left without a safe way home all reduce safety.'
      }]
    },
    {
      kind: 'q',
      q: {
        id: 'p-help', domain: 'decision', topic: 'Helping without enabling; when to get help', lo: 'Decide when adult or emergency intervention is necessary',
        type: 'multi', lvl: 'AP', dok: 3, pts: 2, sec: 55,
        misc: 'Telling an adult is always snitching; or every problem is an emergency',
        prompt: 'Select ALL situations where getting an adult or emergency help right away is necessary.',
        opts: [
          ['a', 'A friend cannot be woken after taking an unknown pill, and their breathing is slow.'],
          ['b', 'A friend who has been drinking keeps vomiting and cannot stay awake.'],
          ['c', 'A friend says they are annoyed that the party was boring.'],
          ['d', 'A friend who has been drinking insists on driving everyone home.'],
          ['e', 'A friend drank too much caffeine and feels a little jittery but is talking normally.']
        ],
        ans: ['a', 'b', 'd'],
        explain: 'Unresponsiveness, slow breathing, repeated vomiting with inability to stay awake, and impaired driving are safety emergencies or imminent dangers. Getting help is caring, not betraying. A boring party or mild jitters from caffeine is not an emergency.'
      }
    }
  ]
};
