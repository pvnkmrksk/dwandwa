import S, { NX } from './state.js';

const RS = 4;

function ensureMask() {
  const w = NX();
  const d = Math.max(16, S.rowCellH + 12);
  if (!S.strutMask || S.strutMaskW !== w || S.strutMaskD !== d) {
    const n = w * d;
    const next = new Uint8Array(n);
    if (S.strutMask && S.strutMaskW === w) {
      const oldD = S.strutMaskD;
      for (let ix = 0; ix < w; ix++) {
        for (let iz = 0; iz < Math.min(oldD, d); iz++) {
          next[ix + iz * w] = S.strutMask[ix + iz * w];
        }
      }
    }
    S.strutMask = next;
    S.strutMaskW = w;
    S.strutMaskD = d;
  }
}

function getBrushRadius() {
  const el = document.getElementById('strutBrush');
  const r = el ? parseInt(el.value, 10) : 4;
  return Math.max(1, Math.min(16, r || 4));
}

/** Stamp a disk on the mask (Manhattan raster for speed, optional circle). */
function stampDisk(cx, cz, rad, val) {
  const w = NX();
  const d = S.strutMaskD;
  const r2 = rad * rad;
  for (let dz = -rad; dz <= rad; dz++) {
    for (let dx = -rad; dx <= rad; dx++) {
      if (dx * dx + dz * dz > r2 + 0.25) continue;
      const x = cx + dx;
      const z = cz + dz;
      if (x < 0 || x >= w || z < 0 || z >= d) continue;
      S.strutMask[x + z * w] = val;
    }
  }
}

function drawStrutCanvas(ctx, BW, BH, w, d) {
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0, 0, BW, BH);
  for (let iz = 0; iz < d; iz++) {
    for (let ix = 0; ix < w; ix++) {
      const on = S.strutMask[ix + iz * w];
      ctx.fillStyle = on ? 'rgba(210,215,235,.95)' : '#15152a';
      ctx.fillRect(ix * RS + 0.5, (d - 1 - iz) * RS + 0.5, RS - 1, RS - 1);
    }
  }
  ctx.strokeStyle = '#3a3a55';
  ctx.lineWidth = 1;
  let cx = 0;
  for (let c = 0; c < S.nCols; c++) {
    const cw = S.colCellW[c] * RS;
    ctx.strokeRect(cx + 0.5, 0.5, cw - 1, BH - 1);
    cx += cw;
  }
  ctx.strokeStyle = '#5b6af5';
  ctx.strokeRect(0.5, 0.5, BW - 1, BH - 1);
  ctx.strokeStyle = 'rgba(72, 189, 255, 0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(0, RS * 0.5);
  ctx.lineTo(BW, RS * 0.5);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#6ec8ff';
  ctx.font = '10px Inter, sans-serif';
  ctx.fillText('Back wall (struts bridge here)', 6, 11);
  ctx.fillStyle = '#8888a0';
  ctx.fillText('Front / letters →', 6, BH - 4);
}

export function initStrutPlanCanvas(deps) {
  const scheduleUpdate = deps && deps.scheduleUpdate;
  const canvas = document.getElementById('strutCanvas');
  if (!canvas) return () => {};
  ensureMask();

  let painting = false, erase = false;

  function cellFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    const w = NX();
    const d = S.strutMaskD;
    const bx = Math.max(0, Math.min(w - 1, Math.floor((e.clientX - r.left) / Math.max(r.width, 1) * w)));
    const syNorm = Math.min(1, Math.max(0, (e.clientY - r.top) / Math.max(r.height, 1)));
    const bz = Math.min(d - 1, Math.max(0, Math.floor((1 - syNorm) * d)));
    return { bx, bz };
  }

  function paintAt(e) {
    const { bx, bz } = cellFromEvent(e);
    const rad = getBrushRadius();
    const v = erase ? 0 : 1;
    stampDisk(bx, bz, rad, v);
    draw();
  }

  function draw() {
    ensureMask();
    if (!S.colCellW || S.nCols < 1) return;
    const w = NX();
    const d = S.strutMaskD;
    const BW = w * RS;
    const BH = d * RS;
    canvas.width = BW;
    canvas.height = BH;
    const ctx = canvas.getContext('2d');
    drawStrutCanvas(ctx, BW, BH, w, d);
  }

  canvas.addEventListener('pointerdown', e => {
    painting = true;
    erase = e.shiftKey;
    paintAt(e);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => { if (painting) paintAt(e); });
  canvas.addEventListener('pointerup', () => { painting = false; });
  canvas.addEventListener('pointercancel', () => { painting = false; });

  document.getElementById('strutBrush')?.addEventListener('input', function() {
    const el = document.getElementById('strutBrushVal');
    if (el) el.textContent = this.value;
  });

  document.getElementById('strutClear')?.addEventListener('click', () => {
    ensureMask();
    S.strutMask.fill(0);
    S.strutUseMask = false;
    draw();
    if (typeof scheduleUpdate === 'function') scheduleUpdate();
  });
  document.getElementById('strutFillCol')?.addEventListener('click', () => {
    ensureMask();
    const w = NX();
    const d = S.strutMaskD;
    for (let iz = 0; iz < d; iz++) {
      for (let ix = 0; ix < w; ix++) S.strutMask[ix + iz * w] = 1;
    }
    draw();
  });
  document.getElementById('strutApply3d')?.addEventListener('click', () => {
    S.strutUseMask = true;
    if (typeof scheduleUpdate === 'function') scheduleUpdate();
  });

  draw();
  return draw;
}

export function redrawStrutPlan() {
  const canvas = document.getElementById('strutCanvas');
  if (!canvas) return;
  ensureMask();
  if (!S.colCellW || S.nCols < 1) return;
  const w = NX();
  const d = S.strutMaskD;
  const BW = w * RS;
  const BH = d * RS;
  canvas.width = BW;
  canvas.height = BH;
  const ctx = canvas.getContext('2d');
  drawStrutCanvas(ctx, BW, BH, w, d);
}
