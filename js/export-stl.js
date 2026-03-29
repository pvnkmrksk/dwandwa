/* global THREE */
import S, { allocArrays } from './state.js';
import { measureColumnCells, stampName } from './raster.js';
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
  const snapColW = S.colCellW ? new Int32Array(S.colCellW) : null;
  const snapRowH = S.rowCellH;
  const snapSil1 = new Uint8Array(S.sil1);
  const snapSil2 = new Uint8Array(S.sil2);

  S.CELL = ECELL;
  await measureColumnCells(S.chars1, S.chars2, S.font1, S.font2, ECELL);
  allocArrays();
  const esil1 = new Uint8Array(S.sil1.length);
  const esil2 = new Uint8Array(S.sil2.length);

  setProgress(15, 'Rendering front glyphs\u2026');
  await new Promise(r => setTimeout(r, 20));
  await stampName(S.chars1, S.font1, esil1, ECELL);

  setProgress(30, 'Rendering side glyphs\u2026');
  await new Promise(r => setTimeout(r, 20));
  await stampName(S.chars2, S.font2, esil2, ECELL);

  setProgress(45, 'Generating voxel mesh\u2026');
  await new Promise(r => setTimeout(r, 20));

  const geo = buildModuleMeshes(esil1, esil2, ECELL, SNET, 0);

  S.CELL = snapCell;
  S.colCellW = snapColW;
  S.rowCellH = snapRowH;
  if (!S.colCellW || S.colCellW.length !== S.nCols) {
    await measureColumnCells(S.chars1, S.chars2, S.font1, S.font2);
  }
  allocArrays();
  S.sil1.set(snapSil1);
  S.sil2.set(snapSil2);

  if (!geo || !geo.index) {
    S.CELL = snapCell;
    S.colCellW = snapColW;
    S.rowCellH = snapRowH;
    if (!S.colCellW || S.colCellW.length !== S.nCols) {
      await measureColumnCells(S.chars1, S.chars2, S.font1, S.font2);
    }
    allocArrays();
    S.sil1.set(snapSil1);
    S.sil2.set(snapSil2);
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

  // Compute bounding box
  const box = new THREE.Box3();
  for (let i = 0; i < pos.count; i++) {
    box.expandByPoint(new THREE.Vector3(
      pos.getX(i) * ESCALE, pos.getY(i) * ESCALE, pos.getZ(i) * ESCALE
    ));
  }
  const L = computePlateLayout(box, ss);
  const { size, center, baseW, baseD, plate, baseH, backT, backH, baseTopY, zWallFront } = L;

  if (ss.baseEnabled) {
    addBoxTriangles(allTriangles,
      center.x, baseTopY - baseH / 2, box.min.z - baseD / 2,
      baseW / 2, baseH / 2, baseD / 2);
  }

  if (ss.backEnabled) {
    const zC = zWallFront - backT / 2;
    addBoxTriangles(allTriangles,
      center.x, baseTopY + backH / 2, zC,
      baseW / 2, backH / 2, backT / 2);
  }

  if (ss.backStrut && S.moduleTx && (ss.baseEnabled || ss.backEnabled)) {
    const strutZAdj = size.z * (ss.strutZPct / 100);
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
      const hx = (size.x / NX) * 0.46;
      const hz = (size.z / D) * 0.46;
      for (let iz = 0; iz < D; iz++) {
        for (let ix = 0; ix < NX; ix++) {
          if (!S.strutMask[ix + iz * NX]) continue;
          const xC = box.min.x + (ix + 0.5) / NX * size.x;
          const zC = box.max.z - (iz + 0.5) / D * size.z + strutZAdj;
          addBoxTriangles(allTriangles, xC, yMid, zC, hx, hY / 2, hz);
        }
      }
    } else {
      const strutW = Math.max(1.2, plate * 0.45);
      for (let i = 0; i < S.nCols; i++) {
        const cx = S.moduleTx[i] * ESCALE;
        const zStart = box.min.z + strutZAdj;
        const zLo = Math.min(zWallFront, zStart);
        const zHi = Math.max(zWallFront, zStart);
        const dz = zHi - zLo;
        if (dz < 0.5) continue;
        addBoxTriangles(allTriangles,
          cx, yMid, (zLo + zHi) / 2,
          strutW / 2, hY / 2, dz / 2);
      }
    }
  }

  setProgress(85, 'Writing file\u2026');
  await new Promise(r => setTimeout(r, 20));

  const totalTris = allTriangles.length;
  const buf = new ArrayBuffer(84 + totalTris * 50);
  const dv = new DataView(buf);
  const hdr = `Dwandwa n=${S.nCols} grid=${SNET} voxel s=${ESCALE.toFixed(3)}mm`;
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < hdr.length ? hdr.charCodeAt(i) : 0);
  dv.setUint32(80, totalTris, true);

  let off = 84;
  for (const tri of allTriangles) {
    const [ax,ay,az, bx,by,bz, cx,cy,cz] = tri;
    const e1x = bx-ax, e1y = by-ay, e1z = bz-az;
    const e2x = cx-ax, e2y = cy-ay, e2z = cz-az;
    let nx = e1y*e2z-e1z*e2y, ny = e1z*e2x-e1x*e2z, nz = e1x*e2y-e1y*e2x;
    const nl = Math.sqrt(nx*nx+ny*ny+nz*nz) || 1;
    nx/=nl; ny/=nl; nz/=nl;
    [nx,ny,nz, ax,ay,az, bx,by,bz, cx,cy,cz].forEach((v,i) => dv.setFloat32(off+i*4, v, true));
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
