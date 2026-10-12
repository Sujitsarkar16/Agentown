/* Document Studio's sector: add future office features here. */
'use strict';
defineSector('Sector-33D', {
  title: 'Document Studio', features: ['documents'],
  build({ x, z }) { documentOffice(x, z); },
});
