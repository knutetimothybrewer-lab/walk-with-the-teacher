/* ============================================================
   UI — sliders, patient chart, metric cards, notebook, modals
   ============================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const state = defaultState();
let D = compute(state);
const baseD = compute(defaultState());
const snapshots = [];
let compareIdx = -1;
let lastChanged = null;
const sliderDefs = Object.fromEntries(SLIDERS.map(s => [s.id, s]));
const toggleDefs = Object.fromEntries(TOGGLES.map(s => [s.id, s]));
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const METRIC_SLIDERS = {
  rhr: ['cardio', 'stress', 'caffeine', 'cigs', 'sleep', 'water', 'sick'],
  bp: ['sodium', 'cardio', 'stress', 'cigs', 'alcohol', 'fruitveg', 'energy'],
  rr: ['cigs', 'vape', 'pollution', 'asthma', 'cardio', 'sick'],
  temp: ['sick', 'water'], spo2: ['cigs', 'vape', 'pollution', 'asthma'],
  sleepdur: ['sleep', 'screens', 'caffeine', 'stress', 'sitting'], sv: ['cardio'],
  glucose: ['sugar', 'energy', 'cardio', 'fiber', 'sleep', 'famDM'], a1c: ['sugar', 'energy', 'cardio', 'fiber', 'famDM'],
  tc: ['fried', 'fiber', 'cardio', 'famHeart', 'cigs', 'energy'], ldl: ['fried', 'fiber', 'cardio', 'famHeart', 'cigs'],
  hdl: ['cardio', 'cigs', 'energy', 'sugar', 'fish'], tg: ['sugar', 'alcohol', 'cardio', 'energy', 'fish'],
  crp: ['cigs', 'sleep', 'stress', 'cardio', 'sick'], cohb: ['cigs', 'vape', 'pollution'],
  bmi: ['energy', 'cardio', 'strength', 'sugar', 'sleep'], bodyfat: ['energy', 'cardio', 'strength', 'sugar', 'sleep'],
  muscle: ['strength', 'protein', 'energy', 'alcohol'], bone: ['strength', 'calcium', 'cigs', 'alcohol', 'cardio', 'age'],
  vo2: ['cardio', 'cigs', 'energy'], fev1: ['cigs', 'vape', 'pollution', 'asthma', 'cardio', 'packyrs', 'quitYrs'],
  hydration: ['water', 'caffeine', 'alcohol'], focus: ['sleep', 'screens', 'stress', 'caffeine', 'alcohol'],
  mood: ['sleep', 'stress', 'social', 'cardio', 'relax'], immune: ['sleep', 'stress', 'vaccines', 'handwash', 'fruitveg'],
  skin: ['sun', 'sunscreen', 'cigs', 'water', 'sleep'], liver: ['alcohol', 'sugar', 'energy'],
  kidney: ['sodium', 'water'], gut: ['fiber', 'fruitveg', 'sugar', 'stress'], dental: ['sugar', 'brush'],
};
const ORGAN_METRICS = {
  lungs: ['fev1', 'spo2', 'rr', 'cohb'], heart: ['rhr', 'bp', 'sv', 'vo2'], vessels: ['ldl', 'hdl', 'bp', 'crp'],
  muscle: ['muscle', 'vo2'], bone: ['bone'], skin: ['skin'], brain: ['focus', 'mood', 'sleepdur'], liver: ['liver', 'tg'],
  stomach: ['gut'], gut: ['gut'], kidney: ['kidney', 'hydration', 'bp'], pancreas: ['glucose', 'a1c'], teeth: ['dental'],
  fat: ['bodyfat', 'bmi'], blood: ['a1c', 'glucose', 'hydration', 'immune'],
};
const zoneVar = { good: 'var(--good)', warn: 'var(--warn)', bad: 'var(--bad)', info: 'var(--info)' };

function tierOf(def, v) { for (const t of def.tiers) if (v <= t[0]) return t; return def.tiers[def.tiers.length - 1]; }
function fmtSliderValue(def, v) {
  if (def.id === 'height') return fmtHeight(v, state.units);
  const n = Number.isInteger(def.step) || def.step >= 1 ? v : (+v).toFixed(1);
  return n + ' ' + def.unit;
}

/* ---------------- sliders ---------------- */
function buildSliders() {
  const host = $('#sliders'); host.innerHTML = '';
  for (const g of GROUPS) {
    const det = document.createElement('details'); det.className = 'grp'; det.id = 'grp-' + g.id; if (g.open) det.open = true;
    det.innerHTML = `<summary><span>${g.icon}</span> ${esc(g.title)}</summary><div class="gbody"></div>`;
    const body = $('.gbody', det);
    if (g.id === 'profile') {
      const sp = document.createElement('div'); sp.className = 'skinpick'; sp.innerHTML = '<span style="font-size:12.5px;font-weight:600;margin-right:4px">Skin tone</span>';
      SKIN_TONES.forEach((c, i) => { const b = document.createElement('button'); b.className = 'sw' + (i === state.skin ? ' on' : ''); b.style.background = c; b.setAttribute('aria-label', 'Skin tone ' + (i + 1)); b.onclick = () => { state.skin = i; $$('.sw').forEach((x, j) => x.classList.toggle('on', j === i)); }; sp.appendChild(b); });
      body.appendChild(sp);
    }
    SLIDERS.filter(s => s.group === g.id).forEach(def => {
      const row = document.createElement('div'); row.className = 'srow'; row.dataset.id = def.id;
      row.innerHTML = `<div class="shead"><label for="sl-${def.id}">${esc(def.label)}</label><span class="sval"></span></div>
        <input type="range" id="sl-${def.id}" min="${def.min}" max="${def.max}" step="${def.step}" value="${state[def.id]}"><div class="sfx"></div>`;
      body.appendChild(row);
      $('input', row).addEventListener('input', e => { state[def.id] = +e.target.value; lastChanged = def.id; onChange(true); });
    });
    TOGGLES.filter(s => s.group === g.id).forEach(def => {
      const row = document.createElement('div'); row.className = 'trow'; row.dataset.id = def.id;
      row.innerHTML = `<div class="switch" role="switch" tabindex="0" aria-checked="${state[def.id]}" id="sw-${def.id}" aria-labelledby="swl-${def.id}"></div><div><label id="swl-${def.id}" for="sw-${def.id}">${esc(def.label)}</label><div class="sfx"></div></div>`;
      body.appendChild(row);
      const sw = $('.switch', row), flip = () => { state[def.id] = !state[def.id]; lastChanged = def.id; onChange(true); };
      sw.onclick = flip; sw.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); flip(); } };
      $('label', row).onclick = flip;
    });
    host.appendChild(det);
  }
}
function updateSliderUI() {
  for (const def of SLIDERS) {
    const row = $(`.srow[data-id="${def.id}"]`); if (!row) continue;
    const v = state[def.id], t = tierOf(def, v);
    const inp = $('input', row); if (+inp.value !== v) inp.value = v;
    const p = (v - def.min) / (def.max - def.min) * 100;
    inp.style.setProperty('--p', p + '%'); inp.style.setProperty('--zc', zoneVar[t[2]]);
    const sv = $('.sval', row); sv.textContent = (def.id === 'height' ? fmtHeight(v, state.units) : fmtSliderValue(def, v)) + (def.id === 'height' ? '' : ' · ' + t[1]); sv.className = 'sval ' + t[2];
    $('.sfx', row).textContent = t[3];
    if (def.id === 'height') $('.sval', row).textContent = fmtHeight(v, state.units);
  }
  for (const def of TOGGLES) {
    const row = $(`.trow[data-id="${def.id}"]`); if (!row) continue;
    const on = !!state[def.id]; const sw = $('.switch', row); sw.classList.toggle('on', on); sw.setAttribute('aria-checked', on);
    $('.sfx', row).textContent = on ? def.on : (def.off || '');
  }
}

/* ---------------- metric helpers ---------------- */
function numVal(id, d = D, s = state) {
  switch (id) {
    case 'bp': return d.bpSys; case 'sleepdur': return s.sleep; default: return d[id];
  }
}
function setUnits(u) { state.units = u; $('#unitBtn').textContent = u === 'us' ? 'US units' : 'Metric'; onChange(); }

function buildMetricList() {
  const tabs = $('#tabs'); tabs.innerHTML = '';
  METRIC_TABS.forEach((t, i) => { const b = document.createElement('button'); b.className = 'chip' + (i === 0 ? ' on' : ''); b.textContent = t.label; b.onclick = () => { $$('.chip', tabs).forEach(x => x.classList.remove('on')); b.classList.add('on'); showTab(t.id); }; tabs.appendChild(b); });
  const list = $('#mlist'); list.innerHTML = '';
  for (const t of METRIC_TABS) {
    const wrap = document.createElement('div'); wrap.dataset.tab = t.id; if (t.id !== 'vitals') wrap.style.display = 'none';
    Object.keys(METRIC_INFO).filter(id => METRIC_INFO[id].tab === t.id).forEach(id => {
      const info = METRIC_INFO[id], row = document.createElement('div'); row.className = 'mrow'; row.dataset.id = id; row.tabIndex = 0; row.setAttribute('role', 'button');
      row.innerHTML = `<div class="mi">${info.icon}</div><div class="mn">${esc(info.name)}</div><div class="mv"><span class="v"></span><small class="u"></small></div><div class="bar"><div class="ok"></div><div class="mk"></div></div><div class="dl"></div>`;
      row.onclick = () => openMetric(id); row.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openMetric(id); } };
      wrap.appendChild(row);
    });
    list.appendChild(wrap);
  }
}
function showTab(id) { $$('#mlist > div').forEach(w => (w.style.display = w.dataset.tab === id ? '' : 'none')); }

function urineColor(level) {
  const cols = ['#f4f6c8', '#f1ecaa', '#efdf86', '#ecce5e', '#e0b23a', '#cc9220', '#b0701a', '#8c4f12'];
  return cols[Math.round(clamp(level - 1, 0, 7))];
}
function decimals(id) { return ['a1c', 'crp', 'cohb', 'bmi', 'bone', 'temp', 'liver'].includes(id) ? 1 : 0; }
function deltaText(id) {
  if (compareIdx < 0 || !snapshots[compareIdx]) return '';
  const snap = snapshots[compareIdx]; const a = numVal(id), b = snap.vals[id]; if (b == null) return '';
  let diff = a - b; if (id === 'temp' && state.units !== 'us') diff /= 1.8;
  const dp = id === 'temp' ? 1 : decimals(id); if (Math.abs(diff) < Math.pow(10, -dp) / 2) return `≈ same as “${snap.name}”`;
  return `${diff > 0 ? '▲ +' : '▼ '}${diff.toFixed(dp)} vs “${snap.name}”`;
}
function renderMetrics() {
  for (const row of $$('#mlist .mrow')) {
    const id = row.dataset.id, disp = metricDisplay(id, D, state), st = statusOf(id, D, state);
    const vEl = $('.v', row); const html = esc(disp.v);
    if (vEl.dataset.h !== html) { vEl.textContent = disp.v; vEl.dataset.h = html; }
    $('.u', row).textContent = disp.u;
    const p = disp.p != null ? disp.p : numVal(id);
    const pos = clamp((p - disp.min) / (disp.max - disp.min)) * 100;
    const mk = $('.mk', row); mk.style.left = pos + '%'; mk.className = 'mk ' + st;
    const ok = $('.ok', row); const l = clamp((disp.lo - disp.min) / (disp.max - disp.min)) * 100, h = clamp((disp.hi - disp.min) / (disp.max - disp.min)) * 100;
    ok.style.left = l + '%'; ok.style.width = Math.max(1, h - l) + '%';
    const dl = $('.dl', row); let txt = deltaText(id);
    if (id === 'hydration') txt = `<span class="urine" style="background:${urineColor(D.hydration)}"></span>${txt}`;
    dl.innerHTML = txt; dl.style.display = txt ? '' : 'none';
  }
}

const CHART_CELLS = [
  { k: 'Height', f: () => [fmtHeight(state.height, state.units), '', null], id: 'bmi' },
  { k: 'Weight', f: () => [fmtWeight(D.weight, state.units), '', null], id: 'bmi' },
  { k: 'Resting HR', f: () => [Math.round(D.rhr), 'bpm', 'rhr'], id: 'rhr' },
  { k: 'Blood pressure', f: () => [Math.round(D.bpSys) + '/' + Math.round(D.bpDia), 'mmHg', 'bp'], id: 'bp' },
  { k: 'Respiratory rate', f: () => [Math.round(D.rr), '/min', 'rr'], id: 'rr' },
  { k: 'Temperature', f: () => [fmtTemp(D.temp, state.units).split(' ')[0], state.units === 'us' ? '°F' : '°C', 'temp'], id: 'temp' },
  { k: 'Oxygen sat.', f: () => [Math.round(D.spo2), '%', 'spo2'], id: 'spo2' },
  { k: 'Sleep last night', f: () => [(+state.sleep).toFixed(1), 'hrs', 'sleepdur'], id: 'sleepdur' },
];
function buildChart() {
  const host = $('#chart'); host.innerHTML = '';
  CHART_CELLS.forEach((c, i) => { const d = document.createElement('div'); d.className = 'cell'; d.tabIndex = 0; d.setAttribute('role', 'button'); d.innerHTML = `<span class="dot"></span><small>${c.k}</small><b></b>`; d.onclick = () => openMetric(c.id); d.onkeydown = e => { if (e.key === 'Enter') openMetric(c.id); }; host.appendChild(d); });
}
function renderChart() {
  $$('#chart .cell').forEach((el, i) => {
    const c = CHART_CELLS[i], [v, u, id] = c.f();
    $('b', el).innerHTML = `${esc(v)}<i>${u}</i>`;
    $('.dot', el).className = 'dot ' + (id ? statusOf(id, D, state) : statusOf('bmi', D, state));
  });
}

/* ---------------- radar ---------------- */
function renderRadar() {
  const cv = $('#radar'), g = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2 + 4, R = 82;
  g.clearRect(0, 0, W, H);
  const keys = Object.keys(D.prof);
  const pt = (i, r) => { const a = -Math.PI / 2 + i * Math.PI * 2 / keys.length; return [cx + Math.cos(a) * R * r, cy + Math.sin(a) * R * r]; };
  g.strokeStyle = 'rgba(150,180,255,.2)'; g.lineWidth = 1;
  for (let ring = 1; ring <= 4; ring++) { g.beginPath(); keys.forEach((k, i) => { const [x, y] = pt(i, ring / 4); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }
  keys.forEach((k, i) => { const [x, y] = pt(i, 1); g.beginPath(); g.moveTo(cx, cy); g.lineTo(x, y); g.stroke(); const [lx, ly] = pt(i, 1.2); g.fillStyle = '#c4d2f0'; g.font = '600 12px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(k, lx, ly); });
  // baseline
  g.setLineDash([4, 4]); g.strokeStyle = '#8a98c0'; g.lineWidth = 1.4; g.beginPath(); keys.forEach((k, i) => { const [x, y] = pt(i, 0.05 + 0.95 * baseD.prof[k]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); g.setLineDash([]);
  g.beginPath(); keys.forEach((k, i) => { const [x, y] = pt(i, 0.05 + 0.95 * D.prof[k]); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
  g.fillStyle = 'rgba(45,226,200,.28)'; g.fill(); g.strokeStyle = '#2de2c8'; g.lineWidth = 2.2; g.stroke();
  keys.forEach((k, i) => { const [x, y] = pt(i, 0.05 + 0.95 * D.prof[k]); g.beginPath(); g.arc(x, y, 3.4, 0, 7); g.fillStyle = '#fff'; g.fill(); });
}
function renderNotes() {
  const n = contextNotes(D, state);
  $('#notes').innerHTML = '<h3>🩺 Clinical thinking</h3>' + n.map(x => `<p><span>${x[0]}</span><span>${esc(x[1])}</span></p>`).join('') +
    (snapshots.length ? `<p style="margin-top:8px"><label style="color:var(--ink3);font-size:11px">COMPARE WITH SNAPSHOT </label> <select id="cmpSel" style="font-size:12px"><option value="-1">— none —</option>${snapshots.map((s, i) => `<option value="${i}" ${i === compareIdx ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></p>` : '');
  const sel = $('#cmpSel'); if (sel) sel.onchange = () => { compareIdx = +sel.value; renderMetrics(); };
}

/* ---------------- narrator cards ---------------- */
let narrSig = '';
function narrate() {
  const cards = [];
  const make = (def, isToggle) => {
    if (isToggle) { const on = !!state[def.id]; const txt = on ? def.on : def.off; if (!txt) return null; return { title: def.label + (on ? ': yes' : ': no'), txt, zone: on === (def.id === 'brush' || def.id === 'vaccines' || def.id === 'handwash') ? 'good' : 'bad' }; }
    const t = tierOf(def, state[def.id]); return { title: def.label + ' — ' + t[1], txt: t[3], zone: t[2] };
  };
  if (lastChanged) { const def = sliderDefs[lastChanged] || toggleDefs[lastChanged]; if (def) { const c = make(def, !!toggleDefs[lastChanged]); if (c) cards.push(c); } }
  const dev = [];
  for (const def of SLIDERS) {
    if (def.id === lastChanged) continue;
    const t = tierOf(def, state[def.id]), t0 = tierOf(def, def.def);
    if (t === t0 || t[2] === 'info') continue;
    dev.push({ def, t, score: (t[2] === 'bad' ? 3 : t[2] === 'warn' ? 1 : 2) + Math.abs(state[def.id] - def.def) / (def.max - def.min) });
  }
  for (const def of TOGGLES) { if (def.id === lastChanged) continue; if (!!state[def.id] !== def.def) dev.push({ def, toggle: true, score: 3.2 }); }
  dev.sort((a, b) => b.score - a.score);
  dev.slice(0, 2 - (cards.length ? 0 : -1)).forEach(x => { const c = x.toggle ? make(x.def, true) : { title: x.def.label + ' — ' + x.t[1], txt: x.t[3], zone: x.t[2] }; if (c) cards.push(c); });
  const sig = JSON.stringify(cards); if (sig === narrSig) return; narrSig = sig;
  $('#narr').innerHTML = cards.slice(0, 3).map(c => `<div class="ncard ${c.zone}"><b>${esc(c.title)}</b>${esc(c.txt)}</div>`).join('');
}

/* ---------------- modals ---------------- */
function openModal(id) { $('#' + id).classList.add('open'); }
function closeModals() { $$('.modal.open').forEach(m => m.classList.remove('open')); scopeOpenKey = null; }
document.addEventListener('click', e => { if (e.target.matches('[data-close]') || (e.target.classList && e.target.classList.contains('modal'))) closeModals(); });

function openMetric(id) {
  const info = METRIC_INFO[id], disp = metricDisplay(id, D, state), st = statusOf(id, D, state);
  const stTxt = { good: 'In the healthy range', warn: 'Worth watching', bad: 'Outside the healthy range' }[st];
  const sl = (METRIC_SLIDERS[id] || []).map(k => { const d = sliderDefs[k] || toggleDefs[k]; return d ? `<button class="pill" data-goto="${k}">${esc(d.label)}</button>` : ''; }).join('');
  const p = disp.p != null ? disp.p : numVal(id), pos = clamp((p - disp.min) / (disp.max - disp.min)) * 100;
  const l = clamp((disp.lo - disp.min) / (disp.max - disp.min)) * 100, h = clamp((disp.hi - disp.min) / (disp.max - disp.min)) * 100;
  $('#mBody').innerHTML = `
    <div class="big"><div class="ic">${info.icon}</div><div><h1>${esc(info.name)}</h1>
      <div class="val">${esc(disp.v)} <small>${esc(disp.u)}</small> <span class="sval ${st}" style="font-size:13px;vertical-align:middle">${stTxt}</span></div></div></div>
    <div class="mrow" style="cursor:default;grid-template-columns:1fr"><div class="bar" style="grid-column:1;height:12px;margin:8px 0 6px"><div class="ok" style="left:${l}%;width:${Math.max(1, h - l)}%"></div><div class="mk ${st}" style="left:${pos}%;height:22px;top:-5px"></div></div>
      <div class="dl" style="display:flex;justify-content:space-between;gap:10px"><span>${disp.min}</span><span style="text-align:center">green band = typical reference range</span><span>${disp.max}</span></div></div>
    <div class="mgrid">
      <div class="txtblock full"><h4>Reference / healthy range</h4>${esc(info.range)}</div>
      <div class="txtblock"><h4>What does it measure?</h4>${esc(info.what)}</div>
      <div class="txtblock"><h4>Why does it matter?</h4>${esc(info.why)}</div>
      <div class="txtblock help"><h4>Lifestyle factors that may help</h4>${esc(info.helps)}</div>
      <div class="txtblock hurt"><h4>Lifestyle factors that may hurt</h4>${esc(info.hurts)}</div>
      <div class="txtblock teach full"><h4 style="color:var(--teal)">30-second teach-back</h4>${esc(info.teach)}</div>
    </div>
    <div style="margin-top:12px"><b style="font-size:12px;color:var(--ink3);letter-spacing:1px">TRY CHANGING</b><div style="margin-top:6px">${sl}</div></div>
    <p style="color:var(--ink3);font-size:12px;margin-top:12px">Ranges shown are common reference ranges for teens and adults. Always interpret a metric using age, units and measurement conditions, and check with a health professional about real measurements.</p>`;
  $$('#mBody [data-goto]').forEach(b => b.onclick = () => { closeModals(); gotoControl(b.dataset.goto); });
  openModal('metricModal');
}
function gotoControl(id) {
  const row = $(`.srow[data-id="${id}"]`) || $(`.trow[data-id="${id}"]`); if (!row) return;
  document.body.classList.add('showL');
  const det = row.closest('details'); if (det) det.open = true;
  setTimeout(() => { row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1600); }, 60);
}

/* scope modal */
let scopeOpenKey = null, scopeLevel = 0;
function openScope(key) {
  if (!MICRO[key]) return; scopeOpenKey = key; scopeLevel = 0;
  const o = ORGANS[key], sc = MICRO[key];
  $('#scTitle').textContent = o.emoji + ' ' + o.name;
  $('#scRole').textContent = o.role; $('#scAff').textContent = o.affected;
  $('#lv0').textContent = '① ' + sc.lv[0] + '  (cells)'; $('#lv1').textContent = '② ' + sc.lv[1] + '  (molecules)';
  $('#scMetrics').innerHTML = (ORGAN_METRICS[key] || []).map(id => `<button class="pill" data-m="${id}">${METRIC_INFO[id].icon} ${esc(METRIC_INFO[id].name)}</button>`).join('');
  $$('#scMetrics [data-m]').forEach(b => b.onclick = () => { closeModals(); openMetric(b.dataset.m); });
  setScopeLevel(0); openModal('scopeModal');
}
function setScopeLevel(l) { scopeLevel = l; $('#lv0').classList.toggle('on', l === 0); $('#lv1').classList.toggle('on', l === 1); }

/* ---------------- notebook ---------------- */
const NB_ROWS = [['Age', s => s.age], ['Years living this way', s => s.years], ['Aerobic min/day', s => s.cardio], ['Strength days/wk', s => s.strength], ['Sitting hrs/day', s => s.sitting], ['Sleep hrs', s => s.sleep], ['Screens before bed hrs', s => s.screens], ['Past smoking pack-yrs', s => s.packyrs], ['Years since quitting', s => s.quitYrs], ['Fish/healthy fats /wk', s => s.fish], ['Stress /10', s => s.stress],
  ['Fruit/veg servings', s => s.fruitveg], ['Added sugar g', s => s.sugar], ['Sodium mg', s => s.sodium], ['Fried foods', s => s.fried], ['Fiber g', s => s.fiber], ['Water cups', s => s.water], ['Caffeine mg', s => s.caffeine], ['Cigarettes/day', s => s.cigs], ['Vape pods/wk', s => s.vape], ['Alcohol drinks/wk', s => s.alcohol], ['Calories vs. burned', s => s.energy]];
const NB_METRICS = ['rhr', 'bp', 'rr', 'temp', 'spo2', 'sv', 'glucose', 'a1c', 'tc', 'ldl', 'hdl', 'tg', 'crp', 'cohb', 'bmi', 'bodyfat', 'muscle', 'bone', 'vo2', 'fev1', 'hydration', 'focus', 'mood', 'immune', 'skin', 'liver', 'kidney', 'gut', 'dental'];
function takeSnapshot(name) {
  const vals = {}; NB_METRICS.forEach(id => (vals[id] = numVal(id)));
  const disp = {}; NB_METRICS.forEach(id => { const d = metricDisplay(id, D, state); disp[id] = d.v + ' ' + d.u; });
  snapshots.push({ name: name || 'Snapshot ' + (snapshots.length + 1), s: JSON.parse(JSON.stringify(state)), vals, disp, w: fmtWeight(D.weight, state.units) });
  renderNotebook(); renderNotes();
}
function renderNotebook() {
  const host = $('#nbTable');
  if (!snapshots.length) { host.innerHTML = '<p style="padding:20px;color:var(--ink2)">No snapshots yet. Click “Save snapshot”.</p>'; return; }
  let h = '<table class="nb"><thead><tr><th>Choice / metric</th>' + snapshots.map(s => `<th>${esc(s.name)}</th>`).join('') + '</tr></thead><tbody>';
  h += `<tr><td colspan="${snapshots.length + 1}" style="text-align:left;color:var(--teal);font-weight:700">Choices</td></tr>`;
  NB_ROWS.forEach(r => (h += `<tr><td>${r[0]}</td>${snapshots.map(s => `<td>${r[1](s.s)}</td>`).join('')}</tr>`));
  h += `<tr><td colspan="${snapshots.length + 1}" style="text-align:left;color:var(--teal);font-weight:700">Results</td></tr>`;
  NB_METRICS.forEach(id => (h += `<tr><td>${esc(METRIC_INFO[id].name)}</td>${snapshots.map(s => `<td>${esc(s.disp[id])}</td>`).join('')}</tr>`));
  host.innerHTML = h + '</tbody></table>';
}
function nbCsv() {
  const rows = [['Item', ...snapshots.map(s => s.name)]];
  NB_ROWS.forEach(r => rows.push([r[0], ...snapshots.map(s => r[1](s.s))]));
  NB_METRICS.forEach(id => rows.push([METRIC_INFO[id].name, ...snapshots.map(s => s.disp[id])]));
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'bodylab-notebook.csv'; document.body.appendChild(a); a.click(); a.remove();
}
function nbPrint() {
  const w = window.open('', '_blank'); if (!w) return;
  w.document.write('<html><head><title>BodyLab notebook</title><style>body{font:13px system-ui;margin:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 8px;text-align:right}td:first-child,th:first-child{text-align:left}</style></head><body><h2>BodyLab lab notebook (fictional data)</h2>' + $('#nbTable').innerHTML + '</body></html>');
  w.document.close(); w.focus(); w.print();
}

/* ---------------- missions ---------------- */
const MISSIONS = [
  { icon: '💓', title: 'Heart of a champion', text: 'Bring resting heart rate down to 58 bpm or lower.', hint: 'Aerobic activity, calm, sleep and less caffeine all help.', check: d => d.rhr <= 58 },
  { icon: '🩺', title: 'Pressure cooker', text: 'Raise blood pressure into the Stage 1 range (130/80 or higher).', hint: 'Salt, stress, inactivity and body weight push pressure up.', check: d => d.bpSys >= 130 || d.bpDia >= 80 },
  { icon: '🫧', title: 'Short of oxygen', text: 'Make oxygen saturation (SpO₂) drop below 95%.', hint: 'Look at lung-related choices and health history.', check: d => d.spo2 < 95 },
  { icon: '☁️', title: 'The silent thief', text: 'Get carbon monoxide in the blood to 5% or more while SpO₂ still reads 95% or higher. Why can the pulse oximeter be fooled?', hint: 'A long smoking history, but not too much lung damage yet.', check: d => d.cohb >= 5 && d.spo2 >= 95 },
  { icon: '⚖️', title: 'BMI can’t see muscle', text: 'Reach a BMI of 25 or more with body fat under 20%.', hint: 'Heavy strength training with plenty of protein for years.', check: d => d.bmi >= 25 && d.bodyfat < 20 },
  { icon: '🍬', title: 'Sugar overload', text: 'Raise fasting glucose into the prediabetes range (100 mg/dL or more).', hint: 'Sugar, inactivity, body fat, sleep, stress, family history…', check: d => d.glucose >= 100 },
  { icon: '🧪', title: 'Cholesterol cleanup', text: 'Get LDL (“bad”) cholesterol under 70 mg/dL.', hint: 'Fiber, fewer fried foods, fish, exercise.', check: d => d.ldl < 70 },
  { icon: '🦴', title: 'Bone-bank deposit', text: 'Raise bone density to a T-score of +1.0 or higher.', hint: 'Strength training, aerobic activity and calcium — years of it.', check: d => d.bone >= 1 },
  { icon: '🧠', title: 'Sleep detective', text: 'Drop Focus & Memory below 60 using only sleep, caffeine, screens and stress.', hint: 'Shorten sleep, add caffeine and stress.', check: d => d.focus < 60 },
  { icon: '💧', title: 'Hydration hero', text: 'Get urine color to level 2 or lighter.', hint: 'Water — and notice what else drains it.', check: d => d.hydration <= 2 },
  { icon: '🌱', title: 'Quit and heal', text: 'Set past smoking to 20+ pack-years, cigarettes to 0, and years since quitting to 10+. Compare the lungs with “Just quit.”', hint: 'Find the sliders under Substances.', check: (d, s) => s.packyrs >= 20 && s.cigs === 0 && s.quitYrs >= 10 },
  { icon: '🧓', title: 'Aging well', text: 'At age 70 or older, keep bone T-score above −1.2 and resting heart rate under 65.', hint: 'Habits matter at every age.', check: (d, s) => s.age >= 70 && d.bone >= -1.2 && d.rhr < 65 },
  { icon: '🛡️', title: 'Weakened defenses', text: 'Drop Immune Readiness below 60.', hint: 'Sleep, stress, smoking, and sugar all play a part.', check: d => d.immune < 60 },
  { icon: '🟤', title: 'Fatty liver', text: 'Raise liver fat above 10%.', hint: 'Sugar, body fat and alcohol (education only) do this.', check: d => d.liver > 10 },
  { icon: '🌡️', title: 'Fever detective', text: 'Turn on “Sick with the flu.” Which vital signs change together?', hint: 'Temperature, heart rate, breathing rate…', check: (d, s) => !!s.sick },
  { icon: '🧴', title: 'Sun damage', text: 'Drop Skin Health below 55.', hint: 'UV exposure, sunscreen, smoking…', check: d => d.skin < 55 },
  { icon: '🦷', title: 'Cavity creator', text: 'Drop Dental Health below 70.', hint: 'Sugar, brushing, smoking.', check: d => d.dental < 70 },
];
const missDone = new Set();
function checkMissions() {
  MISSIONS.forEach((m, i) => { if (!missDone.has(i) && m.check(D, state)) { missDone.add(i); const n = $('#narr'); const c = document.createElement('div'); c.className = 'ncard good'; c.innerHTML = `<b>🎉 Mission complete!</b>${esc(m.title)}`; n.prepend(c); setTimeout(() => c.remove(), 4500); } });
  $('#missCount').textContent = missDone.size + '/' + MISSIONS.length;
}
function renderMissions() {
  $('#missList').innerHTML = MISSIONS.map((m, i) => `<div class="mission ${missDone.has(i) ? 'done' : ''}"><div class="mic">${m.icon}</div><div><b>${esc(m.title)}</b><p>${esc(m.text)}</p><small>💡 ${esc(m.hint)}</small></div><div class="ck">${missDone.has(i) ? '✓ Done' : 'In progress'}</div></div>`).join('');
  $('#missProg').textContent = missDone.size + ' of ' + MISSIONS.length + ' complete';
}

/* ---------------- class metrics chart (worksheet Part 4) ---------------- */
const KEY_ORDER = ['bp', 'rhr', 'rr', 'temp', 'spo2', 'glucose', 'tc', 'ldl', 'hdl', 'tg', 'bmi', 'sleepdur', 'bodyfat', 'muscle', 'bone', 'vo2', 'fev1', 'hydration', 'a1c', 'crp', 'cohb', 'sv', 'focus', 'mood', 'immune', 'skin', 'liver', 'kidney', 'gut', 'dental'];
function renderKey() {
  const rows = KEY_ORDER.map(id => { const m = METRIC_INFO[id]; const v = t => `<span class="veil" onclick="this.classList.remove('veil')">${esc(t)}</span>`; return `<tr><td style="font-weight:700;min-width:150px">${m.icon} ${esc(m.name)}</td><td>${v(m.range)}</td><td>${v(m.what)}</td><td>${v(m.helps)}</td><td>${v(m.hurts)}</td></tr>`; }).join('');
  $('#keyTable').innerHTML = `<table class="nb key"><thead><tr><th>Metric</th><th>Reference / healthy range + units</th><th>What it measures</th><th>Lifestyle factors that may HELP</th><th>Lifestyle factors that may HURT</th></tr></thead><tbody>${rows}</tbody></table>`;
}

/* ---------------- presets ---------------- */
function applyPreset(id) {
  const p = PRESETS.find(x => x.id === id); if (!p) return;
  const keep = { skin: state.skin, units: state.units };
  Object.assign(state, defaultState(), keep, p.set);
  lastChanged = null; onChange(); $('#presetSel').value = id;
  $('#narr').innerHTML = `<div class="ncard info"><b>${p.icon} Scenario: ${esc(p.name)}</b>${esc(p.note)}</div>`; narrSig = '';
  setTimeout(() => { narrSig = ''; narrate(); }, 3200);
}

function onChange(fromUser) {
  if (fromUser && !tl) { const ps = $('#presetSel'); if (ps.value !== 'custom') ps.value = 'custom'; }
  D = compute(state);
  updateSliderUI(); renderMetrics(); renderChart(); renderRadar(); renderNotes(); narrate(); checkMissions();
}
