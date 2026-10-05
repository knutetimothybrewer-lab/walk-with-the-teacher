// ===== FIGURE: the animated person (outside) + inside view (organs) =====
const SKINS = ['#fbd9c0', '#f1c9a5', '#d9a273', '#b9794d', '#8d5a3a', '#5e3b26'];
const HAIRS = ['#2b2118', '#6b4423', '#c9923a', '#b5442a', '#1a1a2e', '#8f8f99'];
const SHIRTS = ['#e4572e', '#2a9d8f', '#4361ee', '#f2b134', '#9b5de5', '#2b2d42'];

const hex2rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => { const A = hex2rgb(a), B = hex2rgb(b); t = clamp(t, 0, 1); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const NS = 'http://www.w3.org/2000/svg';

function ik(sx, sy, tx, ty, L1, L2, side) {
  let dx = tx - sx, dy = ty - sy, d = Math.hypot(dx, dy) || 1;
  const maxd = L1 + L2 - 0.5;
  if (d > maxd) { dx *= maxd / d; dy *= maxd / d; d = maxd; }
  const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const mx = sx + dx * a / d, my = sy + dy * a / d, px = -dy / d, py = dx / d;
  const e1 = [mx + px * h, my + py * h], e2 = [mx - px * h, my - py * h];
  const sc = e => e[1] + side * e[0] * 0.6;
  const e = sc(e1) >= sc(e2) ? e1 : e2;
  return { ex: e[0], ey: e[1], hx: sx + dx, hy: sy + dy };
}

// hand targets for poses: [[Rx,Ry],[Lx,Ly]]  (R = screen-right arm)
function poseTable(sh) {
  const rx = 200 + sh + 12, lx = 200 - sh - 12;
  return {
    rest: [[rx, 322], [lx, 322]],
    mouth: [[226, 172], [lx, 322]],
    phone: [[236, 152], [lx, 322]],
    stomach: [[222, 300], [178, 300]],
    shrug: [[rx + 30, 262], [lx - 30, 262]],
    wave: [[rx, 322], [128, 118]],
    cheer: [[290, 112], [110, 112]],
    flex: [[292, 160], [108, 160]],
    head: [[246, 98], [154, 98]],
    hips: [[rx - 4, 300], [lx + 4, 300]],
    hold: [[226, 290], [174, 290]],
    stop: [[286, 190], [lx, 322]],
    give: [[270, 255], [lx, 322]],
    cheek: [[238, 166], [lx, 322]],
    book: [[222, 262], [178, 268]]
  };
}

function figMarkup(P) {
  const id = n => `id="${P}${n}"`;
  return `
<defs>
  <linearGradient ${id('wallg')} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="436"><stop ${id('ws0')} offset="0" stop-color="#eef3f8"/><stop ${id('ws1')} offset="1" stop-color="#d9e2ec"/></linearGradient>
  <radialGradient ${id('glow')}><stop offset="0" stop-color="#bfe3ff" stop-opacity=".95"/><stop offset="1" stop-color="#bfe3ff" stop-opacity="0"/></radialGradient>
  <clipPath ${id('ceL')}><ellipse cx="178" cy="128" rx="11" ry="9"/></clipPath>
  <clipPath ${id('ceR')}><ellipse cx="222" cy="128" rx="11" ry="9"/></clipPath>
  <clipPath ${id('cwin')}><rect x="283" y="46" width="94" height="100" rx="4"/></clipPath>
</defs>
<g ${id('scene')}>
  <rect ${id('wall')} x="-800" y="-900" width="2000" height="1336" fill="url(#${P}wallg)"/>
  <rect ${id('floor')} x="-800" y="430" width="2000" height="900" fill="#c9b79c"/>
  <rect x="-800" y="428" width="2000" height="6" fill="#00000018"/>
  <g clip-path="url(#${P}cwin)">
    <rect ${id('sky')} x="283" y="46" width="94" height="100" fill="#8ed1fc"/>
    <g ${id('sun')}><circle cx="350" cy="76" r="15" fill="#ffd43b"/>
      <g stroke="#ffd43b" stroke-width="3" stroke-linecap="round"><path d="M350 52v-7M350 100v7M326 76h-7M374 76h7M333 59l-5-5M367 93l5 5M367 59l5-5M333 93l-5 5"/></g></g>
    <g ${id('clouds')} fill="#fff"><ellipse cx="312" cy="104" rx="20" ry="9"/><ellipse cx="326" cy="98" rx="14" ry="9"/><ellipse cx="352" cy="118" rx="22" ry="8"/></g>
    <g ${id('gloom')} opacity="0" fill="#6b7480"><ellipse cx="320" cy="76" rx="34" ry="14"/><ellipse cx="352" cy="92" rx="30" ry="14"/><ellipse cx="338" cy="60" rx="26" ry="12"/></g>
  </g>
  <rect x="283" y="46" width="94" height="100" rx="4" fill="none" stroke="#fff" stroke-width="6"/>
  <path d="M330 46v100M283 96h94" stroke="#fff" stroke-width="4"/>
  <g ${id('plants')}>
    <rect x="30" y="396" width="34" height="34" rx="5" fill="#b5651d"/>
    <path d="M47 396c-22-24-26-46-14-58 8 14 12 30 14 58zM47 396c-4-30 0-52 10-66 8 18 4 40-10 66zM47 396c12-22 28-34 40-34-4 16-18 28-40 34z" fill="#2f9e44"/>
    <rect x="344" y="404" width="28" height="26" rx="4" fill="#d9480f"/>
    <path d="M358 404c-14-16-16-32-8-42 6 10 8 24 8 42zM358 404c6-18 16-26 26-26-2 12-12 20-26 26z" fill="#37b24d"/>
  </g>
  <g ${id('clut1')}><rect x="52" y="462" width="46" height="9" rx="2" fill="#e7b04f"/><rect x="56" y="452" width="40" height="10" rx="2" fill="#f1c261"/><circle cx="76" cy="457" r="5" fill="#c92a2a"/></g>
  <g ${id('clut2')}><path d="M308 480c10-16 46-14 56 0 4 8-6 12-30 12s-30-4-26-12z" fill="#7048e8"/><path d="M322 474c6-8 24-8 30 0" stroke="#5f3dc4" stroke-width="3" fill="none"/></g>
  <g ${id('clut3')}><rect x="100" y="490" width="14" height="20" rx="3" fill="#e03131"/><rect x="122" y="496" width="14" height="18" rx="3" fill="#868e96" transform="rotate(20 129 505)"/></g>
  <g ${id('clut4')}><ellipse cx="368" cy="450" rx="18" ry="22" fill="#343a40"/><rect x="360" y="426" width="16" height="8" rx="3" fill="#495057"/></g>
  <g ${id('clut5')}><rect x="20" y="486" width="30" height="14" rx="4" fill="#fa5252"/><rect x="40" y="478" width="22" height="12" rx="3" fill="#4dabf7"/></g>
  <g ${id('friends')} opacity="0">
    <g ${id('fr1')} transform="translate(52 0)"><circle cx="46" cy="352" r="15" fill="#f1c9a5"/><path d="M31 346c0-12 30-12 30 0" fill="#6b4423"/><rect x="32" y="366" width="28" height="44" rx="10" fill="#4361ee"/><rect x="36" y="408" width="8" height="22" rx="3" fill="#2b2d42"/><rect x="48" y="408" width="8" height="22" rx="3" fill="#2b2d42"/>
      <g ${id('fr1a')}><rect x="58" y="366" width="8" height="30" rx="4" fill="#f1c9a5"/></g></g>
    <g ${id('fr2')} transform="translate(-52 0)"><circle cx="354" cy="360" r="15" fill="#b9794d"/><path d="M339 358c0-14 30-14 30 0" fill="#1a1a2e"/><rect x="340" y="374" width="28" height="42" rx="10" fill="#f2b134"/><rect x="344" y="414" width="8" height="20" rx="3" fill="#2b2d42"/><rect x="356" y="414" width="8" height="20" rx="3" fill="#2b2d42"/>
      <g ${id('fr2a')}><rect x="334" y="374" width="8" height="30" rx="4" fill="#b9794d"/></g></g>
  </g>
  <ellipse ${id('shadow')} cx="200" cy="508" rx="82" ry="10" fill="#0000002e"/>
</g>
<g ${id('fxBack')}></g>
<g ${id('body')}>
  <g ${id('tank')} opacity="0"><rect x="78" y="420" width="34" height="86" rx="12" fill="#3f8a63"/><rect x="88" y="408" width="14" height="14" rx="3" fill="#868e96"/><circle cx="95" cy="448" r="8" fill="#fff"/><path d="M95 448l4-5" stroke="#e03131" stroke-width="2"/></g>
  <g ${id('legs')}>
    <line ${id('legL')} stroke-linecap="round" stroke="#3b4a6b"/><line ${id('legR')} stroke-linecap="round" stroke="#3b4a6b"/>
    <ellipse ${id('shoeL')} rx="21" ry="9" fill="#222"/><ellipse ${id('shoeR')} rx="21" ry="9" fill="#222"/>
  </g>
  <g ${id('upper')}>
    <rect ${id('neck')} x="188" y="172" width="24" height="40" rx="9"/>
    <path ${id('torso')}/>
    <path ${id('collar')} fill="none" stroke="#00000030" stroke-width="3" stroke-linecap="round"/>
    <g ${id('head')}>
      <ellipse cx="146" cy="132" rx="9" ry="13" ${id('earL')}/><ellipse cx="254" cy="132" rx="9" ry="13" ${id('earR')}/>
      <ellipse cx="200" cy="128" rx="54" ry="58" ${id('face')}/>
      <ellipse cx="200" cy="132" rx="52" ry="56" fill="#ff3b30" ${id('burnF')} opacity="0"/>
      <ellipse cx="200" cy="132" rx="52" ry="56" ${id('pallor')} opacity="0"/>
      <g ${id('spots')} fill="#7b4a2a" opacity="0">
        <circle cx="168" cy="108" r="3"/><circle cx="236" cy="104" r="2.5"/><circle cx="226" cy="150" r="3.5"/><circle cx="174" cy="154" r="2.5"/><circle cx="200" cy="100" r="2"/><circle cx="244" cy="130" r="2.5"/><circle cx="156" cy="132" r="2"/><circle cx="212" cy="116" r="1.8"/>
      </g>
      <g ${id('wrinkles')} fill="none" stroke="#6b4a3a" stroke-width="2" stroke-linecap="round" opacity="0">
        <path d="M168 94q32-6 64 0M172 102q28-5 56 0"/><path d="M148 124l-8 -4M148 130l-9 1M148 136l-8 5M252 124l8-4M252 130l9 1M252 136l8 5"/><path d="M178 146q-5 12 -3 18M222 146q5 12 3 18"/>
      </g>
      <ellipse cx="178" cy="142" rx="12" ry="4.5" fill="#6a4a7a" ${id('bagL')} opacity="0"/><ellipse cx="222" cy="142" rx="12" ry="4.5" fill="#6a4a7a" ${id('bagR')} opacity="0"/>
      <circle cx="164" cy="148" r="10" fill="#ff6b81" ${id('chkL')} opacity=".25"/><circle cx="236" cy="148" r="10" fill="#ff6b81" ${id('chkR')} opacity=".25"/>
      <ellipse cx="178" cy="128" rx="11" ry="9" fill="#fff"/><ellipse cx="222" cy="128" rx="11" ry="9" fill="#fff"/>
      <circle cx="178" cy="129" r="5.4" fill="#2b2118" ${id('pupL')}/><circle cx="222" cy="129" r="5.4" fill="#2b2118" ${id('pupR')}/>
      <circle cx="180" cy="127" r="1.6" fill="#fff" ${id('hlL')}/><circle cx="224" cy="127" r="1.6" fill="#fff" ${id('hlR')}/>
      <g clip-path="url(#${P}ceL)"><rect ${id('lidL')} x="164" y="116" width="28" height="0"/></g>
      <g clip-path="url(#${P}ceR)"><rect ${id('lidR')} x="208" y="116" width="28" height="0"/></g>
      <path ${id('lashL')} d="M167 128q11 -2 22 0" fill="none" stroke="#3a2a22" stroke-width="2" stroke-linecap="round" opacity="0"/><path ${id('lashR')} d="M211 128q11 -2 22 0" fill="none" stroke="#3a2a22" stroke-width="2" stroke-linecap="round" opacity="0"/>
      <path ${id('browL')} fill="none" stroke="#3a2a22" stroke-width="4.5" stroke-linecap="round"/><path ${id('browR')} fill="none" stroke="#3a2a22" stroke-width="4.5" stroke-linecap="round"/>
      <path ${id('nose')} d="M197 134q-3 9 3 10q5 -1 3 -10" fill="none" stroke="#00000030" stroke-width="2.4" stroke-linecap="round"/>
      <path ${id('mouthOpen')} fill="#fff" stroke="#5a2a2a" stroke-width="2.5" stroke-linejoin="round" opacity="0"/>
      <path ${id('mouthIn')} fill="#7a2230" opacity="0"/>
      <path ${id('teethBad')} fill="#6e4b1f" opacity="0"/>
      <path ${id('mouth')} fill="none" stroke="#5a2a2a" stroke-width="3.2" stroke-linecap="round"/>
      <ellipse cx="200" cy="132" rx="52" ry="56" fill="#ff3b30" ${id('burnN')} opacity="0" style="mix-blend-mode:multiply"/>
      <g ${id('hair')}><path ${id('hairBack')} d="M142 120C132 62 168 44 200 44C234 44 268 62 258 120C250 100 236 82 200 80C166 80 150 100 142 120Z"/>
        <path ${id('hairGray')} d="M142 120C132 62 168 44 200 44C234 44 268 62 258 120C250 100 236 82 200 80C166 80 150 100 142 120Z" fill="#d8dce2" opacity="0"/>
        <path d="M152 92C170 66 232 64 250 96" fill="none" stroke="#ffffff22" stroke-width="3" stroke-linecap="round"/></g>
      <g ${id('glasses')} fill="none" stroke="#3a3f47" stroke-width="3" opacity="0"><circle cx="178" cy="129" r="15"/><circle cx="222" cy="129" r="15"/><path d="M193 127q7-5 14 0M163 125l-14-3M237 125l14-3"/></g>
      <g ${id('sweat')} fill="#7cc8ff" opacity="0"><path d="M150 96q-8 12 0 16q8-4 0-16z"/><path d="M252 90q-8 12 0 16q8-4 0-16z"/></g>
      <path ${id('cannula')} d="M193 142q-26 6 -44 -2q-16 -8 -8 30q10 36 -10 130q-8 50 -22 122" fill="none" stroke="#8fd3ff" stroke-width="3.2" stroke-linecap="round" opacity="0"/>
      <g ${id('hat')} opacity="0"><ellipse cx="200" cy="92" rx="88" ry="16" fill="#e9c46a"/><path d="M148 90C148 44 252 44 252 90Z" fill="#e9c46a"/><path d="M148 86q52 12 104 0" stroke="#e76f51" stroke-width="7" fill="none"/></g>
    </g>
    <g ${id('arms')}>
      <g ${id('armL')}><line ${id('uaL')} stroke-linecap="round"/><line ${id('uaLb')} stroke-linecap="round"/><line ${id('faL')} stroke-linecap="round"/><circle ${id('hdL')}/><line ${id('burnAL')} stroke="#ff3b30" stroke-linecap="round" opacity="0"/></g>
      <g ${id('armR')}><line ${id('uaR')} stroke-linecap="round"/><line ${id('uaRb')} stroke-linecap="round"/><line ${id('faR')} stroke-linecap="round"/><circle ${id('hdR')}/><line ${id('burnAR')} stroke="#ff3b30" stroke-linecap="round" opacity="0"/></g>
    </g>
    <g ${id('props')}>
      <g ${id('glowP')} opacity="0"><circle cx="0" cy="22" r="34" fill="url(#${P}glow)"/></g>
      <g ${id('p_cig')} opacity="0"><rect x="-2.6" y="-4" width="5.2" height="26" rx="1.5" fill="#fff"/><rect x="-2.6" y="19" width="5.2" height="6" fill="#e8590c"/><rect x="-2.6" y="-4" width="5.2" height="5" fill="#d9a05b"/></g>
      <g ${id('p_vape')} opacity="0"><rect x="-5" y="-4" width="10" height="32" rx="4" fill="#3b5bdb"/><rect x="-3" y="26" width="6" height="8" rx="2" fill="#adb5bd"/><circle cx="0" cy="8" r="1.8" fill="#74c0fc"/></g>
      <g ${id('p_phone')} opacity="0"><rect x="-13" y="2" width="26" height="40" rx="5" fill="#212529"/><rect x="-10.5" y="5" width="21" height="33" rx="2.5" fill="#74c0fc"/></g>
      <g ${id('p_bottle')} opacity="0"><rect x="-7" y="-6" width="14" height="38" rx="6" fill="#4dabf7" stroke="#1971c2" stroke-width="1.5"/><rect x="-4" y="30" width="8" height="7" rx="2" fill="#1971c2"/></g>
      <g ${id('p_cup')} opacity="0"><path d="M-9-2h18l-3 30h-12z" fill="#ffd8a8" stroke="#e8590c" stroke-width="1.5"/></g>
      <g ${id('p_can')} opacity="0"><rect x="-8" y="-4" width="16" height="32" rx="4" fill="#e03131"/><rect x="-8" y="6" width="16" height="6" fill="#ffd43b"/></g>
      <g ${id('p_book')} opacity="0"><rect x="-17" y="-2" width="34" height="26" rx="3" fill="#4263eb"/><rect x="-14" y="1" width="28" height="20" rx="2" fill="#fff"/><path d="M0 1v20" stroke="#4263eb" stroke-width="2"/></g>
      <g ${id('p_pill')} opacity="0"><rect x="-4" y="2" width="8" height="18" rx="4" fill="#fff" stroke="#adb5bd"/><path d="M-4 11h8v5a4 4 0 0 1-8 0z" fill="#e03131"/></g>
      <g ${id('p_pad')} opacity="0"><rect x="-9" y="-2" width="18" height="22" rx="3" fill="#fff" stroke="#adb5bd"/><path d="M-5 5h10M-5 10h10M-5 15h6" stroke="#868e96" stroke-width="1.6"/></g>
    </g>
    <g ${id('cane')} opacity="0"><path d="M262 330v170M262 330q0 -14 -12 -14q-8 0 -8 8" fill="none" stroke="#7f5539" stroke-width="7" stroke-linecap="round"/></g>
    <g ${id('cloud')} opacity="0"><g fill="#6b7480"><ellipse cx="170" cy="40" rx="42" ry="20"/><ellipse cx="214" cy="34" rx="44" ry="22"/><ellipse cx="196" cy="52" rx="48" ry="16"/></g>
      <path ${id('bolt')} d="M200 54l-12 26h12l-8 24 24-32h-14l10-18z" fill="#ffd43b" opacity="0"/></g>
  </g>
</g>
<g ${id('fxFront')}></g>
<rect ${id('tint')} x="-800" y="-900" width="2000" height="2400" fill="#000" opacity="0" pointer-events="none"/>`;
}

const allFigures = [];
function createFigure(svg, look) {
  const P = 'f' + Math.random().toString(36).slice(2, 7) + '_';
  svg.setAttribute('viewBox', '0 0 400 560');
  svg.setAttribute('role', 'img');
  svg.innerHTML = figMarkup(P);
  const $ = n => svg.querySelector('#' + P + n);
  const el = {};
  ['wall', 'floor', 'ws0', 'ws1', 'sky', 'sun', 'clouds', 'gloom', 'plants', 'clut1', 'clut2', 'clut3', 'clut4', 'clut5', 'friends', 'fr1a', 'fr2a', 'shadow', 'fxBack', 'fxFront', 'body', 'tank', 'legL', 'legR', 'shoeL', 'shoeR',
    'upper', 'neck', 'torso', 'collar', 'head', 'earL', 'earR', 'face', 'burnF', 'pallor', 'spots', 'wrinkles', 'bagL', 'bagR', 'chkL', 'chkR', 'pupL', 'pupR', 'hlL', 'hlR', 'lidL', 'lidR', 'lashL', 'lashR', 'browL', 'browR', 'nose',
    'mouthOpen', 'mouthIn', 'teethBad', 'mouth', 'burnN', 'hairBack', 'hairGray', 'glasses', 'sweat', 'cannula', 'hat', 'uaL', 'uaLb', 'faL', 'hdL', 'burnAL', 'uaR', 'uaRb', 'faR', 'hdR', 'burnAR', 'props', 'glowP', 'p_cig', 'p_vape', 'p_phone',
    'p_bottle', 'p_cup', 'p_can', 'p_book', 'p_pill', 'p_pad', 'cane', 'cloud', 'bolt', 'tint', 'armR', 'armL'].forEach(n => el[n] = $(n));

  const F = { svg, look: Object.assign({ skin: SKINS[1], hair: HAIRS[0], shirt: SHIRTS[1] }, look || {}), rate: 3, time: 0, bpm: 70, rr: 14,
    tgt: null, vis: null, handCur: null, handTgt: 'rest', overlay: { prop: null, face: null, bob: 0, shake: 0, wobble: 0, run: 0, eyesClosed: 0, tint: null, hairHat: 0, dizzy: 0, cough: 0, glow: 0, cloud: 0, sun: 0 }, timers: [], blink: 0, nextBlink: 2, coughT: 5 };
  allFigures.push(F);

  const VKEYS = ['gray', 'wr', 'spots', 'burn', 'pallor', 'jaun', 'belly', 'musc', 'hunch', 'bags', 'mood', 'stress', 'energy', 'teeth', 'cheek', 'env', 'social', 'glasses', 'cane', 'oxy', 'age', 'lungs', 'thin', 'sag'];
  F.setState = function (st) {
    const s = st.s, v = vitals(st), a = st.age;
    const t = {
      gray: clamp((a - 34) / 32 + (s.stress - 40) / 220, 0, 1),
      wr: clamp((a - 24) / 55 * 0.6 + (100 - s.skin) / 100 * 0.75, 0, 1),
      spots: clamp((100 - s.skin - 8) / 70, 0, 1),
      burn: clamp(st.burn, 0, 1),
      pallor: clamp((100 - Math.min(s.lungs, s.heart, s.immune) - 25) / 90, 0, 0.7),
      jaun: clamp((55 - s.liver) / 55, 0, 1),
      belly: clamp((s.bmi - 22) / 8, -0.5, 1.3),
      musc: clamp((s.muscle - 40) / 60, 0, 1),
      hunch: clamp((a - 42) / 70 * 0.5 + (100 - s.bone) / 100 * 0.55 + (100 - s.muscle) / 100 * 0.35 - 0.1, 0, 1),
      bags: clamp((-st.h.sleep * 0.7 + (s.stress - 45) / 25) / 2.4, 0, 1),
      mood: s.mood, stress: s.stress, energy: v.energy,
      teeth: clamp((90 - s.teeth) / 70, 0, 1),
      cheek: clamp((s.mood - 40) / 60 * 0.4 + st.burn * 0.3, 0, 0.6),
      env: s.env, social: s.social,
      glasses: a > 46 ? 1 : 0,
      cane: (s.muscle + s.bone) / 2 < 38 && a > 40 ? 1 : 0,
      oxy: s.lungs < 34 ? 1 : 0,
      age: a, lungs: s.lungs,
      thin: clamp((19.2 - s.bmi) / 3, 0, 1),
      sag: clamp((50 - v.energy) / 50 + (45 - s.mood) / 120, 0, 1)
    };
    F.tgt = t; F.bpm = v.rhr; F.rr = v.rr; F.st = st;
    if (!F.vis) F.vis = Object.assign({}, t);
  };
  F.snap = function () { if (F.tgt) F.vis = Object.assign({}, F.tgt); F.draw(0); };

  F.setLook = function (look) { Object.assign(F.look, look); };

  // --- one-shot animations (see FX table in fx.js) ---
  F.later = (ms, fn) => { const id = setTimeout(fn, ms); F.timers.push(id); };
  F.clearFx = function () { F.timers.forEach(clearTimeout); F.timers = []; Object.assign(F.overlay, { prop: null, face: null, bob: 0, shake: 0, wobble: 0, run: 0, eyesClosed: 0, tint: null, hat: 0, dizzy: 0, cough: 0, glow: 0, cloud: 0, sun: 0 }); F.handTgt = 'rest'; el.fxBack.innerHTML = ''; el.fxFront.innerHTML = ''; };
  F.pose = (name, ms) => { F.handTgt = name; if (ms) F.later(ms, () => { if (F.handTgt === name) F.handTgt = 'rest'; }); };
  F.prop = (name, ms) => { F.overlay.prop = name; if (ms) F.later(ms, () => { if (F.overlay.prop === name) F.overlay.prop = null; }); };
  F.face = (f, ms) => { F.overlay.face = f; if (ms) F.later(ms, () => { if (F.overlay.face === f) F.overlay.face = null; }); };
  F.set = (k, v, ms) => { F.overlay[k] = v; if (ms) F.later(ms, () => { F.overlay[k] = (typeof v === 'number') ? 0 : null; }); };
  F.tintFlash = (color, alpha, ms) => { F.overlay.tint = { color, alpha, t0: performance.now(), ms }; };

  // particles: generic text/shape element that animates with WAAPI
  F.emit = function (kind, x, y, o) {
    o = o || {};
    const layer = o.back ? el.fxBack : el.fxFront;
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', `translate(${x} ${y})`);
    let node;
    if (kind === 'text') {
      node = document.createElementNS(NS, 'text');
      node.textContent = o.text; node.setAttribute('font-size', o.size || 26); node.setAttribute('text-anchor', 'middle');
      node.setAttribute('fill', o.fill || '#333'); if (o.bold) node.setAttribute('font-weight', 800);
      node.setAttribute('font-family', 'system-ui,"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif');
    } else if (kind === 'circle') {
      node = document.createElementNS(NS, 'circle'); node.setAttribute('r', o.r || 8); node.setAttribute('fill', o.fill || '#aaa');
    } else if (kind === 'line') {
      node = document.createElementNS(NS, 'line'); node.setAttribute('x1', 0); node.setAttribute('y1', 0); node.setAttribute('x2', o.len || 20); node.setAttribute('y2', 0);
      node.setAttribute('stroke', o.fill || '#fff'); node.setAttribute('stroke-width', o.w || 3); node.setAttribute('stroke-linecap', 'round');
    }
    g.appendChild(node); layer.appendChild(g);
    const dur = o.dur || 1800, dx = o.dx || 0, dy = o.dy === undefined ? -60 : o.dy, s0 = o.s0 === undefined ? 0.5 : o.s0, s1 = o.s1 === undefined ? 1 : o.s1;
    const kf = [{ transform: `translate(0px,0px) scale(${s0}) rotate(0deg)`, opacity: 0 },
                { transform: `translate(${dx * .25}px,${dy * .25}px) scale(${(s0 + s1) / 2}) rotate(${(o.rot || 0) / 4}deg)`, opacity: o.peak === undefined ? 1 : o.peak, offset: 0.2 },
                { transform: `translate(${dx}px,${dy}px) scale(${s1}) rotate(${o.rot || 0}deg)`, opacity: 0 }];
    try {
      const a = node.animate(kf, { duration: dur, delay: o.delay || 0, easing: 'ease-out', fill: 'both' });
      a.onfinish = () => g.remove();
    } catch (e) { setTimeout(() => g.remove(), dur + (o.delay || 0)); }
    return g;
  };

  // --- per-frame drawing ---
  F.draw = function (dt) {
    const v = F.vis, tgt = F.tgt, o = F.overlay, L = F.look;
    if (!v) return;
    F.time += dt;
    const k = Math.min(1, dt * F.rate);
    for (const key of VKEYS) v[key] += (tgt[key] - v[key]) * k;
    const T = F.time;
    // skin colors
    let skin = L.skin;
    skin = mix(skin, '#c8c2b5', v.pallor * 0.55);
    skin = mix(skin, '#d6c24a', v.jaun * 0.55);
    const skinD = mix(skin, '#000000', 0.12);
    ['face', 'earL', 'earR', 'neck'].forEach(n => el[n].setAttribute('fill', skin));
    el.pallor.setAttribute('fill', '#9aa79a'); el.pallor.setAttribute('opacity', (v.pallor * 0.25).toFixed(3));
    el.burnF.setAttribute('opacity', (v.burn * 0.5).toFixed(3));
    el.burnN.setAttribute('opacity', (v.burn * 0.3).toFixed(3));
    el.spots.setAttribute('opacity', clamp(v.spots * 1.1, 0, 1).toFixed(3));
    el.wrinkles.setAttribute('opacity', clamp(v.wr * 0.85, 0, 1).toFixed(3));
    el.bagL.setAttribute('opacity', (v.bags * 0.55).toFixed(3)); el.bagR.setAttribute('opacity', (v.bags * 0.55).toFixed(3));
    el.chkL.setAttribute('opacity', clamp(v.cheek, 0, 0.6).toFixed(3)); el.chkR.setAttribute('opacity', clamp(v.cheek, 0, 0.6).toFixed(3));
    // hair
    el.hairBack.setAttribute('fill', L.hair);
    el.hairGray.setAttribute('opacity', clamp(v.gray, 0, 1).toFixed(3));
    el.glasses.setAttribute('opacity', v.glasses.toFixed(2));
    // body shape
    const belly = v.belly, thin = v.thin;
    const sh = 46 + v.musc * 7 - thin * 6 + Math.max(0, belly) * 4;
    const waist = 38 + belly * 20 - thin * 8, bell = 40 + belly * 34 - thin * 8;
    const legW = 30 + Math.max(0, belly) * 12 - thin * 6;
    const shirt = L.shirt;
    // breathing
    const rrHz = F.rr / 60 * (o.run ? 2.2 : 1), breath = Math.sin(T * Math.PI * 2 * rrHz);
    const amp = 0.012 + (100 - v.lungs) * 0.00013;     // worse lungs: shallower / heavier chest heave
    const labor = clamp((100 - v.lungs) / 80, 0, 1);
    const b = breath * (0.014 + labor * 0.014 + (o.run ? 0.012 : 0)) + o.cough * Math.sin(T * 40) * 0.01;
    // bob/shake
    let bx = 0, by = 0, rot = 0;
    if (o.bob) { by = -Math.abs(Math.sin(T * 9)) * o.bob; }
    if (o.shake) { bx = Math.sin(T * 60) * o.shake; by += Math.cos(T * 53) * o.shake * 0.5; }
    if (o.wobble) rot = Math.sin(T * 3.2) * o.wobble;
    el.body.setAttribute('transform', `translate(${bx.toFixed(2)} ${by.toFixed(2)}) rotate(${rot.toFixed(2)} 200 500)`);
    el.shadow.setAttribute('rx', (82 + belly * 10 + by * 0.5).toFixed(1));
    const slump = v.hunch * 0.5 + v.sag * 0.5 + (o.face === 'slump' ? 0.6 : 0);
    const shY = 207 + slump * 14;
    el.upper.setAttribute('transform', `translate(200 340) scale(${(1 + b * 0.6).toFixed(4)} ${(1 + b - slump * 0.03).toFixed(4)}) translate(-200 -340)`);
    // torso
    const sw = sh + (1 - Math.min(1, v.hunch)) * 0;
    const topY = shY - 4;
    el.torso.setAttribute('d', `M${200 - sw} ${topY + 12}Q200 ${topY - 8} ${200 + sw} ${topY + 12}L${200 + sw - 3} 290Q${200 + bell} 322 ${200 + waist} 346L${200 - waist} 346Q${200 - bell} 322 ${200 - sw + 3} 290Z`);
    el.torso.setAttribute('fill', shirt);
    el.collar.setAttribute('d', `M184 ${topY + 2}Q200 ${topY + 22} 216 ${topY + 2}`);
    el.neck.setAttribute('y', (172 + slump * 4).toFixed(1));
    // head
    const headDy = slump * 14 - b * 120 * 0.0 + (o.face === 'slump' ? 6 : 0);
    const tilt = slump * 4 * Math.sin(T * 0.7) + (o.dizzy ? Math.sin(T * 5) * 6 : 0);
    el.head.setAttribute('transform', `translate(0 ${headDy.toFixed(1)}) rotate(${tilt.toFixed(2)} 200 190)`);
    // face expression
    const mood = o.face === 'sad' ? 18 : o.face === 'happy' ? 92 : o.face === 'angry' ? 22 : o.face === 'ouch' ? 20 : v.mood;
    const acute = o.face === 'angry' ? 1 : 0;
    const smile = (mood - 52) / 48;                     // -1..1
    const c = smile * 17;
    const mx0 = 182, mx1 = 218, my = 164;
    if (c > 4) {
      // open smile with teeth
      const depth = Math.min(c * 1.4, 22);
      el.mouthOpen.setAttribute('d', `M${mx0} ${my - 2}Q200 ${my + depth * 1.2} ${mx1} ${my - 2}Q200 ${my + 1} ${mx0} ${my - 2}Z`);
      el.mouthOpen.setAttribute('opacity', 1);
      el.mouthOpen.setAttribute('fill', mix('#ffffff', '#c9a15a', v.teeth * 0.9));
      el.teethBad.setAttribute('opacity', v.teeth > 0.55 ? (v.teeth - 0.4) : 0);
      el.teethBad.setAttribute('d', `M186 ${my - 1}q4 6 8 0M204 ${my}q4 7 8 0z`);
      el.mouth.setAttribute('d', `M${mx0 - 3} ${my - 4}Q${mx0} ${my - 2} ${mx0 + 2} ${my - 1}`);
      el.mouth.setAttribute('opacity', 0);
    } else {
      el.mouthOpen.setAttribute('opacity', 0); el.teethBad.setAttribute('opacity', 0);
      el.mouth.setAttribute('opacity', 1);
      const yy = my + (o.face === 'dizzy' ? 0 : 0);
      el.mouth.setAttribute('d', `M${mx0 + 2} ${yy + (c < 0 ? 4 : 0)}Q200 ${yy + c * 1.4 + (c < 0 ? 4 : 0)} ${mx1 - 2} ${yy + (c < 0 ? 4 : 0)}`);
    }
    if (o.face === 'ouch') { el.mouthOpen.setAttribute('opacity', 1); el.mouthOpen.setAttribute('d', `M188 164Q200 158 212 164Q200 178 188 164Z`); el.mouthOpen.setAttribute('fill', '#7a2230'); el.mouth.setAttribute('opacity', 0); }
    // eyes: blink, tiredness
    F.nextBlink -= dt; if (F.nextBlink < 0) { F.blink = 1; F.nextBlink = 2 + Math.random() * 3.5; }
    F.blink = Math.max(0, F.blink - dt * 7);
    const tired = clamp((50 - v.energy) / 50, 0, 0.85) + v.bags * 0.15;
    const closed = o.eyesClosed ? 1 : 0;
    const lid = clamp(Math.max(tired * 0.65, closed, F.blink > 0.5 ? 1 : F.blink * 2), 0, 1);
    const lidH = lid * 18.5;
    [['L', 164], ['R', 208]].forEach(([s]) => {
      el['lid' + s].setAttribute('height', lidH.toFixed(1)); el['lid' + s].setAttribute('fill', skin);
      el['lash' + s].setAttribute('opacity', lid > 0.2 ? 0.9 : 0);
      el['lash' + s].setAttribute('transform', `translate(0 ${(lidH - 9.5).toFixed(1)})`);
    });
    const look = Math.sin(T * 0.6) * 1.2;
    ['pupL', 'pupR', 'hlL', 'hlR'].forEach(n => el[n].setAttribute('transform', `translate(${look.toFixed(2)} ${(tired * 1.2).toFixed(2)})`));
    // brows: worry (stress), anger
    const worry = clamp((v.stress - 50) / 40, 0, 1) + (o.face === 'sad' ? 0.7 : 0);
    const sadB = clamp((45 - mood) / 45, 0, 1);
    const inner = 100 - worry * 9 - sadB * 5 + acute * 8, outer = 106 + worry * 3 + sadB * 2 - acute * 4;
    el.browL.setAttribute('d', `M163 ${outer}Q176 ${(inner + outer) / 2 - 4} 191 ${inner + 4}`);
    el.browR.setAttribute('d', `M237 ${outer}Q224 ${(inner + outer) / 2 - 4} 209 ${inner + 4}`);
    el.sweat.setAttribute('opacity', (clamp((v.stress - 60) / 30, 0, 1) * 0.9 + (o.run ? 1 : 0)).toFixed(2) > 1 ? 1 : clamp((v.stress - 60) / 30, 0, 1) * 0.9 + (o.run ? 1 : 0));
    el.sweat.setAttribute('transform', `translate(0 ${((T * 18) % 14).toFixed(1)})`);
    el.hat.setAttribute('opacity', o.hat ? 1 : 0);
    el.cane.setAttribute('opacity', v.cane > 0.5 ? 1 : 0);
    el.cannula.setAttribute('opacity', v.oxy > 0.5 ? 0.9 : 0);
    el.tank.setAttribute('opacity', v.oxy > 0.5 ? 1 : 0);
    // legs
    const swing = o.run ? Math.sin(T * 9) * 26 : (o.bob ? Math.sin(T * 5) * 8 : 0);
    const lw = legW, hipY = 330, footY = 498;
    const footLx = 200 - 24 - Math.max(0, belly) * 6 + swing, footRx = 200 + 24 + Math.max(0, belly) * 6 - swing;
    const liftL = o.run ? Math.max(0, Math.sin(T * 9)) * 18 : 0, liftR = o.run ? Math.max(0, -Math.sin(T * 9)) * 18 : 0;
    el.legL.setAttribute('x1', 200 - 18); el.legL.setAttribute('y1', hipY); el.legL.setAttribute('x2', footLx); el.legL.setAttribute('y2', footY - liftL);
    el.legR.setAttribute('x1', 200 + 18); el.legR.setAttribute('y1', hipY); el.legR.setAttribute('x2', footRx); el.legR.setAttribute('y2', footY - liftR);
    el.legL.setAttribute('stroke-width', lw.toFixed(1)); el.legR.setAttribute('stroke-width', lw.toFixed(1));
    el.shoeL.setAttribute('cx', footLx - 3); el.shoeL.setAttribute('cy', footY + 8 - liftL); el.shoeR.setAttribute('cx', footRx + 3); el.shoeR.setAttribute('cy', footY + 8 - liftR);
    // arms by IK
    const tbl = poseTable(sh), pn = tbl[F.handTgt] || tbl.rest;
    let tR = pn[0].slice(), tL = pn[1].slice();
    if (o.run) { tR[0] = 200 + sh + 18 + Math.sin(T * 9) * 10; tR[1] = 285 + Math.cos(T * 9) * 14; tL[0] = 200 - sh - 18 - Math.sin(T * 9) * 10; tL[1] = 285 - Math.cos(T * 9) * 14; }
    if (o.wave) { tL[0] += Math.sin(T * 8) * 12; }
    if (F.handTgt === 'wave') tL[0] += Math.sin(T * 8) * 14;
    if (F.handTgt === 'cheer') { tR[1] += Math.sin(T * 7) * 8; tL[1] += Math.cos(T * 7) * 8; }
    if (!F.hand) F.hand = { R: tR.slice(), L: tL.slice() };
    const hk = Math.min(1, dt * 9);
    ['R', 'L'].forEach((s2, i) => { const tt = i ? tL : tR; F.hand[s2][0] += (tt[0] - F.hand[s2][0]) * hk; F.hand[s2][1] += (tt[1] - F.hand[s2][1]) * hk; });
    const aw = 20 + v.musc * 7 + Math.max(0, belly) * 4 - thin * 4;
    const armSkin = skin;
    [['R', 1, 200 + sh - 2], ['L', -1, 200 - sh + 2]].forEach(([s2, side, sx]) => {
      const r = ik(sx, shY + 6, F.hand[s2][0], F.hand[s2][1], 58, 58, side);
      const ua = el['ua' + s2], uab = el['ua' + s2 + 'b'], fa = el['fa' + s2], hd = el['hd' + s2], ba = el['burnA' + s2];
      const sl = 0.62;
      ua.setAttribute('x1', sx); ua.setAttribute('y1', shY + 6); ua.setAttribute('x2', r.ex); ua.setAttribute('y2', r.ey); ua.setAttribute('stroke', armSkin); ua.setAttribute('stroke-width', aw);
      uab.setAttribute('x1', sx); uab.setAttribute('y1', shY + 6); uab.setAttribute('x2', sx + (r.ex - sx) * sl); uab.setAttribute('y2', shY + 6 + (r.ey - shY - 6) * sl); uab.setAttribute('stroke', shirt); uab.setAttribute('stroke-width', aw + 6);
      fa.setAttribute('x1', r.ex); fa.setAttribute('y1', r.ey); fa.setAttribute('x2', r.hx); fa.setAttribute('y2', r.hy); fa.setAttribute('stroke', armSkin); fa.setAttribute('stroke-width', aw - 3);
      hd.setAttribute('cx', r.hx); hd.setAttribute('cy', r.hy); hd.setAttribute('r', 10.5); hd.setAttribute('fill', armSkin);
      ba.setAttribute('x1', sx + (r.ex - sx) * sl); ba.setAttribute('y1', shY + 6 + (r.ey - shY - 6) * sl); ba.setAttribute('x2', r.hx); ba.setAttribute('y2', r.hy); ba.setAttribute('stroke-width', aw - 3);
      ba.setAttribute('opacity', (v.burn * 0.45).toFixed(3));
      if (s2 === 'R') { F.handR = r; }
    });
    // props on right hand
    const r = F.handR, dx = r.hx - r.ex, dy = r.hy - r.ey;
    const ang = Math.atan2(-dx, dy) * 180 / Math.PI;
    el.props.setAttribute('transform', `translate(${r.hx.toFixed(1)} ${r.hy.toFixed(1)}) rotate(${ang.toFixed(1)})`);
    ['cig', 'vape', 'phone', 'bottle', 'cup', 'can', 'book', 'pill', 'pad'].forEach(n => el['p_' + n].setAttribute('opacity', o.prop === n ? 1 : 0));
    el.glowP.setAttribute('opacity', o.glow ? 0.9 : 0);
    // scene
    const e = v.env, soc = v.social;
    const wallTop = mix('#c9ced6', '#f3f6fb', e / 100), wallBot = mix('#b4b9c2', '#e0e8f1', e / 100);
    el.ws0.setAttribute('stop-color', wallTop); el.ws1.setAttribute('stop-color', wallBot);
    el.floor.setAttribute('fill', mix('#8c8274', '#d3c0a2', e / 100));
    const nice = clamp((e - 50) / 40, 0, 1);
    el.plants.setAttribute('opacity', nice.toFixed(2));
    [['clut1', 38], ['clut2', 46], ['clut3', 56], ['clut4', 30], ['clut5', 22]].forEach(([n, th]) => el[n].setAttribute('opacity', clamp((th - e) / 14, 0, 1).toFixed(2)));
    const gl = clamp((50 - (v.mood * 0.6 + e * 0.4)) / 35, 0, 1);
    el.gloom.setAttribute('opacity', gl.toFixed(2)); el.clouds.setAttribute('opacity', (1 - gl).toFixed(2));
    el.sky.setAttribute('fill', mix('#8ed1fc', '#6f7a8a', gl)); el.sun.setAttribute('opacity', (1 - gl).toFixed(2));
    const fr = clamp((soc - 52) / 25, 0, 1);
    el.friends.setAttribute('opacity', fr.toFixed(2));
    el.fr1a.setAttribute('transform', `rotate(${(-40 + Math.sin(T * 5) * 25).toFixed(1)} 62 368)`); el.fr2a.setAttribute('transform', `rotate(${(40 - Math.sin(T * 5 + 1) * 25).toFixed(1)} 338 376)`);
    // cloud over head
    const lonely = clamp((34 - v.mood) / 22, 0, 1) * 0.8 + (o.cloud ? 1 : 0);
    el.cloud.setAttribute('opacity', clamp(lonely, 0, 1).toFixed(2));
    el.cloud.setAttribute('transform', `translate(0 ${(Math.sin(T * 1.4) * 3 + headDy).toFixed(1)})`);
    el.bolt.setAttribute('opacity', o.cloud > 1 && Math.sin(T * 7) > 0.6 ? 1 : 0);
    // tint overlay
    let ta = 0, tc = '#000';
    if (o.tint) { const p = (performance.now() - o.tint.t0) / o.tint.ms; if (p >= 1) o.tint = null; else { ta = o.tint.alpha * Math.sin(Math.min(1, p) * Math.PI); tc = o.tint.color; } }
    el.tint.setAttribute('fill', tc); el.tint.setAttribute('opacity', ta.toFixed(3));
    // periodic cough when lungs are damaged
    if (v.lungs < 62 && !o.cough) {
      F.coughT -= dt;
      if (F.coughT < 0) { F.coughT = 4 + Math.random() * 4 + (v.lungs / 20); F.cough(); }
    }
  };

  F.cough = function () {
    F.overlay.cough = 1; F.overlay.shake = 2;
    F.emit('text', 232, 140, { text: 'cough!', size: 17, fill: '#444', bold: 1, dx: 22, dy: -14, dur: 1200, s0: .8, s1: 1.1 });
    for (let i = 0; i < 3; i++) F.emit('circle', 226, 164, { r: 4 + i, fill: '#ffffffcc', dx: 40 + i * 8, dy: -6 + i * 8, dur: 800, delay: i * 70, s0: 1, s1: 2 });
    F.later(700, () => { F.overlay.cough = 0; F.overlay.shake = 0; });
    if (F.onCough) F.onCough();
  };

  F.fx = function (name) { F.clearFx(); const f = FX[name] || FX.good; f(F); };
  return F;
}

// ---------- the shared animation loop ----------
let lastT = 0;
function loop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0); lastT = t;
  for (let i = allFigures.length - 1; i >= 0; i--) {
    const f = allFigures[i];
    if (!f.svg.isConnected) { allFigures.splice(i, 1); continue; }
    if (f.vis) f.draw(dt);
  }
  for (let i = allInsides.length - 1; i >= 0; i--) {
    const f = allInsides[i];
    if (!f.svg.isConnected) { allInsides.splice(i, 1); continue; }
    if (f.vis) f.draw(dt);
  }
  requestAnimationFrame(loop);
}
const allInsides = [];
requestAnimationFrame(loop);

// ======================= INSIDE VIEW =======================
function createInside(svg) {
  const P = 'i' + Math.random().toString(36).slice(2, 6) + '_';
  svg.setAttribute('viewBox', '0 0 220 330');
  const tar = [];
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  for (let i = 0; i < 34; i++) { tar.push([50 + rnd() * 56, 108 + rnd() * 92, 2 + rnd() * 4.5, (i + 1) / 34]); }
  const lungPath = 'M104 100C84 98 56 112 50 150C46 182 56 206 82 204C100 202 106 190 106 164Z';
  svg.innerHTML = `
<defs><filter id="${P}blur"><feGaussianBlur stdDeviation="6"/></filter></defs>
<rect x="2" y="2" width="216" height="326" rx="16" fill="#101a2b" stroke="#1d2c47" stroke-width="2"/>
<circle id="${P}brainGlow" cx="110" cy="44" r="40" fill="#b197fc" opacity=".35" filter="url(#${P}blur)"/>
<g id="${P}brain"><path d="M70 52C64 30 84 14 108 16C134 14 156 30 150 52C148 70 126 74 110 70C92 74 72 70 70 52Z" id="${P}brainP" fill="#f1a8c0" stroke="#c95f86" stroke-width="2"/>
  <path d="M110 18C106 32 114 40 108 54M84 28C92 34 90 42 82 46M136 28C128 34 130 44 138 48M92 58C100 52 106 56 112 62M128 58C120 54 116 58 110 64" fill="none" stroke="#c95f86" stroke-width="2" stroke-linecap="round"/></g>
<text x="110" y="86" text-anchor="middle" font-size="10" fill="#8aa0c4" font-family="system-ui,sans-serif">Brain</text>
<g id="${P}lungs">
  <g id="${P}lungL"><path d="${lungPath}" id="${P}lungLp" stroke-width="3"/><g id="${P}tarL"></g><path d="M100 124C84 128 70 140 62 160M100 146C86 152 76 166 72 182" fill="none" stroke="#00000026" stroke-width="2.4" stroke-linecap="round"/></g>
  <g transform="translate(220 0) scale(-1 1)" id="${P}lungRw"><path d="${lungPath}" id="${P}lungRp" stroke-width="3"/><g id="${P}tarR"></g><path d="M100 124C84 128 70 140 62 160M100 146C86 152 76 166 72 182" fill="none" stroke="#00000026" stroke-width="2.4" stroke-linecap="round"/></g>
  <path d="M110 92v22M110 114Q96 118 84 132M110 114Q124 118 136 132" stroke="#d9c7a6" stroke-width="6" fill="none" stroke-linecap="round" id="${P}trach"/>
</g>
<g id="${P}heart" transform="translate(126 166)"><path d="M0,22C-34,-4 -28,-34 -10,-34C-2,-34 0,-26 0,-23C0,-26 2,-34 10,-34C28,-34 34,-4 0,22Z" id="${P}heartP" stroke-width="2.5"/>
  <path d="M-6 -20q-8 2 -10 10" fill="none" stroke="#ffffff55" stroke-width="3" stroke-linecap="round"/></g>
<text x="52" y="222" text-anchor="middle" font-size="10" fill="#8aa0c4" font-family="system-ui,sans-serif">Lungs</text>
<text x="188" y="150" text-anchor="middle" font-size="10" fill="#8aa0c4" font-family="system-ui,sans-serif">Heart</text>
<g id="${P}liver"><path d="M24 262C34 244 80 240 102 254C110 266 98 290 70 292C44 294 20 280 24 262Z" id="${P}liverP" stroke-width="2.5"/>
  <g id="${P}fat" fill="#f2d16b"></g></g>
<text x="64" y="310" text-anchor="middle" font-size="10" fill="#8aa0c4" font-family="system-ui,sans-serif">Liver</text>
<g id="${P}artery" transform="translate(166 266)"><circle r="26" fill="#d9777f" stroke="#a84c57" stroke-width="2.5"/><circle id="${P}plaque" r="22" fill="#f1d27a"/><circle id="${P}lumen" r="14" fill="#e03131"/></g>
<text x="166" y="310" text-anchor="middle" font-size="10" fill="#8aa0c4" font-family="system-ui,sans-serif">Artery (cross-section)</text>
<g id="${P}fx"></g>
<g font-family="system-ui,sans-serif" font-weight="700" font-size="11" id="${P}labels">
  <text id="${P}tBrain" x="110" y="98" text-anchor="middle"></text>
</g>`;
  const $ = n => svg.querySelector('#' + P + n);
  const el = {};
  ['brainGlow', 'brainP', 'lungs', 'lungLp', 'lungRp', 'tarL', 'tarR', 'trach', 'heart', 'heartP', 'liverP', 'fat', 'plaque', 'lumen', 'fx', 'brain'].forEach(n => el[n] = $(n));
  const mk = (g, side) => tar.forEach(t => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', t[0]); c.setAttribute('cy', t[1]); c.setAttribute('r', t[2]); c.setAttribute('fill', '#17101a'); c.setAttribute('opacity', 0); g.appendChild(c); });
  mk(el.tarL); mk(el.tarR);
  for (let i = 0; i < 9; i++) { const c = document.createElementNS(NS, 'circle'); c.setAttribute('cx', 34 + rnd() * 64); c.setAttribute('cy', 252 + rnd() * 34); c.setAttribute('r', 3 + rnd() * 4); c.setAttribute('opacity', 0); el.fat.appendChild(c); }
  const I = { svg, vis: null, tgt: null, time: 0, bpm: 70, rr: 14, pulse: 0, flashes: {}, burst: 0 };
  allInsides.push(I);
  I.setState = function (st) {
    const s = st.s, v = vitals(st);
    I.tgt = { lungs: s.lungs, heart: s.heart, brain: s.brain, liver: s.liver, metab: s.metab };
    I.bpm = v.rhr; I.rr = v.rr; I.st = st;
    if (!I.vis) I.vis = Object.assign({}, I.tgt);
  };
  I.snap = function () { if (I.tgt) I.vis = Object.assign({}, I.tgt); I.draw(0); };
  I.boost = function (ms, bpmMul, rrMul) { I.boostUntil = performance.now() + ms; I.bpmMul = bpmMul || 1.5; I.rrMul = rrMul || 1.6; };
  I.smoke = function () {
    for (let i = 0; i < 9; i++) {
      const c = document.createElementNS(NS, 'circle'); c.setAttribute('r', 5 + Math.random() * 4); c.setAttribute('fill', '#8c8c94');
      const g = document.createElementNS(NS, 'g'); g.setAttribute('transform', `translate(${104 + Math.random() * 12} 90)`); g.appendChild(c); el.fx.appendChild(g);
      const dx = (Math.random() < .5 ? -1 : 1) * (22 + Math.random() * 30);
      try { const a = c.animate([{ transform: 'translate(0,0) scale(.7)', opacity: 0 }, { transform: `translate(${dx * .2}px,18px) scale(1)`, opacity: .9, offset: .25 }, { transform: `translate(${dx}px,${60 + Math.random() * 50}px) scale(1.5)`, opacity: 0 }], { duration: 1800, delay: i * 120, easing: 'ease-in' }); a.onfinish = () => g.remove(); } catch (e) { g.remove(); }
    }
    I.flash('lungs', '#868e96');
  };
  I.flash = function (organ, color) { I.flashes[organ] = { t0: performance.now(), color }; };
  I.draw = function (dt) {
    const v = I.vis, t = I.tgt; if (!v) return;
    I.time += dt;
    const k = Math.min(1, dt * 3);
    for (const key in t) v[key] += (t[key] - v[key]) * k;
    const T = I.time, boosted = I.boostUntil && performance.now() < I.boostUntil;
    const bpm = I.bpm * (boosted ? I.bpmMul : 1), rr = I.rr * (boosted ? I.rrMul : 1);
    // lungs
    const dmg = clamp((100 - v.lungs) / 100, 0, 1);
    const lungCol = mix('#f58aa0', '#4a4048', Math.pow(dmg, 0.8) * 1.05);
    const lungStroke = mix('#d95f7c', '#2a2228', dmg);
    el.lungLp.setAttribute('fill', lungCol); el.lungRp.setAttribute('fill', lungCol);
    el.lungLp.setAttribute('stroke', lungStroke); el.lungRp.setAttribute('stroke', lungStroke);
    [el.tarL, el.tarR].forEach(g => { [...g.children].forEach((c, i) => c.setAttribute('opacity', clamp((dmg * 1.05 - i / 34 * 0.92) * 3, 0, 0.92).toFixed(2))); });
    const br = Math.sin(T * Math.PI * 2 * rr / 60);
    const shallow = 1 - dmg * 0.55;
    const sx = 1 + br * 0.06 * shallow, sy = 1 + br * 0.045 * shallow;
    el.lungs.setAttribute('transform', `translate(110 150) scale(${sx.toFixed(4)} ${sy.toFixed(4)}) translate(-110 -150)`);
    // heart: lub-dub
    const ph = (T * bpm / 60) % 1;
    const beat = Math.exp(-Math.pow((ph - 0.08) / 0.05, 2)) + 0.7 * Math.exp(-Math.pow((ph - 0.26) / 0.05, 2));
    const hs = 0.92 + beat * 0.14 * (0.6 + 0.4 * v.heart / 100);
    el.heart.setAttribute('transform', `translate(126 166) scale(${hs.toFixed(3)})`);
    const hl = clamp(v.heart / 100, 0, 1);
    el.heartP.setAttribute('fill', mix('#6b1b26', '#e8344f', hl)); el.heartP.setAttribute('stroke', mix('#3d0f16', '#b3162f', hl));
    // brain
    const bl = clamp(v.brain / 100, 0, 1);
    el.brainP.setAttribute('fill', mix('#8e7f8d', '#f4aac6', bl));
    el.brainGlow.setAttribute('opacity', (0.08 + bl * 0.4 + Math.sin(T * 2) * 0.04 * bl).toFixed(3));
    // liver
    const ll = clamp(v.liver / 100, 0, 1);
    el.liverP.setAttribute('fill', mix('#a68a3a', '#8a3b2d', ll)); el.liverP.setAttribute('stroke', mix('#6b5818', '#5c2219', ll));
    [...el.fat.children].forEach((c, i) => c.setAttribute('opacity', clamp((1 - ll) * 1.4 - i * 0.05, 0, 0.9).toFixed(2)));
    // artery: plaque grows as heart + metabolic health fall
    const clog = clamp((100 - (v.heart * 0.6 + v.metab * 0.4)) / 100 * 1.15, 0, 0.95);
    const lum = 14 * (1 - clog * 0.85) + 2;
    el.plaque.setAttribute('r', (22 + 0).toFixed(1)); el.plaque.setAttribute('opacity', clamp(clog * 2, 0, 1).toFixed(2));
    el.lumen.setAttribute('r', (3 + (22 - 3) * (1 - clog) * 0.62).toFixed(1));
    el.lumen.setAttribute('fill', mix('#a01c1c', '#e03131', 1 - clog * 0.5));
    // flashes
    const fl = I.flashes.lungs; if (fl) { const p = (performance.now() - fl.t0) / 900; if (p < 1) { el.lungLp.setAttribute('stroke-width', 3 + (1 - p) * 5); el.lungRp.setAttribute('stroke-width', 3 + (1 - p) * 5); } else { delete I.flashes.lungs; el.lungLp.setAttribute('stroke-width', 3); el.lungRp.setAttribute('stroke-width', 3); } }
  };
  return I;
}
