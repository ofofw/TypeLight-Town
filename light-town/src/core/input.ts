import { SPACE } from '../config/keys';

/** The subset of KeyboardEvent the classifier needs (keeps it testable without a DOM). */
export interface KeyLike {
  key: string;
  code?: string;
  repeat?: boolean;
  isComposing?: boolean;
  keyCode?: number;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  capsLock?: boolean;
}

export type KeyClass =
  /** Accepted practice input: lowercase letter or space. */
  | { kind: 'char'; char: string; uppercase: boolean }
  /** Space while the level does not use it: block scrolling, count nothing. */
  | { kind: 'space-unused' }
  /** IME composition in progress: count nothing, suggest switching to English input. */
  | { kind: 'composing' }
  /** Digits, punctuation or other visible characters: count nothing, suggest switching. */
  | { kind: 'other-visible' }
  | { kind: 'pause' }
  /** Everything else: repeats, modifier shortcuts, Tab, arrows, function keys. */
  | { kind: 'ignore' };

export function classifyKey(e: KeyLike, spaceInUse: boolean): KeyClass {
  if (e.isComposing || e.keyCode === 229 || e.key === 'Process') return { kind: 'composing' };
  if (e.metaKey || e.ctrlKey || e.altKey) return { kind: 'ignore' };
  if (e.key === 'Escape') return e.repeat ? { kind: 'ignore' } : { kind: 'pause' };
  if (e.repeat) return { kind: 'ignore' };
  if (e.key === ' ' || e.key === 'Spacebar') {
    return spaceInUse ? { kind: 'char', char: SPACE, uppercase: false } : { kind: 'space-unused' };
  }
  if ([...e.key].length === 1) {
    if (/^[a-z]$/.test(e.key)) return { kind: 'char', char: e.key, uppercase: false };
    if (/^[A-Z]$/.test(e.key)) return { kind: 'char', char: e.key.toLowerCase(), uppercase: true };
    return { kind: 'other-visible' };
  }
  if (e.key === 'Dead') return { kind: 'other-visible' };
  return { kind: 'ignore' };
}
