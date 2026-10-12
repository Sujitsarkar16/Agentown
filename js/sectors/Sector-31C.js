'use strict';
defineSector('Sector-31C', {
  title: 'Terraced offices', features: [],
  build(sector) { cityResidentialSector(sector, { kind: 'outer', style: 'modern', plot: 2, designs: [3] }); },
});
