// Simulation F: Story Studio and Decision Lab.  Fictional stories only.  Four activities: warning-sign stories, the
// 5-step decision model, a refusal chat, and a help finder.  Reports how many of the four activities were completed.
import { h, clear, announce } from '../util.js';
import { tabs, note } from './kit.js';

const done = new Set();                      // survives closing and reopening the lab drawer
const mem = { stories: {}, model: {}, chat: 0, help: new Set() };

const STORIES = [
  { id: 'sam', title: 'Sam, 16 (fictional)', intro: 'Sam started betting small amounts on a friend’s app a few months ago. Tap every detail that could be a warning sign when it becomes a pattern.',
    details: [['Sam watches the big game with friends every weekend.', 0], ['Sam checks the app between classes and gets irritable when the signal is bad.', 1], ['Sam told his sister he “won a bunch” but never says how much he has lost.', 1], ['Sam borrowed lunch money twice this week and said it was for “something else.”', 1], ['Sam jokes about the game with his team the next day.', 0]] },
  { id: 'priya', title: 'Priya, 17 (fictional)', intro: 'Priya plays a card game with her cousins on holidays for pretend chips. Her sister worries about some changes lately.',
    details: [['Priya plays pretend-chip cards at family gatherings and laughs when she loses.', 0], ['Priya stopped going to band practice to stay home with an app open.', 1], ['After a bad night she says, “I just need one big win to fix it,” and bets again.', 1], ['Priya set a time limit for herself and logged off when it passed.', 0], ['Priya hides her phone screen when her mom walks by.', 1]] },
  { id: 'theo', title: 'Theo, 15 (fictional)', intro: 'Theo’s friends talk about sports a lot, and some of them have betting apps they should not be using.',
    details: [['Theo reads sports news and argues about trades.', 0], ['Theo spends most of the lunch period asking his friends what the “best bets” are and cannot stop thinking about them.', 1], ['Theo plays fantasy football for fun with no money, just bragging rights.', 0], ['Theo started lying about where his birthday money went.', 1], ['Theo cheers when his team scores.', 0]] }
];

const MODEL = {
  scenario: 'Your cousin, who is 19, offers to let you use his betting-app login to place a bet on tonight’s game. “I’ll cover it if you lose. It’s just this once.”',
  steps: [
    { name: '1. Identify the situation', q: 'Which statement states the situation clearly?', opts: [['Someone is asking me to use another person’s account to bet, which is not allowed at my age and puts money at risk.', 1], ['My cousin is being nice to me.', 0], ['This is probably fine because it is only once.', 0]], why: 'Naming the situation plainly (who, what is asked, what rules or risks apply) comes first. “Only once” is a reason to go along, not a description.' },
    { name: '2. List your options', q: 'Which list gives you the most real choices?', opts: [['Say no and suggest another plan; say no and leave; tell a trusted adult; say yes.', 1], ['Say yes or say yes later.', 0], ['Say no and never speak to my cousin again.', 0]], why: 'Good option lists include several different paths, including involving an adult, not only “yes” and “no.”' },
    { name: '3. Weigh pros, cons and consequences', q: 'Which comparison looks at consequences?', opts: [['If I bet: I break rules, could lose money or lose trust. If I decline: my cousin may be annoyed for a day, but I am safe.', 1], ['Everyone else does it, so it must be fine.', 0], ['I’ll worry about the results after I win.', 0]], why: 'This step compares what could happen with each option, short term and long term, for you and for others.' },
    { name: '4. Decide', q: 'Which is a clear decision?', opts: [['“No thanks. Want to watch the game with me instead?”', 1], ['“Maybe. I’ll see.”', 0], ['“I’ll decide after the first quarter.”', 0]], why: 'A decision is specific and ready to say out loud, ideally with an alternative.' },
    { name: '5. Reflect', q: 'Which reflection would help you most next time?', opts: [['“That was uncomfortable, but I’m glad I said no. Next time I’ll have a line ready and tell a trusted adult sooner.”', 1], ['“I never want to think about it again.”', 0], ['“It didn’t matter.”', 0]], why: 'Reflection asks what worked, what was hard, and what you would repeat or change.' }
  ]
};

const CHAT = [
  { friend: 'Use my referral code and we BOTH get a $50 bonus bet. Everyone in our group is doing it.', opts: [['“No thanks, that’s not for me. Want to shoot hoops instead?”', 1, 'Clear, calm, and it offers something else to do.'], ['“Um, maybe. Let me think about it…”', 0, 'A “maybe” keeps the pressure going. Say it clearly.'], ['“You’re an idiot for using that stuff.”', 0, 'Insults start an argument and give your friend something to push back on.']] },
  { friend: 'Come on, it’s free money. Don’t be boring.', opts: [['“I hear you, but my answer is still no. I’m in for hoops or food, though.”', 1, 'Holding your ground: repeat your answer calmly and keep the offer open.'], ['“Okay, fine, I’ll try it once.”', 0, 'Giving in after pressure makes the next request easier for them to make.'], ['“I’ll tell your mom you’re gambling.”', 0, 'Threats escalate things. If you are truly worried, talk to a trusted adult privately.']] },
  { friend: 'Ugh, fine. Whatever. I’ll just do it myself.', opts: [['“That’s up to you. I’m here if you want to talk, or we can still hang out.”', 1, 'You stay kind without taking part, and you leave the door open.'], ['“Wait, I’ll do it with you so you don’t go alone.”', 0, 'Going along to keep someone company usually means you take the same risks.'], ['“Good, then leave me alone for good.”', 0, 'Cutting the friendship off is not needed: you can say no and still care.']] }
];

const HELP = [
  { id: 'me', who: 'I’m worried about my own gambling', what: 'Talk to a **school counselor** or another trusted adult, and call the **National Problem Gambling Helpline**: 1-800-GAMBLER (1-800-426-2537) or 1-800-522-4700. It is free, confidential and open 24/7. You can also visit **ncpgambling.org**.', say: '“I’ve been betting more than I planned to and I want help cutting back.”' },
  { id: 'friend', who: 'I’m worried about a friend', what: 'Say no to lending money for bets, tell your friend you are worried, and encourage them to talk to a counselor or trusted adult. You can offer to go with them. The helpline above also helps worried friends and family.', say: '“I care about you and I’m worried. I won’t lend money for bets, but I’ll go with you to talk to the counselor.”' },
  { id: 'now', who: 'It’s late and I need to talk now', what: 'The helpline is open **24 hours a day, 7 days a week**: 1-800-GAMBLER (1-800-426-2537) or 1-800-522-4700. If you are in immediate danger, call 911 (or 988 in the U.S. for a mental-health crisis).', say: '“I don’t know where to start. I’ve been gambling and I’m scared.”' },
  { id: 'info', who: 'I want to learn more first', what: 'Visit **ncpgambling.org** to read about warning signs and support options, or ask your school counselor for materials. You do not have to be sure there is a problem to ask a question.', say: '“Can you tell me more about gambling warning signs?”' }
];

export function mount(container, ctx) {
  const U5 = window.U5, shuf = (key, arr) => U5.rng('decide|' + ctx.labs.coin + '|' + key).shuffle(arr);   // option order varies by student, never by click
  const report = () => ctx.report('decide', done.size);
  const finish = (k, msg) => { if (!done.has(k)) { done.add(k); report(); announce(msg || 'Activity complete.'); tabsApi.mark(['stories', 'model', 'chat', 'help'].indexOf(k)); } };
  const tickAll = () => ['stories', 'model', 'chat', 'help'].forEach((k, i) => { if (done.has(k)) tabsApi.mark(i); });

  // ---- 1. Stories
  function storiesPane(pane) {
    const host = h('div');
    STORIES.forEach((s) => {
      const picks = mem.stories[s.id] = mem.stories[s.id] || new Set(), fb = h('div', { 'aria-live': 'polite' }), rows = [];
      const list = h('div');
      s.details.forEach((d, i) => {
        const b = h('button', { class: 'flag-btn', type: 'button', 'aria-pressed': String(picks.has(i)), onclick: () => { picks.has(i) ? picks.delete(i) : picks.add(i); b.setAttribute('aria-pressed', String(picks.has(i))); b.textContent = picks.has(i) ? '⚑ Concerning' : '⚐ Flag'; } }, picks.has(i) ? '⚑ Concerning' : '⚐ Flag');
        rows.push(b); list.append(h('div', { class: 'beat' }, h('div', null, d[0]), b));
      });
      const check = h('button', { class: 'btn btn-primary', type: 'button', onclick: () => {
        const right = s.details.filter((d, i) => d[1] && picks.has(i)).length, need = s.details.filter((d) => d[1]).length, wrong = s.details.filter((d, i) => !d[1] && picks.has(i)).length;
        clear(fb); fb.append(note(`You flagged ${right} of the ${need} details that point to a pattern${wrong ? ` and ${wrong} ordinary one${wrong === 1 ? '' : 's'}` : ''}. ${wrong ? 'Enjoying the game, reading the news and cheering are normal; the worry is secrecy, borrowing money, neglecting things, and not being able to stop thinking about it. ' : ''}Warning signs are patterns over time, not a diagnosis — a caring adult or counselor is the right next step if you see several together.`));
        s.details.forEach((d, i) => rows[i].parentNode.classList.toggle('flagged', !!d[1]));
        finish('stories', 'Story reviewed.');
      } }, 'Check my flags');
      host.append(h('div', { class: 'panel', style: 'margin-bottom:1rem' }, h('h3', null, s.title), h('p', { class: 'muted' }, s.intro), list, h('div', { class: 'controls', style: 'margin-top:.5rem' }, check), fb));
    });
    pane.append(host, note('These stories are **fictional**. Real people deserve privacy: never guess about a classmate.'));
  }

  // ---- 2. Decision model
  function modelPane(pane) {
    const host = h('div'), prog = h('p', { class: 'muted', 'aria-live': 'polite' });
    function draw() {
      clear(host);
      const cnt = Object.keys(mem.model).filter((k) => mem.model[k]).length;
      prog.textContent = `${cnt} of 5 steps complete`;
      MODEL.steps.forEach((st, si) => {
        const got = mem.model[si], fb = h('div', { 'aria-live': 'polite' }), list = h('div');
        shuf('m' + si, st.opts).forEach((o) => {
          const b = h('button', { class: 'choice-btn' + (got && o[1] ? ' right' : ''), type: 'button', disabled: !!got, onclick: () => {
            if (o[1]) { mem.model[si] = true; clear(fb); fb.append(note('✓ ' + st.why)); if (Object.keys(mem.model).filter((k) => mem.model[k]).length >= 5) finish('model', 'Decision model complete.'); draw(); }
            else { clear(fb); fb.append(h('p', { class: 'warn-note' }, 'Not quite. Look at what this step is for and try another answer.')); b.disabled = true; announce('Not quite. Try again.'); }
          } }, o[0]);
          list.append(b);
        });
        host.append(h('div', { class: 'panel', style: 'margin-bottom:.8rem; ' + (si && !mem.model[si - 1] ? 'opacity:.55' : '') }, h('h3', null, st.name), h('p', null, st.q), si && !mem.model[si - 1] ? h('p', { class: 'muted' }, 'Finish the step above first.') : list, got ? note('✓ ' + st.why) : fb));
      });
    }
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'The 5-step decision model'), h('p', null, MODEL.scenario), prog), host); draw();
  }

  // ---- 3. Refusal chat
  function chatPane(pane) {
    const log = h('div', { 'aria-live': 'polite' }), box = h('div'), score = h('div');
    let turn = mem.chat || 0, tries = 0;
    function say(who, t, mine) { log.append(h('div', { class: 'beat', style: mine ? 'margin-left:2rem' : '' }, h('div', null, h('div', { class: 'who' }, who), h('div', null, t)))); }
    function draw() {
      clear(box);
      if (turn >= CHAT.length) { box.append(note(`Well done. You stayed calm, clear and kind, offered an alternative, and held your ground${tries ? ` (it took ${tries} extra ${tries === 1 ? 'try' : 'tries'}, which is normal)` : ''}. Refusal skills get easier with practice.`)); finish('chat', 'Refusal chat complete.'); return; }
      const c = CHAT[turn];
      box.append(h('p', null, h('b', null, 'Choose your reply:')), shuf('c' + turn, c.opts).map((o) => h('button', { class: 'choice-btn', type: 'button', onclick: () => {
        if (o[1]) { say('You', o[0], true); say('Coach', o[2]); turn++; mem.chat = turn; if (turn < CHAT.length) say('Friend', CHAT[turn].friend); draw(); }
        else { tries++; say('You (try)', o[0], true); say('Coach', o[2]); announce('Try a different reply.'); }
      } }, o[0])));
    }
    // rebuild the log when reopening
    say('Friend', CHAT[0].friend); for (let i = 0; i < turn; i++) { say('You', CHAT[i].opts.filter((o) => o[1])[0][0], true); if (CHAT[i + 1]) say('Friend', CHAT[i + 1].friend); }
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'Refusal chat'), h('p', { class: 'muted' }, 'A made-up scenario. Skills from class: **say it clearly and calmly**, **offer an alternative**, **hold your ground**.'), log, box, score)); draw();
  }

  // ---- 4. Help finder
  function helpPane(pane) {
    const out = h('div', { 'aria-live': 'polite' });
    const sel = h('div', { class: 'controls' }, HELP.map((x) => h('button', { class: 'btn', type: 'button', onclick: () => {
      mem.help.add(x.id); clear(out);
      out.append(h('div', { class: 'resource' }, h('b', null, x.who), h('p', null, (function () { const f = document.createDocumentFragment(); x.what.split(/(\*\*[^*]+\*\*)/).forEach((s) => f.append(s.startsWith('**') ? h('strong', null, s.slice(2, -2)) : document.createTextNode(s))); return f; })()), h('p', { class: 'muted' }, h('b', null, 'A first sentence you could say: '), x.say)));
      finish('help', 'Help resource opened.');
    } }, x.who)));
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'Help finder'), h('p', { class: 'muted' }, 'Choose a situation to see where help is. Asking for help is a strength.'), sel, out), note('Phone numbers and websites are those named in the unit materials. Check ncpgambling.org for the most current options.'));
  }

  const tabsApi = tabs([{ id: 'stories', label: 'Story Studio', build: storiesPane }, { id: 'model', label: 'Decision model', build: modelPane }, { id: 'chat', label: 'Refusal chat', build: chatPane }, { id: 'help', label: 'Help finder', build: helpPane }]);
  container.append(h('div', { class: 'sim' }, tabsApi.bar, tabsApi.body)); tabsApi.show(0); tickAll(); report();
  return { destroy() {} };
}
