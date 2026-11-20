// Multi-view screenshot of the dev-only full-town 3D demo page (?demo3d).
// Captures: each district fly-to view + locked-district preview. Exits 1 on console/page errors.
// Usage: node scripts/shot3d-town.mjs [outdir] [width] [height]
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const [outdir = 'docs/evidence/3d', w = '1600', h = '1100'] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto('http://localhost:5173/?demo3d', { waitUntil: 'load' });
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForTimeout(2500);

  // 全部点亮，看得更全
  await page.getByRole('button', { name: '全部点亮' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${outdir}/town-d0.png`, fullPage: false });

  for (const name of ['溪桥街', '星光坡', '月湾港']) {
    await page.getByRole('button', { name, exact: true }).click();
    await page.waitForTimeout(2600);
    const file = `${outdir}/town-d${['溪桥街', '星光坡', '月湾港'].indexOf(name) + 1}.png`;
    await page.screenshot({ path: file, fullPage: false });
  }

  // 锁区预览：回到暖灯巷，勾选锁定（远观 + 运镜进入锁定街区近看雾罩路牌）
  await page.getByRole('button', { name: '暖灯巷', exact: true }).click();
  await page.getByLabel('锁定街区预览').check();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${outdir}/town-locked.png`, fullPage: false });
  await page.getByRole('button', { name: /溪桥街/ }).click();
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${outdir}/town-locked-close.png`, fullPage: false });
  console.log(`saved 6 screenshots to ${outdir}/town-*.png`);
} finally {
  await browser.close();
}
if (errors.length > 0) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log('no console/page errors');
