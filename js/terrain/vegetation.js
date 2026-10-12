/* Nirmal simulation — js/terrain/vegetation.js
 * Trees, palms, benches, lamps and park furniture. */
'use strict';

function tree(x, z, h = rr(6, 9), y = 0) {
  diagnostics.trees++;
  part('cyl', 'trunk', x, y + h * 0.35, z, 0.22, h * 0.7, 0.22);
  const mat = pick(['leaf1', 'leaf2', 'leaf3']);
  const near = Math.hypot(x, z) < 150;
  const leaf = near ? 'leafNear' : 'leaf';
  for (const [dx, dz, dy, s] of [
    [0, 0, 0.75, 0.30],
    [-0.18, 0.03, 0.65, 0.22],
    [0.18, 0, 0.70, 0.23],
    [0, -0.18, 0.63, 0.22],
    [0.03, 0.17, 0.65, 0.23],
  ]) {
    part(leaf, mat, x + dx * h, y + dy * h, z + dz * h, h * s, h * s * 0.93, h * s, 0, rr(0, TAU));
  }
}

function palm(x, z, h = 10) {
  diagnostics.trees++;
  part('cyl', 'trunk', x, h * 0.5, z, 0.18, h, 0.18, 0, 0, 0.035);
  for (let i = 0; i < 7; i++) {
    const a = (i * TAU) / 7;
    part('sphere', 'leaf3', x + Math.sin(a) * 1.8, h - 0.15, z + Math.cos(a) * 1.8, 0.5, 0.28, 2.9, 0.16, a);
  }
}

function planter(x, z, w = 3, d = 3) {
  box('stone', x, 0.45, z, w, 0.8, d);
  box('hedge', x, 0.97, z, w - 0.35, 0.6, d - 0.35);
}

function bench(x, z, angle = 0) {
  const cs = Math.cos(angle);
  const sn = Math.sin(angle);
  const put = (lx, y, lz, sx, sy, sz, mat) =>
    box(mat, x + lx * cs + lz * sn, y, z - lx * sn + lz * cs, sx, sy, sz, angle);
  put(0, 0.7, 0, 2.6, 0.12, 0.65, 'wood');
  put(0, 1.1, -0.3, 2.6, 0.55, 0.12, 'wood');
  put(-0.96, 0.37, 0, 0.13, 0.7, 0.6, 'metal');
  put(0.96, 0.37, 0, 0.13, 0.7, 0.6, 'metal');
}

function lamp(x, z, angle = 0) {
  part('cyl', 'metal', x, 3.8, z, 0.075, 7.6, 0.075);
  box('metal', x + Math.sin(angle) * 0.6, 7.6, z + Math.cos(angle) * 0.6, 0.1, 0.1, 1.25, angle);
  const p = part('box', 'light', x + Math.sin(angle) * 1.13, 7.52, z + Math.cos(angle) * 1.13,
    0.42, 0.08, 0.78, 0, angle);
  streetLights.push(p);
}

function parkPaths(cx, cz) {
  box('grass', cx, 0.46, cz, 68, 0.18, 68);
  box('paving', cx, 0.60, cz, 5, 0.1, 66);
  box('paving', cx, 0.61, cz, 66, 0.1, 5);
  for (let x = -28; x <= 28; x += 14) {
    for (let z = -28; z <= 28; z += 14) {
      if (Math.abs(x) > 5 && Math.abs(z) > 5) tree(cx + x, cz + z, rr(6, 9));
    }
  }
  for (const k of [-18, 18]) {
    bench(cx + k, cz + 5, 0);
    bench(cx + 5, cz + k, Math.PI / 2);
    planter(cx + k, cz - 5, 3, 2);
  }
}
