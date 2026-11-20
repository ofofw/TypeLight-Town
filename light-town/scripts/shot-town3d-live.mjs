// Smoke: the real game's town page in 3D (production preview build).
// Drives first-run onboarding, enters the town, verifies the 3D canvas and screenshots.
// Usage: node scripts/shot-town3d-live.mjs [out.png] [width] [height]
import { chromium } from '@playwright/test';

const [out = 'docs/evidence/3d/town-live.png', w = '1440', h = '900'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load' });
  // 选第一个玩家 → 开始点亮 → 选伙伴 → 过三步引导 → 引导小关 → 去小镇
  await page.getByRole('button', { name: '我是玩家一', exact: true }).click();
  await page.getByRole('button', { name: '开始点亮' }).click();
  const radios = page.getByRole('radio');
  await radios.first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一步' }).click();
  for (const k of ['f', 'k', 'j', 'f', 'j']) await page.keyboard.press(k);
  await page.getByRole('button', { name: '去小镇' }).click();
  await page.waitForSelector('.town3d canvas', { timeout: 15000 });
  await page.waitForTimeout(2800);
  const renderer = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') ?? c.getContext('webgl');
    if (!gl) return 'no-webgl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : gl.getParameter(gl.RENDERER);
  });
  await page.screenshot({ path: out, fullPage: false });
  // 锁区预览：跳到最后一个可到街区（月湾港未开放时应有雾罩）
  await page.getByRole('button', { name: '月湾港' }).click();
  await page.waitForTimeout(2600);
  await page.screenshot({ path: out.replace('.png', '-locked.png'), fullPage: false });
  console.log(`saved ${out} + locked variant`);
  console.log(`webgl renderer: ${renderer}`);
} finally {
  await browser.close();
}
if (errors.length > 0) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log('no console/page errors');
