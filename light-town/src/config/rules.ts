/** Every number that drives practice, rewards and persistence. */
export const RULES = {
  targetsPerLevel: 24,
  quota: { newKeys: 12, errorKeys: 6, balanced: 6 },
  /** Highest count of one key in 24 targets that still allows "no key more than twice in a row". */
  maxSameKeyPerLevel: 16,
  maxRun: 2,
  errorMinSamples: 5,
  errorTopKeys: 3,
  recentBufferSize: 200,
  promotion: { accuracy: 0.9, minNewKeyCorrect: 4 },
  rewards: {
    base: 10,
    goodBonus: 2,
    greatBonus: 4,
    goodAt: 0.9,
    greatAt: 0.98,
    buildingFirst: 20,
    districtFirst: 30,
    festivalRound: 10,
  },
  stripGroupSize: 3,
  signWords: 6,
  signErrorWords: 3,
  stripOpensAt: 2,
  wordsOpenAt: 5,
  festival: { errorTargets: 12 },
  timing: {
    effectiveWindowMs: 15_000,
    autoPauseMs: 30_000,
    hintWaitMs: 8_000,
    hintWrongStreak: 2,
    errorVoiceGapMs: 15_000,
    leaseHeartbeatMs: 5_000,
    leaseTimeoutMs: 15_000,
    sessionIdleEndMs: 60 * 60_000,
    celebrationMaxMs: 2_000,
  },
  restReminderMinutes: { first: 15, second: 20, every: 10 },
  history: { levelLog: 100, dailyDays: 366, settledIds: 50 },
  audio: { music: 0.2, sfx: 0.4, voice: 0.7, duckRatio: 0.25 },
  customKeysMin: 2,
} as const;

/** Effective-practice minutes at which the n-th (0-based) rest reminder appears: 15, 20, 30, 40, … */
export function restReminderThresholdMs(n: number): number {
  const { first, second, every } = RULES.restReminderMinutes;
  const minutes = n === 0 ? first : second + every * (n - 1);
  return minutes * 60_000;
}
