/* global THREE */
import {
  CELL,
  nCols,
  sil1,
  sil2,
  NX,
} from './state.js';
import { buildModuleMeshes } from './mesh.js';
import { updateCanvasSize } from './layout.js';

const v3w = document.getElementById('v3wrap');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xf0f0f4, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
v3w.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xf0f0f4, 2000, 6000);
const camera = new THREE.OrthographicCamera(-100, 100, 100, -100, 0.1, 10000);

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.2);
keyLight.position.set(200, 400, 200);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 10;
keyLight.shadow.camera.far = 2000;
keyLight.shadow.camera.left = keyLight.shadow.camera.bottom = -300;
keyLight.shadow.camera.right = keyLight.shadow.camera.top = 300;
keyLight.shadow.bias = -0.001;
scene.add(keyLight);
const fillLight = new THREE.DirectionalLight(0xe0eeff, 0.4);
fillLight.position.set(-200, 100, 200);
scene.add(fillLight);
scene.add(new THREE.DirectionalLight(0xffffff, 0.25)).position.set(0, -200, -400);

const matSmooth = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide
});
const matBase = new THREE.MeshStandardMaterial({ color: 0xe8e8ec, roughness: 0.5 });

let mainMesh = null, plateMesh = null, extraLines = [];

export function rebuildScene() {
  [mainMesh, plateMesh, ...extraLines].filter(Boolean).forEach(o => {
    scene.remove(o);
    if (o.geometry) o.geometry.dispose();
  });
  extraLines = [];
  mainMesh = null;

  const nx = NX(), nz = CELL;

  const pw = nx * 1.08, pd = nx * 1.08, ph = nz * 0.06;
  const pGeo = new THREE.BoxGeometry(pw, ph, pd);
  plateMesh = new THREE.Mesh(pGeo, matBase);
  plateMesh.position.set(0, -nz / 2 - ph / 2, 0);
  plateMesh.receiveShadow = true;
  scene.add(plateMesh);

  if (nCols > 1) {
    const dmat = new THREE.LineBasicMaterial({ color: 0xccccdd, transparent: true, opacity: 0.5 });
    for (let c = 1; c < nCols; c++) {
      const xp = c * CELL - nx / 2, zp = c * CELL - nx / 2;
      const mkLine = pts => {
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), dmat);
        scene.add(l); extraLines.push(l);
      };
      mkLine([
        new THREE.Vector3(xp, -nz / 2, -nx / 2), new THREE.Vector3(xp, nz / 2, -nx / 2),
        new THREE.Vector3(xp, nz / 2, nx / 2), new THREE.Vector3(xp, -nz / 2, nx / 2),
        new THREE.Vector3(xp, -nz / 2, -nx / 2)
      ]);
      mkLine([
        new THREE.Vector3(-nx / 2, -nz / 2, zp), new THREE.Vector3(-nx / 2, nz / 2, zp),
        new THREE.Vector3(nx / 2, nz / 2, zp), new THREE.Vector3(nx / 2, -nz / 2, zp),
        new THREE.Vector3(-nx / 2, -nz / 2, zp)
      ]);
    }
  }

  orthoFrustum = nx * 0.55 + nz * 0.55;
  camDist = Math.max(nx, nz) * 3;
  scene.fog.near = camDist * 1.5;
  scene.fog.far = camDist * 4;
  const sc = keyLight.shadow.camera;
  sc.left = sc.bottom = -(nx + nz);
  sc.right = sc.top = (nx + nz);
  sc.updateProjectionMatrix();
  keyLight.position.set(nx * 1.5, nz * 4, nx * 1.5);
  resizeRenderer();
  updCam();
}

let theta = Math.PI / 4, phi = 1.25, camDist = 600, orthoFrustum = 80;
let autoRot = true, oscTime = 0;
const OSC_BASE = Math.PI / 4, OSC_AMP = Math.PI / 2 * 1.05, OSC_SPD = 0.005;

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
  if (v) oscTime = Math.asin(Math.max(-1, Math.min(1, (theta - OSC_BASE) / OSC_AMP)));
}

export function setCameraFront() {
  setAutoRot(false); theta = 0; phi = Math.PI / 2; updCam();
}
export function setCameraSide() {
  setAutoRot(false); theta = -Math.PI / 2; phi = Math.PI / 2; updCam();
}
export function setCameraIso() {
  setAutoRot(false); theta = Math.PI / 4; phi = 1.2; updCam();
}
export function toggleSpin() {
  setAutoRot(!autoRot);
}

(function loop() {
  requestAnimationFrame(loop);
  if (autoRot) {
    oscTime += OSC_SPD;
    theta = OSC_BASE + OSC_AMP * Math.sin(oscTime);
    phi = 1.15 + 0.08 * Math.cos(oscTime * 0.7);
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

  const GRID = Math.min(CELL, 96);
  const geo = buildModuleMeshes(sil1, sil2, CELL, GRID, 1.8);

  if (geo) {
    mainMesh = new THREE.Mesh(geo, matSmooth);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    scene.add(mainMesh);
    const triCount = geo.index ? geo.index.count / 3 : 0;
    document.getElementById('vc').textContent = triCount > 0 ? triCount.toLocaleString() + ' triangles' : 'No intersection';
  } else {
    document.getElementById('vc').textContent = 'No intersection';
  }
  bmsg.textContent = '';
}
