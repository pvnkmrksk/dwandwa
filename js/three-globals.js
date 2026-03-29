/**
 * Vite production builds omit the CDN three.min.js tag; mesh/scene code expects window.THREE.
 */
import * as THREE from 'three';
window.THREE = THREE;
