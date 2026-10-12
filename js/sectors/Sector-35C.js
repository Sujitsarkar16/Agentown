'use strict';
defineSector('Sector-35C', {
  title: 'Townhouses and courtyards', features: [],
  build(sector) { cityResidentialSector(sector, { kind: 'inner', style: 'heritage', plots: [[-1, -1], [1, 1]], designs: [11, 12] }); },
});
