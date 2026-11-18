import { selectFirstPlayer } from './helpers';
import { expect, test } from '@playwright/test';
import { festivalSave, seedSave, startLightLevel, typeTargets } from './helpers';

test('only the game site is contacted, nothing is uploaded, nothing but the save is stored (E08)', async ({ page, context, baseURL }) => {
  const save = festivalSave();
  save.buildings[11] = 5;
  save.currentBuilding = 11;
  save.festival = { unlocked: false, round: null, roundsCompleted: 0 };
  await seedSave(context, save);
  const origins = new Set<string>();
  const uploads: string[] = [];
  page.on('request', (r) => {
    const url = new URL(r.url());
    if (url.protocol === 'data:' || url.protocol === 'blob:') return;
    origins.add(url.origin);
    if (r.method() !== 'GET' && r.method() !== 'HEAD') uploads.push(`${r.method()} ${r.url()}`);
  });

  await page.goto('./');
  await selectFirstPlayer(page);
  await page.getByRole('button', { name: '继续点亮' }).click();
  await startLightLevel(page);
  await typeTargets(page);
  await expect(page.getByRole('heading', { name: '完成啦' })).toBeVisible();
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: '结束本次' }).click();
  await page.getByRole('button', { name: '回小镇' }).click();
  for (const name of ['衣柜', '学习路线', '灯光节', '家长', '设置']) {
    await page.locator('.town-nav').getByRole('button', { name }).click();
    await page.getByRole('button', { name: '小镇' }).first().click();
  }

  expect([...origins]).toEqual([new URL(baseURL!).origin]);
  expect(uploads).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  const keys = await page.evaluate(() => [...Object.keys(localStorage), ...Object.keys(sessionStorage)]);
  expect(keys.filter((k) => !k.startsWith('lighttown.') && k !== '__e2e_seeded')).toEqual([]);
});
