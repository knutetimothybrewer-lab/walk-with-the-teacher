import { mc, sort, match, order, tag, scene, chatStep } from './dsl.js';

const D = 'D · Communication Mini-Lesson (slides)';

const riley = { name: 'Riley', color: '#6c5fc7', scene: 'Scene 1 · A teammate who has gone quiet' };
const sasha = { name: 'Sasha', color: '#2a8c8f', scene: 'Scene 2 · A friend says something worrying' };

export default {
  id: 's8', title: 'Be a Bridge', short: 'Be a bridge', topic: 'COMM',
  blurb: 'Listen → Validate → Ask → Connect. You are not the counselor. You are the bridge to one.',
  what: ['Put Listen → Validate → Ask → Connect in order', 'Chat with two friends and watch the trust meter', 'Swap unhelpful lines for better ones'],
  callout: 'Two conversations in this station are about a friend who is struggling. The second one includes a safety moment. You can skip any scene. The Need help? button is always at the top.',
  farewell: 'You are not responsible for solving someone\'s problem. You are responsible for not ignoring it.',
  entries: [
    order('s8-01', {
      fixed: true,
      src: `${D} › Listen → Validate → Ask → Connect`,
      prompt: 'Put the four steps in order.',
      steps: ['Listen: give your full attention', 'Validate: say the feeling makes sense', 'Ask: check in with a caring question', 'Connect: link them to a trusted adult or counselor'],
      hint: 'You cannot connect someone until you have listened.',
      explain: 'Listen → Validate → Ask → Connect. Validation does not mean agreeing. It means the feeling makes sense.',
    }),
    tag('s8-02', {
      fixed: true,
      level: 'apply', src: `${D} › "Spot the move": which step is each line?`,
      prompt: 'Spot the move: which step is each line?',
      slots: [['l', 'Listen', '', { short: 'Listen' }], ['v', 'Validate', '', { short: 'Validate' }], ['a', 'Ask', '', { short: 'Ask' }], ['c', 'Connect', '', { short: 'Connect' }]],
      rows: [
        ['"That sounds really hard. It makes sense you feel overwhelmed."', 'v'],
        ['(Puts phone away, looks at them, nods.) "Take your time. I\'m listening."', 'l'],
        ['"Has it been getting harder lately? What\'s been the toughest part?"', 'a'],
        ['"Would you be open to talking with the counselor? I can walk down with you."', 'c'],
      ],
      hint: 'Listen = attention. Validate = the feeling makes sense. Ask = a caring question. Connect = link to help.',
      explain: 'Each step has its own moves: listening is attention; validating says the feeling makes sense; asking is a caring check-in; connecting links to a trusted adult.',
    }),
    scene('s8-sc1', [
      chatStep('s8-c1a', riley, {
        step: 'Listen', friendSays: 'Hey. Sorry, I have been kind of out of it lately.', prompt: 'What do you do?',
        options: [
          { t: 'Put your phone away and say, "I\'m listening. What\'s been going on?"', ok: true, react: 'Riley takes a breath. "Honestly, it has been a rough couple of weeks. I got cut from the team, and things at home have been loud."' },
          { t: '"Oh, that happened to me too! Let me tell you about it."', react: 'Riley shrugs. "Yeah. Never mind."', hint: 'Listening keeps the focus on them. Save your own story for later.' },
          { t: '"You\'ll be fine. It is not a big deal."', react: 'Riley looks away. "Right. Okay."', hint: 'That minimizes how they feel.' },
          { t: '"You should just join a club."', react: 'Riley nods slowly. "Maybe."', hint: 'Instant advice rushes the conversation. Listen first.' },
        ],
        explain: 'Listening means giving full attention and letting them talk. Instant advice, fixing, or sharing your own story can shut the conversation down.',
        src: `${D} › Step 1: Listen`,
      }),
      chatStep('s8-c1b', riley, {
        step: 'Validate', friendSays: 'I got cut, and things at home are loud lately. I feel like I am failing at everything.', prompt: 'What do you say?',
        options: [
          { t: '"That sounds like a lot at once. It makes sense you feel worn out."', ok: true, react: '"Yeah. Thanks for not telling me to just get over it."' },
          { t: '"Get over it. Other people have it worse."', react: 'Riley\'s face closes. "Forget I said anything."', hint: 'Comparing pain to others makes people feel ashamed.' },
          { t: '"You are being dramatic. You are not failing at everything."', react: 'Riley goes quiet. "Okay."', hint: 'Arguing with the feeling is not validating it.' },
          { t: '"Calm down. Just take a deep breath."', react: 'Riley frowns. "I am calm."', hint: 'Telling someone to calm down rarely works. Try saying the feeling makes sense.' },
        ],
        explain: 'Validation does not mean agreeing with every thought. It means saying the feeling makes sense. "Get over it," "Other people have it worse," and "You are being dramatic" minimize and shame.',
        src: `${D} › Step 2: Validate; unhelpful responses`,
      }),
      chatStep('s8-c1c', riley, {
        step: 'Ask', friendSays: 'Yeah, it has been heavy. I do not really know what to do.', prompt: 'What do you ask?',
        options: [
          { t: '"Has it been getting harder lately? What has been the toughest part?"', ok: true, react: '"The toughest part is I feel like nobody notices. It has been like this for a few weeks."' },
          { t: '"So what is wrong with you? Are you depressed?"', react: 'Riley stiffens. "I am not a case study."', hint: 'Do not diagnose or label. Ask open, caring questions.' },
          { t: '"Have you tried yoga?"', react: 'Riley half-smiles. "Uh, no."', hint: 'That jumps to advice before you understand what is going on.' },
          { t: 'Change the subject to something lighter.', react: 'Riley says, "Yeah, sure," but looks away.', hint: 'Changing the subject can feel like you do not want to hear it.' },
        ],
        explain: 'A caring, open question helps you understand without labeling. You are not diagnosing or investigating.',
        src: `${D} › Step 3: Ask`,
      }),
      chatStep('s8-c1d', riley, {
        step: 'Connect', friendSays: 'Honestly, I have not told anyone.', prompt: 'What do you say?',
        options: [
          { t: '"I\'m glad you told me. You do not have to carry this alone. Would you talk to the counselor? I can go with you."', ok: true, react: 'Riley lets out a long breath. "Okay. Maybe tomorrow morning? Would you come?"' },
          { t: '"I will handle it for you. You can just talk to me."', react: 'Riley hesitates. "Okay... I guess."', hint: 'Be a bridge, not the only support.' },
          { t: '"Okay, but I will never tell anyone, ever."', react: 'Riley relaxes, but nothing changes.', hint: 'Promising absolute secrecy makes you the only helper.' },
          { t: '"Maybe you will feel better by next week."', react: 'Riley shrugs. "Maybe."', hint: 'Waiting does not connect them to support.' },
        ],
        explain: 'Connect means linking them to a trusted adult or counselor, ideally offering to go with them. You are a bridge, not the only support.',
        src: `${D} › Step 4: Connect; role boundaries`,
      }),
    ], { sensitiveScene: true }),
    scene('s8-sc2', [
      chatStep('s8-c2a', sasha, {
        step: 'Stay calm and listen', note: 'This scene includes a safety moment. You can skip it, or use the Need help? button any time.',
        friendSays: 'I just wish I could disappear for a while. I cannot take this anymore.', prompt: 'Stay calm. What do you say first?',
        options: [
          { t: 'Take a slow breath and say calmly, "Thank you for telling me. I am taking this seriously, and I am here."', ok: true, react: 'Sasha\'s shoulders drop a little. "Okay... I did not know if you would think I was overreacting."' },
          { t: '"You do not mean that!"', react: 'Sasha looks away. "Forget it."', hint: 'Dismissing it shuts the conversation down. Stay calm and take it seriously.' },
          { t: '"Do not say things like that. You are scaring me."', react: 'Sasha goes quiet. "Sorry."', hint: 'Panic can make them feel ashamed. Use calm language.' },
          { t: 'Laugh nervously and change the subject.', react: 'Sasha stares at the table. "Yeah. Never mind."', hint: 'Do not brush past it.' },
        ],
        explain: 'In a safety moment, calm, steady language matters. Thank them for telling you and show that you are taking it seriously.',
        src: `${D} › Crisis connection: calm language`,
      }),
      chatStep('s8-c2b', sasha, {
        step: 'Ask', friendSays: 'I do not know... it is all just really heavy.', prompt: 'What do you ask?',
        options: [
          { t: '"I am worried about you. Are you safe right now?"', ok: true, react: 'Sasha takes a shaky breath. "I... do not feel okay. I do not want to be alone with this."' },
          { t: '"What is the matter with you? Why would you feel like that?"', react: 'Sasha flinches. "I do not know."', hint: 'Blaming or questioning why can feel like judgment. Ask about safety directly and kindly.' },
          { t: '"Just promise me you will be okay tomorrow."', react: '"...Okay," Sasha mumbles, not meaning it.', hint: 'A promise does not make someone safe.' },
          { t: '"Should I post about it so people can help?"', react: 'Sasha looks alarmed. "No! Please do not."', hint: 'Posting online exposes your friend. Go to a trusted adult.' },
        ],
        explain: 'When a vague warning comes with fear for safety, ask directly and kindly: "Are you safe right now?" Asking does not make things worse.',
        src: `${D} › Crisis connection: "Are you safe right now?"`,
      }),
      chatStep('s8-c2c', sasha, {
        step: 'Connect', friendSays: 'I do not want to talk to anyone but you. Please do not tell anyone. Promise.', prompt: 'What is the best next move?',
        options: [
          { t: '"I care about you, so I cannot keep this secret. I need help to keep you safe. Let\'s go to the counselor together right now, and I will stay with you."', ok: true, react: 'Sasha wipes their eyes and nods slowly. "Okay. Thank you for not leaving."' },
          { t: '"Fine, I promise I will not tell anyone."', react: 'Sasha seems relieved, but you are now alone with it.', hint: 'Do not promise absolute secrecy when someone may be unsafe. You need an adult.' },
          { t: '"Let us wait until after the weekend and see how you feel."', react: 'Sasha stares at the floor. "Sure."', hint: 'Safety overrides uncertainty. Do not wait.' },
          { t: '"If you promise to text me every day, I will keep it quiet."', react: 'Sasha mumbles, "Okay."', hint: 'That makes you the only support. Bring in an adult.' },
        ],
        explain: 'Walk them to the counselor or a trusted adult and stay with them. Say it kindly: "I will respect your privacy about most things, but I need help if you are unsafe." You are a bridge, not the only support.',
        src: `${D} › Crisis connection (walk them to the counselor); role boundaries & privacy (no absolute secrecy)`,
      }),
    ], { sensitiveScene: true }),
    match('s8-08', {
      level: 'apply', src: `${D} › Language swaps`,
      prompt: 'Language swap: match each unhelpful line to a better one.',
      pairs: [
        ['"Calm down."', '"I can stay with you while this passes."'],
        ['"Other people have it worse."', '"That sounds really painful for you."'],
        ['"Here is what you should do."', '"What would feel helpful right now?"'],
        ['"I promise I will not tell anyone."', '"I will respect your privacy, but I need help if you are unsafe."'],
      ],
      hint: 'A better line shows you are with them instead of fixing, minimizing, or promising secrecy.',
      explain: 'Swapping the line changes the message from "stop feeling that" to "I am with you."',
    }),
    mc('s8-10', {
      level: 'apply', src: `${D} › Role boundaries: bridge, not the counselor`,
      prompt: 'Which statement best describes your role as a peer helper?',
      right: 'A bridge: you listen, show you care, and connect your friend to a trusted adult or counselor.',
      wrong: [
        ['The counselor: you should solve their problems.', 'It is not your job to solve everything or to be the therapist.'],
        ['The investigator: you should find out everything that happened.', 'It is not your job to investigate.'],
        ['The secret keeper: you keep it private no matter what.', 'Privacy matters, but not at the cost of safety.'],
      ],
      hint: 'The lesson says: not your job to diagnose, investigate, or keep everything secret.',
      explain: 'You are a bridge, not the only support and not the counselor. You are responsible for not ignoring it, not for solving it.',
    }),
  ],
};
