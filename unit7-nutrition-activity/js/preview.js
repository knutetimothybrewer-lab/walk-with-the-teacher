// PREVIEW MODE (teacher-only). Reachable only via  index.html?preview  plus the preview passcode.
// Uses its own storage namespace ("<prefix>p") so it can never touch real student data, and shows a banner on every screen.
import { h } from './util.js';
import { CONFIG } from './config.js';
import { partsOf, stageKey, buildSubmission, Session, newState } from './engine.js';
import { DOMAIN_NAME, ATTEMPT_CREDIT } from './scoring.js';
import { solve, candidates, describe } from './solve.js';
import { canon, answerHash } from './canon.js';
import { CHARTS } from './charts.js';

export function mountPreview({ api }) {
  document.body.insertBefore(h('div.pv-banner', 'PREVIEW MODE • TEACHER TOOLS • NOT A STUDENT ATTEMPT • nothing here touches real student data'), document.body.firstChild);
  const dock = h('div#pv', { role: 'region', 'aria-label': 'Preview Mode tools' });
  const body = h('div.pvbody'), tabs = h('div.pvtabs', { role: 'tablist' });
  const min = h('button', { type: 'button', onclick: () => dock.classList.toggle('min') }, 'min');
  dock.append(h('div.pvhead', h('span', 'PREVIEW MODE'), min), tabs, body); document.body.append(dock);
  const S = () => api.session, st = () => S().state, plan = () => S().plan;
  const out = h('pre'); const log = (x) => { out.textContent = typeof x === 'string' ? x : JSON.stringify(x, null, 2); };
  const btn = (label, fn) => h('button', { type: 'button', onclick: fn }, label);
  const stagesOf = (m) => plan().missions[m].resolved;
  const jump = (m, s) => { st().screen = 'mission'; st().completedAt = null; st().pos = { m, s }; S().save(); api.afterStart(); };
  const currentParts = () => { const { m, s } = st().pos; const stg = stagesOf(m)[Math.max(0, s)]; return stg ? partsOf(stg) : []; };
  const salt = () => api.content.salt;
  const serverAnswers = {};
  const answersOf = (q) => (q.h ? solve(q, salt()).map((c) => describe(q, c.c)) : serverAnswers[q.id] ? [serverAnswers[q.id]] : []);
  const wrongOf = (q) => { const good = new Set((q.h || [])); let last = null; for (const c of candidates(q)) { last = c; if (q.h && !good.has(answerHash(salt(), q.id, c.c))) return c; } return q.h ? null : last; };
  const synth = (q, mode) => { // synthetic attempts (bypass the grader): c1/c2/c3 = correct at attempt n; w1/w2; lock; reset
    const a = st().answers; delete a[q.id];
    if (mode === 'reset') { S().save(); return; }
    const wrongCount = mode === 'lock' ? 3 : mode[0] === 'c' ? +mode.slice(1) - 1 : +mode.slice(1);
    const rec = { attempts: [], status: 'open' };
    for (let i = 0; i < wrongCount; i++) rec.attempts.push({ n: i + 1, resp: null, c: 'preview-wrong-' + i, t: Date.now(), correct: false, preview: true });
    if (mode[0] === 'c') { rec.attempts.push({ n: wrongCount + 1, resp: null, c: 'preview-correct', t: Date.now(), correct: true, preview: true }); rec.status = 'correct'; }
    else if (mode === 'lock') rec.status = 'locked';
    a[q.id] = rec; S().save();
  };
  const allDone = (mode) => { S().parts.forEach((q, i) => synth(q, typeof mode === 'function' ? mode(i) : mode)); };

  const TABS = {
    Jump() {
      const ms = h('select', { 'aria-label': 'Mission' }, plan().missions.map((m, i) => h('option', { value: i, selected: i === st().pos.m }, `${i + 1}. ${m.title}`)));
      const ss = h('select', { 'aria-label': 'Step' });
      const fill = () => { ss.replaceChildren(...stagesOf(+ms.value).map((x, i) => h('option', { value: i, selected: i === st().pos.s }, `${i + 1}. ${x.kind === 'scene' ? '[' + x.scene + '] ' + x.id : x.kind === 'choice' ? '[choice] ' + x.id : partsOf(x).map((q) => q.id).join(', ')}`))); };
      ms.onchange = fill; fill();
      return h('div', h('div', ms, ' ', ss, ' ', btn('Go', () => jump(+ms.value, +ss.value))),
        h('div', btn('Entry screen', () => api.screenEntry()), btn('Orientation', () => { st().screen = 'orient'; st().completedAt = null; api.screenOrient(); }), btn('Review screen', () => { st().screen = 'review'; api.screenReview(); })),
        h('h4', 'All missions'), ...plan().missions.map((m, i) => h('div', btn(`${i + 1}`, () => api.startMission(i)), ' ', m.title, h('span', ` (${stagesOf(i).length} steps)`))));
    },
    Questions() {
      const wrap = h('div', h('p', 'Questions on the current step. "Real" buttons go through the actual answer-checking code and attempt counter; "Mark" buttons write synthetic attempts.'));
      currentParts().forEach((q) => {
        const r = S().rec(q.id), correct = answersOf(q);
        wrap.append(h('div', h('b', q.id), ` (${q.pts} pt, ${q.type}, ${q.domain}/${q.concept}) — ${r ? r.status + ', ' + r.attempts.length + ' attempts' : 'open'}`),
          h('div', btn('Show correct answer', () => log(correct.length ? correct.join('\n  OR\n') : (q.h ? 'No accepted response found' : 'Server-grading build: answers are not in the browser. Use the "Load answers" button on the Sheets tab.'))),
            btn('Real: submit CORRECT', () => { const it = api.current && api.current.items && api.current.items[q.id]; if (it && correct[0]) { const resp = correct[0].resp; it.attempt(resp); } }),
            btn('Real: submit WRONG', () => { const it = api.current && api.current.items && api.current.items[q.id]; const w = wrongOf(q); if (it && w) it.attempt(w.resp); })),
          h('div', ...[['Reset', 'reset'], ['✓ attempt 1', 'c1'], ['✓ attempt 2', 'c2'], ['✓ attempt 3', 'c3'], ['× once', 'w1'], ['× twice', 'w2'], ['××× lock', 'lock']].map(([l, m]) => btn(l, () => { synth(q, m); api.renderStage(); }))));
      });
      wrap.append(out, h('h4', 'Whole assessment'),
        h('div', btn('Reset current mission', () => { stagesOf(st().pos.m).forEach((x) => partsOf(x).forEach((q) => delete st().answers[q.id])); S().save(); jump(st().pos.m, 0); }), btn('Reset EVERYTHING', () => { if (confirm('Reset the whole preview session?')) api.resetAll(); })),
        h('div', btn('Mark ALL correct (attempt 1)', () => { allDone('c1'); api.toast('All marked correct.'); api.renderStage(); }), btn('Mark ALL mixed', () => { allDone((i) => ['c1', 'c1', 'c2', 'c3', 'lock'][(i * 7) % 5]); api.renderStage(); })));
      return wrap;
    },
    'All answers'() {
      const wrap = h('div', h('p', 'Correct answer(s) for every question in THIS randomized version (derived from the hashed key).'));
      S().parts.forEach((q) => wrap.append(h('div', h('b', q.id + ' '), `(${q.pts} pt) `, answersOf(q).join(' OR ') || '(none found; server-grading build)')));
      return wrap;
    },
    Scoring() {
      const t = S().totals(); const wrap = h('div');
      wrap.append(h('p', h('b', `${t.earned} / ${t.possible}`), ` points (${t.pct}%)`), h('p', `1st: ${t.first}  2nd: ${t.second}  3rd: ${t.third}  zero: ${t.missed}  unanswered: ${t.unanswered}`),
        h('p', 'Attempt credit: ' + ATTEMPT_CREDIT.map((c, i) => `attempt ${i + 1} = ${c * 100}%`).join(', ') + ', then 0.'),
        h('table.data', h('thead', h('tr', h('th', 'Domain'), h('th', 'Earned'), h('th', 'Possible'))), h('tbody', Object.entries(t.byDomain).map(([k, v]) => h('tr', h('td', DOMAIN_NAME[k]), h('td', v.earned), h('td', v.possible))))),
        h('h4', 'Per question'), h('table.data', h('tbody', S().parts.map((q) => { const r = S().rec(q.id); return h('tr', h('td', q.id), h('td', r ? r.status : 'open'), h('td', r ? r.attempts.length : 0), h('td', q.pts)); }))));
      return wrap;
    },
    Data() {
      const s = JSON.parse(JSON.stringify(st())); delete s.stageIds;
      return h('div', h('p', 'Session state as stored in localStorage (preview namespace):'), h('pre', JSON.stringify(s, null, 1).slice(0, 6000)),
        h('div', btn('Copy JSON', () => navigator.clipboard.writeText(JSON.stringify(st())).then(() => api.toast('Copied.'))), btn('List storage keys', () => log(Object.keys(api.store.dump()))), btn('Clear preview storage', () => api.resetAll())), out);
    },
    Randomization() {
      const chosen = new Set(plan().ids);
      const wrap = h('div', h('p', `This session: version ${st().versionId}, seed ${st().seed}, names ${plan().names.join(', ')}. Chosen items are marked ●.`),
        h('div', btn('New random version', () => { st().seed = Math.random().toString(36).slice(2, 12); st().answers = {}; st().sims = {}; st().choices = {}; api.setSession(new Session(st(), api.content, api.store)); S().rebuild(); S().save(); api.toast('New version ' + S().plan.versionId); jump(0, 0); })));
      api.content.missions.forEach((m, mi) => m.stages.filter((x) => x.kind === 'pool').forEach((p) => {
        wrap.append(h('h4', `${m.title} → pool "${p.id}"${p.by ? ' (branches on ' + p.by + ')' : ''}`));
        p.groups.forEach((g, gi) => g.items.forEach((it) => { const id = stageKey(it); wrap.append(h('div', chosen.has(id) ? '● ' : '○ ', h('b', id), h('span', ` ${g.when ? 'branch ' + g.when + ' ' : ''}(pick ${g.pick} of ${g.items.length})`))); }));
      }));
      return wrap;
    },
    'Sims & graphs'() {
      const wrap = h('div', h('p', 'Jump to every simulation. "Unlock" marks the simulation complete so its questions open.'));
      plan().missions.forEach((m, mi) => stagesOf(mi).forEach((x, si) => { if (x.kind === 'scene') wrap.append(h('div', btn(`${x.scene}: ${x.id}`, () => jump(mi, si)), btn('Unlock', () => { (st().sims[x.id] = st().sims[x.id] || {}).ready = true; S().save(); api.renderStage(); }))); }));
      wrap.append(h('h4', 'Graphs (shown inside the questions that use them)'), h('div', Object.keys(CHARTS).join(', ')));
      return wrap;
    },
    Results() {
      return h('div', h('p', 'Shows the final results screen without sending anything.'),
        h('div', btn('Preview results (all correct)', () => { allDone('c1'); st().completedAt = Date.now(); st().submit = { status: 'nobackend', confirm: 'PREVIEW-0001' }; api.screenResults(); }),
          btn('Preview results (mixed)', () => { allDone((i) => ['c1', 'c1', 'c2', 'c3', 'lock', 'c1'][(i * 5) % 6]); st().completedAt = Date.now(); st().submit = { status: 'nobackend', confirm: 'PREVIEW-0002' }; api.screenResults(); }),
          btn('Back to assessment', () => { st().completedAt = null; st().submit = { status: 'none' }; jump(Math.max(0, st().pos.m), Math.max(0, st().pos.s)); })));
    },
    Sheets() {
      const pass = h('input', { type: 'password', placeholder: 'Teacher dashboard passcode', 'aria-label': 'Teacher dashboard passcode' });
      const loadBtn = btn('Load answers from the Sheet (server-grading builds)', async () => { if (!pass.value) { log('Type the teacher dashboard passcode first.'); return; } const r = await api.send('t_data', { pass: pass.value }); if (r && r.ok) { Object.entries(r.meta).forEach(([k, v]) => { serverAnswers[k] = v.a; }); log('Loaded ' + Object.keys(r.meta).length + ' answers.'); } else log(r); });
      const wrap = h('div', h('p', `Backend: ${CONFIG.backendUrl ? CONFIG.backendUrl.slice(0, 54) + '…' : '(not configured in js/config.js)'}`), out);
      wrap.append(h('div', loadBtn), h('div', btn('Test connection (ping)', async () => { log('Pinging…'); log(await api.send('ping')); }),
        btn('Check class code "' + (CONFIG.classCodes[0] || '') + '"', async () => log(await api.send('validate', { code: CONFIG.classCodes[0], first: 'Preview', last: 'Teacher', block: CONFIG.blocks[0], assessmentId: CONFIG.assessmentId })))),
        h('div', 'Send a TEST submission through the full pipeline (it is saved as DEMO DATA, so it never mixes with real grades): ', pass, ' ',
          btn('Send test submission', async () => { allDone((i) => ['c1', 'c1', 'c2', 'c3', 'lock'][(i * 3) % 5]); const p = buildSubmission(S(), CONFIG.assessmentId); p.student = { ...p.student, first: 'Preview', last: 'Test', block: CONFIG.blocks[0] }; p.completedAt = Date.now(); p.sid = 'S-PREVIEW' + Math.floor(Math.random() * 1e6); p.attempts = p.attempts.map((a) => ({ ...a, c: 'preview' })); log('Sending…'); log(await api.send('t_test_submit', { pass: pass.value, payload: p })); })));
      return wrap;
    },
    Tools() {
      const kind = h('select', { 'aria-label': 'Code type' }, ['reset', 'preview', 'dash'].map((k) => h('option', { value: k }, k === 'reset' ? 'Teacher reset code' : k === 'preview' ? 'Preview passcode' : 'Offline dashboard passcode')));
      const code = h('input', { placeholder: 'Type a new code', 'aria-label': 'New code' });
      return h('div', h('h4', 'Hash a teacher code for js/config.js'), kind, ' ', code, ' ', btn('Hash', () => log(`${kind.value === 'reset' ? 'resetCodeHash' : kind.value === 'preview' ? 'previewPasscodeHash' : 'teacherPasscodeHash'}: '${api.hashOf(kind.value, code.value)}',`)),
        h('p', 'Copy the printed line into js/config.js. (You can also use teacher/setup.html.)'), out);
    }
  };
  let cur = 'Jump';
  const paint = () => { tabs.replaceChildren(...Object.keys(TABS).map((k) => h('button', { role: 'tab', 'aria-selected': k === cur ? 'true' : 'false', onclick: () => { cur = k; paint(); } }, k))); body.replaceChildren(TABS[cur]()); };
  paint();
  const obs = new MutationObserver(() => { if (['Questions', 'Scoring', 'Jump', 'All answers'].includes(cur)) { clearTimeout(obs._t); obs._t = setTimeout(() => { if (document.contains(dock)) body.replaceChildren(TABS[cur]()); }, 400); } });
  obs.observe(document.getElementById('main'), { childList: true });
  window.addEventListener('keydown', (e) => { if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'p') dock.classList.toggle('min'); });
}
