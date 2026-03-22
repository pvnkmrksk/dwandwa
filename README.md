# Dwanda (Shadow Sculptor)

**Dwanda** (Sanskrit द्वन्द्व, *dvandva*) is a grammatical compound for paired opposites; in everyday speech it often means “duality” or the confusion of two things in one. This app plays that idea: two words read from two faces, one solid 3D form.

Dual-text 3D “shadow” illusion: type front and side strings, generate a mesh, optionally edit pixels, export STL for printing.

## Development

The app is static HTML/CSS/JS. **ES modules** must be served over HTTP (browsers block module imports from `file://`).

```bash
# From the repo root, any of:
python3 -m http.server 8080
npx --yes serve .
npm run dev
```

Then open the URL shown (for example `http://localhost:8080` or `http://localhost:3000`).

`npm run dev` uses [Vite](https://vitejs.dev/) as a static dev server (no bundling of the app; Three.js is still loaded from the CDN).

## Layout

| Path | Role |
|------|------|
| `index.html` | Page shell, markup, Three.js CDN + `js/main.js` |
| `css/app.css` | Styles |
| `js/state.js` | Shared mutable state (glyphs, sil arrays, `CELL`, …) |
| `js/layout.js` | Canvas wrapper sizing |
| `js/text.js` | Grapheme splitting, `applyNames` |
| `js/raster.js` | Text → silhouette bitmap (`stampName`) |
| `js/mesh.js` | Blur, surface nets, `buildModuleMeshes` |
| `js/scene.js` | Three.js scene, camera, debounced mesh update |
| `js/export-stl.js` | STL export |
| `js/editor.js` | Pixel editor canvases |
| `js/ui.js` | DOM wiring |
| `js/main.js` | Entry: init editors, `wireUi`, first load |
