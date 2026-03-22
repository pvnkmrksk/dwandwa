import {
  sil1,
  sil2,
  chars1,
  chars2,
  font1,
  font2,
} from './state.js';
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
  getSil: () => sil1,
  ink: 'rgba(240,150,40,.9)',
  erId: 'er1',
  clId: 'cl1',
  fiId: 'fi1',
  brId: 'br1',
});
const redraw2 = makeDrawer({
  id: 'c2',
  getSil: () => sil2,
  ink: 'rgba(40,160,240,.9)',
  erId: 'er2',
  clId: 'cl2',
  fiId: 'fi2',
  brId: 'br2',
});

wireUi({ redraw1, redraw2 });

(async () => {
  applyNames('BUSY', 'FREE', 'sans-serif', 'sans-serif');
  await Promise.all([stampName(chars1, font1, sil1), stampName(chars2, font2, sil2)]);
  redraw1(); redraw2(); scheduleUpdate();
})();
