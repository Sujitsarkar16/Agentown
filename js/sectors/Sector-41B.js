'use strict';
defineSector('Sector-41B', {
  title: 'Village veranda quarter', features: [],
  build(sector) { villageResidentialSector(sector, { houses: [[17, -18, 2]], gardenCorner: [-30, -28], hut: 'rectangular' }); },
  decorate: villageSectorPlanting,
});
