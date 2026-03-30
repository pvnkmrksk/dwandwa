import { updateSceneTheme } from './renderer-setup.js';
import { t } from './i18n.js';

const LIGHT_BG = 0xedf0f7;
const DARK_BG = 0x0c0f1c;

export function applyTheme(theme) {
  theme = theme || document.documentElement.dataset.theme || 'light';
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  updateSceneTheme(theme === 'dark' ? DARK_BG : LIGHT_BG);

  const meta = document.getElementById('metaThemeColor');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0c0f1c' : '#3b55e6');

  const btn = document.getElementById('themeToggle');
  if (btn) {
    const toDark = theme !== 'dark';
    btn.setAttribute(
      'aria-label',
      toDark ? `${t('toolbar_theme')}: ${t('theme_dark')}` : `${t('toolbar_theme')}: ${t('theme_light')}`,
    );
    btn.setAttribute('title', toDark ? t('theme_dark') : t('theme_light'));
  }
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}
