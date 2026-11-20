// Close-up screenshots of individual buildings on the dev-only 3D demo page.
// Usage: node scripts/shot3d-building.mjs <建筑名> [out.png] [width] [height]
// 建筑名 = DemoPage 焦点层按钮文本，如 花房 / 钟楼 / 灯塔。
import { chromium } from '@playwright/test';

const [name, out = `docs/evidence/3d/building-${name}.png`, w = '1200', h = '900'] = process.argv.slice(2);
if (!name) {
  console.error('usage: node scripts/shot3d-building.mjs <建筑名> [out.png] [width] [height]');
  process.exit(2);
}
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto('http://localhost:5173/?demo3d', { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.getByRole('button', { name: '全部点亮' }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: new RegExp(`^${name}，已点亮`) }).click();
  await page.waitForTimeout(2600);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`saved ${out}`);
} finally {
  await browser.close();
}
if (errors.length > 0) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log('no console/page errors');
