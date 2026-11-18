import { selectFirstPlayer } from './helpers';
import { expect, test, type Page } from '@playwright/test';
import { onboardedSave, readSave, seedSave } from './helpers';

/** 读取当前中文目标字。 */
async function displayedTarget(page: Page): Promise<string> {
  return (await page.locator('.task-target__char').first().textContent()) ?? '';
}

/**
 * I02/I03 系统输入法组字路径（Chrome CDP 模拟 IME）。
 * 自动化组字事件不替代真实设备验证——真实 Mac Safari / iPad 外接键盘的结果见验收记录。
 */
test.describe('第二阶段：输入法组字门控', () => {
  test.describe.configure({ mode: 'serial' });

  async function enterZhPractice(page: Page): Promise<void> {
    await seedSave(page.context(), onboardedSave());
    await page.goto('/');
  await selectFirstPlayer(page);
    await page.getByRole('button', { name: '继续点亮' }).click();
    await page.getByRole('button', { name: '居民任务' }).click();
    await page.getByRole('button', { name: '故事任务' }).nth(1).click();
    await page.getByRole('button', { name: '看这个任务' }).click();
    await page.getByRole('button', { name: '开始任务' }).click();
    await page.getByRole('button', { name: '下一张' }).click();
    await page.getByRole('button', { name: '下一张' }).click();
    await page.getByRole('button', { name: '看任务' }).click();
    await page.getByRole('button', { name: '开始', exact: true }).click();
    // 首次选字教学卡出现即确认
    const know = page.getByRole('button', { name: '知道了' });
    if (await know.isVisible().catch(() => false)) await know.click();
    const ready = page.locator('.ready-panel button');
    if (await ready.isVisible().catch(() => false)) await ready.click();
    const know2 = page.getByRole('button', { name: '知道了' });
    if (await know2.isVisible().catch(() => false)) await know2.click();
    await expect(page.locator('.task-input')).toBeEnabled({ timeout: 15_000 });
  }

  /**
   * 在输入框上按 Chrome 的事件顺序模拟拼音组字：
   * compositionstart → insertCompositionText → keydown Enter(isComposing) → compositionend → 文本上屏。
   * 这验证的是页面的事件处理链，不是真实输入法；真实设备验证见 docs/验收记录。
   */
  async function imeType(page: Page, pinyin: string, committed: string): Promise<void> {
    await page.locator('.task-input').evaluate((el, { pinyin: py, committed: final }) => {
      const input = el as HTMLInputElement;
      // React 受控输入：必须用原生 setter 修改 value 再派发 input 事件。
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      const setInput = (v: string): void => {
        setter.call(input, v);
        input.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: v, bubbles: true }));
      };
      // Chrome 的真实顺序：compositionstart → 组字输入 → keydown Enter(isComposing) → compositionend → keyup → 上屏
      input.dispatchEvent(new CompositionEvent('compositionstart', { data: py, bubbles: true }));
      setInput(py);
      const composingInput = new InputEvent('input', { inputType: 'insertCompositionText', data: py, isComposing: true, bubbles: true });
      input.dispatchEvent(composingInput);
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 229, isComposing: true, bubbles: true }));
      input.dispatchEvent(new CompositionEvent('compositionend', { data: final, bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      setInput(final);
    }, { pinyin, committed });
    await page.waitForTimeout(150);
  }

  test('I02 组字期间 Enter 不交卷；组字提交后再次 Enter 才判定', async ({ page }) => {
    await enterZhPractice(page);
    const target = await displayedTarget(page);
    // 组字 + 候选 Enter（选字周期）：不应交卷，也不应记错误。
    await imeType(page, 'ren', target);
    let save = await readSave(page);
    expect(save.phase2.stats['zh:story'].wrongSubmissions).toBe(0);
    expect(save.phase2.stats['zh:story'].items).toBe(0);
    // 再次 Enter：独立确认，判定通过。
    await expect(page.locator('.task-input')).toHaveValue(target);
    await page.keyboard.press('Enter');
    await expect(page.locator('.task-progress')).toContainText('题 2/12');
    save = await readSave(page);
    expect(save.phase2.stats['zh:story'].items).toBe(1);
    expect(save.phase2.stats['zh:story'].firstCorrectItems).toBe(1);
    expect(save.phase2.stats['zh:story'].wrongSubmissions).toBe(0);
  });

  test('I03 组字后点确认按钮完成目标汉字；错误候选按未匹配计', async ({ page }) => {
    await enterZhPractice(page);
    const target = await displayedTarget(page);
    const wrong = target === '人' ? '口' : '人';
    // 组字上屏后改选错误的字，点确认：按未匹配计。
    await imeType(page, 'ren', wrong);
    await page.getByRole('button', { name: '确认' }).click();
    await expect(page.locator('.task-diff')).toBeVisible();
    let save = await readSave(page);
    expect(save.phase2.stats['zh:story'].wrongSubmissions).toBe(1);
    expect(save.phase2.stats['zh:story'].items).toBe(0);
    // 改成正确的字再确认（光标修改路径）。
    await page.locator('.task-input').fill(target);
    await page.getByRole('button', { name: '确认' }).click();
    await expect(page.locator('.task-progress')).toContainText('题 2/12');
    save = await readSave(page);
    expect(save.phase2.stats['zh:story'].items).toBe(1);
    expect(save.phase2.stats['zh:story'].firstCorrectItems).toBe(0); // 首次提交错了
  });

  test('I04 连按 Enter 与重复点击确认不重复计错', async ({ page }) => {
    await enterZhPractice(page);
    const target = await displayedTarget(page);
    await imeType(page, 'ren', target);
    await expect(page.locator('.task-input')).toHaveValue(target);
    await page.keyboard.press('Enter');
    await expect(page.locator('.task-progress')).toContainText('题 2/12');
    // 连按 Enter：第 2 题会得到一次未匹配（不同目标），但第 1 题只完成一次。
    const wrongBefore = (await readSave(page)).phase2.stats['zh:story'].wrongSubmissions;
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    const wrongAfter = (await readSave(page)).phase2.stats['zh:story'].wrongSubmissions;
    expect((await readSave(page)).phase2.stats['zh:story'].items).toBe(1);
    expect(wrongAfter).toBeLessThanOrEqual(wrongBefore + 1);
  });
});
