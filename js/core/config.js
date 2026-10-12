/* Nirmal simulation — js/core/config.js
 * Shared global state, deterministic RNG and layout constants.
 * Classic script; load first. All distances are metres. */
'use strict';

const T = THREE;
const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const clamp = T.MathUtils.clamp;
const lerp = T.MathUtils.lerp;
const TAU = Math.PI * 2;

// Deterministic RNG so the city layout is stable across reloads.
let seed = 92617;
function rand() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}
const rr = (a, b) => a + (b - a) * rand();
const pick = (a) => a[Math.floor(rand() * a.length)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- Scene / simulation state (owned by core, mutated by app systems) ---
let scene;
let camera;
let renderer;
let sun;
let hemi;
let sky;
let river;
let night = 0;
let simTime = 0;
let paused = reduced;
let pace = 1;
let density = 0.90;
let activeView = 0;
let touring = false;
let tourTime = 0;

// --- Rendering / UI state ---
let fps = 60;
let frameCount = 0;
let lastStamp = 0;
let lastUI = 0;
let autoOrbit = false;
let peopleOn = true;
let quality = 'medium';

// --- City grid layout ---
const roads = [-360, -270, -180, -90, 0, 90, 180];
const roadZ = [-360, -270, -180, -90, 0, 90, 180, 270, 360];
const blockCenters = [-315, -225, -135, -45, 45, 135];
const blockZ = [-315, -225, -135, -45, 45, 135, 225, 315];
const villageX = [-990, -900, -810, -720];
const villageZ = [180, 270, 360, 450];

// --- Shared registries ---
const reservations = [];
const buildingBounds = [];
const staticBuckets = new Map();
const movingBuckets = new Map();
const pedestrianBuckets = new Map();
const vehicles = [];
const walkers = [];
const signalMats = [];
const streetLights = [];

const geoms = {};
const mats = {};
const dummy = new T.Object3D();
const tempMat = new T.Matrix4();
const rootMat = new T.Matrix4();

const diagnostics = {
  buildings: 0,
  trees: 0,
  roadPositions: roads,
  roadZPositions: roadZ,
  villageX,
  villageZ,
  vehicles,
  buildingBounds,
  reservations,
  errors: [],
};
window.NirmalDiagnostics = diagnostics;

function progress(v, label) {
  $('#loadProgress').style.transform = `scaleX(${v})`;
  $('#loadingText').textContent = label;
}
