/* OUTBREAK CITY: procedural city generation (deterministic from seed) */
(function (root) {
  'use strict';
  var NS = root.OutbreakCity = root.OutbreakCity || {};
  var C = NS.core, D = NS.data;

  var T = { GRASS: 0, ROAD: 1, WATER: 2, BRIDGE: 3, BUILDING: 4, PARK: 5, LOT: 6, PLAZA: 7 };
  var LANDMARKS = {
    hill: { id: 'club', name: 'Heights Country Club' },
    down: { id: 'hall', name: 'City Hall' },
    east: { id: 'center', name: 'Eastside Community Center' },
    port: { id: 'lighthouse', name: 'Rustwater Lighthouse' },
    sub: { id: 'mall', name: 'Maple Mega Mall' }
  };
  var STYLE = {
    mansion:   { floors: [1, 2], perFloor: 2.2, inset: 0.84, roof: 1 },
    tower:     { floors: [3, 7], perFloor: 2.6, inset: 0.74, roof: 0 },
    brick:     { floors: [2, 4], perFloor: 3.3, inset: 0.8, roof: 0 },
    warehouse: { floors: [1, 1], perFloor: 1.5, inset: 0.9, roof: 0 },
    house:     { floors: [1, 2], perFloor: 2.4, inset: 0.68, roof: 1 }
  };

  function generate(seed, opts) {
    opts = opts || {};
    var cfg = D.CONFIG, rng = new C.RNG(C.hashStr(seed + '|city'));
    var W = cfg.mapSize, H = W, N = W * H;
    var tiles = new Uint8Array(N), dist = new Uint8Array(N);
    var idx = function (x, y) { return y * W + x; };
    var isRoadLine = function (c) { return c >= 1 && c <= W - 2 && (c - 1) % 5 === 0; };

    // --- Districts: jittered Voronoi ---
    var centers = D.DISTRICTS.map(function (d) {
      return [(d.center[0] + rng.range(-0.04, 0.04)) * W, (d.center[1] + rng.range(-0.04, 0.04)) * H];
    });
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var best = 0, bd = 1e9;
      for (var k = 0; k < centers.length; k++) {
        var dx = x + 0.5 - centers[k][0], dy = y + 0.5 - centers[k][1];
        var dd = dx * dx + dy * dy * 1.1;
        if (dd < bd) { bd = dd; best = k; }
      }
      dist[idx(x, y)] = best;
    }

    // --- Roads: grid every 5 tiles plus highway stubs to the map edge ---
    for (y = 1; y < H - 1; y++) for (x = 1; x < W - 1; x++) {
      if ((isRoadLine(x) && y >= 1 && y <= H - 2) || (isRoadLine(y) && x >= 1 && x <= W - 2)) tiles[idx(x, y)] = T.ROAD;
    }
    var entries = [];
    [11, 31].forEach(function (p) {
      tiles[idx(p, 0)] = T.ROAD; entries.push(idx(p, 0));
      tiles[idx(p, H - 1)] = T.ROAD; entries.push(idx(p, H - 1));
      tiles[idx(0, p)] = T.ROAD; entries.push(idx(0, p));
      tiles[idx(W - 1, p)] = T.ROAD; entries.push(idx(W - 1, p));
    });

    // --- River: meanders north to south between Downtown and Eastside ---
    var ph = rng.range(0, 6.28), ph2 = rng.range(0, 6.28), base = W * rng.range(0.6, 0.64);
    var bridgeRows = {}; bridgeRows[1] = true; bridgeRows[W - 2] = true;
    var rows = [6, 11, 16, 21, 26, 31, 36];
    rng.shuffle(rows);
    bridgeRows[rows[0]] = true; bridgeRows[rows[1]] = true; bridgeRows[rows[2]] = true;
    var water = new Uint8Array(N);
    for (y = 0; y < H; y++) {
      var cx = base + 2.8 * Math.sin(y * 0.16 + ph) + 1.1 * Math.sin(y * 0.41 + ph2);
      var w = y > H - 8 ? 3.2 : 2.1;
      for (x = 0; x < W; x++) {
        if (Math.abs(x + 0.5 - cx) < w / 2) water[idx(x, y)] = 1;
      }
    }
    for (var i = 0; i < N; i++) {
      if (!water[i]) continue;
      y = (i / W) | 0;
      if (tiles[i] === T.ROAD && isRoadLine(y) && bridgeRows[y]) tiles[i] = T.BRIDGE;
      else tiles[i] = T.WATER;
    }
    // Bridges must span the whole crossing on a bridge row
    for (y = 0; y < H; y++) {
      if (!bridgeRows[y] || !isRoadLine(y)) continue;
      for (x = 1; x < W - 1; x++) if (water[idx(x, y)]) tiles[idx(x, y)] = T.BRIDGE;
    }

    // --- Keep only the connected road network ---
    var isRoad = function (t) { return t === T.ROAD || t === T.BRIDGE; };
    var seen = new Uint8Array(N), q = [entries[0]]; seen[entries[0]] = 1;
    while (q.length) {
      var c = q.pop(), cx2 = c % W, cy2 = (c / W) | 0;
      var nb = [cx2 > 0 ? c - 1 : -1, cx2 < W - 1 ? c + 1 : -1, cy2 > 0 ? c - W : -1, cy2 < H - 1 ? c + W : -1];
      for (var j = 0; j < 4; j++) { var n = nb[j]; if (n >= 0 && !seen[n] && isRoad(tiles[n])) { seen[n] = 1; q.push(n); } }
    }
    for (i = 0; i < N; i++) if (isRoad(tiles[i]) && !seen[i]) tiles[i] = T.GRASS;
    entries = entries.filter(function (e) { return seen[e]; });

    // --- Blocks: parks, buildings, courtyards ---
    var buildings = [], trees = [];
    var roadNeighbor = function (x, y) {
      var o = [];
      if (x > 0 && isRoad(tiles[idx(x - 1, y)])) o.push(idx(x - 1, y));
      if (x < W - 1 && isRoad(tiles[idx(x + 1, y)])) o.push(idx(x + 1, y));
      if (y > 0 && isRoad(tiles[idx(x, y - 1)])) o.push(idx(x, y - 1));
      if (y < H - 1 && isRoad(tiles[idx(x, y + 1)])) o.push(idx(x, y + 1));
      return o;
    };
    var addTree = function (x, y, kind) {
      trees.push({ tile: idx(Math.floor(x), Math.floor(y)), x: x, y: y, kind: kind, s: rng.range(0.8, 1.2), v: rng.int(3) });
    };
    for (var bi = 0; bi < 8; bi++) for (var bj = 0; bj < 8; bj++) {
      var x0 = 5 * bi + 2, y0 = 5 * bj + 2;
      var land = [], hasWater = false;
      for (y = y0; y < y0 + 4; y++) for (x = x0; x < x0 + 4; x++) {
        if (tiles[idx(x, y)] === T.WATER) hasWater = true; else if (tiles[idx(x, y)] === T.GRASS) land.push(idx(x, y));
      }
      var dId = dist[idx(x0 + 2, y0 + 2)], dd2 = D.DISTRICTS[dId];
      if (hasWater) {
        land.forEach(function (t) { tiles[t] = T.PARK; if (rng.chance(0.55)) addTree(t % W + rng.range(0.25, 0.75), ((t / W) | 0) + rng.range(0.25, 0.75), 0); });
        continue;
      }
      if (rng.chance(dd2.park)) {
        land.forEach(function (t) {
          tiles[t] = T.PARK;
          var n2 = rng.int(3);
          for (var m = 0; m < n2; m++) addTree(t % W + rng.range(0.2, 0.8), ((t / W) | 0) + rng.range(0.2, 0.8), dd2.id === 'hill' && rng.chance(0.4) ? 1 : 0);
        });
        continue;
      }
      land.forEach(function (t) {
        var tx = t % W, ty = (t / W) | 0, rn = roadNeighbor(tx, ty);
        var dHere = D.DISTRICTS[dist[t]];
        if (rn.length && rng.chance(dHere.fill)) {
          tiles[t] = T.BUILDING;
          // Prefer a door facing the viewer (+x or +y) so it reads well in iso
          var door = rn[0];
          for (var r = 0; r < rn.length; r++) if (rn[r] === t + 1 || rn[r] === t + W) door = rn[r];
          var st = STYLE[dHere.style], fl = st.floors[0] + rng.int(st.floors[1] - st.floors[0] + 1);
          if (dHere.style === 'tower') {
            var ddx = tx - centers[1][0], ddy = ty - centers[1][1];
            fl += Math.max(0, Math.round(3 - Math.sqrt(ddx * ddx + ddy * ddy) / 3));
          }
          if (dHere.style === 'warehouse' && rng.chance(0.3)) fl = 2;
          buildings.push({
            tile: t, x: tx, y: ty, d: dist[t], style: dHere.style, floors: fl,
            color: rng.int(4), roof: st.roof, inset: st.inset, door: door, landmark: null,
            weight: fl * st.perFloor * dHere.density * rng.range(0.8, 1.2)
          });
        } else {
          tiles[t] = dHere.id === 'down' ? T.PLAZA : T.LOT;
          if ((dHere.id === 'hill' || dHere.id === 'sub') && rng.chance(0.35)) {
            tiles[t] = T.PARK; addTree(tx + rng.range(0.3, 0.7), ty + rng.range(0.3, 0.7), dHere.id === 'hill' ? 1 : 0);
          }
        }
      });
    }

    // Border forest
    for (i = 0; i < N; i++) {
      x = i % W; y = (i / W) | 0;
      if (tiles[i] === T.GRASS && (x === 0 || y === 0 || x === W - 1 || y === H - 1) && rng.chance(0.5)) addTree(x + rng.range(0.3, 0.7), y + rng.range(0.3, 0.7), rng.chance(0.5) ? 1 : 0);
    }

    // --- Landmarks: the building nearest each district center ---
    D.DISTRICTS.forEach(function (dd3, k) {
      var best2 = null, bdist = 1e9;
      buildings.forEach(function (b) {
        if (b.d !== k || b.landmark) return;
        var dx = b.x + 0.5 - centers[k][0], dy = b.y + 0.5 - centers[k][1], dd = dx * dx + dy * dy;
        if (dd < bdist) { bdist = dd; best2 = b; }
      });
      if (best2) {
        best2.landmark = LANDMARKS[dd3.id].id; best2.landmarkName = LANDMARKS[dd3.id].name;
        best2.weight *= 1.6;
        if (best2.landmark === 'lighthouse') best2.floors = 6;
        if (best2.landmark === 'hall') best2.floors = Math.max(3, best2.floors - 2);
      }
    });

    // --- Population: each district gets its share, split by building size ---
    var pop = Math.round(cfg.population * (opts.popMult || 1)), assigned = 0;
    var dW = D.DISTRICTS.map(function () { return 0; });
    buildings.forEach(function (b) { dW[b.d] += b.weight; });
    var shareSum = 0; D.DISTRICTS.forEach(function (dd4, k) { if (dW[k] > 0) shareSum += dd4.popShare; });
    buildings.forEach(function (b, n2) {
      b.id = n2;
      var dPop = pop * D.DISTRICTS[b.d].popShare / shareSum;
      b.pop = Math.max(2, Math.round(dPop * b.weight / dW[b.d]));
      assigned += b.pop;
    });

    var byDistrict = D.DISTRICTS.map(function () { return []; });
    var districtPop = D.DISTRICTS.map(function () { return 0; });
    buildings.forEach(function (b) { byDistrict[b.d].push(b.id); districtPop[b.d] += b.pop; });
    var bldAt = new Int32Array(N).fill(-1);
    buildings.forEach(function (b) { bldAt[b.tile] = b.id; });

    return {
      seed: seed, W: W, H: H, tiles: tiles, district: dist, buildings: buildings, trees: trees,
      entries: entries, centers: centers, byDistrict: byDistrict, districtPop: districtPop,
      totalPop: assigned, bldAt: bldAt, T: T
    };
  }

  NS.city = { generate: generate, T: T };
})(typeof window !== 'undefined' ? window : globalThis);
