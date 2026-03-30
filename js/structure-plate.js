/* global THREE */
import S from './state.js';
import { scene, matBase, matBackdrop } from './renderer-setup.js';
import { computePlateLayout } from './structure-layout.js';

let structureObjects = [];
let lastMeshBox = null;

let baseEnabled = true;
let basePadXPct = 10, basePadZPct = 10, plateThickPct = 14, baseFilletPct = 4, baseOverlapPct = 4;
let backEnabled = true, backPadPct = 10, backOverlapPct = 4;
let strutSizePct = 14;
/** Max strut embed along Z as % of mesh depth. Lower = shallower, less “exit wound”. */
let strutEmbedPct = 10;
const showBackdrops = false;

const matLProfile = matBase.clone();
let ghostActive = false;

export function setBackPanelGhost(on) {
  ghostActive = on;
  matLProfile.transparent = on;
  matLProfile.opacity = on ? 0.06 : 1.0;
  matLProfile.depthWrite = !on;
  matLProfile.needsUpdate = true;
}

export function setLastMeshBox(box) { lastMeshBox = box; }
export function getLastMeshBox() { return lastMeshBox; }

export function getBackWallZ() {
  if (!lastMeshBox) return 0;
  const ss = getStructureSettings();
  const L = computePlateLayout(lastMeshBox, ss);
  return L.zWallFront;
}

export function getStructureSettings() {
  return {
    baseEnabled, basePadXPct, basePadZPct, plateThickPct, baseFilletPct, baseOverlapPct,
    backEnabled, backPadPct, backOverlapPct,
    alignBackEdges: S.alignBackEdges, equalGapPack: S.equalGapPack, backStrut: S.backStrut,
    strutSizePct,
    strutEmbedPct,
  };
}

export function computeStrutPenetration(strutW, meshDepth, embedPct) {
  const raw = Math.max(strutW * 1.5, meshDepth * 0.3);
  const cap = meshDepth * Math.max(0.06, Math.min(0.38, embedPct / 100));
  const floor = strutW * 0.42;
  return Math.max(floor, Math.min(raw, cap));
}

function clearStructureObjects() {
  structureObjects.forEach(o => {
    scene.remove(o);
    if (o.geometry) o.geometry.dispose();
  });
  structureObjects = [];
}

function buildLProfile(box) {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const ss = getStructureSettings();

  const basePadXF = ss.basePadXPct / 100;
  const basePadZF = ss.basePadZPct / 100;
  const backPadF = ss.backPadPct / 100;

  const profileW = size.x * (1 + basePadXF * 2) + 4;
  const baseD = size.z * (1 + basePadZF * 2) + 4;
  const rel = ss.plateThickPct / 14;
  const baseH = Math.max(size.y * 0.08 * rel, 2.0);
  const backH = size.y * (1 + backPadF * 2) + 4;
  const backT = Math.max(size.z * 0.06 * rel, 1.5);

  const maxFillet = Math.min(baseH, backT) * 0.8;
  const filletR = maxFillet * ss.baseFilletPct / 20;

  const baseOverlapY = size.y * ss.baseOverlapPct / 100;
  const backOverlapZ = size.z * ss.backOverlapPct / 100;
  const baseTopY = box.min.y + baseOverlapY;
  const backFrontZ = box.min.z + backOverlapZ;

  const shape = new THREE.Shape();

  if (baseEnabled && backEnabled) {
    const r = filletR > 0.3 ? Math.min(filletR, backH * 0.3, baseD * 0.3) : 0;
    shape.moveTo(backT, -baseH);
    shape.lineTo(-baseD, -baseH);
    shape.lineTo(-baseD, 0);
    if (r > 0.3) {
      shape.lineTo(-r, 0);
      const segs = 8;
      for (let i = 1; i <= segs; i++) {
        const a = -(Math.PI / 2) * (i / segs);
        shape.lineTo(-r + r * Math.cos(a), r + r * Math.sin(a));
      }
    } else {
      shape.lineTo(0, 0);
    }
    shape.lineTo(0, backH);
    shape.lineTo(backT, backH);
    shape.lineTo(backT, -baseH);
  } else if (baseEnabled) {
    shape.moveTo(backT, -baseH);
    shape.lineTo(-baseD, -baseH);
    shape.lineTo(-baseD, 0);
    shape.lineTo(backT, 0);
    shape.lineTo(backT, -baseH);
  } else if (backEnabled) {
    shape.moveTo(0, 0);
    shape.lineTo(0, backH);
    shape.lineTo(backT, backH);
    shape.lineTo(backT, 0);
    shape.lineTo(0, 0);
  } else {
    return;
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: profileW,
    bevelEnabled: false,
  });
  geo.rotateY(Math.PI / 2);

  const mesh = new THREE.Mesh(geo, matLProfile);
  mesh.position.set(center.x - profileW / 2, baseTopY, backFrontZ);
  mesh.receiveShadow = true;
  mesh.castShadow = !ghostActive;
  scene.add(mesh);
  structureObjects.push(mesh);
}

function buildBackStruts(box) {
  if (!S.backStrut || S.strutPins.length === 0) return;
  const ss = getStructureSettings();
  const L = computePlateLayout(box, ss);
  const { zWallFront, plate } = L;
  const sizeScale = Math.max(0.35, ss.strutSizePct / 14);
  const strutW = Math.max(0.62, plate * 0.46 * sizeScale);
  const meshDepth = box.max.z - box.min.z;
  const embedPct = ss.strutEmbedPct ?? 30;

  for (const tip of S.strutPins) {
    const penetration = computeStrutPenetration(strutW, meshDepth, embedPct);
    const dir = tip.z > zWallFront ? 1 : -1;
    let extendedZ = tip.z + dir * penetration;
    extendedZ = Math.max(box.min.z, Math.min(extendedZ, box.max.z));
    const zLo = Math.min(zWallFront, extendedZ);
    const zHi = Math.max(zWallFront, extendedZ);
    const dzz = zHi - zLo;
    if (dzz < 0.35) continue;
    const g = new THREE.BoxGeometry(strutW, strutW, dzz);
    const mesh = new THREE.Mesh(g, matBase);
    mesh.position.set(tip.x, tip.y, (zLo + zHi) / 2);
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
    if (baseEnabled || backEnabled) buildLProfile(lastMeshBox);
    if (S.backStrut && (baseEnabled || backEnabled)) buildBackStruts(lastMeshBox);
    if (showBackdrops) buildBackdrops(lastMeshBox);
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
  const strutSzEl = document.getElementById('strutThick');
  strutSizePct = strutSzEl ? parseInt(strutSzEl.value, 10) : 14;
  const embEl = document.getElementById('strutEmbed');
  strutEmbedPct = embEl ? parseInt(embEl.value, 10) : 30;
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
  const szEl = document.getElementById('strutThickVal');
  if (szEl) szEl.textContent = strutSizePct + '%';
  const embVal = document.getElementById('strutEmbedVal');
  if (embVal) embVal.textContent = strutEmbedPct + '%';
  document.getElementById('baseControls').classList.toggle('disabled', !baseEnabled);
  document.getElementById('backControls').classList.toggle('disabled', !backEnabled);
  rebuildStructure();
}

(function wireStructureControls() {
  ['baseOn', 'basePadX', 'basePadZ', 'plateThick', 'baseFillet', 'baseOverlap', 'backOn', 'backPad', 'backOverlap', 'strutThick', 'strutEmbed'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', updateStructureUI);
  });
  updateStructureUI();
})();
