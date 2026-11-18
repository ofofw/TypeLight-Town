import { selectFirstPlayer } from './helpers';
import { expect, test, type Page } from '@playwright/test';
import { MAX_STAGE } from '../../src/config/keys';
import { activeLevel, keyName, onboardedSave, seedSave, startLightLevel, typeTargets } from './helpers';

async function openLevel(page: Page) {
  await page.goto('./');
  await selectFirstPlayer(page);
  await page.getByRole('button', { name: '继续点亮' }).click();
  await startLightLevel(page);
}

interface KeyInit {
  key: string;
  code: string;
  repeat?: boolean;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  isComposing?: boolean;
  keyCode?: number;
  modifierCapsLock?: boolean;
}

function dispatchKey(page: Page, init: KeyInit) {
  return page.evaluate((i) => {
    const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...i });
    document.body.dispatchEvent(e);
    return e.defaultPrevented;
  }, init);
}

test.describe('keyboard input rules (B01–B04)', () => {
  test.beforeEach(async ({ context }) => {
    await seedSave(context, onboardedSave());
  });

  test('upper case counts as correct and shows a gentle note', async ({ page }) => {
    await openLevel(page);
    const level = await activeLevel(page);
    await page.keyboard.press(`Shift+${level.targets[0].toUpperCase()}`);
    await expect(page.locator('.bulb--on')).toHaveCount(1);
    await expect(page.getByText('不用按 Shift 键')).toBeVisible();

    const next = level.targets[1];
    await dispatchKey(page, { key: next.toUpperCase(), code: `Key${next.toUpperCase()}`, modifierCapsLock: true });
    await expect(page.locator('.bulb--on')).toHaveCount(2);
    await expect(page.getByText('大写锁定开着')).toBeVisible();
    expect((await activeLevel(page)).attempts).toBe(2);
  });

  test('digits and punctuation give a hint but are not attempts', async ({ page }) => {
    await openLevel(page);
    await page.keyboard.press('3');
    await expect(page.getByText('这里只按字母键')).toBeVisible();
    await page.keyboard.press(',');
    const level = await activeLevel(page);
    expect(level.attempts).toBe(0);
    expect(level.pos).toBe(0);
  });

  test('IME composition is not scored and asks for English input', async ({ page }) => {
    await openLevel(page);
    await dispatchKey(page, { key: 'Process', code: 'KeyF', isComposing: true, keyCode: 229 });
    await expect(page.getByText('现在是中文输入法')).toBeVisible();
    expect((await activeLevel(page)).attempts).toBe(0);
  });

  test('auto-repeat, modifier shortcuts and pasted text are ignored; shortcuts are not blocked', async ({ page }) => {
    await openLevel(page);
    const target = (await activeLevel(page)).targets[0];
    await dispatchKey(page, { key: target, code: `Key${target.toUpperCase()}`, repeat: true });
    const prevented = await dispatchKey(page, { key: target, code: `Key${target.toUpperCase()}`, metaKey: true });
    await dispatchKey(page, { key: target, code: `Key${target.toUpperCase()}`, ctrlKey: true });
    await dispatchKey(page, { key: target, code: `Key${target.toUpperCase()}`, altKey: true });
    await page.keyboard.insertText('fjfj');
    expect(prevented, 'Cmd shortcuts keep their default action').toBe(false);
    const level = await activeLevel(page);
    expect(level.attempts).toBe(0);
    expect(level.pos).toBe(0);
  });

  test('wrong keys keep the target and count as errors on the expected key', async ({ page }) => {
    await openLevel(page);
    const level = await activeLevel(page);
    const wrong = 'abcdefghijklmnopqrstuvwxyz'.split('').find((k) => k !== level.targets[0])!;
    await page.keyboard.press(wrong);
    await page.keyboard.press(wrong);
    await expect(page.locator('.key--enhanced')).toHaveCount(1);
    const after = await activeLevel(page);
    expect(after.pos).toBe(0);
    expect(after.attempts).toBe(2);
    expect(after.keyCounts[level.targets[0]]).toEqual({ a: 2, c: 0 });
    await page.keyboard.press(keyName(level.targets[0]));
    await expect(page.locator('.bulb--on')).toHaveCount(1);
    await expect(page.locator('.key--enhanced'), 'a correct key brings back the basic hint').toHaveCount(0);
  });

  test('leaving and re-entering practice does not stack key listeners (E07)', async ({ page }) => {
    await openLevel(page);
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').getByRole('button', { name: '回小镇' }).click();
      await page.locator('.resume-banner').getByRole('button', { name: '继续上次' }).click();
      await page.locator('.ready-panel').getByRole('button').click();
    }
    const level = await activeLevel(page);
    await page.keyboard.press(keyName(level.targets[level.pos]));
    const after = await activeLevel(page);
    expect(after.attempts).toBe(level.attempts + 1);
    expect(after.pos).toBe(level.pos + 1);
  });

  test('visual feedback follows a key press within 100 ms', async ({ page }, testInfo) => {
    await openLevel(page);
    await page.evaluate(() => {
      const w = window as unknown as { __t0: number; __lat: { dom: number; frame: number }[] };
      w.__lat = [];
      window.addEventListener('keydown', () => (w.__t0 = performance.now()), true);
      const strip = document.querySelector('.light-strip')!;
      new MutationObserver(() => {
        const dom = performance.now() - w.__t0;
        requestAnimationFrame(() => requestAnimationFrame(() => w.__lat.push({ dom, frame: performance.now() - w.__t0 })));
      }).observe(strip, { subtree: true, attributes: true, attributeFilter: ['class'] });
    });
    const level = await activeLevel(page);
    for (const ch of level.targets.slice(0, 20)) {
      await page.keyboard.press(keyName(ch));
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(200);
    const lat = await page.evaluate(() => (window as unknown as { __lat: { dom: number; frame: number }[] }).__lat);
    expect(lat.length).toBeGreaterThanOrEqual(20);
    const maxDom = Math.max(...lat.map((l) => l.dom));
    const maxFrame = Math.max(...lat.map((l) => l.frame));
    const avgFrame = lat.reduce((a, l) => a + l.frame, 0) / lat.length;
    testInfo.annotations.push({
      type: 'latency',
      description: `${testInfo.project.name}: DOM update max ${maxDom.toFixed(1)} ms; painted frame avg ${avgFrame.toFixed(1)} ms, max ${maxFrame.toFixed(1)} ms (n=${lat.length})`,
    });
    console.log(`[latency] ${testInfo.project.name}: dom max ${maxDom.toFixed(1)} ms, frame avg ${avgFrame.toFixed(1)} / max ${maxFrame.toFixed(1)} ms`);
    expect(maxFrame).toBeLessThan(100);
  });
});

test('Space types a space target without scrolling; in the pause menu Space presses the focused button (B05)', async ({ page, context }) => {
  const save = onboardedSave();
  save.course = { ...save.course, stage: MAX_STAGE, introSeen: MAX_STAGE };
  await seedSave(context, save);
  await page.setViewportSize({ width: 1024, height: 500 });
  await openLevel(page);
  const level = await activeLevel(page);
  const firstSpace = level.targets.indexOf(' ');
  expect(firstSpace).toBeGreaterThanOrEqual(0);
  await typeTargets(page, firstSpace);
  const before = await page.evaluate(() => window.scrollY);
  await page.keyboard.press('Space');
  expect(await page.evaluate(() => window.scrollY), 'the page does not scroll').toBe(before);
  expect((await activeLevel(page)).pos).toBe(firstSpace + 1);

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: '已暂停' })).toBeVisible();
  await page.keyboard.press('Space');
  await expect(page.getByRole('dialog')).toBeHidden();
  const after = await activeLevel(page);
  expect(after.paused).toBe(false);
  expect(after.pos, 'Space in the menu is not typed into the level').toBe(firstSpace + 1);
});
