import S, { allocArrays } from './state.js';
import { rebuildScene } from './scene.js';
import { updateCanvasSize } from './layout.js';

// Virama/halant characters for Indic scripts that join consonants
const VIRAMAS = new Set([
  '\u094D', // Devanagari
  '\u09CD', // Bengali
  '\u0A4D', // Gurmukhi
  '\u0ACD', // Gujarati
  '\u0B4D', // Oriya
  '\u0BCD', // Tamil
  '\u0C4D', // Telugu
  '\u0CCD', // Kannada
  '\u0D4D', // Malayalam
  '\u0DCA', // Sinhala
]);

function endsWithVirama(s) {
  for (let i = s.length - 1; i >= 0; i--) {
    if (VIRAMAS.has(s[i])) return true;
    // Skip combining marks to find the virama
    const cp = s.charCodeAt(i);
    if (cp >= 0x0300 && cp <= 0x036F) continue; // combining diacriticals
    if (cp >= 0x0900 && cp <= 0x0DFF) {
      // In Indic range — check if it's a combining mark (Mn category)
      // Viramas are specific, non-virama combining marks don't count
      return false;
    }
    return false;
  }
  return false;
}

export function splitGraphemes(s) {
  let segs;
  try { segs = [...new Intl.Segmenter().segment(s)].map(x => x.segment); }
  catch(e) { segs = [...s]; }

  // Merge segments where one ends with virama (halant) — browser segmenter
  // sometimes splits consonant clusters like ದ್ + ವ instead of keeping ದ್ವ
  const merged = [];
  for (let i = 0; i < segs.length; i++) {
    if (merged.length > 0 && endsWithVirama(merged[merged.length - 1])) {
      merged[merged.length - 1] += segs[i];
    } else {
      merged.push(segs[i]);
    }
  }
  return merged;
}

function padded(g1, g2, pad) {
  const len = Math.max(g1.length, g2.length, 1);
  const p1 = [...g1], p2 = [...g2];
  while (p1.length < len) p1.push(pad);
  while (p2.length < len) p2.unshift(pad);
  return { p1, p2, len };
}

export function updatePreview() {
  const raw1 = document.getElementById('name1').value || 'BUSY';
  const raw2 = document.getElementById('name2').value || 'FREE';
  const g1 = splitGraphemes(raw1.trim()).slice(0, 8);
  const g2 = splitGraphemes(raw2.trim()).slice(0, 8);
  const { p1, p2 } = padded(g1, g2, S.padChar);
  const padHtml = (chars, origGraphemes) =>
    chars.map((c, i) => `<span class="${i < origGraphemes.length ? 'pc' : 'pp'}">${c}</span>`).join('');
  document.getElementById('padPreview').innerHTML =
    padHtml(p1, g1) + ' &middot; ' + padHtml(p2, g2);
}

export function applyNames(raw1, raw2, f1, f2) {
  const g1 = splitGraphemes(raw1.trim()).slice(0, 8);
  const g2 = splitGraphemes(raw2.trim()).slice(0, 8);
  const { p1, p2, len } = padded(g1, g2, S.padChar);
  S.font1 = f1; S.font2 = f2; S.nCols = len; S.chars1 = p1; S.chars2 = p2;
  const padHtml = (chars, origGraphemes) =>
    chars.map((c, i) => `<span class="${i < origGraphemes.length ? 'pc' : 'pp'}">${c}</span>`).join('');
  document.getElementById('padPreview').innerHTML =
    padHtml(S.chars1, g1) + ' &middot; ' + padHtml(S.chars2, g2);
  document.getElementById('modCount').textContent = S.nCols;
  allocArrays();
  updateCanvasSize();
  rebuildScene();
}
