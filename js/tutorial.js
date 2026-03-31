import { t } from './i18n.js';

const STEPS = [
  { sel: '#composer', title: 'help_s1t', desc: 'help_s1' },
  { sel: '#fnt1', title: 'help_s2t', desc: 'help_s2' },
  { sel: '#generateBtn', title: 'help_s3t', desc: 'help_s3' },
  {
    sel: '#rasterDetails summary',
    title: 'help_s4t',
    desc: 'help_s4',
    before() {
      const d = document.getElementById('rasterDetails');
      if (d) d.open = true;
    },
  },
  { sel: '#v3wrap', title: 'help_s5t', desc: 'help_s5' },
  { sel: '.cam-group--struts', title: 'help_s6t', desc: 'help_s6' },
  { sel: '.scene-controls', title: 'help_s7t', desc: 'help_s7' },
  { sel: '.export-bar', title: 'help_s8t', desc: 'help_s8' },
];

let active = false;
let stepIndex = 0;
let overlayEl = null;
let elevated = null;
let restoreZ = '';
let restorePos = false;

function cleanupElevation() {
  if (!elevated) return;
  elevated.classList.remove('tutorial-spotlight');
  if (restorePos) elevated.style.position = '';
  elevated.style.zIndex = restoreZ;
  elevated = null;
  restorePos = false;
  restoreZ = '';
}

function elevate(el) {
  cleanupElevation();
  elevated = el;
  const cs = getComputedStyle(el);
  restoreZ = el.style.zIndex;
  if (cs.position === 'static') {
    el.style.position = 'relative';
    restorePos = true;
  }
  el.style.zIndex = '320';
}

function removeOverlay() {
  cleanupElevation();
  overlayEl?.remove();
  overlayEl = null;
}

let previousFocusEl = null;

function getTutorialFocusables() {
  if (!overlayEl) return [];
  const card = overlayEl.querySelector('.tutorial-card');
  if (!card) return [];
  return [...card.querySelectorAll('button')].filter(b => !b.disabled);
}

function onKey(e) {
  if (e.key === 'Escape') {
    closeTutorial();
    return;
  }
  if (e.key !== 'Tab' || !overlayEl) return;
  const card = overlayEl.querySelector('.tutorial-card');
  if (!card) return;
  const list = getTutorialFocusables();
  if (!list.length) return;
  if (!card.contains(document.activeElement)) {
    e.preventDefault();
    list[0].focus();
    return;
  }
  const i = list.indexOf(document.activeElement);
  if (i < 0) return;
  if (e.shiftKey) {
    if (i === 0) {
      e.preventDefault();
      list[list.length - 1].focus();
    }
  } else if (i === list.length - 1) {
    e.preventDefault();
    list[0].focus();
  }
}

function placeCardNear(target, card) {
  const r = target.getBoundingClientRect();
  const margin = 12;
  const cw = Math.min(340, window.innerWidth - 24);
  card.style.width = `${cw}px`;
  let top = r.bottom + margin;
  if (top + 200 > window.innerHeight) top = Math.max(margin, r.top - margin - 200);
  let left = Math.min(
    Math.max(margin, r.left + r.width / 2 - cw / 2),
    window.innerWidth - cw - margin,
  );
  card.style.top = `${top}px`;
  card.style.left = `${left}px`;
}

function showStep(i, skipDepth = 0) {
  if (!overlayEl || i < 0 || i >= STEPS.length) return;
  if (skipDepth > STEPS.length) {
    console.warn('[tutorial] too many missing targets, closing');
    closeTutorial();
    return;
  }
  stepIndex = i;
  const cfg = STEPS[i];
  cfg.before?.();
  const target = document.querySelector(cfg.sel);
  const titleEl = overlayEl.querySelector('.tutorial-card__title');
  const descEl = overlayEl.querySelector('.tutorial-card__desc');
  const stepEl = overlayEl.querySelector('.tutorial-card__step');
  const nextBtn = overlayEl.querySelector('.tutorial-card__next');
  const skipBtn = overlayEl.querySelector('.tutorial-card__skip');
  if (!target) {
    console.warn('[tutorial] missing target for step', i, cfg.sel);
    if (i + 1 < STEPS.length) showStep(i + 1, skipDepth + 1);
    else closeTutorial();
    return;
  }
  target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  requestAnimationFrame(() => {
    elevate(target);
    target.classList.add('tutorial-spotlight');
    const card = overlayEl.querySelector('.tutorial-card');
    placeCardNear(target, card);
    nextBtn?.focus();
  });
  titleEl.textContent = t(cfg.title);
  descEl.textContent = t(cfg.desc);
  stepEl.textContent = `${i + 1} / ${STEPS.length}`;
  nextBtn.textContent = i === STEPS.length - 1 ? t('tutorial_done') : t('tutorial_next');
  skipBtn.textContent = t('tutorial_skip');
}

function buildOverlay() {
  const root = document.createElement('div');
  root.className = 'tutorial-overlay';
  root.innerHTML = `
    <div class="tutorial-backdrop" aria-hidden="true"></div>
    <div class="tutorial-card" role="dialog" aria-modal="true" aria-labelledby="tutorialTitle">
      <div class="tutorial-card__step" id="tutorialStep"></div>
      <div class="tutorial-card__title" id="tutorialTitle"></div>
      <div class="tutorial-card__desc"></div>
      <div class="tutorial-card__actions">
        <button type="button" class="btn tutorial-card__skip"></button>
        <button type="button" class="btn btn-primary tutorial-card__next"></button>
      </div>
    </div>
  `;
  root.querySelector('.tutorial-backdrop').addEventListener('click', () => closeTutorial());
  root.querySelector('.tutorial-card__next').addEventListener('click', () => {
    if (stepIndex >= STEPS.length - 1) closeTutorial();
    else showStep(stepIndex + 1);
  });
  root.querySelector('.tutorial-card__skip').addEventListener('click', () => closeTutorial());
  return root;
}

let onResize = null;

export function closeTutorial() {
  if (!active) return;
  active = false;
  if (onResize) {
    window.removeEventListener('resize', onResize);
    window.removeEventListener('scroll', onResize, true);
    onResize = null;
  }
  window.removeEventListener('keydown', onKey);
  removeOverlay();
  if (previousFocusEl && typeof previousFocusEl.focus === 'function') {
    try {
      previousFocusEl.focus();
    } catch (_) { /* ignore */ }
  }
  previousFocusEl = null;
}

export function startTutorial() {
  if (active) return;
  active = true;
  stepIndex = 0;
  previousFocusEl = document.activeElement;
  overlayEl = buildOverlay();
  document.body.appendChild(overlayEl);
  window.addEventListener('keydown', onKey);
  onResize = () => {
    const cfg = STEPS[stepIndex];
    const target = document.querySelector(cfg.sel);
    if (!target || !overlayEl) return;
    placeCardNear(target, overlayEl.querySelector('.tutorial-card'));
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('scroll', onResize, true);
  showStep(0);
}
