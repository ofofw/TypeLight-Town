import { selectFirstPlayer } from './helpers';
import { expect, test } from '@playwright/test';
import { SAVE_KEY, onboardedSave, readSave, seedSave } from './helpers';

test.describe('settings (A02/D07)', () => {
  test('changing the partner keeps coins, course, buildings and accessories', async ({ page, context }) => {
    const save = onboardedSave();
    save.coins = 77;
    save.buildings[0] = 3;
    save.owned = ['leaf-hat'];
    save.equipped = { ...save.equipped, head: 'leaf-hat' };
    await seedSave(context, save);
    await page.goto('./');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await page.getByRole('button', { name: '设置' }).click();
    await page.getByRole('button', { name: /更换小伙伴/ }).click();
    await page.getByRole('radio', { name: /跳跳/ }).click();
    await page.getByRole('button', { name: /就选/ }).click();
    const after = await readSave(page);
    expect(after.partner).toBe('tiaotiao');
    expect(after.coins).toBe(77);
    expect(after.buildings[0]).toBe(3);
    expect(after.course).toEqual(save.course);
    expect(after.owned).toEqual(['leaf-hat']);
    expect(after.equipped.head).toBe('leaf-hat');
  });

  test('clearing needs two confirmations; cancelling changes nothing', async ({ page, context }) => {
    const save = onboardedSave();
    save.coins = 50;
    await seedSave(context, save);
    await page.goto('./');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await page.getByRole('button', { name: '设置' }).click();

    const clear = page.getByRole('button', { name: '清空玩家一的游戏进度' });
    await clear.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: '要清空玩家一的游戏进度吗？' }).getByRole('button', { name: '不清除' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(clear, 'focus returns to the button that opened the dialog').toBeFocused();

    await page.getByRole('button', { name: '清空玩家一的游戏进度' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '继续' }).click();
    const last = page.getByRole('dialog', { name: '最后确认' });
    await expect(last).toContainText('玩家一的游戏进度将被删除；另一名玩家不受影响。');
    await last.getByRole('button', { name: '取消' }).click();
    expect((await readSave(page)).coins).toBe(50);

    await page.getByRole('button', { name: '清空玩家一的游戏进度' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '继续' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '确认清空玩家一的进度' }).click();
    await expect(page.getByRole('button', { name: '开始点亮' })).toBeVisible();
    const raw = await page.evaluate((k) => localStorage.getItem(k), SAVE_KEY);
    expect(raw === null || JSON.parse(raw).profiles[0].game.coins === 0).toBe(true);
    await page.reload();
  await selectFirstPlayer(page);
    await expect(page.getByRole('button', { name: '开始点亮' })).toBeVisible();
  });
});
