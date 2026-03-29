/* global THREE */
import S, { allocArrays } from './state.js';
import { stampName } from './raster.js';
import { buildModuleMeshes } from './mesh.js';
import { getStructureSettings } from './scene.js';

function addBoxTriangles(allTriangles, cx, cy, cz, hx, hy, hz) {
  // 8 corners of an axis-aligned box centered at (cx,cy,cz) with half-extents (hx,hy,hz)
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
  const sigma = 0.6 + factor * 0.1;
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

  const enx = S.nCols * ECELL;
  const esil1 = new Uint8Array(enx * ECELL);
  const esil2 = new Uint8Array(enx * ECELL);

  const origCell = S.CELL;
  S.CELL = ECELL;
  allocArrays();

  setProgress(15, 'Rendering front glyphs\u2026');
  await new Promise(r => setTimeout(r, 20));
  await stampName(S.chars1, S.font1, esil1, ECELL);

  setProgress(30, 'Rendering side glyphs\u2026');
  await new Promise(r => setTimeout(r, 20));
  await stampName(S.chars2, S.font2, esil2, ECELL);

  S.CELL = origCell;
  allocArrays();

  setProgress(45, 'Generating smooth mesh\u2026');
  await new Promise(r => setTimeout(r, 20));

  const geo = buildModuleMeshes(esil1, esil2, ECELL, SNET, sigma);

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

  // Compute bounding box of letter mesh
  const box = new THREE.Box3();
  for (let i = 0; i < pos.count; i++) {
    box.expandByPoint(new THREE.Vector3(
      pos.getX(i) * ESCALE, pos.getY(i) * ESCALE, pos.getZ(i) * ESCALE
    ));
  }
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  // Add base plate if enabled
  if (ss.baseEnabled) {
    const padFrac = ss.basePadPct / 100;
    const pw = size.x * (1 + padFrac * 2) + 0.5;
    const pd = size.z * (1 + padFrac * 2) + 0.5;
    const ph = Math.max(size.y * 0.10, 0.3);
    const overlapY = size.y * ss.baseOverlapPct / 100;
    const baseTopY = box.min.y + overlapY;
    addBoxTriangles(allTriangles, center.x, baseTopY - ph / 2, center.z, pw / 2, ph / 2, pd / 2);
  }

  // Add back panel if enabled
  if (ss.backEnabled) {
    const padFrac = ss.backPadPct / 100;
    const bpW = size.z * (1 + padFrac * 2) + 0.5;
    const bpH = size.y * (1 + padFrac * 2) + 0.5;
    const bpThick = Math.max(size.x * 0.04, 0.15);
    const overlapX = size.x * ss.backOverlapPct / 100;
    const panelFrontX = box.min.x + overlapX;
    addBoxTriangles(allTriangles, panelFrontX - bpThick / 2, center.y, center.z, bpThick / 2, bpH / 2, bpW / 2);
  }

  setProgress(85, 'Writing file\u2026');
  await new Promise(r => setTimeout(r, 20));

  const totalTris = allTriangles.length;
  const buf = new ArrayBuffer(84 + totalTris * 50);
  const dv = new DataView(buf);
  const hdr = `Dwandwa n=${S.nCols} snet=${SNET} sigma=${sigma.toFixed(1)} s=${ESCALE.toFixed(3)}mm`;
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
