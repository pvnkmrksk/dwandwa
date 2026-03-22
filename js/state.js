const S = {
  CELL: 64,
  nCols: 1,
  chars1: ['B'],
  chars2: ['F'],
  font1: 'sans-serif',
  font2: 'sans-serif',
  uploadedFontFamily: null,
  padChar: '\u2665',
  sil1: null,
  sil2: null,
};

export default S;

export function NX() {
  return S.nCols * S.CELL;
}

export function allocArrays() {
  const n = NX() * S.CELL;
  S.sil1 = new Uint8Array(n);
  S.sil2 = new Uint8Array(n);
}

allocArrays();
