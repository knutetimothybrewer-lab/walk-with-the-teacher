// MISSION 7: CLAIM VERIFICATION LAB (health literacy)
const CLASS_OPTS = [['sup', 'SUPPORTED'], ['par', 'PARTIALLY SUPPORTED / MISLEADING'], ['not', 'NOT SUPPORTED']];
const cls = (id, topic, ans, explain) => ({
  id, domain: 'literacy', topic, lo: 'Judge how well the evidence supports a health claim',
  type: 'mc', lvl: 'I', dok: 3, pts: 1, sec: 40, pin: [],
  misc: 'Treating a claim as simply true or false rather than judging the evidence',
  prompt: 'Based on the evidence on the board, how well is the claim supported?',
  opts: CLASS_OPTS, ans, explain, fixedOrder: true
});
const fix = (id, topic, lo, misc, opts, explain, after) => ({
  id, domain: 'literacy', topic, lo, type: 'mc', lvl: 'AN', dok: 3, pts: 1, sec: 45, after,
  misc, prompt: 'Which rewrite is most accurate?', opts, ans: 'a', explain
});

export default {
  id: 'm7', num: 7, title: 'Claim Verification Lab', theme: 'claim', est: 5,
  kicker: 'MISSION 7',
  blurb: 'Posts, headlines and graphs all claim to be evidence. Your job is to decide what the evidence actually supports.',
  stages: [
    {
      kind: 'pool', id: 'claims',
      groups: [
        {
          pick: 1, items: [
            {
              kind: 'scene', scene: 'board', id: 'cl-vapor-s', title: 'Evidence board: “Just vapor”',
              cfg: {
                cards: [
                  { type: 'post', who: '@chillvibes_44', text: 'Vaping is just flavored water vapor. Totally harmless. People are being dramatic.', note: 'Social media post, 12K likes' },
                  { type: 'excerpt', src: 'U.S. Surgeon General’s report on e-cigarette use among youth', text: 'E-cigarette aerosol is not harmless. It can contain nicotine, ultrafine particles that reach deep into the lungs, flavorings linked to lung disease, and heavy metals.' }
                ]
              },
              qs: [
                cls('cl1c', 'Evaluating claims: vaping aerosol', 'not', 'The claim says “harmless.” The source says the aerosol can contain nicotine, fine particles, flavoring chemicals and metals. The claim is contradicted by the evidence.'),
                fix('cl1f', 'Rewriting misleading claims', 'Choose the most accurate rewrite of a claim', 'Over-correcting into a different exaggeration', [
                  ['a', 'E-cigarettes make an aerosol, not just water vapor. It can contain nicotine and other harmful chemicals.'],
                  ['b', 'E-cigarettes are exactly as harmful as cigarettes in every way, so the aerosol is the same as smoke.'],
                  ['c', 'E-cigarette aerosol is harmless as long as the liquid is flavored and the device is a name-brand product.'],
                  ['d', 'Nobody knows what is in e-cigarette aerosol, so no statement about it can be supported by evidence.']
                ], 'An accurate rewrite fixes the exaggeration without swinging to another one. Aerosol contains more than water, and the products are not identical to cigarettes in every way.', 'cl1c')
              ]
            },
            {
              kind: 'scene', scene: 'board', id: 'cl-nat-s', title: 'Evidence board: “Natural” cannabis',
              cfg: {
                cards: [
                  { type: 'post', who: '@greenroom_daily', text: 'Cannabis is 100% natural, so it can’t hurt your brain. Big pharma just wants you scared.', note: 'Social media post' },
                  { type: 'excerpt', src: 'National Institute on Drug Abuse (NIDA)', text: 'Cannabis use during adolescence can affect attention, memory and learning, and starting at a young age and using often raise the risk of cannabis use disorder.' }
                ]
              },
              qs: [
                cls('cl2c', 'Evaluating claims: “natural”', 'not', 'Being natural does not make something safe (many natural substances are poisonous). The NIDA excerpt describes effects on attention, memory and learning and a risk of cannabis use disorder, so the claim is not supported.'),
                fix('cl2f', 'Rewriting misleading claims', 'Choose the most accurate rewrite of a claim', 'Over-correcting into scare language', [
                  ['a', 'Cannabis comes from a plant, but natural does not mean harmless. In teens it can affect attention, memory and learning.'],
                  ['b', 'Cannabis permanently destroys the brain of everyone who tries it, even once, so no use is ever acceptable.'],
                  ['c', 'Cannabis is harmless to teens and risky only for adults, since adolescent brains are better at recovering.'],
                  ['d', 'Cannabis has no effect on the brain because it is a natural plant product and not a manufactured drug.']
                ], 'A good rewrite is specific and accurate, without scare language. Effects vary by dose, potency, age and other factors.', 'cl2c')
              ]
            },
            {
              kind: 'scene', scene: 'board', id: 'cl-narcan-s', title: 'Evidence board: “Narcan fixes everything”',
              cfg: {
                cards: [
                  { type: 'post', who: '@realtalk_rx', text: 'If someone gets Narcan they’re totally fine afterward. No need for a hospital. It’s basically a cure.', note: 'Social media post' },
                  { type: 'excerpt', src: 'Substance Abuse and Mental Health Services Administration (SAMHSA)', text: 'The effects of naloxone last about 30 to 90 minutes, and some opioids, including fentanyl, can stay active longer. Call 911 and stay with the person, because more than one dose may be needed and the overdose can return.' }
                ]
              },
              qs: [
                cls('cl3c', 'Evaluating claims: naloxone', 'not', 'The excerpt says naloxone is temporary and that emergency care is still needed, so “fine afterward, no hospital, a cure” is not supported.'),
                fix('cl3f', 'Rewriting misleading claims', 'Choose the most accurate rewrite of a claim', 'Over-correcting: naloxone does not work', [
                  ['a', 'Naloxone can temporarily reverse an opioid overdose, but its effects can wear off, so call 911 and stay with the person.'],
                  ['b', 'Naloxone does not work in modern overdoses and should not be used, because fentanyl cannot be reversed at all.'],
                  ['c', 'Naloxone permanently cures an overdose in one dose, but a hospital visit afterward is still a polite idea.'],
                  ['d', 'Naloxone should be used instead of calling 911, because it solves the emergency without anyone else involved.']
                ], 'Naloxone is a valuable, temporary tool. It is not a substitute for emergency care.', 'cl3c')
              ]
            }
          ]
        },
        {
          pick: 1, items: [
            {
              kind: 'scene', scene: 'board', id: 'cl-corr-s', title: 'Evidence board: “Vaping lowers grades”',
              cfg: {
                cards: [
                  { type: 'headline', text: 'STUDY PROVES VAPING CAUSES TEENS’ GRADES TO DROP', src: 'Daily Feed News' },
                  { type: 'excerpt', src: 'Study summary (one-time survey of 400 students at one school)', text: 'Students who reported vaping had a lower average GPA than students who did not. Researchers noted that they could not rule out other explanations, such as stress, sleep, or mental health, which were not measured.' }
                ]
              },
              qs: [
                cls('cl4c', 'Evaluating claims: correlation vs. causation', 'par', 'The study found an association (vapers had lower average GPA). It was a one-time survey that did not measure other factors, so it cannot show that vaping caused the grades to drop. The headline overstates it.'),
                {
                  id: 'cl4f', domain: 'literacy', topic: 'Correlation vs. causation', lo: 'Identify what is missing from a causal claim',
                  type: 'multi', lvl: 'AN', dok: 3, pts: 1, sec: 50, after: 'cl4c',
                  misc: 'Association proves cause',
                  prompt: 'Select ALL pieces of information that are missing or exaggerated in the headline.',
                  opts: [
                    ['a', 'The study found an association, not proof that vaping causes lower grades.'],
                    ['b', 'Stress, sleep or mental health might explain both vaping and lower grades.'],
                    ['c', 'A one-time survey cannot show which came first.'],
                    ['d', 'The study included exactly 400 students.'],
                    ['e', 'The headline was printed in capital letters.']
                  ],
                  ans: ['a', 'b', 'c'],
                  explain: 'Association is not causation. Other factors might drive both, and a single survey cannot show the order of events. Sample size and capital letters are details, not the main problems.'
                }
              ]
            },
            {
              kind: 'scene', scene: 'board', id: 'cl-solved-s', title: 'Evidence board: “Teen vaping is solved”',
              cfg: {
                cards: [
                  { type: 'graph', chart: 'youthMini', caption: 'High school e-cigarette use, selected years (NYTS)' },
                  { type: 'post', who: '@policy_hottake', text: 'Teen vaping fell from 27.5% to 7.8%. The problem is SOLVED. Time to stop wasting money on prevention.', note: 'Social media post' }
                ]
              },
              qs: [
                cls('cl5c', 'Evaluating claims: trend vs. “solved”', 'par', 'The decline in the graph is real, so part of the post is supported. But 7.8% is still a substantial number of students, and a graph of past use cannot show that prevention efforts are no longer needed. “Solved” is an exaggeration.'),
                {
                  id: 'cl5f', domain: 'literacy', topic: 'Interpreting statistics', lo: 'Identify what a trend graph cannot support',
                  type: 'multi', lvl: 'AN', dok: 3, pts: 1, sec: 50, after: 'cl5c',
                  misc: 'A decline means the problem has ended',
                  prompt: 'Select ALL statements the graph does NOT support.',
                  opts: [
                    ['a', 'The problem has been solved.'],
                    ['b', 'Prevention is no longer needed.'],
                    ['c', 'High school e-cigarette use was lower in 2024 than in 2019.'],
                    ['d', 'The decline was caused entirely by prevention spending.']
                  ],
                  ans: ['a', 'b', 'd'],
                  explain: 'The graph shows a decline. It does not show that the problem is solved, that prevention is unneeded, or why use fell.'
                }
              ]
            },
            {
              kind: 'scene', scene: 'board', id: 'cl-fake-s', title: 'Evidence board: “Fake pills”',
              cfg: {
                cards: [
                  { type: 'post', who: '@healthteacher_ms', text: 'Counterfeit pills can look just like real prescription pills, and some contain fentanyl.', note: 'Post from a school health educator' },
                  { type: 'excerpt', src: 'U.S. Drug Enforcement Administration (DEA)', text: 'Counterfeit pills are made to look like real prescription medications. DEA laboratory testing found that about 5 in 10 pills tested in 2024 contained a potentially lethal dose of fentanyl, and amounts varied widely from pill to pill.' }
                ]
              },
              qs: [
                cls('cl6c', 'Evaluating claims: counterfeit pills', 'sup', 'The claim is modest, matches the DEA excerpt, and does not overstate. It is supported.'),
                fix('cl6f', 'Evidence vs. exaggeration', 'Choose an accurate extension of a supported claim', 'Over-generalizing a statistic to “every pill”', [
                  ['a', 'The amount of fentanyl can vary a lot from one counterfeit pill to the next, even in the same batch.'],
                  ['b', 'Every counterfeit pill contains a lethal dose of fentanyl, so any fake pill will cause an overdose.'],
                  ['c', 'Counterfeit pills are only a problem in big cities, where more people are able to buy them.'],
                  ['d', 'You can tell a counterfeit pill apart from a real one by checking its color and imprint carefully.']
                ], 'The DEA found that amounts vary widely. “Every pill” would exaggerate, and color cannot reliably tell a fake pill apart from a real one.', 'cl6c')
              ]
            }
          ]
        }
      ]
    },
    {
      kind: 'scene', scene: 'board', id: 'sim-evidence', title: 'Simulation E: The Evidence Lab',
      lead: 'One viral claim. Five pieces of evidence. Decide what the evidence actually supports.',
      cfg: {
        claim: 'Teens are quitting. Nicotine isn’t a problem for young people anymore.',
        cards: [
          { type: 'graph', chart: 'youthMini', caption: 'High school e-cigarette use, selected years (NYTS)' },
          { type: 'headline', text: 'YOUTH E-CIGARETTE USE FALLS TO LOWEST LEVEL IN A DECADE', src: 'National news site' },
          { type: 'post', who: '@vapeshop_deals', text: 'See? Nobody under 21 even cares about nicotine anymore! Come shop our new flavors.', note: 'Post by a vape retailer' },
          { type: 'excerpt', src: 'CDC / FDA National Youth Tobacco Survey, 2024', text: 'About 1.6 million U.S. middle and high school students (5.9%) reported current e-cigarette use in 2024. Nicotine pouch use was 1.8%.' },
          { type: 'excerpt', src: 'U.S. Surgeon General', text: 'Nicotine exposure during adolescence can harm brain development and increase the risk of addiction.' }
        ]
      },
      qs: [
        {
          id: 'el1', domain: 'literacy', topic: 'Source credibility', lo: 'Rank sources by credibility',
          type: 'seq', lvl: 'AN', dok: 3, pts: 1, sec: 40,
          misc: 'Treating popularity or a confident tone as credibility',
          prompt: 'Rank these sources from MOST credible (top) to LEAST credible (bottom) for this question.',
          steps: [
            ['k1', 'A CDC/FDA survey report that explains its methods and shows data tables.'],
            ['k2', 'A news article that quotes the CDC/FDA report accurately.'],
            ['k3', 'A vape retailer’s promotional post.'],
            ['k4', 'An anonymous comment with no source.']
          ],
          ans: ['k1', 'k2', 'k3', 'k4'],
          explain: 'A primary report with methods and data is the most reliable. A news article summarizing it is next. A seller has a financial interest. An anonymous comment gives no way to check anything.'
        },
        {
          id: 'el2', domain: 'literacy', topic: 'Evaluating claims: missing context and exaggeration', lo: 'Classify a viral claim using multiple pieces of evidence',
          type: 'mc', lvl: 'AN', dok: 3, pts: 2, sec: 55,
          misc: 'A true statistic proves the larger claim',
          prompt: 'How well does the evidence support the claim, “Teens are quitting. Nicotine isn’t a problem for young people anymore”?',
          opts: CLASS_OPTS, ans: 'par', fixedOrder: true,
          explain: 'Youth e-cigarette use did fall, so part of the claim is supported. But about 1.6 million students still reported use in 2024, other nicotine products exist, and the Surgeon General’s evidence on brain harm has not changed. “Not a problem anymore” exaggerates a real decline and leaves out important context.'
        }
      ]
    }
  ]
};
