/* Nirmal simulation — js/core/assets.js
 * Procedural textures, shared geometries and materials. */
'use strict';

function canvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function noiseTex(base, amount = 12) {
  return canvas(128, 128, (c, w, h) => {
    c.fillStyle = base;
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 6500; i++) {
      const k = Math.floor(rr(0, 255));
      c.fillStyle = `rgba(${k},${k},${k},${amount / 255})`;
      c.fillRect(rr(0, w), rr(0, h), rr(1, 3), rr(1, 3));
    }
  });
}

// Seamless, tileable surfaces with structured detail as well as fine grain.
function surfaceTex(kind) {
  const tex = canvas(256, 256, (c, w, h) => {
    const bases = { brick: '#ead7c4', paving: '#e1dfd5', plaster: '#faf4e6', roof: '#e0b39b', grass: '#c5d59a', wood: '#dab997', soil: '#d0af89' };
    c.fillStyle = bases[kind]; c.fillRect(0, 0, w, h);
    if (kind === 'brick' || kind === 'paving' || kind === 'roof') {
      const tw = kind === 'paving' ? 64 : 48;
      const th = kind === 'roof' ? 32 : 24;
      c.strokeStyle = kind === 'brick' ? '#fff1db' : '#a79a87'; c.lineWidth = 2;
      for (let y = 0; y < h; y += th) for (let x = -tw; x < w; x += tw) {
        const offset = kind === 'roof' ? 0 : ((y / th) % 2) * tw / 2;
        c.fillStyle = `rgba(100,70,45,${rr(0.02, 0.13)})`;
        c.fillRect(x + offset, y, tw, th); c.strokeRect(x + offset, y, tw, th);
        if (kind === 'roof') { c.fillStyle = '#fff4dc40'; c.fillRect(x + 3, y + 3, 3, th - 4); }
      }
    }
    for (let i = 0; i < 4800; i++) {
      const x = rr(0, w); const y = rr(0, h);
      c.fillStyle = rand() > 0.5 ? '#ffffff28' : '#4a452520';
      c.fillRect(x, y, kind === 'wood' ? rr(5, 26) : rr(1, 3), kind === 'grass' ? rr(2, 7) : 1);
    }
  });
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(kind === 'grass' || kind === 'paving' ? 6 : 3, 3);
  tex.anisotropy = 8;
  return tex;
}

function texturedMaterial(name, color, kind, bump = 0.1) {
  const map = surfaceTex(kind);
  return material(name, color, { map, bumpMap: map, bumpScale: bump, roughness: 0.88 });
}

// Near-white tiled detail map: multiplies vertex colours without shifting hue,
// adding rock strata streaks and fine grain for close-up mountain slopes.
function detailTex() {
  const tex = canvas(256, 256, (c, w, h) => {
    c.fillStyle = '#f4f4f2';
    c.fillRect(0, 0, w, h);
    // Horizontal strata bands.
    for (let i = 0; i < 26; i++) {
      const y = rr(0, h);
      c.fillStyle = `rgba(120,118,112,${rr(0.04, 0.10)})`;
      c.fillRect(0, y, w, rr(1, 4));
    }
    // Fine grain speckle.
    for (let i = 0; i < 9000; i++) {
      const k = Math.floor(rr(150, 255));
      c.fillStyle = `rgba(${k},${k},${k - 6},0.5)`;
      c.fillRect(rr(0, w), rr(0, h), rr(1, 2), rr(1, 2));
    }
    // A few darker cracks.
    c.strokeStyle = 'rgba(90,88,84,0.25)';
    for (let i = 0; i < 12; i++) {
      c.lineWidth = rr(0.5, 1.2);
      c.beginPath();
      let x = rr(0, w);
      let y = rr(0, h);
      c.moveTo(x, y);
      for (let k = 0; k < 4; k++) { x += rr(-22, 22); y += rr(6, 26); c.lineTo(x, y); }
      c.stroke();
    }
  });
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.repeat.set(90, 70);
  tex.anisotropy = 8;
  return tex;
}

// Soft radial puff for mist sprites: bright core fading to transparent edge.
function puffTex(size = 128, blobs = 1) {
  return canvas(size, size, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const blob = (cx, cy, r, a) => {
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(0.55, `rgba(255,255,255,${a * 0.45})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    };
    blob(w / 2, h / 2, w / 2, 0.85);
    for (let i = 1; i < blobs; i++) blob(rr(w * 0.3, w * 0.7), rr(h * 0.35, h * 0.65), rr(w * 0.2, w * 0.32), 0.5);
  });
}

// Vertical falling-water streaks; offset.y is scrolled each frame.
function foamTex() {
  const tex = canvas(64, 128, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.fillStyle = 'rgba(214,236,238,0.55)';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const x = rr(0, w);
      c.fillStyle = `rgba(255,255,255,${rr(0.25, 0.7)})`;
      c.fillRect(x, rr(-10, h), rr(1, 3), rr(14, 46));
    }
  });
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  return tex;
}

let terrainDetailTex;
let fogPuffTex;
let cloudPuffTex;
let waterfallTex;

function material(name, color, opts = {}) {
  const m = new T.MeshStandardMaterial({ color, roughness: 0.82, ...opts });
  mats[name] = m;
  return m;
}

function initAssets() {
  geoms.box = new T.BoxGeometry(1, 1, 1);
  geoms.sphere = new T.SphereGeometry(1, 12, 8);
  geoms.leaf = new T.IcosahedronGeometry(1, 1);
  geoms.leafNear = new T.IcosahedronGeometry(1, 2);
  geoms.pane = new T.PlaneGeometry(1, 1);
  geoms.signal = new T.SphereGeometry(1, 6, 5);
  geoms.roof = new T.CylinderGeometry(0, 1, 1, 4);
  geoms.roof.rotateY(Math.PI / 4);
  geoms.cyl = new T.CylinderGeometry(1, 1, 1, 12);
  geoms.cone = new T.ConeGeometry(1, 1, 12);
  geoms.dome = new T.SphereGeometry(1, 28, 18, 0, TAU, 0, Math.PI / 2);
  geoms.torus = new T.TorusGeometry(1, 0.08, 6, 32);

  material('sand', '#d8c4a2', { map: noiseTex('#ded0b8', 18) });
  material('stone', '#e5ded0', { map: noiseTex('#dfd9cc', 12) });
  texturedMaterial('terracotta', '#c18862', 'plaster', 0.06);
  texturedMaterial('ivory', '#f5ebd5', 'plaster', 0.06);
  material('white', '#eef1e8');
  texturedMaterial('concrete', '#c6cec7', 'plaster', 0.08);
  material('asphalt', '#383c3e', { map: noiseTex('#74787b', 38), roughness: 0.96 });
  texturedMaterial('paving', '#d1cbbb', 'paving', 0.12);
  material('kerb', '#d0d1c4');
  material('yellow', '#e3b34b');
  material('stripe', '#eee9d8');
  material('dark', '#283536');
  material('metal', '#465455', { metalness: 0.5, roughness: 0.36 });
  texturedMaterial('wood', '#8c6b49', 'wood', 0.08);
  material('trunk', '#685642');
  texturedMaterial('grass', '#91b476', 'grass', 0.1);
  material('hedge', '#435f40');
  material('leaf1', '#4e8654');
  material('leaf2', '#82a65b');
  material('leaf3', '#3c7753');
  material('flower', '#d59076');
  material('solar', '#234255', { metalness: 0.6, roughness: 0.24 });
  material('glass', '#527c89', { metalness: 0.5, roughness: 0.22, side: T.DoubleSide });
  material('window', '#45616c', {
    metalness: 0.35, roughness: 0.3, emissive: '#f5c271', emissiveIntensity: 0,
    side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });
  material('warmwindow', '#6c7569', {
    metalness: 0.3, roughness: 0.4, emissive: '#ffcb85', emissiveIntensity: 0,
    side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  });

  material('carWhite', '#f1f1e9', { metalness: 0.3, roughness: 0.26 });
  material('carRed', '#a54736', { metalness: 0.3, roughness: 0.26 });
  material('carBlue', '#416d81', { metalness: 0.4, roughness: 0.23 });
  material('carSilver', '#a9b5b8', { metalness: 0.5, roughness: 0.23 });
  material('carGold', '#bca66d', { metalness: 0.3, roughness: 0.3 });
  material('bus', '#27776b', { metalness: 0.3, roughness: 0.26 });
  material('auto', '#d7ad35', { metalness: 0.15, roughness: 0.45 });
  material('autoGreen', '#2c6842');
  material('tire', '#191e20', { roughness: 0.95 });
  material('chrome', '#9ba8ad', { metalness: 0.75, roughness: 0.23 });
  material('light', '#ede5bf', { emissive: '#ffe9a8', emissiveIntensity: 0.15 });
  material('tail', '#942c23', { emissive: '#f13c26', emissiveIntensity: 0.1 });

  material('signalX', '#397755', { emissive: '#60bc75', emissiveIntensity: 0.7 });
  material('signalZ', '#80382f', { emissive: '#e44431', emissiveIntensity: 0.7 });
  for (const axis of ['x', 'z']) {
    for (const [lamp, color] of [['red', '#ef4939'], ['amber', '#ffc34a'], ['green', '#55df83']]) {
      const mat = material(`signal${axis}_${lamp}`, color, { emissive: color, emissiveIntensity: 0.05 });
      signalMats.push({ mat, axis, lamp, color });
    }
  }

  material('skin', '#af856b');
  material('shirt1', '#627a96');
  material('shirt2', '#c89455');
  material('shirt3', '#b47170');
  material('trousers', '#344c4c');
  material('waterBase', '#5c9e9b');
  material('crop', '#879b4e');
  texturedMaterial('soil', '#b49a6a', 'soil', 0.15);
  texturedMaterial('villageWall', '#f1ddae', 'plaster', 0.1);
  texturedMaterial('roofTile', '#b97050', 'roof', 0.18);
  texturedMaterial('brick', '#bc8062', 'brick', 0.12);
  texturedMaterial('mintWall', '#b5d3bd', 'plaster', 0.08);
  texturedMaterial('peachWall', '#edc3a2', 'plaster', 0.08);
  texturedMaterial('blueWall', '#a1c8d7', 'plaster', 0.08);
  texturedMaterial('schoolWall', '#f4d995', 'plaster', 0.08);
  material('policeBlue', '#355975');
  material('courtBlue', '#539bad');
  material('courtGreen', '#63a879');
  material('playRed', '#df7354');
  material('rubber', '#dfbb82', { map: noiseTex('#f4e2bc', 22) });
  material('flowerPink', '#e3a0ba');
  material('flowerGold', '#f3d36c');

  // Rustic village materials (procedural, offline).
  material('mud', '#8a6f4d', { map: noiseTex('#9c825c', 30), roughness: 1 });
  material('mudDark', '#6b563d', { map: noiseTex('#79644a', 30), roughness: 1 });
  material('thatch', '#b99a5e', { map: noiseTex('#c8ab6c', 26), roughness: 1 });
  material('puddle', '#46575a', { metalness: 0.35, roughness: 0.22 });
  material('cowWhite', '#e8e2d4', { roughness: 0.9 });
  material('cowBrown', '#7a5233', { roughness: 0.9 });
  material('cowBlack', '#2e2a28', { roughness: 0.9 });
  material('hay', '#cfa64f', { map: noiseTex('#dab85e', 24), roughness: 1 });
  material('reed', '#5c7040', { roughness: 0.95 });
  material('shrub', '#55763f', { roughness: 0.95 });

  // Mountain detail materials (procedural, offline).
  terrainDetailTex = detailTex();
  fogPuffTex = puffTex(128, 1);
  cloudPuffTex = puffTex(128, 4);
  waterfallTex = foamTex();
  material('granite', '#8d8a83', { map: noiseTex('#a09d96', 30), roughness: 0.95 });
  material('snowbank', '#e9edea', { map: noiseTex('#f4f7f5', 10), roughness: 0.9 });
  material('pine', '#3b7454', { roughness: 0.95 });
  material('snowrock', '#7e8b91', { map: noiseTex('#9aa5ab', 26), roughness: 0.9 });
}
