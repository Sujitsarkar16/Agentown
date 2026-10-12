/* Repeatable scene workload check. Software WebGL timings are not device FPS. */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
    await page.addInitScript(() => {
      const native = requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => setTimeout(() => native(callback), 200);
    });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const root = path.resolve(__dirname, '..').replaceAll('\\', '/');
    await page.goto(`file:///${root}/index.html`);
    await page.waitForFunction(() => window.NirmalDiagnostics?.ready || window.NirmalDiagnostics?.errors.length, null, { timeout: 120000 });
    assert.equal(await page.evaluate(() => NirmalDiagnostics.ready), true,
      JSON.stringify(await page.evaluate(() => NirmalDiagnostics.errors)));
    const result = await page.evaluate(async () => {
      const d = NirmalDiagnostics;
      paused = true;
      density = 1;
      const timed = (fn, count) => {
        const start = performance.now();
        for (let i = 0; i < count; i++) fn(i);
        return +(performance.now() - start).toFixed(2);
      };
      for (let i = 0; i < 60; i++) d.step(1 / 30);
      const physicsMs = timed(() => d.step(1 / 30), 1800);
      const matricesMs = timed(i => updateVehicleMatrices((i % 60) / 60), 300);
      const ambientMs = timed(i => updateAmbient(i / 60), 300);
      const views = [];
      for (const q of ['low', 'medium']) {
        setQuality(q);
        for (const view of [0, 1, 4, 5, 9]) {
          d.showView(view, true);
          await new Promise(resolve => setTimeout(resolve, 50));
          d.updateCamera(3);
          if (typeof updateRenderVisibility === 'function') updateRenderVisibility();
          updateVehicleMatrices();
          updateAmbient(simTime);
          renderer.info.autoReset = false;
          renderer.info.reset();
          renderer.shadowMap.needsUpdate = renderer.shadowMap.enabled;
          renderer.render(scene, camera);
          const shadowTriangles = renderer.info.render.triangles;
          renderer.info.reset();
          renderer.render(scene, camera);
          views.push({ quality: q, view, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, shadowTriangles });
          renderer.info.autoReset = true;
        }
      }
      const visible = vehicles.filter(v => v.visible);
      let collisions = 0;
      for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
        if (d.overlaps(visible[i], visible[i].pose, visible[j], visible[j].pose, 0)) collisions++;
      }
      return { physicsMs, matricesMs, ambientMs, vehicles: visible.length, collisions, views };
    });
    assert.deepEqual(errors, []);
    assert.equal(result.collisions, 0, 'Maximum-density traffic must remain collision-free');
    const checks = await page.evaluate(() => {
      const ensure = (condition, message) => { if (!condition) throw Error(message); };
      setQuality('medium');
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
      ensure(sun.shadow.map && renderer.shadowMap.enabled, 'Balanced shadows must be allocated');
      const oldTrainX = train.matrixWorld.elements[12];
      updateAmbient(simTime + 1);
      renderer.render(scene, camera);
      ensure(train.matrixWorld.elements[12] !== oldTrainX, 'Animated world transforms must update');
      peopleOn = false;
      updatePedestrians(simTime);
      ensure([...pedestrianBuckets.values()].every(b => b.mesh.count === 0), 'Disabled pedestrians must submit no instances');
      peopleOn = true;
      updatePedestrians(simTime);
      ensure([...pedestrianBuckets.values()].some(b => b.mesh.count > 0), 'Pedestrians must restore');
      const ray = new THREE.Raycaster(new THREE.Vector3(-45, 100, -45), new THREE.Vector3(0, -1, 0));
      ensure(ray.intersectObject(NirmalDiagnostics.terrainMesh, true).length > 0, 'Tiled ground must remain pickable');

      // Drive the real frame scheduler with a deterministic 120 Hz display clock.
      cancelAnimationFrame(animationRequest);
      const nativeRAF = window.requestAnimationFrame;
      const nativeRender = renderer.render;
      window.requestAnimationFrame = () => 0;
      let renders = 0;
      renderer.render = () => { renders++; };
      try {
        setLighting('day', true);
        Object.assign(orbit, desiredOrbit);
        updateCamera(1);
        paused = false;
        for (const refresh of [60, 120, 144]) {
          renders = 0;
          lastStamp = lastRenderStamp = 0;
          for (let i = 0; i <= refresh * 2; i++) animate(1000 + i * 1000 / refresh);
          ensure(renders >= 119 && renders <= 122, `60 FPS scheduling on ${refresh} Hz: ${renders} frames in 2 seconds`);
        }
        paused = true;
        renderRequested = true;
        Object.assign(orbit, desiredOrbit);
        updateCamera(1);
        animate(4000);
        const before = renders;
        for (let i = 1; i < 60; i++) animate(4000 + i * 1000 / 60);
        ensure(renders === before, 'Paused stationary scene must stop rendering');
        desiredOrbit.theta += 0.1;
        animate(5100);
        ensure(renders > before, 'Paused camera controls must still render');
        setQuality('medium');
        for (let i = 0; i < 500; i++) adaptQuality(1 / 30);
        ensure(renderScale === 0.5 && performanceLevel === 2 && !renderer.shadowMap.enabled, 'Sustained load must reduce resolution and shadows');
        for (let i = 0; i < 900; i++) adaptQuality(1 / 60);
        ensure(performanceLevel < 2 || renderScale > 0.5, 'Sustained headroom must recover quality');
      } finally {
        window.requestAnimationFrame = nativeRAF;
        renderer.render = nativeRender;
      }
      return ['shadow allocation', 'animated world transforms', 'pedestrian toggle', 'terrain picking', '60 FPS frame pacing on 60/120/144 Hz', 'paused idle rendering', 'paused camera movement', 'adaptive degradation and recovery'];
    });
    result.checked = checks;
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
