#!/usr/bin/env node
/**
 * Minimal smoke checklist for CI or local verification.
 * Does not start a browser; use after manual or automated UI checks.
 */
console.log('Dwandwa smoke checklist (manual):');
console.log('  1. npm run dev — open app, default BUSY / FREE.');
console.log('  2. #vc shows triangle count > 0.');
console.log('  3. Export STL downloads a non-empty file.');
console.log('  4. Optional: append ?debug=1 — purple AABB on letter mesh.');
console.log('OK: smoke script loaded (exit 0).');
