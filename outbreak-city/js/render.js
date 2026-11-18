/* =====================================================================
   OUTBREAK CITY: RENDERER (Canvas 2D, 2:1 isometric)
   ---------------------------------------------------------------------
   The simulation runs on a flat grid; only this file projects to iso.
   Performance: static ground is pre-rendered into chunk canvases,
   buildings/trees/agents/cars use cached sprites, everything dynamic is
   depth-sorted by (x + y) each frame, and only on-screen things are drawn.
   ===================================================================== */
(function (root) {
  'use strict';
  var NS = root.OutbreakCity = root.OutbreakCity || {};
  var C = NS.core, D = NS.data, ISO = C.ISO, HW = ISO.HW, HH = ISO.HH;
  var T = NS.city.T;
  var CHUNK = 8;

  /* ---------------- color helpers ---------------- */
  function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
  var NIGHT = [0.42, 0.48, 0.7];
  function shade(hex, f, night) {
    var c = hexRgb(hex);
    var r = Math.min(255, c[0] * f), g = Math.min(255, c[1] * f), b = Math.min(255, c[2] * f);
    if (night) { r *= NIGHT[0]; g *= NIGHT[1]; b *= NIGHT[2]; }
    return rgb([r, g, b]);
  }
  function hash2(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
  function mkCanvas(w, h) {
    var c = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
    c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h));
    return c;
  }
  function iso(x, y) { return { x: (x - y) * HW, y: (x + y) * HH }; }
  function diamond(ctx, x, y, grow) {
    var g = grow || 0;
    ctx.beginPath();
    ctx.moveTo((x - y) * HW, (x + y) * HH - g);
    ctx.lineTo((x + 1 - y) * HW + g, (x + 1 + y) * HH);
    ctx.lineTo((x + 1 - y - 1) * HW, (x + 1 + y + 1) * HH + g);
    ctx.lineTo((x - y - 1) * HW - g, (x + y + 1) * HH);
    ctx.closePath();
  }
  function ellipse(ctx, x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); }

  var GRASS = { hill: '#7DBE69', down: '#8DB872', east: '#A5B26A', port: '#98A68C', sub: '#84C26E' };
  var STYLE_COLORS = {
    mansion: { wall: ['#F3EBDD', '#E8E1F0', '#F4E3C9', '#E2EEE6'], roof: ['#B5553C', '#5D6A85', '#7B4B3A', '#4F7A5A'] },
    tower: { wall: ['#8FB4D9', '#9FC3C9', '#A9B7CF', '#86A6C6'], roof: ['#6F7C8C', '#76828F', '#6B7787', '#7A8594'] },
    brick: { wall: ['#B5613E', '#A35038', '#C07A4F', '#9C5B44'], roof: ['#6E5A52', '#655049', '#7A6458', '#5F5048'] },
    warehouse: { wall: ['#B9BDC2', '#9FB2A6', '#C2B49A', '#A6ADBA'], roof: ['#7D858F', '#6F8279', '#8A7F6C', '#77808E'] },
    house: { wall: ['#F2D9A0', '#BFD9E8', '#F2C4C4', '#D4E6B5'], roof: ['#8C4A3C', '#4A5C7A', '#6B4A3A', '#5A7A4A'] }
  };
  var SKIN = ['#F1C9A5', '#D9A47A', '#A86F4C', '#7A4E33', '#E8B98F'];
  var SHIRT = ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#F0E442', '#D55E00', '#9C8CD4'];
  var HAIR = ['#2B1D14', '#5A3A22', '#1A1A1A', '#8A5A2B', '#C9A26A'];
  var CAR = ['#D55E00', '#0072B2', '#E8E8E8', '#3A3F47', '#E69F00', '#009E73'];

  /* =================================================================== */
  function Renderer(canvas, settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.settings = settings;
    this.cam = { x: 0, y: 0, zoom: 0.8, tx: 0, ty: 0, tz: 0.8 };
    this.vw = 800; this.vh = 600; this.dpr = 1;
    this.time = 0; this.shake = 0; this.night = 0;
    this.sprites = {}; this.spriteCount = 0;
    this.parts = []; this.texts = []; this.tracers = []; this.rings = [];
    for (var i = 0; i < 700; i++) this.parts.push({ on: false });
    for (i = 0; i < 48; i++) this.texts.push({ on: false });
    for (i = 0; i < 160; i++) this.tracers.push({ on: false });
    for (i = 0; i < 60; i++) this.rings.push({ on: false });
    this.rain = []; for (i = 0; i < 160; i++) this.rain.push({ x: Math.random(), y: Math.random(), s: 0.6 + Math.random() * 0.6 });
    this.drawList = []; this.drawPool = [];
    this.flash = {};
    this.lunge = {}; this.struck = {}; this.bang = {}; this.bShake = {}; this.lastChomp = -9; this.lastBang = -9;
    this.corpses = []; for (i = 0; i < 48; i++) this.corpses.push({ on: false });
    this.stats = { drawn: 0 };
  }
  var R = Renderer.prototype;

  R.setGame = function (game) {
    this.game = game;
    var city = game.city;
    this.W = city.W; this.H = city.H;
    this.chunks = null;
    this.flash = {};
    this.warmIdx = 0;
    this.buildChunks();
    this.initCars();
    var mid = iso(this.W / 2, this.H / 2);
    this.cam.x = this.cam.tx = mid.x; this.cam.y = this.cam.ty = mid.y;
    this.fitZoom();
    this.cam.zoom = this.cam.tz;
  };

  R.fitZoom = function () {
    var w = this.W * HW * 2, h = this.H * HH * 2 + 60;
    this.cam.tz = C.clamp(Math.min(this.vw / w, this.vh / h) * 1.05, 0.32, 1.2);
  };
  R.recenter = function () {
    var mid = iso(this.W / 2, this.H / 2);
    this.cam.tx = mid.x; this.cam.ty = mid.y; this.fitZoom();
  };
  R.focus = function (x, y, zoom) { var p = iso(x, y); this.cam.tx = p.x; this.cam.ty = p.y; if (zoom) this.cam.tz = zoom; };

  R.resize = function (w, h, dpr) {
    this.vw = w; this.vh = h; this.dpr = dpr;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
  };

  // Ground-chunk resolution. Kept low on purpose: large offscreen canvases blow the
  // browser's canvas memory budget and frame time jumps from ~2 ms to 20-50 ms.
  R.res = function () { return this.settings.lowFx ? 1 : (this.dpr >= 1.5 ? 1.25 : 1); };

  /* ---------------- coordinate transforms ---------------- */
  R.screenToIso = function (sx, sy) { var z = this.cam.zoom; return { x: (sx - this.vw / 2) / z + this.cam.x, y: (sy - this.vh / 2) / z + this.cam.y }; };
  R.screenToWorld = function (sx, sy) { var p = this.screenToIso(sx, sy); return ISO.toWorld(p.x, p.y); };
  R.worldToScreen = function (x, y, h) {
    var p = iso(x, y), z = this.cam.zoom;
    return { x: (p.x - this.cam.x) * z + this.vw / 2, y: (p.y - (h || 0) - this.cam.y) * z + this.vh / 2 };
  };
  R.pan = function (dx, dy) { this.cam.tx -= dx / this.cam.zoom; this.cam.ty -= dy / this.cam.zoom; this.cam.x -= dx / this.cam.zoom; this.cam.y -= dy / this.cam.zoom; this.clampCam(); };
  R.zoomAt = function (sx, sy, factor) {
    var before = this.screenToIso(sx, sy);
    var nz = C.clamp(this.cam.tz * factor, 0.3, 2.4);
    this.cam.tz = nz; this.cam.zoom = nz;
    var after = this.screenToIso(sx, sy);
    this.cam.x += before.x - after.x; this.cam.y += before.y - after.y;
    this.cam.tx = this.cam.x; this.cam.ty = this.cam.y;
    this.clampCam();
  };
  R.clampCam = function () {
    var minX = -this.H * HW, maxX = this.W * HW, minY = 0, maxY = (this.W + this.H) * HH;
    this.cam.tx = C.clamp(this.cam.tx, minX, maxX); this.cam.ty = C.clamp(this.cam.ty, minY, maxY);
    this.cam.x = C.clamp(this.cam.x, minX, maxX); this.cam.y = C.clamp(this.cam.y, minY, maxY);
  };

  /* ===================================================================
     GROUND CHUNKS */
  // The whole static ground (tiles, roads, river) is pre-rendered into ONE canvas.
  // (Hundreds of separate canvases exceed Chrome's GPU canvas limits and stutter.)
  R.buildChunks = function () {
    var rs = this.res(), W = this.W, H = this.H;
    var minX = -H * HW - 2, maxX = W * HW + 2, minY = -2, maxY = (W + H) * HH + 2;
    var c = mkCanvas((maxX - minX) * rs, (maxY - minY) * rs), ctx = c.getContext('2d');
    ctx.setTransform(rs, 0, 0, rs, -minX * rs, -minY * rs);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) this.drawTile(ctx, x, y);
    this.ground = { c: c, x: minX, y: minY, w: maxX - minX, h: maxY - minY, rs: rs };
    this.chunks = [this.ground];
    this.chunkRes = rs;
  };

  R.tileAt = function (x, y) { if (x < 0 || y < 0 || x >= this.W || y >= this.H) return -1; return this.game.city.tiles[y * this.W + x]; };
  R.isRoadT = function (t) { return t === T.ROAD || t === T.BRIDGE; };

  R.drawTile = function (ctx, x, y) {
    var city = this.game.city, i = y * this.W + x, t = city.tiles[i], d = D.DISTRICTS[city.district[i]];
    var n = hash2(x, y), self = this;
    var base;
    var grass = GRASS[d.id];
    switch (t) {
      case T.WATER: base = '#3C8DD0'; break;
      case T.ROAD: base = '#5B6068'; break;
      case T.BRIDGE: base = '#2F6EA8'; break;
      case T.PARK: base = '#6CB45D'; break;
      case T.LOT: base = d.id === 'port' || d.id === 'east' ? '#C2B08A' : grass; break;
      case T.PLAZA: base = '#D9D3C5'; break;
      default: base = grass;
    }
    var f = 0.95 + n * 0.1;
    ctx.fillStyle = shade(base, f);
    diamond(ctx, x, y, 0.7); ctx.fill();
    var cx = (x + 0.5 - y - 0.5) * HW, cyy = (x + y + 1) * HH;

    if (t === T.WATER) {
      // shoreline foam where water meets land
      ctx.strokeStyle = 'rgba(220,240,255,0.55)'; ctx.lineWidth = 1.4;
      var edges = [[0, -1, 0, 0, 1, 0], [1, 0, 1, 0, 1, 1], [0, 1, 1, 1, 0, 1], [-1, 0, 0, 1, 0, 0]];
      edges.forEach(function (e) {
        var nt = self.tileAt(x + e[0], y + e[1]);
        if (nt !== -1 && nt !== T.WATER && nt !== T.BRIDGE) {
          var a = iso(x + e[2], y + e[3]), b = iso(x + e[4], y + e[5]);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      });
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ellipse(ctx, cx + (n - 0.5) * 20, cyy + (n - 0.5) * 6, 8, 2.5); ctx.fill();
      return;
    }
    if (t === T.ROAD || t === T.BRIDGE) {
      if (t === T.BRIDGE) {
        // bridge deck over water
        ctx.fillStyle = '#6B7079'; diamond(ctx, x + 0.06, y + 0.06, -2); ctx.fill();
      }
      var up = this.isRoadT(this.tileAt(x, y - 1)), dn = this.isRoadT(this.tileAt(x, y + 1)), lf = this.isRoadT(this.tileAt(x - 1, y)), rt = this.isRoadT(this.tileAt(x + 1, y));
      // sidewalks / curbs on edges touching non-road tiles
      ctx.strokeStyle = t === T.BRIDGE ? '#C9C3B4' : '#B9B4A8'; ctx.lineWidth = t === T.BRIDGE ? 2.2 : 3;
      var curb = function (ax, ay, bx, by) { var a = iso(ax, ay), b = iso(bx, by); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); };
      if (!up) curb(x, y + 0.04, x + 1, y + 0.04);
      if (!dn) curb(x, y + 0.96, x + 1, y + 0.96);
      if (!lf) curb(x + 0.04, y, x + 0.04, y + 1);
      if (!rt) curb(x + 0.96, y, x + 0.96, y + 1);
      var nRoad = (up ? 1 : 0) + (dn ? 1 : 0) + (lf ? 1 : 0) + (rt ? 1 : 0);
      ctx.strokeStyle = 'rgba(255,236,150,0.75)'; ctx.lineWidth = 1.2;
      if (nRoad <= 2 && (lf || rt) && !(up || dn)) { // along x
        var a = iso(x + 0.2, y + 0.5), b = iso(x + 0.5, y + 0.5); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        a = iso(x + 0.7, y + 0.5); b = iso(x + 0.95, y + 0.5); ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      } else if (nRoad <= 2 && (up || dn) && !(lf || rt)) {
        var a2 = iso(x + 0.5, y + 0.2), b2 = iso(x + 0.5, y + 0.5); ctx.beginPath(); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
        a2 = iso(x + 0.5, y + 0.7); b2 = iso(x + 0.5, y + 0.95); ctx.beginPath(); ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y); ctx.stroke();
      } else if (nRoad >= 3) {
        // crosswalk stripes
        ctx.strokeStyle = 'rgba(240,240,240,0.5)'; ctx.lineWidth = 1.3;
        for (var k = 0; k < 4; k++) {
          var s = 0.2 + k * 0.2;
          var p1 = iso(x + s, y + 0.06), p2 = iso(x + s, y + 0.2); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
          p1 = iso(x + 0.06, y + s); p2 = iso(x + 0.2, y + s); ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
        }
      }
      if (t === T.BRIDGE) {
        ctx.fillStyle = '#E8E2D2';
        for (var q = 0; q < 3; q++) {
          var pp = iso(x + 0.15 + q * 0.33, y + 0.05); ctx.fillRect(pp.x - 1, pp.y - 4, 2, 4);
          pp = iso(x + 0.15 + q * 0.33, y + 0.95); ctx.fillRect(pp.x - 1, pp.y - 4, 2, 4);
        }
      }
      return;
    }
    if (t === T.PARK) {
      // little paths and flowers
      if (n > 0.6) {
        ctx.strokeStyle = 'rgba(232,214,170,0.9)'; ctx.lineWidth = 2;
        var pa = iso(x, y + 0.5), pb = iso(x + 1, y + 0.5); ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      }
      var flowers = ['#F0E442', '#CC79A7', '#FFFFFF', '#E69F00'];
      for (var fl = 0; fl < 3; fl++) {
        var fx = hash2(x * 7 + fl, y * 3), fy = hash2(x * 5, y * 11 + fl);
        if (fx > 0.55) { var fp = iso(x + fx * 0.9, y + fy * 0.9); ctx.fillStyle = flowers[fl]; ctx.fillRect(fp.x, fp.y, 1.6, 1.6); }
      }
      return;
    }
    if (t === T.PLAZA) {
      ctx.strokeStyle = 'rgba(150,140,120,0.35)'; ctx.lineWidth = 0.8;
      for (var g2 = 1; g2 < 3; g2++) {
        var la = iso(x + g2 / 3, y), lb = iso(x + g2 / 3, y + 1); ctx.beginPath(); ctx.moveTo(la.x, la.y); ctx.lineTo(lb.x, lb.y); ctx.stroke();
        la = iso(x, y + g2 / 3); lb = iso(x + 1, y + g2 / 3); ctx.beginPath(); ctx.moveTo(la.x, la.y); ctx.lineTo(lb.x, lb.y); ctx.stroke();
      }
      return;
    }
    if (t === T.LOT && (d.id === 'port' || d.id === 'east')) {
      ctx.fillStyle = 'rgba(90,70,40,0.25)';
      for (var s2 = 0; s2 < 5; s2++) { var gp = iso(x + hash2(x + s2, y) * 0.9 + 0.05, y + hash2(x, y + s2) * 0.9 + 0.05); ctx.fillRect(gp.x, gp.y, 1.2, 1.2); }
      return;
    }
    if (t === T.BUILDING) {
      // foundation pad
      ctx.fillStyle = d.id === 'down' ? '#C9C4B8' : d.id === 'port' ? '#A9A9A0' : shade(grass, 0.92);
      diamond(ctx, x + 0.05, y + 0.05, -1); ctx.fill();
      // driveway/path to the door
      var b = city.buildings[city.bldAt[i]];
      if (b) {
        var dx = (b.door % this.W) - x, dy = ((b.door / this.W) | 0) - y;
        var p0 = iso(x + 0.5 + dx * 0.25, y + 0.5 + dy * 0.25), p3 = iso(x + 0.5 + dx * 0.5, y + 0.5 + dy * 0.5);
        ctx.strokeStyle = '#C8C2B2'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p3.x, p3.y); ctx.stroke();
      }
      return;
    }
    // grass texture
    if (n > 0.7) { ctx.fillStyle = 'rgba(255,255,255,0.06)'; ellipse(ctx, cx, cyy, 10, 4); ctx.fill(); }
  };

  /* ===================================================================
     SPRITES */
  // Sprites are small cached canvases (one per unique look), drawn with blit().
  R.sprite = function (key, w, h, ax, ay, paint) {
    var s = this.sprites[key];
    if (s) return s;
    var ss = this.settings.lowFx ? 1 : 1.5;
    var c = mkCanvas(w * ss, h * ss), ctx = c.getContext('2d');
    ctx.setTransform(ss, 0, 0, ss, ax * ss, ay * ss);
    paint(ctx);
    s = { c: c, sx: 0, sy: 0, sw: c.width, sh: c.height, w: w, h: h, ax: ax, ay: ay };
    this.sprites[key] = s; this.spriteCount++;
    return s;
  };
  R.blit = function (ctx, s, x, y, sc) {
    sc = sc || 1;
    ctx.drawImage(s.c, s.sx, s.sy, s.sw, s.sh, x - s.ax * sc, y - s.ay * sc, s.w * sc, s.h * sc);
  };
  R.clearSprites = function () { this.sprites = {}; this.spriteCount = 0; this.warmIdx = 0; };
  // Build building sprites a few at a time (day first, then night) so the first
  // night or a fresh game never causes a long hitch.
  R.prewarm = function (budgetMs) {
    var cbs = this.game && this.game.city.buildings;
    if (!cbs || this.warmIdx >= cbs.length * 2) return;
    var t0 = (root.performance || Date).now();
    while (this.warmIdx < cbs.length * 2) {
      var i = this.warmIdx % cbs.length, night = this.warmIdx >= cbs.length;
      this.buildingSprite(cbs[i], night, 0);
      if (!night && cbs[i].x % 3 === 0) this.treeSprite(i % 2, i % 3, false);
      this.warmIdx++;
      if ((root.performance || Date).now() - t0 > budgetMs) break;
    }
  };

  R.buildingSprite = function (cb, night, dmg) {
    var lm = cb.landmark || '', st = cb.style, fl = cb.floors;
    var key = 'b|' + st + '|' + fl + '|' + cb.color + '|' + lm + '|' + (night ? 1 : 0) + '|' + dmg;
    var h = this.bHeight(cb), extra = 30;
    var self = this;
    return this.sprite(key, 2 * HW + 34, h + extra + 2 * HH + 8, HW + 4, h + extra + HH + 4, function (ctx) { self.paintBuilding(ctx, cb, night, dmg, h); if (dmg) self.paintDamage(ctx, cb, night, dmg, h); });
  };
  R.bHeight = function (cb) {
    var fl = cb.floors;
    switch (cb.landmark || cb.style) {
      case 'lighthouse': return 72;
      case 'hall': return 40;
      case 'mansion': case 'club': return 12 + fl * 9;
      case 'tower': return fl * 11 + 4;
      case 'brick': case 'center': return fl * 10 + 3;
      case 'warehouse': case 'mall': return fl * 12 + 2;
      default: return 8 + fl * 8;
    }
  };

  R.paintBuilding = function (ctx, cb, night, dmg, h) {
    var st = cb.style, lm = cb.landmark, pal = STYLE_COLORS[st];
    var inset = lm === 'lighthouse' ? 0.42 : lm === 'hall' || lm === 'mall' ? 0.9 : cb.inset;
    var a = HW * inset, bb = HH * inset;
    var wall = pal.wall[cb.color], roof = pal.roof[cb.color];
    if (lm === 'hall') { wall = '#EFEDE6'; roof = '#BFC6C9'; }
    if (lm === 'club') { roof = '#3D7F5C'; }
    if (lm === 'mall') { wall = '#E6E9EE'; roof = '#8E99A8'; }
    if (lm === 'lighthouse') { wall = '#F4F1EA'; roof = '#C0392B'; }
    var dark = dmg >= 3;
    var df = dark ? 0.55 : dmg === 2 ? 0.82 : dmg === 1 ? 0.93 : 1;
    var sh = function (hex, f) { return shade(hex, f * df, night); };
    // drop shadow (sun from the upper left)
    var L = h / 34 + 0.25, sx = HW * L, sy = HH * L;
    ctx.fillStyle = 'rgba(20,30,40,' + (night ? 0.14 : 0.22) + ')';
    ctx.beginPath(); ctx.moveTo(-a, 0); ctx.lineTo(0, -bb); ctx.lineTo(a + sx, sy); ctx.lineTo(sx, bb + sy); ctx.lineTo(-a + sx * 0.2, bb * 0.6); ctx.closePath(); ctx.fill();
    // faces
    ctx.fillStyle = sh(wall, 0.93);
    ctx.beginPath(); ctx.moveTo(-a, 0); ctx.lineTo(0, bb); ctx.lineTo(0, bb - h); ctx.lineTo(-a, -h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = sh(wall, 0.72);
    ctx.beginPath(); ctx.moveTo(0, bb); ctx.lineTo(a, 0); ctx.lineTo(a, -h); ctx.lineTo(0, bb - h); ctx.closePath(); ctx.fill();
    // edge highlight
    ctx.strokeStyle = sh(wall, 1.1); ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(0, bb); ctx.lineTo(0, bb - h); ctx.stroke();

    var self = this;
    var face = function (side, s, t) { // point on a wall face: side 0 = left, 1 = right
      return side === 0 ? { x: -a + s * a, y: s * bb - t * h } : { x: s * a, y: bb - s * bb - t * h };
    };
    var quad = function (side, s0, s1, t0, t1) {
      var p1 = face(side, s0, t0), p2 = face(side, s1, t0), p3 = face(side, s1, t1), p4 = face(side, s0, t1);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath();
    };
    var seed = cb.color * 13 + cb.floors * 7 + (lm ? 3 : 0);
    var lit = function (k) { return hash2(seed + k, k * 3 + 1) > 0.45; };
    var winDay = st === 'tower' ? '#D8ECFA' : '#5F7C99', winNight = '#FFD98A', winOff = night ? '#26324A' : '#4E6A86';

    if (lm === 'lighthouse') {
      // red and white bands + lantern room
      for (var bnd = 0; bnd < 4; bnd++) { ctx.fillStyle = sh('#C0392B', 0.92); quad(0, 0, 1, bnd * 0.25 + 0.06, bnd * 0.25 + 0.16); ctx.fill(); ctx.fillStyle = sh('#C0392B', 0.7); quad(1, 0, 1, bnd * 0.25 + 0.06, bnd * 0.25 + 0.16); ctx.fill(); }
      ctx.fillStyle = night ? '#FFE9A0' : '#F7E08A';
      ctx.fillRect(-a * 0.8, -h - 9, a * 1.6, 8);
      ctx.fillStyle = sh('#333B45', 1); ctx.fillRect(-a, -h - 1, a * 2, 2);
      ctx.fillStyle = sh(roof, 1); ctx.beginPath(); ctx.moveTo(-a * 0.95, -h - 9); ctx.lineTo(0, -h - 17); ctx.lineTo(a * 0.95, -h - 9); ctx.closePath(); ctx.fill();
      return;
    }

    // windows
    var floors = Math.max(1, Math.round(h / 11));
    var cols = st === 'tower' ? 3 : st === 'warehouse' || lm === 'mall' ? 2 : 2;
    if (st === 'tower') {
      // glass curtain wall: mullions + lit cells
      for (var side = 0; side < 2; side++) for (var fr = 0; fr < floors; fr++) for (var cc = 0; cc < 4; cc++) {
        var on = night && lit(side * 100 + fr * 10 + cc);
        ctx.fillStyle = dark ? '#1E2530' : on ? winNight : shade(wall, side ? 0.62 + 0.08 * (cc % 2) : 0.86 + 0.08 * (cc % 2), night);
        quad(side, cc / 4 + 0.03, (cc + 1) / 4 - 0.03, (fr + 0.15) / floors, (fr + 0.85) / floors); ctx.fill();
      }
    } else if (st !== 'warehouse' || lm === 'mall') {
      for (var sd = 0; sd < 2; sd++) for (var f2 = 0; f2 < floors; f2++) for (var c2 = 0; c2 < cols; c2++) {
        if (lm === 'hall' && sd === 0) continue;
        var s0 = (c2 + 0.28) / cols, s1 = (c2 + 0.72) / cols, t0 = (f2 + 0.3) / floors, t1 = (f2 + 0.75) / floors;
        var lt = night && lit(sd * 100 + f2 * 10 + c2);
        ctx.fillStyle = dark ? '#151A22' : lt ? winNight : (night ? winOff : winDay);
        quad(sd, s0, s1, t0, t1); ctx.fill();
        if (dmg >= 1 && dmg < 3 && hash2(seed + f2, c2 + sd) > (dmg === 2 ? 0.25 : 0.5)) { // boarded up
          ctx.strokeStyle = '#8A6A44'; ctx.lineWidth = 1.2;
          var q1 = face(sd, s0, t0), q3 = face(sd, s1, t1), q2 = face(sd, s1, t0), q4 = face(sd, s0, t1);
          ctx.beginPath(); ctx.moveTo(q1.x, q1.y); ctx.lineTo(q3.x, q3.y); ctx.moveTo(q2.x, q2.y); ctx.lineTo(q4.x, q4.y); ctx.stroke();
        }
      }
    } else {
      // warehouse: corrugated stripes + big door
      ctx.strokeStyle = sh(wall, 0.6); ctx.lineWidth = 0.6;
      for (var k = 1; k < 8; k++) { var w1 = face(0, k / 8, 0), w2 = face(0, k / 8, 1); ctx.beginPath(); ctx.moveTo(w1.x, w1.y); ctx.lineTo(w2.x, w2.y); ctx.stroke(); }
      ctx.fillStyle = sh('#5D646D', 1); quad(1, 0.3, 0.7, 0, 0.6); ctx.fill();
    }
    if (lm === 'hall') {
      ctx.fillStyle = sh('#FFFFFF', 0.95);
      for (var col = 0; col < 5; col++) { quad(0, col / 5 + 0.05, col / 5 + 0.12, 0, 0.85); ctx.fill(); }
    }
    if (lm === 'center') {
      var mural = ['#E69F00', '#56B4E9', '#009E73', '#F0E442', '#CC79A7'];
      for (var m = 0; m < 5; m++) { ctx.fillStyle = shade(mural[m], 0.95, night); quad(0, m / 5, (m + 1) / 5, 0.05, 0.45); ctx.fill(); }
    }
    // door
    if (st === 'house' || st === 'mansion') { ctx.fillStyle = dark ? '#111' : sh('#6B4A33', 1); quad(1, 0.42, 0.58, 0, 0.42 / Math.max(1, floors)); ctx.fill(); }
    // cracks
    if (dmg >= 1) {
      ctx.strokeStyle = 'rgba(40,30,25,0.6)'; ctx.lineWidth = 0.8;
      var c0 = face(0, 0.7, 0.9), c1 = face(0, 0.62, 0.6), c3 = face(0, 0.75, 0.4);
      ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.lineTo(c3.x, c3.y); ctx.stroke();
    }

    // roof
    var rT = { x: 0, y: -bb - h }, rR = { x: a, y: -h }, rB = { x: 0, y: bb - h }, rL = { x: -a, y: -h };
    if (cb.roof && !lm || lm === 'club') {
      var o = 1.1, rh = 10 + (st === 'mansion' ? 3 : 0);
      var T2 = { x: 0, y: -bb * o - h }, R2 = { x: a * o, y: -h }, B2 = { x: 0, y: bb * o - h }, L2 = { x: -a * o, y: -h };
      var s1p = { x: (T2.x + L2.x) / 2, y: (T2.y + L2.y) / 2 - rh }, e1p = { x: (R2.x + B2.x) / 2, y: (R2.y + B2.y) / 2 - rh };
      ctx.fillStyle = sh(roof, 1.08);
      ctx.beginPath(); ctx.moveTo(T2.x, T2.y); ctx.lineTo(R2.x, R2.y); ctx.lineTo(e1p.x, e1p.y); ctx.lineTo(s1p.x, s1p.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = sh(wall, 0.72);
      ctx.beginPath(); ctx.moveTo(R2.x * 0.92, R2.y); ctx.lineTo(B2.x, B2.y * 0.98 + 0.5); ctx.lineTo(e1p.x, e1p.y + 1); ctx.closePath(); ctx.fill();
      ctx.fillStyle = sh(roof, 0.85);
      ctx.beginPath(); ctx.moveTo(L2.x, L2.y); ctx.lineTo(B2.x, B2.y); ctx.lineTo(e1p.x, e1p.y); ctx.lineTo(s1p.x, s1p.y); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = sh(roof, 0.65); ctx.lineWidth = 0.7;
      ctx.beginPath(); ctx.moveTo(s1p.x, s1p.y); ctx.lineTo(e1p.x, e1p.y); ctx.stroke();
      if (dmg >= 2) { ctx.fillStyle = '#20242A'; ctx.beginPath(); ctx.arc((s1p.x + e1p.x) / 2, (s1p.y + e1p.y) / 2 + 4, 3, 0, 7); ctx.fill(); }
      if (st === 'house' || lm === 'club') { ctx.fillStyle = sh('#8A6A5A', 1); ctx.fillRect(s1p.x + 6, s1p.y - 1, 3, 6); }
      if (lm === 'club') { ctx.strokeStyle = '#EEE'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a + 8, 8); ctx.lineTo(a + 8, -26); ctx.stroke(); ctx.fillStyle = '#F0E442'; ctx.beginPath(); ctx.moveTo(a + 8, -26); ctx.lineTo(a + 18, -22); ctx.lineTo(a + 8, -18); ctx.fill(); }
    } else {
      ctx.fillStyle = sh(roof, 1.05);
      ctx.beginPath(); ctx.moveTo(rT.x, rT.y); ctx.lineTo(rR.x, rR.y); ctx.lineTo(rB.x, rB.y); ctx.lineTo(rL.x, rL.y); ctx.closePath(); ctx.fill();
      ctx.fillStyle = sh(roof, 0.88);
      var ii = 0.82;
      ctx.beginPath(); ctx.moveTo(rT.x, rT.y * ii + (-h) * (1 - ii)); ctx.lineTo(rR.x * ii, rR.y); ctx.lineTo(rB.x, rB.y * ii + (-h) * (1 - ii)); ctx.lineTo(rL.x * ii, rL.y); ctx.closePath(); ctx.fill();
      var drawBox = function (cx, cy, w, d2, hh, col) {
        ctx.fillStyle = sh(col, 0.9); ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.lineTo(cx, cy + d2); ctx.lineTo(cx, cy + d2 - hh); ctx.lineTo(cx - w, cy - hh); ctx.fill();
        ctx.fillStyle = sh(col, 0.7); ctx.beginPath(); ctx.moveTo(cx, cy + d2); ctx.lineTo(cx + w, cy); ctx.lineTo(cx + w, cy - hh); ctx.lineTo(cx, cy + d2 - hh); ctx.fill();
        ctx.fillStyle = sh(col, 1.1); ctx.beginPath(); ctx.moveTo(cx - w, cy - hh); ctx.lineTo(cx, cy + d2 - hh); ctx.lineTo(cx + w, cy - hh); ctx.lineTo(cx, cy - d2 - hh); ctx.fill();
      };
      if (lm === 'hall') {
        ctx.fillStyle = sh('#5FA8A0', 1); ellipse(ctx, 0, -h - 2, 9, 4.5); ctx.fill();
        ctx.beginPath(); ctx.arc(0, -h - 2, 9, Math.PI, 0); ctx.fill();
        ctx.fillStyle = sh('#7FC4BB', 1); ctx.beginPath(); ctx.arc(-2, -h - 6, 4, Math.PI, 0); ctx.fill();
        ctx.strokeStyle = '#444'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -h - 11); ctx.lineTo(0, -h - 22); ctx.stroke();
        ctx.fillStyle = '#56B4E9'; ctx.fillRect(0, -h - 22, 7, 4);
      } else if (lm === 'mall') {
        ctx.fillStyle = sh('#0072B2', 1); ctx.fillRect(-16, -h - 14, 32, 10);
        ctx.fillStyle = '#FFF'; ctx.font = '700 7px Oswald, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('MALL', 0, -h - 6.5);
      } else if (st === 'tower') {
        drawBox(a * 0.2, -h - 1, 4, 2, 3, '#9AA3AD');
        if (cb.floors >= 6) { ctx.strokeStyle = sh('#555', 1); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-3, -h - 2); ctx.lineTo(-3, -h - 14); ctx.stroke(); ctx.fillStyle = '#D55E00'; ctx.fillRect(-4, -h - 15, 2, 2); }
      } else if (st === 'brick') {
        if (cb.color % 2 === 0) {
          ctx.fillStyle = sh('#8B6A4E', 1); ctx.fillRect(-6, -h - 9, 7, 7); ellipse(ctx, -2.5, -h - 9, 3.5, 1.6); ctx.fill();
          ctx.strokeStyle = sh('#5A4535', 1); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-5, -h - 2); ctx.lineTo(-5, -h); ctx.moveTo(0, -h - 2); ctx.lineTo(0, -h); ctx.stroke();
        } else drawBox(2, -h - 1, 3, 1.5, 2.5, '#A0A0A0');
        // fire escape
        ctx.strokeStyle = sh('#3A3A3A', 1); ctx.lineWidth = 0.6;
        for (var fe = 1; fe < floors; fe++) { var e1 = face(1, 0.55, fe / floors), e2 = face(1, 0.85, fe / floors); ctx.beginPath(); ctx.moveTo(e1.x, e1.y); ctx.lineTo(e2.x, e2.y); ctx.stroke(); }
      } else if (lm === 'center') {
        ctx.fillStyle = '#D55E00'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♥', 0, -h - 1);
      }
    }
  };


  // Apocalypse overlay for infected buildings. Levels only ever go up (see sim.js blight):
  // 1 infected: quarantine X, boarded windows, slime streaks
  // 2 overrun: smashed windows, vines, cracks, debris
  // 3 ruined: broken-off top, toxic glow, rubble, scorch marks (and live smoke)
  R.paintDamage = function (ctx, cb, night, dmg, h) {
    var lm = cb.landmark;
    var inset = lm === 'lighthouse' ? 0.42 : lm === 'hall' || lm === 'mall' ? 0.9 : cb.inset;
    var a = HW * inset, bb = HH * inset, seed = cb.color * 13 + cb.floors * 7 + (lm ? 3 : 0) + dmg;
    var face = function (side, s2, t) { return side === 0 ? { x: -a + s2 * a, y: s2 * bb - t * h } : { x: s2 * a, y: bb - s2 * bb - t * h }; };
    var r = function (k) { return hash2(seed + k * 7, k * 13 + 5); };
    ctx.save();
    // slime streaks dripping down the walls
    ctx.lineCap = 'round';
    for (var i = 0; i < 2 + dmg; i++) {
      var side = i % 2, sx = 0.15 + r(i) * 0.7, t0 = 0.9 - r(i + 9) * 0.3, t1 = Math.max(0.05, t0 - 0.25 - r(i + 3) * 0.4);
      var p0 = face(side, sx, t0), p1 = face(side, sx, t1);
      ctx.strokeStyle = night ? 'rgba(120,200,60,0.75)' : 'rgba(110,170,50,0.65)'; ctx.lineWidth = 1.3 + r(i + 1);
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle; ctx.beginPath(); ctx.arc(p1.x, p1.y, 1.2, 0, 7); ctx.fill();
    }
    // spray-painted quarantine X with a tally
    var q1 = face(1, 0.55, Math.min(0.45, 14 / h + 0.08)), q2 = face(1, 0.85, Math.min(0.2, 4 / h));
    var q3 = face(1, 0.85, Math.min(0.45, 14 / h + 0.08)), q4 = face(1, 0.55, Math.min(0.2, 4 / h));
    ctx.strokeStyle = '#E0442C'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(q1.x, q1.y); ctx.lineTo(q2.x, q2.y); ctx.moveTo(q3.x, q3.y); ctx.lineTo(q4.x, q4.y); ctx.stroke();
    if (dmg >= 2) {
      // smashed windows (jagged dark holes)
      for (var w = 0; w < 6; w++) {
        var sd = w % 2, c = face(sd, 0.15 + r(w + 20) * 0.7, 0.15 + r(w + 30) * 0.75);
        ctx.fillStyle = '#0E1216';
        ctx.beginPath(); ctx.moveTo(c.x - 2, c.y - 2); ctx.lineTo(c.x + 0.5, c.y - 3); ctx.lineTo(c.x + 2.2, c.y - 0.5); ctx.lineTo(c.x + 0.6, c.y + 0.4); ctx.lineTo(c.x + 1.5, c.y + 2.6); ctx.lineTo(c.x - 1.8, c.y + 1.4); ctx.closePath(); ctx.fill();
      }
      // cracks
      ctx.strokeStyle = 'rgba(30,22,18,0.75)'; ctx.lineWidth = 0.8;
      for (var k = 0; k < 3; k++) {
        var sd2 = k % 2, c0 = face(sd2, 0.2 + r(k + 40) * 0.6, 0.95), c1 = face(sd2, 0.25 + r(k + 41) * 0.5, 0.6), c2 = face(sd2, 0.2 + r(k + 42) * 0.6, 0.3);
        ctx.beginPath(); ctx.moveTo(c0.x, c0.y); ctx.lineTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.stroke();
      }
      // creeping vines from the ground up
      ctx.strokeStyle = night ? '#2F6B2A' : '#3E8A34'; ctx.lineWidth = 1.4;
      for (var v = 0; v < 3; v++) {
        var vs = 0.1 + v * 0.35, top = Math.min(0.85, 0.3 + r(v + 50) * (dmg >= 3 ? 0.6 : 0.35));
        ctx.beginPath();
        for (var st = 0; st <= 8; st++) { var tt = top * st / 8, pp = face(0, vs + Math.sin(st * 1.7 + v) * 0.05, tt); if (st) ctx.lineTo(pp.x, pp.y); else ctx.moveTo(pp.x, pp.y); }
        ctx.stroke();
        for (var lf = 1; lf < 8; lf += 2) { var lp = face(0, vs + Math.sin(lf * 1.7 + v) * 0.05, top * lf / 8); ctx.fillStyle = '#4FA33F'; ctx.beginPath(); ctx.arc(lp.x + 1, lp.y, 1.1, 0, 7); ctx.fill(); }
      }
    }
    if (dmg >= 3) {
      // toxic glow leaking from a few windows
      for (var g2 = 0; g2 < 3; g2++) {
        var gp = face(g2 % 2, 0.2 + r(g2 + 60) * 0.6, 0.2 + r(g2 + 61) * 0.4);
        ctx.fillStyle = 'rgba(183,227,74,0.9)'; ctx.fillRect(gp.x - 1.4, gp.y - 1.6, 2.8, 3.2);
        ctx.fillStyle = 'rgba(183,227,74,0.25)'; ctx.beginPath(); ctx.arc(gp.x, gp.y, 5, 0, 7); ctx.fill();
      }
      // scorch marks
      ctx.fillStyle = 'rgba(15,12,10,0.45)';
      var sc = face(1, 0.3 + r(70) * 0.4, 0.75); ctx.beginPath(); ctx.ellipse(sc.x, sc.y, 6, 9, 0.4, 0, 7); ctx.fill();
      // break the top off: cut a jagged bite out of the roof and upper walls
      var cutY = -h * (0.72 - r(71) * 0.15);
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.moveTo(-a - 3, -h - bb - 40);
      var pts = [];
      for (var j = 0; j <= 6; j++) { var jx = -a - 2 + (2 * a + 4) * j / 6, jy = cutY + (jx / a) * bb * 0.6 + (j % 2 ? -4 : 3) * (0.6 + r(j + 80)); pts.push([jx, jy]); }
      for (j = 0; j < pts.length; j++) ctx.lineTo(pts[j][0], pts[j][1] - (j === 0 || j === pts.length - 1 ? 0 : 0));
      ctx.lineTo(a + 3, -h - bb - 40); ctx.closePath(); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // exposed broken edge
      ctx.strokeStyle = '#2A2320'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (j = 0; j < pts.length; j++) { if (j) ctx.lineTo(pts[j][0], pts[j][1]); else ctx.moveTo(pts[j][0], pts[j][1]); }
      ctx.stroke();
      // rubble pile at the base
      var rub = ['#6E6259', '#4E4540', '#8A7D70', '#3B3430'];
      for (var rb = 0; rb < 9; rb++) {
        var rx = -a * 0.7 + r(rb + 90) * a * 1.6, ry = bb * 0.4 + r(rb + 100) * bb * 0.9;
        ctx.fillStyle = rub[rb % rub.length]; ctx.fillRect(rx - 2, ry - 1.5, 3 + r(rb) * 3, 2.5 + r(rb + 1) * 2);
      }
    }
    ctx.restore();
  };

  R.treeSprite = function (kind, v, night) {
    var self = this;
    return this.sprite('t|' + kind + '|' + v + '|' + (night ? 1 : 0), 30, 44, 15, 38, function (ctx) {
      ctx.fillStyle = 'rgba(20,40,20,0.22)'; ellipse(ctx, 3, 0, 10, 4); ctx.fill();
      ctx.fillStyle = shade('#6B4A2F', 1, night); ctx.fillRect(-1.5, -9, 3, 9);
      var greens = [['#2F7D3C', '#3F9A4A', '#62B865'], ['#2E6B3A', '#3D8547', '#57A35C'], ['#3C7A2E', '#52973C', '#7AB85A']][v];
      if (kind === 1) {
        for (var i = 0; i < 3; i++) {
          ctx.fillStyle = shade(greens[i], 1, night);
          ctx.beginPath(); ctx.moveTo(-9 + i * 2, -6 - i * 8); ctx.lineTo(0, -20 - i * 8); ctx.lineTo(9 - i * 2, -6 - i * 8); ctx.closePath(); ctx.fill();
        }
      } else {
        ctx.fillStyle = shade(greens[0], 1, night); ctx.beginPath(); ctx.arc(0, -15, 9, 0, 7); ctx.fill();
        ctx.fillStyle = shade(greens[1], 1, night); ctx.beginPath(); ctx.arc(-2.5, -17, 7, 0, 7); ctx.fill();
        ctx.fillStyle = shade(greens[2], 1, night); ctx.beginPath(); ctx.arc(-4, -20, 3.5, 0, 7); ctx.fill();
      }
    });
  };

  // People: variant (shirt/skin), frame 0/1, pose 0 walk / 1 flee, facing 1/-1
  R.personSprite = function (v, frame, pose, face, night, greenish) {
    var key = 'p|' + v + '|' + frame + '|' + pose + '|' + face + '|' + (night ? 1 : 0) + '|' + (greenish ? 1 : 0);
    return this.sprite(key, 16, 26, 8, 22, function (ctx) {
      ctx.scale(face, 1);
      var shirt = SHIRT[v % SHIRT.length], skin = SKIN[(v * 3 + 1) % SKIN.length], hair = HAIR[(v * 7) % HAIR.length];
      if (greenish) skin = '#C9C9A0';
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(ctx, 0, 0, 4.5, 1.8); ctx.fill();
      ctx.strokeStyle = shade('#33384D', 1, night); ctx.lineWidth = 1.7; ctx.lineCap = 'round';
      var l = frame ? 1.6 : -1.6;
      ctx.beginPath(); ctx.moveTo(-1, -5.5); ctx.lineTo(-1 + l, -0.5); ctx.moveTo(1, -5.5); ctx.lineTo(1 - l, -0.5); ctx.stroke();
      ctx.fillStyle = shade(shirt, 1, night);
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-3, -11.5, 6, 6.8, 2) : ctx.rect(-3, -11.5, 6, 6.8); ctx.fill();
      ctx.strokeStyle = shade(skin, 0.95, night); ctx.lineWidth = 1.4;
      ctx.beginPath();
      if (pose) { ctx.moveTo(-2.8, -10.5); ctx.lineTo(-4.2, -15); ctx.moveTo(2.8, -10.5); ctx.lineTo(4.2, -15); }
      else { ctx.moveTo(-3, -10.5); ctx.lineTo(-3.4 - l * 0.4, -6.5); ctx.moveTo(3, -10.5); ctx.lineTo(3.4 + l * 0.4, -6.5); }
      ctx.stroke();
      ctx.fillStyle = shade(skin, 1, night); ctx.beginPath(); ctx.arc(0, -14, 2.7, 0, 7); ctx.fill();
      ctx.fillStyle = shade(hair, 1, night); ctx.beginPath(); ctx.arc(0, -14.6, 2.8, Math.PI * 1.05, Math.PI * 1.95); ctx.fill();
    });
  };

  R.zombieSprite = function (type, frame, face, night) {
    var key = 'z|' + type + '|' + frame + '|' + face + '|' + (night ? 1 : 0);
    var mega = type === 'mega', big = type === 'brute' || mega;
    var sw = mega ? 66 : big ? 26 : 20, sh = mega ? 82 : big ? 34 : 28, sax = mega ? 30 : big ? 12 : 9, say = mega ? 76 : big ? 30 : 24;
    return this.sprite(key, sw, sh, sax, say, function (ctx) {
      ctx.scale(face, 1);
      var s = mega ? 2.85 : big ? 1.35 : type === 'runner' ? 0.95 : 1;
      ctx.scale(s, s);
      var skin = shade(mega ? '#7FA06A' : '#9EC28A', 1, night), cloth = shade(type === 'runner' ? '#8A5A44' : type === 'brute' ? '#55505E' : mega ? '#3B2F45' : '#6E5C7B', 1, night);
      if (mega) {
        // hulking back with glowing toxic growths
        ctx.fillStyle = shade('#4A3B57', 1, night);
        ctx.beginPath(); ctx.ellipse(-0.5, -10.5, 5.2, 4.6, -0.3, 0, 7); ctx.fill();
        var spikes = [[-4, -12], [-2.5, -15], [0, -16.5], [-5, -9]];
        for (var q = 0; q < spikes.length; q++) {
          ctx.fillStyle = q % 2 ? '#B7E34A' : '#8BC34A';
          ctx.beginPath(); ctx.moveTo(spikes[q][0] - 1.1, spikes[q][1] + 1.6); ctx.lineTo(spikes[q][0] - 1.8, spikes[q][1] - 2.4); ctx.lineTo(spikes[q][0] + 1, spikes[q][1] + 0.8); ctx.closePath(); ctx.fill();
        }
      }
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ellipse(ctx, 0, 0, 5, 2); ctx.fill();
      var lean = type === 'runner' ? 2.4 : 1, atk = frame === 2;
      if (atk) lean += 1.2;
      var l = frame ? 1.8 : -1.2;
      ctx.strokeStyle = shade('#3A3442', 1, night); ctx.lineWidth = big ? 2.4 : 1.8; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(-1 + lean * 0.3, -5.5); ctx.lineTo(-1.5 + l * (type === 'runner' ? 1.6 : 1), -0.4); ctx.moveTo(1 + lean * 0.3, -5.5); ctx.lineTo(1.5 - l, 0); ctx.stroke();
      ctx.fillStyle = cloth;
      ctx.beginPath(); ctx.moveTo(-3 + lean * 0.4, -5.5); ctx.lineTo(3 + lean * 0.4, -5.5); ctx.lineTo(3 + lean, -11.5); ctx.lineTo(-3 + lean, -11.5); ctx.closePath(); ctx.fill();
      // torn hem
      ctx.fillStyle = shade('#2E2A33', 1, night); ctx.fillRect(-1 + lean * 0.4, -6.4, 1.2, 1.2); ctx.fillRect(1.6 + lean * 0.4, -6.2, 1, 1);
      if (big) {
        ctx.fillStyle = shade('#9AA5B1', 1, night); ctx.fillRect(-4 + lean, -12.5, 3.2, 2.4); ctx.fillRect(1 + lean, -12.5, 3.2, 2.4);
        ctx.fillStyle = shade('#7B8794', 1, night); ctx.fillRect(-2.6 + lean * 0.7, -10, 5.4, 3.2);
      }
      // arms reach forward (the classic zombie silhouette)
      ctx.strokeStyle = skin; ctx.lineWidth = big ? 2.2 : 1.5;
      var sway = frame ? 0.7 : -0.4;
      ctx.beginPath();
      if (atk) { ctx.moveTo(lean + 1.5, -10.5); ctx.lineTo(lean + 6.5, -16); ctx.moveTo(lean + 1.2, -9); ctx.lineTo(lean + 7.5, -13.5); }
      else { ctx.moveTo(lean + 1.5, -10.5); ctx.lineTo(lean + 7, -10.5 + sway); ctx.moveTo(lean + 1.2, -9); ctx.lineTo(lean + 6.4, -8.6 - sway); }
      ctx.stroke();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(lean + 1.2, -13.8, 2.8, 0, 7); ctx.fill();
      if (big) { ctx.fillStyle = shade('#6B7580', 1, night); ctx.beginPath(); ctx.arc(lean + 1.2, -14.4, 3.1, Math.PI, 0); ctx.fill(); }
      ctx.fillStyle = '#1A1A1A'; ctx.fillRect(lean + 2, -14.6, 1, 1); ctx.fillRect(lean + 3.4, -14.4, 0.9, 0.9);
      ctx.fillStyle = shade('#5B3A3A', 1, night); ctx.fillRect(lean + 2.2, -12.6, 1.8, atk ? 1.8 : 0.7);
      if (mega) {
        // glowing eyes, jagged jaw, torn hazmat collar
        ctx.fillStyle = '#F0E442'; ctx.fillRect(lean + 1.8, -14.9, 1.3, 1.1); ctx.fillRect(lean + 3.4, -14.7, 1.2, 1.1);
        ctx.fillStyle = '#2A1C1C'; ctx.fillRect(lean + 1.8, -12.9, 2.8, atk ? 2.2 : 1.3);
        ctx.fillStyle = '#EDEDED'; ctx.fillRect(lean + 2.1, -12.9, 0.5, 0.6); ctx.fillRect(lean + 3.2, -12.9, 0.5, 0.6); ctx.fillRect(lean + 4.1, -12.9, 0.4, 0.6);
        ctx.fillStyle = shade('#E69F00', 1, night); ctx.fillRect(-2.6 + lean, -11.8, 5.6, 1.1);
      }
      if (type === 'runner') { ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(-6, -9); ctx.lineTo(-10, -9); ctx.moveTo(-6, -6); ctx.lineTo(-9, -6); ctx.stroke(); }
    });
  };

  R.carSprite = function (color, axis, night) {
    var key = 'c|' + color + '|' + axis + '|' + (night ? 1 : 0);
    return this.sprite(key, 30, 22, 15, 14, function (ctx) {
      var L = 0.32, Wd = 0.17, h = 5;
      var pts = function (x0, y0) { return iso(x0, y0); };
      var ax = axis === 0 ? L : Wd, ay = axis === 0 ? Wd : L;
      var t = pts(-ax, -ay), r = pts(ax, -ay), b = pts(ax, ay), l = pts(-ax, ay);
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.moveTo(t.x + 2, t.y + 2); ctx.lineTo(r.x + 2, r.y + 2); ctx.lineTo(b.x + 2, b.y + 2); ctx.lineTo(l.x + 2, l.y + 2); ctx.fill();
      ctx.fillStyle = shade(color, 0.92, night); ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x, b.y - h); ctx.lineTo(l.x, l.y - h); ctx.fill();
      ctx.fillStyle = shade(color, 0.7, night); ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(r.x, r.y); ctx.lineTo(r.x, r.y - h); ctx.lineTo(b.x, b.y - h); ctx.fill();
      ctx.fillStyle = shade(color, 1.1, night); ctx.beginPath(); ctx.moveTo(t.x, t.y - h); ctx.lineTo(r.x, r.y - h); ctx.lineTo(b.x, b.y - h); ctx.lineTo(l.x, l.y - h); ctx.fill();
      ctx.fillStyle = night ? '#FFE9A0' : 'rgba(30,50,70,0.75)';
      var ct = pts(0, 0); ctx.fillRect(ct.x - 3, ct.y - h - 2.5, 6, 2);
    });
  };

  /* ---------------- cars (cosmetic, render only) ---------------- */
  R.initCars = function () {
    var n = this.settings.lowFx ? 6 : 16, cars = [], W = this.W;
    var lines = []; for (var c = 1; c < W - 1; c += 5) lines.push(c);
    for (var i = 0; i < n; i++) {
      cars.push({ axis: i % 2, line: lines[Math.floor(Math.random() * lines.length)], p: 1 + Math.random() * (W - 3), dir: Math.random() < 0.5 ? 1 : -1, sp: 1.4 + Math.random() * 1.2, color: CAR[i % CAR.length] });
    }
    this.cars = cars;
  };
  R.updateCars = function (dt, mult) {
    var W = this.W;
    for (var i = 0; i < this.cars.length; i++) {
      var c = this.cars[i];
      c.p += c.dir * c.sp * dt * mult;
      var tx = c.axis === 0 ? Math.floor(c.p) : c.line, ty = c.axis === 0 ? c.line : Math.floor(c.p);
      var t = this.tileAt(tx, ty);
      if (c.p < 1 || c.p > W - 2 || !this.isRoadT(t)) { c.dir *= -1; c.p += c.dir * 0.3; }
    }
  };

  /* ===================================================================
     FX */
  R.part = function (x, y, o) {
    var lim = this.settings.lowFx ? 140 : this.settings.reducedMotion ? 260 : 700;
    for (var i = 0; i < lim; i++) {
      var p = this.parts[i];
      if (p.on) continue;
      p.on = true; p.x = x; p.y = y; p.z = o.z || 0; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
      p.g = o.g === undefined ? 60 : o.g; p.life = 0; p.max = o.max || 0.6; p.kind = o.kind || 'dot'; p.color = o.color || '#fff'; p.size = o.size || 2; p.rot = Math.random() * 6;
      return p;
    }
    return null;
  };
  R.burst = function (wx, wy, n, o) {
    if (this.settings.lowFx) n = Math.ceil(n / 3); else if (this.settings.reducedMotion) n = Math.ceil(n / 2);
    var p0 = iso(wx, wy);
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, sp = (o.speed || 30) * (0.4 + Math.random() * 0.8);
      this.part(p0.x, p0.y, { z: o.z || 6, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.5, vz: (o.up || 40) * (0.5 + Math.random()), g: o.g, max: (o.max || 0.7) * (0.7 + Math.random() * 0.6), kind: o.kind, color: o.colors ? o.colors[i % o.colors.length] : o.color, size: o.size });
    }
  };
  R.text = function (wx, wy, str, color, big) {
    for (var i = 0; i < this.texts.length; i++) {
      var t = this.texts[i]; if (t.on) continue;
      var p = iso(wx, wy);
      t.on = true; t.x = p.x; t.y = p.y - 20; t.s = str; t.color = color; t.life = 0; t.max = big ? 1.8 : 1.2; t.big = !!big;
      return;
    }
  };
  R.tracer = function (x0, y0, z0, x1, y1, z1, o) {
    for (var i = 0; i < this.tracers.length; i++) {
      var t = this.tracers[i]; if (t.on) continue;
      var a = iso(x0, y0), b = iso(x1, y1);
      t.on = true; t.ax = a.x; t.ay = a.y - z0; t.bx = b.x; t.by = b.y - z1; t.life = 0; t.max = o.max || 0.12; t.color = o.color; t.arc = o.arc || 6; t.kind = o.kind || 'line'; t.w = o.w || 1.6;
      t.onHit = o.onHit || null;
      return;
    }
  };
  R.ring = function (wx, wy, r, color, max, w) {
    for (var i = 0; i < this.rings.length; i++) {
      var g = this.rings[i]; if (g.on) continue;
      var p = iso(wx, wy);
      g.on = true; g.x = p.x; g.y = p.y; g.r = r; g.color = color; g.life = 0; g.max = max || 0.8; g.w = w || 2;
      return;
    }
  };
  R.addShake = function (a) { if (!this.settings.reducedMotion) this.shake = Math.min(12, this.shake + a); };

  // Turn simulation events into visuals
  R.onEvent = function (e) {
    var g = this.game, self = this, tw;
    switch (e.k) {
      case 'shot':
        this.flash[e.tw] = this.time;
        this.tracer(e.x0, e.y0, 22, e.x1, e.y1, 9, { color: '#FFE08A', max: 0.09, arc: 3, w: 1.6 });
        this.part(iso(e.x1, e.y1).x, iso(e.x1, e.y1).y, { z: 9, max: 0.15, kind: 'spark', color: '#FFF3B0', size: 4, g: 0 });
        if (e.stray) {
          this.tracer(e.x0, e.y0, 22, e.sx, e.sy, 8, { color: '#FF6A3D', max: 0.15, arc: 2, w: 2 });
          this.burst(e.sx, e.sy, 10, { colors: ['#D55E00', '#FFB08A'], speed: 30, up: 50, max: 0.6 });
          this.text(e.sx, e.sy, 'Bystander hit! −Trust', '#FF7A50', true);
          this.addShake(3);
        }
        break;
      case 'kill':
        if (e.z === 'mega') { this.addShake(9); this.burst(e.x, e.y, 24, { colors: ['#B7E34A', '#4A3B57', '#C9C9B0'], speed: 44, up: 70, max: 1.1, size: 3.2 }); this.text(e.x, e.y, 'SUPER-SPREADER DOWN!', '#D9F27A', true); }
        this.burst(e.x, e.y, e.z === 'brute' ? 10 : 5, { colors: ['#8FA87E', '#C9C9B0'], speed: 22, up: 35, max: 0.5, kind: 'dot', size: 2.2 });
        this.corpse(e.x, e.y, e.z, e.face, 1);
        if (e.z === 'brute') this.addShake(2.5);
        break;
      case 'decay': this.corpse(e.x, e.y, e.z, e.face, 0.6); this.burst(e.x, e.y, 4, { colors: ['#9A9A8A'], speed: 10, up: 16, max: 0.9, kind: 'smoke', size: 4, g: -10 }); break;
      case 'bite':
        this.lunge[e.zid] = { t: this.time, x: e.x, y: e.y };
        this.struck[e.vid] = this.time;
        this.burst(e.x, e.y, e.ok ? 7 : 3, { colors: e.ok ? ['#B07CE0', '#E8D0FF'] : ['#CCCCCC'], speed: 20, up: 34, max: 0.45 });
        if (e.ok && this.time - this.lastChomp > 0.5) { this.lastChomp = this.time; this.text(e.x, e.y, 'CHOMP!', '#D8B4FF'); }
        else if (!e.ok && this.time - this.lastChomp > 0.8) { this.lastChomp = this.time; this.text(e.x, e.y, 'dodged!', '#BFE6FF'); }
        break;
      case 'turn': this.burst(e.x, e.y, 10, { colors: ['#9EC28A', '#6E8A5E', '#CFE3B5'], speed: 20, up: 30, max: 0.9, kind: 'smoke', size: 4, g: -20 }); this.text(e.x, e.y, 'turned!', '#B8D8A0'); break;
      case 'reveal': this.ring(e.x, e.y, 0.9, '#E69F00', 0.7, 2); if (e.n) this.text(e.x, e.y, '◆ ' + e.n + ' found', '#F5B940'); break;
      case 'unmask': this.ring(e.x, e.y, 1.2, '#CC79A7', 0.9, 3); this.text(e.x, e.y, 'Carrier unmasked!', '#E8A0D0', true); break;
      case 'scan': this.ring(e.x, e.y, e.r, 'rgba(86,180,233,0.55)', 1.1, 1.5); break;
      case 'vax':
        this.flash[e.tw] = this.time;
        this.tracer(e.x0, e.y0, 16, e.x, e.y, 18, { color: '#36D19A', max: 0.55, arc: 30, kind: 'dart', w: 3,
          onHit: function () { self.burst(e.x, e.y, 5, { colors: ['#36D19A', '#B8F5DC'], speed: 18, up: 30, max: 0.6, kind: 'plus', size: 3, z: 18 }); } });
        break;
      case 'cure': this.burst(e.x, e.y, 8, { colors: ['#F2A6D6', '#FFFFFF'], speed: 14, up: 50, max: 1.1, kind: 'plus', size: 3.4, g: -5 }); this.text(e.x, e.y, '+1 cured', '#F7B6DE'); break;
      case 'admit': this.tracer(e.x, e.y, 10, e.x0, e.y0, 16, { color: e.zombie ? '#E8A0D0' : '#F2C1DF', max: 0.6, arc: 18, kind: 'dart', w: 2.5 }); break;
      case 'contained': this.burst(e.x, e.y, 4, { colors: ['#BBBBBB'], speed: 8, up: 14, max: 0.8, kind: 'smoke', size: 3, g: -8 }); break;
      case 'breach':
        if (e.quiet) break;
        this.bang[e.zid] = this.time; this.bShake[e.b] = this.time;
        this.burst(e.x, e.y, 4, { colors: ['#C9B48A', '#9A8A6A'], speed: 18, up: 24, max: 0.45 });
        if (this.time - this.lastBang > 0.7) { this.lastBang = this.time; this.text(e.x, e.y, 'BANG! BANG!', '#FFD08A'); }
        break;
      case 'barricadeBreak': this.burst(e.x, e.y, 18, { colors: ['#F0E442', '#333333', '#8A6A44'], speed: 40, up: 70, max: 0.9, size: 3 }); this.addShake(4); break;
      case 'build': this.ring(e.x, e.y, 0.9, 'rgba(255,255,255,0.8)', 0.5, 3); this.burst(e.x, e.y, 12, { colors: ['#E8DCC0', '#FFFFFF'], speed: 30, up: 30, max: 0.6, kind: 'smoke', size: 3 }); break;
      case 'upgrade': this.burst(e.x, e.y, 14, { colors: ['#F0E442', '#FFFFFF'], speed: 30, up: 80, max: 0.9, kind: 'star', size: 3, z: 20 }); this.text(e.x, e.y, 'Upgraded!', '#F0E442'); break;
      case 'arrive':
        this.ring(e.x, e.y, 1.1, 'rgba(255,90,31,0.9)', 0.7, 3);
        this.burst(e.x, e.y, 10, { colors: ['#FF6A1F', '#FFD24A', '#B3160B'], speed: 26, up: 70, max: 0.9, kind: 'spark', size: 3, g: 40 });
        this.burst(e.x, e.y, 6, { colors: ['#4A2C1E', '#6E4A33'], speed: 30, up: 50, max: 0.7, size: 2.4 });
        break;
      case 'hallHit': this.hallFlash = this.time; this.bShake[this.game.hallId] = this.time; if (Math.random() < 0.4) this.text(e.x, e.y - 1, '-' + 'CITY HALL', '#FF8A5C'); break;
      case 'megaArrive': this.ring(e.x, e.y, 2.2, 'rgba(183,227,74,0.9)', 1.4, 4); this.addShake(7); break;
      case 'ruin': this.burst(e.x, e.y, 16, { colors: ['#6B6B6B', '#3E3E3E', '#8BC34A'], speed: 26, up: 50, max: 1.4, kind: 'smoke', size: 5, g: -12, z: 20 }); this.text(e.x, e.y, 'OVERRUN', '#B7E34A', true); this.addShake(2); break;
      case 'waveStart': this.addShake(2); break;
    }
  };

  R.updateFx = function (dt) {
    var i, p;
    for (i = 0; i < this.parts.length; i++) {
      p = this.parts[i]; if (!p.on) continue;
      p.life += dt; if (p.life >= p.max) { p.on = false; continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.g * dt; p.rot += dt * 6;
      if (p.z < 0 && p.g > 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; p.vy *= 0.6; }
    }
    for (i = 0; i < this.texts.length; i++) { var t = this.texts[i]; if (!t.on) continue; t.life += dt; t.y -= dt * 18; if (t.life >= t.max) t.on = false; }
    for (i = 0; i < this.tracers.length; i++) { var tr = this.tracers[i]; if (!tr.on) continue; tr.life += dt; if (tr.life >= tr.max) { tr.on = false; if (tr.onHit) tr.onHit(); } }
    for (i = 0; i < this.rings.length; i++) { var g = this.rings[i]; if (!g.on) continue; g.life += dt; if (g.life >= g.max) g.on = false; }
    this.shake *= Math.pow(0.02, dt);
  };

  /* ===================================================================
     TOWERS (drawn live: they animate) */
  R.drawTower = function (ctx, tw, alpha, ghost) {
    var def = D.TOWERS[tw.type], t = this.time;
    var p = iso(tw.x, tw.y), x = p.x, y = p.y;
    var col = def.color;
    ctx.save();
    if (ghost) ctx.globalAlpha = 0.6;
    var box = function (cx, cy, w, d, h, c, f) {
      f = f || 1;
      ctx.fillStyle = shade(c, 0.95 * f); ctx.beginPath(); ctx.moveTo(cx - w, cy); ctx.lineTo(cx, cy + d); ctx.lineTo(cx, cy + d - h); ctx.lineTo(cx - w, cy - h); ctx.fill();
      ctx.fillStyle = shade(c, 0.72 * f); ctx.beginPath(); ctx.moveTo(cx, cy + d); ctx.lineTo(cx + w, cy); ctx.lineTo(cx + w, cy - h); ctx.lineTo(cx, cy + d - h); ctx.fill();
      ctx.fillStyle = shade(c, 1.12 * f); ctx.beginPath(); ctx.moveTo(cx - w, cy - h); ctx.lineTo(cx, cy + d - h); ctx.lineTo(cx + w, cy - h); ctx.lineTo(cx, cy - d - h); ctx.fill();
    };
    var platform = function () {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(ctx, x + 3, y + 2, 26, 12); ctx.fill();
      box(x, y, 24, 12, 3, '#CFC9BC');
      ctx.strokeStyle = col; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x - 24, y - 3); ctx.lineTo(x, y + 9); ctx.lineTo(x + 24, y - 3); ctx.stroke();
    };
    switch (tw.type) {
      case 'militia': {
        platform();
        // sandbags
        for (var i = 0; i < 10; i++) {
          var a = i / 10 * Math.PI * 2, sx = x + Math.cos(a) * 15, sy = y - 4 + Math.sin(a) * 7.5;
          ctx.fillStyle = shade('#C8B48A', i % 2 ? 0.9 : 1); ellipse(ctx, sx, sy, 5, 3); ctx.fill();
        }
        box(x, y - 5, 8, 4, 7, '#6E7563');
        var ang = tw.angle || 0, dx = Math.cos(ang) - Math.sin(ang), dy = (Math.cos(ang) + Math.sin(ang)) * 0.5, len = Math.hypot(dx, dy) || 1;
        dx /= len; dy /= len;
        ctx.strokeStyle = '#2E3328'; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y - 15); ctx.lineTo(x + dx * 17, y - 15 + dy * 17); ctx.stroke();
        ctx.fillStyle = shade('#7C8570', 1); ctx.beginPath(); ctx.arc(x, y - 15, 5.5, 0, 7); ctx.fill();
        var ft = this.flash[tw.id];
        if (ft !== undefined && t - ft < 0.07) {
          ctx.fillStyle = '#FFE08A'; ctx.beginPath(); ctx.arc(x + dx * 20, y - 15 + dy * 20, 5, 0, 7); ctx.fill();
          ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(x + dx * 20, y - 15 + dy * 20, 2.2, 0, 7); ctx.fill();
        }
        // two soldiers behind the sandbags, aiming where the turret aims
        if (!ghost) for (var sd = 0; sd < 2; sd++) {
          var px = x + (sd ? 13 : -14), py = y + (sd ? 3 : 1);
          var firing = ft !== undefined && t - ft < 0.12 && (Math.floor(ft * 13) % 2) === sd;
          var rec = firing ? -1.5 : 0;
          this.soldier(ctx, px + dx * rec, py + dy * rec * 0.5, dx, dy, firing, tw.id + sd);
        }
        break;
      }
      case 'lab': {
        platform();
        box(x, y - 3, 16, 8, 16, '#F2F4F7');
        ctx.fillStyle = shade(col, 1); ctx.beginPath(); ctx.moveTo(x - 16, y - 19); ctx.lineTo(x, y - 11); ctx.lineTo(x + 16, y - 19); ctx.lineTo(x, y - 27); ctx.fill();
        ctx.fillStyle = '#9FD3F2'; ctx.fillRect(x - 12, y - 14, 5, 4); ctx.fillRect(x - 5, y - 10, 4, 4);
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 4, y - 22); ctx.lineTo(x + 4, y - 36); ctx.stroke();
        var sc = Math.cos(t * 2.2 + tw.id);
        ctx.fillStyle = '#E8ECF0'; ctx.strokeStyle = '#7A8590'; ctx.lineWidth = 1;
        ellipse(ctx, x + 4, y - 38, Math.abs(sc) * 9 + 1.5, 5); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x + 4, y - 38); ctx.lineTo(x + 4 + sc * 7, y - 42); ctx.stroke();
        break;
      }
      case 'clinic': {
        platform();
        box(x, y - 3, 17, 8.5, 13, '#F7F8F6');
        ctx.fillStyle = shade(col, 1); ctx.beginPath(); ctx.moveTo(x - 17, y - 10); ctx.lineTo(x, y - 1.5); ctx.lineTo(x, y - 4.5); ctx.lineTo(x - 17, y - 13); ctx.fill();
        ctx.fillStyle = shade(col, 0.75); ctx.beginPath(); ctx.moveTo(x, y - 1.5); ctx.lineTo(x + 17, y - 10); ctx.lineTo(x + 17, y - 13); ctx.lineTo(x, y - 4.5); ctx.fill();
        // residents queuing for their shot while the clinic is busy
        var busy = this.flash[tw.id];
        if (!ghost && busy !== undefined && t - busy < 4) {
          var nq = 2 + (tw.id % 3);
          for (var qn = 0; qn < nq; qn++) {
            var qp = iso(tw.x - 0.55 - qn * 0.28, tw.y + 0.55);
            this.blit(ctx, this.personSprite((tw.id + qn * 3) % 8, (Math.floor(t * 2) + qn) % 2 ? 0 : 0, 0, 1, this.night > 0.5), qp.x, qp.y + (qn % 2 ? 0 : -0.5));
          }
        }
        var pulse = 1 + Math.sin(t * 4 + tw.id) * 0.12;
        ctx.fillStyle = col; ctx.save(); ctx.translate(x, y - 28); ctx.scale(pulse, pulse);
        ctx.beginPath(); ctx.arc(0, 0, 7.5, 0, 7); ctx.fill();
        // syringe glyph
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-4, 4); ctx.lineTo(3, -3); ctx.stroke();
        ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(3, -3); ctx.lineTo(5, -5); ctx.moveTo(-1, -1); ctx.lineTo(1, 1); ctx.stroke();
        ctx.restore();
        break;
      }
      case 'hospital': {
        platform();
        box(x, y - 3, 20, 10, 20, '#FBFBFB');
        ctx.fillStyle = '#C9E6F5';
        for (var w = 0; w < 3; w++) { ctx.fillRect(x - 17 + w * 5, y - 15 + w * 2.5, 3, 4); ctx.fillRect(x + 3 + w * 5, y - 9 - w * 2.5, 3, 4); }
        var pul = 0.75 + Math.sin(t * 3 + tw.id) * 0.25;
        ctx.fillStyle = shade(col, 1); ctx.beginPath(); ctx.arc(x, y - 33, 8, 0, 7); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H', x, y - 32.5);
        ctx.globalAlpha = (ghost ? 0.6 : 1) * pul * 0.5;
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 33, 11, 0, 7); ctx.stroke();
        ctx.globalAlpha = ghost ? 0.6 : 1;
        // beds bar
        if (!ghost && this.game) {
          var nh = Math.max(1, this.game.countTowers('hospital'));
          var beds = tw.st.beds + Math.floor(this.game.bonusBeds / nh), used = tw.patients.length;
          ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 13, y - 49, 26, 4);
          ctx.fillStyle = used >= beds ? '#D55E00' : '#F2A6D6'; ctx.fillRect(x - 13, y - 49, 26 * Math.min(1, used / beds), 4);
        }
        break;
      }
      case 'barricade': {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(ctx, x + 2, y + 2, 20, 8); ctx.fill();
        var stripe = function (x0, y0, x1, y1) {
          ctx.lineWidth = 5; ctx.strokeStyle = '#222'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
          ctx.setLineDash([4, 4]); ctx.strokeStyle = '#F0E442'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
          ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x0 + 2, y0); ctx.lineTo(x0 + 2, y0 + 7); ctx.moveTo(x1 - 2, y1); ctx.lineTo(x1 - 2, y1 + 7); ctx.stroke();
        };
        stripe(x - 18, y - 6, x + 2, y + 4);
        stripe(x - 2, y - 10, x + 18, y);
        ctx.fillStyle = '#E8762B'; ctx.beginPath(); ctx.moveTo(x + 10, y + 6); ctx.lineTo(x + 13, y - 3); ctx.lineTo(x + 16, y + 6); ctx.fill();
        if (!ghost && tw.hp < tw.st.hp) { ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x - 12, y - 20, 24, 3); ctx.fillStyle = '#F0E442'; ctx.fillRect(x - 12, y - 20, 24 * tw.hp / tw.st.hp, 3); }
        break;
      }
      case 'radio': {
        platform();
        ctx.strokeStyle = '#8A949E'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.lineTo(x, y - 52); ctx.lineTo(x + 10, y); ctx.stroke();
        ctx.lineWidth = 0.9;
        for (var k = 1; k < 6; k++) { var yy = y - k * 9, ww = 10 * (1 - k * 9 / 52); ctx.beginPath(); ctx.moveTo(x - ww, yy); ctx.lineTo(x + ww * 0.8, yy - 8); ctx.moveTo(x + ww, yy); ctx.lineTo(x - ww * 0.8, yy - 8); ctx.stroke(); }
        var blink = Math.sin(t * 5 + tw.id) > 0;
        ctx.fillStyle = blink ? '#FF4D4D' : '#7A2020'; ctx.beginPath(); ctx.arc(x, y - 53, 2.6, 0, 7); ctx.fill();
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        for (var wv = 0; wv < 3; wv++) {
          var ph = ((t * 0.8 + wv / 3 + tw.id * 0.1) % 1);
          ctx.globalAlpha = (ghost ? 0.6 : 1) * (1 - ph);
          ctx.beginPath(); ctx.arc(x, y - 53, 6 + ph * 22, -0.9, 0.9); ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y - 53, 6 + ph * 22, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
        }
        ctx.globalAlpha = ghost ? 0.6 : 1;
        break;
      }
      case 'chw': {
        ctx.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(ctx, x + 2, y + 2, 15, 6); ctx.fill();
        var bob = tw.moving ? Math.sin(t * 14) * 0.6 : 0;
        box(x, y - 2 + bob, 12, 6, 10, '#F6F2EA');
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - 12, y - 6 + bob); ctx.lineTo(x, y + bob); ctx.lineTo(x, y - 3 + bob); ctx.lineTo(x - 12, y - 9 + bob); ctx.fill();
        ctx.fillStyle = '#2E3440'; ellipse(ctx, x - 7, y + 1, 2.4, 1.6); ctx.fill(); ellipse(ctx, x + 6, y + 1.5, 2.4, 1.6); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y - 22 + bob, 6.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#FFF'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♥', x, y - 21.5 + bob);
        if (!ghost) {
          // a few team members on foot around the van
          for (var m = 0; m < 2; m++) {
            var mp = iso(tw.x + Math.cos(t * 0.7 + m * 3) * 0.6, tw.y + Math.sin(t * 0.7 + m * 3) * 0.6);
            var spr = this.personSprite(1, (Math.floor(t * 4) + m) % 2, 0, 1, false);
            this.blit(ctx, spr, mp.x, mp.y);
          }
        }
        break;
      }
      case 'pantry': {
        platform();
        box(x - 4, y - 3, 12, 6, 9, '#C9A77E');
        ctx.fillStyle = '#F4E9D8'; ctx.beginPath(); ctx.moveTo(x - 18, y - 14); ctx.lineTo(x - 4, y - 7); ctx.lineTo(x + 10, y - 14); ctx.lineTo(x - 4, y - 21); ctx.fill();
        ctx.fillStyle = col; for (var st2 = 0; st2 < 4; st2++) { ctx.beginPath(); ctx.moveTo(x - 18 + st2 * 3.5, y - 14 + st2 * 1.75); ctx.lineTo(x - 16 + st2 * 3.5, y - 13 + st2 * 1.75); ctx.lineTo(x - 2 + st2 * 3.5, y - 20 + st2 * 1.75); ctx.lineTo(x - 4 + st2 * 3.5, y - 21 + st2 * 1.75); ctx.fill(); }
        box(x + 12, y, 4, 2, 4, '#8A6A44'); box(x + 9, y + 3, 4, 2, 4, '#A07A50');
        ctx.fillStyle = '#F0E442'; ctx.beginPath(); ctx.arc(x + 12, y - 6, 1.6, 0, 7); ctx.fill(); ctx.fillStyle = '#D55E00'; ctx.beginPath(); ctx.arc(x + 9.5, y - 3, 1.5, 0, 7); ctx.fill();
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x - 4, y - 32, 6.5, 0, 7); ctx.fill();
        ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(x - 8, y - 33); ctx.lineTo(x, y - 33); ctx.lineTo(x - 1.5, y - 29); ctx.lineTo(x - 6.5, y - 29); ctx.closePath(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x - 4, y - 33, 3, Math.PI, 0); ctx.stroke();
        break;
      }
    }
    // level pips
    if (!ghost && tw.level > 1) {
      for (var lv = 0; lv < tw.level - 1; lv++) {
        ctx.fillStyle = '#F0E442'; ctx.strokeStyle = '#333'; ctx.lineWidth = 0.8;
        this.star(ctx, x - 6 + lv * 12, y + 14, 4); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
  };

  // A small soldier figure (helmet + rifle) used at Militia Turrets
  R.soldier = function (ctx, x, y, dx, dy, firing, seed) {
    var face = dx < 0 ? -1 : 1;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ellipse(ctx, x, y, 4.5, 1.8); ctx.fill();
    ctx.strokeStyle = '#3B4230'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x - 1, y - 5); ctx.lineTo(x - 1.6, y); ctx.moveTo(x + 1, y - 5); ctx.lineTo(x + 1.6, y); ctx.stroke();
    ctx.fillStyle = '#5E6B3A'; ctx.fillRect(x - 3, y - 11.5, 6, 6.8);
    ctx.fillStyle = '#C69C7B'; ctx.beginPath(); ctx.arc(x, y - 13.8, 2.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#4B5320'; ctx.beginPath(); ctx.arc(x, y - 14.4, 3.1, Math.PI, 0); ctx.fill(); ctx.fillRect(x - 3.4, y - 14.6, 6.8, 1);
    // rifle aimed at the target
    var rx = x + face * 1.5, ry = y - 9.5;
    ctx.strokeStyle = '#1F2319'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(rx - dx * 2, ry - dy * 2); ctx.lineTo(rx + dx * 9, ry + dy * 9); ctx.stroke();
    if (firing) {
      ctx.fillStyle = '#FFE08A'; ctx.beginPath(); ctx.arc(rx + dx * 11, ry + dy * 11, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.arc(rx + dx * 11, ry + dy * 11, 1.3, 0, 7); ctx.fill();
    }
  };


  // Hell holes: zombies from outside claw their way up out of these
  R.drawHoles = function (ctx, dt) {
    var g = this.game, W = this.W, st = this.settings, t = this.time;
    if (!g.plans || g.attract) return;
    var cur = g.phase === 'build' ? g.wave : g.wave - 1, open = {}, forming = {};
    for (var w = 0; w <= Math.min(cur, g.plans.length - 1); w++) g.plans[w].entries.forEach(function (e) { if (w < cur || g.phase !== 'build') open[e] = 1; else forming[e] = 1; });
    var keys = Object.keys(open).concat(Object.keys(forming).filter(function (k) { return !open[k]; }));
    for (var i = 0; i < keys.length; i++) {
      var e = +keys[i], ex = e % W + 0.5, ey = ((e / W) | 0) + 0.5, p = iso(ex, ey), isOpen = !!open[e];
      var active = g.holeT && g.holeT[e] !== undefined && g.t - g.holeT[e] < 3;
      var flick = 0.85 + 0.15 * Math.sin(t * 9 + e) * Math.sin(t * 5.3 + e * 2);
      var seed = e * 7;
      // scorched ground
      ctx.fillStyle = 'rgba(25,8,4,' + (isOpen ? 0.6 : 0.35) + ')'; ellipse(ctx, p.x, p.y, 34, 17); ctx.fill();
      // glowing cracks radiating out
      for (var c = 0; c < 8; c++) {
        var ang = c / 8 * Math.PI * 2 + hash2(seed, c) * 0.5, len = (isOpen ? 26 : 18) + hash2(c, seed) * 14;
        ctx.beginPath(); ctx.moveTo(p.x + Math.cos(ang) * 12, p.y + Math.sin(ang) * 6);
        var mx = p.x + Math.cos(ang + 0.25) * len * 0.6, my = p.y + Math.sin(ang + 0.25) * len * 0.3;
        ctx.lineTo(mx, my); ctx.lineTo(p.x + Math.cos(ang) * len, p.y + Math.sin(ang) * len * 0.5);
        ctx.strokeStyle = 'rgba(255,106,31,' + ((isOpen ? 0.75 : 0.35 + 0.3 * Math.sin(t * 4)) * flick).toFixed(2) + ')'; ctx.lineWidth = 2.6; ctx.stroke();
        ctx.strokeStyle = 'rgba(30,6,2,0.9)'; ctx.lineWidth = 0.9; ctx.stroke();
      }
      if (!isOpen) continue;
      // the pit: fire far below
      var gr = ctx.createRadialGradient(p.x, p.y + 1, 1, p.x, p.y, 20);
      gr.addColorStop(0, 'rgba(255,236,140,' + flick.toFixed(2) + ')'); gr.addColorStop(0.3, '#FF6A1F'); gr.addColorStop(0.65, '#9E1208'); gr.addColorStop(1, '#140202');
      ctx.fillStyle = gr; ellipse(ctx, p.x, p.y, 19, 9.5); ctx.fill();
      // back wall of the pit (gives it depth)
      ctx.fillStyle = 'rgba(10,2,1,0.85)'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 2, 19, 7.5, 0, Math.PI, 0); ctx.ellipse(p.x, p.y + 1, 17, 5.5, 0, 0, Math.PI, true); ctx.fill();
      // jagged rocky rim
      for (var r = 0; r < 14; r++) {
        var ra = r / 14 * Math.PI * 2, rx = p.x + Math.cos(ra) * 20, ry = p.y + Math.sin(ra) * 10, rs = 2.5 + hash2(seed + r, r) * 3;
        ctx.fillStyle = r % 2 ? '#2B1A12' : '#3D2618';
        ctx.beginPath(); ctx.moveTo(rx - rs, ry + 1); ctx.lineTo(rx - rs * 0.3, ry - rs * 1.3); ctx.lineTo(rx + rs, ry); ctx.closePath(); ctx.fill();
      }
      // glow and flames
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      var glowR = active ? 46 : 30;
      var gl = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, glowR);
      gl.addColorStop(0, 'rgba(255,120,40,' + ((active ? 0.55 : 0.3) * flick).toFixed(2) + ')'); gl.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = gl; ellipse(ctx, p.x, p.y, glowR, glowR * 0.6); ctx.fill();
      if (active) {
        var fh = 40 + 14 * Math.sin(t * 13 + e);
        var fl = ctx.createLinearGradient(p.x, p.y, p.x, p.y - fh);
        fl.addColorStop(0, 'rgba(255,170,60,0.55)'); fl.addColorStop(1, 'rgba(255,40,10,0)');
        ctx.fillStyle = fl; ctx.beginPath(); ctx.moveTo(p.x - 12, p.y); ctx.quadraticCurveTo(p.x - 4, p.y - fh * 0.6, p.x, p.y - fh); ctx.quadraticCurveTo(p.x + 4, p.y - fh * 0.6, p.x + 12, p.y); ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      // embers drifting up
      if (!st.lowFx && Math.random() < dt * (active ? 18 : 4)) this.part(p.x + (Math.random() - 0.5) * 22, p.y, { z: 2, vx: (Math.random() - 0.5) * 8, vy: 0, vz: 25 + Math.random() * 25, g: -4, max: 1.4, kind: 'spark', color: Math.random() < 0.5 ? '#FFB347' : '#FF5A1F', size: 2 });
    }
  };

  // City Hall: the command bunker the player must protect
  R.drawHallGround = function (ctx) {
    var g = this.game; if (g.attract || g.hallId === undefined) return;
    var b = g.blds[g.hallId], p = iso(b.cx, b.cy), t = this.time, frac = g.hallHp / g.hallMax;
    var hit = this.hallFlash !== undefined && t - this.hallFlash < 0.4;
    // sandbag ring
    for (var i = 0; i < 18; i++) {
      var a = i / 18 * Math.PI * 2, sx = p.x + Math.cos(a) * 34, sy = p.y + Math.sin(a) * 17;
      ctx.fillStyle = shade('#C8B48A', i % 2 ? 0.86 : 1, this.night > 0.5); ellipse(ctx, sx, sy, 6, 3.4); ctx.fill();
    }
    // protective ring: blue when healthy, orange/red as it weakens, flashing when hit
    var col = hit ? '255,80,40' : frac > 0.5 ? '86,180,233' : frac > 0.25 ? '230,159,0' : '213,94,0';
    var pul = 0.5 + 0.5 * Math.sin(t * 3);
    ctx.strokeStyle = 'rgba(' + col + ',' + (0.55 + pul * 0.35).toFixed(2) + ')'; ctx.lineWidth = hit ? 4 : 2.5; ctx.setLineDash([10, 6]);
    var e = ISO.ellipse(1.6 + pul * 0.08); ellipse(ctx, p.x, p.y, e.rx, e.ry); ctx.stroke(); ctx.setLineDash([]);
  };
  R.drawHallLabel = function (ctx) {
    var g = this.game; if (g.attract || g.hallId === undefined) return;
    var cb = g.city.buildings[g.hallId], p = iso(cb.x + 0.5, cb.y + 0.5), z = this.cam.zoom, s = 1 / Math.max(0.55, z);
    var top = p.y - this.bHeight(cb) - 48 * s, frac = Math.max(0, g.hallHp / g.hallMax), w = 64 * s;
    var hit = this.hallFlash !== undefined && this.time - this.hallFlash < 0.4;
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.font = '700 ' + (11 * s).toFixed(1) + 'px Oswald, system-ui, sans-serif';
    var label = g.phase === 'build' && g.wave === 0 ? 'DEFEND CITY HALL' : 'CITY HALL · COMMAND BUNKER';
    ctx.lineWidth = 3 * s; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(label, p.x, top - 2 * s);
    ctx.fillStyle = hit ? '#FF8A5C' : '#BFE6FF'; ctx.fillText(label, p.x, top - 2 * s);
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(p.x - w / 2 - s, top, w + 2 * s, 7 * s);
    ctx.fillStyle = frac > 0.5 ? '#56B4E9' : frac > 0.25 ? '#E69F00' : '#D55E00'; ctx.fillRect(p.x - w / 2, top + s, w * frac, 5 * s);
  };

  // Downed zombies tip over and fade away (no gore)
  R.corpse = function (wx, wy, type, face, alpha) {
    for (var i = 0; i < this.corpses.length; i++) {
      var c = this.corpses[i]; if (c.on) continue;
      var p = iso(wx, wy);
      c.on = true; c.x = p.x; c.y = p.y; c.type = type === 'carrier' ? 'basic' : (type || 'basic'); c.face = face || 1; c.t = this.time; c.a = alpha || 1;
      return;
    }
  };
  R.drawCorpses = function (ctx, night) {
    var zs = this.agentScale || 1;
    for (var i = 0; i < this.corpses.length; i++) {
      var c = this.corpses[i]; if (!c.on) continue;
      var age = this.time - c.t;
      if (age > 2.2) { c.on = false; continue; }
      var fall = Math.min(1, age / 0.3);
      ctx.save();
      ctx.globalAlpha = c.a * (age < 1.4 ? 1 : 1 - (age - 1.4) / 0.8);
      ctx.translate(c.x, c.y);
      ctx.rotate(c.face * fall * Math.PI / 2 * 0.95);
      var spr = this.zombieSprite(c.type, 0, c.face, night);
      this.blit(ctx, spr, 0, 0, zs);
      ctx.restore();
    }
  };
  R.star = function (ctx, x, y, r) {
    ctx.beginPath();
    for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.closePath();
  };

  // Glyph icons used in the HUD and on the map (shape-coded for colorblind players)
  R.glyph = function (ctx, kind, x, y, s, color) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s / 20, s / 20);
    ctx.strokeStyle = color || '#fff'; ctx.fillStyle = color || '#fff'; ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    switch (kind) {
      case 'crosshair': ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-4, 0); ctx.moveTo(4, 0); ctx.lineTo(10, 0); ctx.moveTo(0, -10); ctx.lineTo(0, -4); ctx.moveTo(0, 4); ctx.lineTo(0, 10); ctx.stroke(); break;
      case 'magnifier': ctx.beginPath(); ctx.arc(-2, -2, 6, 0, 7); ctx.stroke(); ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(3, 3); ctx.lineTo(9, 9); ctx.stroke(); break;
      case 'syringe': ctx.beginPath(); ctx.moveTo(-8, 8); ctx.lineTo(5, -5); ctx.stroke(); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-5, 5); ctx.lineTo(3, -3); ctx.stroke(); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(9, -9); ctx.moveTo(2, -8); ctx.lineTo(8, -2); ctx.stroke(); break;
      case 'h': ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(-6, 8); ctx.moveTo(6, -8); ctx.lineTo(6, 8); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.stroke(); break;
      case 'barrier': ctx.lineWidth = 2; ctx.strokeRect(-9, -5, 18, 7); ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-1, 2); ctx.moveTo(1, -5); ctx.lineTo(5, 2); ctx.moveTo(-7, 2); ctx.lineTo(-7, 9); ctx.moveTo(7, 2); ctx.lineTo(7, 9); ctx.stroke(); break;
      case 'waves': ctx.beginPath(); ctx.arc(-6, 6, 3, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(-6, 6, 8, -1.4, -0.1); ctx.stroke(); ctx.beginPath(); ctx.arc(-6, 6, 13, -1.4, -0.1); ctx.stroke(); break;
      case 'heart': ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-12, -1, -6, -10, 0, -4); ctx.bezierCurveTo(6, -10, 12, -1, 0, 8); ctx.fill(); break;
      case 'basket': ctx.beginPath(); ctx.moveTo(-9, -2); ctx.lineTo(9, -2); ctx.lineTo(6, 8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, -2, 6, Math.PI, 0); ctx.stroke(); break;
    }
    ctx.restore();
  };

  /* ===================================================================
     MAIN DRAW */
  R.nightFactor = function () {
    var g = this.game;
    if (!g || g.attract) return 0;
    var idx = Math.max(0, g.wave - 1), def = g.waveDefs[Math.min(idx, g.waveDefs.length - 1)];
    if (!def) return 0;
    if (g.phase === 'wave') return C.lerp(def.night[0], def.night[1], C.clamp(g.waveTime / g.waveDuration, 0, 1));
    if (g.wave === 0) return g.waveDefs[0].night[0];
    return def.night[1];
  };

  R.getDraw = function () { var d = this.drawPool.pop() || {}; this.drawList.push(d); return d; };

  R.draw = function (alpha, dt, ui) {
    var ctx = this.ctx, g = this.game, cam = this.cam, dpr = this.dpr, st = this.settings, self = this;
    if (!g) return;
    this.time += dt;
    this.prewarm(this.warmIdx < g.city.buildings.length ? 40 : 3);
    var simSpeed = ui && ui.paused ? 0 : (ui ? ui.speed : 1);
    var k = 1 - Math.exp(-dt * 10);
    cam.x += (cam.tx - cam.x) * k; cam.y += (cam.ty - cam.y) * k; cam.zoom += (cam.tz - cam.zoom) * k;
    this.updateFx(dt);
    if (g.phase === 'wave' || g.phase === 'attract') this.updateCars(dt, simSpeed);
    var targetNight = this.nightFactor();
    this.night += (targetNight - this.night) * Math.min(1, dt * 1.5);
    var night = this.night, nightOn = night > 0.5;

    // background
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var bg = ctx.createLinearGradient(0, 0, 0, this.vh);
    bg.addColorStop(0, shade('#4D7A8F', 1 - night * 0.6)); bg.addColorStop(1, shade('#1E3442', 1 - night * 0.5));
    ctx.fillStyle = bg; ctx.fillRect(0, 0, this.vw, this.vh);

    var z = cam.zoom, sx = 0, sy = 0, i;
    if (this.shake > 0.2) { sx = (Math.random() - 0.5) * this.shake; sy = (Math.random() - 0.5) * this.shake; }
    var ox = this.vw / 2 - cam.x * z + sx, oy = this.vh / 2 - cam.y * z + sy;
    ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
    // view bounds in iso px
    var vx0 = cam.x - this.vw / 2 / z - 80, vx1 = cam.x + this.vw / 2 / z + 80, vy0 = cam.y - this.vh / 2 / z - 40, vy1 = cam.y + this.vh / 2 / z + 160;
    this.view = { x0: vx0, x1: vx1, y0: vy0, y1: vy1 };

    // diorama skirt (earth under the city)
    var pL = iso(0, this.H), pB = iso(this.W, this.H), pR = iso(this.W, 0), depth = 34;
    ctx.fillStyle = shade('#6B5640', 0.9 * (1 - night * 0.55));
    ctx.beginPath(); ctx.moveTo(pL.x, pL.y); ctx.lineTo(pB.x, pB.y); ctx.lineTo(pB.x, pB.y + depth); ctx.lineTo(pL.x, pL.y + depth); ctx.fill();
    ctx.fillStyle = shade('#4E3E2E', 0.9 * (1 - night * 0.55));
    ctx.beginPath(); ctx.moveTo(pB.x, pB.y); ctx.lineTo(pR.x, pR.y); ctx.lineTo(pR.x, pR.y + depth); ctx.lineTo(pB.x, pB.y + depth); ctx.fill();

    // ground (only the visible part of the pre-rendered canvas)
    var gr = this.ground;
    var gx0 = Math.max(gr.x, vx0), gy0 = Math.max(gr.y, vy0), gx1 = Math.min(gr.x + gr.w, vx1), gy1 = Math.min(gr.y + gr.h, vy1);
    if (gx1 > gx0 && gy1 > gy0) ctx.drawImage(gr.c, (gx0 - gr.x) * gr.rs, (gy0 - gr.y) * gr.rs, (gx1 - gx0) * gr.rs, (gy1 - gy0) * gr.rs, gx0, gy0, gx1 - gx0, gy1 - gy0);
    // water shimmer
    if (!st.lowFx) this.drawWater(ctx);

    // night over the ground (sprites carry their own night colors)
    if (night > 0.02) {
      ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = 'rgba(12,22,58,' + (night * 0.55).toFixed(3) + ')';
      ctx.fillRect(0, 0, this.vw, this.vh);
      ctx.restore();
    }

    // overlays on the ground
    this.drawGroundOverlays(ctx, ui);

    // rings on the ground
    for (i = 0; i < this.rings.length; i++) {
      var rg = this.rings[i]; if (!rg.on) continue;
      var f = rg.life / rg.max, e = ISO.ellipse(rg.r * (0.25 + 0.75 * f));
      ctx.strokeStyle = rg.color; ctx.globalAlpha = 1 - f; ctx.lineWidth = rg.w;
      ellipse(ctx, rg.x, rg.y, e.rx, e.ry); ctx.stroke(); ctx.globalAlpha = 1;
    }

    this.drawHoles(ctx, dt);
    this.drawHallGround(ctx);
    // blighted ground around overrun buildings
    var gb = g.blds;
    for (i = 0; i < gb.length; i++) {
      var bl = gb[i].blight; if (bl < 2) continue;
      var bp = iso(gb[i].cx, gb[i].cy);
      if (bp.x < vx0 || bp.x > vx1 || bp.y < vy0 || bp.y > vy1) continue;
      var be = ISO.ellipse(bl === 3 ? 0.95 : 0.75);
      ctx.fillStyle = bl === 3 ? 'rgba(52,58,30,0.55)' : 'rgba(70,80,36,0.35)'; ellipse(ctx, bp.x, bp.y, be.rx, be.ry); ctx.fill();
    }
    this.drawCorpses(ctx, nightOn);
    // ---- depth-sorted world objects ----
    var list = this.drawList;
    for (i = 0; i < list.length; i++) this.drawPool.push(list[i]);
    list.length = 0;
    var city = g.city, blds = g.blds, cbs = city.buildings, d;
    var inView = function (px, py, up) { return px > vx0 && px < vx1 && py > vy0 && py - up < vy1; };
    for (i = 0; i < cbs.length; i++) {
      var cb = cbs[i], b = blds[i], pp = iso(cb.x + 0.5, cb.y + 0.5);
      if (!inView(pp.x, pp.y, -140)) continue;
      d = this.getDraw(); d.k = 0; d.d = cb.x + cb.y + 1; d.o = i; d.x = pp.x; d.y = pp.y;
    }
    var towerTiles = g.towerAt;
    for (i = 0; i < city.trees.length; i++) {
      var tr = city.trees[i];
      if (towerTiles[tr.tile] >= 0) continue;
      var tp = iso(tr.x, tr.y);
      if (!inView(tp.x, tp.y, -50)) continue;
      d = this.getDraw(); d.k = 1; d.d = tr.x + tr.y; d.o = tr; d.x = tp.x; d.y = tp.y;
    }
    for (i = 0; i < g.towers.length; i++) {
      var tw = g.towers[i], twp = iso(tw.x, tw.y);
      if (!inView(twp.x, twp.y, -70)) continue;
      d = this.getDraw(); d.k = 2; d.d = tw.x + tw.y + (tw.type === 'barricade' ? 0 : 0.5); d.o = tw;
    }
    var ag = g.agents;
    for (i = 0; i < ag.length; i++) {
      var a = ag[i]; if (a.dead) continue;
      var ax = a.px + (a.x - a.px) * alpha, ay = a.py + (a.y - a.py) * alpha, ap = iso(ax, ay);
      if (!inView(ap.x, ap.y, -30)) continue;
      d = this.getDraw(); d.k = 3; d.d = ax + ay; d.o = a; d.x = ap.x; d.y = ap.y;
    }
    for (i = 0; i < this.cars.length; i++) {
      var car = this.cars[i];
      var cxw = car.axis === 0 ? car.p : car.line + 0.5 + (car.dir > 0 ? 0.22 : -0.22), cyw = car.axis === 0 ? car.line + 0.5 + (car.dir > 0 ? -0.22 : 0.22) : car.p;
      if (!this.isRoadT(this.tileAt(Math.floor(cxw), Math.floor(cyw)))) continue;
      var cp = iso(cxw, cyw);
      if (!inView(cp.x, cp.y, -20)) continue;
      d = this.getDraw(); d.k = 4; d.d = cxw + cyw; d.o = car; d.x = cp.x; d.y = cp.y;
    }
    list.sort(function (p, q) { return p.d - q.d; });
    this.stats.drawn = list.length;

    var walkFrame = Math.floor(this.time * 4);
    // Low effects: nearest-neighbour sprite sampling is much cheaper on weak devices
    ctx.imageSmoothingEnabled = !st.lowFx;
    // keep people readable when zoomed out (tower-defense readability over strict scale)
    this.agentScale = C.clamp(0.95 / z, 1, 1.9);
    for (i = 0; i < list.length; i++) {
      d = list[i];
      if (d.k === 0) {
        var cb2 = cbs[d.o], b2 = blds[d.o], alive = b2.S + b2.E + b2.Ek + b2.V + b2.R;
        var dmg = b2.blight; // permanent: buildings stay scarred once residents are infected
        if (dmg === 3 && !st.lowFx && Math.random() < dt * 0.35) this.part(d.x + (Math.random() - 0.5) * 20, d.y - this.bHeight(cb2) * 0.8, { z: 0, vx: 4, vy: -2, vz: 12, g: -6, max: 3, kind: 'smoke', color: 'rgba(70,70,70,0.5)', size: 4 });
        // One sprite per building per frame (a day/night cross-fade doubled the cost).
        var bsk = this.bShake[d.o], jx = (bsk !== undefined && this.time - bsk < 0.35 && !st.reducedMotion) ? Math.sin(this.time * 70) * 1.3 : 0;
        this.blit(ctx, this.buildingSprite(cb2, nightOn, dmg), d.x + jx, d.y);
        if (cb2.landmark === 'lighthouse' && night > 0.3 && !st.lowFx) this.drawBeam(ctx, d.x, d.y - this.bHeight(cb2) - 5, night);
      } else if (d.k === 1) {
        var ts = this.treeSprite(d.o.kind, d.o.v, nightOn), sc = d.o.s;
        this.blit(ctx, ts, d.x, d.y, sc);
      } else if (d.k === 2) {
        this.drawTower(ctx, d.o, 1, false);
      } else if (d.k === 3) {
        this.drawAgent(ctx, d.o, d.x, d.y, walkFrame, nightOn, ui);
      } else {
        var cs = this.carSprite(d.o.color, d.o.axis, nightOn);
        this.blit(ctx, cs, d.x, d.y);
        if (nightOn && !st.lowFx) { ctx.fillStyle = 'rgba(255,236,170,0.18)'; ellipse(ctx, d.x + (d.o.axis === 0 ? d.o.dir * 12 : -d.o.dir * 12), d.y + d.o.dir * 6, 9, 4); ctx.fill(); }
      }
    }

    ctx.imageSmoothingEnabled = true;
    // placement ghost on top
    if (ui && ui.placeType && ui.hover) {
      var gtw = { type: ui.placeType, x: ui.hover.x + 0.5, y: ui.hover.y + 0.5, level: 1, id: 0, angle: 0.8, st: D.TOWERS[ui.placeType], hp: 1, patients: [] };
      this.drawTower(ctx, gtw, 1, true);
    }

    // tracers / darts
    for (i = 0; i < this.tracers.length; i++) {
      var tc = this.tracers[i]; if (!tc.on) continue;
      var fr = tc.life / tc.max;
      if (tc.kind === 'dart') {
        var px2 = tc.ax + (tc.bx - tc.ax) * fr, py2 = tc.ay + (tc.by - tc.ay) * fr - Math.sin(fr * Math.PI) * tc.arc;
        ctx.fillStyle = tc.color; ctx.beginPath(); ctx.arc(px2, py2, tc.w, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(px2 - 0.8, py2 - 0.8, tc.w * 0.4, 0, 7); ctx.fill();
      } else {
        var f0 = Math.max(0, fr - 0.6), f1 = Math.min(1, fr + 0.4);
        var x0 = tc.ax + (tc.bx - tc.ax) * f0, y0 = tc.ay + (tc.by - tc.ay) * f0 - Math.sin(f0 * Math.PI) * tc.arc;
        var x1 = tc.ax + (tc.bx - tc.ax) * f1, y1 = tc.ay + (tc.by - tc.ay) * f1 - Math.sin(f1 * Math.PI) * tc.arc;
        ctx.strokeStyle = tc.color; ctx.lineWidth = tc.w; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
    // particles
    for (i = 0; i < this.parts.length; i++) {
      var p = this.parts[i]; if (!p.on) continue;
      var fa = 1 - p.life / p.max;
      ctx.globalAlpha = Math.min(1, fa * 1.5);
      ctx.fillStyle = p.color;
      var py3 = p.y - p.z;
      if (p.kind === 'smoke') { ellipse(ctx, p.x, py3, p.size * (1 + (1 - fa) * 1.5), p.size * (0.8 + (1 - fa))); ctx.fill(); }
      else if (p.kind === 'plus') { var ss2 = p.size; ctx.fillRect(p.x - ss2, py3 - ss2 * 0.3, ss2 * 2, ss2 * 0.6); ctx.fillRect(p.x - ss2 * 0.3, py3 - ss2, ss2 * 0.6, ss2 * 2); }
      else if (p.kind === 'star') { this.star(ctx, p.x, py3, p.size); ctx.fill(); }
      else if (p.kind === 'spark') { ctx.beginPath(); ctx.arc(p.x, py3, p.size * fa, 0, 7); ctx.fill(); }
      else if (p.kind === 'confetti') { ctx.save(); ctx.translate(p.x, py3); ctx.rotate(p.rot); ctx.fillRect(-p.size, -p.size * 0.4, p.size * 2, p.size * 0.8); ctx.restore(); }
      else ctx.fillRect(p.x - p.size / 2, py3 - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // badges over buildings
    this.drawBadges(ctx, ui);
    this.drawHallLabel(ctx);

    // floating texts (constant screen size)
    var fs = Math.max(11, 12) / z;
    for (i = 0; i < this.texts.length; i++) {
      var tx = this.texts[i]; if (!tx.on) continue;
      var fa2 = 1 - tx.life / tx.max;
      ctx.globalAlpha = Math.min(1, fa2 * 2);
      ctx.font = ((tx.big ? fs * 1.35 : fs * 1.2)).toFixed(1) + "px Bangers, Impact, system-ui, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3 / z; ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.strokeText(tx.s, tx.x, tx.y);
      ctx.fillStyle = tx.color; ctx.fillText(tx.s, tx.x, tx.y);
    }
    ctx.globalAlpha = 1;

    // ---- screen-space effects ----
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (night > 0.05 && !st.lowFx) {
      var vg = ctx.createRadialGradient(this.vw / 2, this.vh / 2, Math.min(this.vw, this.vh) * 0.35, this.vw / 2, this.vh / 2, Math.max(this.vw, this.vh) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,20,0)'); vg.addColorStop(1, 'rgba(0,0,20,' + (night * 0.45).toFixed(3) + ')');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, this.vw, this.vh);
    }
    this.drawWeather(ctx, dt * simSpeed);
  };

  R.drawWater = function (ctx) {
    var city = this.game.city, W = this.W, t = this.time, v = this.view;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var i = 0; i < city.tiles.length; i++) {
      if (city.tiles[i] !== T.WATER) continue;
      var x = i % W, y = (i / W) | 0, p = iso(x + 0.5, y + 0.5);
      if (p.x < v.x0 || p.x > v.x1 || p.y < v.y0 || p.y > v.y1) continue;
      var ph = Math.sin(t * 1.5 + x * 0.9 + y * 0.6);
      var o = iso(x + 0.3 + ph * 0.1, y + 0.3 + 0.4 * ((t * 0.2 + x * 0.13) % 1));
      ctx.moveTo(o.x - 4, o.y); ctx.lineTo(o.x + 4, o.y - 2);
    }
    ctx.stroke();
  };

  R.drawBeam = function (ctx, x, y, night) {
    var a = this.time * 0.9;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    var len = 260, sp = 0.13, ex = Math.cos(a), ey = Math.sin(a) * 0.5;
    var g = ctx.createLinearGradient(x, y, x + ex * len, y + ey * len);
    g.addColorStop(0, 'rgba(255,240,180,' + (0.35 * night).toFixed(3) + ')'); g.addColorStop(1, 'rgba(255,240,180,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a - sp) * len, y + Math.sin(a - sp) * len * 0.5);
    ctx.lineTo(x + Math.cos(a + sp) * len, y + Math.sin(a + sp) * len * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  };

  R.drawAgent = function (ctx, a, x, y, wf, night, ui) {
    var g = this.game, spr, frame = (wf + a.id) & 1;
    var sdx = a.dirx - a.diry, face = sdx < 0 ? -1 : 1;
    if (a.kind === 0 || (a.type === 'carrier' && !a.revealed)) {
      var stk = this.struck[a.id], hitNow = stk !== undefined && this.time - stk < 0.6;
      var flee = a.kind === 0 && (a.flee > 0 || hitNow) ? 1 : 0;
      var greenish = a.kind === 1; // carriers: a subtle tell for sharp-eyed players
      spr = this.personSprite(a.id % 8, frame, flee, face, night, greenish);
      var bob = frame ? -0.6 : 0, as = this.agentScale;
      if (hitNow) { var jit = Math.sin(this.time * 50) * 1.2; x += jit; ctx.strokeStyle = 'rgba(176,124,224,' + (1 - (this.time - stk) / 0.6).toFixed(2) + ')'; ctx.lineWidth = 2; ellipse(ctx, x, y, 7 * as, 3.5 * as); ctx.stroke(); }
      this.blit(ctx, spr, x, y + bob, as);
      if (a.kind === 0 && a.known && a.st === 1) this.marker(ctx, x, y - 22 * as, 'exposed', as);
    } else {
      var sway = Math.sin(this.time * 3 + a.id) * 0.6, zs = this.agentScale, zf = frame;
      var lg = this.lunge[a.id];
      if (lg && this.time - lg.t < 0.4) {
        // lunge at the victim
        var lf = Math.sin(Math.PI * (this.time - lg.t) / 0.4), vp = iso(lg.x, lg.y), ldx = vp.x - x, ldy = vp.y - y, ll = Math.hypot(ldx, ldy) || 1;
        x += ldx / ll * lf * 7 * zs; y += ldy / ll * lf * 4 * zs; zf = 2; face = ldx < 0 ? -1 : 1;
      } else if (a.breach > 0 && this.bang[a.id] !== undefined && this.time - this.bang[a.id] < 1.2) {
        zf = Math.floor(this.time * 8) % 2 ? 2 : 0; sway = Math.sin(this.time * 25) * 1.6; // pounding on the door
      }
      var boss = a.zdef && a.zdef.boss;
      if (boss) {
        // toxic aura showing how far its bite reaches, and a ground-shaking walk
        var pa = 0.5 + 0.5 * Math.sin(this.time * 4 + a.id), er = ISO.ellipse(1.15 + pa * 0.15);
        ctx.fillStyle = 'rgba(139,195,74,' + (0.12 + pa * 0.1).toFixed(2) + ')'; ellipse(ctx, x, y, er.rx, er.ry); ctx.fill();
        ctx.strokeStyle = 'rgba(183,227,74,0.7)'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]); ellipse(ctx, x, y, er.rx, er.ry); ctx.stroke(); ctx.setLineDash([]);
        var step = Math.floor(this.time * 2.2 + a.id);
        if (a.breach <= 0 && step !== a._step) {
          a._step = step;
          if (!this.settings.reducedMotion) this.shake = Math.max(this.shake, 1.6);
          var wp = ISO.toWorld(x, y); this.burst(wp.x, wp.y, 4, { colors: ['#9A8A6A', '#C9B48A'], speed: 20, up: 15, max: 0.5, kind: 'smoke', size: 3 });
        }
        sway *= 2;
      }
      var emerging = a.emerge > 0;
      if (emerging) {
        var ef = 1 - a.emerge / D.CONFIG.emergeTime; ef = 1 - (1 - ef) * (1 - ef);
        zf = 2; sway = Math.sin(this.time * 18 + a.id) * 1.2;
      }
      spr = this.zombieSprite(a.type === 'carrier' ? 'basic' : a.type, zf, face, night);
      if (emerging) {
        ctx.save(); ctx.beginPath(); ctx.rect(x - 80, y - 260, 160, 260 + 2 * zs); ctx.clip();
        this.blit(ctx, spr, x + sway, y + (1 - ef) * spr.ay * zs, zs);
        ctx.restore();
      } else this.blit(ctx, spr, x + sway, y, zs);
      if (g.t - a.hitT < 0.12) { ctx.fillStyle = 'rgba(255,255,255,0.65)'; ellipse(ctx, x + sway, y - 10 * zs, 5 * zs, 8 * zs); ctx.fill(); }
      if (a.type === 'carrier') {
        ctx.strokeStyle = '#CC79A7'; ctx.lineWidth = 1.5 * zs; ctx.setLineDash([3, 2]);
        ellipse(ctx, x, y, 8 * zs, 4 * zs); ctx.stroke(); ctx.setLineDash([]);
        this.marker(ctx, x, y - 26 * zs, 'carrier', zs);
      }
      if (boss) {
        var bw = 24 * zs, bt = y - 82 * zs;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x - bw - 1, bt - 1, bw * 2 + 2, 6);
        ctx.fillStyle = '#B7E34A'; ctx.fillRect(x - bw, bt, bw * 2 * Math.max(0, a.hp / a.maxhp), 4);
        ctx.font = '700 ' + (8.5 * zs).toFixed(1) + 'px Oswald, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText('SUPER-SPREADER', x, bt - 2); ctx.fillStyle = '#D9F27A'; ctx.fillText('SUPER-SPREADER', x, bt - 2);
      } else if (g.t - a.hitT < 1.5 || a.type === 'brute') {
        var hw = (a.type === 'brute' ? 12 : 8) * zs, top = y - (a.type === 'brute' ? 36 : 26) * zs;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - hw, top, hw * 2, 2.5);
        ctx.fillStyle = '#E8E8E8'; ctx.fillRect(x - hw, top, hw * 2 * Math.max(0, a.hp / a.maxhp), 2.5);
      }
    }
  };

  // Map markers: shape-coded so they never rely on color alone
  R.marker = function (ctx, x, y, kind, sc) {
    var pulse = (sc || 1) * (1 + Math.sin(this.time * 6) * (this.settings.reducedMotion ? 0 : 0.12));
    ctx.save(); ctx.translate(x, y); ctx.scale(pulse, pulse);
    if (kind === 'exposed') {
      ctx.fillStyle = '#E69F00'; ctx.strokeStyle = '#3A2A00'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(4.5, 0); ctx.lineTo(0, 5); ctx.lineTo(-4.5, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1A1A1A'; ctx.fillRect(-0.6, -2.8, 1.2, 3.4); ctx.fillRect(-0.6, 1.4, 1.2, 1.2);
    } else if (kind === 'carrier') {
      ctx.fillStyle = '#CC79A7'; ctx.beginPath(); ctx.arc(0, 0, 4.8, 0, 7); ctx.fill();
      ctx.fillStyle = '#FFF'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 0.4);
    }
    ctx.restore();
  };

  R.drawGroundOverlays = function (ctx, ui) {
    var g = this.game, self = this;
    if (!ui) return;
    // data lens: district tint + tower coverage
    if (ui.lens) {
      var city = g.city, W = this.W, cols = ['#E69F00', '#56B4E9', '#CC79A7', '#009E73', '#F0E442'];
      ctx.globalAlpha = 0.16;
      for (var i = 0; i < city.tiles.length; i++) {
        var t = city.tiles[i]; if (t === T.WATER) continue;
        ctx.fillStyle = cols[city.district[i]]; diamond(ctx, i % W, (i / W) | 0, 0.5); ctx.fill();
      }
      ctx.globalAlpha = 1;
      g.towers.forEach(function (tw) {
        if (tw.type === 'barricade') return;
        var e = ISO.ellipse(tw.st.range), p = iso(tw.x, tw.y);
        ctx.fillStyle = D.TOWERS[tw.type].color; ctx.globalAlpha = 0.07; ellipse(ctx, p.x, p.y, e.rx, e.ry); ctx.fill(); ctx.globalAlpha = 1;
      });
    }
    // upcoming entrances (build phase) and active entrances (wave)
    if ((g.phase === 'build' || (g.phase === 'wave' && g.waveTime < g.waveDuration * 0.5)) && g.plans[g.phase === 'build' ? g.wave : g.wave - 1]) {
      var plan = g.plans[g.phase === 'build' ? g.wave : g.wave - 1];
      plan.entries.forEach(function (e) {
        var ex = e % self.W, ey = (e / self.W) | 0, p = iso(ex + 0.5, ey + 0.5);
        var pul = 0.5 + 0.5 * Math.sin(self.time * 5);
        ctx.fillStyle = 'rgba(213,94,0,' + (0.25 + pul * 0.35).toFixed(2) + ')'; diamond(ctx, ex, ey, 1); ctx.fill();
        ctx.strokeStyle = '#FFB27A'; ctx.lineWidth = 2; diamond(ctx, ex, ey, 1); ctx.stroke();
        if (g.phase === 'build') {
          ctx.font = '700 ' + (12 / self.cam.zoom).toFixed(1) + 'px Oswald, system-ui, sans-serif'; ctx.textAlign = 'center';
          ctx.lineWidth = 3 / self.cam.zoom; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText('▼ INCOMING', p.x, p.y - 20 - pul * 4);
          ctx.fillStyle = '#FFB27A'; ctx.fillText('▼ INCOMING', p.x, p.y - 20 - pul * 4);
        }
      });
    }
    // tutorial highlight
    if (ui.highlightBld !== undefined && ui.highlightBld !== null) {
      var hb = g.blds[ui.highlightBld], hp = iso(hb.cx, hb.cy), pl = 0.5 + 0.5 * Math.sin(this.time * 4);
      ctx.strokeStyle = 'rgba(240,228,66,' + (0.5 + pl * 0.5).toFixed(2) + ')'; ctx.lineWidth = 3;
      var he = ISO.ellipse(0.9 + pl * 0.3); ellipse(ctx, hp.x, hp.y, he.rx, he.ry); ctx.stroke();
    }
    // selected tower range + placement preview
    var showRange = function (tw, color, rng) {
      var e = ISO.ellipse(rng), p = iso(tw.x, tw.y);
      ctx.fillStyle = color; ctx.globalAlpha = 0.12; ellipse(ctx, p.x, p.y, e.rx, e.ry); ctx.fill();
      ctx.globalAlpha = 0.9; ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
      ellipse(ctx, p.x, p.y, e.rx, e.ry); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    };
    if (ui.selected) {
      var stw = ui.selected;
      showRange(stw, D.TOWERS[stw.type].color, stw.type === 'militia' ? stw.st.range * g.weatherDef().militiaRange : stw.st.range);
      var sp = iso(stw.tx + 0.5, stw.ty + 0.5);
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2; diamond(ctx, stw.type === 'chw' ? Math.floor(stw.x) : stw.tx, stw.type === 'chw' ? Math.floor(stw.y) : stw.ty, 1); ctx.stroke();
      if (stw.type === 'chw' && stw.path && stw.pi < stw.path.length) {
        ctx.strokeStyle = 'rgba(230,159,0,0.8)'; ctx.lineWidth = 2; ctx.setLineDash([4, 4]); ctx.beginPath();
        var cp = iso(stw.x, stw.y); ctx.moveTo(cp.x, cp.y);
        for (var k = stw.pi; k < stw.path.length; k++) { var pt = iso(stw.path[k] % this.W + 0.5, ((stw.path[k] / this.W) | 0) + 0.5); ctx.lineTo(pt.x, pt.y); }
        ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (ui.hover && (ui.placeType || ui.moveTeam)) {
      var hx = ui.hover.x, hy = ui.hover.y, ok = ui.canPlace;
      ctx.fillStyle = ok ? 'rgba(0,158,115,0.45)' : 'rgba(213,94,0,0.45)'; diamond(ctx, hx, hy, 0.5); ctx.fill();
      ctx.strokeStyle = ok ? '#7CF0C8' : '#FFB27A'; ctx.lineWidth = 2; diamond(ctx, hx, hy, 0.5); ctx.stroke();
      if (ui.placeType && D.TOWERS[ui.placeType].range > 1) showRange({ x: hx + 0.5, y: hy + 0.5 }, D.TOWERS[ui.placeType].color, D.TOWERS[ui.placeType].range);
    } else if (ui.hover && ui.hoverBld !== null && ui.hoverBld !== undefined) {
      var hb2 = g.city.buildings[ui.hoverBld];
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; diamond(ctx, hb2.x, hb2.y, 0.5); ctx.stroke();
    }
  };

  R.drawBadges = function (ctx, ui) {
    var g = this.game, z = this.cam.zoom, v = this.view, cbs = g.city.buildings;
    var showPop = this.settings.badges && z >= 1.25;
    var lens = ui && ui.lens;
    var fs = 10 / Math.max(0.6, z);
    ctx.font = '700 ' + fs.toFixed(1) + 'px Oswald, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    var ww = !!g.flags.wastewater;
    for (var i = 0; i < cbs.length; i++) {
      var cb = cbs[i], b = g.blds[i];
      var seen = ww || g.t - b.seenT < 12;
      var pressure = b.E + b.Ek + b.Z;
      var alive = b.S + b.E + b.Ek + b.V + b.R;
      var showP = seen && pressure > 0;
      if (!showPop && !showP && !lens) continue;
      var p = iso(cb.x + 0.5, cb.y + 0.5);
      var top = p.y - this.bHeight(cb) - 22;
      if (p.x < v.x0 || p.x > v.x1 || top < v.y0 - 20 || top > v.y1) continue;
      if (lens && alive > 0) {
        // immunity bar: share of residents vaccinated or recovered
        var imm = (b.V + b.R) / alive;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(p.x - 10 / z, top + 13 / z, 20 / z, 3.5 / z);
        ctx.fillStyle = '#36D19A'; ctx.fillRect(p.x - 10 / z, top + 13 / z, 20 / z * imm, 3.5 / z);
      }
      if (showP) {
        var label = '◆ ' + pressure;
        var w = ctx.measureText(label).width + 8 / z;
        ctx.fillStyle = b.Z > 0 ? '#D55E00' : '#E69F00';
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x - w / 2, top - 7 / z, w, 14 / z, 7 / z) : ctx.rect(p.x - w / 2, top - 7 / z, w, 14 / z); ctx.fill();
        ctx.fillStyle = '#1A1206'; ctx.fillText(label, p.x, top + 0.5 / z);
      } else if (showPop && alive > 0) {
        var lb = '' + alive, w2 = ctx.measureText(lb).width + 8 / z;
        ctx.fillStyle = 'rgba(20,28,40,0.72)';
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(p.x - w2 / 2, top - 6 / z, w2, 12 / z, 6 / z) : ctx.rect(p.x - w2 / 2, top - 6 / z, w2, 12 / z); ctx.fill();
        ctx.fillStyle = '#F2F2F2'; ctx.fillText(lb, p.x, top + 0.5 / z);
      }
    }
  };

  R.drawWeather = function (ctx, dt) {
    var g = this.game, w = g.weather, st = this.settings;
    if (g.phase !== 'wave' && g.phase !== 'briefing' && g.phase !== 'build') return;
    if (w === 'fog') {
      var fg = ctx.createLinearGradient(0, 0, 0, this.vh);
      fg.addColorStop(0, 'rgba(210,220,228,0.42)'); fg.addColorStop(1, 'rgba(210,220,228,0.18)');
      ctx.fillStyle = fg; ctx.fillRect(0, 0, this.vw, this.vh);
      if (!st.lowFx) {
        for (var i = 0; i < 5; i++) {
          var fx = ((this.time * 12 + i * 260) % (this.vw + 400)) - 200, fy = (i * 137) % this.vh;
          var rg = ctx.createRadialGradient(fx, fy, 10, fx, fy, 220);
          rg.addColorStop(0, 'rgba(230,236,240,0.25)'); rg.addColorStop(1, 'rgba(230,236,240,0)');
          ctx.fillStyle = rg; ctx.fillRect(fx - 220, fy - 220, 440, 440);
        }
      }
    } else if (w === 'rain') {
      ctx.fillStyle = 'rgba(40,60,90,0.16)'; ctx.fillRect(0, 0, this.vw, this.vh);
      if (!st.lowFx) {
        ctx.strokeStyle = 'rgba(200,220,255,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
        var n = st.reducedMotion ? 50 : this.rain.length;
        for (var r = 0; r < n; r++) {
          var d = this.rain[r];
          d.y += dt * 1.6 * d.s; d.x += dt * 0.25 * d.s;
          if (d.y > 1) { d.y -= 1; d.x = Math.random(); }
          if (d.x > 1) d.x -= 1;
          var x = d.x * this.vw, y = d.y * this.vh;
          ctx.moveTo(x, y); ctx.lineTo(x - 3, y - 12 * d.s);
        }
        ctx.stroke();
      }
    }
  };

  /* ---------------- ending illustrations (drawn procedurally) ---------------- */
  R.drawEndingArt = function (canvas, art, t) {
    var ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var sky = {
      eradication: ['#FFD58A', '#8FD3F4'], endemic: ['#F4C28A', '#9BB8D9'], hollow: ['#5A5F6E', '#2A2E38'], twoTier: ['#E8C07A', '#4A4E6A'],
      collapse: ['#6E3B2E', '#1E1A1F'], zombieMayor: ['#7A9A6A', '#2E3A2A'], modelCity: ['#FFE6A0', '#7FD6C2']
    }[art] || ['#CCC', '#888'];
    var g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, sky[1]); g.addColorStop(1, sky[0]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    var ground = h * 0.78;
    // sun / moon
    if (art === 'eradication' || art === 'modelCity' || art === 'endemic') { ctx.fillStyle = 'rgba(255,240,180,0.9)'; ctx.beginPath(); ctx.arc(w * 0.78, h * 0.28, h * 0.11, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = 'rgba(230,230,240,0.6)'; ctx.beginPath(); ctx.arc(w * 0.8, h * 0.22, h * 0.07, 0, 7); ctx.fill(); }
    // skyline
    var rnd = 7, bx = 0;
    var next = function () { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
    while (bx < w) {
      var bw = w * (0.05 + next() * 0.07), bh = h * (0.18 + next() * 0.38);
      var right = bx > w * 0.5;
      var col = art === 'collapse' ? '#2A2226' : art === 'hollow' ? '#3A3E48' : art === 'twoTier' ? (right ? '#3A3550' : '#F0E3C0') : art === 'zombieMayor' ? '#3E4A38' : '#5D7A9A';
      ctx.fillStyle = col; ctx.fillRect(bx, ground - bh, bw - 3, bh);
      // windows
      for (var wy = ground - bh + 8; wy < ground - 8; wy += 12) for (var wx = bx + 5; wx < bx + bw - 8; wx += 9) {
        var on = next() > (art === 'collapse' ? 0.93 : art === 'twoTier' && right ? 0.85 : 0.45);
        ctx.fillStyle = on ? (art === 'zombieMayor' ? '#B8E08A' : '#FFE29A') : 'rgba(0,0,0,0.25)';
        ctx.fillRect(wx, wy, 4, 6);
      }
      if (art === 'collapse' && next() > 0.6) { ctx.fillStyle = '#1E1A1F'; ctx.beginPath(); ctx.moveTo(bx, ground - bh); ctx.lineTo(bx + bw * 0.5, ground - bh + 20); ctx.lineTo(bx + bw, ground - bh); ctx.fill(); }
      bx += bw;
    }
    ctx.fillStyle = art === 'collapse' ? '#2E2420' : art === 'modelCity' ? '#5FBF7A' : '#4F8A55'; ctx.fillRect(0, ground, w, h - ground);
    // scene props
    var person = function (x, y, s, shirt, zombie) {
      ctx.fillStyle = zombie ? '#9EC28A' : '#E8C29A'; ctx.beginPath(); ctx.arc(x, y - 22 * s, 6 * s, 0, 7); ctx.fill();
      ctx.fillStyle = shirt; ctx.fillRect(x - 6 * s, y - 16 * s, 12 * s, 13 * s);
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(x - 3 * s, y - 3 * s); ctx.lineTo(x - 4 * s, y + 6 * s); ctx.moveTo(x + 3 * s, y - 3 * s); ctx.lineTo(x + 4 * s, y + 6 * s); ctx.stroke();
      if (zombie) { ctx.strokeStyle = '#9EC28A'; ctx.beginPath(); ctx.moveTo(x + 4 * s, y - 13 * s); ctx.lineTo(x + 16 * s, y - 13 * s); ctx.moveTo(x + 4 * s, y - 9 * s); ctx.lineTo(x + 15 * s, y - 8 * s); ctx.stroke(); }
    };
    if (art === 'eradication' || art === 'modelCity') {
      for (var i = 0; i < 9; i++) person(w * (0.1 + i * 0.1), ground + 30 + (i % 2) * 10, 1.4, SHIRT[i % SHIRT.length], false);
      for (i = 0; i < 70; i++) { ctx.fillStyle = SHIRT[i % SHIRT.length]; var cx = (i * 97 + t * 40) % w, cy = (i * 53 + t * 70) % (h * 0.7); ctx.save(); ctx.translate(cx, cy); ctx.rotate(i + t * 3); ctx.fillRect(-4, -2, 8, 4); ctx.restore(); }
      if (art === 'modelCity') { ctx.fillStyle = '#F0E442'; ctx.beginPath(); ctx.moveTo(w * 0.5 - 30, h * 0.2); ctx.lineTo(w * 0.5 + 30, h * 0.2); ctx.lineTo(w * 0.5 + 18, h * 0.36); ctx.lineTo(w * 0.5 - 18, h * 0.36); ctx.fill(); ctx.fillRect(w * 0.5 - 6, h * 0.36, 12, 24); ctx.fillRect(w * 0.5 - 20, h * 0.36 + 24, 40, 8); }
    } else if (art === 'endemic') {
      person(w * 0.35, ground + 40, 1.6, '#0072B2', false);
      person(w * 0.55, ground + 40, 1.6, '#6E5C7B', true);
      ctx.fillStyle = '#D55E00'; ctx.fillRect(w * 0.55 - 10, ground + 40 - 33 * 1.6, 20, 6); // a seasonal scarf
      ctx.fillStyle = '#FFF'; ctx.font = Math.round(h * 0.07) + 'px Bangers, Impact, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('ZOMBIE SEASON: GET YOUR BOOSTER', w * 0.5, h * 0.16);
    } else if (art === 'hollow') {
      for (i = 0; i < 4; i++) {
        var lx = w * (0.15 + i * 0.25);
        ctx.fillStyle = '#22252C'; ctx.fillRect(lx - 6, ground - h * 0.3, 12, h * 0.3);
        ctx.save(); ctx.globalAlpha = 0.25; ctx.fillStyle = '#FFF8D0'; ctx.beginPath(); ctx.moveTo(lx, ground - h * 0.3);
        var a = Math.sin(t * 0.8 + i) * 0.6 - Math.PI / 2; ctx.lineTo(lx + Math.cos(a - 0.15) * h, ground - h * 0.3 + Math.sin(a - 0.15) * h); ctx.lineTo(lx + Math.cos(a + 0.15) * h, ground - h * 0.3 + Math.sin(a + 0.15) * h); ctx.fill(); ctx.restore();
      }
      ctx.strokeStyle = '#888'; ctx.lineWidth = 2; for (var fx2 = 0; fx2 < w; fx2 += 14) { ctx.beginPath(); ctx.moveTo(fx2, ground + 10); ctx.lineTo(fx2, ground - 18); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, ground - 14); ctx.lineTo(w, ground - 14); ctx.moveTo(0, ground - 4); ctx.lineTo(w, ground - 4); ctx.stroke();
    } else if (art === 'twoTier') {
      ctx.fillStyle = '#777'; ctx.fillRect(w * 0.49, ground - h * 0.45, w * 0.02, h * 0.6);
      for (i = 0; i < 4; i++) person(w * (0.1 + i * 0.09), ground + 35, 1.3, '#CC79A7', false);
      ctx.fillStyle = '#FFF'; ctx.font = Math.round(h * 0.065) + 'px Bangers, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('GALA ✨', w * 0.25, h * 0.18); ctx.fillText('CLINIC: CLOSED', w * 0.75, h * 0.18);
    } else if (art === 'collapse') {
      for (i = 0; i < 10; i++) person(w * (0.05 + i * 0.1), ground + 32 + (i % 3) * 8, 1.3, '#4A3F55', true);
      ctx.fillStyle = 'rgba(255,120,60,0.25)'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#AAA'; ctx.fillRect(w * 0.7, h * 0.12, 50, 10); ctx.fillRect(w * 0.7 + 20, h * 0.1, 10, 4); // helicopter
      ctx.strokeStyle = '#AAA'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(w * 0.7 - 10 + Math.sin(t * 20) * 8, h * 0.09); ctx.lineTo(w * 0.7 + 60 - Math.sin(t * 20) * 8, h * 0.09); ctx.stroke();
    } else if (art === 'hallFallen') {
      // City Hall with zombies on the steps and a sock for a flag
      var hx = w * 0.5, hb = ground;
      ctx.fillStyle = '#E8E4DA'; ctx.fillRect(hx - 130, hb - 120, 260, 120);
      ctx.fillStyle = '#CFC9BC'; for (i = 0; i < 6; i++) ctx.fillRect(hx - 115 + i * 45, hb - 110, 14, 110);
      ctx.fillStyle = '#5FA8A0'; ctx.beginPath(); ctx.arc(hx, hb - 120, 60, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(hx, hb - 180); ctx.lineTo(hx, hb - 230); ctx.stroke();
      ctx.fillStyle = '#9EC28A'; ctx.beginPath(); ctx.moveTo(hx, hb - 230); ctx.lineTo(hx + 26, hb - 226); ctx.lineTo(hx + 30, hb - 214); ctx.lineTo(hx + 20, hb - 212); ctx.lineTo(hx + 18, hb - 220); ctx.lineTo(hx, hb - 218); ctx.fill();
      ctx.fillStyle = '#2A2320'; ctx.fillRect(hx - 22, hb - 60, 44, 60);
      for (i = 0; i < 7; i++) person(w * (0.18 + i * 0.11), ground + 30 + (i % 2) * 10, 1.5, '#4A3F55', true);
      ctx.fillStyle = 'rgba(255,90,31,0.18)'; ctx.fillRect(0, 0, w, h);
    } else if (art === 'zombieMayor') {
      ctx.fillStyle = '#6B4A33'; ctx.fillRect(w * 0.42, ground - 10, w * 0.16, 70);
      ctx.fillStyle = '#F0E442'; ctx.beginPath(); ctx.arc(w * 0.5, ground + 20, 12, 0, 7); ctx.fill();
      person(w * 0.5, ground - 10, 2.2, '#2E3440', true);
      ctx.fillStyle = '#D55E00'; ctx.beginPath(); ctx.moveTo(w * 0.5, ground - 10 - 30); ctx.lineTo(w * 0.5 - 4, ground - 10 - 12); ctx.lineTo(w * 0.5 + 4, ground - 10 - 12); ctx.fill(); // tie
      for (i = 0; i < 6; i++) { ctx.fillStyle = '#FFF'; ctx.fillRect(w * (0.1 + i * 0.15) - 8, ground + 60, 16, 12); }
    }
  };

  NS.Renderer = Renderer;
  NS.renderUtil = { iso: iso, shade: shade, SHIRT: SHIRT };
})(typeof window !== 'undefined' ? window : globalThis);
