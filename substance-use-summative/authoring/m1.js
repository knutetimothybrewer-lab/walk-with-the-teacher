// MISSION 1: BRAIN & ADDICTION LAB
// Authoring file (contains the answer key). `npm run build` splits this into public content + hashed keys.
// lvl: R = recall/recognition, I = interpretation, AP = application, AN = analysis/evaluation
const MC6 = [
  ['t', 'Tolerance'],
  ['d', 'Physical dependence'],
  ['w', 'Withdrawal'],
  ['r', 'Reinforcement'],
  ['a', 'A substance use disorder (addiction)'],
  ['n', 'Not enough information']
];

export default {
  id: 'm1', num: 1, title: 'Brain & Addiction Lab', theme: 'brain', est: 7,
  kicker: 'MISSION 1',
  blurb: 'Signals, circuits and the developing brain. Some cases are clear. Some are not. Part of your job is knowing the difference.',
  stages: [
    {
      kind: 'q', block: 'm1-warm',
      q: {
        id: 'b1', domain: 'brain', topic: 'Adolescent brain: prefrontal cortex', lo: 'Identify the brain region that supports judgment and impulse control and is still maturing in adolescence',
        type: 'hotspot', lvl: 'R', dok: 1, pts: 1, sec: 30,
        misc: 'Confusing the reward circuit with the brain’s “brake” system',
        prompt: 'Select the region that supports planning, judgment and impulse control, and that keeps maturing into the mid-20s.',
        diagram: 'brain',
        regions: [['pfc', 'Prefrontal cortex'], ['reward', 'Reward circuit'], ['cerebellum', 'Cerebellum'], ['brainstem', 'Brainstem'], ['hippo', 'Hippocampus']],
        ans: 'pfc',
        explain: 'The prefrontal cortex handles planning, judgment and impulse control, and it is one of the last regions to finish maturing (into the mid-20s). Reward circuits are already very responsive in adolescence.'
      }
    },
    {
      kind: 'q', block: 'm1-warm',
      q: {
        id: 'b2', domain: 'brain', topic: 'Neurotransmission', lo: 'Sequence the steps of communication between two neurons',
        type: 'seq', lvl: 'R', dok: 1, pts: 1, sec: 40,
        misc: 'Neurons physically touch and pass the signal directly',
        prompt: 'Put these steps of neuron-to-neuron communication in order, from first to last.',
        steps: [
          ['k1', 'An electrical signal travels down the sending neuron to its end.'],
          ['k2', 'Neurotransmitter molecules are released into the gap (the synapse).'],
          ['k3', 'Neurotransmitters attach to receptors on the receiving neuron.'],
          ['k4', 'The receiving neuron responds, and leftover neurotransmitter is cleared away or recycled.']
        ],
        ans: ['k1', 'k2', 'k3', 'k4'],
        explain: 'Signals move as electricity inside a neuron, then as chemicals (neurotransmitters) across the synapse, then bind to receptors, and are cleared so the signal can end.'
      }
    },
    {
      kind: 'q', block: 'm1-warm',
      q: {
        id: 'b-def', domain: 'brain', topic: 'Tolerance, dependence and withdrawal', lo: 'Match tolerance, physical dependence and withdrawal to their definitions',
        type: 'match', lvl: 'R', dok: 1, pts: 1, sec: 45,
        misc: 'Using tolerance, dependence, withdrawal and addiction as synonyms',
        prompt: 'Match each term to the description that fits it best.',
        items: [['t1', 'Tolerance'], ['t2', 'Physical dependence'], ['t3', 'Withdrawal']],
        choices: [
          ['x1', 'Needing more of a substance over time to get the same effect.'],
          ['x2', 'The body has adapted to a substance and works differently when it is suddenly removed.'],
          ['x3', 'Symptoms that appear when a regularly used substance is stopped or sharply reduced.'],
          ['x4', 'Continued use despite harm, loss of control and failed attempts to cut back.']
        ],
        ans: { t1: 'x1', t2: 'x2', t3: 'x3' },
        explain: 'Tolerance means needing more for the same effect. Physical dependence means the body has adapted. Withdrawal is the set of symptoms after stopping. The fourth description is the pattern of a substance use disorder (addiction), which is different from the other three.'
      }
    },
    {
      kind: 'scene', scene: 'synapse', id: 'syn', title: 'Two synapses, side by side',
      lead: 'Watch both panels. Panel B is a fictional “Substance X” that keeps dopamine in the synapse longer by slowing its clearing. It is a simplified model.',
      qs: [
        {
          id: 'b3', domain: 'brain', topic: 'Dopamine, reward and reinforcement', lo: 'Explain how prolonged dopamine signaling can reinforce repeated use',
          type: 'mc', lvl: 'I', dok: 2, pts: 2, sec: 55,
          misc: 'Believing that substances “damage neurons on first use” rather than strengthening reward learning',
          prompt: 'Using what you saw, which statement best explains why a substance like Substance X could make repeated use more likely?',
          opts: [
            ['a', 'The larger, longer dopamine signal marks the experience as important, so the brain learns to seek it again.'],
            ['b', 'The substance destroys the receiving neuron on first use, so the person is forced to keep using it.'],
            ['c', 'The substance blocks dopamine release entirely, and the resulting craving drives the person to use again.'],
            ['d', 'The extra dopamine strengthens the prefrontal cortex, which makes repeated use feel like a controlled choice.']
          ],
          ans: 'a',
          explain: 'More dopamine for longer means a stronger “this mattered, do it again” signal. That is reinforcement: the brain’s learning system marks the experience as worth repeating.'
        }
      ]
    },
    {
      kind: 'q',
      q: {
        id: 'b4', domain: 'brain', topic: 'Adolescent brain development', lo: 'Evaluate statements about the adolescent brain',
        type: 'mc', lvl: 'I', dok: 2, pts: 1, sec: 40,
        misc: 'Teens “can’t think” vs. teens are fully mature vs. any use means permanent damage',
        prompt: 'Which statement about the adolescent brain is best supported by research?',
        opts: [
          ['a', 'Reward circuits are very responsive while the prefrontal cortex is still maturing, so impulse control can lag behind.'],
          ['b', 'The brain is fully mature by age 14, so risky choices reflect only a teen’s attitude and not anything about brain development.'],
          ['c', 'Teen brains are permanently damaged by any single exposure to a substance and cannot recover.'],
          ['d', 'Adolescents are unable to make good decisions in any situation because their brains are too immature.']
        ],
        ans: 'a',
        explain: 'Adolescent brains are still developing. That makes this a period of greater vulnerability, not a period of inability. Planning ahead and support help.'
      }
    },
    {
      kind: 'pool', id: 'cases',
      groups: [
        {
          pick: 1, items: [
            {
              kind: 'q', q: {
                id: 'c-tol', domain: 'brain', topic: 'Applying tolerance / dependence / withdrawal', lo: 'Distinguish tolerance, dependence, withdrawal, reinforcement and addiction in a case',
                type: 'mc', lvl: 'AP', dok: 3, pts: 3, sec: 65, pin: ['n'],
                misc: 'Treating tolerance as proof of addiction',
                stim: { title: 'Case file: Ari', paras: ['Ari’s first energy drink made Ari feel wired and alert. Over several months, Ari now needs two to feel the same boost; one barely registers. Nothing else is described.'] },
                prompt: 'Which concept does this evidence most directly demonstrate?',
                opts: MC6, ans: 't',
                explain: 'Needing more to get the same effect is tolerance. Nothing here shows stopping symptoms (withdrawal), loss of control, or harm (a substance use disorder).'
              }
            },
            {
              kind: 'q', q: {
                id: 'c-dep', domain: 'brain', topic: 'Applying tolerance / dependence / withdrawal', lo: 'Distinguish physical dependence from addiction in a medical case',
                type: 'mc', lvl: 'AP', dok: 3, pts: 3, sec: 65, pin: ['n'],
                misc: 'Dependence = addiction',
                stim: { title: 'Case file: Maya', paras: ['Maya takes a medication prescribed for a long-term condition, exactly as directed. Her clinician explains that her body has adapted to it, so the dose will be lowered gradually instead of stopped suddenly. Maya has no cravings, takes no extra doses, and the medication helps her function.'] },
                prompt: 'Which concept best describes what the evidence shows?',
                opts: MC6, ans: 'd',
                explain: 'The body has adapted to the medicine (physical dependence), which is why a gradual taper is planned. Taking it as directed, with no cravings, loss of control or harm, is not an addiction pattern.'
              }
            },
            {
              kind: 'q', q: {
                id: 'c-wd', domain: 'brain', topic: 'Applying tolerance / dependence / withdrawal', lo: 'Identify withdrawal from symptoms after stopping',
                type: 'mc', lvl: 'AP', dok: 3, pts: 3, sec: 65, pin: ['n'],
                misc: 'Withdrawal symptoms are just “being in a bad mood”',
                stim: { title: 'Case file: Dev', paras: ['Dev has used a nicotine vape every day for a year. After 36 hours without it on a family trip, Dev is irritable, has trouble concentrating and feels restless until finally using again.'] },
                prompt: 'Which concept do these symptoms, which started after stopping, most directly demonstrate?',
                opts: MC6, ans: 'w',
                explain: 'Symptoms that appear when a regularly used substance is stopped or reduced are withdrawal. They show the body has adapted (dependence), but on their own they do not prove a substance use disorder.'
              }
            },
            {
              kind: 'q', q: {
                id: 'c-rein', domain: 'brain', topic: 'Reinforcement', lo: 'Recognize reinforcement without over-diagnosing addiction',
                type: 'mc', lvl: 'AP', dok: 3, pts: 3, sec: 65, pin: ['n'],
                misc: 'One reward experience equals addiction',
                stim: { title: 'Case file: Lena', paras: ['Lena used a nicotine vape once and felt calm and buzzy. The next day she keeps thinking about it and asks a friend if they have one. She has not used it again.'] },
                prompt: 'Which concept is best supported by this evidence?',
                opts: MC6, ans: 'r',
                explain: 'A rewarding experience followed by thinking about and seeking it again is reinforcement. One use and one day of wanting it is not enough to show dependence or a substance use disorder.'
              }
            }
          ]
        },
        {
          pick: 1, items: [
            {
              kind: 'q', q: {
                id: 'c-sud', domain: 'brain', topic: 'Addiction / substance use disorder', lo: 'Recognize a multi-feature pattern consistent with a substance use disorder',
                type: 'mc', lvl: 'AP', dok: 3, pts: 3, sec: 75, pin: ['n'],
                misc: 'Thinking only physical symptoms define addiction',
                stim: { title: 'Clinician’s summary: Tom, 24 (past 12 months)', paras: ['Tom drinks more than he plans to. He has tried several times to cut back without success. He spends a lot of time getting alcohol and recovering from it. He has given up activities he used to enjoy. He keeps drinking even after it has caused problems at work and with his health.'] },
                prompt: 'Which conclusion do these details best support?',
                opts: [
                  ['t', 'Tolerance is the only concept clearly shown, because Tom needs more alcohol to get the same effect.'],
                  ['r', 'Reinforcement is the only concept clearly shown, because Tom keeps returning to something rewarding.'],
                  ['a', 'The pattern is consistent with a substance use disorder (addiction), which a health professional can assess and treat.'],
                  ['n', 'There is not enough information to say anything about a possible substance use disorder, since only a medical test can show whether one exists.']
                ], ans: 'a',
                explain: 'Several features appear together over time: loss of control, failed attempts to cut back, time spent, giving up activities, and use despite harm. That is the kind of pattern clinicians look for. Treatment works, and a professional makes the formal assessment.'
              }
            },
            {
              kind: 'q', q: {
                id: 'c-ins1', domain: 'brain', topic: 'Not enough evidence', lo: 'Resist labeling addiction from inadequate information',
                type: 'mc', lvl: 'AP', dok: 3, pts: 3, sec: 65, pin: ['n'],
                misc: 'Diagnosing from one detail or a friend’s comment',
                stim: { title: 'Case file: Eli', paras: ['Eli has vaped nearly every day for two weeks. A friend says, “He’s totally addicted.” That is all the information available.'] },
                prompt: 'Which conclusion is best supported by this evidence?',
                opts: MC6, ans: 'n',
                explain: 'Frequent use for two weeks is worth noticing, but it does not show control problems, harm, tolerance, or withdrawal. A friend’s label is an opinion. The responsible conclusion is that there is not enough evidence.'
              }
            },
            {
              kind: 'q', q: {
                id: 'c-ins2', domain: 'brain', topic: 'Not enough evidence', lo: 'Resist labeling addiction from inadequate information',
                type: 'mc', lvl: 'AP', dok: 3, pts: 3, sec: 65, pin: ['n'],
                misc: 'Everyday use of a habit = addiction',
                stim: { title: 'Case file: Zoe', paras: ['Zoe has a cup of coffee every morning and jokes, “I’m so addicted to coffee.” She has never skipped it. Nothing else is described: no symptoms, no problems, no attempts to stop.'] },
                prompt: 'Which conclusion is best supported by this evidence?',
                opts: MC6, ans: 'n',
                explain: 'Using something every day, or calling oneself “addicted” as a joke, is not evidence of a disorder. We would need information about control, harm, and what happens when the person stops.'
              }
            }
          ]
        }
      ]
    },
    {
      kind: 'q', block: 'm1-late',
      q: {
        id: 'b6', domain: 'brain', topic: 'Risk and protective factors', lo: 'Classify factors that raise or lower the chance of substance-related problems',
        type: 'sort', lvl: 'I', dok: 2, pts: 2, sec: 70,
        misc: 'Risk factors are destiny; protective factors are “willpower”',
        prompt: 'Sort each factor. Risk factors raise the chance of problems. Protective factors lower it. Some depend on the situation.',
        bins: [['risk', 'Risk factor'], ['prot', 'Protective factor'], ['dep', 'Depends on the situation']],
        items: [
          ['f1', 'A trusted adult who listens'],
          ['f2', 'Starting substance use at a young age'],
          ['f3', 'A close family history of substance use disorder'],
          ['f4', 'Mentors and coaches who are involved and supportive'],
          ['f5', 'Ongoing stress with no healthy ways to cope'],
          ['f6', 'Clear, consistent rules combined with warm communication'],
          ['f7', 'Easy access to substances at home or nearby'],
          ['f8', 'Changing to a new school']
        ],
        ans: { f1: 'prot', f2: 'risk', f3: 'risk', f4: 'prot', f5: 'risk', f6: 'prot', f7: 'risk', f8: 'dep' },
        explain: 'Risk factors raise the chance of problems and protective factors lower it, but neither is destiny. Some things, like changing schools, can be stressful or can open new support, depending on the situation.'
      }
    },
    {
      kind: 'q', block: 'm1-late',
      q: {
        id: 'b7', domain: 'brain', topic: 'Addiction as a treatable health condition', lo: 'Evaluate a stigmatizing claim using evidence',
        type: 'mc', lvl: 'AN', dok: 3, pts: 2, sec: 55,
        misc: 'Addiction is only a lack of willpower, or recovery is impossible',
        stim: { quote: { who: 'Classmate post', text: 'Addiction is just weak willpower. Anyone could stop tomorrow if they tried hard enough.' } },
        prompt: 'Which response best uses the evidence?',
        opts: [
          ['a', 'Repeated use can change brain circuits for reward and self-control, which makes stopping hard. Addiction is a treatable health condition.'],
          ['b', 'Mostly true. Willpower is the main thing that separates people who recover from people who do not.'],
          ['c', 'Mostly false, but only because addiction is untreatable, and any relapse after treatment proves that the person has failed and will never recover.'],
          ['d', 'It depends on character, so no general statement about addiction can be supported by evidence.']
        ],
        ans: 'a',
        explain: 'Addiction involves changes in brain circuits and many risk and protective factors, not just willpower. It is treatable, and relapse is a common part of a chronic condition, not proof of failure.'
      }
    }
  ]
};
