/* global THREE */
import S from './state.js';
import {
  columnSpans,
  computeDzAlignBack,
  computeTxEqualGap,
  computeTxSpanPack,
} from './module-layout.js';
import { meshFromBinaryCells } from './mesher/voxel-surface.js';

function sampleSlice(data, w, h, x, z) {
  x = Math.max(0, Math.min(w - 1, x));
  z = Math.max(0, Math.min(h - 1, z));
  const x0 = Math.floor(x), z0 = Math.floor(z);
  const x1 = Math.min(w - 1, x0 + 1), z1 = Math.min(h - 1, z0 + 1);
  const fx = x - x0, fz = z - z0;
  return data[x0 * h + z0] * (1 - fx) * (1 - fz) +
         data[x1 * h + z0] * fx * (1 - fz) +
         data[x0 * h + z1] * (1 - fx) * fz +
         data[x1 * h + z1] * fx * fz;
}

/**
 * Dual-silhouette solid: axis X = front horizontal, Y = depth (side horizontal), Z = vertical.
 * Voxel grid is anisotropic: cw × cw × ch in silhouette space (cuboid bbox per letter), not a cube.
 *
 * @param _sigma unused — kept for export-stl API
 */
export function buildModuleMeshes(silA, silB, _cellSizeLegacy, gridRes, _sigma) {
  const allPos = [];
  const allIdx = [];
  const allCol = [];
  let baseVert = 0;

  const cos45 = Math.SQRT1_2;
  const sin45 = Math.SQRT1_2;

  const { spans, spanTotalW } = columnSpans(S.nCols, S.colCellW, S.rowCellH, S.letterGapPct);

  /** @type {Array<null | { positions: number[], colors: number[], indices: Uint32Array, cw: number, ch: number, Mx: number, My: number, Mz: number }>} */
  const perMod = new Array(S.nCols).fill(null);

  for (let mod = 0; mod < S.nCols; mod++) {
    const cw = S.colCellW[mod];
    const ch = S.rowCellH;
    const fSlice = new Float32Array(cw * ch);
    const sSlice = new Float32Array(cw * ch);
    for (let lx = 0; lx < cw; lx++) {
      for (let z = 0; z < ch; z++) {
        const ix = lx * ch + z;
        fSlice[ix] = silA[S.colOffset[mod] + ix];
        sSlice[ix] = silB[S.colOffset[mod] + ix];
      }
    }

    const Nx = Math.min(gridRes, Math.max(8, cw));
    const Ny = Math.min(gridRes, Math.max(8, cw));
    const Nz = Math.min(gridRes, Math.max(8, ch));
    const Mx = Math.max(1, Nx - 1);
    const My = Math.max(1, Ny - 1);
    const Mz = Math.max(1, Nz - 1);

    const strideY = Mx;
    const strideZ = Mx * My;
    const cellSolid = new Uint8Array(Mx * My * Mz);

    for (let k = 0; k < Mz; k++) {
      for (let j = 0; j < My; j++) {
        for (let i = 0; i < Mx; i++) {
          const fx = (i + 0.5) / Mx;
          const fy = (j + 0.5) / My;
          const fz = (k + 0.5) / Mz;
          const sxf = fx * Math.max(1e-6, cw - 1);
          const syf = fy * Math.max(1e-6, cw - 1);
          const szf = fz * Math.max(1e-6, ch - 1);
          const fv = sampleSlice(fSlice, cw, ch, sxf, szf);
          const sv = sampleSlice(sSlice, cw, ch, syf, szf);
          cellSolid[i + j * strideY + k * strideZ] = Math.min(fv, sv) >= 0.5 ? 1 : 0;
        }
      }
    }

    const mesh = meshFromBinaryCells(cellSolid, Mx, My, Mz);
    if (mesh.positions.length === 0) continue;

    const wsX = cw / Nx;
    const wsY = cw / Ny;
    const wsZ = ch / Nz;
    const oy = -ch / 2;

    const positions = [];
    const colors = [];

    for (let i = 0; i < mesh.positions.length; i += 3) {
      const px = mesh.positions[i];
      const py = mesh.positions[i + 1];
      const pz = mesh.positions[i + 2];
      const lx = px * wsX - cw / 2;
      const ly = pz * wsZ + oy;
      const lz = py * wsY - cw / 2;
      const xw = lx * cos45 + lz * sin45;
      const yw = ly;
      let zw = -lx * sin45 + lz * cos45;
      zw = -zw;

      positions.push(xw, yw, zw);

      const sxc = Mx > 0 ? (px / Mx) * (cw - 1) : 0;
      const syc = My > 0 ? (py / My) * (cw - 1) : 0;
      const szc = Mz > 0 ? (pz / Mz) * (ch - 1) : 0;
      const fv = sampleSlice(fSlice, cw, ch, sxc, szc);
      const sv = sampleSlice(sSlice, cw, ch, syc, szc);
      if (fv <= sv) {
        colors.push(0.94, 0.63, 0.19);
      } else {
        colors.push(0.19, 0.56, 0.94);
      }
    }

    perMod[mod] = {
      positions,
      colors,
      indices: mesh.indices,
      cw, ch, Mx, My, Mz,
    };
  }

  const active = [];
  for (let mod = 0; mod < S.nCols; mod++) {
    if (perMod[mod]) active.push(mod);
  }

  let dz = new Array(S.nCols).fill(0);
  if (active.length && S.alignBackEdges) {
    dz = computeDzAlignBack(perMod, active, S.nCols);
  }

  let tx;
  if (active.length && S.equalGapPack) {
    tx = computeTxEqualGap(perMod, active, S.letterGapPct, S.nCols);
  } else {
    tx = computeTxSpanPack(S.nCols, spans, spanTotalW, perMod);
  }

  S.moduleCenterX = new Float32Array(S.nCols);
  S.moduleZBack = new Float32Array(S.nCols);
  S.moduleTx = new Float32Array(S.nCols);
  for (let mod = 0; mod < S.nCols; mod++) {
    S.moduleCenterX[mod] = 0;
    S.moduleZBack[mod] = 0;
    S.moduleTx[mod] = tx[mod] ?? 0;
  }

  for (let mod = 0; mod < S.nCols; mod++) {
    const M = perMod[mod];
    if (!M) continue;

    let xMin = Infinity;
    let xMax = -Infinity;
    let zMin = Infinity;
    for (let i = 0; i < M.positions.length; i += 3) {
      const x = M.positions[i] + tx[mod];
      const z = M.positions[i + 2] + dz[mod];
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (z < zMin) zMin = z;
    }
    S.moduleCenterX[mod] = (xMin + xMax) / 2;
    S.moduleZBack[mod] = zMin;

    for (let i = 0; i < M.positions.length; i += 3) {
      allPos.push(
        M.positions[i] + tx[mod],
        M.positions[i + 1],
        M.positions[i + 2] + dz[mod],
      );
      allCol.push(M.colors[i], M.colors[i + 1], M.colors[i + 2]);
    }

    for (let i = 0; i < M.indices.length; i++) {
      allIdx.push(M.indices[i] + baseVert);
    }
    baseVert += M.positions.length / 3;
  }

  if (allPos.length === 0) {
    S.moduleCenterX = null;
    S.moduleZBack = null;
    S.moduleTx = null;
    return null;
  }

  let yMin = Infinity;
  for (let i = 1; i < allPos.length; i += 3) {
    if (allPos[i] < yMin) yMin = allPos[i];
  }
  if (yMin !== Infinity && Number.isFinite(yMin)) {
    for (let i = 1; i < allPos.length; i += 3) allPos[i] -= yMin;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(allPos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(allCol, 3));
  geo.setIndex(allIdx);
  geo.computeVertexNormals();
  return geo;
}
