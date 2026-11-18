// 其他视口与 200% 缩放的代表性截图
import { chromium } from '@playwright/test';
import { onboardedSave, seedSave } from '../tests/e2e/helpers.ts';

const browser = await chromium.launch({ channel: 'chrome' });
const targets = [
  { dir: 'docs/evidence/screens/phase2-ipad-portrait', w: 768, h: 1024, dsf: 1 },
  { dir: 'docs/evidence/screens/phase2-zoom200', w: 640, h: 400, dsf: 2 },
];
for (const t of targets) {
  const ctx = await browser.newContext({ viewport: { width: t.w, height: t.h }, deviceScaleFactor: t.dsf });
  const page = await ctx.newPage();
  await seedSave(ctx, onboardedSave());
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button', { name: '继续点亮' }).click();
  await page.getByRole('button', { name: '居民任务' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${t.dir}/01-residents.png` });
  await page.getByRole('button', { name: '故事任务' }).nth(1).click();
  await page.getByRole('button', { name: '看这个任务' }).click();
  await page.getByRole('button', { name: '开始任务' }).click();
  await page.getByRole('button', { name: '跳过引导' }).click();
  await page.getByRole('button', { name: '开始', exact: true }).click();
  await page.waitForTimeout(400);
  const know = page.getByRole('button', { name: '知道了' });
  if (await know.isVisible().catch(() => false)) await know.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${t.dir}/02-practice-zh.png` });
  await ctx.close();
  console.log(t.dir, 'done');
}
await browser.close();
