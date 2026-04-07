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
  /** True after pixel edits or applying shared sil; false after fresh stamp with no URL sil. */
  silBitmapEdited: false,
  /** Per-column width in cells — front word. */
  colCellW1: null,
  /** Per-column width in cells — side word. */
  colCellW2: null,
  /** Uniform row height in silhouette cells. */
  rowCellH: 64,
  /** Prefix sum: global x start of column c for front. */
  colX01: null,
  /** Prefix sum: global x start of column c for side. */
  colX02: null,
  /** Byte offset into sil1 for column c. */
  colOffset1: null,
  /** Byte offset into sil2 for column c. */
  colOffset2: null,
  /** Total raster width in cells — front. */
  rasterWidth1: 64,
  /** Total raster width in cells — side. */
  rasterWidth2: 64,
  /** When true, every column uses the full resolution cell width (Latin-friendly). */
  uniformColumns: false,
  /** Align each module's rearmost (min Z) plane after layout. */
  alignBackEdges: false,
  /** Shift combined mesh so the lowest Y sits on the base (uncheck to keep raw Y). */
  meshBottomAlign: true,
  /** Pack modules with equal gaps between bounding boxes. */
  equalGapPack: false,
  /** Thin Z-struts from each module's back to the inner wall face. */
  backStrut: false,
  /** World X of each module's bbox center after layout. */
  moduleCenterX: null,
  /** World Z of each module's back (min Z) after layout. */
  moduleZBack: null,
  /** World X offset of each module's column origin. */
  moduleTx: null,
  /** User-placed strut pins from 3D surface painting [{x,y,z}]. */
  strutPins: [],
};

export default S;

export function NX1() { return S.rasterWidth1; }
export function NX2() { return S.rasterWidth2; }

export function silIndex1(c, lx, z) {
  return S.colOffset1[c] + lx * S.rowCellH + z;
}
export function silIndex2(c, lx, z) {
  return S.colOffset2[c] + lx * S.rowCellH + z;
}

function buildOffsets(colCellW, nCols) {
  const colX0 = new Int32Array(nCols + 1);
  const colOffset = new Int32Array(nCols + 1);
  let x = 0;
  for (let i = 0; i <= nCols; i++) {
    colX0[i] = x;
    if (i < nCols) x += colCellW[i];
  }
  let off = 0;
  for (let i = 0; i <= nCols; i++) {
    colOffset[i] = off;
    if (i < nCols) off += colCellW[i] * S.rowCellH;
  }
  return { colX0, colOffset, rasterWidth: x, totalCells: off };
}

export function allocArrays() {
  const nCols = S.nCols;
  if (!S.colCellW1 || S.colCellW1.length !== nCols) {
    S.colCellW1 = new Int32Array(nCols);
    for (let i = 0; i < nCols; i++) S.colCellW1[i] = S.CELL;
  }
  if (!S.colCellW2 || S.colCellW2.length !== nCols) {
    S.colCellW2 = new Int32Array(nCols);
    for (let i = 0; i < nCols; i++) S.colCellW2[i] = S.CELL;
  }
  const r1 = buildOffsets(S.colCellW1, nCols);
  S.colX01 = r1.colX0;
  S.colOffset1 = r1.colOffset;
  S.rasterWidth1 = r1.rasterWidth;
  S.sil1 = new Uint8Array(r1.totalCells);

  const r2 = buildOffsets(S.colCellW2, nCols);
  S.colX02 = r2.colX0;
  S.colOffset2 = r2.colOffset;
  S.rasterWidth2 = r2.rasterWidth;
  S.sil2 = new Uint8Array(r2.totalCells);
}

allocArrays();
