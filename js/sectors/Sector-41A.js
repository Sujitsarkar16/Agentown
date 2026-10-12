'use strict';
defineSector('Sector-41A', {
  title: 'Western village homes', features: [],
  build(sector) { villageResidentialSector(sector, { houses: [[-17, -18, 2], [0, 18, 3]], gardenCorner: [30, 28], hut: 'round' }); },
  decorate: villageSectorPlanting,
});
