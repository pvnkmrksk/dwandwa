import S, { silIndex1, silIndex2 } from './state.js';

export const BASELINE_FRAC = 0.76;

function canvas2dReadback(cv) {
  return cv.getContext('2d', { willReadFrequently: true });
}

function inkBBoxRGBA(px, bufW, bufH) {
  let minX = bufW, minY = bufH, maxX = 0, maxY = 0;
  let any = false;
  for (let y = 0; y < bufH; y++) {
    for (let x = 0; x < bufW; x++) {
      const i = (y * bufW + x) * 4;
      const bright = px[i] + px[i + 1] + px[i + 2] + (px[i + 3] || 255);
      if (bright > 400) {
        any = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!any) return { minX: 0, minY: 0, maxX: 0, maxY: 0, w: 1, h: 1 };
  return { minX, minY, maxX, maxY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

function measureGlyph(cv, BUF, baseline, ch, fam) {
  const ctx = canvas2dReadback(cv);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, BUF, BUF);
  let fs = Math.round(BUF * 0.7);
  ctx.font = `bold ${fs}px ${fam}`;
  const wm = ctx.measureText(ch).width;
  if (wm > BUF * 0.84) fs = Math.round(fs * BUF * 0.84 / wm);
  ctx.font = `bold ${fs}px ${fam}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(ch, BUF / 2, baseline);
  const px = ctx.getImageData(0, 0, BUF, BUF).data;
  return inkBBoxRGBA(px, BUF, BUF);
}

/**
 * Measure per-column cell widths for EACH word independently,
 * then set S.colCellW1, S.colCellW2, and S.rowCellH.
 */
export async function measureColumnCells(chars1, chars2, font1, font2, cellMax) {
  cellMax = cellMax || S.CELL;
  const fam1 = (font1 === '__up__' && S.uploadedFontFamily) ? S.uploadedFontFamily : font1;
  const fam2 = (font2 === '__up__' && S.uploadedFontFamily) ? S.uploadedFontFamily : font2;
  try { await document.fonts.load(`bold 80px ${fam1}`, chars1.join('')); } catch (e) {}
  try { await document.fonts.load(`bold 80px ${fam2}`, chars2.join('')); } catch (e) {}

  const BUF = Math.max(cellMax * 8, 512);
  const baseline = Math.round(BUF * BASELINE_FRAC);
  const minC = 8;

  const cv = document.createElement('canvas');
  cv.width = cv.height = BUF;

  const colW1 = new Int32Array(S.nCols);
  const colW2 = new Int32Array(S.nCols);
  let rowH = minC;

  if (S.uniformColumns) {
    for (let col = 0; col < S.nCols; col++) {
      for (const { ch, fam } of [
        { ch: chars1[col] || S.padChar, fam: fam1 },
        { ch: chars2[col] || S.padChar, fam: fam2 },
      ]) {
        const b = measureGlyph(cv, BUF, baseline, ch, fam);
        if (b.w * b.h > 1) {
          const ch2 = Math.min(cellMax, Math.max(minC, Math.ceil(b.h * cellMax / BUF)));
          if (ch2 > rowH) rowH = ch2;
        }
      }
      colW1[col] = cellMax;
      colW2[col] = cellMax;
    }
    S.colCellW1 = colW1;
    S.colCellW2 = colW2;
    S.rowCellH = rowH;
    return;
  }

  for (let col = 0; col < S.nCols; col++) {
    const b1 = measureGlyph(cv, BUF, baseline, chars1[col] || S.padChar, fam1);
    const b2 = measureGlyph(cv, BUF, baseline, chars2[col] || S.padChar, fam2);

    const maxH = Math.max(b1.h, b2.h);
    const ch = Math.min(cellMax, Math.max(minC, Math.ceil(maxH * cellMax / BUF)));
    if (ch > rowH) rowH = ch;

    colW1[col] = Math.min(cellMax, Math.max(minC, Math.ceil(b1.w * cellMax / BUF)));
    colW2[col] = Math.min(cellMax, Math.max(minC, Math.ceil(b2.w * cellMax / BUF)));
  }

  S.colCellW1 = colW1;
  S.colCellW2 = colW2;
  S.rowCellH = rowH;
}

/**
 * Stamp one word's glyphs into its silhouette array.
 * @param {'front'|'side'} which — selects colCellW1/colOffset1 vs colCellW2/colOffset2
 */
export async function stampName(chars, fontStr, targetSil, cellSize, which) {
  cellSize = cellSize || S.CELL;
  const fam = (fontStr === '__up__' && S.uploadedFontFamily) ? S.uploadedFontFamily : fontStr;
  try { await document.fonts.load(`bold 80px ${fam}`, chars.join('')); } catch (e) {}
  const BUF = Math.max(cellSize * 8, 512);
  const baseline = Math.round(BUF * BASELINE_FRAC);
  targetSil.fill(0);

  const colCellW = which === 'side' ? S.colCellW2 : S.colCellW1;
  const silIdx = which === 'side' ? silIndex2 : silIndex1;

  const cv = document.createElement('canvas');
  cv.width = cv.height = BUF;
  const ctx = canvas2dReadback(cv);

  for (let col = 0; col < S.nCols; col++) {
    const ch = chars[col] || S.padChar;
    const cw = colCellW[col];
    const chRow = S.rowCellH;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, BUF, BUF);
    let fs = Math.round(BUF * 0.7);
    ctx.font = `bold ${fs}px ${fam}`;
    const wm = ctx.measureText(ch).width;
    if (wm > BUF * 0.84) fs = Math.round(fs * BUF * 0.84 / wm);
    ctx.font = `bold ${fs}px ${fam}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(ch, BUF / 2, baseline);
    const px = ctx.getImageData(0, 0, BUF, BUF).data;
    const ink = inkBBoxRGBA(px, BUF, BUF);

    const inkW = Math.max(1, ink.maxX - ink.minX + 1);
    const inkH = Math.max(1, ink.maxY - ink.minY + 1);

    for (let lx = 0; lx < cw; lx++) {
      const bx0 = Math.max(0, Math.min(BUF - 1, Math.floor(ink.minX + (lx / cw) * inkW)));
      const bx1 = Math.max(0, Math.min(BUF - 1, Math.ceil(ink.minX + ((lx + 1) / cw) * inkW)));
      for (let z = 0; z < chRow; z++) {
        const yBot = ink.maxY - ((z + 1) / chRow) * inkH;
        const yTop = ink.maxY - (z / chRow) * inkH;
        const by0 = Math.max(0, Math.min(BUF - 1, Math.floor(Math.min(yBot, yTop))));
        const by1 = Math.max(0, Math.min(BUF - 1, Math.ceil(Math.max(yBot, yTop))));
        let sum = 0, cnt = 0;
        for (let by = by0; by < by1; by++) {
          for (let bx = bx0; bx < bx1; bx++) {
            sum += px[(by * BUF + bx) * 4];
            cnt++;
          }
        }
        targetSil[silIdx(col, lx, z)] = (cnt > 0 && sum / cnt > 60) ? 1 : 0;
      }
    }
  }
}
