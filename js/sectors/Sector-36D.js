'use strict';
defineSector('Sector-36D', {
  title: 'Green residential quarter', features: [],
  build(sector) { cityResidentialSector(sector, { kind: 'inner', style: 'heritage', plots: [[-1, -1], [1, 1]], designs: [18, 19] }); },
});
