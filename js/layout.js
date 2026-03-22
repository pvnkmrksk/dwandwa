import S from './state.js';

export function updateCanvasSize() {
  ['w1','w2'].forEach(id => {
    const el = document.getElementById(id);
    if (!el || !el.parentElement) return;
    const maxH = Math.min(300, Math.floor((el.parentElement.clientWidth - 16) / S.nCols));
    const h = Math.max(60, maxH);
    el.style.height = h + 'px';
    el.style.width = (h * S.nCols) + 'px';
  });
}
