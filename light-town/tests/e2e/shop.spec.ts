import { selectFirstPlayer } from './helpers';
import { expect, test } from '@playwright/test';
import { onboardedSave, readSave, seedSave } from './helpers';

test.describe('wardrobe (A09/D02)', () => {
  test('buy, auto-equip, take off and keep after reload; never charged twice', async ({ page, context }) => {
    const save = onboardedSave();
    save.coins = 100;
    await seedSave(context, save);
    await page.goto('./');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await page.getByRole('button', { name: '衣柜' }).click();

    await page.locator('.item-card', { hasText: '小叶帽' }).click();
    await expect(page.locator('.wardrobe__preview-label')).toHaveText('正在试穿：小叶帽');
    await page.getByRole('button', { name: '用 15 灯光币购买' }).click();
    const dialog = page.getByRole('dialog', { name: '购买小叶帽？' });
    await expect(dialog).toContainText('买完还剩 85');
    await dialog.getByRole('button', { name: '购买' }).click();
    await expect(page.getByRole('status')).toContainText('买好了，已经戴上小叶帽！');
    await expect(page.locator('.coin-badge')).toHaveAccessibleName('灯光币 85');

    let s = await readSave(page);
    expect(s.coins).toBe(85);
    expect(s.owned).toContain('leaf-hat');
    expect(s.equipped.head).toBe('leaf-hat');
    await expect(page.getByRole('button', { name: /购买/ })).toHaveCount(0);

    await page.getByRole('button', { name: '取下小叶帽' }).click();
    s = await readSave(page);
    expect(s.equipped.head).toBeNull();
    expect(s.coins).toBe(85);

    await page.reload();
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await page.getByRole('button', { name: '衣柜' }).click();
    await page.locator('.item-card', { hasText: '小叶帽' }).click();
    await expect(page.getByRole('button', { name: '戴上小叶帽' })).toBeVisible();
    await page.getByRole('button', { name: '戴上小叶帽' }).click();
    s = await readSave(page);
    expect(s.equipped.head).toBe('leaf-hat');
    expect(s.coins).toBe(85);
  });

  test('not enough coins: buying is disabled and the gap is shown', async ({ page, context }) => {
    const save = onboardedSave();
    save.coins = 20;
    await seedSave(context, save);
    await page.goto('./');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await page.getByRole('button', { name: '衣柜' }).click();
    await page.locator('.item-card', { hasText: '月亮冠' }).click();
    await expect(page.locator('.wardrobe__action').getByRole('button')).toBeDisabled();
    await expect(page.locator('.wardrobe__action')).toContainText('还差 25 灯光币');
  });
});
