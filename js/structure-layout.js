/* global THREE */
/**
 * Shared L-profile dimensions from letter mesh AABB (preview struts + STL extras).
 * @param {THREE.Box3} box
 * @param {{ baseEnabled: boolean, basePadXPct: number, basePadZPct: number, plateThickPct: number, backEnabled: boolean, backPadPct: number, baseOverlapPct: number, backOverlapPct: number }} ss
 */
export function computePlateLayout(box, ss) {
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const basePadXF = ss.basePadXPct / 100;
  const basePadZF = ss.basePadZPct / 100;
  const backPadF = ss.backPadPct / 100;
  const t = ss.plateThickPct / 100;

  const baseW = size.x * (1 + basePadXF * 2) + 4;
  const baseD = size.z * (1 + basePadZF * 2) + 4;
  const plate = Math.max(size.y * t, 3 + ss.plateThickPct * 0.06);
  const baseH = plate;
  const backT = plate;
  const backH = size.y * (1 + backPadF * 2) + 4;
  const baseTopY = box.min.y + size.y * (ss.baseOverlapPct / 100);
  const backZDelta = size.z * (ss.backOverlapPct / 100);
  const zWallFront = box.min.z + backZDelta;

  return {
    size, center, baseW, baseD, plate, baseH, backT, backH, baseTopY, zWallFront,
  };
}
