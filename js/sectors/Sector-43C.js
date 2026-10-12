'use strict';
defineSector('Sector-43C', {
  title: 'Village kitchen garden', features: [],
  build(sector) { villageResidentialSector(sector, { houses: [[17, -18, 0]], gardenCorner: [-30, -28] }); },
  decorate: villageSectorPlanting,
});
