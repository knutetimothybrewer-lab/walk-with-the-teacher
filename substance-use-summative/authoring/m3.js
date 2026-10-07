// MISSION 3: ALCOHOL IMPAIRMENT LAB
export default {
  id: 'm3', num: 3, title: 'Alcohol Impairment Lab', theme: 'alcohol', est: 10,
  kicker: 'MISSION 3',
  blurb: 'Two educational models: one for reaction time and one for blood alcohol concentration. They show patterns. They cannot tell anyone what is safe.',
  stages: [
    {
      kind: 'q', block: 'm3-core',
      q: {
        id: 'a1', domain: 'alcohol', topic: 'Alcohol as a depressant', lo: 'Explain why early excitement does not make alcohol a stimulant',
        type: 'mc', lvl: 'I', dok: 2, pts: 1, sec: 45,
        misc: 'Alcohol is a stimulant because people get loud and energetic at first',
        stim: { quote: { who: 'Student', text: 'Alcohol has to be a stimulant. People get louder, more energetic and more confident right away.' } },
        prompt: 'Which explanation is most accurate?',
        opts: [
          ['a', 'Alcohol is a central nervous system depressant. Early on it lowers inhibition, so behavior looks energetic while brain activity slows.'],
          ['b', 'Alcohol is a stimulant at first and becomes a depressant only after a person passes out or vomits.'],
          ['c', 'Alcohol is a stimulant for people under 21 and a depressant for adults, because the adolescent brain responds to alcohol in a completely different way.'],
          ['d', 'Whether alcohol acts as a stimulant or a depressant depends on whether the drink is beer, wine or liquor.']
        ],
        ans: 'a',
        explain: 'Alcohol slows the central nervous system. The early “excitement” comes from lowered inhibition and judgment. Reaction time, coordination, memory and (at high amounts) breathing are slowed.'
      }
    },
    {
      kind: 'q', block: 'm3-core',
      q: {
        id: 'a2', domain: 'alcohol', topic: 'Standard drinks', lo: 'Compare common drinks using the standard-drink definition (14 g of pure alcohol)',
        type: 'match', lvl: 'AP', dok: 2, pts: 1, sec: 50,
        misc: 'A “drink” is one container, regardless of size or strength',
        prompt: 'A U.S. standard drink contains 14 grams of pure alcohol (for example, 12 oz of 5% beer). Match each drink to about how many standard drinks it contains.',
        items: [['d1', '12 oz can of 5% beer'], ['d2', '5 oz glass of 12% wine'], ['d3', '16 oz pint of 5% beer'], ['d4', '24 oz can of 8% malt beverage']],
        choices: [['x1', '1 standard drink'], ['x13', 'About 1⅓ standard drinks'], ['x2', 'About 2 standard drinks'], ['x3', 'About 3 standard drinks']],
        ans: { d1: 'x1', d2: 'x1', d3: 'x13', d4: 'x3' },
        explain: 'Standard drinks depend on both size and strength: 12 oz × 5% = 1; 5 oz × 12% = 1; 16 oz × 5% ≈ 1⅓; 24 oz × 8% ≈ 3.'
      }
    },
    {
      kind: 'scene', scene: 'reaction', id: 'sim-react', title: 'Simulation A: Reaction time and stopping distance',
      lead: 'First set your own baseline. Then see an educational model of slower processing. This is a model, not a measurement of intoxication.',
      qs: [
        {
          id: 'a-r2', domain: 'alcohol', topic: 'Reaction time and impairment', lo: 'Interpret what added reaction time means for driving, recognizing the limits of a model',
          type: 'mc', lvl: 'AN', dok: 3, pts: 3, sec: 60, after: '@sim',
          misc: 'Believing a simulation can show a “safe” amount or a safe time to drive; small delays do not matter',
          prompt: 'The model added about 0.3 seconds. At 45 mph (about 66 feet per second), that is roughly 20 extra feet traveled before braking even begins. Which conclusion is best supported?',
          opts: [
            ['a', 'A longer reaction time shortens the distance left to stop, so it raises crash risk. The model cannot say when driving is safe.'],
            ['b', 'Twenty feet is small, so slower reaction time is a minor factor in crashes at normal city speeds compared with things like weather and road type.'],
            ['c', 'The model shows how many drinks a person can have before their reaction time is too slow for driving.'],
            ['d', 'A driver whose baseline time was fast would stay safe after drinking, since the added delay would not matter.']
          ],
          ans: 'a',
          explain: 'Twenty feet is more than a car length, and reaction time is only one part of impaired driving (judgment, vision and coordination are affected too). A simplified model can show a pattern, but it cannot say who is safe to drive. No amount of drinking is “safe” for driving.'
        }
      ]
    },
    {
      kind: 'scene', scene: 'bac', id: 'sim-bac', title: 'Simulation B: Estimated BAC over time',
      cfg: { minChanges: 3 },
      lead: 'Change the controls and watch the curve redraw. The shaded band shows how much real people can differ from this model.',
      qs: [
        {
          id: 'a-b', domain: 'alcohol', topic: 'Pace, food, body size and BAC', lo: 'Draw supported conclusions from a BAC model and reject unsupported ones',
          type: 'multi', lvl: 'AN', dok: 3, pts: 3, sec: 80, after: '@sim',
          misc: 'Pacing, food or coffee “sobers up”; one number means “safe”',
          prompt: 'Use the controls to test each statement. Select ALL statements the model supports.',
          opts: [
            ['a', 'Spreading the same drinks over a longer time lowers the peak BAC, but the time until BAC returns to zero stays about the same.'],
            ['b', 'Eating first slows how fast alcohol enters the blood and lowers the peak, but it does not shorten the time to clear alcohol.'],
            ['c', 'With the same drinks over the same time, a smaller body size reaches a higher peak BAC.'],
            ['d', 'Drinking coffee after the last drink moves the curve down faster, so BAC returns to zero sooner.'],
            ['e', 'If the curve stays below 0.08, the model shows that it is safe to drive.']
          ],
          ans: ['a', 'b', 'c'],
          explain: 'The model shows that pace and food change the peak but not how long clearing takes, and that body size matters. It has no coffee setting because coffee does not change BAC. A model also cannot show that any number is safe to drive: impairment begins well below 0.08, and real BAC varies widely.'
        }
      ]
    },
    {
      kind: 'q',
      q: {
        id: 'a-tab', domain: 'alcohol', topic: 'Impairment at different BAC levels', lo: 'Interpret a BAC effects table without treating one number as a cutoff',
        type: 'mc', lvl: 'I', dok: 3, pts: 2, sec: 55,
        misc: 'Impairment begins only at the legal limit',
        stim: {
          table: {
            cap: 'Typical effects reported at different BAC levels (g/dL). Effects vary from person to person.',
            cols: ['BAC', 'Commonly reported effects'],
            rows: [
              ['0.02', 'Some loss of judgment; relaxed; altered mood'],
              ['0.05', 'Lowered alertness; exaggerated behavior; reduced small-muscle control; impaired judgment'],
              ['0.08', 'Poor muscle coordination; slower reaction time; harder to detect danger; impaired judgment, self-control and memory'],
              ['0.10', 'Clear deterioration of reaction time and control; slurred speech; slowed thinking'],
              ['0.15', 'Major loss of balance; vomiting may occur']
            ]
          },
          paras: ['A student reads the table and says: “At 0.07 I’m okay, because 0.08 is where problems begin.”']
        },
        prompt: 'What does the table actually show?',
        opts: [
          ['a', 'Effects start at low BAC and build gradually. 0.08 is a legal limit for adult drivers, not the point where impairment begins.'],
          ['b', 'The student is right: judgment, attention and reaction time stay normal until BAC reaches the 0.08 legal limit, and only then do problems start.'],
          ['c', 'Every person experiences exactly the effects listed at each level, so the table predicts impairment precisely.'],
          ['d', 'At 0.02 only mild mood changes are listed, so the table shows that driving is safe at that level.']
        ],
        ans: 'a',
        explain: 'Even small amounts affect judgment and attention. Laws set limits for enforcement (and drivers under 21 face zero-tolerance rules), but the body does not have a switch at 0.08.'
      }
    },
    {
      kind: 'q', block: 'm3-late',
      q: {
        id: 'a-myth', domain: 'alcohol', topic: 'Myths about sobering up', lo: 'Classify claims about alcohol as myth, fact or context-dependent',
        type: 'sort', lvl: 'R', dok: 2, pts: 2, sec: 70,
        misc: 'Coffee, cold showers, exercise or sleep “sober someone up”',
        prompt: 'Sort each claim: Myth, Fact, or Depends on the situation.',
        bins: [['myth', 'Myth'], ['fact', 'Fact'], ['dep', 'Depends on the situation']],
        items: [
          ['m1', 'Strong coffee sobers a person up.'],
          ['m2', 'Exercising burns alcohol off faster.'],
          ['m3', 'Only time lowers a person’s BAC.'],
          ['m4', 'A person who feels fine can still be impaired.'],
          ['m5', 'Eating before drinking can slow how fast alcohol enters the blood.'],
          ['m6', 'Three drinks will put someone over the legal driving limit.'],
          ['m7', 'A cold shower helps the body remove alcohol.']
        ],
        ans: { m1: 'myth', m2: 'myth', m3: 'fact', m4: 'fact', m5: 'fact', m6: 'dep', m7: 'myth' },
        explain: 'Coffee, showers and exercise can make a person feel more awake but do not remove alcohol. Only time lowers BAC. Whether a specific number of drinks passes a limit depends on body size, time, food and other factors.'
      }
    },
    {
      kind: 'q', block: 'm3-late',
      q: {
        id: 'a-long', domain: 'alcohol', topic: 'Longer-term effects; alcohol use disorder', lo: 'Identify long-term health effects of heavy, repeated drinking',
        type: 'multi', lvl: 'R', dok: 1, pts: 1, sec: 40,
        misc: 'Alcohol problems are only about a hangover or one-night risks',
        prompt: 'Select ALL health effects linked to heavy, repeated drinking over time.',
        opts: [
          ['a', 'Liver disease'],
          ['b', 'High blood pressure and heart problems'],
          ['c', 'Higher risk of several cancers'],
          ['d', 'Stronger bones and a stronger immune system'],
          ['e', 'Greater risk of alcohol use disorder'],
          ['f', 'Better long-term memory']
        ],
        ans: ['a', 'b', 'c', 'e'],
        explain: 'Heavy, long-term drinking is linked to liver disease, heart problems, several cancers and alcohol use disorder, a treatable medical condition.'
      }
    },
    {
      kind: 'pool', id: 'alc-scen',
      groups: [
        {
          pick: 1, items: [
            {
              kind: 'q', q: {
                id: 'as-drive', domain: 'alcohol', topic: 'Impaired driving', lo: 'Choose a safe response to an impaired driver',
                type: 'mc', lvl: 'AP', dok: 3, pts: 2, sec: 55,
                misc: 'Feeling fine means able to drive; waiting a short time is enough',
                stim: { title: 'Scene', paras: ['At 11:40 p.m., Riley, the driver for four friends, says: “I only had two drinks an hour ago and I feel fine. We’re leaving.”'] },
                prompt: 'Which response is best?',
                opts: [
                  ['a', 'Riley may be impaired even while feeling fine, so find another ride: a sober driver, a parent or a rideshare.'],
                  ['b', 'Have Riley drink water and wait twenty minutes, then let Riley drive slowly using quiet back roads.'],
                  ['c', 'Ask Riley to walk a straight line, and if that goes well, accept the ride and buckle up.'],
                  ['d', 'Ride along but sit in the back seat and keep a phone ready in case Riley begins to drive badly on the way home.']
                ],
                ans: 'a',
                explain: 'Feeling fine is not a reliable test, and judgment is one of the first things alcohol affects. Walking tests, water and slow driving do not remove the risk. A different ride does.'
              }
            },
            {
              kind: 'q', q: {
                id: 'as-consent', domain: 'alcohol', topic: 'Consent and capacity', lo: 'Explain how alcohol affects the ability to consent',
                type: 'mc', lvl: 'AP', dok: 3, pts: 2, sec: 55,
                misc: 'An earlier “yes” or an intoxicated “yes” counts as consent',
                stim: { title: 'Scene', paras: ['At a gathering, Alex is slurring, cannot stand without help, and has trouble answering simple questions. Someone says, “Alex said yes earlier, so it’s fine.”'] },
                prompt: 'What does Alex’s level of impairment mean for consent?',
                opts: [
                  ['a', 'Heavy impairment means Alex cannot give meaningful consent, and an earlier yes does not change that. Keep Alex safe and get help.'],
                  ['b', 'Consent is valid as long as Alex said yes at any point during the evening, even if Alex later became heavily impaired and could not decide.'],
                  ['c', 'Alcohol makes people more honest, so whatever Alex says while impaired is more reliable than usual.'],
                  ['d', 'It depends only on whether Alex seems cheerful, since consent is mostly about a person’s mood.']
                ],
                ans: 'a',
                explain: 'Consent requires the ability to understand and decide. Heavy impairment removes that capacity, and consent can be withdrawn at any time.'
              }
            },
            {
              kind: 'q', q: {
                id: 'as-poison', domain: 'alcohol', topic: 'Alcohol poisoning and emergency response', lo: 'Recognize alcohol poisoning and respond',
                type: 'mc', lvl: 'AP', dok: 3, pts: 2, sec: 55,
                misc: 'Letting someone “sleep it off” is safe',
                stim: { title: 'Scene', paras: ['Taylor has been vomiting and is now hard to wake. Breathing is slow, with long pauses, and Taylor’s skin looks pale and bluish. A friend says, “Just let Taylor sleep it off.”'] },
                prompt: 'What is the best action?',
                opts: [
                  ['a', 'Call 911 right away, stay with Taylor, and turn Taylor onto their side while waiting for help to arrive.'],
                  ['b', 'Let Taylor sleep on their back and check again in an hour to see whether breathing has improved.'],
                  ['c', 'Give Taylor strong coffee and a cold shower so Taylor wakes up and the alcohol wears off faster.'],
                  ['d', 'Give Taylor extra water and wait about an hour; call for help only if Taylor stops breathing completely.']
                ],
                ans: 'a',
                explain: 'Being hard to wake, slow or irregular breathing, vomiting and pale or bluish skin are signs of alcohol poisoning, which can stop breathing. This is an emergency: call 911, stay, and keep the airway clear.'
              }
            },
            {
              kind: 'q', q: {
                id: 'as-aggr', domain: 'alcohol', topic: 'Conflict and aggression', lo: 'Explain how alcohol affects emotional control and conflict',
                type: 'mc', lvl: 'AP', dok: 3, pts: 2, sec: 55,
                misc: '“Alcohol just shows who someone really is”',
                stim: { title: 'Scene', paras: ['After drinking, Chris starts arguing, gets louder and shoves a friend. Another friend shrugs: “That’s just Chris being Chris.”'] },
                prompt: 'Which statement is best supported by what is known about alcohol?',
                opts: [
                  ['a', 'Alcohol impairs judgment and emotional control, so conflict can escalate faster. Separate people and get an adult.'],
                  ['b', 'Alcohol reveals a person’s true personality, so shoving is just who Chris really is and nothing can change it.'],
                  ['c', 'Alcohol only changes behavior in people who were already angry, so the safest move is to ignore it.'],
                  ['d', 'Matching Chris’s volume with a louder argument is the fastest way to calm him down and end the conflict.']
                ],
                ans: 'a',
                explain: 'Alcohol impairs the brain areas that regulate impulses and emotions. De-escalating, creating distance and involving an adult lowers the risk of injury.'
              }
            }
          ]
        },
        {
          pick: 1, items: [
            {
              kind: 'q', q: {
                id: 'ae-black', domain: 'alcohol', topic: 'Blackouts and memory', lo: 'Explain alcohol-related memory loss',
                type: 'mc', lvl: 'AP', dok: 2, pts: 2, sec: 50,
                misc: 'A blackout means the person was unconscious',
                stim: { title: 'Scene', paras: ['The next morning, Sam cannot remember a large part of the night, though friends say Sam was walking, talking and answering questions.'] },
                prompt: 'Which explanation fits best?',
                opts: [
                  ['a', 'Alcohol interfered with Sam’s ability to form new memories, so those events were never stored. This is a blackout.'],
                  ['b', 'Sam must have been unconscious for most of the night, since a person who is awake always remembers it.'],
                  ['c', 'Alcohol permanently erased Sam’s older memories, which is why Sam cannot recall the evening or earlier events.'],
                  ['d', 'Sam is probably pretending to forget, because walking and talking would mean the brain was recording normally.']
                ],
                ans: 'a',
                explain: 'In a blackout, a person can act awake but the brain is not recording new memories. It usually follows heavy, rapid drinking and signals serious impairment.'
              }
            },
            {
              kind: 'q', q: {
                id: 'ae-meds', domain: 'alcohol', topic: 'Medications and alcohol', lo: 'Explain medication interactions with alcohol',
                type: 'mc', lvl: 'AP', dok: 2, pts: 2, sec: 50,
                misc: 'One drink with a medication is always harmless',
                stim: { title: 'Scene', paras: ['Jordan takes a prescribed medication that causes drowsiness. At a family event Jordan thinks, “One drink can’t hurt.”'] },
                prompt: 'What is the most accurate response?',
                opts: [
                  ['a', 'Alcohol can interact with many medications and increase drowsiness. Jordan should follow the label and ask a pharmacist.'],
                  ['b', 'Medications and alcohol do not interact when the dose of each is small, so one drink is fine.'],
                  ['c', 'Alcohol makes drowsy medications work better, so the combination is helpful when a person is having trouble sleeping at night.'],
                  ['d', 'Interactions only matter for illegal drugs, so a prescribed medication and a drink cannot affect each other.']
                ],
                ans: 'a',
                explain: 'Alcohol interacts with many prescription and over-the-counter medications and can intensify sedation or other risks. A pharmacist or clinician can say what applies to a specific medication.'
              }
            },
            {
              kind: 'q', q: {
                id: 'ae-binge', domain: 'alcohol', topic: 'Binge drinking', lo: 'Define binge drinking using the BAC-based definition',
                type: 'mc', lvl: 'AP', dok: 2, pts: 2, sec: 50,
                misc: 'Binge drinking means drinking every weekend, or only liquor',
                stim: { title: 'Scene', paras: ['A health class is discussing what “binge drinking” means. Four students give four definitions.'] },
                prompt: 'Which description best matches binge drinking?',
                opts: [
                  ['a', 'Drinking enough, quickly enough, to bring BAC to 0.08 g/dL or higher, usually in about two hours. Smaller or younger people reach it with fewer drinks.'],
                  ['b', 'Drinking on every single weekend regardless of the number of drinks, because the repeated weekly pattern is what defines a binge in health class.'],
                  ['c', 'Drinking only hard liquor, because spirits are the only kind of alcohol strong enough to count as a binge.'],
                  ['d', 'Drinking alone, because drinking without anyone else around is what separates a binge from social drinking.']
                ],
                ans: 'a',
                explain: 'Binge drinking is defined by the pattern and the BAC it produces, not by the type of drink. It raises risk of injury, alcohol poisoning and blackouts.'
              }
            },
            {
              kind: 'q', q: {
                id: 'ae-factors', domain: 'alcohol', topic: 'Factors affecting impairment', lo: 'Identify factors that change how alcohol affects a person',
                type: 'multi', lvl: 'AP', dok: 2, pts: 2, sec: 55,
                misc: 'Only the number of drinks matters',
                stim: { title: 'Scene', paras: ['Two students at the same event each report having “three drinks.” One is clearly more impaired than the other.'] },
                prompt: 'Select ALL factors that can explain a difference in how impaired the two students are.',
                opts: [
                  ['a', 'How quickly each student drank'],
                  ['b', 'Body size and composition'],
                  ['c', 'Whether each student had eaten'],
                  ['d', 'Medications each student takes'],
                  ['e', 'How confident each student feels about their limits'],
                  ['f', 'The color of the drinks']
                ],
                ans: ['a', 'b', 'c', 'd'],
                explain: 'Pace, body size, food, medications and individual differences all matter, as does the actual amount. Feeling confident is not a factor and can be misleading because alcohol affects judgment.'
              }
            }
          ]
        }
      ]
    }
  ]
};
