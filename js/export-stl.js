/* global THREE */
import S, { allocArrays } from './state.js';
import { stampName } from './raster.js';
import { buildModuleMeshes } from './mesh.js';

export async function exportSTL() {
  const bmsg = document.getElementById('bmsg');
  const factor = parseInt(document.getElementById('exportQ').value) || 2;
  const ECELL = S.CELL * factor;
  const SNET = Math.min(ECELL, 192);
  const sigma = 0.6 + factor * 0.1;
  const ESCALE = 0.5 / factor;

  bmsg.textContent = `Preparing ${factor}x export (${ECELL}px/glyph)\u2026`;
  await new Promise(r => setTimeout(r, 40));

  const enx = S.nCols * ECELL;
  const esil1 = new Uint8Array(enx * ECELL);
  const esil2 = new Uint8Array(enx * ECELL);

  const origCell = S.CELL;
  S.CELL = ECELL;
  allocArrays();
  await stampName(S.chars1, S.font1, esil1, ECELL);
  await stampName(S.chars2, S.font2, esil2, ECELL);
  S.CELL = origCell;
  allocArrays();

  bmsg.textContent = 'Generating smooth mesh\u2026';
  await new Promise(r => setTimeout(r, 20));

  const geo = buildModuleMeshes(esil1, esil2, ECELL, SNET, sigma);

  if (!geo || !geo.index) {
    bmsg.textContent = 'No geometry to export';
    setTimeout(() => bmsg.textContent = '', 4000);
    return;
  }

  const pos = geo.getAttribute('position');
  const idx = geo.index;
  const triCount = idx.count / 3;
  const buf = new ArrayBuffer(84 + triCount * 50);
  const dv = new DataView(buf);
  const hdr = `ShadowSculptor n=${S.nCols} snet=${SNET} sigma=${sigma.toFixed(1)} s=${ESCALE.toFixed(3)}mm`;
  for (let i = 0; i < 80; i++) dv.setUint8(i, i < hdr.length ? hdr.charCodeAt(i) : 0);
  dv.setUint32(80, triCount, true);

  let off = 84;
  const worldScale = ECELL / SNET;
  for (let t = 0; t < triCount; t++) {
    const ia = idx.getX(t * 3), ib = idx.getX(t * 3 + 1), ic = idx.getX(t * 3 + 2);
    const ax = pos.getX(ia) * ESCALE / worldScale, ay = pos.getY(ia) * ESCALE / worldScale, az = pos.getZ(ia) * ESCALE / worldScale;
    const bx = pos.getX(ib) * ESCALE / worldScale, by = pos.getY(ib) * ESCALE / worldScale, bz = pos.getZ(ib) * ESCALE / worldScale;
    const cx = pos.getX(ic) * ESCALE / worldScale, cy = pos.getY(ic) * ESCALE / worldScale, cz = pos.getZ(ic) * ESCALE / worldScale;
    const e1x = bx - ax, e1y = by - ay, e1z = bz - az;
    const e2x = cx - ax, e2y = cy - ay, e2z = cz - az;
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz2 = e1x * e2y - e1y * e2x;
    const nl = Math.sqrt(nx * nx + ny * ny + nz2 * nz2) || 1;
    nx /= nl; ny /= nl; nz2 /= nl;
    [nx, ny, nz2, ax, ay, az, bx, by, bz, cx, cy, cz].forEach((v, i) => dv.setFloat32(off + i * 4, v, true));
    dv.setUint16(off + 48, 0, true);
    off += 50;
  }

  const blob = new Blob([buf], { type: 'application/octet-stream' });
  Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: `shadow_sculptor_${S.nCols}mod_${factor}x.stl`
  }).click();

  bmsg.textContent = `Done: ${triCount.toLocaleString()} triangles, ${(buf.byteLength / 1024 / 1024).toFixed(1)} MB`;
  setTimeout(() => bmsg.textContent = '', 8000);
}
