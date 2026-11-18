import { BUILDING_COUNT, STAGES_PER_BUILDING, districtOfBuilding, isDistrictLastBuilding } from '../config/buildings';
import { MAX_STAGE, SPACE, keysForStage, newKeysForStage, sortByCourseOrder } from '../config/keys';
import { RULES, restReminderThresholdMs } from '../config/rules';
import {
  ACCESSORIES,
  DEFAULT_THEME,
  THEMES,
  accessoryById,
  themeById,
  type AccessorySlot,
  type PartnerId,
  type ThemeId,
} from '../config/shop';
import { chooseEncouragement } from './encourage';
import { emptyPhase2 } from './phase2/task';
import type { P2TaskResult } from './phase2/types';
import {
  arrangeCounts,
  generateCourseTargets,
  planBalancedQuota,
  planEvenQuota,
  planMixedQuota,
  type KeyHistory,
} from './generator';
import { levelCoins, meetsPromotionAccuracy } from './scoring';
import {
  emptyStats,
  presentedCounts,
  pruneDaily,
  recordAttempt,
  recordEffectiveTime,
  recordLevelComplete,
  recordPresented,
} from './stats';
import type {
  Entry,
  LevelResult,
  LevelState,
  Mode,
  SaveData,
  Session,
  SessionSummary,
  Settings,
} from './types';
import { buildSignTargets, pickWords, wordsAvailable } from './words';

export const SCHEMA_VERSION = 2 as const;

/** 第一阶段的未完成关（activeTask 判别联合的 phase1 variant）。 */
export function p1Level(save: SaveData): LevelState | null {
  return save.activeTask && save.activeTask.variant === 'phase1' ? save.activeTask.level : null;
}

export function defaultSettings(): Settings {
  return {
    music: true,
    sfx: true,
    voice: true,
    musicVolume: RULES.audio.music,
    sfxVolume: RULES.audio.sfx,
    voiceVolume: RULES.audio.voice,
    masterMute: false,
    reduceMotion: false,
  };
}

export function createNewSave(now: number): SaveData {
  return {
    schemaVersion: SCHEMA_VERSION,
    lastTaskResult: null as P2TaskResult | null,
    phase2: emptyPhase2(now),
    revision: 0,
    createdAt: now,
    updatedAt: now,
    partner: null,
    onboarded: false,
    settings: defaultSettings(),
    course: { stage: 1, allComplete: false, lastQualifying: null, nextMode: 'keys', introSeen: 0 },
    buildings: Array(BUILDING_COUNT).fill(0),
    currentBuilding: 0,
    coins: 0,
    owned: [],
    equipped: { head: null, scarf: null, lamp: null },
    themesOwned: [DEFAULT_THEME],
    theme: DEFAULT_THEME,
    festival: { unlocked: false, round: null, roundsCompleted: 0 },
    session: null,
    activeTask: null,
    lastResult: null,
    stats: emptyStats(),
    settled: [],
    levelSeq: 0,
    wordLevels: [],
    wordLevelsPlayed: 0,
    seen: {},
  };
}

function clone(save: SaveData): SaveData {
  return structuredClone(save);
}

function keyHistory(save: SaveData): KeyHistory {
  return { recent: save.stats.recent, presented: presentedCounts(save.stats) };
}

/* ------------------------------------------------------------------ availability */

export function modeOpen(stage: number, mode: Mode): boolean {
  if (mode === 'keys') return true;
  if (mode === 'strip') return stage >= RULES.stripOpensAt;
  return stage >= RULES.wordsOpenAt && wordsAvailable(keysForStage(stage));
}

export function modeLockReason(stage: number, mode: Mode): string | null {
  if (modeOpen(stage, mode)) return null;
  if (mode === 'strip') return `连接灯带从第 ${RULES.stripOpensAt} 阶课程开始开放，继续学习就能解锁。`;
  return `点亮招牌（单词）从第 ${RULES.wordsOpenAt} 阶课程开始开放，需要先继续学习更多字母。`;
}

export function allBuildingsDone(save: SaveData): boolean {
  return save.currentBuilding >= BUILDING_COUNT;
}

export function remainingBuildings(save: SaveData): number {
  return BUILDING_COUNT - save.buildings.filter((n) => n >= STAGES_PER_BUILDING).length;
}

export type StartRequest =
  | { entry: 'light' }
  | { entry: 'learn' }
  | { entry: 'route'; stage: number; mode: Mode }
  | { entry: 'replay'; building: number }
  | { entry: 'free'; mode: Mode; stage: number }
  | { entry: 'free'; mode: Exclude<Mode, 'sign'>; keys: string[] }
  | { entry: 'festival' };

export type StartError =
  | 'has-active-level'
  | 'all-buildings-done'
  | 'buildings-remaining'
  | 'stage-locked'
  | 'mode-locked'
  | 'building-locked'
  | 'festival-locked'
  | 'keys-invalid';

export function startError(save: SaveData, req: StartRequest): StartError | null {
  if (save.activeTask) return 'has-active-level';
  const stage = save.course.stage;
  switch (req.entry) {
    case 'light':
      return allBuildingsDone(save) ? 'all-buildings-done' : null;
    case 'learn':
      return allBuildingsDone(save) ? null : 'buildings-remaining';
    case 'route':
      if (!Number.isInteger(req.stage) || req.stage < 1 || req.stage > stage) return 'stage-locked';
      return modeOpen(req.stage, req.mode) ? null : 'mode-locked';
    case 'replay':
      return save.buildings[req.building] === STAGES_PER_BUILDING ? null : 'building-locked';
    case 'festival':
      return save.festival.unlocked ? null : 'festival-locked';
    case 'free': {
      if (!save.festival.unlocked) return 'festival-locked';
      if ('keys' in req) {
        const opened = new Set(keysForStage(stage));
        const unique = new Set(req.keys);
        if (unique.size < RULES.customKeysMin || unique.size !== req.keys.length) return 'keys-invalid';
        if (![...unique].every((k) => opened.has(k))) return 'keys-invalid';
        return modeOpen(stage, req.mode) ? null : 'mode-locked';
      }
      if (!Number.isInteger(req.stage) || req.stage < 1 || req.stage > stage) return 'stage-locked';
      return modeOpen(req.stage, req.mode) ? null : 'mode-locked';
    }
  }
}

/* ------------------------------------------------------------------ session */

function newSession(now: number, save: SaveData): Session {
  return {
    id: `S${now.toString(36)}`,
    startedAt: now,
    lastActivityAt: now,
    levelsCompleted: 0,
    attempts: 0,
    correct: 0,
    effectiveMs: 0,
    coins: 0,
    buildingsAtStart: [...save.buildings],
    remindersShown: 0,
  };
}

function sessionExpired(save: SaveData, now: number): boolean {
  return !!save.session && now - save.session.lastActivityAt > RULES.timing.sessionIdleEndMs;
}

function ensureSession(s: SaveData, now: number): void {
  if (sessionExpired(s, now)) s.session = null;
  if (!s.session) s.session = newSession(now, s);
}

/* ------------------------------------------------------------------ level creation */

interface LevelSpec {
  entry: Entry;
  mode: Mode;
  autoMode: boolean;
  courseStage: number;
  courseLabel: string;
  keys: string[];
  standard: boolean;
  buildingTarget: number | null;
  replayBuilding: number | null;
  festival: { roundId: string; index: number } | null;
  targets: string[];
  words: string[] | null;
  wordStarts: number[] | null;
  newKeyQuota: Record<string, number>;
}

function courseSpec(stage: number, seed: number, h: KeyHistory) {
  const gen = generateCourseTargets(stage, seed, h);
  return { targets: gen.targets, newKeyQuota: gen.plan?.newKeyCounts ?? {} };
}

function signSpec(s: SaveData, keys: string[], seed: number) {
  const words = pickWords({
    keys,
    seed,
    recent: s.stats.recent,
    recentWordLevels: s.wordLevels,
    wordLevelsPlayed: s.wordLevelsPlayed,
  });
  if (!words) throw new Error('words unavailable');
  const { targets, wordStarts } = buildSignTargets(words, keys.includes(SPACE));
  return { targets, words, wordStarts };
}

function buildSpec(s: SaveData, req: StartRequest, seed: number, seq: number): LevelSpec {
  const h = keyHistory(s);
  const stage = s.course.stage;
  const base = {
    autoMode: false,
    buildingTarget: null,
    replayBuilding: null,
    festival: null,
    words: null,
    wordStarts: null,
    newKeyQuota: {},
  };
  switch (req.entry) {
    case 'light':
    case 'learn':
    case 'replay': {
      const mode = stage < RULES.stripOpensAt ? 'keys' : s.course.nextMode;
      return {
        ...base,
        entry: req.entry,
        mode,
        autoMode: true,
        courseStage: stage,
        courseLabel: `stage:${stage}`,
        keys: keysForStage(stage),
        standard: true,
        buildingTarget: req.entry === 'light' ? s.currentBuilding : null,
        replayBuilding: req.entry === 'replay' ? req.building : null,
        ...courseSpec(stage, seed, h),
      };
    }
    case 'route':
    case 'free': {
      if ('keys' in req) {
        const keys = sortByCourseOrder(req.keys);
        return {
          ...base,
          entry: 'free',
          mode: req.mode,
          courseStage: stage,
          courseLabel: `custom:${keys.join(',')}`,
          keys,
          standard: false,
          targets: arrangeCounts(planEvenQuota(keys, h), seed),
        };
      }
      const keys = keysForStage(req.stage);
      const common = {
        ...base,
        entry: req.entry,
        mode: req.mode,
        courseStage: req.stage,
        courseLabel: `stage:${req.stage}`,
        keys,
      };
      if (req.mode === 'sign') return { ...common, standard: false, ...signSpec(s, keys, seed) };
      return {
        ...common,
        standard: req.entry === 'route' && req.stage === stage,
        ...courseSpec(req.stage, seed, h),
      };
    }
    case 'festival': {
      const round = (s.festival.round ??= { id: `F${seq}`, done: [false, false, false] });
      const index = round.done.indexOf(false);
      const keys = keysForStage(stage);
      const common = {
        ...base,
        entry: 'festival' as const,
        courseStage: stage,
        courseLabel: `stage:${stage}`,
        keys,
        standard: false,
        festival: { roundId: round.id, index },
      };
      if (index === 0) {
        const counts = planMixedQuota(keys, h, RULES.festival.errorTargets);
        return { ...common, mode: 'keys', targets: arrangeCounts(counts, seed) };
      }
      if (index === 1) {
        const mode = modeOpen(stage, 'strip') ? 'strip' : 'keys';
        return { ...common, mode, targets: arrangeCounts(planBalancedQuota(keys, h), seed) };
      }
      if (modeOpen(stage, 'sign')) return { ...common, mode: 'sign', ...signSpec(s, keys, seed) };
      return { ...common, mode: 'keys', ...courseSpec(stage, seed, h) };
    }
  }
}

export function startLevel(
  save: SaveData,
  req: StartRequest,
  now: number,
  seed: number,
): { save: SaveData; error: StartError | null } {
  const error = startError(save, req);
  if (error) return { save, error };
  const s = clone(save);
  ensureSession(s, now);
  s.levelSeq += 1;
  const seq = s.levelSeq;
  const spec = buildSpec(s, req, seed, seq);
  const level: LevelState = {
    id: `L${seq}-${(seed >>> 0).toString(36)}`,
    seq,
    seed,
    ...spec,
    pos: 0,
    attempts: 0,
    correct: 0,
    keyCounts: {},
    wrongStreak: 0,
    effectiveMs: 0,
    createdAt: now,
    paused: true,
    activeSince: null,
    lastInputAt: null,
    accountedUntil: null,
    targetShownAt: null,
  };
  s.activeTask = { variant: 'phase1', level };
  recordPresented(s.stats, level.targets[0]);
  return { save: s, error: null };
}

/* ------------------------------------------------------------------ timing */

function creditTime(s: SaveData, now: number): void {
  const lvl = p1Level(s);
  if (!lvl || lvl.paused || lvl.activeSince === null) return;
  const ref = Math.max(lvl.lastInputAt ?? lvl.activeSince, lvl.activeSince);
  const windowEnd = ref + RULES.timing.effectiveWindowMs;
  const from = lvl.accountedUntil ?? lvl.activeSince;
  const to = Math.min(now, windowEnd);
  if (to > from) {
    lvl.effectiveMs += to - from;
    recordEffectiveTime(s.stats, from, to);
    if (s.session) s.session.effectiveMs += to - from;
  }
  lvl.accountedUntil = Math.max(from, now);
}

function pauseInPlace(s: SaveData, now: number): void {
  const lvl = p1Level(s);
  if (!lvl || lvl.paused) return;
  creditTime(s, now);
  lvl.paused = true;
  lvl.activeSince = null;
  lvl.accountedUntil = null;
}

export function pauseLevel(save: SaveData, now: number): SaveData {
  const lvl0 = p1Level(save);
  if (!lvl0 || lvl0.paused) return save;
  const s = clone(save);
  pauseInPlace(s, now);
  return s;
}

export function resumeLevel(save: SaveData, now: number): SaveData {
  const lvl0 = p1Level(save);
  if (!lvl0 || !lvl0.paused) return save;
  const s = clone(save);
  ensureSession(s, now);
  const lvl = p1Level(s)!;
  lvl.paused = false;
  lvl.activeSince = now;
  lvl.accountedUntil = now;
  lvl.targetShownAt = now;
  s.session!.lastActivityAt = now;
  return s;
}

/** Periodic update while practising: credits effective time and auto-pauses after 30 s without input. */
export function tick(save: SaveData, now: number): { save: SaveData; autoPaused: boolean } {
  const lvl0 = p1Level(save);
  if (!lvl0 || lvl0.paused || lvl0.activeSince === null) return { save, autoPaused: false };
  const s = clone(save);
  creditTime(s, now);
  const lvl = p1Level(s)!;
  const ref = Math.max(lvl.lastInputAt ?? lvl.activeSince!, lvl.activeSince!);
  if (now - ref >= RULES.timing.autoPauseMs) {
    pauseInPlace(s, now);
    return { save: s, autoPaused: true };
  }
  return { save: s, autoPaused: false };
}

/** Milliseconds since the learner last acted on the current target (for the 8-second hint). */
export function idleMs(level: LevelState, now: number): number {
  if (level.paused) return 0;
  const ref = Math.max(level.targetShownAt ?? 0, level.lastInputAt ?? 0, level.activeSince ?? 0);
  return now - ref;
}

/* ------------------------------------------------------------------ input */

export interface InputOutcome {
  save: SaveData;
  outcome: 'correct' | 'wrong' | 'ignored';
  completed: boolean;
  target: string | null;
}

export function applyInput(save: SaveData, ch: string, now: number): InputOutcome {
  const lvl0 = p1Level(save);
  if (!lvl0 || lvl0.paused || lvl0.pos >= lvl0.targets.length) {
    return { save, outcome: 'ignored', completed: false, target: null };
  }
  const s = clone(save);
  creditTime(s, now);
  const lvl = p1Level(s)!;
  const target = lvl.targets[lvl.pos];
  const ok = ch === target;
  lvl.attempts += 1;
  if (ok) lvl.correct += 1;
  const kc = (lvl.keyCounts[target] ??= { a: 0, c: 0 });
  kc.a += 1;
  if (ok) kc.c += 1;
  recordAttempt(s.stats, target, ch, ok, now);
  if (s.session) {
    s.session.attempts += 1;
    if (ok) s.session.correct += 1;
    s.session.lastActivityAt = now;
  }
  lvl.lastInputAt = now;
  if (ok) {
    lvl.pos += 1;
    lvl.wrongStreak = 0;
    lvl.targetShownAt = now;
    if (lvl.pos < lvl.targets.length) recordPresented(s.stats, lvl.targets[lvl.pos]);
  } else {
    lvl.wrongStreak += 1;
  }
  return { save: s, outcome: ok ? 'correct' : 'wrong', completed: lvl.pos >= lvl.targets.length, target };
}

/* ------------------------------------------------------------------ settlement */

export type SettleOutcome =
  | { save: SaveData; result: LevelResult; settledNow: true }
  | { save: SaveData; result: LevelResult | null; settledNow: false; reason: 'no-level' | 'incomplete' | 'already' };

/**
 * Settles the finished active level in one commit: coins, building stage, course promotion, festival round,
 * session and statistics. Repeated calls return the stored result without paying again.
 */
export function settleLevel(save: SaveData, now: number): SettleOutcome {
  const lvl0 = p1Level(save);
  if (!lvl0) return { save, result: save.lastResult, settledNow: false, reason: 'no-level' };
  if (lvl0.pos < lvl0.targets.length) return { save, result: null, settledNow: false, reason: 'incomplete' };
  if (save.settled.includes(lvl0.id)) {
    const s = clone(save);
    s.activeTask = null;
    return { save: s, result: s.lastResult, settledNow: false, reason: 'already' };
  }

  const s = clone(save);
  pauseInPlace(s, now);
  ensureSession(s, now);
  const lvl = p1Level(s)!;
  const coinsBase = levelCoins(lvl.correct, lvl.attempts);
  const coins = { base: coinsBase.base, accuracy: coinsBase.accuracy, building: 0, district: 0, festival: 0, total: 0 };

  let building: LevelResult['building'] = null;
  let districtOpened: number | null = null;
  let festivalUnlocked = false;
  let completedBuilding: number | null = null;
  if (lvl.entry === 'light' && lvl.buildingTarget !== null && lvl.buildingTarget === s.currentBuilding) {
    const b = lvl.buildingTarget;
    const before = s.buildings[b];
    if (before < STAGES_PER_BUILDING) {
      const after = before + 1;
      s.buildings[b] = after;
      const completed = after === STAGES_PER_BUILDING;
      building = { index: b, before, after, completed };
      if (completed) {
        completedBuilding = b;
        coins.building = RULES.rewards.buildingFirst;
        if (isDistrictLastBuilding(b)) {
          coins.district = RULES.rewards.districtFirst;
          if (b < BUILDING_COUNT - 1) districtOpened = districtOfBuilding(b) + 1;
        }
        s.currentBuilding = b + 1;
        if (b === BUILDING_COUNT - 1) {
          s.festival.unlocked = true;
          festivalUnlocked = true;
        }
      }
    }
  }

  let promotion: LevelResult['promotion'] = null;
  if (lvl.standard && lvl.courseStage === s.course.stage && !s.course.allComplete) {
    const newKeys = newKeysForStage(lvl.courseStage);
    let promotedTo: number | null = null;
    let allComplete = false;
    if (meetsPromotionAccuracy(lvl.correct, lvl.attempts)) {
      const counts = Object.fromEntries(newKeys.map((k) => [k, lvl.keyCounts[k]?.c ?? 0]));
      const prev = s.course.lastQualifying;
      const enough =
        prev !== null && newKeys.every((k) => counts[k] + (prev[k] ?? 0) >= RULES.promotion.minNewKeyCorrect);
      if (enough) {
        s.course.lastQualifying = null;
        if (s.course.stage < MAX_STAGE) {
          s.course.stage += 1;
          s.course.nextMode = 'keys';
          promotedTo = s.course.stage;
        } else {
          s.course.allComplete = true;
          allComplete = true;
        }
      } else {
        s.course.lastQualifying = counts;
      }
    } else {
      s.course.lastQualifying = null;
    }
    promotion = { promotedTo, allComplete, streak: s.course.lastQualifying ? 1 : 0 };
  }
  if (lvl.autoMode && promotion?.promotedTo == null && s.course.stage >= RULES.stripOpensAt) {
    s.course.nextMode = lvl.mode === 'keys' ? 'strip' : 'keys';
  }

  let festival: LevelResult['festival'] = null;
  const round = s.festival.round;
  if (lvl.festival && round && round.id === lvl.festival.roundId) {
    round.done[lvl.festival.index] = true;
    const roundComplete = round.done.every(Boolean);
    if (roundComplete) {
      coins.festival = RULES.rewards.festivalRound;
      s.festival.roundsCompleted += 1;
      s.festival.round = null;
    }
    festival = { index: lvl.festival.index, roundComplete };
  }

  coins.total = coins.base + coins.accuracy + coins.building + coins.district + coins.festival;
  s.coins += coins.total;

  const encouragement = chooseEncouragement({
    completedBuilding,
    entry: lvl.entry,
    mode: lvl.mode,
    course: lvl.courseLabel,
    attempts: lvl.attempts,
    correct: lvl.correct,
    history: s.stats.levels,
  });

  recordLevelComplete(s.stats, {
    id: lvl.id,
    at: now,
    entry: lvl.entry,
    mode: lvl.mode,
    course: lvl.courseLabel,
    attempts: lvl.attempts,
    correct: lvl.correct,
    effectiveMs: lvl.effectiveMs,
    coins: coins.total,
  });
  pruneDaily(s.stats, now);

  const session = s.session!;
  session.levelsCompleted += 1;
  session.coins += coins.total;
  session.lastActivityAt = now;
  let restReminder = false;
  while (session.effectiveMs >= restReminderThresholdMs(session.remindersShown)) {
    session.remindersShown += 1;
    restReminder = true;
  }

  if (lvl.mode === 'sign' && lvl.words) {
    s.wordLevels = [lvl.words, ...s.wordLevels].slice(0, 2);
    s.wordLevelsPlayed += 1;
  }

  const result: LevelResult = {
    levelId: lvl.id,
    at: now,
    entry: lvl.entry,
    mode: lvl.mode,
    courseStage: lvl.courseStage,
    courseLabel: lvl.courseLabel,
    attempts: lvl.attempts,
    correct: lvl.correct,
    effectiveMs: lvl.effectiveMs,
    coins,
    building,
    replayBuilding: lvl.replayBuilding,
    districtOpened,
    festivalUnlocked,
    festival,
    promotion,
    encouragement,
    restReminder,
    wordsCompleted: lvl.words,
  };
  s.settled = [...s.settled, lvl.id].slice(-RULES.history.settledIds);
  s.activeTask = null;
  s.lastResult = result;
  return { save: s, result, settledNow: true };
}

/* ------------------------------------------------------------------ level and session lifecycle */

/** 重新开始 / 放弃: drop the unfinished level. Statistics already recorded stay; nothing is paid. */
export function discardActiveLevel(save: SaveData, now: number): SaveData {
  if (!save.activeTask) return save;
  const s = clone(save);
  pauseInPlace(s, now);
  s.activeTask = null;
  return s;
}

/** 结束本次: close the session and report it, including a partial unfinished level (no rewards). */
export function endSession(save: SaveData, now: number): { save: SaveData; summary: SessionSummary | null } {
  if (!save.session) return { save, summary: null };
  const s = clone(save);
  pauseInPlace(s, now);
  const session = s.session!;
  const buildingChanges = s.buildings
    .map((to, index) => ({ index, from: session.buildingsAtStart[index] ?? 0, to }))
    .filter((c) => c.to !== c.from);
  const lvl = p1Level(s);
  const summary: SessionSummary = {
    levelsCompleted: session.levelsCompleted,
    attempts: session.attempts,
    correct: session.correct,
    effectiveMs: session.effectiveMs,
    coins: session.coins,
    buildingChanges,
    partialLevel: lvl && lvl.attempts > 0 ? { attempts: lvl.attempts, correct: lvl.correct } : null,
  };
  s.session = null;
  return { save: s, summary };
}

/** After loading: an unfinished level always comes back paused, and an idle session older than an hour is closed. */
export function prepareLoadedSave(save: SaveData, now: number): SaveData {
  const s = clone(save);
  const lvl = p1Level(s);
  if (lvl && !lvl.paused) {
    lvl.paused = true;
    lvl.activeSince = null;
    lvl.accountedUntil = null;
  }
  if (sessionExpired(s, now)) s.session = null;
  pruneDaily(s.stats, now);
  return s;
}

/* ------------------------------------------------------------------ profile, shop and settings */

export function choosePartner(save: SaveData, partner: PartnerId): SaveData {
  const s = clone(save);
  s.partner = partner;
  return s;
}

export function finishOnboarding(save: SaveData): SaveData {
  const s = clone(save);
  s.onboarded = true;
  s.course.introSeen = Math.max(s.course.introSeen, 1);
  return s;
}

export function markIntroSeen(save: SaveData, stage: number): SaveData {
  const s = clone(save);
  s.course.introSeen = Math.max(s.course.introSeen, stage);
  return s;
}

export function markSeen(save: SaveData, key: string): SaveData {
  if (save.seen[key]) return save;
  const s = clone(save);
  s.seen[key] = true;
  return s;
}

export function updateSettings(save: SaveData, patch: Partial<Settings>): SaveData {
  const s = clone(save);
  s.settings = { ...s.settings, ...patch };
  return s;
}

export type ShopError = 'unknown' | 'owned' | 'insufficient' | 'locked' | 'not-owned';

export function buyAccessory(save: SaveData, id: string): { save: SaveData; error: ShopError | null } {
  const item = accessoryById(id);
  if (!item) return { save, error: 'unknown' };
  if (save.owned.includes(id)) return { save, error: 'owned' };
  if (save.coins < item.price) return { save, error: 'insufficient' };
  const s = clone(save);
  s.coins -= item.price;
  s.owned.push(id);
  s.equipped[item.slot] = id;
  return { save: s, error: null };
}

export function equipAccessory(
  save: SaveData,
  slot: AccessorySlot,
  id: string | null,
): { save: SaveData; error: ShopError | null } {
  if (id !== null) {
    const item = accessoryById(id);
    if (!item || item.slot !== slot) return { save, error: 'unknown' };
    if (!save.owned.includes(id)) return { save, error: 'not-owned' };
  }
  const s = clone(save);
  s.equipped[slot] = id;
  return { save: s, error: null };
}

export function buyTheme(save: SaveData, id: ThemeId): { save: SaveData; error: ShopError | null } {
  const theme = themeById(id);
  if (!theme) return { save, error: 'unknown' };
  if (!save.festival.unlocked) return { save, error: 'locked' };
  if (save.themesOwned.includes(id)) return { save, error: 'owned' };
  if (save.coins < theme.price) return { save, error: 'insufficient' };
  const s = clone(save);
  s.coins -= theme.price;
  s.themesOwned.push(id);
  s.theme = id;
  return { save: s, error: null };
}

export function applyTheme(save: SaveData, id: ThemeId): { save: SaveData; error: ShopError | null } {
  if (!themeById(id)) return { save, error: 'unknown' };
  if (!save.themesOwned.includes(id)) return { save, error: 'not-owned' };
  const s = clone(save);
  s.theme = id;
  return { save: s, error: null };
}

export const ALL_ACCESSORY_IDS = ACCESSORIES.map((a) => a.id);

/** 下一目标（2026-11-17 新增，纯派生）：最便宜的还没买到的商品，给「目标卡」展示。 */
export interface ShopGoal {
  kind: 'accessory' | 'theme';
  id: string;
  name: string;
  price: number;
}

export function nextShopGoal(save: Pick<SaveData, 'owned' | 'themesOwned'>): ShopGoal | null {
  const candidates: ShopGoal[] = [
    ...ACCESSORIES.filter((a) => !save.owned.includes(a.id)).map((a) => ({ kind: 'accessory' as const, id: a.id, name: a.name, price: a.price })),
    ...THEMES.filter((t) => t.price > 0 && !save.themesOwned.includes(t.id)).map((t) => ({ kind: 'theme' as const, id: t.id, name: t.name, price: t.price })),
  ];
  // 最便宜优先；同价保持目录顺序（目录已按档位排列）。
  return candidates.sort((a, b) => a.price - b.price)[0] ?? null;
}
