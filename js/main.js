import S from './state.js';
import {
  updCam,
  scheduleUpdate,
} from './scene.js';
import { applyNames } from './text.js';
import { stampName } from './raster.js';
import { makeDrawer } from './editor.js';
import { wireUi } from './ui.js';

updCam();

const redraw1 = makeDrawer({
  id: 'c1',
  getSil: () => S.sil1,
  ink: 'rgba(240,150,40,.9)',
  erId: 'er1',
  clId: 'cl1',
  fiId: 'fi1',
  brId: 'br1',
  feathId: 'feath1',
});
const redraw2 = makeDrawer({
  id: 'c2',
  getSil: () => S.sil2,
  ink: 'rgba(40,160,240,.9)',
  erId: 'er2',
  clId: 'cl2',
  fiId: 'fi2',
  brId: 'br2',
  feathId: 'feath2',
});

// wireUi loads URL params into form fields first
wireUi({ redraw1, redraw2 });

// Auto-generate from whatever's in the form (URL params or defaults)
(async () => {
  const r1 = document.getElementById('name1').value || 'BUSY';
  const r2 = document.getElementById('name2').value || 'FREE';
  const f1 = document.getElementById('fnt1').value;
  const f2 = document.getElementById('fnt2').value;
  applyNames(r1, r2, f1, f2);
  await Promise.all([stampName(S.chars1, S.font1, S.sil1), stampName(S.chars2, S.font2, S.sil2)]);
  redraw1(); redraw2(); scheduleUpdate();
})();
