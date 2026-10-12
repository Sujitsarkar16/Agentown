/* Browser integration check. Set PLAYWRIGHT_PATH to an installed playwright module. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');

function syntax(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) syntax(file);
    else if (entry.name.endsWith('.js')) new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file });
  }
}

(async () => {
  syntax(path.join(root, 'js'));
  console.log('JavaScript syntax OK; launching Chromium');
  const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, timezoneId: 'America/Los_Angeles' });
    // Software WebGL in CI needs a bounded frame cadence to keep input responsive.
    await page.addInitScript(() => {
      const native = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => setTimeout(() => native(callback), 200);
    });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); if (msg.text().startsWith('Document check:')) console.log(msg.text()); });
    await page.goto(`file:///${root.replaceAll('\\', '/')}/index.html`);
    console.log('Page loaded; waiting for scene');
    await page.waitForFunction(() => window.NirmalDiagnostics?.ready || window.NirmalDiagnostics?.errors.length, null, { timeout: 60000 });
    const summary = await page.evaluate(() => {
      const d = NirmalDiagnostics;
      return { ready: d.ready, errors: d.errors, buildings: d.buildings, architecture: d.architecture, community: d.community, signs: d.textSigns, alpineFlowers: d.alpineFlowers, meshes: d.meshes, instances: d.instances };
    });
    assert.ok(summary.ready, JSON.stringify(summary.errors));
    assert.equal(summary.buildings, 101, 'Scene includes the additional Sector-35B building');
    console.log('Scene booted', summary.buildings, 'buildings;', summary.meshes, 'meshes');
    const entrances = await page.evaluate(() => {
      const d = NirmalDiagnostics;
      const invalid = d.entrances.filter(e => ![e.x, e.z, e.base, e.angle, e.width, e.height].every(Number.isFinite));
      const roadIssues = d.entrances.filter(e => {
        if (e.x < -400 || e.x > 205 || Math.abs(e.z) > 420) return false;
        const cs = Math.cos(e.angle); const sn = Math.sin(e.angle);
        const cx = e.x + sn * e.depth / 2; const cz = e.z + cs * e.depth / 2;
        const ex = Math.abs(cs) * (e.width / 2 + 0.5) + Math.abs(sn) * e.depth / 2;
        const ez = Math.abs(sn) * (e.width / 2 + 0.5) + Math.abs(cs) * e.depth / 2;
        return d.roadPositions.some(x => Math.abs(cx - x) < ex + 8)
          || d.roadZPositions.some(z => Math.abs(cz - z) < ez + 8);
      });
      return { count: d.entrances.length, missing: d.buildingBounds.filter(b => !b.entrance?.built), invalid, roadIssues };
    });
    assert.equal(entrances.count, summary.buildings, 'Every building has an entrance gate');
    assert.deepEqual(entrances.missing, []);
    assert.deepEqual(entrances.invalid, []);
    assert.deepEqual(entrances.roadIssues, [], 'Entrances must not extend onto city roads');
    const signals = await page.evaluate(() => {
      const states = [];
      for (const time of [0, 9, 12, 15, 23, 26]) {
        updateAmbient(time);
        states.push(signalMats.filter(s => s.mat.emissiveIntensity > 1).map(s => `${s.axis}:${s.lamp}`));
      }
      updateAmbient(simTime);
      return { count: NirmalDiagnostics.trafficSignals.length, states };
    });
    assert.equal(signals.count, 252);
    assert.deepEqual(signals.states, [
      ['x:green', 'z:red'], ['x:amber', 'z:red'], ['x:red', 'z:red'],
      ['x:red', 'z:green'], ['x:red', 'z:amber'], ['x:red', 'z:red'],
    ]);
    await page.evaluate(() => setQuality('low'));
    assert.ok(Object.keys(summary.architecture).length >= 11);
    for (const [type, min] of [['society', 3], ['school', 3], ['police station', 2], ['playground', 8]]) {
      assert.ok(summary.community.filter(c => c.type === type).length >= min, `Missing ${type}`);
    }
    assert.ok(summary.signs > 40);
    assert.ok(summary.alpineFlowers > 100);
    await page.waitForFunction(() => !document.getElementById('loading'));
    console.log('Checking sector addresses and hover');
    const sectorModulesCheck = await page.evaluate(() => {
      const d = NirmalDiagnostics;
      const modules = [...d.sectorModules.values()];
      const originalSeed = seed;
      const sample = code => withSectorSeed(code, 'build', () => [rand(), rand(), rand()]);
      const first = sample('Sector-31A');
      withSectorSeed('Sector-31B', 'build', () => { for (let i = 0; i < 1000; i++) rand(); });
      const second = sample('Sector-31A');
      const isolated = JSON.stringify(first) === JSON.stringify(second) && seed === originalSeed;
      let duplicateRejected = false;
      try { defineSector('Sector-31A', { build() {} }); } catch { duplicateRejected = true; }
      let rebuildRejected = false;
      try { buildSector('Sector-31A'); } catch { rebuildRejected = true; }
      return {
        count: modules.length,
        loaded: modules.every(m => [...document.scripts].some(s => s.getAttribute('src') === m.source)),
        built: modules.every(m => m.completed.has('build')),
        owned: d.buildingBounds.filter(b => b.ownerSectorCode).length,
        unownedInside: d.buildingBounds.filter(b => b.sectorCode && !b.ownerSectorCode),
        ownerMatches: d.buildingBounds.every(b => !b.ownerSectorCode || b.ownerSectorCode === b.sectorCode),
        isolated, duplicateRejected, rebuildRejected,
        officeFeatures: d.sectorModules.get('Sector-33D').features,
      };
    });
    assert.equal(sectorModulesCheck.count, 58);
    for (const field of ['loaded', 'built', 'ownerMatches', 'isolated', 'duplicateRejected', 'rebuildRejected']) {
      assert.equal(sectorModulesCheck[field], true, `Sector module check: ${field}`);
    }
    // Six riverbank towers, six mountain buildings and two field huts sit outside sectors.
    assert.equal(sectorModulesCheck.owned, 87, 'Road-bounded buildings are constructed by sector modules');
    assert.deepEqual(sectorModulesCheck.unownedInside, [], 'Every building inside a sector must have module ownership');
    assert.deepEqual(sectorModulesCheck.officeFeatures, ['documents']);
    const sector35B = await page.evaluate(() => {
      const module = NirmalDiagnostics.sectorModules.get('Sector-35B');
      const office = module.state.additionalBuilding;
      return {
        buildings: buildingBounds.filter(b => b.ownerSectorCode === module.code).length,
        floors: office.floors,
        floorBands: Math.floor((office.h - 4 - 1) / 3.6),
        sector: office.sectorCode, entrance: office.entrance.built,
      };
    });
    assert.deepEqual(sector35B, { buildings: 2, floors: 4, floorBands: 4, sector: 'Sector-35B', entrance: true });
    const sectorCoverage = await page.evaluate(() => {
      const d = NirmalDiagnostics;
      return {
        count: d.sectors.length,
        unique: new Set(d.sectors.map(s => s.code)).size,
        city: d.sectors.filter(s => s.district === 'City').length,
        village: d.sectors.filter(s => s.district === 'Village').length,
        centers: d.sectors.every(s => d.sectorAt(s.x, s.z)?.code === s.code),
        road: d.sectorAt(90, -45),
        outside: d.sectorAt(1500, 900),
        missingCityAddresses: d.buildingBounds.filter(b => b.x > -360 && b.x < 180 && b.z > -360 && b.z < 360 && !b.sectorCode).length,
      };
    });
    assert.equal(sectorCoverage.count, 58);
    assert.equal(sectorCoverage.unique, 58);
    assert.equal(sectorCoverage.city, 48);
    assert.equal(sectorCoverage.village, 9);
    assert.equal(sectorCoverage.centers, true);
    assert.equal(sectorCoverage.road, null);
    assert.equal(sectorCoverage.outside, null);
    assert.equal(sectorCoverage.missingCityAddresses, 0);
    const hoverPoint = await page.evaluate(() => {
      manual();
      Object.assign(desiredOrbit, { theta: 0, phi: 0.23, radius: 260, x: 45, y: 2, z: -45 });
      Object.assign(orbit, desiredOrbit);
      updateCamera(1);
      camera.updateMatrixWorld();
      const point = new THREE.Vector3(45, 0.45, -45).project(camera);
      return { x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2 };
    });
    await page.mouse.move(hoverPoint.x, hoverPoint.y);
    await page.waitForFunction(() => !document.getElementById('sectorTooltip').hidden);
    assert.equal(await page.textContent('#sectorTooltip'), 'Sector-34E');
    await page.mouse.down();
    assert.equal(await page.isVisible('#sectorTooltip'), false, 'Hide sector labels while dragging');
    await page.mouse.up();
    const roadPoint = await page.evaluate(() => {
      camera.updateMatrixWorld();
      const point = new THREE.Vector3(90, 0.45, -45).project(camera);
      return { x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2 };
    });
    await page.mouse.move(roadPoint.x, roadPoint.y);
    await page.waitForTimeout(350);
    assert.equal(await page.isVisible('#sectorTooltip'), false, 'Road hover must not show a sector');
    await page.mouse.move(hoverPoint.x, hoverPoint.y);
    await page.waitForFunction(() => !document.getElementById('sectorTooltip').hidden);
    await page.mouse.move(40, 150);
    assert.equal(await page.isVisible('#sectorTooltip'), false, 'Hide tooltip when leaving the canvas');
    console.log('Checking movement');

    // Panning moves the target without rotating the camera.
    await page.click('[data-move="pan"]');
    const before = await page.evaluate(() => NirmalDiagnostics.getDesiredOrbit());
    await page.mouse.move(720, 440); await page.mouse.down();
    await page.mouse.move(840, 480, { steps: 8 }); await page.mouse.up();
    const after = await page.evaluate(() => NirmalDiagnostics.getDesiredOrbit());
    assert.notEqual(after.x, before.x); assert.notEqual(after.z, before.z);
    assert.equal(after.theta, before.theta); assert.equal(after.phi, before.phi);
    await page.keyboard.press('ArrowLeft');
    assert.notEqual((await page.evaluate(() => NirmalDiagnostics.getDesiredOrbit())).x, after.x);
    await page.keyboard.press('o');
    assert.equal(await page.getAttribute('[data-move="orbit"]', 'aria-pressed'), 'true');

    // IST is correct even with an American browser timezone, including date rollover.
    console.log('Checking time');
    const clock = await page.evaluate(() => {
      NirmalDiagnostics.syncIndiaTime(new Date('2026-10-11T20:45:12Z'), true);
      const text = document.getElementById('indiaTime').textContent;
      const date = document.getElementById('indiaDate').textContent;
      const noon = NirmalDiagnostics.liveLightAt(new Date('2026-10-11T06:30:00Z'));
      const midnight = NirmalDiagnostics.liveLightAt(new Date('2026-10-11T18:30:00Z'));
      const sunrise = NirmalDiagnostics.liveLightAt(new Date('2026-10-11T00:30:00Z'));
      return { text, date, noon, midnight, sunrise };
    });
    assert.match(clock.text, /02:15:12\s*am/i); assert.match(clock.date, /12 Oct/);
    assert.equal(clock.noon.hour, 12); assert.equal(clock.noon.values.night, 0);
    assert.equal(clock.midnight.hour, 0); assert.equal(clock.midnight.values.night, 1);
    assert.ok(clock.sunrise.values.night > 0 && clock.sunrise.values.night < 1);
    await page.click('#pause');
    const timeBefore = await page.textContent('#indiaTime');
    await page.waitForTimeout(1200);
    assert.notEqual(await page.textContent('#indiaTime'), timeBefore);
    await page.click('.dock [data-light="day"]'); await page.waitForTimeout(1700);
    assert.equal(await page.getAttribute('.dock [data-light="day"]', 'aria-pressed'), 'true');

    // All nine curated views render, including the new community destinations.
    console.log('Checking camera views');
    for (let view = 0; view < 10; view++) {
      await page.evaluate(i => {
        NirmalDiagnostics.showView(i, true);
      }, view);
      await page.waitForTimeout(30);
      const finite = await page.evaluate(() => {
        NirmalDiagnostics.updateCamera(2);
        updateRenderVisibility();
        updateVehicleMatrices();
        updateAmbient(simTime + accumulator);
        NirmalDiagnostics.renderer.render(NirmalDiagnostics.scene, NirmalDiagnostics.camera);
        return NirmalDiagnostics.camera.position.toArray().every(Number.isFinite);
      });
      assert.ok(finite, `Camera ${view}`);
      if (process.env.SCREENSHOT_DIR && [0, 4, 5, 6, 7, 8, 9].includes(view)) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, `nirmal-view-${view}.png`) });
    }

    const footprintIssues = await page.evaluate(() => {
      const bounds = NirmalDiagnostics.buildingBounds;
      const overlaps = [];
      for (let i = 0; i < bounds.length; i++) for (let j = i + 1; j < bounds.length; j++) {
        const a = bounds[i], b = bounds[j];
        if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 0.1 && Math.abs(a.z - b.z) < (a.d + b.d) / 2 - 0.1) overlaps.push([a, b]);
      }
      const roadIntrusions = bounds.filter(b => b.x > -400 && b.x < 205 && Math.abs(b.z) < 420 &&
        (NirmalDiagnostics.roadPositions.some(x => Math.abs(b.x - x) < b.w / 2 + 8) || NirmalDiagnostics.roadZPositions.some(z => Math.abs(b.z - z) < b.d / 2 + 8)));
      return { overlaps, roadIntrusions };
    });
    console.log('Checking footprints', JSON.stringify(footprintIssues));
    assert.deepEqual(footprintIssues.overlaps, [], 'Overlapping building footprints');
    assert.deepEqual(footprintIssues.roadIntrusions, [], 'Building on a road');
    await page.evaluate(() => {
      density = 1;
      for (let i = 0; i < 1800; i++) NirmalDiagnostics.step(1 / 30);
      NirmalDiagnostics.step(1 / 30, true);
    });
    console.log('Checking document conversions');
    const documentChecks = await page.evaluate(async () => {
      const libs = await loadDocumentLibraries();
      const ensure = (value, message) => { if (!value) throw Error(message); };
      const file = (bytes, name, type) => new File([bytes], name, { type });
      const source = await libs.PDFLib.PDFDocument.create();
      for (const text of ['First page editable content', 'Second page content', 'Third page content']) source.addPage([595, 842]).drawText(text, { x: 50, y: 700, size: 18 });
      const sourceFile = file(await source.save({ useObjectStreams: false }), 'sample.pdf', 'application/pdf');
      const count = async result => (await libs.PDFLib.PDFDocument.load(await result.blob.arrayBuffer())).getPageCount();
      const checks = [];
      console.log('Document check: split');
      let result = await processDocumentFiles('pdf-split', [sourceFile], { range: '3, 1-2' });
      ensure(await count(result) === 3, 'PDF split page count');
      const split = await readRenderedPDF(file(await result.blob.arrayBuffer(), 'split.pdf'), libs);
      const firstText = await (await split.getPage(1)).getTextContent();
      ensure(firstText.items.some(item => item.str.includes('Third page')), 'PDF split order'); await split.destroy();
      result = await processDocumentFiles('pdf-split', [sourceFile], { split: 'individual' });
      const entries = libs.unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
      ensure(Object.keys(entries).length === 3, 'Individual page ZIP');
      for (const bytes of Object.values(entries)) ensure((await libs.PDFLib.PDFDocument.load(bytes)).getPageCount() === 1, 'Individual PDF page');
      let invalid = false;
      try { await processDocumentFiles('pdf-split', [sourceFile], { range: '0, 9' }); } catch (e) { invalid = /between 1 and 3/.test(e.message); }
      ensure(invalid, 'Invalid page range rejected'); checks.push('split, page ordering, ZIP and range validation');
      result = await processDocumentFiles('pdf-merge', [sourceFile, sourceFile]); ensure(await count(result) === 6, 'PDF merge page count'); checks.push('merge');
      console.log('Document check: compression');
      result = await processDocumentFiles('pdf-compress', [sourceFile], { compression: 'lossless' }); ensure(result.blob.size <= sourceFile.size && await count(result) === 3, 'Lossless compression');
      result = await processDocumentFiles('pdf-compress', [sourceFile], { compression: 'strong' }); ensure(result.blob.size <= sourceFile.size && await count(result) === 3, 'Image compression or original fallback'); checks.push('compression and larger-file fallback');
      result = await processDocumentFiles('pdf-word', [sourceFile], { layout: 'text' });
      console.log('Document check: Word');
      const word = await libs.mammoth.extractRawText({ arrayBuffer: await result.blob.arrayBuffer() });
      ensure(word.value.includes('First page editable content') && word.value.includes('Third page content'), 'Editable PDF-to-Word');
      result = await processDocumentFiles('pdf-word', [sourceFile], { layout: 'pages' });
      const wordEntries = libs.unzipSync(new Uint8Array(await result.blob.arrayBuffer()));
      const media = Object.keys(wordEntries).filter(name => name.startsWith('word/media/') && !name.endsWith('/'));
      ensure(media.length === 3, `Page-image PDF-to-Word: ${JSON.stringify(media)}`); checks.push('PDF to editable Word and visual Word');
      const doc = new libs.docx.Document({ sections: [{ children: [new libs.docx.Paragraph('Hello from a Word document'), new libs.docx.Paragraph('A second paragraph.')] }] });
      const docBlob = await libs.docx.Packer.toBlob(doc);
      result = await processDocumentFiles('word-pdf', [file(await docBlob.arrayBuffer(), 'sample.docx', docBlob.type)]);
      ensure(await count(result) >= 1, 'Word-to-PDF valid output'); checks.push('Word to PDF');
      result = await processDocumentFiles('md-pdf', [file('# Nirmal report\n\nA **formatted** document.\n\n| Tool | State |\n|---|---|\n| PDF | Ready |\n\n<script>window.injectedMarkdown = true</script>', 'report.md', 'text/markdown')]);
      console.log('Document check: images');
      ensure(await count(result) >= 1 && !window.injectedMarkdown, 'Markdown rendering and sanitisation'); checks.push('Markdown to PDF and HTML sanitisation');
      const c = document.createElement('canvas'); c.width = 40; c.height = 30; c.getContext('2d').fillRect(0, 0, 40, 30);
      const png = await canvasBlob(c, 'image/png');
      result = await processDocumentFiles('image-pdf', [file(await png.arrayBuffer(), 'photo.png', 'image/png'), file(await png.arrayBuffer(), 'other.png', 'image/png')]);
      ensure(await count(result) === 2, 'Image-to-PDF'); checks.push('images to PDF');
      // A noisy scan verifies actual lossy size reduction and scanned-page Word fallback.
      c.width = 500; c.height = 700;
      const pixels = c.getContext('2d').createImageData(500, 700); let seed = 913;
      for (let i = 0; i < pixels.data.length; i += 4) {
        seed = (1664525 * seed + 1013904223) >>> 0;
        const value = seed >>> 24; pixels.data[i] = value; pixels.data[i + 1] = value; pixels.data[i + 2] = value; pixels.data[i + 3] = 255;
      }
      c.getContext('2d').putImageData(pixels, 0, 0);
      const scan = await libs.PDFLib.PDFDocument.create();
      const scanImage = await scan.embedPng(await (await canvasBlob(c, 'image/png')).arrayBuffer());
      scan.addPage([595, 842]).drawImage(scanImage, { x: 0, y: 0, width: 595, height: 842 });
      const scanFile = file(await scan.save(), 'scan.pdf', 'application/pdf');
      console.log('Document check: scan compression');
      result = await processDocumentFiles('pdf-compress', [scanFile], { compression: 'strong' });
      ensure(result.blob.size < scanFile.size && result.detail.includes('text flattened'), 'Scan compression reduces size');
      result = await processDocumentFiles('pdf-word', [scanFile], { layout: 'text' });
      console.log('Document check: scan Word');
      ensure(result.detail.includes('preserved as images'), 'Scanned PDF preserved in Word');
      checks.push('scan compression and scanned PDF-to-Word fallback');
      invalid = false;
      try { await processDocumentFiles('pdf-merge', [sourceFile, file('broken', 'bad.pdf')]); } catch (e) { invalid = /readable PDF/.test(e.message); }
      ensure(invalid, 'Invalid PDF rejected'); checks.push('damaged file errors');
      return checks;
    });
    console.log('Document checks', documentChecks.join('; '));
    assert.equal(await page.locator('#documentFeatures').evaluate(el => el.open), false);
    await page.fill('#navSearch', 'merge');
    assert.equal(await page.locator('#documentFeatures').evaluate(el => el.open), true);
    assert.equal(await page.locator('#documentNav button:visible').count(), 1);
    await page.fill('#navSearch', '');
    assert.equal(await page.locator('#documentFeatures').evaluate(el => el.open), false);
    await page.click('#documentFeatures summary');
    assert.equal(await page.locator('#documentNav button:visible').count(), 7);
    await page.click('#documentNav [data-document-tool="md-pdf"]');
    await page.waitForTimeout(2800);
    assert.equal(await page.inputValue('#documentTool'), 'md-pdf');
    const officeTarget = await page.evaluate(() => NirmalDiagnostics.getDesiredOrbit());
    assert.equal(officeTarget.x, -45); assert.equal(officeTarget.z, -135);
    await page.setInputFiles('#documentFiles', { name: 'city-report.md', mimeType: 'text/markdown', buffer: Buffer.from('# City report\n\nA useful office in Nirmal.') });
    await page.click('#runDocumentTool');
    await page.waitForFunction(() => !document.getElementById('documentResult').hidden);
    const downloadPromise = page.waitForEvent('download'); await page.click('#downloadDocument');
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'city-report.pdf');
    const stream = await download.createReadStream(); const chunks = []; for await (const chunk of stream) chunks.push(chunk);
    assert.equal(Buffer.concat(chunks).subarray(0, 4).toString(), '%PDF');
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'nirmal-document-studio.png') });
    await page.click('#closeStudio');
    await page.evaluate(() => { NirmalDiagnostics.showView(9, true); }); await page.waitForTimeout(100);
    const officeScreen = await page.evaluate(() => {
      NirmalDiagnostics.updateCamera(3); NirmalDiagnostics.camera.updateMatrixWorld();
      const point = new THREE.Vector3(-45, 15, -126).project(NirmalDiagnostics.camera);
      return { x: (point.x + 1) * innerWidth / 2, y: (1 - point.y) * innerHeight / 2 };
    });
    await page.mouse.click(officeScreen.x, officeScreen.y);
    assert.equal(await page.isVisible('#documentStudio'), true, 'Clicking the office opens the workspace');
    await page.keyboard.press('Escape');
    assert.equal(await page.isVisible('#documentStudio'), false, 'Escape closes the workspace from the tool selector');
    await page.fill('#navSearch', 'merge');
    assert.equal(await page.locator('#documentNav button:visible').count(), 1);
    await page.fill('#navSearch', '');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('[data-move="pan"]');
    await page.click('.neighbourhood-links [data-view="7"]');
    const layout = await page.evaluate(() => [...document.querySelectorAll('.scene-brand, .india-clock, .explore-panel, .dock, .time-status')].map(el => {
      const r = el.getBoundingClientRect(); return { name: el.className, x: r.x, right: r.right, y: r.y, bottom: r.bottom };
    }));
    for (const rect of layout) assert.ok(rect.x >= 0 && rect.right <= 391 && rect.y >= 0 && rect.bottom <= 844, `Mobile overflow: ${JSON.stringify(rect)}`);
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'nirmal-mobile.png') });
    await page.click('#documentNav [data-document-tool="image-pdf"]');
    assert.equal(await page.isVisible('#documentStudio'), true);
    const studioRect = await page.locator('#documentStudio').boundingBox();
    assert.ok(studioRect.x >= 0 && studioRect.x + studioRect.width <= 390 && studioRect.y + studioRect.height <= 844);
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'nirmal-document-mobile.png') });
    assert.deepEqual(errors, [], 'Browser errors');
    console.log(JSON.stringify({ result: 'PASS', ...summary, documentChecks, checked: ['JS syntax', 'offline WebGL boot', 'pan and orbit', 'IST timezone and rollover', 'paused live clock', 'lighting previews', 'ten camera views', 'building footprints and road clearance', '60-second max-density simulation', 'office camera navigation and building click', 'upload, conversion and downloaded PDF', 'navigation search', 'mobile controls and document workspace'] }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
