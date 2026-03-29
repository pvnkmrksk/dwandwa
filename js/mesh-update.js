/* global THREE */
import S from './state.js';
import { buildModuleMeshes } from './mesh.js';
import {
  scene,
  matSmooth,
  resizeRenderer,
  updateLighting,
  fitViewToLetterMesh,
} from './renderer-setup.js';
import { rebuildStructure, setLastMeshBox } from './structure-plate.js';
import { initDebugOverlay, syncDebugOverlay } from './debug-overlay.js';

initDebugOverlay();

let mainMesh = null;

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
    setLastMeshBox(box.clone());
    const size = box.getSize(new THREE.Vector3());

    fitViewToLetterMesh(size);
    rebuildStructure();
    updateLighting(box);
    resizeRenderer();
    syncDebugOverlay();
  } else {
    document.getElementById('vc').textContent = 'No intersection';
    setLastMeshBox(null);
    S.moduleCenterX = null;
    S.moduleZBack = null;
    S.moduleTx = null;
    syncDebugOverlay();
  }
  bmsg.textContent = '';
}
