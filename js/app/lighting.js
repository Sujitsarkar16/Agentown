/* Nirmal simulation — js/app/lighting.js
 * Day / golden-hour / night presets with smooth GSAP transitions. */
'use strict';

const lighting = {
  day: {
    night: 0, sun: [130, 520, 110], sunColor: '#fff3de', sunPower: 3.2, hemi: 1.9,
    sky: '#72a5c6', horizon: '#d4e2df', fog: '#cadbd7', exposure: 1.05,
    fogNear: 1550, fogFar: 3700, mist: 0.85,
    clock: '11:00', label: 'Clear morning',
  },
  golden: {
    night: 0, sun: [-260, 460, 260], sunColor: '#ffdda6', sunPower: 3.5, hemi: 1.8,
    sky: '#8aaab7', horizon: '#eadabe', fog: '#dcd9c7', exposure: 1.07,
    fogNear: 1250, fogFar: 3400, mist: 1.0,
    clock: '16:30', label: 'Golden hour',
  },
  night: {
    night: 1, sun: [-160, 520, -190], sunColor: '#adc4e5', sunPower: 0.8, hemi: 0.7,
    sky: '#0d1b33', horizon: '#283a49', fog: '#233748', exposure: 1.1,
    fogNear: 950, fogFar: 3000, mist: 0.7,
    clock: '20:00', label: 'A quieter evening',
  },
};

function applyLight(values) {
  renderRequested = true;
  night = values.night;
  sun.position.set(values.sx, values.sy, values.sz);
  sun.color.setRGB(values.sr, values.sg, values.sb);
  sun.intensity = values.sunPower;
  hemi.intensity = values.hemi;
  renderer.toneMappingExposure = values.exposure;
  scene.fog.color.setRGB(values.fr, values.fg, values.fb);
  scene.fog.near = values.fn;
  scene.fog.far = values.ff;
  sky.material.uniforms.top.value.setRGB(values.tr, values.tg, values.tb);
  sky.material.uniforms.bottom.value.setRGB(values.br, values.bg, values.bb);
  sky.material.uniforms.warm.value = 1 - night;
  sky.material.uniforms.sunDirection.value.copy(sun.position).normalize();
  river.material.uniforms.uNight.value = night;
  river.material.uniforms.uSun.value.copy(sun.position).normalize();
  mats.window.emissiveIntensity = night * 1.7;
  mats.warmwindow.emissiveIntensity = night * 1.4;
  mats.light.emissiveIntensity = 0.15 + night * 3;
  mats.tail.emissiveIntensity = 0.15 + night * 1.5;
  diagnostics.stars.material.opacity = night * 0.8;
  diagnostics.stars.visible = night > 0.001;
  // Mountain mist and cloud caps take the fog tint so they melt into the ranges.
  if (diagnostics.mistMats) {
    for (const m of diagnostics.mistMats) {
      m.color.setRGB(values.fr, values.fg, values.fb);
      m.opacity = m.userData.baseOpacity * values.mist;
    }
  }
  if (diagnostics.cloudMats) {
    for (const m of diagnostics.cloudMats) {
      m.color.setRGB(values.fr, values.fg, values.fb);
      m.opacity = m.userData.baseOpacity * (0.6 + values.mist * 0.4);
    }
  }
}

let lightValues = null;
let lightingMode = 'live';
let lastClockSecond = -1;
const indiaTimeFormat = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
const indiaDateFormat = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', weekday: 'short', day: 'numeric', month: 'short' });

function presetValues(mode) {
  const p = lighting[mode];
  const sc = new T.Color(p.sunColor);
  const tc = new T.Color(p.sky);
  const bc = new T.Color(p.horizon);
  const fc = new T.Color(p.fog);
  return {
    night: p.night, sx: p.sun[0], sy: p.sun[1], sz: p.sun[2],
    sr: sc.r, sg: sc.g, sb: sc.b, sunPower: p.sunPower, hemi: p.hemi, exposure: p.exposure,
    tr: tc.r, tg: tc.g, tb: tc.b, br: bc.r, bg: bc.g, bb: bc.b,
    fr: fc.r, fg: fc.g, fb: fc.b, fn: p.fogNear, ff: p.fogFar, mist: p.mist,
  };
}

// Local clock never depends on the user's browser timezone or simulation speed.
function indiaHour(date) {
  const ist = new Date(date.getTime() + 330 * 60000);
  return ist.getUTCHours() + ist.getUTCMinutes() / 60 + ist.getUTCSeconds() / 3600;
}

function liveLightAt(date) {
  const hour = indiaHour(date);
  const stops = [[0, 'night'], [5.25, 'night'], [6.5, 'golden'], [8, 'day'], [16.25, 'day'], [17.75, 'golden'], [19, 'night'], [24, 'night']];
  let i = 0;
  while (i < stops.length - 2 && hour >= stops[i + 1][0]) i++;
  const [start, from] = stops[i];
  const [end, to] = stops[i + 1];
  const a = presetValues(from);
  const b = presetValues(to);
  const mix = T.MathUtils.smoothstep(hour, start, end);
  const values = {};
  for (const key of Object.keys(a)) values[key] = lerp(a[key], b[key], mix);
  // Approximate east-to-west solar arc for this fictional Indian landscape.
  if (hour >= 6 && hour <= 18.5) {
    const angle = ((hour - 6) / 12.5) * Math.PI;
    values.sx = Math.cos(angle) * 470;
    values.sy = 90 + Math.sin(angle) * 560;
    values.sz = 190;
  }
  return { values, hour, phase: hour < 5.25 || hour >= 19 ? 'Night' : hour < 8 ? 'Sunrise' : hour < 16.25 ? 'Daylight' : 'Sunset' };
}

function transitionLight(to, instant) {
  if (lightValues) gsap.killTweensOf(lightValues);
  if (!lightValues || instant) {
    lightValues = { ...to };
    applyLight(lightValues);
  } else {
    gsap.to(lightValues, {
      ...to, duration: reduced ? 0.01 : 1.5, ease: 'power2.inOut',
      onUpdate: () => applyLight(lightValues),
    });
  }
}

function syncIndiaTime(date = new Date(), force = false) {
  const second = Math.floor(date.getTime() / 1000);
  if (!force && second === lastClockSecond) return;
  lastClockSecond = second;
  const text = indiaTimeFormat.format(date);
  $('#indiaTime').textContent = text;
  $('#indiaTime').dateTime = date.toISOString();
  $('#indiaDate').textContent = `${indiaDateFormat.format(date)} · India Standard Time`;
  $('#clock').textContent = text;
  const live = liveLightAt(date);
  $('#dayPhase').textContent = lightingMode === 'live' ? `${live.phase} · UTC +05:30` : `${lighting[lightingMode].label} preview`;
  if (lightingMode === 'live') {
    if (!gsap.isTweening(lightValues)) {
      lightValues = { ...live.values };
      applyLight(lightValues);
    }
    $('#weatherText').textContent = live.phase;
  }
  document.body.classList.toggle('night', night > 0.5);
}

function setLighting(mode, instant = false) {
  if (mode !== 'live' && !lighting[mode]) return;
  lightingMode = mode;
  const p = mode === 'live' ? liveLightAt(new Date()).values : presetValues(mode);
  transitionLight(p, instant);
  $$('[data-light]').forEach((b) => {
    const on = b.dataset.light === mode;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
  });
  $('#lightStatus').textContent = mode === 'live' ? 'Live India time' : 'Lighting preview · Clock stays live';
  syncIndiaTime(new Date(), true);
}
