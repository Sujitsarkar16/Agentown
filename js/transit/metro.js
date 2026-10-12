/* Nirmal simulation — js/transit/metro.js
 * Elevated metro viaduct, station and merged-geometry trains. */
'use strict';

let train;
let train2;
let trainParts = [];
let trainSigns = [];

function metro() {
  const z = 90;
  box('concrete', -50, 11.8, z, 900, 1.15, 7);
  for (let x = -470; x <= 345; x += 25) {
    if (roads.some((r) => Math.abs(x - r) < 12)) continue;
    box('concrete', x, 5.75, z, 1.6, 11.5, 1.6);
    box('concrete', x, 11, z, 4.6, 1, 5);
  }
  for (const dz of [-1.5, -0.35, 0.35, 1.5]) box('metal', -50, 12.48, z + dz, 900, 0.12, 0.12);
  for (const s of [-1, 1]) box('concrete', -50, 12.4, z + s * 3.2, 900, 0.7, 0.4);

  // Covered portals conceal the route reset only after the entire train enters.
  for (const [center, end] of [[-453, -501], [333, 381]]) {
    box('stone', center, 17.1, z, 96, 1.1, 9);
    for (const side of [-1, 1]) box('stone', center, 14.7, z + side * 4.3, 96, 4.8, 0.6);
    box('dark', end, 14.5, z, 0.7, 5.5, 9);
  }

  // Station.
  const sx = 120;
  box('stone', sx, 12.8, z, 41, 0.7, 13);
  box('stone', sx, 16.2, z, 43, 0.36, 14);
  for (const s of [-1, 1]) {
    for (let dx = -17; dx <= 17; dx += 8.5) box('metal', sx + dx, 14.55, z + s * 5, 0.15, 3.2, 0.15);
  }
  box('glass', sx, 14.4, z + 5, 37, 2.2, 0.08);
  sign('निर्मल मेट्रो · NIRMAL METRO', sx, 15.35, z + 7.05, 29, 1.3);

  // Stairs descend along the station forecourt, clear of the road.
  for (let i = 0; i < 27; i++) box('stone', sx - 12, 12.4 - i * 0.43, z + 7 + i * 0.67, 5, 0.5, 1.1);
  box('metal', sx - 14.5, 7.1, z + 15, 0.08, 0.08, 20);
  box('metal', sx - 9.5, 7.1, z + 15, 0.08, 0.08, 20);

  function mkTrain(offset) {
    const root = new T.Group();
    const parts = new Map();
    const add = (mat, x, y, z2, w, h, d) => {
      if (!parts.has(mat)) parts.set(mat, []);
      parts.get(mat).push(geoms.box.clone().applyMatrix4(transform(x, y, z2, w, h, d)));
    };
    for (let i = 0; i < 3; i++) {
      const x = i * 11.7;
      add('carWhite', x, 1.45, 0, 11, 2.8, 2.5);
      add('bus', x, 0.4, 0, 11, 0.35, 2.55);
      for (const side of [-1, 1]) {
        add('glass', x, 1.85, side * 1.26, 9, 1.1, 0.05);
        for (let j = -4; j <= 4; j += 2) add('white', x + j, 1.8, side * 1.3, 0.09, 1.2, 0.06);
      }
      add('dark', x + 5.52, 1.8, 0, 0.06, 1.1, 2);
      add('dark', x - 5.52, 1.8, 0, 0.06, 1.1, 2);
    }
    for (const [mat, list] of parts) {
      const merged = new T.BufferGeometry();
      let count = 0;
      let indices = 0;
      for (const g of list) { count += g.attributes.position.count; indices += g.index.count; }
      for (const name of ['position', 'normal', 'uv']) {
        const size = list[0].attributes[name].itemSize;
        const array = new Float32Array(count * size);
        let off = 0;
        for (const g of list) { array.set(g.attributes[name].array, off); off += g.attributes[name].array.length; }
        merged.setAttribute(name, new T.BufferAttribute(array, size));
      }
      const index = new Uint32Array(indices);
      let off = 0;
      let base = 0;
      for (const g of list) {
        for (const k of g.index.array) index[off++] = base + k;
        base += g.attributes.position.count;
        g.dispose();
      }
      merged.setIndex(new T.BufferAttribute(index, 1));
      merged.computeBoundingSphere();
      const mesh = new T.Mesh(merged, mats[mat]);
      mesh.castShadow = mat !== 'glass';
      mesh.receiveShadow = true;
      root.add(mesh);
    }
    root.position.set(offset, 12.7, z - 1);
    scene.add(root);
    return root;
  }

  train = mkTrain(-140);
  train2 = mkTrain(25);
  train2.position.z = z + 1;
  train2.rotation.y = Math.PI;
}
