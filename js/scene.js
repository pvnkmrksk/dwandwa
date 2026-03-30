/**
 * Preview scene facade: re-exports renderer, structure, and mesh update for ui/main.
 */
import S from './state.js';

export {
  updCam,
  setCameraFront,
  setCameraSide,
  setCameraLeft,
  setCameraRight,
  setCameraIso,
  toggleSpin,
  resizeRenderer,
  getCameraPose,
  setCameraPose,
  animateCameraPose,
} from './renderer-setup.js';
export {
  rebuildStructure,
  rebuildScene,
  getStructureSettings,
  updateStructureUI,
  getLastMeshBox,
} from './structure-plate.js';
export { scheduleUpdate } from './mesh-update.js';

export function setLetterGap(pct) { S.letterGapPct = pct; }

import { updCam } from './renderer-setup.js';
updCam();
