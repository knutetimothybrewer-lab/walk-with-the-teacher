// Mission 4 simulation: build an escape plan on a floor plan, run two fires (a night fire at home and a small kitchen fire), and treat
// cuts and burns at a first-aid bench. All people and places are fictional. The fire runs use the plan the student built.
import { h, svg } from '../util.js';
import * as M from './home-model.js';

const NS = 'http://www.w3.org/2000/svg';
const f0 = (x) => String(Math.round(x));

/* ====================================================================================== the house drawing */
function houseSvg(opts) {
  const root = svg('svg', { class: 'house', viewBox: '0 0 ' + M.W + ' ' + M.H, role: 'img', 'aria-label': opts.label || 'Floor plan of a one-story house with two bedrooms, a bathroom, a study, a hall, a kitchen and a living room.' });
  const defs = svg('defs',
    svg('linearGradient', { id: 'yard' + opts.uid, x1: 0, y1: 0, x2: 0, y2: 1 }, svg('stop', { offset: 0, 'stop-color': '#cfe8c4' }), svg('stop', { offset: 1, 'stop-color': '#b6d9a8' })),
    svg('pattern', { id: 'wood' + opts.uid, width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, svg('rect', { width: 24, height: 24, fill: '#e9dcc6' }), svg('path', { d: 'M0 12h24', stroke: '#d8c8aa', 'stroke-width': 1 })),
    svg('pattern', { id: 'tile' + opts.uid, width: 20, height: 20, patternUnits: 'userSpaceOnUse' }, svg('rect', { width: 20, height: 20, fill: '#dbe9f1' }), svg('path', { d: 'M0 0h20v20', fill: 'none', stroke: '#c3d8e4', 'stroke-width': 1 })),
    svg('pattern', { id: 'rug' + opts.uid, width: 16, height: 16, patternUnits: 'userSpaceOnUse' }, svg('rect', { width: 16, height: 16, fill: '#e7e0d3' }), svg('circle', { cx: 8, cy: 8, r: 1, fill: '#d2c8b6' })));
  root.append(defs, svg('rect', { width: M.W, height: M.H, fill: 'url(#yard' + opts.uid + ')' }),
    svg('rect', { x: 250, y: 400, width: 100, height: 120, fill: '#9aa3a9' }),                                    // driveway
    svg('rect', { x: 0, y: 440, width: M.W, height: 8, fill: '#8a949b' }), svg('rect', { x: 0, y: 500, width: M.W, height: 20, fill: '#6f7a82' }));  // sidewalk and street
  // floors
  const floorFill = { br1: 'wood', br2: 'wood', bath: 'tile', study: 'wood', hall: 'rug', kitchen: 'tile', living: 'rug' };
  M.ROOMS.forEach((r) => { root.appendChild(svg('rect', { x: r.x, y: r.y, width: r.w, height: r.h, fill: 'url(#' + floorFill[r.id] + opts.uid + ')', stroke: '#6b7580', 'stroke-width': 3, 'data-room': r.id })); });
  // furniture hints (flat, simple)
  const f = (x, y, w, hh, fill) => root.appendChild(svg('rect', { x, y, width: w, height: hh, rx: 6, fill, stroke: 'rgba(0,0,0,0.18)', 'stroke-width': 1.5 }));
  f(80, 75, 90, 60, '#9fb8d6'); f(280, 75, 90, 60, '#d6b8a0');                                          // beds
  f(480, 90, 40, 22, '#cfd8dc'); f(600, 80, 70, 30, '#a98f6e');                                       // bath sink, study desk
  f(80, 300, 110, 22, '#b7c0c7'); f(210, 300, 30, 30, '#4b535a');                                     // kitchen counter and stove
  f(340, 310, 140, 50, '#a7b7c9'); f(560, 330, 90, 40, '#c7b299');                                    // sofa and table
  // labels
  M.ROOMS.forEach((r) => root.appendChild(svg('text', { x: r.x + r.w / 2, y: r.y + r.h - 10, 'text-anchor': 'middle', 'font-size': 19, 'font-weight': 700, fill: '#33444f', 'pointer-events': 'none' }, r.name)));
  root.appendChild(svg('text', { x: 20, y: 470, 'font-size': 17, 'font-weight': 700, fill: '#4a5a45' }, 'Yard'));
  root.appendChild(svg('text', { x: 20, y: 515, 'font-size': 15, 'font-weight': 700, fill: '#e8edf0' }, 'Street'));
  return root;
}
const layer = (parent, cls) => { const g = svg('g', { class: cls }); parent.appendChild(g); return g; };

/* ====================================================================================== stick figure for the side view */
// Joints in metres for each pose, facing right: head, neck, hip, knee, foot, elbow, hand (x, y with y up).
const POSES = {
  stand: [[0, 1.62], [0, 1.42], [0, 0.92], [0.05, 0.48], [0.1, 0.05], [0.05, 1.12], [0.22, 1.0]],
  crouch: [[0.3, 1.02], [0.18, 0.88], [-0.15, 0.62], [0.2, 0.4], [0.1, 0.05], [0.38, 0.7], [0.5, 0.45]],
  crawl: [[0.62, 0.52], [0.42, 0.45], [-0.2, 0.42], [-0.1, 0.18], [-0.45, 0.05], [0.55, 0.22], [0.6, 0.04]],
  sleep: [[-0.75, 0.72], [-0.52, 0.64], [0.2, 0.55], [0.7, 0.62], [1.1, 0.58], [-0.1, 0.62], [0.2, 0.72]],
  roll: [[-0.55, 0.22], [-0.32, 0.2], [0.25, 0.18], [0.6, 0.3], [0.95, 0.14], [-0.1, 0.12], [0.1, 0.08]],
  window: [[0.38, 1.38], [0.2, 1.2], [-0.1, 0.82], [0.15, 0.42], [0.1, 0.05], [0.5, 1.12], [0.7, 1.0]],
  out: [[0, 1.62], [0, 1.42], [0, 0.92], [-0.05, 0.48], [-0.1, 0.05], [-0.1, 1.15], [-0.25, 0.98]]
};
function lerpPose(a, b, k) { return a.map((p, i) => [p[0] + (b[i][0] - p[0]) * k, p[1] + (b[i][1] - p[1]) * k]); }

/* ====================================================================================== the sim */
export function mountSim(host, api) {
  const done = { plan: false, fire: false, bench: false };
  const safe = { night: false, kitchen: false };
  const plan = M.newPlan();
  const S = { tab: 'plan', raf: 0, destroyed: false };
  const tabs = [['plan', 'Escape plan'], ['fire', 'Fire runs'], ['bench', 'First-aid bench']];
  const tablist = h('div.sim-tabs', { role: 'tablist', 'aria-label': 'Home safety practice' });
  const panels = {};
  tabs.forEach(([id, label]) => {
    const b = h('button.sim-tab', { type: 'button', role: 'tab', id: 'htab-' + id, 'aria-controls': 'hpanel-' + id, 'aria-selected': String(id === 'plan'), tabindex: id === 'plan' ? '0' : '-1', onclick: () => select(id) }, label);
    b.addEventListener('keydown', (e) => { const k = tabs.map((x) => x[0]), i = k.indexOf(id); if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = k[(i + (e.key === 'ArrowRight' ? 1 : k.length - 1)) % k.length]; select(n); document.getElementById('htab-' + n).focus(); } });
    tablist.appendChild(b);
  });
  function select(id) {
    S.tab = id; tabs.forEach(([t]) => { const b = document.getElementById('htab-' + t); b.setAttribute('aria-selected', String(t === id)); b.tabIndex = t === id ? 0 : -1; panels[t].hidden = t !== id; });
    if (id === 'fire') { fireRefresh(); startLoop(); }
  }

  /* ================= PLAN TAB ================= */
  const planSvg = houseSvg({ uid: 'p', interactive: true });
  const gRoute = layer(planSvg, 'routes'), gAlarm = layer(planSvg, 'alarms'), gExit = layer(planSvg, 'exits'), gPins = layer(planSvg, 'pins');
  const planList = h('ul.plan-checks', { 'aria-label': 'Plan check' });
  const alarmBoxes = {}, routeBoxes = {}, spotRadios = {};
  const spotNote = h('p.sim-note.small', { role: 'status', 'aria-live': 'polite' }, 'Pick a meeting spot to see what it means.');
  const summaryLine = h('p.sim-note', { role: 'status', 'aria-live': 'polite', id: 'plan-summary' }, '');

  const toggleAlarmAt = (x, y) => {
    const r = M.roomAt(x, y); if (!r) return;
    const near = plan.alarms.findIndex((a) => Math.hypot(a.x - x, a.y - y) < 22);
    if (near >= 0) plan.alarms.splice(near, 1); else plan.alarms.push({ x, y });
    planRender();
  };
  planSvg.addEventListener('click', (e) => {
    if (e.target.closest && (e.target.closest('.exit') || e.target.closest('.pin'))) return;
    const pt = planSvg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(planSvg.getScreenCTM().inverse());
    toggleAlarmAt(p.x, p.y);
  });
  const toggleRoute = (id) => {
    const ex = M.exitById[id]; const arr = plan.routes[ex.room] || (plan.routes[ex.room] = []);
    const i = arr.indexOf(id); if (i >= 0) arr.splice(i, 1); else arr.push(id);
    planRender();
  };
  const pickSpot = (id) => { plan.meet = id; planRender(); };
  const keyAct = (el, fn) => el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } });

  M.EXITS.forEach((ex) => {
    const horiz = ex.o === 'h';
    const g = svg('g', { class: 'exit', role: 'button', tabindex: '0', 'aria-pressed': 'false', 'aria-label': ex.label + '. Press to mark or unmark as a way out.', 'data-exit': ex.id });
    const w = ex.kind === 'window' ? 56 : 44, t = 12;
    g.appendChild(svg('rect', { x: ex.x - (horiz ? w / 2 : t / 2), y: ex.y - (horiz ? t / 2 : w / 2), width: horiz ? w : t, height: horiz ? t : w, rx: 3, fill: ex.kind === 'window' ? '#9fd3f0' : '#8a5a2b', stroke: ex.kind === 'window' ? '#2b78a8' : '#4a2f12', 'stroke-width': 2 }));
    if (ex.kind === 'door') g.appendChild(svg('path', { d: horiz ? 'M' + (ex.x - 22) + ' ' + ex.y + ' a 36 36 0 0 1 36 -30' : 'M' + ex.x + ' ' + (ex.y - 22) + ' a 36 36 0 0 0 30 36', fill: 'none', stroke: '#8a5a2b', 'stroke-width': 1.5, 'stroke-dasharray': '3 3', opacity: 0.8 }));
    g.addEventListener('click', (e) => { e.stopPropagation(); toggleRoute(ex.id); }); keyAct(g, () => toggleRoute(ex.id));
    gExit.appendChild(g);
  });
  M.SPOTS.forEach((sp) => {
    const g = svg('g', { class: 'pin', role: 'button', tabindex: '0', 'aria-pressed': 'false', 'aria-label': 'Meeting spot: ' + sp.label, 'data-spot': sp.id });
    g.append(svg('circle', { cx: sp.x, cy: sp.y, r: 15, fill: '#fff', stroke: '#0b57d0', 'stroke-width': 3 }), svg('text', { x: sp.x, y: sp.y + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, fill: '#0b57d0' }, '★'));
    g.appendChild(svg('text', { x: sp.x, y: sp.y + 32, 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: '#2c3b2a', 'paint-order': 'stroke', stroke: '#e9f4e3', 'stroke-width': 4 }, ({ steps: 'Front steps', mailbox: 'Mailbox', tree: 'Tree across street', car: 'Car' })[sp.id]));
    g.addEventListener('click', (e) => { e.stopPropagation(); pickSpot(sp.id); }); keyAct(g, () => pickSpot(sp.id));
    gPins.appendChild(g);
  });

  // accessible control panel (the same actions as clicking the map)
  const alarmFieldset = h('fieldset.ctl-group', h('legend', 'Smoke alarms'), h('p.help', 'Tick a room to put an alarm on its ceiling. You can also click inside a room on the map to place or remove one.'),
    M.ROOMS.map((r) => { const cb = h('input', { type: 'checkbox', id: 'alarm-' + r.id, 'data-room': r.id }); cb.addEventListener('change', () => { if (cb.checked) { if (!plan.alarms.some((a) => (M.roomAt(a.x, a.y) || {}).id === r.id)) plan.alarms.push({ x: r.x + r.w / 2, y: r.y + r.h / 2 - 14 }); } else plan.alarms = plan.alarms.filter((a) => (M.roomAt(a.x, a.y) || {}).id !== r.id); planRender(); }); alarmBoxes[r.id] = cb; return h('label.chk', cb, h('span', r.name)); }));
  const routeFieldset = h('fieldset.ctl-group', h('legend', 'Ways out of each bedroom'), h('p.help', 'Tick each door or window you would use. You can also click the doors and windows on the map.'),
    ['br1', 'br2'].map((rid) => h('div.route-room', h('b', M.roomById[rid].name), M.exitsOf(rid).map((ex) => { const cb = h('input', { type: 'checkbox', id: 'route-' + ex.id, 'data-exit': ex.id }); cb.addEventListener('change', () => { const arr = plan.routes[rid]; const i = arr.indexOf(ex.id); if (cb.checked && i < 0) arr.push(ex.id); if (!cb.checked && i >= 0) arr.splice(i, 1); planRender(); }); routeBoxes[ex.id] = cb; return h('label.chk', cb, h('span', ex.label)); }))));
  const spotFieldset = h('fieldset.ctl-group', h('legend', 'Outside meeting spot'),
    M.SPOTS.map((sp) => { const r = h('input', { type: 'radio', name: 'spot', id: 'spot-' + sp.id, value: sp.id }); r.addEventListener('change', () => pickSpot(sp.id)); spotRadios[sp.id] = r; return h('label.chk', r, h('span', sp.label)); }), spotNote);
  const clearBtn = h('button.btn.secondary.small', { type: 'button', onclick: () => { plan.alarms = []; plan.routes = { br1: [], br2: [] }; plan.meet = null; planRender(); } }, 'Clear the plan');

  function planRender() {
    gAlarm.replaceChildren(...plan.alarms.map((a) => { const g = svg('g', { class: 'alarm' }); g.append(svg('circle', { cx: a.x, cy: a.y, r: 13, fill: '#fff', stroke: '#b3261e', 'stroke-width': 3 }), svg('circle', { cx: a.x, cy: a.y, r: 5, fill: '#b3261e' }), svg('text', { x: a.x, y: a.y - 18, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, fill: '#b3261e' }, 'ALARM')); return g; }));
    gRoute.replaceChildren();
    Object.values(plan.routes).flat().forEach((id) => { const ex = M.exitById[id]; const g = svg('g'); const dx = ex.o === 'h' ? 0 : (ex.x <= 60 ? -22 : 22), dy = ex.o === 'h' ? (ex.y <= 60 ? -22 : (ex.room === 'living' ? 22 : -22)) : 0; g.append(svg('circle', { cx: ex.x + dx, cy: ex.y + dy, r: 12, fill: '#0a7458' }), svg('path', { d: 'M' + (ex.x + dx - 5) + ' ' + (ex.y + dy) + 'h10m-4 -4l4 4l-4 4', stroke: '#fff', 'stroke-width': 2.4, fill: 'none', 'stroke-linecap': 'round' })); gRoute.appendChild(g); });
    gExit.querySelectorAll('.exit').forEach((g) => { const on = (plan.routes[M.exitById[g.dataset.exit].room] || []).includes(g.dataset.exit); g.setAttribute('aria-pressed', String(on)); });
    gPins.querySelectorAll('.pin').forEach((g) => { const on = plan.meet === g.dataset.spot; g.setAttribute('aria-pressed', String(on)); g.firstChild.setAttribute('fill', on ? '#0b57d0' : '#fff'); g.firstChild.nextSibling.setAttribute('fill', on ? '#fff' : '#0b57d0'); });
    M.ROOMS.forEach((r) => { alarmBoxes[r.id].checked = plan.alarms.some((a) => (M.roomAt(a.x, a.y) || {}).id === r.id); });
    M.EXITS.filter((e) => routeBoxes[e.id]).forEach((e) => { routeBoxes[e.id].checked = (plan.routes[e.room] || []).includes(e.id); });
    Object.entries(spotRadios).forEach(([id, r]) => { r.checked = plan.meet === id; });
    if (plan.meet) spotNote.textContent = M.spotById[plan.meet].why;
    const res = M.checkPlan(plan);
    planList.replaceChildren(...res.items.map((i) => h('li', { 'data-ok': String(i.ok) }, h('span.ck', { 'aria-hidden': 'true' }, i.ok ? '✓' : '○'), h('span', h('b', i.label), h('span.d', ' ' + i.detail)))));
    summaryLine.textContent = res.ok ? 'Plan complete. Your family has an escape plan: alarms where they should be, two ways out of the bedrooms and a place to meet.' : res.items.filter((i) => i.ok).length + ' of ' + res.items.length + ' parts of the plan are done.';
    summaryLine.dataset.ok = res.ok ? 'true' : 'false';
    if (res.ok && !done.plan) { done.plan = true; api.report('plan'); }
    cvPlanNote();
  }
  function cvPlanNote() { planSvg.setAttribute('aria-label', 'Floor plan with ' + plan.alarms.length + ' smoke alarms, ' + Object.values(plan.routes).flat().length + ' marked ways out, and ' + (plan.meet ? 'a meeting spot chosen' : 'no meeting spot yet') + '.'); }

  panels.plan = h('div.sim-panel', { role: 'tabpanel', id: 'hpanel-plan', 'aria-labelledby': 'htab-plan' },
    h('p.sim-intro', 'Plan how your family would get out of this house in a fire. Place smoke alarms, mark ways out of both bedrooms, and choose one place to meet outside. The list shows how your plan is doing.'),
    h('div.plan-grid', h('div.plan-map', h('div.sim-stage.pale', planSvg)), h('div.plan-side', h('h4', 'Plan check'), planList, summaryLine, alarmFieldset, routeFieldset, spotFieldset, clearBtn)));

  /* ================= FIRE TAB ================= */
  const fireSvg = houseSvg({ uid: 'f', label: 'Floor plan during a fire, with smoke spreading from the kitchen.' });
  const fSmoke = layer(fireSvg, 'smoke'), fAlarm = layer(fireSvg, 'f-alarms'), fFire = layer(fireSvg, 'flames'), fRoutes = layer(fireSvg, 'f-routes'), fPerson = layer(fireSvg, 'person');
  const sideCanvas = (() => { const c = h('canvas', { role: 'img', 'aria-label': 'Side view of a room showing the smoke layer and the person', width: 960, height: 520 }); return { c, ctx: c.getContext('2d') }; })();
  let run = null, poseFrom = POSES.sleep, poseTo = POSES.sleep, poseT = 1, curPoseName = 'sleep', clockT = 0;
  const narr = h('div.narr', { role: 'status', 'aria-live': 'polite' });
  const choicesBox = h('div.choices', { role: 'group', 'aria-label': 'What do you do?' });
  const notesBox = h('ol.run-notes');
  const resultBox = h('div.run-result', { hidden: true });
  const mTime = h('span.mv-num', '0 s'), mExp = h('span.mv-num', '0');
  const expTrack = h('div.mv-track', { role: 'meter', 'aria-label': 'Smoke exposure', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': '0' }, h('i')), timeTrack = h('div.mv-track', { role: 'meter', 'aria-label': 'Time used', 'aria-valuemin': '0', 'aria-valuemax': String(M.LIMIT_SECONDS), 'aria-valuenow': '0' }, h('i'));
  const meters = h('div.fire-meters', h('div', h('div.mv-top', h('span.mv-lab', 'Time used'), mTime), timeTrack), h('div', h('div.mv-top', h('span.mv-lab', 'Smoke exposure'), mExp), expTrack));
  const scnBar = h('div.mode-bar', { role: 'radiogroup', 'aria-label': 'Choose a fire run' }, Object.values(M.SCENARIOS).map((s) => h('button.mode-btn', { type: 'button', role: 'radio', id: 'scn-' + s.id, 'aria-checked': String(s.id === 'night'), onclick: () => begin(s.id) }, s.title)));
  function begin(id) {
    run = M.startRun(id); curPoseName = M.SCENARIOS[id].startPose; poseFrom = POSES[curPoseName]; poseTo = POSES[curPoseName]; poseT = 1;
    scnBar.querySelectorAll('.mode-btn').forEach((b) => b.setAttribute('aria-checked', String(b.id === 'scn-' + id)));
    resultBox.hidden = true; notesBox.replaceChildren(); fireRefresh(); startLoop();
  }
  function choose(cid) {
    const before = run;
    run = M.applyChoice(run, cid, plan);
    if (run === before) return;
    const last = run.notes[run.notes.length - 1];
    notesBox.appendChild(h('li', h('b', last.label + ': '), last.note));
    if (run.pose !== curPoseName) { poseFrom = currentPose(); poseTo = POSES[run.pose]; poseT = 0; curPoseName = run.pose; }
    if (run.outcome === 'safe' && !safe[run.id]) { safe[run.id] = true; if (safe.night && safe.kitchen && !done.fire) { done.fire = true; api.report('fire'); } }
    fireRefresh(); startLoop();
  }
  function currentPose() { return lerpPose(poseFrom, poseTo, Math.min(1, poseT)); }
  function fireRefresh() {
    if (!run) { begin('night'); return; }
    const scn = M.SCENARIOS[run.id], step = scn.steps[run.step];
    // text and choices
    const intro = run.step === scn.start && !run.notes.length ? h('p.intro', scn.intro) : null;
    narr.replaceChildren(...[intro, run.outcome ? null : h('p', h('b', step.text))].filter(Boolean));
    choicesBox.replaceChildren();
    if (!run.outcome) {
      step.choices.slice().sort((a, b) => a.label.localeCompare(b.label)).forEach((c) => {
        const av = M.choiceAvailable(c, plan);
        const b = h('button.choice', { type: 'button', id: 'choice-' + run.id + '-' + run.step + '-' + c.id, 'data-choice': c.id, disabled: !av.ok, onclick: () => choose(c.id) }, c.label, av.ok ? null : h('span.why', av.why));
        choicesBox.appendChild(b);
      });
    }
    // meters
    mTime.textContent = f0(run.t) + ' s'; mExp.textContent = f0(run.exposure);
    timeTrack.firstChild.style.width = Math.min(100, run.t / M.LIMIT_SECONDS * 100) + '%'; expTrack.firstChild.style.width = run.exposure + '%';
    timeTrack.setAttribute('aria-valuenow', f0(run.t)); expTrack.setAttribute('aria-valuenow', f0(run.exposure));
    // result
    if (run.outcome) {
      resultBox.hidden = false; resultBox.dataset.outcome = run.outcome;
      resultBox.replaceChildren(h('h4', run.outcome === 'safe' ? 'You got out safely' : 'This run did not end safely'),
        h('p', run.outcome === 'safe' ? 'Finished in ' + f0(run.t) + ' seconds with a smoke exposure of ' + f0(run.exposure) + ' out of 100.' : 'Read the notes below, then try the run again and change one choice.'),
        h('button.btn', { type: 'button', id: 'run-again', onclick: () => begin(run.id) }, 'Run it again'));
    }
    drawMap();
  }
  function personSpot() {
    const id = run.id, safeOut = run.outcome === 'safe';
    if (id === 'night') {
      if (run.step === 's3' || safeOut) { if (safeOut && plan.meet) { const sp = M.spotById[plan.meet]; return [sp.x, sp.y - 24]; } return [360, 28]; }
      if (run.step === 's2') return [360, 70];
      return [360, 130];
    }
    if (safeOut) return [30, 420];
    return [130, 350];
  }
  function drawMap() {
    const scn = M.SCENARIOS[run.id], t = run.t;
    // smoke overlay: spreads from the room where the fire started
    const delay = { kitchen: 0, hall: 8, living: 10, bath: 18, br1: 18, br2: 18, study: 22 };
    fSmoke.replaceChildren(...M.ROOMS.map((r) => {
      let a = 0;
      if (run.id === 'night') a = Math.max(0, Math.min(0.72, (t + (run.boost * 20) - delay[r.id]) / 45)) * (run.closed && r.id === 'br2' ? 0.3 : 1);
      else a = r.id === 'kitchen' ? (run.outcome === 'safe' || run.step === 'k2' || run.step === 'k3' ? 0.08 : Math.min(0.35, t / 25)) : 0;
      return svg('rect', { x: r.x, y: r.y, width: r.w, height: r.h, fill: '#3a3f44', opacity: a.toFixed(2) });
    }));
    fAlarm.replaceChildren(...plan.alarms.map((a) => svg('circle', { cx: a.x, cy: a.y, r: 8, fill: '#fff', stroke: '#b3261e', 'stroke-width': 3 })));
    fRoutes.replaceChildren(...Object.values(plan.routes).flat().map((id) => { const ex = M.exitById[id]; return svg('circle', { cx: ex.x, cy: ex.y, r: 8, fill: '#0a7458', stroke: '#fff', 'stroke-width': 2 }); }));
    // flames
    const flames = []; const origin = M.roomById[scn.origin];
    const nflame = run.id === 'kitchen' ? (run.step === 'k0' || run.step === 'k1' ? 3 : 0) : 3 + (t > 10 ? 3 : 0);
    for (let i = 0; i < nflame; i++) { const fx = (run.id === 'kitchen' ? 222 : origin.x + 60 + i * 34) + (i > 2 ? 150 : 0), fy = run.id === 'kitchen' ? 312 : (i > 2 ? 258 : origin.y + 70); flames.push(svg('path', { d: 'M' + fx + ' ' + (fy + 22) + 'c-12 -8 -14 -20 -6 -34c2 8 8 10 10 4c4 6 14 12 12 28c-4 6 -12 6 -16 2z', fill: i % 2 ? '#f59e0b' : '#ef4444', stroke: '#b91c1c', 'stroke-width': 1.5 })); }
    fFire.replaceChildren(...flames);
    const [px, py] = personSpot();
    fPerson.replaceChildren(svg('circle', { cx: px, cy: py, r: 16, fill: '#1d4ed8', stroke: '#fff', 'stroke-width': 3 }), svg('text', { x: px, y: py + 5, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, fill: '#fff' }, 'YOU'));
  }
  /* side view */
  function drawSide(now) {
    const ctx = sideCanvas.ctx, W = 960, H = 520, floorY = 470, S = 170;           // 170 px per metre, ceiling at 2.4 m = 408 px above the floor
    ctx.clearRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, floorY); g.addColorStop(0, '#f2f5f8'); g.addColorStop(1, '#e3eaf0'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, floorY);
    ctx.fillStyle = '#8a7660'; ctx.fillRect(0, floorY, W, H - floorY); ctx.fillStyle = '#6f5c47'; ctx.fillRect(0, floorY, W, 6);
    const ceilY = floorY - M.ROOM_HEIGHT * S; ctx.fillStyle = '#d4dbe1'; ctx.fillRect(0, ceilY - 14, W, 14);
    const scnId = run ? run.id : 'night', t = run ? run.t : 0, boost = run ? run.boost : 0;
    // furniture: a bed for the bedroom run, a counter and stove for the kitchen
    if (scnId === 'night') { ctx.fillStyle = '#9fb8d6'; ctx.beginPath(); ctx.roundRect(60, floorY - 100, 360, 60, 10); ctx.fill(); ctx.fillStyle = '#6b86a6'; ctx.fillRect(70, floorY - 40, 14, 40); ctx.fillRect(396, floorY - 40, 14, 40);
      ctx.fillStyle = '#dbe6f2'; ctx.beginPath(); ctx.roundRect(70, floorY - 118, 90, 30, 12); ctx.fill();
      ctx.fillStyle = '#b9873f'; ctx.fillRect(720, ceilY + 60, 150, 190); ctx.fillStyle = '#9fd3f0'; ctx.fillRect(732, ceilY + 72, 126, 166); ctx.strokeStyle = '#2b78a8'; ctx.lineWidth = 4; ctx.strokeRect(732, ceilY + 72, 126, 166); ctx.beginPath(); ctx.moveTo(795, ceilY + 72); ctx.lineTo(795, ceilY + 238); ctx.stroke();
      ctx.fillStyle = '#5b3f1f'; ctx.fillRect(900, floorY - 330, 36, 330); }
    else { ctx.fillStyle = '#b7c0c7'; ctx.fillRect(520, floorY - 150, 400, 150); ctx.fillStyle = '#4b535a'; ctx.fillRect(560, floorY - 160, 130, 12); ctx.fillStyle = '#7e8a93'; ctx.beginPath(); ctx.roundRect(575, floorY - 190, 90, 30, 8); ctx.fill();
      ctx.fillStyle = '#5b3f1f'; ctx.fillRect(900, floorY - 330, 36, 330); ctx.fillStyle = '#c63a34'; ctx.beginPath(); ctx.roundRect(790, floorY - 280, 36, 100, 8); ctx.fill(); }
    // person
    const k = api.reduced() ? 1 : poseT; const pose = lerpPose(poseFrom, poseTo, Math.min(1, k));
    const ox = scnId === 'night' ? 290 : 380;
    const P = pose.map(([x, y]) => [ox + x * S, floorY - y * S]);
    const skin = '#c58a63', cloth = scnId === 'night' ? '#2b6fb0' : '#2f8f83', pant = scnId === 'night' ? '#4b5a8c' : '#39424d';
    const cap = (a, b, w, c) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-6, r = w / 2; ctx.save(); ctx.translate(a[0], a[1]); ctx.rotate(Math.atan2(dy, dx)); ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(L, -r); ctx.arc(L, 0, r, -Math.PI / 2, Math.PI / 2); ctx.lineTo(0, r); ctx.arc(0, 0, r, Math.PI / 2, -Math.PI / 2); ctx.closePath(); ctx.fillStyle = c; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke(); ctx.restore(); };
    const [hd, nk, hp, kn, ft, el, hn] = P;
    cap(hp, kn, 26, pant); cap(kn, ft, 22, pant); ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(ft[0] + 10, ft[1] + 2, 20, 8, 0, 0, Math.PI * 2); ctx.fill();
    cap(hp, nk, 40, cloth); cap(nk, hd, 14, skin); ctx.beginPath(); ctx.arc(hd[0], hd[1], 26, 0, Math.PI * 2); ctx.fillStyle = skin; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.stroke();
    ctx.fillStyle = '#231b16'; ctx.beginPath(); ctx.arc(hd[0] - 3, hd[1] - 4, 27, Math.PI * 0.95, Math.PI * 1.95); ctx.fill();
    cap(nk, el, 16, cloth); cap(el, hn, 13, skin);
    // flames at the origin of the fire (kitchen counter or the doorway)
    if (scnId === 'kitchen' ? (run && (run.step === 'k0' || run.step === 'k1')) : t > 6) { const fx = scnId === 'kitchen' ? 620 : 810; const sc = 1 + Math.sin(now / 130) * 0.08; for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(fx + (i - 1) * 34, scnId === 'kitchen' ? floorY - 198 : floorY - 6); ctx.scale(sc, sc * (1 + i * 0.1)); ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(-26, -20, -18, -60, 0, -86); ctx.bezierCurveTo(18, -56, 26, -22, 0, 0); ctx.fillStyle = i === 1 ? '#fbbf24' : '#f97316'; ctx.fill(); ctx.restore(); } }
    // smoke layer hanging from the ceiling
    const depth = scnId === 'kitchen' ? Math.min(0.9, 0.2 + t * 0.02) : M.smokeLayer(t, boost);
    const sy = ceilY + depth * S;
    const sg = ctx.createLinearGradient(0, ceilY, 0, sy + 20); sg.addColorStop(0, 'rgba(40,44,48,0.88)'); sg.addColorStop(0.8, 'rgba(70,76,82,0.7)'); sg.addColorStop(1, 'rgba(110,116,122,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, ceilY, W, sy - ceilY + 20);
    ctx.fillStyle = 'rgba(255,255,255,0.0)';
    ctx.fillStyle = '#12202b'; ctx.font = '700 36px system-ui, sans-serif'; ctx.fillText('Side view of the room', 18, 48);
    ctx.font = '600 30px system-ui, sans-serif'; ctx.fillText('Smoke layer: ' + depth.toFixed(1) + ' m down from the ceiling', 18, 90);
    ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(179,38,30,0.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(W, sy); ctx.stroke(); ctx.setLineDash([]);
    const headH = (floorY - hd[1]) / S;
    ctx.fillStyle = headH > M.ROOM_HEIGHT - depth ? '#b3261e' : '#0a5c33'; ctx.font = '700 32px system-ui, sans-serif'; ctx.fillText(headH > M.ROOM_HEIGHT - depth ? 'Your head is in the smoke' : 'Your head is in clearer air', Math.max(10, Math.min(560, hd[0] - 150)), Math.max(150, hd[1] - 56));
    sideCanvas.c.setAttribute('aria-label', 'Side view of the room. The smoke layer reaches ' + depth.toFixed(1) + ' metres down from the ceiling. ' + (headH > M.ROOM_HEIGHT - depth ? 'The person’s head is in the smoke.' : 'The person’s head is below the smoke.'));
  }
  panels.fire = h('div.sim-panel', { role: 'tabpanel', id: 'hpanel-fire', 'aria-labelledby': 'htab-fire', hidden: true },
    h('p.sim-intro', 'Two fire runs. Your choices cost seconds and smoke exposure. The first run uses the escape plan you built on the other tab.'),
    scnBar,
    h('div.fire-grid', h('div.fire-left', h('div.sim-stage.pale', fireSvg)), h('div.fire-right', h('div.sim-stage.pale', sideCanvas.c))),
    meters, narr, choicesBox, resultBox, h('h4', 'What you chose'), notesBox);

  /* ================= BENCH TAB ================= */
  const benchDone = new Set();
  let cur = 'scrape', stepsDone = [];
  const benchMsg = h('p.sim-note', { role: 'status', 'aria-live': 'polite', id: 'bench-msg' }, 'Choose a case and treat it.');
  const benchBody = h('div.bench-body');
  const caseBar = h('div.mode-bar', { role: 'radiogroup', 'aria-label': 'Choose a case' }, Object.values(M.BENCH).map((c) => h('button.mode-btn', { type: 'button', role: 'radio', id: 'case-' + c.id, 'aria-checked': String(c.id === cur), onclick: () => { cur = c.id; stepsDone = []; benchMsg.textContent = 'Choose a case and treat it.'; benchRender(); } }, c.title)));
  function limbSvg(c) {
    const s = svg('svg', { class: 'limb', viewBox: '0 0 300 120', role: 'img', 'aria-label': c.title + ' illustration' });
    s.append(svg('rect', { x: 10, y: 28, width: 280, height: 64, rx: 30, fill: '#d9a47c', stroke: '#9d6e4a', 'stroke-width': 2 }));
    const cleaned = stepsDone.includes('rinse') || stepsDone.includes('cool'), covered = stepsDone.includes('cover');
    if (c.id === 'scrape') { s.appendChild(svg('ellipse', { cx: 150, cy: 60, rx: 38, ry: 18, fill: cleaned ? '#e8a5a0' : '#b3261e', opacity: 0.9 })); if (!cleaned) [[130, 56], [160, 66], [170, 54]].forEach(([x, y]) => s.appendChild(svg('circle', { cx: x, cy: y, r: 2.5, fill: '#5b4630' }))); }
    else if (c.id === 'burn') { s.appendChild(svg('ellipse', { cx: 150, cy: 60, rx: 34, ry: 20, fill: cleaned ? '#f0a8a0' : '#d6453d', opacity: 0.95 })); if (!stepsDone.includes('pop')) s.appendChild(svg('ellipse', { cx: 160, cy: 56, rx: 9, ry: 6, fill: '#f6d7c8', stroke: '#c58a73' })); }
    else if (c.id === 'infected') { s.appendChild(svg('ellipse', { cx: 150, cy: 60, rx: 50, ry: 26, fill: '#e07a6a', opacity: 0.75 })); s.appendChild(svg('rect', { x: 128, y: 56, width: 44, height: 8, rx: 4, fill: '#9b1c2c' })); s.appendChild(svg('circle', { cx: 176, cy: 70, r: 4, fill: '#e8d77a' })); }
    else { s.appendChild(svg('ellipse', { cx: 150, cy: 60, rx: 12, ry: 12, fill: '#6b3a2a' })); s.appendChild(svg('path', { d: 'M240 20l-20 22h14l-10 22', fill: 'none', stroke: '#f59e0b', 'stroke-width': 4, 'stroke-linecap': 'round' })); }
    if (covered) s.appendChild(svg('rect', { x: 108, y: 38, width: 84, height: 44, rx: 8, fill: '#fdfdfb', stroke: '#b7b7b0', 'stroke-width': 2 }));
    if (stepsDone.includes('cool')) [[120, 20], [150, 14], [180, 22]].forEach(([x, y]) => s.appendChild(svg('path', { d: 'M' + x + ' ' + y + 'q-6 10 0 14q6 -4 0 -14z', fill: '#38bdf8' })));
    return s;
  }
  function benchRender() {
    const c = M.BENCH[cur];
    caseBar.querySelectorAll('.mode-btn').forEach((b) => { const id = b.id.replace('case-', ''); b.setAttribute('aria-checked', String(id === cur)); b.dataset.done = benchDone.has(id) ? 'true' : 'false'; b.textContent = M.BENCH[id].title + (benchDone.has(id) ? ' ✓' : ''); });
    const kids = [h('p', h('b', c.who)), limbSvg(c)];
    if (c.kind === 'steps') {
      const tray = h('div.tray-items', { role: 'group', 'aria-label': 'Supplies and actions (listed alphabetically)' }, c.items.slice().sort((a, b) => a.label.localeCompare(b.label)).map((it) => h('button.act', { type: 'button', id: 'bi-' + c.id + '-' + it.id, 'data-done': String(stepsDone.includes(it.id)), disabled: stepsDone.includes(it.id) || benchDone.has(c.id), onclick: () => benchClick(it.id) }, h('span.ck', { 'aria-hidden': 'true' }, stepsDone.includes(it.id) ? '✓' : '○'), it.label)));
      kids.push(h('p.help', 'Pick what you would do next. Choose carefully: some choices are not safe.'), tray);
      if (stepsDone.length) kids.push(h('ol.run-notes', stepsDone.map((id) => h('li', c.items.find((i) => i.id === id).label))));
    } else {
      kids.push(h('div.row.decide', h('button.btn.secondary', { type: 'button', id: 'dec-self', disabled: benchDone.has(c.id), onclick: () => benchDecideClick('self') }, 'Treat it myself'), h('button.btn.secondary', { type: 'button', id: 'dec-help', disabled: benchDone.has(c.id), onclick: () => benchDecideClick('help') }, 'Get help (911 or urgent care)')));
    }
    benchBody.replaceChildren(...kids);
    const n = benchDone.size; benchProg.textContent = n + ' of 4 cases finished' + (n >= 3 ? '. That is enough to open the questions.' : '. Finish at least three.');
    if (n >= 3 && !done.bench) { done.bench = true; api.report('bench'); }
  }
  function benchClick(id) {
    const c = M.BENCH[cur]; const r = M.benchPick(cur, stepsDone, id);
    benchMsg.textContent = r.text; benchMsg.dataset.ok = r.ok ? 'true' : 'false';
    if (r.advance) { stepsDone.push(id); if (c.items.filter((i) => i.order).every((i) => stepsDone.includes(i.id))) { benchDone.add(cur); benchMsg.textContent = r.text + ' ' + c.done; } }
    benchRender();
  }
  function benchDecideClick(choice) {
    const r = M.benchDecide(cur, choice); benchMsg.textContent = r.text; benchMsg.dataset.ok = r.ok ? 'true' : 'false';
    if (r.ok) benchDone.add(cur); benchRender();
  }
  const benchProg = h('p.sim-note', { role: 'status', 'aria-live': 'polite' }, '');
  panels.bench = h('div.sim-panel', { role: 'tabpanel', id: 'hpanel-bench', 'aria-labelledby': 'htab-bench', hidden: true },
    h('p.sim-intro', 'Treat four injuries. For some you choose the steps; for others you decide whether to treat it yourself or get help. This is practice for minor injuries, not a replacement for a first-aid course.'),
    caseBar, benchBody, benchMsg, benchProg);

  host.replaceChildren(h('div.home-lab', tablist, panels.plan, panels.fire, panels.bench));
  planRender(); benchRender(); begin('night');

  /* ---------- animation ---------- */
  function startLoop() { if (!S.raf) S.raf = requestAnimationFrame(frame); }
  let last = 0;
  function frame(now) {
    S.raf = 0; if (S.destroyed) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    poseT = Math.min(1, poseT + dt * 2.2);
    if (S.tab === 'fire') drawSide(now);
    const moving = poseT < 1 || (S.tab === 'fire' && run && !run.outcome);
    clockT += dt; void clockT;
    if (S.tab === 'fire' && (moving || !S.idle)) { S.idle = !moving; S.raf = requestAnimationFrame(frame); }
  }
  return { destroy() { S.destroyed = true; cancelAnimationFrame(S.raf); } };
}
