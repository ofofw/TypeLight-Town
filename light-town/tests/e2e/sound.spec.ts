import { selectFirstPlayer } from './helpers';
import { expect, test } from '@playwright/test';
import { onboardedSave, readSave, seedSave, startLightLevel, typeTargets } from './helpers';

test.describe('sound (E01/E02/E09)', () => {
  test('the first click starts music and the first voice line; the files decode', async ({ page }) => {
    await page.goto('./');
    const music = page.waitForResponse((r) => r.url().endsWith('audio/music/town-loop.m4a') && r.ok());
    const voice = page.waitForResponse((r) => r.url().endsWith('audio/voice/choosePartner.m4a') && r.ok());
    await selectFirstPlayer(page);
    await page.getByRole('button', { name: '开始点亮' }).click();
    await music;
    await voice;
    await page.waitForTimeout(1500);
    await expect(page.getByRole('button', { name: /声音没加载好|点这里开启声音/ })).toHaveCount(0);
  });

  test('sound files that fail to load: the game goes on and offers a retry', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await page.route('**/audio/**', (route) => route.abort());
    await page.goto('./');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    const retry = page.getByRole('button', { name: '声音没加载好，点这里重试' });
    await expect(retry).toBeVisible();

    await startLightLevel(page);
    await typeTargets(page);
    await expect(page.getByRole('heading', { name: '完成啦' })).toBeVisible();
    expect((await readSave(page)).buildings[0]).toBe(1);

    await page.unroute('**/audio/**');
    await page.getByRole('button', { name: '声音没加载好，点这里重试' }).click();
    await expect(page.getByRole('button', { name: '声音没加载好，点这里重试' })).toHaveCount(0);
  });

  test('sound settings are saved; muting keeps the channel settings', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await page.goto('./');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await page.getByRole('button', { name: '设置' }).click();
    await page.getByRole('switch', { name: /^音乐/ }).click();
    await page.getByLabel('语音音量').fill('40');
    await page.getByRole('button', { name: '声音', exact: true }).click();
    let s = (await readSave(page)).settings;
    expect(s).toMatchObject({ music: false, voiceVolume: 0.4, masterMute: true, sfx: true, sfxVolume: 0.4 });
    await page.reload();
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await page.getByRole('button', { name: '已静音' }).click();
    s = (await readSave(page)).settings;
    expect(s).toMatchObject({ music: false, voiceVolume: 0.4, masterMute: false, sfx: true });
  });
});
