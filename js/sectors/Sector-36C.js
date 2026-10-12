'use strict';
defineSector('Sector-36C', {
  title: 'Arcades and garden homes', features: [],
  build(sector) { cityResidentialSector(sector, { kind: 'inner', style: 'heritage', plots: [[-1, 1], [1, -1]], designs: [13, 14] }); },
});
