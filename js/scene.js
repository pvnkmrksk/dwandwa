/* global THREE */
import S, { NX } from './state.js';
import { buildModuleMeshes } from './mesh.js';
import { updateCanvasSize } from './layout.js';

const v3w = document.getElementById('v3wrap');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xf0f0f4, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
v3w.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf0f0f4, 2000, 6000);
const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 10000);

// ── Lighting ──
// Soft ambient
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Key light: upper-left, casts shadows onto both backdrop walls
const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 5000;
keyLight.shadow.bias = -0.001;
keyLight.shadow.normalBias = 0.5;
scene.add(keyLight);
scene.add(keyLight.target);

// Fill light from opposite side
const fillLight = new THREE.DirectionalLight(0xe0eeff, 0.35);
scene.add(fillLight);

// Rim/back light for depth
const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
scene.add(rimLight);

// ── Materials ──
const matSmooth = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide
});
const matBase = new THREE.MeshStandardMaterial({
  color: 0xe8e8ec, roughness: 0.5, metalness: 0.02
});
const matBackdrop = new THREE.MeshStandardMaterial({
  color: 0xf0f0f4, roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
  transparent: true, opacity: 0.45
});

let mainMesh = null;
let platformObjects = [];  // just platform + backdrops (rebuild cheaply)
let lastMeshBox = null;    // bounding box of last mesh for platform sizing

// ── Platform settings ──
let platformEnabled = true;
let platPadPct = 10;
let platFilletPct = 4;

function clearPlatformObjects() {
  platformObjects.forEach(o => {
    scene.remove(o);
    if (o.geometry) o.geometry.dispose();
  });
  platformObjects = [];
}

function buildPlatform(box) {
  if (!platformEnabled || !box) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const padFrac = platPadPct / 100;
  const pw = size.x * (1 + padFrac * 2) + 4;
  const pd = size.z * (1 + padFrac * 2) + 4;
  const ph = Math.max(size.y * 0.06, 1.5);
  const maxFillet = Math.min(pw, pd, ph * 3) * 0.4;
  const fillet = maxFillet * platFilletPct / 20;

  let geo;
  if (fillet > 0.3) {
    const shape = new THREE.Shape();
    const hw = pw / 2, hd = pd / 2, r = Math.min(fillet, hw * 0.4, hd * 0.4);
    shape.moveTo(-hw + r, -hd);
    shape.lineTo(hw - r, -hd);
    shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
    shape.lineTo(hw, hd - r);
    shape.quadraticCurveTo(hw, hd, hw - r, hd);
    shape.lineTo(-hw + r, hd);
    shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
    shape.lineTo(-hw, -hd + r);
    shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);
    geo = new THREE.ExtrudeGeometry(shape, {
      depth: ph, bevelEnabled: true,
      bevelThickness: Math.min(r * 0.6, ph * 0.4),
      bevelSize: Math.min(r * 0.6, ph * 0.4),
      bevelSegments: 3
    });
    geo.rotateX(-Math.PI / 2);
  } else {
    geo = new THREE.BoxGeometry(pw, ph, pd);
  }
  const mesh = new THREE.Mesh(geo, matBase);
  // Flush with bottom of letters
  mesh.position.set(center.x, box.min.y - ph * 0.5, center.z);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  platformObjects.push(mesh);
}

function buildBackdrops(box) {
  if (!box) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Subtle L-shaped walls for shadow reference
  const wallH = size.y * 1.5;
  const wallW = size.x * 1.3;
  const baseY = box.min.y;
  const gap = Math.max(size.z * 0.5, 3);

  // Back wall at -Z
  const backGeo = new THREE.PlaneGeometry(wallW, wallH);
  const backWall = new THREE.Mesh(backGeo, matBackdrop);
  backWall.position.set(center.x, baseY + wallH / 2, box.min.z - gap);
  backWall.receiveShadow = true;
  scene.add(backWall);
  platformObjects.push(backWall);

  // Right wall at +X
  const sideGeo = new THREE.PlaneGeometry(wallW, wallH);
  const sideWall = new THREE.Mesh(sideGeo, matBackdrop);
  sideWall.position.set(box.max.x + gap, baseY + wallH / 2, center.z);
  sideWall.rotation.y = -Math.PI / 2;
  sideWall.receiveShadow = true;
  scene.add(sideWall);
  platformObjects.push(sideWall);
}

function updateLighting(box) {
  if (!box) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const extent = Math.max(size.x, size.y, size.z) * 2;

  // Shadow camera must cover entire scene including backdrops
  const sc = keyLight.shadow.camera;
  sc.left = sc.bottom = -extent * 2;
  sc.right = sc.top = extent * 2;
  sc.far = extent * 8;
  sc.updateProjectionMatrix();

  // Key light: from upper-left-front → casts shadows onto back wall (-Z) and right wall (+X)
  // This is the diagonal that projects onto both walls
  keyLight.position.set(
    center.x - extent * 1.0,   // from left (casts shadow rightward onto +X wall)
    center.y + extent * 1.5,   // from above
    center.z + extent * 1.0    // from front (casts shadow backward onto -Z wall)
  );
  keyLight.target.position.copy(center);

  // Fill: softer, from opposite direction
  fillLight.position.set(
    center.x + extent * 0.6,
    center.y + extent * 0.4,
    center.z - extent * 0.5
  );

  // Rim: from behind for edge definition
  rimLight.position.set(
    center.x + extent * 0.3,
    center.y - extent * 0.2,
    center.z + extent * 0.8
  );
}

// Called by text.js when word lengths change (updates lighting/fog for new dimensions)
export function rebuildScene() {
  rebuildPlatform();
}

export function rebuildPlatform() {
  clearPlatformObjects();
  if (lastMeshBox) {
    buildPlatform(lastMeshBox);
    buildBackdrops(lastMeshBox);
  }
}

// ── Camera ──
let theta = -Math.PI / 4, phi = Math.PI / 2.3, camDist = 600, orthoFrustum = 80;
let autoRot = true, oscTime = 0;
// Head-on = -PI/4 (diagonal). ±PI/4 from there = 0 (front word) and -PI/2 (side word)
const OSC_CENTER = -Math.PI / 4;
const OSC_AMP    =  Math.PI / 4 * 1.06;
const OSC_SPD    =  0.005;
const PHI_CENTER =  Math.PI / 2.3;
const PHI_AMP    =  0.03;

export function updCam() {
  camera.position.set(
    camDist * Math.sin(phi) * Math.sin(theta),
    camDist * Math.cos(phi),
    camDist * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(0, 0, 0);
}

function resizeRenderer() {
  const w = v3w.clientWidth, h = v3w.clientHeight;
  if (w < 2 || h < 2) return;
  renderer.setSize(w, h);
  const a = w / h;
  camera.left = -orthoFrustum * a; camera.right = orthoFrustum * a;
  camera.top = orthoFrustum; camera.bottom = -orthoFrustum;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resizeRenderer).observe(v3w);
setTimeout(resizeRenderer, 60);
window.addEventListener('resize', () => { updateCanvasSize(); resizeRenderer(); });

// ── Scroll zoom on preview ──
v3w.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = 1 + e.deltaY * 0.001;
  orthoFrustum = Math.max(5, Math.min(500, orthoFrustum * factor));
  resizeRenderer();
}, { passive: false });

// ── Pointer drag ──
let drag = false, pp = null;
v3w.addEventListener('pointerdown', e => {
  drag = true; pp = { x: e.clientX, y: e.clientY };
  v3w.setPointerCapture(e.pointerId); setAutoRot(false);
});
v3w.addEventListener('pointermove', e => {
  if (!drag || !pp) return;
  theta -= (e.clientX - pp.x) * 0.012;
  phi = Math.max(0.07, Math.min(Math.PI - 0.07, phi + (e.clientY - pp.y) * 0.012));
  pp = { x: e.clientX, y: e.clientY }; updCam();
});
v3w.addEventListener('pointerup', () => { drag = false; pp = null; });
v3w.addEventListener('pointercancel', () => { drag = false; pp = null; });

function setAutoRot(v) {
  autoRot = v;
  document.getElementById('ar').classList.toggle('active', v);
  if (v) oscTime = Math.asin(Math.max(-1, Math.min(1, (theta - OSC_CENTER) / OSC_AMP)));
}

export function setCameraFront() {
  setAutoRot(false); theta = 0; phi = PHI_CENTER; updCam();
}
export function setCameraSide() {
  setAutoRot(false); theta = -Math.PI / 2; phi = PHI_CENTER; updCam();
}
export function setCameraIso() {
  setAutoRot(false); theta = -Math.PI / 4; phi = 1.0; updCam();
}
export function toggleSpin() {
  setAutoRot(!autoRot);
}

(function loop() {
  requestAnimationFrame(loop);
  if (autoRot) {
    oscTime += OSC_SPD;
    theta = OSC_CENTER + OSC_AMP * Math.sin(oscTime);
    phi = PHI_CENTER + PHI_AMP * Math.sin(oscTime * 0.7);
    updCam();
  }
  renderer.render(scene, camera);
})();

// ── Platform UI (no mesh rebuild!) ──
const platCheckbox = document.getElementById('platformOn');
const platControlsDiv = document.getElementById('platControls');
const platPadSlider = document.getElementById('platPad');
const platFilletSlider = document.getElementById('platFillet');

function updatePlatformUI() {
  platformEnabled = platCheckbox.checked;
  platControlsDiv.classList.toggle('disabled', !platformEnabled);
  platPadPct = parseInt(platPadSlider.value);
  platFilletPct = parseInt(platFilletSlider.value);
  // Only rebuild platform + backdrops, NOT the mesh
  rebuildPlatform();
}
platCheckbox.addEventListener('change', updatePlatformUI);
platPadSlider.addEventListener('input', updatePlatformUI);
platFilletSlider.addEventListener('input', updatePlatformUI);

// ── Mesh update ──
const bmsg = document.getElementById('bmsg');
let pending = false;

export function scheduleUpdate() {
  if (pending) return; pending = true;
  bmsg.textContent = 'Computing\u2026';
  setTimeout(doUpdate, 30);
}

function doUpdate() {
  pending = false;

  if (mainMesh) { scene.remove(mainMesh); mainMesh.geometry.dispose(); mainMesh = null; }

  const GRID = Math.min(S.CELL, 96);
  const geo = buildModuleMeshes(S.sil1, S.sil2, S.CELL, GRID, 0.9);

  if (geo) {
    mainMesh = new THREE.Mesh(geo, matSmooth);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    scene.add(mainMesh);

    const triCount = geo.index ? geo.index.count / 3 : 0;
    document.getElementById('vc').textContent = triCount > 0 ? triCount.toLocaleString() + ' triangles' : 'No intersection';

    // Compute bounding box for auto-fit and platform
    const box = new THREE.Box3().setFromObject(mainMesh);
    lastMeshBox = box.clone();
    const size = box.getSize(new THREE.Vector3());

    // Auto-fit camera
    orthoFrustum = Math.max(size.x, size.y, size.z) * 0.75;
    camDist = Math.max(size.x, size.y, size.z) * 4;
    scene.fog.near = camDist * 1.5;
    scene.fog.far = camDist * 5;

    // Rebuild platform, backdrops, and lighting to match mesh
    rebuildPlatform();
    updateLighting(lastMeshBox);
    resizeRenderer();
  } else {
    document.getElementById('vc').textContent = 'No intersection';
    lastMeshBox = null;
  }
  bmsg.textContent = '';
}

// Initial setup
updCam();
