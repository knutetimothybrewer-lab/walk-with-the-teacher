/* ============================================================
   BODY (part 1) — procedural 3D anatomy built from primitives.
   Facing +z, y up, feet at y=0, ~1.78 m tall. Coordinates are
   "rest pose, absolute"; helpers convert to joint-local space.
   ============================================================ */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const SIDES = [1, -1]; // +x = person's left (as seen from camera at +z)

const LAYER_NAMES = ['skin', 'fat', 'muscle', 'bone', 'organ', 'vessel', 'nerve'];

function hash3(x, y, z) {
  const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
function noise3(x, y, z) { // smooth-ish value noise
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  let r = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 0; dy < 2; dy++) for (let dz = 0; dz < 2; dz++) {
    const wt = (dx ? u : 1 - u) * (dy ? v : 1 - v) * (dz ? w : 1 - w);
    r += wt * hash3(xi + dx, yi + dy, zi + dz);
  }
  return r;
}

function softTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, inner); gr.addColorStop(0.45, inner.replace(/[\d.]+\)$/, '0.55)')); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function textTexture(txt, color = '#bfe9ff') {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.font = 'bold 44px system-ui,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = color; g.shadowColor = color; g.shadowBlur = 8; g.fillText(txt, 32, 34);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/* lathe of a tapered limb: radius function r(t) with t=0 at top (joint), 1 at bottom */
function latheGeo(len, fn, steps = 18, seg = 22) {
  const pts = [];
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    pts.push(new THREE.Vector2(Math.max(0.0005, fn(t)), -t * len));
  }
  return new THREE.LatheGeometry(pts, seg);
}
function roundEnds(r0, r1, len, bulge = 0, bAt = 0.35) {
  const e = Math.min(0.35, Math.max(r0, r1) / len);
  return t => {
    let r = r0 + (r1 - r0) * t + bulge * Math.sin(Math.PI * clamp((t - 0.05) / 0.9)) ** 1.5 * (1 - Math.abs(t - bAt));
    const cap = t < e ? Math.sqrt(Math.max(0, 1 - ((e - t) / e) ** 2)) : t > 1 - e ? Math.sqrt(Math.max(0, 1 - ((t - (1 - e)) / e) ** 2)) : 1;
    return r * cap;
  };
}
function lathePath(points, seg = 28, sub = 4) { // points: [y, r] (y ascending); smooth with catmull
  const cr = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[1], p[0], 0)), false, 'catmullrom', 0.5);
  const sampled = cr.getPoints(points.length * sub);
  return new THREE.LatheGeometry(sampled.map(p => new THREE.Vector2(Math.max(0.0008, p.x), p.y)), seg);
}

const UNIT_SPHERE = new THREE.SphereGeometry(1, 28, 20);

function createBody() {
  const root = new THREE.Group();   // pose + lie-down orientation
  const bodyRoot = new THREE.Group(); // height scale + hop/bob
  root.add(bodyRoot);
  bodyRoot.userData.abs = V3(0, 0, 0);

  const reg = { skin: [], fat: [], muscle: [], bone: [], organ: [], vessel: [], nerve: [] };
  const pickables = [];
  const layerOp = { skin: 0.14, fat: 0, muscle: 0, bone: 0.7, organ: 1, vessel: 1, nerve: 0 };
  const curOp = Object.assign({}, layerOp);
  const mats = {};

  const mk = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.0 }, o));
  mats.skin = mk('#e8b99a', { roughness: 0.62 });
  mats.hair = mk('#3a2a20', { roughness: 0.8 });
  mats.fat = mk('#f2d46a', { roughness: 0.7 });
  mats.muscle = mk('#b3303a', { roughness: 0.5 });
  mats.bone = mk('#efe6cf', { roughness: 0.55 });
  mats.skull = mk('#efe6cf', { roughness: 0.55 });
  mats.boneSoft = mk('#efe6cf', { roughness: 0.55 });
  mats.lung = mk('#ee93a0', { roughness: 0.6, vertexColors: true });
  mats.heart = mk('#c92b3c', { roughness: 0.45, emissive: '#400008', emissiveIntensity: 0.3 });
  mats.liver = mk('#7d2f2b', { roughness: 0.5 });
  mats.stomach = mk('#e39988', { roughness: 0.5 });
  mats.gut = mk('#e8a89c', { roughness: 0.5 });
  mats.colon = mk('#d98f86', { roughness: 0.55 });
  mats.kidney = mk('#8c2e3a', { roughness: 0.45 });
  mats.pancreas = mk('#efc678', { roughness: 0.55, emissive: '#ff8a00', emissiveIntensity: 0 });
  mats.bladder = mk('#f7e88a', { roughness: 0.3 });
  mats.brain = mk('#eaa9b8', { roughness: 0.6 });
  mats.artery = mk('#d7353f', { roughness: 0.4, emissive: '#500000', emissiveIntensity: 0.25 });
  mats.vein = mk('#4a63c9', { roughness: 0.4, emissive: '#101a50', emissiveIntensity: 0.2 });
  mats.plaque = mk('#f0d36f', { roughness: 0.7, emissive: '#6a4800', emissiveIntensity: 0.25 });
  mats.nerve = mk('#ffe58a', { roughness: 0.4, emissive: '#aa8a10', emissiveIntensity: 0.6 });
  mats.teeth = mk('#fbfbf3', { roughness: 0.25 });
  mats.cavity = mk('#3a2210', { roughness: 0.7 });
  mats.visceral = mk('#f5d867', { roughness: 0.6 });
  mats.eyeW = mk('#ffffff', { roughness: 0.2 });
  mats.iris = mk('#3a4a63', { roughness: 0.3 });
  mats.mouth = mk('#7a2d33', { roughness: 0.5 });
  mats.dark = new THREE.MeshBasicMaterial({ color: '#5b3a5a', transparent: true, opacity: 0, depthWrite: false });
  mats.wrinkle = new THREE.MeshBasicMaterial({ color: '#6a4030', transparent: true, opacity: 0, depthWrite: false });
  mats.spot = new THREE.MeshBasicMaterial({ color: '#5a3820', transparent: true, opacity: 0, depthWrite: false });
  mats.blush = new THREE.MeshBasicMaterial({ color: '#ff5a5a', transparent: true, opacity: 0, depthWrite: false });

  function register(layer, mesh, o = {}) {
    const m = mesh.material;
    mesh.userData.layer = layer;
    mesh.userData.base = o.base == null ? 1 : o.base;
    mesh.userData.pick = o.pick || null;
    mesh.userData.soft = !!o.soft;
    mesh.userData.hit = !!o.hit;
    if (layer === 'skin') mesh.renderOrder = 20;
    else if (layer === 'fat') mesh.renderOrder = 15;
    else if (layer === 'muscle') mesh.renderOrder = 10;
    reg[layer].push(mesh);
    if (o.pick) pickables.push(mesh);
    return mesh;
  }
  const meshOf = (geo, mat) => new THREE.Mesh(geo, mat);

  function joint(parent, abs) {
    const g = new THREE.Group();
    g.userData.abs = V3(abs[0], abs[1], abs[2]);
    g.position.copy(g.userData.abs).sub(parent.userData.abs);
    parent.add(g); return g;
  }
  const loc = (j, a) => V3(a[0], a[1], a[2]).sub(j.userData.abs);
  function put(j, mesh, a) { mesh.position.copy(loc(j, a)); j.add(mesh); return mesh; }
  function ell(j, a, r, mat, layer, o = {}) {
    const m = meshOf(UNIT_SPHERE, mat); m.scale.set(r[0], r[1], r[2]);
    m.userData.bs = V3(r[0], r[1], r[2]); m.userData.bp = loc(j, a);
    put(j, m, a); register(layer, m, o); return m;
  }

  /* ---------------- joints ---------------- */
  const J = {};
  J.torso = joint(bodyRoot, [0, 0.93, 0]);
  J.head = joint(J.torso, [0, 1.5, 0]);
  const hipX = 0.09, shX = 0.185;
  for (const s of SIDES) {
    const k = s > 0 ? 'L' : 'R';
    J['sh' + k] = joint(J.torso, [s * shX, 1.43, 0]);
    J['el' + k] = joint(J['sh' + k], [s * (shX + 0.015), 1.14, 0]);
    J['wr' + k] = joint(J['el' + k], [s * (shX + 0.02), 0.89, 0]);
    J['hip' + k] = joint(bodyRoot, [s * hipX, 0.93, 0]);
    J['kn' + k] = joint(J['hip' + k], [s * hipX, 0.5, 0]);
    J['an' + k] = joint(J['kn' + k], [s * hipX, 0.09, 0]);
  }

  /* ---------------- skin shells (and fat twin) ---------------- */
  const skinParts = { torso: null, limbs: [], head: null };
  function skinShell(j, a, geo, scaleZ = 1, key = null) {
    const m = meshOf(geo, mats.skin); m.scale.z = scaleZ; m.userData.bsz = scaleZ;
    put(j, m, a); register('skin', m, { pick: 'skin' });
    const f = meshOf(geo, mats.fat); f.scale.z = scaleZ; f.userData.bsz = scaleZ;
    put(j, f, a); register('fat', f, { pick: 'fat' });
    return { skin: m, fat: f };
  }
  // torso
  const torsoGeo = lathePath([[0.82, 0.0], [0.835, 0.05], [0.87, 0.115], [0.92, 0.149], [0.99, 0.15], [1.06, 0.14], [1.13, 0.133], [1.2, 0.146], [1.28, 0.165], [1.37, 0.172], [1.44, 0.158], [1.48, 0.112], [1.505, 0.058], [1.52, 0.0]], 36);
  skinParts.torso = skinShell(J.torso, [0, 0, 0], torsoGeo, 0.62);
  // belly (grows with body fat)
  const belly = meshOf(UNIT_SPHERE, mats.skin); belly.userData.layer = 'skin';
  put(J.torso, belly, [0, 1.06, 0.045]); belly.scale.set(0.001, 0.001, 0.001); register('skin', belly, { pick: 'skin' });
  const bellyFat = meshOf(UNIT_SPHERE, mats.fat); put(J.torso, bellyFat, [0, 1.06, 0.05]); bellyFat.scale.set(0.001, 0.001, 0.001); register('fat', bellyFat, { pick: 'fat' });
  // neck
  const neckGeo = latheGeo(0.12, t => 0.052 * (t < 0.1 ? 0.9 + t : 1) * (1 + 0.15 * t), 6, 18);
  const neck = skinShell(J.head, [0, 1.6, 0], neckGeo, 0.92);
  // head
  const head = meshOf(UNIT_SPHERE, mats.skin); head.scale.set(0.093, 0.118, 0.105);
  put(J.head, head, [0, 1.668, 0]); register('skin', head, { pick: 'skin' });
  const chin = ell(J.head, [0, 1.588, 0.022], [0.052, 0.046, 0.052], mats.skin, 'skin', { pick: 'skin' });
  skinParts.head = head;
  // limbs
  const limbDef = [
    // joint key, top abs y offset, len, rTop, rBot, bulge, bAt, zScale
    ['sh', 1.43, 0.29, 0.056, 0.046, 0.006, 0.3, 1.0],
    ['el', 1.14, 0.25, 0.047, 0.034, 0.006, 0.25, 1.0],
    ['hip', 0.93, 0.43, 0.088, 0.058, 0.01, 0.25, 1.0],
    ['kn', 0.5, 0.41, 0.058, 0.037, 0.016, 0.22, 1.0],
  ];
  const armTop = { sh: 1.43, el: 1.14 };
  for (const s of SIDES) {
    const k = s > 0 ? 'L' : 'R';
    for (const d of limbDef) {
      const j = J[d[0] + k];
      const x = d[0] === 'sh' || d[0] === 'el' ? s * (shX + (d[0] === 'el' ? 0.015 : 0)) : s * hipX;
      const geo = latheGeo(d[2], roundEnds(d[3], d[4], d[2], d[5], d[6]), 16, 20);
      const sh = skinShell(j, [x, d[1], 0], geo, 1);
      skinParts.limbs.push({ ...sh, kind: d[0] });
    }
    // hands (flat, palm forward) + thumb
    const wj = J['wr' + k], hx = s * (shX + 0.02);
    const hand = ell(wj, [hx, 0.835, 0], [0.032, 0.05, 0.014], mats.skin, 'skin', { pick: 'skin' });
    const thumb = ell(wj, [hx + s * 0.03, 0.865, 0.004], [0.011, 0.03, 0.011], mats.skin, 'skin', { pick: 'skin' }); thumb.rotation.z = s * 0.5;
    for (let i = 0; i < 4; i++) { // fingers
      const f = ell(wj, [hx + s * (0.018 - i * 0.012), 0.775 - (i === 1 || i === 2 ? 0.006 : 0), 0], [0.006, 0.032, 0.007], mats.skin, 'skin', { pick: 'skin' });
    }
    // feet
    const aj = J['an' + k], fx = s * hipX;
    const foot = ell(aj, [fx, 0.04, 0.05], [0.04, 0.036, 0.095], mats.skin, 'skin', { pick: 'skin' });
    const heel = ell(aj, [fx, 0.05, -0.02], [0.034, 0.045, 0.04], mats.skin, 'skin', { pick: 'skin' });
    skinParts.limbs.push({ skin: foot, fat: null, kind: 'foot' });
  }

  /* ---------------- face ---------------- */
  const headZ = (x, y) => 0.105 * Math.sqrt(Math.max(0.05, 1 - (x / 0.093) ** 2 - ((y - 1.668) / 0.118) ** 2));
  const face = {};
  face.eyes = []; face.irises = [];
  for (const s of SIDES) {
    const ey = 1.678, ex = s * 0.036;
    const e = ell(J.head, [ex, ey, headZ(ex, ey) - 0.006], [0.0155, 0.0125, 0.01], mats.eyeW, 'skin', { pick: 'skin' });
    const ir = ell(J.head, [ex, ey, headZ(ex, ey) + 0.001], [0.0075, 0.0075, 0.005], mats.iris, 'skin', { pick: 'skin' });
    face.eyes.push(e); face.irises.push(ir);
    // eyebrows
    const br = ell(J.head, [ex, 1.7, headZ(ex, 1.7) + 0.001], [0.021, 0.0035, 0.004], mats.hair, 'skin', { pick: 'skin' }); br.rotation.z = -s * 0.12;
    face.brow = face.brow || []; face.brow.push(br);
    // ears
    ell(J.head, [s * 0.092, 1.665, -0.004], [0.012, 0.026, 0.018], mats.skin, 'skin', { pick: 'skin' });
    // under-eye bags, blush, spots
    const bag = ell(J.head, [ex, 1.656, headZ(ex, 1.656) + 0.0012], [0.02, 0.008, 0.002], mats.dark, 'skin'); face.bags = face.bags || []; face.bags.push(bag);
    const bl = ell(J.head, [s * 0.055, 1.633, headZ(s * 0.055, 1.633) + 0.001], [0.026, 0.017, 0.002], mats.blush, 'skin'); face.blush = face.blush || []; face.blush.push(bl);
    // crow's feet + smile lines
    for (let i = 0; i < 2; i++) {
      const w = ell(J.head, [s * 0.066, 1.684 - i * 0.008, headZ(s * 0.066, 1.684) + 0.0008], [0.011, 0.0008, 0.002], mats.wrinkle, 'skin'); w.rotation.z = s * (0.3 - i * 0.5); face.wr = face.wr || []; face.wr.push(w);
    }
    const nl = ell(J.head, [s * 0.026, 1.617, headZ(s * 0.026, 1.617) + 0.0008], [0.0012, 0.017, 0.002], mats.wrinkle, 'skin'); nl.rotation.z = s * 0.45; face.wr.push(nl);
  }
  for (let i = 0; i < 3; i++) { // forehead lines
    const y = 1.72 + i * 0.011; const w = ell(J.head, [0, y, headZ(0, y) + 0.0008], [0.04 - i * 0.004, 0.0009, 0.002], mats.wrinkle, 'skin'); face.wr.push(w);
  }
  face.spots = [];
  [[-0.05, 1.7], [0.045, 1.725], [-0.062, 1.64], [0.06, 1.655], [0.0, 1.745], [-0.028, 1.735], [0.07, 1.69]].forEach(p => {
    face.spots.push(ell(J.head, [p[0], p[1], headZ(p[0], p[1]) + 0.0008], [0.0055, 0.0055, 0.0015], mats.spot, 'skin'));
  });
  const nose = meshOf(new THREE.ConeGeometry(0.014, 0.034, 12), mats.skin); nose.rotation.x = Math.PI / 2 - 0.25;
  put(J.head, nose, [0, 1.648, headZ(0, 1.648) + 0.012]); register('skin', nose, { pick: 'skin' });
  // mouth (smile ↔ frown)
  const mouth = meshOf(new THREE.TorusGeometry(0.024, 0.0036, 8, 20, Math.PI), mats.mouth);
  mouth.rotation.z = Math.PI; // arc bottom => smile
  const mouthG = new THREE.Group(); mouthG.add(mouth); mouth.position.y = 0.012;
  put(J.head, mouthG, [0, 1.607, headZ(0, 1.607) + 0.001]); register('skin', mouth, { pick: 'skin' }); face.mouth = mouthG;
  // hair
  const hair = meshOf(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.56), mats.hair);
  hair.scale.set(0.099, 0.123, 0.112); hair.rotation.x = -0.28;
  put(J.head, hair, [0, 1.676, -0.003]); register('skin', hair, { pick: 'skin' });
  face.hair = hair;

  /* ---------------- skull, jaw, teeth ---------------- */
  const skull = ell(J.head, [0, 1.676, -0.002], [0.087, 0.108, 0.098], mats.skull, 'bone', { base: 0.42, pick: 'bone', soft: true });
  const jaw = ell(J.head, [0, 1.585, 0.032], [0.064, 0.03, 0.062], mats.boneSoft, 'bone', { base: 0.8, pick: 'bone', soft: true });
  const cheek = [SIDES.map(s => ell(J.head, [s * 0.052, 1.64, 0.062], [0.026, 0.016, 0.02], mats.boneSoft, 'bone', { base: 0.8, soft: true }))];
  const teeth = [], cavities = [];
  for (let i = 0; i < 12; i++) {
    const a = -0.95 + i * (1.9 / 11);
    const x = 0.052 * Math.sin(a), z = 0.032 + 0.055 * Math.cos(a);
    const tm = ell(J.head, [x, 1.592, z], [0.0066, 0.0085, 0.005], mats.teeth, 'organ', { pick: 'teeth' }); tm.rotation.y = a;
    teeth.push(tm);
    const cv = ell(J.head, [x * 1.02, 1.594, z + 0.004 * Math.cos(a)], [0.0034, 0.0034, 0.0024], mats.cavity, 'organ', { pick: 'teeth' }); cv.userData.k = i; cv.scale.multiplyScalar(0.001);
    cavities.push(cv);
  }

  /* ---------------- brain ---------------- */
  function brainGeo(side) {
    const g = new THREE.SphereGeometry(1, 40, 28); const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = noise3(x * 3.2 + side * 5, y * 3.2, z * 3.2) * 0.55 + noise3(x * 7, y * 7 + 3, z * 7) * 0.25;
      const f = 1 + (n - 0.4) * 0.22;
      let nx = x * f, ny = y * f, nz = z * f;
      nx = side * Math.abs(nx) * 0.0 + nx; // keep
      p.setXYZ(i, nx, ny * (y < 0 ? 0.8 : 1), nz);
    }
    g.computeVertexNormals(); return g;
  }
  const brainParts = [];
  for (const s of SIDES) {
    const m = meshOf(brainGeo(s), mats.brain); m.scale.set(0.044, 0.062, 0.084);
    put(J.head, m, [s * 0.0405, 1.688, -0.004]); register('organ', m, { pick: 'brain' }); brainParts.push(m);
  }
  const cerebellum = meshOf(brainGeo(1), mats.brain); cerebellum.scale.set(0.05, 0.026, 0.04);
  put(J.head, cerebellum, [0, 1.62, -0.06]); register('organ', cerebellum, { pick: 'brain' }); brainParts.push(cerebellum);
  const stem = meshOf(new THREE.CylinderGeometry(0.014, 0.011, 0.07, 12), mats.brain);
  put(J.head, stem, [0, 1.585, -0.035]); register('organ', stem, { pick: 'brain' }); stem.rotation.x = 0.35;

  /* ---------------- skeleton ---------------- */
  // spine (curved), ribs, sternum, pelvis, clavicles, scapulae
  const vertebrae = [];
  for (let i = 0; i < 24; i++) {
    const u = i / 23; const y = 0.98 + u * 0.535;
    const zc = -0.058 - 0.02 * Math.sin(u * Math.PI * 2.1 + 0.4) * 0.9 + 0.015 * u; // gentle S-curve
    const size = 0.019 - 0.007 * u;
    const m = meshOf(new THREE.CylinderGeometry(size, size * 1.05, 0.0155, 12), mats.bone);
    m.rotation.x = Math.cos(u * Math.PI * 2.1 + 0.4) * 0.16;
    put(i < 17 ? J.torso : J.torso, m, [0, y, zc]); register('bone', m, { pick: 'bone' });
    m.userData.bs = V3(1, 1, 1); vertebrae.push(m);
    // spinous process (back)
    const sp = ell(J.torso, [0, y + 0.002, zc - size - 0.008], [0.004, 0.005, 0.011], mats.bone, 'bone', { pick: 'bone' });
  }
  const sacrum = ell(J.torso, [0, 0.94, -0.062], [0.032, 0.04, 0.016], mats.bone, 'bone', { pick: 'bone' });
  // ribs
  const ribs = [];
  const ribGapHalf = 0.22;
  for (let i = 0; i < 10; i++) {
    const u = i / 9;
    const y = 1.41 - u * 0.2;
    const rx = [0.075, 0.09, 0.105, 0.118, 0.13, 0.138, 0.14, 0.138, 0.132, 0.12][i];
    const rz = rx * 0.76;
    const start = Math.PI / 2 + ribGapHalf, arc = Math.PI * 2 - ribGapHalf * 2;
    const g = new THREE.TorusGeometry(1, 0.0075, 8, 40, arc);
    g.rotateZ(start); g.rotateX(Math.PI / 2); g.scale(rx, 1, rz);
    const m = meshOf(g, mats.bone); m.userData.rx = rx;
    put(J.torso, m, [0, y, -0.01 + 0.006 * (1 - u)]); m.rotation.x = 0.1 * (u - 0.5);
    register('bone', m, { pick: 'bone', soft: true }); ribs.push(m);
  }
  const sternum = meshOf(new THREE.BoxGeometry(0.036, 0.15, 0.011), mats.bone);
  put(J.torso, sternum, [0, 1.335, 0.098]); register('bone', sternum, { pick: 'bone', soft: true });
  const manub = ell(J.torso, [0, 1.42, 0.092], [0.026, 0.02, 0.008], mats.bone, 'bone', { pick: 'bone', soft: true });
  // pelvis
  for (const s of SIDES) {
    const iliac = ell(J.torso, [s * 0.1, 0.995, -0.01], [0.062, 0.058, 0.03], mats.bone, 'bone', { pick: 'bone' }); iliac.rotation.z = -s * 0.5; iliac.rotation.y = s * 0.35;
    const ischium = ell(J.torso, [s * 0.075, 0.9, 0.0], [0.025, 0.035, 0.03], mats.bone, 'bone', { pick: 'bone' });
    // clavicle + scapula
    const cl = meshOf(new THREE.CylinderGeometry(0.0075, 0.0075, 0.15, 8), mats.bone); cl.rotation.z = Math.PI / 2 - s * 0.14;
    put(J.torso, cl, [s * 0.1, 1.47, 0.045]); register('bone', cl, { pick: 'bone', soft: true });
    const sc = ell(J.torso, [s * 0.1, 1.38, -0.075], [0.045, 0.06, 0.008], mats.bone, 'bone', { pick: 'bone', soft: true });
  }
  const pubis = ell(J.torso, [0, 0.9, 0.05], [0.03, 0.012, 0.012], mats.bone, 'bone', { pick: 'bone' });

  // limb bones
  const boneMeshes = []; // for thickness scaling (x,z)
  function longBone(j, abs, len, r, knob) {
    const geo = latheGeo(len, t => {
      const e = t < 0.1 ? 1 + (0.1 - t) * 6 : t > 0.9 ? 1 + (t - 0.9) * 6 : 1;
      const cap = t < 0.02 ? Math.sqrt(t / 0.02) : t > 0.98 ? Math.sqrt((1 - t) / 0.02) : 1;
      return r * e * cap;
    }, 14, 12);
    const m = meshOf(geo, mats.bone); put(j, m, abs); register('bone', m, { pick: 'bone' }); boneMeshes.push(m);
    return m;
  }
  for (const s of SIDES) {
    const k = s > 0 ? 'L' : 'R';
    longBone(J['sh' + k], [s * (shX + 0.002), 1.425, 0], 0.285, 0.0095);            // humerus
    longBone(J['el' + k], [s * (shX + 0.012), 1.135, 0.006], 0.245, 0.0075);        // radius
    longBone(J['el' + k], [s * (shX + 0.022), 1.135, -0.007], 0.245, 0.0068);       // ulna
    // hand bones
    for (let i = 0; i < 4; i++) longBone(J['wr' + k], [s * (shX + 0.02 + 0.016 - i * 0.011), 0.875, 0], 0.095 + (i === 1 || i === 2 ? 0.008 : 0), 0.0032);
    longBone(J['hip' + k], [s * hipX, 0.925, 0], 0.42, 0.0185);                      // femur
    const femHead = ell(J['hip' + k], [s * (hipX - 0.035), 0.935, 0], [0.019, 0.019, 0.019], mats.bone, 'bone', { pick: 'bone' });
    longBone(J['kn' + k], [s * hipX, 0.495, 0.005], 0.4, 0.0145);                    // tibia
    longBone(J['kn' + k], [s * (hipX + 0.025), 0.49, -0.012], 0.38, 0.0075);        // fibula
    const pat = ell(J['hip' + k], [s * hipX, 0.51, 0.03], [0.02, 0.022, 0.012], mats.bone, 'bone', { pick: 'bone' });
    // foot bones
    ell(J['an' + k], [s * hipX, 0.045, 0.05], [0.026, 0.018, 0.075], mats.bone, 'bone', { pick: 'bone' });
    ell(J['an' + k], [s * hipX, 0.052, -0.022], [0.022, 0.026, 0.028], mats.bone, 'bone', { pick: 'bone' });
  }
  const boneAll = reg.bone; // thickness handled via bone material colour/opacity + group scaling (cheap)

  /* ---------------- muscles ---------------- */
  const muscles = [];
  const mus = (j, a, r, tilt = [0, 0, 0], tag = 'gen') => {
    const m = ell(j, a, r, mats.muscle, 'muscle', { pick: 'muscle' }); m.rotation.set(tilt[0], tilt[1], tilt[2]); m.userData.tag = tag; muscles.push(m); return m;
  };
  for (const s of SIDES) {
    const k = s > 0 ? 'L' : 'R';
    mus(J.torso, [s * 0.075, 1.325, 0.078], [0.082, 0.056, 0.036], [0, 0, s * -0.18], 'chest');
    mus(J.torso, [s * 0.128, 1.13, 0.04], [0.03, 0.085, 0.05], [0, 0, 0], 'core');
    mus(J.torso, [s * 0.11, 1.27, -0.07], [0.07, 0.125, 0.03], [0, 0, s * -0.12], 'back');
    mus(J.torso, [s * 0.055, 1.455, -0.05], [0.09, 0.05, 0.03], [0, 0, s * 0.3], 'back');
    mus(J.torso, [s * 0.075, 0.945, -0.085], [0.078, 0.07, 0.06], [0, 0, 0], 'glute');
    for (let i = 0; i < 3; i++) mus(J.torso, [s * 0.031, 1.065 + i * 0.05, 0.1], [0.028, 0.021, 0.019], [0, 0, 0], 'abs');
    // deltoid, biceps, triceps, forearm
    mus(J['sh' + k], [s * (shX + 0.005), 1.41, 0], [0.052, 0.06, 0.05], [0, 0, 0], 'delt');
    mus(J['sh' + k], [s * (shX + 0.003), 1.285, 0.022], [0.034, 0.1, 0.03], [0, 0, 0], 'bicep');
    mus(J['sh' + k], [s * (shX + 0.003), 1.27, -0.026], [0.034, 0.105, 0.03], [0, 0, 0], 'tricep');
    mus(J['el' + k], [s * (shX + 0.02), 1.04, 0.003], [0.034, 0.1, 0.032], [0, 0, 0], 'forearm');
    mus(J['hip' + k], [s * hipX, 0.74, 0.02], [0.068, 0.2, 0.062], [0, 0, 0], 'quad');
    mus(J['hip' + k], [s * hipX, 0.74, -0.026], [0.062, 0.19, 0.05], [0, 0, 0], 'ham');
    mus(J['kn' + k], [s * hipX, 0.34, -0.018], [0.042, 0.115, 0.04], [0, 0, 0], 'calf');
    mus(J['kn' + k], [s * hipX, 0.32, 0.022], [0.026, 0.1, 0.018], [0, 0, 0], 'calf');
  }

  /* ---------------- organs ---------------- */
  // lungs
  function lungGeo(side) {
    const g = new THREE.SphereGeometry(1, 36, 28); const p = g.attributes.position; const n = p.count;
    const dark = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const taper = y > 0 ? 1 - 0.38 * y * y : 1 + 0.12 * -y;
      x *= taper; z *= taper;
      if (x * -side > 0) x *= 0.82;                       // flatten inner side (medial)
      if (side > 0 && y < -0.1 && x < 0) x *= 0.8;       // left lung cardiac notch
      const f = 1 + (noise3(x * 2.6, y * 2.6, z * 2.6) - 0.5) * 0.08;
      p.setXYZ(i, x * f, y * f, z * f);
      dark[i] = noise3(x * 4.3 + 9, y * 4.3, z * 4.3) * 0.7 + noise3(x * 9, y * 9, z * 9) * 0.3;
    }
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    g.userData.dark = dark; g.computeVertexNormals(); return g;
  }
  const lungs = [];
  const lungGroup = new THREE.Group(); put(J.torso, lungGroup, [0, 1.335, 0.0]); lungGroup.userData.abs = V3(0, 1.335, 0);
  for (const s of SIDES) {
    const geo = lungGeo(s);
    const m = meshOf(geo, mats.lung); m.scale.set(0.064, 0.108, 0.06);
    m.position.set(s * 0.082, 0, -0.014); lungGroup.add(m); register('organ', m, { pick: 'lungs' }); lungs.push(m);
  }
  // trachea + bronchi
  const bronchi = new THREE.Group(); lungGroup.add(bronchi);
  const bronMat = mk('#e6b4bb', { roughness: 0.4 });
  const bronMeshes = [];
  const tube = (pts, r, mat, seg = 24, rad = 8) => meshOf(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(p[0], p[1], p[2]))), seg, r, rad, false), mat);
  const trachea = tube([[0, 0.17, 0.01], [0, 0.06, 0.008], [0, 0.0, 0.006]], 0.0095, bronMat, 10); bronchi.add(trachea); register('organ', trachea, { pick: 'lungs' }); bronMeshes.push(trachea);
  for (const s of SIDES) {
    const main = tube([[0, 0, 0.006], [s * 0.025, -0.02, 0.004], [s * 0.05, -0.05, 0.0]], 0.0065, bronMat, 10); bronchi.add(main); register('organ', main, { pick: 'lungs' }); bronMeshes.push(main);
    [[0.065, 0.02], [0.075, -0.04], [0.07, -0.085]].forEach((b, i) => {
      const br = tube([[s * 0.04, -0.045, 0.0], [s * b[0] * 0.8, b[1] * 0.4 - 0.04, 0.005 * (i - 1)], [s * b[0], b[1], 0.01 * (i - 1)]], 0.0035, bronMat, 8, 6);
      bronchi.add(br); register('organ', br, { pick: 'lungs' }); bronMeshes.push(br);
    });
  }
  // tar/soot particles on lungs
  const SOOT_N = 260;
  const sootPos = new Float32Array(SOOT_N * 3), sootSeed = [];
  for (let i = 0; i < SOOT_N; i++) {
    const side = i % 2 ? 1 : -1;
    const th = Math.acos(2 * Math.random() - 1), ph = Math.random() * Math.PI * 2;
    const x = Math.sin(th) * Math.cos(ph), y = Math.cos(th), z = Math.sin(th) * Math.sin(ph);
    sootSeed.push({ side, x, y, z });
    const taper = y > 0 ? 1 - 0.38 * y * y : 1;
    sootPos[i * 3] = side * 0.082 + x * 0.067 * taper; sootPos[i * 3 + 1] = y * 0.113; sootPos[i * 3 + 2] = -0.014 + z * 0.063 * taper;
  }
  const sootGeo = new THREE.BufferGeometry(); sootGeo.setAttribute('position', new THREE.BufferAttribute(sootPos, 3));
  const sootMat = new THREE.PointsMaterial({ color: '#1a1412', size: 0.011, transparent: true, opacity: 0.95, depthWrite: false });
  const soot = new THREE.Points(sootGeo, sootMat); sootGeo.setDrawRange(0, 0); lungGroup.add(soot); soot.renderOrder = 3;

  // heart
  const heartG = new THREE.Group(); put(J.torso, heartG, [0.03, 1.29, 0.058]); heartG.userData.abs = V3(0.03, 1.29, 0.058);
  heartG.rotation.z = -0.5; heartG.rotation.y = 0.15;
  const heartParts = [];
  const hp = (r, pos, rot = [0, 0, 0]) => { const m = meshOf(UNIT_SPHERE, mats.heart); m.scale.set(r[0], r[1], r[2]); m.position.set(pos[0], pos[1], pos[2]); m.rotation.set(rot[0], rot[1], rot[2]); heartG.add(m); register('organ', m, { pick: 'heart' }); heartParts.push(m); return m; };
  hp([0.04, 0.056, 0.04], [0.004, -0.005, 0.0]);
  hp([0.032, 0.046, 0.034], [-0.034, 0.002, 0.012]);
  hp([0.026, 0.022, 0.024], [0.027, 0.045, -0.005]);
  hp([0.025, 0.022, 0.024], [-0.04, 0.04, 0.0]);
  const heartTube = (pts, r, mat) => { const m = tube(pts, r, mat, 16, 10); heartG.add(m); register('organ', m, { pick: 'heart' }); return m; };
  heartTube([[0.012, 0.05, 0.0], [0.008, 0.085, -0.004], [-0.02, 0.1, -0.02], [-0.03, 0.06, -0.035]], 0.0145, mats.artery);

  // coronary arteries (thin, on heart surface)
  const coronaries = [];
  for (const pts of [[[-0.02, 0.05, 0.03], [0.0, 0.015, 0.045], [-0.005, -0.03, 0.04]], [[0.012, 0.05, 0.028], [0.03, 0.02, 0.03], [0.035, -0.02, 0.02]]]) {
    const m = tube(pts, 0.0032, mats.artery, 12, 6); heartG.add(m); register('organ', m, { pick: 'vessels' }); coronaries.push({ mesh: m, pts });
  }

  // liver, stomach, pancreas, kidneys, bladder
  const liver = ell(J.torso, [-0.06, 1.145, 0.025], [0.098, 0.06, 0.07], mats.liver, 'organ', { pick: 'liver' }); liver.rotation.z = 0.18;
  const liverB = ell(J.torso, [0.02, 1.12, 0.035], [0.05, 0.045, 0.05], mats.liver, 'organ', { pick: 'liver' });
  const gall = ell(J.torso, [-0.05, 1.095, 0.065], [0.014, 0.022, 0.014], mk('#5da35e'), 'organ', { pick: 'liver' });
  const stomach = ell(J.torso, [0.075, 1.12, 0.035], [0.056, 0.07, 0.048], mats.stomach, 'organ', { pick: 'stomach' }); stomach.rotation.z = -0.55;
  const stomach2 = ell(J.torso, [0.035, 1.075, 0.04], [0.034, 0.03, 0.03], mats.stomach, 'organ', { pick: 'stomach' });
  const pancreas = tube([[-0.04, 1.05, -0.02], [0.0, 1.065, -0.012], [0.05, 1.075, -0.02], [0.095, 1.09, -0.035]], 0.0125, mats.pancreas, 14, 8);
  J.torso.add(pancreas); pancreas.position.sub(J.torso.userData.abs); register('organ', pancreas, { pick: 'pancreas' });
  const kidneys = [];
  for (const s of SIDES) {
    const kd = ell(J.torso, [s * 0.062, 1.12, -0.058], [0.027, 0.045, 0.02], mats.kidney, 'organ', { pick: 'kidney' }); kd.rotation.z = s * 0.2; kidneys.push(kd);
  }
  const bladder = ell(J.torso, [0, 0.9, 0.045], [0.034, 0.034, 0.032], mats.bladder, 'organ', { pick: 'kidney' });
  const visceral = ell(J.torso, [0, 1.0, 0.075], [0.001, 0.001, 0.001], mats.visceral, 'organ', { pick: 'fat' });

  // intestines (instanced beads, peristalsis)
  const sPath = [];
  { // snaking small intestine path in a box
    const rows = 7, cols = 5;
    const x0 = -0.075, x1 = 0.075, y0 = 0.925, y1 = 1.045;
    let dir = 1;
    for (let r = 0; r < rows; r++) {
      const y = lerp(y0, y1, r / (rows - 1));
      for (let c = 0; c < cols; c++) {
        const cc = dir > 0 ? c : cols - 1 - c;
        sPath.push([lerp(x0, x1, cc / (cols - 1)), y + 0.008 * Math.sin(c * 2), 0.03 + 0.016 * Math.sin(r * 1.7 + c)]);
      }
      dir *= -1;
    }
  }
  const sCurve = new THREE.CatmullRomCurve3(sPath.map(p => V3(p[0], p[1], p[2])), false, 'catmullrom', 0.5);
  const BEADS = 220;
  const beadGeo = new THREE.SphereGeometry(1, 12, 10);
  const smallInt = new THREE.InstancedMesh(beadGeo, mats.gut, BEADS);
  const beadPos = []; for (let i = 0; i < BEADS; i++) beadPos.push(sCurve.getPointAt(i / (BEADS - 1)));
  smallInt.userData.layer = 'organ'; smallInt.userData.base = 1; smallInt.userData.pick = 'gut';
  const siHolder = new THREE.Group(); siHolder.add(smallInt); put(J.torso, siHolder, [0, 0, 0]); siHolder.position.set(0, -0.93, 0);
  reg.organ.push(smallInt); pickables.push(smallInt);
  const colon = tube([[-0.11, 0.93, 0.0], [-0.115, 1.03, 0.015], [-0.1, 1.085, 0.03], [0.0, 1.095, 0.045], [0.1, 1.085, 0.03], [0.115, 1.03, 0.015], [0.105, 0.95, 0.0], [0.07, 0.9, -0.02], [0.03, 0.88, 0.0]], 0.0175, mats.colon, 60, 10);
  J.torso.add(colon); colon.position.sub(J.torso.userData.abs); register('organ', colon, { pick: 'gut' });

  /* ---------------- vessels & nerves ---------------- */
  const vessels = [];     // {j, curve, kind, pts, count, mesh, pos, u, speed}
  const lumps = [];       // plaque lumps
  const flowTex = softTexture();
  function addVessel(j, pts, kind, radius) {
    const local = pts.map(p => loc(j, p));
    const curve = new THREE.CatmullRomCurve3(local, false, 'catmullrom', 0.5);
    const geo = new THREE.TubeGeometry(curve, Math.max(10, pts.length * 8), radius, 8, false);
    const mat = kind === 'a' ? mats.artery : kind === 'v' ? mats.vein : mats.nerve;
    const m = meshOf(geo, mat); j.add(m);
    register(kind === 'n' ? 'nerve' : 'vessel', m, { pick: kind === 'n' ? 'brain' : 'vessels' });
    const hitGeo = new THREE.TubeGeometry(curve, Math.max(6, pts.length * 4), radius * 3, 5, false);
    const hit = meshOf(hitGeo, new THREE.MeshBasicMaterial({ visible: false })); j.add(hit);
    register(kind === 'n' ? 'nerve' : 'vessel', hit, { pick: kind === 'n' ? 'brain' : 'vessels', hit: true });
    const len = curve.getLength();
    const count = Math.max(4, Math.round(len * (kind === 'n' ? 90 : 150)));
    const samples = curve.getPoints(60);
    const arr = new Float32Array(count * 3), u = new Float32Array(count);
    for (let i = 0; i < count; i++) u[i] = Math.random();
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pm = new THREE.PointsMaterial({ size: kind === 'n' ? 0.016 : 0.0125, map: flowTex, color: kind === 'a' ? '#ff4455' : kind === 'v' ? '#6f86ff' : '#fff3a0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
    const pts3 = new THREE.Points(g, pm); pts3.frustumCulled = false; pts3.renderOrder = 4; j.add(pts3);
    const v = { j, curve, kind, len, count, samples, arr, u, geo: g, pm, mesh: m, layerObj: pts3, speed: 0.6 + Math.random() * 0.2 };
    vessels.push(v); return v;
  }
  function lumpOn(v, u, size = 1) {
    const p = v.curve.getPointAt(u);
    const m = meshOf(UNIT_SPHERE, mats.plaque); m.position.copy(p); m.scale.setScalar(0.001);
    m.userData.size = size; m.userData.layer = 'vessel'; m.userData.base = 1; m.userData.pick = 'vessels';
    v.j.add(m); reg.vessel.push(m); pickables.push(m); lumps.push(m); return m;
  }
  const X = (s, x) => s * x;
  // aorta (flow direction: heart -> down)
  const aorta = addVessel(J.torso, [[0.03, 1.33, 0.02], [0.034, 1.395, 0.0], [0.005, 1.425, -0.02], [-0.02, 1.395, -0.044], [-0.018, 1.3, -0.052], [-0.01, 1.15, -0.052], [0.0, 1.0, -0.046], [0.0, 0.96, -0.044]], 'a', 0.0125);
  lumpOn(aorta, 0.28, 1.5); lumpOn(aorta, 0.6, 1.2); lumpOn(aorta, 0.85, 1.4); lumpOn(aorta, 0.45, 1.0);
  // vena cava (flow upward -> heart)
  addVessel(J.torso, [[-0.012, 0.96, -0.036], [-0.026, 1.1, -0.04], [-0.032, 1.25, -0.03], [-0.025, 1.34, 0.0], [-0.012, 1.35, 0.025]], 'v', 0.0115);
  // spinal cord / nerves
  addVessel(J.torso, [[0, 1.52, -0.03], [0, 1.45, -0.06], [0, 1.3, -0.075], [0, 1.1, -0.07], [0, 0.97, -0.06]], 'n', 0.0048);
  const carotids = [];
  for (const s of SIDES) {
    const k = s > 0 ? 'L' : 'R';
    // carotid in head joint (flow up)
    const car = addVessel(J.head, [[s * 0.012, 1.505, 0.005], [s * 0.034, 1.54, 0.012], [s * 0.034, 1.6, 0.014], [s * 0.04, 1.65, 0.012], [s * 0.03, 1.69, 0.005]], 'a', 0.0065);
    lumpOn(car, 0.28, 1.2); lumpOn(car, 0.5, 1.4); carotids.push(car);
    addVessel(J.head, [[s * 0.05, 1.67, -0.02], [s * 0.046, 1.6, -0.01], [s * 0.04, 1.54, -0.015], [s * 0.025, 1.495, -0.005]], 'v', 0.006);
    addVessel(J.torso, [[s * 0.02, 1.405, -0.005], [s * 0.04, 1.452, 0.0]], 'a', 0.0065);
    // arms
    addVessel(J['sh' + k], [[s * 0.04, 1.455, 0.0], [s * 0.15, 1.455, -0.012], [s * 0.19, 1.4, -0.018], [s * 0.2, 1.3, -0.016], [s * 0.2, 1.16, -0.008]], 'a', 0.0058);
    addVessel(J['el' + k], [[s * 0.2, 1.14, -0.008], [s * 0.205, 1.02, 0.0], [s * 0.2, 0.9, 0.012]], 'a', 0.0045);
    addVessel(J['wr' + k], [[s * 0.2, 0.89, 0.012], [s * 0.2, 0.84, 0.014], [s * 0.2, 0.78, 0.01]], 'a', 0.003);
    addVessel(J['wr' + k], [[s * 0.215, 0.82, -0.012], [s * 0.212, 0.89, -0.012]], 'v', 0.0035);
    addVessel(J['el' + k], [[s * 0.222, 0.89, -0.012], [s * 0.222, 1.02, -0.014], [s * 0.214, 1.14, -0.014]], 'v', 0.0045);
    addVessel(J['sh' + k], [[s * 0.214, 1.15, -0.014], [s * 0.212, 1.3, -0.026], [s * 0.185, 1.41, -0.016], [s * 0.1, 1.44, -0.01], [s * 0.04, 1.42, 0.0]], 'v', 0.0055);
    // legs
    const fem = addVessel(J['hip' + k], [[s * 0.012, 0.96, -0.04], [s * 0.05, 0.91, -0.012], [s * 0.078, 0.8, 0.0], [s * 0.088, 0.64, 0.0], [s * 0.09, 0.52, -0.012]], 'a', 0.0085);
    lumpOn(fem, 0.35, 1.2); lumpOn(fem, 0.6, 1.0);
    addVessel(J['kn' + k], [[s * 0.09, 0.5, -0.012], [s * 0.09, 0.32, -0.018], [s * 0.09, 0.14, -0.01]], 'a', 0.006);
    addVessel(J['an' + k], [[s * 0.09, 0.12, -0.01], [s * 0.09, 0.06, 0.03], [s * 0.09, 0.04, 0.08]], 'a', 0.0035);
    addVessel(J['an' + k], [[s * 0.098, 0.05, 0.07], [s * 0.098, 0.07, 0.01], [s * 0.098, 0.12, -0.02]], 'v', 0.0035);
    addVessel(J['kn' + k], [[s * 0.097, 0.13, -0.022], [s * 0.098, 0.3, -0.028], [s * 0.098, 0.5, -0.025]], 'v', 0.0065);
    addVessel(J['hip' + k], [[s * 0.098, 0.52, -0.026], [s * 0.094, 0.66, -0.012], [s * 0.078, 0.82, -0.012], [s * 0.04, 0.92, -0.035], [-s * 0.0 + s * 0.015, 0.97, -0.04]], 'v', 0.009);
    // leg & arm nerves
    addVessel(J['sh' + k], [[s * 0.1, 1.45, -0.03], [s * 0.19, 1.4, -0.03], [s * 0.19, 1.2, -0.02]], 'n', 0.0035);
    addVessel(J['hip' + k], [[s * 0.03, 0.97, -0.05], [s * 0.08, 0.85, -0.03], [s * 0.09, 0.6, -0.03], [s * 0.09, 0.52, -0.02]], 'n', 0.0042);
    addVessel(J['kn' + k], [[s * 0.09, 0.5, -0.02], [s * 0.09, 0.3, -0.03], [s * 0.09, 0.1, -0.02]], 'n', 0.0035);
  }
  // coronary lumps
  const coroLumps = [];
  coronaries.forEach((c, i) => {
    const curve = new THREE.CatmullRomCurve3(c.pts.map(p => V3(p[0], p[1], p[2])));
    [0.35, 0.65].forEach(u => {
      const m = meshOf(UNIT_SPHERE, mats.plaque); m.position.copy(curve.getPointAt(u)); m.scale.setScalar(0.001);
      m.userData.size = 0.55; m.userData.layer = 'vessel'; m.userData.base = 1; m.userData.pick = 'vessels'; m.userData.heartLump = true;
      heartG.add(m); reg.vessel.push(m); pickables.push(m); lumps.push(m);
    });
  });

  /* ---------------- brain sparks ---------------- */
  const SPARKS = 46;
  const sparkMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe36a', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }), SPARKS);
  sparkMesh.frustumCulled = false; sparkMesh.userData.layer = 'organ'; sparkMesh.userData.base = 1; sparkMesh.renderOrder = 5;
  J.head.add(sparkMesh); reg.organ.push(sparkMesh);
  const sparkData = []; for (let i = 0; i < SPARKS; i++) {
    const th = Math.acos(2 * Math.random() - 1), ph = Math.random() * Math.PI * 2;
    sparkData.push({ p: V3(Math.sin(th) * Math.cos(ph) * 0.085, 1.688 - 1.5 + Math.cos(th) * 0.06, Math.sin(th) * Math.sin(ph) * 0.085), t: Math.random() * 6, rate: 1 + Math.random() * 2 });
  }

  /* ---------------- props ---------------- */
  const props = new THREE.Group();
  const chair = new THREE.Group(); props.add(chair);
  const woodM = mk('#6b4a35', { roughness: 0.8 });
  const seat = meshOf(new THREE.BoxGeometry(0.44, 0.04, 0.42), woodM); seat.position.set(0, 0.36, -0.03); chair.add(seat);
  const back = meshOf(new THREE.BoxGeometry(0.44, 0.44, 0.03), woodM); back.position.set(0, 0.6, -0.235); chair.add(back);
  for (const sx of [-0.19, 0.19]) for (const sz of [-0.2, 0.15]) { const l = meshOf(new THREE.CylinderGeometry(0.014, 0.014, 0.36, 8), woodM); l.position.set(sx, 0.18, sz); chair.add(l); }
  const desk = meshOf(new THREE.BoxGeometry(1.0, 0.03, 0.55), woodM); desk.position.set(0, 0.765, 0.66); chair.add(desk);
  for (const sx of [-0.46, 0.46]) for (const sz of [0.43, 0.88]) { const l = meshOf(new THREE.CylinderGeometry(0.018, 0.018, 0.765, 8), woodM); l.position.set(sx, 0.38, sz); chair.add(l); }
  const lapBase = meshOf(new THREE.BoxGeometry(0.36, 0.015, 0.25), mk('#4a505c')); lapBase.position.set(0, 0.79, 0.6); chair.add(lapBase);
  const lapScr = meshOf(new THREE.BoxGeometry(0.36, 0.23, 0.012), mk('#222833', { emissive: '#3bd5ff', emissiveIntensity: 0.55 })); lapScr.position.set(0, 0.9, 0.725); lapScr.rotation.x = 0.28; chair.add(lapScr);
  chair.visible = false;
  const bed = new THREE.Group(); props.add(bed);
  const mattress = meshOf(new THREE.BoxGeometry(2.2, 0.14, 0.9), mk('#4a6fa5', { roughness: 0.9 })); mattress.position.set(0.05, -0.075, 0); bed.add(mattress);
  const pillow = meshOf(new THREE.BoxGeometry(0.5, 0.1, 0.42), mk('#f1f4fb', { roughness: 0.9 })); pillow.position.set(-0.78, 0.04, 0); bed.add(pillow);
  bed.visible = false;
  const dumbbells = [];
  for (const s of SIDES) {
    const d = new THREE.Group(); const barM = mk('#9aa3b2', { metalness: 0.6, roughness: 0.3 }); const plateM = mk('#2a2f3a');
    const bar = meshOf(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 8), barM); bar.rotation.z = Math.PI / 2; d.add(bar);
    for (const px of [-0.075, 0.075]) { const p = meshOf(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 14), plateM); p.rotation.z = Math.PI / 2; p.position.x = px; d.add(p); }
    d.position.set(0, -0.0, 0.01); d.rotation.y = Math.PI / 2; J['wr' + (s > 0 ? 'L' : 'R')].add(d); d.position.set(s * (shX + 0.02) - J['wr' + (s > 0 ? 'L' : 'R')].userData.abs.x, 0.82 - J['wr' + (s > 0 ? 'L' : 'R')].userData.abs.y, 0.0);
    d.visible = false; dumbbells.push(d);
  }

  return { root, bodyRoot, J, reg, pickables, layerOp, curOp, mats, vessels, lumps, skinParts, muscles, boneMeshes, face, teeth, cavities, lungs, lungGroup, bronchi, bronMeshes, bronMat, soot, sootGeo,
    sootSeed, heartG, heartParts, coronaries, liver, liverB, stomach, stomach2, pancreas, kidneys, bladder, visceral, smallInt, beadPos, colon, brainParts, sparkMesh, sparkData, chair, bed, dumbbells,
    belly, bellyFat, vertebrae, ribs, sternum, aorta, carotids, props, head, mats };
}
