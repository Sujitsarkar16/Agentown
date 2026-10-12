# Developing a sector

Each named road-bounded block has one classic JavaScript file here. Its filename
matches the hover address, such as `Sector-33D.js` for Document Studio.

## Ownership

| Files | Content |
| --- | --- |
| `Sector-31A.js`–`Sector-38F.js` | 48 city blocks |
| `Sector-41A.js`–`Sector-43C.js` | 9 village blocks |
| `Sector-44A.js` | Farm-link corridor |

Useful starting points:

- `Sector-33D.js`: Document Studio.
- `Sector-34D.js`: Civic hall, fountain and heritage square.
- `Sector-34E.js`: Nehru Garden.
- `Sector-35D.js`: Market Walk.
- `Sector-35E.js`: Lotus Lake.
- `Sector-42B.js`: Village school, pond and green, with its custom layout inline.

## Module contract

Every file calls `defineSector` once. The registry supplies the code, world-space
centre (`x`, `z`), interior bounds (`minX`, `maxX`, `minZ`, `maxZ`), district, and a
private `state` object. The module owns its title, feature metadata and construction
callbacks. Keep new functions inside the definition or an IIFE to avoid global
name collisions between sector files.

```js
'use strict';
defineSector('Sector-31B', {
  title: 'Brick arcades',
  features: [],
  build(sector) {
    cityResidentialSector(sector, {
      kind: 'outer',
      style: 'heritage',
      plot: 1,
      designs: [3],
    });
    // Coordinates are relative to this sector's centre.
    bench(sector.x + 8, sector.z + 12);
    sector.state.meetingPoint = { x: sector.x + 8, z: sector.z + 12 };
  },
});
```

Edit `build` to customise buildings, signs, gardens or equipment in that block.
Use existing helpers (`building`, `box`, `part`, `tree`, `bench`, `sign`) to retain
shared geometry, materials and static GPU batching. `recordBuilding` automatically
tracks the module's `ownerSectorCode`; the entrance pass adds gates to recorded
buildings. Residential modules explicitly specify plot and architectural variants
instead of depending on counters in neighbouring sectors.

Village modules can also supply `decorate(sector)`. Village housing is built before
district landscaping; the separate decoration pass has its own random seed.
`features` stores sector-local feature IDs, and `state` stores module-local data.
Connect new feature IDs to their UI/agent controllers in the app layer. The existing
Document Studio controller is in `js/app/products.js`.

## Construction and determinism

`js/core/sectors.js` owns addresses, registration and construction. City sectors
are built by `cityBlocks()`, village and farm-link sectors by `village()`. Each
callback executes once during boot, before static batching. Its random sequence
depends only on its sector code and phase, and restores the surrounding RNG state
after execution. Changing one callback's random usage does not shift another
sector's random sequence. Reload the page to rebuild edited sectors.

Roads, signals, terrain, transit, atmosphere and reusable architectural builders
remain shared systems. Mountain buildings, the riverbank skyline and rural
outskirts are outside the numbered road-bounded blocks and remain in their
district files.

## Loading and checks

All 58 files are listed in `components/scripts.html` and `index.html`, after shared
builders and before application boot. This preserves offline `file://` support.
When adding a new road-bounded sector, register its bounds in `js/core/sectors.js`
and add its script tag to both HTML files.

The current scene has 101 buildings, including the added four-floor office in
`Sector-35B.js`. If a development change alters
that total, update the target in `js/app/loop.js` and its assertion in
`tools/verify-scene.cjs` together.

Checks:

```text
python tools/build-html.py --check
node tools/verify-scene.cjs
node tools/benchmark-scene.cjs
```

Browser checks require Playwright, as described in the root README. They verify
module coverage and file loading, independent random seeds, ownership, sector
hovering, entrances, building count, geometry, document features and controls.

For inspection in the browser console, use
`NirmalDiagnostics.sectorModules.get('Sector-33D')` and
`NirmalDiagnostics.sectorBuilds`.
