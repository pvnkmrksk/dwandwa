/* global THREE */
import S from './state.js';
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
  vertexColors: true, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide,
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
let baseEnabled = true;
let basePadXPct = 10, basePadZPct = 10, plateThickPct = 14, baseFilletPct = 4, baseOverlapPct = 4;
let backEnabled = true, backPadPct = 10, backOverlapPct = 4;
/** Extra Z offset for struts vs letter backs (% of mesh depth, signed). */
let strutZPct = 0;
/** Semi-transparent shadow-reference planes (off by default). */
const showBackdrops = false;

export function setLetterGap(pct) { S.letterGapPct = pct; }

export function getStructureSettings() {
  return {
    baseEnabled, basePadXPct, basePadZPct, plateThickPct, baseFilletPct, baseOverlapPct,
    backEnabled, backPadPct, backOverlapPct,
    alignBackEdges: S.alignBackEdges, equalGapPack: S.equalGapPack, backStrut: S.backStrut,
    strutZPct,
  };
}

function clearStructureObjects() {
  structureObjects.forEach(o => {
    scene.remove(o);
    if (o.geometry) o.geometry.dispose();
  });
  structureObjects = [];
}

// L-profile as two axis-aligned boxes: base slab and back wall move independently.
// Footprint sizes follow pad % only; overlap base shifts Y (signed), overlap back shifts the wall in Z only.
// No extrude bevel (avoids broken/shelled geometry and bogus plate growth).
function buildLProfile(box) {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  const basePadXF = basePadXPct / 100;
  const basePadZF = basePadZPct / 100;
  const backPadF = backPadPct / 100;
  const t = plateThickPct / 100;

  const baseW = size.x * (1 + basePadXF * 2) + 4;
  const baseD = size.z * (1 + basePadZF * 2) + 4;
  const plate = Math.max(size.y * t, 3 + plateThickPct * 0.06);
  const baseH = plate;
  const backT = plate;
  const backH = size.y * (1 + backPadF * 2) + 4;

  const baseTopY = box.min.y + size.y * (baseOverlapPct / 100);
  const backZDelta = size.z * (backOverlapPct / 100);
  const zWallFront = box.min.z + backZDelta;

  if (baseEnabled) {
    const g = new THREE.BoxGeometry(baseW, baseH, baseD);
    const mesh = new THREE.Mesh(g, matBase);
    mesh.position.set(center.x, baseTopY - baseH / 2, box.min.z - baseD / 2);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    structureObjects.push(mesh);
  }

  if (backEnabled) {
    const g = new THREE.BoxGeometry(baseW, backH, backT);
    const mesh = new THREE.Mesh(g, matBase);
    const zC = zWallFront - backT / 2;
    mesh.position.set(center.x, baseTopY + backH / 2, zC);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    structureObjects.push(mesh);
  }
}

/** Struts: manual mask (top-down) or auto columns using module column origins (moduleTx). */
function buildBackStruts(box) {
  if (!S.backStrut || !S.moduleTx) return;
  const size = box.getSize(new THREE.Vector3());
  const baseTopY = box.min.y + size.y * (baseOverlapPct / 100);
  const backPadF = backPadPct / 100;
  const backH = size.y * (1 + backPadF * 2) + 4;
  const plate = Math.max(size.y * (plateThickPct / 100), 3 + plateThickPct * 0.06);
  const backT = plate;
  const backZDelta = size.z * (backOverlapPct / 100);
  const zWallFront = box.min.z + backZDelta;
  const zStrutNudge = size.z * (strutZPct / 100);

  const y0 = baseTopY + backH * 0.12;
  const y1 = baseTopY + backH * 0.88;
  const yMid = (y0 + y1) / 2;
  const hY = y1 - y0;

  let useMask = S.strutUseMask && S.strutMask && S.strutMaskW > 0 && S.strutMaskD > 0;
  let maskAny = false;
  if (useMask) {
    for (let i = 0; i < S.strutMask.length; i++) {
      if (S.strutMask[i]) { maskAny = true; break; }
    }
  }
  useMask = useMask && maskAny;

  if (useMask) {
    const NX = S.strutMaskW;
    const D = S.strutMaskD;
    const hx = (size.x / NX) * 0.92;
    const hz = (size.z / D) * 0.92;
    for (let iz = 0; iz < D; iz++) {
      for (let ix = 0; ix < NX; ix++) {
        if (!S.strutMask[ix + iz * NX]) continue;
        const xC = box.min.x + (ix + 0.5) / NX * size.x;
        const zC = box.max.z - (iz + 0.5) / D * size.z + zStrutNudge;
        const g = new THREE.BoxGeometry(hx, hY, hz);
        const mesh = new THREE.Mesh(g, matBase);
        mesh.position.set(xC, yMid, zC);
        mesh.receiveShadow = true;
        mesh.castShadow = true;
        scene.add(mesh);
        structureObjects.push(mesh);
      }
    }
    return;
  }

  const strutW = Math.max(1.2, plate * 0.45);
  for (let i = 0; i < S.nCols; i++) {
    const cx = S.moduleTx[i];
    const zStart = box.min.z + zStrutNudge;
    const zLo = Math.min(zWallFront, zStart);
    const zHi = Math.max(zWallFront, zStart);
    const dz = zHi - zLo;
    if (dz < 0.5) continue;
    const g = new THREE.BoxGeometry(strutW, hY, dz);
    const mesh = new THREE.Mesh(g, matBase);
    mesh.position.set(cx, yMid, (zLo + zHi) / 2);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
    structureObjects.push(mesh);
  }
}

function buildBackdrops(box) {
  if (!box) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const S2 = Math.SQRT1_2;

  const wallH = size.y * 1.8;
  const wallW = Math.max(size.x, size.z) * 2.5;
  const baseY = box.min.y - (baseEnabled ? size.y * 0.08 : 0);
  const gap = Math.max(Math.min(size.x, size.z) * 0.4, 2);

  // Back wall: rotated 45° to match L-profile, behind the letters
  // Normal faces toward camera at diagonal view: (-S2, 0, S2)
  const backGeo = new THREE.PlaneGeometry(wallW, wallH);
  const backWall = new THREE.Mesh(backGeo, matBackdrop);
  // Place at max-d projection + gap, along diagonal behind direction
  const maxD = S2 * (box.max.x - box.min.z);
  const bdX = center.x + (gap + 2) * S2;
  const bdZ = center.z - (gap + 2) * S2;
  backWall.position.set(bdX, baseY + wallH / 2, bdZ);
  backWall.rotation.y = Math.PI / 4;
  backWall.receiveShadow = true;
  scene.add(backWall);
  structureObjects.push(backWall);

  // Side wall: rotated -45° to catch side-word shadow
  const sideGeo = new THREE.PlaneGeometry(wallW, wallH);
  const sideWall = new THREE.Mesh(sideGeo, matBackdrop);
  const sdX = center.x + (gap + 2) * S2;
  const sdZ = center.z + (gap + 2) * S2;
  sideWall.position.set(sdX, baseY + wallH / 2, sdZ);
  sideWall.rotation.y = -Math.PI / 4;
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

  keyLight.position.set(
    center.x - extent * 0.8,
    center.y + extent * 1.5,
    center.z + extent * 1.0
  );
  keyLight.target.position.copy(center);

  fillLight.position.set(center.x + extent * 0.6, center.y + extent * 0.4, center.z - extent * 0.5);
  rimLight.position.set(center.x + extent * 0.3, center.y - extent * 0.2, center.z + extent * 0.8);
}

export function rebuildScene() { rebuildStructure(); }

export function rebuildStructure() {
  clearStructureObjects();
  if (lastMeshBox) {
    if (baseEnabled || backEnabled) buildLProfile(lastMeshBox);
    if (S.backStrut && (baseEnabled || backEnabled)) buildBackStruts(lastMeshBox);
    if (showBackdrops) buildBackdrops(lastMeshBox);
  }
}

// ── Camera ──
// Modules are along X, each rotated 45° around Y.
// Diagonal view (both words equally visible): θ = -π/4
// Front word more visible: θ → 0 (looking along -Z)
// Side word more visible: θ → -π/2 (looking along +X)
// Spin: 90° total sweep (iso ±45°), not a full 180° behind the model
let theta = -Math.PI / 4 + Math.PI / 8, phi = Math.PI / 2.3, camDist = 600, orthoFrustum = 80;
let autoRot = true, oscTime = 0;
// Midpoint shifted +22.5° from pure iso so spin endpoints show front vs side more evenly
const OSC_CENTER = -Math.PI / 4 + Math.PI / 8;
const OSC_AMP    =  Math.PI / 4;  // 90° total sweep
const OSC_SPD    =  0.004;
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

let resizeAttempts = 0;
const MAX_RESIZE_ATTEMPTS = 120;
function resizeRenderer() {
  const w = v3w.clientWidth, h = v3w.clientHeight;
  if (w < 2 || h < 2) {
    if (resizeAttempts++ < MAX_RESIZE_ATTEMPTS)
      requestAnimationFrame(resizeRenderer);
    return;
  }
  resizeAttempts = 0;
  renderer.setSize(w, h);
  const a = w / h;
  camera.left = -orthoFrustum * a; camera.right = orthoFrustum * a;
  camera.top = orthoFrustum; camera.bottom = -orthoFrustum;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resizeRenderer).observe(v3w);
setTimeout(resizeRenderer, 60);
window.addEventListener('resize', () => { updateCanvasSize(); resizeRenderer(); });

v3w.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = 1 + e.deltaY * 0.001;
  orthoFrustum = Math.max(5, Math.min(500, orthoFrustum * factor));
  resizeRenderer();
}, { passive: false });

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
  setAutoRot(false); theta = -Math.PI / 4; phi = PHI_CENTER; updCam();
}
export function toggleSpin() { setAutoRot(!autoRot); }

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
  basePadXPct = parseInt(document.getElementById('basePadX').value);
  basePadZPct = parseInt(document.getElementById('basePadZ').value);
  plateThickPct = parseInt(document.getElementById('plateThick').value);
  baseFilletPct = parseInt(document.getElementById('baseFillet').value);
  baseOverlapPct = parseInt(document.getElementById('baseOverlap').value);
  backEnabled = document.getElementById('backOn').checked;
  backPadPct = parseInt(document.getElementById('backPad').value);
  backOverlapPct = parseInt(document.getElementById('backOverlap').value);
  const strutZEl = document.getElementById('strutZ');
  strutZPct = strutZEl ? parseInt(strutZEl.value) : 0;
  const ab = document.getElementById('alignBack');
  const eg = document.getElementById('equalGap');
  const bs = document.getElementById('backStrut');
  if (ab) S.alignBackEdges = ab.checked;
  if (eg) S.equalGapPack = eg.checked;
  if (bs) S.backStrut = bs.checked;
  const ptEl = document.getElementById('plateThickVal');
  if (ptEl) ptEl.textContent = plateThickPct + '%';
  const boEl = document.getElementById('baseOverlapVal');
  if (boEl) boEl.textContent = (baseOverlapPct >= 0 ? '+' : '') + baseOverlapPct + '%';
  const bovEl = document.getElementById('backOverlapVal');
  if (bovEl) bovEl.textContent = (backOverlapPct >= 0 ? '+' : '') + backOverlapPct + '%';
  const szEl = document.getElementById('strutZVal');
  if (szEl) szEl.textContent = (strutZPct >= 0 ? '+' : '') + strutZPct + '%';
  document.getElementById('baseControls').classList.toggle('disabled', !baseEnabled);
  document.getElementById('backControls').classList.toggle('disabled', !backEnabled);
  rebuildStructure();
}

(function wireStructureControls() {
  ['baseOn', 'basePadX', 'basePadZ', 'plateThick', 'baseFillet', 'baseOverlap', 'backOn', 'backPad', 'backOverlap', 'strutZ'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', updateStructureUI);
  });
  updateStructureUI();
})();

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
    S.moduleCenterX = null;
    S.moduleZBack = null;
    S.moduleTx = null;
  }
  bmsg.textContent = '';
}

updCam();
