/* Nirmal simulation — js/app/camera.js
 * Cinematic orbit camera, six curated views and the guided tour. */
'use strict';

const orbit = { theta: -0.82, phi: 1.06, radius: 1500, x: -230, y: 18, z: 35 };
const desiredOrbit = { ...orbit };
const orbitKeys = Object.keys(orbit);
const previousCameraRotation = new T.Quaternion();

const views = [
  {
    title: 'A city that<br>breathes.',
    text: 'Tree-lined avenues. Living heritage. A quieter, cleaner vision of urban India.',
    chapter: 'THE BIG PICTURE', theta: -0.82, phi: 1.06, radius: 1500, x: -230, y: 18, z: 35,
  },
  {
    title: 'Roots, reimagined.',
    text: 'Sandstone arcades, a tricolour in the breeze, and a civic square made for everyone.',
    chapter: 'LIVING HERITAGE', theta: 0.38, phi: 1.05, radius: 133, x: -45, y: 6, z: -45,
  },
  {
    title: 'Room to<br>slow down.',
    text: 'Shaded walking paths, flowering gardens, and a lake at the heart of the neighbourhood.',
    chapter: 'THE GARDEN DISTRICT', theta: 0.8, phi: 0.83, radius: 182, x: 46, y: 3, z: 0,
  },
  {
    title: 'Life along<br>the river.',
    text: 'A planted promenade, gentle water, and a connected city beyond the bridges.',
    chapter: 'THE RIVERFRONT', theta: 1.12, phi: 1.1, radius: 186, x: 203, y: 4, z: 17,
  },
  {
    title: '', text: '', chapter: '',
    theta: 0.72, phi: 1.0, radius: 360, x: -855, y: 5, z: 315,
  },
  {
    title: '', text: '', chapter: '',
    theta: -1.5, phi: 1.04, radius: 850, x: 1020, y: 200, z: -120,
  },
  { title: 'Neighbours, together.', text: 'Garden courtyards, balconies and shared play spaces.', chapter: 'RESIDENTIAL SOCIETIES', theta: -0.6, phi: 0.85, radius: 175, x: -225, y: 8, z: 135 },
  { title: 'Room to grow.', text: 'A bright school campus and a playground for everyone.', chapter: 'LEARNING & PLAY', theta: 0.45, phi: 0.72, radius: 165, x: -135, y: 3, z: 225 },
  { title: 'Here for the city.', text: 'Neighbourhood police and a welcoming public square.', chapter: 'COMMUNITY SERVICES', theta: 0.4, phi: 0.95, radius: 115, x: -135, y: 3, z: -135 },
  { title: 'Make something useful.', text: 'Convert, organise and create documents in your city workspace.', chapter: 'DOCUMENT STUDIO', theta: 0.25, phi: 1.04, radius: 114, x: -45, y: 12, z: -135 },
];

function showView(i, instant = false) {
  activeView = (i + views.length) % views.length;
  const v = views[activeView];
  gsap.killTweensOf(desiredOrbit);
  gsap.to(desiredOrbit, {
    theta: v.theta, phi: v.phi, radius: v.radius, x: v.x, y: v.y, z: v.z,
    duration: instant || reduced ? 0.01 : 2.6, ease: 'power2.inOut',
  });
  $('#storyTitle').innerHTML = v.title;
  $('#storyText').textContent = v.text;
  $('#chapterText').textContent = `${String(activeView + 1).padStart(2, '0')} / ${views.length}   ${v.chapter}`;
  $$('[data-view]').forEach((b) => {
    const on = Number(b.dataset.view) === activeView;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
}

function updateCamera(dt) {
  const oldX = camera.position.x; const oldY = camera.position.y; const oldZ = camera.position.z;
  previousCameraRotation.copy(camera.quaternion);
  if (autoOrbit && !touring) desiredOrbit.theta += dt * 0.045;
  if (touring) {
    tourTime += dt;
    desiredOrbit.theta += dt * 0.05;
    if (tourTime >= 12) {
      tourTime = 0;
      showView((activeView + 1) % views.length);
    }
  }
  desiredOrbit.x = clamp(desiredOrbit.x, -1250, 1400);
  desiredOrbit.z = clamp(desiredOrbit.z, -1050, 1050);
  const ease = 1 - Math.exp(-dt * 6);
  for (const k of orbitKeys) {
    const delta = desiredOrbit[k] - orbit[k];
    orbit[k] = Math.abs(delta) < 0.00001 ? desiredOrbit[k] : lerp(orbit[k], desiredOrbit[k], ease);
  }
  orbit.phi = clamp(orbit.phi, 0.23, 1.39);
  orbit.radius = clamp(orbit.radius, 42, 1850);
  orbit.x = clamp(orbit.x, -1250, 1400);
  orbit.z = clamp(orbit.z, -1050, 1050);

  const lookY = Math.max(orbit.y, terrainHeight(orbit.x, orbit.z) + 2);
  const cx = orbit.x + Math.sin(orbit.theta) * Math.sin(orbit.phi) * orbit.radius;
  const cz = orbit.z + Math.cos(orbit.theta) * Math.sin(orbit.phi) * orbit.radius;
  let cy = lookY + Math.cos(orbit.phi) * orbit.radius;
  for (const b of buildingBounds) {
    if (Math.abs(cx - b.x) < b.w / 2 + 3 && Math.abs(cz - b.z) < b.d / 2 + 3) {
      cy = Math.max(cy, b.h + 4);
    }
  }
  cy = Math.max(cy, terrainHeight(cx, cz) + 7);
  camera.position.set(cx, Math.max(cy, 6), cz);
  camera.lookAt(orbit.x, lookY, orbit.z);
  sky.position.copy(camera.position);
  return Math.abs(camera.position.x - oldX) + Math.abs(camera.position.y - oldY)
    + Math.abs(camera.position.z - oldZ) > 0.00001 || 1 - Math.abs(camera.quaternion.dot(previousCameraRotation)) > 1e-10;
}

function stopTour() {
  touring = false;
  $('#tour').classList.remove('touring');
  $('#tour').setAttribute('aria-pressed', 'false');
}

function toggleTour() {
  touring = !touring;
  tourTime = 0;
  $('#tour').classList.toggle('touring', touring);
  $('#tour').setAttribute('aria-pressed', touring);
  if (touring) showView(activeView);
}

function manual() {
  stopTour();
  autoOrbit = false;
  $('#autoRotate').checked = false;
  gsap.killTweensOf(desiredOrbit);
}
