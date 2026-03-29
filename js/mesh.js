/* global THREE */
import S from './state.js';

function gaussKernel(sigma) {
  const r = Math.ceil(sigma * 3);
  const k = new Float32Array(2 * r + 1);
  let s = 0;
  for (let i = 0; i <= 2 * r; i++) { k[i] = Math.exp(-0.5 * ((i - r) / sigma) ** 2); s += k[i]; }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  return { k, r };
}

function blurSlice(data, w, h, sigma) {
  const { k, r } = gaussKernel(sigma);
  const tmp = new Float32Array(w * h);
  for (let z = 0; z < h; z++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let d = -r; d <= r; d++)
        acc += data[Math.max(0, Math.min(w - 1, x + d)) * h + z] * k[d + r];
      tmp[x * h + z] = acc;
    }
  }
  const out = new Float32Array(w * h);
  for (let x = 0; x < w; x++) {
    for (let z = 0; z < h; z++) {
      let acc = 0;
      for (let d = -r; d <= r; d++)
        acc += tmp[x * h + Math.max(0, Math.min(h - 1, z + d))] * k[d + r];
      out[x * h + z] = acc;
    }
  }
  return out;
}

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

const SN_CORNERS_X = [0,1,0,1,0,1,0,1];
const SN_CORNERS_Y = [0,0,1,1,0,0,1,1];
const SN_CORNERS_Z = [0,0,0,0,1,1,1,1];
const SN_EDGES = [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]];

function surfaceNets(sampleDensity, N) {
  const positions = [];
  const indices = [];
  const vertMap = new Int32Array(N * N * N).fill(-1);

  for (let gz = 0; gz < N - 1; gz++) {
    for (let gy = 0; gy < N - 1; gy++) {
      for (let gx = 0; gx < N - 1; gx++) {
        const c = [];
        let mask = 0;
        for (let i = 0; i < 8; i++) {
          const v = sampleDensity(gx + SN_CORNERS_X[i], gy + SN_CORNERS_Y[i], gz + SN_CORNERS_Z[i]);
          c.push(v);
          if (v >= 0.5) mask |= 1 << i;
        }
        if (mask === 0 || mask === 255) continue;

        let vx = 0, vy = 0, vz = 0, cnt = 0;
        for (const [a, b] of SN_EDGES) {
          if ((c[a] >= 0.5) !== (c[b] >= 0.5)) {
            const t = Math.max(0, Math.min(1, (0.5 - c[a]) / (c[b] - c[a])));
            vx += gx + SN_CORNERS_X[a] + t * (SN_CORNERS_X[b] - SN_CORNERS_X[a]);
            vy += gy + SN_CORNERS_Y[a] + t * (SN_CORNERS_Y[b] - SN_CORNERS_Y[a]);
            vz += gz + SN_CORNERS_Z[a] + t * (SN_CORNERS_Z[b] - SN_CORNERS_Z[a]);
            cnt++;
          }
        }
        vertMap[gx + gy * N + gz * N * N] = positions.length / 3;
        positions.push(vx / cnt, vy / cnt, vz / cnt);
      }
    }
  }

  for (let gz = 0; gz < N - 1; gz++) {
    for (let gy = 0; gy < N - 1; gy++) {
      for (let gx = 0; gx < N - 1; gx++) {
        const vi = vertMap[gx + gy * N + gz * N * N];
        if (vi < 0) continue;
        const d0 = sampleDensity(gx, gy, gz);

        if (gy > 0 && gz > 0 && (d0 >= 0.5) !== (sampleDensity(gx + 1, gy, gz) >= 0.5)) {
          const a = vi;
          const b = vertMap[gx + (gy - 1) * N + gz * N * N];
          const c = vertMap[gx + (gy - 1) * N + (gz - 1) * N * N];
          const d = vertMap[gx + gy * N + (gz - 1) * N * N];
          if (a >= 0 && b >= 0 && c >= 0 && d >= 0) {
            if (d0 >= 0.5) { indices.push(a, d, c, a, c, b); }
            else           { indices.push(a, b, c, a, c, d); }
          }
        }

        if (gx > 0 && gz > 0 && (d0 >= 0.5) !== (sampleDensity(gx, gy + 1, gz) >= 0.5)) {
          const a = vi;
          const b = vertMap[gx + gy * N + (gz - 1) * N * N];
          const c = vertMap[(gx - 1) + gy * N + (gz - 1) * N * N];
          const d = vertMap[(gx - 1) + gy * N + gz * N * N];
          if (a >= 0 && b >= 0 && c >= 0 && d >= 0) {
            if (d0 >= 0.5) { indices.push(a, d, c, a, c, b); }
            else           { indices.push(a, b, c, a, c, d); }
          }
        }

        if (gx > 0 && gy > 0 && (d0 >= 0.5) !== (sampleDensity(gx, gy, gz + 1) >= 0.5)) {
          const a = vi;
          const b = vertMap[(gx - 1) + gy * N + gz * N * N];
          const c = vertMap[(gx - 1) + (gy - 1) * N + gz * N * N];
          const d = vertMap[gx + (gy - 1) * N + gz * N * N];
          if (a >= 0 && b >= 0 && c >= 0 && d >= 0) {
            if (d0 >= 0.5) { indices.push(a, d, c, a, c, b); }
            else           { indices.push(a, b, c, a, c, d); }
          }
        }
      }
    }
  }

  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) };
}

export function buildModuleMeshes(silA, silB, _cellSizeLegacy, gridRes, sigma) {
  const allPos = [];
  const allIdx = [];
  const allCol = [];
  let baseVert = 0;

  const gapFrac = 1 + S.letterGapPct / 100;
  const cos45 = Math.SQRT1_2;
  const sin45 = Math.SQRT1_2;

  const spans = [];
  for (let mod = 0; mod < S.nCols; mod++) {
    const cw = S.colCellW[mod];
    const ch = S.rowCellH;
    spans.push(Math.max(cw, ch) * Math.SQRT1_2 * gapFrac);
  }
  const spanTotalW = spans.reduce((a, b) => a + b, 0);

  /** @type {Array<null | { positions: number[], colors: number[], indices: Uint32Array, bf: Float32Array, bs: Float32Array, cw: number, ch: number, N: number, nm: number, wsX: number, wsY: number, wsZ: number, oy: number }>} */
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
    const bf = blurSlice(fSlice, cw, ch, sigma);
    const bs = blurSlice(sSlice, cw, ch, sigma);

    const maxDim = Math.max(cw, ch);
    const N = Math.min(gridRes, Math.max(12, maxDim));
    const scale = (N - 1) > 0 ? 1 / (N - 1) : 1;

    const field = new Float32Array(N * N * N);
    for (let gz = 0; gz < N; gz++) {
      for (let gy = 0; gy < N; gy++) {
        for (let gx = 0; gx < N; gx++) {
          const sx = gx * scale * (cw - 1);
          const sy = gy * scale * (cw - 1);
          const sz = gz * scale * (ch - 1);
          const fv = sampleSlice(bf, cw, ch, sx, sz);
          const sv = sampleSlice(bs, cw, ch, sy, sz);
          field[gx + gy * N + gz * N * N] = Math.min(fv, sv);
        }
      }
    }

    const density = (x, y, z) => {
      if (x < 0 || x >= N || y < 0 || y >= N || z < 0 || z >= N) return 0;
      return field[x + y * N + z * N * N];
    };

    const mesh = surfaceNets(density, N);
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
      const fv = sampleSlice(bf, cw, ch, sx, sz);
      const sv = sampleSlice(bs, cw, ch, sy, sz);
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
      bf, bs, cw, ch, N, nm, wsX, wsY, wsZ, oy,
    };
  }

  const dz = new Array(S.nCols).fill(0);
  const tx = new Array(S.nCols).fill(0);

  const active = [];
  for (let mod = 0; mod < S.nCols; mod++) {
    if (perMod[mod]) active.push(mod);
  }

  if (active.length && S.alignBackEdges) {
    let zT = Infinity;
    for (const mod of active) {
      const p = perMod[mod].positions;
      for (let i = 2; i < p.length; i += 3) {
        if (p[i] < zT) zT = p[i];
      }
    }
    for (const mod of active) {
      let zMin = Infinity;
      const p = perMod[mod].positions;
      for (let i = 2; i < p.length; i += 3) {
        if (p[i] < zMin) zMin = p[i];
      }
      dz[mod] = zT - zMin;
    }
  }

  if (active.length && S.equalGapPack) {
    const bounds = {};
    for (const mod of active) {
      const p = perMod[mod].positions;
      let xMin = Infinity;
      let xMax = -Infinity;
      for (let i = 0; i < p.length; i += 3) {
        const x = p[i];
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
      }
      bounds[mod] = { xMin, xMax, w: Math.max(1e-6, xMax - xMin) };
    }
    let meanW = 0;
    for (const mod of active) meanW += bounds[mod].w;
    meanW /= active.length;
    const g = (S.letterGapPct / 100) * meanW;
    let sumW = 0;
    for (const mod of active) sumW += bounds[mod].w;
    const totalW = Math.max(1e-4, sumW + g * (active.length - 1));
    let left = -totalW / 2;
    for (const mod of active) {
      tx[mod] = left - bounds[mod].xMin;
      left += bounds[mod].w + g;
    }
  } else {
    for (let mod = 0; mod < S.nCols; mod++) {
      if (!perMod[mod]) continue;
      let acc = 0;
      for (let j = 0; j < mod; j++) acc += spans[j];
      tx[mod] = acc + spans[mod] / 2 - spanTotalW / 2;
    }
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
        M.positions[i + 2] + dz[mod]
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
