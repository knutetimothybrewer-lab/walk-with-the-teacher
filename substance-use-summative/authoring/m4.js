// MISSION 4: SUBSTANCE RISK INVESTIGATION (cannabis, prescription medications, other drug concepts)
export default {
  id: 'm4', num: 4, title: 'Substance Risk Investigation', theme: 'cannabis', est: 5,
  kicker: 'MISSION 4',
  blurb: 'No two situations are identical. Dose, form, timing and the person all change the picture. Look at the evidence, not the label.',
  stages: [
    {
      kind: 'q', block: 'm4-a',
      q: {
        id: 'c1', domain: 'cannabisRx', topic: 'Cannabis: variation in effects', lo: 'Identify factors that change how cannabis affects a person',
        type: 'multi', lvl: 'R', dok: 2, pts: 1, sec: 50,
        misc: 'Cannabis affects everyone the same way; “natural” means harmless',
        prompt: 'Select ALL factors that can change how cannabis affects a person.',
        opts: [
          ['a', 'The dose (how much THC)'],
          ['b', 'The potency of the product (THC concentration)'],
          ['c', 'How it is taken (for example inhaled or eaten)'],
          ['d', 'How often the person uses it'],
          ['e', 'Individual factors such as age, mental health, and other substances used'],
          ['f', 'Whether the product is described as “natural”'],
          ['g', 'How confident the person feels that they can handle it']
        ],
        ans: ['a', 'b', 'c', 'd', 'e'],
        explain: 'Dose, potency, route, frequency and individual factors all matter. “Natural” describes a source, not safety, and feeling confident does not predict how someone will be affected.'
      }
    },
    {
      kind: 'pool', id: 'cann-scen',
      groups: [{
        pick: 1, items: [
          {
            kind: 'q', q: {
              id: 'cs-drive', domain: 'cannabisRx', topic: 'Cannabis and driving', lo: 'Evaluate a claim that cannabis does not affect driving',
              type: 'mc', lvl: 'AP', dok: 3, pts: 3, sec: 65,
              misc: '“I feel fine” / “it’s natural” means able to drive',
              stim: { title: 'Scene', paras: ['An older cousin used cannabis a couple of hours ago and says, “I feel totally fine to drive. It’s natural, and I’ve done this a hundred times.”'] },
              prompt: 'Which statement best uses the evidence?',
              opts: [
                ['a', 'Cannabis can slow reaction time and impair attention, coordination and judgment even when a person feels fine. Experience does not remove that.'],
                ['b', 'Because cannabis comes from a plant, it does not affect driving, so the cousin’s confidence and the fact that it is natural are reliable guides to safety.'],
                ['c', 'Cannabis only affects driving in people who have never used it before, so someone with experience is safe to drive.'],
                ['d', 'If the cousin can hold a normal conversation and follow directions, that shows driving skills are unaffected.']
              ],
              ans: 'a',
              explain: 'Cannabis affects attention, reaction time, coordination and judgment, and people are poor judges of their own impairment. Being experienced may change how impaired someone feels, not how well they drive.'
            }
          },
          {
            kind: 'scene', scene: 'chart', id: 'cs-edible-scene', title: 'Illustration: how timing differs by route',
            cfg: { chart: 'route' },
            lead: 'A simplified illustration (not measured data) of how the strength of effects changes over time for two ways of taking cannabis. Individual timing varies a lot.',
            qs: [{
              id: 'cs-edible', domain: 'cannabisRx', topic: 'Cannabis: route and timing', lo: 'Use a timing model to explain a risk of edibles',
              type: 'mc', lvl: 'AP', dok: 3, pts: 3, sec: 65,
              misc: 'Edibles act as fast as inhaled products; “nothing happened yet” means take more',
              prompt: 'An adult relative ate a cannabis edible 40 minutes ago, feels nothing yet, and says, “I’ll take another one.” Which statement best uses the illustration?',
              opts: [
                ['a', 'Eaten cannabis can take a long time to start and then last for hours, so taking more can lead to a much stronger effect than expected.'],
                ['b', 'Edibles work faster than inhaled cannabis, so no effect after 40 minutes means the product is weak and a second dose is fine.'],
                ['c', 'Eaten and inhaled cannabis have the same timing, so the only way to know the strength is to take more and see.'],
                ['d', 'Edibles are always weaker than other forms, so taking a second one a short time later is safe for almost anyone.']
              ],
              ans: 'a',
              explain: 'Eaten cannabis can take from 30 minutes to a couple of hours to produce effects, which can then last for hours. Taking more because “nothing happened” is a common way people end up with an unexpectedly strong reaction.'
            }]
          },
          {
            kind: 'q', q: {
              id: 'cs-teen', domain: 'cannabisRx', topic: 'Cannabis, the adolescent brain and cannabis use disorder', lo: 'Draw a cautious conclusion about frequent adolescent cannabis use',
              type: 'mc', lvl: 'AP', dok: 3, pts: 3, sec: 65, pin: ['d'],
              misc: 'Diagnosing a disorder from limited information; or “natural, so harmless”',
              stim: { title: 'Scene', paras: ['Dana, 15, has been using cannabis most days. Dana has noticed trouble concentrating and remembering things at school and says, “It’s natural, so it can’t hurt me.”'] },
              prompt: 'Which conclusion is best supported by this information?',
              opts: [
                ['a', 'Frequent teen use is linked with attention and memory problems and a higher risk of cannabis use disorder, but these details alone cannot confirm a disorder.'],
                ['b', 'Dana definitely has cannabis use disorder, because trouble concentrating and remembering at school is exactly how clinicians diagnose the disorder.'],
                ['c', 'Because cannabis is natural, the trouble with concentration and memory must come from another cause, such as school stress alone.'],
                ['d', 'There is not enough information to say that cannabis could be related to any of Dana’s experiences at school.']
              ],
              ans: 'a',
              explain: 'Cannabis can affect attention, memory and learning, and the adolescent brain is still developing. Starting young and using often raise the risk of cannabis use disorder, but only a professional can say whether a disorder is present.'
            }
          }
        ]
      }]
    },
    {
      kind: 'q', block: 'm4-b',
      q: {
        id: 'r1', domain: 'cannabisRx', topic: 'Prescription medications: use vs. misuse', lo: 'Classify scenarios as appropriate medical use or misuse',
        type: 'sort', lvl: 'I', dok: 2, pts: 2, sec: 65,
        misc: 'If a doctor prescribed it to someone, anyone can use it safely',
        prompt: 'Sort each situation: appropriate medical use or misuse.',
        bins: [['ok', 'Appropriate medical use'], ['mis', 'Misuse']],
        items: [
          ['p1', 'Taking an antibiotic exactly as prescribed to you.'],
          ['p2', 'Taking a friend’s prescription painkiller for a sore back.'],
          ['p3', 'Taking two pills when the label says one, because the pain is bad.'],
          ['p4', 'Taking a prescribed sleep medicine to feel relaxed at a party.'],
          ['p5', 'Taking your own prescribed pain medicine after surgery, following your doctor’s instructions.'],
          ['p6', 'Finishing off pills left in a family member’s cabinet.']
        ],
        ans: { p1: 'ok', p2: 'mis', p3: 'mis', p4: 'mis', p5: 'ok', p6: 'mis' },
        explain: 'Appropriate use means the right person, the prescribed dose, and the intended purpose. Using someone else’s medication, taking more than prescribed, or using it for a different reason is misuse.'
      }
    },
    {
      kind: 'q', block: 'm4-b',
      q: {
        id: 'r2', domain: 'cannabisRx', topic: 'Stimulant misuse and academic performance', lo: 'Evaluate the belief that prescription stimulants improve studying',
        type: 'mc', lvl: 'AN', dok: 3, pts: 2, sec: 55,
        misc: 'Stimulants are “study drugs” that safely boost anyone’s grades',
        stim: { quote: { who: 'Classmate', text: 'Take one of my ADHD pills tonight. It’ll help you focus and ace the test. It’s prescribed, so it’s safe.' } },
        prompt: 'Which response is most accurate?',
        opts: [
          ['a', 'These are dosed for one person’s diagnosis. Without it they can raise heart rate and blood pressure and disrupt sleep, and they are not shown to improve learning.'],
          ['b', 'It is safe because the pill is FDA approved, and it works like caffeine for anyone who takes it before a test, only a little stronger and longer lasting.'],
          ['c', 'It is safe if only half is taken, because a smaller dose removes the risk of side effects for people without ADHD.'],
          ['d', 'It is risky only for people who have already used illegal drugs, so a first-time student has nothing to worry about.']
        ],
        ans: 'a',
        explain: 'Prescription stimulants can strain the heart and sleep, and taking them without a prescription removes medical oversight. They are not a reliable shortcut to better academic performance.'
      }
    },
    {
      kind: 'q', block: 'm4-c',
      q: {
        id: 'od1', domain: 'cannabisRx', topic: 'Other drug concepts; polysubstance use', lo: 'Match drug categories and combinations to key health concepts, including the “cancel out” myth',
        type: 'match', lvl: 'R', dok: 2, pts: 2, sec: 80,
        misc: 'Hallucinogens only change vision; household products are safe to inhale; uppers cancel downers',
        prompt: 'Match each item to the statement that fits it best.',
        items: [
          ['o1', 'Stimulants such as cocaine or methamphetamine'],
          ['o2', 'Hallucinogens'],
          ['o3', 'Inhalants (household products that are breathed in)'],
          ['o4', 'An opioid combined with alcohol'],
          ['o5', 'Taking an “upper” to cancel out a “downer”']
        ],
        choices: [
          ['q1', 'Speed up body systems and can strain the heart by raising heart rate and blood pressure.'],
          ['q2', 'Change perception, thinking and mood in unpredictable ways that go beyond what a person sees.'],
          ['q3', 'Ordinary products are not safe to breathe in. The fumes can quickly harm the heart, brain and breathing.'],
          ['q4', 'Both slow the brain and breathing, so together the danger is greater than either one alone.'],
          ['q5', 'They do not cancel out. A stimulant can hide how sedated someone is, so the dangers can add up unpredictably.'],
          ['q6', 'Balancing the doses makes the combined effects predictable and much safer.']
        ],
        ans: { o1: 'q1', o2: 'q2', o3: 'q3', o4: 'q4', o5: 'q5' },
        explain: 'Stimulants strain the heart. Hallucinogens alter perception, thinking and mood unpredictably. Inhalants can seriously harm the heart, brain and breathing even when the products are common. Opioids plus alcohol compound breathing depression. Substances do not cancel each other out; a stimulant can mask warning signs while the risks add up.'
      }
    }
  ]
};
