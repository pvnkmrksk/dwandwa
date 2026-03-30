/**
 * Detect floating islands in the dual-silhouette intersection and return
 * strut anchor points (world space, module-local) for each.
 *
 * Approach: 6-connected component analysis on the solid grid. Any component
 * whose minimum world-Z is within 15% of the global Z range from the absolute
 * min-Z is considered "connected to back." Everything else is floating and
 * gets a strut from its centroid / front-Z to the back panel.
 */

function idx3(i, j, k, strideY, strideZ) {
  return i + j * strideY + k * strideZ;
}

/**
 * @param {Uint8Array} solid
 * @param {number} Mx cells along X
 * @param {number} My cells along Y
 * @param {number} Mz cells along Z
 * @param {(i:number,j:number,k:number) => { x: number, y: number, z: number }} toWorld
 * @returns {{ x: number, y: number, z: number }[]}
 */
export function hangTipsFromIntersection(solid, Mx, My, Mz, toWorld) {
  const strideY = Mx;
  const strideZ = Mx * My;
  const total = Mx * My * Mz;

  let anySet = false;
  for (let i = 0; i < total; i++) {
    if (solid[i]) { anySet = true; break; }
  }
  if (!anySet) return [];

  // Step 1: find connected components via 6-connected BFS
  const compId = new Int32Array(total).fill(-1);
  const components = []; // array of { cells: number[], minZ: number, centroid, frontZ }
  let numComp = 0;

  for (let k = 0; k < Mz; k++) {
    for (let j = 0; j < My; j++) {
      for (let i = 0; i < Mx; i++) {
        const start = idx3(i, j, k, strideY, strideZ);
        if (!solid[start] || compId[start] >= 0) continue;

        const cid = numComp++;
        const cells = [];
        const q = [i, j, k];
        compId[start] = cid;
        cells.push(start);
        let qi = 0;

        while (qi < q.length) {
          const ci = q[qi++];
          const cj = q[qi++];
          const ck = q[qi++];
          const nb = [
            ci + 1, cj, ck, ci - 1, cj, ck,
            ci, cj + 1, ck, ci, cj - 1, ck,
            ci, cj, ck + 1, ci, cj, ck - 1,
          ];
          for (let n = 0; n < nb.length; n += 3) {
            const a = nb[n], b = nb[n + 1], c = nb[n + 2];
            if (a < 0 || b < 0 || c < 0 || a >= Mx || b >= My || c >= Mz) continue;
            const ii = idx3(a, b, c, strideY, strideZ);
            if (!solid[ii] || compId[ii] >= 0) continue;
            compId[ii] = cid;
            cells.push(ii);
            q.push(a, b, c);
          }
        }
        components.push({ cells, cid });
      }
    }
  }

  if (components.length === 0) return [];

  // Step 2: for each component compute world-space stats
  let globalMinZ = Infinity;
  let globalMaxZ = -Infinity;

  const compStats = components.map(comp => {
    let minZ = Infinity;
    let maxZ = -Infinity;
    let sx = 0, sy = 0, sz = 0;
    const cnt = comp.cells.length;
    for (const ix of comp.cells) {
      const ck = Math.floor(ix / strideZ);
      const cj = Math.floor((ix - ck * strideZ) / strideY);
      const ci = ix - cj * strideY - ck * strideZ;
      const w = toWorld(ci, cj, ck);
      if (w.z < minZ) minZ = w.z;
      if (w.z > maxZ) maxZ = w.z;
      sx += w.x;
      sy += w.y;
      sz += w.z;
    }
    if (minZ < globalMinZ) globalMinZ = minZ;
    if (maxZ > globalMaxZ) globalMaxZ = maxZ;
    return { minZ, maxZ, cx: sx / cnt, cy: sy / cnt, cz: sz / cnt, cnt };
  });

  // Step 3: components whose min-Z is within 15% of the Z range from the
  // global minimum are "attached to back." Everything else is floating.
  const zRange = Math.max(1e-6, globalMaxZ - globalMinZ);
  const backThreshold = globalMinZ + zRange * 0.15;

  const tips = [];
  for (let c = 0; c < compStats.length; c++) {
    const s = compStats[c];
    if (s.minZ <= backThreshold) continue; // connected to back
    if (s.cnt < 2) continue; // noise
    tips.push({
      x: s.cx,
      y: s.cy,
      z: s.maxZ, // front-most point → strut bridges to back panel
    });
  }

  return tips;
}
