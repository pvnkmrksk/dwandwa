import S, { NX } from './state.js';
import { scheduleUpdate } from './scene.js';

let meshTimer = null;
function debouncedMeshUpdate() {
  clearTimeout(meshTimer);
  meshTimer = setTimeout(() => scheduleUpdate(), 500);
}

export function makeDrawer({ id, getSil, ink, erId, clId, fiId, brId, feathId }) {
  const canvas = document.getElementById(id);
  const RS = 5;
  let erasing = false, brushSize = 3, isDown = false, lgx = -1, lgz = -1;
  const feathEl = document.getElementById(feathId);

  // Undo stack (stores snapshots)
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
    redraw();
    debouncedMeshUpdate();
  }

  if (undoBtn) undoBtn.addEventListener('click', undo);

  document.getElementById(erId).addEventListener('click', function() { erasing = !erasing; this.classList.toggle('active', erasing); });
  document.getElementById(clId).addEventListener('click', () => { saveSnapshot(); getSil().fill(0); redraw(); scheduleUpdate(); });
  document.getElementById(fiId).addEventListener('click', () => { saveSnapshot(); getSil().fill(1); redraw(); scheduleUpdate(); });
  document.getElementById(brId).addEventListener('input', function() { brushSize = parseInt(this.value); });

  function ptrToGrid(e) {
    const r = canvas.getBoundingClientRect(), nx = NX();
    return {
      gx: Math.max(0, Math.min(nx - 1, Math.floor((e.clientX - r.left) / r.width * nx))),
      gz: Math.max(0, Math.min(S.CELL - 1, S.CELL - 1 - Math.floor((e.clientY - r.top) / r.height * S.CELL)))
    };
  }

  function paintAt(gx, gz) {
    if (gx === lgx && gz === lgz) return; lgx = gx; lgz = gz;
    const sil = getSil(), nx = NX();
    const r = (brushSize - 1) / 2;
    let ch = false;

    for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) {
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        const x = gx + dx, z = gz + dz;
        if (x < 0 || x >= nx || z < 0 || z >= S.CELL) continue;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > r + 0.5) continue;

        const i = x * S.CELL + z;
        if (erasing) {
          if (sil[i] !== 0) { sil[i] = 0; ch = true; }
        } else {
          if (sil[i] !== 1) { sil[i] = 1; ch = true; }
        }
      }
    }
    if (ch) { redraw(); debouncedMeshUpdate(); }
  }

  canvas.addEventListener('pointerdown', e => {
    saveSnapshot(); // save before stroke
    isDown = true; lgx = lgz = -1;
    canvas.setPointerCapture(e.pointerId);
    paintAt(...Object.values(ptrToGrid(e)));
  });
  canvas.addEventListener('pointermove', e => { if (isDown) paintAt(...Object.values(ptrToGrid(e))); });
  canvas.addEventListener('pointerup', () => isDown = false);
  canvas.addEventListener('pointercancel', () => isDown = false);

  function redraw() {
    const nx = NX(), BX = nx * RS, BZ = S.CELL * RS;
    canvas.width = BX; canvas.height = BZ;
    const ctx = canvas.getContext('2d'), sil = getSil();
    ctx.fillStyle = '#07070f'; ctx.fillRect(0, 0, BX, BZ);

    const feather = feathEl && feathEl.checked;
    ctx.fillStyle = ink;
    for (let x = 0; x < nx; x++) {
      for (let z = 0; z < S.CELL; z++) {
        if (sil[x * S.CELL + z]) {
          ctx.fillRect(x * RS + 0.5, (S.CELL - 1 - z) * RS + 0.5, RS - 1, RS - 1);
        }
      }
    }

    if (feather) {
      ctx.filter = 'blur(3px)';
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = ink;
      for (let x = 0; x < nx; x++) {
        for (let z = 0; z < S.CELL; z++) {
          if (sil[x * S.CELL + z]) {
            ctx.fillRect(x * RS, (S.CELL - 1 - z) * RS, RS, RS);
          }
        }
      }
      ctx.filter = 'none';
      ctx.globalAlpha = 1;
    }

    // Module separators
    if (S.nCols > 1) {
      ctx.strokeStyle = '#28285a'; ctx.lineWidth = 1.5;
      for (let c = 1; c < S.nCols; c++) { const p = c * S.CELL * RS; ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, BZ); ctx.stroke(); }
    }
    ctx.strokeStyle = '#1e1e38'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, BX - 1, BZ - 1);
  }
  redraw();
  return redraw;
}
