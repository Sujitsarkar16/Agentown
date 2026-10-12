'use strict';
defineSector('Sector-33F', {
  title: 'Terraces and balcony towers', features: [],
  build(sector) { cityResidentialSector(sector, { kind: 'inner', style: 'modern', plots: [[-1, 1], [1, -1]], designs: [9, 10] }); },
});
