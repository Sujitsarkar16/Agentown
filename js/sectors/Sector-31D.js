'use strict';
defineSector('Sector-31D', {
  title: 'Tiled townhouses', features: [],
  build(sector) { cityResidentialSector(sector, { kind: 'outer', style: 'heritage', plot: 0, designs: [16] }); },
});
