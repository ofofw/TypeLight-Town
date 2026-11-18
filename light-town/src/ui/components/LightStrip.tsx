import type { CSSProperties } from 'react';
import { THEME_LIGHTS } from '../../art/palette';
import type { ThemeId } from '../../config/shop';

export interface LightStripProps {
  total: number;
  done: number;
  /** Bulbs per segment; a finished segment is drawn connected (连接灯带). */
  groupSize?: number;
  /** Bulb counts of uneven segments (words of a sign level). Overrides groupSize. */
  groups?: readonly number[];
  theme: ThemeId;
  label: string;
}

/** Row of bulbs showing this level's progress: one bulb per target, lit when typed correctly. */
export function LightStrip({ total, done, groupSize, groups, theme, label }: LightStripProps) {
  const sizes = groups ?? splitEven(total, groupSize ?? total);
  const light = THEME_LIGHTS[theme];
  let start = 0;
  return (
    <div
      className="light-strip"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      aria-valuetext={`${done}/${total}`}
      style={{ '--bulb-on': light.light, '--bulb-core': light.core, '--bulb-halo': light.halo } as CSSProperties}
    >
      {sizes.map((size, g) => {
        const from = start;
        start += size;
        const complete = done >= from + size;
        return (
          <span key={g} className={`light-strip__group${complete ? ' light-strip__group--done' : ''}`}>
            {Array.from({ length: size }, (_, i) => (
              <span key={i} className={`bulb${from + i < done ? ' bulb--on' : ''}${from + i === done ? ' bulb--next' : ''}`} />
            ))}
          </span>
        );
      })}
    </div>
  );
}

function splitEven(total: number, size: number): number[] {
  const out: number[] = [];
  for (let left = total; left > 0; left -= size) out.push(Math.min(size, left));
  return out;
}
