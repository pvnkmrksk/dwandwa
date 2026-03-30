import S, { allocArrays } from './state.js';
import { applyNames, updatePreview, syncWordInputFonts } from './text.js';
import { stampName } from './raster.js';
import {
  scheduleUpdate,
  setCameraFront,
  setCameraSide,
  setCameraLeft,
  setCameraRight,
  toggleSpin,
  setLetterGap,
  updateStructureUI,
} from './scene.js';
import { exportSTL } from './export-stl.js';
import { rescalePins } from './strut-painter.js';

function defaultRasterCell() {
  return window.innerWidth >= 1024 ? 128 : 48;
}

function syncPadSelectFromState() {
  const sel = document.getElementById('padSelect');
  const wrap = document.getElementById('padCustomWrap');
  const custom = document.getElementById('padCustom');
  if (!sel || !wrap || !custom) return;
  let found = false;
  for (let i = 0; i < sel.options.length; i++) {
    const v = sel.options[i].value;
    if (v !== '__custom__' && v === S.padChar) {
      sel.value = v;
      found = true;
      break;
    }
  }
  if (!found) {
    sel.value = '__custom__';
    custom.value = S.padChar;
    wrap.hidden = false;
  } else {
    wrap.hidden = true;
    custom.value = '';
  }
}

// ── URL state ──
function stateToUrl() {
  const p = new URLSearchParams();
  const n1 = document.getElementById('name1').value;
  const n2 = document.getElementById('name2').value;
  if (n1 && n1 !== 'ಬೆಳಕು') p.set('f', n1);
  if (n2 && n2 !== 'ನೆರಳು') p.set('s', n2);
  const f1 = document.getElementById('fnt1').value;
  const f2 = document.getElementById('fnt2').value;
  if (f1 !== 'sans-serif') p.set('ff', f1);
  if (f2 !== 'sans-serif') p.set('sf', f2);
  if (S.padChar !== '\u2665') p.set('pad', S.padChar);
  const baseOn = document.getElementById('baseOn').checked;
  const backOn = document.getElementById('backOn').checked;
  if (!baseOn) p.set('base', '0');
  if (!backOn) p.set('back', '0');
  const lg = document.getElementById('letterGap').value;
  if (lg !== '30') p.set('lg', lg);
  if (S.CELL !== defaultRasterCell()) p.set('res', S.CELL);
  const vcw = document.getElementById('variableColWidth');
  if (vcw && vcw.checked) p.set('var', '1');
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
  }
  if (p.has('base')) document.getElementById('baseOn').checked = p.get('base') !== '0';
  if (p.has('back')) document.getElementById('backOn').checked = p.get('back') !== '0';
  if (p.has('lg')) document.getElementById('letterGap').value = p.get('lg');
  if (p.has('res')) {
    S.CELL = parseInt(p.get('res'));
  } else {
    S.CELL = defaultRasterCell();
  }
  document.getElementById('resSlider').value = S.CELL;
  document.getElementById('resVal').textContent = S.CELL;
  if (p.has('var')) {
    const el = document.getElementById('variableColWidth');
    if (el) el.checked = p.get('var') === '1';
  }
}

function syncUniformColumns() {
  const el = document.getElementById('variableColWidth');
  S.uniformColumns = !(el && el.checked);
}

let urlTimer = null;
function debouncedUrlUpdate() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(stateToUrl, 300);
}

export function wireUi({ redraw1, redraw2 }) {
  const bmsg = document.getElementById('bmsg');

  loadFromUrl();
  syncPadSelectFromState();
  syncWordInputFonts();
  syncUniformColumns();

  // Letter gap
  const lgSlider = document.getElementById('letterGap');
  if (lgSlider) {
    setLetterGap(parseInt(lgSlider.value));
    lgSlider.addEventListener('input', function() {
      setLetterGap(parseInt(this.value));
      debouncedUrlUpdate();
      scheduleUpdate();
    });
  }

  // Fine-tuning overlap value labels
  const baseOverlapSlider = document.getElementById('baseOverlap');
  const backOverlapSlider = document.getElementById('backOverlap');
  function fmtOverlapPct(v) {
    const n = parseInt(v, 10);
    return (n >= 0 ? '+' : '') + n + '%';
  }
  if (baseOverlapSlider) {
    baseOverlapSlider.addEventListener('input', () => {
      const el = document.getElementById('baseOverlapVal');
      if (el) el.textContent = fmtOverlapPct(baseOverlapSlider.value);
    });
  }
  if (backOverlapSlider) {
    backOverlapSlider.addEventListener('input', () => {
      const el = document.getElementById('backOverlapVal');
      if (el) el.textContent = fmtOverlapPct(backOverlapSlider.value);
    });
  }

  const variableColEl = document.getElementById('variableColWidth');
  if (variableColEl) {
    variableColEl.addEventListener('change', async () => {
      syncUniformColumns();
      const r1 = document.getElementById('name1').value || 'ಬೆಳಕು';
      const r2 = document.getElementById('name2').value || 'ನೆರಳು';
      bmsg.textContent = 'Recomputing layout\u2026';
      await applyNames(r1, r2, document.getElementById('fnt1').value, document.getElementById('fnt2').value);
      await Promise.all([
        stampName(S.chars1, S.font1, S.sil1, undefined, 'front'),
        stampName(S.chars2, S.font2, S.sil2, undefined, 'side'),
      ]);
      redraw1(); redraw2(); scheduleUpdate();
      debouncedUrlUpdate();
      bmsg.textContent = '';
    });
  }

  ['alignBack', 'equalGap', 'backStrut'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      updateStructureUI();
      if (id !== 'backStrut') scheduleUpdate();
    });
  });

  // Structure toggles trigger URL update
  ['baseOn', 'backOn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { updateStructureUI(); debouncedUrlUpdate(); });
  });
  ['basePadX', 'basePadZ', 'plateThick', 'baseFillet', 'baseOverlap', 'backPad', 'backOverlap', 'strutThick'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', debouncedUrlUpdate);
  });

  document.getElementById('generateBtn').addEventListener('click', async function() {
    const r1 = document.getElementById('name1').value || 'ಬೆಳಕು';
    const r2 = document.getElementById('name2').value || 'ನೆರಳು';
    await applyNames(r1, r2, document.getElementById('fnt1').value, document.getElementById('fnt2').value);
    bmsg.textContent = 'Rendering glyphs\u2026';
    await Promise.all([
      stampName(S.chars1, S.font1, S.sil1, undefined, 'front'),
      stampName(S.chars2, S.font2, S.sil2, undefined, 'side'),
    ]);
    redraw1(); redraw2(); scheduleUpdate();
    debouncedUrlUpdate();
  });

  ['name1', 'name2'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => { updatePreview(); debouncedUrlUpdate(); });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('generateBtn').click();
    });
  });

  // Custom font upload
  document.getElementById('uploadBtn').addEventListener('click', () => {
    document.getElementById('fontFile').click();
  });

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
      syncWordInputFonts();
    } catch(e) {
      document.getElementById('uploadedFontName').textContent = 'Error: ' + e.message;
    }
  });

  ['fnt1', 'fnt2'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      syncWordInputFonts();
      debouncedUrlUpdate();
    });
  });

  let resRebuildTimer = null;
  let resPendingCell = null;

  async function commitResolutionChange(targetCell) {
    const newCell = targetCell;
    const oldCell = S.CELL;
    if (newCell === oldCell) {
      document.getElementById('resVal').textContent = String(newCell);
      return;
    }
    S.CELL = newCell;
    document.getElementById('resVal').textContent = String(S.CELL);
    rescalePins(oldCell, newCell);
    const r1 = document.getElementById('name1').value;
    const r2 = document.getElementById('name2').value;
    await applyNames(r1 || 'ಬೆಳಕು', r2 || 'ನೆರಳು', document.getElementById('fnt1').value, document.getElementById('fnt2').value);
    await Promise.all([
      stampName(S.chars1, S.font1, S.sil1, undefined, 'front'),
      stampName(S.chars2, S.font2, S.sil2, undefined, 'side'),
    ]);
    redraw1(); redraw2(); scheduleUpdate();
    debouncedUrlUpdate();
  }

  const resSlider = document.getElementById('resSlider');
  resSlider.addEventListener('input', function() {
    const v = parseInt(this.value, 10);
    document.getElementById('resVal').textContent = String(v);
    resPendingCell = v;
    clearTimeout(resRebuildTimer);
    resRebuildTimer = setTimeout(() => {
      resRebuildTimer = null;
      const t = resPendingCell;
      resPendingCell = null;
      commitResolutionChange(t);
    }, 700);
  });
  resSlider.addEventListener('change', function() {
    clearTimeout(resRebuildTimer);
    resRebuildTimer = null;
    resPendingCell = null;
    commitResolutionChange(parseInt(this.value, 10));
  });

  const padSelect = document.getElementById('padSelect');
  const padCustomWrap = document.getElementById('padCustomWrap');
  const padCustom = document.getElementById('padCustom');
  padSelect.addEventListener('change', function() {
    if (this.value === '__custom__') {
      padCustomWrap.hidden = false;
      const v = padCustom.value;
      S.padChar = v ? [...v][0] : '\u00b7';
    } else {
      padCustomWrap.hidden = true;
      padCustom.value = '';
      S.padChar = this.value;
    }
    updatePreview();
    debouncedUrlUpdate();
  });
  padCustom.addEventListener('input', function() {
    if (padSelect.value !== '__custom__') return;
    const v = this.value;
    S.padChar = v ? [...v][0] : '\u00b7';
    updatePreview();
    debouncedUrlUpdate();
  });

  document.getElementById('exportBtn').addEventListener('click', () => exportSTL());

  document.getElementById('sl').onclick = () => setCameraLeft();
  document.getElementById('sf').onclick = () => setCameraFront();
  document.getElementById('sr').onclick = () => setCameraRight();
  document.getElementById('ar').onclick = () => toggleSpin();

}
