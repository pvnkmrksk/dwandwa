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

// ── Lighting: key + fill + rim + ambient ──
scene.add(new THREE.AmbientLight(0xffffff, 0.4));

// Key light — warm, casts shadows on both backdrops
const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 10;
keyLight.shadow.camera.far = 3000;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);

// Fill light — cool, softer, opposite side
const fillLight = new THREE.DirectionalLight(0xe0eeff, 0.5);
scene.add(fillLight);

// Rim light — subtle backlight for edge definition
const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
scene.add(rimLight);

// ── Materials ──
const matSmooth = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide
});
const matBase = new THREE.MeshStandardMaterial({ color: 0xe0e0e4, roughness: 0.6, metalness: 0.02 });
const matBackdrop = new THREE.MeshStandardMaterial({ color: 0xeaeaee, roughness: 0.8, metalness: 0, side: THREE.DoubleSide });

let mainMesh = null;
let sceneObjects = []; // base, backdrops, etc.

function clearSceneObjects() {
  sceneObjects.forEach(o => {
    scene.remove(o);
    if (o.geometry) o.geometry.dispose();
  });
  sceneObjects = [];
  if (mainMesh) { scene.remove(mainMesh); mainMesh.geometry.dispose(); mainMesh = null; }
}

function buildBase(nx, nz) {
  // Rounded base plate with fillet
  const pw = nx * 1.12, pd = nx * 1.12, ph = nz * 0.08;
  const filletR = Math.min(ph * 0.5, 2);
  const shape = new THREE.Shape();
  const hw = pw / 2, hd = pd / 2;
  // Rounded rectangle profile (XZ plane, extruded along Y for fillet look)
  shape.moveTo(-hw + filletR, -hd);
  shape.lineTo(hw - filletR, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + filletR);
  shape.lineTo(hw, hd - filletR);
  shape.quadraticCurveTo(hw, hd, hw - filletR, hd);
  shape.lineTo(-hw + filletR, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - filletR);
  shape.lineTo(-hw, -hd + filletR);
  shape.quadraticCurveTo(-hw, -hd, -hw + filletR, -hd);

  const extrudeSettings = { depth: ph, bevelEnabled: true, bevelThickness: filletR, bevelSize: filletR, bevelSegments: 3 };
  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Rotate so extrusion goes upward (Y)
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, matBase);
  mesh.position.set(0, -nz / 2 - ph, 0);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  scene.add(mesh);
  sceneObjects.push(mesh);
  return { pw, pd, ph };
}

function buildBackdrops(nx, nz) {
  const wallH = nz * 1.6;
  const wallW = nx * 1.1;
  const wallD = 1;
  const baseY = -nz / 2;

  // Back wall (behind, catches front shadow) — at -Z
  const backGeo = new THREE.BoxGeometry(wallW, wallH, wallD);
  const backWall = new THREE.Mesh(backGeo, matBackdrop);
  backWall.position.set(0, baseY + wallH / 2, -nx * 0.56);
  backWall.receiveShadow = true;
  scene.add(backWall);
  sceneObjects.push(backWall);

  // Side wall (right side, catches side shadow) — at +X
  const sideGeo = new THREE.BoxGeometry(wallD, wallH, wallW);
  const sideWall = new THREE.Mesh(sideGeo, matBackdrop);
  sideWall.position.set(nx * 0.56, baseY + wallH / 2, 0);
  sideWall.receiveShadow = true;
  scene.add(sideWall);
  sceneObjects.push(sideWall);
}

export function rebuildScene() {
  clearSceneObjects();

  const nx = NX(), nz = S.CELL;

  const base = buildBase(nx, nz);
  buildBackdrops(nx, nz);

  // Update camera and lights for scene size
  orthoFrustum = nx * 0.55 + nz * 0.55;
  camDist = Math.max(nx, nz) * 3;
  scene.fog.near = camDist * 1.5;
  scene.fog.far = camDist * 4;

  // Shadow camera covers full scene
  const sc = keyLight.shadow.camera;
  const extent = (nx + nz) * 1.5;
  sc.left = sc.bottom = -extent;
  sc.right = sc.top = extent;
  sc.updateProjectionMatrix();

  // Position lights relative to scene
  keyLight.position.set(nx * 0.8, nz * 3, -nx * 0.6);
  keyLight.target.position.set(0, 0, 0);
  scene.add(keyLight.target);
  fillLight.position.set(-nx * 1.2, nz * 1.5, nx * 0.8);
  rimLight.position.set(0, -nz, nx * 2);

  resizeRenderer();
  updCam();
}

let theta = -Math.PI / 4, phi = Math.PI / 2.3, camDist = 600, orthoFrustum = 80;
let autoRot = true, oscTime = 0;
// Orbit 180° in front plane: from front (theta=0) to side (theta=-PI/2)
const OSC_CENTER = -Math.PI / 4;
const OSC_AMP    =  Math.PI / 4 * 1.08; // slight overshoot
const OSC_SPD    =  0.006;
const PHI_CENTER =  Math.PI / 2.3; // slightly above head-on for depth
const PHI_AMP   =  0.05; // subtle vertical wobble

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
    phi = PHI_CENTER + PHI_AMP * Math.sin(oscTime * 0.7); // gentle tilt
    updCam();
  }
  renderer.render(scene, camera);
})();

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
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    scene.add(mainMesh);
    const triCount = geo.index ? geo.index.count / 3 : 0;
    document.getElementById('vc').textContent = triCount > 0 ? triCount.toLocaleString() + ' triangles' : 'No intersection';
    // Auto-fit camera to mesh (not backdrops, those are background)
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
