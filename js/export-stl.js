/* global THREE */
import S, { allocArrays } from './state.js';
import { measureColumnCells } from './raster.js';
import { buildModuleMeshes } from './mesh.js';
import { getStructureSettings } from './scene.js';
import { computePlateLayout } from './structure-layout.js';

function addBoxTriangles(allTriangles, cx, cy, cz, hx, hy, hz) {
  const v = [
    [cx-hx, cy-hy, cz-hz], [cx+hx, cy-hy, cz-hz],
    [cx+hx, cy+hy, cz-hz], [cx-hx, cy+hy, cz-hz],
    [cx-hx, cy-hy, cz+hz], [cx+hx, cy-hy, cz+hz],
    [cx+hx, cy+hy, cz+hz], [cx-hx, cy+hy, cz+hz],
  ];
  const faces = [
    [0,2,1],[0,3,2], [4,5,6],[4,6,7],
    [0,1,5],[0,5,4], [2,3,7],[2,7,6],
    [0,4,7],[0,7,3], [1,2,6],[1,6,5],
  ];
  for (const [a,b,c] of faces) {
    allTriangles.push([
      v[a][0],v[a][1],v[a][2],
      v[b][0],v[b][1],v[b][2],
      v[c][0],v[c][1],v[c][2],
    ]);
  }
}

/**
 * Nearest-neighbour upscale of a silhouette array from preview resolution
 * to export resolution, preserving user pixel edits.
 */
function upscaleSil(srcSil, srcColW, srcOffsets, srcRowH,
                    dstColW, dstOffsets, dstRowH, nCols) {
  const totalCells = dstOffsets[nCols];
  const dst = new Uint8Array(totalCells);
  for (let c = 0; c < nCols; c++) {
    const eCw = dstColW[c];
    const sCw = srcColW[c];
    if (sCw === 0 || eCw === 0) continue;
    for (let lx = 0; lx < eCw; lx++) {
      const srcLx = Math.min(sCw - 1, Math.floor(lx * sCw / eCw));
      for (let z = 0; z < dstRowH; z++) {
        const srcZ = Math.min(srcRowH - 1, Math.floor(z * srcRowH / dstRowH));
        dst[dstOffsets[c] + lx * dstRowH + z] =
          srcSil[srcOffsets[c] + srcLx * srcRowH + srcZ];
      }
    }
  }
  return dst;
}

export async function exportSTL() {
  const bmsg = document.getElementById('bmsg');
  const exportBtn = document.getElementById('exportBtn');
  const progressEl = document.getElementById('exportProgress');
  const barEl = document.getElementById('exportBar');
  const factor = parseInt(document.getElementById('exportQ').value) || 2;
  const ECELL = S.CELL * factor;
  const SNET = Math.min(ECELL, 192);
  const ESCALE = 0.5 / factor;

  const ss = getStructureSettings();

  exportBtn.disabled = true;
  exportBtn.textContent = 'Exporting\u2026';
  progressEl.hidden = false;
  barEl.style.width = '0%';

  const setProgress = (pct, msg) => {
    barEl.style.width = pct + '%';
    bmsg.textContent = msg;
  };

  setProgress(5, `Preparing ${factor}x export (${ECELL}px/glyph)\u2026`);
  await new Promise(r => setTimeout(r, 40));

  const snapCell = S.CELL;
  const snapColW1 = S.colCellW1 ? new Int32Array(S.colCellW1) : null;
  const snapColW2 = S.colCellW2 ? new Int32Array(S.colCellW2) : null;
  const snapOffset1 = S.colOffset1 ? new Int32Array(S.colOffset1) : null;
  const snapOffset2 = S.colOffset2 ? new Int32Array(S.colOffset2) : null;
  const snapRowH = S.rowCellH;
  const snapSil1 = new Uint8Array(S.sil1);
  const snapSil2 = new Uint8Array(S.sil2);

  S.CELL = ECELL;
  await measureColumnCells(S.chars1, S.chars2, S.font1, S.font2, ECELL);
  allocArrays();

  setProgress(15, 'Upscaling silhouettes with edits\u2026');
  await new Promise(r => setTimeout(r, 20));

  const esil1 = upscaleSil(
    snapSil1, snapColW1, snapOffset1, snapRowH,
    S.colCellW1, S.colOffset1, S.rowCellH, S.nCols);
  const esil2 = upscaleSil(
    snapSil2, snapColW2, snapOffset2, snapRowH,
    S.colCellW2, S.colOffset2, S.rowCellH, S.nCols);

  setProgress(45, 'Generating voxel mesh\u2026');
  await new Promise(r => setTimeout(r, 20));

  const geo = buildModuleMeshes(esil1, esil2, ECELL, SNET, 1.25);
  const snapModuleTx = S.moduleTx ? new Float32Array(S.moduleTx) : null;

  function restoreState() {
    S.CELL = snapCell;
    S.colCellW1 = snapColW1;
    S.colCellW2 = snapColW2;
    S.rowCellH = snapRowH;
    allocArrays();
    S.sil1.set(snapSil1);
    S.sil2.set(snapSil2);
  }

  restoreState();

  if (!geo || !geo.index) {
    bmsg.textContent = 'No geometry to export';
    exportBtn.disabled = false;
    exportBtn.textContent = 'Export STL';
    progressEl.hidden = true;
    setTimeout(() => bmsg.textContent = '', 4000);
    return;
  }

  setProgress(70, 'Building STL binary\u2026');
  await new Promise(r => setTimeout(r, 20));

  const allTriangles = [];
  const pos = geo.getAttribute('position');
  const idx = geo.index;
  const triCount = idx.count / 3;

  for (let t = 0; t < triCount; t++) {
    const ia = idx.getX(t * 3), ib = idx.getX(t * 3 + 1), ic = idx.getX(t * 3 + 2);
    allTriangles.push([
      pos.getX(ia) * ESCALE, pos.getY(ia) * ESCALE, pos.getZ(ia) * ESCALE,
      pos.getX(ib) * ESCALE, pos.getY(ib) * ESCALE, pos.getZ(ib) * ESCALE,
      pos.getX(ic) * ESCALE, pos.getY(ic) * ESCALE, pos.getZ(ic) * ESCALE,
    ]);
  }

  const box = new THREE.Box3();
  for (let i = 0; i < pos.count; i++) {
    box.expandByPoint(new THREE.Vector3(
      pos.getX(i) * ESCALE, pos.getY(i) * ESCALE, pos.getZ(i) * ESCALE
    ));
  }
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const basePadXF = ss.basePadXPct / 100;
  const basePadZF = ss.basePadZPct / 100;
  const backPadF = ss.backPadPct / 100;
  const rel = ss.plateThickPct / 14;
  const baseOverlapY = size.y * ss.baseOverlapPct / 100;
  const backOverlapZ = size.z * ss.backOverlapPct / 100;
  const baseW = size.x * (1 + basePadXF * 2) + 0.5;
  const baseD = size.z * (1 + basePadZF * 2) + 0.5;
  const baseH = Math.max(size.y * 0.08 * rel, 0.2);
  const baseTopY = box.min.y + baseOverlapY;
  const backH = size.y * (1 + backPadF * 2) + 0.5;
  const backT = Math.max(size.z * 0.06 * rel, 0.15);
  const backFrontZ = box.min.z + backOverlapZ;

  if (ss.baseEnabled) {
    addBoxTriangles(allTriangles,
      center.x, baseTopY - baseH / 2, backFrontZ + baseD / 2 - backT,
      baseW / 2, baseH / 2, baseD / 2);
  }

  if (ss.backEnabled) {
    const panelCenterY = baseTopY + backH / 2;
    addBoxTriangles(allTriangles,
      center.x, panelCenterY, backFrontZ - backT / 2,
      baseW / 2, backH / 2, backT / 2);
  }

  if (ss.backStrut && S.strutPins.length > 0 && (ss.baseEnabled || ss.backEnabled)) {
    const L = computePlateLayout(box, ss);
    const { plate, zWallFront } = L;
    const sizeScale = Math.max(0.35, (ss.strutSizePct ?? 14) / 14);
    const strutW = Math.max(0.55, plate * 0.38 * sizeScale);
    const meshDepth = size.z;

    // preview_pos * 0.5 = export_pos (see derivation in comments below)
    // Preview mesh: cell units at CELL. Export: cell units at ECELL, scaled by ESCALE.
    // export_pos = preview_pos * factor * ESCALE = preview_pos * 0.5
    const PIN_TO_EXPORT = 0.5;

    for (const pin of S.strutPins) {
      const tip = { x: pin.x * PIN_TO_EXPORT, y: pin.y * PIN_TO_EXPORT, z: pin.z * PIN_TO_EXPORT };
      const penetration = Math.max(strutW * 1.5, meshDepth * 0.3);
      const dir = tip.z > zWallFront ? 1 : -1;
      let extendedZ = tip.z + dir * penetration;
      extendedZ = Math.max(box.min.z, Math.min(extendedZ, box.max.z));
      const zLo = Math.min(zWallFront, extendedZ);
      const zHi = Math.max(zWallFront, extendedZ);
      const dzz = zHi - zLo;
      if (dzz < 0.1) continue;
      addBoxTriangles(allTriangles,
        tip.x, tip.y, (zLo + zHi) / 2,
        strutW / 2, strutW / 2, dzz / 2);
    }
  }

  setProgress(85, 'Writing file\u2026');
  await new Promise(r => setTimeout(r, 20));

  // Rotate Y-up → Z-up so base sits flat on the print bed.
  // Transform: (x, y, z) → (x, -z, y)
  let minZ_out = Infinity;
  for (const tri of allTriangles) {
    for (let i = 0; i < 3; i++) {
      const oy = tri[i * 3 + 1];
      if (oy < minZ_out) minZ_out = oy;
    }
  }
  const zShift = -minZ_out;

  const totalTris = allTriangles.length;
  const buf = new ArrayBuffer(84 + totalTris * 50);
  const dv = new DataView(buf);
  const hdr = `Dwandwa n=${S.nCols} grid=${SNET} voxel s=${ESCALE.toFixed(3)}mm`;
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < hdr.length ? hdr.charCodeAt(i) : 0);
  dv.setUint32(80, totalTris, true);

  let off = 84;
  for (const tri of allTriangles) {
    const [ax,ay,az, bx,by,bz, cx,cy,cz] = tri;
    const rax = ax, ray = -az, raz = ay + zShift;
    const rbx = bx, rby = -bz, rbz = by + zShift;
    const rcx = cx, rcy = -cz, rcz = cy + zShift;

    const e1x = rbx-rax, e1y = rby-ray, e1z = rbz-raz;
    const e2x = rcx-rax, e2y = rcy-ray, e2z = rcz-raz;
    let nx = e1y*e2z-e1z*e2y, ny = e1z*e2x-e1x*e2z, nz = e1x*e2y-e1y*e2x;
    const nl = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
    nx/=nl; ny/=nl; nz/=nl;
    [nx,ny,nz, rax,ray,raz, rbx,rby,rbz, rcx,rcy,rcz].forEach((v,i) => dv.setFloat32(off+i*4, v, true));
    dv.setUint16(off+48, 0, true);
    off += 50;
  }

  setProgress(100, 'Download starting\u2026');

  const blob = new Blob([buf], { type: 'application/octet-stream' });
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `dwandwa_${S.nCols}mod_${factor}x.stl`
  }).click();

  exportBtn.disabled = false;
  exportBtn.textContent = 'Export STL';
  progressEl.hidden = true;
  bmsg.textContent = `Done: ${totalTris.toLocaleString()} triangles, ${(buf.byteLength / 1024 / 1024).toFixed(1)} MB`;
  setTimeout(() => bmsg.textContent = '', 8000);
}
