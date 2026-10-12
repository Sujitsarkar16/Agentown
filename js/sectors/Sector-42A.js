'use strict';
defineSector('Sector-42A', {
  title: 'Western village garden', features: [],
  build(sector) { villageResidentialSector(sector, { houses: [[17, -18, 0]], gardenCorner: [-30, 28] }); },
  decorate: villageSectorPlanting,
});
