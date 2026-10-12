'use strict';
defineSector('Sector-35F', {
  title: 'Garden and balcony residences', features: [],
  build(sector) { cityResidentialSector(sector, { kind: 'inner', style: 'heritage', plots: [[-1, 1], [1, -1]], designs: [24, 25] }); },
});
