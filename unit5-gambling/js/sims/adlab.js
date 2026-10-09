// Simulation E: Ad Investigation Lab.  Six FICTIONAL ads, three investigator tools (highlight, fine print, who sees it),
// and a social feed.  All brands, people and viewer numbers are invented for teaching.
import { h, clear, announce, fmt } from '../util.js';
import { barChart } from '../charts.js';
import { stat, tabs, note } from './kit.js';

const opened = new Set(), tools = {};       // ad id -> Set of tools used.  Survive closing and reopening the lab drawer.
const marks = {};                            // ad id -> Set of "seg:index" the student highlighted
const checked = new Set();
const feedSeen = new Set();

const norm = (t) => t.toLowerCase().replace(/[^a-z0-9]/g, '');
const words = (s) => s.split(/\s+/).filter(Boolean);
function findPhrase(tokens, phrase) {          // returns [start, end) over token indexes, ignoring punctuation-only tokens
  const want = words(phrase).map(norm).filter(Boolean), idx = tokens.map((t, i) => [norm(t), i]).filter((x) => x[0]);
  for (let s = 0; s + want.length <= idx.length; s++) if (want.every((w, k) => idx[s + k][0] === w)) return [idx[s][1], idx[s + want.length - 1][1] + 1];
  return null;
}

export function mount(container, ctx) {
  const D = window.U5D;
  const report = () => ctx.report('adlab', opened.size);
  const use = (id, tool) => { (tools[id] = tools[id] || new Set()).add(tool); };

  // ---------------------------------------------------------------- Investigation tab
  function adsPane(pane) {
    const grid = h('div', { class: 'adgrid' }), detail = h('div', { hidden: true });
    function drawGrid() {
      clear(grid);
      D.ADS.forEach((a) => {
        const full = tools[a.id] && tools[a.id].size >= 3;
        grid.append(h('button', { class: 'adtile' + (opened.has(a.id) ? ' seen' : ''), type: 'button', onclick: () => openAd(a) },
          h('small', { class: 'muted' }, opened.has(a.id) ? (full ? '✓ fully investigated' : '✓ opened') : 'Not opened yet'), h('b', null, a.brand), h('span', { class: 'muted small' }, a.head.replace(/[“”]/g, ''))));
      });
    }
    function openAd(a) {
      opened.add(a.id); report(); announce(`${a.brand} opened. ${opened.size} of ${D.ADS.length} ads opened.`);
      grid.hidden = true; detail.hidden = false; clear(detail);
      const head = words(a.head), body = words(a.body), mine = marks[a.id] = marks[a.id] || new Set();
      const keySet = new Set();
      a.phrases.forEach((p) => { const r = findPhrase(head, p); if (r) for (let i = r[0]; i < r[1]; i++) keySet.add('h:' + i); else { const q = findPhrase(body, p); if (q) for (let i = q[0]; i < q[1]; i++) keySet.add('b:' + i); } });
      let hlOn = false, revealed = checked.has(a.id);
      const adBox = h('div', { class: 'ad', role: 'group', 'aria-label': 'Advertisement from ' + a.brand }), result = h('div', { 'aria-live': 'polite' }), extra = h('div');
      function word(seg, i, text) {
        const k = seg + ':' + i, el = h('span', { class: 'hl-word' + (mine.has(k) ? ' on' : '') + (revealed && keySet.has(k) ? ' key' : ''), tabindex: hlOn ? 0 : -1, role: hlOn ? 'button' : null, 'aria-pressed': hlOn ? String(mine.has(k)) : null }, text);
        const flip = () => { if (!hlOn) return; if (mine.has(k)) mine.delete(k); else mine.add(k); el.classList.toggle('on', mine.has(k)); el.setAttribute('aria-pressed', String(mine.has(k))); use(a.id, 'highlight'); };
        el.addEventListener('click', flip); el.addEventListener('keydown', (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } });
        return el;
      }
      function drawAd() {
        clear(adBox);
        adBox.append(h('div', { class: 'brand' }, a.brand, h('span', { class: 'muted small' }, ' · sponsored (fictional)')),
          h('h3', { class: 'headline' }, head.map((w, i) => [word('h', i, w), ' '])),
          h('p', null, body.map((w, i) => [word('b', i, w), ' '])), h('span', { class: 'btn btn-primary cta', 'aria-hidden': 'true' }, a.cta));
      }
      drawAd();
      const finePane = h('div', { class: 'fine', hidden: true }, h('b', null, 'Fine print: '), a.fine);
      const whoPane = h('div', { hidden: true });
      function drawWho() {
        clear(whoPane);
        const under = a.viewers.filter((v) => v[0] === '14–17')[0][1], minors = a.viewers.length ? under : 0;
        whoPane.append(h('p', null, h('b', null, 'Where it runs: '), a.placement),
          barChart(a.viewers.map((v) => ({ label: v[0], value: v[1], color: v[0] === '14–17' ? 'var(--warn)' : 'var(--accent)' })), { unit: '%', title: 'Who this ad reaches (percent of viewers, FICTIONAL data)', alt: 'Age groups reached by the advertisement, fictional percentages', max: 40 }),
          note(`In this invented report, **${minors}%** of the people reached are 14–17, below the legal betting age. Think about who is *likely* to see the ad where it runs.`));
      }
      const btnHl = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false', onclick: () => { hlOn = !hlOn; btnHl.setAttribute('aria-pressed', String(hlOn)); btnHl.textContent = hlOn ? 'Highlighting ON: tap words (Space or Enter on a word)' : 'Highlight persuasive words'; drawAd(); use(a.id, 'highlight'); if (hlOn) announce('Highlight mode on. Tab to a word and press Space to highlight it.'); drawGrid(); } }, 'Highlight persuasive words');
      const btnCheck = h('button', { class: 'btn', type: 'button', onclick: () => { revealed = true; checked.add(a.id); use(a.id, 'highlight'); drawAd(); const keys = [...keySet], hit = keys.filter((k) => mine.has(k)).length, found = a.phrases.filter((p) => { const r = findPhrase(head, p) || findPhrase(body, p); return r; }).length; const stray = [...mine].filter((k) => !keySet.has(k)).length; clear(result); result.append(note(`You highlighted **${mine.size}** word${mine.size === 1 ? '' : 's'}; **${hit}** of the **${keys.length}** words in the designers’ persuasion phrases (${found} phrases, underlined in gold). ${stray ? `${stray} of yours were outside those phrases — that can be fine, if you can explain why.` : ''}`)); announce('Highlights checked.'); drawGrid(); } }, 'Check my highlights');
      const btnFine = h('button', { class: 'btn', type: 'button', 'aria-expanded': 'false', onclick: () => { finePane.hidden = !finePane.hidden; btnFine.setAttribute('aria-expanded', String(!finePane.hidden)); if (!finePane.hidden) use(a.id, 'fine'); drawGrid(); } }, 'Fine print');
      const btnWho = h('button', { class: 'btn', type: 'button', 'aria-expanded': 'false', onclick: () => { whoPane.hidden = !whoPane.hidden; btnWho.setAttribute('aria-expanded', String(!whoPane.hidden)); if (!whoPane.hidden) { drawWho(); use(a.id, 'who'); } drawGrid(); } }, 'Who sees it?');
      const back = h('button', { class: 'btn', type: 'button', onclick: () => { detail.hidden = true; grid.hidden = false; drawGrid(); const t = grid.querySelectorAll('.adtile'); const i = D.ADS.indexOf(a); t[i] && t[i].focus(); } }, '← All six ads');
      detail.append(h('div', { class: 'controls' }, back), h('div', { class: 'panel', style: 'margin-top:.6rem' }, adBox, finePane),
        h('div', { class: 'controls', style: 'margin-top:.7rem' }, btnHl, btnCheck, btnFine, btnWho), result, h('div', { class: 'panel', style: 'margin-top:.6rem' }, whoPane), extra,
        note('Ask three questions: **What technique is this? Who is it aimed at? What does it NOT tell me?** All brands, people and numbers here are fictional.'));
      btnHl.focus();
    }
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'Open all six ads, then use the three tools on each'), grid, detail));
    drawGrid();
  }

  // ---------------------------------------------------------------- Feed tab
  function feedPane(pane) {
    const posts = [
      { who: '@tylerbets', t: 'LET’S GO!!! Turned $10 into $240 tonight 🔥🔥🔥', kind: 'win' }, { who: '@maya.parlays', t: 'Hit a 5-leg parlay! Screenshot below 💰', kind: 'win' },
      { who: '@cole_wins', t: 'Another night, another win. Easy money.', kind: 'win' }, { who: '@jordan_picks', t: 'Tough night. Lost 7 bets. Down $185.', kind: 'loss' },
      { who: '@morgan.sports', t: 'Use my code when you sign up. I get credit when you join.', kind: 'referral' }, { who: '@dre.dubs', t: 'Cashed out early and still up 😎', kind: 'win' },
      { who: '@sam_locks', t: 'LOCK of the night, trust me. Code SAM50 gets you a bonus.', kind: 'referral' }, { who: '@nate.hoops', t: '3 for 3 this week!', kind: 'win' }
    ];
    const why = {
      win: ['Why this was posted', 'People like sharing wins: it brings likes and attention. A person who lost the same night usually stays quiet. The feed you see is a *selected* sample.'],
      loss: ['Why this is rare', 'Loss posts exist, but they are far less common. Seeing mostly wins can make winning look normal when it is not.'],
      referral: ['What the poster gains', 'The poster earns credit when friends join, so this is a hidden advertisement, not a neutral tip.']
    };
    const out = h('div'), list = h('div');
    posts.forEach((p, i) => {
      const detail = h('div', { hidden: true, class: 'lab-note' });
      const btn = h('button', { class: 'btn', type: 'button', 'aria-expanded': 'false', onclick: () => { detail.hidden = !detail.hidden; btn.setAttribute('aria-expanded', String(!detail.hidden)); if (!detail.hidden) { feedSeen.add(i); tally(); } } }, 'Why was this posted?');
      detail.append(h('b', null, why[p.kind][0] + ': '), (function () { const f = document.createDocumentFragment(); why[p.kind][1].split(/(\*[^*]+\*)/).forEach((s) => f.append(s.startsWith('*') ? h('em', null, s.slice(1, -1)) : document.createTextNode(s))); return f; })());
      list.append(h('div', { class: 'beat' }, h('div', null, h('div', { class: 'who' }, p.who), h('div', null, p.t), h('div', { style: 'margin-top:.4rem' }, btn), detail)));
    });
    function tally() {
      clear(out);
      if (feedSeen.size < 3) return;
      const w = posts.filter((p) => p.kind === 'win').length, l = posts.filter((p) => p.kind === 'loss').length, r = posts.filter((p) => p.kind === 'referral').length;
      out.append(h('div', { class: 'stat-grid' }, stat('Win posts', `${w} of ${posts.length}`, '', true), stat('Loss posts', `${l} of ${posts.length}`), stat('Referral posts', `${r} of ${posts.length}`)),
        note('In this **invented** feed, wins outnumber losses by a wide margin. Now compare with a made-up customer report: if 640 of 1,000 customers ended the month behind, the feed does not match what most customers actually experience. (These are classroom numbers for illustration, not statistics about real apps.)'));
    }
    pane.append(h('div', { class: 'panel' }, h('h3', null, 'A fictional social feed'), h('p', { class: 'muted' }, 'Open “Why was this posted?” on at least three posts.'), list, out));
  }

  const t = tabs([{ id: 'ads', label: 'Investigate the ads', build: adsPane }, { id: 'feed', label: 'The feed', build: feedPane }]);
  container.append(h('div', { class: 'sim' }, t.bar, t.body)); t.show(0); report();
  return { destroy() {} };
}
