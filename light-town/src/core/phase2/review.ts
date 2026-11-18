import { PHASE2_RULES } from '../../config/phase2/rules';
import type { P2ReviewRecord } from './types';

const LADDER = PHASE2_RULES.reviewLadderDays;

/** 间隔档对应的毫秒数。 */
export function ladderMs(level: number): number {
  const days = LADDER[Math.min(Math.max(level, 0), LADDER.length - 1)]!;
  return days * PHASE2_RULES.dayMs;
}

/**
 * 复习调度（spec/phase-2/RULES.md）：
 * - 首次完成安排 1 天后；已有记录且本次首次提交正确、没有显式帮助时，按 1→3→7→14→14 天推进，否则安排 1 天后。
 * - 同一 item 同一任务实例最多提高一次间隔；同实例任一 occurrence 失败/求助则本实例最终间隔回到 1 天。
 * - 时间为毫秒 UTC；`now` 已是 max(系统时间, 存档最大观察时间)。
 */
export function applyReview(
  record: P2ReviewRecord | undefined,
  occurrences: readonly { firstCorrect: boolean; helpUsed: boolean }[],
  now: number,
): P2ReviewRecord {
  const allClean = occurrences.length > 0 && occurrences.every((o) => o.firstCorrect && !o.helpUsed);
  if (!record) {
    return { dueAt: now + PHASE2_RULES.dayMs, level: 0, lastPracticedAt: now };
  }
  const nextLevel = allClean ? Math.min(record.level + 1, LADDER.length - 1) : 0;
  return { dueAt: now + ladderMs(nextLevel), level: nextLevel, lastPracticedAt: now };
}

/** 该 item 是否到期（有记录且 dueAt ≤ now）。 */
export function isDue(record: P2ReviewRecord | undefined, now: number): boolean {
  return record !== undefined && record.dueAt <= now;
}
