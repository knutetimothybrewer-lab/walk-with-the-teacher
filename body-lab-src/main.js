/* ============================================================
   MAIN — scene, camera, picking, microscope lens, main loop
   ============================================================ */
const VIEWS = {
  skin: { skin: 1, fat: 0, muscle: 0, bone: 0, organ: 0, vessel: 0, nerve: 0 },
  xray: { skin: 0.14, fat: 0, muscle: 0, bone: 0.7, organ: 1, vessel: 1, nerve: 0 },
  muscle: { skin: 0.06, fat: 0, muscle: 1, bone: 0, organ: 0, vessel: 0, nerve: 0 },
  bone: { skin: 0.07, fat: 0, muscle: 0, bone: 1, organ: 0, vessel: 0, nerve: 0 },
  organs: { skin: 0.1, fat: 0, muscle: 0, bone: 0.25, organ: 1, vessel: 0.5, nerve: 0 },
  vessels: { skin: 0.08, fat: 0, muscle: 0, bone: 0.15, organ: 0.22, vessel: 1, nerve: 0 },
  nerves: { skin: 0.08, fat: 0, muscle: 0, bone: 0.12, organ: 0.3, vessel: 0, nerve: 1 },
  fat: { skin: 0.1, fat: 0.7, muscle: 0, bone: 0, organ: 0.25, vessel: 0, nerve: 0 },
};
const FOCUS = { full: [0.92, 3.9], head: [1.62, 1.2], chest: [1.28, 1.75], belly: [1.04, 1.75], legs: [0.5, 2.6] };

let renderer, scene, camera, rig, anim, hasGL = true;
const cam = { az: 0.0, pol: 1.4, dist: 3.9, ty: 0.92, taz: 0.0, tpol: 1.4, tdist: 3.9, tty: 0.92, spin: false, idle: 0 };
let poseName = 'stand', viewName = 'xray', scopeOn = false, lensLevel = 0, lensF = 0, lensKey = null, lensFade = 0;
const ptr = { x: 0, y: 0, inside: false, dirty: false, down: false, moved: 0, id: null, sx: 0, sy: 0 };
let floorTex, hover = null;
const raycaster = new THREE.Raycaster();

function initGL() {
  const canvas = $('#gl');
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { hasGL = false; $('#nogl').style.display = 'grid'; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.05, 40);
  scene.add(new THREE.HemisphereLight('#d6ecff', '#2a3354', 1.35));
  const key = new THREE.DirectionalLight('#fff3e6', 2.3); key.position.set(2.5, 3.5, 3.2); scene.add(key);
  const rim = new THREE.DirectionalLight('#7fb8ff', 1.5); rim.position.set(-3, 2.2, -2.5); scene.add(rim);
  const fill = new THREE.DirectionalLight('#ffd6c8', 0.7); fill.position.set(-2.5, 0.8, 2.5); scene.add(fill);

  // floor: glowing platform + scrolling grid (treadmill effect while moving)
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#0a1330'; g.fillRect(0, 0, 256, 256); g.strokeStyle = 'rgba(80,140,255,.55)'; g.lineWidth = 3;
  for (let i = 0; i <= 256; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
  floorTex = new THREE.CanvasTexture(c); floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(10, 10);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshBasicMaterial({ map: floorTex, transparent: true, opacity: 0.5, depthWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -0.012; scene.add(floor);
  const fade = document.createElement('canvas'); fade.width = fade.height = 256; const fg = fade.getContext('2d');
  const gr = fg.createRadialGradient(128, 128, 20, 128, 128, 128); gr.addColorStop(0, 'rgba(8,14,34,0)'); gr.addColorStop(0.55, 'rgba(8,14,34,0.0)'); gr.addColorStop(1, 'rgba(7,12,28,1)'); fg.fillStyle = gr; fg.fillRect(0, 0, 256, 256);
  const fm = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(fade), transparent: true, depthWrite: false })); fm.rotation.x = -Math.PI / 2; fm.position.y = -0.008; scene.add(fm);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.66, 80), new THREE.MeshBasicMaterial({ color: '#2de2c8', transparent: true, opacity: 0.55, side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.y = -0.005; scene.add(ring);

  rig = createBody(); scene.add(rig.root); scene.add(rig.props);
  anim = createAnimator(rig, scene);
  Object.assign(rig.layerOp, VIEWS.xray); Object.assign(rig.curOp, VIEWS.xray);
  resize();
}

function resize() {
  if (!hasGL) return;
  const st = $('#stage'), w = st.clientWidth, h = st.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

function setView(name) {
  viewName = name; Object.assign(rig.layerOp, VIEWS[name]);
  $$('#viewGroup .chip').forEach(c => c.classList.toggle('on', c.dataset.view === name));
}
function setFocus(k) { const f = FOCUS[k]; cam.tty = f[0]; cam.tdist = f[1] * (($('#stage').clientWidth / $('#stage').clientHeight) < 0.9 ? 1.4 : 1); }
function setPose(name) {
  const prev = poseName; poseName = name; $('#poseSel').value = name; $('#hudPose').textContent = POSES[name].label;
  if (name === 'sleep') { cam.tpol = 0.55; cam.tty = 0.35; cam.tdist = 3.9; cam.taz = 0; }
  else if (prev === 'sleep') { cam.tpol = 1.4; cam.tty = 0.92; cam.tdist = 3.9; }
  if (name === 'sit' && prev !== 'sit') { cam.tdist = 4.6; cam.taz = 0.5; cam.tty = 0.8; }
  if (prev === 'sit' && name !== 'sit') { cam.taz = 0; cam.tty = 0.92; }
}

/* ---------------- camera orbit ---------------- */
function updateCamera(dt) {
  if (cam.spin && !ptr.down && !scopeOn) cam.taz += dt * 0.35;
  const k = Math.min(1, dt * 7);
  cam.az += (cam.taz - cam.az) * k; cam.pol += (cam.tpol - cam.pol) * k; cam.dist += (cam.tdist - cam.dist) * k; cam.ty += (cam.tty - cam.ty) * k;
  const sp = Math.sin(cam.pol), ex = cam.dist * sp * Math.sin(cam.az), ey = cam.ty + cam.dist * Math.cos(cam.pol), ez = cam.dist * sp * Math.cos(cam.az);
  camera.position.set(ex, ey, ez); camera.lookAt(0, cam.ty, 0);
}
const stage = () => $('#stage');
function bindPointer() {
  const st = stage();
  st.addEventListener('pointerdown', e => {
    if (e.target.closest('.floatbar,#timebar,#hud,#narr')) return;
    ptr.down = true; ptr.moved = 0; ptr.id = e.pointerId; ptr.sx = e.clientX; ptr.sy = e.clientY; st.setPointerCapture(e.pointerId); $('#hint').style.opacity = 0;
  });
  st.addEventListener('pointermove', e => {
    const r = st.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; ptr.inside = true; ptr.dirty = true;
    if (ptr.down) {
      const dx = e.clientX - ptr.sx, dy = e.clientY - ptr.sy; ptr.sx = e.clientX; ptr.sy = e.clientY; ptr.moved += Math.abs(dx) + Math.abs(dy);
      cam.taz -= dx * 0.008; cam.tpol = clamp(cam.tpol - dy * 0.006, 0.12, 2.0);
      if (e.shiftKey || e.buttons === 2) cam.tty = clamp(cam.tty + dy * 0.004, 0.1, 1.8);
    }
  });
  st.addEventListener('pointerup', e => { if (!ptr.down) return; ptr.down = false; if (ptr.moved < 6) onStageClick(); });
  st.addEventListener('pointercancel', () => { ptr.down = false; });
  st.addEventListener('pointerleave', () => { ptr.inside = false; hideTip(); });
  st.addEventListener('contextmenu', e => e.preventDefault());
  st.addEventListener('wheel', e => {
    e.preventDefault();
    if (scopeOn) { lensStep(e.deltaY < 0 ? 1 : -1, true); return; }
    cam.tdist = clamp(cam.tdist * (1 + e.deltaY * 0.0012), 0.7, 7);
  }, { passive: false });
  // pinch zoom
  const pts = new Map(); let pd = 0;
  st.addEventListener('pointerdown', e => { pts.set(e.pointerId, [e.clientX, e.clientY]); });
  st.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pd) cam.tdist = clamp(cam.tdist * (pd / d), 0.7, 7); pd = d; ptr.moved = 99; } });
  const up = e => { pts.delete(e.pointerId); pd = 0; }; st.addEventListener('pointerup', up); st.addEventListener('pointercancel', up);
}

/* ---------------- picking ---------------- */
const ndc = new THREE.Vector2();
function pickAt(x, y) {
  if (!hasGL) return null;
  const st = stage(); ndc.set(x / st.clientWidth * 2 - 1, -(y / st.clientHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const list = rig.pickables.filter(m => m.visible && rig.curOp[m.userData.layer] * (m.userData.base || 1) >= 0.45 && m.parent);
  const hits = raycaster.intersectObjects(list, false);
  if (!hits.length) return null;
  let best = hits[0];
  if (best.object.userData.soft || best.object.userData.pick === 'skin') {
    for (const h of hits) { if (h.distance - hits[0].distance > 0.3) break; if (!h.object.userData.soft && h.object.userData.pick !== 'skin') { best = h; break; } }
  }
  return best.object.userData.pick || null;
}
function pickGhostSkin(x, y) { // fallback: pointing at the body silhouette when skin is see-through
  const st = stage(); ndc.set(x / st.clientWidth * 2 - 1, -(y / st.clientHeight) * 2 + 1); raycaster.setFromCamera(ndc, camera);
  const list = rig.reg.skin.filter(m => m.parent && !m.userData.hit);
  const h = raycaster.intersectObjects(list, false); return h.length ? 'skin' : null;
}
function onStageClick() {
  if (!hasGL) return;
  const k = pickAt(ptr.x, ptr.y) || (rig.curOp.skin > 0.01 ? pickGhostSkin(ptr.x, ptr.y) : null);
  if (k) openScope(k === 'blood' ? 'blood' : k);
}
function showTip(txt, sub) { const t = $('#tip'); t.innerHTML = txt + (sub ? `<small>${sub}</small>` : ''); t.style.display = 'block'; t.style.left = Math.min(ptr.x + 14, stage().clientWidth - 250) + 'px'; t.style.top = (ptr.y + 16) + 'px'; }
function hideTip() { $('#tip').style.display = 'none'; }

/* ---------------- microscope lens ---------------- */
const lensCv = () => $('#lensCv');
const MAGS = [['×400', 'CELL VIEW'], ['×200,000', 'MOLECULAR VIEW']];
function setScope(on) {
  scopeOn = on; $('#scopeBtn').classList.toggle('on', on); $('#stage').classList.toggle('scope-on', on);
  $('#scopeBtn').textContent = on ? '🔬 Microscope: ON' : '🔬 Microscope';
  if (!on) $('#lens').style.display = 'none'; else $('#hint').style.opacity = 0;
}
let wheelAcc = 0;
function lensStep(dir, fromWheel) {
  if (fromWheel) { wheelAcc += dir; if (Math.abs(wheelAcc) < 1) return; wheelAcc = 0; }
  lensLevel = clamp(lensLevel + (dir > 0 ? 1 : -1), 0, 1);
}
function updateLens(dt, t) {
  const lens = $('#lens');
  if (!scopeOn || !ptr.inside || scopeOpenKey) { lens.style.display = 'none'; return; }
  const k = pickAt(ptr.x, ptr.y) || (rig.curOp.skin > 0.01 ? pickGhostSkin(ptr.x, ptr.y) : null);
  lens.style.display = 'block';
  const W = stage().clientWidth, H = stage().clientHeight;
  const lx = clamp(ptr.x, 150, W - 150), ly = clamp(ptr.y, 150, H - 140);
  lens.style.left = lx + 'px'; lens.style.top = ly + 'px';
  lensKey = k; const cv = lensCv(), g = cv.getContext('2d'), S = cv.width;
  lensF += (lensLevel - lensF) * Math.min(1, dt * 6);
  g.clearRect(0, 0, S, S);
  if (!k) {
    g.fillStyle = '#0a1226'; g.fillRect(0, 0, S, S); g.strokeStyle = 'rgba(100,160,255,.25)'; g.lineWidth = 1;
    for (let i = 0; i < S; i += 28) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, S); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(S, i); g.stroke(); }
    g.fillStyle = '#9fb8e8'; g.font = '700 22px system-ui'; g.textAlign = 'center'; g.fillText('Move the lens over the body', S / 2, S / 2 - 6); g.font = '500 16px system-ui'; g.fillText('to see cells and molecules', S / 2, S / 2 + 22);
    $('#lensName').textContent = ''; $('#lensMag').textContent = ''; $('#lenscap').style.display = 'none'; return;
  }
  const sc = MICRO[k]; if (!sc) { return; }
  if (lensF < 0.98) drawMicro(g, k, 0, S, t, dt, D, 1);
  if (lensF > 0.02) drawMicro(g, k, 1, S, t, dt, D, lensF);
  const lvl = lensF > 0.5 ? 1 : 0;
  $('#lensName').textContent = ORGANS[k].emoji + ' ' + ORGANS[k].name;
  $('#lensMag').textContent = MAGS[lvl][0] + ' · ' + MAGS[lvl][1];
  const cap = $('#lenscap'); cap.style.display = 'block';
  const html = `<b>${MAGS[lvl][1] === 'CELL VIEW' ? 'Cells:' : 'Molecules:'}</b> ${esc(sc.cap(lvl, D))}<div style="color:var(--ink3);font-size:11px;margin-top:3px">scroll or 1 / 2 to zoom · click for big view</div>`;
  if (cap.dataset.h !== html) { cap.innerHTML = html; cap.dataset.h = html; }
}
function drawScope(dt, t) {
  if (!scopeOpenKey) return;
  const cv = $('#bigCv'), g = cv.getContext('2d'), S = cv.width, sc = MICRO[scopeOpenKey];
  lensF += (scopeLevel - lensF) * Math.min(1, dt * 6);
  g.clearRect(0, 0, S, S);
  if (lensF < 0.98) drawMicro(g, scopeOpenKey, 0, S, t, dt, D, 1);
  if (lensF > 0.02) drawMicro(g, scopeOpenKey, 1, S, t, dt, D, lensF);
  const lvl = scopeLevel; const html = `<b>Right now:</b> ${esc(sc.cap(lvl, D))}`;
  if ($('#scNow').dataset.h !== html) { $('#scNow').innerHTML = html; $('#scNow').dataset.h = html; }
}

/* ---------------- time machine ---------------- */
let tl = null;
function startTimelapse() {
  if (tl) return;
  tl = { age0: state.age, yrs0: state.years, t: 0, dur: 16, span: Math.max(1, Math.min(20, 80 - state.age)) };
  $('#timebar').style.display = 'flex'; $('#timeBack').style.display = 'none'; $('#timeStop').style.display = '';
  if (!scopeOn) cam.spin = false;
}
function stepTimelapse(dt) {
  if (!tl) return; tl.t += dt; const u = Math.min(1, tl.t / tl.dur), e = u * u * (3 - 2 * u);
  state.age = Math.round(tl.age0 + tl.span * e); state.years = Math.min(30, +(tl.yrs0 + tl.span * e).toFixed(1)); state.age = Math.min(80, state.age);
  tl.tick = (tl.tick || 0) + dt; if (tl.tick > 0.08 || u >= 1) { tl.tick = 0; onChange(); }
  $('#timeTxt').textContent = `⏩ Age ${tl.age0} → ${state.age} · living this way for ${state.years} years`;
  if (u >= 1) { $('#timeStop').style.display = 'none'; $('#timeBack').style.display = ''; tl.done = true; }
}
function stopTimelapse(back) {
  if (!tl) return;
  if (back) { state.age = tl.age0; state.years = tl.yrs0; onChange(); }
  tl = null; $('#timebar').style.display = 'none';
}

/* ---------------- main loop ---------------- */
let last = performance.now(), clock = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; clock += dt;
  if (!hasGL) return;
  stepTimelapse(dt);
  anim.update(dt, clock, D, poseName, { skin: SKIN_TONES[state.skin], height: state.height });
  setBeatPhase(anim.cur.beat);
  floorTex.offset.y -= dt * anim.state.floorScroll * 0.5;
  updateCamera(dt);
  // hover
  if (ptr.dirty && ptr.inside && !ptr.down && !scopeOn && !scopeOpenKey) {
    ptr.dirty = false;
    const k = pickAt(ptr.x, ptr.y); hover = k;
    if (k) showTip(ORGANS[k].emoji + ' <b>' + ORGANS[k].name + '</b>', 'click to examine under the microscope'); else hideTip();
  } else if (scopeOn || ptr.down) hideTip();
  renderer.render(scene, camera);
  updateLens(dt, clock);
  drawScope(dt, clock);
  // HUD
  const hr = Math.round(anim.state.hrNow), rr = Math.round(anim.state.rrNow);
  const hh = $('#hudHR'); if (hh.textContent != hr) hh.textContent = hr;
  const hrr = $('#hudRR'); if (hrr.textContent != rr) hrr.textContent = rr;
  $('.heart', $('#hud')).style.animationDuration = (60 / Math.max(30, hr)) + 's';
}

/* ---------------- init ---------------- */
function init() {
  buildSliders(); buildMetricList(); buildChart();
  const ps = $('#presetSel'); PRESETS.forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = p.icon + ' ' + p.name; ps.appendChild(o); });
  const co = document.createElement('option'); co.value = 'custom'; co.textContent = '✏️ Custom (your choices)'; ps.appendChild(co);
  ps.onchange = () => { if (ps.value !== 'custom') applyPreset(ps.value); };
  const po = $('#poseSel'); Object.entries(POSES).forEach(([k, v]) => { const o = document.createElement('option'); o.value = k; o.textContent = v.icon + ' ' + v.label; po.appendChild(o); });
  po.onchange = () => setPose(po.value);
  initGL();
  if (hasGL) {
    $$('#viewGroup .chip').forEach(c => c.onclick = () => setView(c.dataset.view));
    $$('#floatbar [data-focus]').forEach(c => c.onclick = () => setFocus(c.dataset.focus));
    $('#spinBtn').onclick = e => { cam.spin = !cam.spin; e.currentTarget.classList.toggle('on', cam.spin); };
    $('#rstBtn').onclick = () => { cam.taz = 0; cam.tpol = 1.4; cam.tdist = 3.9; cam.tty = 0.92; };
    bindPointer();
  }
  $('#scopeBtn').onclick = () => setScope(!scopeOn);
  $('#timeBtn').onclick = startTimelapse; $('#timeStop').onclick = () => stopTimelapse(false); $('#timeBack').onclick = () => stopTimelapse(true);
  $('#unitBtn').onclick = () => setUnits(state.units === 'us' ? 'metric' : 'us');
  $('#helpBtn').onclick = () => openModal('helpModal');
  $('#missBtn').onclick = () => { renderMissions(); openModal('missModal'); };
  $('#keyBtn').onclick = () => { renderKey(); openModal('keyModal'); };
  $('#keyReveal').onclick = () => $$('#keyTable .veil').forEach(e => e.classList.remove('veil'));
  $('#keyHide').onclick = () => renderKey();
  $('#nbBtn').onclick = () => { renderNotebook(); openModal('nbModal'); };
  $('#nbAdd').onclick = () => { takeSnapshot($('#nbName').value.trim()); $('#nbName').value = ''; };
  $('#nbCsv').onclick = () => snapshots.length && nbCsv(); $('#nbPrint').onclick = () => snapshots.length && nbPrint();
  $('#nbClear').onclick = () => { snapshots.length = 0; compareIdx = -1; renderNotebook(); renderNotes(); renderMetrics(); };
  $('#lv0').onclick = () => setScopeLevel(0); $('#lv1').onclick = () => setScopeLevel(1);
  $('#mbL').onclick = () => { document.body.classList.toggle('showL'); document.body.classList.remove('showR'); };
  $('#mbR').onclick = () => { document.body.classList.toggle('showR'); document.body.classList.remove('showL'); };
  stage().addEventListener('pointerdown', () => document.body.classList.remove('showL', 'showR'));
  window.addEventListener('keydown', e => {
    if (e.target.matches('input[type=text],input:not([type]),select,textarea')) return;
    if (e.key === 'Escape') closeModals();
    else if (e.key === 'm' || e.key === 'M') setScope(!scopeOn);
    else if (e.key === '1') { lensLevel = 0; setScopeLevel(0); } else if (e.key === '2') { lensLevel = 1; setScopeLevel(1); }
  });
  onChange();
  setPose('stand');
  if (new URLSearchParams(location.search).has('help') || !sessionStorageSafe('bl_seen')) { openModal('helpModal'); sessionStorageSafe('bl_seen', '1'); }
  requestAnimationFrame(frame);
}
function sessionStorageSafe(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }
let _inited = false; const _init = () => { if (!_inited) { _inited = true; init(); } };
document.addEventListener("DOMContentLoaded", _init);
if (document.readyState !== "loading") _init();
