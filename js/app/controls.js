/* Nirmal simulation — js/app/controls.js
 * Pointer / keyboard input, toolbar wiring and the 2D minimap. */
'use strict';

let moveMode = 'orbit';

function setMoveMode(mode) {
  moveMode = mode === 'pan' ? 'pan' : 'orbit';
  manual();
  $$('[data-move]').forEach((b) => {
    const on = b.dataset.move === moveMode;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
  $('#moveHint').textContent = moveMode === 'pan' ? 'Drag to move · Scroll to zoom' : 'Drag to orbit · Scroll to zoom';
  $('#world').setAttribute('aria-label', `Interactive 3D landscape. ${moveMode === 'pan' ? 'Drag to pan' : 'Drag to orbit'}, scroll or pinch to zoom.`);
}

function panCamera(dx, dy) {
  const scale = 2 * desiredOrbit.radius * Math.tan(camera.fov * Math.PI / 360) / Math.max(innerHeight, 1);
  const depth = 1 / Math.max(Math.cos(desiredOrbit.phi), 0.3);
  desiredOrbit.x = clamp(desiredOrbit.x - (dx * Math.cos(desiredOrbit.theta) + dy * depth * Math.sin(desiredOrbit.theta)) * scale, -1250, 1400);
  desiredOrbit.z = clamp(desiredOrbit.z + (dx * Math.sin(desiredOrbit.theta) - dy * depth * Math.cos(desiredOrbit.theta)) * scale, -1050, 1050);
}

function toast(text) {
  $('#toast').setAttribute('aria-label', text);
}

function togglePause() {
  paused = !paused;
  renderRequested = true;
  performanceTime = performanceFrames = slowFrames = 0;
  $('#pause').innerHTML = paused
    ? '<svg viewBox="0 0 24 24"><path d="m9 5 10 7-10 7Z"/></svg>'
    : '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>';
  $('#pause').setAttribute('aria-label', paused ? 'Resume city animation' : 'Pause city animation');
  $('#pause').classList.toggle('active', paused);
}

function controls() {
  const el = $('#world');
  sectorControls();
  const pointers = new Map();
  let drag = null;
  let pinch = 0;
  let midpoint = null;
  let clickStart = null;
  $$('[data-move]').forEach((b) => { b.onclick = () => setMoveMode(b.dataset.move); });

  el.addEventListener('contextmenu', (e) => e.preventDefault());
  el.addEventListener('pointerdown', (e) => {
    if (e.button > 2) return;
    clickStart = pointers.size ? null : { x: e.clientX, y: e.clientY, button: e.button };
    manual();
    el.focus({ preventScroll: true });
    el.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    el.classList.add('dragging');
    drag = { x: e.clientX, y: e.clientY, pan: moveMode === 'pan' || e.button === 1 || e.button === 2 || e.shiftKey };
    if (pointers.size === 2) {
      const a = Array.from(pointers.values());
      pinch = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      midpoint = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
    }
  });
  el.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const a = Array.from(pointers.values());
      const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      if (pinch > 0 && d > 0) desiredOrbit.radius = clamp(desiredOrbit.radius * pinch / d, 42, 1850);
      const mid = { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2 };
      if (midpoint) panCamera(mid.x - midpoint.x, mid.y - midpoint.y);
      midpoint = mid;
      pinch = d;
      drag = null;
      return;
    }
    if (!drag) { drag = { x: e.clientX, y: e.clientY, pan: moveMode === 'pan' }; return; }
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (drag.pan) {
      panCamera(dx, dy);
    } else {
      desiredOrbit.theta -= dx * 0.005;
      desiredOrbit.phi = clamp(desiredOrbit.phi - dy * 0.004, 0.23, 1.39);
    }
  });
  const end = (e) => {
    if (e.type === 'pointerup' && clickStart && clickStart.button === 0 && pointers.size === 1 && Math.hypot(e.clientX - clickStart.x, e.clientY - clickStart.y) < 5) {
      if (typeof pickDocumentOffice === 'function') pickDocumentOffice(e.clientX, e.clientY);
    }
    clickStart = null;
    pointers.delete(e.pointerId); drag = null; pinch = 0; midpoint = null;
    if (!pointers.size) el.classList.remove('dragging');
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('lostpointercapture', end);
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    manual();
    desiredOrbit.radius = clamp(desiredOrbit.radius * Math.exp(clamp(e.deltaY, -150, 150) * 0.0015), 42, 1850);
  }, { passive: false });
  el.addEventListener('dblclick', (e) => {
    if (typeof pickDocumentOffice === 'function' && pickDocumentOffice(e.clientX, e.clientY)) return;
    manual();
    const ray = new T.Raycaster();
    const rect = el.getBoundingClientRect();
    ray.setFromCamera(new T.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    ), camera);
    const p = new T.Vector3();
    const hit = ray.intersectObject(diagnostics.terrainMesh, true)[0];
    if (hit) p.copy(hit.point);
    if (hit || ray.ray.intersectPlane(new T.Plane(new T.Vector3(0, 1, 0), 0), p)) {
      const x = clamp(p.x, -1150, 1250);
      const z = clamp(p.z, -980, 980);
      gsap.to(desiredOrbit, { x, z, y: terrainHeight(x, z) + 3, duration: 0.9, ease: 'power2.out' });
    }
  });

  $('#tour').onclick = toggleTour;
  $('#pause').onclick = togglePause;
  $$('[data-view]').forEach((b) => { b.onclick = () => { stopTour(); showView(Number(b.dataset.view)); }; });
  $('#prevView').onclick = () => { stopTour(); showView(activeView - 1); };
  $('#nextView').onclick = () => { stopTour(); showView(activeView + 1); };
  $$('[data-light]').forEach((b) => { b.onclick = () => setLighting(b.dataset.light); });

  $('#settings').onclick = () => {
    const panel = $('#settingsPanel');
    panel.hidden = !panel.hidden;
    $('#settings').setAttribute('aria-expanded', !panel.hidden);
  };
  $('#closeSettings').onclick = () => {
    $('#settingsPanel').hidden = true;
    $('#settings').setAttribute('aria-expanded', 'false');
    $('#settings').focus();
  };

  $('#traffic').oninput = (e) => {
    density = Number(e.target.value) / 100;
    simulateTraffic(0);
    $('#trafficOutput').textContent = density === 0 ? 'Quiet' : density < 0.4 ? 'Light' : density < 0.8 ? 'Lively' : 'Busy';
  };
  $('#speed').oninput = (e) => {
    pace = Number(e.target.value);
    $('#speedOutput').textContent = pace.toFixed(2).replace(/0$/, '') + '×';
  };
  $$('[data-quality]').forEach((b) => { b.onclick = () => setQuality(b.dataset.quality); });
  $('#autoRotate').onchange = (e) => { stopTour(); autoOrbit = e.target.checked; };
  $('#movingPeople').onchange = (e) => { peopleOn = e.target.checked; updatePedestrians(simTime + accumulator); };

  const openHelp = () => { $('#helpModal').hidden = false; $('#closeHelp').focus(); };
  const closeHelp = () => { $('#helpModal').hidden = true; $('#help').focus(); };
  $('#help').onclick = openHelp;
  $('#closeHelp').onclick = closeHelp;
  $('#helpModal').onclick = (e) => { if (e.target === $('#helpModal')) closeHelp(); };

  $('#shot').onclick = () => {
    try {
      renderer.render(scene, camera);
      const a = document.createElement('a');
      a.download = 'Nirmal-city.png';
      a.href = renderer.domElement.toDataURL('image/png');
      a.click();
      toast('Your city photograph is ready.');
    } catch (err) {
      toast('Photography is unavailable in this browser.');
    }
  };

  addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (!$('#documentStudio').hidden && e.key === 'Escape') { closeDocumentStudio(); return; }
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
    if (e.target.closest('#documentStudio')) return;
    if (!$('#helpModal').hidden) {
      if (e.key === 'Escape') closeHelp();
      if (e.key === 'Tab') { e.preventDefault(); $('#closeHelp').focus(); }
      return;
    }
    if (e.key === 'Escape') {
      document.body.classList.remove('hudhidden');
      $('#settingsPanel').hidden = true;
      $('#settings').setAttribute('aria-expanded', 'false');
      stopTour();
      return;
    }
    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '=', 't', 'T', 'h', 'H', 'p', 'P', 'o', 'O'].includes(e.key)) {
      if (e.key === ' ' && e.target.tagName === 'BUTTON') return;
      e.preventDefault();
    }
    if (moveMode === 'pan' && e.key.startsWith('Arrow')) {
      manual();
      panCamera(e.key === 'ArrowLeft' ? 24 : e.key === 'ArrowRight' ? -24 : 0,
        e.key === 'ArrowUp' ? 24 : e.key === 'ArrowDown' ? -24 : 0);
      return;
    }
    switch (e.key) {
      case ' ': togglePause(); break;
      case 't': case 'T': toggleTour(); break;
      case 'h': case 'H': document.body.classList.toggle('hudhidden'); break;
      case 'p': case 'P': setMoveMode('pan'); break;
      case 'o': case 'O': setMoveMode('orbit'); break;
      case 'ArrowLeft': manual(); desiredOrbit.theta -= 0.08; break;
      case 'ArrowRight': manual(); desiredOrbit.theta += 0.08; break;
      case 'ArrowUp': manual(); desiredOrbit.phi = clamp(desiredOrbit.phi - 0.06, 0.23, 1.39); break;
      case 'ArrowDown': manual(); desiredOrbit.phi = clamp(desiredOrbit.phi + 0.06, 0.23, 1.39); break;
      case '+': case '=': manual(); desiredOrbit.radius = clamp(desiredOrbit.radius * 0.9, 42, 1850); break;
      case '-': manual(); desiredOrbit.radius = clamp(desiredOrbit.radius * 1.1, 42, 1850); break;
      default: break;
    }
  });

  addEventListener('resize', queueResize);
  el.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    paused = true;
    toast('Graphics paused. Restore the browser tab or reload to continue.');
  });
  el.addEventListener('webglcontextrestored', () => location.reload());

  if (reduced) { paused = false; togglePause(); }
  $('#tour').setAttribute('aria-pressed', 'false');
}

function minimap() {
  const c = $('#minimap').getContext('2d');
  const w = 284;
  const h = 232;
  const s = 0.43;
  const ox = 126;
  const oy = 116;
  const pt = (x, z) => [ox + x * s, oy + z * s];
  c.clearRect(0, 0, w, h);
  c.fillStyle = night > 0.5 ? '#263c36' : '#dce5d5';
  c.fillRect(21, 14, 185, 203);
  c.fillStyle = night > 0.5 ? '#31575f' : '#96bab2';
  c.fillRect(220, 0, 22, h);
  c.strokeStyle = night > 0.5 ? '#a1b297' : '#f5f5e9';
  c.lineWidth = 5;
  for (const r of roads) {
    c.beginPath(); c.moveTo(...pt(r, -215)); c.lineTo(...pt(r, 215)); c.stroke();
    c.beginPath(); c.moveTo(...pt(-215, r)); c.lineTo(...pt(212, r)); c.stroke();
  }
  for (const b of buildingBounds) {
    if (b.x > 200) continue;
    const [x, z] = pt(b.x - b.w / 2, b.z - b.d / 2);
    c.fillStyle = b.type === 'modern'
      ? (night > 0.5 ? '#6c8581' : '#a5b6ac')
      : (night > 0.5 ? '#829273' : '#bdc7af');
    c.fillRect(x, z, b.w * s, b.d * s);
  }
  c.fillStyle = '#5e8c65';
  for (const [x, z] of [[45, -45], [45, 45]]) {
    const q = pt(x - 28, z - 28);
    c.fillRect(...q, 56 * s, 56 * s);
  }
  c.fillStyle = night > 0.5 ? '#d9bd7d' : '#9b7646';
  c.beginPath(); c.arc(...pt(-45, -45), 5, 0, TAU); c.fill();
  const [tx, tz] = pt(orbit.x, orbit.z);
  c.fillStyle = night > 0.5 ? '#f0dd9a' : '#245d46';
  c.beginPath(); c.arc(tx, tz, 3.8, 0, TAU); c.fill();
  c.strokeStyle = c.fillStyle;
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(tx, tz);
  c.lineTo(tx + Math.sin(orbit.theta) * 13, tz + Math.cos(orbit.theta) * 13);
  c.stroke();
}
