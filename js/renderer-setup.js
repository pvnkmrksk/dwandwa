/* global THREE */
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

export const matSmooth = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.35, metalness: 0.05, side: THREE.DoubleSide,
});
export const matBase = new THREE.MeshStandardMaterial({
  color: 0xe8e8ec, roughness: 0.5, metalness: 0.02,
});
export const matBackdrop = new THREE.MeshStandardMaterial({
  color: 0xf0f0f4, roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
  transparent: true, opacity: 0.35,
});

/** Ortho frustum half-extent (Y) and camera distance — shared with mesh fitting. */
export const viewState = { orthoFrustum: 80, camDist: 600 };

export function updateLighting(box) {
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
    center.z + extent * 1.0,
  );
  keyLight.target.position.copy(center);

  fillLight.position.set(center.x + extent * 0.6, center.y + extent * 0.4, center.z - extent * 0.5);
  rimLight.position.set(center.x + extent * 0.3, center.y - extent * 0.2, center.z + extent * 0.8);
}

export function fitViewToLetterMesh(size) {
  const m = Math.max(size.x, size.y, size.z);
  viewState.orthoFrustum = m * 0.6;
  viewState.camDist = m * 3;
  scene.fog.near = viewState.camDist * 1.5;
  scene.fog.far = viewState.camDist * 5;
}

export function updCam() {
  const { camDist } = viewState;
  camera.position.set(
    camDist * Math.sin(phi) * Math.sin(theta),
    camDist * Math.cos(phi),
    camDist * Math.sin(phi) * Math.cos(theta),
  );
  camera.lookAt(0, 0, 0);
}

let theta = -Math.PI / 4 + Math.PI / 8;
let phi = Math.PI / 2.3;
let autoRot = true;
let oscTime = 0;
const OSC_CENTER = -Math.PI / 4 + Math.PI / 8;
const OSC_AMP = Math.PI / 4;
const OSC_SPD = 0.004;
const PHI_CENTER = Math.PI / 2.3;
const PHI_AMP = 0.03;

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

let resizeAttempts = 0;
const MAX_RESIZE_ATTEMPTS = 120;
export function resizeRenderer() {
  const w = v3w.clientWidth, h = v3w.clientHeight;
  if (w < 2 || h < 2) {
    if (resizeAttempts++ < MAX_RESIZE_ATTEMPTS)
      requestAnimationFrame(resizeRenderer);
    return;
  }
  resizeAttempts = 0;
  renderer.setSize(w, h);
  const a = w / h;
  const { orthoFrustum } = viewState;
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
  viewState.orthoFrustum = Math.max(5, Math.min(500, viewState.orthoFrustum * factor));
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

export { scene, camera, renderer, v3w, keyLight };
