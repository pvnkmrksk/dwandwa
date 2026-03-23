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

export function buildModuleMeshes(silA, silB, cellSize, gridRes, sigma) {
  const allPos = [], allIdx = [], allCol = [];
  let baseVert = 0;
  const nx = S.nCols * cellSize;

  for (let mod = 0; mod < S.nCols; mod++) {
    const fSlice = new Float32Array(cellSize * cellSize);
    const sSlice = new Float32Array(cellSize * cellSize);
    for (let lx = 0; lx < cellSize; lx++) {
      for (let z = 0; z < cellSize; z++) {
        fSlice[lx * cellSize + z] = silA[(mod * cellSize + lx) * cellSize + z];
        sSlice[lx * cellSize + z] = silB[(mod * cellSize + lx) * cellSize + z];
      }
    }
    const bf = blurSlice(fSlice, cellSize, cellSize, sigma);
    const bs = blurSlice(sSlice, cellSize, cellSize, sigma);

    const N = gridRes;
    const scale = (cellSize - 1) / (N - 1);

    const fieldSize = N * N * N;
    const field = new Float32Array(fieldSize);
    for (let gz = 0; gz < N; gz++) {
      for (let gy = 0; gy < N; gy++) {
        for (let gx = 0; gx < N; gx++) {
          const sx = gx * scale, sy = gy * scale, sz = gz * scale;
          const fv = sampleSlice(bf, cellSize, cellSize, sx, sz);
          const sv = sampleSlice(bs, cellSize, cellSize, sy, sz);
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

    const worldScale = cellSize / N;
    // Module spacing: each module is cellSize wide, rotated 45° so footprint
    // is cellSize * sqrt(2). Add small gap so letters don't overlap.
    const modSpacing = cellSize * Math.SQRT1_2 * 1.15;
    const totalWidth = S.nCols * modSpacing;
    const modCenterX = mod * modSpacing - totalWidth / 2 + modSpacing / 2;
    const oy = -cellSize / 2;

    // 45° rotation around each module's own center
    const cos45 = Math.SQRT1_2, sin45 = Math.SQRT1_2;

    for (let i = 0; i < mesh.positions.length; i += 3) {
      const px = mesh.positions[i], py = mesh.positions[i + 1], pz = mesh.positions[i + 2];
      // Local coords centered on module (before rotation)
      const lx = (px * worldScale) - cellSize / 2;
      const ly = pz * worldScale + oy; // Y = height (from pz)
      const lz = (py * worldScale) - cellSize / 2;
      // Rotate 45° around module's own Y axis, then translate to line position
      allPos.push(
        modCenterX + lx * cos45 + lz * sin45,
        ly,
        -lx * sin45 + lz * cos45
      );

      const sx = px * scale, sy = py * scale, sz = pz * scale;
      const fv = sampleSlice(bf, cellSize, cellSize, sx, sz);
      const sv = sampleSlice(bs, cellSize, cellSize, sy, sz);
      if (fv <= sv) {
        allCol.push(0.94, 0.63, 0.19);
      } else {
        allCol.push(0.19, 0.56, 0.94);
      }
    }

    for (let i = 0; i < mesh.indices.length; i++) {
      allIdx.push(mesh.indices[i] + baseVert);
    }
    baseVert += mesh.positions.length / 3;
  }

  if (allPos.length === 0) return null;

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(allPos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(allCol, 3));
  geo.setIndex(allIdx);
  geo.computeVertexNormals();
  return geo;
}
