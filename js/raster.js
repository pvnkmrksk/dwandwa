import S from './state.js';

export const BASELINE_FRAC = 0.76;

export async function stampName(chars, fontStr, targetSil, cellSize) {
  cellSize = cellSize || S.CELL;
  const fam = (fontStr === '__up__' && S.uploadedFontFamily) ? S.uploadedFontFamily : fontStr;
  try { await document.fonts.load(`bold 80px ${fam}`, chars.join('')); } catch(e) {}
  const BUF = Math.max(cellSize * 8, 512);
  const baseline = Math.round(BUF * BASELINE_FRAC);
  targetSil.fill(0);
  for (let col = 0; col < S.nCols; col++) {
    const ch = chars[col] || S.padChar;
    const cv = document.createElement('canvas');
    cv.width = cv.height = BUF;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, BUF, BUF);
    let fs = Math.round(BUF * 0.70);
    ctx.font = `bold ${fs}px ${fam}`;
    const wm = ctx.measureText(ch).width;
    if (wm > BUF * 0.84) fs = Math.round(fs * BUF * 0.84 / wm);
    ctx.font = `bold ${fs}px ${fam}`;
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillText(ch, BUF / 2, baseline);
    const px = ctx.getImageData(0, 0, BUF, BUF).data;
    const step = BUF / cellSize;
    for (let lx = 0; lx < cellSize; lx++) {
      for (let z = 0; z < cellSize; z++) {
        const bx0 = Math.round(lx * step), bx1 = Math.round((lx + 1) * step);
        const by0 = Math.round((cellSize - 1 - z) * step), by1 = Math.round((cellSize - z) * step);
        let sum = 0, cnt = 0;
        for (let by = by0; by < by1; by++)
          for (let bx = bx0; bx < bx1; bx++) { sum += px[(by * BUF + bx) * 4]; cnt++; }
        targetSil[(col * cellSize + lx) * cellSize + z] = (cnt > 0 && sum / cnt > 60) ? 1 : 0;
      }
    }
  }
}
