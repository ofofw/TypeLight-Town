import type { Phase2Language } from '../../config/phase2/content';
import type { P2Data, P2GroupKey, P2GroupStats } from './types';

/** 流畅度：正确完成目标字符数 / 有效分钟；无有效时间显示“—”（返回 null）。 */
export function fluency(targetChars: number, effectiveMs: number): number | null {
  if (effectiveMs <= 0) return null;
  return targetChars / (effectiveMs / 60_000);
}

export function formatFluency(targetChars: number, effectiveMs: number): string {
  const f = fluency(targetChars, effectiveMs);
  return f === null ? '—' : `${f.toFixed(1)} 字/分`;
}

export interface P2PeriodTotals {
  days: number;
  items: number;
  effectiveMs: number;
}

export interface P2RecentComparison {
  /** 最近 7 个有练习日。 */
  current: P2PeriodTotals;
  /** 此前 7 个有练习日；不足两组时为 null（只显示当前值，不画虚假增长）。 */
  previous: P2PeriodTotals | null;
}

/** 最近表现：最近 7 个有练习日与此前 7 个有练习日比较（按本地日期）。 */
export function recentPracticeComparison(data: P2Data, now: number, perGroup = 7): P2RecentComparison {
  const activeDays = Object.entries(data.daily)
    .filter(([, d]) => d.effectiveMs > 0 || d.items > 0)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const group = (list: [string, { effectiveMs: number; items: number }][]): P2PeriodTotals => ({
    days: list.length,
    items: list.reduce((a, [, d]) => a + d.items, 0),
    effectiveMs: list.reduce((a, [, d]) => a + d.effectiveMs, 0),
  });
  const current = group(activeDays.slice(0, perGroup));
  const previousList = activeDays.slice(perGroup, perGroup * 2);
  const previous = previousList.length === perGroup ? group(previousList) : null;
  void now;
  return { current, previous };
}

/** 某语言、某任务种类的分组统计（无数据返回全零）。 */
export function groupStatsOf(data: P2Data, language: Phase2Language, kind: P2GroupKey extends `${infer _l}:${infer k}` ? k : never): P2GroupStats {
  return data.stats[`${language}:${kind}`];
}
