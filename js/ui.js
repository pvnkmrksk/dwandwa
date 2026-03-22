import S, { allocArrays } from './state.js';
import { applyNames, updatePreview } from './text.js';
import { stampName } from './raster.js';
import {
  scheduleUpdate,
  setCameraFront,
  setCameraSide,
  setCameraIso,
  toggleSpin,
} from './scene.js';
import { exportSTL } from './export-stl.js';

export function wireUi({ redraw1, redraw2 }) {
  const bmsg = document.getElementById('bmsg');

  document.getElementById('generateBtn').addEventListener('click', async function() {
    const r1 = document.getElementById('name1').value || 'BUSY';
    const r2 = document.getElementById('name2').value || 'FREE';
    applyNames(r1, r2, document.getElementById('fnt1').value, document.getElementById('fnt2').value);
    bmsg.textContent = 'Rendering glyphs\u2026';
    await Promise.all([stampName(S.chars1, S.font1, S.sil1), stampName(S.chars2, S.font2, S.sil2)]);
    redraw1(); redraw2(); scheduleUpdate();
  });

  // Live preview update as user types
  ['name1', 'name2'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => updatePreview());
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('generateBtn').click();
    });
  });

  document.getElementById('applyEdits').addEventListener('click', () => scheduleUpdate());

  document.getElementById('fontFile').addEventListener('change', async function() {
    const file = this.files[0]; if (!file) return;
    try {
      const name = 'CF_' + Date.now();
      const face = new FontFace(name, await file.arrayBuffer());
      await face.load(); document.fonts.add(face);
      S.uploadedFontFamily = name;
      document.getElementById('uploadedFontName').textContent = file.name;
      ['f1up', 'f2up'].forEach(id => {
        const o = document.getElementById(id);
        o.textContent = file.name; o.value = '__up__'; o.disabled = false;
      });
      document.getElementById('fnt1').value = '__up__';
      document.getElementById('fnt2').value = '__up__';
    } catch(e) {
      document.getElementById('uploadedFontName').textContent = 'Error: ' + e.message;
    }
  });

  document.getElementById('resSlider').addEventListener('input', async function() {
    S.CELL = parseInt(this.value);
    document.getElementById('resVal').textContent = S.CELL;
    const r1 = document.getElementById('name1').value;
    const r2 = document.getElementById('name2').value;
    applyNames(r1 || 'BUSY', r2 || 'FREE', document.getElementById('fnt1').value, document.getElementById('fnt2').value);
    await Promise.all([stampName(S.chars1, S.font1, S.sil1), stampName(S.chars2, S.font2, S.sil2)]);
    redraw1(); redraw2(); scheduleUpdate();
  });

  document.querySelectorAll('.pad-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pad-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.padChar = btn.dataset.pad;
      document.getElementById('padCustom').value = '';
      updatePreview();
    });
  });
  document.getElementById('padCustom').addEventListener('input', function() {
    if (this.value) {
      S.padChar = this.value;
      document.querySelectorAll('.pad-opt').forEach(b => b.classList.remove('active'));
      updatePreview();
    }
  });

  document.getElementById('exportBtn').addEventListener('click', () => exportSTL());

  document.getElementById('sf').onclick = () => setCameraFront();
  document.getElementById('ss').onclick = () => setCameraSide();
  document.getElementById('si').onclick = () => setCameraIso();
  document.getElementById('ar').onclick = () => toggleSpin();
}
