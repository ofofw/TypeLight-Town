// Smoke-test and screenshot the dev-only 3D demo page (?demo3d).
// Usage: node scripts/shot3d.mjs [out.png] [width] [height]
// Prints console/page errors and the WebGL renderer string; exits 1 if any error occurred.
import { chromium } from '@playwright/test';

const [out = 'docs/evidence/3d/demo3d-smoke.png', w = '1280', h = '900'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto('http://localhost:5173/?demo3d', { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(1500);
  const renderer = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    if (!gl) return 'no-webgl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : gl.getParameter(gl.RENDERER);
  });
  await page.screenshot({ path: out, fullPage: true });
  console.log(`saved ${out}`);
  console.log(`webgl renderer: ${renderer}`);
} finally {
  await browser.close();
}
if (errors.length > 0) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log('no console/page errors');
