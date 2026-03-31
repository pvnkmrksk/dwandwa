# ದ್ವಂದ್ವ Dwandwa — 3D Shadow Illusion Sculptor


> **[Live → pvnkmrksk.github.io/dwandwa](https://pvnkmrksk.github.io/dwandwa/)**

**Dwandwa** (Sanskrit द्वन्द्व, *dvandva* — "duality") turns two words into one 3D form: the front silhouette reads one word, the side silhouette reads another.

Type front and side strings, tweak the pixel editor, paint strut supports directly on the mesh, and export a print-ready STL.

## Quick start

```bash
npm install
npm run dev        # → http://localhost:5173
npm run build      # production build in dist/
```

## How it works

1. Each letter pair (front[i] × side[i]) becomes one 3D module
2. Glyphs are rasterized into binary silhouettes at configurable resolution
3. Dual-silhouette intersection carves a voxel grid per module
4. Gaussian blur + surface nets produce a smooth watertight mesh
5. Modules are packed horizontally with an L-profile base + back panel
6. User can hand-paint pixel edits and place strut support pins on the 3D model
7. STL export upscales the live silhouettes (preserving all edits), rotates to Z-up for printing

## Features

- Independent glyph aspect ratios per column
- Gaussian-blur smoothing for clean 3D shapes
- Interactive pixel editor with undo, erase, fill, brush size, feathering
- Strut painter: click mesh to place supports, drag to reposition on the back plane, shift/right-click to remove, undo
- Hover preview shows where a strut will land before you click
- Back panel goes transparent during strut painting for visibility
- L-profile base + back with adjustable padding, thickness, overlap, fillet
- Export quality multiplier (1x–8x) with pixel-edit–preserving upscale
- STL oriented Z-up — base flat on print bed, no manual rotation needed
- Latin, Kannada, Devanagari, Tamil, Telugu, Malayalam, Bengali, Gujarati, Urdu
- Custom font upload (TTF / OTF / WOFF)

## Project layout

| Path | Purpose |
|------|---------|
| `js/main.js` | Entry point |
| `js/state.js` | Global mutable state |
| `js/text.js` | Grapheme splitting, `applyNames` |
| `js/raster.js` | Font → silhouette bitmap |
| `js/mesh.js` | Blur, voxel intersection, surface-net mesh |
| `js/mesh-update.js` | Debounced rebuild orchestrator |
| `js/renderer-setup.js` | Three.js scene, camera, lights, orbit |
| `js/structure-plate.js` | L-profile base/back panel, strut geometry |
| `js/structure-layout.js` | Shared plate dimension math |
| `js/strut-painter.js` | Interactive strut pin painting |
| `js/module-layout.js` | Horizontal module packing |
| `js/mesher/voxel-surface.js` | Binary voxel → watertight mesh |
| `js/export-stl.js` | Binary STL with Y→Z-up rotation |
| `js/editor.js` | Pixel editor canvases |
| `js/layout.js` | Canvas wrapper sizing |
| `js/scene.js` | Facade re-exports |
| `js/ui.js` | DOM wiring |
| `css/app.css` | Styles |

## License

MIT
