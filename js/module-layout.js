/**
 * Pure helpers for multi-module X packing and Z alignment (extracted from mesh assembly).
 */

/** Per-column span along X for legacy (non-equal-gap) packing. */
export function columnSpans(nCols, colCellW, rowCellH, letterGapPct) {
  const gapFrac = 1 + letterGapPct / 100;
  const spans = [];
  for (let mod = 0; mod < nCols; mod++) {
    const cw = colCellW[mod];
    const ch = rowCellH;
    spans.push(Math.max(cw, ch) * Math.SQRT1_2 * gapFrac);
  }
  const spanTotalW = spans.reduce((a, b) => a + b, 0);
  return { spans, spanTotalW };
}

/** Align all module back edges to the global minimum Z (per-module dz offset). */
export function computeDzAlignBack(perMod, active, nCols) {
  const dz = new Array(nCols).fill(0);
  if (!active.length) return dz;
  let zT = Infinity;
  for (const mod of active) {
    const p = perMod[mod].positions;
    for (let i = 2; i < p.length; i += 3) {
      if (p[i] < zT) zT = p[i];
    }
  }
  for (const mod of active) {
    let zMin = Infinity;
    const p = perModPositions[mod];
    for (let i = 2; i < p.length; i += 3) {
      if (p[i] < zMin) zMin = p[i];
    }
    dz[mod] = zT - zMin;
  }
  return dz;
}

/** Equal-gap packing using measured X bounds per module. */
export function computeTxEqualGap(perMod, active, letterGapPct, nCols) {
  const tx = new Array(nCols).fill(0);
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
  const g = (letterGapPct / 100) * meanW;
  let sumW = 0;
  for (const mod of active) sumW += bounds[mod].w;
  const totalW = Math.max(1e-4, sumW + g * (active.length - 1));
  let left = -totalW / 2;
  for (const mod of active) {
    tx[mod] = left - bounds[mod].xMin;
    left += bounds[mod].w + g;
  }
  return tx;
}

/** Centered span-based X placement (variable column widths). */
export function computeTxSpanPack(nCols, spans, spanTotalW, perMod) {
  const tx = new Array(nCols).fill(0);
  for (let mod = 0; mod < nCols; mod++) {
    if (!perMod[mod]) continue;
    let acc = 0;
    for (let j = 0; j < mod; j++) acc += spans[j];
    tx[mod] = acc + spans[mod] / 2 - spanTotalW / 2;
  }
  return tx;
}
