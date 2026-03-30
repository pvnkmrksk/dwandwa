/* global THREE */
import S from './state.js';
import { camera, v3w, scene } from './renderer-setup.js';
import { getMainMesh } from './mesh-update.js';
import {
  rebuildStructure, updateStructureUI,
  setBackPanelGhost, getBackWallZ, getLastMeshBox,
} from './structure-plate.js';

const REMOVE_DIST = 6;

let paintMode = false;
let hoverMesh = null;
let dragIdx = -1;
let pointerMoved = false;
const raycaster = new THREE.Raycaster();
const dragPlane = new THREE.Plane();
const _planeHit = new THREE.Vector3();

const hoverMat = new THREE.MeshStandardMaterial({
  color: 0x44ff88, roughness: 0.3, metalness: 0.05,
  transparent: true, opacity: 0.45, depthWrite: false,
});

const undoStack = [];
const MAX_UNDO = 40;

function pushUndo() {
  undoStack.push(S.strutPins.map(p => ({ ...p })));
  if (undoStack.length > MAX_UNDO) undoStack.shift();
  updateUndoBtn();
}

export function undoPins() {
  if (undoStack.length === 0) return;
  S.strutPins = undoStack.pop();
  rebuildStructure();
  updatePinCount();
  updateUndoBtn();
}

function updateUndoBtn() {
  const btn = document.getElementById('undoPins');
  if (btn) btn.disabled = undoStack.length === 0;
}

export function isPaintMode() { return paintMode; }

export function setPaintMode(on) {
  paintMode = on;
  const btn = document.getElementById('paintStruts');
  if (btn) btn.classList.toggle('active', paintMode);
  v3w.style.cursor = paintMode ? 'crosshair' : '';
  setBackPanelGhost(on);
  if (!on) removeHover();
}

export function togglePaintMode() { setPaintMode(!paintMode); }

function ensureStrutsEnabled() {
  const bs = document.getElementById('backStrut');
  if (bs && !bs.checked) {
    bs.checked = true;
    updateStructureUI();
  }
  S.backStrut = true;
}

function addPin(pt) {
  pushUndo();
  ensureStrutsEnabled();
  S.strutPins.push({ x: pt.x, y: pt.y, z: pt.z });
  rebuildStructure();
  updatePinCount();
}

function removePin(idx) {
  if (idx < 0 || idx >= S.strutPins.length) return;
  pushUndo();
  S.strutPins.splice(idx, 1);
  rebuildStructure();
  updatePinCount();
}

function movePin(idx, x, y) {
  if (idx < 0 || idx >= S.strutPins.length) return;
  S.strutPins[idx].x = x;
  S.strutPins[idx].y = y;
  rebuildStructure();
}

export function clearPins() {
  if (S.strutPins.length === 0) return;
  pushUndo();
  S.strutPins.length = 0;
  rebuildStructure();
  updatePinCount();
}

function updatePinCount() {
  const el = document.getElementById('pinCount');
  if (el) el.textContent = S.strutPins.length > 0 ? `${S.strutPins.length} pin${S.strutPins.length > 1 ? 's' : ''}` : '';
}

export function rescalePins(oldCell, newCell) {
  if (oldCell === newCell || S.strutPins.length === 0) return;
  const ratio = newCell / oldCell;
  for (const p of S.strutPins) {
    p.x *= ratio;
    p.y *= ratio;
    p.z *= ratio;
  }
}

export function syncPinMeshes() {
  updatePinCount();
  updateUndoBtn();
}

function removeHover() {
  if (hoverMesh) {
    scene.remove(hoverMesh);
    hoverMesh.geometry.dispose();
    hoverMesh = null;
  }
}

function showHover(pt) {
  removeHover();
  const g = new THREE.BoxGeometry(1.3, 1.3, 2.0);
  hoverMesh = new THREE.Mesh(g, hoverMat);
  hoverMesh.position.set(pt.x, pt.y, pt.z);
  scene.add(hoverMesh);
}

function getNDC(e) {
  const rect = v3w.getBoundingClientRect();
  return new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  );
}

function findNearestPinIdx(pt) {
  let bestIdx = -1, bestDist = REMOVE_DIST * REMOVE_DIST;
  for (let i = 0; i < S.strutPins.length; i++) {
    const p = S.strutPins[i];
    const d = (p.x - pt.x) ** 2 + (p.y - pt.y) ** 2 + (p.z - pt.z) ** 2;
    if (d < bestDist) { bestDist = d; bestIdx = i; }
  }
  return bestIdx;
}

function hitTest(e) {
  const mesh = getMainMesh();
  if (!mesh) return null;
  const ndc = getNDC(e);
  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(mesh, false);
  return hits.length > 0 ? hits[0].point : null;
}

/** Raycast against the back wall plane (Z = backWallZ, normal +Z). */
function hitBackPlane(e) {
  const wz = getBackWallZ();
  dragPlane.set(new THREE.Vector3(0, 0, 1), -wz);
  const ndc = getNDC(e);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.ray.intersectPlane(dragPlane, _planeHit);
  if (!hit) return null;
  const box = getLastMeshBox();
  if (box) {
    hit.x = Math.max(box.min.x, Math.min(hit.x, box.max.x));
    hit.y = Math.max(box.min.y, Math.min(hit.y, box.max.y));
  }
  return hit;
}

function onPointerDown(e) {
  if (!paintMode || e.button === 1) return;
  const pt = hitTest(e);
  if (!pt) return;

  e.stopPropagation();
  e.preventDefault();
  pointerMoved = false;

  if (e.button === 2 || e.shiftKey) {
    const idx = findNearestPinIdx(pt);
    if (idx >= 0) removePin(idx);
    return;
  }

  const nearIdx = findNearestPinIdx(pt);
  if (nearIdx >= 0) {
    pushUndo();
    dragIdx = nearIdx;
    v3w.setPointerCapture(e.pointerId);
  } else {
    dragIdx = -1;
  }
}

function onPointerMove(e) {
  if (!paintMode) return;

  if (dragIdx >= 0) {
    pointerMoved = true;
    const pt = hitBackPlane(e);
    if (pt) movePin(dragIdx, pt.x, pt.y);
    return;
  }

  const pt = hitTest(e);
  if (pt) {
    showHover(pt);
  } else {
    removeHover();
  }
}

function onPointerUp(e) {
  if (!paintMode) return;
  if (dragIdx >= 0) {
    dragIdx = -1;
    return;
  }

  if (!pointerMoved && e.button === 0 && !e.shiftKey) {
    const pt = hitTest(e);
    if (pt) addPin(pt);
  }
}

function onContextMenu(e) {
  if (paintMode) e.preventDefault();
}

export function initStrutPainter() {
  v3w.addEventListener('pointerdown', onPointerDown, true);
  v3w.addEventListener('pointermove', onPointerMove, true);
  v3w.addEventListener('pointerup', onPointerUp, true);
  v3w.addEventListener('contextmenu', onContextMenu);
  updateUndoBtn();
}
