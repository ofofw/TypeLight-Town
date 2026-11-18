import { selectFirstPlayer } from './helpers';
import { expect, test, type Page } from '@playwright/test';
import { activeLevel, festivalSave, keyName, onboardedSave, passIntros, readSave, seedSave, typeTargets } from './helpers';

async function openFestival(page: Page) {
  await page.goto('./');
  await selectFirstPlayer(page);
  await page.getByRole('button', { name: '继续点亮' }).click();
  await page.getByRole('button', { name: '灯光节' }).first().click();
}

test.describe('light festival (A08/A09/C05)', () => {
  test('locked before all buildings are lit, with the reason', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await openFestival(page);
    await expect(page.getByRole('heading', { name: '灯光节还没开放' })).toBeVisible();
    await expect(page.getByText('还差 12 座建筑')).toBeVisible();
  });

  test('a full round of three levels pays 10 coins once and celebrates', async ({ page, context }) => {
    await seedSave(context, festivalSave());
    await openFestival(page);
    await expect(page.getByRole('heading', { name: '易错复习' })).toBeVisible();
    const startCoins = (await readSave(page)).coins;

    await page.getByRole('button', { name: '开始新一轮' }).click();
    for (let i = 0; i < 3; i++) {
      await passIntros(page);
      const level = await activeLevel(page);
      expect(level.entry).toBe('festival');
      expect(level.festival?.index).toBe(i);
      await typeTargets(page);
      await expect(page.getByRole('heading', { name: '完成啦' })).toBeVisible();
      if (i < 2) {
        await expect(page.locator('.result__news')).toContainText(`灯光节第 ${i + 1}/3 关完成`);
        await page.getByRole('button', { name: '下一关' }).click();
      }
    }
    await expect(page.locator('.result__news')).toContainText('这一轮灯光节 3 关全部完成，额外得到 10 灯光币');
    const s = await readSave(page);
    expect(s.festival.roundsCompleted).toBe(1);
    expect(s.festival.round).toBeNull();
    expect(s.buildings.every((b) => b === 6)).toBe(true);
    expect(s.coins, 'three levels at 100% (3 × 14) plus the round bonus 10').toBe(startCoins + 52);

    await page.reload();
  await selectFirstPlayer(page);
    expect((await readSave(page)).coins, 'reloading after the round pays nothing again').toBe(startCoins + 52);
    expect((await readSave(page)).festival.roundsCompleted).toBe(1);
  });

  test('free practice with two chosen keys uses only those keys', async ({ page, context }) => {
    await seedSave(context, festivalSave());
    await openFestival(page);
    await page.locator('.key-picker').getByRole('button', { name: 'A', exact: true }).click();
    await expect(page.getByRole('button', { name: '再选 1 个按键' })).toBeDisabled();
    await page.locator('.key-picker').getByRole('button', { name: 'S', exact: true }).click();
    await page.getByRole('button', { name: '用这 2 个按键练习' }).click();
    await passIntros(page);
    const level = await activeLevel(page);
    expect(level.entry).toBe('free');
    expect(new Set(level.targets)).toEqual(new Set(['a', 's']));
    await page.keyboard.press(keyName(level.targets[0]));
    await expect(page.locator('.bulb--on')).toHaveCount(1);
  });

  test('buying and applying a theme recolours the town', async ({ page, context }) => {
    await seedSave(context, festivalSave());
    await openFestival(page);
    const card = page.locator('.theme-card', { hasText: '薄荷星光' });
    await card.getByRole('button', { name: /购买/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: '购买' }).click();
    await expect(page.getByRole('status')).toContainText('已经换成薄荷星光主题');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'mint');
    const s = await readSave(page);
    expect(s.theme).toBe('mint');
    expect(s.themesOwned).toContain('mint');
    expect(s.coins).toBe(500 - 40); // 2026-11-16 降价后主题 40 币
    await page.locator('.theme-card', { hasText: '暖金' }).getByRole('button', { name: '使用' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'warm');
    expect((await readSave(page)).coins).toBe(460);
  });
});
