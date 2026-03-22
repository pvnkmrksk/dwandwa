import S, { NX } from './state.js';
import { scheduleUpdate } from './scene.js';

export function makeDrawer({ id, getSil, ink, erId, clId, fiId, brId }) {
  const canvas = document.getElementById(id);
  const RS = 5;
  let erasing = false, brushSize = 2, isDown = false, lgx = -1, lgz = -1;
  document.getElementById(erId).addEventListener('click', function() { erasing = !erasing; this.classList.toggle('active', erasing); });
  document.getElementById(clId).addEventListener('click', () => { getSil().fill(0); redraw(); scheduleUpdate(); });
  document.getElementById(fiId).addEventListener('click', () => { getSil().fill(1); redraw(); scheduleUpdate(); });
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
    const sil = getSil(), nx = NX(), h = (brushSize - 1) >> 1;
    let ch = false;
    for (let dz = -h; dz <= h; dz++) for (let dx = -h; dx <= h; dx++) {
      const x = gx + dx, z = gz + dz;
      if (x < 0 || x >= nx || z < 0 || z >= S.CELL) continue;
      const i = x * S.CELL + z, v = erasing ? 0 : 1;
      if (sil[i] !== v) { sil[i] = v; ch = true; }
    }
    if (ch) { redraw(); scheduleUpdate(); }
  }
  canvas.addEventListener('pointerdown', e => { isDown = true; lgx = lgz = -1; canvas.setPointerCapture(e.pointerId); paintAt(...Object.values(ptrToGrid(e))); });
  canvas.addEventListener('pointermove', e => { if (isDown) paintAt(...Object.values(ptrToGrid(e))); });
  canvas.addEventListener('pointerup', () => isDown = false);
  canvas.addEventListener('pointercancel', () => isDown = false);
  function redraw() {
    const nx = NX(), BX = nx * RS, BZ = S.CELL * RS;
    canvas.width = BX; canvas.height = BZ;
    const ctx = canvas.getContext('2d'), sil = getSil();
    ctx.fillStyle = '#07070f'; ctx.fillRect(0, 0, BX, BZ);
    ctx.strokeStyle = '#10102a'; ctx.lineWidth = 0.4;
    for (let i = 0; i <= nx; i++) { const p = i * RS; ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, BZ); ctx.stroke(); }
    for (let j = 0; j <= S.CELL; j++) { const p = j * RS; ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(BX, p); ctx.stroke(); }
    if (S.nCols > 1) {
      ctx.strokeStyle = '#28285a'; ctx.lineWidth = 1.5;
      for (let c = 1; c < S.nCols; c++) { const p = c * S.CELL * RS; ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, BZ); ctx.stroke(); }
    }
    ctx.fillStyle = ink;
    for (let x = 0; x < nx; x++) for (let z = 0; z < S.CELL; z++)
      if (sil[x * S.CELL + z]) ctx.fillRect(x * RS + 0.5, (S.CELL - 1 - z) * RS + 0.5, RS - 1, RS - 1);
    ctx.strokeStyle = '#1e1e38'; ctx.lineWidth = 1; ctx.strokeRect(0.5, 0.5, BX - 1, BZ - 1);
  }
  redraw();
  return redraw;
}
