/* Nirmal simulation — js/core/batching.js
 * Spatial GPU batches share compatible materials and cull whole city tiles. */
'use strict';

function transform(x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
  dummy.position.set(x, y, z);
  dummy.rotation.set(rx, ry, rz);
  dummy.scale.set(sx, sy, sz);
  dummy.updateMatrix();
  return dummy.matrix.clone();
}

function part(geom, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0, target = staticBuckets) {
  const key = geom + ':' + mat;
  let b = target.get(key);
  if (!b) {
    b = { geom: geoms[geom], mat: mats[mat], entries: [] };
    target.set(key, b);
  }
  const index = b.entries.length;
  b.entries.push(transform(x, y, z, sx, sy, sz, rx, ry, rz));
  return { b, index };
}

function box(mat, x, y, z, sx, sy, sz, ry = 0) {
  if (['window', 'warmwindow', 'glass'].includes(mat)) {
    if (sz < 0.15) return part('pane', mat, x, y, z, sx, sy, 1, 0, ry);
    if (sx < 0.15) return part('pane', mat, x, y, z, sz, sy, 1, 0, ry + Math.PI / 2);
  }
  if (mat === 'stripe') return part('pane', mat, x, y + sy / 2, z, sx, sz, 1, -Math.PI / 2, ry);
  return part('box', mat, x, y, z, sx, sy, sz, 0, ry);
}

function finishStatic() {
  const batches = new Map();
  const sharedMaterials = new Map();
  const noShadow = new Set(['asphalt', 'paving', 'stripe', 'grass', 'kerb', 'window',
    'warmwindow', 'glass', 'signalX', 'signalZ', 'crop']);
  for (const [key, b] of staticBuckets) {
    const name = key.split(':')[1];
    const m = b.mat;
    // Instance colours replace separate draw calls for otherwise identical paint.
    const share = !m.map && !m.bumpMap && !m.emissive.getHex() && !m.polygonOffset;
    const materialKey = share ? [m.roughness, m.metalness, m.side, m.transparent, m.opacity].join(':') : name;
    let material = m;
    if (share) {
      if (!sharedMaterials.has(materialKey)) {
        const clone = m.clone();
        clone.color.setHex(0xffffff);
        sharedMaterials.set(materialKey, clone);
      }
      material = sharedMaterials.get(materialKey);
    }
    const cast = !noShadow.has(name);
    const batchKey = `${b.geom.uuid}:${materialKey}:${cast}`;
    let batch = batches.get(batchKey);
    if (!batch) {
      batch = { geom: b.geom, mat: material, cast, entries: [], colors: share ? [] : null };
      batches.set(batchKey, batch);
    }
    for (const matrix of b.entries) {
      batch.entries.push(matrix);
      if (share) batch.colors.push(m.color);
    }
    // GPU buffers own the transforms from here; release the boot-only matrices.
    b.entries = [];
  }
  const coarse = new Map([
    [geoms.leaf, new T.IcosahedronGeometry(1, 0)],
    [geoms.leafNear, new T.IcosahedronGeometry(1, 0)],
    [geoms.sphere, new T.SphereGeometry(1, 8, 6)],
    [geoms.cyl, new T.CylinderGeometry(1, 1, 1, 6)],
    [geoms.cone, new T.ConeGeometry(1, 1, 6)],
  ]);
  const makeMesh = (b, geometry = b.geom) => {
    const mesh = new T.InstancedMesh(geometry, b.mat, b.entries.length);
    b.entries.forEach((m, i) => {
      mesh.setMatrixAt(i, m);
      if (b.colors) mesh.setColorAt(i, b.colors[i]);
    });
    mesh.castShadow = b.cast;
    mesh.receiveShadow = true;
    mesh.computeBoundingSphere();
    mesh.matrixAutoUpdate = false;
    scene.add(mesh);
    return mesh;
  };
  let tilesCount = 0;
  for (const b of batches.values()) {
    // Split expensive organic geometry; boxes/windows stay consolidated to keep
    // draw submission cheap even on slow CPUs. Wide views use one coarse batch.
    if (!coarse.has(b.geom) || b.entries.length < 100) { makeMesh(b); continue; }
    const overview = makeMesh(b, coarse.get(b.geom));
    overview.visible = false;
    staticOverviewMeshes.push(overview);
    const tiles = new Map();
    b.entries.forEach((matrix, i) => {
      const e = matrix.elements;
      const key = `${Math.floor(e[12] / 360)},${Math.floor(e[14] / 360)}`;
      let tile = tiles.get(key);
      if (!tile) {
        tile = { geom: b.geom, mat: b.mat, cast: b.cast, entries: [], colors: b.colors ? [] : null };
        tiles.set(key, tile);
      }
      tile.entries.push(matrix);
      if (tile.colors) tile.colors.push(b.colors[i]);
    });
    for (const tile of tiles.values()) {
      const mesh = makeMesh(tile);
      staticDetailMeshes.push({ mesh, near: b.geom, far: coarse.get(b.geom) });
      tilesCount++;
    }
  }
  diagnostics.spatialBatches = tilesCount;
}

// Reused by dynamic batches; conservative margins retain nearby cast shadows.
const staticOverviewMeshes = [];
const staticDetailMeshes = [];
const renderFrustum = new T.Frustum();
const renderProjection = new T.Matrix4();
const renderSphere = new T.Sphere();
function updateRenderVisibility() {
  camera.updateMatrixWorld();
  renderProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  renderFrustum.setFromProjectionMatrix(renderProjection);
  const overview = orbit.radius > 700 && orbit.x > -500 && orbit.x < 400;
  for (const mesh of staticOverviewMeshes) mesh.visible = overview;
  for (const b of staticDetailMeshes) {
    b.mesh.visible = !overview;
    if (!overview) {
      const bounds = b.mesh.boundingSphere;
      const distance = camera.position.distanceTo(bounds.center) - bounds.radius;
      b.mesh.geometry = distance > 500 ? b.far : b.near;
    }
  }
}

function visibleAt(x, y, z, radius) {
  renderSphere.center.set(x, y, z);
  renderSphere.radius = radius;
  return renderFrustum.intersectsSphere(renderSphere);
}

function beginDynamicBatches(buckets) {
  for (const b of buckets.values()) b.renderCount = 0;
}

function finishDynamicBatches(buckets) {
  for (const b of buckets.values()) {
    b.mesh.count = b.renderCount;
    b.mesh.visible = b.renderCount > 0;
    if (b.renderCount) {
      b.mesh.instanceMatrix.clearUpdateRanges();
      b.mesh.instanceMatrix.addUpdateRange(0, b.renderCount * 16);
      b.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

// Crisp offline signage makes community buildings recognisable up close.
const signMaterials = new Map();
function sign(text, x, y, z, w, h, angle = 0) {
  let mat = signMaterials.get(text);
  if (!mat) {
    const map = canvas(1024, 128, (c, cw, ch) => {
      c.fillStyle = '#244b42'; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = '#d6c38d'; c.lineWidth = 4; c.strokeRect(8, 8, cw - 16, ch - 16);
      c.fillStyle = '#fff6dd'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = 'bold 44px Arial, sans-serif';
      c.fillText(text, cw / 2, ch / 2 + 2, cw - 48);
    });
    mat = new T.MeshStandardMaterial({ map, roughness: 0.8, side: T.DoubleSide, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0.25 });
    signMaterials.set(text, mat);
  }
  const mesh = new T.Mesh(geoms.pane, mat);
  mesh.position.set(x, y, z); mesh.scale.set(w, h, 1); mesh.rotation.y = angle;
  mesh.updateMatrix(); mesh.matrixAutoUpdate = false;
  scene.add(mesh);
  (diagnostics.signs ||= []).push({ text, x, y, z });
  return mesh;
}
