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
renderer.toneMappingExposure = 1.05;
v3w.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf0f0f4, 2000, 6000);
const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 10000);

// ── Lighting ──
scene.add(new THREE.AmbientLight(0xffffff, 0.45));

const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.3);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 10;
keyLight.shadow.camera.far = 3000;
keyLight.shadow.bias = -0.0015;
scene.add(keyLight);
scene.add(keyLight.target);

const fillLight = new THREE.DirectionalLight(0xe0eeff, 0.45);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 0.25);
scene.add(rimLight);

// ── Materials ──
const matSmooth = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide
});
const matBase = new THREE.MeshStandardMaterial({ color: 0xe0e0e4, roughness: 0.6, metalness: 0.02 });
// Backdrops: very subtle, just a flat surface to catch shadows
const matBackdrop = new THREE.MeshStandardMaterial({
  color: 0xf0f0f3, roughness: 0.95, metalness: 0, side: THREE.FrontSide
});

let mainMesh = null;
let sceneObjects = [];

// ── Platform settings ──
let platformEnabled = true;
let platPadPct = 10;  // percent of nx
let platFilletPct = 4; // percent of CELL

function clearSceneObjects() {
  sceneObjects.forEach(o => {
    scene.remove(o);
    if (o.geometry) o.geometry.dispose();
  });
  sceneObjects = [];
  if (mainMesh) { scene.remove(mainMesh); mainMesh.geometry.dispose(); mainMesh = null; }
}

function buildPlatform(nx, nz) {
  if (!platformEnabled) return;
  const pad = nx * platPadPct / 100;
  const pw = nx + pad * 2, pd = nx + pad * 2;
  const ph = nz * 0.08;
  const fillet = Math.min(nz * platFilletPct / 100, ph * 0.8, 4);

  let geo;
  if (fillet > 0.5) {
    const shape = new THREE.Shape();
    const hw = pw / 2, hd = pd / 2, r = fillet;
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
      bevelThickness: Math.min(fillet, ph * 0.4),
      bevelSize: Math.min(fillet, ph * 0.4),
      bevelSegments: 3
    });
    geo.rotateX(-Math.PI / 2);
  } else {
    geo = new THREE.BoxGeometry(pw, ph, pd);
  }
  const mesh = new THREE.Mesh(geo, matBase);
  mesh.position.set(0, -nz / 2 - ph * 0.5, 0);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  sceneObjects.push(mesh);
}

function buildBackdrops(nx, nz) {
  // Thin, subtle walls positioned just behind the mesh to catch shadows
  const wallH = nz * 2.0;
  const wallW = nx * 1.4;
  const baseY = -nz / 2;
  const offset = nx * 0.58;

  // Back wall at -Z (catches shadow from front view)
  const backGeo = new THREE.PlaneGeometry(wallW, wallH);
  const backWall = new THREE.Mesh(backGeo, matBackdrop);
  backWall.position.set(0, baseY + wallH / 2, -offset);
  backWall.receiveShadow = true;
  scene.add(backWall);
  sceneObjects.push(backWall);

  // Side wall at +X (catches shadow from side view)
  const sideGeo = new THREE.PlaneGeometry(wallW, wallH);
  const sideWall = new THREE.Mesh(sideGeo, matBackdrop);
  sideWall.position.set(offset, baseY + wallH / 2, 0);
  sideWall.rotation.y = -Math.PI / 2;
  sideWall.receiveShadow = true;
  scene.add(sideWall);
  sceneObjects.push(sideWall);
}

export function rebuildScene() {
  clearSceneObjects();
  const nx = NX(), nz = S.CELL;

  buildPlatform(nx, nz);
  buildBackdrops(nx, nz);

  orthoFrustum = nx * 0.55 + nz * 0.55;
  camDist = Math.max(nx, nz) * 3;
  scene.fog.near = camDist * 1.5;
  scene.fog.far = camDist * 4;

  const extent = (nx + nz) * 1.5;
  const sc = keyLight.shadow.camera;
  sc.left = sc.bottom = -extent;
  sc.right = sc.top = extent;
  sc.updateProjectionMatrix();

  // Light from upper-front-left so shadows cast onto back wall and side wall
  keyLight.position.set(-nx * 0.6, nz * 3, nx * 0.8);
  keyLight.target.position.set(0, 0, 0);
  fillLight.position.set(nx * 1.2, nz * 1.5, -nx * 0.8);
  rimLight.position.set(0, -nz, nx * 2);

  resizeRenderer();
  updCam();
}

let theta = -Math.PI / 4, phi = Math.PI / 2.3, camDist = 600, orthoFrustum = 80;
let autoRot = true, oscTime = 0;
const OSC_CENTER = -Math.PI / 4;
const OSC_AMP    =  Math.PI / 4 * 1.08;
const OSC_SPD    =  0.006;
const PHI_CENTER =  Math.PI / 2.3;
const PHI_AMP    =  0.05;

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

// ── Platform UI ──
const platCheckbox = document.getElementById('platformOn');
const platControlsDiv = document.getElementById('platControls');
const platPadSlider = document.getElementById('platPad');
const platFilletSlider = document.getElementById('platFillet');

function updatePlatformUI() {
  platformEnabled = platCheckbox.checked;
  platControlsDiv.classList.toggle('disabled', !platformEnabled);
  platPadPct = parseInt(platPadSlider.value);
  platFilletPct = parseInt(platFilletSlider.value);
  rebuildScene();
  if (mainMesh) scheduleUpdate();
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
  const geo = buildModuleMeshes(S.sil1, S.sil2, S.CELL, GRID, 1.8);

  if (geo) {
    mainMesh = new THREE.Mesh(geo, matSmooth);
    // Rotate 45° around Y so front/side views project onto the two walls
    mainMesh.rotation.y = Math.PI / 4;
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    scene.add(mainMesh);
    const triCount = geo.index ? geo.index.count / 3 : 0;
    document.getElementById('vc').textContent = triCount > 0 ? triCount.toLocaleString() + ' triangles' : 'No intersection';
    // Auto-fit camera to mesh
    const box = new THREE.Box3();
    box.setFromObject(mainMesh);
    const size = box.getSize(new THREE.Vector3());
    orthoFrustum = Math.max(size.x, size.y, size.z) * 0.75;
    resizeRenderer();
  } else {
    document.getElementById('vc').textContent = 'No intersection';
  }
  bmsg.textContent = '';
}
