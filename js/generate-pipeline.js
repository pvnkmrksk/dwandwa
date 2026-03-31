import S from './state.js';
import { applyNames, syncWordInputFonts } from './text.js';
import { stampName } from './raster.js';
import { scheduleUpdate } from './scene.js';

const DEF1 = '\u0CAC\u0CC6\u0CB3\u0C95\u0CC1';
const DEF2 = '\u0CA8\u0CC6\u0CB0\u0CB3\u0CC1';
const DEBOUNCE_MS = 2600;
const FIRST_VISIT_DELAY_MS = 2000;
const SCROLL_THRESHOLD_PX = 14;

let redraw1Ref = null;
let redraw2Ref = null;

let hasRunOnce = false;
let initialArmed = true;
let visitTimer = null;
let visitScrollHandler = null;
let editDebounceTimer = null;

function clearVisitArms() {
  if (visitTimer != null) {
    clearTimeout(visitTimer);
    visitTimer = null;
  }
  if (visitScrollHandler) {
    window.removeEventListener('scroll', visitScrollHandler, { passive: true });
    visitScrollHandler = null;
  }
}

function clearEditDebounce() {
  if (editDebounceTimer != null) {
    clearTimeout(editDebounceTimer);
    editDebounceTimer = null;
  }
}

export function initGenerationRedrawers(redraw1, redraw2) {
  redraw1Ref = redraw1;
  redraw2Ref = redraw2;
}

/**
 * Full word → measure → stamp → mesh refresh. Uses current form values.
 */
export async function runGeneratePipeline({ statusMsg = 'Rendering glyphs\u2026' } = {}) {
  const bmsg = document.getElementById('bmsg');
  const r1 = (document.getElementById('name1')?.value || '').trim() || DEF1;
  const r2 = (document.getElementById('name2')?.value || '').trim() || DEF2;
  const f1 = document.getElementById('fnt1').value;
  const f2 = document.getElementById('fnt2').value;
  if (bmsg && statusMsg) bmsg.textContent = statusMsg;
  try {
    await applyNames(r1, r2, f1, f2);
    await Promise.all([
      stampName(S.chars1, S.font1, S.sil1, undefined, 'front'),
      stampName(S.chars2, S.font2, S.sil2, undefined, 'side'),
    ]);
    document.getElementById('bmsg')?.removeAttribute('data-compose-hint');
    redraw1Ref?.(true);
    redraw2Ref?.(true);
    scheduleUpdate();
    syncWordInputFonts();
  } catch (e) {
    console.error(e);
    if (bmsg) bmsg.textContent = 'Error: ' + (e && e.message ? e.message : String(e));
    throw e;
  } finally {
    if (bmsg && bmsg.textContent === statusMsg) bmsg.textContent = '';
  }
}

async function tryInitialGenerate() {
  if (!initialArmed) return;
  initialArmed = false;
  clearVisitArms();
  try {
    await runGeneratePipeline({ statusMsg: 'Rendering glyphs\u2026' });
    hasRunOnce = true;
  } catch {
    document.getElementById('bmsg')?.removeAttribute('data-compose-hint');
    hasRunOnce = false;
  }
}

/** First visit: auto-build after delay or when user scrolls. */
export function armDeferredInitialGenerate() {
  visitTimer = setTimeout(() => { tryInitialGenerate(); }, FIRST_VISIT_DELAY_MS);
  visitScrollHandler = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    if (y >= SCROLL_THRESHOLD_PX) tryInitialGenerate();
  };
  window.addEventListener('scroll', visitScrollHandler, { passive: true });
}

/** Generate button / Enter: cancel wait and build immediately. */
export async function generateNow() {
  initialArmed = false;
  clearVisitArms();
  clearEditDebounce();
  hasRunOnce = true;
  await runGeneratePipeline({ statusMsg: 'Rendering glyphs\u2026' });
}

/** After first preview, typing or font changes rebuild after a pause. */
export function scheduleAfterComposerEdit() {
  if (!hasRunOnce) return;
  clearEditDebounce();
  editDebounceTimer = setTimeout(async () => {
    editDebounceTimer = null;
    await runGeneratePipeline({ statusMsg: 'Updating\u2026' });
  }, DEBOUNCE_MS);
}

/** Variable column width / similar: always rebuild. */
export async function runGeneratePipelineWithStatus(msg) {
  await runGeneratePipeline({ statusMsg: msg });
}
