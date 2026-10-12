'use strict';
defineSector('Sector-34F', {
  title: 'Lofts and stepped offices', features: [],
  build(sector) { cityResidentialSector(sector, { kind: 'inner', style: 'modern', plots: [[-1, -1], [1, 1]], designs: [11, 12] }); },
});
