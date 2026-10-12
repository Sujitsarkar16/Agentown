/* Allocation-free hover picking for addresses owned by core/sectors.js. */
'use strict';

const sectorRay = new T.Raycaster();
const sectorPointer = new T.Vector2();
const sectorHit = new T.Vector3();
const sectorGround = new T.Plane(new T.Vector3(0, 1, 0), -0.45);
const sectorPickBounds = [];
let sectorTooltip;
let sectorCanvas;
let sectorHoverActive = false;
let sectorHoverDirty = false;
let sectorHoverX = 0;
let sectorHoverY = 0;
let lastSectorPick = -Infinity;

function hideSectorHover() {
  sectorHoverActive = false;
  sectorHoverDirty = false;
  if (sectorTooltip) sectorTooltip.hidden = true;
}

function sectorControls() {
  sectorTooltip = $('#sectorTooltip');
  sectorCanvas = $('#world');
  for (const b of buildingBounds) {
    b.sectorCode = sectorAt(b.x, b.z)?.code || null;
    sectorPickBounds.push(new T.Box3(
      new T.Vector3(b.x - b.w / 2, Math.max(0, b.entrance.base || 0), b.z - b.d / 2),
      new T.Vector3(b.x + b.w / 2, b.h, b.z + b.d / 2),
    ));
  }
  sectorCanvas.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || event.buttons || sectorCanvas.classList.contains('dragging')) {
      hideSectorHover();
      return;
    }
    sectorHoverX = event.clientX;
    sectorHoverY = event.clientY;
    sectorHoverActive = sectorHoverDirty = true;
  });
  for (const event of ['pointerleave', 'pointerdown', 'pointercancel', 'wheel']) {
    sectorCanvas.addEventListener(event, hideSectorHover, { passive: true });
  }
  addEventListener('blur', hideSectorHover);
  document.addEventListener('visibilitychange', hideSectorHover);
  diagnostics.sectors = sectors;
  diagnostics.sectorAt = sectorAt;
}

function updateSectorHover(stamp, cameraMoved) {
  if (!sectorHoverActive) return;
  if (cameraMoved) sectorHoverDirty = true;
  if (!sectorHoverDirty || stamp - lastSectorPick < 65) return;
  lastSectorPick = stamp;
  sectorHoverDirty = false;
  const rect = sectorCanvas.getBoundingClientRect();
  sectorPointer.set((sectorHoverX - rect.left) / rect.width * 2 - 1,
    -(sectorHoverY - rect.top) / rect.height * 2 + 1);
  camera.updateMatrixWorld();
  sectorRay.setFromCamera(sectorPointer, camera);
  let closest = Infinity;
  let sector = null;
  // Precomputed footprint boxes avoid raycasting thousands of instances.
  for (const bounds of sectorPickBounds) {
    if (!sectorRay.ray.intersectBox(bounds, sectorHit)) continue;
    const distance = sectorRay.ray.origin.distanceToSquared(sectorHit);
    if (distance < closest) {
      closest = distance;
      sector = sectorAt(sectorHit.x, sectorHit.z);
    }
  }
  if (sectorRay.ray.intersectPlane(sectorGround, sectorHit)
    && sectorRay.ray.origin.distanceToSquared(sectorHit) < closest) {
    sector = sectorAt(sectorHit.x, sectorHit.z);
  }
  if (!sector || document.body.classList.contains('hudhidden')) {
    sectorTooltip.hidden = true;
    return;
  }
  if (sectorTooltip.textContent !== sector.code) sectorTooltip.textContent = sector.code;
  sectorTooltip.hidden = false;
  sectorTooltip.style.transform = `translate(${clamp(sectorHoverX + 16, 8, innerWidth - 148)}px, ${clamp(sectorHoverY + 18, 8, innerHeight - 48)}px)`;
}
