// PREVIEW MODE (teacher/developer tools). Only reachable via  index.html?preview  plus the passcode.
// It uses its own storage namespace ("sigp") so it can never touch real student data.
import { h, sha256 } from './util.js';
import { CONFIG } from './config.js';
import { partsOf, stageKey, buildSubmission } from './engine.js';
import { canon } from './canon.js';
import { DOMAIN_NAME } from './scoring.js';
import { CHARTS } from './charts.js';

export function mountPreview({ api }) {
  document.body.insertBefore(h('div.pv-banner', 'PREVIEW MODE • teacher tools • nothing here touches real student data'), document.body.firstChild);
  document.getElementById('topbar').style.marginTop = '18px';
  const dock = h('div#pv', { role: 'region', 'aria-label': 'Preview Mode tools' });
  const body = h('div.pvbody'), tabs = h('div.pvtabs', { role: 'tablist' });
  const min = h('button', { type: 'button', onclick: () => dock.classList.toggle('min') }, 'min');
  const nxt = h('button#pv-next', { type: 'button', title: 'Same as Continue; always available in Preview Mode', onclick: () => { const b = document.querySelector('.navrow .btn.primary'); if (b && !b.disabled) b.click(); } }, 'Next step →');
  dock.append(h('div.pvhead', h('span', 'PREVIEW'), nxt, min), tabs, body); document.body.append(dock);
  const S = () => api.session, st = () => S().state, plan = () => S().plan;
  const out = h('pre'); const log = (x) => { out.textContent = typeof x === 'string' ? x : JSON.stringify(x, null, 2); };
  const btn = (label, fn, cls = '') => h('button.small' + cls, { type: 'button', onclick: fn }, label);
  const rerender = () => { api.renderStage(); };

  // ---- helpers acting on the session
  const stagesOf = (m) => plan().missions[m].resolved;
  const jump = (m, s) => { st().screen = 'mission'; st().completedAt = null; st().pos = { m, s }; S().save(); api.afterStart(); };
  const synth = (q, mode) => { // mode: 'c1','c2','c3' (correct at attempt n), 'lock', 'w1','w2', 'reset'
    const a = st().answers; delete a[q.id];
    if (mode === 'reset') { S().save(); return; }
    const n = mode === 'lock' ? 3 : +mode.slice(1);
    const rec = { attempts: [], status: 'open' };
    const wrongCount = mode === 'lock' ? 3 : mode[0] === 'c' ? n - 1 : n;
    for (let i = 0; i < wrongCount; i++) rec.attempts.push({ n: i + 1, resp: null, c: 'preview-wrong-' + i, t: Date.now(), correct: false, preview: true });
    if (mode[0] === 'c') { rec.attempts.push({ n, resp: null, c: 'preview-correct', t: Date.now(), correct: true, preview: true }); rec.status = 'correct'; }
    else if (mode === 'lock') rec.status = 'locked';
    a[q.id] = rec; S().save();
  };
  const currentParts = () => { const { m, s } = st().pos; const stg = stagesOf(m)[Math.max(0, s)]; return stg ? partsOf(stg) : []; };

  const TABS = {
    Jump() {
      const wrap = h('div');
      const ms = h('select', { 'aria-label': 'Mission' }, plan().missions.map((m, i) => h('option', { value: i, selected: i === st().pos.m }, `${i + 1}. ${m.title}`)));
      const ss = h('select', { 'aria-label': 'Step' });
      const fill = () => { ss.replaceChildren(...stagesOf(+ms.value).map((x, i) => h('option', { value: i, selected: i === st().pos.s }, `${i + 1}. ${x.kind === 'scene' ? '[' + x.scene + '] ' + x.id : partsOf(x).map((q) => q.id).join(', ')}`))); };
      ms.onchange = fill; fill();
      wrap.append(h('div', ms, ' ', ss, ' ', btn('Go', () => jump(+ms.value, +ss.value))),
        h('div', btn('Entry screen', () => api.screenEntry()), btn('Orientation', () => { st().screen = 'orient'; st().completedAt = null; api.screenOrient(); }), btn('Review screen', () => { st().screen = 'review'; api.screenReview(); })),
        h('h4', 'All missions'), ...plan().missions.map((m, i) => h('div', btn(`${i + 1}`, () => api.startMission(i)), ' ', m.title, h('span.small.muted', ` (${stagesOf(i).length} steps)`))));
      return wrap;
    },
    Questions() {
      const wrap = h('div'); const ps = currentParts();
      wrap.append(h('p.small', 'Questions on the current step. Marking does not use the grader; it writes synthetic attempts so you can see every state.'));
      ps.forEach((q) => {
        const r = S().rec(q.id);
        wrap.append(h('div', h('b', q.id), ` (${q.pts} pt, ${q.type}) — ${r ? r.status + ', ' + r.attempts.length + ' attempts' : 'open'}`),
          h('div', ...[['Reset', 'reset'], ['✓ attempt 1', 'c1'], ['✓ attempt 2', 'c2'], ['✓ attempt 3', 'c3'], ['× wrong once', 'w1'], ['× wrong twice', 'w2'], ['××× lock', 'lock']].map(([l, m]) => btn(l, () => { synth(q, m); rerender(); }))));
      });
      wrap.append(h('h4', 'Whole assessment'), h('div', btn('Reset current mission', () => { stagesOf(st().pos.m).forEach((x) => partsOf(x).forEach((q) => delete st().answers[q.id])); S().save(); jump(st().pos.m, 0); }), btn('Reset EVERYTHING', () => { if (confirm('Reset the whole preview session?')) api.resetAll(); })),
        h('div', btn('Mark ALL correct (attempt 1)', () => { S().parts.forEach((q) => synth(q, 'c1')); api.toast('All questions marked correct.'); rerender(); }), btn('Mark ALL random', () => { S().parts.forEach((q, i) => synth(q, ['c1', 'c1', 'c2', 'c3', 'lock'][(i * 7) % 5])); rerender(); })));
      return wrap;
    },
    Scoring() {
      const t = S().totals(); const wrap = h('div');
      wrap.append(h('p', h('b', `${t.earned} / ${t.possible}`), ` points (${t.pct}%)`), h('p.small', `1st: ${t.first}  2nd: ${t.second}  3rd: ${t.third}  missed: ${t.missed}  unanswered: ${t.unanswered}`),
        h('table.data', h('thead', h('tr', h('th', 'Domain'), h('th', 'Earned'), h('th', 'Possible'))), h('tbody', Object.entries(t.byDomain).map(([k, v]) => h('tr', h('td', DOMAIN_NAME[k]), h('td', v.earned), h('td', v.possible))))),
        h('h4', 'Per question'), h('table.data', h('tbody', S().parts.map((q) => { const r = S().rec(q.id); return h('tr', h('td', q.id), h('td', r ? r.status : 'open'), h('td', r ? r.attempts.length : 0), h('td', q.pts)); }))));
      return wrap;
    },
    Data() {
      const s = JSON.parse(JSON.stringify(st())); delete s.stageIds;
      const wrap = h('div', h('p.small', 'Session state as stored in localStorage (namespace "sigp"):'), h('pre', JSON.stringify(s, null, 1).slice(0, 6000)),
        h('div', btn('Copy JSON', () => navigator.clipboard.writeText(JSON.stringify(st())).then(() => api.toast('Copied.'))), btn('List storage keys', () => log(Object.keys(api.store.dump()))), btn('Clear preview storage', () => api.resetAll())), out);
      return wrap;
    },
    Pools() {
      const wrap = h('div'); const chosen = new Set(plan().ids);
      wrap.append(h('p.small', `This session: version ${st().versionId}, seed ${st().seed}. Chosen items are marked ●.`), h('div', btn('New random version', () => { const old = st().seed; st().seed = Math.random().toString(36).slice(2, 12); S().state.answers = {}; api.setSession(new S().constructor(st(), api.content, api.store)); S().state.stageIds = S().plan.ids; S().state.versionId = S().plan.versionId; S().save(); api.toast('Version ' + st().versionId); jump(0, 0); })));
      api.content.missions.forEach((m, mi) => m.stages.filter((x) => x.kind === 'pool').forEach((p) => {
        wrap.append(h('h4', `${m.title} → pool "${p.id}"`));
        p.groups.forEach((g, gi) => g.items.forEach((it) => { const id = stageKey(it), on = chosen.has(id); wrap.append(h('div', on ? '● ' : '○ ', h('b', id), ' ', h('span.small.muted', `group ${gi + 1} (pick ${g.pick}) `), btn('Preview here', () => { const ms = plan().missions[mi].resolved; const { s } = st().pos; ms.splice(Math.max(0, s) + 1, 0, it); jump(mi, Math.max(0, s) + 1); }))); }));
      }));
      return wrap;
    },
    'Graphs & sims'() {
      const wrap = h('div', h('p.small', 'Jump to every chart and simulation. "Unlock" sets the simulation as complete so its questions open.'));
      plan().missions.forEach((m, mi) => stagesOf(mi).forEach((x, si) => { if (x.kind === 'scene') wrap.append(h('div', btn(`${x.scene}: ${x.id}`, () => jump(mi, si)), btn('Unlock', () => { (st().sims[x.id] = st().sims[x.id] || {}).ready = true; S().save(); rerender(); }))); }));
      wrap.append(h('h4', 'Chart ids'), h('div', Object.keys(CHARTS).join(', ')));
      return wrap;
    },
    Results() {
      return h('div', h('p.small', 'Shows the results dashboard without sending anything, or sends a DEMO submission to your backend.'),
        h('div', btn('Preview results (all correct)', () => { S().parts.forEach((q) => synth(q, 'c1')); st().completedAt = Date.now(); st().submit = { status: 'nobackend', confirm: 'PREVIEW-0001' }; api.screenResults(); }),
          btn('Preview results (mixed)', () => { S().parts.forEach((q, i) => synth(q, ['c1', 'c1', 'c2', 'c3', 'lock', 'c1'][(i * 5) % 6])); st().completedAt = Date.now(); st().submit = { status: 'nobackend', confirm: 'PREVIEW-0002' }; api.screenResults(); })),
        h('div', btn('Simulate COMPLETED submission (sends DEMO row)', async () => { S().parts.forEach((q, i) => synth(q, ['c1', 'c1', 'c2', 'lock'][(i * 3) % 4])); await api.finalize(); }), btn('Back to assessment', () => { st().completedAt = null; st().submit = { status: 'none' }; jump(Math.max(0, st().pos.m), Math.max(0, st().pos.s)); })));
    },
    Sheets() {
      const wrap = h('div', h('p.small', `Backend: ${CONFIG.backendUrl ? CONFIG.backendUrl.slice(0, 48) + '…' : '(not configured in js/config.js)'}`), out);
      wrap.append(h('div', btn('Test connection (ping)', async () => { log('Pinging…'); log(await api.send('ping')); }),
        btn('Validate DEMO2026', async () => log(await api.send('validate', { code: 'DEMO2026', name: 'Preview Teacher' }))),
        btn('Send sample DEMO submission', async () => { const p = buildSubmission(S()); p.student = { ...p.student, code: 'DEMO2026' }; p.completedAt = Date.now(); p.sid = 'S-PREVIEW' + Math.floor(Math.random() * 1e6); await api.send('start', { ...p, action: undefined }); log(await api.send('submit', p)); })));
      return wrap;
    },
    Tools() {
      const code = h('input', { placeholder: 'Class code to hash' }), pass = h('input', { placeholder: 'New preview passcode' });
      return h('div', h('h4', 'Class-code hasher'), code, ' ', btn('Hash', () => log(`'${sha256(CONFIG.codeSalt + '|' + code.value.trim().toUpperCase())}', // ${code.value.trim().toUpperCase()}`)),
        h('h4', 'Preview passcode hasher'), pass, ' ', btn('Hash', () => log(sha256(CONFIG.previewSalt + '|' + pass.value))),
        h('p.small', 'Paste results into js/config.js (classCodeHashes / previewPasscodeHash).'), out);
    }
  };
  let cur = 'Jump';
  const paint = () => { tabs.replaceChildren(...Object.keys(TABS).map((k) => h('button', { role: 'tab', 'aria-selected': k === cur ? 'true' : 'false', onclick: () => { cur = k; paint(); } }, k))); body.replaceChildren(TABS[cur]()); };
  paint();
  const obs = new MutationObserver(() => { if (cur === 'Questions' || cur === 'Scoring' || cur === 'Jump') { clearTimeout(obs._t); obs._t = setTimeout(() => { if (document.contains(dock)) body.replaceChildren(TABS[cur]()); }, 400); } });
  obs.observe(document.getElementById('main'), { childList: true });
  window.addEventListener('keydown', (e) => { if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'p') dock.classList.toggle('min'); });
}
