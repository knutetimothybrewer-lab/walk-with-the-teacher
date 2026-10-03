/* ============================================================
   MICROSCOPE — animated 2-D scenes drawn in a 100×100 unit space.
   Level 0 = cell / tissue view · Level 1 = molecular view
   Each scene reads the simulated body state (d.vis, d) so damage
   or improvement is visible.
   ============================================================ */
const TAU = Math.PI * 2;
function rr(seed) { let s = seed % 2147483647; if (s <= 0) s += 2147483646; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function disc(g, x, y, r, fill, stroke, lw) { g.beginPath(); g.arc(x, y, Math.max(0.01, r), 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 0.8; g.stroke(); } }
function ellipse(g, x, y, rx, ry, rot, fill, stroke, lw) { g.beginPath(); g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 0.8; g.stroke(); } }
function ln(g, x1, y1, x2, y2, col, w) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokeStyle = col; g.lineWidth = w || 0.8; g.lineCap = 'round'; g.stroke(); }
function lum(c) { if (!c || c[0] !== '#') return 1; let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join(''); const n = parseInt(h.slice(0, 6), 16); return (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255; }
function txt(g, s, x, y, col, size = 3.6, align = 'center') {
  y = Math.max(15, Math.min(83, y)); // keep text inside the circular lens
  g.font = `700 ${size}px system-ui,sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const hw = Math.sqrt(Math.max(100, 2500 - (y - 50) * (y - 50))) - 4; let w = g.measureText(s).width;
  if (w > 2 * hw) { size *= 2 * hw / w; g.font = `700 ${size}px system-ui,sans-serif`; w = 2 * hw; }
  x = Math.max(50 - hw + w / 2, Math.min(50 + hw - w / 2, x));
  if (lum(col) > 0.45) { g.lineWidth = size * 0.35; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineJoin = 'round'; g.strokeText(s, x, y); }
  g.fillStyle = col || '#fff'; g.fillText(s, x, y);
}
function hexa(g, x, y, r, fill, stroke) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6 + 0.5; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = 0.5; g.stroke(); } }
function bg(g, c1, c2) { const gr = g.createLinearGradient(0, 0, 0, 100); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, 100, 100); }
function rbc(g, x, y, r, rot, col = '#d62e3c') { g.save(); g.translate(x, y); g.rotate(rot); ellipse(g, 0, 0, r, r * 0.62, 0, col, 'rgba(120,10,25,.7)', 0.5); ellipse(g, 0, 0, r * 0.45, r * 0.22, 0, 'rgba(110,10,25,.45)'); g.restore(); }
function wavy(g, x1, x2, y, amp, freq, ph, col, w) { g.beginPath(); for (let x = x1; x <= x2; x += 1.5) { const yy = y + Math.sin(x * freq + ph) * amp; x === x1 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.stroke(); }
function mol(g, x, y, r, col, label, lc) { disc(g, x, y, r, col, 'rgba(255,255,255,.55)', 0.4); if (label) txt(g, label, x, y + 0.2, lc || '#fff', r * 1.05); }
function o2(g, x, y, rot = 0) { g.save(); g.translate(x, y); g.rotate(rot); disc(g, -1.4, 0, 1.9, '#ff5a5a', 'rgba(255,255,255,.7)', 0.3); disc(g, 1.4, 0, 1.9, '#ff5a5a', 'rgba(255,255,255,.7)', 0.3); g.restore(); }
function spiky(g, x, y, r, col, n = 9) { g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n, rad = i % 2 ? r * 0.55 : r; g.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad); } g.closePath(); g.fillStyle = col; g.fill(); }
const MICRO = {};
const pick = (r, n) => Math.floor(r() * n);

/* ================= LUNGS ================= */
MICRO.lungs = {
  title: 'Lungs', lv: ['Airway lining & air sacs', 'Gas exchange at the membrane'],
  init(st, lvl) {
    const r = rr(11); st.alv = []; for (let i = 0; i < 22; i++) st.alv.push({ x: 8 + r() * 84, y: 10 + r() * 48, r: 7 + r() * 5 });
    st.cil = []; for (let i = 0; i < 17; i++) st.cil.push({ x: 3 + i * 5.9, ph: r() * 6, miss: r() });
    st.tar = []; for (let i = 0; i < 14; i++) st.tar.push({ x: r() * 100, y: 70 + r() * 8, s: 1.2 + r() * 1.6 });
    st.o2 = []; for (let i = 0; i < 16; i++) st.o2.push({ x: r() * 100, y: r() * 44, vy: 6 + r() * 6, ph: r() * 6 });
    st.co = []; for (let i = 0; i < 12; i++) st.co.push({ x: r() * 100, y: r() * 44, vy: 5 + r() * 5 });
    st.sites = [0, 0, 0, 0]; st.tm = 0;
  },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, dmg = v.lungDmg;
    if (lvl === 0) {
      bg(g, '#2b0f1c', '#4d1a30');
      const n = Math.round(lerp(22, 7, dmg));
      for (let i = 0; i < n; i++) {
        const a = st.alv[i], rad = a.r * (1 + dmg * 1.2) * (1 + 0.05 * Math.sin(t * 1.6 + i));
        disc(g, a.x, a.y, rad, 'rgba(255,205,215,.13)');
        g.save(); if (dmg > 0.45) g.setLineDash([3, 2 + dmg * 5]); disc(g, a.x, a.y, rad, null, dmg > 0.5 ? '#a96a78' : '#f0a1b0', 1.5 * (1 - dmg * 0.55)); g.restore();
        for (let k = 0; k < 5; k++) { const ang = t * 0.5 + k * 1.3 + i; disc(g, a.x + Math.cos(ang) * rad, a.y + Math.sin(ang) * rad, 0.9, '#e03a48'); }
        if (dmg > 0.3 && i % 3 === 0) disc(g, a.x + 2, a.y - 2, 1.4 + dmg * 2.5, '#20181a');
      }
      // airway lining
      const lin = 'rgba(255,170,150,' + (0.12 + v.airway * 0.2) + ')'; g.fillStyle = lin; g.fillRect(0, 66, 100, 34);
      g.fillStyle = mixCss('#f4a0b0', '#d64a58', v.airway * 0.8 + v.lungTox * 0.2); g.fillRect(0, 90, 100, 10);
      if (v.airway > 0.2) { g.fillStyle = 'rgba(255,230,160,' + v.airway * 0.5 + ')'; g.fillRect(0, 82, 100, 8); } // thick mucus
      for (const c of st.cil) {
        if (c.miss < dmg * 0.5) { ln(g, c.x, 90, c.x + 1, 87, '#8a5a63', 1.2); continue; }
        const len = 6 + 12 * (0.25 + 0.75 * v.ciliaFunc), sw = Math.sin(t * 6 - c.x * 0.25 + c.ph) * 7 * (0.1 + 0.9 * v.ciliaFunc);
        g.beginPath(); g.moveTo(c.x, 90); g.quadraticCurveTo(c.x + sw * 0.4, 90 - len * 0.6, c.x + sw, 90 - len); g.strokeStyle = v.ciliaFunc < 0.4 ? '#c88a96' : '#ffd6de'; g.lineWidth = 1.3; g.lineCap = 'round'; g.stroke();
      }
      const nT = Math.floor(clamp(v.lungTox * 0.8 + dmg * 0.6) * 14);
      for (let i = 0; i < nT; i++) { const p = st.tar[i]; p.x += dt * 9 * v.ciliaFunc; if (p.x > 104) p.x = -4; disc(g, p.x, p.y + Math.sin(t + i) * 0.6, p.s, '#17100f'); }
      txt(g, 'cilia', 10, 96.5, '#ffe0e6', 3);
    } else {
      bg(g, '#142a52', '#4a0f1c');
      const th = 5 + dmg * 12;
      g.beginPath(); for (let x = 0; x <= 100; x += 2) { const y = 50 + Math.sin(x * 0.12 + t * 0.6) * 1.5; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.lineTo(100, 50 + th); g.lineTo(0, 50 + th); g.closePath(); g.fillStyle = dmg > 0.4 ? '#8a5560' : '#e8a0ac'; g.fill();
      for (let i = 0; i < Math.floor(dmg * 14); i++) disc(g, (i * 37) % 100, 51 + (i % 3) * 2, 2.2, '#1a1213');
      txt(g, 'air', 8, 6, '#cfe6ff', 3.4); txt(g, 'blood', 9, 94, '#ffd3d8', 3.4);
      const nO = Math.round(lerp(16, 6, dmg));
      for (let i = 0; i < nO; i++) { const p = st.o2[i]; p.y += dt * p.vy; p.x += Math.sin(t + p.ph) * dt * 4; if (p.y > 50 + th - 2) { p.y = -2; p.x = Math.random() * 100; } if (p.y < 50) o2(g, p.x, p.y, t + p.ph); else if (p.y < 58 + th) o2(g, p.x, p.y, t); }
      const nC = Math.min(12, Math.round(d.cohb * 1.2) + (v.lungTox > 0.05 ? 1 : 0));
      for (let i = 0; i < nC; i++) { const p = st.co[i]; p.y += dt * p.vy; p.x += Math.sin(t * 1.3 + i) * dt * 4; if (p.y > 48) { p.y = -2; p.x = Math.random() * 100; } mol(g, p.x, p.y, 2.2, '#6c6c76', 'CO', '#fff'); }
      // red blood cell + hemoglobin sites
      rbc(g, 50, 82, 20, Math.sin(t * 0.4) * 0.1);
      st.tm -= dt; if (st.tm < 0) { st.tm = 0.9; const i = pick(Math.random, 4); st.sites[i] = Math.random() < clamp(d.cohb / 12 + 0.04) ? 2 : Math.random() < 0.8 - dmg * 0.5 ? 1 : 0; }
      for (let i = 0; i < 4; i++) { const x = 38 + i * 8, y = 68 + Math.sin(i) * 1.4; disc(g, x, y, 2.9, st.sites[i] === 2 ? '#6c6c76' : st.sites[i] === 1 ? '#ff5a5a' : '#400a14', '#fff', 0.35); if (st.sites[i] === 2) txt(g, 'CO', x, y, '#fff', 2.2); else if (st.sites[i] === 1) txt(g, 'O₂', x, y, '#fff', 2); }
      txt(g, 'hemoglobin sites', 50, 90, '#ffe9ec', 3);
    }
  },
  cap(lvl, d) { const v = d.vis, dm = v.lungDmg;
    if (lvl === 0) return dm < 0.15 && v.lungTox < 0.15 ? 'Healthy: tiny hair-like cilia sweep mucus and dirt out. Air sacs (alveoli) are small, springy bubbles with thin walls.'
      : dm < 0.5 ? 'Smoke and vapor slow the cilia. Tar collects and walls of air sacs begin to break down.' : 'Cilia are paralyzed or gone, tar clogs the airway, and air-sac walls have broken into a few large floppy pockets (like emphysema) — less surface for oxygen.';
    return d.cohb > 3 ? 'Carbon monoxide (gray CO) grabs hemoglobin ~200× tighter than oxygen. Fewer red cells carry oxygen — and scarring thickens the membrane.' : 'Oxygen (O₂) crosses the thin membrane and attaches to hemoglobin in red blood cells. Thin membrane = fast delivery.'; },
};
function mixCss(a, b, t) { const A = new THREE.Color(a), B = new THREE.Color(b); A.lerp(B, clamp(t)); return '#' + A.getHexString(); }

/* ================= HEART ================= */
MICRO.heart = {
  title: 'Heart Muscle', lv: ['Heart muscle cells', 'Sarcomere engine'],
  init(st) { const r = rr(5); st.mito = []; for (let i = 0; i < 20; i++) st.mito.push({ x: r() * 100, y: r() * 100, a: r() * 3 }); st.ca = []; for (let i = 0; i < 14; i++) st.ca.push({ x: r() * 100, y: r() * 100, ph: r() * 6 }); st.atp = []; for (let i = 0; i < 10; i++) st.atp.push({ x: r() * 100, y: r() * 100 }); },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, ph = rigPhase();
    const beat = Math.max(0, Math.sin(ph * TAU * 1)) ** 2;
    if (lvl === 0) {
      bg(g, '#3a0a14', '#5a1020');
      const thick = 11 * (0.85 + 0.3 * (v.heartScale - 1) * 5 + 0.0);
      const rows = 4;
      for (let r = 0; r < rows; r++) {
        const y = 14 + r * 24, h = Math.min(20, thick + 5);
        g.save(); g.translate(0, y); const sx = 1 - 0.07 * beat; g.scale(sx, 1); g.translate(50 / sx - 50, 0);
        g.beginPath(); g.roundRect(-4, -h / 2, 108, h, 6); g.fillStyle = '#b02b3a'; g.fill(); g.strokeStyle = '#ff9aa6'; g.lineWidth = 0.5; g.stroke();
        for (let x = 2; x < 100; x += 6) ln(g, x, -h / 2 + 1, x, h / 2 - 1, 'rgba(255,170,175,.3)', 0.6);
        disc(g, 18 + r * 18, 0, 2.6, '#6a1b3a');
        g.restore();
        // intercalated discs
        ln(g, 45 + r * 7, y - h / 2, 48 + r * 7, y + h / 2, '#ffd2d8', 1);
      }
      const nm = Math.round(4 + clamp(v.A, 0, 1.4) * 10 * v.cf);
      for (let i = 0; i < Math.min(20, nm); i++) { const m = st.mito[i]; const y = 14 + (i % 4) * 24 + Math.sin(i * 7) * 3; ellipse(g, (m.x + t * 0.5) % 100, y, 3.4, 1.7, 0.3, '#f2a032', '#ffd592', 0.3); }
      txt(g, nm > 8 ? 'more mitochondria = more stamina' : 'mitochondria (energy factories)', 50, 97, '#ffe0a0', 3);
      if (v.heartStress > 0.4) for (let i = 0; i < 8; i++) { const a = st.ca[i]; spiky(g, (a.x + t * 12) % 100, 8 + (i * 13) % 90, 1.6, '#ffb347', 6); }
    } else {
      bg(g, '#2a0813', '#4a0f1c');
      const spread = 10 - 2.2 * beat;
      for (let k = 0; k < 4; k++) {
        const y = 14 + k * 24;
        for (let z = 0; z < 6; z++) { const x = 6 + z * 18 * (1 - 0.1 * beat) + 0; ln(g, x, y - 9, x, y + 9, '#ffcf5a', 1.6); }
        for (let z = 0; z < 5; z++) {
          const x0 = 6 + z * 18 * (1 - 0.1 * beat);
          ln(g, x0 + 2, y - 4, x0 + 18 * (1 - 0.1 * beat) - 2, y - 4, '#6aa7ff', 1); ln(g, x0 + 2, y + 4, x0 + 18 * (1 - 0.1 * beat) - 2, y + 4, '#6aa7ff', 1);
          ln(g, x0 + 4, y, x0 + 16 * (1 - 0.1 * beat), y, '#e2394a', 2.6);
          for (let h = 0; h < 4; h++) ln(g, x0 + 6 + h * 3, y, x0 + 6 + h * 3 + 1.5 * beat, y + (h % 2 ? 4 : -4), '#ff8a94', 0.6);
        }
      }
      st.atp.forEach((a, i) => { a.x = (a.x + dt * 5) % 100; mol(g, a.x, a.y, 2.3, '#ffcf3a', 'ATP', '#3a2a00'); });
      if (beat > 0.3) st.ca.forEach((c, i) => disc(g, c.x, c.y, 1.4 + beat, 'rgba(255,255,255,.8)'));
      txt(g, 'thin (actin)', 14, 96, '#9ec7ff', 3); txt(g, 'thick (myosin)', 75, 96, '#ff9aa6', 3);
    }
  },
  cap(lvl, d) { const v = d.vis;
    return lvl === 0 ? (v.A * v.cf > 0.7 ? 'Trained heart cells: thicker, stronger fibers and many mitochondria (energy factories) — each beat moves more blood.' : v.heartStress > 0.5 ? 'A heart under strain beats fast; stress hormones (orange sparks) push it to work harder with less rest.' : 'Heart muscle cells are striped and linked end-to-end so they squeeze together like one pump.')
      : 'Thin actin and thick myosin filaments slide past each other using ATP energy. Calcium (white dots) flips the switch every heartbeat.'; },
};
let _beatPhase = 0;
function rigPhase() { return _beatPhase; }

/* ================= VESSELS ================= */
MICRO.vessels = {
  title: 'Arteries', lv: ['Inside an artery', 'Cholesterol particles'],
  init(st) { const r = rr(21); st.cells = []; for (let i = 0; i < 16; i++) st.cells.push({ x: r() * 100, y: 30 + r() * 40, s: 2 + r() * 2, rot: r() * 3 }); st.ldl = []; for (let i = 0; i < 26; i++) st.ldl.push({ x: r() * 100, y: 18 + r() * 30, vx: 4 + r() * 6, ph: r() * 6, inW: r() < 0.3 }); st.hdl = []; for (let i = 0; i < 12; i++) st.hdl.push({ x: r() * 100, y: 20 + r() * 26, ph: r() * 6 }); },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, pl = v.plaque;
    if (lvl === 0) {
      bg(g, '#3a1018', '#5a1a24');
      const gap = 56 * (1 - 0.62 * pl), top = 50 - gap / 2, bot = 50 + gap / 2;
      // walls
      g.fillStyle = mixCss('#e58a90', '#b8806a', pl * 0.5); g.fillRect(0, 0, 100, top - 6); g.fillRect(0, bot + 6, 100, 100 - bot - 6);
      g.fillStyle = '#c0555e'; g.fillRect(0, top - 6, 100, 6); g.fillRect(0, bot, 100, 6);
      // plaque bumps
      for (let i = 0; i < 4; i++) { const cx = 14 + i * 24, h = 4 + 26 * pl * (0.6 + 0.4 * Math.sin(i * 2.1 + 1)); ellipse(g, cx, top - 3, 12, h / 1.5, 0, '#e8d27a', '#fff0a0', 0.6); ellipse(g, cx + 7, bot + 3, 10, h * 0.5 / 1.2, 0, '#e8d27a', '#fff0a0', 0.6); if (pl > 0.35) disc(g, cx, top + h * 0.2, 1.3, 'rgba(255,255,255,.7)'); }
      const sp = 14 * (0.35 + 0.65 * (1 - pl * 0.6));
      for (const c of st.cells) { c.x += dt * sp * (1 + 0.4 * Math.max(0, Math.sin(rigPhase() * TAU))); if (c.x > 106) c.x = -6; const y = clamp(c.y, top + 4, bot - 4); rbc(g, c.x, y + Math.sin(t * 2 + c.x * 0.1) * 2, c.s + 2, t + c.rot); }
      txt(g, pl > 0.4 ? 'narrowed channel + plaque' : 'smooth, wide channel', 50, 96, '#ffd8dc', 3.4);
      if (v.smokeSkin > 0.1 || v.cigP > 0) for (let i = 0; i < 6; i++) disc(g, (i * 23 + t * 8) % 100, 20 + (i * 9) % 20 + 30, 0.9, 'rgba(120,120,120,.7)');
    } else {
      bg(g, '#401018', '#5a1c26');
      g.fillStyle = '#c85a64'; g.fillRect(0, 52, 100, 48);
      for (let x = 2; x < 100; x += 11) { disc(g, x + 4, 52, 6, '#e3868e', '#ffb0b8', 0.5); disc(g, x + 4, 52, 1.3, '#8a2a40'); }
      const dmg = clamp(v.cigP + v.vapeN * 0.4 + v.plaque * 0.6);
      for (let i = 0; i < Math.floor(dmg * 5); i++) { const x = 8 + i * 19; ln(g, x, 44, x + 3, 56, '#3a0a14', 2); } // damaged endothelium gaps
      const nL = Math.round(5 + clamp(d.ldl - 60, 0, 200) / 8);
      st.ldl.slice(0, Math.min(26, nL)).forEach((p, i) => {
        p.x += dt * p.vx * (p.inW ? 0.3 : 1); if (p.x > 106) p.x = -6;
        const y = p.inW && d.ldl > 100 ? 62 + (i % 5) * 6 : p.y + Math.sin(t + p.ph) * 3;
        const ox = clamp(v.cigP * 1.1 + v.plaque, 0, 1) * (p.inW ? 1 : 0.3);
        disc(g, p.x, y, 3.2, ox > 0.5 ? '#d2603a' : '#f0b13a', '#fff3c0', 0.4); txt(g, 'LDL', p.x, y, '#4a2a00', 1.9);
        if (ox > 0.5 && p.inW) spiky(g, p.x + 3.5, y - 3.5, 1.4, '#ff3a2a', 5);
      });
      const nH = Math.round(d.hdl / 9);
      st.hdl.slice(0, Math.min(12, nH)).forEach(p => { p.x += dt * 8; if (p.x > 106) p.x = -6; disc(g, p.x, p.y + Math.sin(t * 1.4 + p.ph) * 3, 2.1, '#5fd38a', '#d9ffe6', 0.4); txt(g, 'HDL', p.x, p.y + Math.sin(t * 1.4 + p.ph) * 3, '#073', 1.4); });
      txt(g, 'artery wall', 50, 94, '#ffe0e4', 3.2); txt(g, 'blood', 50, 8, '#ffd0d6', 3.2);
    }
  },
  cap(lvl, d) { const pl = d.vis.plaque;
    return lvl === 0 ? (pl < 0.12 ? 'Healthy artery: wide, smooth lining; blood cells flow freely.' : pl < 0.5 ? 'Plaque (yellow: cholesterol, fat, cells) is building on the walls, narrowing the channel and stiffening the artery.' : 'Heavy plaque has narrowed the channel — the heart must push harder, and a clot could block flow (heart attack or stroke).')
      : (d.ldl > 130 ? 'Lots of LDL (“bad” cholesterol) slips into the wall; when oxidized (red sparks, e.g. by smoke) it triggers inflammation and plaque. HDL (green) tries to clean up.' : 'LDL delivers cholesterol; HDL (green) carries extra away. A healthy balance keeps the wall clean.'); },
};

/* ================= MUSCLE ================= */
MICRO.muscle = {
  title: 'Muscle', lv: ['Muscle fibers', 'Contracting filaments'],
  init(st) { const r = rr(8); st.nuc = []; for (let i = 0; i < 30; i++) st.nuc.push({ x: r() * 100, ph: r() }); st.aa = []; for (let i = 0; i < 14; i++) st.aa.push({ x: r() * 100, y: r() * 100, c: ['#6cf0b0', '#ffd24a', '#ff8ad0', '#7ab8ff'][i % 4] }); },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, m = v.muscle;
    if (lvl === 0) {
      bg(g, '#2a1218', '#3d1820');
      const rows = Math.round(lerp(7, 4, clamp((m - 0.7) / 0.7))), gap = 100 / rows, h = gap * lerp(0.48, 0.9, clamp((m - 0.62) / 0.9));
      for (let r = 0; r < rows; r++) {
        const y = gap * (r + 0.5), x = Math.sin(r * 3) * 1;
        g.beginPath(); g.roundRect(-4, y - h / 2, 108, h, h / 2.5); g.fillStyle = mixCss('#b0303a', '#d79a8d', clamp((v.fatPct - 28) / 14) * 0.6); g.fill(); g.strokeStyle = '#ff9aa2'; g.lineWidth = 0.6; g.stroke();
        for (let xx = 4; xx < 100; xx += 5) ln(g, xx, y - h / 2 + 1.4, xx, y + h / 2 - 1.4, 'rgba(255,190,190,.22)', 0.5);
        disc(g, 12 + (r * 29) % 80, y - h / 2 + 1.5, 1.8, '#5a2250');
        if (v.fatPct > 30 && r % 2) for (let k = 0; k < 4; k++) disc(g, 15 + k * 22 + r * 3, y + h / 2 + 0.5, 1.5, '#f2d46a');
      }
      if (v.S > 0.3 && v.cf > 0.2) { const k = (t % 3) / 3; for (let i = 0; i < 4; i++) { const y = gap * (i + 0.5) * 1.1 + 8; ln(g, 20 + i * 18, y, 23 + i * 18, y + 2, 'rgba(255,255,255,' + (0.8 - k * 0.8) + ')', 0.7); disc(g, 20 + i * 18 + 6, y + 5, 1.5, '#4ee0d0'); } txt(g, 'tiny tears → repair cells (teal) add size', 50, 97, '#9ff8ee', 3); }
      else txt(g, m < 0.9 ? 'thin fibers: muscle is shrinking' : 'muscle fibers', 50, 97, '#ffd6d6', 3.2);
    } else {
      bg(g, '#241017', '#3d1620');
      const rows = Math.round(lerp(3, 6, clamp((m - 0.7) / 0.7))), c = 0.5 + 0.5 * Math.sin(t * 2.2 * (0.5 + v.S * 0.5));
      for (let r = 0; r < rows; r++) {
        const y = 10 + r * (80 / Math.max(1, rows - 1));
        for (let z = 0; z < 6; z++) { const x = 4 + z * 19 * (1 - 0.1 * c); ln(g, x, y - 6, x, y + 6, '#ffcf5a', 1.4); }
        for (let z = 0; z < 5; z++) { const x0 = 4 + z * 19 * (1 - 0.1 * c); ln(g, x0 + 2, y - 2.6, x0 + 17 * (1 - 0.1 * c), y - 2.6, '#6aa7ff', 0.9); ln(g, x0 + 2, y + 2.6, x0 + 17 * (1 - 0.1 * c), y + 2.6, '#6aa7ff', 0.9); ln(g, x0 + 4, y, x0 + 15 * (1 - 0.1 * c), y, '#e2394a', 2.2); }
      }
      const feed = clamp(d.vis.energy > -300 ? 1 : 0.4) * clamp(0.3 + (d.vis.S + 0.3) * 0.5);
      st.aa.slice(0, Math.round(feed * 14)).forEach(a => { a.y = (a.y + dt * 7) % 100; a.x += Math.sin(t + a.y) * dt * 3; disc(g, a.x, a.y, 1.6, a.c, '#fff', 0.3); });
      txt(g, 'amino acids (from protein) rebuild filaments', 50, 97, '#ffe3e6', 2.8);
    }
  },
  cap(lvl, d) { const m = d.vis.muscle;
    return lvl === 0 ? (m > 1.15 ? 'Trained muscle: thick, tightly packed fibers. Lifting causes tiny tears; satellite cells (teal) repair them and add size.' : m < 0.9 ? 'Under-used muscle: thin fibers, extra space and fat droplets between them.' : 'Muscle fibers are long cells packed with contracting protein filaments.')
      : 'Thick myosin “heads” pull thin actin filaments inward, shortening each sarcomere. More training = more filaments packed in.'; },
};

/* ================= BONE ================= */
MICRO.bone = {
  title: 'Bone', lv: ['Inside spongy bone', 'Mineral crystals & bone cells'],
  init(st) { const r = rr(31); st.nodes = []; for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) st.nodes.push({ x: 6 + x * 14.6 + (r() - 0.5) * 8, y: 6 + y * 14.6 + (r() - 0.5) * 8, r: r() }); st.links = []; for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) { const i = y * 7 + x; if (x < 6) st.links.push([i, i + 1, r()]); if (y < 6) st.links.push([i, i + 7, r()]); if (x < 6 && y < 6) st.links.push([i, i + 8, r()]); }
    st.cry = []; for (let i = 0; i < 70; i++) st.cry.push({ x: r() * 100, y: r() * 100, rot: r() * 3, r: r() }); st.ca = []; for (let i = 0; i < 12; i++) st.ca.push({ x: r() * 100, y: r() * 100 }); },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, dens = clamp((v.boneIdx - 0.55) / 0.55);
    if (lvl === 0) {
      bg(g, '#4a3d28', '#6b5a38');
      g.fillStyle = 'rgba(240,200,120,.3)'; g.fillRect(0, 0, 100, 100);
      const keep = lerp(0.35, 1, smooth(dens, 0.05, 0.9));
      for (const l of st.links) { if (l[2] > keep) continue; const a = st.nodes[l[0]], b = st.nodes[l[1]]; ln(g, a.x, a.y, b.x, b.y, '#f4ecd2', 0.8 + 3.8 * dens); }
      for (let i = 0; i < 49; i++) { const n = st.nodes[i]; disc(g, n.x, n.y, 1 + 2.2 * dens, '#f4ecd2'); }
      for (let i = 0; i < 18; i++) disc(g, (i * 41 + Math.sin(t * 0.5 + i) * 3) % 100, (i * 29) % 100, 1.3, 'rgba(255,170,150,.55)');
      txt(g, dens < 0.35 ? 'thin, sparse struts: fragile' : dens > 0.8 ? 'thick, dense struts: strong' : 'bone struts (trabeculae)', 50, 97, '#fff3d6', 3.2);
    } else {
      bg(g, '#352b45', '#4d3f64');
      for (let i = 0; i < 70; i++) { const c = st.cry[i]; if (c.r > lerp(0.3, 1, dens)) continue; g.save(); g.translate(c.x, c.y); g.rotate(c.rot); g.fillStyle = 'rgba(245,240,255,.85)'; g.fillRect(-3, -1.3, 6, 2.6); g.restore(); }
      const build = clamp(0.2 + v.S * 0.4 + v.A * 0.2 + (d.vis.cf > 0.2 ? 0.1 : 0)) * (1 - 0.5 * clamp(v.cigP));
      const brk = clamp(v.cigP * 0.5 + v.alcL * 0.3 + v.ageDecl * 0.4 + clamp(-v.energy / 500, 0, 1) * 0.4);
      for (let i = 0; i < 2; i++) { const x = 25 + i * 45 + Math.sin(t * 0.4 + i) * 5, y = 30 + i * 28; ellipse(g, x, y, 11, 7, 0.3, '#4fd68a', '#d6ffe6', 0.6); txt(g, 'builder', x, y, '#06361c', 2.6); }
      for (let i = 0; i < 1 + Math.round(brk * 2); i++) { const x = 70 - i * 28 + Math.sin(t * 0.5 + i) * 4, y = 74 - i * 10; ellipse(g, x, y, 14, 9, -0.2, '#a35ae0', '#e8c6ff', 0.6); txt(g, 'breaker', x, y, '#2a0750', 2.6); }
      st.ca.slice(0, 8).forEach(a => { a.x = (a.x + dt * 4) % 100; mol(g, a.x, a.y, 2, '#ffffff', 'Ca²⁺', '#2a2060'); });
      txt(g, 'calcium crystals pack into a collagen net', 50, 96, '#e9e0ff', 2.8);
    }
  },
  cap(lvl, d) { const dens = clamp((d.vis.boneIdx - 0.55) / 0.55);
    return lvl === 0 ? (dens > 0.7 ? 'Dense honeycomb of bone struts: strong and resistant to fractures.' : dens > 0.35 ? 'Struts are thinning and some connections have disappeared — bone mass is lower than ideal.' : 'Very thin, broken struts (osteoporosis): bones fracture easily.')
      : 'Builder cells (green) lay down calcium crystals; breaker cells (purple) dissolve old bone. Impact exercise, calcium and not smoking tilt the balance toward building.'; },
};

/* ================= SKIN ================= */
MICRO.skin = {
  title: 'Skin', lv: ['Skin layers', 'DNA & collagen'],
  init(st) { const r = rr(41); st.uv = []; for (let i = 0; i < 8; i++) st.uv.push({ x: r() * 100, y: r() * 30, ph: r() }); st.fib = []; for (let i = 0; i < 14; i++) st.fib.push({ x: r() * 100, y: 50 + r() * 40, a: r() * 3, br: r() }); st.rad = []; for (let i = 0; i < 8; i++) st.rad.push({ x: r() * 100, y: r() * 100, ph: r() * 6 }); },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, dmg = clamp(v.uvDmg + v.smokeSkin * 0.8 + v.ageDecl * 0.3);
    if (lvl === 0) {
      bg(g, '#f6dcc8', '#c68a68');
      g.fillStyle = mixCss('#e8b99a', '#b99d86', v.smokeSkin * 0.5); g.fillRect(0, 22, 100, 14);
      g.fillStyle = 'rgba(100,60,40,.18)'; g.fillRect(0, 35, 100, 2);
      for (let x = 0; x < 100; x += 8) disc(g, x + 4, 29, 3.4, 'rgba(255,200,170,.55)', 'rgba(150,90,60,.3)', 0.3);
      // surface line
      wavy(g, 0, 100, 21, 0.6 + dmg * 2.3, 0.35 + dmg * 0.3, 0, '#8a5a40', 1.1);
      // dermis
      g.fillStyle = '#e9b9a0'; g.fillRect(0, 37, 100, 63);
      // collagen fibers
      for (const f of st.fib) { const broken = f.br < dmg * 0.8; const y0 = f.y; g.beginPath(); for (let x = f.x - 18; x <= f.x + 18; x += 2) { const yy = y0 + Math.sin(x * (broken ? 0.9 : 0.25) + f.a) * (broken ? 3 : 1.6); x === f.x - 18 ? g.moveTo(x, yy) : g.lineTo(x, yy); } g.strokeStyle = broken ? 'rgba(120,70,40,.55)' : 'rgba(255,245,230,.9)'; g.lineWidth = broken ? 0.6 : 1.4; if (broken) g.setLineDash([2, 3]); g.stroke(); g.setLineDash([]); }
      // hair follicle + vessel + gland
      g.beginPath(); g.moveTo(70, 21); g.lineTo(72, 70); g.strokeStyle = '#4a3020'; g.lineWidth = 1.4; g.stroke(); ellipse(g, 72, 72, 4, 3, 0, '#f5d0b8', '#8a5a40', 0.5);
      ellipse(g, 20, 60, 9, 2.5, 0, '#c63040'); ellipse(g, 34, 85, 5, 5, 0, '#7ec8ff', '#2d6a9a', 0.5);
      // water in epidermis
      const hy = clamp(v.hydIdx); for (let i = 0; i < Math.round(hy * 9); i++) disc(g, 8 + i * 11, 26 + (i % 3) * 4, 1.1, 'rgba(120,200,255,.85)');
      // UV
      const uvr = d.vis.uvDmg + 0.05; if (uvr > 0.06 || true) st.uv.forEach((u, i) => { u.y += dt * 18; if (u.y > 36) { u.y = -4; u.x = Math.random() * 100; } const sunscreen = i % 3 && false; ln(g, u.x, u.y - 5, u.x + 2, u.y, '#ffd23a', 1.1); spiky(g, u.x + 2, u.y, 1, '#ffb000', 4); });
      txt(g, 'UV rays', 12, 6, '#a05a00', 3.2);
      if (v.smokeSkin > 0.1) for (let i = 0; i < Math.floor(v.smokeSkin * 12); i++) disc(g, (i * 31 + t * 3) % 100, 40 + (i * 17) % 55, 1.1, 'rgba(60,40,30,.6)');
      txt(g, dmg > 0.5 ? 'frayed, broken collagen → wrinkles' : 'springy collagen (white) keeps skin firm', 50, 97, '#fff3e6', 2.8);
    } else {
      bg(g, '#1a1d3a', '#31284f');
      // DNA helix
      const N = 18; for (let i = 0; i < N; i++) { const x = 8 + i * 5, a = i * 0.55 + t * 1.2; const y1 = 30 + Math.sin(a) * 12, y2 = 30 - Math.sin(a) * 12; const dim = Math.cos(a) > 0; ln(g, x, y1, x, y2, 'rgba(180,200,255,.5)', 0.7); disc(g, x, y1, 2, dim ? '#6ab4ff' : '#3a6aa8'); disc(g, x, y2, 2, dim ? '#ffb86a' : '#a86a3a'); }
      // thymine dimers (UV damage)
      const nd = Math.round(dmg * 5); for (let i = 0; i < nd; i++) { const x = 14 + i * 17; ln(g, x - 3, 22, x + 3, 26, '#ff3a3a', 1.6); spiky(g, x, 24, 3, 'rgba(255,60,60,.8)', 6); }
      txt(g, nd > 0 ? 'DNA with UV damage (red)' : 'healthy DNA', 50, 8, '#cfd8ff', 3);
      // collagen triple helix
      for (let s = 0; s < 3; s++) { g.beginPath(); for (let x = 4; x <= 96; x += 2) { const broken = dmg > 0.55 && x > 40 && x < 52; if (broken && s === 1) continue; const y = 72 + Math.sin(x * 0.25 + s * 2.1 + t * 0.8) * 7; x === 4 ? g.moveTo(x, y) : g.lineTo(x, y); } g.strokeStyle = ['#f2d8c0', '#ffcda8', '#ffe3d0'][s]; g.lineWidth = 2.3; g.stroke(); }
      const fr = Math.round(clamp(v.smokeSkin + v.uvDmg) * 8); st.rad.slice(0, fr).forEach(r => { r.x = (r.x + dt * 6) % 100; spiky(g, r.x, 60 + (r.y % 25) + Math.sin(t * 3 + r.ph) * 3, 2.4, '#ffe14a', 7); });
      const ao = Math.min(6, Math.round(d.vis.fiberN * 3 + 1)); for (let i = 0; i < ao; i++) mol(g, (i * 29 + t * 4) % 100, 90 - (i % 3) * 5, 2, '#58d68d', 'e⁻', '#073');
      txt(g, 'collagen', 20, 86, '#ffe8d8', 3); if (fr) txt(g, 'free radicals', 80, 56, '#ffe14a', 2.8);
    }
  },
  cap(lvl, d) { const v = d.vis, dmg = clamp(v.uvDmg + v.smokeSkin * 0.8 + v.ageDecl * 0.3);
    return lvl === 0 ? (dmg < 0.2 ? 'Healthy skin: smooth surface, springy collagen fibers, and plenty of water in the top layer.' : 'UV light, smoke and age break collagen and dry the skin — fibers fray and the surface wrinkles.')
      : (v.uvDmg > 0.15 ? 'UV light bends neighboring DNA letters together (red). Cells repair most, but mistakes add up and can lead to skin cancer.' : 'Collagen is a rope of three strands. Free radicals from smoke and UV break it; antioxidants from fruits & veggies (green) help protect it.'); },
};

/* ================= BRAIN ================= */
MICRO.brain = {
  title: 'Brain & Nerves', lv: ['Neuron network', 'A synapse'],
  init(st) { const r = rr(51); st.n = []; for (let i = 0; i < 9; i++) st.n.push({ x: 12 + r() * 76, y: 12 + r() * 70, r: 3 + r() * 1.5 }); st.sig = []; for (let i = 0; i < 12; i++) st.sig.push({ a: pick(r, 9), b: pick(r, 9), p: r() }); st.waste = []; for (let i = 0; i < 12; i++) st.waste.push({ x: r() * 100, y: r() * 100, s: 1 + r() * 2 }); st.nt = []; for (let i = 0; i < 18; i++) st.nt.push({ x: 30 + r() * 40, y: 38 + r() * 6, p: r(), side: r() }); st.cf = []; for (let i = 0; i < 6; i++) st.cf.push({ x: r() * 100, y: 55 + r() * 20 }); },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, act = clamp(d.focus / 100), sp = (1 + v.caffN * 0.4 + v.nic) * (1 - 0.45 * clamp(v.alcL, 0, 1)) * (1 - 0.3 * v.sleepBad);
    if (lvl === 0) {
      bg(g, mixCss('#1b1840', '#3a1530', v.stress), '#1a1a38');
      // dendrites
      for (let i = 0; i < 9; i++) for (let j = i + 1; j < 9; j++) { if ((i * 7 + j * 3) % 4 && Math.random() > 2) continue; const a = st.n[i], b = st.n[j]; if (Math.hypot(a.x - b.x, a.y - b.y) > 44 * (0.55 + act * 0.6)) continue; ln(g, a.x, a.y, b.x, b.y, 'rgba(160,180,255,' + (0.2 + act * 0.4) + ')', 0.7); }
      st.sig.forEach(s => { s.p += dt * 0.9 * sp * (0.3 + act); if (s.p > 1) { s.p = 0; s.a = pick(Math.random, 9); s.b = pick(Math.random, 9); } const a = st.n[s.a], b = st.n[s.b]; if (Math.hypot(a.x - b.x, a.y - b.y) < 44 * (0.55 + act * 0.6)) disc(g, lerp(a.x, b.x, s.p), lerp(a.y, b.y, s.p), 1.5, v.stress > 0.5 ? '#ff9a6a' : '#ffe86a'); });
      st.n.forEach(n => { disc(g, n.x, n.y, n.r + 1.5, 'rgba(120,140,255,.25)'); disc(g, n.x, n.y, n.r, '#8aa0ff', '#dfe6ff', 0.5); disc(g, n.x, n.y, 1.2, '#2a3a8a'); });
      const w = Math.round(v.sleepBad * 12); for (let i = 0; i < w; i++) { const k = st.waste[i]; disc(g, k.x + Math.sin(t * 0.4 + i) * 1.5, k.y, k.s, 'rgba(160,110,70,.85)'); }
      txt(g, w > 3 ? 'waste builds up without enough sleep' : 'sleep flushes waste & files memories', 50, 96, w > 3 ? '#ffb88a' : '#bfe3ff', 3);
    } else {
      bg(g, '#14183a', '#22204a');
      g.fillStyle = '#4f5db8'; g.beginPath(); g.ellipse(50, 8, 36, 20, 0, 0, TAU); g.fill(); txt(g, 'sending neuron', 50, 6, '#e0e6ff', 3);
      g.fillStyle = '#35458f'; g.beginPath(); g.ellipse(50, 94, 36, 18, 0, 0, TAU); g.fill(); txt(g, 'receiving neuron', 50, 96, '#d8e0ff', 3);
      for (let i = 0; i < 6; i++) disc(g, 28 + i * 9, 20, 3, '#9ab0ff', '#fff', 0.3);
      for (let i = 0; i < 6; i++) { const x = 24 + i * 10; g.fillStyle = '#ff9ad0'; g.fillRect(x, 78, 4, 4); }
      const rate = sp * (0.3 + act * 0.8);
      st.nt.forEach((n, i) => { n.p += dt * rate * 0.7; if (n.p > 1) n.p = 0; const x = n.x + Math.sin(n.p * 5 + i) * 2, y = lerp(24, 78, n.p); disc(g, x, y, 1.7, '#ffe36a', '#fff', 0.3); });
      const nc = Math.round(clamp(v.caffN, 0, 3) * 2); for (let i = 0; i < nc; i++) { const c = st.cf[i]; mol(g, 24 + i * 10, 76 + Math.sin(t * 2 + i), 2.3, '#b98a5a', '', ''); }
      if (nc) txt(g, 'caffeine blocks “sleepy” receptors', 50, 66, '#e8c9a0', 2.6);
      const nn = Math.round(v.nic * 3); for (let i = 0; i < nn; i++) mol(g, 30 + i * 14, 74 + Math.sin(t * 2.4 + i), 2.2, '#8a8aa0', 'N', '#fff');
      const ns = Math.round(v.stress * 4); for (let i = 0; i < ns; i++) spiky(g, 14 + ((i * 22 + t * 6) % 76), 50 + Math.sin(t + i) * 8, 2, '#ff5a4a', 6);
      const ne = Math.round(clamp(v.alcL, 0, 2) * 3); for (let i = 0; i < ne; i++) mol(g, 20 + i * 12, 54 + Math.sin(t + i) * 3, 2.1, '#7ad0e0', 'EtOH', '#033');
      txt(g, 'neurotransmitters (yellow) cross the gap', 50, 49, '#fff3b0', 2.7);
    }
  },
  cap(lvl, d) { const v = d.vis;
    return lvl === 0 ? (v.sleepBad > 0.3 ? 'Too little sleep: fewer neuron connections fire and brown waste proteins pile up because the brain’s cleanup crew works mostly at night.' : v.stress > 0.55 ? 'Stress hormones make signals fire in a frantic burst, making it hard to focus.' : 'Neurons form a web; electrical signals (yellow dots) jump between them. Rested brains fire clearly and connect widely.')
      : (v.caffN > 1 || v.nic > 0.2 || v.alcL > 0.1 || v.stress > 0.4 ? 'Chemicals interfere at the synapse: caffeine blocks sleepiness signals, nicotine hijacks receptors, alcohol slows transmission, stress hormones (red) flood in.' : 'A synapse: the sending neuron releases neurotransmitters that cross a tiny gap and fit receptors on the next neuron like keys in locks.'); },
};

/* ================= LIVER ================= */
MICRO.liver = {
  title: 'Liver', lv: ['Liver cells', 'Processing sugar & alcohol'],
  init(st) { const r = rr(61); st.cells = []; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) st.cells.push({ x: 14 + x * 24 + (y % 2) * 8, y: 14 + y * 24, f: r() }); st.fat = []; for (let i = 0; i < 64; i++) st.fat.push({ dx: (r() - 0.5) * 14, dy: (r() - 0.5) * 14, r: 1 + r() * 2 }); st.m = []; for (let i = 0; i < 10; i++) st.m.push({ x: -r() * 80, y: 14 + r() * 70, k: i % 2 }); },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, lf = clamp(d.liver / 25);
    if (lvl === 0) {
      bg(g, mixCss('#5a2420', '#8a6a30', lf * 0.6), mixCss('#7a3028', '#9a7a3a', lf * 0.6));
      st.cells.forEach((c, i) => { hexa(g, c.x, c.y, 12, mixCss('#b04a40', '#d9a860', lf * 0.5), '#ffcdb0'); disc(g, c.x - 2, c.y, 3.2, '#5a2050'); const nf = Math.round(lf * 7); for (let k = 0; k < nf; k++) { const f = st.fat[(i * 4 + k) % 64]; disc(g, c.x + f.dx * 0.8, c.y + f.dy * 0.8, f.r * (0.6 + lf), '#f6dc6a', '#fff3b0', 0.3); } });
      txt(g, lf > 0.35 ? 'fat droplets swell liver cells' : 'healthy liver cells', 50, 97, '#fff0d8', 3.2);
    } else {
      bg(g, '#2a1a30', '#3d2840');
      g.fillStyle = 'rgba(255,170,70,.12)'; g.fillRect(40, 0, 20, 100); txt(g, 'enzymes', 50, 6, '#ffd9a0', 3);
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(50 + 0, 30 + i * 22); g.arc(50, 30 + i * 22, 8, 0.4, TAU - 0.4); g.closePath(); g.fillStyle = '#58b8ff'; g.fill(); }
      const nA = Math.round(clamp(v.alcL, 0, 2) * 3), nS = Math.round(clamp(v.sugarN, 0, 3) * 2 + 1);
      st.m.forEach((m, i) => { m.x += dt * 12; if (m.x > 108) { m.x = -8; } const toxic = m.x > 56 && m.k === 0 && i < nA; if (m.k === 0 && i / 2 < nA) mol(g, m.x, m.y, 2.6, toxic ? '#ff7a2a' : '#7ad0e0', toxic ? '' : 'EtOH', '#033'); else if (m.k === 1 && (i - 1) / 2 < nS) { if (m.x > 56) disc(g, m.x, m.y, 2.8, '#f6dc6a', '#fff3b0', 0.4); else hexa(g, m.x, m.y, 2.6, '#fff3d0', '#a98'); } });
      txt(g, 'sugar (hex) → fat droplets (yellow)', 50, 92, '#fff0c0', 2.8); if (nA) txt(g, 'alcohol → toxic by-product (orange)', 50, 97, '#ffc89a', 2.6);
    }
  },
  cap(lvl, d) { const lf = clamp(d.liver / 25);
    return lvl === 0 ? (lf < 0.2 ? 'Healthy liver cells: clean, tightly packed, working as the body’s filter and fuel store.' : 'Fat droplets (yellow) fill liver cells. Early on this is reversible; over years it inflames and scars the liver.')
      : 'The liver turns extra sugar into fat and breaks alcohol into a toxic substance first. Lots of either overwhelms the enzymes.'; },
};

/* ================= STOMACH ================= */
MICRO.stomach = {
  title: 'Stomach Lining', lv: ['Protective mucus layer', 'Acid vs. barrier'],
  init(st) { const r = rr(71); st.h = []; for (let i = 0; i < 26; i++) st.h.push({ x: r() * 100, y: r() * 50, v: 3 + r() * 5 }); },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, irr = clamp(v.stress * 0.7 + v.alcL * 0.5 + v.caffN * 0.15), mucus = 14 * (1 - irr * 0.75);
    bg(g, '#4a1a1f', '#7a3138');
    for (let x = 0; x < 100; x += 12) { g.beginPath(); g.roundRect(x + 1, 62, 10, 40, 4); g.fillStyle = '#e8a090'; g.fill(); disc(g, x + 6, 78, 2, '#7a2a50'); }
    g.fillStyle = 'rgba(120,200,255,.35)'; g.fillRect(0, 62 - mucus, 100, mucus);
    txt(g, 'protective mucus', 50, 62 - mucus / 2, '#d6f0ff', 3);
    const n = Math.round(10 + irr * 14);
    st.h.slice(0, n).forEach((h, i) => { h.y += dt * h.v; if (h.y > 62 - mucus + (irr > 0.6 && i % 4 === 0 ? 12 : 0)) { h.y = -2; h.x = Math.random() * 100; } spiky(g, h.x, h.y, 1.9, '#ff4a4a', 6); });
    if (irr > 0.55) { disc(g, 50, 66, 3.4, '#6a1a20'); disc(g, 78, 68, 2.4, '#6a1a20'); }
    txt(g, 'stomach acid (red)', 50, 6, '#ffd0d0', 3);
  },
  cap(lvl, d) { const irr = clamp(d.vis.stress * 0.7 + d.vis.alcL * 0.5 + d.vis.caffN * 0.15);
    return irr < 0.3 ? 'A thick mucus layer shields the stomach wall from its own strong acid.' : 'Stress, alcohol and too much caffeine thin the mucus. Acid reaches the wall — burning, sores and stomach upset.'; },
};

/* ================= GUT ================= */
MICRO.gut = {
  title: 'Intestines & Microbiome', lv: ['Villi & gut bacteria', 'Fiber → fuel for bacteria'],
  init(st) { const r = rr(81); st.good = []; for (let i = 0; i < 18; i++) st.good.push({ x: r() * 100, y: 30 + r() * 38, a: r() * 3, s: r() * 2 }); st.bad = []; for (let i = 0; i < 14; i++) st.bad.push({ x: r() * 100, y: 30 + r() * 38, a: r() * 3 }); st.nut = []; for (let i = 0; i < 12; i++) st.nut.push({ x: r() * 100, y: r() * 40 }); st.fib = []; for (let i = 0; i < 6; i++) st.fib.push({ x: -r() * 80, y: 10 + r() * 70 }); st.sc = []; },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, h = clamp(d.gut / 100);
    if (lvl === 0) {
      bg(g, '#4a2a22', '#6d4034');
      for (let x = 6; x < 100; x += 14) { g.beginPath(); g.moveTo(x - 4, 100); g.quadraticCurveTo(x - 5, 66, x, 62 + Math.sin(t + x) * 1.5); g.quadraticCurveTo(x + 5, 66, x + 4, 100); g.fillStyle = mixCss('#a8886e', '#ee9f94', h); g.fill(); g.strokeStyle = '#ffd0c0'; g.lineWidth = 0.5; g.stroke(); ln(g, x, 90, x, 68, '#c63040', 0.7); }
      const ng = Math.round(4 + 14 * h), nb = Math.round(2 + 12 * (1 - h) * 1);
      st.good.slice(0, ng).forEach(b => { b.x += Math.sin(t * 0.6 + b.s) * dt * 6; ellipse(g, ((b.x % 100) + 100) % 100, b.y + Math.sin(t + b.s) * 2, 3.4, 1.5, b.a + t * 0.2, '#5ed682', '#d6ffe4', 0.4); });
      st.bad.slice(0, nb).forEach(b => { b.x += Math.sin(t * 0.5 + b.a) * dt * 5; const x = ((b.x % 100) + 100) % 100; disc(g, x, b.y + Math.sin(t + b.a) * 2, 2.6, '#c0457a', '#ffb0d0', 0.4); spiky(g, x, b.y + Math.sin(t + b.a) * 2, 3.3, 'rgba(192,69,122,.55)', 8); });
      st.nut.forEach(n => { n.y += dt * 8; n.x += Math.sin(t + n.y) * dt * 2; if (n.y > 64) { n.y = 0; n.x = Math.random() * 100; } disc(g, n.x, n.y, 1.3, '#ffd24a'); });
      txt(g, 'good bacteria', 24, 28, '#9affb8', 2.8); txt(g, nb > 7 ? 'harmful bacteria crowd in' : 'villi absorb nutrients', 62, 28, nb > 7 ? '#ffa0cc' : '#ffe9c8', 2.8);
    } else {
      bg(g, '#2a2236', '#3c2f4a');
      ellipse(g, 62, 50, 16, 11, 0, '#5ed682', '#d6ffe4', 0.8); txt(g, 'gut bacterium', 62, 50, '#073', 3);
      const nf = Math.round(2 + clamp(v.fiberN, 0, 1.5) * 4);
      st.fib.slice(0, nf).forEach((f, i) => { f.x += dt * 12; if (f.x > 46 && f.x < 50) { st.sc.push({ x: 74, y: 50, vx: 6 + Math.random() * 5, vy: (Math.random() - 0.5) * 8, a: 1 }); } if (f.x > 52) f.x = -20; g.beginPath(); for (let k = 0; k < 6; k++) { const x = f.x + k * 4; const y = f.y * 0 + 20 + i * 12 + (f.x > 20 ? (f.x - 20) * 0.6 : 0) * (i % 2 ? -1 : 1) * 0; hexa(g, x, 20 + i * 11, 1.8, '#f2d8a0', '#a98'); } });
      st.sc.forEach(s => { s.x += dt * s.vx; s.y += dt * s.vy; s.a -= dt * 0.25; if (s.a > 0) mol(g, s.x, s.y, 1.9, '#ff9a3a', '', ''); }); st.sc = st.sc.filter(s => s.a > 0).slice(-40);
      txt(g, 'fiber chains', 22, 8, '#f2e0b0', 3); txt(g, 'short-chain fatty acids = fuel & calm gut', 62, 90, '#ffc58a', 2.8);
      if (v.sugarN > 1.2) { for (let i = 0; i < 4; i++) { const x = 10 + ((t * 10 + i * 24) % 80); hexa(g, x, 72, 2.4, '#fff', '#c88'); } txt(g, 'sugar feeds the harmful bugs', 40, 82, '#ffb0d0', 2.6); }
    }
  },
  cap(lvl, d) { const h = clamp(d.gut / 100);
    return lvl === 0 ? (h > 0.65 ? 'A diverse team of good bacteria (green) lives among the villi — finger-like folds that soak up nutrients.' : 'Sugar, alcohol, stress and low fiber crowd out good bacteria; harmful microbes (pink) take over and irritate the lining.')
      : 'Gut bacteria ferment fiber into short-chain fatty acids that feed gut cells and calm inflammation. Fiber is their favorite food!'; },
};

/* ================= KIDNEY ================= */
MICRO.kidney = {
  title: 'Kidneys', lv: ['Filter (glomerulus)', 'Salt & water balance'],
  init(st) { const r = rr(91); st.w = []; for (let i = 0; i < 26; i++) st.w.push({ x: r() * 100, y: 38 + r() * 24, p: r() }); st.na = []; for (let i = 0; i < 20; i++) st.na.push({ x: r() * 100, y: 20 + r() * 60, p: r() }); },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, conc = clamp(1 - v.hydIdx), salt = clamp(v.sodN / 2.2);
    if (lvl === 0) {
      bg(g, mixCss('#4a2a30', '#6a4a10', conc * 0.6), '#5a2a34');
      disc(g, 30, 50, 24, 'rgba(255,230,230,.1)', '#ffc0c8', 1);
      for (let i = 0; i < 4; i++) { g.beginPath(); for (let a = 0; a < TAU; a += 0.2) { const rr2 = 6 + i * 3.2 + Math.sin(a * 3 + i + t * 0.5) * 1.2; const x = 30 + Math.cos(a) * rr2, y = 50 + Math.sin(a) * rr2; a ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.strokeStyle = '#d62e3c'; g.lineWidth = 2.3; g.stroke(); }
      const n = Math.round(14 + clamp((d.bpSys - 100) / 60) * 12);
      st.w.slice(0, n).forEach((w, i) => { w.p += dt * 0.35; if (w.p > 1) w.p = 0; const x = lerp(30, 100, w.p), y = lerp(50, 50, w.p) + Math.sin(w.p * 9 + i) * 6; disc(g, x, y, 1.3, '#9ad8ff'); });
      g.fillStyle = 'rgba(255,220,150,' + (0.15 + conc * 0.4) + ')'; g.fillRect(56, 42, 44, 16);
      const nn = Math.round(salt * 14); st.na.slice(0, nn).forEach((s, i) => { s.p += dt * 0.25; if (s.p > 1) s.p = 0; mol(g, lerp(58, 98, s.p), 50 + Math.sin(s.p * 8 + i) * 5, 1.7, '#ffffff', '', ''); });
      txt(g, 'blood filter', 30, 82, '#ffd8dc', 3.2); txt(g, 'tubule', 78, 36, '#ffe9c0', 3);
      if (conc > 0.4) txt(g, 'dark, concentrated urine = need water', 50, 96, '#ffd070', 2.8);
    } else {
      bg(g, '#1a2c4a', '#244466');
      ln(g, 0, 50, 100, 50, '#7ab8ff', 3); for (let x = 10; x < 100; x += 20) { ellipse(g, x, 50, 4, 6, 0, '#4a7ac0', '#cfe0ff', 0.5); }
      const nn = Math.round(2 + salt * 8); st.na.slice(0, nn).forEach((s, i) => { s.p += dt * 0.2; if (s.p > 1) s.p = 0; const y = lerp(10, 44, s.p); mol(g, (s.x + t * 2 * 0) % 100, y, 2.6, '#ffffff', 'Na⁺', '#234'); });
      const nw = Math.round(3 + salt * 14); st.w.slice(0, nw).forEach((w, i) => { w.p += dt * 0.15 * (0.6 + salt); if (w.p > 1) w.p = 0; const y = lerp(60, 90, w.p); disc(g, w.x, 20 + (1 - w.p) * 24 + 40 * w.p * 0 + (i % 3) * 3 + 24 * (1 - w.p) * 0 + w.p * 30 * 0, 1.6, '#8ad0ff'); });
      txt(g, salt > 0.8 ? 'more salt in the blood pulls extra water in → more blood volume → higher pressure' : 'salt and water stay balanced', 50, 92, salt > 0.8 ? '#ffd0a0' : '#cfe6ff', 2.7);
      txt(g, 'salt (Na⁺)', 14, 8, '#fff', 3);
    }
  },
  cap(lvl, d) { const s = clamp(d.vis.sodN / 2.2);
    return lvl === 0 ? 'Blood is squeezed through tiny capillary loops. Waste and extra water slip into the tubule; useful substances are taken back. Dehydration makes urine dark and concentrated.'
      : (s > 0.7 ? 'Salt holds water in the blood. More fluid in the same pipes = higher blood pressure, which strains kidney filters over time.' : 'Kidneys balance sodium and water. Less salt and enough water keeps pressure and filters healthy.'); },
};

/* ================= PANCREAS ================= */
MICRO.pancreas = {
  title: 'Pancreas & Insulin', lv: ['Insulin-making cells', 'Insulin “key” & sugar gate'],
  init(st) { const r = rr(101); st.v = []; for (let i = 0; i < 18; i++) st.v.push({ x: 40 + r() * 20, y: 40 + r() * 20, p: r() }); st.gl = []; for (let i = 0; i < 16; i++) st.gl.push({ x: r() * 100, y: r() * 40, p: r() }); st.key = []; for (let i = 0; i < 5; i++) st.key.push({ x: 15 + i * 17, p: r() }); },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, ir = clamp(v.IR);
    if (lvl === 0) {
      bg(g, '#3a2a18', '#5a4020');
      const tired = clamp(ir * 0.8);
      [[40, 44], [58, 40], [48, 58], [66, 56], [34, 62]].forEach(([x, y], i) => { disc(g, x, y, 12 + Math.sin(t * 2 + i) * 0.6 * (1 - tired), mixCss('#f0c070', '#9a8a70', tired), '#fff0c8', 0.6); disc(g, x - 2, y, 3, '#6a3070'); });
      const n = Math.round(6 + clamp(v.sugarN, 0, 3) * 4 + ir * 4); st.v.slice(0, Math.min(18, n)).forEach((p, i) => { p.p += dt * (0.3 + v.sugarN * 0.25); if (p.p > 1) { p.p = 0; p.x = 35 + Math.random() * 30; p.y = 40 + Math.random() * 20; } const x = lerp(p.x, 92, p.p), y = lerp(p.y, 50, p.p); disc(g, x, y, 1.7, '#c06aff', '#f0d0ff', 0.4); });
      txt(g, 'beta cells', 40, 82, '#fff0c8', 3.2); txt(g, 'insulin →', 82, 40, '#e8c8ff', 3); if (tired > 0.5) txt(g, 'overworked cells', 50, 94, '#ffcf9a', 2.8);
    } else {
      bg(g, '#201a38', '#30284f');
      g.fillStyle = '#7a64c8'; g.fillRect(0, 62, 100, 12); txt(g, 'cell membrane', 50, 68, '#efeaff', 3);
      const open = 1 - ir;
      st.key.forEach((k, i) => {
        k.p += dt * 0.5; if (k.p > 1) k.p -= 1; const x = k.x, y = lerp(8, 56, Math.min(1, k.p * 1.2));
        const hit = k.p > 0.8; const gateOpen = hit && Math.random() < 2 && open > ((i * 0.37) % 1);
        g.fillStyle = ir > 0.55 ? '#b0455a' : '#6a54c8'; g.fillRect(x - 4, 60, 8, 4); // receptor
        if (ir > 0.55) { ln(g, x - 3, 57, x + 3, 63, '#ff5a5a', 1.2); ln(g, x + 3, 57, x - 3, 63, '#ff5a5a', 1.2); }
        if (k.p < 0.85) { g.save(); g.translate(x, y); g.fillStyle = '#c06aff'; g.fillRect(-1, -3, 2, 6); g.fillRect(-1, 2, 3, 1.2); g.fillRect(-1, 0, 3, 1.2); g.restore(); }
        // gate + glucose pass
        const pass = open > ((i * 0.37) % 1) && k.p > 0.6; if (pass) { ln(g, x, 62, x, 74, '#0d2a50', 3); }
        if (pass) hexa(g, x, 66 + (k.p - 0.6) * 60, 2.6, '#fff3d0', '#a98'); }
      );
      st.gl.forEach((gl, i) => { gl.p += dt * 0.25; if (gl.p > 1) gl.p = 0; const x = (gl.x + t * 3 * 0) % 100, y = 8 + (i * 7 + gl.p * 30) % 44 + (ir > 0.4 ? 0 : 0); if (i < 5 + v.sugarN * 3 + ir * 6) hexa(g, x, Math.min(54, y), 2.1, '#fff3d0', '#a98'); });
      txt(g, ir > 0.5 ? 'insulin resistance: gates stay shut, sugar piles up' : 'insulin key opens the gate → sugar enters the cell', 50, 92, ir > 0.5 ? '#ffb0b8' : '#d6ffe0', 2.7);
    }
  },
  cap(lvl, d) { const ir = clamp(d.vis.IR);
    return lvl === 0 ? 'Beta cells release insulin when blood sugar rises. Non-stop sugar spikes overwork them.'
      : (ir > 0.5 ? 'Cells have stopped answering insulin (resistance). Sugar can’t get in, so it stays in the blood — the road to type 2 diabetes. Exercise and less sugar can reverse early resistance.' : 'Insulin fits its receptor like a key, opening a gate so sugar (glucose) can enter and be used as energy.'); },
};

/* ================= TEETH ================= */
MICRO.teeth = {
  title: 'Teeth & Enamel', lv: ['Enamel & plaque bacteria', 'Acid dissolving minerals'],
  init(st) { const r = rr(111); st.b = []; for (let i = 0; i < 16; i++) st.b.push({ x: r() * 100, y: 20 + r() * 12, a: r() * 3 }); st.ac = []; for (let i = 0; i < 18; i++) st.ac.push({ x: r() * 100, y: r() * 30, p: r() }); st.ion = []; },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, dec = clamp(1 - d.dental / 100), clean = v.brush;
    if (lvl === 0) {
      bg(g, '#3a4a6a', '#4a5a7a');
      for (let x = 0; x < 100; x += 6) { g.beginPath(); g.roundRect(x + 0.5, 34, 5, 66, 2.4); g.fillStyle = '#f6f4ea'; g.fill(); g.strokeStyle = 'rgba(180,170,140,.5)'; g.lineWidth = 0.3; g.stroke(); }
      const holeW = 18 * dec * 2.6; if (dec > 0.08) { ellipse(g, 50, 34, holeW, 3 + dec * 28, 0, '#3a2210', '#7a5a2a', 0.6); }
      const nb = Math.round((clean ? 3 : 12) * (0.4 + clamp(v.sugarN, 0, 2) * 0.6)); st.b.slice(0, Math.min(16, nb)).forEach(b => { ellipse(g, b.x, b.y + Math.sin(t + b.a) * 1, 3, 1.4, b.a, '#9ad66a', '#e8ffd0', 0.3); });
      const nA = Math.round(dec * 14 + clamp(v.sugarN, 0, 3) * 2); st.ac.slice(0, Math.min(18, nA)).forEach(a => { a.p += dt * 0.5; if (a.p > 1) a.p = 0; spiky(g, a.x, 14 + a.p * 22, 1.5, '#ff4a4a', 5); });
      txt(g, clean ? 'brushing clears plaque bacteria' : 'plaque bacteria + sugar = acid', 50, 8, '#e0f0ff', 3);
      txt(g, 'enamel rods', 50, 96, '#3a4a60', 3);
    } else {
      bg(g, '#2a2a44', '#3a3a60');
      for (let i = 0; i < 7; i++) for (let j = 0; j < 5; j++) { const x = 10 + i * 13 + (j % 2) * 6, y = 52 + j * 10; const gone = ((i * 7 + j * 3) % 10) / 10 < dec * 1.3 && j < 3; if (!gone) { g.save(); g.translate(x, y); g.rotate(0.5); g.fillStyle = 'rgba(248,245,235,.9)'; g.fillRect(-3.5, -2.2, 7, 4.4); g.restore(); } }
      const nA = Math.round(2 + dec * 12 + clamp(v.sugarN, 0, 3) * 1.5); st.ac.slice(0, Math.min(18, nA)).forEach((a, i) => { a.p += dt * 0.45; if (a.p > 1) a.p = 0; mol(g, a.x, 6 + a.p * 44, 2.1, '#ff4a4a', 'H⁺', '#fff'); if (a.p > 0.8 && dec > 0.1 && i % 2 === 0) st.ion.push({ x: a.x, y: 52, vy: -6 - Math.random() * 6 }); });
      st.ion.forEach(s => { s.y += dt * s.vy; s.x += Math.sin(t * 3 + s.y) * dt * 3; mol(g, s.x, s.y, 1.8, '#ffffff', 'Ca²⁺', '#223'); }); st.ion = st.ion.filter(s => s.y > 0).slice(-30);
      txt(g, 'acid pulls calcium out of enamel crystals', 50, 94, '#ffd8d8', 2.8);
    }
  },
  cap(lvl, d) { const dec = clamp(1 - d.dental / 100);
    return lvl === 0 ? (dec < 0.15 ? 'Smooth, tightly packed enamel rods. Brushing and flossing remove plaque before it makes acid.' : 'Bacteria eat sugar and make acid that eats a hole (cavity) through enamel. Nerves in the tooth below start to feel it.')
      : 'Enamel is crystals of calcium minerals. Acid (H⁺) dissolves them — saliva, fluoride and brushing help rebuild.'; },
};

/* ================= FAT ================= */
MICRO.fat = {
  title: 'Body Fat Tissue', lv: ['Fat cells', 'Fat molecules & signals'],
  init(st) { const r = rr(121); st.c = []; for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) st.c.push({ x: 14 + x * 24 + (y % 2) * 8, y: 14 + y * 24, j: r() }); st.sig = []; for (let i = 0; i < 12; i++) st.sig.push({ x: r() * 100, y: r() * 100, p: r() }); },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, f = clamp((v.fatPct - 8) / 36), infl = clamp((v.fatPct - 24) / 18);
    if (lvl === 0) {
      bg(g, '#7a5a1a', '#a07a28');
      st.c.forEach((c, i) => { const r0 = 7 + 7 * f; disc(g, c.x, c.y, r0, 'rgba(250,224,120,.9)', '#fff2b0', 0.6); disc(g, c.x + r0 * 0.7, c.y, 1.5, '#7a3070'); });
      ln(g, 0, 50, 100, 50, '#d62e3c', 0.8); ln(g, 50, 0, 50, 100, '#d62e3c', 0.8);
      st.sig.slice(0, Math.round(infl * 12)).forEach(s => { s.p += dt * 0.3; if (s.p > 1) s.p = 0; spiky(g, (s.x + s.p * 20) % 100, (s.y + s.p * 15) % 100, 1.7, '#ff5a3a', 6); });
      txt(g, infl > 0.3 ? 'extra fat releases inflammation signals' : 'fat cells store energy & cushion organs', 50, 97, '#fff6d0', 2.9);
    } else {
      bg(g, '#40300f', '#5a4416');
      g.save(); g.translate(50, 44); g.rotate(Math.sin(t * 0.4) * 0.1);
      ln(g, 0, -12, 0, 12, '#ffd24a', 3); [-12, 0, 12].forEach((y, i) => { g.beginPath(); g.moveTo(0, y); for (let k = 1; k <= 12; k++) g.lineTo(k * 3.2, y + Math.sin(k * 1.3 + i + t * 2) * 2.2); g.strokeStyle = ['#f0a33a', '#f0e04a', '#f08a4a'][i]; g.lineWidth = 2; g.stroke(); });
      g.restore(); txt(g, 'triglyceride: glycerol + 3 fatty acids', 50, 74, '#fff0b0', 2.9);
      txt(g, 'stored when energy in > energy out', 50, 90, '#ffe9a0', 2.9);
    }
  },
  cap(lvl, d) { const f = d.vis.fatPct;
    return lvl === 0 ? (f > 30 ? 'Bigger fat cells crowd the tissue and release inflammation signals; fat packed around organs (visceral) is the riskiest.' : 'Fat cells are tiny storage tanks. Some fat is essential for energy, hormones and cushioning.')
      : 'Extra calories from sugar and fat are packaged as triglycerides inside fat cells. Exercise and balanced eating burn them back for fuel.'; },
};

/* ================= BLOOD ================= */
MICRO.blood = {
  title: 'Blood', lv: ['Blood cells', 'Sugar sticking to hemoglobin'],
  init(st) { const r = rr(131); st.r = []; for (let i = 0; i < 22; i++) st.r.push({ x: r() * 100, y: 10 + r() * 80, s: 5 + r() * 2.5, rot: r() * 3 }); st.w = []; for (let i = 0; i < 4; i++) st.w.push({ x: r() * 100, y: 15 + r() * 70 }); st.p = []; for (let i = 0; i < 12; i++) st.p.push({ x: r() * 100, y: r() * 100 }); st.gl = []; for (let i = 0; i < 40; i++) st.gl.push({ x: r() * 100, y: r() * 100, ph: r() * 6 }); st.vir = []; for (let i = 0; i < 12; i++) st.vir.push({ x: r() * 100, y: r() * 100, a: r() * 6 }); },
  draw(g, t, dt, d, st, lvl) {
    const v = d.vis, thick = clamp(v.dehyd);
    if (lvl === 0) {
      bg(g, '#7a2030', '#9a2c40'); const spd = 12 * (1 - thick * 0.5) * (v.pollution * 0 + 1);
      const nr = Math.round(14 + thick * 8); st.r.slice(0, nr).forEach(c => { c.x += dt * spd; if (c.x > 108) c.x = -8; rbc(g, c.x, c.y + Math.sin(t + c.x * 0.1) * 1.5, c.s, c.rot + t * 0.5, mixCss('#e63a48', '#8a1a2c', clamp((98 - d.spo2) / 8))); });
      const nw = Math.round(2 + (d.immune / 100) * 2 + v.sick * 3); st.w.slice(0, Math.min(4, nw)).forEach((w, i) => { w.x += dt * spd * 0.6; if (w.x > 108) w.x = -10; disc(g, w.x, w.y, 7.5, 'rgba(240,240,255,.9)', '#fff', 0.6); disc(g, w.x - 1.5, w.y, 3.2, '#6a58b8'); disc(g, w.x + 2.5, w.y - 1, 2.4, '#6a58b8'); });
      st.p.forEach(p => { p.x += dt * spd; if (p.x > 104) p.x = -4; disc(g, p.x, p.y, 1.4, '#f6c06a'); });
      const ng = Math.round(clamp((d.glucose - 70) / 100) * 40); st.gl.slice(0, ng).forEach(s => { s.x += dt * 3; if (s.x > 104) s.x = -4; hexa(g, s.x, s.y + Math.sin(t + s.ph) * 1.5, 1.5, '#fff3d0', '#a98'); });
      if (v.sick > 0.5) st.vir.forEach(vr => { vr.x += Math.sin(t + vr.a) * dt * 6; vr.y += Math.cos(t * 0.7 + vr.a) * dt * 6; spiky(g, ((vr.x % 100) + 100) % 100, ((vr.y % 100) + 100) % 100, 2.4, '#7aff6a', 8); });
      txt(g, v.sick > 0.5 ? 'white blood cells fight viruses (green)' : thick > 0.3 ? 'thick blood: cells crowd (dehydrated)' : 'red cells carry oxygen · white cells defend', 50, 96, '#ffe3e8', 2.9);
    } else {
      bg(g, '#241a38', '#3a2a50');
      disc(g, 50, 50, 22, '#c8303c', '#ff9aa6', 1); txt(g, 'hemoglobin', 50, 50, '#fff', 3.4);
      const sug = Math.round(clamp((d.a1c - 4.8) / 3.2) * 10); for (let i = 0; i < sug; i++) { const a = i * TAU / 10 + t * 0.2; hexa(g, 50 + Math.cos(a) * 25, 50 + Math.sin(a) * 25, 2.7, '#fff3d0', '#a98'); }
      st.gl.slice(0, 14).forEach(s => { s.x += Math.sin(t + s.ph) * dt * 4; s.y += Math.cos(t * 0.8 + s.ph) * dt * 4; if (Math.hypot(s.x - 50, s.y - 50) > 26) hexa(g, ((s.x % 100) + 100) % 100, ((s.y % 100) + 100) % 100, 1.9, 'rgba(255,243,208,.7)', '#a98'); });
      txt(g, 'sugar sticks to hemoglobin → HbA1c ' + d.a1c.toFixed(1) + '%', 50, 92, '#ffe9c8', 3);
    }
  },
  cap(lvl, d) { const v = d.vis;
    return lvl === 0 ? (v.sick > 0.5 ? 'Flu viruses (green) are circulating; extra white blood cells arrive to fight them — that’s why you feel sick and run a fever.' : v.dehyd > 0.3 ? 'With too little water, blood becomes thick and cells crowd together, so the heart has to push harder.' : 'Red blood cells (oxygen taxis), white blood cells (defenders), platelets (patches) and sugar float in plasma.')
      : 'The more sugar in the blood, the more sticks to hemoglobin. Doctors measure this HbA1c to learn about the last ~3 months of blood sugar.'; },
};

/* ---------- renderer used by lens and by the big scope panel ---------- */
const microState = {};
function drawMicro(ctx, key, lvl, size, t, dt, d, fade = 1) {
  const sc = MICRO[key]; if (!sc) return;
  const id = key + ':' + lvl;
  let st = microState[id]; if (!st) { st = microState[id] = {}; sc.init(st, lvl); }
  ctx.save(); ctx.setTransform(size / 100, 0, 0, size / 100, 0, 0);
  ctx.globalAlpha = fade; sc.draw(ctx, t, dt, d, st, lvl); ctx.restore();
}
function setBeatPhase(p) { _beatPhase = p; }
