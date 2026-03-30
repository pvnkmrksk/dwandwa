import S, { allocArrays } from './state.js';
import { updatePreview, syncWordInputFonts } from './text.js';
import {
  generateNow,
  scheduleAfterComposerEdit,
  runGeneratePipelineWithStatus,
} from './generate-pipeline.js';
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
import { HOSTED_FONT_OPTIONS } from './hosted-font-registry.generated.js';
import { applyLang } from './i18n.js';

function defaultRasterCell() {
  return window.innerWidth >= 1024 ? 128 : 48;
}

function formatResVal(v) {
  const el = document.getElementById('resVal');
  if (el) el.textContent = `${v} px`;
}

function syncPadCycleBtnLabel() {
  const btn = document.getElementById('padCycleBtn');
  const sel = document.getElementById('padSelect');
  if (!btn || !sel) return;
  if (sel.value === '__custom__') {
    const c = document.getElementById('padCustom')?.value;
    btn.textContent = c ? [...c][0] : '\u00b7';
  } else {
    btn.textContent = sel.value;
  }
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
  syncPadCycleBtnLabel();
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
  formatResVal(S.CELL);
  if (p.has('var')) {
    const el = document.getElementById('variableColWidth');
    if (el) el.checked = p.get('var') === '1';
  }
}

function syncUniformColumns() {
  const el = document.getElementById('variableColWidth');
  S.uniformColumns = !(el && el.checked);
}

/** Bundled files from fonts/ — see scripts/generate-hosted-fonts.mjs */
function injectHostedFontOptions() {
  if (!HOSTED_FONT_OPTIONS.length) return;
  for (const id of ['fnt1', 'fnt2']) {
    const sel = document.getElementById(id);
    if (!sel) continue;
    if (sel.querySelector('optgroup[data-hosted-fonts]')) continue;
    const up = sel.querySelector('option[value="__up__"]');
    if (!up) continue;
    const og = document.createElement('optgroup');
    og.setAttribute('data-hosted-fonts', '1');
    og.setAttribute('data-i18n', 'local_fonts');
    og.label = 'Local fonts (bundled)';
    for (const o of HOSTED_FONT_OPTIONS) {
      const opt = document.createElement('option');
      opt.value = o.value;
      opt.textContent = o.label;
      og.appendChild(opt);
    }
    up.parentNode.insertBefore(og, up);
  }
}

let urlTimer = null;
function debouncedUrlUpdate() {
  clearTimeout(urlTimer);
  urlTimer = setTimeout(stateToUrl, 300);
}

export function wireUi({ redraw1, redraw2 }) {
  const bmsg = document.getElementById('bmsg');

  injectHostedFontOptions();
  loadFromUrl();
  applyLang();
  syncPadSelectFromState();
  syncPadCycleBtnLabel();
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
      await runGeneratePipelineWithStatus('Recomputing layout\u2026');
      debouncedUrlUpdate();
    });
  }

  ['alignBack', 'equalGap', 'backStrut', 'meshBottomAlign'].forEach(id => {
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
    try {
      await generateNow();
    } catch (e) { /* bmsg set in pipeline */ }
    debouncedUrlUpdate();
  });

  ['name1', 'name2'].forEach(id => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      updatePreview();
      debouncedUrlUpdate();
      scheduleAfterComposerEdit();
    });
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
      try {
        await generateNow();
      } catch (e) { /* bmsg */ }
      debouncedUrlUpdate();
    } catch(e) {
      document.getElementById('uploadedFontName').textContent = 'Error: ' + e.message;
    }
  });

  ['fnt1', 'fnt2'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      syncWordInputFonts();
      debouncedUrlUpdate();
      scheduleAfterComposerEdit();
    });
  });

  let resRebuildTimer = null;
  let resPendingCell = null;

  async function commitResolutionChange(targetCell) {
    const newCell = targetCell;
    const oldCell = S.CELL;
    if (newCell === oldCell) {
      formatResVal(newCell);
      return;
    }
    S.CELL = newCell;
    formatResVal(S.CELL);
    rescalePins(oldCell, newCell);
    await runGeneratePipelineWithStatus('Rebuilding resolution\u2026');
    debouncedUrlUpdate();
  }

  const resSlider = document.getElementById('resSlider');
  resSlider.addEventListener('input', function() {
    const v = parseInt(this.value, 10);
    formatResVal(v);
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
    syncPadCycleBtnLabel();
    updatePreview();
    debouncedUrlUpdate();
  });
  padCustom.addEventListener('input', function() {
    if (padSelect.value !== '__custom__') return;
    const v = this.value;
    S.padChar = v ? [...v][0] : '\u00b7';
    syncPadCycleBtnLabel();
    updatePreview();
    debouncedUrlUpdate();
  });

  const padCycleBtn = document.getElementById('padCycleBtn');
  if (padCycleBtn && padSelect) {
    padCycleBtn.addEventListener('click', () => {
      const n = padSelect.options.length;
      let i = (padSelect.selectedIndex + 1) % n;
      padSelect.selectedIndex = i;
      padSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  const brushSlider = document.getElementById('brushSlider');
  const br1 = document.getElementById('br1');
  const br2 = document.getElementById('br2');
  const brushValEl = document.getElementById('brushVal');
  function syncBrushFromSlider() {
    if (!brushSlider || !br1 || !br2) return;
    const v = brushSlider.value;
    br1.value = v;
    br2.value = v;
    if (brushValEl) brushValEl.textContent = v;
    br1.dispatchEvent(new Event('input', { bubbles: true }));
    br2.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (brushSlider) brushSlider.addEventListener('input', syncBrushFromSlider);

  const featherSlider = document.getElementById('featherSlider');
  const featherValEl = document.getElementById('featherVal');
  function applyFeatherFromSlider() {
    if (!featherSlider) return;
    const v = parseInt(featherSlider.value, 10);
    if (featherValEl) featherValEl.textContent = String(v);
    const on = v > 0;
    const f1 = document.getElementById('feath1');
    const f2 = document.getElementById('feath2');
    if (f1) f1.checked = on;
    if (f2) f2.checked = on;
    redraw1(true);
    redraw2(true);
  }
  if (featherSlider) featherSlider.addEventListener('input', applyFeatherFromSlider);

  syncBrushFromSlider();
  applyFeatherFromSlider();

  document.getElementById('exportBtn').addEventListener('click', () => exportSTL());

  document.getElementById('sl').onclick = () => setCameraLeft();
  document.getElementById('sf').onclick = () => setCameraFront();
  document.getElementById('sr').onclick = () => setCameraRight();
  document.getElementById('ar').onclick = () => toggleSpin();

}
