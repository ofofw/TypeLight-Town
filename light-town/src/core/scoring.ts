import { RULES } from '../config/rules';

/** Unrounded accuracy, or null when there were no attempts. */
export function accuracy(correct: number, attempts: number): number | null {
  return attempts > 0 ? correct / attempts : null;
}

/** Rounded whole-number percentage for display; "—" without attempts (never 100%). */
export function formatAccuracy(correct: number, attempts: number): string {
  const acc = accuracy(correct, attempts);
  return acc === null ? '—' : `${Math.round(acc * 100)}%`;
}

/** Accuracy bonus from the unrounded ratio: 4 at ≥98%, 2 at ≥90%, otherwise 0. */
export function accuracyBonus(correct: number, attempts: number): number {
  const acc = accuracy(correct, attempts);
  if (acc === null) return 0;
  if (acc >= RULES.rewards.greatAt) return RULES.rewards.greatBonus;
  if (acc >= RULES.rewards.goodAt) return RULES.rewards.goodBonus;
  return 0;
}

export function levelCoins(correct: number, attempts: number): { base: number; accuracy: number } {
  return { base: RULES.rewards.base, accuracy: accuracyBonus(correct, attempts) };
}

export function meetsPromotionAccuracy(correct: number, attempts: number): boolean {
  const acc = accuracy(correct, attempts);
  return acc !== null && acc >= RULES.promotion.accuracy;
}
