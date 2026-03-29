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
 * @param {Uint8Array} silA
 * @param {Uint8Array} silB
 * @param _cellSizeLegacy unused (CELL lives in S)
 * @param {number} gridRes max voxel grid size per module axis
 * @param _sigma unused — mesh uses binary min(silhouettes); kept for export-stl API
 */
export function buildModuleMeshes(silA, silB, _cellSizeLegacy, gridRes, _sigma) {
  const allPos = [];
  const allIdx = [];
  const allCol = [];
  let baseVert = 0;

  const cos45 = Math.SQRT1_2;
  const sin45 = Math.SQRT1_2;

  const { spans, spanTotalW } = columnSpans(S.nCols, S.colCellW, S.rowCellH, S.letterGapPct);

  /** @type {Array<null | { positions: number[], colors: number[], indices: Uint32Array, cw: number, ch: number, N: number, nm: number, wsX: number, wsY: number, wsZ: number, oy: number }>} */
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

    const maxDim = Math.max(cw, ch);
    const N = Math.min(gridRes, Math.max(12, maxDim));
    const scale = (N - 1) > 0 ? 1 / (N - 1) : 1;
    const M = N - 1;
    const cellSolid = new Uint8Array(M * M * M);
    for (let k = 0; k < M; k++) {
      for (let j = 0; j < M; j++) {
        for (let i = 0; i < M; i++) {
          const cx = i + 0.5, cy = j + 0.5, cz = k + 0.5;
          const sx = cx * scale * (cw - 1);
          const sy = cy * scale * (cw - 1);
          const sz = cz * scale * (ch - 1);
          const fv = sampleSlice(fSlice, cw, ch, sx, sz);
          const sv = sampleSlice(sSlice, cw, ch, sy, sz);
          cellSolid[i + j * M + k * M * M] = Math.min(fv, sv) >= 0.5 ? 1 : 0;
        }
      }
    }

    const mesh = meshFromBinaryCells(cellSolid, M);
    if (mesh.positions.length === 0) continue;

    const wsX = cw / N;
    const wsY = cw / N;
    const wsZ = ch / N;
    const oy = -ch / 2;
    const nm = Math.max(N - 1, 1);

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
      const zw = -lx * sin45 + lz * cos45;
      positions.push(xw, yw, zw);

      const sx = (px / nm) * (cw - 1);
      const sy = (py / nm) * (cw - 1);
      const sz = (pz / nm) * (ch - 1);
      const fv = sampleSlice(fSlice, cw, ch, sx, sz);
      const sv = sampleSlice(sSlice, cw, ch, sy, sz);
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
      cw, ch, N, nm, wsX, wsY, wsZ, oy,
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
