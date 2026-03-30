import './three-globals.js';
import S from './state.js';
import {
  updCam,
  scheduleUpdate,
  getCameraPose,
  setCameraPose,
  animateCameraPose,
} from './scene.js';
import { applyNames } from './text.js';
import { measureColumnCells, stampName } from './raster.js';
import { makeDrawer } from './editor.js';
import { wireUi } from './ui.js';
import { initStrutPainter, togglePaintMode, clearPins, undoPins } from './strut-painter.js';
import { applyLang, toggleLang } from './i18n.js';
import { applyTheme, toggleTheme } from './theme.js';
import { registerSW } from 'virtual:pwa-register';
import { startTutorial } from './tutorial.js';
import { prepareComposerFonts } from './fonts.js';

registerSW({ immediate: true });

if (new URLSearchParams(location.search).has('debug')) {
  document.getElementById('camDebug')?.removeAttribute('hidden');
  document.getElementById('camDebugHint')?.removeAttribute('hidden');
}

window.dwandwaCamera = {
  getPose: () => getCameraPose(),
  setPose: pose => {
    if (pose == null || pose.theta == null) return;
    const ph = pose.phi != null ? pose.phi : getCameraPose().phi;
    setCameraPose(pose.theta, ph, { stopSpin: pose.stopSpin !== false });
  },
  animate: (from, to, ms = 1400) => {
    const a = from || getCameraPose();
    const b = typeof to === 'string' ? JSON.parse(to) : to;
    animateCameraPose(
      { theta: a.theta, phi: a.phi },
      { theta: b.theta, phi: b.phi != null ? b.phi : a.phi },
      ms,
    );
  },
};

updCam();
applyLang();
applyTheme();

const redraw1 = makeDrawer({
  id: 'c1',
  getSil: () => S.sil1,
  ink: 'rgba(48,143,240,.9)',
  erId: 'er1',
  clId: 'cl1',
  fiId: 'fi1',
  brId: 'br1',
  feathId: 'feath1',
  which: 'front',
});
const redraw2 = makeDrawer({
  id: 'c2',
  getSil: () => S.sil2,
  ink: 'rgba(239,161,48,.9)',
  erId: 'er2',
  clId: 'cl2',
  fiId: 'fi2',
  brId: 'br2',
  feathId: 'feath2',
  which: 'side',
});

wireUi({ redraw1, redraw2 });

initStrutPainter();
document.getElementById('paintStruts').addEventListener('click', togglePaintMode);
document.getElementById('undoPins').addEventListener('click', undoPins);
document.getElementById('clearPins').addEventListener('click', clearPins);
document.getElementById('langFlipBtn').addEventListener('click', toggleLang);
document.getElementById('themeToggle').addEventListener('click', toggleTheme);

const helpTourBtn = document.getElementById('helpTourBtn');
if (helpTourBtn) {
  helpTourBtn.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    startTutorial();
  });
}

// Auto-generate from whatever's in the form (URL params or defaults)
(async () => {
  const bmsg = document.getElementById('bmsg');
  bmsg.textContent = 'Loading\u2026';
  try {
    await prepareComposerFonts();
    const r1 = document.getElementById('name1').value || '\u0CAC\u0CC6\u0CB3\u0C95\u0CC1';
    const r2 = document.getElementById('name2').value || '\u0CA8\u0CC6\u0CB0\u0CB3\u0CC1';
    const f1 = document.getElementById('fnt1').value;
    const f2 = document.getElementById('fnt2').value;
    await applyNames(r1, r2, f1, f2);
    bmsg.textContent = 'Rendering glyphs\u2026';
    await Promise.all([
      stampName(S.chars1, S.font1, S.sil1, undefined, 'front'),
      stampName(S.chars2, S.font2, S.sil2, undefined, 'side'),
    ]);
    bmsg.textContent = '';
    redraw1(); redraw2(); scheduleUpdate();
  } catch (e) {
    console.error(e);
    bmsg.textContent = 'Error: ' + (e && e.message ? e.message : String(e));
  }
})();
