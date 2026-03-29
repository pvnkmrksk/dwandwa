import S, { NX } from './state.js';

export function updateCanvasSize() {
  ['w1', 'w2'].forEach(id => {
    const el = document.getElementById(id);
    if (!el || !el.parentElement) return;
    const rw = NX();
    const maxH = Math.min(300, Math.floor((el.parentElement.clientWidth - 16) / Math.max(1, rw / Math.max(1, S.CELL))));
    const h = Math.max(60, maxH);
    el.style.height = h + 'px';
    el.style.width = Math.min(640, Math.floor(h * rw / Math.max(8, S.CELL))) + 'px';
  });
}
