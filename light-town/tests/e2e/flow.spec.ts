import { selectFirstPlayer } from './helpers';
import { expect, test } from '@playwright/test';
import { onboardedSave, readSave, seedSave, startLightLevel, tabTo, typeTargets } from './helpers';

test.describe('main flow', () => {
  test('first run: partner, guide, first level, result, save @flow', async ({ page }) => {
    await page.goto('./');
  await selectFirstPlayer(page);
    await expect(page.getByRole('heading', { name: '点亮小镇' })).toBeVisible();
    await page.getByRole('button', { name: '开始点亮' }).click();

    const radios = page.getByRole('radio');
    await expect(radios).toHaveCount(3);
    await radios.first().focus();
    await page.keyboard.press('ArrowRight');
    await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { name: '欢迎来到点亮小镇' })).toBeVisible();
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一步' }).click();
    await expect(page.getByRole('heading', { name: '点亮第一扇窗' })).toBeVisible();
    await page.keyboard.press('f');
    await page.keyboard.press('k');
    await expect(page.getByText('再找找看，没关系')).toBeVisible();
    for (const k of ['j', 'f', 'j']) await page.keyboard.press(k);
    await expect(page.getByRole('heading', { name: '准备好了！' })).toBeVisible();

    const afterGuide = await readSave(page);
    expect(afterGuide.partner).toBe('manman');
    expect(afterGuide.stats.attempts, 'the guide demo is not counted').toBe(0);
    expect(afterGuide.coins).toBe(0);

    await page.getByRole('button', { name: '去小镇' }).click();
    await expect(page.getByRole('heading', { name: '现在点亮：小灯屋' })).toBeVisible();

    await startLightLevel(page);
    await expect(page.locator('.light-strip .bulb')).toHaveCount(24);
    await typeTargets(page);

    await expect(page.locator('.result__building-text')).toContainText('小灯屋：已点亮 1/6');
    await expect(page.locator('.stat-list')).toContainText('100%');
    const afterLevel = await readSave(page);
    expect(afterLevel.buildings[0]).toBe(1);
    expect(afterLevel.coins).toBe(14);
    expect(afterLevel.stats.attempts).toBe(24);
    expect(afterLevel.activeTask).toBeNull();

    await page.reload();
  await selectFirstPlayer(page);
    await expect(page.getByRole('button', { name: '继续点亮' })).toBeVisible();
    await page.getByRole('button', { name: '继续点亮' }).click();
    await expect(page.locator('.town__goal-progress')).toHaveText('已点亮 1/6');
  });

  test('an unfinished level survives a reload and continues where it stopped @flow', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await page.goto('./');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await startLightLevel(page);
    await typeTargets(page, 5);
    await expect(page.locator('.bulb--on')).toHaveCount(5);

    await page.reload();
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await expect(page.locator('.resume-banner')).toContainText('已完成 5/24');
    await page.locator('.resume-banner').getByRole('button', { name: '继续上次' }).click();
    await expect(page.locator('.ready-panel')).toContainText('已暂停');
    await page.locator('.ready-panel').getByRole('button', { name: '继续' }).click();
    await expect(page.locator('.bulb--on')).toHaveCount(5);
    await typeTargets(page);
    await expect(page.locator('.result__building-text')).toContainText('已点亮 1/6');
  });

  test('result page: Enter does nothing until a button is chosen with Tab', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await page.goto('./');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await startLightLevel(page);
    await typeTargets(page);
    await expect(page.getByRole('heading', { name: '完成啦' })).toBeVisible();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    await expect(page.getByRole('heading', { name: '完成啦' })).toBeVisible();
    await tabTo(page, page.getByRole('button', { name: '继续点亮' }));
    await page.keyboard.press('Enter');
    await expect(page.locator('.target-box')).toBeVisible();
  });

  test('ending a session shows the summary with weighted accuracy', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await page.goto('./');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await startLightLevel(page);
    await page.keyboard.press('z');
    await typeTargets(page);
    await page.getByRole('button', { name: '结束本次' }).click();
    await expect(page.getByRole('heading', { name: '这次完成了 1 关' })).toBeVisible();
    await expect(page.locator('.stat-list')).toContainText('按对 24 次，共按 25 次');
    await expect(page.locator('.stat-list')).toContainText('小灯屋：0/6 → 1/6');
  });
});
