import { updateSceneTheme } from './renderer-setup.js';

const LIGHT_BG = 0xf0f0f4;
const DARK_BG = 0x1a1a20;

export function applyTheme(theme) {
  theme = theme || document.documentElement.dataset.theme || 'light';
  document.documentElement.dataset.theme = theme;
  localStorage.setItem('theme', theme);
  updateSceneTheme(theme === 'dark' ? DARK_BG : LIGHT_BG);

  const meta = document.getElementById('metaThemeColor');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#18181c' : '#5b6af5');

  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Light mode' : 'Dark mode');
    btn.setAttribute('title', theme === 'dark' ? 'Light mode' : 'Dark mode');
  }
}

export function toggleTheme() {
  const current = document.documentElement.dataset.theme || 'light';
  applyTheme(current === 'dark' ? 'light' : 'dark');
}
