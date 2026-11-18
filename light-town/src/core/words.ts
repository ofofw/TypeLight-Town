import { SPACE } from '../config/keys';
import { RULES } from '../config/rules';
import { WORDS } from '../config/words';
import { arrangeNoLongRuns, rankErrorKeys } from './generator';
import { createRng, deriveSeed, shuffleInPlace } from './rng';
import type { RecentAttempt } from './types';

/** Words from the fixed bank whose letters are all opened. */
export function eligibleWords(keys: Iterable<string>): string[] {
  const opened = new Set(keys);
  return WORDS.filter((w) => [...w].every((ch) => opened.has(ch)));
}

export function wordsAvailable(keys: Iterable<string>): boolean {
  return eligibleWords(keys).length >= 2;
}

export interface WordPickInput {
  keys: readonly string[];
  seed: number;
  recent: readonly RecentAttempt[];
  /** Words of the most recent word levels, newest first. */
  recentWordLevels: readonly (readonly string[])[];
  /** Word levels completed so far; the first two prefer short words. */
  wordLevelsPlayed: number;
}

/**
 * Six words: up to three containing error-prone keys, the rest preferring words absent from the last two
 * word levels. Ties are broken by the level seed (and by length for the first two word levels).
 * Returns null when fewer than two words are eligible.
 */
export function pickWords(input: WordPickInput): string[] | null {
  const pool = eligibleWords(input.keys);
  if (pool.length < 2) return null;
  const rng = createRng(deriveSeed(input.seed, 2));
  const tiebreak = new Map(pool.map((w) => [w, rng()]));
  const shortFirst = input.wordLevelsPlayed < 2;
  const byTie = (a: string, b: string) =>
    (shortFirst ? a.length - b.length : 0) || (tiebreak.get(a) ?? 0) - (tiebreak.get(b) ?? 0);

  const letterKeys = input.keys.filter((k) => k !== SPACE);
  const errorKeys = rankErrorKeys(letterKeys, input.recent).map((r) => r.key);
  const errorRank = (w: string) => {
    let best = Infinity;
    for (const ch of w) {
      const i = errorKeys.indexOf(ch);
      if (i >= 0 && i < best) best = i;
    }
    return best;
  };

  const chosen: string[] = [];
  const withError = pool
    .filter((w) => errorRank(w) !== Infinity)
    .sort((a, b) => errorRank(a) - errorRank(b) || byTie(a, b));
  for (const w of withError) {
    if (chosen.length >= RULES.signErrorWords) break;
    chosen.push(w);
  }

  const recentWords = new Set(input.recentWordLevels.slice(0, 2).flat());
  const rest = pool
    .filter((w) => !chosen.includes(w))
    .sort((a, b) => Number(recentWords.has(a)) - Number(recentWords.has(b)) || byTie(a, b));
  for (const w of rest) {
    if (chosen.length >= RULES.signWords) break;
    chosen.push(w);
  }

  const distinct = [...chosen];
  for (let i = 0; chosen.length < RULES.signWords; i++) chosen.push(distinct[i % distinct.length]);
  const counts: Record<string, number> = {};
  for (const w of shuffleInPlace(chosen, rng)) counts[w] = (counts[w] ?? 0) + 1;
  return arrangeNoLongRuns(counts, createRng(deriveSeed(input.seed, 3)), 1);
}

export interface SignTargets {
  targets: string[];
  wordStarts: number[];
}

/** Letters of each word; with spaces opened, one space after each of the first five words. */
export function buildSignTargets(words: readonly string[], withSpaces: boolean): SignTargets {
  const targets: string[] = [];
  const wordStarts: number[] = [];
  words.forEach((w, i) => {
    wordStarts.push(targets.length);
    targets.push(...w);
    if (withSpaces && i < words.length - 1) targets.push(SPACE);
  });
  return { targets, wordStarts };
}
