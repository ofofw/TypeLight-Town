import { describe, expect, it } from 'vitest';
import { SPACE, keysForStage } from '../../src/config/keys';
import { buildSignTargets, eligibleWords, pickWords, wordsAvailable } from '../../src/core/words';
import type { RecentAttempt } from '../../src/core/types';

function pick(stage: number, seed: number, extra: Partial<Parameters<typeof pickWords>[0]> = {}) {
  return pickWords({
    keys: keysForStage(stage),
    seed,
    recent: [],
    recentWordLevels: [],
    wordLevelsPlayed: 5,
    ...extra,
  });
}

describe('A06 word bank filtering', () => {
  it('only offers words made of opened letters', () => {
    for (let stage = 1; stage <= 12; stage++) {
      const opened = new Set(keysForStage(stage));
      expect(eligibleWords(opened).every((w) => [...w].every((ch) => opened.has(ch)))).toBe(true);
    }
    expect(eligibleWords(keysForStage(5))).toHaveLength(14);
    expect(eligibleWords(keysForStage(12))).toHaveLength(89);
  });

  it('word mode needs at least two eligible words; stage 5 has enough', () => {
    expect(wordsAvailable(keysForStage(3))).toBe(false);
    expect(wordsAvailable(keysForStage(5))).toBe(true);
    expect(pick(3, 1)).toBeNull();
  });

  it('requires a space after each of the first five words only when space is opened', () => {
    const words = ['add', 'sad', 'dad', 'lad', 'all', 'ask'];
    const noSpace = buildSignTargets(words, false);
    expect(noSpace.targets.join('')).toBe('addsaddadladallask');
    const withSpace = buildSignTargets(words, true);
    expect(withSpace.targets.join('')).toBe('add sad dad lad all ask');
    expect(withSpace.targets.filter((t) => t === SPACE)).toHaveLength(5);
    expect(withSpace.wordStarts).toEqual([0, 4, 8, 12, 16, 20]);
  });
});

describe('word selection', () => {
  it('picks six words without adjacent repeats', () => {
    for (let seed = 0; seed < 100; seed++) {
      const words = pick(5 + (seed % 8), seed)!;
      expect(words).toHaveLength(6);
      for (let i = 1; i < words.length; i++) expect(words[i]).not.toBe(words[i - 1]);
    }
  });

  it('repeats words without adjacency when fewer than six are eligible', () => {
    const words = pickWords({ keys: ['a', 'd', 's'], seed: 3, recent: [], recentWordLevels: [], wordLevelsPlayed: 0 })!;
    expect(words).toHaveLength(6);
    expect(new Set(words)).toEqual(new Set(['add', 'sad', 'dad']));
    for (let i = 1; i < words.length; i++) expect(words[i]).not.toBe(words[i - 1]);
  });

  it('prefers three words containing error-prone keys', () => {
    const recent: RecentAttempt[] = [...Array(6).fill(['g', 0]), ...Array(20).fill(['a', 1])];
    const words = pick(5, 11, { recent })!;
    expect(words.filter((w) => w.includes('g')).length).toBeGreaterThanOrEqual(3);
  });

  it('prefers words absent from the last two word levels', () => {
    const first = pick(10, 1)!;
    const second = pick(10, 2, { recentWordLevels: [first] })!;
    const fresh = second.filter((w) => !first.includes(w));
    expect(fresh.length).toBeGreaterThanOrEqual(3);
  });

  it('prefers short words during the first two word levels', () => {
    const early = pick(12, 5, { wordLevelsPlayed: 0 })!;
    expect(Math.max(...early.map((w) => w.length))).toBeLessThanOrEqual(3);
  });
});
