import { describe, expect, it } from 'vitest';
import { classifyKey } from '../../src/core/input';

describe('B02 ignored input', () => {
  it('ignores key repeat, modifier shortcuts, Tab, arrows and function keys', () => {
    expect(classifyKey({ key: 'f', repeat: true }, false)).toEqual({ kind: 'ignore' });
    expect(classifyKey({ key: 'c', metaKey: true }, false)).toEqual({ kind: 'ignore' });
    expect(classifyKey({ key: 'v', ctrlKey: true }, false)).toEqual({ kind: 'ignore' });
    expect(classifyKey({ key: 'f', altKey: true }, false)).toEqual({ kind: 'ignore' });
    for (const key of ['Tab', 'ArrowLeft', 'ArrowDown', 'Shift', 'CapsLock', 'Meta', 'F5', 'Enter', 'Backspace']) {
      expect(classifyKey({ key }, true)).toEqual({ kind: 'ignore' });
    }
  });
});

describe('B03 composition, symbols and Caps Lock', () => {
  it('treats IME composition as non-scoring', () => {
    expect(classifyKey({ key: 'Process' }, false)).toEqual({ kind: 'composing' });
    expect(classifyKey({ key: 'f', isComposing: true }, false)).toEqual({ kind: 'composing' });
    expect(classifyKey({ key: 'Unidentified', keyCode: 229 }, false)).toEqual({ kind: 'composing' });
  });

  it('flags digits, punctuation and other visible characters without counting them', () => {
    for (const key of ['1', ';', ',', '/', 'é', '你', 'Dead']) {
      expect(classifyKey({ key }, true)).toEqual({ kind: 'other-visible' });
    }
  });

  it('normalises uppercase letters and marks them for the Caps Lock hint', () => {
    expect(classifyKey({ key: 'F' }, false)).toEqual({ kind: 'char', char: 'f', uppercase: true });
    expect(classifyKey({ key: 'j' }, false)).toEqual({ kind: 'char', char: 'j', uppercase: false });
  });
});

describe('B05 space and Escape', () => {
  it('counts space only when the level uses it', () => {
    expect(classifyKey({ key: ' ' }, true)).toEqual({ kind: 'char', char: ' ', uppercase: false });
    expect(classifyKey({ key: ' ' }, false)).toEqual({ kind: 'space-unused' });
  });

  it('maps Escape to pause', () => {
    expect(classifyKey({ key: 'Escape' }, false)).toEqual({ kind: 'pause' });
  });
});
