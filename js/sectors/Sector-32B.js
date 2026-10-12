'use strict';
defineSector('Sector-32B', {
  title: 'Garden residences', features: [],
  build(sector) { cityResidentialSector(sector, { kind: 'outer', style: 'heritage', plot: 2, designs: [4] }); },
});
