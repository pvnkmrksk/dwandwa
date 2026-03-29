import S, { silColumnIndex } from './state.js';

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
  return {
    minX, minY, maxX, maxY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

/**
 * Measure per-column cell widths and row height from both words’ glyph bboxes,
 * then set S.colCellW and S.rowCellH (call before allocArrays).
 */
export async function measureColumnCells(chars1, chars2, font1, font2, cellMax) {
  cellMax = cellMax || S.CELL;
  const fam1 = (font1 === '__up__' && S.uploadedFontFamily) ? S.uploadedFontFamily : font1;
  const fam2 = (font2 === '__up__' && S.uploadedFontFamily) ? S.uploadedFontFamily : font2;
  try { await document.fonts.load(`bold 80px ${fam1}`, chars1.join('')); } catch (e) {}
  try { await document.fonts.load(`bold 80px ${fam2}`, chars2.join('')); } catch (e) {}

  const BUF = Math.max(cellMax * 8, 512);
  const baseline = Math.round(BUF * BASELINE_FRAC);
  const colW = new Int32Array(S.nCols);
  const colH = new Int32Array(S.nCols);

  const cv = document.createElement('canvas');
  cv.width = cv.height = BUF;

  if (S.uniformColumns) {
    const minC = 8;
    let rowH = minC;
    for (let col = 0; col < S.nCols; col++) {
      const ch1 = chars1[col] || S.padChar;
      const ch2 = chars2[col] || S.padChar;
      let maxTh = 1;
      for (const { ch, fam } of [{ ch: ch1, fam: fam1 }, { ch: ch2, fam: fam2 }]) {
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
        const b = inkBBoxRGBA(px, BUF, BUF);
        if (b.w * b.h > 1) {
          if (b.h > maxTh) maxTh = b.h;
        }
      }
      const ch = Math.min(cellMax, Math.max(minC, Math.ceil(maxTh * cellMax / BUF)));
      if (ch > rowH) rowH = ch;
      colW[col] = cellMax;
    }
    S.colCellW = colW;
    S.rowCellH = rowH;
    return;
  }

  for (let col = 0; col < S.nCols; col++) {
    const ch1 = chars1[col] || S.padChar;
    const ch2 = chars2[col] || S.padChar;
    let maxTw = 1, maxTh = 1;

    for (const { ch, fam } of [{ ch: ch1, fam: fam1 }, { ch: ch2, fam: fam2 }]) {
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
      const b = inkBBoxRGBA(px, BUF, BUF);
      if (b.w * b.h > 1) {
        if (b.w > maxTw) maxTw = b.w;
        if (b.h > maxTh) maxTh = b.h;
      }
    }

    // Cell counts so bbox fits when downsampled (same rule as stampName)
    const minC = 8;
    const cw = Math.min(cellMax, Math.max(minC, Math.ceil(maxTw * cellMax / BUF)));
    const ch = Math.min(cellMax, Math.max(minC, Math.ceil(maxTh * cellMax / BUF)));
    colW[col] = cw;
    colH[col] = ch;
  }

  let rowH = 8;
  for (let i = 0; i < S.nCols; i++) {
    if (colH[i] > rowH) rowH = colH[i];
  }
  S.colCellW = colW;
  S.rowCellH = rowH;
}

export async function stampName(chars, fontStr, targetSil, cellSize) {
  cellSize = cellSize || S.CELL;
  const fam = (fontStr === '__up__' && S.uploadedFontFamily) ? S.uploadedFontFamily : fontStr;
  try { await document.fonts.load(`bold 80px ${fam}`, chars.join('')); } catch (e) {}
  const BUF = Math.max(cellSize * 8, 512);
  const baseline = Math.round(BUF * BASELINE_FRAC);
  targetSil.fill(0);

  const cv = document.createElement('canvas');
  cv.width = cv.height = BUF;
  const ctx = canvas2dReadback(cv);

  for (let col = 0; col < S.nCols; col++) {
    const ch = chars[col] || S.padChar;
    const cw = S.colCellW[col];
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

    const spanX = Math.max(1, ink.maxX - ink.minX + 1);
    const spanY = Math.max(1, ink.maxY - ink.minY + 1);
    const x0 = ink.minX;

    for (let lx = 0; lx < cw; lx++) {
      const bx0 = Math.max(0, Math.min(BUF - 1, Math.floor(x0 + (lx / cw) * spanX)));
      const bx1 = Math.max(0, Math.min(BUF - 1, Math.ceil(x0 + ((lx + 1) / cw) * spanX)));
      for (let z = 0; z < chRow; z++) {
        // z=0 = bottom of cell = glyph descender / lowest ink (large BUF y)
        const yBot = ink.maxY - ((z + 1) / chRow) * spanY;
        const yTop = ink.maxY - (z / chRow) * spanY;
        const by0 = Math.max(0, Math.min(BUF - 1, Math.floor(Math.min(yBot, yTop))));
        const by1 = Math.max(0, Math.min(BUF - 1, Math.ceil(Math.max(yBot, yTop))));
        let sum = 0, cnt = 0;
        for (let by = by0; by < by1; by++) {
          for (let bx = bx0; bx < bx1; bx++) {
            sum += px[(by * BUF + bx) * 4];
            cnt++;
          }
        }
        const idx = silColumnIndex(col, lx, z);
        targetSil[idx] = (cnt > 0 && sum / cnt > 60) ? 1 : 0;
      }
    }
  }
}
