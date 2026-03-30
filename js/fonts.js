/**
 * Google Fonts: critical (Inter + Noto Sans Kannada) load from index.html.
 * Extended stack URL lives here — keep in sync with #fnt1 / #fnt2 <option> families.
 */
export const GOOGLE_FONTS_EXTENDED_STYLESHEET =
  'https://fonts.googleapis.com/css2?family=Noto+Serif+Kannada:wght@400;700&family=Anek+Kannada:wght@400;500;600;700&family=Akshar:wght@400;500;600;700&family=Tiro+Kannada&family=Baloo+Tamma+2:wght@400;600;700&family=Noto+Sans+Devanagari:wght@700&family=Noto+Nastaliq+Urdu:wght@700&family=Noto+Sans+Tamil:wght@700&family=Noto+Sans+Telugu:wght@700&family=Noto+Sans+Malayalam:wght@700&family=Noto+Sans+Bengali:wght@700&family=Noto+Sans+Gujarati:wght@700&display=swap';

const EXTENDED_LINK_ID = 'dw-gfonts-extended';

/** One grapheme per script we offer — warms @font-face cmap for raster bold weight. */
const FONT_WARM_SAMPLE =
  '\u0cac\u0cc6\u0cb3\u0c95\u0cc1 ' + // Kannada
  '\u0915 ' + // Devanagari
  '\u0b95 ' + // Tamil
  '\u0c95 ' + // Telugu
  '\u0d15 ' + // Malayalam
  '\u0995 ' + // Bengali
  '\u0a95 ' + // Gujarati
  '\u0628'; // Arabic (Urdu / Nastaliq)

function parsePrimaryFamily(cssFontValue) {
  const v = (cssFontValue || '').trim();
  if (!v || v === 'sans-serif' || v === 'serif' || v === '__up__') return null;
  const sq = v.match(/^'([^']+)'/);
  if (sq) return sq[1];
  const dq = v.match(/^"([^"]+)"/);
  if (dq) return dq[1];
  const first = v.split(',')[0].trim().replace(/^["']|["']$/g, '');
  return first || null;
}

export function collectComposerFontFamilies() {
  const out = [];
  const seen = new Set();
  for (const id of ['fnt1', 'fnt2']) {
    const sel = document.getElementById(id);
    if (!sel) continue;
    for (const opt of sel.querySelectorAll('option[value]')) {
      const fam = parsePrimaryFamily(opt.value);
      if (fam && !seen.has(fam)) {
        seen.add(fam);
        out.push(fam);
      }
    }
  }
  return out;
}

/**
 * Injects the extended stylesheet (non-blocking if called early).
 * Safe to call multiple times.
 */
export function loadExtendedGoogleFonts() {
  if (document.getElementById(EXTENDED_LINK_ID)) {
    return Promise.resolve();
  }
  return new Promise(resolve => {
    const l = document.createElement('link');
    l.id = EXTENDED_LINK_ID;
    l.rel = 'stylesheet';
    l.href = GOOGLE_FONTS_EXTENDED_STYLESHEET;
    l.onload = () => resolve();
    l.onerror = () => resolve();
    document.head.appendChild(l);
  });
}

/**
 * Warm UI + composer faces so first Generate hits disk cache / ready glyphs.
 */
export async function prepareComposerFonts() {
  await loadExtendedGoogleFonts();
  try {
    await document.fonts.ready;
  } catch (e) { /* ignore */ }
  try {
    await document.fonts.load('500 14px Inter');
    await document.fonts.load('600 22px "Noto Sans Kannada"');
  } catch (e) { /* ignore */ }

  const families = collectComposerFontFamilies();
  await Promise.all(
    families.map(fam =>
      document.fonts.load(`bold 80px "${fam}", sans-serif`, FONT_WARM_SAMPLE).catch(() => {}),
    ),
  );
}
