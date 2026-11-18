import { COURSE_KEY_ORDER } from '../config/keys';
import { RULES } from '../config/rules';
import { rankErrorKeys, type ErrorRank } from './generator';
import { localDateKey, recentDateKeys, splitByLocalDay } from './time';
import type { DailyStat, KeyStat, LevelSummary, Stats } from './types';

export function emptyStats(): Stats {
  return {
    attempts: 0,
    correct: 0,
    effectiveMs: 0,
    levelsCompleted: 0,
    keys: {},
    mistypes: {},
    recent: [],
    daily: {},
    levels: [],
  };
}

function keyStat(stats: Stats, key: string): KeyStat {
  return (stats.keys[key] ??= { attempts: 0, correct: 0, presented: 0 });
}

function daily(stats: Stats, dateKey: string): DailyStat {
  return (stats.daily[dateKey] ??= { attempts: 0, correct: 0, effectiveMs: 0, levels: 0 });
}

/** Mutates `stats`: one accepted attempt against `target`. */
export function recordAttempt(stats: Stats, target: string, typed: string, ok: boolean, now: number): void {
  stats.attempts += 1;
  const ks = keyStat(stats, target);
  ks.attempts += 1;
  const day = daily(stats, localDateKey(now));
  day.attempts += 1;
  if (ok) {
    stats.correct += 1;
    ks.correct += 1;
    day.correct += 1;
  } else {
    const row = (stats.mistypes[target] ??= {});
    row[typed] = (row[typed] ?? 0) + 1;
  }
  stats.recent.push([target, ok ? 1 : 0]);
  if (stats.recent.length > RULES.recentBufferSize) {
    stats.recent.splice(0, stats.recent.length - RULES.recentBufferSize);
  }
}

export function recordPresented(stats: Stats, key: string): void {
  keyStat(stats, key).presented += 1;
}

/** Mutates `stats`: effective practice time over [from, to), split by local date. */
export function recordEffectiveTime(stats: Stats, from: number, to: number): void {
  if (to <= from) return;
  stats.effectiveMs += to - from;
  for (const [dateKey, ms] of splitByLocalDay(from, to)) daily(stats, dateKey).effectiveMs += ms;
}

export function recordLevelComplete(stats: Stats, summary: LevelSummary): void {
  stats.levelsCompleted += 1;
  daily(stats, localDateKey(summary.at)).levels += 1;
  stats.levels.push(summary);
  if (stats.levels.length > RULES.history.levelLog) {
    stats.levels.splice(0, stats.levels.length - RULES.history.levelLog);
  }
}

/** Drop daily rows older than the retention window; cumulative totals are unaffected. */
export function pruneDaily(stats: Stats, now: number): void {
  const keep = new Set(recentDateKeys(now, RULES.history.dailyDays));
  const oldest = [...keep].pop() ?? '';
  for (const key of Object.keys(stats.daily)) {
    if (!keep.has(key) && key < oldest) delete stats.daily[key];
  }
}

export interface PeriodTotals {
  attempts: number;
  correct: number;
  effectiveMs: number;
  levels: number;
}

export function lastDaysTotals(stats: Stats, now: number, days = 7): PeriodTotals {
  const out: PeriodTotals = { attempts: 0, correct: 0, effectiveMs: 0, levels: 0 };
  for (const key of recentDateKeys(now, days)) {
    const d = stats.daily[key];
    if (!d) continue;
    out.attempts += d.attempts;
    out.correct += d.correct;
    out.effectiveMs += d.effectiveMs;
    out.levels += d.levels;
  }
  return out;
}

/** Parent page: up to five keys from the recent buffer with at least five samples and some errors. */
export function parentErrorKeys(stats: Stats, limit = 5): ErrorRank[] {
  return rankErrorKeys(COURSE_KEY_ORDER, stats.recent).slice(0, limit);
}

export function presentedCounts(stats: Stats): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, s] of Object.entries(stats.keys)) out[k] = s.presented;
  return out;
}
