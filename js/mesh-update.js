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

function setBmsg(t) {
  const el = document.getElementById('bmsg');
  if (el) el.textContent = t;
}

/** Another update was requested while flushing; never drop it (old pending gate caused missed rebuilds). */
let meshDirty = false;
/** True while a debounced flush is scheduled or running. */
let meshFlushActive = false;

export function scheduleUpdate() {
  meshDirty = true;
  setBmsg('Computing\u2026');
  if (meshFlushActive) return;
  meshFlushActive = true;
  setTimeout(flushMeshUpdates, 30);
}

function flushMeshUpdates() {
  let ok = true;
  try {
    while (meshDirty) {
      meshDirty = false;
      runMeshRebuild();
    }
  } catch (e) {
    ok = false;
    console.error(e);
    setBmsg('Mesh error: ' + (e && e.message ? e.message : String(e)));
    meshDirty = false;
  } finally {
    meshFlushActive = false;
    if (meshDirty) {
      scheduleUpdate();
    } else if (ok) {
      setBmsg('');
    }
  }
}

function runMeshRebuild() {
  if (mainMesh) {
    scene.remove(mainMesh);
    mainMesh.geometry.dispose();
    mainMesh = null;
  }

  const GRID = Math.min(S.CELL, 96);
  const geo = buildModuleMeshes(S.sil1, S.sil2, S.CELL, GRID, 1.25);

  if (geo) {
    mainMesh = new THREE.Mesh(geo, matSmooth);
    mainMesh.castShadow = true;
    mainMesh.receiveShadow = true;
    scene.add(mainMesh);

    const triCount = geo.index ? geo.index.count / 3 : 0;
    document.getElementById('vc').textContent = triCount > 0 ? triCount.toLocaleString() + ' triangles' : 'No geometry';

    const box = new THREE.Box3().setFromObject(mainMesh);
    setLastMeshBox(box.clone());
    const size = box.getSize(new THREE.Vector3());

    fitViewToLetterMesh(size);
    rebuildStructure();
    updateLighting(box);
    resizeRenderer();
    syncDebugOverlay();
  } else {
    document.getElementById('vc').textContent = 'No geometry';
    setLastMeshBox(null);
    S.autoStrutTips = null;
    S.moduleCenterX = null;
    S.moduleZBack = null;
    S.moduleTx = null;
    syncDebugOverlay();
  }
}
