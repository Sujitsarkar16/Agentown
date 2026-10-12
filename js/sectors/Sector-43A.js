'use strict';
defineSector('Sector-43A', {
  title: 'Village tiled homes', features: [],
  build(sector) { villageResidentialSector(sector, { houses: [[-17, -18, 1], [0, 18, 2]], gardenCorner: [30, -28] }); },
  decorate: villageSectorPlanting,
});
