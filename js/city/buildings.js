/* Nirmal — varied city architecture, from stepped towers to courtyard homes. */
'use strict';

function recordBuilding(x, z, w, d, h, type, entrance = {}) {
  buildingBounds.push({ x, z, w, d, h, type, entrance, ownerSectorCode: buildingSector });
  reservations.push({ x, z, w, d });
  diagnostics.buildings++;
}

// Built once into the existing static instance buffers: no per-frame gate work.
function buildingEntrances() {
  diagnostics.entrances = [];
  for (const b of buildingBounds) {
    const e = b.entrance;
    const rural = ['village house', 'mud hut', 'mountain lodge', 'mountain hut'].includes(b.type);
    const small = rural || b.type === 'society gatehouse';
    const angle = e.angle || 0;
    const cs = Math.cos(angle); const sn = Math.sin(angle);
    const x = e.x ?? b.x;
    const z = e.z ?? b.z + b.d / 2;
    const base = e.base ?? (rural ? 0.35 : 0.7);
    const width = e.width ?? (small ? 1.5 : b.type === 'document office' ? 5 : 3.2);
    const height = e.height ?? (small ? 2.2 : 2.9);
    const frame = rural ? 'wood' : 'stone';
    const put = (mat, lx, y, lz, w, h, d) =>
      box(mat, x + lx * cs + lz * sn, base + y, z - lx * sn + lz * cs, w, h, d, angle);

    // An opaque recessed doorway masks ground-floor windows behind the entrance.
    put('dark', 0, height / 2, 0.09, width + 0.24, height, 0.2);
    put(rural ? 'wood' : 'glass', 0, height / 2, 0.22, width - 0.12, height - 0.12, 0.1);
    for (const s of [-1, 1]) {
      put(frame, s * (width / 2 + 0.2), height / 2, 0.3, 0.32, height + 0.3, 0.6);
      // Framed double gate leaves with vertical bars, a centre seam and handles.
      put('metal', s * width / 4, 0.18, 0.32, width / 2 - 0.05, 0.12, 0.09);
      put('metal', s * width / 4, height - 0.18, 0.32, width / 2 - 0.05, 0.12, 0.09);
      for (let i = 0; i < 3; i++) {
        put(rural ? 'wood' : 'metal', s * (0.06 + i * (width / 2 - 0.1) / 3),
          height / 2, 0.32, 0.055, height - 0.3, 0.09);
      }
      put('chrome', s * 0.16, height * 0.46, 0.4, 0.055, 0.32, 0.07);
    }
    put(frame, 0, height + 0.1, 0.35, width + 0.75, 0.25, 0.8);
    put(rural ? 'roofTile' : 'ivory', 0, height + 0.34, 0.65, width + 1, 0.18, 1.5);
    // Compact thresholds stay within the existing building forecourts.
    put('stone', 0, -0.12, 0.65, width + 0.8, 0.24, 1.3);
    put('stone', 0, -0.3, 1.15, width + 1, 0.18, 0.65);
    const entrance = { building: diagnostics.entrances.length, type: b.type,
      x, z, base, angle, width, height, depth: 1.5 };
    diagnostics.entrances.push(entrance);
    e.built = true;
  }
}

function facade(x, z, w, d, base, h, modern, variant, col) {
  box(col, x, base + h / 2, z, w, h, d);
  const floors = Math.max(1, Math.floor((h - 1) / 3.6));
  const cols = Math.max(2, Math.floor(w / 3.8));
  const rows = Math.max(2, Math.floor(d / 3.8));
  for (let f = 0; f < floors; f++) {
    const y = base + 2 + f * 3.6;
    if (y + 1 > base + h) continue;
    if (modern && variant % 3 === 0) box('ivory', x, y + 1.1, z, w + 0.15, 0.2, d + 0.15);
    for (const s of [-1, 1]) {
      for (let j = 0; j < cols; j++) {
        const wx = x - w / 2 + (j + 0.5) * w / cols;
        box(modern ? 'window' : 'warmwindow', wx, y, z + s * (d / 2 + 0.03), w / cols * (modern ? 0.79 : 0.52), modern ? 2.25 : 1.5, 0.06);
        if (!modern || variant === 4) {
          box(modern ? 'ivory' : 'terracotta', wx, y - 0.85, z + s * (d / 2 + 0.48), w / cols * 0.8, 0.16, 1);
          if (!modern && variant % 2 === 0) box('metal', wx, y - 0.4, z + s * (d / 2 + 0.95), w / cols * 0.75, 0.55, 0.07);
        }
      }
      for (let j = 0; j < rows; j++) {
        box(modern ? 'window' : 'warmwindow', x + s * (w / 2 + 0.03), y, z - d / 2 + (j + 0.5) * d / rows, 0.06, 1.8, d / rows * 0.65);
      }
    }
  }
  box('stone', x, base + h + 0.12, z, w + 0.4, 0.24, d + 0.4);
}

function roofGarden(x, z, w, d, y) {
  box('grass', x, y + 0.22, z, w * 0.65, 0.18, d * 0.6);
  for (const s of [-1, 1]) {
    box('stone', x + s * w * 0.36, y + 0.35, z, 1, 0.6, d * 0.75);
    box('hedge', x + s * w * 0.36, y + 0.8, z, 0.85, 0.7, d * 0.7);
  }
}

function building(x, z, w, d, h, style, idx) {
  const modern = style === 'modern';
  const variant = idx % (modern ? 6 : 5);
  const col = modern ? ['ivory', 'concrete', 'stone', 'mintWall', 'white', 'brick'][variant]
    : ['sand', 'peachWall', 'ivory', 'brick', 'mintWall'][variant];
  const designs = modern ? ['stepped tower', 'twin-wing office', 'rounded tower', 'terraced office', 'balcony tower', 'brick loft']
    : ['balcony haveli', 'tiled townhouse', 'courtyard house', 'brick arcade', 'garden residence'];
  let entryX = x;
  let entryZ = z + d / 2 + 0.06;
  if (modern && variant === 1) entryX -= w * 0.29;
  if (modern && variant === 2) entryZ = z + Math.min(w, d) * 0.47 + 0.08;
  if (!modern && variant === 2) entryZ = z - d * 0.12 + 0.06;
  recordBuilding(x, z, w + 2, d + 2, h + 4, style, { x: entryX, z: entryZ });
  buildingBounds[buildingBounds.length - 1].design = designs[variant];
  diagnostics.architecture ||= {};
  diagnostics.architecture[designs[variant]] = (diagnostics.architecture[designs[variant]] || 0) + 1;
  box('paving', x, 0.31, z, w + 5, 0.15, d + 5);
  box('stone', x, 0.5, z, w + 0.8, 0.5, d + 0.8);
  if (modern && variant === 0) {
    facade(x, z, w, d, 0.7, h * 0.4, true, variant, col);
    facade(x - w * 0.07, z - d * 0.08, w * 0.8, d * 0.78, h * 0.4 + 0.7, h * 0.33, true, variant, col);
    facade(x - w * 0.12, z - d * 0.13, w * 0.6, d * 0.55, h * 0.73 + 0.7, h * 0.27, true, variant, col);
    roofGarden(x, z + d * 0.37, w * 0.75, d * 0.18, h * 0.4 + 1);
  } else if (modern && variant === 1) {
    facade(x - w * 0.29, z, w * 0.42, d, 0.7, h, true, variant, col);
    facade(x + w * 0.29, z, w * 0.42, d * 0.82, 0.7, h * 0.78, true, variant, 'stone');
    box('glass', x, h * 0.38, z, w * 0.2, h * 0.65, d * 0.55);
    box('metal', x, h * 0.56, z, w * 0.45, 0.6, d * 0.5);
  } else if (modern && variant === 2) {
    const radius = Math.min(w, d) * 0.47;
    part('cyl', 'glass', x, h / 2 + 0.7, z, radius, h, radius);
    for (let y = 0.7; y < h + 1; y += 3.6) part('cyl', 'ivory', x, y, z, radius + 0.3, 0.24, radius + 0.3);
    for (let j = 0; j < 12; j++) {
      const a = j * TAU / 12;
      box('metal', x + Math.sin(a) * radius, h / 2 + 0.7, z + Math.cos(a) * radius, 0.18, h, 0.18);
      part('pane', 'window', x + Math.sin(a) * (radius + 0.03), h / 2, z + Math.cos(a) * (radius + 0.03), radius * 0.38, h * 0.9, 1, 0, a);
    }
    part('cyl', 'white', x, h + 0.9, z, radius + 0.4, 0.5, radius + 0.4);
  } else if (modern && variant === 3) {
    for (let i = 0; i < 3; i++) {
      const depth = d * (1 - i * 0.22);
      const zz = z - i * d * 0.11;
      facade(x, zz, w * (1 - i * 0.08), depth, 0.7 + i * h / 3, h / 3, true, variant, col);
      if (i < 2) roofGarden(x, z + d * (0.39 - i * 0.23), w * 0.8, d * 0.18, 0.7 + (i + 1) * h / 3);
    }
  } else if (!modern && variant === 2) {
    facade(x, z - d * 0.31, w, d * 0.38, 0.7, h, false, variant, col);
    for (const s of [-1, 1]) facade(x + s * w * 0.34, z + d * 0.13, w * 0.32, d * 0.5, 0.7, h * 0.72, false, variant, col);
    box('grass', x, 0.55, z + d * 0.12, w * 0.3, 0.12, d * 0.35);
    planter(x, z + d * 0.13, 2.2, 2.2);
  } else {
    facade(x, z, w, d, 0.7, h, modern, variant, col);
    if (modern && variant === 4) {
      for (let y = 4; y < h; y += 7.2) {
        box('ivory', x, y, z + d / 2 + 0.55, w, 0.25, 1.3);
        box('hedge', x + w * 0.28, y + 0.5, z + d / 2 + 0.7, w * 0.25, 0.65, 0.55);
      }
    }
    if (modern && variant === 5) {
      for (const s of [-1, 1]) box('dark', x + s * w * 0.38, h / 2 + 0.5, z + d / 2 + 0.15, 0.5, h, 0.5);
      box('metal', x, h + 1.2, z, w * 0.72, 0.25, d * 0.7);
    }
    if (!modern && variant === 1) part('roof', 'roofTile', x, h + 1.7, z, w * 0.75, 2.3, d * 0.75);
    if (!modern && variant === 0) {
      for (const s of [-1, 1]) {
        box('stone', x + s * w * 0.42, h / 2, z + d / 2 + 0.45, 0.65, h, 0.7);
        part('dome', 'terracotta', x + s * w * 0.36, h + 0.6, z, w * 0.14, 1.5, d * 0.18);
      }
    }
    if (!modern && variant === 4) roofGarden(x, z, w, d, h + 0.8);
  }
  if (!(modern && variant === 2) && !(!modern && variant === 1)) {
    box('metal', x, h + 1.3, z - d * 0.12, w * 0.35, 0.2, d * 0.28);
    part('box', 'solar', x, h + 1.5, z - d * 0.12, w * 0.36, 0.12, d * 0.3, 0.15);
  }
  if (h < 30) {
    const texts = ['NEEM LIBRARY', 'NIRMAL CO-OP BANK', 'NEEM CAFE', 'SURYA BHAVAN', 'CITY HEALTH CENTRE', 'LOCAL MARKET'];
    sign(texts[idx % texts.length], x, 3.9, z + d / 2 + 0.18, w * 0.83, 1.15);
  }
  for (const s of [-1, 1]) planter(x + s * (w / 2 + 1.7), z + d / 2 + 1.5, 1.6, 1.6);
}

function cityBlocks() {
  buildSectorDistrict('City');
  // Spaced riverbank skyline; footprints cannot overlap.
  for (let i = 0; i < 6; i++) building(350 + (i % 2) * 55, -190 + i * 68, rr(17, 25), 18, rr(22, 55), 'modern', i);
}

// Shared construction patterns; each sector file owns its style and plot choices.
function cityResidentialSector(sector, layout) {
  const cx = sector.x; const cz = sector.z;
  const modern = layout.style === 'modern';
  let index = 0;
  if (layout.kind === 'outer') {
    const plots = [[-17, -18], [17, -18], [0, 17]];
    for (let i = 0; i < plots.length; i++) {
      const [dx, dz] = plots[i];
      if (layout.reservedPlots?.includes(i)) continue;
      if (i !== layout.plot) {
        box('grass', cx + dx, 0.43, cz + dz, 22, 0.16, 21);
        planter(cx + dx, cz + dz, 3, 3);
      } else {
        building(cx + dx, cz + dz, rr(16, 20), rr(15, 19), modern ? rr(36, 79) : rr(11, 25), layout.style, layout.designs[index++]);
      }
    }
    for (const [dx, dz] of [[-26, 18], [26, 18], [0, -28]]) tree(cx + dx, cz + dz, rr(5, 7));
    box('grass', cx, 0.43, cz + 29, 50, 0.16, 4);
    return;
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    if (layout.plots.some(p => p[0] === sx && p[1] === sz)) {
      building(cx + sx * 17, cz + sz * 17, rr(18, 22), rr(18, 22), modern ? rr(47, 94) : rr(12, 26), layout.style, layout.designs[index++]);
    } else {
      box('grass', cx + sx * 17, 0.43, cz + sz * 17, 24, 0.16, 24);
      bench(cx + sx * 17, cz + sz * 17);
    }
  }
  for (const s of [-1, 1]) { tree(cx + s * 29, cz, 6); tree(cx, cz + s * 29, 6); }
  box('paving', cx, 0.39, cz, 5, 0.1, 60);
  box('paving', cx, 0.4, cz, 60, 0.1, 5);
}
