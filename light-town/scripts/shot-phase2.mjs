// 第二阶段页面截图（布局证据）：需要 preview 服务运行中。
import { chromium } from '@playwright/test';
import { onboardedSave, seedSave } from '../tests/e2e/helpers.ts';

const [, , outDir = 'docs/evidence/screens/phase2-mac', w = '1280', h = '800', dsf = '1'] = process.argv;
const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: Number(w), height: Number(h) }, deviceScaleFactor: Number(dsf) });
const page = await ctx.newPage();
await seedSave(ctx, onboardedSave());
await page.goto('http://127.0.0.1:4173/');
await page.getByRole('button', { name: '继续点亮' }).click();
await page.getByRole('button', { name: '居民任务' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/01-residents.png` });
await page.getByRole('button', { name: '故事任务' }).nth(1).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/02-route-zh.png`, fullPage: false });
await page.getByRole('button', { name: '看这个任务' }).click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/03-preview.png` });
await page.getByRole('button', { name: '开始任务' }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: '跳过引导' }).click();
await page.waitForTimeout(200);
await page.screenshot({ path: `${outDir}/04-intro.png` });
await page.getByRole('button', { name: '开始', exact: true }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/05-practice-ready.png` });
const know = page.getByRole('button', { name: '知道了' });
if (await know.isVisible().catch(() => false)) await know.click();
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/06-practice-zh.png` });
// 输入后错误展示（可能已自动暂停，先恢复）
const resumeBtn = page.locator('.ready-panel button');
if (await resumeBtn.isVisible().catch(() => false)) {
  await resumeBtn.click();
  const know3 = page.getByRole('button', { name: '知道了' });
  if (await know3.isVisible().catch(() => false)) await know3.click();
}
await page.locator('.task-input').fill('错');
await page.getByRole('button', { name: '确认' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${outDir}/07-practice-diff.png` });
await browser.close();
console.log('shots written to', outDir);
