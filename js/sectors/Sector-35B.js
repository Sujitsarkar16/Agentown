'use strict';
defineSector('Sector-35B', {
  title: 'Tiled residences and four-floor office', features: [],
  build(sector) {
    cityResidentialSector(sector, {
      kind: 'outer', style: 'heritage', plot: 2, designs: [6], reservedPlots: [0],
    });
    // Four 3.6 m floor bands, with enough headroom for the top-floor windows.
    building(sector.x - 17, sector.z - 18, 16, 15, 15.5, 'modern', 5);
    const office = buildingBounds[buildingBounds.length - 1];
    office.floors = 4;
    sector.state.additionalBuilding = office;
  },
});
