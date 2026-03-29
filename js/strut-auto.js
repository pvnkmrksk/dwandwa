/**
 * Find 3D points (module space, before global tx/dz/y-shift) where dual-silhouette
 * intersection is not connected to the rearmost (min world Z) part — “hanging” tips
 * for struts to the back panel.
 */

function idx3(i, j, k, mx, strideY, strideZ) {
  return i + j * strideY + k * strideZ;
}

function solidAt(buf, i, j, k, mx, my, mz, strideY, strideZ) {
  if (i < 0 || j < 0 || k < 0 || i >= mx || j >= my || k >= mz) return false;
  return buf[idx3(i, j, k, mx, strideY, strideZ)] !== 0;
}

/**
 * @param {Uint8Array} interSolid
 * @param {number} Mx My Mz cell counts
 * @param {(i:number,j:number,k:number) => { x: number, y: number, z: number }} toWorld center of cell in module space
 * @returns {{ x: number, y: number, z: number }[]}
 */
export function hangTipsFromIntersection(interSolid, Mx, My, Mz, toWorld) {
  const strideY = Mx;
  const strideZ = Mx * My;
  let any = false;
  for (let i = 0; i < interSolid.length; i++) {
    if (interSolid[i]) { any = true; break; }
  }
  if (!any) return [];

  let zwMin = Infinity;
  const cellZw = new Float32Array(Mx * My * Mz);
  for (let k = 0; k < Mz; k++) {
    for (let j = 0; j < My; j++) {
      for (let i = 0; i < Mx; i++) {
        const ix = idx3(i, j, k, Mx, strideY, strideZ);
        if (!interSolid[ix]) {
          cellZw[ix] = Infinity;
          continue;
        }
        const { z } = toWorld(i, j, k);
        cellZw[ix] = z;
        if (z < zwMin) zwMin = z;
      }
    }
  }

  const eps = 1e-3 + 1e-4 * Math.max(Mx, My, Mz);
  const visited = new Uint8Array(Mx * My * Mz);
  const q = [];
  for (let k = 0; k < Mz; k++) {
    for (let j = 0; j < My; j++) {
      for (let i = 0; i < Mx; i++) {
        const ix = idx3(i, j, k, Mx, strideY, strideZ);
        if (!interSolid[ix]) continue;
        if (cellZw[ix] <= zwMin + eps) {
          visited[ix] = 1;
          q.push(i, j, k);
        }
      }
    }
  }

  let qh = 0;
  while (qh < q.length) {
    const i = q[qh++];
    const j = q[qh++];
    const k = q[qh++];
    const neigh = [
      i + 1, j, k, i - 1, j, k,
      i, j + 1, k, i, j - 1, k,
      i, j, k + 1, i, j, k - 1,
    ];
    for (let n = 0; n < neigh.length; n += 3) {
      const a = neigh[n];
      const b = neigh[n + 1];
      const c = neigh[n + 2];
      if (!solidAt(interSolid, a, b, c, Mx, My, Mz, strideY, strideZ)) continue;
      const ii = idx3(a, b, c, Mx, strideY, strideZ);
      if (visited[ii]) continue;
      visited[ii] = 1;
      q.push(a, b, c);
    }
  }

  const minVol = Math.max(4, Math.floor((Mx * My * Mz) / 48));
  const hangMark = new Uint8Array(Mx * My * Mz);
  for (let k = 0; k < Mz; k++) {
    for (let j = 0; j < My; j++) {
      for (let i = 0; i < Mx; i++) {
        const ix = idx3(i, j, k, Mx, strideY, strideZ);
        if (interSolid[ix] && !visited[ix]) hangMark[ix] = 1;
      }
    }
  }

  const comp = new Int32Array(Mx * My * Mz).fill(-1);
  const compCells = [];
  let compCount = 0;

  for (let k = 0; k < Mz; k++) {
    for (let j = 0; j < My; j++) {
      for (let i = 0; i < Mx; i++) {
        const start = idx3(i, j, k, Mx, strideY, strideZ);
        if (!hangMark[start] || comp[start] >= 0) continue;
        const cells = [];
        const qq = [i, j, k];
        comp[start] = compCount;
        cells.push(start);
        let qi = 0;
        while (qi < qq.length) {
          const ci = qq[qi++];
          const cj = qq[qi++];
          const ck = qq[qi++];
          const neigh2 = [
            ci + 1, cj, ck, ci - 1, cj, ck,
            ci, cj + 1, ck, ci, cj - 1, ck,
            ci, cj, ck + 1, ci, cj, ck - 1,
          ];
          for (let n = 0; n < neigh2.length; n += 3) {
            const a = neigh2[n];
            const b = neigh2[n + 1];
            const c = neigh2[n + 2];
            if (!solidAt(hangMark, a, b, c, Mx, My, Mz, strideY, strideZ)) continue;
            const ii = idx3(a, b, c, Mx, strideY, strideZ);
            if (comp[ii] >= 0) continue;
            comp[ii] = compCount;
            cells.push(ii);
            qq.push(a, b, c);
          }
        }
        compCells.push(cells);
        compCount++;
      }
    }
  }

  const tips = [];
  for (const cells of compCells) {
    if (cells.length < minVol) continue;
    let zMax = -Infinity;
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let cnt = 0;
    for (const ix of cells) {
      const k = Math.floor(ix / strideZ);
      const j = Math.floor((ix - k * strideZ) / strideY);
      const i = ix - j * strideY - k * strideZ;
      const w = toWorld(i, j, k);
      if (w.z > zMax) zMax = w.z;
      sx += w.x;
      sy += w.y;
      sz += w.z;
      cnt++;
    }
    tips.push({
      x: sx / cnt,
      y: sy / cnt,
      z: zMax,
    });
  }

  return tips;
}
