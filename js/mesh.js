/* global THREE */
import S from './state.js';
import {
  computeDzAlignBack,
  computeTxEqualGap,
  computeTxSpanPack,
} from './module-layout.js';
import { meshFromBinaryCells } from './mesher/voxel-surface.js';

function gaussKernel(sigma) {
  const r = Math.ceil(sigma * 3);
  const k = new Float32Array(2 * r + 1);
  let s = 0;
  for (let i = 0; i <= 2 * r; i++) {
    k[i] = Math.exp(-0.5 * ((i - r) / sigma) ** 2);
    s += k[i];
  }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  return { k, r };
}

function blurSlice(data, w, h, sigma) {
  const { k, r } = gaussKernel(sigma);
  const tmp = new Float32Array(w * h);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let d = -r; d <= r; d++) {
        acc += data[Math.max(0, Math.min(w - 1, x + d)) * h + z] * k[d + r];
      }
      tmp[x * h + z] = acc;
    }
  }
  const out = new Float32Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < h; z++) {
      let acc = 0;
      for (let d = -r; d <= r; d++) {
        acc += tmp[x * h + Math.max(0, Math.min(h - 1, z + d))] * k[d + r];
      }
      out[x * h + z] = acc;
    }
  }
  return out;
}

function sampleSlice(data, w, h, x, z) {
  x = Math.max(0, Math.min(w - 1, x));
  z = Math.max(0, Math.min(h - 1, z));
  const x0 = Math.floor(x);
  const z0 = Math.floor(z);
  const x1 = Math.min(w - 1, x0 + 1);
  const z1 = Math.min(h - 1, z0 + 1);
  const fx = x - x0;
  const fz = z - z0;
  return data[x0 * h + z0] * (1 - fx) * (1 - fz) +
    data[x1 * h + z0] * fx * (1 - fz) +
    data[x0 * h + z1] * (1 - fx) * fz +
    data[x1 * h + z1] * fx * fz;
}

/** Non-zero ink bounding box on smoothed raster (threshold 0.5). */
function inkBBox(slice, w, h) {
  let minX = w;
  let maxX = -1;
  let minZ = h;
  let maxZ = -1;
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < h; z++) {
      if (slice[x * h + z] >= 0.5) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }
  }
  if (maxX < minX) return null;
  return { minX, maxX, minZ, maxZ };
}

/**
 * Dual silhouette → one solid cuboid per column (independent front width × side width × shared height).
 * Intersection of the two views is used only to place auto struts (hanging bits).
 * @param {number} sigma Gaussian blur on raster before bbox / intersection (reduces jaggy stair-steps).
 */
export function buildModuleMeshes(silA, silB, _cellSizeLegacy, gridRes, sigma) {
  const allPos = [];
  const allIdx = [];
  const allCol = [];
  let baseVert = 0;

  const cos45 = Math.SQRT1_2;
  const sin45 = Math.SQRT1_2;
  const blurSigma = Math.max(0.6, sigma || 1.1);
  const gapFrac = 1 + S.letterGapPct / 100;

  /** @type {Array<null | { positions: number[], colors: number[], indices: Uint32Array, cw: number, ch: number, Mx: number, My: number, Mz: number }>} */
  const perMod = new Array(S.nCols).fill(null);
  const packSpans = new Array(S.nCols).fill(0);

  for (let mod = 0; mod < S.nCols; mod++) {
    const cwF = S.colCellW1[mod];
    const cwS = S.colCellW2[mod];
    const ch = S.rowCellH;

    const fSlice = new Float32Array(cwF * ch);
    for (let lx = 0; lx < cwF; lx++) {
      for (let z = 0; z < ch; z++) {
        fSlice[lx * ch + z] = silA[S.colOffset1[mod] + lx * ch + z];
      }
    }
    const sSlice = new Float32Array(cwS * ch);
    for (let lx = 0; lx < cwS; lx++) {
      for (let z = 0; z < ch; z++) {
        sSlice[lx * ch + z] = silB[S.colOffset2[mod] + lx * ch + z];
      }
    }

    const bfU = blurSlice(fSlice, cwF, ch, blurSigma);
    const bsU = blurSlice(sSlice, cwS, ch, blurSigma);

    const bf = inkBBox(bfU, cwF, ch);
    const bs = inkBBox(bsU, cwS, ch);
    const fullF = { minX: 0, maxX: cwF - 1, minZ: 0, maxZ: ch - 1 };
    const fullS = { minX: 0, maxX: cwS - 1, minZ: 0, maxZ: ch - 1 };
    const F = bf || fullF;
    const sideInk = bs || fullS;

    const xf0 = F.minX;
    const xf1 = F.maxX;
    const yd0 = sideInk.minX;
    const yd1 = sideInk.maxX;
    let z0 = Math.max(F.minZ, sideInk.minZ);
    let z1 = Math.min(F.maxZ, sideInk.maxZ);
    if (z0 > z1) {
      z0 = Math.min(fullF.minZ, fullS.minZ);
      z1 = Math.max(fullF.maxZ, fullS.maxZ);
    }

    const dx = Math.max(1, xf1 - xf0 + 1);
    const dy = Math.max(1, yd1 - yd0 + 1);
    const dz = Math.max(1, z1 - z0 + 1);

    packSpans[mod] = (dx + dy) * Math.SQRT1_2 * gapFrac;

    const Nx = Math.min(gridRes, Math.max(8, dx));
    const Ny = Math.min(gridRes, Math.max(8, dy));
    const Nz = Math.min(gridRes, Math.max(8, dz));
    const Mx = Math.max(1, Nx - 1);
    const My = Math.max(1, Ny - 1);
    const Mz = Math.max(1, Nz - 1);

    const strideY = Mx;
    const strideZ = Mx * My;
    const cellSolid = new Uint8Array(Mx * My * Mz);

    const spanX = Math.max(1e-6, xf1 - xf0);
    const spanY = Math.max(1e-6, yd1 - yd0);
    const spanZ = Math.max(1e-6, z1 - z0);

    for (let k = 0; k < Mz; k++) {
      for (let j = 0; j < My; j++) {
        for (let i = 0; i < Mx; i++) {
          const sxf = xf0 + (i + 0.5) / Mx * spanX;
          const syf = yd0 + (j + 0.5) / My * spanY;
          const szf = z0 + (k + 0.5) / Mz * spanZ;
          const fv = sampleSlice(bfU, cwF, ch, sxf, szf);
          const sv = sampleSlice(bsU, cwS, ch, syf, szf);
          const ix = i + j * strideY + k * strideZ;
          cellSolid[ix] = Math.min(fv, sv) >= 0.5 ? 1 : 0;
        }
      }
    }

    const mesh = meshFromBinaryCells(cellSolid, Mx, My, Mz);
    if (mesh.positions.length === 0) continue;

    const midX = (xf0 + xf1) / 2;
    const midY = (yd0 + yd1) / 2;
    const midZ = (z0 + z1) / 2;

    const positions = [];
    const colors = [];

    for (let i = 0; i < mesh.positions.length; i += 3) {
      const px = mesh.positions[i];
      const py = mesh.positions[i + 1];
      const pz = mesh.positions[i + 2];
      const sxf = xf0 + (px / Mx) * spanX;
      const syf = yd0 + (py / My) * spanY;
      const szf = z0 + (pz / Mz) * spanZ;

      const lx = sxf - midX;
      const lz = syf - midY;
      const ly = szf - midZ;
      const xw = lx * cos45 + lz * sin45;
      const yw = ly;
      const zw = -lx * sin45 + lz * cos45;

      positions.push(xw, yw, zw);

      const fv = sampleSlice(bfU, cwF, ch, sxf, szf);
      const sv = sampleSlice(bsU, cwS, ch, syf, szf);
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
      cwF,
      cwS,
      ch,
      Mx,
      My,
      Mz,
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
  const spanTotalW = packSpans.reduce((a, b) => a + b, 0);
  if (active.length && S.equalGapPack) {
    tx = computeTxEqualGap(perMod, active, S.letterGapPct, S.nCols);
  } else {
    tx = computeTxSpanPack(S.nCols, packSpans, spanTotalW, perMod);
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
