import S, { NX1, NX2, silIndex1, silIndex2 } from './state.js';
import { scheduleUpdate } from './scene.js';

let meshTimer = null;
function debouncedMeshUpdate() {
  clearTimeout(meshTimer);
  meshTimer = setTimeout(() => scheduleUpdate(), 800);
}

export function makeDrawer({ id, getSil, ink, erId, clId, fiId, brId, feathId, which }) {
  const isFront = which !== 'side';
  const getNX = isFront ? NX1 : NX2;
  const getColCellW = () => isFront ? S.colCellW1 : S.colCellW2;
  const getColX0 = () => isFront ? S.colX01 : S.colX02;
  const silIdx = isFront ? silIndex1 : silIndex2;

  function gxToColumn(gx) {
    const colX0 = getColX0();
    let c = 0;
    for (; c < S.nCols; c++) {
      if (gx < colX0[c + 1]) break;
    }
    const lx = gx - colX0[c];
    return { c, lx };
  }

  const canvas = document.getElementById(id);
  const RS = 5;
  let erasing = false, brushSize = 3, isDown = false, lgx = -1, lgz = -1;
  const feathEl = document.getElementById(feathId);

  const undoStack = [];
  const MAX_UNDO = 20;
  const undoBtnId = id === 'c1' ? 'undo1' : 'undo2';
  const undoBtn = document.getElementById(undoBtnId);

  function saveSnapshot() {
    const sil = getSil();
    undoStack.push(new Uint8Array(sil));
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }

  function undo() {
    if (undoStack.length === 0) return;
    const snapshot = undoStack.pop();
    const sil = getSil();
    sil.set(snapshot);
    redraw(true);
    debouncedMeshUpdate();
  }

  if (undoBtn) undoBtn.addEventListener('click', undo);

  document.getElementById(erId).addEventListener('click', function() { erasing = !erasing; this.classList.toggle('active', erasing); });
  document.getElementById(clId).addEventListener('click', () => { saveSnapshot(); getSil().fill(0); redraw(true); scheduleUpdate(); });
  document.getElementById(fiId).addEventListener('click', () => { saveSnapshot(); getSil().fill(1); redraw(true); scheduleUpdate(); });
  document.getElementById(brId).addEventListener('input', function() { brushSize = parseInt(this.value); });

  function ptrToGrid(e) {
    const r = canvas.getBoundingClientRect(), nx = getNX();
    return {
      gx: Math.max(0, Math.min(nx - 1, Math.floor((e.clientX - r.left) / r.width * nx))),
      gz: Math.max(0, Math.min(S.rowCellH - 1, S.rowCellH - 1 - Math.floor((e.clientY - r.top) / r.height * S.rowCellH)))
    };
  }

  let featherTimer = null;
  function scheduleFeather() {
    clearTimeout(featherTimer);
    featherTimer = setTimeout(() => redraw(true), 200);
  }

  function paintAt(gx, gz) {
    if (gx === lgx && gz === lgz) return; lgx = gx; lgz = gz;
    const sil = getSil(), nx = getNX();
    const colCellW = getColCellW();
    const r = (brushSize - 1) / 2;
    let ch = false;
    for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) {
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const x = gx + dx, z = gz + dz;
        if (x < 0 || x >= nx || z < 0 || z >= S.rowCellH) continue;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > r + 0.5) continue;
        const { c, lx } = gxToColumn(x);
        if (lx < 0 || lx >= colCellW[c]) continue;
        const i = silIdx(c, lx, z);
        if (erasing) {
          if (sil[i] !== 0) { sil[i] = 0; ch = true; }
        } else {
          if (sil[i] !== 1) { sil[i] = 1; ch = true; }
        }
      }
    }
    if (ch) { redraw(false); debouncedMeshUpdate(); }
  }

  canvas.addEventListener('pointerdown', e => {
    saveSnapshot();
    isDown = true; lgx = lgz = -1;
    canvas.setPointerCapture(e.pointerId);
    paintAt(...Object.values(ptrToGrid(e)));
  });
  canvas.addEventListener('pointermove', e => { if (isDown) paintAt(...Object.values(ptrToGrid(e))); });
  canvas.addEventListener('pointerup', () => { isDown = false; scheduleFeather(); });
  canvas.addEventListener('pointercancel', () => { isDown = false; scheduleFeather(); });

  function redraw(withFeather) {
    const nx = getNX(), colCellW = getColCellW(), colX0 = getColX0();
    const BX = nx * RS, BZ = S.rowCellH * RS;
    canvas.width = BX; canvas.height = BZ;
    const ctx = canvas.getContext('2d'), sil = getSil();
    ctx.fillStyle = '#07070f'; ctx.fillRect(0, 0, BX, BZ);

    ctx.fillStyle = ink;
    for (let x = 0; x < nx; x++) {
      for (let z = 0; z < S.rowCellH; z++) {
        const { c, lx } = gxToColumn(x);
        if (lx < 0 || lx >= colCellW[c]) continue;
        if (sil[silIdx(c, lx, z)]) {
          ctx.fillRect(x * RS + 0.5, (S.rowCellH - 1 - z) * RS + 0.5, RS - 1, RS - 1);
        }
      }
    }

    if (withFeather !== false && feathEl && feathEl.checked) {
      ctx.filter = 'blur(3px)';
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = ink;
      for (let x = 0; x < nx; x++) {
        for (let z = 0; z < S.rowCellH; z++) {
          const { c, lx } = gxToColumn(x);
          if (lx >= 0 && lx < colCellW[c] && sil[silIdx(c, lx, z)]) {
            ctx.fillRect(x * RS, (S.rowCellH - 1 - z) * RS, RS, RS);
          }
        }
      }
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
    }

    if (S.nCols > 1) {
      ctx.strokeStyle = '#28285a'; ctx.lineWidth = 1.5;
      for (let c = 1; c < S.nCols; c++) {
        const p = colX0[c] * RS;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, BZ); ctx.stroke();
      }
    }
    ctx.strokeStyle = '#1e1e38'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, BX - 1, BZ - 1);
  }
  redraw(true);
  return redraw;
}
