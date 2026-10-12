'use strict';
defineSector('Sector-43B', {
  title: 'Southern village homes', features: [],
  build(sector) { villageResidentialSector(sector, { houses: [[-17, -18, 3], [0, 18, 0]], gardenCorner: [30, 28] }); },
  decorate: villageSectorPlanting,
});
