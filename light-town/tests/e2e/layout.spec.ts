import { selectFirstPlayer } from './helpers';
import { expect, test, type Page } from '@playwright/test';
import { festivalSave, onboardedSave, seedSave, startLightLevel, tabTo, typeTargets } from './helpers';

interface Problem {
  page: string;
  issue: string;
}

/** Checks the requirements that apply to every screen: no sideways scrolling, 44 px touch targets, readable text. */
async function audit(page: Page, name: string): Promise<Problem[]> {
  await page.waitForTimeout(150);
  const found = await page.evaluate(() => {
    const out: string[] = [];
    const doc = document.scrollingElement!;
    if (doc.scrollWidth > window.innerWidth + 1) out.push(`horizontal overflow ${doc.scrollWidth} > ${window.innerWidth}`);
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none';
    };
    const label = (el: Element) => (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24);
    for (const el of document.querySelectorAll('button, a[href], select, input, summary, [role="switch"], [role="radio"]')) {
      if (!visible(el) || el.closest('[inert]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 43.5 || r.height < 43.5) out.push(`small target ${Math.round(r.width)}x${Math.round(r.height)} "${label(el)}"`);
    }
    for (const el of document.querySelectorAll('p, li, dd, td, dt, th, figcaption, label, legend')) {
      if (!visible(el) || !el.textContent?.trim()) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 17.9) out.push(`small text ${size}px "${label(el)}"`);
    }
    for (const el of document.querySelectorAll('.target-char, .target-letter')) {
      if (!visible(el)) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 40) out.push(`target text ${size}px`);
    }
    return out;
  });
  return found.map((issue) => ({ page: name, issue }));
}

const VIEWPORTS = [
  { name: 'mac-1280x800', width: 1280, height: 800 },
  { name: 'ipad-landscape-1024x768', width: 1024, height: 768 },
  { name: 'ipad-portrait-768x1024', width: 768, height: 1024 },
  { name: 'zoom200-640x400', width: 640, height: 400 },
];

for (const vp of VIEWPORTS) {
  test(`layout audit ${vp.name} @layout`, async ({ page, context }, testInfo) => {
    test.skip(testInfo.project.name === 'ipad-sim' && vp.name !== 'ipad-landscape-1024x768', 'iPad simulation runs its own viewport only');
    if (testInfo.project.name !== 'ipad-sim') await page.setViewportSize({ width: vp.width, height: vp.height });
    const save = festivalSave();
    save.buildings = save.buildings.map((_, i) => (i < 4 ? 6 : i === 4 ? 2 : 0));
    save.currentBuilding = 4;
    save.festival = { unlocked: false, round: null, roundsCompleted: 0 };
    await seedSave(context, save);
    const problems: Problem[] = [];

    await page.goto('./');
  await selectFirstPlayer(page);
    problems.push(...(await audit(page, 'home')));
    await page.getByRole('button', { name: '继续点亮' }).click();
    problems.push(...(await audit(page, 'town')));
    await startLightLevel(page);
    problems.push(...(await audit(page, 'practice')));
    await page.keyboard.press('Escape');
    problems.push(...(await audit(page, 'pause dialog')));
    await page.getByRole('dialog').getByRole('button', { name: '继续' }).click();
    await typeTargets(page);
    await page.waitForTimeout(2200);
    problems.push(...(await audit(page, 'result')));
    await page.getByRole('button', { name: '结束本次' }).click();
    problems.push(...(await audit(page, 'summary')));
    await page.getByRole('button', { name: '回小镇' }).click();

    for (const [button, name] of [
      ['衣柜', 'wardrobe'],
      ['学习路线', 'route'],
      ['灯光节', 'festival'],
      ['家长', 'parent'],
      ['设置', 'settings'],
    ] as const) {
      await page.locator('.town-nav').getByRole('button', { name: button }).click();
      problems.push(...(await audit(page, name)));
      await page.screenshot({ path: testInfo.outputPath(`${vp.name}-${name}.png`), fullPage: true });
      await page.getByRole('button', { name: '小镇' }).first().click();
    }
    expect(problems, JSON.stringify(problems, null, 1)).toEqual([]);
  });
}

test('festival page layout when open @layout', async ({ page, context }) => {
  await seedSave(context, festivalSave());
  await page.goto('./');
  await selectFirstPlayer(page);
  await page.getByRole('button', { name: '继续点亮' }).click();
  await page.locator('.town-nav').getByRole('button', { name: '灯光节' }).click();
  const problems = await audit(page, 'festival-open');
  expect(problems, JSON.stringify(problems, null, 1)).toEqual([]);
});

test('reduced motion: system preference and the in-game switch', async ({ page, context }) => {
  await seedSave(context, onboardedSave());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await selectFirstPlayer(page);
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
  await page.getByRole('button', { name: '继续点亮' }).click();
  await page.getByRole('button', { name: '设置' }).click();
  await page.getByRole('switch', { name: /减少动画/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length);
  expect(running).toBe(0);
});

test('keyboard only: reach and use the main actions with Tab and Enter', async ({ page, context }) => {
  await seedSave(context, onboardedSave());
  await page.goto('./');
  await selectFirstPlayer(page);
  await tabTo(page, page.getByRole('button', { name: '继续点亮' }), 6);
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '现在点亮：小灯屋' })).toBeVisible();
  const goal = page.locator('.town__goal').getByRole('button', { name: '继续点亮' });
  await tabTo(page, goal);
  const outline = await goal.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.locator('.ready-panel').getByRole('button', { name: '开始' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('.target-box')).toBeVisible();
});
