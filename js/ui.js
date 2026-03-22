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

// ── URL state ──
function stateToUrl() {
  const p = new URLSearchParams();
  const n1 = document.getElementById('name1').value;
  const n2 = document.getElementById('name2').value;
  if (n1 && n1 !== 'BUSY') p.set('f', n1);
  if (n2 && n2 !== 'FREE') p.set('s', n2);
  const f1 = document.getElementById('fnt1').value;
  const f2 = document.getElementById('fnt2').value;
  if (f1 !== 'sans-serif') p.set('ff', f1);
  if (f2 !== 'sans-serif') p.set('sf', f2);
  if (S.padChar !== '\u2665') p.set('pad', S.padChar);
  const plat = document.getElementById('platformOn').checked;
  if (!plat) p.set('plat', '0');
  const pp = document.getElementById('platPad').value;
  const pf = document.getElementById('platFillet').value;
  if (pp !== '10') p.set('pp', pp);
  if (pf !== '4') p.set('pf', pf);
  if (S.CELL !== 64) p.set('res', S.CELL);
  const qs = p.toString();
  const url = window.location.pathname + (qs ? '?' + qs : '');
  history.replaceState(null, '', url);
}

function loadFromUrl() {
  const p = new URLSearchParams(window.location.search);
  if (p.has('f')) document.getElementById('name1').value = p.get('f');
  if (p.has('s')) document.getElementById('name2').value = p.get('s');
  if (p.has('ff')) document.getElementById('fnt1').value = p.get('ff');
  if (p.has('sf')) document.getElementById('fnt2').value = p.get('sf');
  if (p.has('pad')) {
    S.padChar = p.get('pad');
    document.querySelectorAll('.pad-opt').forEach(b => {
      b.classList.toggle('active', b.dataset.pad === S.padChar);
    });
  }
  if (p.has('plat')) {
    document.getElementById('platformOn').checked = p.get('plat') !== '0';
  }
  if (p.has('pp')) document.getElementById('platPad').value = p.get('pp');
  if (p.has('pf')) document.getElementById('platFillet').value = p.get('pf');
  if (p.has('res')) {
    S.CELL = parseInt(p.get('res'));
    document.getElementById('resSlider').value = S.CELL;
    document.getElementById('resVal').textContent = S.CELL;
  }
}

let urlTimer = null;
function debouncedUrlUpdate() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(stateToUrl, 300);
}

export function wireUi({ redraw1, redraw2 }) {
  const bmsg = document.getElementById('bmsg');

  // Load state from URL on startup
  loadFromUrl();

  document.getElementById('generateBtn').addEventListener('click', async function() {
    const r1 = document.getElementById('name1').value || 'BUSY';
    const r2 = document.getElementById('name2').value || 'FREE';
    applyNames(r1, r2, document.getElementById('fnt1').value, document.getElementById('fnt2').value);
    bmsg.textContent = 'Rendering glyphs\u2026';
    await Promise.all([stampName(S.chars1, S.font1, S.sil1), stampName(S.chars2, S.font2, S.sil2)]);
    redraw1(); redraw2(); scheduleUpdate();
    debouncedUrlUpdate();
  });

  // Live preview update as user types
  ['name1', 'name2'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => { updatePreview(); debouncedUrlUpdate(); });
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

  ['fnt1', 'fnt2'].forEach(id => {
    document.getElementById(id).addEventListener('change', debouncedUrlUpdate);
  });

  document.getElementById('resSlider').addEventListener('input', async function() {
    S.CELL = parseInt(this.value);
    document.getElementById('resVal').textContent = S.CELL;
    const r1 = document.getElementById('name1').value;
    const r2 = document.getElementById('name2').value;
    applyNames(r1 || 'BUSY', r2 || 'FREE', document.getElementById('fnt1').value, document.getElementById('fnt2').value);
    await Promise.all([stampName(S.chars1, S.font1, S.sil1), stampName(S.chars2, S.font2, S.sil2)]);
    redraw1(); redraw2(); scheduleUpdate();
    debouncedUrlUpdate();
  });

  document.querySelectorAll('.pad-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pad-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      S.padChar = btn.dataset.pad;
      document.getElementById('padCustom').value = '';
      updatePreview();
      debouncedUrlUpdate();
    });
  });
  document.getElementById('padCustom').addEventListener('input', function() {
    if (this.value) {
      S.padChar = this.value;
      document.querySelectorAll('.pad-opt').forEach(b => b.classList.remove('active'));
      updatePreview();
      debouncedUrlUpdate();
    }
  });

  // Platform controls trigger URL update
  ['platformOn'].forEach(id => document.getElementById(id).addEventListener('change', debouncedUrlUpdate));
  ['platPad', 'platFillet'].forEach(id => document.getElementById(id).addEventListener('input', debouncedUrlUpdate));

  document.getElementById('exportBtn').addEventListener('click', () => exportSTL());

  document.getElementById('sf').onclick = () => setCameraFront();
  document.getElementById('ss').onclick = () => setCameraSide();
  document.getElementById('si').onclick = () => setCameraIso();
  document.getElementById('ar').onclick = () => toggleSpin();
}
