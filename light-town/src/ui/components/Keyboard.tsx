import type { CSSProperties } from 'react';
import { BUMP_KEYS, KEYBOARD_ROWS, SPACE } from '../../config/keys';

/** Horizontal offset of each row in key units (like a real keyboard), and the space bar geometry. */
const ROW_OFFSETS = [0, 0.25, 0.75];
const SPACE_OFFSET = 2.75;
const SPACE_WIDTH = 5;
const WIDTH_UNITS = 10.25;

export interface KeyboardProps {
  /** Key the player should press now. */
  target: string | null;
  /** Enlarged highlight (after two wrong presses or eight seconds of waiting). */
  enhanced?: boolean;
  /** Keys that belong to this practice; others are drawn quieter. Omit to show all keys equally. */
  available?: ReadonlySet<string>;
  /** Extra keys to mark, e.g. the new keys of a course stage. */
  marked?: readonly string[];
  label: string;
  className?: string;
}

function keyStyle(x: number, y: number, w = 1): CSSProperties {
  return { left: `calc(var(--u) * ${x})`, top: `calc(var(--u) * ${y})`, width: `calc(var(--u) * ${w} - var(--key-gap))` };
}

export function Keyboard({ target, enhanced = false, available, marked = [], label, className }: KeyboardProps) {
  const markedSet = new Set(marked);
  const keys: { key: string; x: number; y: number; w: number }[] = [];
  KEYBOARD_ROWS.forEach((row, r) => {
    if (row[0] === SPACE) {
      keys.push({ key: SPACE, x: SPACE_OFFSET, y: r, w: SPACE_WIDTH });
      return;
    }
    row.forEach((key, i) => keys.push({ key, x: ROW_OFFSETS[r] + i, y: r, w: 1 }));
  });
  return (
    <div
      className={`keyboard${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={label}
      style={{ '--rows': KEYBOARD_ROWS.length, '--cols': WIDTH_UNITS } as CSSProperties}
    >
      {keys.map(({ key, x, y, w }) => {
        const isTarget = key === target;
        const classes = ['key'];
        if (key === SPACE) classes.push('key--space');
        if (key === ';') classes.push('key--rest');
        if (available && !available.has(key)) classes.push('key--quiet');
        if (markedSet.has(key)) classes.push('key--marked');
        if (isTarget) classes.push('key--target');
        if (isTarget && enhanced) classes.push('key--enhanced');
        return (
          <div key={key} className={classes.join(' ')} style={keyStyle(x, y, w)} aria-hidden="true">
            {key === SPACE ? (
              <span className="key__main key__main--space">空格</span>
            ) : key === ';' ? (
              <span className="key__main">;</span>
            ) : (
              <>
                <span className="key__main">{key.toUpperCase()}</span>
                <span className="key__corner">{key}</span>
              </>
            )}
            {BUMP_KEYS.has(key) && <span className="key__bump" />}
            {isTarget && <span className="key__pin" />}
          </div>
        );
      })}
    </div>
  );
}
