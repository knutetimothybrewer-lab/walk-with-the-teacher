// FINAL MISSION: SYNTHESIS CASE ("The Gathering")
export default {
  id: 'm8', num: 8, title: 'Final Mission: Synthesis Case', theme: 'final', est: 9,
  kicker: 'FINAL MISSION',
  blurb: 'Everything at once, the way it actually happens. Not every detail matters. Decide which ones do.',
  stages: [
    {
      kind: 'scene', scene: 'case', id: 'gathering', title: 'The gathering',
      lead: 'Read the scene. These details come from one evening. Several questions follow, and each one builds on what is happening.',
      cfg: {
        cards: [
          { id: 'g1', time: '8:55 p.m.', text: 'You arrive at Mia’s house with Priya. About a dozen people are there. Mia’s parents are out. A playlist is on shuffle.' },
          { id: 'g2', time: '9:10 p.m.', text: 'Pizza arrives. Noah is vaping a sleek, fruit-flavored pod device near the kitchen and offers it around.' },
          { id: 'g3', time: '9:30 p.m.', text: 'Someone you know a little holds out a baggie with a blue pill stamped “M30.” “It’s a Percocet. My cousin gets them. Totally safe.”' },
          { id: 'g4', time: '10:00 p.m.', text: 'Dee, who drove you here, says she has had “a few drinks” but feels fine. She is holding her keys. The dog next door is barking.' },
          { id: 'g5', time: '10:20 p.m.', text: 'A post on your phone: “it’s not a big deal, everyone does it lol” from an account you do not know.' },
          { id: 'g6', time: '10:35 p.m.', text: 'Your friend Sam is on the couch. Sam does not respond when you shout. Breathing is slow with a gurgling sound, and Sam’s lips look gray.' }
        ]
      },
      qs: [
        {
          id: 'f1', domain: 'opioid', topic: 'Synthesis: triage and immediate danger', lo: 'Prioritize competing situations by urgency',
          type: 'seq', lvl: 'AN', dok: 3, pts: 2, sec: 55,
          misc: 'Treating every risk as equally urgent, or reacting to the loudest one',
          prompt: 'Rank these four situations from MOST urgent (top) to LEAST urgent (bottom).',
          steps: [
            ['k1', 'Sam is unresponsive, breathing slowly with a gurgling sound, with gray lips.'],
            ['k2', 'Dee is about to drive after drinking.'],
            ['k3', 'Someone is offering you an unidentified pill.'],
            ['k4', 'Noah is vaping a flavored device nearby.']
          ],
          ans: ['k1', 'k2', 'k3', 'k4'],
          explain: 'An unresponsive person with slow breathing is a life-threatening emergency right now. An impaired driver about to leave is the next most imminent danger. An offered pill is a risk you can decline immediately. Someone else vaping nearby is the least urgent for you.'
        },
        {
          id: 'f2', domain: 'decision', topic: 'Synthesis: direct and indirect influences', lo: 'Classify influences and ignore irrelevant details',
          type: 'sort', lvl: 'AP', dok: 3, pts: 2, sec: 60,
          misc: 'Every detail in a scene is a risk or an influence',
          prompt: 'Sort each detail from the scene: direct influence, indirect influence, or not relevant to substance-related decisions.',
          bins: [['dir', 'Direct influence'], ['ind', 'Indirect influence'], ['irr', 'Not relevant']],
          items: [
            ['d1', 'Someone holds out a pill and says it’s safe.'],
            ['d2', 'Noah vaping and offering the device around the room.'],
            ['d3', 'The post saying “it’s not a big deal, everyone does it.”'],
            ['d4', 'The playlist on shuffle.'],
            ['d5', 'The dog barking next door.']
          ],
          ans: { d1: 'dir', d2: 'ind', d3: 'ind', d4: 'irr', d5: 'irr' },
          explain: 'An offer made to you is direct pressure. Seeing others vape and seeing a post that makes it seem normal are indirect influences (modeling and perceived norms). The playlist and the dog have nothing to do with the decisions.'
        },
        {
          id: 'f3', domain: 'opioid', topic: 'Synthesis: counterfeit pill', lo: 'Evaluate what the evidence says about an unidentified pill',
          type: 'mc', lvl: 'AN', dok: 3, pts: 1, sec: 45,
          misc: 'An imprint, a trusted seller, or half a pill makes it safe',
          prompt: 'What does the evidence support about the pill stamped “M30”?',
          opts: [
            ['a', 'Nothing about its contents or strength can be known from the seller\u2019s word or its look. Counterfeit pills may contain fentanyl.'],
            ['b', 'It is probably safe because the stamp matches the imprint on real pharmacy pills, which is hard to copy.'],
            ['c', 'It is safe if only half is taken, then you wait an hour to see how it affects you before taking more.'],
            ['d', 'It is safe because the seller got it from a cousin, and a pill from someone you know and trust is much more reliable than one from a stranger.']
          ],
          ans: 'a',
          explain: 'Imprints and stories can be faked, and counterfeit pills are not made with quality control. Only a pharmacy-dispensed prescription for you can be trusted.'
        },
        {
          id: 'f4', domain: 'alcohol', topic: 'Synthesis: transportation', lo: 'Choose safer alternatives when the planned driver has been drinking',
          type: 'multi', lvl: 'AP', dok: 3, pts: 1, sec: 50,
          misc: 'Wearing a seatbelt or sitting in the back makes riding with an impaired driver safe',
          prompt: 'Dee has been drinking. Select ALL options that are safer ways home.',
          opts: [
            ['a', 'Call a parent or guardian for a ride.'],
            ['b', 'Use a rideshare or taxi that you arrange together.'],
            ['c', 'Ask a licensed friend who has not been drinking.'],
            ['d', 'Wait an hour, have Dee drink some water and coffee, then ride with her.'],
            ['e', 'Ride with Dee but sit in the back and buckle up.']
          ],
          ans: ['a', 'b', 'c'],
          explain: 'A sober driver or a different ride removes the risk. Water, coffee and time do not make an impaired driver safe, and seatbelts do not prevent crashes.'
        },
        {
          id: 'f5', domain: 'literacy', topic: 'Synthesis: evaluating a claim', lo: 'Evaluate a social-media claim against the scene',
          type: 'mc', lvl: 'AN', dok: 3, pts: 1, sec: 45,
          misc: 'Believing a popular post over the situation in front of you',
          prompt: 'How well does the post, “it’s not a big deal, everyone does it,” hold up?',
          opts: [
            ['a', 'Not supported. It overstates how common this is, comes from an unknown source, and ignores the serious risks in this scene.'],
            ['b', 'Supported, because a dozen people are at the gathering, and that many people suggests the behavior is common.'],
            ['c', 'Partly supported, because posts that get shared online by many people usually reflect what most teenagers actually do at gatherings.'],
            ['d', 'It cannot be evaluated at all, because social-media posts are always opinions and never contain any evidence.']
          ],
          ans: 'a',
          explain: 'The post gives no evidence, comes from an unknown account, and conflicts with the facts in front of you.'
        },
        {
          id: 'f6', domain: 'opioid', topic: 'Synthesis: emergency response', lo: 'Choose and sequence the first actions for an unresponsive, slowly breathing person',
          type: 'pick', need: 3, lvl: 'AP', dok: 3, pts: 2, sec: 55,
          misc: 'Waiting, asking what was taken first, or home remedies',
          prompt: 'Sam is unresponsive and barely breathing. Choose the THREE best actions, in order.',
          steps: [
            ['s1', 'Call 911 and put the phone on speaker.'],
            ['s2', 'Give naloxone nasal spray if anyone has it.'],
            ['s3', 'Place Sam on their side and watch their breathing until help arrives.'],
            ['x1', 'Let Sam sleep it off.'],
            ['x2', 'Ask everyone what Sam took before doing anything.'],
            ['x3', 'Give Sam coffee and walk Sam around.']
          ],
          ans: ['s1', 's2', 's3'],
          explain: 'Call 911 first, give naloxone if available, then support breathing and position until help arrives. Details about what was taken can be shared with the dispatcher.'
        },
        {
          id: 'f7', domain: 'decision', topic: 'Synthesis: consequence mapping', lo: 'Connect decisions to their most likely consequences',
          type: 'match', lvl: 'AP', dok: 3, pts: 2, sec: 55,
          misc: 'Consequences are random or only apply to other people',
          prompt: 'Match each decision to its most likely consequence.',
          items: [['y1', 'Take the unidentified pill'], ['y2', 'Ride home with Dee'], ['y3', 'Call 911 for Sam right now'], ['y4', 'Leave Sam on the couch to sleep']],
          choices: [
            ['z1', 'Unknown dose, with a risk of overdose'],
            ['z2', 'A higher chance of a crash because of slowed reaction time and impaired judgment'],
            ['z3', 'Trained responders arrive quickly and can support breathing and give treatment'],
            ['z4', 'Breathing may stop before anyone notices'],
            ['z5', 'The situation resolves itself with no risk']
          ],
          ans: { y1: 'z1', y2: 'z2', y3: 'z3', y4: 'z4' },
          explain: 'Each decision changes the risk. Unknown pills can contain unpredictable fentanyl. Impaired driving raises crash risk. Calling 911 gets help. Leaving someone unresponsive can be fatal.'
        },
        {
          id: 'f8', domain: 'decision', topic: 'Synthesis: protective factors and supports', lo: 'Identify protective factors and supports that are actually available',
          type: 'multi', lvl: 'I', dok: 2, pts: 1, sec: 45,
          misc: 'Protective factors are only about personality',
          prompt: 'Select ALL details from the scene or from your own plan that work as protective factors or supports in this situation.',
          opts: [
            ['a', 'Priya, a friend who came with you and is not using anything.'],
            ['b', 'A parent or guardian you can call for a pickup.'],
            ['c', 'Knowing how to say a short, firm no.'],
            ['d', 'Mia’s parents being out of the house.'],
            ['e', 'The size of the crowd.']
          ],
          ans: ['a', 'b', 'c'],
          explain: 'A friend who is not using, an adult you can call, and a practiced refusal are protective. Unsupervised settings and larger crowds are not protective.'
        }
      ]
    }
  ]
};
