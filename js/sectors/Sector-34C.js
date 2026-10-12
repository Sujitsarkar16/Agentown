'use strict';
defineSector('Sector-34C', {
  title: 'Garden and balcony homes', features: [],
  build(sector) { cityResidentialSector(sector, { kind: 'inner', style: 'heritage', plots: [[-1, 1], [1, -1]], designs: [9, 10] }); },
});
