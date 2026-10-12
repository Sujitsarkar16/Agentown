/* Nirmal simulation — js/terrain/atmosphere.js
 * Sky dome, heritage fountain droplets and night stars. */
'use strict';

let fountainPoints;
let mistSheets = [];
let cloudPuffs = [];

function atmosphere() {
  sky = new T.Mesh(
    new T.SphereGeometry(4800, 32, 20),
    new T.ShaderMaterial({
      side: T.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new T.Color('#6e9db5') },
        bottom: { value: new T.Color('#e3d9b7') },
        sunDirection: { value: new T.Vector3(0.7, 0.5, 0.2).normalize() },
        warm: { value: 1 },
      },
      vertexShader: 'varying vec3 vPos;void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'uniform vec3 top;uniform vec3 bottom;uniform vec3 sunDirection;uniform float warm;varying vec3 vPos;'
        + 'void main(){vec3 dir=normalize(vPos);float h=pow(clamp(dir.y+.05,0.,1.),.65);'
        + 'vec3 c=mix(bottom,top,h);float s=pow(max(dot(dir,sunDirection),0.),12.);'
        + 'c+=s*vec3(.27,.14,.05)*warm;gl_FragColor=vec4(c,1.);\n'
        + '#include <tonemapping_fragment>\n#include <colorspace_fragment> }',
    }),
  );
  sky.renderOrder = -100;
  scene.add(sky);

  // Animate spray on the GPU without uploading a fresh position buffer each frame.
  const fp = new Float32Array(160 * 3);
  const geo = new T.BufferGeometry();
  geo.setAttribute('position', new T.BufferAttribute(fp, 3));
  const pm = new T.PointsMaterial({
    color: '#dbf5e9', size: 0.14, transparent: true, opacity: 0.65, depthWrite: false,
  });
  const phases = new Float32Array(160);
  for (let i = 0; i < phases.length; i++) phases[i] = i;
  geo.setAttribute('aDrop', new T.BufferAttribute(phases, 1));
  geo.boundingSphere = new T.Sphere(new T.Vector3(-45, 3, -28), 5);
  pm.onBeforeCompile = shader => {
    shader.uniforms.uTime = { value: simTime };
    shader.vertexShader = 'uniform float uTime; attribute float aDrop;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      'float phase=fract(uTime*.45+aDrop/160.); float r=phase*2.8;'
      + 'vec3 transformed=vec3(-45.+cos(aDrop*2.4)*r,1.84+sin(phase*3.14159265)*2.6,-28.+sin(aDrop*2.4)*r);');
    pm.userData.shader = shader;
  };
  fountainPoints = new T.Points(geo, pm);
  scene.add(fountainPoints);

  // Fixed star field, faded in at night.
  const pos = [];
  for (let i = 0; i < 180; i++) {
    const theta = rr(0, TAU);
    const phi = rr(0, 1.2);
    const r = 1000;
    pos.push(
      Math.sin(phi) * Math.cos(theta) * r,
      Math.cos(phi) * r,
      Math.sin(phi) * Math.sin(theta) * r,
    );
  }
  const sg = new T.BufferGeometry();
  sg.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
  const stars = new T.Points(sg, new T.PointsMaterial({
    color: '#c9dae3', size: 1.4, transparent: true, opacity: 0, depthWrite: false,
  }));
  scene.add(stars);
  diagnostics.stars = stars;

  mountainFog();
}

// Layered valley mist + high drifting clouds over the eastern ranges.
// Sprites always face the camera, so banks read as fog from every view.
function mountainFog() {
  mistSheets = [];
  cloudPuffs = [];
  diagnostics.mistMats = [];
  diagnostics.cloudMats = [];

  // Three shared mist densities; lighting tints them per preset.
  const mistOpacities = [0.13, 0.19, 0.26];
  const mistMats = mistOpacities.map((o) => {
    const m = new T.SpriteMaterial({
      map: fogPuffTex, transparent: true, opacity: o, depthWrite: false,
    });
    m.userData.baseOpacity = o;
    diagnostics.mistMats.push(m);
    return m;
  });

  // Low banks hugging valleys and mid-slope shelves.
  for (let i = 0; i < 16; i++) {
    const x = rr(600, 1150);
    const z = rr(-850, 850);
    const ground = terrainHeight(x, z);
    const y = Math.max(ground + rr(14, 80), 22);
    const s = new T.Sprite(pick(mistMats));
    s.position.set(x, y, z);
    s.scale.set(rr(190, 390), rr(55, 120), 1);
    s.renderOrder = 5;
    s.userData = {
      bx: x, by: y, bz: z, ph: rr(0, TAU), sp: rr(0.05, 0.14), amp: rr(10, 26),
    };
    scene.add(s);
    mistSheets.push(s);
  }

  // High cloud caps drifting above the peaks.
  for (let i = 0; i < 9; i++) {
    const mat = new T.SpriteMaterial({
      map: cloudPuffTex, transparent: true, opacity: rr(0.45, 0.7), depthWrite: false,
    });
    mat.userData.baseOpacity = mat.opacity;
    diagnostics.cloudMats.push(mat);
    const x = rr(620, 1180);
    const z = rr(-900, 900);
    const c = new T.Sprite(mat);
    c.position.set(x, rr(330, 470), z);
    c.scale.set(rr(300, 520), rr(90, 170), 1);
    c.renderOrder = 6;
    c.userData = {
      bx: x, by: c.position.y, bz: z, ph: rr(0, TAU), sp: rr(0.03, 0.08), amp: rr(40, 80),
    };
    scene.add(c);
    cloudPuffs.push(c);
  }

  diagnostics.mist = mistSheets;
  diagnostics.cloudPuffs = cloudPuffs;
  diagnostics.clouds = cloudPuffs.length;
}

function updateMountainFog(t) {
  for (const s of mistSheets) {
    const u = s.userData;
    s.position.x = u.bx + Math.sin(t * u.sp + u.ph) * u.amp;
    s.position.z = u.bz + Math.cos(t * u.sp * 0.8 + u.ph) * u.amp * 0.6;
  }
  for (const c of cloudPuffs) {
    const u = c.userData;
    c.position.z = u.bz + Math.sin(t * u.sp + u.ph) * u.amp;
    c.position.x = u.bx + Math.cos(t * u.sp * 0.6 + u.ph) * u.amp * 0.35;
  }
}
