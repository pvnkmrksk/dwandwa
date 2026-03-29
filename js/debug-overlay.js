/* global THREE */
import { scene } from './renderer-setup.js';
import { getLastMeshBox } from './structure-plate.js';

let root = null;

/** Call once after DOM / THREE exist. Active only with <code>?debug=1</code> in the URL. */
export function initDebugOverlay() {
  if (typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get('debug') !== '1') return;
  root = new THREE.Group();
  root.name = 'dwandwaDebugOverlay';
  scene.add(root);
}

export function syncDebugOverlay() {
  if (!root) return;
  while (root.children.length) root.remove(root.children[0]);
  const box = getLastMeshBox();
  if (!box || box.isEmpty()) return;
  const helper = new THREE.Box3Helper(box, 0xaa44ff);
  root.add(helper);
}
