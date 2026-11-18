// Renders public/icon.svg into the PNG icons used by iPad "add to home screen" and the web manifest.
// Home-screen icons are masked by the system, so the PNGs are full-bleed squares (no rounded corners).
// Run from light-town/: node scripts/icons.mjs
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const svg = readFileSync('public/icon.svg', 'utf8');
const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)?.[0];
const backgroundRects = svg.match(/<rect width="512" height="512"[^>]*\/>/g);
if (!defs || !backgroundRects) throw new Error('public/icon.svg no longer has <defs> and full-size background rects');
const background = backgroundRects.map((r) => r.replace(/\srx="[^"]*"/, '')).join('\n');
const art = svg
  .replace(/^[\s\S]*?<\/defs>/, '')
  .replace(/<rect width="512" height="512"[^>]*\/>/g, '')
  .replace(/<\/svg>\s*$/, '');

function icon(artScale) {
  const offset = (512 * (1 - artScale)) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
${defs}
${background}
<g transform="translate(${offset} ${offset}) scale(${artScale})">${art}</g>
</svg>`;
}

function png(source, size) {
  return new Resvg(source, { fitTo: { mode: 'width', value: size } }).render().asPng();
}

mkdirSync('public/icons', { recursive: true });
const plain = icon(1);
// Maskable icons may be cropped to a circle of 80% diameter, so the artwork is shrunk into that safe zone.
const maskable = icon(0.8);
writeFileSync('public/icons/apple-touch-icon.png', png(plain, 180));
writeFileSync('public/icons/icon-192.png', png(plain, 192));
writeFileSync('public/icons/icon-512.png', png(plain, 512));
writeFileSync('public/icons/icon-maskable-512.png', png(maskable, 512));
console.log('icons written to public/icons/');
