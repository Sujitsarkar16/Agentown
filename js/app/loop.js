/* Nirmal simulation — js/app/loop.js
 * Quality scaling, fixed-step simulation loop, validation and boot. */
'use strict';

let renderScale = 1;
let performanceTime = 0;
let performanceFrames = 0;
let slowFrames = 0;
let recoveryTime = 0;
let performanceLevel = 0;
let shadowElapsed = 0;
let renderRequested = true;
let animationRequest = 0;
let lastRenderStamp = 0;
let resizeRequest = 0;
const FRAME_INTERVAL = 1000 / 60;
const constrainedDevice = (navigator.deviceMemory && navigator.deviceMemory <= 4)
  || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const qualityProfiles = {
  low: { ratio: 1, pixels: 1000000, shadow: 0 },
  medium: { ratio: 1.25, pixels: 1600000, shadow: 1024 },
  high: { ratio: 1.75, pixels: 3000000, shadow: 2048 },
};

function qualityLimit() {
  const p = qualityProfiles[quality];
  return Math.min(
    devicePixelRatio || 1,
    p.ratio,
    Math.sqrt(p.pixels / Math.max(1, innerWidth * innerHeight)),
    constrainedDevice && quality !== 'high' ? 1 : Infinity,
  );
}

function configureShadows() {
  const base = qualityProfiles[quality].shadow;
  const size = performanceLevel >= 2 ? 0 : performanceLevel === 1 ? Math.min(base, 512) : base;
  if (size && sun.shadow.mapSize.x !== size) {
    sun.shadow.mapSize.set(size, size);
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  renderer.shadowMap.enabled = size > 0;
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = size > 0;
  document.body.classList.toggle('performance-light', quality === 'low' || performanceLevel > 0);
  renderRequested = true;
}

function setQuality(q) {
  if (!qualityProfiles[q]) return;
  quality = q;
  renderScale = qualityLimit();
  performanceLevel = 0;
  performanceTime = performanceFrames = slowFrames = recoveryTime = 0;
  configureShadows();
  $$('[data-quality]').forEach((b) => {
    b.classList.toggle('active', b.dataset.quality === q);
    b.setAttribute('aria-pressed', b.dataset.quality === q);
  });
  resize();
}

function resize() {
  const w = Math.max(1, innerWidth);
  const h = Math.max(1, innerHeight);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderScale = Math.min(renderScale, qualityLimit());
  renderer.setPixelRatio(renderScale);
  renderer.setSize(w, h, false);
  renderRequested = true;
}

function queueResize() {
  if (resizeRequest) return;
  resizeRequest = requestAnimationFrame(() => { resizeRequest = 0; resize(); });
}

// Fast reduction, slow recovery and a pixel budget prevent resolution oscillation.
function adaptQuality(dt) {
  performanceTime += dt;
  performanceFrames++;
  if (dt > 0.0195) slowFrames++;
  if (performanceTime < 1.5) return;
  fps = Math.round(performanceFrames / performanceTime);
  const slow = fps < 56 || (fps < 58 && slowFrames / performanceFrames > 0.2);
  const floor = Math.min(0.5, qualityLimit());
  if (slow) {
    recoveryTime = 0;
    if (renderScale > floor + 0.01) {
      renderScale = Math.max(floor, renderScale * 0.85);
      resize();
    } else if (performanceLevel < 2) {
      performanceLevel++;
      configureShadows();
    }
  } else if (fps >= 58) {
    recoveryTime += performanceTime;
    if (recoveryTime >= 12) {
      recoveryTime = 0;
      if (performanceLevel > 0) { performanceLevel--; configureShadows(); }
      else if (renderScale < qualityLimit() - 0.01) {
        renderScale = Math.min(qualityLimit(), renderScale + 0.05);
        resize();
      }
    }
  } else recoveryTime = 0;
  diagnostics.performance = {
    fps, targetFPS: 60, renderScale: +renderScale.toFixed(2),
    quality, shadows: renderer.shadowMap.enabled, performanceLevel,
    calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
  };
  const status = $('#performanceStatus');
  if (status) status.textContent = `${fps} FPS · ${Math.round(renderScale * 100)}% resolution · Auto 60 FPS target`;
  performanceTime = performanceFrames = slowFrames = 0;
}

function validateScene() {
  for (const sector of sectors) {
    if (!sectorModules.get(sector.code)?.completed.has('build')) throw Error(`Unbuilt sector: ${sector.code}`);
  }
  if (buildingBounds.length !== 101) throw Error(`Expected 101 buildings, received ${buildingBounds.length}`);
  scene.updateMatrixWorld(true);
  let instances = 0;
  let meshes = 0;
  scene.traverse((o) => {
    if (o.isMesh) {
      meshes++;
      if (o.isInstancedMesh) instances += o.count;
      for (const n of o.matrixWorld.elements) {
        if (!Number.isFinite(n)) throw Error('Non-finite object transformation');
      }
      if (o.geometry?.attributes.position) {
        const a = o.geometry.attributes.position;
        for (let i = 0; i < a.array.length; i++) {
          if (!Number.isFinite(a.array[i])) throw Error('Invalid geometry vertex');
        }
      }
    }
  });
  diagnostics.meshes = meshes;
  diagnostics.instances = instances;
  diagnostics.scene = scene;
  diagnostics.camera = camera;
  diagnostics.renderer = renderer;
  diagnostics.simulateTraffic = simulateTraffic;
  diagnostics.updateAmbient = updateAmbient;
  diagnostics.step = (dt, render = false) => {
    simTime += dt;
    simulateTraffic(dt, render);
    if (render) updateAmbient(simTime);
  };
  diagnostics.setLighting = setLighting;
  diagnostics.liveLightAt = liveLightAt;
  diagnostics.syncIndiaTime = syncIndiaTime;
  diagnostics.setMoveMode = setMoveMode;
  diagnostics.getDesiredOrbit = () => ({ ...desiredOrbit });
  diagnostics.showView = showView;
  diagnostics.staticBatches = staticBuckets.size;
  diagnostics.movingBatches = movingBuckets.size + pedestrianBuckets.size;
  diagnostics.walkers = walkers;
  diagnostics.textSigns = diagnostics.signs ? diagnostics.signs.length : 0;
  diagnostics.clouds = diagnostics.cloudPuffs ? diagnostics.cloudPuffs.length : 0;
  diagnostics.updateCamera = updateCamera;
  diagnostics.getOrbit = () => ({ ...orbit });
  diagnostics.ready = true;
}

const PHYSICS_STEP = 1 / 30;
let accumulator = 0;

function animate(stamp) {
  animationRequest = requestAnimationFrame(animate);
  // On 120/144 Hz displays, avoid running this city at the display's full rate.
  if (lastRenderStamp && stamp - lastRenderStamp < FRAME_INTERVAL - 0.5) return;
  lastRenderStamp = lastRenderStamp
    ? lastRenderStamp + Math.max(1, Math.floor((stamp - lastRenderStamp + 0.5) / FRAME_INTERVAL)) * FRAME_INTERVAL
    : stamp;
  if (!lastStamp) lastStamp = stamp;
  const elapsed = (stamp - lastStamp) / 1000;
  const dt = Math.min(elapsed, 0.075);
  lastStamp = stamp;
  if (document.hidden) return;

  const cameraMoved = updateCamera(Math.max(dt, 0.001));
  updateSectorHover(stamp, cameraMoved);
  syncIndiaTime();
  if (!paused) {
    accumulator += dt * pace;
    let budget = 4;
    while (accumulator >= PHYSICS_STEP && budget-- > 0) {
      simTime += PHYSICS_STEP;
      simulateTraffic(PHYSICS_STEP, false);
      accumulator -= PHYSICS_STEP;
    }
    // Drop whole overdue steps while keeping the interpolation phase continuous.
    if (accumulator >= PHYSICS_STEP) accumulator %= PHYSICS_STEP;
  }
  if (paused && !cameraMoved && !renderRequested) return;
  updateRenderVisibility();
  updateVehicleMatrices(accumulator / PHYSICS_STEP);
  updateAmbient(simTime + accumulator);
  shadowElapsed += dt;
  if (renderer.shadowMap.enabled && (renderRequested || shadowElapsed >= (quality === 'high' ? 1 / 20 : 1 / 10))) {
    renderer.shadowMap.needsUpdate = true;
    shadowElapsed = 0;
  }
  renderer.render(scene, camera);
  renderRequested = false;
  frameCount++;
  if (!paused && elapsed > 0) adaptQuality(elapsed);
}

function fail(error) {
  diagnostics.errors.push(String(error));
  $('#loadingText').textContent = 'This browser could not start the 3D scene.';
  $('#failure').hidden = false;
  $('#failure').innerHTML = '<p>Open this HTML file in Chrome, Edge, Firefox or Safari with graphics '
    + 'acceleration enabled. WebGL graphics support is required.</p>'
    + '<button onclick="location.reload()">Try again</button>';
  $('#loadProgress').style.transform = 'scaleX(1)';
}

async function boot() {
  try {
    scene = new T.Scene();
    scene.fog = new T.Fog('#dcd9c7', 1550, 3700);
    camera = new T.PerspectiveCamera(45, innerWidth / innerHeight, 1.5, 5400);
    renderer = new T.WebGLRenderer({
      canvas: $('#world'), antialias: true, alpha: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: false,
    });
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderScale = qualityLimit();
    renderer.setPixelRatio(renderScale);
    renderer.setSize(innerWidth, innerHeight, false);

    sun = new T.DirectionalLight('#ffdda6', 3.5);
    sun.position.set(-230, 520, 260);
    sun.target.position.set(-170, 0, 0);
    scene.add(sun.target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -680, right: 680, top: 650, bottom: -650, near: 1, far: 1800,
    });
    sun.shadow.bias = -0.00025;
    sun.shadow.normalBias = 0.12;
    scene.add(sun);
    hemi = new T.HemisphereLight('#d6e7e9', '#798168', 1.8);
    scene.add(hemi);
    configureShadows();

    initAssets();
    progress(0.22, 'Laying clean streets and shaded avenues');
    await new Promise((r) => setTimeout(r, 20));
    terrain();
    progress(0.42, 'Crafting sandstone arcades and the skyline');
    await new Promise((r) => setTimeout(r, 20));
    cityBlocks();
    village();
    riverfront();
    metro();
    progress(0.65, 'Connecting neighbourhoods and the waterfront');
    await new Promise((r) => setTimeout(r, 20));
    atmosphere();
    buildingEntrances();
    finishStatic();
    spawnVehicles();
    pedestrians();
    progress(0.87, 'Bringing traffic and daily life into motion');
    setLighting('live', true);
    controls();
    productControls();
    updateAmbient(0);
    updateCamera(1);
    updateRenderVisibility();
    updateVehicleMatrices();
    updateAmbient(0);
    // Freeze static world transforms; animated nodes still update their own matrices.
    scene.updateMatrixWorld(true);
    scene.matrixAutoUpdate = false;
    scene.traverse(o => {
      if (o !== scene && !o.matrixAutoUpdate) o.matrixWorldAutoUpdate = false;
    });
    validateScene();
    if (renderer.compileAsync) await renderer.compileAsync(scene, camera);
    renderer.render(scene, camera);
    progress(1, 'Welcome to Nirmal');
    animationRequest = requestAnimationFrame(animate);
    document.addEventListener('visibilitychange', () => {
      cancelAnimationFrame(animationRequest);
      animationRequest = 0;
      lastStamp = lastRenderStamp = 0;
      performanceTime = performanceFrames = slowFrames = 0;
      if (!document.hidden) {
        renderRequested = true;
        animationRequest = requestAnimationFrame(animate);
      }
    });
    await new Promise((r) => setTimeout(r, 250));
    $('#loading').style.opacity = '0';
    setTimeout(() => $('#loading').remove(), 650);
    if (!reduced) gsap.fromTo('.dock', { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 1, stagger: 0.06, ease: 'power2.out' });
  } catch (error) {
    fail(error);
  }
}

boot();
