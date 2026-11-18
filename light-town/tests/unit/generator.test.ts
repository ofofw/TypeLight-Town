import { describe, expect, it } from 'vitest';
import { keysForStage } from '../../src/config/keys';
import {
  arrangeNoLongRuns,
  balancedOrder,
  capCounts,
  generateCourseTargets,
  maxRunLength,
  planBalancedQuota,
  planCourseQuota,
  planEvenQuota,
  planMixedQuota,
  rankErrorKeys,
  type KeyHistory,
} from '../../src/core/generator';
import { createRng } from '../../src/core/rng';
import type { RecentAttempt } from '../../src/core/types';

const empty: KeyHistory = { recent: [], presented: {} };

function attempts(key: string, ok: number, bad: number): RecentAttempt[] {
  return [...Array(ok).fill([key, 1]), ...Array(bad).fill([key, 0])];
}

function sum(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

describe('B08 course quota: 12 new + 6 error-prone + 6 balanced', () => {
  it('splits 12 new-key slots evenly among the stage’s new keys', () => {
    expect(planCourseQuota(1, empty).newKeyCounts).toEqual({ f: 6, j: 6 });
    expect(planCourseQuota(4, empty).newKeyCounts).toEqual({ a: 12 });
    expect(planCourseQuota(11, empty).newKeyCounts).toEqual({ v: 3, b: 3, n: 3, m: 3 });
    expect(planCourseQuota(12, empty).newKeyCounts).toEqual({ z: 3, x: 3, c: 3, ' ': 3 });
  });

  it('gives 6 error-prone slots to the top error keys (≥5 samples, errors > 0)', () => {
    const recent = [...attempts('d', 3, 3), ...attempts('k', 4, 1), ...attempts('s', 8, 2), ...attempts('l', 2, 2)];
    const plan = planCourseQuota(3, { recent, presented: {} });
    expect(plan.errorKeys).toEqual(['d', 's', 'k']);
    expect(plan.errorCounts).toEqual({ d: 2, s: 2, k: 2 });
    expect(sum(plan.balancedCounts)).toBe(6);
    expect(sum(plan.counts)).toBe(24);
  });

  it('ignores keys with fewer than five samples and falls back to balanced selection', () => {
    const recent = attempts('f', 0, 4);
    const plan = planCourseQuota(2, { recent, presented: {} });
    expect(plan.errorKeys).toEqual([]);
    expect(plan.errorCounts).toEqual({});
    expect(sum(plan.balancedCounts)).toBe(12);
  });

  it('balanced slots go to the least-presented keys first, ties by course order', () => {
    expect(balancedOrder(keysForStage(3), { f: 10, j: 10, d: 2, k: 2, s: 0, l: 1 })).toEqual(['s', 'l', 'd', 'k', 'f', 'j']);
    const plan = planCourseQuota(3, { recent: [], presented: { f: 10, j: 10, d: 2, k: 2, s: 0, l: 1 } });
    expect(plan.balancedCounts).toEqual({ s: 2, l: 2, d: 2, k: 2, f: 2, j: 2 });
  });

  it('caps a single key at 16 so the no-triple rule stays satisfiable (stage 4 conflict)', () => {
    const recent = [...attempts('a', 2, 6), ...attempts('f', 20, 0)];
    const plan = planCourseQuota(4, { recent, presented: { a: 0, f: 50, j: 50, d: 50, k: 50, s: 50, l: 50 } });
    expect(plan.counts.a).toBeLessThanOrEqual(16);
    expect(sum(plan.counts)).toBe(24);
    const seq = generateCourseTargets(4, 7, { recent, presented: { a: 0 } }).targets;
    expect(maxRunLength(seq)).toBeLessThanOrEqual(2);
  });

  it('capCounts moves overflow to the next keys in balanced order', () => {
    expect(capCounts({ f: 20, j: 4 }, ['j', 'f'])).toEqual({ f: 16, j: 8 });
  });
});

describe('B08 arrangement: no key more than twice in a row', () => {
  it('holds for every stage across many seeds', () => {
    for (let stage = 1; stage <= 12; stage++) {
      for (let seed = 0; seed < 60; seed++) {
        const { targets } = generateCourseTargets(stage, seed, empty);
        expect(targets).toHaveLength(24);
        expect(maxRunLength(targets)).toBeLessThanOrEqual(2);
        const opened = new Set(keysForStage(stage));
        expect(targets.every((t) => opened.has(t))).toBe(true);
      }
    }
  });

  it('holds with only two keys, including the tightest 16/8 split', () => {
    for (let seed = 0; seed < 200; seed++) {
      const seq = arrangeNoLongRuns({ f: 16, j: 8 }, createRng(seed));
      expect(seq.filter((k) => k === 'f')).toHaveLength(16);
      expect(maxRunLength(seq)).toBeLessThanOrEqual(2);
    }
  });

  it('is deterministic for a seed and varies across seeds', () => {
    const a = generateCourseTargets(5, 42, empty).targets;
    const b = generateCourseTargets(5, 42, empty).targets;
    const c = generateCourseTargets(5, 43, empty).targets;
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('rejects impossible counts instead of breaking the rule', () => {
    expect(() => arrangeNoLongRuns({ f: 17, j: 7 }, createRng(1))).toThrow();
  });
});

describe('error ranking', () => {
  it('requires at least five samples and sorts by rate, errors, then course order', () => {
    const recent = [...attempts('j', 5, 5), ...attempts('f', 5, 5), ...attempts('d', 1, 3)];
    expect(rankErrorKeys(['f', 'j', 'd'], recent).map((r) => r.key)).toEqual(['f', 'j']);
  });
});

describe('festival and free-practice plans', () => {
  it('mixed plan uses 12 error-prone slots and 12 balanced', () => {
    const recent = attempts('f', 5, 5);
    const counts = planMixedQuota(keysForStage(3), { recent, presented: {} }, 12);
    expect(sum(counts)).toBe(24);
    expect(counts.f).toBeGreaterThanOrEqual(12);
  });

  it('mixed plan without error-prone keys is fully balanced', () => {
    const counts = planMixedQuota(keysForStage(3), empty, 12);
    expect(Object.values(counts)).toEqual([4, 4, 4, 4, 4, 4]);
  });

  it('balanced and even plans spread 24 targets', () => {
    expect(planBalancedQuota(['f', 'j'], empty)).toEqual({ f: 12, j: 12 });
    expect(sum(planEvenQuota(['a', 's', 'd', 'f', 'g'], empty))).toBe(24);
    expect(Math.max(...Object.values(planEvenQuota(['a', 's', 'd', 'f', 'g'], empty)))).toBe(5);
  });
});
