/* Societies, civic services and safe, colourful places to learn and play. */
'use strict';

const documentOfficeLocation = { x: -45, z: -135, view: 9 };

function documentOffice(cx, cz) {
  communitySite('product office', cx, cz, 'Document Studio');
  box('grass', cx, 0.46, cz, 62, 0.18, 62);
  box('paving', cx, 0.6, cz + 18, 54, 0.16, 26);
  recordBuilding(cx, cz - 6, 40, 30, 29, 'document office', { z: cz + 8.9, height: 4.4 });
  facade(cx, cz - 6, 39, 29, 0.7, 21, true, 0, 'ivory');
  facade(cx - 7, cz - 9, 23, 20, 21.7, 6, true, 0, 'mintWall');
  box('policeBlue', cx, 3.7, cz + 8.65, 39, 5.8, 0.2);
  box('glass', cx, 3.3, cz + 8.82, 9, 4.5, 0.08);
  box('ivory', cx, 5.8, cz + 11, 15, 0.5, 6);
  for (const s of [-1, 1]) box('metal', cx + s * 6.5, 3, cz + 13, 0.25, 5.5, 0.25);
  sign('DOCUMENT STUDIO', cx, 10.5, cz + 8.85, 33, 2.5);
  sign('CONVERT · EDIT · CREATE', cx, 7.6, cz + 8.85, 24, 1.1);
  roofGarden(cx + 11, cz - 4, 14, 22, 22);
  box('solar', cx - 7, 28.5, cz - 9, 15, 0.2, 9);
  // A paper-stack roof sculpture distinguishes this product office from homes.
  for (let i = 0; i < 3; i++) box(i === 1 ? 'courtBlue' : 'white', cx + 10, 25 + i * 0.7, cz + 2 - i, 8, 0.4, 6, i * 0.1);
  for (const s of [-1, 1]) { tree(cx + s * 26, cz + 21, 9); bench(cx + s * 17, cz + 19); planter(cx + s * 20, cz + 10, 3, 6); }
  box('paving', cx, 0.7, cz + 24, 8, 0.16, 15);
  const hitbox = new T.Mesh(new T.BoxGeometry(40, 29, 30), new T.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }));
  hitbox.position.set(cx, 14.5, cz - 6);
  hitbox.userData.product = 'documents';
  scene.add(hitbox);
  diagnostics.documentOffice = { ...documentOfficeLocation, mesh: hitbox };
}

function communitySite(type, x, z, name) {
  (diagnostics.community ||= []).push({ type, x, z, name });
}

function campusFence(cx, cz, w = 62, d = 62) {
  for (const s of [-1, 1]) {
    box('stone', cx + s * w / 2, 0.8, cz, 0.5, 1, d);
    box('metal', cx + s * w / 2, 1.6, cz, 0.12, 0.6, d);
    box('stone', cx, 0.8, cz - d / 2, w, 1, 0.5);
    box('stone', cx + s * (w / 4 + 3), 0.8, cz + d / 2, w / 2 - 6, 1, 0.5);
    for (let q = -d / 2; q <= d / 2; q += 5) box('stone', cx + s * w / 2, 1.25, cz + q, 0.8, 2, 0.8);
  }
}

function playground(x, z, w = 21, d = 17) {
  communitySite('playground', x, z, 'Neighbourhood playground');
  box('rubber', x, 0.58, z, w, 0.16, d);
  part('cyl', 'courtBlue', x - w * 0.18, 0.69, z, w * 0.23, 0.04, d * 0.32);
  // Two-seat swing set.
  for (const dx of [-3, 3]) for (const dz of [-1.6, 1.6]) {
    part('cyl', 'playRed', x + dx, 2.15, z - 3 + dz, 0.09, 3.7, 0.09, dz > 0 ? -0.35 : 0.35);
  }
  box('yellow', x, 3.85, z - 3, 7, 0.22, 0.22);
  for (const dx of [-1.5, 1.5]) {
    for (const side of [-1, 1]) box('metal', x + dx + side * 0.45, 2.3, z - 3, 0.045, 2.9, 0.045);
    box('courtBlue', x + dx, 0.93, z - 3, 1.1, 0.18, 0.55);
  }
  // Slide tower, ladder and sloping slide.
  const sx = x + w * 0.3;
  box('yellow', sx, 2.4, z + 1, 2.1, 0.18, 2);
  for (const a of [-0.85, 0.85]) for (const b of [-0.8, 0.8]) box('playRed', sx + a, 1.6, z + 1 + b, 0.13, 2.5, 0.13);
  part('roof', 'courtBlue', sx, 3.8, z + 1, 1.7, 1.2, 1.7);
  part('box', 'yellow', sx, 1.6, z + 3.2, 1.3, 0.15, 4.7, 0.55);
  for (const s of [-1, 1]) {
    part('box', 'playRed', sx + s * 0.72, 1.75, z + 3.2, 0.08, 0.35, 4.7, 0.55);
    box('metal', sx + s * 0.7, 1.5, z - 0.4, 0.08, 2.2, 0.08);
  }
  for (let y = 0.7; y < 2.6; y += 0.35) box('metal', sx, y, z - 0.4, 1.5, 0.07, 0.07);
  // Seesaw and colourful stepping stones.
  part('cone', 'courtBlue', x - 4, 1, z + 4, 0.65, 0.7, 0.65);
  part('box', 'playRed', x - 4, 1.35, z + 4, 4.7, 0.16, 0.5, 0, 0, 0.12);
  for (let i = 0; i < 4; i++) part('cyl', i % 2 ? 'yellow' : 'courtBlue', x - w / 2 + 2 + i * 2, 0.82, z + d / 2 - 1.5, 0.55, 0.3, 0.55);
}

function sportsCourt(x, z, w = 24, d = 18) {
  box('courtBlue', x, 0.57, z, w, 0.14, d);
  box('courtGreen', x, 0.66, z, w - 2, 0.04, d - 2);
  for (const s of [-1, 1]) {
    box('stripe', x, 0.7, z + s * (d / 2 - 1.2), w - 2.4, 0.02, 0.1);
    box('stripe', x + s * (w / 2 - 1.2), 0.7, z, 0.1, 0.02, d - 2.4);
    // Football goals.
    for (const dz of [-2, 2]) box('white', x + s * (w / 2 - 1.2), 1.6, z + dz, 0.12, 1.8, 0.12);
    box('white', x + s * (w / 2 - 1.2), 2.5, z, 0.12, 0.12, 4.1);
  }
  box('stripe', x, 0.7, z, 0.1, 0.02, d - 2.4);
  part('torus', 'white', x, 0.72, z, 2.5, 2.5, 2.5, Math.PI / 2);
}

function society(cx, cz, idx) {
  const name = ['GULMOHAR RESIDENCY', 'LOTUS HEIGHTS', 'ASHOKA GREENS'][idx % 3];
  communitySite('society', cx, cz, name);
  box('grass', cx, 0.46, cz, 62, 0.18, 62);
  campusFence(cx, cz);
  // Three different-height apartment wings around a shared garden.
  for (const [dx, dz, h] of [[-20, -13, 34], [20, -13, 43], [0, -23, 27]]) {
    const w = dx === 0 ? 17 : 15;
    const d = dx === 0 ? 13 : 22;
    recordBuilding(cx + dx, cz + dz, w + 2, d + 2, h + 3, 'society apartment', { z: cz + dz + d / 2 + 0.08 });
    facade(cx + dx, cz + dz, w, d, 0.7, h, false, 0, dx < 0 ? 'peachWall' : dx > 0 ? 'mintWall' : 'ivory');
    roofGarden(cx + dx, cz + dz, w, d, h + 1);
    for (let y = 4; y < h; y += 3.6) box('ivory', cx + dx, y, cz + dz + d / 2 + 0.7, w, 0.22, 1.4);
  }
  box('paving', cx, 0.65, cz + 18, 6, 0.14, 26);
  playground(cx - 16, cz + 16, 19, 16);
  part('cyl', 'stone', cx + 16, 0.6, cz + 12, 6.5, 0.3, 6.5);
  part('cyl', 'waterBase', cx + 16, 0.79, cz + 12, 5.8, 0.05, 5.8);
  for (const dz of [-2, 27]) { tree(cx + 22, cz + dz, 7); bench(cx + 14, cz + dz); }
  recordBuilding(cx + 12, cz + 27, 6, 5, 4, 'society gatehouse', { z: cz + 29.1, base: 0.5 });
  box('ivory', cx + 12, 1.9, cz + 27, 5, 2.8, 4);
  box('glass', cx + 12, 2.1, cz + 29.05, 3.8, 1.1, 0.1);
  box('terracotta', cx + 12, 3.6, cz + 27, 6, 0.3, 5);
  for (const s of [-1, 1]) box('stone', cx + s * 5, 2.4, cz + 30, 0.6, 4, 0.6);
  sign(name, cx, 4.2, cz + 30.5, 14, 1.4);
}

function schoolCampus(cx, cz, idx) {
  const name = idx % 2 ? 'NIRMAL PUBLIC SCHOOL' : 'VIDYA MANDIR SCHOOL';
  communitySite('school', cx, cz, name);
  box('grass', cx, 0.46, cz, 62, 0.18, 62);
  campusFence(cx, cz);
  for (const [dx, dz, w, d, h] of [[0, -20, 48, 14, 10], [-21, -2, 10, 22, 7], [21, -2, 10, 22, 7]]) {
    recordBuilding(cx + dx, cz + dz, w, d, h + 2, 'school');
    facade(cx + dx, cz + dz, w, d, 0.7, h, false, 3, 'schoolWall');
    box('playRed', cx + dx, h + 1, cz + dz, w + 0.5, 0.4, d + 0.5);
    box('courtBlue', cx + dx, 1.2, cz + dz, w + 0.1, 1, d + 0.1);
    box('solar', cx + dx, h + 1.4, cz + dz, w * 0.5, 0.15, d * 0.4);
  }
  box('paving', cx, 0.57, cz, 28, 0.12, 12);
  sportsCourt(cx - 14, cz + 19, 25, 19);
  playground(cx + 16, cz + 19, 19, 18);
  sign(name, cx, 6.5, cz - 12.9, 24, 1.9);
  sign('LEARN · PLAY · GROW', cx, 2.7, cz + 30.5, 15, 1.3);
  for (const s of [-1, 1]) { tree(cx + s * 28, cz + 1, 6); bench(cx + s * 8, cz + 5); }
  // Flag and a parked yellow school bus in the entrance forecourt.
  part('cyl', 'metal', cx, 4.2, cz - 1, 0.05, 7.4, 0.05);
  for (let i = 0; i < 3; i++) box(['terracotta', 'white', 'courtGreen'][i], cx + 1.1, 7.4 - i * 0.42, cz - 1, 2.2, 0.42, 0.06);
  box('yellow', cx + 10, 1.65, cz + 3, 6, 2, 2.5);
  box('glass', cx + 10, 2.2, cz + 4.28, 4.8, 0.7, 0.08);
  for (const dx of [-2, 2]) for (const s of [-1, 1]) part('cyl', 'tire', cx + 10 + dx, 0.95, cz + 3 + s * 1.2, 0.5, 0.2, 0.5, Math.PI / 2);
}

function policeStation(cx, cz, idx) {
  const name = idx % 2 ? 'NIRMAL POLICE · NORTH' : 'NIRMAL POLICE STATION';
  communitySite('police station', cx, cz, name);
  box('paving', cx, 0.47, cz, 62, 0.16, 62);
  campusFence(cx, cz);
  recordBuilding(cx, cz - 11, 39, 24, 11, 'police station', { z: cz + 0.65 });
  facade(cx, cz - 11, 38, 23, 0.7, 8, false, 3, 'ivory');
  box('policeBlue', cx, 1.1, cz - 11, 38.1, 1.1, 23.1);
  box('policeBlue', cx, 8.9, cz - 11, 39, 0.6, 24);
  box('ivory', cx, 5.1, cz + 2, 12, 0.4, 5);
  for (const s of [-1, 1]) box('stone', cx + s * 5, 2.7, cz + 3.5, 0.6, 4.5, 0.6);
  sign(name, cx, 6.7, cz + 0.65, 26, 1.6);
  sign('PUBLIC ASSISTANCE · 112', cx, 2.5, cz + 30.5, 19, 1.3);
  part('cyl', 'metal', cx + 13, 10.7, cz - 12, 0.05, 5, 0.05);
  for (let i = 0; i < 3; i++) box(['terracotta', 'white', 'courtGreen'][i], cx + 14.1, 12.4 - i * 0.42, cz - 12, 2.2, 0.42, 0.06);
  for (const dx of [-16, -8, 0]) {
    box('stripe', cx + dx, 0.59, cz + 17, 0.1, 0.02, 9);
    box('carWhite', cx + dx + 3, 1.3, cz + 17, 2.6, 1.5, 5);
    box('policeBlue', cx + dx + 3, 1.1, cz + 19.52, 2.5, 0.3, 0.05);
    box('glass', cx + dx + 3, 2, cz + 17, 2.3, 0.65, 2.5);
    box('playRed', cx + dx + 2.6, 2.45, cz + 17, 0.6, 0.18, 0.3);
    box('courtBlue', cx + dx + 3.4, 2.45, cz + 17, 0.6, 0.18, 0.3);
    for (const s of [-1, 1]) for (const dz of [-1.5, 1.5]) part('cyl', 'tire', cx + dx + 3 + s * 1.25, 0.9, cz + 17 + dz, 0.45, 0.22, 0.45, 0, 0, Math.PI / 2);
  }
  box('grass', cx + 21, 0.56, cz + 14, 13, 0.12, 25);
  tree(cx + 21, cz + 8, 8); tree(cx + 21, cz + 22, 7); bench(cx + 16, cz + 16, Math.PI / 2);
}

function communityPark(cx, cz) {
  communitySite('park', cx, cz, 'Nirmal Play & Sports Park');
  box('grass', cx, 0.47, cz, 64, 0.18, 64);
  box('paving', cx, 0.59, cz, 4, 0.12, 60);
  sportsCourt(cx - 16, cz - 10, 25, 29);
  playground(cx + 16, cz + 6, 23, 27);
  for (const [dx, dz] of [[-25, 26], [-12, 26], [24, -25], [10, -25]]) { tree(cx + dx, cz + dz, 8); bench(cx + dx, cz + dz + 4); }
  sign('NIRMAL PLAY & SPORTS PARK', cx, 2.7, cz + 30, 20, 1.5);
}
