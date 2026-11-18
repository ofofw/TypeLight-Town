import { courseOrderIndex, keysForStage, newKeysForStage } from '../config/keys';
import { RULES } from '../config/rules';
import { createRng, deriveSeed, shuffleInPlace, type Rng } from './rng';
import type { RecentAttempt } from './types';

export interface KeyHistory {
  recent: readonly RecentAttempt[];
  presented: Readonly<Record<string, number>>;
}

export interface ErrorRank {
  key: string;
  samples: number;
  errors: number;
  rate: number;
}

/**
 * Error-prone keys among `keys`: at least `minSamples` recent attempts and a non-zero error rate,
 * sorted by error rate, then error count, then course order.
 */
export function rankErrorKeys(
  keys: readonly string[],
  recent: readonly RecentAttempt[],
  minSamples: number = RULES.errorMinSamples,
): ErrorRank[] {
  const allowed = new Set(keys);
  const agg = new Map<string, { samples: number; errors: number }>();
  for (const [key, ok] of recent) {
    if (!allowed.has(key)) continue;
    const entry = agg.get(key) ?? { samples: 0, errors: 0 };
    entry.samples += 1;
    if (!ok) entry.errors += 1;
    agg.set(key, entry);
  }
  const ranks: ErrorRank[] = [];
  for (const [key, { samples, errors }] of agg) {
    if (samples >= minSamples && errors > 0) ranks.push({ key, samples, errors, rate: errors / samples });
  }
  ranks.sort(
    (a, b) => b.rate - a.rate || b.errors - a.errors || courseOrderIndex(a.key) - courseOrderIndex(b.key),
  );
  return ranks;
}

/** Keys sorted by cumulative presentation count (fewest first), ties by course order. */
export function balancedOrder(keys: readonly string[], presented: Readonly<Record<string, number>>): string[] {
  return [...keys].sort(
    (a, b) => (presented[a] ?? 0) - (presented[b] ?? 0) || courseOrderIndex(a) - courseOrderIndex(b),
  );
}

function takeCyclic(order: readonly string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < n && order.length > 0; i++) out.push(order[i % order.length]);
  return out;
}

function tally(keys: readonly string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of keys) out[k] = (out[k] ?? 0) + 1;
  return out;
}

function mergeCounts(...parts: Record<string, number>[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of parts) for (const [k, n] of Object.entries(part)) out[k] = (out[k] ?? 0) + n;
  return out;
}

/** Limit every key to `cap`; overflow goes, one at a time, to the next key in `order` that is below the cap. */
export function capCounts(
  counts: Record<string, number>,
  order: readonly string[],
  cap: number = RULES.maxSameKeyPerLevel,
): Record<string, number> {
  const out = { ...counts };
  let overflow = 0;
  for (const [k, n] of Object.entries(out)) {
    if (n > cap) {
      overflow += n - cap;
      out[k] = cap;
    }
  }
  if (overflow > 0 && order.every((k) => (out[k] ?? 0) >= cap)) {
    throw new Error('capCounts: no key can take the overflow');
  }
  for (let i = 0; overflow > 0; i++) {
    const k = order[i % order.length];
    if ((out[k] ?? 0) < cap) {
      out[k] = (out[k] ?? 0) + 1;
      overflow -= 1;
    }
  }
  return out;
}

function errorSlots(ranks: readonly ErrorRank[], slots: number): string[] {
  const top = ranks.slice(0, RULES.errorTopKeys).map((r) => r.key);
  return takeCyclic(top, slots);
}

export interface QuotaPlan {
  newKeys: string[];
  newKeyCounts: Record<string, number>;
  errorKeys: string[];
  errorCounts: Record<string, number>;
  balancedCounts: Record<string, number>;
  counts: Record<string, number>;
}

/** Course level: 12 new-key, 6 error-prone and 6 balanced slots (see 需求澄清记录 §1). */
export function planCourseQuota(stage: number, history: KeyHistory): QuotaPlan {
  const keys = keysForStage(stage);
  const newKeys = newKeysForStage(stage);
  const order = balancedOrder(keys, history.presented);
  const newKeyCounts = tally(takeCyclic(newKeys, RULES.quota.newKeys));
  const ranks = rankErrorKeys(keys, history.recent);
  let errorCounts: Record<string, number> = {};
  let balancedCounts: Record<string, number>;
  if (ranks.length > 0) {
    errorCounts = tally(errorSlots(ranks, RULES.quota.errorKeys));
    balancedCounts = tally(takeCyclic(order, RULES.quota.balanced));
  } else {
    balancedCounts = tally(takeCyclic(order, RULES.quota.errorKeys + RULES.quota.balanced));
  }
  const counts = capCounts(mergeCounts(newKeyCounts, errorCounts, balancedCounts), order);
  return {
    newKeys,
    newKeyCounts,
    errorKeys: ranks.slice(0, RULES.errorTopKeys).map((r) => r.key),
    errorCounts,
    balancedCounts,
    counts,
  };
}

/** Festival error-key level: `errorTargets` error-prone slots, the rest balanced; all balanced without error-prone keys. */
export function planMixedQuota(
  keys: readonly string[],
  history: KeyHistory,
  errorTargets: number,
  total: number = RULES.targetsPerLevel,
): Record<string, number> {
  const order = balancedOrder(keys, history.presented);
  const ranks = rankErrorKeys(keys, history.recent);
  const error = ranks.length > 0 ? errorSlots(ranks, errorTargets) : [];
  const balanced = takeCyclic(order, total - error.length);
  return capCounts(mergeCounts(tally(error), tally(balanced)), order);
}

export function planBalancedQuota(
  keys: readonly string[],
  history: KeyHistory,
  total: number = RULES.targetsPerLevel,
): Record<string, number> {
  const order = balancedOrder(keys, history.presented);
  return capCounts(tally(takeCyclic(order, total)), order);
}

/** Custom-key free practice: equal shares, remainder by balanced order. */
export function planEvenQuota(
  keys: readonly string[],
  history: KeyHistory,
  total: number = RULES.targetsPerLevel,
): Record<string, number> {
  const order = balancedOrder(keys, history.presented);
  const base = Math.floor(total / order.length);
  const counts: Record<string, number> = {};
  for (const k of order) counts[k] = base;
  for (let i = 0; i < total - base * order.length; i++) counts[order[i]] += 1;
  return capCounts(counts, order);
}

/** Whether `counts` can still be laid out without a run longer than `maxRun`, given the current trailing run. */
function feasible(rem: Map<string, number>, lastKey: string | null, run: number, maxRun: number): boolean {
  let total = 0;
  for (const n of rem.values()) total += n;
  for (const [k, n] of rem) {
    if (n === 0) continue;
    const others = total - n;
    let capacity = maxRun * (others + 1);
    if (k === lastKey) capacity -= run;
    if (n > capacity) return false;
  }
  return true;
}

/** Seeded arrangement of `counts` in which no key appears more than `maxRun` times in a row. */
export function arrangeNoLongRuns(
  counts: Readonly<Record<string, number>>,
  rng: Rng,
  maxRun: number = RULES.maxRun,
): string[] {
  const rem = new Map(Object.entries(counts).filter(([, n]) => n > 0));
  const keys = [...rem.keys()].sort((a, b) => courseOrderIndex(a) - courseOrderIndex(b));
  const total = [...rem.values()].reduce((a, b) => a + b, 0);
  const out: string[] = [];
  if (!feasible(rem, null, 0, maxRun)) throw new Error('arrangeNoLongRuns: counts are infeasible');

  const dfs = (lastKey: string | null, run: number): boolean => {
    if (out.length === total) return true;
    const candidates = keys.filter((k) => (rem.get(k) ?? 0) > 0 && !(k === lastKey && run >= maxRun));
    shuffleInPlace(candidates, rng);
    for (const k of candidates) {
      rem.set(k, (rem.get(k) ?? 0) - 1);
      out.push(k);
      const nextRun = k === lastKey ? run + 1 : 1;
      if (feasible(rem, k, nextRun, maxRun) && dfs(k, nextRun)) return true;
      out.pop();
      rem.set(k, (rem.get(k) ?? 0) + 1);
    }
    return false;
  };

  if (!dfs(null, 0)) throw new Error('arrangeNoLongRuns: no arrangement found');
  return out;
}

export function maxRunLength(seq: readonly string[]): number {
  let best = 0;
  let run = 0;
  for (let i = 0; i < seq.length; i++) {
    run = i > 0 && seq[i] === seq[i - 1] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

export interface GeneratedKeys {
  targets: string[];
  plan: QuotaPlan | null;
}

export function generateCourseTargets(stage: number, seed: number, history: KeyHistory): GeneratedKeys {
  const plan = planCourseQuota(stage, history);
  return { targets: arrangeNoLongRuns(plan.counts, createRng(deriveSeed(seed, 1))), plan };
}

export function arrangeCounts(counts: Record<string, number>, seed: number): string[] {
  return arrangeNoLongRuns(counts, createRng(deriveSeed(seed, 1)));
}
