/* 3D scene: procedural brain (two folded hemispheres), deep structures, brainstem, spinal cord, body organs,
   nerve pathways with signal particles, hover/click picking and a small orbit camera. Uses global THREE. */
const SBScene = (() => {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const RID = ['prefrontal', 'motor', 'parietal', 'temporal', 'occipital'];
  const C = hex => new THREE.Color(hex);
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const S = { xray: false, view: 'brain', spin: false, labelsOn: true, hideNames: false, hover: null, selected: null, ready: false, glOK: true };
  const cb = { hover: () => {}, click: () => {}, beat: () => {} };
  let renderer, scene, camera, canvas, stage, W = 1, H = 1, clock = 0;
  const R = {};                        // region id -> {meshes, base, hover, sel, anchor(fn)}
  const pick = [], pickDeep = [];
  let cortexMat, regTex, regData, cortexMesh, cortexProxy, cerebMesh;
  const paths = {}, bolts = [], timeline = [], ripples = [];
  let burst, hoverGlow, labelEls = {}, labelsBox;

  /* ---------- noise (improved Perlin, [-1,1]) ---------- */
  const perm = new Uint8Array(512);
  (() => { const p = []; for (let i = 0; i < 256; i++) p[i] = i; let s = 1337; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; })();
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10), lerp = (a, b, t) => a + (b - a) * t;
  const grad = (h, x, y, z) => { h &= 15; const u = h < 8 ? x : y, v = h < 4 ? y : (h === 12 || h === 14 ? x : z); return ((h & 1) ? -u : u) + ((h & 2) ? -v : v); };
  function noise3(x, y, z) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255; x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
    const u = fade(x), v = fade(y), w = fade(z), A = perm[X] + Y, AA = perm[A] + Z, AB = perm[A + 1] + Z, B = perm[X + 1] + Y, BA = perm[B] + Z, BB = perm[B + 1] + Z;
    return lerp(lerp(lerp(grad(perm[AA], x, y, z), grad(perm[BA], x - 1, y, z), u), lerp(grad(perm[AB], x, y - 1, z), grad(perm[BB], x - 1, y - 1, z), u), v),
      lerp(lerp(grad(perm[AA + 1], x, y, z - 1), grad(perm[BA + 1], x - 1, y, z - 1), u), lerp(grad(perm[AB + 1], x, y - 1, z - 1), grad(perm[BB + 1], x - 1, y - 1, z - 1), u), v), w);
  }

  /* ---------- welded icosphere ---------- */
  function icosphere(level) {
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
      .map(a => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; });
    let f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    for (let l = 0; l < level; l++) {
      const cache = new Map(), nf = [];
      const mid = (a, b) => { const k = a < b ? a * 65536 + b : b * 65536 + a; let m = cache.get(k); if (m !== undefined) return m;
        const p = [(v[a][0] + v[b][0]) / 2, (v[a][1] + v[b][1]) / 2, (v[a][2] + v[b][2]) / 2], len = Math.hypot(...p); v.push([p[0] / len, p[1] / len, p[2] / len]); cache.set(k, v.length - 1); return v.length - 1; };
      for (const [a, b, c] of f) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
      f = nf;
    }
    return { v, f };
  }

  /* ---------- cortex shape + regions ---------- */
  const COL = { pfc: '#6aa7ff', motor: '#4be3a0', parietal: '#ffd166', temporal: '#ff9f5a', occipital: '#c28bff' };
  function hemiShape(u, s) {                       // unit sphere vertex -> brain-space point (no folds)
    let q = u[0] * s;                              // + lateral, - medial
    const qq = q < 0 ? q * 0.2 : q;
    let Y = u[1] * 0.72, Z = u[2] * 1.2;
    if (Y < 0) Y *= 0.62;
    const zn = u[2];
    let wx = 0.80 * (1 - 0.20 * Math.pow(Math.abs(zn), 2.2) * (zn < 0 ? 1.15 : 1));
    // temporal lobe bulge (low, lateral, mid-front)
    const bump = Math.exp(-Math.pow((zn - 0.12) / 0.5, 2) - Math.pow((u[1] + 0.40) / 0.34, 2)) * Math.max(0, q);
    Y -= 0.30 * bump; wx += 0.05 * bump;
    // frontal pole droop a little, occipital pole tuck
    Y -= 0.10 * sm(0.6, 1, zn); Y += 0.05 * sm(0.6, 1, -zn);
    return V3(s * (0.18 + wx * qq), Y, Z);
  }
  function regionAt(p) {                           // brain-space point -> cortex region id (0..4)
    const z = p.z / 1.2, y = p.y / 0.72;
    const syl = -0.02 - 0.30 * z;
    if (z > -0.58 && z < 0.66 && y < syl) return 3;
    if (z < -0.55) return 4;
    if (z > 0.40) return 0;
    if (z > 0.10) return 1;
    return 2;
  }
  function buildCortex(level, folds) {
    const { v, f } = icosphere(level);
    const pos = [], col = [], reg = [], idx = [];
    const flesh = C('#d8aab0'), tmp = new THREE.Color();
    [-1, 1].forEach((s, si) => {
      const off = pos.length / 3;
      for (const u of v) {
        const P = hemiShape(u, s), r = regionAt(P);
        let d = 0, g = 0;
        if (folds) {
          const q = P.x * s;
          const g1 = Math.abs(noise3(P.x * 2.1, P.y * 2.1 + 3.1, P.z * 2.1)), g2 = Math.abs(noise3(P.x * 3.8 + 9, P.y * 3.8, P.z * 3.8 - 5));
          g = Math.max(1 - sm(0, 0.15, g1), 0.6 * (1 - sm(0, 0.12, g2)));
          g *= sm(0.0, 0.28, q);
          d = -0.06 * g + 0.008 * noise3(P.x * 5, P.y * 5, P.z * 5);
          const n = V3(P.x - s * 0.18, P.y, P.z * 0.7).normalize(); P.addScaledVector(n, d);
        }
        pos.push(P.x, P.y, P.z);
        tmp.set(Object.values(COL)[r]).lerp(flesh, 0.32).multiplyScalar(1 - 0.55 * g);
        col.push(tmp.r, tmp.g, tmp.b); reg.push(r);
      }
      const vo = off;
      for (const [a, b, c] of f) { if (s > 0) idx.push(a + vo, c + vo, b + vo); else idx.push(a + vo, b + vo, c + vo); }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aReg', new THREE.Float32BufferAttribute(reg, 1));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  /* ---------- shaders / materials ---------- */
  function patchRegionMaterial(m) {
    m.onBeforeCompile = sh => {
      sh.uniforms.uReg = { value: regTex };
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aReg;\nvarying float vReg;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvReg=aReg;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uReg;\nvarying float vReg;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nvec4 rB=texture2D(uReg,vec2((vReg+.5)/8.,.75));diffuseColor.rgb=mix(diffuseColor.rgb,rB.rgb,rB.a);')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\nvec4 rA=texture2D(uReg,vec2((vReg+.5)/8.,.25));totalEmissiveRadiance+=rA.rgb*rA.a;');
    };
  }
  const fresnel = (color, power, alpha) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor, uniforms: { c: { value: C(color) }, p: { value: power }, a: { value: alpha } },
    vertexShader: 'varying vec3 n;varying vec3 v;void main(){vec4 mv=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'uniform vec3 c;uniform float p;uniform float a;varying vec3 n;varying vec3 v;void main(){float f=pow(1.-abs(dot(n,v)),p);gl_FragColor=vec4(c*(f*a+.012),0.);}'
  });
  const ptMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uScale: { value: 500 } },
    vertexShader: 'attribute float aSize;attribute vec3 aCol;attribute float aA;varying vec3 vC;varying float vA;uniform float uScale;void main(){vC=aCol;vA=aA;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=max(aSize*uScale/(-mv.z),0.);gl_Position=projectionMatrix*mv;}',
    fragmentShader: 'varying vec3 vC;varying float vA;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;float a=smoothstep(.5,.0,d);gl_FragColor=vec4(vC*(.5+a),a*vA);}'
  });
  function makePoints(n) {
    const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), size = new Float32Array(n), col = new Float32Array(n * 3), al = new Float32Array(n).fill(1);
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    g.setAttribute('aCol', new THREE.BufferAttribute(col, 3)); g.setAttribute('aA', new THREE.BufferAttribute(al, 1));
    const pts = new THREE.Points(g, ptMat); pts.frustumCulled = false; return { pts, pos, size, col, al, g, n };
  }
  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); return t; })();
  function glow(color, size) { const m = new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }); const s = new THREE.Sprite(m); s.scale.set(size, size, 1); s.userData.size = size; return s; }

  /* ---------- paths with flowing particles ---------- */
  class Path {
    constructor(name, pts, color, n, speed, size, tubeOpacity = 0.18, tubeR = 0.014) {
      this.curve = new THREE.CatmullRomCurve3(pts); this.samples = this.curve.getSpacedPoints(180); this.n = n; this.speed = speed; this.size = size; this.ph = Math.random(); this.level = 0; this.rev = false;
      this.color = C(color); this.P = makePoints(n);
      for (let i = 0; i < n; i++) { this.P.col[i * 3] = this.color.r; this.P.col[i * 3 + 1] = this.color.g; this.P.col[i * 3 + 2] = this.color.b; }
      this.tube = new THREE.Mesh(new THREE.TubeGeometry(this.curve, 90, tubeR, 5, false), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: tubeOpacity, depthWrite: false }));
      this.tubeOpacity = tubeOpacity; this.group = new THREE.Group(); this.group.add(this.tube, this.P.pts); paths[name] = this;
    }
    update(dt, level) {
      this.level = level; this.ph = (this.ph + dt * this.speed * (0.25 + level * 1.5)) % 1;
      const m = this.samples.length - 1, P = this.P;
      for (let i = 0; i < this.n; i++) {
        let u = (i / this.n + this.ph) % 1; if (this.rev) u = 1 - u;
        const k = u * m, a = Math.floor(k), t = k - a, p = this.samples[a], q = this.samples[Math.min(m, a + 1)];
        P.pos[i * 3] = p.x + (q.x - p.x) * t; P.pos[i * 3 + 1] = p.y + (q.y - p.y) * t; P.pos[i * 3 + 2] = p.z + (q.z - p.z) * t;
        P.size[i] = clamp(level * this.n * 1.0 - i, 0, 1) * this.size;
      }
      P.g.attributes.position.needsUpdate = true; P.g.attributes.aSize.needsUpdate = true;
      this.tube.material.opacity = this.tubeOpacity * (0.5 + 1.2 * level);
    }
  }

  /* ---------- body parts helper ---------- */
  function stdMat(color, em = 0.25, opts = {}) { return new THREE.MeshStandardMaterial(Object.assign({ color, emissive: color, emissiveIntensity: em, roughness: 0.45, metalness: 0.08 }, opts)); }
  function reg(id, mesh, o = {}) {
    mesh.userData.region = id; const r = R[id] || (R[id] = { meshes: [], hover: 0, sel: 0, base: C(SB.REGIONS[id].color), mats: [] });
    r.meshes.push(mesh); if (mesh.material && mesh.material.emissive) r.mats.push(mesh.material); (o.deep ? pickDeep : pick).push(mesh); if (o.deep) pick.push(mesh); return mesh;
  }
  function centered(geom, mat) { geom.computeBoundingBox(); const c = geom.boundingBox.getCenter(V3(0, 0, 0)); geom.translate(-c.x, -c.y, -c.z); const m = new THREE.Mesh(geom, mat); m.position.copy(c); return m; }

  const root = new THREE.Group(), brain = new THREE.Group(), body = new THREE.Group(), deep = new THREE.Group();
  let heart, lungs = [], stomachG, gut, adrenals = [], arms = [], amy = [], hippo = [], hypo, pit, thal = [], stem, spineMesh, vagusMeshes = [], lungsG;
  let glows = {};

  function buildBrain() {
    regData = new Uint8Array(8 * 2 * 4); regTex = new THREE.DataTexture(regData, 8, 2, THREE.RGBAFormat); regTex.magFilter = regTex.minFilter = THREE.NearestFilter; regTex.needsUpdate = true;
    cortexMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.02, transparent: true }); patchRegionMaterial(cortexMat);
    cortexMesh = new THREE.Mesh(buildCortex(6, true), cortexMat); cortexMesh.renderOrder = 2; brain.add(cortexMesh);
    cortexProxy = new THREE.Mesh(buildCortex(3, false), new THREE.MeshBasicMaterial({ visible: false })); cortexProxy.userData.cortex = true; brain.add(cortexProxy);
    pick.push(cortexProxy);
    for (const id of RID) R[id] = { meshes: [cortexProxy], hover: 0, sel: 0, base: C(SB.REGIONS[id].color), mats: [], cortex: true };
    // cerebellum
    const ico = icosphere(5), cp = [], cc = [], cf = [];
    ico.v.forEach(u => { const P = V3(u[0] * 0.66, u[1] * 0.36, u[2] * 0.46); const ridge = Math.sin(P.y * 80 + noise3(P.x * 3, 0, P.z * 3) * 3) * 0.5 + 0.5; const n = V3(u[0], u[1], u[2]);
      P.addScaledVector(n, -0.022 * ridge - 0.04 * Math.exp(-Math.pow(u[0] / 0.06, 2))); cp.push(P.x, P.y, P.z); const c = C(COL.occipital).set('#ff7aa8').lerp(C('#d8aab0'), 0.3).multiplyScalar(0.75 + 0.35 * ridge); cc.push(c.r, c.g, c.b); });
    const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(cp, 3)); cg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); cg.setIndex(ico.f.map(t => [t[0], t[2], t[1]]).flat()); cg.computeVertexNormals();
    cerebMesh = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, emissive: C('#ff7aa8'), emissiveIntensity: 0 })); cerebMesh.position.set(0, -0.55, -1.0); cerebMesh.rotation.x = -0.15;
    brain.add(cerebMesh); R.cerebellum = { meshes: [cerebMesh], hover: 0, sel: 0, base: C(COL.occipital).set('#ff7aa8'), mats: [cerebMesh.material] }; cerebMesh.userData.region = 'cerebellum'; pick.push(cerebMesh);
    // brainstem + spinal cord
    const stemCurve = new THREE.CatmullRomCurve3([V3(0, -0.2, 0.0), V3(0, -0.55, -0.22), V3(0, -1.0, -0.5), V3(0, -1.6, -0.62)]);
    stem = reg('brainstem', new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 24, 0.15, 14), stdMat('#7c8aa8', 0.1, { roughness: 0.55 })), { deep: false }); brain.add(stem);
    // deep structures
    const dg = deep; brain.add(dg);
    [-1, 1].forEach(s => {
      const a = centered(new THREE.SphereGeometry(0.095, 20, 16), stdMat('#ffb347', 0.4)); a.position.set(s * 0.47, -0.34, 0.36); a.scale.set(1, 0.85, 1.1); dg.add(a); reg('amygdala', a, { deep: true }); amy.push(a); a.userData.s = s;
      const hc = new THREE.CatmullRomCurve3([V3(s * 0.47, -0.40, 0.26), V3(s * 0.53, -0.38, -0.02), V3(s * 0.48, -0.24, -0.34), V3(s * 0.33, -0.03, -0.62)]);
      const h = centered(new THREE.TubeGeometry(hc, 28, 0.065, 12), stdMat('#5ad1ff', 0.35)); dg.add(h); reg('hippocampus', h, { deep: true }); hippo.push(h);
      const t = centered(new THREE.SphereGeometry(0.17, 18, 14), stdMat('#b58bff', 0.28)); t.position.set(s * 0.17, 0.02, -0.02); t.scale.set(0.9, 0.75, 1.15); dg.add(t); reg('thalamus', t, { deep: true }); thal.push(t);
    });
    hypo = centered(new THREE.SphereGeometry(0.1, 18, 14), stdMat('#ff8a3d', 0.35)); hypo.position.set(0, -0.24, 0.24); dg.add(hypo); reg('hypothalamus', hypo, { deep: true });
    pit = centered(new THREE.SphereGeometry(0.065, 16, 12), stdMat('#f5d76e', 0.35)); pit.position.set(0, -0.46, 0.3); dg.add(pit); reg('pituitary', pit, { deep: true });
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8), stdMat('#f5d76e', 0.2)); stalk.position.set(0, -0.35, 0.27); dg.add(stalk);
    reg('brainstem', stem, { deep: true });
  }

  function buildBody() {
    body.add(new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), fresnel('#6aa7ff', 3.2, 0.5))); const head = body.children[0]; head.renderOrder = 10; head.scale.set(1.22, 1.2, 1.55); head.position.set(0, -0.1, -0.05);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 12), fresnel('#6aa7ff', 1.6, 0.4)); nose.renderOrder = 10; nose.rotation.x = Math.PI / 2; nose.position.set(0, -0.38, 1.62); body.add(nose);
    const prof = [[0.01, -1.0], [0.5, -1.0], [0.5, -1.8], [0.72, -2.25], [1.3, -2.55], [1.4, -2.95], [1.22, -3.7], [1.0, -4.6], [1.08, -5.4], [0.9, -5.75], [0.01, -5.8]].map(p => V3(p[0], p[1], 0).setZ(0));
    const lathe = new THREE.Mesh(new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p.x, p.y)), 40), fresnel('#6aa7ff', 3.0, 0.5)); lathe.renderOrder = 10; lathe.scale.z = 0.58; body.add(lathe);
    // spine / spinal cord (pickable), centered on the back
    const spCurve = new THREE.CatmullRomCurve3([V3(0, -1.6, -0.62), V3(0, -2.1, -0.56), V3(0, -3.0, -0.48), V3(0, -4.5, -0.45), V3(0, -5.4, -0.42)]);
    spineMesh = reg('spine', new THREE.Mesh(new THREE.TubeGeometry(spCurve, 40, 0.07, 10), stdMat('#ffa94d', 0.15)), { deep: false }); body.add(spineMesh);
    const spHit = new THREE.Mesh(new THREE.TubeGeometry(spCurve, 20, 0.2, 6), new THREE.MeshBasicMaterial({ visible: false })); spHit.userData.region = 'spine'; body.add(spHit); pick.push(spHit);
    // heart
    heart = centered(new THREE.SphereGeometry(0.3, 28, 20), stdMat('#ff3f5a', 0.45)); heart.position.set(-0.15, -3.25, 0.12); heart.scale.set(1, 1.15, 0.95); heart.rotation.z = 0.35; body.add(heart); reg('heart', heart);
    const aorta = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.32, 10), stdMat('#d92f49', 0.3)); aorta.position.set(0, 0.28, 0); heart.add(aorta); heart.userData.base = heart.scale.clone();
    // lungs
    lungsG = new THREE.Group(); body.add(lungsG);
    [-1, 1].forEach(s => { const l = centered(new THREE.SphereGeometry(0.4, 24, 18), stdMat('#7fd0ff', 0.18, { transparent: true, opacity: 0.8 })); l.position.set(s * 0.66, -3.05, -0.05); l.scale.set(0.85, 1.6, 0.8); l.userData.base = l.scale.clone(); lungsG.add(l); reg('lungs', l); lungs.push(l); });
    const trachea = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 8), stdMat('#9fdcff', 0.2)); trachea.position.set(0, -2.45, -0.05); body.add(trachea);
    // stomach + gut
    stomachG = centered(new THREE.SphereGeometry(0.34, 24, 18), stdMat('#ff9a8a', 0.25)); stomachG.position.set(-0.38, -4.1, 0.2); stomachG.scale.set(1.15, 0.8, 0.75); stomachG.rotation.z = 0.6; body.add(stomachG); reg('stomach', stomachG); stomachG.userData.base = stomachG.scale.clone();
    const gp = []; for (let i = 0; i <= 60; i++) { const u = i / 60; gp.push(V3(Math.sin(u * Math.PI * 6) * 0.48, -4.7 - u * 0.75, 0.2 + Math.sin(u * Math.PI * 6 + 1) * 0.04)); }
    gut = centered(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(gp), 160, 0.085, 8), stdMat('#ff9a8a', 0.22)); gut.position.set(0, -5.05, 0.2); body.add(gut); reg('stomach', gut); gut.userData.base = gut.scale.clone();
    // adrenals + kidneys
    [-1, 1].forEach(s => {
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), stdMat('#7a3a46', 0.1)); k.scale.set(0.7, 1.15, 0.6); k.position.set(s * 0.62, -4.75, -0.3); body.add(k);
      const a = centered(new THREE.ConeGeometry(0.15, 0.24, 14), stdMat('#ffb347', 0.4)); a.position.set(s * 0.58, -4.45, -0.3); a.rotation.z = s * 0.2; body.add(a); reg('adrenals', a); adrenals.push(a); a.userData.base = a.scale.clone();
    });
    // arms (muscles)
    [-1, 1].forEach(s => { const m = centered(new THREE.CapsuleGeometry(0.15, 1.5, 6, 14), stdMat('#ff7a59', 0.12, { transparent: true, opacity: 0.4 })); m.position.set(s * 1.72, -3.9, 0.02); m.rotation.z = s * 0.1; body.add(m); reg('muscles', m); arms.push(m); m.userData.p0 = m.position.clone(); });
    // vagus
    [-1, 1].forEach(s => {
      const vc = new THREE.CatmullRomCurve3([V3(s * 0.12, -1.2, -0.45), V3(s * 0.38, -1.9, -0.05), V3(s * 0.45, -2.5, 0.2), V3(s * 0.3, -3.2, 0.3), V3(s * 0.2, -4.0, 0.34), V3(s * 0.05, -4.9, 0.3)]);
      const hit = new THREE.Mesh(new THREE.TubeGeometry(vc, 30, 0.14, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.region = 'vagus'; body.add(hit); pick.push(hit); vagusMeshes.push(hit);
    });
  }

  function buildPaths() {
    const sp = y => V3(0, y, -0.47);
    const hy = V3(0, -0.24, 0.24), stemPts = [V3(0, -0.5, -0.15), V3(0, -1.0, -0.5), V3(0, -1.6, -0.62), V3(0, -2.1, -0.56)];
    const down = (...end) => [hy, ...stemPts, sp(-2.8), ...end];
    const add = (n, p) => body.add(p.group);
    add('', new Path('sHeart', down(sp(-3.15), V3(-0.15, -3.25, 0.1)), '#ff9a3d', 28, 0.22, 0.09));
    add('', new Path('sLungL', down(sp(-3.0), V3(-0.6, -3.05, -0.1)), '#ff9a3d', 22, 0.2, 0.08));
    add('', new Path('sLungR', down(sp(-3.0), V3(0.6, -3.05, -0.1)), '#ff9a3d', 22, 0.2, 0.08));
    add('', new Path('sGut', down(sp(-3.9), V3(-0.3, -4.1, 0.2), V3(0.1, -4.8, 0.2)), '#ff9a3d', 28, 0.2, 0.08));
    add('', new Path('sAdrL', down(sp(-4.3), V3(-0.57, -4.45, -0.32)), '#ff9a3d', 26, 0.2, 0.08));
    add('', new Path('sAdrR', down(sp(-4.3), V3(0.57, -4.45, -0.32)), '#ff9a3d', 26, 0.2, 0.08));
    add('', new Path('sArmL', down(sp(-2.7), V3(-1.0, -2.8, -0.2), V3(-1.7, -3.3, 0.0)), '#ff9a3d', 22, 0.2, 0.08));
    add('', new Path('sArmR', down(sp(-2.7), V3(1.0, -2.8, -0.2), V3(1.7, -3.3, 0.0)), '#ff9a3d', 22, 0.2, 0.08));
    // parasympathetic vagus (teal)
    const vag = (s, tail) => [V3(s * 0.06, -0.55, -0.2), V3(s * 0.12, -1.2, -0.45), V3(s * 0.38, -1.9, -0.05), V3(s * 0.45, -2.5, 0.2), ...tail];
    add('', new Path('vHeart', vag(-1, [V3(-0.25, -3.1, 0.25)]), '#2de2c8', 22, 0.12, 0.09, 0.22));
    add('', new Path('vLung', vag(1, [V3(0.5, -3.1, 0.25)]), '#2de2c8', 22, 0.12, 0.09, 0.22));
    add('', new Path('vGut', vag(-1, [V3(-0.3, -3.2, 0.3), V3(-0.4, -4.0, 0.32), V3(-0.2, -4.9, 0.3)]), '#2de2c8', 26, 0.12, 0.09, 0.22));
    // hormones: HPA axis (hypothalamus -> pituitary -> adrenals), cortisol feedback up to the brain
    const hp = V3(0, -0.46, 0.3);
    add('', new Path('hpa1', [hy, V3(0, -0.35, 0.27), hp], '#f5d76e', 8, 0.5, 0.07, 0.3, 0.02));
    add('', new Path('acth', [hp, V3(0.12, -0.9, 0.5), V3(0.25, -2.0, 0.42), V3(0.28, -3.2, 0.35), V3(0.4, -4.1, 0.1), V3(0.57, -4.45, -0.25)], '#f5d76e', 22, 0.12, 0.08, 0.14));
    const cort = new Path('cort', [V3(0.6, -4.5, -0.15), V3(0.42, -4.0, 0.18), V3(0.2, -3.0, 0.48), V3(0.18, -2.0, 0.42), V3(0.2, -1.0, 0.3), V3(0.3, -0.5, 0.05), V3(0.45, -0.15, -0.1)], '#d6ff6a', 22, 0.1, 0.075, 0.1); body.add(cort.group);
    // amygdala -> hypothalamus
    const a1 = new Path('amyHypo', [V3(-0.47, -0.34, 0.36), V3(-0.25, -0.3, 0.3), hy], '#ff9a3d', 10, 0.5, 0.06, 0.25, 0.02), a2 = new Path('amyHypoR', [V3(0.47, -0.34, 0.36), V3(0.25, -0.3, 0.3), hy], '#ff9a3d', 10, 0.5, 0.06, 0.25, 0.02);
    brain.add(a1.group, a2.group);
  }

  /* ---------- camera ---------- */
  const cam = { theta: -1.05, phi: 1.38, dist: 5.4, tx: 0, ty: -0.05, tz: 0.05, g: { theta: -1.05, phi: 1.38, dist: 5.4, tx: 0, ty: -0.05, tz: 0.05 }, idle: 0 };
  const VIEWS = { brain: { dist: 6.4, tx: 0, ty: -0.05, tz: 0.05 }, body: { dist: 12.6, tx: 0, ty: -2.5, tz: 0.0 } };
  function setView(v) { S.view = v; Object.assign(cam.g, VIEWS[v]); if (v === 'body') { cam.g.phi = 1.5; } }
  function applyCam(dt) {
    const k = 1 - Math.exp(-6 * Math.max(dt, 0.001));
    for (const key of ['theta', 'phi', 'dist', 'tx', 'ty', 'tz']) cam[key] += (cam.g[key] - cam[key]) * k;
    const sp = Math.sin(cam.phi); camera.position.set(cam.tx + cam.dist * sp * Math.sin(cam.theta), cam.ty + cam.dist * Math.cos(cam.phi), cam.tz + cam.dist * sp * Math.cos(cam.theta));
    camera.lookAt(cam.tx, cam.ty, cam.tz);
  }
  function anchor(id, sgn) {
    const A = ANCH[id]; if (!A) return null; return typeof A === 'function' ? A(sgn) : A;
  }
  const ANCH = {};
  function focusRegion(id) {
    const a = anchor(id, camSide()); if (!a) return; const reg = SB.REGIONS[id];
    const isBody = reg.group === 'Body';
    S.view = isBody ? 'body' : 'brain';
    cam.g.tx = a.x * 0.6; cam.g.ty = a.y; cam.g.tz = a.z * 0.6; cam.g.dist = isBody ? 6.5 : 3.4;
    if (reg.group === 'Cortex' && id !== 'cerebellum') { cam.g.theta = camSide() < 0 ? -1.2 : 1.2; }
  }
  const camSide = () => (Math.sin(cam.theta) >= 0 ? 1 : -1);

  /* ---------- picking ---------- */
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  function pickAt(cx, cy) {
    const r = canvas.getBoundingClientRect(); mouse.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1); ray.setFromCamera(mouse, camera);
    const tryList = (list) => { const h = ray.intersectObjects(list, false); return h.length ? h[0] : null; };
    let hit = null;
    if (S.xray) { hit = tryList(pickDeep.concat(pick.filter(m => m.userData.region && !pickDeep.includes(m) && !m.userData.cortex))); if (!hit) hit = tryList([cortexProxy]); }
    else hit = tryList(pick.filter(m => !pickDeep.includes(m) || m === stem));
    if (!hit) return null;
    let id = hit.object.userData.region;
    if (hit.object.userData.cortex) id = RID[regionAt(hit.point)];
    return { id, point: hit.point };
  }

  /* ---------- interaction ---------- */
  function bindInput() {
    const ptrs = new Map(); let down = null, pinch = 0;
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 }; cam.idle = 0; });
    canvas.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId);
      if (p) {
        const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) cam.g.dist = clamp(cam.g.dist * pinch / d, 2.2, 18); pinch = d; }
        else { cam.g.theta -= dx * 0.0075; cam.g.phi = clamp(cam.g.phi - dy * 0.0075, 0.25, 2.9); if (down) down.moved += Math.abs(dx) + Math.abs(dy); }
        cb.hover(null, e.clientX, e.clientY); return;
      }
      const h = pickAt(e.clientX, e.clientY); setHover(h, e.clientX, e.clientY);
    });
    const up = e => { const was = down; ptrs.delete(e.pointerId); pinch = 0;
      if (was && was.moved < 6 && performance.now() - was.t < 700) { const h = pickAt(e.clientX, e.clientY); if (h) { ripple(h.point, SB.REGIONS[h.id].color); cb.click(h.id, h.point, e.clientX, e.clientY); } else cb.click(null); }
      down = null; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); down = null; });
    canvas.addEventListener('pointerleave', () => { setHover(null); });
    canvas.addEventListener('wheel', e => { e.preventDefault(); cam.g.dist = clamp(cam.g.dist * Math.exp(e.deltaY * 0.0012), 2.2, 18); }, { passive: false });
  }
  function setHover(h, cx, cy) {
    const id = h ? h.id : null; S.hover = id; S.hoverPoint = h ? h.point : null; canvas.style.cursor = id ? 'pointer' : 'grab'; cb.hover(id, cx, cy, h && h.point);
  }
  function ripple(p, color) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.copy(p); m.userData.t = 0; m.userData.s = 0.25; scene.add(m); ripples.push(m);
  }

  /* ---------- bolts: one-shot signals along a curve ---------- */
  function bolt(pts, color, dur, delay = 0, size = 0.16, then) { bolts.push({ curve: new THREE.CatmullRomCurve3(pts), color: C(color), dur, t: -delay, size, then }); }
  const boltP = { P: null };

  /* ---------- the alarm chain animation (slides: amygdala -> hypothalamus -> adrenals -> body ready) ---------- */
  function playChain(sideSgn) {
    const s = sideSgn || -1, am = V3(s * 0.47, -0.34, 0.36), th = V3(0, 0.02, -0.02), hy = V3(0, -0.24, 0.24);
    bolt([V3(0, -0.2, 1.6), V3(0, -0.1, 0.9), th], '#ffffff', 0.55, 0, 0.14);
    bolt([th, V3(s * 0.25, -0.15, 0.2), am], '#ffcf6a', 0.4, 0.55, 0.18, () => { ripple(am, '#ffb347'); });
    bolt([th, V3(0, 0.5, -0.7), V3(0, 0.8, 0.2), V3(0, 0.55, 1.0)], '#8fb4ff', 1.8, 0.5, 0.1);       // slow road to prefrontal
    timeline.push({ at: 1.0, fn: () => ripple(am, '#ff6b4a') });
    bolt([am, V3(s * 0.25, -0.3, 0.3), hy], '#ff9a3d', 0.45, 1.0, 0.17, () => ripple(hy, '#ff8a3d'));
    bolt([hy, V3(0, -0.35, 0.27), V3(0, -0.46, 0.3)], '#f5d76e', 0.4, 1.5, 0.15);
    bolt([hy, V3(0, -0.5, -0.15), V3(0, -1.0, -0.5), V3(0, -2.1, -0.56), V3(0, -3.0, -0.47), V3(0, -4.3, -0.4), V3(-0.57, -4.45, -0.3)], '#ff9a3d', 1.1, 1.6, 0.2, () => { ripple(V3(-0.57, -4.45, -0.3), '#ffb347'); ripple(V3(0.57, -4.45, -0.3), '#ffb347'); });
    timeline.push({ at: 2.7, fn: () => { ripple(V3(-0.15, -3.25, 0.2), '#ff5a6e'); } });
  }

  /* ---------- per-frame application of the stress model ---------- */
  let heartPh = 0, breathPh = 0, lastBeat = 0;
  const tmpC = new THREE.Color();
  function apply(dt, T) {
    const o = SIM.out, A = SIM.A, SNS = SIM.SNS, PNS = SIM.PNS, Ad = SIM.Ad, Co = SIM.Co, L = SIM.L;
    // hover smoothing
    for (const id in R) { const r = R[id]; r.hover += ((S.hover === id ? 1 : 0) - r.hover) * Math.min(1, dt * 10); r.sel += ((S.selected === id ? 1 : 0) - r.sel) * Math.min(1, dt * 8); }
    const hv = id => (R[id] ? R[id].hover * 0.6 + R[id].sel * 0.35 : 0), pulse = Math.sin(T * 6) * 0.5 + 0.5;
    // cortex regions via data texture
    const set = (i, gcol, ga, mcol, ma) => { regData[i * 4] = gcol.r * 255; regData[i * 4 + 1] = gcol.g * 255; regData[i * 4 + 2] = gcol.b * 255; regData[i * 4 + 3] = clamp(ga) * 255;
      regData[32 + i * 4] = mcol.r * 255; regData[32 + i * 4 + 1] = mcol.g * 255; regData[32 + i * 4 + 2] = mcol.b * 255; regData[32 + i * 4 + 3] = clamp(ma) * 255; };
    const dark = C('#2a3550'), dark2 = C('#1a1f33');
    const fl = o.pfc < 0.45 ? 0.65 + 0.35 * Math.sin(T * 17 + 1) * Math.sin(T * 7) : 1;
    const xr = S.xray ? 0.3 : 1; const gl = [(0.05 + 0.22 * o.pfc) * fl * xr, 0.5 * SNS * xr, 0.3 * SNS * xr, 0.5 * A * xr, 0.05];
    const hold = [(1 - o.pfc) * 0.8, 0, 0, 0, o.attention * 0.55];
    RID.forEach((id, i) => { const hh = hv(id); tmpC.copy(R[id].base); set(i, tmpC.clone().multiplyScalar(gl[i] * 1.0 + hh * (0.55 + 0.2 * pulse)), 1, i === 4 ? dark2 : dark, hold[i] * (1 - 0.5 * hh)); });
    regTex.needsUpdate = true;
    // cerebellum, stem
    cerebMesh.material.emissiveIntensity = hv('cerebellum') * (0.7 + 0.2 * pulse);
    stem.material.emissive.copy(C('#2de2c8')).lerp(C('#ff9a3d'), clamp(SNS * 1.4 - 0.1)); stem.material.emissiveIntensity = 0.08 + 0.3 * Math.max(SNS, PNS * 0.5) + hv('brainstem') * 0.8;
    // deep structures
    const amyHot = C('#ffd06a').lerp(C('#ff2e2e'), clamp(A * 1.4));
    amy.forEach(m => { m.material.color.copy(amyHot); m.material.emissive.copy(amyHot); m.material.emissiveIntensity = 0.3 + 1.5 * A + hv('amygdala'); const sc = (1 + 0.32 * L) * (1 + 0.14 * A * (Math.sin(T * (3 + 9 * A)) * 0.5 + 0.5)) * (1 + 0.15 * hv('amygdala')); m.scale.set(sc, sc * 0.85, sc * 1.1); });
    hippo.forEach(m => { const sc = (1 - 0.24 * L) * (1 + 0.1 * hv('hippocampus')); m.scale.set(sc, sc, sc); const dim = clamp(L * 0.7 + Co * 0.2); m.material.color.copy(C('#5ad1ff')).lerp(C('#4a5878'), dim); m.material.emissive.copy(m.material.color); m.material.emissiveIntensity = 0.32 * (1 - dim * 0.6) + hv('hippocampus') * 0.9; });
    thal.forEach(m => { m.material.emissiveIntensity = 0.22 + 0.3 * A + hv('thalamus') * 0.9; });
    hypo.material.emissiveIntensity = 0.3 + 1.3 * A * (SIM.chainStep() >= 2 ? 1 : 0.2) + hv('hypothalamus'); hypo.scale.setScalar(1 + 0.2 * A * pulse + 0.15 * hv('hypothalamus'));
    pit.material.emissiveIntensity = 0.3 + 1.2 * Co + hv('pituitary'); pit.scale.setScalar(1 + 0.2 * hv('pituitary'));
    // body: heart beat
    heartPh += dt * o.hr / 60; const ph = heartPh % 1; const beat = Math.exp(-Math.pow((ph - 0.06) / 0.05, 2)) + 0.6 * Math.exp(-Math.pow((ph - 0.3) / 0.06, 2));
    const hb = heart.userData.base; const hs = 1 + 0.15 * beat + 0.12 * hv('heart'); heart.scale.set(hb.x * hs, hb.y * hs, hb.z * hs); heart.material.emissiveIntensity = 0.35 + 0.8 * beat * (0.5 + SNS) + hv('heart') * 0.8;
    if (Math.floor(heartPh) !== lastBeat) { lastBeat = Math.floor(heartPh); cb.beat(o.hr); }
    // lungs
    breathPh += dt * o.rr / 60; const inh = Math.sin(breathPh * Math.PI * 2) * 0.5 + 0.5;
    lungs.forEach(l => { const b = l.userData.base, s = 1 + 0.12 * inh * (1 + 0.5 * SNS); l.scale.set(b.x * s, b.y * (1 + 0.05 * inh), b.z * s); l.material.emissiveIntensity = 0.12 + 0.2 * inh + hv('lungs') * 0.8; });
    // stomach / gut
    const dg = o.digest, churn = Math.sin(T * (1 + 4 * dg)) * 0.06 * dg;
    const sc1 = C('#ff9a8a').lerp(C('#8892aa'), clamp(1 - dg * 1.25));
    [stomachG, gut].forEach(m => { const b = m.userData.base; m.scale.set(b.x * (1 + churn), b.y * (1 - churn), b.z * (1 + churn)); m.material.color.copy(sc1); m.material.emissive.copy(sc1); m.material.emissiveIntensity = 0.1 + 0.3 * dg + hv('stomach') * 0.8; });
    // adrenals
    adrenals.forEach(a => { const b = a.userData.base, s = 1 + 0.3 * Ad * pulse + 0.15 * hv('adrenals'); a.scale.set(b.x * s, b.y * s, b.z * s); a.material.emissiveIntensity = 0.3 + 1.8 * Ad + 0.7 * Co + hv('adrenals'); });
    // muscles
    arms.forEach((m, i) => { const ts = o.tension; m.material.emissiveIntensity = 0.1 + 1.3 * ts + hv('muscles') * 0.6; m.material.opacity = 0.3 + 0.4 * ts; m.scale.set(1 + 0.18 * ts, 1, 1 + 0.18 * ts); const tr = 0.03 * ts * ts * Math.sin(T * 45 + i * 2); m.position.set(m.userData.p0.x + tr, m.userData.p0.y, m.userData.p0.z); });
    spineMesh.material.emissiveIntensity = 0.06 + 1.0 * SNS + hv('spine') * 0.8;
    // paths
    const sy = clamp(SNS * 1.1);
    ['sHeart', 'sLungL', 'sLungR', 'sGut', 'sAdrL', 'sAdrR', 'sArmL', 'sArmR'].forEach(k => paths[k].update(dt, sy));
    const pv = clamp((PNS - 0.45) * 1.9) * (SNS < 0.7 ? 1 : 0.4); ['vHeart', 'vLung', 'vGut'].forEach(k => paths[k].update(dt, pv + (S.hover === 'vagus' ? 0.3 : 0)));
    paths.amyHypo.update(dt, clamp(A * 1.2)); paths.amyHypoR.update(dt, clamp(A * 1.2));
    paths.hpa1.update(dt, clamp((A - 0.1) * 1.5)); paths.acth.update(dt, clamp(Co * 1.3 - 0.05)); paths.cort.update(dt, clamp(Co * 1.3 - 0.05));
    // glows
    const gset = (k, op, col) => { const g = glows[k]; g.material.opacity = clamp(op); if (col) g.material.color.set(col); };
    const pa = (id) => { const w = ANCH[id](camSide()); return w; };
    glows.amy.position.copy(pa('amygdala')); gset('amy', A * 0.75 + hv('amygdala') * 0.4);
    glows.hy.position.copy(hypo.position); gset('hy', 0.9 * A * (SIM.chainStep() >= 2 ? 1 : 0) + hv('hypothalamus') * 0.4);
    glows.adrL.position.copy(adrenals[0].position); glows.adrR.position.copy(adrenals[1].position); gset('adrL', Ad * 0.85 + hv('adrenals') * 0.4); gset('adrR', Ad * 0.85 + hv('adrenals') * 0.4);
    glows.heart.position.copy(heart.position); gset('heart', 0.6 * beat * SNS + hv('heart') * 0.4);
    glows.pfc.position.set(0, 0.5, 1.15); gset('pfc', (1 - o.pfc) * 0.0 + (o.pfc > 0.6 ? 0.18 * o.pfc : 0) + hv('prefrontal') * 0.3, '#6aa7ff');
    glows.hip.position.copy(pa('hippocampus')); gset('hip', Co * 0.35 * (S.xray ? 1 : 0) + hv('hippocampus') * 0.4);
    // hover glow follows the cursor on the surface
    if (S.hover && S.hoverPoint) { hoverGlow.position.copy(S.hoverPoint); hoverGlow.material.color.copy(R[S.hover].base); hoverGlow.material.opacity += (0.7 - hoverGlow.material.opacity) * Math.min(1, dt * 12); }
    else hoverGlow.material.opacity += (0 - hoverGlow.material.opacity) * Math.min(1, dt * 8);
    // cortex transparency (surface <-> x-ray)
    const goal = S.xray ? 0.07 : 1, cur = cortexMat.opacity; cortexMat.opacity += (goal - cur) * Math.min(1, dt * 6); const solid = cortexMat.opacity > 0.985;
    cortexMat.depthWrite = solid;
    cerebMesh.material.transparent = false;
    // adrenaline burst particles
    emitBurst(dt, Ad);
    // bolts
    updateBolts(dt); updateRipples(dt);
    while (timeline.length && timeline[0].at <= 0) timeline.shift().fn();
    timeline.forEach(e => e.at -= dt);
    S.beat = beat; S.inhale = inh; S.cortexOpacity = cortexMat.opacity; S.cortexTransparent = cortexMat.transparent;
  }

  /* ---------- burst + bolts rendering ---------- */
  let burstState;
  function emitBurst(dt, Ad) {
    const B = burstState, n = B.P.n; B.acc += dt * Ad * Ad * 55;
    while (B.acc >= 1) { B.acc -= 1; const i = B.next++ % n, a = adrenals[Math.random() < 0.5 ? 0 : 1]; B.life[i] = 1; const v = V3(Math.random() - 0.5, Math.random() * 0.6 + 0.3, Math.random() - 0.5).normalize().multiplyScalar(0.5 + Math.random() * 0.8); B.vx[i] = v.x; B.vy[i] = v.y; B.vz[i] = v.z; B.P.pos[i * 3] = a.position.x; B.P.pos[i * 3 + 1] = a.position.y + 0.1; B.P.pos[i * 3 + 2] = a.position.z; }
    for (let i = 0; i < n; i++) { if (B.life[i] > 0) { B.life[i] -= dt * 0.5; B.P.pos[i * 3] += B.vx[i] * dt; B.P.pos[i * 3 + 1] += B.vy[i] * dt; B.P.pos[i * 3 + 2] += B.vz[i] * dt; B.P.size[i] = 0.09 * Math.max(0, B.life[i]); } else B.P.size[i] = 0; }
    B.P.g.attributes.position.needsUpdate = true; B.P.g.attributes.aSize.needsUpdate = true;
  }
  function updateBolts(dt) {
    const Bp = boltP.P, TR = 6; let k = 0;
    for (let b = bolts.length - 1; b >= 0; b--) { const x = bolts[b]; x.t += dt; if (x.t >= x.dur) { bolts.splice(b, 1); x.then && x.then(); } }
    for (const x of bolts) { if (x.t < 0) continue; const u = clamp(x.t / x.dur);
      for (let j = 0; j < TR && k < Bp.n; j++, k++) { const uu = clamp(u - j * 0.025), p = x.curve.getPoint(uu); Bp.pos[k * 3] = p.x; Bp.pos[k * 3 + 1] = p.y; Bp.pos[k * 3 + 2] = p.z; Bp.col[k * 3] = x.color.r; Bp.col[k * 3 + 1] = x.color.g; Bp.col[k * 3 + 2] = x.color.b; Bp.size[k] = x.size * (1 - j / TR) * 1.2; } }
    for (; k < Bp.n; k++) Bp.size[k] = 0;
    ['position', 'aSize', 'aCol'].forEach(a => Bp.g.attributes[a].needsUpdate = true);
  }
  function updateRipples(dt) {
    for (let i = ripples.length - 1; i >= 0; i--) { const m = ripples[i]; m.userData.t += dt; const u = m.userData.t / 0.9; m.scale.setScalar(0.12 + u * 0.55); m.material.opacity = Math.max(0, 0.9 * (1 - u)); m.quaternion.copy(camera.quaternion);
      if (u >= 1) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); ripples.splice(i, 1); } }
  }

  /* ---------- labels ---------- */
  const LABELSET = { surface: ['prefrontal', 'motor', 'parietal', 'temporal', 'occipital', 'cerebellum', 'brainstem'], xray: ['amygdala', 'hippocampus', 'hypothalamus', 'pituitary', 'thalamus', 'brainstem'], body: ['heart', 'lungs', 'stomach', 'adrenals', 'muscles'] };
  function makeLabels(box) {
    labelsBox = box; Object.keys(SB.REGIONS).forEach(id => { const e = document.createElement('div'); e.className = 'lbl'; e.textContent = SB.REGIONS[id].name.replace(/ \(.*\)/, ''); e.style.borderColor = SB.REGIONS[id].color; e.dataset.id = id; box.appendChild(e); labelEls[id] = e; });
  }
  const pv = new THREE.Vector3();
  function updateLabels() {
    const show = new Set(); if (S.labelsOn && !S.hideNames) { (S.view === 'body' ? LABELSET.body : (S.xray ? LABELSET.xray : LABELSET.surface)).forEach(i => show.add(i)); if (S.view === 'brain' && S.xray) show.add('prefrontal'); }
    if (S.hover && !S.hideNames) show.add(S.hover); if (S.selected && !S.hideNames) show.add(S.selected);
    for (const id in labelEls) { const e = labelEls[id]; if (!show.has(id)) { e.style.display = 'none'; continue; }
      const a = anchor(id, camSide()); if (!a) { e.style.display = 'none'; continue; }
      pv.copy(a).project(camera); if (pv.z > 1 || pv.z < -1) { e.style.display = 'none'; continue; }
      e.style.display = 'block'; e.style.transform = `translate(${((pv.x + 1) / 2) * W}px,${((1 - pv.y) / 2) * H}px) translate(-50%,-130%)`; e.classList.toggle('hot', id === S.hover || id === S.selected); }
  }

  /* ---------- init ---------- */
  function init(cv, stg, labelBox) {
    canvas = cv; stage = stg;
    try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { S.glOK = false; return false; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15; renderer.setClearColor(0x000000, 0);
    scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(36, 1, 0.1, 80);
    scene.add(new THREE.HemisphereLight(0xaec4ff, 0x3a2036, 1.1)); const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(3, 4, 5); scene.add(key);
    const rim = new THREE.DirectionalLight(0x6aa7ff, 1.6); rim.position.set(-4, 2, -4); scene.add(rim); const fill = new THREE.DirectionalLight(0xffb48a, 0.7); fill.position.set(-5, -2, 3); scene.add(fill);
    root.add(brain, body); scene.add(root);
    buildBrain(); buildBody(); buildPaths();
    // anchors (functions of camera side)
    const rayAt = (y, z, s) => { const r = new THREE.Raycaster(V3(s * 3, y, z), V3(-s, 0, 0)); const h = r.intersectObject(cortexProxy, false); return h.length ? h[0].point.clone().multiplyScalar(1.03) : V3(s * 0.9, y, z); };
    cortexProxy.updateMatrixWorld(true);
    const cortexA = { prefrontal: [0.3, 0.95], motor: [0.62, 0.22], parietal: [0.5, -0.3], temporal: [-0.38, -0.05], occipital: [0.05, -0.95] };
    for (const id in cortexA) { const L1 = rayAt(cortexA[id][0], cortexA[id][1], -1), R1 = rayAt(cortexA[id][0], cortexA[id][1], 1); ANCH[id] = s => (s < 0 ? L1 : R1); }
    ANCH.cerebellum = s => V3(s * 0.4, -0.7, -1.05); ANCH.brainstem = () => V3(0.0, -1.0, -0.5);
    ANCH.amygdala = s => V3(s < 0 ? -0.47 : 0.47, -0.34, 0.36); ANCH.hippocampus = s => V3(s < 0 ? -0.5 : 0.5, -0.3, -0.15);
    ANCH.hypothalamus = () => V3(0, -0.24, 0.24); ANCH.pituitary = () => V3(0, -0.46, 0.3); ANCH.thalamus = s => V3(s < 0 ? -0.17 : 0.17, 0.02, -0.02);
    ANCH.adrenals = s => V3(s * 0.58, -4.45, -0.3); ANCH.heart = () => V3(-0.15, -3.25, 0.12); ANCH.lungs = s => V3(s * 0.66, -3.05, -0.05);
    ANCH.stomach = () => V3(-0.38, -4.1, 0.2); ANCH.muscles = s => V3(s * 1.72, -3.9, 0.02); ANCH.spine = () => V3(0, -3.3, -0.47); ANCH.vagus = s => V3(s * 0.45, -2.5, 0.2);
    for (const id in R) if (!ANCH[id]) ANCH[id] = () => V3(0, 0, 0);
    // glows
    glows = { amy: glow('#ff7a3a', 1.4), hy: glow('#ff8a3d', 1.2), adrL: glow('#ffb347', 1.5), adrR: glow('#ffb347', 1.5), heart: glow('#ff4d6a', 1.6), pfc: glow('#6aa7ff', 2.2), hip: glow('#d6ff6a', 1.3) };
    Object.values(glows).forEach(g => scene.add(g)); hoverGlow = glow('#ffffff', 0.9); scene.add(hoverGlow);
    // shared point systems
    burstState = { P: makePoints(160), acc: 0, next: 0, life: new Float32Array(160), vx: new Float32Array(160), vy: new Float32Array(160), vz: new Float32Array(160) };
    for (let i = 0; i < 160; i++) { burstState.P.col[i * 3] = 1; burstState.P.col[i * 3 + 1] = 0.65; burstState.P.col[i * 3 + 2] = 0.2; }
    scene.add(burstState.P.pts); boltP.P = makePoints(60); scene.add(boltP.P.pts);
    makeLabels(labelBox); bindInput(); resize(); window.addEventListener('resize', resize); new ResizeObserver(resize).observe(stage);
    S.ready = true; return true;
  }
  function resize() {
    if (!renderer) return; W = Math.max(1, stage.clientWidth); H = Math.max(1, stage.clientHeight); renderer.setSize(W, H, false); camera.aspect = W / H;
    // on narrow screens pull the camera back so the brain fits
    camera.fov = W / H < 0.9 ? 46 : 36; camera.updateProjectionMatrix(); ptMat.uniforms.uScale.value = (H * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360)) * renderer.getPixelRatio() / renderer.getPixelRatio();
    ptMat.uniforms.uScale.value = (H * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
  }
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min(0.05, (now - last) / 1000); last = now; if (!S.ready) return;
    clock += dt; SIM.tick(dt); apply(dt, clock);
    if (S.spin) cam.g.theta += dt * 0.25;
    applyCam(dt); updateLabels(); renderer.render(scene, camera);
  }
  return {
    S, init, start() { requestAnimationFrame(frame); }, setView, focusRegion, playChain, pickAt, camSide, resize,
    on(ev, fn) { cb[ev] = fn; },
    setXray(b) { S.xray = b; }, setSpin(b) { S.spin = b; }, resetCam() { cam.g.theta = -1.05; cam.g.phi = S.view === 'body' ? 1.5 : 1.38; Object.assign(cam.g, VIEWS[S.view]); },
    setSelected(id) { S.selected = id; }, flash(id) { const a = anchor(id, camSide()); if (a) ripple(a, SB.REGIONS[id].color); },
    get regionIds() { return Object.keys(R); }
  };
})();
