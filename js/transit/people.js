/* Nirmal simulation — js/transit/people.js
 * Pedestrians plus per-frame ambient animation (flag, river, fountain, trains, signals). */
'use strict';

function pedestrians() {
  for (let i = 0; i < 145; i++) {
    const rural = i > 105;
    const axis = i % 2;
    const r = pick(axis ? (rural ? villageZ : roadZ) : (rural ? villageX : roads));
    const side = rural ? 7.4 : 10.9;
    const x = axis ? rr(rural ? -977 : -375, rural ? -730 : 195) : r + (i % 3 ? side : -side);
    const z = axis ? r + (i % 3 ? side : -side) : rr(rural ? 190 : -390, rural ? 440 : 390);
    if ((axis ? (rural ? villageX : roads) : (rural ? villageZ : roadZ))
      .some((q) => Math.abs((axis ? x : z) - q) < 24)) continue;
    const w = { x, z, axis, offset: rand() * TAU, parts: [], rural };
    const shirt = pick(['shirt1', 'shirt2', 'shirt3']);
    const add = (geom, mat, px, py, pz, sx, sy, sz, limb = 0) => {
      const a = part(geom, mat, px, py, pz, sx, sy, sz, 0, 0, 0, pedestrianBuckets);
      w.parts.push({ ...a, x: px, y: py, z: pz, sx, sy, sz, limb });
    };
    add('sphere', 'skin', 0, 1.55, 0, 0.16, 0.19, 0.16);
    add('box', shirt, 0, 1.05, 0, 0.42, 0.62, 0.26);
    for (const s of [-1, 1]) {
      add('box', 'trousers', s * 0.12, 0.37, 0, 0.15, 0.7, 0.17, s);
      add('box', shirt, s * 0.29, 1.04, 0, 0.11, 0.5, 0.12, -s * 2);
    }
    walkers.push(w);
  }
  for (const b of pedestrianBuckets.values()) {
    b.mesh = new T.InstancedMesh(b.geom, b.mat, b.entries.length);
    b.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    b.mesh.castShadow = true;
    b.mesh.receiveShadow = true;
    b.mesh.frustumCulled = false;
    scene.add(b.mesh);
  }
  updatePedestrians(0);
  diagnostics.pedestrians = walkers.length;
}

function updatePedestrians(t) {
  beginDynamicBatches(pedestrianBuckets);
  if (!peopleOn) { finishDynamicBatches(pedestrianBuckets); return; }
  for (const w of walkers) {
    if (!visibleAt(w.x, 1.5, w.z, 14)) continue;
    const delta = Math.sin(t * 0.12 + w.offset) * 9;
    const angle = (w.axis ? Math.PI / 2 : 0) + (Math.cos(t * 0.12 + w.offset) < 0 ? Math.PI : 0);
    dummy.position.set(w.x + (w.axis ? delta : 0), 0.45, w.z + (w.axis ? 0 : delta));
    dummy.rotation.set(0, angle, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    rootMat.copy(dummy.matrix);
    const gait = Math.sin(t * 4 + w.offset) * 0.27;
    for (const a of w.parts) {
      const swing = a.limb
        ? gait * (a.limb < 0 ? -1 : 1) * (Math.abs(a.limb) === 2 ? -1 : 1)
        : 0;
      dummy.position.set(a.x, a.y, a.z);
      dummy.rotation.set(swing, 0, 0);
      dummy.scale.set(a.sx, a.sy, a.sz);
      dummy.updateMatrix();
      tempMat.multiplyMatrices(rootMat, dummy.matrix);
      a.b.mesh.setMatrixAt(a.b.renderCount++, tempMat);
    }
  }
  finishDynamicBatches(pedestrianBuckets);
}

let lastSignalPhase = -1;
function updateAmbient(t) {
  if (diagnostics.flagMaterial?.userData.shader) {
    diagnostics.flagMaterial.userData.shader.uniforms.uTime.value = t;
  }
  river.material.uniforms.uTime.value = t;

  // Heritage fountain spray.
  const sprayShader = fountainPoints.material.userData.shader;
  if (sprayShader) sprayShader.uniforms.uTime.value = t;

  updatePedestrians(t);

  // Mountain mist drift, cloud caps and waterfall scroll.
  updateMountainFog(t);
  if (diagnostics.waterfalls) {
    for (const w of diagnostics.waterfalls) w.map.offset.y = (t * 0.35) % 1;
  }

  // Metro trains loop between their portals.
  const trainP = (t * 7) % 880;
  train.position.x = -500 + trainP;
  train2.position.x = 380 - ((t * 7 + 260) % 880);
  train.visible = train.position.x > -435 && train.position.x < 291;
  train2.visible = train2.position.x > -411 && train2.position.x < 315;

  // Traffic-light colours with an amber phase.
  const p = t % 28;
  const phase = p < 8 ? 0 : p < 10 ? 1 : p < 14 ? 2 : p < 22 ? 3 : p < 24 ? 4 : 5;
  if (phase === lastSignalPhase) return;
  lastSignalPhase = phase;
  for (const s of signalMats) {
    const on = green(s.axis, t);
    const amber = s.axis === 'x' ? p >= 8 && p < 10 : p >= 22 && p < 24;
    const active = s.lamp === (on ? 'green' : amber ? 'amber' : 'red');
    s.mat.color.set(s.color).multiplyScalar(active ? 1 : 0.18);
    s.mat.emissiveIntensity = active ? 2 : 0.02;
  }
}
