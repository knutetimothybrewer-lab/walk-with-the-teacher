// ===== UI: screens, game flow, chart, results =====
const $id = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const sgn = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);

const VIT = [
  { id: 'bp', name: 'Blood pressure', unit: 'mmHg', fmt: v => v.sys + '/' + v.dia, bad: v => v.sys },
  { id: 'rhr', name: 'Resting heart rate', unit: 'bpm', fmt: v => v.rhr, bad: v => v.rhr },
  { id: 'rr', name: 'Breathing rate', unit: '/min', fmt: v => v.rr, bad: v => v.rr },
  { id: 'spo2', name: 'Blood oxygen', unit: '%', fmt: v => v.spo2, bad: v => -v.spo2 },
  { id: 'bmi', name: 'BMI', unit: '', fmt: v => v.bmi.toFixed(1), bad: v => Math.abs(v.bmi - 22) },
  { id: 'glucose', name: 'Blood glucose', unit: 'mg/dL', fmt: v => v.glucose, bad: v => v.glucose },
  { id: 'ldl', name: 'LDL cholesterol', unit: 'mg/dL', fmt: v => v.ldl, bad: v => v.ldl },
  { id: 'sleep', name: 'Sleep per night', unit: 'hours', fmt: v => v.sleep.toFixed(1), bad: v => -v.sleep },
  { id: 'energy', name: 'Energy level', unit: '/100', fmt: v => v.energy, bad: v => -v.energy },
  { id: 'sick', name: 'Sick days / year', unit: 'days', fmt: v => v.sick, bad: v => v.sick }
];
const ORG = [['lungs', 'Lungs'], ['heart', 'Heart'], ['brain', 'Brain'], ['liver', 'Liver'], ['skin', 'Skin'], ['bone', 'Bones'], ['muscle', 'Muscle'], ['teeth', 'Teeth'],
  ['immune', 'Immunity'], ['metab', 'Metabolism'], ['fit', 'Fitness']];
const HAB_NAMES = { sleep: 'Sleep', diet: 'Eating', move: 'Movement', water: 'Hydration', screen: 'Screen use', coping: 'Stress coping', connect: 'Relationships', outdoor: 'Time outdoors',
  sun: 'Sun protection', smoke: 'Smoking / vaping', drink: 'Alcohol', drugs: 'Drug misuse', tidy: 'Space & surroundings', dental: 'Dental care', mind: 'Mindset', care: 'Medical care', eco: 'Sustainability' };
function habitWord(k, v) {
  if (SUBSTANCE.includes(k)) return v <= 0.2 ? 'none' : v < 1.2 ? 'occasional' : v < 2.4 ? 'regular' : 'heavy';
  return v >= 1.5 ? 'strong habit' : v >= 0.5 ? 'good' : v > -0.5 ? 'average' : v > -1.5 ? 'poor' : 'harmful';
}
const barColor = v => v >= 70 ? '#2f9e44' : v >= 45 ? '#e8a317' : '#d9363e';

// ---------------- persistence ----------------
const STORE = 'htc.trials.v1';
function loadTrials() { try { return JSON.parse(localStorage.getItem(STORE)) || []; } catch (e) { return []; } }
function saveTrials(list) { try { localStorage.setItem(STORE, JSON.stringify(list.slice(-14))); } catch (e) {} }

// ---------------- app state ----------------
const App = { look: { name: 'Alex', skin: SKINS[1], hair: HAIRS[0], shirt: SHIRTS[1], body: 'f', hairStyle: 'long' }, goal: 'healthy', trials: loadTrials(), T: null, F: null, I: null, pv: null, busy: false, lapseSkip: null };
const GOAL_LABEL = { healthy: '🌟 Healthiest possible', unhealthy: '⚠️ Unhealthiest possible', free: '🎲 Explore freely' };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function show(screen) { ['title', 'game', 'results'].forEach(s => $id('screen-' + s).classList.toggle('hidden', s !== screen)); }

// ---------------- title screen ----------------
function buildSwatches(id, arr, key) {
  const box = $id(id); box.innerHTML = '';
  arr.forEach(c => { const b = document.createElement('button'); b.className = 'sw'; b.style.background = c; b.setAttribute('aria-label', key + ' ' + c);
    b.setAttribute('aria-pressed', App.look[key] === c); b.onclick = () => { App.look[key] = c; [...box.children].forEach(x => x.setAttribute('aria-pressed', x === b)); App.pv.setLook(App.look); }; box.appendChild(b); });
}
function buildSeg(id, arr, key) {
  const box = $id(id); box.innerHTML = '';
  arr.forEach(([val, label]) => { const b = document.createElement('button'); b.textContent = label; b.setAttribute('aria-pressed', App.look[key] === val);
    b.onclick = () => { App.look[key] = val; [...box.children].forEach(x => x.setAttribute('aria-pressed', x === b)); App.pv.setLook(App.look); }; box.appendChild(b); });
}
function renderTrials() {
  const list = App.trials.slice().reverse().slice(0, 5);
  $id('bd-healthy').classList.toggle('done', App.trials.some(t => t.goal === 'healthy'));
  $id('bd-unhealthy').classList.toggle('done', App.trials.some(t => t.goal === 'unhealthy'));
  $id('bd-healthy').textContent = (App.trials.some(t => t.goal === 'healthy') ? '✔ ' : '') + '🌟 Healthiest trial';
  $id('bd-unhealthy').textContent = (App.trials.some(t => t.goal === 'unhealthy') ? '✔ ' : '') + '⚠️ Unhealthiest trial';
  $id('trials').innerHTML = list.length ? '<h4 style="margin:14px 0 4px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)">Your recent trials</h4>' + list.map(t =>
    `<div class="trial-row"><span class="chip ${t.goal === 'healthy' ? 'hl' : t.goal === 'unhealthy' ? 'un' : 'fr'}">${t.goal === 'healthy' ? 'Healthiest' : t.goal === 'unhealthy' ? 'Unhealthiest' : 'Explore'}</span><span>${esc(t.name)}: body age <b>${t.bodyAge}</b></span><span><b>${sgn(t.pts)}</b> pts</span></div>`).join('') : '';
}
function initTitle() {
  App.pv = createFigure($id('pv'), App.look); App.pv.setState(newState()); App.pv.snap();
  buildSeg('seg-body', BODIES, 'body'); buildSeg('seg-hairstyle', HAIRSTYLES, 'hairStyle'); buildSwatches('sw-skin', SKINS, 'skin'); buildSwatches('sw-hair', HAIRS, 'hair'); buildSwatches('sw-shirt', SHIRTS, 'shirt');
  $id('inp-name').oninput = e => { App.look.name = e.target.value.slice(0, 16); };
  document.querySelectorAll('.goal').forEach(b => b.onclick = () => { App.goal = b.dataset.goal; document.querySelectorAll('.goal').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  $id('btn-start').onclick = startTrial;
  $id('btn-teacher').onclick = () => $id('dlg-teacher').showModal();
  renderTrials();
}

// ---------------- game ----------------
function buildOrder() { return PHASE_SCENARIOS.map(ph => shuffle(ph)); }

function startTrial() {
  if (!App.look.name.trim()) App.look.name = 'Alex';
  const st = newState();
  App.T = { goal: App.goal, st, order: buildOrder().flat(), idx: 0, log: [], pts: [0], vit: [vitality(st)], look: Object.assign({}, App.look), num: App.trials.length + 1, started: Date.now() };
  show('game');
  if (!App.F) {
    App.F = createFigure($id('fig'), App.T.look); App.I = createInside($id('inside')); App.F.inside = App.I;
    $id('vtabs').querySelectorAll('button').forEach(b => b.onclick = () => { $id('stage').classList.toggle('show-inside', b.dataset.v === 'in'); $id('vtabs').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); });
  }
  App.F.clearFx(); App.F.setLook(App.T.look); App.F.hand = null; App.F.vis = null; App.F.setState(st); App.F.snap(); App.I.vis = null; App.I.setState(st); App.I.snap();
  $id('goalchip').textContent = GOAL_LABEL[App.goal];
  App.snap = snapshot(st); App.dispAge = st.age;
  renderPanels(st, null); renderTrend(); nextScenario();
}

const snapshot = st => ({ s: Object.assign({}, st.s), v: vitals(st), h: Object.assign({}, st.h), vit: vitality(st), dom: domainScores(st), pts: st.pts, age: st.age });

function renderPanels(st, prev) {
  const v = vitals(st), dom = domainScores(st), vt = vitality(st);
  const T = App.T;
  $id('st-pts').textContent = sgn(st.pts) === '' ? '0' : sgn(st.pts);
  $id('st-vit').textContent = Math.round(vt);
  $id('progbar').style.width = (T.idx / TOTAL_CHOICES * 100) + '%';
  $id('progtxt').textContent = 'Choice ' + Math.min(T.idx + 1, TOTAL_CHOICES) + ' of ' + TOTAL_CHOICES;
  // domains
  $id('domains').innerHTML = DOM_KEYS.map(k => `<div class="dbar" title="${DOMAINS[k].name}"><span>${DOMAINS[k].icon}</span><div><div style="display:flex;justify-content:space-between;font-size:12px"><span>${DOMAINS[k].name}</span></div><div class="tr"><i style="width:${dom[k].toFixed(0)}%;background:${DOMAINS[k].color}"></i></div></div><b>${Math.round(dom[k])}</b></div>`).join('');
  // vitals
  $id('vitals').innerHTML = VIT.map(m => {
    const band = BANDS[m.id](v), cls = band[0], prevV = prev && prev.v;
    const changed = prevV && m.fmt(prevV) !== m.fmt(v);
    let arrow = '';
    if (changed) { const better = m.bad(v) < m.bad(prevV); const up = typeof m.bad(v) === 'number' && (m.id === 'bp' ? v.sys > prevV.sys : parseFloat(m.fmt(v)) > parseFloat(m.fmt(prevV)));
      arrow = `<span class="arrow" style="color:${better ? '#1d8a4a' : '#c92a2a'}">${up ? '▲' : '▼'}</span>`; }
    return `<div class="vit ${changed ? 'flash' : ''}" title="${esc(band[2])}"><span class="n">${m.name}</span><span class="v s ${cls}" style="grid-column:auto;font-size:13px">${m.fmt(v)} <small style="font-weight:500">${m.unit}</small>${arrow}<br><small style="font-weight:700">${band[1]}</small></span></div>`;
  }).join('');
  // organs
  $id('organs').innerHTML = ORG.map(([k, n]) => `<div class="obar"><span>${n}</span><div class="tr"><i style="width:${st.s[k].toFixed(0)}%;background:${barColor(st.s[k])}"></i></div><b>${Math.round(st.s[k])}</b></div>`).join('');
  $id('orgvals').innerHTML = `<span>Lungs <b>${Math.round(st.s.lungs)}%</b></span><span>Heart <b>${Math.round(st.s.heart)}%</b></span><span>Brain <b>${Math.round(st.s.brain)}%</b></span><span>Liver <b>${Math.round(st.s.liver)}%</b></span>`;
  $id('bodyage').textContent = 'Body age ' + bodyAge(st);
}

function renderTrend() {
  const T = App.T, pts = T.pts, n = TOTAL_CHOICES;
  const m = Math.max(16, ...pts.map(Math.abs)), W = 380, H = 64;
  const x = i => 4 + (W - 8) * i / n, y = v => H / 2 - (v / m) * (H / 2 - 5);
  let d = pts.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
  const last = pts[pts.length - 1];
  const col = last > 0 ? '#1d8a4a' : last < 0 ? '#c92a2a' : '#5b6188';
  $id('trend').innerHTML = `<line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="#c9cce8" stroke-dasharray="3 3"/>
    <path d="${d}" fill="none" stroke="${col}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${x(pts.length - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="3.5" fill="${col}"/>`;
  $id('trendnow').textContent = sgn(last) || '0';
}

function nextScenario() {
  const T = App.T, st = T.st;
  let sc = T.order[T.idx];
  if (sc.cond && !sc.cond(st)) sc = sc.alt;
  T.cur = sc; T.pickedBefore = snapshot(st);
  const phase = T.idx < 14 ? 0 : T.idx < 28 ? 1 : T.idx < 40 ? 2 : 3;
  $id('phname').textContent = PHASES[phase].name; $id('phrange').textContent = PHASES[phase].range;
  $id('agenum').textContent = Math.floor(st.age);
  const D = DOMAINS[sc.dom];
  const opts = shuffle(sc.opts).map((o, i) => ({ o, i }));
  T.shown = opts;
  const body = $id('rbody');
  body.innerHTML = `<div class="stop"><span class="done"><b>S</b>State</span><span class="on"><b>T</b>Think</span><span id="stopO"><b>O</b>Observe</span><span id="stopP"><b>P</b>Pick</span></div>
    <span class="dompill" style="background:${D.color}">${D.icon} ${D.name} · ${esc(sc.cat)}</span>
    <h2 class="scn-title">${esc(sc.title)}</h2>
    <p class="scn-text">${esc(sc.text)}</p>
    <div class="observe"><b>Observe first:</b> What could happen <u>right away</u>? What if this became your habit for years?</div>
    <div class="opts">${opts.map((x, n) => `<button class="opt" data-n="${n}"><span class="k">${n + 1}</span><span>${esc(x.o.t)}</span></button>`).join('')}</div>`;
  body.scrollTop = 0;
  body.querySelectorAll('.opt').forEach(b => b.onclick = () => pick(+b.dataset.n));
  App.mode = 'choose'; App.F.pose('rest');
}

function pick(n) {
  if (App.mode !== 'choose') return;
  App.mode = 'report';
  const T = App.T, st = T.st, sc = T.cur, opt = T.shown[n].o;
  const before = T.pickedBefore, habBefore = Object.assign({}, st.h);
  const pts = applyOption(st, sc, opt);
  T.log.push({ id: sc.id, title: sc.title, dom: sc.dom, g: opt.g, p: pts, w: sc.w, t: opt.t, age: Math.floor(st.age), cat: sc.cat });
  T.pts.push(st.pts); T.vit.push(vitality(st));
  const evs = checkEvents(st);
  App.pendingEv = evs;
  App.F.fx(opt.fx || (opt.g === 'C' ? 'bad' : 'good'));
  App.F.setState(st); App.I.setState(st);
  renderPanels(st, before); renderTrend();
  const after = snapshot(st);
  // describe changes
  const chips = ORG.map(([k, nm]) => ({ nm, d: Math.round(after.s[k] - before.s[k]) })).concat([{ nm: 'Mood', d: Math.round(after.s.mood - before.s.mood) }, { nm: 'Stress', d: Math.round(after.s.stress - before.s.stress), inv: 1 }, { nm: 'Friendships', d: Math.round(after.s.social - before.s.social) }, { nm: 'Surroundings', d: Math.round(after.s.env - before.s.env) }])
    .filter(c => c.d !== 0).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 8);
  const notes = [];
  VIT.forEach(m => { const a = m.fmt(before.v), b = m.fmt(after.v); if (a !== b) { const band = BANDS[m.id](after.v); notes.push({ m, a, b, band, mag: Math.abs(m.bad(after.v) - m.bad(before.v)) / Math.max(1, Math.abs(m.bad(before.v))) }); } });
  notes.sort((x, y) => y.mag - x.mag);
  const habNotes = Object.keys(st.h).filter(k => Math.abs(st.h[k] - habBefore[k]) > 0.01).map(k => `${HAB_NAMES[k]}: <b>${habitWord(k, st.h[k])}</b>`);
  const word = { A: 'Health-enhancing choice', B: 'Mixed / neutral choice', C: 'Risky choice' }[opt.g];
  const pcls = pts > 0 ? 'pos' : pts < 0 ? 'neg' : 'zero';
  const body = $id('rbody');
  const isLast = T.idx >= TOTAL_CHOICES - 1;
  body.innerHTML = `<div class="stop"><span class="done"><b>S</b>State</span><span class="done"><b>T</b>Think</span><span class="done"><b>O</b>Observe</span><span class="on"><b>P</b>Picked</span></div>
   <div class="report">
    <div class="res"><span class="grade ${opt.g}">${word}</span><span class="pts ${pcls}">${pts > 0 ? '+' : pts < 0 ? '−' : ''}${Math.abs(pts)} pts</span><span class="dompill" style="background:${DOMAINS[sc.dom].color};margin-left:auto">${DOMAINS[sc.dom].name}</span></div>
    <div class="youchose">You chose: “${esc(opt.t)}”</div>
    <p class="fbtext"><b>What happened:</b> ${esc(opt.fb)}</p>
    ${chips.length ? `<div class="chips">${chips.map(c => { const good = c.inv ? c.d < 0 : c.d > 0; return `<span class="dchip ${good ? 'up' : 'dn'}">${c.nm} ${c.d > 0 ? '+' : '−'}${Math.abs(c.d)}</span>`; }).join('')}</div>` : ''}
    <div class="chart-note"><h5>Doctor’s chart update</h5>${notes.length ? '<ul>' + notes.slice(0, 4).map(x => `<li><b>${x.m.name}</b> ${x.a} → <b>${x.b}</b> ${x.m.unit} <i>(${x.band[1]})</i>. ${esc(x.band[2])}</li>`).join('') + '</ul>' : 'No big change to vital signs yet. One choice rarely does, but habits add up as the years pass.'}
      ${habNotes.length ? `<div style="margin-top:6px;font-size:12.5px;color:var(--muted)">This choice is now a habit → ${habNotes.join(' · ')}. Time will keep acting on the body until you face this kind of decision again.</div>` : ''}</div>
    <div class="nextrow"><button class="btn" id="btn-next">${isLast ? 'Fast-forward to 65 ▶' : 'Let time pass ▶'}<span class="kbd">Enter</span></button></div>
   </div>`;
  body.scrollTop = 0;
  $id('btn-next').onclick = advance; $id('btn-next').focus({ preventScroll: true });
}

function habitDrivers(st) {
  const bad = [], good = [];
  for (const k in st.h) { const v = st.h[k];
    if (SUBSTANCE.includes(k)) { if (v >= 0.8) bad.push([v * 1.2, `${HAB_NAMES[k]} (${habitWord(k, v)})`]); }
    else if (v <= -1) bad.push([-v, `${HAB_NAMES[k]} (${habitWord(k, v)})`]);
    else if (v >= 1) good.push([v, `${HAB_NAMES[k]}`]); }
  const top = l => l.sort((x, y) => y[0] - x[0]).slice(0, 3).map(x => x[1]);
  return { bad: top(bad), good: top(good) };
}

function advance() {
  if (App.mode !== 'report') return;
  App.mode = 'lapse';
  const T = App.T, st = T.st;
  const target = T.idx >= TOTAL_CHOICES - 1 ? FINAL_AGE : ageAt(T.idx + 1);
  const dt = Math.max(0.2, target - st.age);
  const b = snapshot(st), a0 = st.age;
  tick(st, dt);
  const evs = checkEvents(st).concat(App.pendingEv || []); App.pendingEv = null;
  const af = snapshot(st);
  T.idx++;
  App.F.clearFx(); App.F.rate = 0.9; App.F.setState(st); App.I.setState(st);
  renderPanels(st, b);
  const when = dt < 1 ? Math.max(1, Math.round(dt * 12)) + (Math.round(dt * 12) === 1 ? ' month' : ' months') + ' later' : (Math.round(dt) === 1 ? '1 year later' : Math.round(dt) + ' years later');
  const chg = [];
  ORG.forEach(([k, n]) => { const d = Math.round(af.s[k] - b.s[k]); if (Math.abs(d) >= 1) chg.push({ n, d }); });
  chg.sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  const dr = habitDrivers(st);
  const lapse = $id('lapse');
  $id('lapse-lbl').textContent = '⏳ ' + when + '…';
  $id('rbody').innerHTML = `<div class="stop"><span class="done"><b>S</b>State</span><span class="done"><b>T</b>Think</span><span class="done"><b>O</b>Observe</span><span class="done"><b>P</b>Pick</span></div>
    <div class="report"><div class="res"><span class="grade" style="background:var(--indigo)">⏳ ${when}</span><span style="margin-left:auto;font-weight:700;color:var(--muted)">Age ${Math.floor(a0)} → ${Math.floor(st.age)}</span></div>
    <p class="fbtext"><b>Chronic effects:</b> your habits kept working on the body while time passed.</p>
    <div class="chips">${chg.length ? chg.slice(0, 8).map(c => `<span class="dchip ${c.d > 0 ? 'up' : 'dn'}">${c.n} ${c.d > 0 ? '+' : '−'}${Math.abs(c.d)}</span>`).join('') : '<span class="dchip">The body held steady</span>'}</div>
    <div class="chart-note"><h5>What’s driving this</h5>
      ${dr.bad.length ? `<div>⚠️ <b>Working against you:</b> ${dr.bad.join(', ')}</div>` : ''}${dr.good.length ? `<div>✅ <b>Working for you:</b> ${dr.good.join(', ')}</div>` : ''}${!dr.bad.length && !dr.good.length ? '<div>Mostly average habits, so changes are slow and steady.</div>' : ''}</div>
    ${evs.map(e => `<div class="lifeev ${e.bad ? '' : 'good'}"><small>Age ${e.age} · life event</small><b>${e.bad ? '⚠️ ' : '🌟 '}${esc(e.title)}</b><span>${esc(e.text)}</span></div>`).join('')}
    <div class="nextrow"><button class="btn" id="btn-cont">${T.idx >= TOTAL_CHOICES ? 'See the results ▶' : 'Next decision ▶'}<span class="kbd">Enter</span></button></div></div>`;
  lapse.classList.add('on');
  const dur = Math.max(2200, Math.min(4200, dt * 400));
  const t0 = performance.now(); let done = false;
  const fin = () => { if (done) return; done = true; lapse.classList.remove('on'); App.F.rate = 3; App.lapseSkip = null; afterLapse(); };
  const step = now => {
    if (done) return;
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 2);
    const ageNow = a0 + (st.age - a0) * e;
    $id('lapse-yr').textContent = Math.floor(ageNow); $id('agenum').textContent = Math.floor(ageNow);
    if (p < 1) requestAnimationFrame(step);
    else { lapse.classList.remove('on'); if (!evs.length) setTimeout(fin, 700); }
  };
  requestAnimationFrame(step);
  $id('btn-cont').onclick = fin; $id('btn-cont').focus({ preventScroll: true }); App.lapseSkip = fin;
}

function afterLapse() {
  const T = App.T;
  if (T.idx >= TOTAL_CHOICES) { finishTrial(); return; }
  $id('agenum').textContent = Math.floor(T.st.age);
  nextScenario();
}

// ---------------- results ----------------
function finishTrial() {
  const T = App.T, st = T.st;
  const vt = vitality(st), g = { A: 0, B: 0, C: 0 };
  T.log.forEach(l => g[l.g]++);
  const rec = { id: Date.now(), goal: T.goal, name: T.look.name, date: new Date().toISOString(), vit: Math.round(vt), pts: st.pts, ptsDom: Object.assign({}, st.ptsDom), bodyAge: bodyAge(st), le: lifeExpectancy(st),
    grades: g, events: st.events.map(e => ({ age: e.age, title: e.title, bad: e.bad, text: e.text })), snap: { age: st.age, s: st.s, h: st.h, burn: st.burn, fired: {}, events: [] }, look: T.look,
    log: T.log.map(l => ({ id: l.id, title: l.title, dom: l.dom, g: l.g, p: l.p, w: l.w, t: l.t, age: l.age, cat: l.cat })), run: T.pts };
  App.trials.push(rec); saveTrials(App.trials); renderTrials();
  renderResults(rec);
}

function lineChart(run, w, h) {
  const n = TOTAL_CHOICES, m = Math.max(20, ...run.map(Math.abs)), padL = 34, padB = 20, padT = 8, W = w, H = h;
  const x = i => padL + (W - padL - 8) * i / n, y = v => padT + (H - padT - padB) * (1 - (v + m) / (2 * m));
  const d = run.map((v, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1)).join('');
  const ticks = [-m, -m / 2, 0, m / 2, m].map(v => `<line x1="${padL}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 0 ? '#8b90b8' : '#e3e5f4'}"/><text x="${padL - 4}" y="${y(v) + 4}" font-size="10" text-anchor="end" fill="#5b6188">${Math.round(v)}</text>`).join('');
  const marks = [[0, 'Teen'], [14, 'Young adult'], [28, 'Adulthood'], [40, 'Midlife']].map(([i, t]) => `<line x1="${x(i)}" x2="${x(i)}" y1="${padT}" y2="${H - padB}" stroke="#d6d9ee" stroke-dasharray="2 4"/><text x="${x(i) + 4}" y="${H - 6}" font-size="10" fill="#5b6188">${t}</text>`).join('');
  const last = run[run.length - 1], col = last >= 0 ? '#1d8a4a' : '#c92a2a';
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">${ticks}${marks}<path d="${d}" fill="none" stroke="${col}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${x(run.length - 1)}" cy="${y(last)}" r="4.5" fill="${col}"/></svg>`;
}

function renderResults(rec) {
  show('results');
  const maxTot = DOM_KEYS.reduce((a, k) => a + MAX_DOM[k], 0);
  const goalMet = rec.goal === 'healthy' ? rec.vit >= 85 : rec.goal === 'unhealthy' ? rec.vit <= 22 : null;
  const close = rec.goal === 'healthy' ? rec.vit >= 70 : rec.goal === 'unhealthy' ? rec.vit <= 40 : false;
  let verdict = '';
  if (rec.goal === 'healthy') {
    const missed = rec.log.filter(l => l.g !== 'A').sort((a, b) => b.w - a.w).slice(0, 3);
    verdict = goalMet ? `<div class="verdict ok">🌟 Goal met. ${esc(rec.name)} has a body age of ${rec.bodyAge} at a real age of ${FINAL_AGE}.</div>` :
      `<div class="verdict no">${close ? 'So close' : 'Not quite'}: aim for a health score of 85+ (yours is ${rec.vit}). ${missed.length ? 'Biggest missed chances: ' + missed.map(m => '<b>' + esc(m.title) + '</b>').join(', ') + '.' : ''}</div>`;
  } else if (rec.goal === 'unhealthy') {
    const missed = rec.log.filter(l => l.g !== 'C').sort((a, b) => b.w - a.w).slice(0, 3);
    verdict = goalMet ? `<div class="verdict ok">⚠️ Goal met. Years of risky choices left ${esc(rec.name)} with a body age of ${rec.bodyAge}, far older than ${FINAL_AGE}. Now play a healthiest trial and compare.</div>` :
      `<div class="verdict no">${close ? 'Nearly there' : 'Not quite'}: a health score of 22 or less means “unhealthiest.” Yours is ${rec.vit}. ${missed.length ? 'Choices that still helped: ' + missed.map(m => '<b>' + esc(m.title) + '</b>').join(', ') + '.' : ''}</div>`;
  }
  const rows = DOM_KEYS.map(k => { const p = rec.ptsDom[k], mx = MAX_DOM[k], r = p / mx; const lab = r >= 0.7 ? ['Strong', 's'] : r >= 0.35 ? ['Okay', 'o'] : ['Needs attention', 'n'];
    return `<tr><td>${DOMAINS[k].icon} ${DOMAINS[k].name}</td><td class="num">+${mx}</td><td class="num">${sgn(p) || 0}</td><td class="sa ${lab[1]}">${lab[0]}</td></tr>`; }).join('');
  const big = rec.log.slice().sort((a, b) => Math.abs(b.p) - Math.abs(a.p))[0];
  const ones = rec.log.filter(l => Math.abs(l.w) === 1);
  const oneNet = ones.reduce((a, l) => a + l.p, 0);
  const other = pickOther(rec);
  const resEl = $id('results');
  resEl.innerHTML = `
  <div class="r-head"><div><div class="t-kicker" style="color:var(--muted)">${GOAL_LABEL[rec.goal]} · Trial complete</div><h2>${esc(rec.name)}’s life at 65</h2></div>
    <div class="r-actions"><button class="btn" id="r-again">Play another trial ▶</button><button class="btn alt" id="r-menu">Menu</button><button class="btn alt" id="r-print">Print / save results</button></div></div>
  <div class="r-grid">
    <div><div class="r-fig"><svg id="rfig"></svg></div>
      <div class="card sec" style="margin-top:12px"><h3>Life timeline</h3><div class="timeline">${rec.events.length ? rec.events.map(e => `<div class="tl ${e.bad ? '' : 'good'}"><b>Age ${e.age}</b><span><b>${esc(e.title)}</b> ${esc(e.text)}</span></div>`).join('') : '<span style="color:var(--muted)">No major health events. A quiet, steady life.</span>'}</div></div>
    </div>
    <div>
      <div class="bigstats">
        <div class="card bs"><b>${rec.bodyAge}</b><small>Body age (real: ${FINAL_AGE})</small></div>
        <div class="card bs"><b>${rec.vit}</b><small>Health score</small></div>
        <div class="card bs"><b>${sgn(rec.pts) || 0}</b><small>Wellness pts (of ±${maxTot})</small></div>
        <div class="card bs"><b>~${rec.le}</b><small>Est. lifespan</small></div>
      </div>
      ${verdict}
      <div class="card sec"><h3>Your running total (worksheet “Plot the Trend”)</h3>${lineChart(rec.run, 640, 190)}
        <div style="font-size:13.5px;color:var(--muted)">Your biggest single swing was <b>${esc(big.title)}</b> (${sgn(big.p)} pts, ${DOMAINS[big.dom].name}). You made ${ones.length} small “±1” choices; together they added up to <b>${sgn(oneNet) || 0}</b> pts.</div></div>
      <div class="card sec"><h3>Domain Balance Check</h3><table class="t"><tr><th>Domain</th><th style="text-align:right">Max possible</th><th style="text-align:right">Your total</th><th>Strong / Needs attention?</th></tr>${rows}</table></div>
      <div class="card sec"><h3>Compare your trials</h3>${other ? compareHtml(rec, other) : '<p style="margin:0;color:var(--muted)">Play a trial with the <b>opposite goal</b> (healthiest ↔ unhealthiest) and you’ll see both people side by side here.</p>'}</div>
      <div class="card sec"><h3>Reflect: use STOP and the worksheet</h3>
        <div class="q"><b>1.</b> Describe the shape of your running-total line. What does that shape represent in real life?</div>
        <div class="q"><b>2.</b> Which single choice moved your total the most? Which domain was it, and why did it matter so much?</div>
        <div class="q"><b>3.</b> In the Domain Balance table, which domain scored highest and lowest? Were you surprised?</div>
        <div class="q"><b>4.</b> Can someone look “healthy” in one domain while struggling in another? Use your own numbers.</div>
        <div class="q"><b>5.</b> Pick one small (±1) category you chose several times. What was its combined effect?</div>
        <div class="q"><b>6.</b> Use STOP (State → Think → Observe → Pick) to explain one change to a single choice that would most improve your weakest domain.</div>
        <div class="q"><b>7.</b> In your own words: what does “health by a thousand choices” mean, and how did your two trials show it?</div></div>
      <div class="card sec"><details><summary style="cursor:pointer;font-weight:700">Full choice log (copy into the worksheet’s Weekly Recap)</summary>
        <div class="logwrap"><table class="t"><tr><th>#</th><th>Age</th><th>Decision</th><th>Your choice</th><th>Grade</th><th style="text-align:right">Pts</th><th style="text-align:right">Total</th></tr>
        ${rec.log.map((l, i) => `<tr><td>${i + 1}</td><td>${l.age}</td><td>${esc(l.title)} <small style="color:var(--muted)">(${DOMAINS[l.dom].name})</small></td><td>${esc(l.t)}</td><td><span class="grade ${l.g}" style="font-size:12px;padding:1px 8px">${l.g}</span></td><td class="num">${sgn(l.p) || 0}</td><td class="num">${sgn(rec.run[i + 1]) || 0}</td></tr>`).join('')}</table></div></details></div>
    </div>
  </div>`;
  const rf = createFigure($id('rfig'), rec.look); const ss = JSON.parse(JSON.stringify(rec.snap)); rf.setState(ss); rf.snap();
  if (other) { const a = createFigure($id('cmp-a'), rec.look); a.setState(ss); a.snap(); const b = createFigure($id('cmp-b'), other.look); b.setState(other.snap); b.snap(); }
  $id('r-again').onclick = startTrial; $id('r-menu').onclick = () => { show('title'); };
  $id('r-print').onclick = () => window.print();
  resEl.parentElement.scrollTop = 0;
}

function pickOther(rec) {
  const opp = rec.goal === 'healthy' ? 'unhealthy' : rec.goal === 'unhealthy' ? 'healthy' : null;
  const list = App.trials.filter(t => t.id !== rec.id);
  if (opp) { const c = list.filter(t => t.goal === opp); return c[c.length - 1] || null; }
  return list[list.length - 1] || null;
}
function compareHtml(a, b) {
  const cell = (t, tag) => `<div class="cc"><h4>${esc(t.name)} <span class="chip ${t.goal === 'healthy' ? 'hl' : t.goal === 'unhealthy' ? 'un' : 'fr'}">${t.goal === 'healthy' ? 'Healthiest' : t.goal === 'unhealthy' ? 'Unhealthiest' : 'Explore'}</span></h4>
    <div class="r-fig"><svg id="${tag}"></svg></div>
    <div style="font-size:13.5px">Body age <b>${t.bodyAge}</b> · Health score <b>${t.vit}</b> · <b>${sgn(t.pts) || 0}</b> pts<br><small style="color:var(--muted)">${t.events.length} life events · A:${t.grades.A} B:${t.grades.B} C:${t.grades.C}</small></div></div>`;
  return `<div class="cmp">${cell(a, 'cmp-a')}${cell(b, 'cmp-b')}</div>
    <p style="font-size:13.5px;margin:10px 0 0">Same person at the same age: the only difference is the choices. Difference in body age: <b>${Math.abs(a.bodyAge - b.bodyAge)} years</b>.</p>`;
}

// ---------------- boot ----------------
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || document.querySelector('dialog[open]')) return;
  if ($id('screen-game').classList.contains('hidden')) return;
  if (App.mode === 'choose' && e.key >= '1' && e.key <= '4') { const n = +e.key - 1; if (App.T.shown[n]) pick(n); }
  else if (App.mode === 'report' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); advance(); }
  else if (App.mode === 'lapse' && (e.key === 'Enter' || e.key === ' ') && App.lapseSkip) { e.preventDefault(); App.lapseSkip(); }
});
$id('btn-menu').onclick = () => { if (confirm('Leave this trial? Progress in this trial will be lost.')) { if (App.F) App.F.clearFx(); show('title'); } };
initTitle();
