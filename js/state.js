const S = {
  CELL: 64,
  nCols: 1,
  chars1: ['B'],
  chars2: ['F'],
  font1: 'sans-serif',
  font2: 'sans-serif',
  uploadedFontFamily: null,
  padChar: '\u2665',
  letterGapPct: 30,
  sil1: null,
  sil2: null,
  /** Per-column width in silhouette cells (variable). */
  colCellW: null,
  /** Uniform row height in silhouette cells. */
  rowCellH: 64,
  /** Prefix sum: global x start of column c. Length nCols+1. */
  colX0: null,
  /** Byte offset into flat sil for column c. Length nCols+1. */
  colOffset: null,
  /** Sum of colCellW — total raster width in cells. */
  rasterWidth: 64,
  /** When true, every column uses the full resolution cell width (Latin-friendly). Off = per-glyph widths (Indic). */
  uniformColumns: false,
  /** Align each module’s rearmost (min Z) plane after layout. */
  alignBackEdges: false,
  /** Pack modules with equal gaps between bounding boxes (uses Gap % as gap scale). */
  equalGapPack: false,
  /** Thin Z-struts from each module’s back to the inner wall face (preview). */
  backStrut: false,
  /** World X of each module’s bbox center after layout (for struts). */
  moduleCenterX: null,
  /** World Z of each module’s back (min Z) after layout. */
  moduleZBack: null,
  /** World X offset of each module’s column origin (strut anchors; matches mesh layout). */
  moduleTx: null,
  /** Auto strut anchor points in world space (after layout + Y normalize). */
  autoStrutTips: null,
};

export default S;

export function NX() {
  return S.rasterWidth;
}

/** Linear index in flat sil for column c, local x lx, vertical z. */
export function silColumnIndex(c, lx, z) {
  return S.colOffset[c] + lx * S.rowCellH + z;
}

export function allocArrays() {
  const nCols = S.nCols;
  if (!S.colCellW || S.colCellW.length !== nCols) {
    S.colCellW = new Int32Array(nCols);
    for (let i = 0; i < nCols; i++) S.colCellW[i] = S.CELL;
  }
  S.colX0 = new Int32Array(nCols + 1);
  S.colOffset = new Int32Array(nCols + 1);
  let x = 0;
  for (let i = 0; i <= nCols; i++) {
    S.colX0[i] = x;
    if (i < nCols) x += S.colCellW[i];
  }
  S.rasterWidth = x;
  let off = 0;
  for (let i = 0; i <= nCols; i++) {
    S.colOffset[i] = off;
    if (i < nCols) off += S.colCellW[i] * S.rowCellH;
  }
  const n = off;
  S.sil1 = new Uint8Array(n);
  S.sil2 = new Uint8Array(n);
}

allocArrays();
