import { BUILDINGS } from '../config/buildings';
import type { Entry, LevelSummary, Mode } from './types';

export interface EncourageInput {
  completedBuilding: number | null;
  entry: Entry;
  mode: Mode;
  course: string;
  attempts: number;
  correct: number;
  /** Complete levels before this one, oldest first. */
  history: readonly LevelSummary[];
}

/** Priority: building completed → more accurate than the last comparable level → 100% → default. */
export function chooseEncouragement(input: EncourageInput): string {
  if (input.completedBuilding !== null) {
    return `你点亮了${BUILDINGS[input.completedBuilding].name}！`;
  }
  const acc = input.attempts > 0 ? input.correct / input.attempts : 0;
  for (let i = input.history.length - 1; i >= 0; i--) {
    const prev = input.history[i];
    if (prev.mode !== input.mode || prev.course !== input.course) continue;
    const prevAcc = prev.attempts > 0 ? prev.correct / prev.attempts : 0;
    if (acc > prevAcc) return '这次按得更准了！';
    break;
  }
  if (input.attempts > 0 && input.correct === input.attempts) return '这些按键都找对了！';
  return input.entry === 'light' ? '又有一片窗户亮起来了！' : '你完成了一次练习！';
}
