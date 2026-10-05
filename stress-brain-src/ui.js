/* UI: tabs, lessons, lab controls, explore map, report card, live monitor, tooltip/cursor effects, questions. */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pc = v => Math.round(clamp(v) * 100);
const U = { tab: 'learn', lesson: 0, region: null, draft: {}, findQ: null, tipId: null, cap: 0, hold: {}, snd: false };

/* ---------- region -> demo action and live reading ---------- */
const TRY = { prefrontal: 'stress:quiz', motor: 'stress:dog', parietal: 'stress:speech', temporal: 'stress:embarrass', occipital: 'stress:dog', cerebellum: 'stress:speech', brainstem: 'cope:breath',
  amygdala: 'stress:quiz', hippocampus: 'chronic4', hypothalamus: 'alarm', pituitary: 'stress:quiz', thalamus: 'alarm', adrenals: 'stress:dog', heart: 'stress:dog', lungs: 'cope:breath', stomach: 'stress:speech', muscles: 'stress:dog', spine: 'stress:dog', vagus: 'cope:breath' };
const LIVE = {
  prefrontal: () => ['Thinking & planning', SIM.out.pfc], motor: () => ['Muscle readiness', SIM.SNS], parietal: () => ['Body-signal awareness', clamp(0.2 + SIM.SNS * 0.8)],
  temporal: () => ['Alarm sensitivity to sounds/words', clamp(SIM.A * 1.1)], occipital: () => ['Attention narrowing (tunnel vision)', SIM.out.attention], cerebellum: () => ['Shakiness', SIM.out.tension * 0.7],
  brainstem: () => ['Gas (orange) vs brake (teal)', SIM.SNS > SIM.PNS ? SIM.SNS : SIM.PNS], amygdala: () => ['Alarm activity', SIM.A], hippocampus: () => ['Memory function', SIM.out.memory],
  hypothalamus: () => ['Stress pathway activity', SIM.A], pituitary: () => ['Hormone signal (ACTH)', SIM.Co], thalamus: () => ['Signal traffic', clamp(0.2 + SIM.A)], adrenals: () => ['Adrenaline + cortisol output', Math.max(SIM.Ad, SIM.Co)],
  heart: () => ['Heart rate (68 to 150 bpm)', clamp((SIM.out.hr - 60) / 95)], lungs: () => ['Breathing speed', clamp((SIM.out.rr - 12) / 18)], stomach: () => ['Digestion', SIM.out.digest], muscles: () => ['Muscle tension', SIM.out.tension],
  spine: () => ['Sympathetic signals', SIM.SNS], vagus: () => ['Parasympathetic signals', SIM.PNS]
};

/* ---------- question rendering ---------- */
const PERM4 = [2, 0, 3, 1];
function dr(id) { return U.draft[id] || (U.draft[id] = { sel: null, multi: [], rows: [], seq: [], res: null }); }
function badgeFor(id) { const a = GRADE.get(id); return a.done ? `<span class="qb ok">✓ ${a.pts === 1 ? '+1' : '+0.5'}</span>` : (a.tries ? `<span class="qb try">${a.tries} ${a.tries === 1 ? 'try' : 'tries'}</span>` : '<span class="qb">○</span>'); }
function renderQ(id, n) {
  const q = SB.Q[id], a = GRADE.get(id), d = dr(id), done = a.done, res = d.res;
  let body = '';
  if (q.type === 'mc') body = q.opts.map((o, i) => `<button class="opt${d.sel === i ? ' sel' : ''}${done && i === q.ans ? ' good' : ''}" data-act="q-opt" data-q="${id}" data-i="${i}" ${done ? 'disabled' : ''}>${esc(o)}</button>`).join('');
  else if (q.type === 'multi') body = q.opts.map((o, i) => `<button class="opt chk${d.multi.includes(i) ? ' sel' : ''}${done && q.ans.includes(i) ? ' good' : ''}" data-act="q-multi" data-q="${id}" data-i="${i}" ${done ? 'disabled' : ''}>${esc(o)}</button>`).join('');
  else if (q.type === 'match') body = q.rows.map((r, ri) => `<div class="mrow${res && res.bad && res.bad.includes(ri) ? ' bad' : ''}"><span>${esc(r.t)}</span><select data-act="q-sel" data-q="${id}" data-r="${ri}" ${done ? 'disabled' : ''}>
      <option value="">Choose…</option>${r.o.map((o, oi) => `<option value="${oi}"${(done ? r.a[0] === oi : d.rows[ri] === oi) ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></div>`).join('');
  else if (q.type === 'order') {
    const perm = q.items.length === 4 ? PERM4 : q.items.map((_, i) => i), seq = done ? q.items.map((_, i) => i) : d.seq;
    body = `<div class="oseq">${q.items.map((_, i) => `<div class="slot">${i + 1}. ${seq[i] !== undefined ? esc(q.items[seq[i]]) : '<em>…</em>'}</div>`).join('')}</div>` +
      (done ? '' : `<div class="opool">${perm.map(i => `<button class="opt sm" data-act="q-order" data-q="${id}" data-i="${i}" ${d.seq.includes(i) ? 'disabled' : ''}>${esc(q.items[i])}</button>`).join('')}</div><button class="btn sm" data-act="q-oreset" data-q="${id}">↺ Clear order</button>`);
  } else if (q.type === 'find') {
    const on = U.findQ === id;
    body = done ? '' : `<button class="btn ${on ? 'primary on' : ''}" data-act="q-find" data-q="${id}">${on ? '⏹ Stop hunting' : '🎯 Start hunting in the 3D view'}</button><p class="fine">${on ? 'Names are hidden. Click the part of the 3D model that matches.' : 'Names are hidden while you hunt.'}</p>`;
  } else if (q.type === 'mission') {
    body = `<p class="fine">${done ? 'Mission complete!' : 'Go to the <b>Lab</b> tab and try it. ' + esc(q.hint)}</p>`;
  }
  const canCheck = !done && ['mc', 'multi', 'match', 'order'].includes(q.type);
  let fb = '';
  if (done) fb = `<div class="fb ok"><b>Correct!</b> ${esc(q.why)}</div>`;
  else if (res && !res.ok) fb = `<div class="fb no"><b>Not quite.</b> ${esc(res.msg)} <button class="linkbtn" data-act="q-retry" data-q="${id}">Try again</button></div>`;
  return `<div class="q${done ? ' done' : ''}" id="qq-${id}"><div class="qh"><span class="qn">${n}</span><span class="qp">${esc(q.prompt)}</span>${badgeFor(id)}</div>${body}${canCheck ? `<button class="btn sm primary" data-act="q-check" data-q="${id}">Check answer</button>` : ''}${fb}</div>`;
}
function checkQ(id) {
  const q = SB.Q[id], d = dr(id); let ok = false, msg = '', bad = [];
  if (q.type === 'mc') { if (d.sel === null) return; ok = d.sel === q.ans; msg = 'Look at the key words in the question again.'; }
  else if (q.type === 'multi') { const A = q.ans, S = d.multi; if (!S.length) return; const right = S.filter(i => A.includes(i)).length, wrong = S.length - right; ok = wrong === 0 && right === A.length;
    msg = `You have ${right} correct pick${right === 1 ? '' : 's'}${wrong ? ', but ' + wrong + ' ' + (wrong === 1 ? 'does' : 'do') + ' not belong' : ''}${right < A.length ? (wrong ? ' and' : ', but') + ' some are still missing' : ''}.`; }
  else if (q.type === 'match') { if (q.rows.some((_, i) => d.rows[i] === undefined || d.rows[i] === null)) { d.res = { ok: false, msg: 'Choose an answer for every row first.', bad: [] }; renderLeft(); return; }
    q.rows.forEach((r, i) => { if (d.rows[i] !== r.a[0]) bad.push(i); }); ok = !bad.length; msg = `${q.rows.length - bad.length} of ${q.rows.length} rows are right. Check the highlighted ones.`; }
  else if (q.type === 'order') { if (d.seq.length < q.items.length) return; const right = d.seq.filter((v, i) => v === i).length; ok = right === q.items.length; msg = `${right} of ${q.items.length} are in the right place.`; }
  const r = GRADE.submit(id, ok); d.res = { ok, msg, bad };
  if (ok) { toast(r.first ? 'Correct on the first try! +1 point' : 'Correct! +0.5 point (retry)'); const a = SB.REGIONS; }
  renderLeft(); updatePill();
}
function retryQ(id) { const d = dr(id); d.res = null; if (SB.Q[id].type === 'order') d.seq = []; if (SB.Q[id].type === 'mc') d.sel = null; renderLeft(); }
function submitDirect(id, ok, extraMsg) { const r = GRADE.submit(id, ok); dr(id).res = { ok, msg: extraMsg || '' }; if (ok) toast(r.first ? 'Correct on the first try! +1 point' : 'Correct! +0.5 point'); updatePill(); renderLeft(); renderRCard(); }

/* ---------- left panel ---------- */
function stressRow(s) {
  const x = SIM.st[s.id], on = x && x.on; const left = on && s.acute ? Math.max(0, x.until - SIM.t) : 0;
  return `<div class="row${on ? ' on' : ''}"><button class="rb" data-act="stress" data-id="${s.id}" aria-pressed="${!!on}"><span class="ic">${s.icon}</span><span class="nm">${esc(s.name)}</span><span class="tag ${s.acute ? 'ac' : 'ch'}">${s.acute ? 'acute' : 'chronic'}</span><span class="sw">${on ? 'ON ✕' : '＋ Add'}</span></button>
    ${on ? `<div class="lvl"><label>Intensity</label><input type="range" min="0.2" max="1" step="0.05" value="${x.level}" data-act="lvl" data-id="${s.id}" aria-label="Intensity of ${esc(s.name)}"><span class="cd" ${s.acute ? `data-cd="${s.id}"` : ''}>${s.acute ? Math.ceil(left) + 's left' : 'until removed'}</span></div>` : ''}</div>`;
}
function copeRow(c) {
  const x = SIM.cp[c.id], on = x && x.on;
  return `<div class="row${on ? ' on cp' : ''}"><button class="rb" data-act="cope" data-id="${c.id}" aria-pressed="${!!on}"><span class="ic">${c.icon}</span><span class="nm">${esc(c.name)}</span><span class="tag ${c.type === 'demand' ? 'dm' : 'rc'}">${c.type === 'demand' ? 'lowers demand' : 'boosts recovery'}</span><span class="sw">${on ? 'ON ✕' : '＋ Use'}</span></button></div>`;
}
function missionRow(id) { const q = SB.Q[id], a = GRADE.get(id); return `<div class="mis${a.done ? ' done' : ''}"><b>${a.done ? '✅' : '🎯'} ${esc(q.title)}</b><span>${esc(q.prompt)}</span>${a.done ? '' : `<small>Hint: ${esc(q.hint)}</small>`}</div>`; }

function renderLeft() {
  const el = $('#left'), sc = el.scrollTop; let h = '';
  if (U.tab === 'learn') {
    const L = SB.LESSONS[U.lesson], n = U.lesson;
    h += `<div class="dots" role="tablist" aria-label="Lessons">${SB.LESSONS.map((l, i) => { const qs = l.qs.map(id => GRADE.get(id).done); const all = qs.every(Boolean); return `<button class="dot${i === n ? ' on' : ''}${all ? ' ok' : ''}" data-act="lesson" data-i="${i}" title="${esc(l.title)}">${i + 1}</button>`; }).join('')}</div>
      <div class="card lesson"><div class="kick">Lesson ${n + 1} of ${SB.LESSONS.length}</div><h2>${esc(L.title)}</h2><p class="sub">${esc(L.sub)}</p>${L.html}
      ${L.tries.length ? `<div class="tries"><b>Try it in the 3D view:</b> ${L.tries.map(t => `<button class="btn sm" data-act="try" data-a="${t.a}">${esc(t.t)}</button>`).join('')}</div>` : ''}</div>
      <div class="card checks"><h3>✅ Check for understanding</h3>${L.qs.map((id, i) => renderQ(id, i + 1)).join('')}</div>`;
    if (L.exit) h += `<div class="card"><h3>🎟️ Exit ticket <small>(not graded)</small></h3><label>One stressor <input data-act="exit" data-k="stressor" value="${esc(GRADE.st.exit.stressor)}" placeholder="e.g. a big test on Friday"></label>
      <label>One body signal <input data-act="exit" data-k="signal" value="${esc(GRADE.st.exit.signal)}" placeholder="e.g. my heart races"></label>
      <label>One recovery strategy <input data-act="exit" data-k="recovery" value="${esc(GRADE.st.exit.recovery)}" placeholder="e.g. slow breathing, a walk, sleep"></label></div>`;
    h += `<div class="navbtns"><button class="btn" data-act="prev" ${n === 0 ? 'disabled' : ''}>← Back</button>${n < SB.LESSONS.length - 1 ? '<button class="btn primary" data-act="next">Next lesson →</button>' : '<button class="btn primary" data-act="gotoreport">See my report →</button>'}</div>`;
  } else if (U.tab === 'lab') {
    h += `<div class="card"><h2>Add stress</h2><p class="fine">Press to <b>add</b> a stressor; press again to <b>take it away</b>. Acute ones end on their own; chronic ones stay until you remove them.</p>${SB.STRESSORS.map(stressRow).join('')}</div>
      <div class="card"><h2>Take away stress: coping tools</h2><p class="fine">Useful coping <b>lowers the demand</b> or <b>boosts recovery</b>.</p>${SB.COPING.map(copeRow).join('')}</div>
      <div class="card ctl"><button class="btn" data-act="clearall">🧹 Clear all stress</button><button class="btn" data-act="skip">⏩ Skip ahead 1 week</button><button class="btn" data-act="resetbrain">↺ Reset brain</button></div>
      <div class="card"><h2>Lab missions <small>(count toward your grade)</small></h2>${['m_gas', 'm_brake', 'm_sweet', 'm_wear', 'm_recover'].map(missionRow).join('')}</div>
      <div class="card"><h2>What just happened</h2><ul class="log">${SIM.log.slice(0, 6).map(l => `<li class="${l.kind}">${esc(l.txt)}</li>`).join('') || '<li>Add a stressor to begin.</li>'}</ul></div>`;
  } else if (U.tab === 'explore') {
    const groups = {}; Object.keys(SB.REGIONS).forEach(id => { const g = SB.REGIONS[id].group; (groups[g] = groups[g] || []).push(id); });
    h += `<div class="card"><h2>Brain &amp; body map</h2><p class="fine">Hover or click a part in the 3D view, or pick one here. Each card shows how it applies to real life and what stress does to it.</p>
      ${Object.keys(groups).map(g => `<h3>${g}</h3><div class="chips">${groups[g].map(id => `<button class="rchip${U.region === id ? ' on' : ''}" data-act="region" data-id="${id}" style="--c:${SB.REGIONS[id].color}"><i></i>${esc(SB.REGIONS[id].name.replace(/ \(.*\)/, ''))}</button>`).join('')}</div>`).join('')}</div>
      <div class="card checks"><h3>🎯 Find it <small>(checks for understanding)</small></h3>${['f_amyg', 'f_pfc', 'f_hippo', 'f_adr'].map((id, i) => renderQ(id, i + 1)).join('')}</div>`;
  } else if (U.tab === 'report') h = renderReport();
  el.innerHTML = h; el.scrollTop = sc;
}
function renderReport() {
  const p = GRADE.pct(), g = GRADE.letter(p), tp = GRADE.topics(), qs = SB.QUESTION_IDS;
  const where = id => { const q = SB.Q[id]; return q.lesson === 'LAB' ? 'lab' : q.lesson === 'X' ? 'explore' : 'learn:' + SB.LESSON_ORDER.indexOf(q.lesson); };
  return `<div class="card report"><h2>Grade report</h2><label class="nm">Student name <input data-act="name" value="${esc(GRADE.st.name)}" placeholder="Type your name"></label>
    <div class="big-grade g${g}"><div class="letter">${g}</div><div><b>${p}%</b><span>${GRADE.score()} of ${GRADE.total()} points</span><span>Attempt ${GRADE.st.attempt} · ${GRADE.answered()} of ${GRADE.total()} answered</span></div></div>
    <div class="bar"><i style="width:${p}%"></i></div>
    <p class="fine">Scoring: correct on the <b>first try = 1 point</b>, correct after a retry = <b>0.5</b>, unanswered = 0. You can retry any question as many times as you like, and start a fresh attempt any time. Your <b>best attempt: ${GRADE.best()}%</b>.</p>
    <h3>By topic</h3>${Object.keys(tp).map(t => `<div class="trow"><span>${esc(t)}</span><div class="bar sm"><i style="width:${Math.round(tp[t].got / tp[t].n * 100)}%"></i></div><b>${tp[t].got}/${tp[t].n}</b></div>`).join('')}
    <h3>Every question</h3><div class="qlist">${qs.map((id, i) => { const a = GRADE.get(id), q = SB.Q[id]; return `<button class="qrow ${a.done ? (a.pts === 1 ? 'full' : 'half') : 'none'}" data-act="goq" data-w="${where(id)}" data-q="${id}"><b>${i + 1}</b><span>${esc(q.title || q.prompt).slice(0, 78)}${(q.title || q.prompt).length > 78 ? '…' : ''}</span><em>${a.done ? (a.pts === 1 ? '✓ 1' : '✓ 0.5') : a.tries ? 'retry' : 'open'}</em></button>`; }).join('')}</div>
    ${GRADE.st.hist.length ? `<h3>Past attempts</h3><ul class="hist">${GRADE.st.hist.map(h => `<li>Attempt ${h.n}: <b>${h.pct}%</b> <small>${esc(h.date)}</small></li>`).join('')}</ul>` : ''}
    ${(GRADE.st.exit.stressor || GRADE.st.exit.signal || GRADE.st.exit.recovery) ? `<h3>Exit ticket</h3><ul class="hist"><li><b>Stressor:</b> ${esc(GRADE.st.exit.stressor)}</li><li><b>Body signal:</b> ${esc(GRADE.st.exit.signal)}</li><li><b>Recovery strategy:</b> ${esc(GRADE.st.exit.recovery)}</li></ul>` : ''}
    <div class="ctl"><button class="btn primary" data-act="newattempt">🔁 Start a new attempt</button><button class="btn" data-act="print">🖨️ Print / save report</button></div>
    <p class="fine">Saved only in this browser. Teachers: use Print → Save as PDF to collect reports.</p></div>`;
}
function updatePill() { $('#gradePill').textContent = `${GRADE.answered()}/${GRADE.total()} · ${GRADE.pct()}%`; }

/* ---------- right: live monitor (built once, updated in tick) ---------- */
function buildMonitor() {
  const bar = (id, cls, lab, sub) => `<div class="m"><div class="ml"><span>${lab}</span><b id="${id}v"></b></div><div class="mbar ${cls}"><i id="${id}b"></i></div>${sub ? `<small>${sub}</small>` : ''}</div>`;
  $('#right').innerHTML = `
  <details open class="grp"><summary>Nervous system: gas &amp; brake</summary><div class="gb"><div class="pedal gas"><span>⛽ Sympathetic<br><small>GAS pedal</small></span><div class="mbar"><i id="snsb"></i></div><b id="snsv"></b></div>
    <div class="pedal brk"><span>🛑 Parasympathetic<br><small>BRAKE pedal</small></span><div class="mbar"><i id="pnsb"></i></div><b id="pnsv"></b></div><div id="state" class="state"></div></div>
    ${bar('amy', 'a', 'Alarm (amygdala)', 'How big the brain judges the demand')}</details>
  <details open class="grp"><summary>Vital signs</summary><div class="vit"><div class="hr"><span id="heartIc">♥</span><b id="hrv">70</b><small>bpm</small></div><canvas id="ecg" width="400" height="70"></canvas>
    <div class="vrow"><div><small>Breathing</small><b id="rrv">14</b> /min</div><div><small>Blood pressure</small><b id="bpv">110/70</b></div></div></div></details>
  <details open class="grp"><summary>Stress hormones</summary>${bar('ad', 'ad', 'Adrenaline', 'fast: seconds') + bar('co', 'co', 'Cortisol', 'slower: minutes (time is compressed here)')}</details>
  <details open class="grp"><summary>Body effects (live)</summary><ul class="fx" id="fx"></ul></details>
  <details open class="grp"><summary>Mind</summary>${bar('pfc', 'pf', 'Thinking &amp; planning (prefrontal)', '') + bar('mem', 'mem', 'Memory &amp; learning (hippocampus)', '')}
    <div class="mood"><span>Mood</span><b id="moodv"></b></div><canvas id="perf" width="300" height="110" aria-label="Focus and performance curve"></canvas><small id="perfn"></small></details>
  <details open class="grp"><summary>Wear &amp; tear over time</summary>${bar('ws', 'ws', 'Wear &amp; tear (chronic load)', '')}<div class="day">Day <b id="dayv">0</b></div>
    <ul class="fx" id="ot"></ul></details>
  <p class="fine foot">Fictional, simplified model for learning, not medical advice. Time is compressed. If stress feels like too much, talk with a trusted adult or school counselor (in the U.S. call or text 988).</p>`;
  $('#perf').getContext('2d');
}
const ecg = { buf: new Float32Array(400), ph: 0, x: 0 };
function ecgShape(p) { return 1.0 * Math.exp(-Math.pow((p - 0.18) / 0.012, 2)) - 0.25 * Math.exp(-Math.pow((p - 0.15) / 0.012, 2)) - 0.3 * Math.exp(-Math.pow((p - 0.21) / 0.014, 2)) + 0.18 * Math.exp(-Math.pow((p - 0.42) / 0.05, 2)) + 0.08 * Math.exp(-Math.pow((p - 0.05) / 0.03, 2)); }
function drawEcg(dt) {
  const o = SIM.out, cv = $('#ecg'); if (!cv) return; const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  const steps = Math.max(1, Math.round(dt * 130)); for (let s = 0; s < steps; s++) { ecg.ph = (ecg.ph + (1 / 130) * o.hr / 60) % 1; ecg.buf[ecg.x] = ecgShape(ecg.ph) + (Math.random() - 0.5) * 0.02; ecg.x = (ecg.x + 1) % ecg.buf.length; }
  c.clearRect(0, 0, W, H); c.strokeStyle = SIM.SNS > 0.45 ? '#ff8a5c' : '#4be3a0'; c.lineWidth = 2; c.beginPath();
  for (let i = 0; i < W; i++) { const v = ecg.buf[(ecg.x + i) % ecg.buf.length], y = H * 0.78 - v * H * 0.6; i ? c.lineTo(i, y) : c.moveTo(i, y); } c.stroke();
}
function drawPerf() {
  const cv = $('#perf'); if (!cv) return; const c = cv.getContext('2d'), W = cv.width, H = cv.height, pad = 14, o = SIM.out;
  c.clearRect(0, 0, W, H); const cs = getComputedStyle(document.body);
  const y = a => H - pad - (0.3 + 0.7 * Math.exp(-Math.pow((a - 0.38) / 0.3, 2))) * (H - pad * 2 - 6), x = a => pad + a * (W - pad * 2);
  const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#5ad1ff'); g.addColorStop(0.38, '#4be3a0'); g.addColorStop(1, '#ff6b7a'); c.strokeStyle = g; c.lineWidth = 3; c.beginPath();
  for (let a = 0; a <= 1.001; a += 0.01) a ? c.lineTo(x(a), y(a)) : c.moveTo(x(a), y(a)); c.stroke();
  c.fillStyle = '#a9b8d8'; c.font = '10px system-ui'; c.fillText('calm', pad, H - 2); c.fillText('sweet spot', x(0.38) - 22, H - 2); c.fillText('overwhelmed', W - pad - 58, H - 2);
  const a = o.arousal; c.fillStyle = '#fff'; c.beginPath(); c.arc(x(a), y(a), 6, 0, 7); c.fill(); c.strokeStyle = '#0a1330'; c.lineWidth = 2; c.stroke();
  $('#perfn').textContent = `Focus & performance now: ${pc(o.perf)}%  (some stress helps; too little or too much lowers it)`;
}
const FX = [['Heart', () => SIM.SNS > 0.3 ? '↑ beats faster' : SIM.PNS > 0.6 ? '↓ slow and steady' : 'normal', () => SIM.SNS], ['Breathing', () => SIM.SNS > 0.3 ? '↑ gets quicker' : 'slow and easy', () => SIM.SNS],
  ['Muscles', () => SIM.out.tension > 0.45 ? '↑ prepare to move' : SIM.out.tension > 0.25 ? 'a little tense' : 'relaxed', () => SIM.out.tension], ['Digestion', () => SIM.out.digest < 0.55 ? '↓ slows down' : 'working normally', () => 1 - SIM.out.digest],
  ['Attention', () => SIM.out.attention > 0.45 ? '◉ locks onto threat' : 'broad and flexible', () => SIM.out.attention]];
let monT = 0;
function tickMonitor(dt) {
  drawEcg(dt); monT += dt; if (monT < 0.1) return; monT = 0; const o = SIM.out;
  const set = (id, v, txt) => { const b = $('#' + id + 'b'), t = $('#' + id + 'v'); if (b) b.style.width = pc(v) + '%'; if (t) t.textContent = txt !== undefined ? txt : pc(v) + '%'; };
  set('sns', SIM.SNS); set('pns', SIM.PNS); set('amy', SIM.A); set('ad', SIM.Ad); set('co', SIM.Co); set('pfc', o.pfc); set('mem', o.memory); set('ws', SIM.L);
  $('#state').textContent = o.state; $('#hrv').textContent = Math.round(o.hr); $('#rrv').textContent = Math.round(o.rr); $('#bpv').textContent = Math.round(o.sys) + '/' + Math.round(o.dia); $('#moodv').textContent = o.moodLabel; $('#dayv').textContent = Math.floor(SIM.days);
  $('#hrv').style.color = o.hr > 105 ? '#ff8a7a' : o.hr < 80 ? '#4be3a0' : '';
  $('#fx').innerHTML = FX.map(f => `<li class="${f[2]() > 0.35 ? 'hot' : ''}"><b>${f[0]}</b><span>${f[1]()}</span></li>`).join('');
  $('#ot').innerHTML = [['Amygdala sensitivity', SIM.L > 0.12 ? 'more reactive (' + pc(SIM.L) + '%)' : 'normal', SIM.L], ['Hippocampus (memory)', SIM.L > 0.12 ? 'shrinking: ' + Math.round(SIM.L * 22) + '% smaller' : 'normal size', SIM.L], ['Sleep quality', pc(o.sleepQ) + '%', 1 - o.sleepQ], ['Immune defenses', pc(o.immune) + '%', 1 - o.immune]]
    .map(f => `<li class="${f[2] > 0.35 ? 'hot' : ''}"><b>${f[0]}</b><span>${f[1]}</span></li>`).join('');
  drawPerf();
  const th = SIM.thought(); if ($('#thoughtTxt').textContent !== th) $('#thoughtTxt').textContent = th;
  $('#app').style.setProperty('--stress', clamp(Math.max(SIM.A, SIM.SNS * 0.9)).toFixed(3)); $('#app').style.setProperty('--calm', clamp(SIM.PNS * (1 - SIM.SNS)).toFixed(3));
  // chain pills
  const cs = SIM.chainStep(); $$('#chain .step').forEach(s => s.classList.toggle('lit', +s.dataset.i <= cs));
  // acute countdowns
  $$('[data-cd]').forEach(e => { const x = SIM.st[e.dataset.cd]; if (x) e.textContent = Math.max(0, Math.ceil(x.until - SIM.t)) + 's left'; });
  // live region reading in card
  const lv = $('#rlive'); if (lv && U.region && LIVE[U.region]) { const [lab, v] = LIVE[U.region](); lv.querySelector('span').textContent = lab; lv.querySelector('i').style.width = pc(v) + '%'; lv.querySelector('b').textContent = pc(v) + '%'; }
  // breath pacer
  const br = SIM.cp.breath && SIM.cp.breath.on; $('#breath').classList.toggle('on', !!br);
  if (br) { const cyc = ((SIM.t - (SIM.cp.breath.until - 40)) % 10 + 10) % 10, inh = cyc < 4, k = inh ? cyc / 4 : 1 - (cyc - 4) / 6; $('#breath').style.setProperty('--b', k.toFixed(3)); $('#breathTxt').textContent = inh ? 'Breathe in… (4)' : 'Breathe out slowly… (6)'; }
  // lapse badge
  if (SIM.lapse > 0.01) showCaption(`⏩ Skipping ahead… Day ${Math.floor(SIM.days)} · wear & tear ${pc(SIM.L)}%`, 'time', 1.2);
  checkMissions(0.1);
}

/* ---------- missions ---------- */
function holdFor(id, cond, sec, dt) { U.hold[id] = cond ? (U.hold[id] || 0) + dt : 0; return U.hold[id] >= sec; }
function checkMissions(dt) {
  const o = SIM.out, act = SIM.activeStress().length, cps = SIM.activeCope().length, T = { m_gas: () => holdFor('m_gas', o.hr >= 110, 2, dt),
    m_brake: () => holdFor('m_brake', act >= 1 && SIM.Draw >= 0.3 && cps >= 2 && o.hr < 90, 4, dt), m_sweet: () => holdFor('m_sweet', act >= 1 && o.perf >= 0.9, 4, dt),
    m_wear: () => SIM.L >= 0.6, m_recover: () => GRADE.get('m_wear').done && SIM.L <= 0.25 };
  for (const id in T) { if (GRADE.get(id).done) continue; if (T[id]()) { GRADE.submit(id, true); toast('🎯 Mission complete: ' + SB.Q[id].title + ' (+1)'); updatePill(); if (U.tab === 'lab' || U.tab === 'report') renderLeft(); } }
}

/* ---------- stage overlays ---------- */
let capTimer = 0;
function showCaption(txt, kind, sec) { const c = $('#caption'); if (c.dataset.k === txt) { capTimer = performance.now() + sec * 1000; return; } c.dataset.k = txt; c.textContent = txt; c.className = 'on ' + (kind || ''); capTimer = performance.now() + (sec || 6) * 1000; }
setInterval(() => { if (capTimer && performance.now() > capTimer) { $('#caption').className = ''; $('#caption').dataset.k = ''; capTimer = 0; } }, 300);
let toastT = 0;
function toast(msg) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; $('#stage').appendChild(t); } t.textContent = msg; t.className = 'on'; clearTimeout(toastT); toastT = setTimeout(() => t.className = '', 2600); }

function tipFor(id) {
  const r = SB.REGIONS[id];
  if (U.findQ) return `<div class="th"><i style="background:#9aa8c8"></i><b>?</b></div><p>Hunting mode: names are hidden. Click to lock in your answer.</p>`;
  return `<div class="th"><i style="background:${r.color}"></i><b>${esc(r.name)}</b><em>${esc(r.nick)}</em></div><p><span>In real life</span> ${esc(r.real)}</p><small>Click for the full card</small>`;
}
function onHover(id, x, y) {
  const tip = $('#tip'), cur = $('#cursor'), st = $('#stage').getBoundingClientRect();
  if (x !== undefined && x !== null) { cursorTarget.x = x - st.left; cursorTarget.y = y - st.top; }
  if (!id) { tip.className = ''; cur.classList.remove('hot'); U.tipId = null; return; }
  if (U.tipId !== id) { tip.innerHTML = tipFor(id); U.tipId = id; cur.style.setProperty('--c', U.findQ ? '#9aa8c8' : SB.REGIONS[id].color); }
  cur.classList.add('hot'); tip.className = 'on';
  if (x !== undefined && x !== null) { const w = tip.offsetWidth, h = tip.offsetHeight; let tx = x - st.left + 18, ty = y - st.top + 18; if (tx + w > st.width - 8) tx = x - st.left - w - 14; if (ty + h > st.height - 8) ty = y - st.top - h - 14; tip.style.transform = `translate(${Math.max(8, tx)}px,${Math.max(8, ty)}px)`; }
}
const cursorTarget = { x: -99, y: -99 }, cursorPos = { x: -99, y: -99 };
function cursorLoop() { cursorPos.x += (cursorTarget.x - cursorPos.x) * 0.22; cursorPos.y += (cursorTarget.y - cursorPos.y) * 0.22; $('#cursor').style.transform = `translate(${cursorPos.x}px,${cursorPos.y}px)`; requestAnimationFrame(cursorLoop); }

function renderRCard() {
  const el = $('#rcard'), id = U.region; if (!id) { el.hidden = true; return; } const r = SB.REGIONS[id];
  el.hidden = false; el.style.setProperty('--c', r.color);
  el.innerHTML = `<button class="x" data-act="rclose" aria-label="Close card">✕</button><div class="rh"><i></i><div><b>${esc(r.name)}</b><em>${esc(r.nick)} · ${esc(r.group)}</em></div></div>
    <p>${esc(r.does)}</p><h4>In real life</h4><ul>${r.life.map(l => `<li>${esc(l)}</li>`).join('')}</ul><h4>When you are stressed</h4><p>${esc(r.stress)}</p>
    <div class="live" id="rlive"><span></span><div class="mbar"><i></i></div><b></b></div><div class="rt"><small>${esc(r.tryit)}</small><button class="btn sm primary" data-act="rtry" data-id="${id}">▶ Show me</button></div>`;
}
function selectRegion(id, focus) {
  if (U.findQ) { findAnswer(id); return; }
  U.region = id; SBScene.setSelected(id); renderRCard();
  if (id) { const g = SB.REGIONS[id].group; if (g === 'Deep brain' && !SBScene.S.xray && id !== 'brainstem') setXray(true); if (focus) SBScene.focusRegion(id); syncSegs(); }
  if (U.tab === 'explore') renderLeft();
}
function findAnswer(id) {
  const qid = U.findQ, q = SB.Q[qid]; if (!q) return;
  const ok = id === q.target; stopFind(); submitDirect(qid, ok, ok ? '' : `That was the ${SB.REGIONS[id].name}. Think about what each part does and try again.`);
  U.region = id; SBScene.setSelected(id); renderRCard();
}
function startFind(qid) { U.findQ = qid; SBScene.S.hideNames = true; const q = SB.Q[qid]; if (q.needsBody) { SBScene.setView('body'); } if (q.needsXray === undefined) { /* keep */ } const b = $('#findbanner'); b.hidden = false; b.innerHTML = `🎯 <b>Hunting:</b> ${esc(q.prompt)} <button class="btn sm" data-act="q-find" data-q="${qid}">Stop</button>`; U.region = null; renderRCard(); SBScene.setSelected(null); syncSegs(); renderLeft(); }
function stopFind() { U.findQ = null; SBScene.S.hideNames = false; $('#findbanner').hidden = true; renderLeft(); }

function setXray(b) { SBScene.setXray(b); syncSegs(); }
function syncSegs() { $$('#segX button').forEach(x => x.classList.toggle('on', (x.dataset.x === '1') === SBScene.S.xray)); $$('#segV button').forEach(x => x.classList.toggle('on', x.dataset.v === SBScene.S.view)); }
function setTab(t) { U.tab = t; $('#left').scrollTop = 0; $('#app').dataset.tab = t; $$('#tabs .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === t)); renderLeft(); }
function gotoLesson(i) {
  U.lesson = clamp(i, 0, SB.LESSONS.length - 1, 0); const L = SB.LESSONS[U.lesson]; SBScene.setView(L.view); setXray(L.xray); SBScene.resetCam(); SBScene.S.view = L.view; syncSegs(); renderLeft();
  setTimeout(() => SBScene.flash(L.focus), 450);
}

/* ---------- actions ---------- */
function runAction(a) {
  if (a.startsWith('stress:')) { SIM.toggleStress(a.slice(7), true); }
  else if (a.startsWith('cope:')) { SIM.toggleCope(a.slice(5), true); }
  else if (a === 'clear') { SIM.clearStress(); SIM.clearCope(); }
  else if (a === 'alarm') { SIM.A = Math.max(SIM.A, 0.75); SIM.startChain(); SIM.chain.t0 = SIM.t; SBScene.playChain(SBScene.camSide() < 0 ? 1 : -1); SIM.say('Alarm! Amygdala to hypothalamus to adrenal glands to body ready.', 'stress'); }
  else if (a === 'chronic4') { ['deadlines', 'conflict', 'worry'].forEach(id => SIM.toggleStress(id, true)); SIM.skip(28); }
  else if (a === 'reset') { SIM.reset(); }
  if (U.tab === 'lab') renderLeft();
}
function onClickPanel(e) {
  const t = e.target.closest('[data-act]'); if (!t) return; const act = t.dataset.act, id = t.dataset.id, q = t.dataset.q, i = +t.dataset.i;
  switch (act) {
    case 'lesson': gotoLesson(i); break; case 'prev': gotoLesson(U.lesson - 1); break; case 'next': gotoLesson(U.lesson + 1); break; case 'gotoreport': setTab('report'); break;
    case 'try': runAction(t.dataset.a); break;
    case 'q-opt': dr(q).sel = i; dr(q).res = null; renderLeft(); break;
    case 'q-multi': { const m = dr(q).multi, k = m.indexOf(i); k < 0 ? m.push(i) : m.splice(k, 1); dr(q).res = null; renderLeft(); break; }
    case 'q-order': dr(q).seq.push(i); dr(q).res = null; renderLeft(); break; case 'q-oreset': dr(q).seq = []; dr(q).res = null; renderLeft(); break;
    case 'q-check': checkQ(q); break; case 'q-retry': retryQ(q); break;
    case 'q-find': U.findQ === q ? stopFind() : startFind(q); break;
    case 'stress': SIM.toggleStress(id); break; case 'cope': SIM.toggleCope(id); break;
    case 'skip': SIM.skip(7); break; case 'clearall': SIM.clearStress(); SIM.clearCope(); break; case 'resetbrain': SIM.reset(); break;
    case 'region': selectRegion(id, true); break;
    case 'rclose': U.region = null; SBScene.setSelected(null); renderRCard(); if (U.tab === 'explore') renderLeft(); break;
    case 'rtry': runAction(TRY[id]); break;
    case 'newattempt': if (confirm('Start a new attempt? Your current score is saved in "Past attempts" and your answers reset.')) { GRADE.newAttempt(); U.draft = {}; updatePill(); renderLeft(); } break;
    case 'print': window.print(); break;
    case 'goq': { const w = t.dataset.w; if (w === 'lab') setTab('lab'); else if (w === 'explore') setTab('explore'); else { setTab('learn'); gotoLesson(+w.split(':')[1]); } setTimeout(() => { const e = $('#qq-' + q); e && e.scrollIntoView({ block: 'center' }); }, 60); break; }
  }
}
function onChange(e) {
  const t = e.target, act = t.dataset.act; if (!act) return;
  if (act === 'q-sel') { const d = dr(t.dataset.q); d.rows[+t.dataset.r] = t.value === '' ? null : +t.value; d.res = null; }
  else if (act === 'lvl') SIM.setLevel(t.dataset.id, +t.value);
  else if (act === 'name') GRADE.setName(t.value); else if (act === 'exit') GRADE.setExit(t.dataset.k, t.value);
}

/* ---------- sound ---------- */
let actx = null;
function thump(hr) {
  if (!U.snd || !actx) return; const t = actx.currentTime, mk = (f, d, v, at) => { const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f, t + at); o.frequency.exponentialRampToValueAtTime(f * 0.6, t + at + d); g.gain.setValueAtTime(0, t + at); g.gain.linearRampToValueAtTime(v, t + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + at + d); o.connect(g).connect(actx.destination); o.start(t + at); o.stop(t + at + d + 0.02); };
  mk(70, 0.14, 0.35, 0); mk(55, 0.12, 0.22, Math.min(0.2, 60 / hr * 0.3));
}

/* ---------- init ---------- */
function initUI() {
  buildMonitor(); updatePill(); cursorLoop();
  document.addEventListener('click', e => { if (e.target.closest('#left,#rcard,#findbanner')) onClickPanel(e); });
  $('#left').addEventListener('change', onChange); $('#left').addEventListener('input', e => { if (e.target.dataset.act === 'lvl') onChange(e); else if (e.target.dataset.act === 'name' || e.target.dataset.act === 'exit') onChange(e); });
  $$('#tabs .tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
  $$('#segX button').forEach(b => b.addEventListener('click', () => setXray(b.dataset.x === '1')));
  $$('#segV button').forEach(b => b.addEventListener('click', () => { SBScene.setView(b.dataset.v); SBScene.resetCam(); syncSegs(); }));
  $('#lblBtn').addEventListener('click', e => { const b = e.currentTarget, on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); b.classList.toggle('on', on); SBScene.S.labelsOn = on; });
  $('#lblBtn').classList.add('on');
  $('#spinBtn').addEventListener('click', e => { const b = e.currentTarget, on = b.getAttribute('aria-pressed') !== 'true'; b.setAttribute('aria-pressed', on); b.classList.toggle('on', on); SBScene.setSpin(on); });
  $('#sndBtn').addEventListener('click', e => { const b = e.currentTarget; U.snd = !U.snd; if (U.snd && !actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (er) { U.snd = false; } } b.textContent = U.snd ? '🔊' : '🔇'; b.setAttribute('aria-pressed', U.snd); b.classList.toggle('on', U.snd); });
  const modal = $('#modal'); $('#helpBtn').addEventListener('click', () => { $('#modalBody').innerHTML = SB.HELP; modal.hidden = false; }); $('#modalX').addEventListener('click', () => modal.hidden = true); modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { modal.hidden = true; if (U.findQ) stopFind(); } });
  SIM.on((ev, d) => { if (ev === 'log') { const l = SIM.log[0]; showCaption(l.txt, l.kind, 7); if (U.tab === 'lab') renderLeft(); } else if (ev === 'change') { if (U.tab === 'lab') renderLeft(); } else if (ev === 'chain') SBScene.playChain(SBScene.camSide() < 0 ? 1 : -1); });
  SBScene.on('hover', onHover); SBScene.on('click', (id) => { if (!id) { if (!U.findQ) { U.region = null; SBScene.setSelected(null); renderRCard(); if (U.tab === 'explore') renderLeft(); } return; } selectRegion(id, false); });
  SBScene.on('beat', thump);
  $('#stage').addEventListener('pointermove', e => { const st = $('#stage').getBoundingClientRect(); cursorTarget.x = e.clientX - st.left; cursorTarget.y = e.clientY - st.top; });
  $('#stage').addEventListener('pointerleave', () => { cursorTarget.x = -99; $('#tip').className = ''; });
  renderLeft(); gotoLesson(0);
  let last = performance.now(); (function loop(now) { requestAnimationFrame(loop); const dt = Math.min(0.1, (now - last) / 1000); last = now; tickMonitor(dt); })(last);
}
