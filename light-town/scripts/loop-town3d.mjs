// 阶段 3 闭环验收（生产 preview 构建）：
// 小镇(3D) → 点建筑卡片 → [运镜+淡出] → 练习 → 打完一关 → 结果页 → 继续 → 暂停回小镇 → 验证新灯与聚焦 → 刷新验证存档。
// Usage: node scripts/loop-town3d.mjs [outPrefix] [width] [height]
import { chromium } from '@playwright/test';

const [prefix = 'docs/evidence/3d/loop', w = '1440', h = '900'] = process.argv.slice(2);
const browser = await chromium.launch({ channel: 'chrome' });
const errors = [];
const SAVE_KEY = 'lighttown.save';

const readSave = (page) => page.evaluate((key) => {
  const v = JSON.parse(localStorage.getItem(key) ?? 'null');
  return v?.schemaVersion === 3 ? v.profiles[0].game : v;
});

try {
  const page = await browser.newPage({ viewport: { width: Number(w), height: Number(h) } });
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(`console: ${msg.text()}`); });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'load' });
  await page.getByRole('button', { name: '我是玩家一', exact: true }).click();
  await page.getByRole('button', { name: '开始点亮' }).click();
  const radios = page.getByRole('radio');
  await radios.first().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一步' }).click();
  for (const k of ['f', 'k', 'j', 'f', 'j']) await page.keyboard.press(k);
  await page.getByRole('button', { name: '去小镇' }).click();
  await page.waitForSelector('.town3d canvas', { timeout: 15000 });
  await page.waitForTimeout(2500);

  // 1. 从焦点层卡片进入练习（应有运镜 + 淡出过渡）
  await page.locator('.town3d__chips .building-chip--current').click();
  await page.waitForSelector('.town3d__fade', { timeout: 4000 }).catch(() => errors.push('missing .town3d__fade transition'));
  await page.waitForSelector('.page.practice', { timeout: 15000 });
  // 过引导/准备面板（与 e2e passIntros 同法：对话框按「开始」类按钮）
  const dialog = page.getByRole('dialog');
  const start = page.locator('.ready-panel').getByRole('button');
  const targetBox = page.locator('.target-box');
  for (let i = 0; i < 5; i++) {
    await dialog.or(start).or(targetBox).first().waitFor({ state: 'visible', timeout: 8000 });
    if (await dialog.isVisible()) await dialog.getByRole('button', { name: /开始/ }).last().click();
    else if (await start.isVisible()) await start.click();
    else break;
    await page.waitForTimeout(300);
  }
  await targetBox.waitFor({ state: 'visible', timeout: 10000 });

  // 2. 打完整关（第一阶段关卡存于 activeTask.level）
  const targets = await page.evaluate((key) => {
    const v = JSON.parse(localStorage.getItem(key) ?? 'null');
    const g = v?.schemaVersion === 3 ? v.profiles[0].game : v;
    const lvl = g?.activeTask?.variant === 'phase1' ? g.activeTask.level : null;
    return lvl ? lvl.targets.slice(lvl.pos) : [];
  }, SAVE_KEY);
  if (targets.length === 0) errors.push('no level targets found in save');
  for (const ch of targets) await page.keyboard.press(ch === ' ' ? 'Space' : ch);

  // 3. 结果页：应显示点亮进度
  try {
    await page.waitForSelector('.page.result', { timeout: 15000 });
  } catch {
    await page.screenshot({ path: `${prefix}-debug.png` });
    const dump = await readSave(page);
    const lvl = dump?.activeTask?.variant === 'phase1' ? dump.activeTask.level : null;
    errors.push(`result page never appeared; level pos=${lvl?.pos}/${lvl?.targets.length} page=${await page.locator('.page').evaluate((el) => el.className).catch(() => '?')}`);
    throw new Error('see errors');
  }
  const resultText = await page.locator('.result__building-text').textContent().catch(() => null);
  console.log(`result: ${resultText}`);
  if (!resultText || !resultText.includes('1/6')) errors.push(`unexpected result text: ${resultText}`);
  await page.screenshot({ path: `${prefix}-result.png` });

  // 4. 继续点亮（下一关自动开始）→ 暂停 → 回小镇
  await page.getByRole('button', { name: '继续点亮' }).click();
  await page.waitForSelector('.page.practice', { timeout: 15000 });
  await page.waitForTimeout(600);
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').getByRole('button', { name: '回小镇' }).click();
  await page.waitForSelector('.town3d canvas', { timeout: 15000 });
  await page.waitForTimeout(2600);

  // 5. 小镇：小灯屋卡片应显示 已点亮 1/6；相机聚焦当前建筑（面包坊）
  const chip = await page.locator('.town3d__chips .building-chip').first().textContent();
  console.log(`chip after loop: ${chip}`);
  if (!chip || !chip.includes('已点亮')) errors.push(`chip not lit after loop: ${chip}`);
  await page.screenshot({ path: `${prefix}-town.png` });

  // 6. 存档往返：刷新后仍为 1/6
  await page.reload();
  await page.getByRole('button', { name: '我是玩家一', exact: true }).click();
  await page.getByRole('button', { name: /点亮/ }).first().click();
  await page.waitForSelector('.town3d canvas', { timeout: 15000 });
  await page.waitForTimeout(2200);
  const chipReload = await page.locator('.town3d__chips .building-chip').first().textContent();
  console.log(`chip after reload: ${chipReload}`);
  if (!chipReload || !chipReload.includes('已点亮')) errors.push(`save round-trip lost: ${chipReload}`);
  await page.screenshot({ path: `${prefix}-town-reload.png` });
  console.log('loop artifacts saved');
} finally {
  await browser.close();
}
if (errors.length > 0) {
  for (const e of errors) console.error(e);
  process.exit(1);
}
console.log('no console/page errors');
