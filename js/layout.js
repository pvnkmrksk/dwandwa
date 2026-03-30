import S, { NX1, NX2 } from './state.js';

export function updateCanvasSize() {
  const pairs = [
    ['w1', NX1()],
    ['w2', NX2()],
  ];
  for (const [id, rw] of pairs) {
    const el = document.getElementById(id);
    if (!el) continue;
    const ar = Math.max(0.3, rw / Math.max(1, S.rowCellH));
    el.style.aspectRatio = ar.toFixed(4);
  }
}
