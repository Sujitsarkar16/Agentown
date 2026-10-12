/* Sector-42B owns the village school, pond and green. */
'use strict';
defineSector('Sector-42B', {
  title: 'Gram Vidya Village School', features: [],
  build({ x: cx, z: cz }) {
    box('grass', cx, 0.2, cz, 64, 0.16, 64);
    box('paving', cx, 0.36, cz, 5, 0.12, 60);
    box('paving', cx, 0.37, cz - 5, 58, 0.12, 4);
    part('cyl', 'stone', cx - 12, 0.48, cz + 12, 8, 0.35, 8);
    part('cyl', 'waterBase', cx - 12, 0.70, cz + 12, 7.5, 0.08, 7.5);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU + rr(-0.15, 0.15);
      const px = cx - 12 + Math.sin(a) * rr(7.5, 9);
      const pz = cz + 12 + Math.cos(a) * rr(7.5, 9);
      part('cyl', 'reed', px, 0.9, pz, 0.05, 1.8, 0.05, rr(-0.08, 0.08));
      part('sphere', 'hay', px, 1.85, pz, 0.09, 0.16, 0.09);
    }
    for (let i = 0; i < 7; i++) {
      const a = rr(0, TAU);
      part('cyl', 'shrub', cx - 12 + Math.sin(a) * rr(2, 6), 0.76, cz + 12 + Math.cos(a) * rr(2, 6), rr(0.3, 0.55), 0.05, rr(0.3, 0.55));
    }
    recordBuilding(cx + 12, cz - 18, 22, 12, 8, 'village school');
    facade(cx + 12, cz - 18, 22, 12, 0.7, 6.8, false, 3, 'schoolWall');
    box('courtBlue', cx + 12, 7.8, cz - 18, 23, 0.4, 13);
    box('solar', cx + 12, 8.2, cz - 18, 10, 0.18, 5);
    sign('GRAM VIDYA · VILLAGE SCHOOL', cx + 12, 4.7, cz - 11.85, 19, 1.3);
    communitySite('school', cx + 12, cz - 18, 'Gram Vidya Village School');
    playground(cx + 17, cz + 3, 19, 14);
    villageHouse(cx + 15, cz + 20, 9, 8, 4, 1);
    mudHut(cx - 17, cz - 15, 0.4, false);
    banyan(cx - 25, cz - 7, 14);
    for (const side of [-1, 1]) palm(cx + side * 28, cz, 10);
    bench(cx - 12, cz + 24);
    sign('NIRMAL GAON · VILLAGE GREEN', cx, 2.8, cz + 31, 20, 1.4);
  },
});
