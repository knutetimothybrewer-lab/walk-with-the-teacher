/* Art: one cohesive flat-vector campus style (rounded shapes, 2-tone shading, navy outlines on key elements).
 * Everything is inline SVG built from FIXED constants only (never student text), so it is safe to inject as markup.
 */
(function (root) {
  'use strict';
  var W = root.WWQ, A = W.Art = {};
  var NAVY = '#14213d', GOLD = '#f5b83d', INK = '#1b1b2a';

  /* ---------- icons (24px grid, 2px rounded stroke) ---------- */
  var IC = {
    heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
    brain: '<path d="M9.5 4A3 3 0 0 0 6.5 7a3 3 0 0 0-2 3 3 3 0 0 0 1 3.5A3 3 0 0 0 8 18a3 3 0 0 0 4 1V5.2A2 2 0 0 0 9.5 4z"/><path d="M14.5 4A3 3 0 0 1 17.5 7a3 3 0 0 1 2 3 3 3 0 0 1-1 3.5A3 3 0 0 1 16 18a3 3 0 0 1-4 1"/><path d="M8 10h2M14 10h2M9 14h2M13 14h2"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2A5 5 0 0 1 21 19"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-5 6-8 10-10"/>',
    pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    thermometer: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/>',
    drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    scale: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 10a4 4 0 0 1 8 0"/><path d="M12 10l2-2"/>',
    apple: '<path d="M12 7c-2-2-6-1-6 4 0 4 2 8 4 8 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 4-4 4-8 0-5-4-6-6-4z"/><path d="M12 7c0-2 1-3 3-4"/>',
    cup: '<path d="M6 4h12l-1.5 15a2 2 0 0 1-2 1.8h-5A2 2 0 0 1 7.5 19z"/><path d="M6.5 9h11"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', x: '<path d="M6 6l12 12M18 6L6 18"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    map: '<path d="M9 4l-6 2v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z"/>',
    download: '<path d="M12 4v11M7.5 11L12 15.5 16.5 11M5 20h14"/>', upload: '<path d="M12 16V5M7.5 9L12 4.5 16.5 9M5 20h14"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    save: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>', info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    right: '<path d="M5 12h14M13 6l6 6-6 6"/>', left: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1"/>',
    eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17v.01"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 15l4-5 3 3 5-6"/>',
    loop: '<path d="M17 4l3 3-3 3"/><path d="M4 11V9a2 2 0 0 1 2-2h14"/><path d="M7 20l-3-3 3-3"/><path d="M20 13v2a2 2 0 0 1-2 2H4"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>', tools: '<path d="M14.5 6.5a4 4 0 0 0-5 5L3 18l3 3 6.5-6.5a4 4 0 0 0 5-5l-3 3-2.5-2.5z"/>',
    home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>', undo: '<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3"/>', sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
    tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.2"/>', menu: '<path d="M4 7h16M4 12h16M4 17h16"/>', list: '<path d="M8 6h12M8 12h12M8 18h12M4 6v.01M4 12v.01M4 18v.01"/>',
    walk: '<circle cx="13" cy="4.5" r="2"/><path d="M12 8l-3 4 3 3-1 5M12 8l3 3h3M9 12l-3 1"/>', plug: '<path d="M9 2v6M15 2v6M7 8h10v4a5 5 0 0 1-10 0z"/><path d="M12 17v5"/>',
    pause: '<path d="M8 5v14M16 5v14"/>', play: '<path d="M7 4l13 8-13 8z"/>', textsize: '<path d="M4 18l5-13 5 13M6 14h6M16 18l3-8 3 8M17 16h4"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>'
  };
  IC.run = IC.pulse;
  A.icon = function (name, cls) { return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (IC[name] || IC.info) + '</svg>'; };
  A.iconEl = function (name, cls) { return W.U.svg(A.icon(name, cls)); };
  A.hasIcon = function (n) { return !!IC[n]; };

  /* ---------- logo ---------- */
  A.logo = function () {
    return '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><circle cx="24" cy="24" r="23" fill="#f5b83d"/><path d="M9 18l-1-11 9 6c2-.7 4-1 7-1s5 .3 7 1l9-6-1 11c1 2 1.5 4 1.5 6 0 8-7 13-16.500 13S7.500 32 7.500 24c0-2 .5-4 1.500-6z" fill="#14213d"/><circle cx="18" cy="23" r="3" fill="#f5b83d"/><circle cx="30" cy="23" r="3" fill="#f5b83d"/><path d="M22 29h4l-2 2.500z" fill="#f5b83d"/></svg>';
  };

  /* ---------- avatars (bust) ---------- */
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16), r = Math.max(0, Math.min(255, (n >> 16) + amt)), g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt)), b = Math.max(0, Math.min(255, (n & 255) + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function hairBack(style, c) {
    if (style === 'long') return '<path d="M30 56c-2-26 12-36 30-36s32 10 30 36c0 14 2 26 8 34H22c6-8 8-20 8-34z" fill="' + c + '"/>';
    if (style === 'wavy') return '<path d="M30 54c-3-24 12-34 30-34s33 10 30 34c1 10-1 16-6 22-2-8-1-14-3-18H39c-2 4-1 10-3 18-5-6-7-12-6-22z" fill="' + c + '"/>';
    return '';
  }
  function hairFront(style, c) {
    var top = '<path d="M33 56c-3-22 11-34 27-34s30 12 27 34c-3-9-8-16-27-16S36 47 33 56z" fill="' + c + '"/>';
    if (style === 'curly') return '<g fill="' + c + '"><circle cx="36" cy="44" r="11"/><circle cx="47" cy="31" r="12"/><circle cx="62" cy="27" r="12"/><circle cx="77" cy="32" r="12"/><circle cx="85" cy="46" r="11"/><circle cx="33" cy="58" r="7"/><circle cx="87" cy="58" r="7"/></g>';
    if (style === 'bun') return top + '<circle cx="60" cy="17" r="11" fill="' + c + '"/><path d="M50 24q10 5 20 0" stroke="' + shade(c, 40) + '" stroke-width="3" fill="none"/>';
    if (style === 'long') return '<path d="M33 58c-3-24 11-37 27-37s30 13 27 37c-1-12-8-20-14-22-8 6-22 6-30 0-6 4-9 10-10 22z" fill="' + c + '"/>';
    if (style === 'wavy') return top + '<path d="M34 54c4-4 8-4 11 0M75 54c3-4 7-4 11 0" stroke="' + shade(c, 40) + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
    return top;
  }
  A.avatar = function (av, mood) {
    av = av || W.AVATARS[0]; mood = mood || 'happy';
    var skin = av.skin, sk2 = shade(skin, -28), top = av.top, mouth;
    if (mood === 'think') mouth = '<path d="M52 74h16" stroke="#7a2e2e" stroke-width="3" fill="none" stroke-linecap="round"/>';
    else if (mood === 'wow') mouth = '<ellipse cx="60" cy="74" rx="5" ry="6" fill="#7a2e2e"/>';
    else mouth = '<path d="M50 71q10 10 20 0" stroke="#7a2e2e" stroke-width="3.200" fill="none" stroke-linecap="round"/>';
    var brows = mood === 'think' ? '<path d="M41 47l11-3M68 44l11 3" stroke="' + shade(av.hair, 10) + '" stroke-width="3" stroke-linecap="round"/>' : '<path d="M41 48q6-4 12-1M67 47q6-3 12 1" stroke="' + shade(av.hair, 10) + '" stroke-width="3" fill="none" stroke-linecap="round"/>';
    return '<svg viewBox="0 0 120 140" role="img" aria-label="' + (av.name || 'Student') + ' avatar" focusable="false">' +
      hairBack(av.hairStyle, av.hair) +
      '<path d="M16 140c0-27 19-42 44-42s44 15 44 42z" fill="' + top + '"/><path d="M16 140c0-27 19-42 44-42s44 15 44 42z" fill="none" stroke="' + NAVY + '" stroke-width="2.500"/>' +
      '<path d="M44 100l16 16 16-16" fill="' + shade(top, 40) + '"/><rect x="50" y="78" width="20" height="26" rx="9" fill="' + sk2 + '"/>' +
      '<circle cx="33" cy="62" r="6" fill="' + sk2 + '"/><circle cx="87" cy="62" r="6" fill="' + sk2 + '"/>' +
      '<ellipse cx="60" cy="58" rx="27" ry="30" fill="' + skin + '"/>' +
      hairFront(av.hairStyle, av.hair) +
      '<ellipse cx="49" cy="60" rx="3.400" ry="4" fill="' + INK + '"/><ellipse cx="71" cy="60" rx="3.400" ry="4" fill="' + INK + '"/><circle cx="50.200" cy="58.500" r="1.100" fill="#fff"/><circle cx="72.200" cy="58.500" r="1.100" fill="#fff"/>' +
      brows + '<circle cx="42" cy="70" r="4" fill="#ff8f8f" opacity=".30"/><circle cx="78" cy="70" r="4" fill="#ff8f8f" opacity=".30"/>' + mouth +
      '<path d="M92 112l3 7 7 .5-5.500 4.500 2 7-6.500-4-6.500 4 2-7-5.500-4.500 7-.5z" fill="' + GOLD + '" stroke="' + NAVY + '" stroke-width="1.500" transform="translate(-34 -2) scale(.8)"/>' +
      '</svg>';
  };
  A.jordanSpec = { id: 'jordan', name: 'Jordan', skin: '#b97a4a', hair: '#241a14', hairStyle: 'wavy', top: '#2b3a8c' };
  A.jordan = function (mood) { return A.avatar(A.jordanSpec, mood); };
  A.avatarById = function (id) { for (var i = 0; i < W.AVATARS.length; i++) if (W.AVATARS[i].id === id) return W.AVATARS[i]; return W.AVATARS[0]; };

  /* walker sprite (full body, legs animate with CSS) */
  A.walker = function (av) {
    av = av || W.AVATARS[0];
    return '<svg viewBox="0 0 60 100" role="img" aria-label="' + (av.name || 'Student') + ' walking" focusable="false"><g class="bob">' +
      '<rect class="legL" x="22" y="58" width="8" height="34" rx="4" fill="#2b3a8c"/><rect class="legR" x="31" y="58" width="8" height="34" rx="4" fill="#1f2b6b"/>' +
      '<ellipse cx="26" cy="93" rx="7" ry="3.500" fill="' + NAVY + '"/><ellipse cx="36" cy="93" rx="7" ry="3.500" fill="' + NAVY + '"/>' +
      '<rect x="17" y="34" width="28" height="30" rx="10" fill="' + av.top + '" stroke="' + NAVY + '" stroke-width="2"/>' +
      '<rect x="11" y="37" width="8" height="24" rx="4" fill="' + av.top + '" stroke="' + NAVY + '" stroke-width="2"/><rect x="43" y="37" width="8" height="24" rx="4" fill="' + av.top + '" stroke="' + NAVY + '" stroke-width="2"/>' +
      '<circle cx="31" cy="21" r="14" fill="' + av.skin + '"/><path d="M17 20c-1-10 6-16 14-16s15 6 14 16c-3-5-6-8-14-8s-11 3-14 8z" fill="' + av.hair + '"/>' +
      '<circle cx="26" cy="23" r="1.800" fill="' + INK + '"/><circle cx="36" cy="23" r="1.800" fill="' + INK + '"/><path d="M26 29q5 4 10 0" stroke="#7a2e2e" stroke-width="2" fill="none" stroke-linecap="round"/>' +
      '</g></svg>';
  };

  /* ---------- Pounce, the Wildcat guide ---------- */
  A.guide = function (mood) {
    var mouth = mood === 'wow' ? '<ellipse cx="60" cy="83" rx="5" ry="6" fill="#7a2e2e"/>' : mood === 'think' ? '<path d="M53 83h14" stroke="#7a2e2e" stroke-width="3" stroke-linecap="round"/>' : '<path d="M52 80q4 6 8 0 4 6 8 0" stroke="#7a2e2e" stroke-width="3" fill="none" stroke-linecap="round"/>';
    return '<svg viewBox="0 0 120 130" role="img" aria-label="Pounce the Wildcat guide" focusable="false">' +
      '<path d="M22 54L18 14l30 20z" fill="#e8962a" stroke="' + NAVY + '" stroke-width="2.500" stroke-linejoin="round"/><path d="M98 54l4-40-30 20z" fill="#e8962a" stroke="' + NAVY + '" stroke-width="2.500" stroke-linejoin="round"/>' +
      '<path d="M26 44l-2-18 14 10z" fill="#f7b6b6"/><path d="M94 44l2-18-14 10z" fill="#f7b6b6"/>' +
      '<path d="M30 118c0-12 14-18 30-18s30 6 30 18z" fill="' + NAVY + '"/><path d="M30 118c0-4 3-7 6-9l24 6 24-6c3 2 6 5 6 9z" fill="' + GOLD + '"/>' +
      '<ellipse cx="60" cy="68" rx="40" ry="36" fill="#f2a93b" stroke="' + NAVY + '" stroke-width="2.500"/>' +
      '<path d="M60 34v10M44 38l3 9M76 38l-3 9M22 66h9M89 66h9" stroke="#b86e12" stroke-width="3.500" stroke-linecap="round"/>' +
      '<ellipse cx="60" cy="80" rx="18" ry="13" fill="#fff4dc"/>' +
      '<ellipse cx="45" cy="64" rx="7" ry="8" fill="#fff"/><ellipse cx="75" cy="64" rx="7" ry="8" fill="#fff"/><circle cx="46" cy="65" r="4.500" fill="#2f9e44"/><circle cx="74" cy="65" r="4.500" fill="#2f9e44"/><circle cx="46" cy="65" r="2.200" fill="' + INK + '"/><circle cx="74" cy="65" r="2.200" fill="' + INK + '"/>' +
      '<path d="M55 74h10l-5 5z" fill="#d9577a"/>' + mouth +
      '<path d="M40 82l-18-3M40 86l-18 3M80 82l18-3M80 86l18 3" stroke="' + NAVY + '" stroke-width="1.800" stroke-linecap="round"/></svg>';
  };

  /* ---------- campus map ---------- */
  A.NODES = { 0: { x: 7, y: 83 }, 1: { x: 17, y: 69 }, 2: { x: 33, y: 82 }, 3: { x: 47, y: 62 }, 4: { x: 61, y: 82 }, 5: { x: 74.500, y: 60 }, 6: { x: 86, y: 82 }, 7: { x: 89, y: 52 } };
  A.campus = function () {
    var px = function (k) { return A.NODES[k].x * 10; }, py = function (k) { return A.NODES[k].y * 5.6; };
    var path = 'M' + px(0) + ' ' + py(0) + ' C 100 ' + py(0) + ', 120 ' + py(1) + ', ' + px(1) + ' ' + py(1) + ' S 290 ' + py(2) + ', ' + px(2) + ' ' + py(2) + ' S 440 ' + py(3) + ', ' + px(3) + ' ' + py(3) + ' S 580 ' + py(4) + ', ' + px(4) + ' ' + py(4) + ' S 710 ' + py(5) + ', ' + px(5) + ' ' + py(5) + ' S 850 ' + py(6) + ', ' + px(6) + ' ' + py(6) + ' S 930 ' + py(7) + ', ' + px(7) + ' ' + py(7);
    var tree = function (x, y, s) { s = s || 1; return '<g transform="translate(' + x + ' ' + y + ') scale(' + s + ')"><rect x="-4" y="0" width="8" height="22" rx="3" fill="#8a5a2b"/><circle cx="0" cy="-6" r="20" fill="#3e9b4f"/><circle cx="-10" cy="4" r="13" fill="#4caf5d"/><circle cx="11" cy="3" r="12" fill="#358a45"/></g>'; };
    var bld = '';
    // 1 hub: round pavilion with five pennants
    var h = [px(1), py(1)];
    bld += '<g transform="translate(' + (h[0] + 6) + ' ' + (h[1] - 58) + ')"><rect x="-44" y="22" width="88" height="34" rx="6" fill="#fff" stroke="' + NAVY + '" stroke-width="3"/><path d="M-52 24a52 40 0 0 1 104 0z" fill="#2aa7a7" stroke="' + NAVY + '" stroke-width="3"/><rect x="-10" y="34" width="20" height="22" rx="4" fill="' + NAVY + '"/>' +
      ['#d9482b', '#6544c2', '#cc2f7d', '#0b8585', '#2c8a3a'].map(function (c, i) { return '<path class="sway" d="M' + (-30 + i * 15) + ' -14v-14l12 5z" fill="' + c + '" stroke="' + NAVY + '" stroke-width="1.500"/><path d="M' + (-30 + i * 15) + ' -14v32" stroke="' + NAVY + '" stroke-width="2"/>'; }).join('') + '</g>';
    // 2 nurse
    var n = [px(2), py(2)];
    bld += '<g transform="translate(' + n[0] + ' ' + (n[1] - 58) + ')"><rect x="-40" y="10" width="80" height="46" rx="6" fill="#fff" stroke="' + NAVY + '" stroke-width="3"/><path d="M-46 12l46-30 46 30z" fill="#e4572e" stroke="' + NAVY + '" stroke-width="3" stroke-linejoin="round"/><rect x="-7" y="30" width="14" height="26" rx="3" fill="' + NAVY + '"/><circle cx="0" cy="3" r="11" fill="#fff" stroke="' + NAVY + '" stroke-width="2"/><path d="M-5 3h10M0 -2v10" stroke="#e4572e" stroke-width="3.500" stroke-linecap="round"/><rect x="-32" y="22" width="14" height="12" rx="2" fill="#bfe3fb" stroke="' + NAVY + '" stroke-width="2"/><rect x="18" y="22" width="14" height="12" rx="2" fill="#bfe3fb" stroke="' + NAVY + '" stroke-width="2"/></g>';
    // 3 workshop (barn)
    var w = [px(3), py(3)];
    bld += '<g transform="translate(' + w[0] + ' ' + (w[1] - 58) + ')"><path d="M-46 56V20l46-28 46 28v36z" fill="#f2c14e" stroke="' + NAVY + '" stroke-width="3" stroke-linejoin="round"/><path d="M-46 20l46-28 46 28" fill="none" stroke="#b9771a" stroke-width="7" stroke-linejoin="round"/><rect x="-16" y="26" width="32" height="30" rx="3" fill="#8a4b2d" stroke="' + NAVY + '" stroke-width="2.500"/><path d="M-16 26l32 30M16 26l-32 30" stroke="#f3e2b8" stroke-width="3"/><circle cx="0" cy="8" r="9" fill="#fff" stroke="' + NAVY + '" stroke-width="2"/><path d="M-4 8h8M0 4v8" stroke="' + NAVY + '" stroke-width="2"/></g>';
    // 4 lab
    var l = [px(4), py(4)];
    bld += '<g transform="translate(' + l[0] + ' ' + (l[1] - 56) + ')"><rect x="-50" y="8" width="100" height="48" rx="6" fill="#ece6fa" stroke="' + NAVY + '" stroke-width="3"/><rect x="-54" y="0" width="108" height="14" rx="5" fill="#6544c2" stroke="' + NAVY + '" stroke-width="3"/><rect x="-40" y="20" width="34" height="22" rx="3" fill="#1f2b6b" stroke="' + NAVY + '" stroke-width="2"/><path d="M-36 36l8-8 6 5 10-10" stroke="#f5b83d" stroke-width="3" fill="none" stroke-linecap="round"/><rect x="6" y="20" width="34" height="22" rx="3" fill="#1f2b6b" stroke="' + NAVY + '" stroke-width="2"/><circle cx="20" cy="31" r="6" fill="none" stroke="#fff" stroke-width="2.500"/><path d="M24 35l6 6" stroke="#fff" stroke-width="2.500" stroke-linecap="round"/><rect x="-8" y="40" width="16" height="16" rx="2" fill="' + NAVY + '"/></g>';
    // 5 crossroads signpost
    var c = [px(5), py(5)];
    bld += '<g transform="translate(' + c[0] + ' ' + (c[1] - 52) + ')"><rect x="-4" y="-6" width="8" height="64" rx="3" fill="#8a5a2b" stroke="' + NAVY + '" stroke-width="2"/>' +
      '<path d="M4 -4h34l8 8-8 8H4z" fill="#2c8a3a" stroke="' + NAVY + '" stroke-width="2.500" stroke-linejoin="round"/><path d="M-4 16h-34l-8 8 8 8h34z" fill="#f5b83d" stroke="' + NAVY + '" stroke-width="2.500" stroke-linejoin="round"/><path d="M4 36h30l7 7-7 7H4z" fill="#d9482b" stroke="' + NAVY + '" stroke-width="2.500" stroke-linejoin="round"/></g>';
    // 6 dashboard tower
    var d = [px(6), py(6)];
    bld += '<g transform="translate(' + (d[0] + 4) + ' ' + (d[1] - 120) + ')"><rect x="-34" y="20" width="68" height="106" rx="6" fill="#d9defa" stroke="' + NAVY + '" stroke-width="3"/><rect x="-40" y="10" width="80" height="14" rx="5" fill="#2b3a8c" stroke="' + NAVY + '" stroke-width="3"/><rect x="-24" y="32" width="48" height="34" rx="3" fill="#fff" stroke="' + NAVY + '" stroke-width="2"/><path d="M-20 60l9-12 8 7 10-14 12 9" stroke="#2b3a8c" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="-24" y="72" width="10" height="22" fill="#d9482b"/><rect x="-8" y="78" width="10" height="16" fill="#0b8585"/><rect x="8" y="68" width="10" height="26" fill="#2c8a3a"/><rect x="-9" y="100" width="18" height="26" rx="3" fill="' + NAVY + '"/><path d="M0 10V-8" stroke="' + NAVY + '" stroke-width="2.500"/><path d="M0 -8h16l-4 5 4 5H0z" fill="' + GOLD + '" stroke="' + NAVY + '" stroke-width="1.500"/></g>';
    return '<svg class="campus" viewBox="0 0 1000 560" role="img" aria-label="Illustrated school campus map with six buildings: Wellness Hub, Nurse’s Office, Habit Workshop, Media Lab, Decision Crossroads and Whole-Health Dashboard" focusable="false">' +
      '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fd3f5"/><stop offset="1" stop-color="#e6f5ff"/></linearGradient></defs>' +
      '<rect width="1000" height="560" fill="url(#sky)"/><circle cx="905" cy="70" r="36" fill="#ffe08a"/><circle cx="905" cy="70" r="50" fill="#ffe08a" opacity=".3"/>' +
      '<g fill="#fff" opacity=".9"><ellipse cx="170" cy="70" rx="60" ry="18"/><ellipse cx="210" cy="58" rx="40" ry="16"/><ellipse cx="560" cy="48" rx="70" ry="18"/><ellipse cx="610" cy="38" rx="40" ry="14"/></g>' +
      '<path d="M0 270c90-50 160-40 250-10s170 20 260-20 190-40 260 0 150 30 230-10v140H0z" fill="#9fd1a7"/><path d="M0 310c120-30 220-20 330 0s240 20 360-10 200-20 310 10v260H0z" fill="#b9e29c"/>' +
      '<rect y="420" width="1000" height="140" fill="#a6d98c"/><path d="M0 500c200-20 400 10 600-6s300-8 400 6v60H0z" fill="#93cc7a"/>' +
      '<path d="' + path + '" fill="none" stroke="#e9d3a2" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/><path d="' + path + '" fill="none" stroke="#f6e8c3" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/><path d="' + path + '" fill="none" stroke="#c9a55a" stroke-width="2" stroke-dasharray="3 12" stroke-linecap="round"/>' +
      tree(70, 350, 1) + tree(110, 380, .8) + tree(255, 330, 1) + tree(400, 520, .9) + tree(540, 520, .8) + tree(700, 330, .9) + tree(960, 340, 1) + tree(30, 520, .9) + tree(610, 345, .7) +
      '<g fill="#fff" stroke="' + NAVY + '" stroke-width="2"><rect x="20" y="420" width="70" height="46" rx="6"/></g><path d="M20 420l35-24 35 24z" fill="#2b3a8c" stroke="' + NAVY + '" stroke-width="2.500" stroke-linejoin="round"/><text x="55" y="448" font-size="11" font-weight="800" fill="' + NAVY + '" text-anchor="middle" font-family="system-ui,sans-serif">GATE</text>' +
      bld + '</svg>';
  };

  /* ---------- room banner scenes (1000x150) ---------- */
  var SCENES = {
    gate: '<rect width="1000" height="150" fill="#bfe3fb"/><rect y="104" width="1000" height="46" fill="#a6d98c"/><rect x="330" y="30" width="340" height="96" rx="8" fill="#fff" stroke="#14213d" stroke-width="3"/><path d="M320 34l180-30 180 30z" fill="#2b3a8c" stroke="#14213d" stroke-width="3"/><rect x="450" y="62" width="100" height="64" rx="8" fill="#14213d"/><rect x="350" y="52" width="70" height="26" rx="4" fill="#bfe3fb" stroke="#14213d" stroke-width="2"/><rect x="580" y="52" width="70" height="26" rx="4" fill="#bfe3fb" stroke="#14213d" stroke-width="2"/><rect x="385" y="10" width="230" height="26" rx="6" fill="#f5b83d" stroke="#14213d" stroke-width="2.500"/><text x="500" y="29" text-anchor="middle" font-size="16" font-weight="800" fill="#14213d" font-family="system-ui,sans-serif">WILDCAT HIGH</text>',
    hub: '<rect width="1000" height="150" fill="#d9f2f2"/><rect y="106" width="1000" height="44" fill="#fff"/><g>' + ['#d9482b', '#6544c2', '#cc2f7d', '#0b8585', '#2c8a3a'].map(function (c, i) { return '<rect x="' + (i * 200) + '" y="106" width="200" height="44" fill="' + c + '" opacity=".22"/>'; }).join('') + '</g><path d="M0 14C250 60 750 60 1000 14" fill="none" stroke="#14213d" stroke-width="3"/>' + ['#d9482b', '#6544c2', '#cc2f7d', '#0b8585', '#2c8a3a', '#d9482b', '#6544c2', '#cc2f7d', '#0b8585'].map(function (c, i) { var x = 60 + i * 110, y = 14 + 40 * Math.sin((i + .5) / 9 * Math.PI) * 0.9; return '<path class="sway" d="M' + x + ' ' + (y + 2) + 'l22 0-11 28z" fill="' + c + '" stroke="#14213d" stroke-width="2"/>'; }).join(''),
    nurse: '<rect width="1000" height="150" fill="#fdeee9"/><rect y="112" width="1000" height="38" fill="#e8d4cc"/><rect x="120" y="22" width="150" height="86" rx="6" fill="#fff" stroke="#14213d" stroke-width="3"/><path d="M135 44h120M135 60h95M135 76h70M135 92h40" stroke="#14213d" stroke-width="4" stroke-linecap="round"/><rect x="700" y="26" width="190" height="58" rx="8" fill="#14213d"/><path d="M712 56h30l8-18 12 34 10-22h28l8-10 12 20h40" fill="none" stroke="#6ee7a0" stroke-width="3.500" stroke-linecap="round" stroke-linejoin="round"/><rect x="420" y="78" width="200" height="34" rx="8" fill="#fff" stroke="#14213d" stroke-width="3"/><rect x="420" y="108" width="14" height="30" fill="#14213d"/><rect x="606" y="108" width="14" height="30" fill="#14213d"/><circle cx="360" cy="90" r="16" fill="#fff" stroke="#14213d" stroke-width="3"/><path d="M352 90h16M360 82v16" stroke="#d9482b" stroke-width="4" stroke-linecap="round"/>',
    workshop: '<rect width="1000" height="150" fill="#fff3d1"/><rect y="110" width="1000" height="40" fill="#d9b27a"/><rect x="90" y="22" width="220" height="74" rx="6" fill="#fff" stroke="#14213d" stroke-width="3"/><path d="M110 40h180M110 58h140M110 76h100" stroke="#cfd6ea" stroke-width="3"/><g stroke="#14213d" stroke-width="2"><rect x="330" y="26" width="46" height="46" fill="#f5b83d" transform="rotate(-5 353 49)"/><rect x="390" y="30" width="46" height="46" fill="#ff9fb8" transform="rotate(4 413 53)"/><rect x="450" y="24" width="46" height="46" fill="#9ad8f2" transform="rotate(-3 473 47)"/></g><g fill="none" stroke="#14213d" stroke-width="3.500" stroke-linecap="round"><path d="M700 40a28 28 0 1 1-8 36"/><path d="M692 76l-2-12 12 2"/><path d="M790 90a28 28 0 1 1 8-36"/><path d="M798 54l2 12-12-2"/></g><rect x="620" y="96" width="340" height="14" rx="4" fill="#8a5a2b" stroke="#14213d" stroke-width="2"/>',
    lab: '<rect width="1000" height="150" fill="#2b2260"/><rect y="112" width="1000" height="38" fill="#1b1545"/><g stroke="#cfc4ff" stroke-width="2"><rect x="110" y="22" width="190" height="80" rx="6" fill="#1f2b6b"/><rect x="330" y="30" width="170" height="72" rx="6" fill="#1f2b6b"/><rect x="530" y="18" width="190" height="84" rx="6" fill="#1f2b6b"/></g><path d="M126 82l30-30 26 20 40-34 50 30" fill="none" stroke="#f5b83d" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><g fill="#cfc4ff"><rect x="346" y="44" width="40" height="40" rx="20"/><rect x="396" y="46" width="90" height="8" rx="4"/><rect x="396" y="62" width="70" height="8" rx="4"/><rect x="396" y="78" width="80" height="8" rx="4"/></g><g fill="#6ee7a0"><rect x="548" y="36" width="150" height="8" rx="4"/><rect x="548" y="54" width="120" height="8" rx="4"/></g><circle cx="880" cy="62" r="30" fill="none" stroke="#f5b83d" stroke-width="7"/><path d="M902 84l30 30" stroke="#f5b83d" stroke-width="9" stroke-linecap="round"/>',
    crossroads: '<rect width="1000" height="150" fill="#d6efff"/><path d="M0 108c200-20 400-10 500-10s300-10 500 10v42H0z" fill="#a6d98c"/><path d="M430 150L470 90h60l40 60z" fill="#e9d3a2"/><path d="M0 120c150-10 330-14 470-24M1000 120c-150-10-330-14-470-24" fill="none" stroke="#e9d3a2" stroke-width="22"/><rect x="494" y="36" width="12" height="78" rx="4" fill="#8a5a2b" stroke="#14213d" stroke-width="2.500"/><path d="M506 40h60l10 10-10 10h-60z" fill="#2c8a3a" stroke="#14213d" stroke-width="2.500"/><path d="M494 66h-64l-10 10 10 10h64z" fill="#f5b83d" stroke="#14213d" stroke-width="2.500"/><path d="M506 92h50l10 8-10 8h-50z" fill="#d9482b" stroke="#14213d" stroke-width="2.500"/><g><circle cx="140" cy="76" r="28" fill="#3e9b4f"/><rect x="136" y="96" width="8" height="30" fill="#8a5a2b"/><circle cx="860" cy="70" r="32" fill="#358a45"/><rect x="856" y="94" width="8" height="32" fill="#8a5a2b"/></g>',
    dashboard: '<rect width="1000" height="150" fill="#1f2b6b"/><rect y="118" width="1000" height="32" fill="#14194d"/><rect x="120" y="18" width="400" height="92" rx="8" fill="#fff" stroke="#14213d" stroke-width="3"/><path d="M140 92l60-34 50 20 70-46 60 34 70-20" fill="none" stroke="#2b3a8c" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M140 100h360" stroke="#cfd6ea" stroke-width="2"/><g><rect x="560" y="50" width="50" height="60" rx="4" fill="#d9482b"/><rect x="620" y="72" width="50" height="38" rx="4" fill="#6544c2"/><rect x="680" y="38" width="50" height="72" rx="4" fill="#cc2f7d"/><rect x="740" y="60" width="50" height="50" rx="4" fill="#0b8585"/><rect x="800" y="44" width="50" height="66" rx="4" fill="#2c8a3a"/></g>'
  };
  A.scene = function (key) { return '<svg class="scene" viewBox="0 0 1000 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' + (SCENES[key] || SCENES.gate) + '</svg>'; };

  /* ---------- small post illustrations ---------- */
  A.postArt = function (kind) {
    var k = kind || 'photo';
    if (k === 'bottle') return '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><rect x="40" y="8" width="40" height="14" rx="4" fill="#14213d"/><rect x="32" y="22" width="56" height="92" rx="14" fill="#f5b83d" stroke="#14213d" stroke-width="3"/><rect x="40" y="48" width="40" height="36" rx="6" fill="#fff" stroke="#14213d" stroke-width="2"/><path d="M48 64h24M48 74h16" stroke="#14213d" stroke-width="3" stroke-linecap="round"/></svg>';
    if (k === 'plate') return '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="62" r="46" fill="#fff" stroke="#14213d" stroke-width="3"/><circle cx="60" cy="62" r="32" fill="#f2f6ff" stroke="#cfd6ea" stroke-width="2"/><circle cx="48" cy="56" r="12" fill="#2c8a3a"/><circle cx="72" cy="58" r="11" fill="#e4572e"/><rect x="50" y="70" width="26" height="12" rx="6" fill="#f2c14e"/></svg>';
    if (k === 'beforeafter') return '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><rect x="6" y="20" width="52" height="80" rx="8" fill="#cfd6ea" stroke="#14213d" stroke-width="3"/><rect x="62" y="20" width="52" height="80" rx="8" fill="#ffe9b0" stroke="#14213d" stroke-width="3"/><circle cx="32" cy="48" r="10" fill="#8d6b4f"/><rect x="22" y="60" width="20" height="28" rx="6" fill="#6b7a99"/><circle cx="88" cy="48" r="10" fill="#8d6b4f"/><rect x="78" y="60" width="20" height="28" rx="6" fill="#e4572e"/><text x="32" y="14" font-size="10" font-weight="800" text-anchor="middle" fill="#14213d" font-family="system-ui,sans-serif">BEFORE</text><text x="88" y="14" font-size="10" font-weight="800" text-anchor="middle" fill="#14213d" font-family="system-ui,sans-serif">AFTER</text></svg>';
    if (k === 'avatar') return '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><rect x="8" y="8" width="104" height="104" rx="18" fill="#e7eafb" stroke="#14213d" stroke-width="3"/><circle cx="60" cy="48" r="20" fill="#d9a273"/><path d="M24 104c0-22 16-34 36-34s36 12 36 34z" fill="#2b3a8c"/><circle cx="53" cy="48" r="3" fill="#1b1b2a"/><circle cx="67" cy="48" r="3" fill="#1b1b2a"/><path d="M52 58q8 6 16 0" stroke="#7a2e2e" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
    return '<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><rect x="10" y="22" width="100" height="76" rx="10" fill="#e7eafb" stroke="#14213d" stroke-width="3"/><circle cx="40" cy="48" r="9" fill="#f5b83d"/><path d="M14 94l30-30 22 18 18-14 22 26z" fill="#2c8a3a"/></svg>';
  };
})(typeof window !== 'undefined' ? window : globalThis);
