import { RULES } from '../../config/rules';
import { SPACE } from '../../config/keys';
import type { LevelState } from '../../core/types';

function Char({ ch, state }: { ch: string; state: 'done' | 'current' | 'todo' }) {
  if (ch === SPACE) {
    return (
      <span className={`target-char target-char--space target-char--${state}`} aria-label="空格">
        <span className="space-symbol" aria-hidden="true" />
        <span className="space-word" aria-hidden="true">
          空格
        </span>
      </span>
    );
  }
  return <span className={`target-char target-char--${state}`}>{ch}</span>;
}

/** 逐键点窗: one big character. */
function KeysTarget({ level }: { level: LevelState }) {
  const ch = level.targets[level.pos];
  return (
    <div className="target-row target-row--single">
      <Char ch={ch} state="current" />
    </div>
  );
}

/** 连接灯带: the current group of three; correct letters of the group stay lit. */
function StripTarget({ level }: { level: LevelState }) {
  const size = RULES.stripGroupSize;
  const group = Math.floor(level.pos / size);
  const start = group * size;
  const chars = level.targets.slice(start, start + size);
  return (
    <div className="target-row target-row--group">
      {chars.map((ch, i) => (
        <Char key={i} ch={ch} state={start + i < level.pos ? 'done' : start + i === level.pos ? 'current' : 'todo'} />
      ))}
    </div>
  );
}

export function signWordIndex(level: LevelState): number {
  const starts = level.wordStarts ?? [0];
  let w = 0;
  for (let i = 0; i < starts.length; i++) if (starts[i] <= level.pos) w = i;
  return w;
}

/** Character counts of each word of a sign level (including the space typed after it). */
export function signGroups(level: LevelState): number[] {
  const starts = level.wordStarts ?? [0];
  return starts.map((s, i) => (starts[i + 1] ?? level.targets.length) - s);
}

/** 点亮招牌: the current word letter by letter, and the six signboards. */
function SignTarget({ level }: { level: LevelState }) {
  const starts = level.wordStarts ?? [0];
  const words = level.words ?? [];
  const w = signWordIndex(level);
  const start = starts[w];
  const end = starts[w + 1] ?? level.targets.length;
  const chars = level.targets.slice(start, end);
  return (
    <div className="sign-target">
      <div className="target-row target-row--word">
        {chars.map((ch, i) => (
          <Char key={i} ch={ch} state={start + i < level.pos ? 'done' : start + i === level.pos ? 'current' : 'todo'} />
        ))}
      </div>
      <ol className="signboards" aria-label="本关的单词">
        {words.map((word, i) => (
          <li key={i} className={`signboard${i < w ? ' signboard--lit' : i === w ? ' signboard--current' : ''}`}>
            {word}
            {i < w && <span className="visually-hidden">（已完成）</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function TargetDisplay({ level, missed }: { level: LevelState; missed: boolean }) {
  const ch = level.targets[level.pos];
  return (
    <div
      className={`target-box${missed ? ' target-box--missed' : ''}`}
      aria-live="polite"
      aria-label={ch === SPACE ? '请按空格' : `请按 ${ch}`}
    >
      {level.mode === 'keys' && <KeysTarget level={level} />}
      {level.mode === 'strip' && <StripTarget level={level} />}
      {level.mode === 'sign' && <SignTarget level={level} />}
    </div>
  );
}
