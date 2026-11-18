import { chromium, webkit, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
for (const [name, engine, options] of [['Chrome', chromium, { channel: 'chrome' }], ['WebKit', webkit, {}]]) {
  if (process.argv.includes('--chrome-only') && name !== 'Chrome') continue;
  const browser = await engine.launch(options);
  try {
    const page = await browser.newPage();
    const sourcePage = await browser.newPage();
    await sourcePage.goto(pathToFileURL(resolve('index.html')).href);
    await sourcePage.getByRole('button', { name: '我是玩家一' }).click();
    await expect(sourcePage.getByRole('button', { name: '开始点亮' })).toBeVisible();
    await expect(sourcePage).toHaveURL(/dist\/index\.html$/);
    await sourcePage.close();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(resolve('../index.html')).href);
    await page.getByRole('button', { name: '我是玩家一' }).click();
    await page.getByRole('button', { name: '开始点亮' }).click();
    await page.getByRole('radio').first().focus();
    await page.keyboard.press('Enter');
    for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一步' }).click();
    for (const key of ['f', 'j', 'f', 'j']) await page.keyboard.press(key);
    await expect(page.getByRole('heading', { name: '准备好了！' })).toBeVisible();
    const decoded = await page.evaluate(async () => {
      const entries = Object.values(globalThis.__LIGHT_TOWN_AUDIO__);
      const ctx = new AudioContext();
      for (const url of entries) await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
      await ctx.close();
      return entries.length;
    });
    await page.reload();
    await page.getByRole('button', { name: '我是玩家一' }).click();
    await expect(page.getByRole('button', { name: '继续点亮' })).toBeVisible();
    await page.getByRole('button', { name: '切换玩家' }).click();
    await page.getByRole('button', { name: '备份与恢复' }).click();
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: '导出两人备份' }).click();
    const download = await downloading;
    const backupFile = resolve(`docs/evidence/players-file-${name.toLowerCase()}.json`);
    await download.saveAs(backupFile);
    const freshContext = await browser.newContext();
    const freshPage = await freshContext.newPage();
    await freshPage.goto(pathToFileURL(resolve('../index.html')).href);
    await freshPage.getByRole('button', { name: '备份与恢复' }).click();
    await freshPage.locator('input[type=file]').setInputFiles(backupFile);
    await freshPage.getByRole('button', { name: '恢复这份备份' }).click();
    await freshPage.getByRole('button', { name: '确认整体恢复' }).click();
    await freshPage.getByRole('button', { name: '我是玩家一' }).click();
    await expect(freshPage.getByRole('button', { name: '继续点亮' })).toBeVisible();
    const restored = await freshPage.evaluate(() => JSON.parse(localStorage.getItem('lighttown.save')).profiles);
    if (restored[0].game.partner !== 'nuannuan' || restored[1].game.partner !== null) throw Error('File backup lost player independence');
    await freshContext.close();
    if (errors.length) throw Error(errors.join('\n'));
    console.log(`${name}: file:// startup, guide keyboard input, save reload, two-player download/import in a fresh context and ${decoded} audio decodes passed.`);
  } finally { await browser.close(); }
}
