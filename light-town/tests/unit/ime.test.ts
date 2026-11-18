import { describe, expect, it } from 'vitest';
import { SubmitGate } from '../../src/core/phase2/ime';

describe('I02 Enter 提交门控（SubmitGate）', () => {
  it('普通 Enter 提交；repeat 忽略', () => {
    const g = new SubmitGate();
    expect(g.onEnterKeydown({})).toBe('submit');
    g.onEnterKeyup();
    expect(g.onEnterKeydown({ repeat: true })).toBe('ignore');
    g.onEnterKeyup();
    expect(g.onEnterKeydown({})).toBe('submit');
  });

  it('组字期间的 Enter 周期（isComposing / keyCode 229）禁止交卷，直到 keyup', () => {
    const g = new SubmitGate();
    g.onCompositionStart();
    expect(g.onEnterKeydown({ isComposing: true })).toBe('block');
    // 同一周期内的另一次 keydown（理论上不会发生，但保持保守）
    expect(g.onEnterKeydown({ isComposing: true })).toBe('block');
    // Chrome 顺序：keydown（已阻止）→ compositionend → keyup；下一次独立 Enter 直接提交。
    g.onCompositionEnd();
    g.onEnterKeyup();
    expect(g.onEnterKeydown({})).toBe('submit');
  });

  it('组字中未按过 Enter（鼠标选字）后，compositionend 保护一次紧邻 Enter', () => {
    const g = new SubmitGate();
    g.onCompositionStart();
    g.onCompositionEnd(); // 没有 Enter 周期在途 → 保护
    expect(g.onEnterKeydown({})).toBe('block');
    g.onEnterKeyup();
    expect(g.onEnterKeydown({})).toBe('submit');
  });

  it('keyCode 229 视为组字周期', () => {
    const g = new SubmitGate();
    expect(g.onEnterKeydown({ keyCode: 229 })).toBe('block');
    g.onEnterKeyup();
    expect(g.onEnterKeydown({})).toBe('submit');
  });

  it('Safari 顺序（compositionend 早于 keydown）：紧邻 Enter 仅解除保护不交卷（I02）', () => {
    const g = new SubmitGate();
    g.onCompositionStart();
    g.onCompositionEnd();
    // 第一次 Enter：保护周期，不交卷
    expect(g.onEnterKeydown({})).toBe('block');
    g.onEnterKeyup();
    // 第二次 Enter：正常提交
    expect(g.onEnterKeydown({})).toBe('submit');
    g.onEnterKeyup();
  });

  it('触摸/鼠标：组字期间 pointerdown 后，紧随 click 不交卷；再次点击可确认（I03）', () => {
    const g = new SubmitGate();
    g.onCompositionStart();
    expect(g.onConfirmPointerdown()).toBe('guard');
    g.onCompositionEnd();
    expect(g.onConfirmClick()).toBe('block');
    expect(g.onConfirmClick()).toBe('submit');
  });

  it('组字结束后（无保护）点击确认直接交卷', () => {
    const g = new SubmitGate();
    g.onCompositionStart();
    g.onCompositionEnd();
    expect(g.onConfirmClick()).toBe('submit');
  });

  it('失焦清理按住状态，不清理事件序保护', () => {
    const g = new SubmitGate();
    expect(g.onEnterKeydown({ keyCode: 229 })).toBe('block');
    g.onBlur();
    // 周期被清理：下一次 Enter 是正常提交（保护未设置）。
    expect(g.onEnterKeydown({})).toBe('submit');
  });

  it('forceConfirm 显式确认当前文本（触摸选字后重新确认）', () => {
    const g = new SubmitGate();
    g.onCompositionStart();
    g.onConfirmPointerdown();
    g.onCompositionEnd();
    expect(g.forceConfirm()).toBe('submit');
  });
});
