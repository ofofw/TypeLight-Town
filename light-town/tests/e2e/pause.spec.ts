import { selectFirstPlayer } from './helpers';
import { expect, test } from '@playwright/test';
import { activeLevel, keyName, onboardedSave, seedSave, startLightLevel } from './helpers';

test.describe('pause, hints and timing (B06/C07/E06/E07)', () => {
  test.beforeEach(async ({ context }) => {
    await seedSave(context, onboardedSave());
  });

  test('Escape pauses with a menu; continuing keeps the targets', async ({ page }) => {
    await page.goto('./');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await startLightLevel(page);
    const before = await activeLevel(page);
    await page.keyboard.press(keyName(before.targets[0]));
    await page.keyboard.press('Escape');
    const dialog = page.getByRole('dialog', { name: '已暂停' });
    await expect(dialog).toBeVisible();
    expect((await activeLevel(page)).paused).toBe(true);
    const resume = dialog.getByRole('button', { name: '继续' });
    await expect(resume).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: '重新开始这一关' })).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: '结束本次' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: '切换玩家' }), 'Tab reaches the new player action inside the dialog').toBeFocused();
    await page.keyboard.press('Tab');
    await expect(resume, 'Tab stays inside the dialog').toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: '切换玩家' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('button', { name: '结束本次' })).toBeFocused();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    await expect(page.locator('.practice'), 'focus returns to the practice area').toBeFocused();
    const after = await activeLevel(page);
    expect(after.paused).toBe(false);
    expect(after.targets).toEqual(before.targets);
    expect(after.pos).toBe(1);
    await page.keyboard.press(keyName(before.targets[1]));
    await expect(page.locator('.bulb--on')).toHaveCount(2);
  });

  test('leaving the window pauses and asks before continuing', async ({ page }) => {
    await page.goto('./');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await startLightLevel(page);
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('.ready-panel')).toContainText('已暂停（离开了页面或切换了窗口）');
    expect((await activeLevel(page)).paused).toBe(true);
    const target = (await activeLevel(page)).targets[0];
    await page.keyboard.press(keyName(target));
    expect((await activeLevel(page)).attempts, 'keys are not scored while paused').toBe(0);
    await page.keyboard.press('Enter');
    await expect(page.locator('.target-box')).toBeVisible();
  });

  test('8 s without a key enlarges the hint; 30 s pauses automatically', async ({ page }) => {
    await page.clock.install();
    await page.goto('./');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await startLightLevel(page);
    await expect(page.locator('.key--enhanced')).toHaveCount(0);
    await page.clock.fastForward(8_500);
    await expect(page.locator('.key--enhanced')).toHaveCount(1);
    await expect(page.getByText('没有收到按键？')).toBeVisible();
    await page.clock.fastForward(22_000);
    await expect(page.locator('.ready-panel')).toContainText('好一会儿没有按键，先暂停啦。');
    const level = await activeLevel(page);
    expect(level.paused).toBe(true);
    expect(level.effectiveMs, 'only the first 15 s after starting count without input').toBe(15_000);
  });
});
