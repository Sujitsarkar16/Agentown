/* Road-bounded addresses and the independent, boot-only sector lifecycle. */
'use strict';

const sectors = [];
function sectorGrid(xs, zs, start, district, roadHalfWidth) {
  for (let row = 0; row < zs.length - 1; row++) {
    for (let col = 0; col < xs.length - 1; col++) {
      sectors.push({
        code: `Sector-${start + row}${String.fromCharCode(65 + col)}`,
        district, order: col * (zs.length - 1) + row,
        minX: xs[col] + roadHalfWidth, maxX: xs[col + 1] - roadHalfWidth,
        minZ: zs[row] + roadHalfWidth, maxZ: zs[row + 1] - roadHalfWidth,
        x: (xs[col] + xs[col + 1]) / 2, z: (zs[row] + zs[row + 1]) / 2,
      });
    }
  }
}
sectorGrid(roads, roadZ, 31, 'City', 8);
sectorGrid(villageX, villageZ, 41, 'Village', 6);
sectorGrid([-720, -360], [270, 360], 44, 'Farm link', 6);

function sectorAt(x, z) {
  for (const sector of sectors) {
    if (x > sector.minX && x < sector.maxX && z > sector.minZ && z < sector.maxZ) return sector;
  }
  return null;
}

const sectorModules = new Map();
let buildingSector = null;
function defineSector(code, definition) {
  const address = sectors.find(s => s.code === code);
  if (!address || sectorModules.has(code) || typeof definition.build !== 'function') {
    throw Error(`Invalid or duplicate sector module: ${code}`);
  }
  sectorModules.set(code, {
    ...definition, ...address, source: `js/sectors/${code}.js`,
    features: definition.features || [], state: {}, completed: new Set(),
  });
}

function withSectorSeed(code, phase, callback) {
  const previousSeed = seed;
  let hash = 2166136261;
  for (const char of `${code}:${phase}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  seed = hash >>> 0;
  try { return callback(); } finally { seed = previousSeed; }
}

function buildSector(code, phase = 'build') {
  const module = sectorModules.get(code);
  if (!module) throw Error(`Missing sector module: ${code}`);
  if (module.completed.has(phase)) throw Error(`Sector phase already built: ${code}/${phase}`);
  if (!module[phase]) return;
  const previousSector = buildingSector;
  const before = buildingBounds.length;
  buildingSector = code;
  try {
    withSectorSeed(code, phase, () => {
      if (phase === 'build' && module.district === 'City') box('paving', module.x, 0.27, module.z, 65, 0.26, 65);
      module[phase](module);
    });
    module.completed.add(phase);
    (diagnostics.sectorBuilds ||= []).push({ code, phase, buildings: buildingBounds.length - before });
  } finally { buildingSector = previousSector; }
}

function buildSectorDistrict(district, phase = 'build') {
  const districtSectors = sectors.filter(s => s.district === district).sort((a, b) => a.order - b.order);
  for (const sector of districtSectors) buildSector(sector.code, phase);
}

diagnostics.sectors = sectors;
diagnostics.sectorAt = sectorAt;
diagnostics.sectorModules = sectorModules;
