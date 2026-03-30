# ದ್ವಂದ್ವ Dwandwa — 3D Shadow Illusion Sculptor

> **[Live App → pvnkmrksk.github.io/dwandwa](https://pvnkmrksk.github.io/dwandwa/)**

**Dwandwa** (Sanskrit द्वन्द्व, *dvandva*) is a grammatical compound for paired opposites; in everyday speech it often means "duality" or the confusion of two things in one. This app plays that idea: two words read from two faces, one solid 3D form.

Type front and side strings, generate a dual-silhouette mesh, optionally edit pixels, paint strut supports, and export a print-ready STL.

## Features

- Independent glyph aspect ratios — no stretching between mismatched column widths
- Gaussian-blur smoothing for cleaner 3D shapes
- Interactive pixel editor for silhouette touch-ups
- Paint strut pins directly on the 3D model (hover preview, drag, undo)
- Auto-detection of floating islands for automatic strut generation
- L-profile base + back panel with adjustable padding, thickness, overlap, fillet
- STL export oriented Z-up (base flat on the print bed)
- Supports Latin, Kannada, Devanagari, Tamil, Telugu, Malayalam, Bengali, Gujarati, Urdu scripts
- Custom font upload (TTF/OTF/WOFF)

## Development

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Layout

| Path | Role |
|------|------|
| `index.html` | Page shell, markup |
| `css/app.css` | Styles |
| `js/main.js` | Entry: init editors, wire UI, first load |
| `js/state.js` | Shared mutable state (glyphs, sil arrays, `CELL`, …) |
| `js/text.js` | Grapheme splitting, `applyNames` |
| `js/raster.js` | Text → silhouette bitmap (`stampName`) |
| `js/mesh.js` | Blur, surface nets, `buildModuleMeshes` |
| `js/mesh-update.js` | Debounced mesh rebuild orchestrator |
| `js/renderer-setup.js` | Three.js scene, camera, lights, orbit |
| `js/structure-plate.js` | L-profile base/back, strut geometry |
| `js/structure-layout.js` | Shared plate dimension math |
| `js/strut-painter.js` | Interactive 3D strut pin painting (add/drag/remove/undo) |
| `js/strut-auto.js` | Automatic floating-island strut detection |
| `js/module-layout.js` | Horizontal packing of letter modules |
| `js/voxel-surface.js` | Watertight voxel → mesh (surface nets) |
| `js/export-stl.js` | Binary STL export with Y→Z-up rotation |
| `js/editor.js` | Pixel editor canvases |
| `js/layout.js` | Canvas wrapper sizing |
| `js/scene.js` | Facade re-exports for UI/main |
| `js/ui.js` | DOM wiring |

## License

MIT
