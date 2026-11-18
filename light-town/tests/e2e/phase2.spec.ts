import { selectFirstPlayer } from './helpers';
import { expect, test, type Page } from '@playwright/test';
import { onboardedSave, readSave, seedSave, seedStorage } from './helpers';
import { readFileSync } from 'node:fs';
import { BACKUP_KEY, SAVE_KEY } from '../../src/core/save/storage';
import type { P2TaskState } from '../../src/core/phase2/types';
import type { SaveData } from '../../src/core/types';

function p2Task(save: SaveData): P2TaskState | null {
  return save.activeTask && save.activeTask.variant === 'phase2' ? save.activeTask.task : null;
}

const fixtureV1 = JSON.parse(readFileSync(new URL('../fixtures/phase1-save-v1.json', import.meta.url), 'utf8')) as Record<string, unknown>;

/** 恢复到可输入状态：处理教学卡与暂停面板（自动暂停/后台暂停都可能出现）。 */
async function ensureActive(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) {
    const know = page.getByRole('button', { name: '知道了' });
    if (await know.isVisible().catch(() => false)) {
      await know.click();
      continue;
    }
    const resume = page.locator('.ready-panel button');
    if (await resume.isVisible().catch(() => false)) {
      await resume.click();
      await page.waitForTimeout(200);
      continue;
    }
    // 开场确认（对话框里的开始）
    const introStart = page.getByRole('button', { name: '开始', exact: true });
    if (await introStart.isVisible().catch(() => false)) {
      await introStart.click();
      await page.waitForTimeout(200);
      continue;
    }
    break;
  }
}

/** 等待可输入后填入答案并按 Enter。 */
async function submitAnswer(page: Page, text: string): Promise<void> {
  await ensureActive(page);
  await page.locator('.task-input').fill(text);
  await page.keyboard.press('Enter');
}

/** 读取当前题目显示的目标文本（中文取第一个字；英文拼接所有字符）。 */
async function displayedTarget(page: Page): Promise<string> {
  const zh = await page.locator('.task-target__char').first().textContent({ timeout: 400 }).catch(() => null);
  if (zh) return zh;
  const parts = await page.locator('.task-target__latin').allTextContents();
  return parts.join('');
}

async function enterResidents(page: Page): Promise<void> {
  await page.goto('/');
  await selectFirstPlayer(page);
  await page.getByRole('button', { name: '继续点亮' }).click();
  await page.getByRole('button', { name: '居民任务' }).click();
  await expect(page.getByRole('heading', { name: '居民任务', level: 1 })).toBeVisible();
}

async function openZhRoute(page: Page): Promise<void> {
  await enterResidents(page);
  await page.getByRole('button', { name: '故事任务' }).nth(1).click();
  await expect(page.getByRole('heading', { name: '中文故事任务', level: 1 })).toBeVisible();
}

async function startFirstZhStory(page: Page): Promise<void> {
  await openZhRoute(page);
  await page.getByRole('button', { name: '看这个任务' }).click();
  await expect(page.getByRole('heading', { name: '小灯屋·初次帮忙', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: '开始任务' }).click();
}

/** 通过三张引导卡与开场进入练习；随后的教学卡/暂停面板由 ensureActive 处理。 */
async function beginPractice(page: Page): Promise<void> {
  await page.getByRole('button', { name: '下一张' }).click();
  await page.getByRole('button', { name: '下一张' }).click();
  await page.getByRole('button', { name: '看任务' }).click();
  // 开场确认（进入 ready 面板）
  await page.getByRole('button', { name: '开始', exact: true }).click();
  await ensureActive(page);
  await expect(page.locator('.task-input')).toBeEnabled({ timeout: 15_000 });
}

test.describe('第二阶段：居民任务', () => {
  test.describe.configure({ mode: 'serial' });
  test('C02 新档进入第二阶段：任一路线第一项可开始，未点亮建筑可接任务', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await openZhRoute(page);
    // 推荐下一项进入预览，而非自动开始；未点亮建筑也可接任务。
    await expect(page.getByText('已完成 0/36')).toBeVisible();
    await expect(page.getByRole('button', { name: '看这个任务' })).toBeVisible();
    await expect(page.getByText('待开放').first()).toBeVisible();
  });

  test('C03 完成中文第 1 题：进度推进、learned 标记、空提交不计错', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await startFirstZhStory(page);
    await beginPractice(page);
    const target1 = await displayedTarget(page);
    await submitAnswer(page, target1);
    await expect(page.locator('.task-progress')).toContainText('题 2/12');
    const save = await readSave(page);
    const firstId = p2Task(save)?.plan[0];
    expect(save.phase2.exposed[firstId ?? '']).toBe(true);
    expect(save.phase2.learned[firstId ?? '']).toBe(true);
    expect(save.phase2.stats['zh:story'].items).toBe(1);
    expect(save.phase2.stats['zh:story'].firstSubmittedItems).toBe(1);
    expect(save.phase2.stats['zh:story'].firstCorrectItems).toBe(1);
    // 空提交只提示不计错。
    await page.keyboard.press('Enter');
    await expect(page.getByText('先输入内容')).toBeVisible();
    const save2 = await readSave(page);
    expect(save2.phase2.stats['zh:story'].wrongSubmissions).toBe(0);
  });

  test('I01 英文严格匹配：hello 通过、Hello 不通过并显示差异', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await enterResidents(page);
    await page.getByRole('button', { name: '故事任务' }).first().click();
    await expect(page.getByRole('heading', { name: '英文故事任务', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: '看这个任务' }).click();
    await page.getByRole('button', { name: '开始任务' }).click();
    await beginPractice(page);
    const target1 = await displayedTarget(page);
    await submitAnswer(page, target1);
    await expect(page.locator('.task-progress')).toContainText('题 2/12');
    // 大小写错误：保留输入并显示差异，计一次未匹配。
    await page.locator('.task-input').fill('Hello');
    await page.keyboard.press('Enter');
    await expect(page.locator('.task-diff')).toBeVisible();
    const save = await readSave(page);
    expect(save.phase2.stats['en:story'].wrongSubmissions).toBe(1);
    expect(save.phase2.stats['en:story'].items).toBe(1);
    // 两题各有一次首次有效提交；只有第 1 题首次正确。
    expect(save.phase2.stats['en:story'].firstSubmittedItems).toBe(2);
    expect(save.phase2.stats['en:story'].firstCorrectItems).toBe(1);
  });

  test('S02 帮助按钮计入求助题数（完成一题且使用帮助）', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await startFirstZhStory(page);
    await beginPractice(page);
    await page.getByRole('button', { name: '帮助' }).click();
    await expect(page.getByRole('heading', { name: '帮助' })).toBeVisible();
    await page.getByRole('button', { name: '继续练习' }).click();
    const target1 = await displayedTarget(page);
    await submitAnswer(page, target1);
    const save = await readSave(page);
    expect(save.phase2.stats['zh:story'].helpItems).toBe(1);
    expect(save.phase2.stats['zh:story'].unaidedCorrectItems).toBe(0);
  });

  test('暂停（切后台/失焦）后恢复面板必须出现：不允许输入框禁用且无路可走', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await startFirstZhStory(page);
    await beginPractice(page);
    const input = page.locator('.task-input');
    // 真实逐键输入可用（非 fill）
    await input.click();
    await page.keyboard.type('abc', { delay: 60 });
    await expect(input).toHaveValue('abc');
    // 窗口 blur（点菜单栏切输入法/切应用都会触发）：面板出现，点继续后可继续输入
    await page.evaluate(() => window.dispatchEvent(new Event('blur')));
    await expect(page.locator('.ready-panel')).toBeVisible();
    await expect(input).toBeDisabled();
    await page.locator('.ready-panel button').click();
    await expect(input).toBeEnabled();
    await expect(input).toHaveValue('abc'); // 草稿保留
    // visibilitychange 路径同样恢复
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(page.locator('.ready-panel')).toBeVisible();
    await page.locator('.ready-panel button').click();
    await expect(input).toBeEnabled();
  });

  test('R01 首次故事完成得 30 币；R02 刷新结果页不重复发奖', async ({ page, context }) => {
    test.setTimeout(180_000);
    await seedSave(context, onboardedSave());
    await startFirstZhStory(page);
    await beginPractice(page);
    // zh-1-lamp-house 下调后 12 题全部来自 人/口/手 三个重点字。
    for (let i = 0; i < 12; i++) {
      const char = (await page.locator('.task-target__char').first().textContent()) ?? '';
      await submitAnswer(page, char);
      const stepButton = page.getByRole('button', { name: '继续', exact: true });
      if (await stepButton.isVisible().catch(() => false)) {
        await stepButton.click();
      }
    }
    await expect(page.getByRole('heading', { name: '任务完成', level: 1 })).toBeVisible();
    await expect(page.getByText('+35').first()).toBeVisible(); // 首次 30 + 当日小目标 5
    const saveAfter = await readSave(page);
    expect(saveAfter.coins).toBe(35);
    expect(saveAfter.lastTaskResult?.coins).toBe(30);
    expect(saveAfter.lastTaskResult?.instanceId).toBeTruthy();
    const settledInstanceId = saveAfter.lastTaskResult!.instanceId;
    // 继续故事 → 下一项预览（推荐下一项进入预览而非自动开始）。
    await page.getByRole('button', { name: '继续故事' }).click();
    await expect(page.getByRole('heading', { name: '面包坊·初次帮忙', level: 1 })).toBeVisible();
    // 刷新（回到首页，与第一阶段一致）：不重复发奖、旧实例不能重结算。
    await page.reload();
  await selectFirstPlayer(page);
    await expect(page.getByRole('button', { name: '继续点亮' })).toBeVisible();
    const saveReloaded = await readSave(page);
    expect(saveReloaded.coins).toBe(35);
    expect(saveReloaded.lastTaskResult?.instanceId).toBe(settledInstanceId);
    expect(saveReloaded.activeTask).toBeNull();
  });

  test('I06 粘贴被拦截且不计错；draft 刷新恢复（C04）', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await startFirstZhStory(page);
    await beginPractice(page);
    const target1 = await displayedTarget(page);
    await ensureActive(page);
    await page.locator('.task-input').fill(target1);
    await page.evaluate(() => {
      const input = document.querySelector('.task-input') as HTMLInputElement;
      const dt = new DataTransfer();
      dt.setData('text/plain', '测试');
      input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await expect(page.getByText('粘贴不计入错误')).toBeVisible();
    // draft 保存（300ms trailing）+ 刷新恢复（刷新回到首页，从“继续练习”回到任务）。
    await page.waitForTimeout(500);
    await page.reload();
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await expect(page.getByText('居民任务还没完成')).toBeVisible();
    await page.getByRole('button', { name: '继续练习' }).click();
    await ensureActive(page);
    await expect(page.locator('.task-input')).toHaveValue(target1);
    const save = await readSave(page);
    expect(p2Task(save)?.items[0]?.draft).toBe(target1);
  });

  test('R03 放弃旧任务：无完成奖励，已提交表现保留；三选一对话框', async ({ page, context }) => {
    // 首个故事已完成（委托解锁），正在进行第 2 个故事。
    const save0 = onboardedSave();
    save0.phase2.storyDone = ['zh-1-lamp-house'];
    save0.phase2.learned = { 'zh-001': true, 'zh-002': true, 'zh-003': true };
    save0.phase2.teaching = { intro: true, 'zh:selection': true };
    save0.coins = 30;
    await seedSave(context, save0);
    await page.goto('/');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await page.getByRole('button', { name: '居民任务' }).click();
    await page.getByRole('button', { name: '故事任务' }).nth(1).click();
    // 推荐下一项（面包坊）从预览开始。
    await page.getByRole('button', { name: '看这个任务' }).click();
    await page.getByRole('button', { name: '开始任务' }).click();
    await ensureActive(page);
    const target1 = await displayedTarget(page);
    await submitAnswer(page, target1);
    // 从菜单退出，再开始委托 → 三选一。
    await page.getByRole('button', { name: '暂停' }).click();
    await page.getByRole('button', { name: '保存并退出' }).click();
    await expect(page.getByRole('heading', { name: '居民任务', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: '居民委托' }).nth(1).click();
    await expect(page.getByRole('heading', { name: '中文居民委托', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: '开始任务' })).toBeEnabled();
    await page.getByRole('button', { name: '开始任务' }).click();
    await expect(page.getByRole('heading', { name: '还有一个任务没有完成' })).toBeVisible();
    await page.getByRole('button', { name: '放弃并开始新的' }).click();
    await expect(page.getByRole('heading', { name: '中文居民委托', level: 2 })).toBeVisible();
    await ensureActive(page);
    const save = await readSave(page);
    expect(save.coins).toBe(30); // 未完成的第 2 个故事不发奖
    expect(save.phase2.stats['zh:story'].items).toBe(1); // 已提交表现保留
    expect(p2Task(save)?.kind).toBe('errand');
    expect(save.phase2.storyDone).toEqual(['zh-1-lamp-house']);
  });

  test('激励目标（2026-11-17）：每日小目标、字词图鉴与下一目标卡可见', async ({ page, context }) => {
    const save0 = onboardedSave();
    save0.phase2.learned = { 'zh-001': true, 'zh-002': true, 'zh-003': true };
    await seedSave(context, save0);
    await page.goto('/');
  await selectFirstPlayer(page);
    // 首页目标卡：最便宜的未购商品 + 攒币进度
    await expect(page.locator('.goal-card')).toContainText('下一个目标');
    await expect(page.locator('.goal-card')).toContainText('还差');
    await page.getByRole('button', { name: '继续点亮' }).click();
    await page.getByRole('button', { name: '居民任务' }).click();
    // 每日小目标打卡卡
    await expect(page.locator('.residents__daily')).toContainText('今日小目标');
    // 字词图鉴入口与页面：学过的点亮，没学的显示 ？
    await page.getByRole('button', { name: /字词图鉴/ }).click();
    await expect(page.getByRole('heading', { name: '字词图鉴', level: 1 })).toBeVisible();
    await expect(page.locator('.album__overview')).toContainText('已收集 3/180');
    await expect(page.locator('.album__chip--learned').first()).toHaveText('人');
    await expect(page.locator('.album__chip--unknown').first()).toBeVisible();
    // 居民入住标记：把小灯屋的 6 个故事标记完成（seedStorage 同页只生效一次，这里直改存档再刷新）
    await page.evaluate(() => {
      const value = JSON.parse(localStorage.getItem('lighttown.save')!);
      const game = value.schemaVersion === 3 ? value.profiles[0].game : value;
      game.phase2.storyDone = ['zh-1-lamp-house', 'zh-2-lamp-house', 'zh-3-lamp-house', 'en-1-lamp-house', 'en-2-lamp-house', 'en-3-lamp-house'];
      localStorage.setItem('lighttown.save', JSON.stringify(value));
    });
    await page.goto('/');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await expect(page.locator('.building-chip__resident').first()).toBeVisible();
  });

  test('P01 真实旧档迁移：未完成第一阶段关可继续', async ({ page, context }) => {
    await seedStorage(context, {
      [SAVE_KEY]: JSON.stringify(fixtureV1),
      [BACKUP_KEY]: null,
    });
    await page.goto('/');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await expect(page.getByRole('heading', { name: '点亮小镇', level: 1 })).toBeVisible();
    await expect(page.getByText('还有一关没有完成')).toBeVisible();
    const save = await readSave(page);
    expect(save.schemaVersion).toBe(2);
    expect(save.coins).toBe(fixtureV1.coins);
    expect(save.owned).toEqual(['leaf-hat']);
    expect(save.activeTask?.variant).toBe('phase1');
    await page.getByRole('button', { name: '居民任务' }).click();
    await expect(page.getByRole('heading', { name: '居民任务', level: 1 })).toBeVisible();
    expect((await readSave(page)).phase2.storyDone).toEqual([]);
  });

  test('家长页显示第二阶段分语言统计（空数据为 —）', async ({ page, context }) => {
    await seedSave(context, onboardedSave());
    await page.goto('/');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await page.getByRole('button', { name: '家长' }).click();
    await expect(page.getByRole('heading', { name: '第二阶段（居民任务）' })).toBeVisible();
    await expect(page.getByText('中文 · 故事任务')).toBeVisible();
    const row = page.locator('tr', { hasText: '中文 · 故事任务' });
    await expect(row.getByText('—').first()).toBeVisible();
  });

  test('C06 委托在首个故事完成后开放；专项显示类别与锁定原因', async ({ page, context }) => {
    const save0 = onboardedSave();
    save0.phase2.storyDone = ['zh-1-lamp-house'];
    save0.phase2.learned = { 'zh-001': true, 'zh-002': true, 'zh-003': true };
    save0.phase2.teaching = { intro: true, 'zh:selection': true };
    await seedSave(context, save0);
    await enterResidents(page);
    await page.getByRole('button', { name: '居民委托' }).nth(1).click();
    await expect(page.getByRole('heading', { name: '中文居民委托', level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: '开始任务' })).toBeEnabled();
    // 返回居民任务首页，进入专项页。
    await page.getByRole('button', { name: '居民任务' }).click();
    await expect(page.getByRole('heading', { name: '居民任务', level: 1 })).toBeVisible();
    await page.getByRole('button', { name: '专项练习' }).nth(1).click();
    await expect(page.getByRole('heading', { name: '中文专项练习', level: 1 })).toBeVisible();
    await expect(page.getByText('可练内容 3 项')).toBeVisible();
    await expect(page.getByText('先完成一个相关故事任务吧，学过的内容会出现在这里。').first()).toBeVisible();
  });
});
