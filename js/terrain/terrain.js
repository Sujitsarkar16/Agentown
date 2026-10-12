/* Nirmal simulation — js/terrain/terrain.js
 * Ground mesh, city road grid and junction signals. */
'use strict';

function terrainHeight(x, z) {
  const east = T.MathUtils.smoothstep(x, 590, 920);
  const outer = T.MathUtils.smoothstep(Math.abs(z), 580, 1060);
  const broad = Math.sin(x * 0.0031 + Math.sin(z * 0.0018)) * Math.cos(z * 0.0033 - x * 0.0011);
  const ridge = 1 - Math.abs(Math.sin(x * 0.0064 + Math.sin(z * 0.0039)) * Math.cos(z * 0.0051));
  const detail = Math.sin(x * 0.018 + z * 0.011) * Math.sin(z * 0.024 - x * 0.009) * 8;
  let h = east * (165 + ridge * 270 + broad * 52 + detail) + outer * (40 + ridge * 95 + broad * 25);
  h *= T.MathUtils.smoothstep(Math.abs(x - 247), 29, 110);
  return -0.15 + Math.max(0, h);
}

function terrain() {
  const g = new T.PlaneGeometry(3800, 3000, 250, 210);
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  const col = new Float32Array(p.count * 3);
  const green = new T.Color('#98b77a');
  const forest = new T.Color('#58845c');
  const rock = new T.Color('#a4aaa1');
  const snow = new T.Color('#f3f5ee');
  const c = new T.Color();
  let maxHeight = 0;
  let snowVertices = 0;

  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const h = terrainHeight(x, z);
    p.setY(i, h);
    maxHeight = Math.max(maxHeight, h);
    const patch = (Math.sin(x * 0.016) * Math.cos(z * 0.015) + 1) / 2;
    c.copy(green).lerp(forest, patch * 0.30);
    if (h > 130) c.lerp(rock, T.MathUtils.smoothstep(h, 130, 270) * 0.82);
    if (h > 238) {
      const slope = Math.hypot(
        terrainHeight(x + 5, z) - terrainHeight(x - 5, z),
        terrainHeight(x, z + 5) - terrainHeight(x, z - 5),
      ) / 10;
      const amount = T.MathUtils.smoothstep(h, 238, 335) * clamp(1.45 - slope * 0.45, 0.28, 1);
      c.lerp(snow, amount);
      if (amount > 0.4) snowVertices++;
    }
    col.set([c.r, c.g, c.b], i * 3);
  }

  g.setAttribute('color', new T.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const material = new T.MeshStandardMaterial({
    vertexColors: true, roughness: 0.98, map: terrainDetailTex,
  });
  // Keep the exact terrain surface/normals, but submit only visible patches.
  const ground = new T.Group();
  ground.matrixAutoUpdate = false;
  for (let tz = 0; tz < 210; tz += 42) for (let tx = 0; tx < 250; tx += 50) {
    const tile = new T.BufferGeometry();
    for (const name of ['position', 'normal', 'uv', 'color']) {
      const source = g.attributes[name];
      const array = new Float32Array(51 * 43 * source.itemSize);
      let offset = 0;
      for (let z = tz; z <= tz + 42; z++) for (let x = tx; x <= tx + 50; x++) {
        const start = (z * 251 + x) * source.itemSize;
        for (let k = 0; k < source.itemSize; k++) array[offset++] = source.array[start + k];
      }
      tile.setAttribute(name, new T.BufferAttribute(array, source.itemSize));
    }
    const indices = [];
    for (let z = 0; z < 42; z++) for (let x = 0; x < 50; x++) {
      const a = z * 51 + x;
      indices.push(a, a + 51, a + 1, a + 51, a + 52, a + 1);
    }
    tile.setIndex(indices);
    tile.computeBoundingSphere();
    const mesh = new T.Mesh(tile, material);
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    ground.add(mesh);
  }
  g.dispose();
  scene.add(ground);
  diagnostics.terrainMesh = ground;
  diagnostics.terrain = {
    width: 3800, depth: 3000, maxHeight, snowVertices, vertices: p.count, heightAt: terrainHeight,
  };

  // City base slabs.
  box('paving', -95, -0.08, 0, 614, 0.16, 838);
  box('grass', -95, 0.035, 0, 610, 0.06, 830);

  // North–south avenues.
  for (const r of roads) {
    box('asphalt', r, 0.1, 0, 16, 0.1, 824);
    for (const side of [-1, 1]) {
      box('kerb', r + side * 8.9, 0.23, 0, 1.6, 0.32, 826);
      box('paving', r + side * 11, 0.22, 0, 2.7, 0.28, 824);
    }
    for (let q = -400; q <= 400; q += 10) {
      if (!roadZ.some((n) => Math.abs(q - n) < 14)) box('stripe', r, 0.166, q, 0.12, 0.025, 4);
    }
    for (let q = -400; q <= 400; q += 25) {
      if (!roadZ.some((n) => Math.abs(q - n) < 18)) {
        tree(r - 13.5, q, rr(5, 7));
        tree(r + 13.5, q, rr(5, 7));
      }
    }
    for (let q = -398; q <= 398; q += 45) {
      if (!roadZ.some((n) => Math.abs(q - n) < 15)) {
        lamp(r - 10, q, Math.PI / 2);
        lamp(r + 10, q, -Math.PI / 2);
      }
    }
  }

  // East–west streets.
  for (const r of roadZ) {
    box('asphalt', -95, 0.105, r, 614, 0.1, 16);
    for (const side of [-1, 1]) {
      box('kerb', -95, 0.23, r + side * 8.9, 616, 0.32, 1.6);
      box('paving', -95, 0.225, r + side * 11, 614, 0.28, 2.7);
    }
    for (let q = -394; q <= 208; q += 10) {
      if (!roads.some((n) => Math.abs(q - n) < 14)) box('stripe', q, 0.171, r, 4, 0.025, 0.12);
    }
    for (let q = -392; q <= 206; q += 25) {
      if (!roads.some((n) => Math.abs(q - n) < 18)) {
        tree(q, r - 13.5, rr(5, 7));
        tree(q, r + 13.5, rr(5, 7));
      }
    }
    for (let q = -391; q <= 205; q += 45) {
      if (!roads.some((n) => Math.abs(q - n) < 15)) {
        lamp(q, r - 10, 0);
        lamp(q, r + 10, Math.PI);
      }
    }
  }

  // Junctions + signals.
  for (const x of roads) {
    for (const z of roadZ) {
      box('asphalt', x, 0.16, z, 17, 0.13, 17);
      for (const side of [-1, 1]) {
        for (let k = -5; k <= 5; k += 1.7) {
          box('stripe', x + k, 0.239, z + side * 11, 0.75, 0.025, 3.6);
          box('stripe', x + side * 11, 0.241, z + k, 3.6, 0.025, 0.75);
        }
      }
      for (const [dx, dz, axis] of [[-8, -8, 'z'], [8, 8, 'z'], [-8, 8, 'x'], [8, -8, 'x']]) {
        makeSignal(x + dx, z + dz, axis);
      }
    }
  }

  // Wild trees on the outskirts.
  for (let i = 0; i < 240; i++) {
    const x = rr(-1250, 1080);
    const z = pick([rr(-980, -500), rr(510, 1030)]);
    const y = terrainHeight(x, z);
    if (y < 160 && Math.abs(x - 247) > 55) tree(x, z, rr(7, 15), y);
  }

  mountainDetails();
  alpineMeadows();
}

function alpineMeadows() {
  // Lush, flower-speckled lower slopes keep the snow peaks bright and inviting.
  let flowers = 0;
  for (let i = 0; i < 420; i++) {
    const x = rr(560, 1020); const z = rr(-620, 650);
    const y = terrainHeight(x, z);
    const slope = Math.hypot(terrainHeight(x + 3, z) - terrainHeight(x - 3, z), terrainHeight(x, z + 3) - terrainHeight(x, z - 3)) / 6;
    if (y < 15 || y > 225 || slope > 1.1) continue;
    const mat = i % 3 === 0 ? 'flowerPink' : i % 3 === 1 ? 'flowerGold' : 'flower';
    for (let j = 0; j < 4; j++) {
      const px = x + rr(-2, 2); const pz = z + rr(-2, 2); const py = terrainHeight(px, pz);
      part('leaf', 'leaf2', px, py + 0.4, pz, 0.8, 0.45, 0.8);
      part('sphere', mat, px, py + 0.9, pz, 0.45, 0.28, 0.45);
      flowers++;
    }
  }
  diagnostics.alpineFlowers = flowers;
  // Colourful mountain lodges and a small viewing deck on a foothill shelf.
  for (const [x, z, col] of [[635, -255, 'peachWall'], [655, -230, 'mintWall'], [620, -215, 'blueWall']]) {
    const y = terrainHeight(x, z);
    box('stone', x, y + 0.6, z, 10, 1.2, 8);
    box(col, x, y + 3.3, z, 8, 4.2, 6);
    part('roof', 'roofTile', x, y + 6.2, z, 6.5, 2, 5);
    box('warmwindow', x - 2, y + 3.5, z + 3.1, 1.8, 1.5, 0.1);
    box('warmwindow', x + 2, y + 3.5, z + 3.1, 1.8, 1.5, 0.1);
    box('wood', x, y + 1, z + 4.7, 10, 0.3, 3.4);
    recordBuilding(x, z, 10, 8, y + 8, 'mountain lodge', { z: z + 3.1, base: y + 1.2 });
  }
  const x = 600; const z = -195; const y = terrainHeight(x, z);
  box('wood', x, y + 1, z, 16, 0.3, 10);
  for (const s of [-1, 1]) {
    box('wood', x + s * 7.5, y + 1.8, z, 0.12, 1.4, 10);
    box('wood', x, y + 1.8, z + s * 4.6, 16, 1.4, 0.12);
  }
  sign('MEADOW TRAIL · VIEWPOINT', x, y + 2.5, z + 4.9, 12, 1.2);
}

// High-altitude conifer: trunk plus three stacked snow-dusted tiers.
function conifer(x, z, y, h = rr(7, 12)) {
  diagnostics.trees++;
  part('cyl', 'trunk', x, y + h * 0.2, z, 0.22, h * 0.4, 0.22);
  const tiers = [[0.42, 0.30], [0.62, 0.24], [0.80, 0.17]];
  for (const [fy, s] of tiers) {
    part('cone', 'pine', x, y + fy * h, z, h * s, h * 0.34, h * s, 0, rr(0, TAU));
    part('cone', 'snowbank', x, y + (fy + 0.06) * h, z, h * s * 0.55, h * 0.1, h * s * 0.55, 0, rr(0, TAU));
  }
}

function mountainDetails() {
  // Granite boulders scattered across mid slopes.
  for (let i = 0; i < 130; i++) {
    const x = rr(560, 1180);
    const z = rr(-950, 950);
    const y = terrainHeight(x, z);
    if (y < 45 || y > 390 || Math.abs(x - 247) < 55) continue;
    const s = rr(1.5, 5.5);
    const mat = y > 220 ? 'snowrock' : 'granite';
    part('leaf', mat, x, y + s * 0.25, z, s, s * rr(0.55, 0.8), s, rr(0, 3), rr(0, TAU));
  }

  // Conifer treeline on the foothills.
  for (let i = 0; i < 170; i++) {
    const x = rr(470, 900);
    const z = rr(-980, 980);
    const y = terrainHeight(x, z);
    if (y < 8 || y > 150 || Math.abs(x - 247) < 55) continue;
    conifer(x, z, y);
  }

  // Snow cornices: bright drifts along the highest ridges.
  for (let i = 0; i < 40; i++) {
    const x = rr(760, 1150);
    const z = rr(-900, 900);
    const y = terrainHeight(x, z);
    if (y < 260) continue;
    part('sphere', 'snowbank', x, y + 0.4, z, rr(6, 16), rr(0.8, 1.6), rr(4, 9), 0, rr(0, TAU));
  }

  // Shepherd huts with warm windows on a sheltered shelf.
  for (const [hx, hz] of [[700, -120], [748, 168], [648, 428]]) {
    const y = terrainHeight(hx, hz);
    if (y < 5) continue;
    recordBuilding(hx, hz, 9, 7, y + 7, 'mountain hut', { x: hx - 1.6, z: hz + 2.8, base: y + 0.9 });
    box('stone', hx, y + 0.5, hz, 9, 1, 7);
    box('villageWall', hx, y + 2.6, hz, 7, 3.4, 5.4);
    part('roof', 'roofTile', hx, y + 5.4, hz, 5.6, 2.2, 4.4);
    box('dark', hx - 1.6, y + 2.2, hz + 2.76, 1.4, 2.2, 0.12);
    box('warmwindow', hx + 1.4, y + 2.8, hz + 2.76, 1.3, 1.1, 0.12);
    part('cyl', 'trunk', hx + 6.5, y + 2, hz + 2, 0.16, 4, 0.16);
  }

  // Switchback footpath climbing the main face.
  for (let k = 0; k < 55; k++) {
    const x = 600 + k * 8.5;
    const z = Math.sin(k * 0.55) * 70 - 40;
    const y = terrainHeight(x, z);
    if (y < 4 || Math.abs(x - 247) < 55) continue;
    box('paving', x, y + 0.35, z, 9, 0.3, 2.6, Math.cos(k * 0.55) * 0.5);
  }

  // Waterfalls: vertical foam ribbons draped over steep drops.
  diagnostics.waterfalls = [];
  for (const [wx, wz] of [[848, -60], [905, 320]]) {
    const top = terrainHeight(wx + 34, wz);
    const bottom = terrainHeight(wx - 26, wz);
    if (top - bottom < 25) continue;
    const hgt = top - bottom + 14;
    const mat = new T.MeshBasicMaterial({
      map: waterfallTex.clone(), transparent: true, opacity: 0.8,
      depthWrite: false, side: T.DoubleSide,
    });
    mat.map.needsUpdate = true;
    const fall = new T.Mesh(new T.PlaneGeometry(11, hgt), mat);
    fall.position.set(wx, (top + bottom) / 2 + 4, wz);
    fall.rotation.y = 0.35;
    fall.renderOrder = 2;
    scene.add(fall);
    diagnostics.waterfalls.push(mat);
    // Plunge pool at the base.
    part('cyl', 'waterBase', wx - 24, bottom + 0.5, wz, 8, 0.3, 6);
  }
}

function makeSignal(x, z, axis) {
  part('cyl', 'metal', x, 2.45, z, 0.09, 4.9, 0.09);
  box('dark', x, 4.6, z, axis === 'x' ? 0.42 : 0.7, 1.8, axis === 'x' ? 0.7 : 0.42);
  for (const [lamp, y] of [['red', 5.15], ['amber', 4.6], ['green', 4.05]]) {
    for (const side of [-1, 1]) {
      const px = x + (axis === 'x' ? side * 0.24 : 0);
      const pz = z + (axis === 'z' ? side * 0.24 : 0);
      part('signal', `signal${axis}_${lamp}`, px, y, pz,
        axis === 'x' ? 0.08 : 0.22, 0.22, axis === 'z' ? 0.08 : 0.22);
    }
  }
  (diagnostics.trafficSignals ||= []).push({ x, z, axis });
}
