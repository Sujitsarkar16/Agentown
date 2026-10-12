/* Sector-44A — farm-link corridor, bounded by its two mud tracks. */
'use strict';
defineSector('Sector-44A', {
  title: 'Farm-link corridor', features: [],
  build() {
    for (const z of [270, 360]) {
      for (let x = -706; x < -400; x += 13) mudSegX(x, z, 10);
      for (let x = -680; x <= -440; x += 34) {
        tree(x, z - 11, rr(6, 8));
        tree(x, z + 11, rr(6, 8));
        shrub(x + rr(-3, 3), z - rr(13, 16));
        shrub(x + rr(-3, 3), z + rr(13, 16));
      }
    }
  },
});
