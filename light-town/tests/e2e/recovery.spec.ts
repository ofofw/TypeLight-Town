import { selectFirstPlayer } from './helpers';
import { expect, test } from '@playwright/test';
import { BACKUP_KEY, SAVE_KEY, onboardedSave, readSave, seedStorage } from './helpers';

test.describe('save recovery and storage problems (D03–D06)', () => {
  test('a damaged save is restored from the backup with a notice', async ({ page, context }) => {
    const good = onboardedSave();
    good.coins = 42;
    await seedStorage(context, { [SAVE_KEY]: '{"schemaVersion":1,"broken', [BACKUP_KEY]: JSON.stringify(good) });
    await page.goto('./');
    const dialog = page.getByRole('dialog', { name: '存档已从备份恢复' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: '知道了' }).click();
    await selectFirstPlayer(page);
    await expect(page.getByRole('button', { name: '继续点亮' })).toBeVisible();
    expect((await readSave(page)).coins).toBe(42);
  });

  test('save and backup both damaged: explain, confirm, then start fresh', async ({ page, context }) => {
    await seedStorage(context, { [SAVE_KEY]: 'not json', [BACKUP_KEY]: '{"also":"wrong"}' });
    await page.goto('./');
    await expect(page.getByRole('heading', { name: '存档无法读取' })).toBeVisible();
    expect(await page.evaluate((k) => localStorage.getItem(k), SAVE_KEY), 'nothing is overwritten before confirming').toBe('not json');
    await page.getByRole('button', { name: '重新开始' }).click();
    const confirm = page.getByRole('dialog', { name: '确定重新开始吗？' });
    await expect(confirm.getByRole('button', { name: '取消' })).toBeFocused();
    await confirm.getByRole('button', { name: '重新开始' }).click();
    await selectFirstPlayer(page);
    await expect(page.getByRole('button', { name: '开始点亮' })).toBeVisible();
    expect((await readSave(page)).partner).toBeNull();
  });

  test('a save from a newer version is kept untouched; temporary play does not write', async ({ page, context }) => {
    const future = { ...onboardedSave(), schemaVersion: 99 };
    const raw = JSON.stringify(future);
    await seedStorage(context, { [SAVE_KEY]: raw });
    await page.goto('./');
    await expect(page.getByRole('heading', { name: '存档来自更新的版本' })).toBeVisible();
    await page.getByRole('button', { name: '临时游玩（不保存）' }).click();
    await selectFirstPlayer(page);
    await expect(page.locator('.save-banner')).toContainText('临时游玩');
    await page.getByRole('button', { name: '开始点亮' }).click();
    await page.getByRole('button', { name: /就选/ }).click();
    expect(await page.evaluate((k) => localStorage.getItem(k), SAVE_KEY)).toBe(raw);
  });

  test('storage that cannot be written: play continues in memory with a warning', async ({ page, context }) => {
    await context.addInitScript(() => {
      Storage.prototype.setItem = function () {
        throw new DOMException('blocked', 'SecurityError');
      };
    });
    await page.goto('./');
    await selectFirstPlayer(page);
    await expect(page.locator('.save-banner')).toContainText('当前无法保存');
    await page.getByRole('button', { name: '开始点亮' }).click();
    await page.getByRole('button', { name: /就选/ }).click();
    await expect(page.getByRole('heading', { name: '欢迎来到点亮小镇' })).toBeVisible();
  });

  test('storage full while saving: progress stays in memory with a warning', async ({ page, context }) => {
    await seedStorage(context, { [SAVE_KEY]: JSON.stringify(onboardedSave()) });
    await context.addInitScript((key: string) => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) {
        if (k === key) throw new DOMException('full', 'QuotaExceededError');
        return original.call(this, k, v);
      };
    }, SAVE_KEY);
    await page.goto('./');
    await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await page.getByRole('button', { name: '设置' }).click();
    await page.getByRole('switch', { name: /减少动画/ }).click();
    await expect(page.locator('.save-banner')).toContainText('存储空间不足');
    await expect(page.getByRole('switch', { name: /减少动画/ })).toHaveAttribute('aria-checked', 'true');
  });

  test('a second page shows a notice; taking over moves the game there', async ({ page, context }) => {
    await seedStorage(context, { [SAVE_KEY]: JSON.stringify(onboardedSave()) });
    await page.goto('./');
    await selectFirstPlayer(page);
    await expect(page.getByRole('button', { name: '继续点亮' })).toBeVisible();

    const second = await context.newPage();
    await second.goto('./');
    await expect(second.getByRole('heading', { name: '游戏已在另一个页面打开' })).toBeVisible();
    await second.getByRole('button', { name: '在这里继续玩' }).click();
    await second.getByRole('dialog').getByRole('button', { name: '在这里继续' }).click();
    await selectFirstPlayer(second);
    await expect(second.getByRole('button', { name: '继续点亮' })).toBeVisible();
    await expect(page.getByRole('heading', { name: '游戏已在另一个页面打开' })).toBeVisible();
  });
});

test('the game script fails to load: a message and reload button instead of a blank page (E09)', async ({ page }) => {
  let block = true;
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (block && /\.js(\?|$)/.test(url)) {
      await route.fulfill({ status: 404, body: '// blocked', contentType: 'application/javascript' });
      return;
    }
    if (!block || route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    const html = (await response.text()).replace('setTimeout(failed, 15000)', 'setTimeout(failed, 0)');
    await route.fulfill({ response, body: html });
  });
  await page.goto('./');
  await expect(page.getByText('游戏没有加载成功')).toBeVisible();
  block = false;
  await page.getByRole('button', { name: '重新加载' }).click();
  await selectFirstPlayer(page);
  await expect(page.getByRole('heading', { name: '点亮小镇' })).toBeVisible();
});
