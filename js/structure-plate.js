/* global THREE */
import S from './state.js';
import { scene, matBase, matBackdrop } from './renderer-setup.js';
import { computePlateLayout, mirrorStructureBoxZ } from './structure-layout.js';

let structureObjects = [];
/** Last axis-aligned bounds of the letter mesh (world space, after Y normalization). */
let lastMeshBox = null;

let baseEnabled = true;
let basePadXPct = 10, basePadZPct = 10, plateThickPct = 14, baseFilletPct = 4, baseOverlapPct = 4;
let backEnabled = true, backPadPct = 10, backOverlapPct = 4;
let strutZPct = 0;
const showBackdrops = false;

export function setLastMeshBox(box) {
  lastMeshBox = box;
}

export function getLastMeshBox() {
  return lastMeshBox;
}

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

function buildLProfile(box) {
  const L = computePlateLayout(box, getStructureSettings());
  const { center, baseW, baseD, baseH, backT, backH, baseTopY, zWallFront } = L;

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

function buildBackStruts(box) {
  if (!S.backStrut || !S.moduleTx) return;
  const L = computePlateLayout(box, getStructureSettings());
  const { size, baseTopY, zWallFront, plate, backH } = L;
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

  const backGeo = new THREE.PlaneGeometry(wallW, wallH);
  const backWall = new THREE.Mesh(backGeo, matBackdrop);
  const bdX = center.x + (gap + 2) * S2;
  const bdZ = center.z - (gap + 2) * S2;
  backWall.position.set(bdX, baseY + wallH / 2, bdZ);
  backWall.rotation.y = Math.PI / 4;
  backWall.receiveShadow = true;
  scene.add(backWall);
  structureObjects.push(backWall);

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

export function rebuildStructure() {
  clearStructureObjects();
  if (lastMeshBox) {
    const plateBox = mirrorStructureBoxZ(lastMeshBox);
    if (baseEnabled || backEnabled) buildLProfile(plateBox);
    if (S.backStrut && (baseEnabled || backEnabled)) buildBackStruts(plateBox);
    if (showBackdrops) buildBackdrops(plateBox);
  }
}

export function rebuildScene() { rebuildStructure(); }

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
