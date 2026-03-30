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

/** One bold px size for the whole word so no glyph is scaled down individually. */
function resolveBoldFontSize(ctx, BUF, fam, chars) {
  const fs0 = Math.round(BUF * 0.7);
  let factor = 1;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] || S.padChar;
    ctx.font = `bold ${fs0}px ${fam}`;
    const wm = ctx.measureText(ch).width;
    if (wm > BUF * 0.84) {
      const f = (BUF * 0.84) / wm;
      if (f < factor) factor = f;
    }
  }
  return Math.max(8, Math.round(fs0 * factor));
}

function measureGlyph(ctx, BUF, baseline, ch, fam, fs) {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, BUF, BUF);
  ctx.font = `bold ${fs}px ${fam}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(ch, BUF / 2, baseline);
  const px = ctx.getImageData(0, 0, BUF, BUF).data;
  return inkBBoxRGBA(px, BUF, BUF);
}

/** Union of ink tops/bottoms for every grapheme at the same baseline (shared line height). */
function measureWordVerticalSpan(ctx, BUF, baseline, fam, fs, chars) {
  let gTop = BUF;
  let gBot = 0;
  let any = false;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] || S.padChar;
    const b = measureGlyph(ctx, BUF, baseline, ch, fam, fs);
    if (b.w * b.h <= 1) continue;
    any = true;
    if (b.minY < gTop) gTop = b.minY;
    if (b.maxY > gBot) gBot = b.maxY;
  }
  if (!any) return null;
  return { gTop, gBot };
}

function rowCellsForWordSpan(gTop, gBot, BUF, cellMax, minC) {
  const px = Math.max(1, gBot - gTop + 1);
  return Math.min(cellMax, Math.max(minC, Math.ceil(px * cellMax / BUF)));
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
  const ctx = canvas2dReadback(cv);
  const fs1 = resolveBoldFontSize(ctx, BUF, fam1, chars1);
  const fs2 = resolveBoldFontSize(ctx, BUF, fam2, chars2);

  const vspan1 = measureWordVerticalSpan(ctx, BUF, baseline, fam1, fs1, chars1);
  const vspan2 = measureWordVerticalSpan(ctx, BUF, baseline, fam2, fs2, chars2);
  const rowH = Math.max(
    vspan1 ? rowCellsForWordSpan(vspan1.gTop, vspan1.gBot, BUF, cellMax, minC) : minC,
    vspan2 ? rowCellsForWordSpan(vspan2.gTop, vspan2.gBot, BUF, cellMax, minC) : minC,
  );

  const colW1 = new Int32Array(S.nCols);
  const colW2 = new Int32Array(S.nCols);

  if (S.uniformColumns) {
    for (let col = 0; col < S.nCols; col++) {
      colW1[col] = cellMax;
      colW2[col] = cellMax;
    }
    S.colCellW1 = colW1;
    S.colCellW2 = colW2;
    S.rowCellH = rowH;
    return;
  }

  for (let col = 0; col < S.nCols; col++) {
    const b1 = measureGlyph(ctx, BUF, baseline, chars1[col] || S.padChar, fam1, fs1);
    const b2 = measureGlyph(ctx, BUF, baseline, chars2[col] || S.padChar, fam2, fs2);

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
  const fs = resolveBoldFontSize(ctx, BUF, fam, chars);
  const vSpan = measureWordVerticalSpan(ctx, BUF, baseline, fam, fs, chars);

  for (let col = 0; col < S.nCols; col++) {
    const ch = chars[col] || S.padChar;
    const cw = colCellW[col];
    const chRow = S.rowCellH;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, BUF, BUF);
    ctx.font = `bold ${fs}px ${fam}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(ch, BUF / 2, baseline);
    const px = ctx.getImageData(0, 0, BUF, BUF).data;
    const ink = inkBBoxRGBA(px, BUF, BUF);

    const inkW = Math.max(1, ink.maxX - ink.minX + 1);
    const yTop = vSpan ? vSpan.gTop : ink.minY;
    const yBot = vSpan ? vSpan.gBot : ink.maxY;
    const spanY = Math.max(1, yBot - yTop + 1);

    for (let lx = 0; lx < cw; lx++) {
      const bx0 = Math.max(0, Math.min(BUF - 1, Math.floor(ink.minX + (lx / cw) * inkW)));
      const bx1 = Math.max(0, Math.min(BUF - 1, Math.ceil(ink.minX + ((lx + 1) / cw) * inkW)));
      for (let z = 0; z < chRow; z++) {
        const yBotZ = yBot - ((z + 1) / chRow) * spanY;
        const yTopZ = yBot - (z / chRow) * spanY;
        const by0 = Math.max(0, Math.min(BUF - 1, Math.floor(Math.min(yBotZ, yTopZ))));
        const by1 = Math.max(0, Math.min(BUF - 1, Math.ceil(Math.max(yBotZ, yTopZ))));
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
