import { selectFirstPlayer } from './helpers';
import { expect, test, type Page } from '@playwright/test';
import { MAX_STAGE } from '../../src/config/keys';
import { activeLevel, keyName, onboardedSave, passIntros, seedSave, typeTargets } from './helpers';

async function openRouteLevel(page: Page, mode: '连接灯带' | '点亮招牌'): Promise<void> {
  await page.goto('./');
  await selectFirstPlayer(page);
  await page.getByRole('button', { name: '继续点亮' }).click();
  await page.locator('.town-nav').getByRole('button', { name: '学习路线' }).click();
  await page.locator('.stage-card', { hasText: `第 ${MAX_STAGE} 阶` }).getByRole('button', { name: mode }).click();
  await passIntros(page);
}

const shown = (page: Page) => page.locator('.target-box .target-char').allTextContents();

test.describe('play modes group the targets and move on by themselves (B10)', () => {
  test.beforeEach(async ({ context }) => {
    const save = onboardedSave();
    save.course = { ...save.course, stage: MAX_STAGE, introSeen: MAX_STAGE };
    await seedSave(context, save);
  });

  test('灯带: three letters at a time; a finished group connects a segment and the next group appears', async ({ page }) => {
    await openRouteLevel(page, '连接灯带');
    const level = await activeLevel(page);
    expect(level.mode).toBe('strip');
    await expect(page.locator('.light-strip__group')).toHaveCount(8);
    const text = (chars: string[]) => chars.map((c) => (c === ' ' ? '空格' : c));
    expect(await shown(page)).toEqual(text(level.targets.slice(0, 3)));

    await typeTargets(page, 2);
    await expect(page.locator('.light-strip__group--done')).toHaveCount(0);
    await typeTargets(page, 1);
    await expect(page.locator('.light-strip__group--done')).toHaveCount(1);
    expect(await shown(page)).toEqual(text(level.targets.slice(3, 6)));
    await expect(page.locator('.target-box .target-char--current')).toHaveCount(1);
  });

  test('招牌: one word at a time with a space after each of the first five words; a finished word lights its sign', async ({ page }) => {
    await openRouteLevel(page, '点亮招牌');
    const level = await activeLevel(page);
    expect(level.mode).toBe('sign');
    const words = level.words!;
    expect(words).toHaveLength(6);
    await expect(page.locator('.signboard')).toHaveCount(6);
    expect(level.targets.join('')).toBe(words.slice(0, 5).map((w) => `${w} `).join('') + words[5]);

    await expect(page.locator('.target-box .target-char')).toHaveCount(words[0].length + 1);
    for (const ch of [...words[0]]) await page.keyboard.press(keyName(ch));
    await expect(page.locator('.signboard--lit')).toHaveCount(0);
    await page.keyboard.press('Space');
    await expect(page.locator('.signboard--lit')).toHaveCount(1);
    await expect(page.locator('.signboard--current')).toHaveText(words[1]);
    await expect(page.locator('.target-box .target-char')).toHaveCount(words[1].length + 1);

    await typeTargets(page);
    await expect(page.getByRole('heading', { name: '完成啦' })).toBeVisible();
  });
});
