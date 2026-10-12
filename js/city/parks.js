/* Nirmal simulation — js/city/parks.js
 * Garden district, lotus lake and market walk. */
'use strict';

function garden(cx, cz) {
  parkPaths(cx, cz);
  part('cyl', 'stone', cx, 0.57, cz, 9, 0.35, 9);
  part('cyl', 'grass', cx, 0.81, cz, 8.4, 0.14, 8.4);
  part('cyl', 'stone', cx, 1.15, cz, 3, 0.6, 3);
  part('sphere', 'terracotta', cx, 3.05, cz, 1.8, 1.8, 1.8);
  part('torus', 'yellow', cx, 3.05, cz, 2.5, 2.5, 2.5, Math.PI / 2);
  sign('नेहरू उद्यान · NEHRU GARDEN', cx, 2.8, cz + 32, 14, 1.8);
  for (const [dx, dz] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
    box('hedge', cx + dx, 0.65, cz + dz, 10, 0.75, 10);
    for (let i = 0; i < 7; i++) {
      part('sphere', 'flower', cx + dx + rr(-3, 3), 1.1, cz + dz + rr(-3, 3), 0.28, 0.25, 0.28);
    }
  }
}

function lakePark(cx, cz) {
  box('grass', cx, 0.4, cz, 66, 0.24, 66);
  box('paving', cx, 0.59, cz + 24, 63, 0.14, 5);
  box('paving', cx - 24, 0.59, cz, 5, 0.14, 58);
  part('cyl', 'stone', cx + 2, 0.53, cz - 2, 23, 0.4, 19);
  part('cyl', 'waterBase', cx + 2, 0.76, cz - 2, 22, 0.07, 18);
  for (let a = 0; a < TAU; a += 0.5) {
    tree(cx + Math.cos(a) * 28, cz + Math.sin(a) * 28, rr(5, 8));
  }
  for (let x = -16; x <= 16; x += 12) bench(cx + x, cz + 21);
  box('wood', cx + 10, 0.98, cz + 15, 4, 0.25, 10);
  box('wood', cx + 10, 1.48, cz + 15, 4, 0.08, 10);
  for (const s of [-1, 1]) box('wood', cx + 10 + s * 1.8, 1.28, cz + 15, 0.1, 0.9, 10);
  sign('कमल सरोवर · LOTUS LAKE', cx, 2.8, cz + 30, 13, 1.7);
}

function market(cx, cz) {
  box('paving', cx, 0.47, cz, 66, 0.15, 66);
  for (const s of [-1, 1]) {
    for (const j of [0, 2]) {
      const x = cx - 22 + j * 14;
      const z = cz + s * 21;
      building(x, z, 11, 14, rr(9, 14), 'heritage', j + 1);
      box(pick(['bus', 'carRed', 'yellow']), x, 3, z - s * 8, 10, 0.13, 3);
      part('box', 'ivory', x, 2, z - s * 8, 10, 1.8, 0.06, 0, s === 1 ? Math.PI : 0);
    }
  }
  for (const s of [-1, 1]) {
    for (let q = -24; q <= 24; q += 12) {
      tree(cx + q, cz + s * 8, 6);
      bench(cx + q, cz + s * 5, s === 1 ? Math.PI : 0);
    }
  }
  box('grass', cx, 0.62, cz, 58, 0.16, 4);
  for (let q = -24; q <= 24; q += 8) planter(cx + q, cz, 2.5, 2.5);
  sign('निर्मल बाज़ार · MARKET WALK', cx, 2.8, cz + 32, 15, 1.8);
}
