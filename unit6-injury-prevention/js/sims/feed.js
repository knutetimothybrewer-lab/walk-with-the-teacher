// Mission 3 simulation: a fictional social feed about organ donation and a practice registry screen.
// The student reads posts, tags each one Myth, Fact or Opinion, and then sees "What the facts say" for that post.
// Every person, post, app and registry here is fictional. None of the facts below is a scored answer: the scored questions use
// different myths and different posts, so this simulation teaches how to check a claim, not what to pick.
import { h, svg } from '../util.js';

const POSTS = [
  { id: 'p1', who: 'Maya Chen', handle: 'maya_runs', color: '#c2410c', ago: '2h', likes: 48, replies: 9, text: 'Everyone knows rich or famous people always get organs first. So why would regular people even sign up?',
    truth: 'myth', fact: 'A national system decides who gets an organ using medical factors, such as blood type, body size, how sick the patient is and how long they have waited. Money and fame are not part of it.', src: 'OPTN and organdonor.gov' },
  { id: 'p2', who: 'Coach Dre', handle: 'coach_dre', color: '#0f766e', ago: '3h', likes: 112, replies: 14, text: 'Our health assembly said more than 100,000 people in the U.S. are on the transplant waiting list. That number stuck with me.', link: 'National waiting list snapshot',
    truth: 'fact', fact: 'More than 100,000 people are on the national transplant waiting list, and about 13 die each day while waiting. Donated organs are far fewer than the people who need them.', src: 'HRSA, organdonor.gov (September 2024 snapshot)' },
  { id: 'p3', who: 'Jules Park', handle: 'jules.codes', color: '#4338ca', ago: '5h', likes: 21, replies: 6, text: 'My cousin says if somebody donates, their family gets stuck with a hospital bill for it.',
    truth: 'myth', fact: 'The donor’s family is not charged for donation. Costs related to the donation are paid by the recipient’s insurance or the transplant program.', src: 'organdonor.gov' },
  { id: 'p4', who: 'Tasha Reed', handle: 'tasha_t', color: '#a21caf', ago: '6h', likes: 30, replies: 11, text: 'Only hearts and kidneys can be transplanted, so it barely matters whether you sign up.',
    truth: 'myth', fact: 'Kidneys, liver, lungs, heart, pancreas and intestines can be transplanted, plus tissue such as corneas, skin, bone and heart valves. One donor can save several lives and help many more.', src: 'organdonor.gov' },
  { id: 'p5', who: 'Sam Ortega', handle: 'sam_the_sk8', color: '#1d4ed8', ago: '8h', likes: 64, replies: 18, text: 'Honestly I’m not sure yet if I want to register. I’m going to talk it over with my family first.',
    truth: 'opinion', fact: 'This is a personal decision, not a claim that can be checked. Choosing to talk with family first is a reasonable way to decide, and registration choices belong to the person and their family.', src: 'No fact to check' },
  { id: 'p6', who: 'Priya Nair', handle: 'priya.reads', color: '#be123c', ago: '9h', likes: 87, replies: 7, text: 'My uncle gave a kidney to a family friend, so living people can donate too, not just after death.', link: 'How living donation works',
    truth: 'fact', fact: 'A living person can donate a kidney or part of a liver. The donor does not have to be related to the patient; doctors check that the two are a medical match and that the donor is healthy.', src: 'organdonor.gov' },
  { id: 'p7', who: 'Luis Vega', handle: 'luis_vlogs', color: '#b45309', ago: '12h', likes: 17, replies: 5, text: 'Doesn’t matter anyway. Donated organs just get sold to whoever pays the most.',
    truth: 'myth', fact: 'Buying or selling organs is illegal in the United States under the National Organ Transplant Act. Donated organs go through a national matching system.', src: 'OPTN and organdonor.gov' },
  { id: 'p8', who: 'Mr. Keller', handle: 'mr_k_health', color: '#475569', ago: '1d', likes: 140, replies: 22, text: 'A new person is added to the national transplant waiting list about every 8 minutes.',
    truth: 'fact', fact: 'HRSA reports that a new person joins the national transplant waiting list about every 8 minutes.', src: 'HRSA, organdonor.gov' }
];
const TAGS = [['myth', 'Myth'], ['fact', 'Fact'], ['opinion', 'Opinion']];

const ico = {
  heart: 'M12 21s-7-4.6-9.5-9C.9 8.8 2.6 5 6.1 5c2 0 3.4 1.1 5.9 3.4C14.5 6.1 15.900 5 17.900 5c3.500 0 5.200 3.800 3.600 7C19 16.400 12 21 12 21z',
  chat: 'M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H10l-5 4v-4H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  share: 'M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13',
  mark: 'M6 3h12v18l-6-4-6 4z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.500-4.500',
  link: 'M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1'
};
const icon = (d, filled) => svg('svg', { class: 'ico', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false', fill: filled ? 'currentColor' : 'none', stroke: 'currentColor', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg('path', { d }));
const initials = (n) => n.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

export function mountSim(host, api) {
  const tagged = {};
  const tablist = h('div.sim-tabs', { role: 'tablist', 'aria-label': 'Practice sections' });
  const panels = {};
  [['feed', 'Lumo feed'], ['reg', 'Registry screen']].forEach(([id, label]) => {
    const b = h('button.sim-tab', { type: 'button', role: 'tab', id: 'ftab-' + id, 'aria-controls': 'fpanel-' + id, 'aria-selected': String(id === 'feed'), tabindex: id === 'feed' ? '0' : '-1', onclick: () => select(id) }, label);
    b.addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(id === 'feed' ? 'reg' : 'feed'); document.getElementById('ftab-' + (id === 'feed' ? 'reg' : 'feed')).focus(); } });
    tablist.appendChild(b);
  });
  function select(id) { ['feed', 'reg'].forEach((t) => { const b = document.getElementById('ftab-' + t); b.setAttribute('aria-selected', String(t === id)); b.tabIndex = t === id ? 0 : -1; panels[t].hidden = t !== id; }); }

  /* ================= FEED ================= */
  const counter = h('p.sim-note', { role: 'status', 'aria-live': 'polite' }, 'Tag each post as a myth, a fact or an opinion. After you tag one, you see what the facts say about it. Tag at least six.');
  const cards = POSTS.map((p) => {
    const facts = h('div.facts', { hidden: true, role: 'region', 'aria-label': 'What the facts say' });
    const group = h('div.tagbar', { role: 'radiogroup', 'aria-label': 'Tag this post' }, h('span.tag-label', 'Your tag:'));
    TAGS.forEach(([val, label]) => {
      const b = h('button.tag-btn', { type: 'button', role: 'radio', 'aria-checked': 'false', 'data-tag': val, 'data-post': p.id, onclick: () => choose(p, val, group, facts) }, label);
      group.appendChild(b);
    });
    const body = h('article.post', { 'aria-label': 'Post by ' + p.who },
      h('div.post-head', h('span.avatar', { style: { background: p.color }, 'aria-hidden': 'true' }, initials(p.who)),
        h('div.post-id', h('span.name', p.who), h('span.handle', '@' + p.handle + ' · ' + p.ago)),
        h('button.more', { type: 'button', 'aria-label': 'More options (not active in this practice)', tabindex: '-1' }, '···')),
      h('p.post-text', p.text),
      p.link ? h('div.link-card', icon(ico.link), h('span', p.link), h('span.dom', 'lumo-news.example')) : null,
      h('div.post-actions', { 'aria-hidden': 'true' }, h('span', icon(ico.chat), p.replies), h('span', icon(ico.heart), p.likes), h('span', icon(ico.mark)), h('span', icon(ico.share))),
      group, facts);
    return body;
  });
  function choose(p, val, group, facts) {
    tagged[p.id] = val;
    group.querySelectorAll('.tag-btn').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.tag === val)));
    const ok = val === p.truth;
    facts.hidden = false; facts.dataset.ok = ok ? 'true' : 'false';
    facts.replaceChildren(
      h('div.facts-head', h('span.badge', { 'data-v': p.truth }, p.truth === 'myth' ? 'Myth' : p.truth === 'fact' ? 'Fact' : 'Opinion'), h('strong', ok ? ' Your tag matches.' : ' Your tag is different from the evidence.'), ok ? null : h('span.muted', ' Change your tag if you like.')),
      h('p', h('b', 'What the facts say: '), p.fact), h('p.src', 'Source: ' + p.src));
    const n = Object.keys(tagged).length;
    const right = POSTS.filter((x) => tagged[x.id] === x.truth).length;
    counter.textContent = n + ' of ' + POSTS.length + ' posts tagged' + (n >= 6 ? '. That is enough to open the questions, but keep going if you like.' : '. Tag at least six.') + ' (' + right + ' tags match the evidence.)';
    if (n >= 6) api.report('tag6');
  }
  const phone = h('div.phone-frame',
    h('div.app-bar', h('span.logo', { 'aria-hidden': 'true' }, svg('svg', { viewBox: '0 0 32 32', width: 28, height: 28 }, svg('defs', svg('linearGradient', { id: 'lg', x1: 0, y1: 0, x2: 1, y2: 1 }, svg('stop', { offset: 0, 'stop-color': '#7c3aed' }), svg('stop', { offset: 1, 'stop-color': '#f97316' }))), svg('rect', { width: 32, height: 32, rx: 9, fill: 'url(#lg)' }), svg('path', { d: 'M10 21l4-10 4 7 4-9', fill: 'none', stroke: '#fff', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }))),
      h('b.brand', 'Lumo'), h('span.sp'), h('span.srch', { 'aria-hidden': 'true' }, icon(ico.search))),
    h('div.feed-tabs', { 'aria-hidden': 'true' }, h('span.on', 'For you'), h('span', 'Following'), h('span', 'Health')),
    h('div.feed', cards));
  panels.feed = h('div.sim-panel', { role: 'tabpanel', id: 'fpanel-feed', 'aria-labelledby': 'ftab-feed' },
    h('p.sim-intro', 'This is a fictional app called Lumo. The people and posts are made up. Read each post and tag it.'), counter, phone);

  /* ================= REGISTRY ================= */
  const R = { step: 0, organs: new Set(), family: false, done: false };
  const steps = ['Learn', 'Choose', 'Family', 'Review'];
  const regBody = h('div.reg-body');
  const regStepper = h('ol.reg-steps', { 'aria-label': 'Registry steps' }, steps.map((s, i) => h('li', { 'data-i': i }, h('span.n', String(i + 1)), s)));
  function regRender() {
    regStepper.querySelectorAll('li').forEach((li) => { const i = Number(li.dataset.i); li.dataset.state = i < R.step ? 'done' : i === R.step ? 'cur' : 'todo'; });
    const next = h('button.btn', { type: 'button', id: 'reg-next', onclick: () => { R.step++; if (R.step >= 3 && !R.done) { R.done = true; api.report('register'); } regRender(); } }, R.step === 2 ? 'Review' : 'Continue');
    const back = R.step > 0 ? h('button.btn.secondary', { type: 'button', onclick: () => { R.step--; regRender(); } }, 'Back') : null;
    let content;
    if (R.step === 0) {
      content = [h('h3', 'Welcome to the Mapleton State Donor Registry'), h('p', 'A donor registry records a person’s decision about donation so it can be found when it matters. Signing up is free, and the decision belongs to the person and their family.'),
        h('div.person', h('span.avatar', { style: { background: '#0f766e' }, 'aria-hidden': 'true' }, 'AR'), h('div', h('b', 'Alex Rivera'), h('div.muted.small', 'A fictional person for this practice. No real data is collected or saved.')))];
    } else if (R.step === 1) {
      const opt = (id, label, sub) => { const input = h('input', { type: 'checkbox', id: 'reg-' + id, checked: R.organs.has(id) }); input.addEventListener('change', () => { input.checked ? R.organs.add(id) : R.organs.delete(id); }); return h('label.reg-opt', input, h('span', h('b', label), h('span.muted.small', ' ' + sub))); };
      content = [h('h3', 'Choose what Alex would like to donate'), h('p', 'This is Alex’s own choice. There is no right answer on this screen; choose anything, or nothing, to practice.'),
        opt('organs', 'Organs', 'such as kidney, liver, heart or lungs'), opt('tissue', 'Eyes and tissue', 'such as corneas, skin, bone or heart valves'), opt('research', 'Research and education', 'if a transplant is not possible')];
    } else if (R.step === 2) {
      const cb = h('input', { type: 'checkbox', id: 'reg-family', checked: R.family }); cb.addEventListener('change', () => { R.family = cb.checked; });
      content = [h('h3', 'Tell your family'), h('p', 'A registry decision works best when the people closest to you already know about it. Families are asked about donation at the hospital, so a conversation ahead of time helps them honor the decision.'), h('label.reg-opt', cb, h('span', 'Alex plans to talk with their family about this decision'))];
    } else {
      const chosen = ['organs', 'tissue', 'research'].filter((x) => R.organs.has(x)).map((x) => ({ organs: 'organs', tissue: 'eyes and tissue', research: 'research and education' }[x]));
      content = [h('div.banner.ok', h('div', h('strong', 'Practice complete. '), 'Nothing was saved and no real registration happened.')), h('h3', 'Review'),
        h('dl.reg-sum', h('dt', 'Person'), h('dd', 'Alex Rivera (fictional)'), h('dt', 'Choices'), h('dd', chosen.length ? chosen.join(', ') : 'none selected'), h('dt', 'Talked with family'), h('dd', R.family ? 'plans to' : 'not yet')),
        h('p.muted.small', 'Teacher note: this is information, not a request to register. Registration decisions belong to families.')];
    }
    regBody.replaceChildren(...content, h('div.row', { style: { marginTop: '16px' } }, back, R.step < 3 ? next : h('button.btn.secondary', { type: 'button', onclick: () => { Object.assign(R, { step: 0, organs: new Set(), family: false }); regRender(); } }, 'Start over')));
  }
  panels.reg = h('div.sim-panel', { role: 'tabpanel', id: 'fpanel-reg', 'aria-labelledby': 'ftab-reg', hidden: true },
    h('p.sim-intro', 'See how a donor registry screen works. This is a practice screen with a fictional person.'),
    h('div.reg-card', h('div.reg-top', h('span.shield', { 'aria-hidden': 'true' }, '✚'), h('b', 'Mapleton State Donor Registry'), h('span.muted.small', ' (fictional)')), regStepper, regBody));
  regRender();

  host.replaceChildren(h('div.feed-lab', tablist, panels.feed, panels.reg));
  return { destroy() {} };
}
