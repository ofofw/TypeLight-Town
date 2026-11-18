import { startP2Task } from '../../src/core/phase2/task';
import { seedStorage } from './helpers';
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { onboardedSave, seedSave, startLightLevel, typeTargets } from './helpers';
import { newProfiles, makeBackup } from '../../src/core/save/profiles';

test('two independent players, real download, fresh-context restore, undo and single-player clear', async ({ page, context, browser }) => {
  const first = onboardedSave(); first.coins = 88;
  await seedSave(context, first);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '今天谁来点亮小镇？' })).toBeVisible();
  await page.screenshot({ path: 'docs/evidence/screens/players-selection.png' });
  await page.getByRole('button', { name: '我是玩家一' }).click();
  await page.getByRole('button', { name: '继续点亮' }).click();
  await startLightLevel(page); await typeTargets(page, 3);
  await page.getByRole('button', { name: '切换玩家' }).click();
  await page.getByRole('button', { name: '我是玩家二' }).click();
  await expect(page.getByRole('button', { name: '开始点亮' })).toBeVisible();
  await page.getByRole('button', { name: '开始点亮' }).click();
  await page.getByRole('button', { name: /就选/ }).click();
  await page.getByRole('button', { name: '切换玩家' }).click();
  await page.getByRole('button', { name: '我是玩家一' }).click();
  await page.getByRole('button', { name: '继续点亮' }).click();
  await page.getByRole('button', { name: '设置' }).click();
  await page.getByRole('button', { name: '备份与恢复' }).click();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出两人备份' }).click();
  const download = await downloaded;
  const output = 'docs/evidence/players-backup-test.json'; await download.saveAs(output);
  const file = JSON.parse(readFileSync(output, 'utf8'));
  expect(file.profiles[0].game.activeTask.level.pos).toBe(3);
  expect(file.profiles[0].game.coins).toBe(88);
  expect(file.profiles[1].game.partner).toBe('nuannuan');
  expect(file.profiles[1].game.coins).toBe(0);
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto('/'); await other.getByRole('button', { name: '备份与恢复' }).click();
  await other.locator('input[type=file]').setInputFiles(output);
  await expect(other.getByRole('heading', { name: '恢复预览' })).toBeVisible();
  await other.screenshot({ path: 'docs/evidence/screens/players-restore-preview.png', fullPage: true });
  await other.getByRole('button', { name: '恢复这份备份' }).click();
  await other.getByRole('button', { name: '确认整体恢复' }).click();
  await expect(other.getByRole('button', { name: '我是玩家一' })).toBeVisible();
  const stored = await other.evaluate(() => JSON.parse(localStorage.getItem('lighttown.save')!));
  expect(stored.profiles).toEqual(file.profiles);
  await other.reload();
  await other.getByRole('button', { name: '备份与恢复' }).click();
  await other.getByRole('button', { name: '撤销上次恢复', exact: true }).click();
  await other.getByRole('button', { name: '确认撤销恢复' }).click();
  const undone = await other.evaluate(() => JSON.parse(localStorage.getItem('lighttown.save')!));
  expect(undone.profiles[0].game.coins).toBe(0); expect(undone.undoRestore).toBeNull();
  await fresh.close();
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await page.getByRole('button', { name: '清空玩家一的游戏进度' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '继续' }).click();
  await page.getByRole('button', { name: '确认清空玩家一的进度' }).click();
  const cleared = await page.evaluate(() => JSON.parse(localStorage.getItem('lighttown.save')!));
  expect(cleared.profiles[0].game.partner).toBeNull();
  expect(cleared.profiles[1]).toEqual(file.profiles[1]);
});

test('backup validation and cancelled preview never replace either player', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '备份与恢复' }).click();
  const before = await page.evaluate(() => localStorage.getItem('lighttown.save'));
  await page.locator('input[type=file]').setInputFiles({ name: 'bad.json', mimeType: '', buffer: Buffer.from('{') });
  await expect(page.getByRole('status')).toContainText('JSON');
  expect(await page.evaluate(() => localStorage.getItem('lighttown.save'))).toBe(before);
  const backup = makeBackup(newProfiles(Date.now()), Date.now());
  await page.locator('input[type=file]').setInputFiles({ name: 'valid.json', mimeType: '', buffer: Buffer.from(JSON.stringify(backup)) });
  await page.getByRole('button', { name: '取消预览' }).click();
  expect(await page.evaluate(() => localStorage.getItem('lighttown.save'))).toBe(before);
});


test('memory-only switching retains both profiles and exports their current state', async ({ page, context }) => {
  await seedSave(context, onboardedSave());
  await context.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(k, v) { if (k === 'lighttown.save' || k === 'lighttown.save.backup') throw new DOMException('full', 'QuotaExceededError'); return original.call(this, k, v); };
  });
  await page.goto('/'); await page.getByRole('button', { name: '我是玩家一' }).click();
  await page.getByRole('button', { name: '继续点亮' }).click();
  await page.getByRole('button', { name: '设置' }).click();
  await page.getByRole('switch', { name: /减少动画/ }).click();
  await page.getByRole('button', { name: '切换玩家' }).click();
  await page.getByRole('button', { name: '暂存本次并切换' }).click();
  await page.getByRole('button', { name: '我是玩家二' }).click();
  await page.getByRole('button', { name: '开始点亮' }).click();
  await page.getByRole('radio', { name: /跳跳/ }).click();
  await page.getByRole('button', { name: /就选/ }).click();
  await page.getByRole('button', { name: '切换玩家' }).click();
  await page.getByRole('button', { name: '暂存本次并切换' }).click();
  await page.getByRole('button', { name: '我是玩家一' }).click();
  await page.getByRole('button', { name: '继续点亮' }).click();
  await page.getByRole('button', { name: '设置' }).click();
  await expect(page.getByRole('switch', { name: /减少动画/ })).toHaveAttribute('aria-checked', 'true');
  const downloading = page.waitForEvent('download');
  await page.locator('.save-banner').getByRole('button', { name: '导出当前内存备份' }).click();
  const download = await downloading; const path = await download.path();
  const backup = JSON.parse(readFileSync(path!, 'utf8'));
  expect(backup.profiles[0].game.settings.reduceMotion).toBe(true);
  expect(backup.profiles[1].game.partner).toBe('tiaotiao');
});

test('rename validates names, displays HTML as text, and persists after refresh', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '修改玩家一的名字' }).click();
  const input = page.getByRole('textbox', { name: '玩家名字' });
  await input.fill('玩家二'); await page.getByRole('button', { name: '保存名字' }).click();
  await expect(page.getByRole('alert')).toContainText('不同');
  await input.fill('<b>小明</b>'); await page.getByRole('button', { name: '保存名字' }).click();
  await expect(page.getByRole('button', { name: '我是<b>小明</b>' })).toBeVisible();
  await page.reload(); await expect(page.getByRole('button', { name: '我是<b>小明</b>' })).toBeVisible();
});

test('a stale restore preview cannot overwrite another page revision', async ({ page }) => {
  await page.goto('/'); await page.getByRole('button', { name: '备份与恢复' }).click();
  const backup = makeBackup(newProfiles(Date.now()), Date.now());
  await page.locator('input[type=file]').setInputFiles({ name: 'valid.json', mimeType: '', buffer: Buffer.from(JSON.stringify(backup)) });
  await page.evaluate(() => { const value = JSON.parse(localStorage.getItem('lighttown.save')!); value.revision++; value.profiles[1].game.coins = 345; localStorage.setItem('lighttown.save', JSON.stringify(value)); });
  await page.getByRole('button', { name: '恢复这份备份' }).click(); await page.getByRole('button', { name: '确认整体恢复' }).click();
  await expect(page.getByRole('heading', { name: '进度在别处更新了' })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('lighttown.save')!).profiles[1].game.coins)).toBe(345);
});


test('two unfinished resident tasks keep separate drafts when switching before debounce', async ({ page, context }) => {
  const household = newProfiles(Date.now());
  for (const [i, profile] of household.profiles.entries()) {
    const game = onboardedSave(); game.phase2.teaching.intro = true;
    profile.game = startP2Task(game, { kind: 'story', taskId: 'en-1-lamp-house' }, Date.now(), 100+i).save;
    if (profile.game.activeTask?.variant === 'phase2') profile.game.activeTask.task.introSeen = true;
  }
  await seedStorage(context, { 'lighttown.save': JSON.stringify(household) });
  await page.goto('/');
  for (const [name, draft] of [['玩家一', 'hel'], ['玩家二', 'go']] as const) {
    await page.getByRole('button', { name: `我是${name}` }).click();
    await page.getByRole('button', { name: '居民任务（继续练习）' }).click();
    await page.getByRole('button', { name: '继续练习', exact: true }).click();
    await page.locator('.ready-panel button').click();
    await page.locator('.task-input').fill(draft);
    await page.getByRole('button', { name: '切换玩家' }).click();
  }
  const profiles = await page.evaluate(() => JSON.parse(localStorage.getItem('lighttown.save')!).profiles);
  expect(profiles[0].game.activeTask.task.items[0].draft).toBe('hel');
  expect(profiles[1].game.activeTask.task.items[0].draft).toBe('go');
  await page.getByRole('button', { name: '我是玩家一' }).click();
  await page.getByRole('button', { name: '居民任务（继续练习）' }).click();
  await page.getByRole('button', { name: '继续练习', exact: true }).click();
  await expect(page.locator('.task-input')).toHaveValue('hel');
  await page.screenshot({ path: 'docs/evidence/screens/players-task.png' });
});


test('save failure from pause keeps keyboard focus inside the switch confirmation', async ({ page, context }) => {
  await seedSave(context, onboardedSave()); await page.goto('/');
  await page.getByRole('button', { name: '我是玩家一' }).click();
  await page.getByRole('button', { name: '继续点亮' }).click(); await startLightLevel(page);
  await page.evaluate(() => { const original = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k === 'lighttown.save') throw Error('full'); original.call(this, k, v); }; });
  await page.keyboard.press('Escape');
  await page.getByRole('dialog', { name: '已暂停' }).getByRole('button', { name: '切换玩家' }).click();
  const inner = page.getByRole('dialog', { name: '尚未保存，关闭页面可能丢失进度' });
  await expect(inner.getByRole('button', { name: '取消切换' })).toBeFocused();
  for (let i = 0; i < 4; i++) await page.keyboard.press('Tab');
  await expect(inner.getByRole('button', { name: '取消切换' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(inner).toBeHidden();
  await expect(page.getByRole('dialog', { name: '已暂停' }).getByRole('button', { name: '切换玩家' })).toBeFocused();
});
