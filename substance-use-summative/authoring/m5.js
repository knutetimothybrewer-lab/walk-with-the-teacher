// MISSION 5: OVERDOSE RESPONSE (opioids, fentanyl, naloxone, emergency response)
export default {
  id: 'm5', num: 5, title: 'Overdose Response', theme: 'opioid', est: 6,
  kicker: 'MISSION 5',
  blurb: 'In an emergency, the right action is usually simple and fast. Know the signs, know the steps, and do not wait.',
  stages: [
    {
      kind: 'q', block: 'm5-a',
      q: {
        id: 'o1', domain: 'opioid', topic: 'Respiratory depression', lo: 'Locate the part of the brain that controls breathing and explain opioid overdose danger',
        type: 'hotspot', lvl: 'R', dok: 1, pts: 1, sec: 30,
        misc: 'Overdose danger comes from the heart stopping, not slowed breathing',
        prompt: 'Opioids are dangerous in overdose mainly because they slow the signals that control breathing. Select the region that coordinates automatic breathing.',
        diagram: 'brain',
        regions: [['pfc', 'Prefrontal cortex'], ['reward', 'Reward circuit'], ['cerebellum', 'Cerebellum'], ['brainstem', 'Brainstem'], ['hippo', 'Hippocampus']],
        ans: 'brainstem',
        explain: 'The brainstem controls automatic functions such as breathing. Opioids can slow breathing (respiratory depression) until oxygen levels drop dangerously.'
      }
    },
    {
      kind: 'q', block: 'm5-a',
      q: {
        id: 'o3', domain: 'opioid', topic: 'Fentanyl and counterfeit pills', lo: 'Identify evidence that appearance cannot reveal pill contents',
        type: 'mc', lvl: 'AN', dok: 3, pts: 2, sec: 60,
        misc: 'A pill that looks like a pharmacy pill must be real and consistently dosed',
        stim: { quote: { who: 'Student', text: 'Counterfeit pills are safe if they have the same color and imprint as a pharmacy pill.' } },
        prompt: 'Which evidence most directly challenges this claim?',
        opts: [
          ['a', 'Lab testing has found counterfeit pills copied to look like real prescriptions that contain fentanyl, in amounts that vary widely between pills.'],
          ['b', 'Pills from a pharmacy come with printed labels and instructions, which pills from other sellers usually do not have.'],
          ['c', 'Many teens who took pills bought online say they felt fine afterward, so most counterfeit pills seem to be harmless and the warnings are exaggerated.'],
          ['d', 'Counterfeit pills are illegal to sell in every state, which proves that every single one of them is dangerous.']
        ],
        ans: 'a',
        explain: 'Fake pills are made in illegal settings with no quality control, so one pill can have little fentanyl and its twin can have a deadly amount (about 2 mg can be lethal for some people). Color and imprint can be copied. Only a pharmacy-dispensed prescription is reliable.'
      }
    },
    {
      kind: 'q',
      q: {
        id: 'o4', domain: 'opioid', topic: 'Naloxone', lo: 'Distinguish what naloxone does and does not do',
        type: 'sort', lvl: 'R', dok: 2, pts: 2, sec: 70,
        misc: 'Naloxone replaces 911, cures overdose permanently, or harms people who did not take opioids',
        prompt: 'Is each statement about naloxone true or not true?',
        bins: [['t', 'True'], ['f', 'Not true']],
        items: [
          ['n1', 'It can temporarily reverse the effects of an opioid overdose, including slowed breathing.'],
          ['n2', 'It reverses overdoses caused by alcohol alone.'],
          ['n3', 'Using it means you do not need to call 911.'],
          ['n4', 'Its effects can wear off before the opioid does, so overdose signs can return.'],
          ['n5', 'It usually causes serious harm if given to someone who did not take an opioid.'],
          ['n6', 'It treats and cures a substance use disorder.']
        ],
        ans: { n1: 't', n2: 'f', n3: 'f', n4: 't', n5: 'f', n6: 'f' },
        explain: 'Naloxone works only on opioids and its effect is temporary (often 30 to 90 minutes), so emergency care is still needed. It has no meaningful effect if no opioid is present, and it does not treat addiction.'
      }
    },
    {
      kind: 'scene', scene: 'overdose', id: 'sim-od', title: 'Simulation C: Emergency at the apartment',
      lead: 'This is a fictional emergency. Observe the scene, then decide. In a real emergency, every minute without breathing matters.',
      qs: [
        {
          id: 'ov1', domain: 'opioid', topic: 'Overdose warning signs', lo: 'Recognize signs of an opioid overdose among distractors',
          type: 'multi', lvl: 'R', dok: 2, pts: 2, sec: 50, after: '@sim',
          misc: 'Any very sleepy person is just “resting”',
          prompt: 'Which observations in the scene are warning signs of an opioid overdose? Select ALL.',
          opts: [
            ['a', 'Does not respond to shouting or shaking'],
            ['b', 'Breathing is very slow or has stopped'],
            ['c', 'Gurgling or snoring-like sounds'],
            ['d', 'Lips and skin look pale, blue or gray'],
            ['e', 'A phone nearby is playing music'],
            ['f', 'A drink is spilled on the table'],
            ['g', 'The person is talking quickly and sweating']
          ],
          ans: ['a', 'b', 'c', 'd'],
          explain: 'Unresponsiveness, slow or stopped breathing, gurgling or snoring sounds, and pale, blue or gray skin are classic warning signs. The phone and the spilled drink are irrelevant, and fast talking and sweating point away from opioid overdose.'
        },
        {
          id: 'ov2', domain: 'opioid', topic: 'Immediate help-seeking', lo: 'Choose immediate emergency action over waiting',
          type: 'mc', lvl: 'I', dok: 2, pts: 1, sec: 30, after: 'ov1',
          misc: 'Waiting to see if the person wakes up, or finding out what was taken first',
          prompt: 'The person is unresponsive and barely breathing. Which single action should happen immediately?',
          opts: [
            ['a', 'Call 911 right away, or have someone else call while you stay with the person.'],
            ['b', 'Wait ten minutes to see whether the person wakes up on their own before calling.'],
            ['c', 'Find out exactly what was taken before doing anything else, so you can tell the dispatcher.'],
            ['d', 'Text a friend for advice and wait for a reply before you decide what to do.']
          ],
          ans: 'a',
          explain: 'Every minute without enough oxygen matters. Call 911 immediately. Details about what was taken can be shared with the dispatcher, but they should never delay the call.'
        },
        {
          id: 'ov3', domain: 'opioid', topic: 'Emergency response sequence', lo: 'Sequence appropriate actions in an opioid emergency',
          type: 'pick', need: 5, lvl: 'AP', dok: 3, pts: 3, sec: 90, after: 'ov2',
          misc: 'Home remedies (coffee, cold shower, walking, sleeping) help',
          prompt: 'Build the response: choose the FIVE correct actions and put them in the best order. Leave out actions that would not help.',
          steps: [
            ['s1', 'Shout their name and shake them or rub their breastbone to check for a response.'],
            ['s2', 'Call 911 and put the phone on speaker.'],
            ['s3', 'Give naloxone nasal spray if it is available.'],
            ['s4', 'If trained, give rescue breaths. Otherwise place them on their side and watch their breathing.'],
            ['s5', 'Stay until help arrives. If there is no response in 2 to 3 minutes, give another naloxone dose if you have one.'],
            ['x1', 'Let them sleep it off.'],
            ['x2', 'Give them coffee or an energy drink.'],
            ['x3', 'Put them in a cold shower.'],
            ['x4', 'Wait and see if it gets worse.'],
            ['x5', 'Make them walk around.']
          ],
          ans: ['s1', 's2', 's3', 's4', 's5'],
          explain: 'Check for a response, call 911, give naloxone if available, support breathing and positioning, and stay until help arrives. Coffee, cold showers, walking and waiting do not reverse an overdose, and waiting costs minutes the person may not have.'
        }
      ]
    }
  ]
};
