import { expect, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { BUILDING_COUNT, STAGES_PER_BUILDING } from '../../src/config/buildings';
import { MAX_STAGE } from '../../src/config/keys';
import { choosePartner, createNewSave, finishOnboarding, p1Level } from '../../src/core/game';
import { BACKUP_KEY, SAVE_KEY } from '../../src/core/save/storage';
import type { LevelState, SaveData } from '../../src/core/types';

export { BACKUP_KEY, SAVE_KEY };

/** A player who has picked a partner, finished the first-run guide and seen every mode introduction. */
export function onboardedSave(now = Date.now()): SaveData {
  const s = finishOnboarding(choosePartner(createNewSave(now), 'nuannuan'));
  s.seen = { ...s.seen, 'mode:keys': true, 'mode:strip': true, 'mode:sign': true, 'mode:sign-space': true };
  return s;
}

/** Every building lit, festival open, all course stages opened. */
export function festivalSave(now = Date.now()): SaveData {
  const s = onboardedSave(now);
  s.buildings = Array.from({ length: BUILDING_COUNT }, () => STAGES_PER_BUILDING);
  s.currentBuilding = BUILDING_COUNT;
  s.festival = { ...s.festival, unlocked: true };
  s.course = { ...s.course, stage: MAX_STAGE, introSeen: MAX_STAGE };
  s.coins = 500;
  return s;
}

/**
 * Writes storage entries before the app's first script runs (once per tab, so reloads keep the app's own writes).
 * This is a test fixture only; the game itself has no way to set progress.
 */
export async function seedStorage(context: BrowserContext, entries: Record<string, string | null>): Promise<void> {
  await context.addInitScript((e: Record<string, string | null>) => {
    if (sessionStorage.getItem('__e2e_seeded')) return;
    sessionStorage.setItem('__e2e_seeded', '1');
    for (const [k, v] of Object.entries(e)) {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    }
  }, entries);
}

export async function seedSave(context: BrowserContext, save: SaveData): Promise<void> {
  await seedStorage(context, { [SAVE_KEY]: JSON.stringify(save) });
}

export async function readSave(page: Page): Promise<SaveData> {
  return page.evaluate((key) => { const value = JSON.parse(localStorage.getItem(key) ?? 'null'); return value?.schemaVersion === 3 ? value.profiles[0].game : value; }, SAVE_KEY);
}

export async function activeLevel(page: Page): Promise<LevelState> {
  const save = await readSave(page);
  const lvl = p1Level(save);
  expect(lvl, 'an active level is saved').not.toBeNull();
  return lvl!;
}

export function keyName(ch: string): string {
  return ch === ' ' ? 'Space' : ch;
}

/** Types the next `count` targets of the active level correctly (all remaining by default). */
export async function typeTargets(page: Page, count = Infinity): Promise<void> {
  const level = await activeLevel(page);
  for (const ch of level.targets.slice(level.pos, level.pos + count)) await page.keyboard.press(keyName(ch));
}

/** From the town page: start the current building level and get past any introduction to the running level. */
export async function startLightLevel(page: Page): Promise<void> {
  await page.locator('.town__goal').getByRole('button', { name: '继续点亮' }).click();
  await passIntros(page);
}

export async function passIntros(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog');
  const start = page.locator('.ready-panel').getByRole('button');
  const target = page.locator('.target-box');
  for (let i = 0; i < 4; i++) {
    await expect(dialog.or(start).or(target).first()).toBeVisible();
    if (await dialog.isVisible()) await dialog.getByRole('button', { name: /开始/ }).last().click();
    else if (await start.isVisible()) await start.click();
    else break;
  }
  await expect(target).toBeVisible();
}

export async function bulbsOn(page: Page): Promise<number> {
  return page.locator('.bulb--on').count();
}

/**
 * Presses Tab until `target` has focus. Safari (WebKit) only moves through buttons with Option+Tab unless the user
 * turned on "Press Tab to highlight each item", so that is what a Safari keyboard user presses.
 */
export async function tabTo(page: Page, target: Locator, maxPresses = 30): Promise<void> {
  const key = page.context().browser()?.browserType().name() === 'webkit' ? 'Alt+Tab' : 'Tab';
  for (let i = 0; i < maxPresses && !(await target.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press(key);
  }
  await expect(target).toBeFocused();
}

/** Every visit requires an explicit player selection. */
export async function selectFirstPlayer(page: Page): Promise<void> {
  await page.getByRole('button', { name: '我是玩家一', exact: true }).click();
}
