#!/usr/bin/env node
/**
 * Scan fonts/ and emit css/hosted-fonts.css + js/hosted-font-registry.generated.js
 * Run via: npm run prebuild / predev (or node scripts/generate-hosted-fonts.mjs)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const fontsDir = path.join(root, 'fonts');
const cssDir = path.join(root, 'css');
const outCss = path.join(cssDir, 'hosted-fonts.css');
const outJs = path.join(root, 'js', 'hosted-font-registry.generated.js');

function cssUrl(absFile) {
  const rel = path.relative(cssDir, absFile).split(path.sep).join('/');
  return rel.startsWith('.') ? rel : `./${rel}`;
}

function fmtForExt(ext) {
  const e = ext.toLowerCase();
  if (e === '.woff2') return 'woff2';
  if (e === '.woff') return 'woff';
  if (e === '.otf') return 'opentype';
  return 'truetype';
}

function srcDecl(absPath) {
  const dir = path.dirname(absPath);
  const base = path.basename(absPath).replace(/\.(woff2|woff|ttf|otf)$/i, '');
  const w2 = path.join(dir, `${base}.woff2`);
  const w = path.join(dir, `${base}.woff`);
  const ext = path.extname(absPath).toLowerCase();
  const parts = [];
  if (ext === '.ttf' || ext === '.otf') {
    parts.push(`url('${cssUrl(absPath)}') format('${fmtForExt(ext)}')`);
    return parts.join(',\n    ');
  }
  if (fs.existsSync(w2)) parts.push(`url('${cssUrl(w2)}') format('woff2')`);
  if (fs.existsSync(w)) parts.push(`url('${cssUrl(w)}') format('woff')`);
  if (parts.length === 0) {
    parts.push(`url('${cssUrl(absPath)}') format('${fmtForExt(ext)}')`);
  }
  return parts.join(',\n    ');
}

function titleCaseSlug(name) {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/[_()]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(w => (w.length ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
    .join(' ');
}

/** @type {{ family: string, label: string, weight: number, style: string, file: string }[]} */
const faces = [];

function addFace(family, label, weight, style, absFile) {
  faces.push({ family, label, weight, style: style || 'normal', file: absFile });
}

// --- ATS Bengaluru: group by style (Dot, LED, Pixel, Smooth, Square) ---
const bengaluruDir = path.join(fontsDir, 'ATS-Bengaluru', 'WEB');
if (fs.existsSync(bengaluruDir)) {
  const byStyle = new Map();
  for (const name of fs.readdirSync(bengaluruDir)) {
    const m = name.match(/^ATSBengaluru-(\w+)(Bold|Regular)\.(woff2|woff)$/i);
    if (!m) continue;
    const style = m[1];
    const wt = m[2].toLowerCase() === 'bold' ? 700 : 400;
    const abs = path.join(bengaluruDir, name);
    if (!byStyle.has(style)) byStyle.set(style, {});
    const ext = m[3].toLowerCase();
    const cur = byStyle.get(style)[wt];
    if (!cur || ext === 'woff2') byStyle.get(style)[wt] = abs;
  }
  for (const [style, wts] of byStyle) {
    const family = `ATS Bengaluru ${style}`;
    const label = `ATS Bengaluru · ${style}`;
    if (wts[400]) addFace(family, label, 400, 'normal', wts[400]);
    if (wts[700]) addFace(family, label, 700, 'normal', wts[700]);
  }
}

// --- ATS Chikkamagaluru WEB ---
const chikkaWeb = path.join(fontsDir, 'ATS-Chikkamagaluru', 'WEB');
if (fs.existsSync(chikkaWeb)) {
  for (const name of fs.readdirSync(chikkaWeb)) {
    if (!/\.woff2$/i.test(name)) continue;
    const abs = path.join(chikkaWeb, name);
    if (/ColorRegular/i.test(name)) {
      addFace('ATS Chikkamagaluru Color', 'ATS Chikkamagaluru (color)', 400, 'normal', abs);
    } else if (/Regular/i.test(name)) {
      addFace('ATS Chikkamagaluru', 'ATS Chikkamagaluru', 400, 'normal', abs);
    }
  }
}

// --- ATS Bandipura ---
const bandiWeb = path.join(fontsDir, 'ATS-Bandipura', 'WEB');
if (fs.existsSync(bandiWeb)) {
  const w2 = path.join(bandiWeb, 'ATSBandipura-Bold.woff2');
  const wo = path.join(bandiWeb, 'ATSBandipura-Bold.woff');
  const abs = fs.existsSync(w2) ? w2 : wo;
  if (fs.existsSync(abs)) {
    addFace('ATS Bandipura', 'ATS Bandipura', 700, 'normal', abs);
  }
}

// --- Root TTF: Kedage (one family) ---
const kedageMap = [
  { base: 'kedage.ttf', weight: 400, style: 'normal' },
  { base: 'kedage_bold.ttf', weight: 700, style: 'normal' },
  { base: 'kedage_i.ttf', weight: 400, style: 'italic' },
];
let kedageOk = false;
for (const { base, weight, style } of kedageMap) {
  const abs = path.join(fontsDir, base);
  if (fs.existsSync(abs)) {
    addFace('Kedage', 'Kedage', weight, style, abs);
    kedageOk = true;
  }
}

// --- Malige ---
const maligeMap = [
  { base: 'malige(1).ttf', weight: 400, style: 'normal' },
  { base: 'malige_bold(1).ttf', weight: 700, style: 'normal' },
];
for (const { base, weight, style } of maligeMap) {
  const abs = path.join(fontsDir, base);
  if (fs.existsSync(abs)) {
    addFace('Malige', 'Malige', weight, style, abs);
  }
}

// --- Other root TTFs (skip kedage/malige pieces already done) ---
const skipRoot = new Set([
  'kedage.ttf',
  'kedage_bold.ttf',
  'kedage_i.ttf',
  'malige(1).ttf',
  'malige_bold(1).ttf',
]);
if (fs.existsSync(fontsDir)) {
  for (const name of fs.readdirSync(fontsDir)) {
    if (skipRoot.has(name)) continue;
    if (!/\.(ttf|otf)$/i.test(name)) continue;
    const abs = path.join(fontsDir, name);
    if (!fs.statSync(abs).isFile()) continue;
    const stem = name.replace(/\.(ttf|otf)$/i, '');
    let label = titleCaseSlug(stem);
    let family = label.replace(/\s+/g, ' ').trim();
    if (/^akshar$/i.test(stem)) {
      family = 'Akshar Kannada Local';
      label = 'Akshar (local file)';
    } else if (/^baloo_tamma$/i.test(stem)) {
      family = 'Baloo Tamma Local';
      label = 'Baloo Tamma (local file)';
    } else if (/^kar_/i.test(stem)) {
      label = titleCaseSlug(stem.replace(/^kar_/, 'Kar '));
      family = label;
    }
    addFace(family, label, 400, 'normal', abs);
  }
}

// --- Dedupe dropdown: one option per distinct family ---
const familyToLabel = new Map();
for (const f of faces) {
  if (!familyToLabel.has(f.family)) familyToLabel.set(f.family, f.label);
}

const cssBlocks = [
  '/* AUTO-GENERATED by scripts/generate-hosted-fonts.mjs — do not edit */',
  '/* Bundled files in /fonts (licenses included in font packages) */',
  '',
];

for (const f of faces) {
  const src = srcDecl(f.file);
  cssBlocks.push(`@font-face {
  font-family: '${f.family.replace(/'/g, "\\'")}';
  font-style: ${f.style};
  font-weight: ${f.weight};
  font-display: swap;
  src:
    ${src};
}`);
  cssBlocks.push('');
}

fs.mkdirSync(cssDir, { recursive: true });
fs.writeFileSync(outCss, cssBlocks.join('\n'), 'utf8');

const sortedFamilies = [...familyToLabel.keys()].sort((a, b) =>
  familyToLabel.get(a).localeCompare(familyToLabel.get(b), undefined, { sensitivity: 'base' }),
);

const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const options = sortedFamilies.map(family => ({
  label: familyToLabel.get(family),
  value: `'${esc(family)}',sans-serif`,
}));

const jsOut = `/* AUTO-GENERATED by scripts/generate-hosted-fonts.mjs — do not edit */
export const HOSTED_FONT_OPTIONS = ${JSON.stringify(options, null, 2)};
`;

fs.writeFileSync(outJs, jsOut, 'utf8');

console.log(`Wrote ${faces.length} @font-face rules -> ${path.relative(root, outCss)}`);
console.log(`Wrote ${options.length} font menu entries -> ${path.relative(root, outJs)}`);
