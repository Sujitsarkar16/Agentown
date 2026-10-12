/* Nirmal simulation — js/village/village.js
 * Rural settlement: rutted mud lanes with potholes, mud huts, cows,
 * dense groves, school pond, pasture and farms. */
'use strict';

function villageHouse(x, z, w, d, h, variant = 1) {
  recordBuilding(x, z, w + 1, d + 1, h + 3, 'village house', { z: z + d / 2 + 0.08, height: 2.1 });
  diagnostics.villageHouses++;
  box('stone', x, 0.35, z, w + 0.7, 0.5, d + 0.7);
  box(['villageWall', 'mintWall', 'peachWall', 'blueWall'][variant], x, h / 2 + 0.35, z, w, h, d);
  box('ivory', x, 0.8, z, w + 0.08, 0.65, d + 0.08);
  if (variant === 1) {
    box('ivory', x, h + 0.5, z, w + 0.5, 0.3, d + 0.5);
    box('solar', x, h + 0.85, z - 1, w * 0.55, 0.15, d * 0.45);
    part('cyl', 'waterBase', x + w * 0.3, h + 1, z - d * 0.25, 0.7, 1, 0.7);
  } else {
    part('roof', variant === 3 ? 'thatch' : 'roofTile', x, h + 1.6, z, w * 0.8, 2.5, d * 0.8);
  }
  for (const side of [-1, 1]) {
    box('warmwindow', x + side * w * 0.3, 2.3, z + d / 2 + 0.08, 1.35, 1.25, 0.10);
    box('warmwindow', x + side * (w / 2 + 0.06), 2.2, z, 0.08, 1.2, 1.35);
  }
  box('stone', x, 0.41, z + d / 2 + 1.7, w + 1, 0.2, 3);
  box('roofTile', x, 2.9, z + d / 2 + 1.4, w + 1, 0.15, 2.9);
  for (const side of [-1, 1]) part('cyl', 'wood', x + side * w * 0.42, 1.67, z + d / 2 + 2.4, 0.055, 2.6, 0.055);
  for (const side of [-1, 1]) {
    box('wood', x + side * (w / 2 + 3), 0.65, z, 0.08, 0.08, d + 5);
    box('wood', x + side * (w / 2 + 3), 1.1, z, 0.08, 0.08, d + 5);
  }
  tree(x - w / 2 - 4, z - 1, rr(5, 7));
  part('cyl', 'terracotta', x + w / 2 + 1.2, 0.55, z + d / 2 + 1.5, 0.32, 0.7, 0.32);
  for (let i = 0; i < 4; i++) {
    const px = x - w * 0.35 + i * w * 0.23;
    part('sphere', 'leaf2', px, 0.6, z + d / 2 + 3.5, 0.4, 0.35, 0.4);
    part('sphere', i % 2 ? 'flowerPink' : 'flowerGold', px, 0.94, z + d / 2 + 3.5, 0.22, 0.2, 0.22);
  }
}

// Round or rectangular mud hut with a thatch roof and a small courtyard.
function mudHut(x, z, angle = 0, round = true) {
  const front = round ? 3.4 : 2.86;
  recordBuilding(x, z, 10, 10, 6.5, 'mud hut', {
    x: x + Math.sin(angle) * front, z: z + Math.cos(angle) * front,
    angle, base: round ? 0.1 : 0.3, height: 2.1,
  });
  diagnostics.huts = (diagnostics.huts || 0) + 1;
  const cs = Math.cos(angle);
  const sn = Math.sin(angle);
  const at = (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
  if (round) {
    part('cyl', 'mud', x, 1.5, z, 3.4, 3, 3.4);
    part('cyl', 'mudDark', x, 2.6, z, 3.45, 0.3, 3.45);
    part('cone', 'thatch', x, 4.4, z, 4.6, 2.8, 4.6);
    part('cyl', 'wood', x, 6.1, z, 0.12, 1.3, 0.12);
    let [dx, dz] = at(0, 3.32);
    box('dark', dx, 1.15, dz, 1.2, 2.1, 0.14, angle);
    [dx, dz] = at(1.9, 2.75);
    box('warmwindow', dx, 1.7, dz, 0.9, 0.9, 0.14, angle);
  } else {
    box('stone', x, 0.3, z, 7.8, 0.6, 6.4);
    box('mud', x, 1.7, z, 7, 2.8, 5.6, angle);
    part('roof', 'thatch', x, 3.9, z, 4.7, 2.2, 3.7);
    let [dx, dz] = at(0, 2.86);
    box('dark', dx, 1.35, dz, 1.3, 2.3, 0.14, angle);
    [dx, dz] = at(-2, 2.86);
    box('warmwindow', dx, 1.7, dz, 1.0, 0.9, 0.14, angle);
    // Veranda awning on wooden posts.
    [dx, dz] = at(0, 4.4);
    box('thatch', dx, 2.7, dz, 5.4, 0.16, 2.2, angle);
    for (const s of [-1, 1]) {
      const [px, pz] = at(s * 2.4, 5.2);
      part('cyl', 'wood', px, 1.35, pz, 0.09, 2.7, 0.09);
    }
  }
  // Courtyard: broken fence ring, haystack, clay pots and a shrub.
  for (let a = 0.7; a < TAU - 0.4; a += 0.55) {
    if (Math.abs(a - Math.PI) < 0.5) continue; // gap at the entrance
    const px = x + Math.sin(a + angle) * 6.4;
    const pz = z + Math.cos(a + angle) * 6.4;
    box('wood', px, 0.5, pz, 0.13, 1.0, 0.13);
  }
  const [hx, hz] = at(5.2, -2.5);
  part('cone', 'hay', hx, 1.1, hz, 1.5, 2.2, 1.5);
  for (const [ox, oz] of [[3.4, 3.6], [4.1, 3.1]]) {
    const [px, pz] = at(ox, oz);
    part('cyl', 'terracotta', px, 0.35, pz, 0.3, 0.6, 0.3);
  }
  const [sx, sz] = at(-4.6, 3.8);
  shrub(sx, sz, rr(0.7, 1.0));
}

// Zebu cow: humped body, horns, tail; grazing pose lowers the head.
function cow(x, z, angle = 0, grazing = false, s = 1) {
  diagnostics.cows = (diagnostics.cows || 0) + 1;
  const coat = pick(['cowWhite', 'cowBrown', 'cowBlack']);
  const cs = Math.cos(angle);
  const sn = Math.sin(angle);
  const put = (mat, lx, y, lz, sx, sy, sz) =>
    box(mat, x + (lx * cs + lz * sn) * s, y * s, z - (lx * sn - lz * cs) * s, sx * s, sy * s, sz * s, angle);
  put(coat, 0, 1.15, 0, 1.05, 1.0, 2.3); // barrel
  put(coat, 0, 1.78, 0.62, 0.5, 0.42, 0.62); // hump
  for (const [lx, lz] of [[-0.34, 0.72], [0.34, 0.72], [-0.34, -0.72], [0.34, -0.72]]) {
    put(coat, lx, 0.45, lz, 0.22, 0.9, 0.22); // legs
  }
  if (grazing) {
    put(coat, 0, 0.62, 1.55, 0.5, 0.5, 0.85); // lowered head
    put('ivory', -0.3, 0.85, 1.5, 0.4, 0.08, 0.08);
    put('ivory', 0.3, 0.85, 1.5, 0.4, 0.08, 0.08);
  } else {
    put(coat, 0, 1.62, 1.42, 0.5, 0.58, 0.72); // raised head
    put('ivory', -0.32, 1.9, 1.4, 0.45, 0.08, 0.08);
    put('ivory', 0.32, 1.9, 1.4, 0.45, 0.08, 0.08);
  }
  put(coat, 0, 1.15, -1.32, 0.1, 0.95, 0.1); // tail
  put('cowBlack', 0, 0.62, -1.36, 0.14, 0.22, 0.14); // tail tuft
}

// Dark sunken disc with a raised muddy rim: a monsoon pothole.
function pothole(x, z, r = 1) {
  part('cyl', 'mudDark', x, 0.145, z, r * 1.3, 0.05, r * 1.3);
  part('cyl', 'dark', x, 0.16, z, r, 0.05, r);
  diagnostics.potholes = (diagnostics.potholes || 0) + 1;
}

function puddle(x, z, r = 1.4) {
  part('cyl', 'puddle', x, 0.165, z, r, 0.04, r * 0.72, 0, rr(0, TAU));
}

// One bumpy mud segment of an east-west lane.
function mudSegX(cx, z, w) {
  const wig = Math.sin(cx * 0.05 + z) * 1.1;
  const ww = w + Math.sin(cx * 0.11) * 1.4;
  const y = 0.08 + Math.sin(cx * 0.23 + z * 0.4) * 0.03;
  box(Math.sin(cx * 0.7) > 0.55 ? 'mudDark' : 'mud', cx, y, z + wig, 13.6, 0.12, ww);
  for (const s of [-1, 1]) {
    box('soil', cx, 0.045, z + wig + s * (ww / 2 + 2.1), 13.6, 0.08, rr(2.4, 3.8));
    if (rand() < 0.45) grassTuft(cx + rr(-6, 6), z + wig + s * (ww / 2 + rr(1.5, 3.5)));
  }
  if (rand() < 0.12) pothole(cx + rr(-4, 4), z + wig + rr(-3, 3), rr(0.5, 0.9));
  if (rand() < 0.16) puddle(cx + rr(-5, 5), z + wig + rr(-3, 3), rr(0.7, 1.3));
  if (rand() < 0.6) {
    part('leaf', 'granite', cx + rr(-6, 6), 0.2, z + wig + rr(-4, 4),
      rr(0.25, 0.5), rr(0.15, 0.3), rr(0.25, 0.5), 0, rr(0, TAU));
  }
}

// One bumpy mud segment of a north-south lane.
function mudSegZ(x, cz, w) {
  const wig = Math.sin(cz * 0.05 + x) * 1.1;
  const ww = w + Math.sin(cz * 0.11) * 1.4;
  const y = 0.08 + Math.sin(cz * 0.23 + x * 0.4) * 0.03;
  box(Math.sin(cz * 0.7) > 0.55 ? 'mudDark' : 'mud', x + wig, y, cz, ww, 0.12, 13.6);
  for (const s of [-1, 1]) {
    box('soil', x + wig + s * (ww / 2 + 2.1), 0.045, cz, rr(2.4, 3.8), 0.08, 13.6);
    if (rand() < 0.45) grassTuft(x + wig + s * (ww / 2 + rr(1.5, 3.5)), cz + rr(-6, 6));
  }
  if (rand() < 0.12) pothole(x + wig + rr(-3, 3), cz + rr(-4, 4), rr(0.5, 0.9));
  if (rand() < 0.16) puddle(x + wig + rr(-3, 3), cz + rr(-5, 5), rr(0.7, 1.3));
  if (rand() < 0.6) {
    part('leaf', 'granite', x + wig + rr(-4, 4), 0.2, cz + rr(-6, 6),
      rr(0.25, 0.5), rr(0.15, 0.3), rr(0.25, 0.5), 0, rr(0, TAU));
  }
}

function shrub(x, z, s = rr(0.6, 1.1)) {
  part('sphere', pick(['shrub', 'leaf2', 'hedge']), x, s * 0.55, z, s, s * 0.75, s, 0, rr(0, TAU));
  if (rand() < 0.5) {
    part('sphere', 'leaf3', x + rr(-0.5, 0.5), s * 0.4, z + rr(-0.5, 0.5), s * 0.6, s * 0.5, s * 0.6);
  }
}

function grassTuft(x, z) {
  for (let i = 0; i < 3; i++) {
    part('cone', pick(['reed', 'shrub', 'crop']), x + rr(-0.4, 0.4), 0.32, z + rr(-0.4, 0.4),
      0.28, rr(0.5, 0.9), 0.28, rr(-0.15, 0.15), rr(0, TAU));
  }
}

function banana(x, z) {
  diagnostics.trees++;
  part('cyl', 'trunk', x, 1.0, z, 0.25, 2.0, 0.25);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + rr(-0.2, 0.2);
    part('sphere', 'leaf2', x + Math.sin(a) * 1.1, 2.3, z + Math.cos(a) * 1.1,
      0.45, 0.3, 2.4, 0.5, a);
  }
}

// Broad banyan shade tree with prop roots and a wide canopy.
function banyan(x, z, h = 13) {
  diagnostics.trees++;
  part('cyl', 'trunk', x, h * 0.3, z, 0.9, h * 0.6, 0.9);
  for (const [dx, dz] of [[-3, -2], [3, -3], [-2, 3], [2, 2], [0, -4], [0, 4], [-4, 0], [4, 0]]) {
    part('cyl', 'trunk', x + dx * 0.4, h * 0.32, z + dz * 0.4, 0.18, h * 0.45, 0.18);
  }
  for (let i = 0; i < 9; i++) {
    const a = rr(0, TAU);
    const r = rr(0, h * 0.45);
    part('leafNear', pick(['leaf1', 'leaf2']), x + Math.sin(a) * r, h * rr(0.7, 0.95), z + Math.cos(a) * r,
      rr(3, 5.5), rr(2.5, 4), rr(3, 5.5), 0, rr(0, TAU));
  }
}

function scarecrow(x, z, angle = 0) {
  part('cyl', 'wood', x, 1.1, z, 0.09, 2.2, 0.09);
  box(pick(['shirt2', 'shirt3']), x, 1.7, z, 1.1, 0.7, 0.3, angle);
  part('sphere', 'sand', x, 2.25, z, 0.22, 0.26, 0.22);
  box('hay', x, 2.5, z, 0.52, 0.12, 0.52, angle);
}

function kitchenGarden(x, z) {
  box('soil', x, 0.12, z, 5, 0.12, 3.4);
  for (let q = -1.6; q <= 1.6; q += 1.1) box('crop', x + q, 0.4, z, 0.5, 0.5, 2.8);
}

function trough(x, z, angle = 0) {
  box('wood', x, 0.4, z, 2.6, 0.5, 1.0, angle);
  box('waterBase', x, 0.58, z, 2.2, 0.12, 0.7, angle);
}

function fenceRun(x0, z0, x1, z1) {
  const len = Math.hypot(x1 - x0, z1 - z0);
  const a = Math.atan2(x1 - x0, z1 - z0);
  const n = Math.max(1, Math.round(len / 6));
  for (let i = 0; i <= n; i++) {
    box('wood', x0 + ((x1 - x0) * i) / n, 0.55, z0 + ((z1 - z0) * i) / n, 0.14, 1.1, 0.14);
  }
  const mx = (x0 + x1) / 2;
  const mz = (z0 + z1) / 2;
  box('wood', mx, 0.85, mz, 0.09, 0.09, len, a);
  box('wood', mx, 0.45, mz, 0.09, 0.09, len, a);
}

function cowShed(x, z, angle = 0) {
  for (const [lx, lz] of [[-3, -2], [3, -2], [-3, 2], [3, 2]]) {
    const cs = Math.cos(angle);
    const sn = Math.sin(angle);
    part('cyl', 'wood', x + lx * cs + lz * sn, 1.3, z - lx * sn + lz * cs, 0.14, 2.6, 0.14);
  }
  box('thatch', x, 2.85, z, 7.6, 0.35, 5.6, angle);
  box('hay', x, 0.5, z, 1.6, 1.0, 1.2, angle);
}

function villageLamp(x, z, angle = 0) {
  part('cyl', 'wood', x, 2.2, z, 0.12, 4.4, 0.12);
  box('wood', x, 4.3, z, 1.4, 0.12, 0.12, angle);
  box('thatch', x, 4.55, z, 1.0, 0.15, 0.7);
  const p = part('box', 'light', x + Math.sin(angle) * 0.5, 3.9, z + Math.cos(angle) * 0.5,
    0.34, 0.4, 0.34, 0, angle);
  streetLights.push(p);
}

function clearOfVillageRoads(x, z, pad = 10) {
  if (villageX.some((q) => Math.abs(x - q) < pad)) return false;
  if (villageZ.some((q) => Math.abs(z - q) < pad)) return false;
  if (z > 262 && z < 368 && x > -712 && x < -394) return false; // farm link lanes
  return true;
}

function clearOfBuildings(x, z, pad = 8) {
  for (const b of buildingBounds) {
    if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad) return false;
  }
  return true;
}

function village() {
  diagnostics.villageHouses = 0;
  diagnostics.huts = 0;
  diagnostics.cows = 0;
  diagnostics.potholes = 0;

  // Rutted mud lanes (no asphalt, no painted lines out here).
  for (const x of villageX) {
    for (let z = 164; z < 466; z += 13) mudSegZ(x, z + 6.5, 11);
  }
  for (const z of villageZ) {
    for (let x = -1004; x < -706; x += 13) mudSegX(x, z, 11);
  }
  for (const x of villageX) {
    for (const z of villageZ) {
      part('cyl', 'mud', x, 0.07, z, 8, 0.13, 8);
      part('cyl', 'mudDark', x, 0.1, z, 5.5, 0.1, 5.5);
      if (rand() < 0.2) pothole(x + rr(-4, 4), z + rr(-4, 4), rr(0.6, 1));
      if (rand() < 0.6) puddle(x + rr(-5, 5), z + rr(-5, 5), rr(1, 2));
    }
  }

  buildSectorDistrict('Farm link');
  buildSectorDistrict('Village');
  // Two field huts out by the farms.
  mudHut(-532, 152, 1.1, false);
  mudHut(-1150, 225, 2.2, true);

  // Farming plots with scarecrows and weedy edges.
  for (const [x, z, w, d] of [
    [-620, 80, 155, 106], [-578, 193, 145, 88], [-577, 455, 158, 110], [-1110, 300, 140, 230],
  ]) {
    box('soil', x, 0.08, z, w, 0.1, d);
    for (let q = -w / 2 + 3; q < w / 2 - 3; q += 4) box('crop', x + q, 0.36, z, 1.4, 0.42, d - 5);
    for (const side of [-1, 1]) {
      box('soil', x, 0.16, z + side * (d / 2 + 2), w + 6, 0.1, 2);
      tree(x + side * w / 2, z + side * (d / 2 + 9), rr(6, 9));
    }
    scarecrow(x + rr(-w / 4, w / 4), z + rr(-d / 4, d / 4), rr(0, TAU));
    for (let i = 0; i < 6; i++) {
      const ex = x + (rand() < 0.5 ? -w / 2 - rr(2, 5) : w / 2 + rr(2, 5));
      shrub(ex, z + rr(-d / 2, d / 2));
    }
  }

  // Fenced pasture with a shed, troughs and a grazing herd.
  {
    const px = -730;
    const pz = 495;
    const pw = 100;
    const pd = 50;
    box('soil', px, 0.05, pz, pw + 14, 0.08, pd + 14);
    box('grass', px, 0.09, pz, pw, 0.08, pd);
    fenceRun(px - pw / 2, pz - pd / 2, px + pw / 2, pz - pd / 2);
    fenceRun(px - pw / 2, pz + pd / 2, px + pw / 2, pz + pd / 2);
    fenceRun(px - pw / 2, pz - pd / 2, px - pw / 2, pz + pd / 2);
    fenceRun(px + pw / 2, pz - pd / 2, px + pw / 2, pz + pd / 2);
    cowShed(px - 30, pz - 12, 0.2);
    trough(px - 24, pz + 8, 0.3);
    trough(px + 18, pz - 10, -0.2);
    part('cone', 'hay', px + 32, 1.3, pz + 12, 2.2, 2.6, 2.2);
    const herd = [[-12, -6, 0.4, false], [-2, 8, 2.4, true], [8, -2, -0.8, true],
      [20, 10, 1.8, false], [-22, 12, -2.2, true]];
    for (const [ox, oz, a, g] of herd) cow(px + ox, pz + oz, a, g);
    diagnostics.pasture = { x: px, z: pz };
  }

  // Loose cattle: two by the pond, a cow with calf near a house, one on the lane.
  cow(-852, 342, 2.6, true);
  cow(-880, 340, -1.2, false);
  cow(-928, 250, 0.6, false);
  cow(-926, 252, 2.2, true, 0.55);
  cow(-810, 300, 1.4, true);

  // Shade and wilderness: banyans, mango rows, western and southern groves.
  banyan(-698, 192, 14);
  banyan(-828, 332, 12);
  buildSectorDistrict('Village', 'decorate');
  for (let i = 0; i < 60; i++) {
    const x = rr(-1180, -1010);
    const z = rr(150, 480);
    if (!clearOfVillageRoads(x, z, 10) || !clearOfBuildings(x, z, 7)) continue;
    tree(x, z, rr(6, 12));
    if (rand() < 0.7) shrub(x + rr(-4, 4), z + rr(-4, 4));
  }
  for (let i = 0; i < 40; i++) {
    const x = rr(-1000, -650);
    const z = rr(470, 540);
    if (!clearOfVillageRoads(x, z, 10) || !clearOfBuildings(x, z, 7)) continue;
    if (rand() < 0.4) palm(x, z, rr(8, 11));
    else tree(x, z, rr(6, 10));
    if (rand() < 0.6) grassTuft(x + rr(-4, 4), z + rr(-4, 4));
  }
  for (const x of villageX) {
    for (let z = 180; z <= 450; z += 30) {
      for (const s of [-1, 1]) {
        if (rand() < 0.35) continue;
        const px = x + s * rr(10, 14);
        const pz = z + rr(-8, 8);
        if (!clearOfBuildings(px, pz, 6)) continue;
        if (villageZ.some((q) => Math.abs(pz - q) < 9)) continue; // keep off east-west lanes
        if (Math.abs(pz - 270) < 10 || Math.abs(pz - 360) < 10) continue;
        tree(px, pz, rr(5, 9));
      }
    }
  }

  // A village commons beside the homes: cricket, play, shaded meeting pavilion.
  const vx = -945;
  const vz = 110;
  box('grass', vx, 0.26, vz, 76, 0.18, 70);
  box('paving', vx, 0.41, vz + 31, 74, 0.12, 4);
  box('soil', vx - 12, 0.39, vz - 2, 5, 0.12, 22);
  for (const s of [-1, 1]) for (const dx of [-0.35, 0, 0.35]) box('wood', vx - 12 + dx, 0.95, vz - 2 + s * 9, 0.06, 1, 0.06);
  playground(vx + 19, vz, 22, 21);
  for (const [dx, dz] of [[-30, -25], [30, -25], [-30, 22]]) { tree(vx + dx, vz + dz, 10); bench(vx + dx, vz + dz + 5); }
  for (const s of [-1, 1]) for (const t of [-1, 1]) box('wood', vx - 14 + s * 3, 1.9, vz + 25 + t * 2, 0.18, 3, 0.18);
  part('roof', 'roofTile', vx - 14, 4, vz + 25, 5.4, 1.5, 4);
  sign('GRAM KHEL MAIDAN · PLAY & CRICKET', vx, 2.7, vz + 33, 25, 1.4);
  communitySite('park', vx, vz, 'Village cricket & play commons');

  // Wooden lantern posts instead of city street lights.
  for (const [lx, lz, a] of [
    [-981, 240, 1.5], [-909, 300, -1.5], [-819, 250, 1.5],
    [-801, 400, -1.5], [-981, 420, 1.5], [-729, 320, 1.5],
  ]) {
    villageLamp(lx, lz, a);
  }

  diagnostics.village = { x: -855, z: 315, distanceFromCity: 625 };
}

function villageResidentialSector(sector, layout) {
  const cx = sector.x; const cz = sector.z;
  for (const [dx, dz, variant] of layout.houses) {
    villageHouse(cx + dx, cz + dz, rr(7, 10), rr(7, 10), rr(3.2, 4.5), variant);
  }
  const [hx, hz] = layout.gardenCorner;
  if (layout.hut) mudHut(cx + hx, cz + hz, rr(0, TAU), layout.hut === 'round');
  if (rand() < 0.7) kitchenGarden(cx - hx * 0.5, cz - hz * 0.5 + 12);
  if (rand() < 0.5) banana(cx - hx, cz - hz * 0.4);
  else shrub(cx - hx, cz - hz * 0.4);
}

function villageSectorPlanting(sector) {
  const cx = sector.x; const cz = sector.z;
  if (rand() < 0.6) banana(cx + 30, cz - 5);
  shrub(cx - 30, cz + 6);
  grassTuft(cx + 24, cz - 24);
  grassTuft(cx - 24, cz - 24);
}
