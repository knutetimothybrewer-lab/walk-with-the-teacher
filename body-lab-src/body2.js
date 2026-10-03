/* ============================================================
   BODY (part 2) — poses, per-frame animation, particles, layers.
   ============================================================ */
const POSES = {
  stand: { label: 'Anatomical position', icon: '🧍' },
  walk: { label: 'Walking', icon: '🚶' },
  jog: { label: 'Jogging', icon: '🏃' },
  jacks: { label: 'Jumping jacks', icon: '🤸' },
  lift: { label: 'Lifting weights', icon: '🏋️' },
  sit: { label: 'Sitting & screens', icon: '💻' },
  sleep: { label: 'Sleeping', icon: '😴' },
};

function newPose() {
  return { rootY: 0, rootZ: 0, lie: 0, chair: 0, bed: 0, db: 0, move: 0, scroll: 0, pump: 0, hr: 0, rr: 0, slumpK: 1,
    torso: [0, 0, 0], head: [0, 0, 0], shL: [0, 0, 0.12], shR: [0, 0, -0.12], elL: [0, 0, 0], elR: [0, 0, 0],
    hipL: [0, 0, 0.03], hipR: [0, 0, -0.03], knL: [0, 0, 0], knR: [0, 0, 0], anL: [0, 0, 0], anR: [0, 0, 0] };
}
function poseTarget(name, t) {
  const P = newPose();
  switch (name) {
    case 'walk': {
      const p = t * Math.PI * 2 * 0.95;
      P.move = 0.35; P.scroll = 0.55; P.hr = 22; P.rr = 4;
      P.hipL[0] = -0.42 * Math.sin(p); P.hipR[0] = 0.42 * Math.sin(p);
      P.knL[0] = 0.1 + 0.6 * Math.max(0, Math.cos(p)); P.knR[0] = 0.1 + 0.6 * Math.max(0, -Math.cos(p));
      P.shL[0] = 0.38 * Math.sin(p); P.shR[0] = -0.38 * Math.sin(p);
      P.elL[0] = -0.3; P.elR[0] = -0.3; P.rootY = 0.012 * Math.abs(Math.sin(p)) - 0.01;
      P.torso[1] = 0.06 * Math.sin(p); break;
    }
    case 'jog': {
      const p = t * Math.PI * 2 * 1.5;
      P.move = 0.8; P.scroll = 1.5; P.hr = 55; P.rr = 14;
      P.hipL[0] = -0.75 * Math.sin(p); P.hipR[0] = 0.75 * Math.sin(p);
      P.knL[0] = 0.25 + 1.25 * Math.max(0, Math.cos(p)); P.knR[0] = 0.25 + 1.25 * Math.max(0, -Math.cos(p));
      P.shL[0] = 0.8 * Math.sin(p); P.shR[0] = -0.8 * Math.sin(p);
      P.elL[0] = -1.35; P.elR[0] = -1.35; P.rootY = 0.045 * Math.abs(Math.cos(p));
      P.torso[0] = 0.12; P.torso[1] = 0.1 * Math.sin(p); P.shL[2] = 0.18; P.shR[2] = -0.18; break;
    }
    case 'jacks': {
      const p = t * Math.PI * 2 * 1.25, k = (1 - Math.cos(p)) / 2;
      P.move = 0.85; P.hr = 60; P.rr = 16; P.rootY = 0.08 * Math.max(0, Math.sin(p * 2 - 0.5)) ** 1;
      P.shL[2] = 0.12 + 2.9 * k; P.shR[2] = -(0.12 + 2.9 * k);
      P.hipL[2] = 0.03 + 0.34 * k; P.hipR[2] = -(0.03 + 0.34 * k);
      P.anL[2] = 0; break;
    }
    case 'lift': {
      const p = t * Math.PI * 2 * 0.45, k = (1 - Math.cos(p)) / 2;
      P.move = 0.45; P.hr = 30; P.rr = 6; P.pump = 0.4 + 0.6 * k; P.db = 1;
      P.elL[0] = -(0.12 + 2.15 * k); P.elR[0] = -(0.12 + 2.15 * k);
      P.shL[2] = 0.07; P.shR[2] = -0.07; P.torso[0] = -0.04 * k;
      P.hipL[0] = -0.04; P.hipR[0] = -0.04; P.knL[0] = 0.08; P.knR[0] = 0.08; break;
    }
    case 'sit': {
      P.chair = 1; P.rootY = -0.45; P.rootZ = -0.0;
      P.hipL[0] = -1.55; P.hipR[0] = -1.55; P.knL[0] = 1.5; P.knR[0] = 1.5; P.anL[0] = 0.0; P.anR[0] = 0.0;
      P.hipL[2] = 0.05; P.hipR[2] = -0.05;
      P.shL[0] = -0.8; P.shR[0] = -0.8; P.shL[2] = 0.05; P.shR[2] = -0.05; P.elL[0] = -1.2; P.elR[0] = -1.2;
      P.head[0] = 0.15; break;
    }
    case 'sleep': {
      P.lie = 1; P.bed = 1; P.rootY = 0.125; P.shL[2] = 0.18; P.shR[2] = -0.18; P.hipL[2] = 0.06; P.hipR[2] = -0.06;
      P.elL[0] = -0.2; P.elR[0] = -0.2; P.slumpK = 0; P.rr = -3; break;
    }
    default: break;
  }
  return P;
}

const SKIN_WORK = new THREE.Color(), COL_A = new THREE.Color(), COL_B = new THREE.Color();
const mixHex = (a, b, t) => COL_A.set(a).lerp(COL_B.set(b), clamp(t));
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const smooth = (x, a, b) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

function makeProcTextures() {
  const mk2 = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g, w, h); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; };
  const pores = mk2(128, 128, (g, w, h) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { const x = Math.random() * w, y = Math.random() * h, r = 0.8 + Math.random() * 3; g.fillStyle = `rgba(0,0,0,${0.25 + Math.random() * 0.5})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  });
  pores.repeat.set(3, 3);
  const fibers = mk2(256, 64, (g, w, h) => {
    for (let x = 0; x < w; x += 2) { const v = 90 + Math.random() * 120; g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 2, h); }
  });
  fibers.repeat.set(2, 1);
  return { pores, fibers };
}

function createAnimator(rig, scene) {
  const { J, mats, reg, curOp, layerOp, vessels, lumps, muscles } = rig;
  const tex = makeProcTextures();
  mats.bone.bumpMap = tex.pores; mats.boneSoft.bumpMap = tex.pores; mats.skull.bumpMap = tex.pores;
  mats.muscle.bumpMap = tex.fibers; mats.muscle.bumpScale = 1.2;
  rig.smallInt.frustumCulled = false;

  rig.root.rotation.order = 'YXZ';
  const cur = { pose: newPose(), vis: null, t: 0, beat: 0, breath: 0, blink: 0, nextBlink: 2, smokeT: 0, smokeBurst: 0, sweatT: 0, lungLast: -1, dentalLast: -1 };
  const rigState = { exertion: 0, hrNow: 70, rrNow: 14, poseName: 'stand', floorScroll: 0 };

  /* ---- sprite pools (smoke, sweat, zzz) ---- */
  const puffTex = softTexture('rgba(255,255,255,0.9)');
  const puffs = [];
  for (let i = 0; i < 44; i++) {
    const sm = new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity: 0, depthWrite: false, color: '#d4d4d4' });
    const sp = new THREE.Sprite(sm); sp.visible = false; sp.renderOrder = 30; scene.add(sp); puffs.push({ sp, life: 0, max: 1, v: V3(0, 0, 0), grow: 0.3 });
  }
  const dropTex = softTexture('rgba(150,220,255,1)');
  const drops = [];
  for (let i = 0; i < 16; i++) {
    const sm = new THREE.SpriteMaterial({ map: dropTex, transparent: true, opacity: 0, depthWrite: false });
    const sp = new THREE.Sprite(sm); sp.scale.setScalar(0.014); sp.visible = false; sp.renderOrder = 31; scene.add(sp); drops.push({ sp, life: 0, v: V3(0, 0, 0) });
  }
  const zTex = textTexture('Z');
  const zzz = [];
  for (let i = 0; i < 3; i++) {
    const sm = new THREE.SpriteMaterial({ map: zTex, transparent: true, opacity: 0, depthWrite: false });
    const sp = new THREE.Sprite(sm); sp.visible = false; sp.renderOrder = 32; scene.add(sp); zzz.push({ sp, off: i / 3 });
  }
  // ambient motes
  const MOTE_N = 160, motePos = new Float32Array(MOTE_N * 3);
  for (let i = 0; i < MOTE_N; i++) { const a = Math.random() * 6.28, r = 0.4 + Math.random() * 1.6; motePos[i * 3] = Math.cos(a) * r; motePos[i * 3 + 1] = Math.random() * 2.6; motePos[i * 3 + 2] = Math.sin(a) * r; }
  const moteGeo = new THREE.BufferGeometry(); moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteMat = new THREE.PointsMaterial({ size: 0.02, map: softTexture(), color: '#9fe8ff', transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending });
  const motes = new THREE.Points(moteGeo, moteMat); motes.frustumCulled = false; scene.add(motes);

  const mouthW = V3(0, 0, 0), headW = V3(0, 0, 0), tmp = V3(0, 0, 0);

  function setEuler(j, a) { j.rotation.set(a[0], a[1], a[2]); }
  function approachPose(dt, target) {
    const k = Math.min(1, 12 * dt), P = cur.pose;
    for (const key of ['torso', 'head', 'shL', 'shR', 'elL', 'elR', 'hipL', 'hipR', 'knL', 'knR', 'anL', 'anR']) {
      for (let i = 0; i < 3; i++) P[key][i] += (target[key][i] - P[key][i]) * k;
    }
    const k2 = Math.min(1, 5 * dt);
    for (const key of ['rootY', 'rootZ', 'lie', 'chair', 'bed', 'db', 'move', 'scroll', 'pump', 'hr', 'rr', 'slumpK']) P[key] += (target[key] - P[key]) * (key === 'rootY' ? k : k2);
  }

  function update(dt, t, d, poseName, opts = {}) {
    const v = d.vis;
    cur.t += dt; const T = cur.t;
    // ----- smooth visual state toward targets -----
    if (!cur.vis) cur.vis = JSON.parse(JSON.stringify(v));
    const cv = cur.vis, kv = Math.min(1, dt * 3.2);
    for (const k in v) if (typeof v[k] === 'number') cv[k] += (v[k] - cv[k]) * kv;
    const cm = cur.m || (cur.m = {}); const mk3 = ['spo2', 'focus', 'liver', 'bodyfat', 'muscle', 'bone', 'bmi', 'rhr', 'rr', 'dental', 'gut', 'kidney', 'skin', 'mood', 'sv'];
    for (const k of mk3) cm[k] = cm[k] == null ? d[k] : cm[k] + (d[k] - cm[k]) * kv;
    const sk = opts.skin || '#e8b99a';

    // ----- pose -----
    const target = poseTarget(poseName, T);
    approachPose(dt, target);
    const P = cur.pose;
    setEuler(J.torso, P.torso); setEuler(J.head, P.head);
    setEuler(J.shL, P.shL); setEuler(J.shR, P.shR); setEuler(J.elL, P.elL); setEuler(J.elR, P.elR);
    setEuler(J.hipL, P.hipL); setEuler(J.hipR, P.hipR); setEuler(J.knL, P.knL); setEuler(J.knR, P.knR);
    setEuler(J.anL, P.anL); setEuler(J.anR, P.anR);
    // posture slump from sitting, age, weak bones
    const slump = clamp(0.7 * clamp(cv.sedN, 0, 1) + 0.6 * clamp((cv.age - 45) / 35) + 0.9 * clamp((0.9 - cv.boneIdx) / 0.35)) * P.slumpK;
    J.torso.rotation.x += slump * 0.2 + (poseName === 'sit' ? 0.12 * clamp(cv.sedN + 0.4) : 0);
    J.head.rotation.x += slump * 0.38 + (poseName === 'sit' ? 0.2 : 0);
    J.shL.rotation.z += slump * 0.0;
    rig.bodyRoot.position.y = P.rootY;
    rig.bodyRoot.position.z = P.rootZ;
    const hs = opts.height / 170;
    rig.bodyRoot.scale.set(hs, hs, hs);
    rig.root.rotation.set(-Math.PI / 2 * P.lie, Math.PI / 2 * P.lie, 0);
    rig.root.position.set(0.88 * P.lie, 0, 0);
    rig.chair.visible = P.chair > 0.02; rig.bed.visible = P.bed > 0.02;
    rig.dumbbells.forEach(db => (db.visible = P.db > 0.5));
    rigState.exertion = P.move; rigState.poseName = poseName;
    rigState.floorScroll = P.scroll;

    // ----- heartbeat, breathing -----
    const hrNow = clamp(cm.rhr + P.hr * (0.6 + 0.4 * (1 - clamp(cv.A, 0, 1) * 0.5)), 35, 190) * (poseName === 'sleep' ? 0.88 : 1);
    const rrNow = clamp(cm.rr + P.rr, 6, 40);
    rigState.hrNow = hrNow; rigState.rrNow = rrNow;
    cur.beat = (cur.beat + dt * hrNow / 60) % 1;
    cur.breath += dt * rrNow / 60 * Math.PI * 2;
    const pulseFn = ph => Math.exp(-9 * ph) * (1 - Math.exp(-70 * ph)) / 0.42;
    const beat = clamp(pulseFn(cur.beat) + 0.55 * pulseFn((cur.beat + 1 - 0.32) % 1), 0, 1.2);
    const br = (1 - Math.cos(cur.breath)) / 2;

    // ----- body composition: girth, fat shells, muscles -----
    const fat = cm.bodyfat, mus = cv.muscle;
    const gT = 1 + 0.0125 * (fat - 18) + 0.1 * (mus - 1), gL = 1 + 0.0115 * (fat - 18) + 0.12 * (mus - 1);
    const shellK = lerp(0.84, 0.97, clamp((fat - 7) / 35));
    const breathK = (1 - 0.5 * v.airway) * 0.016;
    const sp = rig.skinParts;
    sp.torso.skin.scale.set(gT * (1 + breathK * br), 1, gT * (1 + 1.4 * breathK * br) * 0.62);
    sp.torso.fat.scale.set(gT * shellK * (1 + breathK * br), 1, gT * shellK * 0.62 * (1 + breathK * br));
    for (const l of sp.limbs) {
      if (l.kind === 'foot') continue;
      l.skin.scale.set(gL, 1, gL);
      if (l.fat) l.fat.scale.set(gL * shellK, 1, gL * shellK);
    }
    const bs = clamp((fat - 21) / 20);
    rig.belly.scale.set(0.17 * bs + 0.001, 0.15 * bs + 0.001, 0.16 * bs + 0.001);
    rig.bellyFat.scale.set(0.16 * bs + 0.001, 0.14 * bs + 0.001, 0.15 * bs + 0.001);
    const vs = clamp((fat - 19) / 22);
    rig.visceral.scale.set(0.001 + 0.12 * vs, 0.001 + 0.032 * vs, 0.001 + 0.024 * vs);
    // muscles
    const mxz = 1 + 0.55 * (mus - 1), my = 1 + 0.2 * (mus - 1);
    const armPump = P.pump * 0.1;
    for (const m of muscles) {
      const b = m.userData.bs, tag = m.userData.tag;
      let k = mxz; if ((tag === 'bicep' || tag === 'forearm') && P.pump > 0) k *= 1 + armPump * (tag === 'bicep' ? 2.2 : 1);
      if (tag === 'delt' && P.pump > 0) k *= 1.04;
      const breathy = tag === 'chest' || tag === 'abs' ? 1 + 0.02 * br : 1;
      m.scale.set(b.x * k * breathy, b.y * my, b.z * k * breathy);
    }
    // muscle colour: fat marbling + pump flush
    mixHex('#ad2c36', '#d79a8d', clamp((fat - 28) / 14) * 0.7);
    mats.muscle.color.copy(COL_A).lerp(COL_B.set('#e0434a'), P.pump * 0.35 + P.move * 0.15);
    mats.muscle.emissive.set('#3a0508'); mats.muscle.emissiveIntensity = 0.15 + P.move * 0.15;

    // ----- bones: thickness/colour/porosity -----
    const dens = clamp((cv.boneIdx - 0.55) / 0.55);
    const bt = 0.84 + 0.2 * cv.boneIdx;
    for (const m of rig.boneMeshes) m.scale.set(bt, 1, bt);
    for (const m of rig.vertebrae) m.scale.set(bt, 1, bt);
    mixHex('#c3b78f', '#f3ecd8', smooth(dens, 0.1, 0.8));
    for (const mm of [mats.bone, mats.boneSoft, mats.skull]) { mm.color.copy(COL_A); mm.bumpScale = 0.15 + (1 - dens) * (1 - dens) * 10; mm.roughness = 0.5 + (1 - dens) * 0.4; }

    // ----- skin colour + face -----
    const pal = clamp(cv.smokeSkin * 0.7 + cv.dehyd * 0.3 + cv.sleepBad * 0.25 + v.sick * 0.15);
    const flush = clamp(cv.uvDmg * 0.55 + v.sick * 0.5 + P.move * 0.4);
    SKIN_WORK.set(sk).lerp(COL_B.set('#aaa795'), pal * 0.4).lerp(COL_B.set('#d5564a'), flush * 0.42);
    mats.skin.color.copy(SKIN_WORK);
    const hairGray = clamp((cv.age - 36) / 40);
    COL_A.set('#2b1d16').lerp(COL_B.set('#cfcfcf'), hairGray); mats.hair.color.copy(COL_A);
    const f = rig.face;
    mats.dark.userData.ds = clamp(cv.sleepBad * 0.85 + cv.dehyd * 0.2);
    mats.wrinkle.userData.ds = clamp(cv.smokeSkin * 0.8 + cv.uvDmg * 0.55 + cv.ageDecl * 0.9 + cv.dehyd * 0.15) * 0.65;
    mats.spot.userData.ds = clamp((cv.uvDmg - 0.1) * 1.3 + cv.ageDecl * 0.45);
    mats.blush.userData.ds = clamp(v.sick * 0.45 + P.move * 0.35 + (poseName === 'sleep' ? 0 : 0));
    const stress0 = clamp(cv.stress);
    const smile = clamp(cv.moodFace * 0.9 - v.sick * 0.4 - cv.sleepBad * 0.2, -1, 1);
    f.mouth.scale.set(1 + 0.12 * Math.max(0, smile), smile * 1.2 + (Math.abs(smile) < 0.1 ? 0.1 : 0), 1);
    // blinking / sleeping eyes
    cur.nextBlink -= dt;
    if (cur.nextBlink < 0) { cur.blink = 0.14; cur.nextBlink = 2.5 + Math.random() * 3; }
    cur.blink = Math.max(0, cur.blink - dt);
    const droopy = clamp(cv.sleepBad * 0.55 + v.sick * 0.2);
    const eyeY = poseName === 'sleep' ? 0.08 : cur.blink > 0 ? 0.1 : 1 - droopy * 0.5;
    f.eyes.forEach((e, i) => { e.scale.y += (e.userData.bs.y * eyeY - e.scale.y) * Math.min(1, 25 * dt); });
    f.irises.forEach((e, i) => { e.scale.y += (e.userData.bs.y * eyeY - e.scale.y) * Math.min(1, 25 * dt); e.visible = eyeY > 0.15; });
    f.brow.forEach((b, i) => { b.rotation.z = (i ? 1 : -1) * (0.12 - 0.25 * clamp(stress0 * 0.6 + (-smile) * 0.4)); });

    // ----- lungs -----
    const dmg = cv.lungDmg;
    if (Math.abs(dmg - cur.lungLast) > 0.004 || cur.lungLast < 0) {
      cur.lungLast = dmg;
      for (const lung of rig.lungs) {
        const g = lung.geometry, dark = g.userData.dark, col = g.attributes.color, th = 1 - dmg * 0.95;
        for (let i = 0; i < dark.length; i++) {
          const a = smooth(dark[i], th - 0.1, th + 0.12) * Math.min(1, dmg * 1.35);
          const c = 1 - a * 0.86; col.setXYZ(i, c, c * (1 - 0.04 * a), c * (1 - 0.06 * a));
        }
        col.needsUpdate = true;
      }
      rig.sootGeo.setDrawRange(0, Math.floor(dmg * 250));
    }
    mixHex('#f08fa0', '#a4868a', dmg * 0.6);
    mats.lung.color.copy(COL_A).lerp(COL_B.set('#e24d5c'), clamp(v.airway * 0.5 + v.sick * 0.2));
    const lungAmp = 0.075 * (1 - 0.5 * v.airway) * (1 - 0.3 * dmg);
    const lsc = 1 + lungAmp * br + 0.06 * dmg;
    rig.lungGroup.scale.set(lsc, 1 + 0.5 * lungAmp * br, lsc);
    const bscale = 1 - clamp(v.airway) * 0.55;
    rig.bronMeshes.forEach(m => m.scale.set(bscale, 1, bscale));
    mixHex('#e6b4bb', '#d6636a', clamp(v.airway * 0.8 + v.sick * 0.3 + dmg * 0.2)); rig.bronMat.color.copy(COL_A);

    // ----- heart -----
    const hsz = cv.heartScale * (1 + 0.065 * beat);
    rig.heartG.scale.set(hsz, hsz, hsz);
    mixHex('#c92b3c', '#ee3b4a', clamp(cv.heartStress));
    mats.heart.color.copy(COL_A); mats.heart.emissiveIntensity = 0.2 + 0.7 * beat * 0.4 + cv.heartStress * 0.25;

    // ----- vessels, blood flow -----
    const pl = cv.plaque;
    mixHex('#d7353f', '#b2684a', pl * 0.6); mats.artery.color.copy(COL_A);
    mats.artery.emissiveIntensity = 0.12 + 0.35 * beat;
    for (const L of lumps) {
      const sz = L.userData.size * 0.0072 * smooth(pl, 0.03, 0.55) * (0.45 + 0.9 * pl);
      L.scale.set(sz * 1.35, sz * 1.1, sz * 1.35);
    }
    const flow = (hrNow / 70) * (0.45 + 0.3 * (P.move > 0.2 ? 1.5 : 1)) * (1 - 0.35 * pl) * (1 - 0.3 * clamp(cv.dehyd));
    const o2 = clamp((cm.spo2 - 86) / 14);
    const aCol = COL_A.set('#ff4558').lerp(COL_B.set('#88192e'), (1 - o2) * 0.9);
    const stress = clamp(cv.stress), nerveSpd = (1 + 1.6 * cv.caffN * 0.4 + 1.2 * cv.nic + 1.5 * stress) * (1 - 0.45 * clamp(cv.alcL, 0, 1)) * (1 - 0.3 * cv.sleepBad);
    for (const ve of vessels) {
      const art = ve.kind === 'a', ner = ve.kind === 'n';
      const spd = (ner ? 0.45 * nerveSpd : 0.22 * flow * (art ? 1 + 0.7 * beat : 1)) * ve.speed;
      const n = ve.count, arr = ve.arr, S = ve.samples, k = 60;
      for (let i = 0; i < n; i++) {
        let u = ve.u[i] + dt * spd / Math.max(0.05, ve.len); if (u > 1) u -= 1; ve.u[i] = u;
        const fi = u * k, i0 = Math.min(k - 1, Math.floor(fi)), fr = fi - i0, a = S[i0], b = S[i0 + 1];
        arr[i * 3] = a.x + (b.x - a.x) * fr; arr[i * 3 + 1] = a.y + (b.y - a.y) * fr; arr[i * 3 + 2] = a.z + (b.z - a.z) * fr;
      }
      ve.geo.attributes.position.needsUpdate = true;
      if (art) ve.pm.color.copy(aCol);
      if (ner) ve.pm.color.set(stress > 0.5 ? '#ffb070' : '#fff3a0');
    }

    // ----- brain, sparks -----
    const act = clamp(cm.focus / 100);
    mixHex('#eaa9b8', '#d17b8a', clamp(stress * 0.8 + cv.sleepBad * 0.2));
    rig.brainParts.forEach(b => b.material.color.copy(COL_A));
    const activeN = Math.max(3, Math.floor(rig.sparkData.length * (0.18 + 0.82 * act)));
    const sparkCol = COL_A.set('#ffe36a').lerp(COL_B.set('#ff5a3a'), stress * 0.8);
    rig.sparkMesh.material.color.copy(sparkCol);
    rig.sparkData.forEach((s, i) => {
      s.t += dt * s.rate * nerveSpd;
      const on = i < activeN ? Math.max(0, Math.sin(s.t * 3.1)) : 0;
      const sc = 0.0042 * on * on;
      _p.copy(s.p); _s.set(sc, sc, sc); _q.identity(); _m4.compose(_p, _q, _s); rig.sparkMesh.setMatrixAt(i, _m4);
    });
    rig.sparkMesh.instanceMatrix.needsUpdate = true;

    // ----- liver, stomach, pancreas, kidneys, bladder -----
    const lf = clamp(cm.liver / 25);
    mixHex('#7d2f2b', '#cfa65a', lf); rig.liver.material.color.copy(COL_A);
    rig.liver.scale.set(0.098 * (1 + 0.28 * lf), 0.06 * (1 + 0.18 * lf), 0.07 * (1 + 0.15 * lf));
    rig.liverB.scale.set(0.05 * (1 + 0.25 * lf), 0.045 * (1 + 0.15 * lf), 0.05);
    mixHex('#e39988', '#e0585f', clamp(stress * 0.6 + cv.alcL * 0.3 + cv.caffN * 0.12)); rig.stomach.material.color.copy(COL_A);
    const churn = 1 + 0.04 * Math.sin(T * 2.4);
    rig.stomach.scale.set(0.056 * churn, 0.07 / churn, 0.048 * churn);
    mats.pancreas.emissiveIntensity = clamp(cv.IR * 0.8 + cv.sugarN * 0.18 - 0.1) * (0.6 + 0.4 * Math.sin(T * 3));
    const ks = clamp(cm.kidney / 100);
    mixHex('#8c2e3a', '#6a3a58', ks * 0.7); mats.kidney.color.copy(COL_A);
    rig.kidneys.forEach(k => k.scale.set(0.027 * (1 - 0.1 * ks), 0.045 * (1 - 0.1 * ks), 0.02));
    const urine = cv.urine;
    const urineCols = ['#f4f6c8', '#f1ecaa', '#efdf86', '#ecce5e', '#e0b23a', '#cc9220', '#b0701a', '#8c4f12'];
    const ui = clamp(urine - 1, 0, 7), u0 = Math.floor(ui), u1 = Math.min(7, u0 + 1);
    COL_A.set(urineCols[u0]).lerp(COL_B.set(urineCols[u1]), ui - u0); mats.bladder.color.copy(COL_A);
    const bl = 0.7 + 0.5 * (0.5 + 0.5 * Math.sin(T * 0.2)); rig.bladder.scale.set(0.034 * bl, 0.034 * bl, 0.032 * bl);

    // ----- intestines -----
    const gutH = clamp(cm.gut / 100);
    mixHex('#a88a70', '#ee9f94', smooth(gutH, 0.1, 0.8)); mats.gut.color.copy(COL_A); mats.colon.color.copy(COL_A).multiplyScalar(0.95);
    const amp = 0.18 + 0.3 * gutH * (1 - 0.5 * stress);
    for (let i = 0; i < rig.beadPos.length; i++) {
      const r = 0.0155 * (1 + amp * Math.sin(i * 0.33 - T * 2.4) + 0.1 * Math.sin(i * 0.9));
      _p.copy(rig.beadPos[i]); _s.set(r, r, r); _q.identity(); _m4.compose(_p, _q, _s); rig.smallInt.setMatrixAt(i, _m4);
    }
    rig.smallInt.instanceMatrix.needsUpdate = true;

    // ----- teeth -----
    const dent = clamp(cm.dental / 100);
    mixHex('#fdfdf4', '#d3c27a', clamp((1 - dent) * 0.8 + cv.smokeSkin * 0.5)); mats.teeth.color.copy(COL_A);
    const nCav = (1 - dent) * 16;
    rig.cavities.forEach((c, i) => { const s2 = clamp(nCav - i * 0.9) * 0.0034 + 0.00001; c.scale.set(s2, s2, s2 * 0.7); });

    // ----- layer opacity -----
    const kl = Math.min(1, dt * 6);
    for (const n of LAYER_NAMES) curOp[n] += (layerOp[n] - curOp[n]) * kl;
    for (const n of LAYER_NAMES) {
      const lay = curOp[n], list = reg[n];
      for (let i = 0; i < list.length; i++) {
        const m = list[i]; if (m.userData.hit) continue;
        const mat = m.material;
        let op = m.userData.base * lay;
        if (mat.userData && mat.userData.ds !== undefined) op = mat.userData.ds * lay;
        if (m.isInstancedMesh && m === rig.sparkMesh) op = 0.95 * lay;
        m.visible = op > 0.012;
        mat.opacity = op;
        const tr = op < 0.995; mat.transparent = tr; mat.depthWrite = !tr || n === 'vessel' && false;
      }
    }
    // depth write: keep transparent skin from hiding insides
    for (const ve of vessels) { ve.layerObj.visible = (ve.kind === 'n' ? curOp.nerve : curOp.vessel) > 0.05; ve.pm.opacity = 0.95 * (ve.kind === 'n' ? curOp.nerve : curOp.vessel); }
    rig.soot.visible = curOp.organ > 0.05; rig.sootMatOpacity = 0.95 * curOp.organ; rig.soot.material.opacity = 0.95 * curOp.organ;
    // pickable sprite hide when lung layer low is handled by visible

    // ----- smoke & vapor -----
    mouth_world(rig, mouthW);
    const smoking = cv.cigP * 20 > 0.5, vaping = cv.vapeN > 0.05;
    cur.smokeT -= dt;
    if ((smoking || vaping) && opts.fx !== false) {
      cur.smokeBurst -= dt;
      if (cur.smokeBurst < 0) { cur.smokeBurst = 3.2 - 1.2 * clamp(cv.cigP + cv.vapeN * 0.5, 0, 1); cur.smokeN = 7; }
    }
    if (cur.smokeN > 0 && cur.smokeT <= 0) {
      cur.smokeT = 0.07; cur.smokeN--;
      const pf = puffs.find(p => p.life <= 0);
      if (pf) {
        const vapor = !smoking;
        pf.life = pf.max = 2.6 + Math.random() * 1.2; pf.grow = 0.1 + Math.random() * 0.12;
        pf.sp.position.copy(mouthW); pf.sp.scale.setScalar(0.035);
        pf.v.set((Math.random() - 0.5) * 0.06, 0.06 + Math.random() * 0.05, 0.1 + Math.random() * 0.08);
        pf.sp.material.color.set(vapor ? '#cfeaff' : '#c9c4bd'); pf.base = vapor ? 0.45 : 0.4; pf.sp.visible = true;
      }
    }
    for (const pf of puffs) {
      if (pf.life > 0) {
        pf.life -= dt; const a = pf.life / pf.max;
        pf.sp.position.addScaledVector(pf.v, dt); pf.v.x += (Math.random() - 0.5) * dt * 0.1;
        pf.sp.scale.setScalar(0.035 + (1 - a) * pf.grow * 0.9);
        pf.sp.material.opacity = pf.base * 0.55 * a * Math.min(1, (1 - a) * 6 + 0.1);
        if (pf.life <= 0) pf.sp.visible = false;
      }
    }
    // sweat
    const sweaty = P.move > 0.3 || v.sick > 0.5;
    cur.sweatT -= dt;
    if (sweaty && cur.sweatT <= 0) {
      cur.sweatT = 0.28 - 0.15 * P.move;
      const dp = drops.find(x => x.life <= 0);
      if (dp) {
        rig.head.getWorldPosition(headW);
        dp.sp.position.set(headW.x + (Math.random() - 0.5) * 0.16, headW.y + 1.64 * 0 + 0.08 + Math.random() * 0.03, headW.z + 0.08);
        dp.sp.position.y = headWorldY(rig) + 0.05 + Math.random() * 0.05;
        dp.life = 0.9; dp.v.set((Math.random() - 0.5) * 0.05, 0.02, 0.02); dp.sp.visible = true;
      }
    }
    for (const dp of drops) if (dp.life > 0) {
      dp.life -= dt; dp.v.y -= 0.8 * dt; dp.sp.position.addScaledVector(dp.v, dt);
      dp.sp.material.opacity = clamp(dp.life * 2) * 0.9; if (dp.life <= 0) dp.sp.visible = false;
    }
    // zzz
    const sleeping = poseName === 'sleep' && P.lie > 0.8;
    if (sleeping) {
      rig.head.getWorldPosition(headW);
      zzz.forEach(z => {
        const ph = (T * 0.3 + z.off) % 1;
        z.sp.visible = true; z.sp.position.set(headW.x - 0.05 + ph * 0.15, headWorldY(rig) + 0.25 + ph * 0.45, headW.z + 0.12);
        z.sp.scale.setScalar(0.1 + ph * 0.14); z.sp.material.opacity = Math.sin(ph * Math.PI) * 0.9;
      });
    } else zzz.forEach(z => { z.sp.visible = false; });
    // motes
    const pol = cv.pollution;
    moteMat.color.set(pol > 0.15 ? '#8a7f74' : '#9fe8ff'); moteMat.size = 0.02 + pol * 0.03; moteMat.opacity = 0.22 + pol * 0.55;
    const mp = moteGeo.attributes.position;
    for (let i = 0; i < MOTE_N; i++) {
      let y = mp.getY(i) + dt * (0.03 + pol * 0.04 + hash3(i, 1, 2) * 0.03); if (y > 2.6) y = 0;
      mp.setY(i, y); mp.setX(i, mp.getX(i) + Math.sin(T * 0.4 + i) * dt * 0.01);
    }
    mp.needsUpdate = true;
  }

  function headWorldY(r) { r.head.getWorldPosition(tmp); return tmp.y + 0.1; }
  function mouth_world(r, out) { r.face.mouth.getWorldPosition(out); }

  return { update, state: rigState, cur };
}
