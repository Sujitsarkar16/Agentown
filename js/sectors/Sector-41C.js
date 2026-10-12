'use strict';
defineSector('Sector-41C', {
  title: 'Eastern village home', features: [],
  build(sector) { villageResidentialSector(sector, { houses: [[17, -18, 1]], gardenCorner: [-30, 28] }); },
  decorate: villageSectorPlanting,
});
