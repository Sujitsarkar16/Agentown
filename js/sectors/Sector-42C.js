'use strict';
defineSector('Sector-42C', {
  title: 'Eastern village grove', features: [],
  build(sector) { villageResidentialSector(sector, { houses: [[-17, -18, 2], [0, 18, 3]], gardenCorner: [30, -28], hut: 'round' }); },
  decorate: villageSectorPlanting,
});
