// Walks through the main screens like a first-time player and saves a screenshot of each.
// Usage: node scripts/tour.mjs [baseUrl] [outDir] [width] [height] [chrome|webkit]
// chrome = the installed Google Chrome; webkit = Playwright's WebKit build (Safari engine, not Safari itself).
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, webkit } from '@playwright/test';

const [base = 'http://127.0.0.1:4173/', outDir = '.cache/shots', w = '1280', h = '800', engine = 'chrome'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await (engine === 'webkit' ? webkit.launch() : chromium.launch({ channel: 'chrome' }));
const errors = [];
let n = 0;

try {
  const context = await browser.newContext({ viewport: { width: Number(w), height: Number(h) }, locale: 'zh-CN' });
  const page = await context.newPage();
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));

  const shot = async (name, opts = {}) => {
    n += 1;
    const file = join(outDir, `${String(n).padStart(2, '0')}-${name}.png`);
    await page.waitForTimeout(opts.wait ?? 250);
    await page.screenshot({ path: file, fullPage: opts.full ?? false });
    console.log('saved', file);
  };
  const click = (name) => page.getByRole('button', { name, exact: false }).first().click();
  const typeRemaining = async (limit = Infinity) => {
    const level = await page.evaluate(() => JSON.parse(localStorage.getItem('lighttown.save')).activeLevel);
    const keys = level.targets.slice(level.pos, level.pos + limit);
    for (const ch of keys) await page.keyboard.press(ch === ' ' ? 'Space' : ch);
  };

  await page.goto(base);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await shot('home');

  await click('开始点亮');
  await shot('partner');
  await click('就选');
  await shot('onboarding-welcome');
  await click('下一步');
  await shot('onboarding-bumps');
  await click('下一步');
  await shot('onboarding-hands');
  await click('下一步');
  await page.keyboard.press('f');
  await page.keyboard.press('k');
  await shot('onboarding-demo');
  for (const k of ['j', 'f', 'j']) await page.keyboard.press(k);
  await shot('onboarding-done');
  await click('去小镇');
  await shot('town');
  await page.locator('.town-nav').getByRole('button', { name: '家长' }).click();
  await shot('parent-empty', { full: true });
  await click('小镇');

  await page.locator('.town__goal').getByRole('button', { name: '继续点亮' }).click();
  await page.waitForTimeout(200);
  if (await page.getByRole('button', { name: '知道了，开始' }).isVisible()) {
    await shot('stage-intro');
    await click('知道了，开始');
  }
  await shot('mode-intro');
  await page.locator('.dialog').getByRole('button', { name: '开始' }).click();
  await shot('practice');
  await page.keyboard.press('z');
  await page.keyboard.press('z');
  await shot('practice-missed');
  await page.waitForTimeout(8200);
  await shot('practice-idle-hint');
  await typeRemaining(5);
  await shot('practice-progress');
  await page.keyboard.press('Escape');
  await shot('practice-menu');
  await page.locator('.dialog').getByRole('button', { name: '继续' }).first().click();
  await page.keyboard.press('Enter');
  await typeRemaining();
  await shot('result-celebrating', { wait: 400 });
  await page.waitForTimeout(2200);
  await shot('result', { full: true });
  await click('结束本次');
  await shot('summary', { full: true });
  await click('回小镇');
  await shot('town-after');

  await click('衣柜');
  await shot('wardrobe', { full: true });
  await page.locator('.item-card').nth(1).click();
  await shot('wardrobe-select');
  await click('小镇');
  await click('学习路线');
  await shot('route', { full: true });
  await click('小镇');
  await click('灯光节');
  await shot('festival-locked');
  await click('小镇');
  await page.locator('.town-nav').getByRole('button', { name: '家长' }).click();
  await shot('parent', { full: true });
  await click('小镇');
  await click('设置');
  await shot('settings', { full: true });
  await click('清除此设备的进度');
  await shot('settings-clear-1');
  await click('继续');
  await shot('settings-clear-2');
  await click('取消');
  await page.getByRole('switch', { name: /减少动画/ }).click();
  await click('小镇');
  await shot('town-reduced-motion');
} finally {
  await browser.close();
  console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'no console errors');
}
