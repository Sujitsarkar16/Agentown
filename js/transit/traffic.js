/* Nirmal simulation — js/transit/traffic.js
 * Lane loops, vehicle spawning and the fixed-step traffic simulation. */
'use strict';

// Rounded lane loops have exact lengths and continuous position and heading.
function laneLoop(x0, x1, z0, z1, reverse = false) {
  const inset = reverse ? 3 : -3;
  const l = x0 + inset;
  const r = x1 - inset;
  const t = z0 + inset;
  const b = z1 - inset;
  const R = 6;
  const segments = [];
  let total = 0;
  const line = (x, z, dx, dz, length) => {
    segments.push({ start: total, length, x, z, dx, dz });
    total += length;
  };
  const arc = (cx, cz, angle) => {
    const length = (Math.PI * R) / 2;
    segments.push({ start: total, length, cx, cz, angle, arc: true });
    total += length;
  };
  line(l + R, t, 1, 0, r - l - 2 * R);
  arc(r - R, t + R, -Math.PI / 2);
  line(r, t + R, 0, 1, b - t - 2 * R);
  arc(r - R, b - R, 0);
  line(r - R, b, -1, 0, r - l - 2 * R);
  arc(l + R, b - R, Math.PI / 2);
  line(l, b - R, 0, -1, b - t - 2 * R);
  arc(l + R, t + R, Math.PI);
  return {
    length: total,
    reverse,
    sample(s, out = {}) {
      let q = (((reverse ? -s : s) % total) + total) % total;
      let i = 0;
      while (i < segments.length - 1 && q >= segments[i].start + segments[i].length) i++;
      const seg = segments[i];
      q -= seg.start;
      let x; let z; let dx; let dz;
      if (seg.arc) {
        const a = seg.angle + q / R;
        x = seg.cx + R * Math.cos(a);
        z = seg.cz + R * Math.sin(a);
        dx = -Math.sin(a);
        dz = Math.cos(a);
      } else {
        x = seg.x + q * seg.dx;
        z = seg.z + q * seg.dz;
        dx = seg.dx;
        dz = seg.dz;
      }
      if (reverse) { dx = -dx; dz = -dz; }
      out.x = x; out.z = z; out.dx = dx; out.dz = dz;
      out.angle = Math.atan2(dx, dz);
      return out;
    },
  };
}

const routes = [];
for (const spec of [
  [-360, 180, -360, 360], [-270, 90, -270, 270], [-180, 180, -180, 180],
  [-90, 90, -90, 90], [-360, -180, -180, 180], [-180, 0, -360, 0],
  [0, 180, 0, 360], [-360, 180, -90, 90], [-990, -720, 180, 450], [-900, -360, 270, 360],
]) {
  for (const rev of [false, true]) routes.push(laneLoop(...spec, rev));
}
diagnostics.routes = routes;

function overlaps(a, pa, b, pb, pad = 0.4) {
  const dx = pb.x - pa.x;
  const dz = pb.z - pa.z;
  const reach = (a.length + b.length) * 0.5 + 3;
  if (dx * dx + dz * dz > reach * reach) return false;
  const adx = pa.dx; const adz = pa.dz;
  const bdx = pb.dx; const bdz = pb.dz;
  const dot = Math.abs(adx * bdx + adz * bdz);
  const cross = Math.abs(adx * bdz - adz * bdx);
  const al = a.length / 2 + pad; const aw = a.width / 2 + pad;
  const bl = b.length / 2 + pad; const bw = b.width / 2 + pad;
  return Math.abs(dx * adx + dz * adz) <= al + bl * dot + bw * cross
    && Math.abs(-dx * adz + dz * adx) <= aw + bl * cross + bw * dot
    && Math.abs(dx * bdx + dz * bdz) <= bl + al * dot + aw * cross
    && Math.abs(-dx * bdz + dz * bdx) <= bw + al * cross + aw * dot;
}

function vehicle(type, color, route, s) {
  const v = {
    type, route, s, previousS: s, speed: 0,
    desired: type === 'bus' ? 6.5 : type === 'auto' ? 7.1 : 9,
    length: type === 'bus' ? 8.5 : type === 'auto' ? 2.75 : 4.6,
    width: type === 'bus' ? 2.25 : type === 'auto' ? 1.55 : 1.85,
    parts: [], pose: route.sample(s), visible: true,
  };
  const add = (geom, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) => {
    const entry = part(geom, mat, x, y, z, sx, sy, sz, rx, ry, rz, movingBuckets);
    v.parts.push({ ...entry, local: entry.b.entries[entry.index].clone() });
  };
  const bx = (mat, x, y, z, w, h, d) => add('box', mat, x, y, z, w, h, d);

  if (type === 'bus') {
    bx('bus', 0, 1.35, 0, 2.25, 2.3, 8.5);
    bx('carWhite', 0, 2.6, 0, 2.3, 0.24, 8.4);
    for (const side of [-1, 1]) {
      bx('glass', side * 1.14, 1.96, 0, 0.035, 0.95, 7.7);
      for (let q = -3; q <= 3; q += 1.5) bx('bus', side * 1.16, 1.96, q, 0.04, 1.03, 0.07);
    }
    bx('glass', 0, 1.95, 4.26, 1.99, 0.92, 0.045);
    bx('dark', 0, 0.43, 0, 2.3, 0.17, 8.4);
    bx('yellow', 0, 2.4, 4.3, 1.2, 0.23, 0.03);
  } else if (type === 'auto') {
    bx('autoGreen', 0, 0.72, -0.1, 1.55, 0.85, 2.5);
    bx('auto', 0, 1.72, -0.4, 1.62, 0.25, 1.9);
    bx('dark', 0, 1.15, -1.27, 1.48, 1.4, 0.1);
    for (const side of [-1, 1]) bx('metal', side * 0.7, 1.34, 0.2, 0.07, 1.15, 0.07);
    bx('glass', 0, 1.28, 0.69, 1.24, 0.69, 0.08);
    bx('auto', 0, 0.77, 1.0, 1.12, 0.67, 0.65);
    bx('light', 0, 0.83, 1.36, 0.28, 0.17, 0.035);
  } else {
    bx(color, 0, 0.65, 0, 1.85, 0.67, 4.6);
    bx(color, 0, 1.12, -0.28, 1.6, 0.55, 2.5);
    bx('glass', 0, 1.22, 1.01, 1.45, 0.4, 0.05);
    bx('glass', 0, 1.21, -1.55, 1.44, 0.37, 0.05);
    for (const side of [-1, 1]) bx('glass', side * 0.81, 1.24, -0.28, 0.035, 0.34, 2.2);
    bx('chrome', 0, 0.37, 2.26, 1.65, 0.15, 0.06);
  }

  if (type === 'auto') {
    for (const side of [-1, 1]) add('cyl', 'tire', side * 0.78, 0.39, -0.72, 0.33, 0.18, 0.33, 0, 0, Math.PI / 2);
    add('cyl', 'tire', 0, 0.35, 1.04, 0.31, 0.19, 0.31, 0, 0, Math.PI / 2);
  } else {
    for (const side of [-1, 1]) {
      for (const zp of [-1, 1]) {
        const z = zp * (type === 'bus' ? 2.8 : 1.42);
        add('cyl', 'tire', side * (v.width / 2), 0.4, z, 0.38, 0.18, 0.38, 0, 0, Math.PI / 2);
        add('cyl', 'chrome', side * (v.width / 2 + 0.095), 0.4, z, 0.17, 0.022, 0.17, 0, 0, Math.PI / 2);
      }
    }
  }
  for (const side of [-1, 1]) {
    bx('light', side * v.width * 0.32, 0.76, v.length / 2 + 0.028, 0.32, 0.16, 0.035);
    bx('tail', side * v.width * 0.32, 0.75, -v.length / 2 - 0.028, 0.25, 0.14, 0.035);
  }
  return v;
}

function spawnVehicles() {
  for (let i = 0; i < 260; i++) {
    const type = i % 12 === 0 ? 'bus' : i % 5 === 0 ? 'auto' : 'car';
    const route = routes[i % routes.length];
    let s = 0;
    let pose;
    let good = false;
    const shape = {
      length: type === 'bus' ? 8.5 : type === 'auto' ? 2.75 : 4.6,
      width: type === 'bus' ? 2.25 : type === 'auto' ? 1.55 : 1.85,
    };
    for (let tries = 0; tries < 150; tries++) {
      s = rand() * route.length;
      pose = route.sample(s);
      if (!vehicles.some((b) => overlaps(shape, pose, b, b.pose, 1.2))) { good = true; break; }
    }
    if (good) vehicles.push(vehicle(type, pick(['carWhite', 'carRed', 'carBlue', 'carSilver', 'carGold']), route, s));
  }
  vehicles.forEach((v, i) => { v.visible = i < Math.round(vehicles.length * density); });
  for (const b of movingBuckets.values()) {
    b.mesh = new T.InstancedMesh(b.geom, b.mat, b.entries.length);
    b.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    b.mesh.castShadow = true;
    b.mesh.receiveShadow = true;
    b.mesh.frustumCulled = false;
    scene.add(b.mesh);
  }
  updateVehicleMatrices();
  diagnostics.overlaps = overlaps;
}

function green(axis, time) {
  const phase = time % 28;
  return axis === 'x' ? phase < 8 : phase >= 14 && phase < 22;
}

function signalStop(v, time) {
  if (v.pose.x < -420) return false;
  const p = v.pose;
  const axis = Math.abs(p.dx) > 0.85 ? 'x' : Math.abs(p.dz) > 0.85 ? 'z' : null;
  if (!axis || green(axis, time)) return false;
  for (const q of (axis === 'x' ? roads : roadZ)) {
    const pos = axis === 'x' ? p.x : p.z;
    const dir = axis === 'x' ? p.dx : p.dz;
    const dist = (q - pos) * dir;
    if (dist > 10 + v.length / 2 && dist < 14 + v.length / 2 + v.speed * 0.8) return true;
  }
  return false;
}

const vehicleGrid = new Map();
const neighborScratch = [];
const nextPose = {};
const renderPose = {};
function cellKey(p) {
  return (Math.floor(p.x / 24) + 128) * 256 + Math.floor(p.z / 24) + 128;
}
function gridCell(key) {
  let list = vehicleGrid.get(key);
  if (!list) { list = []; vehicleGrid.set(key, list); }
  return list;
}
function nearbyVehicles(p) {
  const cx = Math.floor(p.x / 24);
  const cz = Math.floor(p.z / 24);
  const result = neighborScratch;
  result.length = 0;
  for (let x = cx - 1; x <= cx + 1; x++) {
    for (let z = cz - 1; z <= cz + 1; z++) {
      const list = vehicleGrid.get((x + 128) * 256 + z + 128);
      if (list) for (let i = 0; i < list.length; i++) result.push(list[i]);
    }
  }
  return result;
}

function simulateTraffic(dt, write = true) {
  const count = Math.round(vehicles.length * density);
  for (const list of vehicleGrid.values()) list.length = 0;
  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    const was = v.visible;
    v.visible = i < count;
    if (!v.visible) { v.speed = 0; continue; }
    if (!was) {
      const shown = vehicles.filter((b, j) => j < i && b.visible);
      let good = !shown.some((b) => overlaps(v, v.pose, b, b.pose, 0.8));
      for (let j = 0; !good && j < 200; j++) {
        const candidate = v.route.sample(v.s + j * 9);
        if (!shown.some((b) => overlaps(v, candidate, b, b.pose, 0.8))) {
          v.s = (v.s + j * 9) % v.route.length;
          v.pose = candidate;
          good = true;
        }
      }
      if (!good) { v.visible = false; continue; }
      v.previousS = v.s;
    }
    const key = cellKey(v.pose);
    gridCell(key).push(v);
  }

  for (let i = 0; i < count; i++) {
    const v = vehicles[i];
    if (!v.visible) continue;
    v.previousS = v.s;
    const neighbors = nearbyVehicles(v.pose);
    let desired = signalStop(v, simTime) ? 0 : v.desired;
    // Rutted mud lanes: pick carefully around potholes and puddles.
    if (v.pose.x < -430) desired = Math.min(desired, v.type === 'bus' ? 3.4 : 4.2);
    if (Math.abs(v.pose.dx) > 0.08 && Math.abs(v.pose.dz) > 0.08) desired = Math.min(desired, 3.5);
    for (const b of neighbors) {
      if (v === b) continue;
      const dx = b.pose.x - v.pose.x;
      const dz = b.pose.z - v.pose.z;
      const forward = dx * v.pose.dx + dz * v.pose.dz;
      const lateral = Math.abs(dx * v.pose.dz - dz * v.pose.dx);
      if (forward > 0 && forward < (v.length + b.length) / 2 + 3 + v.speed * 0.75
        && lateral < (v.width + b.width) / 2 + 0.4) {
        desired = Math.min(desired, Math.max(0, (forward - (v.length + b.length) / 2 - 2) * 0.8));
      }
    }
    v.speed = lerp(v.speed, desired, 1 - Math.exp(-dt * (desired < v.speed ? 7 : 1.1)));
    const ds = v.speed * dt;
    const next = v.route.sample(v.s + ds, nextPose);
    let blocked = false;
    for (const b of neighbors) {
      if (v !== b && overlaps(v, next, b, b.pose, 0.5)) { blocked = true; break; }
    }
    if (!blocked) {
      const old = cellKey(v.pose);
      const key = cellKey(next);
      v.s = (v.s + ds) % v.route.length;
      Object.assign(v.pose, next);
      if (old !== key) {
        const list = vehicleGrid.get(old);
        list.splice(list.indexOf(v), 1);
        gridCell(key).push(v);
      }
    } else {
      v.speed = 0;
    }
  }
  if (write) updateVehicleMatrices();
}

function updateVehicleMatrices(alpha = 1) {
  beginDynamicBatches(movingBuckets);
  for (const v of vehicles) {
    if (!v.visible) continue;
    let distance = (v.s - v.previousS + v.route.length) % v.route.length;
    if (distance > 1) distance = 0;
    const p = alpha === 1 ? v.pose : v.route.sample(v.previousS + distance * alpha, renderPose);
    if (!visibleAt(p.x, 2, p.z, 20)) continue;
    dummy.position.set(p.x, 0.25, p.z);
    dummy.rotation.set(0, p.angle, 0);
    dummy.scale.setScalar(1);
    dummy.updateMatrix();
    for (const a of v.parts) {
      tempMat.multiplyMatrices(dummy.matrix, a.local);
      a.b.mesh.setMatrixAt(a.b.renderCount++, tempMat);
    }
  }
  finishDynamicBatches(movingBuckets);
}
