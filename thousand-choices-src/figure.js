// ===== FIGURE: the animated person (outside) + inside view (organs) =====
const SKINS = ['#fbd9c0', '#f1c9a5', '#d9a273', '#b9794d', '#8d5a3a', '#5e3b26'];
const HAIRS = ['#2b2118', '#6b4423', '#c9923a', '#b5442a', '#1a1a2e', '#8f8f99'];
const SHIRTS = ['#e4572e', '#2a9d8f', '#4361ee', '#f2b134', '#9b5de5', '#2b2d42'];
const BODIES = [['f', 'Female'], ['m', 'Male']];
const HAIRSTYLES = [['short', 'Short'], ['bob', 'Bob'], ['long', 'Long']];

const hex2rgb = h => { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)); };
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

// hand targets for poses: [[Rx,Ry],[Lx,Ly]]  (R = screen-right arm). Head is at y~70-150, mouth ~ (200,138)
function poseTable(sw) {
  const rx = 200 + sw + 7, lx = 200 - sw - 7;
  return {
    rest: [[rx, 300], [lx, 300]],
    mouth: [[212, 141], [lx, 296]],
    phone: [[222, 124], [lx, 296]],
    stomach: [[210, 252], [190, 252]],
    shrug: [[rx + 26, 228], [lx - 26, 228]],
    wave: [[rx, 296], [140, 96]],
    cheer: [[272, 92], [128, 92]],
    flex: [[270, 130], [130, 130]],
    head: [[232, 100], [168, 100]],
    hips: [[rx - 8, 262], [lx + 8, 262]],
    hold: [[214, 236], [186, 236]],
    stop: [[266, 150], [lx, 296]],
    give: [[252, 216], [lx, 296]],
    cheek: [[222, 134], [lx, 296]],
    book: [[212, 214], [188, 220]]
  };
}

const FACE_M = 'M146 112C146 74 172 66 200 66C228 66 254 74 254 112C254 152 236 188 200 190C164 188 146 152 146 112Z';
const FACE_F = 'M148 112C148 74 172 66 200 66C228 66 252 74 252 112C252 146 230 188 200 192C170 188 148 146 148 112Z';
const HAIR_BOB = 'M140 108C124 70 150 42 200 42C250 42 276 70 260 108C268 140 262 175 252 198C226 188 174 188 148 198C138 175 132 140 140 108Z';
const HAIR_LONG = 'M140 108C122 68 150 40 200 40C250 40 278 68 260 108C276 165 270 250 284 336C240 322 160 322 116 336C130 250 124 165 140 108Z';

function figMarkup(P) {
  const id = n => `id="${P}${n}"`;
  return `
<defs>
  <linearGradient ${id('wallg')} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="436"><stop ${id('ws0')} offset="0" stop-color="#eef3f8"/><stop ${id('ws1')} offset="1" stop-color="#d9e2ec"/></linearGradient>
  <radialGradient ${id('glow')}><stop offset="0" stop-color="#bfe3ff" stop-opacity=".95"/><stop offset="1" stop-color="#bfe3ff" stop-opacity="0"/></radialGradient>
  <linearGradient ${id('shade')} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".2"/><stop offset=".32" stop-color="#000" stop-opacity="0"/><stop offset=".62" stop-color="#fff" stop-opacity=".05"/><stop offset="1" stop-color="#000" stop-opacity=".26"/></linearGradient>
  <linearGradient ${id('shadeV')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>
  <radialGradient ${id('fshade')} cx=".42" cy=".38" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></radialGradient>
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
  <ellipse ${id('shadow')} cx="200" cy="508" rx="78" ry="10" fill="#0000002e"/>
</g>
<g ${id('fxBack')}></g>
<g ${id('body')}>
  <g ${id('tank')} opacity="0"><rect x="78" y="420" width="34" height="86" rx="12" fill="#3f8a63"/><rect x="88" y="408" width="14" height="14" rx="3" fill="#868e96"/><circle cx="95" cy="448" r="8" fill="#fff"/><path d="M95 448l4-5" stroke="#e03131" stroke-width="2"/></g>
  <g ${id('legs')}>
    <path ${id('legL')} stroke-linejoin="round" stroke-width="6"/><path ${id('legR')} stroke-linejoin="round" stroke-width="6"/>
    <path ${id('legLs')} fill="url(#${P}shade)" stroke="none"/><path ${id('legRs')} fill="url(#${P}shade)" stroke="none"/>
    <path ${id('shoeL')} fill="#23232b"/><path ${id('shoeR')} fill="#23232b"/>
  </g>
  <g ${id('upper')}>
    <g ${id('hairBackG')}><path ${id('hairBackLong')} fill="#2b2118" opacity="0"/><path ${id('hairBackGray')} fill="#d8dce2" opacity="0"/></g>
    <rect ${id('neck')} y="146" height="36" rx="7"/>
    <rect ${id('neckSh')} y="146" height="14" rx="6" fill="#000" opacity=".2"/>
    <path ${id('torso')}/>
    <path ${id('torsoSh')} fill="url(#${P}shade)"/>
    <path ${id('bust')} fill="none" stroke="#00000030" stroke-width="2.4" stroke-linecap="round" opacity="0"/>
    <path ${id('collar')} fill="#00000014" stroke="#00000033" stroke-width="2.4" stroke-linecap="round"/>
    <g ${id('head')}>
      <ellipse cx="146" cy="132" rx="9" ry="13" ${id('earL')}/><ellipse cx="254" cy="132" rx="9" ry="13" ${id('earR')}/>
      <path ${id('face')}/>
      <path ${id('faceSh')} fill="url(#${P}fshade)"/>
      <path ${id('burnF')} fill="#ff3b30" opacity="0"/>
      <path ${id('pallor')} opacity="0"/>
      <g ${id('spots')} fill="#7b4a2a" opacity="0">
        <circle cx="168" cy="108" r="3"/><circle cx="236" cy="104" r="2.5"/><circle cx="226" cy="150" r="3.5"/><circle cx="174" cy="154" r="2.5"/><circle cx="200" cy="100" r="2"/><circle cx="244" cy="130" r="2.5"/><circle cx="156" cy="132" r="2"/><circle cx="212" cy="116" r="1.8"/>
      </g>
      <g ${id('wrinkles')} fill="none" stroke="#6b4a3a" stroke-width="2" stroke-linecap="round" opacity="0">
        <path d="M168 94q32-6 64 0M172 102q28-5 56 0"/><path d="M148 124l-8 -4M148 130l-9 1M148 136l-8 5M252 124l8-4M252 130l9 1M252 136l8 5"/><path d="M178 146q-5 12 -3 18M222 146q5 12 3 18"/>
      </g>
      <ellipse cx="178" cy="142" rx="12" ry="4.5" fill="#6a4a7a" ${id('bagL')} opacity="0"/><ellipse cx="222" cy="142" rx="12" ry="4.5" fill="#6a4a7a" ${id('bagR')} opacity="0"/>
      <circle cx="164" cy="150" r="11" fill="#ff6b81" ${id('chkL')} opacity=".25"/><circle cx="236" cy="150" r="11" fill="#ff6b81" ${id('chkR')} opacity=".25"/>
      <ellipse cx="178" cy="128" rx="11.5" ry="9" fill="#f6f6f4" stroke="#00000030" stroke-width="1"/><ellipse cx="222" cy="128" rx="11.5" ry="9" fill="#f6f6f4" stroke="#00000030" stroke-width="1"/>
      <circle cx="178" cy="129" r="6.2" fill="#6b4a30" ${id('pupL')}/><circle cx="222" cy="129" r="6.2" fill="#6b4a30" ${id('pupR')}/>
      <circle cx="178" cy="129" r="3" fill="#111" ${id('pinL')}/><circle cx="222" cy="129" r="3" fill="#111" ${id('pinR')}/>
      <circle cx="180.5" cy="126.5" r="1.7" fill="#fff" ${id('hlL')}/><circle cx="224.5" cy="126.5" r="1.7" fill="#fff" ${id('hlR')}/>
      <g clip-path="url(#${P}ceL)"><rect ${id('lidL')} x="164" y="116" width="28" height="0"/></g>
      <g clip-path="url(#${P}ceR)"><rect ${id('lidR')} x="208" y="116" width="28" height="0"/></g>
      <path ${id('lashL')} d="M167 128q11 -2 22 0" fill="none" stroke="#3a2a22" stroke-width="2" stroke-linecap="round" opacity="0"/><path ${id('lashR')} d="M211 128q11 -2 22 0" fill="none" stroke="#3a2a22" stroke-width="2" stroke-linecap="round" opacity="0"/>
      <path ${id('topL')} d="M166 126q12 -11 25 -1M166 126l-4 -3" fill="none" stroke="#2a1d17" stroke-width="2.6" stroke-linecap="round"/><path ${id('topR')} d="M209 125q13 -10 25 1M234 126l4 -3" fill="none" stroke="#2a1d17" stroke-width="2.6" stroke-linecap="round"/>
      <path ${id('browL')} fill="none" stroke="#3a2a22" stroke-width="4.5" stroke-linecap="round"/><path ${id('browR')} fill="none" stroke="#3a2a22" stroke-width="4.5" stroke-linecap="round"/>
      <path ${id('nose')} d="M198 120q-2 14 -6 18q8 6 16 0q-4 -4 -2 -18" fill="#00000010" stroke="#00000030" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path ${id('mouthOpen')} fill="#fff" stroke="#5a2a2a" stroke-width="2.5" stroke-linejoin="round" opacity="0"/>
      <path ${id('teethBad')} fill="#6e4b1f" opacity="0"/>
      <path ${id('mouth')} fill="none" stroke="#5a2a2a" stroke-width="3.2" stroke-linecap="round"/>
      <path ${id('burnN')} fill="#ff3b30" opacity="0" style="mix-blend-mode:multiply"/>
      <g ${id('hair')}><path ${id('hairBack')} d="M142 120C132 62 168 44 200 44C234 44 268 62 258 120C250 100 236 82 200 80C166 80 150 100 142 120Z"/>
        <path ${id('hairGray')} d="M142 120C132 62 168 44 200 44C234 44 268 62 258 120C250 100 236 82 200 80C166 80 150 100 142 120Z" fill="#d8dce2" opacity="0"/>
        <path d="M152 92C170 66 232 64 250 96" fill="none" stroke="#ffffff22" stroke-width="3" stroke-linecap="round"/></g>
      <g ${id('glasses')} fill="none" stroke="#3a3f47" stroke-width="3" opacity="0"><circle cx="178" cy="129" r="15"/><circle cx="222" cy="129" r="15"/><path d="M193 127q7-5 14 0M163 125l-14-3M237 125l14-3"/></g>
      <g ${id('sweat')} fill="#7cc8ff" opacity="0"><path d="M150 96q-8 12 0 16q8-4 0-16z"/><path d="M252 90q-8 12 0 16q8-4 0-16z"/></g>
      <g ${id('hat')} opacity="0"><ellipse cx="200" cy="92" rx="88" ry="16" fill="#e9c46a"/><path d="M148 90C148 44 252 44 252 90Z" fill="#e9c46a"/><path d="M148 86q52 12 104 0" stroke="#e76f51" stroke-width="7" fill="none"/></g>
    </g>
    <path ${id('cannula')} d="M197 128Q186 136 170 126Q158 134 163 162Q170 236 142 330Q116 380 96 420" fill="none" stroke="#8fd3ff" stroke-width="3" stroke-linecap="round" opacity="0"/>
    <g ${id('arms')}>
      <g ${id('armL')}><line ${id('uaL')} stroke-linecap="round"/><line ${id('uaLb')} stroke-linecap="round"/><line ${id('faL')} stroke-linecap="round"/><ellipse ${id('hdL')}/><line ${id('burnAL')} stroke="#ff3b30" stroke-linecap="round" opacity="0"/></g>
      <g ${id('armR')}><line ${id('uaR')} stroke-linecap="round"/><line ${id('uaRb')} stroke-linecap="round"/><line ${id('faR')} stroke-linecap="round"/><ellipse ${id('hdR')}/><line ${id('burnAR')} stroke="#ff3b30" stroke-linecap="round" opacity="0"/></g>
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
    <g ${id('cane')} opacity="0"><path d="M264 304v196M264 304q0 -14 -12 -14q-8 0 -8 8" fill="none" stroke="#7f5539" stroke-width="7" stroke-linecap="round"/></g>
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
  ['wall', 'floor', 'ws0', 'ws1', 'sky', 'sun', 'clouds', 'gloom', 'plants', 'clut1', 'clut2', 'clut3', 'clut4', 'clut5', 'friends', 'fr1a', 'fr2a', 'shadow', 'fxBack', 'fxFront', 'body', 'tank', 'legL', 'legR', 'legLs', 'legRs', 'shoeL', 'shoeR',
    'upper', 'neck', 'neckSh', 'torso', 'torsoSh', 'bust', 'collar', 'head', 'hairBackG', 'hairBackLong', 'hairBackGray', 'earL', 'earR', 'face', 'faceSh', 'burnF', 'pallor', 'spots', 'wrinkles', 'bagL', 'bagR', 'chkL', 'chkR', 'pupL', 'pupR', 'pinL', 'pinR', 'hlL', 'hlR', 'lidL', 'lidR', 'lashL', 'lashR', 'topL', 'topR', 'browL', 'browR', 'nose',
    'mouthOpen', 'teethBad', 'mouth', 'burnN', 'hairBack', 'hairGray', 'glasses', 'sweat', 'cannula', 'hat', 'uaL', 'uaLb', 'faL', 'hdL', 'burnAL', 'uaR', 'uaRb', 'faR', 'hdR', 'burnAR', 'props', 'glowP', 'p_cig', 'p_vape', 'p_phone',
    'p_bottle', 'p_cup', 'p_can', 'p_book', 'p_pill', 'p_pad', 'cane', 'cloud', 'bolt', 'tint', 'armR', 'armL'].forEach(n => el[n] = $(n));

  const F = { svg, look: Object.assign({ skin: SKINS[1], hair: HAIRS[0], shirt: SHIRTS[1], body: 'm', hairStyle: 'short' }, look || {}), rate: 3, time: 0, bpm: 70, rr: 14,
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

  const legPath = (hx, fx, fy, w1, w2) => `M${hx - w1 / 2} 296L${hx + w1 / 2} 296L${fx + w2 / 2} ${fy}L${fx - w2 / 2} ${fy}Z`;
  const shoePath = (fx, fy, dir) => `M${fx - 11} ${fy - 4}L${fx + 11} ${fy - 4}Q${fx + 11 + dir * 12} ${fy - 2} ${fx + 12 + dir * 12} ${fy + 8}L${fx - 12 + dir * 0} ${fy + 8}Q${fx - 13} ${fy} ${fx - 11} ${fy - 4}Z`;

  // --- per-frame drawing ---
  F.draw = function (dt) {
    const v = F.vis, tgt = F.tgt, o = F.overlay, L = F.look;
    if (!v) return;
    F.time += dt;
    const female = L.body === 'f';
    const k = Math.min(1, dt * F.rate);
    for (const key of VKEYS) v[key] += (tgt[key] - v[key]) * k;
    const T = F.time;
    // skin colors
    let skin = L.skin;
    skin = mix(skin, '#c8c2b5', v.pallor * 0.55);
    skin = mix(skin, '#d6c24a', v.jaun * 0.55);
    const faceD = female ? FACE_F : FACE_M;
    ['face', 'faceSh', 'burnF', 'pallor', 'burnN'].forEach(n => el[n].setAttribute('d', faceD));
    ['face', 'earL', 'earR', 'neck'].forEach(n => el[n].setAttribute('fill', skin));
    el.pallor.setAttribute('fill', '#9aa79a'); el.pallor.setAttribute('opacity', (v.pallor * 0.25).toFixed(3));
    el.burnF.setAttribute('opacity', (v.burn * 0.5).toFixed(3));
    el.burnN.setAttribute('opacity', (v.burn * 0.3).toFixed(3));
    el.spots.setAttribute('opacity', clamp(v.spots * 1.1, 0, 1).toFixed(3));
    el.wrinkles.setAttribute('opacity', clamp(v.wr * 0.85, 0, 1).toFixed(3));
    el.bagL.setAttribute('opacity', (v.bags * 0.55).toFixed(3)); el.bagR.setAttribute('opacity', (v.bags * 0.55).toFixed(3));
    el.chkL.setAttribute('opacity', clamp(v.cheek, 0, 0.6).toFixed(3)); el.chkR.setAttribute('opacity', clamp(v.cheek, 0, 0.6).toFixed(3));
    // hair
    const hs = L.hairStyle || 'short';
    el.hairBack.setAttribute('fill', L.hair);
    el.hairGray.setAttribute('opacity', clamp(v.gray, 0, 1).toFixed(3));
    const backD = hs === 'long' ? HAIR_LONG : hs === 'bob' ? HAIR_BOB : '';
    el.hairBackLong.setAttribute('d', backD); el.hairBackGray.setAttribute('d', backD);
    el.hairBackLong.setAttribute('fill', L.hair); el.hairBackLong.setAttribute('opacity', backD ? 1 : 0);
    el.hairBackGray.setAttribute('opacity', backD ? clamp(v.gray, 0, 1).toFixed(3) : 0);
    el.glasses.setAttribute('opacity', v.glasses.toFixed(2));
    // feminine / masculine details
    el.topL.setAttribute('opacity', female ? 1 : 0); el.topR.setAttribute('opacity', female ? 1 : 0);
    ['browL', 'browR'].forEach(n => el[n].setAttribute('stroke-width', female ? 3.2 : 4.8));
    const mouthCol = female ? '#a63d52' : '#5a2a2a';
    el.mouth.setAttribute('stroke', mouthCol); el.mouth.setAttribute('stroke-width', female ? 4.4 : 3.2);
    el.mouthOpen.setAttribute('stroke', female ? '#a63d52' : '#5a2a2a');
    // body shape
    const belly = v.belly, thin = v.thin, slump = v.hunch * 0.5 + v.sag * 0.5 + (o.face === 'slump' ? 0.6 : 0);
    const sw = (female ? 40 : 49) + v.musc * (female ? 3 : 6) - thin * 5 + Math.max(0, belly) * 2;
    const ww = (female ? 29 : 35) + belly * 19 - thin * 6;
    const bw = (female ? 33 : 38) + belly * 33 - thin * 6;
    const hw = (female ? 45 : 37) + belly * 6 - thin * 4;
    const cw = (female ? 36 : 45) + Math.max(0, belly) * 3 - thin * 3;
    const shirt = L.shirt;
    // breathing
    const rrHz = F.rr / 60 * (o.run ? 2.2 : 1), breath = Math.sin(T * Math.PI * 2 * rrHz);
    const labor = clamp((100 - v.lungs) / 80, 0, 1);
    const b = breath * (0.012 + labor * 0.014 + (o.run ? 0.012 : 0)) + o.cough * Math.sin(T * 40) * 0.01;
    // bob/shake
    let bx = 0, by = 0, rot = 0;
    if (o.bob) { by = -Math.abs(Math.sin(T * 9)) * o.bob; }
    if (o.shake) { bx = Math.sin(T * 60) * o.shake; by += Math.cos(T * 53) * o.shake * 0.5; }
    if (o.wobble) rot = Math.sin(T * 3.2) * o.wobble;
    el.body.setAttribute('transform', `translate(${bx.toFixed(2)} ${by.toFixed(2)}) rotate(${rot.toFixed(2)} 200 500)`);
    el.shadow.setAttribute('rx', (78 + belly * 10 + by * 0.5).toFixed(1));
    const shY = 178 + slump * 9;
    el.upper.setAttribute('transform', `translate(200 300) scale(${(1 + b * 0.6).toFixed(4)} ${(1 + b - slump * 0.02).toFixed(4)}) translate(-200 -300)`);
    // torso
    const tp = `M${200 - sw} ${shY + 6}Q200 ${shY - 12} ${200 + sw} ${shY + 6}L${200 + sw - 3} ${shY + 28}C${200 + cw} ${shY + 52} ${200 + ww} ${shY + 62} ${200 + ww} ${shY + 82}Q${200 + bw} ${shY + 104} ${200 + hw} 306L${200 - hw} 306Q${200 - bw} ${shY + 104} ${200 - ww} ${shY + 82}C${200 - ww} ${shY + 62} ${200 - cw} ${shY + 52} ${200 - sw + 3} ${shY + 28}Z`;
    el.torso.setAttribute('d', tp); el.torso.setAttribute('fill', shirt);
    el.torsoSh.setAttribute('d', tp);
    el.collar.setAttribute('d', `M${female ? 180 : 184} ${shY - 2}Q200 ${shY + (female ? 26 : 18)} ${female ? 220 : 216} ${shY - 2}Q200 ${shY + 4} ${female ? 180 : 184} ${shY - 2}Z`);
    el.collar.setAttribute('fill', mix(skin, '#000', 0.04));
    el.bust.setAttribute('d', `M${200 - 20} ${shY + 50}Q${200 - 6} ${shY + 62} ${200 + 0} ${shY + 50}M${200 + 20} ${shY + 50}Q${200 + 6} ${shY + 62} ${200} ${shY + 50}`);
    el.bust.setAttribute('opacity', female && belly < 0.8 ? 0.8 : 0);
    // neck
    const nw = female ? 16 : 20;
    el.neck.setAttribute('x', 200 - nw / 2); el.neck.setAttribute('width', nw); el.neck.setAttribute('y', (146 + slump * 4).toFixed(1));
    el.neckSh.setAttribute('x', 200 - nw / 2); el.neckSh.setAttribute('width', nw); el.neckSh.setAttribute('y', (146 + slump * 4).toFixed(1));
    // head: scaled so the whole figure is ~6 heads tall (semi-realistic proportions)
    const headDy = slump * 8;
    const tilt = slump * 3 * Math.sin(T * 0.7) + (o.dizzy ? Math.sin(T * 5) * 6 : 0);
    const headT = `translate(0 ${headDy.toFixed(1)}) translate(200 152) rotate(${tilt.toFixed(2)}) scale(0.56) translate(-200 -188)`;
    el.head.setAttribute('transform', headT); el.hairBackG.setAttribute('transform', headT);
    // face expression
    const mood = o.face === 'sad' ? 18 : o.face === 'happy' ? 92 : o.face === 'angry' ? 22 : o.face === 'ouch' ? 20 : v.mood;
    const acute = o.face === 'angry' ? 1 : 0;
    const smile = (mood - 52) / 48;                     // -1..1
    const c = smile * 17;
    const mx0 = 182, mx1 = 218, my = 166;
    if (c > 4) {
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
      el.mouth.setAttribute('d', `M${mx0 + 2} ${my + (c < 0 ? 4 : 0)}Q200 ${my + c * 1.4 + (c < 0 ? 4 : 0)} ${mx1 - 2} ${my + (c < 0 ? 4 : 0)}`);
    }
    if (o.face === 'ouch') { el.mouthOpen.setAttribute('opacity', 1); el.mouthOpen.setAttribute('d', `M188 166Q200 160 212 166Q200 180 188 166Z`); el.mouthOpen.setAttribute('fill', '#7a2230'); el.mouth.setAttribute('opacity', 0); }
    // eyes: blink, tiredness
    F.nextBlink -= dt; if (F.nextBlink < 0) { F.blink = 1; F.nextBlink = 2 + Math.random() * 3.5; }
    F.blink = Math.max(0, F.blink - dt * 7);
    const tired = clamp((50 - v.energy) / 50, 0, 0.85) + v.bags * 0.15;
    const closed = o.eyesClosed ? 1 : 0;
    const lid = clamp(Math.max(tired * 0.65, closed, F.blink > 0.5 ? 1 : F.blink * 2), 0, 1);
    const lidH = lid * 18.5;
    ['L', 'R'].forEach(s => {
      el['lid' + s].setAttribute('height', lidH.toFixed(1)); el['lid' + s].setAttribute('fill', skin);
      el['lash' + s].setAttribute('opacity', lid > 0.2 ? 0.9 : 0);
      el['lash' + s].setAttribute('transform', `translate(0 ${(lidH - 9.5).toFixed(1)})`);
    });
    const look = Math.sin(T * 0.6) * 1.2;
    ['pupL', 'pupR', 'pinL', 'pinR', 'hlL', 'hlR'].forEach(n => el[n].setAttribute('transform', `translate(${look.toFixed(2)} ${(tired * 1.2).toFixed(2)})`));
    // brows: worry (stress), anger
    const worry = clamp((v.stress - 50) / 40, 0, 1) + (o.face === 'sad' ? 0.7 : 0);
    const sadB = clamp((45 - mood) / 45, 0, 1);
    const inner = 100 - worry * 9 - sadB * 5 + acute * 8, outer = 106 + worry * 3 + sadB * 2 - acute * 4;
    const arch = female ? 7 : 4;
    el.browL.setAttribute('d', `M163 ${outer}Q176 ${(inner + outer) / 2 - arch} 191 ${inner + 4}`);
    el.browR.setAttribute('d', `M237 ${outer}Q224 ${(inner + outer) / 2 - arch} 209 ${inner + 4}`);
    el.sweat.setAttribute('opacity', Math.min(1, clamp((v.stress - 60) / 30, 0, 1) * 0.9 + (o.run ? 1 : 0)));
    el.sweat.setAttribute('transform', `translate(0 ${((T * 18) % 14).toFixed(1)})`);
    el.hat.setAttribute('opacity', o.hat ? 1 : 0);
    el.cane.setAttribute('opacity', v.cane > 0.5 ? 1 : 0);
    el.cannula.setAttribute('opacity', v.oxy > 0.5 ? 0.9 : 0);
    el.tank.setAttribute('opacity', v.oxy > 0.5 ? 1 : 0);
    // legs: tapered, with shading and shoes
    const swing = o.run ? Math.sin(T * 9) * 24 : (o.bob ? Math.sin(T * 5) * 7 : 0);
    const footY = 496, w1 = (female ? 40 : 38) + Math.max(0, belly) * 8 - thin * 6, w2 = (female ? 17 : 21) + Math.max(0, belly) * 2;
    const fLx = 200 - 21 - Math.max(0, belly) * 4 + swing, fRx = 200 + 21 + Math.max(0, belly) * 4 - swing;
    const liftL = o.run ? Math.max(0, Math.sin(T * 9)) * 18 : 0, liftR = o.run ? Math.max(0, -Math.sin(T * 9)) * 18 : 0;
    const pants = '#3b4a6b';
    const lp = legPath(200 - w1 / 2 + 1, fLx, footY - liftL, w1, w2), rp = legPath(200 + w1 / 2 - 1, fRx, footY - liftR, w1, w2);
    el.legL.setAttribute('d', lp); el.legR.setAttribute('d', rp); el.legLs.setAttribute('d', lp); el.legRs.setAttribute('d', rp);
    el.legL.setAttribute('fill', pants); el.legR.setAttribute('fill', pants); el.legL.setAttribute('stroke', pants); el.legR.setAttribute('stroke', pants);
    el.shoeL.setAttribute('d', shoePath(fLx - 3, footY + 2 - liftL, -1)); el.shoeR.setAttribute('d', shoePath(fRx + 3, footY + 2 - liftR, 1));
    // arms by IK
    const tbl = poseTable(sw), pn = tbl[F.handTgt] || tbl.rest;
    let tR = pn[0].slice(), tL = pn[1].slice();
    if (o.run) { tR[0] = 200 + sw + 14 + Math.sin(T * 9) * 10; tR[1] = 250 + Math.cos(T * 9) * 14; tL[0] = 200 - sw - 14 - Math.sin(T * 9) * 10; tL[1] = 250 - Math.cos(T * 9) * 14; }
    if (F.handTgt === 'wave') tL[0] += Math.sin(T * 8) * 14;
    if (F.handTgt === 'cheer') { tR[1] += Math.sin(T * 7) * 8; tL[1] += Math.cos(T * 7) * 8; }
    if (!F.hand) F.hand = { R: tR.slice(), L: tL.slice() };
    const hk = Math.min(1, dt * 9);
    ['R', 'L'].forEach((s2, i) => { const tt = i ? tL : tR; F.hand[s2][0] += (tt[0] - F.hand[s2][0]) * hk; F.hand[s2][1] += (tt[1] - F.hand[s2][1]) * hk; });
    const aw = (female ? 14 : 17) + v.musc * (female ? 3 : 5) + Math.max(0, belly) * 3 - thin * 3;
    [['R', 1, 200 + sw - 4], ['L', -1, 200 - sw + 4]].forEach(([s2, side, sx]) => {
      const r = ik(sx, shY + 10, F.hand[s2][0], F.hand[s2][1], 62, 58, side);
      const ua = el['ua' + s2], uab = el['ua' + s2 + 'b'], fa = el['fa' + s2], hd = el['hd' + s2], ba = el['burnA' + s2];
      const sl = 0.5, sy = shY + 10;
      ua.setAttribute('x1', sx); ua.setAttribute('y1', sy); ua.setAttribute('x2', r.ex); ua.setAttribute('y2', r.ey); ua.setAttribute('stroke', skin); ua.setAttribute('stroke-width', aw);
      uab.setAttribute('x1', sx); uab.setAttribute('y1', sy); uab.setAttribute('x2', sx + (r.ex - sx) * sl); uab.setAttribute('y2', sy + (r.ey - sy) * sl); uab.setAttribute('stroke', shirt); uab.setAttribute('stroke-width', aw + 5);
      fa.setAttribute('x1', r.ex); fa.setAttribute('y1', r.ey); fa.setAttribute('x2', r.hx); fa.setAttribute('y2', r.hy); fa.setAttribute('stroke', skin); fa.setAttribute('stroke-width', aw - 4);
      hd.setAttribute('cx', r.hx); hd.setAttribute('cy', r.hy); hd.setAttribute('rx', 7.5); hd.setAttribute('ry', 9); hd.setAttribute('fill', skin);
      hd.setAttribute('transform', `rotate(${(Math.atan2(-(r.hx - r.ex), r.hy - r.ey) * 180 / Math.PI).toFixed(1)} ${r.hx} ${r.hy})`);
      ba.setAttribute('x1', sx + (r.ex - sx) * sl); ba.setAttribute('y1', sy + (r.ey - sy) * sl); ba.setAttribute('x2', r.hx); ba.setAttribute('y2', r.hy); ba.setAttribute('stroke-width', aw - 4);
      ba.setAttribute('opacity', (v.burn * 0.45).toFixed(3));
      if (s2 === 'R') { F.handR = r; }
    });
    // props on right hand
    const r = F.handR, dx = r.hx - r.ex, dy = r.hy - r.ey;
    const ang = Math.atan2(-dx, dy) * 180 / Math.PI;
    el.props.setAttribute('transform', `translate(${r.hx.toFixed(1)} ${r.hy.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(0.85)`);
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
    el.cloud.setAttribute('transform', `translate(0 ${(Math.sin(T * 1.4) * 3 + headDy - 6).toFixed(1)})`);
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
    F.emit('text', 226, 112, { text: 'cough!', size: 16, fill: '#444', bold: 1, dx: 22, dy: -14, dur: 1200, s0: .8, s1: 1.1 });
    for (let i = 0; i < 3; i++) F.emit('circle', 216, 140, { r: 4 + i, fill: '#ffffffcc', dx: 40 + i * 8, dy: -6 + i * 8, dur: 800, delay: i * 70, s0: 1, s1: 2 });
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
