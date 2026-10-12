/* Nirmal simulation — js/city/heritage.js
 * Civic hall square: sandstone arcades, dome, fountain and tricolour flag. */
'use strict';

function heritage(cx, cz) {
  box('paving', cx, 0.44, cz, 66, 0.12, 66);
  for (const s of [-1, 1]) {
    for (let q = -25; q <= 25; q += 12) {
      tree(cx + s * 29, cz + q, rr(6, 8));
      tree(cx + q, cz + s * 29, rr(6, 8));
    }
  }

  const z = cz - 8;
  const w = 32;
  const d = 22;
  const h = 11;
  recordBuilding(cx, z, w, d, 23, 'civic pavilion', { z: z + d / 2 + 0.26, base: 1.3, width: 3.2, height: 4.7 });
  box('stone', cx, 0.8, z, 40, 1, 30);
  box('sand', cx, 6.3, z, w, h, d);
  box('ivory', cx, 11.7, z, w + 1, 0.45, d + 1);
  box('terracotta', cx, 12.1, z, w + 0.5, 0.3, d + 0.5);
  part('cyl', 'sand', cx, 14, z, 7.2, 4, 7.2);
  part('dome', 'ivory', cx, 16, z, 7.5, 6.1, 7.5);
  part('cyl', 'yellow', cx, 22.2, z, 0.13, 1.9, 0.13);
  part('sphere', 'yellow', cx, 23, z, 0.35, 0.35, 0.35);

  // Repeated arcade modules: curved sandstone arches and recessed dark doors.
  for (let i = -2; i <= 2; i++) {
    const x = cx + i * 5.3;
    box('dark', x, 3.6, z + d / 2 + 0.032, 3.3, 5, 0.09);
    const arch = new T.Mesh(new T.TorusGeometry(1.68, 0.23, 6, 16, Math.PI), mats.ivory);
    arch.position.set(x, 6.05, z + d / 2 + 0.2);
    scene.add(arch);
    for (const s of [-1, 1]) box('ivory', x + s * 1.68, 3.6, z + d / 2 + 0.15, 0.46, 4.9, 0.36);
  }
  for (const s of [-1, 1]) {
    for (const q of [-1, 1]) {
      const x = cx + s * 13;
      const zq = z + q * 9;
      part('cyl', 'sand', x, 13, zq, 2.2, 2.5, 2.2);
      part('dome', 'ivory', x, 14.25, zq, 2.5, 2.7, 2.5);
      part('cyl', 'yellow', x, 17.1, zq, 0.08, 0.9, 0.08);
    }
  }
  for (let i = 0; i < 4; i++) box('stone', cx, 0.39 + i * 0.14, z + d / 2 + 4 - i * 0.6, 16, 0.28, 1.1);
  sign('निर्मल नगर भवन · NIRMAL CIVIC HALL', cx, 10.1, z + d / 2 + 0.24, 27, 1.45, 0, '#9f714d');

  // Circular courtyard fountain; droplets are animated in transit/people.js.
  part('cyl', 'stone', cx, 0.52, cz + 17, 6.4, 0.42, 6.4);
  part('cyl', 'waterBase', cx, 0.77, cz + 17, 5.8, 0.08, 5.8);
  part('cyl', 'stone', cx, 1.15, cz + 17, 1.1, 0.75, 1.1);
  part('cyl', 'stone', cx, 1.63, cz + 17, 2.8, 0.28, 2.8);
  part('cyl', 'waterBase', cx, 1.82, cz + 17, 2.5, 0.06, 2.5);
  for (const s of [-1, 1]) {
    bench(cx + s * 11, cz + 17, (s * Math.PI) / 2);
    planter(cx + s * 19, cz + 20, 7, 7);
    palm(cx + s * 20, cz + 20, 10);
  }
  box('grass', cx - 21, 0.52, cz - 8, 9, 0.1, 26);
  box('grass', cx + 21, 0.52, cz - 8, 9, 0.1, 26);

  // Tricolour flag is shader-animated, with the blue wheel painted into its texture.
  part('cyl', 'chrome', cx + 22, 6, cz + 5, 0.08, 12, 0.08);
  const flagtex = canvas(300, 200, (c, fw, fh) => {
    c.fillStyle = '#e79843'; c.fillRect(0, 0, fw, fh / 3);
    c.fillStyle = '#f5efe0'; c.fillRect(0, fh / 3, fw, fh / 3);
    c.fillStyle = '#418654'; c.fillRect(0, (fh * 2) / 3, fw, fh / 3);
    c.strokeStyle = '#244988';
    c.lineWidth = 2;
    c.beginPath(); c.arc(fw / 2, fh / 2, 23, 0, TAU); c.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i * TAU) / 24;
      c.beginPath();
      c.moveTo(fw / 2, fh / 2);
      c.lineTo(fw / 2 + 22 * Math.cos(a), fh / 2 + 22 * Math.sin(a));
      c.stroke();
    }
  });
  const fg = new T.PlaneGeometry(4.2, 2.8, 20, 10);
  const fm = new T.MeshStandardMaterial({ map: flagtex, side: T.DoubleSide, roughness: 0.9 });
  fm.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    fm.userData.shader = shader;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
      '#include <begin_vertex>',
      '#include <begin_vertex>\n float attach=(position.x+2.1)/4.2;'
      + ' transformed.z += sin(position.x*2.1-uTime*3.2)*0.28*attach;',
    );
  };
  const flag = new T.Mesh(fg, fm);
  flag.position.set(cx + 24.1, 10.4, cz + 5);
  scene.add(flag);
  diagnostics.flagMaterial = fm;
}
