/* Sector-31B — brick-arcade neighbourhood. */
'use strict';
defineSector('Sector-31B', {
  title: 'Brick arcades', features: [],
  build(sector) { cityResidentialSector(sector, { kind: 'outer', style: 'heritage', plot: 1, designs: [3] }); },
});
