/**
 * Watertight triangle mesh from a binary cell occupancy grid (6-connected solid).
 * Cell (i,j,k) occupies [i,i+1]×[j,j+1]×[k,k+1]; vertices use integer coords 0..mx, 0..my, 0..mz.
 *
 * @param {Uint8Array} cellSolid — length mx*my*mz, index i + mx*j + mx*my*k
 * @param {number} mx cells along X (front horizontal)
 * @param {number} my cells along Y (depth / side horizontal)
 * @param {number} mz cells along Z (vertical)
 */
export function meshFromBinaryCells(cellSolid, mx, my, mz) {
  if (mx < 1 || my < 1 || mz < 1) {
    return { positions: new Float32Array(0), indices: new Uint32Array(0) };
  }

  const strideY = mx;
  const strideZ = mx * my;

  const vertMap = new Map();
  const positions = [];
  const indices = [];

  function vid(x, y, z) {
    const key = `${x},${y},${z}`;
    if (vertMap.has(key)) return vertMap.get(key);
    const id = positions.length / 3;
    positions.push(x, y, z);
    vertMap.set(key, id);
    return id;
  }

  function solid(i, j, k) {
    if (i < 0 || j < 0 || k < 0 || i >= mx || j >= my || k >= mz) return false;
    return cellSolid[i + j * strideY + k * strideZ] !== 0;
  }

  for (let k = 0; k < mz; k++) {
    for (let j = 0; j < my; j++) {
      for (let i = 0; i < mx; i++) {
        if (!solid(i, j, k)) continue;

        const x1 = i + 1;
        const y1 = j + 1;
        const z1 = k + 1;

        if (!solid(i + 1, j, k)) {
          const a = vid(x1, j, k);
          const b = vid(x1, y1, k);
          const c = vid(x1, y1, z1);
          const d = vid(x1, j, z1);
          indices.push(a, b, c, a, c, d);
        }
        if (!solid(i - 1, j, k)) {
          const a = vid(i, j, k);
          const b = vid(i, j, z1);
          const c = vid(i, y1, z1);
          const d = vid(i, y1, k);
          indices.push(a, b, c, a, c, d);
        }
        if (!solid(i, j + 1, k)) {
          const a = vid(i, y1, k);
          const b = vid(i, y1, z1);
          const c = vid(x1, y1, z1);
          const d = vid(x1, y1, k);
          indices.push(a, b, c, a, c, d);
        }
        if (!solid(i, j - 1, k)) {
          const a = vid(i, j, k);
          const b = vid(x1, j, k);
          const c = vid(x1, j, z1);
          const d = vid(i, j, z1);
          indices.push(a, b, c, a, c, d);
        }
        if (!solid(i, j, k + 1)) {
          const a = vid(i, j, z1);
          const b = vid(x1, j, z1);
          const c = vid(x1, y1, z1);
          const d = vid(i, y1, z1);
          indices.push(a, b, c, a, c, d);
        }
        if (!solid(i, j, k - 1)) {
          const a = vid(i, j, k);
          const b = vid(i, y1, k);
          const c = vid(x1, y1, k);
          const d = vid(x1, j, k);
          indices.push(a, b, c, a, c, d);
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}
