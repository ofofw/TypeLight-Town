/**
 * Enter 提交门控与确认按钮防误触（spec/phase-2/RULES.md「状态机和输入提交」）。
 *
 * - 维护“Enter 按下→抬起”生命周期；组字期间（keydown.isComposing、内部 compositionActive
 *   或 keyCode 229）的 Enter 周期是选字周期，直到 keyup 都禁止交卷。
 * - compositionend 不得直接触发提交。Safari 等可能在 keydown 之前发 compositionend：
 *   遇到 compositionend 标记一次键盘提交保护，保护期间紧邻的 Enter 周期仅解除保护、不交卷。
 * - 按钮 pointerdown 若发生于组字期间，则紧随的 click 不交卷（按钮保持可用，提示“选好字后，点确认”）。
 * - 按住 Enter 的 repeat 不提交；失焦清理按住状态。
 *
 * 这是保守的防误交策略：允许个别选字路径多按一次 Enter，不能误交导致错误题或跳题。
 */
export class SubmitGate {
  private composing = false;
  /** Safari：compositionend 早于紧邻 Enter 的 keydown。 */
  private keyboardGuard = false;
  /** 当前 Enter 周期是否为选字周期（keydown 起到 keyup 止）。 */
  private enterCycleBlocked = false;
  /** pointerdown 发生在组字期间：紧随的 click 只解除保护，不交卷。 */
  private pointerGuard = false;
  /** 上一事件是否为 Enter keydown（用于把 keyup 关联到周期）。 */
  private enterDownSeen = false;

  onCompositionStart(): void {
    this.composing = true;
  }

  onCompositionEnd(): void {
    this.composing = false;
    // Safari 等可能在 keydown 之前发 compositionend：这种“没有 Enter 周期在途”的情况
    // 标记一次键盘提交保护，紧邻的 Enter 周期仅解除保护、不交卷。
    // Chrome 的顺序是 keydown（已阻止）→ compositionend → keyup，选字 Enter 已被消费，
    // 不再加保护，避免下一次独立 Enter 被多拦一次。
    if (!this.enterDownSeen) this.keyboardGuard = true;
  }

  isComposing(): boolean {
    return this.composing;
  }

  /**
   * Enter keydown。返回 'submit' 允许交卷；'block' 表示本次周期不交卷
   * （选字周期或保护周期）；'ignore' 表示 repeat 或与周期无关的事件。
   */
  onEnterKeydown(e: { isComposing?: boolean; keyCode?: number; repeat?: boolean }): 'submit' | 'block' | 'ignore' {
    if (e.repeat) return 'ignore';
    const composing = this.composing || e.isComposing === true || e.keyCode === 229;
    if (composing) {
      this.enterCycleBlocked = true;
      this.enterDownSeen = true;
      return 'block';
    }
    if (this.keyboardGuard) {
      // 保护周期：仅解除保护，不交卷。
      this.keyboardGuard = false;
      this.enterCycleBlocked = true;
      this.enterDownSeen = true;
      return 'block';
    }
    if (this.enterCycleBlocked) {
      // 仍在同一个（被阻止的）周期里：不交卷。
      this.enterDownSeen = true;
      return 'block';
    }
    this.enterDownSeen = true;
    return 'submit';
  }

  /** Enter keyup：结束当前周期。 */
  onEnterKeyup(): void {
    this.enterCycleBlocked = false;
    this.enterDownSeen = false;
  }

  /** 焦点恢复/失焦：清理按住状态与保护（不清理 keyboardGuard——它是事件序保护）。 */
  onBlur(): void {
    this.enterCycleBlocked = false;
    this.enterDownSeen = false;
  }

  /** 确认按钮 pointerdown：组字期间按下时，紧随的 click 不交卷。 */
  onConfirmPointerdown(): 'ok' | 'guard' {
    if (this.composing) {
      this.pointerGuard = true;
      return 'guard';
    }
    return 'ok';
  }

  /** 确认按钮 click：仅当组字已结束且没有保护时交卷。 */
  onConfirmClick(): 'submit' | 'block' {
    if (this.pointerGuard) {
      this.pointerGuard = false;
      return 'block';
    }
    if (this.composing) return 'block';
    return 'submit';
  }

  /** 显式确认（触摸选字后的重新点击，或“再次确认”提示后的点击）：清保护并交卷。 */
  forceConfirm(): 'submit' {
    this.pointerGuard = false;
    this.keyboardGuard = false;
    return 'submit';
  }

  enterCycleInFlight(): boolean {
    return this.enterDownSeen;
  }
}
