import S from './state.js';
import {
  rebuildScene,
  updCam,
  scheduleUpdate,
} from './scene.js';
import { applyNames } from './text.js';
import { stampName } from './raster.js';
import { makeDrawer } from './editor.js';
import { wireUi } from './ui.js';

rebuildScene();
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

wireUi({ redraw1, redraw2 });

(async () => {
  applyNames('BUSY', 'FREE', 'sans-serif', 'sans-serif');
  await Promise.all([stampName(S.chars1, S.font1, S.sil1), stampName(S.chars2, S.font2, S.sil2)]);
  redraw1(); redraw2(); scheduleUpdate();
})();
