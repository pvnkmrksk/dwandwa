import {
  nCols,
  chars1,
  chars2,
  font1,
  font2,
  padChar,
  allocArrays,
} from './state.js';
import { rebuildScene } from './scene.js';
import { updateCanvasSize } from './layout.js';

export function splitGraphemes(s) {
  try { return [...new Intl.Segmenter().segment(s)].map(x => x.segment); }
  catch(e) { return [...s]; }
}

function padded(g1, g2, pad) {
  const len = Math.max(g1.length, g2.length, 1);
  const p1 = [...g1], p2 = [...g2];
  while (p1.length < len) p1.push(pad);
  while (p2.length < len) p2.unshift(pad);
  return { p1, p2, len };
}

export function applyNames(raw1, raw2, f1, f2) {
  const g1 = splitGraphemes(raw1.trim()).slice(0, 8);
  const g2 = splitGraphemes(raw2.trim()).slice(0, 8);
  const { p1, p2, len } = padded(g1, g2, padChar);
  font1 = f1; font2 = f2; nCols = len; chars1 = p1; chars2 = p2;
  const padHtml = (pad, rg) =>
    pad.map((c, i) => `<span class="${i < rg.length ? 'pc' : 'pp'}">${c}</span>`).join('');
  document.getElementById('padPreview').innerHTML =
    padHtml(chars1, g1) + ' &middot; ' + padHtml(chars2, g2);
  document.getElementById('modCount').textContent = nCols;
  allocArrays();
  updateCanvasSize();
  rebuildScene();
}
