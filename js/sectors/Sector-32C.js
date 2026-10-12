'use strict';
defineSector('Sector-32C', {
  title: 'Neighbourhood arcades', features: [],
  build(sector) { cityResidentialSector(sector, { kind: 'outer', style: 'heritage', plot: 0, designs: [8] }); },
});
