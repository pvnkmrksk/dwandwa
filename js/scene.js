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
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 5000;
keyLight.shadow.bias = -0.001;
keyLight.shadow.normalBias = 0.5;
scene.add(keyLight);
scene.add(keyLight.target);

const fillLight = new THREE.DirectionalLight(0xe0eeff, 0.35);
scene.add(fillLight);
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
  transparent: true, opacity: 0.35
});

let mainMesh = null;
let structureObjects = [];
let lastMeshBox = null;

// ── Structure settings (L-profile) ──
// These are read from UI in updateStructureUI()
let baseEnabled = true, basePadPct = 10, baseFilletPct = 4, baseOverlapPct = 4;
let backEnabled = true, backPadPct = 10, backOverlapPct = 4;

// ── Letter gap ──
export function setLetterGap(pct) {
  S.letterGapPct = pct;
}

// ── Exported for export-stl.js ──
export function getStructureSettings() {
  return {
    baseEnabled, basePadPct, baseFilletPct, baseOverlapPct,
    backEnabled, backPadPct, backOverlapPct,
  };
}

function clearStructureObjects() {
  structureObjects.forEach(o => {
    scene.remove(o);
    if (o.geometry) o.geometry.dispose();
  });
  structureObjects = [];
}

function buildBase(box) {
  if (!baseEnabled || !box) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const padFrac = basePadPct / 100;
  const pw = size.x * (1 + padFrac * 2) + 4;
  const pd = size.z * (1 + padFrac * 2) + 4;
  const ph = Math.max(size.y * 0.10, 2.5);
  const maxR = Math.min(pw, pd) * 0.25;
  const filletR = maxR * baseFilletPct / 20;

  // Overlap: base top penetrates into letters by overlapPct% of letter height
  const overlapY = size.y * baseOverlapPct / 100;
  const baseTopY = box.min.y + overlapY;

  let geo;
  if (filletR > 0.3) {
    const shape = new THREE.Shape();
    const hw = pw / 2, hd = pd / 2, r = filletR;
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
      depth: ph, bevelEnabled: false
    });
    geo.rotateX(-Math.PI / 2);
  } else {
    geo = new THREE.BoxGeometry(pw, ph, pd);
  }
  const mesh = new THREE.Mesh(geo, matBase);
  mesh.position.set(center.x, baseTopY - ph / 2, center.z);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  structureObjects.push(mesh);
}

function buildBackPanel(box) {
  if (!backEnabled || !box) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const padFrac = backPadPct / 100;
  // Back panel faces +X, at min-X of letters
  // Width = extent along Z (depth of modules), height = extent along Y
  const bpW = size.z * (1 + padFrac * 2) + 4;
  const bpH = size.y * (1 + padFrac * 2) + 4;
  const bpThick = Math.max(size.x * 0.04, 1.5);

  // Overlap: panel front face penetrates into letters by overlapPct% of letter X extent
  const overlapX = size.x * backOverlapPct / 100;
  const panelFrontX = box.min.x + overlapX;

  const geo = new THREE.BoxGeometry(bpThick, bpH, bpW);
  const mesh = new THREE.Mesh(geo, matBase);
  mesh.position.set(panelFrontX - bpThick / 2, center.y, center.z);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  structureObjects.push(mesh);
}

function buildBackdrops(box) {
  if (!box) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Subtle L-shaped backdrop walls for shadow reference
  // Positioned at the midplane of the bounding box
  const wallH = size.y * 1.8;
  const wallW = Math.max(size.x, size.z) * 1.8;
  const baseY = box.min.y - (baseEnabled ? size.y * 0.1 : 0);

  // The back panel is at min-X. Backdrop walls go at min-Z and max-X
  // to catch shadows from both word directions.
  const gap = Math.max(Math.min(size.x, size.z) * 0.4, 2);

  // Back wall (catches front-word shadow): at min-Z, centered on midplane
  const backGeo = new THREE.PlaneGeometry(wallW, wallH);
  const backWall = new THREE.Mesh(backGeo, matBackdrop);
  backWall.position.set(center.x, baseY + wallH / 2, center.z - size.z / 2 - gap);
  backWall.receiveShadow = true;
  scene.add(backWall);
  structureObjects.push(backWall);

  // Side wall (catches side-word shadow): at max-X
  const sideGeo = new THREE.PlaneGeometry(wallW, wallH);
  const sideWall = new THREE.Mesh(sideGeo, matBackdrop);
  sideWall.position.set(center.x + size.x / 2 + gap, baseY + wallH / 2, center.z);
  sideWall.rotation.y = -Math.PI / 2;
  sideWall.receiveShadow = true;
  scene.add(sideWall);
  structureObjects.push(sideWall);
}

function updateLighting(box) {
  if (!box) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const extent = Math.max(size.x, size.y, size.z) * 2;

  const sc = keyLight.shadow.camera;
  sc.left = sc.bottom = -extent * 2;
  sc.right = sc.top = extent * 2;
  sc.far = extent * 8;
  sc.updateProjectionMatrix();

  // Key light from upper diagonal — casts shadows onto both backdrop walls
  keyLight.position.set(
    center.x - extent * 0.8,
    center.y + extent * 1.5,
    center.z + extent * 1.0
  );
  keyLight.target.position.copy(center);

  fillLight.position.set(
    center.x + extent * 0.6,
    center.y + extent * 0.4,
    center.z - extent * 0.5
  );
  rimLight.position.set(
    center.x + extent * 0.3,
    center.y - extent * 0.2,
    center.z + extent * 0.8
  );
}

export function rebuildScene() {
  rebuildStructure();
}

export function rebuildStructure() {
  clearStructureObjects();
  if (lastMeshBox) {
    buildBase(lastMeshBox);
    buildBackPanel(lastMeshBox);
    buildBackdrops(lastMeshBox);
  }
}

// ── Camera ──
// Module rotation is 45° around Y. After rotation:
//   Front word view: θ = π/4 (camera at +X·sin45, y, +Z·cos45)
//   Side word view: θ = 3π/4 (camera at +X·sin45, y, -Z·cos45)
//   Diagonal (both): θ = π/2 (camera at +X, y, 0) — head-on to back panel
// Orbit: center at π/2, sweep ±π/2 for 180° total
let theta = Math.PI / 2, phi = Math.PI / 2.3, camDist = 600, orthoFrustum = 80;
let autoRot = true, oscTime = 0;
const OSC_CENTER = Math.PI / 2;      // diagonal = head-on to back panel
const OSC_AMP    = Math.PI / 2 * 1.04; // 180° sweep with 4% overshoot
const OSC_SPD    = 0.004;
const PHI_CENTER = Math.PI / 2.3;
const PHI_AMP    = 0.03;

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

// ── Scroll zoom ──
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
  // Head-on to front word (silhouette A): θ = π/4 (45°)
  setAutoRot(false); theta = Math.PI / 4; phi = PHI_CENTER; updCam();
}
export function setCameraSide() {
  // Head-on to side word (silhouette B): θ = 3π/4 (135°)
  setAutoRot(false); theta = 3 * Math.PI / 4; phi = PHI_CENTER; updCam();
}
export function setCameraIso() {
  // Head-on to back panel (diagonal, both words equally): θ = π/2 (90°)
  setAutoRot(false); theta = Math.PI / 2; phi = PHI_CENTER; updCam();
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

// ── Structure UI ──
export function updateStructureUI() {
  baseEnabled = document.getElementById('baseOn').checked;
  basePadPct = parseInt(document.getElementById('basePad').value);
  baseFilletPct = parseInt(document.getElementById('baseFillet').value);
  baseOverlapPct = parseInt(document.getElementById('baseOverlap').value);
  backEnabled = document.getElementById('backOn').checked;
  backPadPct = parseInt(document.getElementById('backPad').value);
  backOverlapPct = parseInt(document.getElementById('backOverlap').value);

  document.getElementById('baseControls').classList.toggle('disabled', !baseEnabled);
  document.getElementById('backControls').classList.toggle('disabled', !backEnabled);

  rebuildStructure();
}

// Wire up structure controls once DOM is ready
function wireStructureControls() {
  const ids = ['baseOn', 'basePad', 'baseFillet', 'baseOverlap', 'backOn', 'backPad', 'backOverlap'];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', updateStructureUI);
  });
}
wireStructureControls();

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

    const box = new THREE.Box3().setFromObject(mainMesh);
    lastMeshBox = box.clone();
    const size = box.getSize(new THREE.Vector3());

    orthoFrustum = Math.max(size.x, size.y, size.z) * 0.6;
    camDist = Math.max(size.x, size.y, size.z) * 3;
    scene.fog.near = camDist * 1.5;
    scene.fog.far = camDist * 5;

    rebuildStructure();
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
