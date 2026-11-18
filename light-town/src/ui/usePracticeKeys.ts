import { useEffect, useRef } from 'react';
import { classifyKey } from '../core/input';
import { isDialogOpen } from './components/Dialog';

export interface PracticeKeyHandlers {
  onChar(ch: string, info: { uppercase: boolean; capsLock: boolean }): void;
  onPause?(): void;
  onComposing?(): void;
  onOtherVisible?(): void;
}

/**
 * Document-level practice keyboard capture (no text field, so no on-screen keyboard on iPad).
 * Only active while `active` and no dialog is open; system shortcuts and repeats pass through untouched.
 */
export function usePracticeKeys(active: boolean, spaceInUse: boolean, handlers: PracticeKeyHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (isDialogOpen()) return;
      const k = classifyKey(e, spaceInUse);
      switch (k.kind) {
        case 'char':
          e.preventDefault();
          ref.current.onChar(k.char, { uppercase: k.uppercase, capsLock: e.getModifierState?.('CapsLock') ?? false });
          break;
        case 'space-unused':
          e.preventDefault();
          break;
        case 'composing':
          ref.current.onComposing?.();
          break;
        case 'other-visible':
          e.preventDefault();
          ref.current.onOtherVisible?.();
          break;
        case 'pause':
          e.preventDefault();
          ref.current.onPause?.();
          break;
        case 'ignore':
          break;
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [active, spaceInUse]);
}
