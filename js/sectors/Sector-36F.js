'use strict';
defineSector('Sector-36F', {
  title: 'Twin skyline garden', features: [],
  build({ x, z }) {
    building(x - 17, z + 19, 20, 19, rr(38, 58), 'modern', 13);
    building(x + 17, z + 19, 20, 19, rr(38, 58), 'modern', 14);
    for (const px of [x - 6, x + 8, x + 23]) { planter(px, z - 8, 3, 3); tree(px, z - 8, 6); }
  },
});
