/* global THREE */
import { updateCanvasSize } from './layout.js';

const v3w = document.getElementById('v3wrap');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
function effectivePixelRatio() {
  const dpr = window.devicePixelRatio || 1;
  const low = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
  const cap = low ? 1.5 : 2.25;
  return Math.min(dpr, cap);
}
renderer.setPixelRatio(effectivePixelRatio());
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const _isDark = document.documentElement.dataset.theme === 'dark';
const _bgColor = _isDark ? 0x1a1a20 : 0xf0f0f4;
renderer.setClearColor(_bgColor, 1);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
v3w.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(_bgColor, 2000, 6000);
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
  color: _isDark ? 0x38383c : 0xe8e8ec, roughness: 0.5, metalness: 0.02,
});
export const matBackdrop = new THREE.MeshStandardMaterial({
  color: _bgColor, roughness: 0.95, metalness: 0, side: THREE.DoubleSide,
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

/** Orbit endpoints (rad): left / right silhouette views; spin oscillates between these. */
export const VIEW_LEFT_TH = -0.81;
export const VIEW_RIGHT_TH = 0.81;
export const VIEW_LR_PHI = 1.5219098493868668;
const OSC_SPD = 0.0032;
const PHI_CENTER = Math.PI / 2.3;

let theta = 0;
let phi = VIEW_LR_PHI;
let autoRot = true;
let oscTime = 0;

function setAutoRot(v) {
  autoRot = v;
  document.getElementById('ar').classList.toggle('active', v);
  if (v) {
    const span = VIEW_RIGHT_TH - VIEW_LEFT_TH;
    let t = span > 1e-6 ? (theta - VIEW_LEFT_TH) / span : 0.5;
    t = Math.max(0, Math.min(1, t));
    oscTime = Math.asin(Math.max(-1, Math.min(1, 2 * t - 1)));
  }
}

export function setCameraFront() {
  setAutoRot(false); theta = 0; phi = PHI_CENTER; updCam();
}
/** Legacy side view (−π/2). */
export function setCameraSide() {
  setAutoRot(false); theta = -Math.PI / 2; phi = PHI_CENTER; updCam();
}
export function setCameraLeft() {
  setAutoRot(false); theta = VIEW_LEFT_TH; phi = VIEW_LR_PHI; updCam();
}
export function setCameraRight() {
  setAutoRot(false); theta = VIEW_RIGHT_TH; phi = VIEW_LR_PHI; updCam();
}
export function setCameraIso() {
  setAutoRot(false); theta = -Math.PI / 4; phi = PHI_CENTER; updCam();
}
export function toggleSpin() { setAutoRot(!autoRot); }

export function getCameraPose() {
  return {
    theta,
    phi,
    autoRot,
    orthoFrustum: viewState.orthoFrustum,
    thetaDeg: theta * (180 / Math.PI),
    phiDeg: phi * (180 / Math.PI),
  };
}

export function setCameraPose(t, p, { stopSpin = true } = {}) {
  if (stopSpin) setAutoRot(false);
  theta = t;
  phi = Math.max(0.07, Math.min(Math.PI - 0.07, p));
  updCam();
}

let _camAnim = null;
export function animateCameraPose(from, to, durationMs = 1400) {
  if (_camAnim) cancelAnimationFrame(_camAnim);
  setAutoRot(false);
  const th0 = from.theta;
  const th1 = to.theta;
  const ph0 = from.phi;
  const ph1 = to.phi;
  let dTh = th1 - th0;
  while (dTh > Math.PI) dTh -= Math.PI * 2;
  while (dTh < -Math.PI) dTh += Math.PI * 2;
  const t0 = performance.now();
  function ease(u) { return u * u * (3 - 2 * u); }
  function frame(now) {
    const u = Math.min(1, (now - t0) / durationMs);
    const e = ease(u);
    theta = th0 + dTh * e;
    phi = ph0 + (ph1 - ph0) * e;
    updCam();
    if (u < 1) _camAnim = requestAnimationFrame(frame);
    else _camAnim = null;
  }
  _camAnim = requestAnimationFrame(frame);
}

function formatCamDebug() {
  const p = getCameraPose();
  return [
    `theta_rad ${p.theta.toFixed(5)}  phi_rad ${p.phi.toFixed(5)}`,
    `theta_deg ${p.thetaDeg.toFixed(2)}  phi_deg ${p.phiDeg.toFixed(2)}`,
    `autoRot ${p.autoRot}  orthoFrustum ${p.orthoFrustum.toFixed(3)}`,
    '',
    'JSON (for animateCameraPose):',
    JSON.stringify({ theta: p.theta, phi: p.phi }, null, 0),
  ].join('\n');
}

let _dbgSkip = 0;

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
window.addEventListener('resize', () => {
  renderer.setPixelRatio(effectivePixelRatio());
  updateCanvasSize();
  resizeRenderer();
});

v3w.addEventListener('wheel', e => {
  e.preventDefault();
  const factor = 1 + e.deltaY * 0.001;
  viewState.orthoFrustum = Math.max(5, Math.min(500, viewState.orthoFrustum * factor));
  resizeRenderer();
}, { passive: false });

let drag = false, pp = null;
const _ptrs = new Map();
let _pinchDist = 0;

function _pinchSpan() {
  const pts = [..._ptrs.values()];
  if (pts.length < 2) return 0;
  return Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
}

v3w.addEventListener('pointerdown', e => {
  _ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  try { v3w.setPointerCapture(e.pointerId); } catch (_) { /* noop */ }
  setAutoRot(false);
  if (_ptrs.size === 2) {
    drag = false;
    pp = null;
    _pinchDist = _pinchSpan();
  } else {
    drag = true;
    pp = { x: e.clientX, y: e.clientY };
  }
});
v3w.addEventListener('pointermove', e => {
  if (!_ptrs.has(e.pointerId)) return;
  _ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (_ptrs.size >= 2) {
    const d = _pinchSpan();
    if (_pinchDist > 0 && d > 0) {
      const s = _pinchDist / d;
      viewState.orthoFrustum = Math.max(5, Math.min(500, viewState.orthoFrustum * s));
      resizeRenderer();
    }
    _pinchDist = d;
    return;
  }
  if (!drag || !pp) return;
  theta -= (e.clientX - pp.x) * 0.012;
  phi = Math.max(0.07, Math.min(Math.PI - 0.07, phi + (e.clientY - pp.y) * 0.012));
  pp = { x: e.clientX, y: e.clientY }; updCam();
});
function _ptrEnd(e) {
  _ptrs.delete(e.pointerId);
  if (_ptrs.size < 2) _pinchDist = 0;
  if (_ptrs.size === 0) { drag = false; pp = null; }
  else if (_ptrs.size === 1) {
    const id = _ptrs.keys().next().value;
    const p = _ptrs.get(id);
    drag = true;
    pp = p ? { x: p.x, y: p.y } : null;
  }
}
v3w.addEventListener('pointerup', _ptrEnd);
v3w.addEventListener('pointercancel', _ptrEnd);

(function loop() {
  requestAnimationFrame(loop);
  if (autoRot) {
    oscTime += OSC_SPD;
    const u = 0.5 + 0.5 * Math.sin(oscTime);
    theta = VIEW_LEFT_TH + (VIEW_RIGHT_TH - VIEW_LEFT_TH) * u;
    phi = VIEW_LR_PHI;
    updCam();
  }
  const dbg = document.getElementById('camDebug');
  if (dbg && !dbg.hidden && ++_dbgSkip >= 12) {
    _dbgSkip = 0;
    dbg.textContent = formatCamDebug();
  }
  renderer.render(scene, camera);
})();

export function updateSceneTheme(bgColor) {
  renderer.setClearColor(bgColor, 1);
  scene.fog.color.set(bgColor);
  matBase.color.set(bgColor === 0x1a1a20 ? 0x38383c : 0xe8e8ec);
  matBackdrop.color.set(bgColor);
}

export { scene, camera, renderer, v3w, keyLight };
