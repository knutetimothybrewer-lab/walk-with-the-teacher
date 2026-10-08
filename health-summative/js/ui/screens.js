/* screens.js — welcome, station intro/end, final score, settings, trail, sources, review. */
import { h, rich, $, clear, announce, openDialog, plain } from './dom.js';
import { settings } from './settings.js';
import { renderReviewCard } from './runner.js';
import { queueLength } from '../engine/sync.js';
import { estimateSeconds, INTRO_SECONDS } from '../engine/timing.js';

const root = () => document.getElementById('app');
const pctText = (m) => `${Math.round(m * 100)}%`;
const fmtPts = (n) => String(Math.round(n * 10) / 10);

function mount(node, focusSel = 'h1') {
  const r = root();
  clear(r);
  r.append(node);
  window.scrollTo(0, 0);
  const f = node.querySelector(focusSel);
  if (f) { f.setAttribute('tabindex', '-1'); f.focus({ preventScroll: true }); }
}

/* ======================= WELCOME ======================= */
function welcome(app, existing) {
  const { cfg } = app;
  const form = h('form', { class: 'form', novalidate: true, autocomplete: 'off' });
  const err = h('p', { class: 'form-err', role: 'alert', hidden: true });
  const submit = h('button', { type: 'submit', class: 'btn-primary big' }, 'Start the trail');

  const field = (id, label, input, hint) => h('div', { class: 'field' }, h('label', { for: id }, label), input, hint ? h('small', { id: id + '-h' }, hint) : null);
  const first = h('input', { id: 'f-first', name: 'first', type: 'text', autocomplete: 'off', maxlength: '30', required: true, 'aria-describedby': 'f-first-h' });
  const last = h('input', { id: 'f-last', name: 'last', type: 'text', autocomplete: 'off', maxlength: '30', required: true, 'aria-describedby': 'f-last-h' });
  const period = h('select', { id: 'f-period', name: 'period', required: true }, h('option', { value: '' }, 'Choose…'), ...cfg.periods.map(p => h('option', { value: p }, /^\d+$/.test(p) ? `Period ${p}` : p)));
  const code = h('input', { id: 'f-code', name: 'code', type: 'text', autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', maxlength: '20', required: true, 'aria-describedby': 'f-code-h' });

  if (existing && existing.status !== 'final') {
    form.append(
      h('p', { class: 'welcome-back' }, `Welcome back, ${existing.student.first}! Your progress was saved.`),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn-primary big', id: 'btn-resume' }, 'Continue where I left off'),
        h('button', { type: 'button', class: 'btn-quiet', id: 'btn-notme' }, `Not ${existing.student.first}? Start as someone else`)));
  } else if (existing && existing.status === 'final') {
    form.append(h('p', { class: 'welcome-back' }, `${existing.student.first}, you've already finished. `),
      h('div', { class: 'row' }, h('button', { type: 'button', class: 'btn-primary big', id: 'btn-resume' }, 'See my results'),
        h('button', { type: 'button', class: 'btn-quiet', id: 'btn-notme' }, `Not ${existing.student.first}? Start as someone else`)));
  } else {
    form.append(
      h('div', { class: 'grid2' }, field('f-first', 'First name', first, 'Just your first name.'), field('f-last', 'Last name (or initial)', last, 'An initial is fine.')),
      h('div', { class: 'grid2' }, field('f-period', 'Class period', period), field('f-code', 'Class code', code, 'Your teacher gave you this.')),
      err, submit);
  }

  const levels = cfg.attemptCredit.map((c, i) => `try ${i + 1}: ${Math.round(c * 100)}%`).join(' · ');
  const node = h('section', { class: 'card hero' },
    h('p', { class: 'eyebrow' }, `${cfg.schoolName} ${cfg.mascot} · ${cfg.unitName}`),
    h('h1', {}, cfg.appTitle),
    h('p', { class: 'lead' }, 'Walk the trail from storm to sunrise. Ten short stations, about 45 minutes. The sky gets brighter as you go.'),
    h('div', { class: 'note calm' }, h('strong', {}, 'A quick note. '), 'This assessment includes scenarios about stress, sadness, and safety. You can take a break or skip any scenario. The "Need help? / Take a break" button is always at the top of the screen.'),
    form,
    h('details', { class: 'how' }, h('summary', {}, 'How scoring works'),
      h('ul', {},
        h('li', {}, `You get ${cfg.maxAttempts} tries on every question. Credit goes down a little with each try (${levels}).`),
        h('li', {}, 'After a wrong try you get a hint, not the answer. After the last try we show you the answer and why.'),
        h('li', {}, 'For sorting and matching, cards you get right stay put so you only fix what is wrong.'),
        h('li', {}, 'Your progress saves automatically. If the page refreshes, you pick up where you left off.'),
        h('li', {}, 'There is no timer that locks you out. The "time left" note is only a gentle guide.'))),
    h('p', { class: 'privacy' }, h('strong', {}, 'Privacy: '), 'we save only your name, period, and your answers to these questions for your teacher. No ads, no trackers, and we never ask about your own feelings or experiences.'),
    h('p', { class: 'links' }, h('button', { type: 'button', class: 'linkish', id: 'btn-sources' }, 'See our sources')));
  mount(node);
  $('#btn-sources').addEventListener('click', (e) => { sources(app); openDialog($('#sources'), e.currentTarget); });
  const resume = $('#btn-resume'); if (resume) resume.addEventListener('click', () => { app.session.status === 'final' ? app.render() : app.render(); });
  const notme = $('#btn-notme'); if (notme) notme.addEventListener('click', () => app.switchStudent());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.hidden = true;
    if (await app.startTeacher(code.value)) return app.render();
    const student = { first: first.value.trim(), last: last.value.trim(), period: period.value, code: code.value.trim() };
    if (!student.first || !student.last || !student.period || !student.code) {
      return showErr(err, 'Please fill in all four boxes.');
    }
    submit.disabled = true; submit.textContent = 'Checking…';
    let r;
    try { r = await app.start(student); } catch (ex) { r = { ok: false, reason: 'error', detail: String((ex && ex.message) || ex).slice(0, 120) }; }
    if (!r.ok) {
      submit.disabled = false; submit.textContent = 'Start the trail';
      const msg = r.reason === 'duplicate' ? 'A final score for this name and period is already on record. If you need a retake, ask your teacher to reset it.'
        : r.reason === 'network' ? "We couldn't reach the server to check your code. Check your Wi-Fi and try again, or ask your teacher."
          : r.reason === 'error' ? 'Something went wrong starting the trail. Try again, or ask your teacher.'
            : "Hmm, that class code didn't work. Check it with your teacher and try again.";
      const detail = r.detail || (r.via === 'server' && r.reason && r.reason !== 'duplicate' ? `server said: ${r.reason}` : '');
      return showErr(err, detail ? `${msg} (Technical detail for your teacher: ${detail})` : msg);
    }
    app.render();
  });
}
function showErr(el, msg) { el.textContent = msg; el.hidden = false; announce(msg); }

/* ======================= STATION INTRO / END ======================= */
function trailStrip(app, activeIdx) {
  const s = app.session;
  return h('ol', { class: 'trail-strip', 'aria-label': 'Stations on the trail' }, app.plan.stations.map(st => {
    const done = s.stationsDone[st.index];
    const cur = st.index === activeIdx;
    return h('li', { class: `tnode ${done ? 'done' : cur ? 'cur' : ''}`, 'aria-current': cur ? 'step' : null }, h('span', { class: 'dot' }, done ? '✓' : String(st.num)), h('span', { class: 'tname' }, st.short || st.title));
  }));
}

function stationIntro(app, st) {
  const secs = st.steps.reduce((t, r) => t + app.secondsFor(r), 0) + INTRO_SECONDS;
  const mins = Math.max(1, Math.round(secs / 60));
  const scored = st.steps.filter(r => !r.explore).length;
  const node = h('section', { class: `card station-intro ${st.alert ? 'alert-zone' : ''}`, 'data-station': st.id },
    h('p', { class: 'eyebrow' }, `Station ${st.num} of ${app.plan.stations.length}`),
    h('h1', {}, st.title),
    h('p', { class: 'lead' }, rich(st.blurb)),
    st.what ? h('ul', { class: 'what' }, st.what.map(w => h('li', {}, rich(w)))) : null,
    st.callout ? h('div', { class: 'note calm' }, rich(st.callout)) : null,
    h('p', { class: 'meta' }, `${scored} questions · about ${mins} min`),
    trailStrip(app, st.index),
    h('div', { class: 'item-foot' }, h('span'), h('button', { type: 'button', class: 'btn-primary big', id: 'btn-begin' }, 'Begin this station →')));
  mount(node);
  $('#btn-begin').addEventListener('click', () => app.beginStation());
}

function stationEnd(app, st) {
  const s = app.session;
  const rows = st.steps.filter(r => !r.explore);
  const earned = rows.reduce((t, r) => t + (s.items[r.id] ? s.items[r.id].earned : 0), 0);
  const possible = rows.reduce((t, r) => t + r.points, 0);
  const first = rows.filter(r => { const x = s.items[r.id]; return x && !x.skipped && x.attempts[0] && x.attempts[0].fraction >= 1; }).length;
  const last = st.index === app.plan.stations.length - 1;
  const val = h('span', { class: 'bigpts' }, '0');
  const node = h('section', { class: 'card station-end' },
    h('p', { class: 'eyebrow' }, `Station ${st.num} complete`),
    h('h1', {}, last ? 'You reached the end of the trail.' : 'Nice work. Take a breath.'),
    h('p', { class: 'lead' }, h('span', { class: 'sparkle', 'aria-hidden': 'true' }, '✦ '), val, ` of ${fmtPts(possible)} wellness points earned here`),
    h('p', {}, `${first} of ${rows.length} questions right on the first try.`),
    st.farewell ? h('p', { class: 'note calm' }, rich(st.farewell)) : null,
    h('div', { class: 'item-foot' }, h('button', { type: 'button', class: 'btn-quiet', id: 'btn-trail' }, 'See the trail'),
      h('button', { type: 'button', class: 'btn-primary big', id: 'btn-cont' }, last ? 'See my results →' : 'Continue to the next station →')));
  mount(node);
  animateNumber(val, 0, earned);
  $('#btn-cont').addEventListener('click', () => app.nextStation());
  $('#btn-trail').addEventListener('click', (e) => { trailDialog(app); openDialog($('#trail'), e.currentTarget); });
}

function animateNumber(el, from, to, dur = 900, fmt = fmtPts) {
  if (settings.reducedMotion()) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const f = (now) => { const k = Math.min(1, (now - t0) / dur); const e = 1 - Math.pow(1 - k, 3); el.textContent = fmt(from + (to - from) * e); if (k < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}

/* ======================= FINAL ======================= */
const BANDS = [
  [90, 'You reached the sunrise, and you brought a lot of understanding with you.', 'Your answers show strong judgment about noticing, asking, and connecting.'],
  [75, 'You made it to the sunrise. That took focus and care.', 'You have a solid grasp of the big ideas, with a few spots worth another look.'],
  [60, 'You made it to the sunrise. Good work sticking with it.', 'You understand a lot already. The topics below are good places to build next.'],
  [0, 'You made it to the sunrise. Finishing a hard topic is something to be proud of.', 'Every question you worked through is practice. Use the list below to pick where to start, and ask your teacher for help any time.'],
];

function final(app) {
  const s = app.session, cfg = app.cfg;
  const r = s.result;
  const band = BANDS.find(b => r.percent >= b[0]);
  const topicRows = Object.entries(r.byTopic).map(([k, v]) => ({ k, ...v })).sort((a, b) => b.percent - a.percent || a.k.localeCompare(b.k));
  const strongest = topicRows[0];
  const review = topicRows.filter(t => t.percent < 80).sort((a, b) => a.percent - b.percent).slice(0, 3);
  const pct = h('span', { class: 'bigpct', id: 'finalPct' }, '0');

  const bars = app.plan.stations.map(st => {
    const v = r.byStation[st.id] || { percent: 0 };
    const fill = h('span', { class: 'barfill', style: 'width:0%' });
    const row = h('li', { class: 'bar-row' }, h('span', { class: 'bar-name' }, `${st.num}. ${st.short || st.title}`),
      h('span', { class: 'bar-track', role: 'img', 'aria-label': `${v.percent}%` }, fill), h('span', { class: 'bar-pct' }, `${v.percent}%`));
    requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = v.percent + '%'; }));
    return row;
  });

  const code = h('code', { class: 'ccode', id: 'ccode' }, s.completion);
  const copy = h('button', { type: 'button', class: 'btn-quiet', id: 'btn-copy' }, 'Copy code');
  const sync = h('p', { id: 'syncStatus', class: 'sync', role: 'status' });
  const resend = h('button', { type: 'button', class: 'btn-quiet', id: 'btn-resend', hidden: true }, 'Try sending again');

  const node = h('section', { class: 'card final' },
    h('p', { class: 'eyebrow' }, `${s.student.first} ${s.student.last} · Period ${s.student.period}`),
    h('h1', { id: 'finalH' }, 'Your final score: ', pct, '%'),
    h('p', { class: 'lead' }, `${fmtPts(r.earned)} out of ${fmtPts(r.possible)} points`),
    h('p', { class: 'cheer' }, h('strong', {}, band[1]), ' ', band[2]),
    h('h2', {}, 'Your trail, station by station'),
    h('ul', { class: 'bars' }, bars),
    h('div', { class: 'two' },
      h('div', { class: 'note good' }, h('h3', {}, 'Strongest area'), h('p', {}, strongest ? app.content.topics[strongest.k] : '—')),
      h('div', { class: 'note calm' }, h('h3', {}, 'Worth another look'),
        review.length ? h('ul', {}, review.map(t => h('li', {}, app.content.topics[t.k]))) : h('p', {}, 'Nothing urgent. Nice range across the whole unit.'))),
    h('h2', {}, 'Your completion code'),
    h('p', { class: 'codeline' }, code, ' ', copy),
    sync, resend,
    h('p', { class: 'small' }, `Active time: about ${Math.max(1, Math.round(s.activeMs / 60000))} min. Screenshot this page if your teacher asks for proof.`),
    h('div', { class: 'row' },
      h('button', { type: 'button', class: 'btn-quiet', id: 'btn-review' }, 'Review a station'),
      h('button', { type: 'button', class: 'btn-quiet', id: 'btn-src2' }, 'Sources')));

  const next = h('section', { class: 'card nextstep' },
    h('div', { class: 'sunrise', 'aria-hidden': 'true' }),
    h('h2', {}, 'Your next step'),
    h('p', {}, 'Whatever your score, here is something that matters more: you do not have to carry hard things alone. If something has been weighing on you, or on someone you care about, try this.'),
    h('ol', { class: 'steps' },
      h('li', {}, h('strong', {}, 'Pick one trusted person.'), ' A parent or caregiver, a teacher, a coach, or your school counselor.'),
      h('li', {}, h('strong', {}, 'Choose a low-pressure moment.'), ' Walking somewhere, in the car, or after class.'),
      h('li', {}, h('strong', {}, 'Use an opener:'), h('span', { class: 'quote' }, '“Can I talk to you about something that’s been on my mind?”'))),
    h('ul', { class: 'crisis-list slim' },
      h('li', {}, h('strong', {}, '988 Suicide & Crisis Lifeline:'), ' call or text ', h('a', { href: 'tel:988' }, '988'), '. Free, private, 24/7.'),
      h('li', {}, h('strong', {}, 'Crisis Text Line:'), ' text ', h('b', {}, 'HOME'), ' to ', h('a', { href: 'sms:741741?body=HOME' }, '741741'), '.'),
      h('li', {}, h('strong', {}, 'Emergency:'), ' call ', h('a', { href: 'tel:911' }, '911'), '.'),
      h('li', {}, h('strong', {}, 'At school:'), ' your school counselor is there for exactly this.')));

  const wrap = h('div', { class: 'final-wrap' }, node, next);
  const r0 = root(); clear(r0); r0.append(wrap); window.scrollTo(0, 0);
  const fh = $('#finalH'); fh.setAttribute('tabindex', '-1'); fh.focus({ preventScroll: true });
  animateNumber(pct, 0, r.percent, 1400, (v) => String(Math.round(v)));
  announce(`Your final score: ${r.percent} percent.`);

  $('#btn-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(s.completion); announce('Code copied.'); } catch { announce('Copy is blocked here. Please screenshot the code.'); } });
  $('#btn-review').addEventListener('click', (e) => { trailDialog(app); openDialog($('#trail'), e.currentTarget); });
  $('#btn-src2').addEventListener('click', (e) => { sources(app); openDialog($('#sources'), e.currentTarget); });
  $('#btn-resend').addEventListener('click', () => app.retry && app.retry.retryNow());
  updateSync(app, { pending: queueLength(cfg), noBackend: !(cfg.backend && cfg.backend.url) });
  if (!app.retry && !s.teacher) {
    import('../engine/sync.js').then(m => {
      app.retry = m.startRetryLoop(cfg, (st) => { s.sent = st.pending === 0 && !st.noBackend; s.save(); updateSync(app, st); });
    });
  }
}

function updateSync(app, r) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  const s = app.session;
  const resend = document.getElementById('btn-resend');
  if (s.teacher) {
    el.className = 'sync warn';
    el.textContent = 'Teacher mode: nothing was recorded or sent.';
    if (resend) resend.hidden = true;
  } else if (r.noBackend) {
    el.className = 'sync warn';
    el.textContent = `Show ${app.cfg.teacherName} this code. (Results are saved on this device.)`;
    if (resend) resend.hidden = true;
  } else if (r.pending === 0 || s.sent) {
    el.className = 'sync ok';
    el.textContent = `✓ Your score was sent to ${app.cfg.teacherName}.`;
    if (resend) resend.hidden = true;
  } else {
    el.className = 'sync warn';
    el.textContent = `Your score may not have been sent yet. Show ${app.cfg.teacherName} this code. We will keep trying while this page is open.`;
    if (resend) resend.hidden = false;
  }
}

/* ======================= SETTINGS ======================= */
function settingsDlg(app) {
  const body = $('#settingsBody'); clear(body);
  const cur = settings.get();
  const chk = (id, label, checked, on, hint) => {
    const i = h('input', { type: 'checkbox', id, checked: checked || null });
    i.addEventListener('change', () => on(i.checked));
    return h('div', { class: 'setrow' }, i, h('label', { for: id }, label, hint ? h('small', {}, hint) : null));
  };
  if (app.cfg.features.fontToggle) body.append(chk('set-dys', 'Dyslexia-friendly font', cur.dyslexiaFont, v => settings.set({ dyslexiaFont: v }), 'Uses a font with more distinct letter shapes and a little extra spacing.'));
  body.append(chk('set-motion', 'Reduce motion', settings.reducedMotion(), v => settings.set({ motion: v ? 'on' : 'off' }), 'Fewer animations and no sparkles.'));
  if (app.cfg.features.readAloud) body.append(chk('set-read', 'Show "Listen" buttons (read aloud)', cur.readAloud, v => { settings.set({ readAloud: v }); announce(v ? 'Listen buttons will show on the next question.' : 'Listen buttons hidden.'); }, 'Uses your device\'s built-in voice. Headphones recommended.'));
  const size = h('div', { class: 'setrow col' }, h('span', { class: 'lbl' }, 'Text size'),
    h('div', { class: 'seg-group', role: 'radiogroup', 'aria-label': 'Text size' }, [['Normal', 0], ['Large', 1], ['Extra large', 2]].map(([t, v]) => {
      const b = h('button', { type: 'button', class: 'seg', role: 'radio', 'aria-checked': String(cur.textSize === v) }, t);
      b.addEventListener('click', () => { settings.set({ textSize: v }); settingsDlg(app); });
      return b;
    })));
  body.append(size);
}

/* ======================= TRAIL DIALOG + REVIEW ======================= */
function trailDialog(app) {
  const body = $('#trailBody'); clear(body);
  const s = app.session;
  if (!s || !app.plan) { body.append(h('p', {}, 'Start the assessment to see your trail.')); return; }
  body.append(h('p', { class: 'small' }, 'Finished stations can be reviewed, but answers can\'t be changed or re-scored. Stations open in order.'));
  body.append(h('ol', { class: 'trail-list' }, app.plan.stations.map(st => {
    const done = s.stationsDone[st.index] || s.status === 'final';
    const cur = st.index === s.pos.station && !done;
    const b = done && app.cfg.features.reviewFinishedStations
      ? h('button', { type: 'button', class: 'btn-quiet', 'data-review': st.id }, 'Review') : null;
    if (b) b.addEventListener('click', (e) => { reviewStation(app, st); openDialog($('#review'), e.currentTarget); });
    return h('li', { class: `tl ${done ? 'done' : cur ? 'cur' : 'todo'}` },
      h('span', { class: 'dot' }, done ? '✓' : String(st.num)),
      h('span', { class: 'tl-name' }, st.title, h('small', {}, done ? 'Finished' : cur ? 'You are here' : 'Ahead on the trail')), b);
  })));
}

function reviewStation(app, st) {
  const body = $('#reviewBody'); clear(body);
  $('#revTitle').textContent = `Review: ${st.title}`;
  body.append(h('p', { class: 'note calm' }, 'Review only. Your answers and scores are locked. This is just for learning.'));
  st.steps.filter(r => !r.explore).forEach(r => body.append(renderReviewCard(app, r)));
}

/* ======================= SOURCES ======================= */
function sources(app) {
  const body = $('#sourcesBody'); clear(body);
  body.append(h('p', {}, 'Every statistic and claim in this assessment comes from the credible sources below. Figures are rounded and reflect the most recent data we could verify. Your teacher can share full citations and access dates.'));
  const list = h('ul', { class: 'src-list' });
  app.content.sources.forEach(sr => list.append(h('li', {}, h('strong', {}, sr.name), sr.year ? ` (${sr.year})` : '', ' — ', sr.used, ' ', sr.url ? h('a', { href: sr.url, target: '_blank', rel: 'noopener noreferrer' }, 'Open source ↗') : null)));
  body.append(list);
  body.append(h('p', { class: 'small' }, 'This assessment builds noticing and helping skills. It does not diagnose, and it is not a substitute for care from a professional.'));
}

export const screens = { welcome, stationIntro, stationEnd, final, settings: settingsDlg, trailDialog, sources, updateSync, reviewStation };
void plain; void estimateSeconds; void pctText;
