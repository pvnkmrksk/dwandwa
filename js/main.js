import './three-globals.js';
import S from './state.js';
import {
  updCam,
  getCameraPose,
  setCameraPose,
  animateCameraPose,
} from './scene.js';
import { makeDrawer } from './editor.js';
import { wireUi } from './ui.js';
import { initStrutPainter, togglePaintMode, clearPins, undoPins } from './strut-painter.js';
import { applyLang, toggleLang, t } from './i18n.js';
import { applyTheme, toggleTheme } from './theme.js';
import { registerSW } from 'virtual:pwa-register';
import { startTutorial } from './tutorial.js';
import { prepareComposerFonts } from './fonts.js';
import {
  initGenerationRedrawers,
  armDeferredInitialGenerate,
} from './generate-pipeline.js';

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

initGenerationRedrawers(redraw1, redraw2);
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

(async () => {
  const bmsg = document.getElementById('bmsg');
  try {
    await prepareComposerFonts();
    bmsg.setAttribute('data-compose-hint', '1');
    bmsg.textContent = t('bmsg_compose');
    armDeferredInitialGenerate();
  } catch (e) {
    console.error(e);
    bmsg.removeAttribute('data-compose-hint');
    bmsg.textContent = 'Error: ' + (e && e.message ? e.message : String(e));
  }
})();
