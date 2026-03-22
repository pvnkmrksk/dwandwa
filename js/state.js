export let CELL = 64;
export let nCols = 1;
export let chars1 = ['B'], chars2 = ['F'];
export let font1 = 'sans-serif', font2 = 'sans-serif';
export let uploadedFontFamily = null;
export let padChar = '\u2665';
export let sil1, sil2;

export function NX() {
  return nCols * CELL;
}

export function allocArrays() {
  const n = NX() * CELL;
  sil1 = new Uint8Array(n);
  sil2 = new Uint8Array(n);
}

allocArrays();
