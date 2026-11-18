import { BUILDING_COUNT, STAGES_PER_BUILDING } from '../../config/buildings';
import { COURSE_KEY_ORDER, MAX_STAGE } from '../../config/keys';
import { isKnownP2ContentVersion, phase2Item, phase2Task } from '../../config/phase2/content';
import { PHASE2_RULES } from '../../config/phase2/rules';
import { RULES } from '../../config/rules';
import { ACCESSORIES, PARTNERS, THEMES } from '../../config/shop';
import type { SaveData } from '../types';

export class ValidationError extends Error {
  constructor(public readonly path: string, detail = 'invalid') {
    super(`${path}: ${detail}`);
  }
}

type Obj = Record<string, unknown>;

const MAX_COUNT = 1e9;
const MAX_MS = 1e13;
const COURSE_KEYS = new Set(COURSE_KEY_ORDER);
const ACCESSORY_SLOT = new Map(ACCESSORIES.map((a) => [a.id, a.slot]));
const THEME_IDS = new Set<string>(THEMES.map((t) => t.id));
const PARTNER_IDS = new Set<string>(PARTNERS.map((p) => p.id));
const MODES = new Set(['keys', 'strip', 'sign']);
const ENTRIES = new Set(['light', 'learn', 'route', 'replay', 'free', 'festival']);
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function obj(v: unknown, path: string): Obj {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ValidationError(path, 'not an object');
  return v as Obj;
}

function int(v: unknown, path: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) {
    throw new ValidationError(path, `expected integer in [${min}, ${max}]`);
  }
  return v;
}

function num(v: unknown, path: string, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) {
    throw new ValidationError(path, `expected number in [${min}, ${max}]`);
  }
  return v;
}

function bool(v: unknown, path: string): boolean {
  if (typeof v !== 'boolean') throw new ValidationError(path, 'expected boolean');
  return v;
}

function str(v: unknown, path: string, maxLen = 200): string {
  if (typeof v !== 'string' || v.length > maxLen) throw new ValidationError(path, 'expected string');
  return v;
}

function oneOf(v: unknown, path: string, allowed: Set<string>): string {
  if (typeof v !== 'string' || !allowed.has(v)) throw new ValidationError(path, 'unexpected value');
  return v;
}

function arr(v: unknown, path: string, maxLen: number): unknown[] {
  if (!Array.isArray(v) || v.length > maxLen) throw new ValidationError(path, `expected array (≤${maxLen})`);
  return v;
}

function entries(v: unknown, path: string, maxKeys: number): [string, unknown][] {
  const o = obj(v, path);
  const list = Object.entries(o);
  if (list.length > maxKeys) throw new ValidationError(path, 'too many keys');
  return list;
}

function nullable<T>(v: unknown, fn: (x: unknown) => T): T | null {
  return v === null ? null : fn(v);
}

function courseKey(v: unknown, path: string): string {
  return oneOf(v, path, COURSE_KEYS);
}

function countRecord(v: unknown, path: string, keyCheck: (k: string, p: string) => void, max = MAX_COUNT): void {
  for (const [k, n] of entries(v, path, 64)) {
    keyCheck(k, `${path}.${k}`);
    int(n, `${path}.${k}`, 0, max);
  }
}

function validateSettings(v: unknown): void {
  const o = obj(v, 'settings');
  for (const k of ['music', 'sfx', 'voice', 'masterMute', 'reduceMotion']) bool(o[k], `settings.${k}`);
  for (const k of ['musicVolume', 'sfxVolume', 'voiceVolume']) num(o[k], `settings.${k}`, 0, 1);
}

function validateCourse(v: unknown): void {
  const o = obj(v, 'course');
  int(o.stage, 'course.stage', 1, MAX_STAGE);
  bool(o.allComplete, 'course.allComplete');
  nullable(o.lastQualifying, (x) => countRecord(x, 'course.lastQualifying', courseKey, 1000));
  oneOf(o.nextMode, 'course.nextMode', new Set(['keys', 'strip']));
  int(o.introSeen, 'course.introSeen', 0, MAX_STAGE);
}

function validateBuildings(save: Obj): void {
  const list = arr(save.buildings, 'buildings', BUILDING_COUNT);
  if (list.length !== BUILDING_COUNT) throw new ValidationError('buildings', 'wrong length');
  list.forEach((n, i) => int(n, `buildings[${i}]`, 0, STAGES_PER_BUILDING));
  const current = int(save.currentBuilding, 'currentBuilding', 0, BUILDING_COUNT);
  const stages = list as number[];
  stages.forEach((n, i) => {
    if (i < current && n !== STAGES_PER_BUILDING) throw new ValidationError(`buildings[${i}]`, 'should be complete');
    if (i === current && n >= STAGES_PER_BUILDING) throw new ValidationError(`buildings[${i}]`, 'should be incomplete');
    if (i > current && n !== 0) throw new ValidationError(`buildings[${i}]`, 'should be dark');
  });
}

function validateShop(save: Obj): void {
  const owned = arr(save.owned, 'owned', ACCESSORIES.length).map((id, i) => {
    if (typeof id !== 'string' || !ACCESSORY_SLOT.has(id)) throw new ValidationError(`owned[${i}]`);
    return id;
  });
  if (new Set(owned).size !== owned.length) throw new ValidationError('owned', 'duplicates');
  const equipped = obj(save.equipped, 'equipped');
  for (const slot of ['head', 'scarf', 'lamp']) {
    const id = equipped[slot];
    if (id === null) continue;
    if (typeof id !== 'string' || ACCESSORY_SLOT.get(id) !== slot || !owned.includes(id)) {
      throw new ValidationError(`equipped.${slot}`);
    }
  }
  const themes = arr(save.themesOwned, 'themesOwned', THEMES.length).map((t, i) => oneOf(t, `themesOwned[${i}]`, THEME_IDS));
  if (!themes.includes('warm') || new Set(themes).size !== themes.length) throw new ValidationError('themesOwned');
  const theme = oneOf(save.theme, 'theme', THEME_IDS);
  if (!themes.includes(theme)) throw new ValidationError('theme', 'not owned');
}

function validateFestival(save: Obj): void {
  const f = obj(save.festival, 'festival');
  const unlocked = bool(f.unlocked, 'festival.unlocked');
  if (unlocked && save.currentBuilding !== BUILDING_COUNT) throw new ValidationError('festival.unlocked');
  int(f.roundsCompleted, 'festival.roundsCompleted', 0, MAX_COUNT);
  nullable(f.round, (r) => {
    const round = obj(r, 'festival.round');
    str(round.id, 'festival.round.id', 40);
    const done = arr(round.done, 'festival.round.done', 3);
    if (done.length !== 3) throw new ValidationError('festival.round.done');
    done.forEach((d, i) => bool(d, `festival.round.done[${i}]`));
  });
}

function validateSession(v: unknown): void {
  const o = obj(v, 'session');
  str(o.id, 'session.id', 40);
  num(o.startedAt, 'session.startedAt', 0, MAX_MS);
  num(o.lastActivityAt, 'session.lastActivityAt', 0, MAX_MS);
  for (const k of ['levelsCompleted', 'attempts', 'correct', 'coins', 'remindersShown']) {
    int(o[k], `session.${k}`, 0, MAX_COUNT);
  }
  if ((o.correct as number) > (o.attempts as number)) throw new ValidationError('session.correct');
  num(o.effectiveMs, 'session.effectiveMs', 0, MAX_MS);
  const b = arr(o.buildingsAtStart, 'session.buildingsAtStart', BUILDING_COUNT);
  b.forEach((n, i) => int(n, `session.buildingsAtStart[${i}]`, 0, STAGES_PER_BUILDING));
}

function validateLevel(v: unknown, path = 'activeLevel'): void {
  const o = obj(v, path);
  const at = (k: string): string => `${path}.${k}`;
  str(o.id, at('id'), 60);
  int(o.seq, at('seq'), 1, MAX_COUNT);
  oneOf(o.entry, at('entry'), ENTRIES);
  oneOf(o.mode, at('mode'), MODES);
  bool(o.autoMode, at('autoMode'));
  int(o.courseStage, at('courseStage'), 1, MAX_STAGE);
  str(o.courseLabel, at('courseLabel'), 80);
  arr(o.keys, at('keys'), COURSE_KEY_ORDER.length).forEach((k, i) => courseKey(k, `${path}.keys[${i}]`));
  bool(o.standard, at('standard'));
  nullable(o.buildingTarget, (x) => int(x, at('buildingTarget'), 0, BUILDING_COUNT - 1));
  nullable(o.replayBuilding, (x) => int(x, at('replayBuilding'), 0, BUILDING_COUNT - 1));
  nullable(o.festival, (x) => {
    const f = obj(x, at('festival'));
    str(f.roundId, at('festival.roundId'), 40);
    int(f.index, at('festival.index'), 0, 2);
  });
  int(o.seed, at('seed'), 0, 0xffffffff);
  const targets = arr(o.targets, at('targets'), 200);
  if (targets.length === 0) throw new ValidationError(at('targets'), 'empty');
  targets.forEach((t, i) => courseKey(t, `${path}.targets[${i}]`));
  nullable(o.words, (x) => arr(x, at('words'), 12).forEach((w, i) => str(w, `${path}.words[${i}]`, 20)));
  nullable(o.wordStarts, (x) =>
    arr(x, at('wordStarts'), 12).forEach((n, i) => int(n, `${path}.wordStarts[${i}]`, 0, targets.length)),
  );
  countRecord(o.newKeyQuota, at('newKeyQuota'), courseKey, RULES.targetsPerLevel);
  int(o.pos, at('pos'), 0, targets.length);
  const attempts = int(o.attempts, at('attempts'), 0, MAX_COUNT);
  const correct = int(o.correct, at('correct'), 0, attempts);
  if (correct !== o.pos) throw new ValidationError(at('correct'), 'must equal position');
  for (const [k, c] of entries(o.keyCounts, at('keyCounts'), 64)) {
    const kc = obj(c, `${path}.keyCounts.${k}`);
    const a = int(kc.a, `${path}.keyCounts.${k}.a`, 0, MAX_COUNT);
    int(kc.c, `${path}.keyCounts.${k}.c`, 0, a);
  }
  int(o.wrongStreak, at('wrongStreak'), 0, MAX_COUNT);
  num(o.effectiveMs, at('effectiveMs'), 0, MAX_MS);
  num(o.createdAt, at('createdAt'), 0, MAX_MS);
  bool(o.paused, at('paused'));
  for (const k of ['activeSince', 'lastInputAt', 'accountedUntil', 'targetShownAt']) {
    nullable(o[k], (x) => num(x, at(k), 0, MAX_MS));
  }
}

function validateStats(v: unknown): void {
  const s = obj(v, 'stats');
  const attempts = int(s.attempts, 'stats.attempts', 0, MAX_COUNT);
  int(s.correct, 'stats.correct', 0, attempts);
  num(s.effectiveMs, 'stats.effectiveMs', 0, MAX_MS);
  int(s.levelsCompleted, 'stats.levelsCompleted', 0, MAX_COUNT);
  for (const [k, ks] of entries(s.keys, 'stats.keys', 64)) {
    courseKey(k, `stats.keys.${k}`);
    const o = obj(ks, `stats.keys.${k}`);
    const a = int(o.attempts, `stats.keys.${k}.attempts`, 0, MAX_COUNT);
    int(o.correct, `stats.keys.${k}.correct`, 0, a);
    int(o.presented, `stats.keys.${k}.presented`, 0, MAX_COUNT);
  }
  for (const [k, row] of entries(s.mistypes, 'stats.mistypes', 64)) {
    courseKey(k, `stats.mistypes.${k}`);
    countRecord(row, `stats.mistypes.${k}`, (ch, p) => str(ch, p, 2));
  }
  const recent = arr(s.recent, 'stats.recent', RULES.recentBufferSize);
  recent.forEach((r, i) => {
    const pair = arr(r, `stats.recent[${i}]`, 2);
    courseKey(pair[0], `stats.recent[${i}][0]`);
    if (pair[1] !== 0 && pair[1] !== 1) throw new ValidationError(`stats.recent[${i}][1]`);
  });
  for (const [k, d] of entries(s.daily, 'stats.daily', RULES.history.dailyDays + 2)) {
    if (!DATE_KEY.test(k)) throw new ValidationError(`stats.daily.${k}`, 'bad date');
    const o = obj(d, `stats.daily.${k}`);
    const a = int(o.attempts, `stats.daily.${k}.attempts`, 0, MAX_COUNT);
    int(o.correct, `stats.daily.${k}.correct`, 0, a);
    num(o.effectiveMs, `stats.daily.${k}.effectiveMs`, 0, MAX_MS);
    int(o.levels, `stats.daily.${k}.levels`, 0, MAX_COUNT);
  }
  arr(s.levels, 'stats.levels', RULES.history.levelLog).forEach((l, i) => {
    const o = obj(l, `stats.levels[${i}]`);
    str(o.id, `stats.levels[${i}].id`, 60);
    num(o.at, `stats.levels[${i}].at`, 0, MAX_MS);
    oneOf(o.entry, `stats.levels[${i}].entry`, ENTRIES);
    oneOf(o.mode, `stats.levels[${i}].mode`, MODES);
    str(o.course, `stats.levels[${i}].course`, 80);
    const a = int(o.attempts, `stats.levels[${i}].attempts`, 0, MAX_COUNT);
    int(o.correct, `stats.levels[${i}].correct`, 0, a);
    num(o.effectiveMs, `stats.levels[${i}].effectiveMs`, 0, MAX_MS);
    int(o.coins, `stats.levels[${i}].coins`, 0, 1000);
  });
}

const P2_LANGUAGES = new Set<string>(['zh', 'en']);
const P2_KINDS = new Set<string>(['story', 'errand', 'drill']);
const P2_GROUP_KEYS = new Set<string>(['zh:story', 'zh:errand', 'zh:drill', 'en:story', 'en:errand', 'en:drill']);
const DRILL_IDS = new Set<string>(['uppercase', 'space', 'punctuation', 'tricky-en', 'selection', 'tricky-zh', 'polyphone', 'umlaut']);

function itemId(v: unknown, path: string): string {
  const id = str(v, path, 24);
  if (!phase2Item(id)) throw new ValidationError(path, 'unexpected item id');
  return id;
}

function validatePhase2(v: unknown): void {
  const d = obj(v, 'phase2');
  // 当前或已知旧版本都接受；旧版本由加载方改写为当前版本（见 parseSave/parseProfiles）。
  if (!isKnownP2ContentVersion(d.contentVersion)) throw new ValidationError('phase2.contentVersion');
  arr(d.storyDone, 'phase2.storyDone', 72).forEach((id, i) => str(id, `phase2.storyDone[${i}]`, 60));
  for (const [k, flag] of entries(d.exposed, 'phase2.exposed', 256)) bool(flag, `phase2.exposed.${k}`);
  for (const [k, flag] of entries(d.learned, 'phase2.learned', 256)) bool(flag, `phase2.learned.${k}`);
  for (const [k, r] of entries(d.review, 'phase2.review', 256)) {
    const o = obj(r, `phase2.review.${k}`);
    num(o.dueAt, `phase2.review.${k}.dueAt`, 0, 8.64e15);
    int(o.level, `phase2.review.${k}.level`, 0, 3);
    num(o.lastPracticedAt, `phase2.review.${k}.lastPracticedAt`, 0, MAX_MS);
  }
  for (const [k, w] of entries(d.err, 'phase2.err', 256)) {
    const o = obj(w, `phase2.err.${k}`);
    int(o.bits, `phase2.err.${k}.bits`, 0, 0x7fffffff);
    int(o.count, `phase2.err.${k}.count`, 0, PHASE2_RULES.recentCompletionWindow);
    num(o.lastAt, `phase2.err.${k}.lastAt`, 0, MAX_MS);
  }
  for (const [k, g] of entries(d.stats, 'phase2.stats', 6)) {
    oneOf(k, 'phase2.stats key', P2_GROUP_KEYS);
    const o = obj(g, `phase2.stats.${k}`);
    for (const f of ['items', 'firstSubmittedItems', 'firstCorrectItems', 'unaidedCorrectItems', 'wrongSubmissions', 'helpItems', 'targetChars']) {
      int(o[f], `phase2.stats.${k}.${f}`, 0, MAX_COUNT);
    }
    int(o.editOperations, `phase2.stats.${k}.editOperations`, 0, MAX_COUNT);
    bool(o.editStatAvailable, `phase2.stats.${k}.editStatAvailable`);
    num(o.effectiveMs, `phase2.stats.${k}.effectiveMs`, 0, MAX_MS);
  }
  for (const [k, day] of entries(d.daily, 'phase2.daily', RULES.history.dailyDays + 2)) {
    if (!DATE_KEY.test(k)) throw new ValidationError(`phase2.daily.${k}`, 'bad date');
    const o = obj(day, `phase2.daily.${k}`);
    num(o.effectiveMs, `phase2.daily.${k}.effectiveMs`, 0, MAX_MS);
    int(o.items, `phase2.daily.${k}.items`, 0, MAX_COUNT);
  }
  for (const [k, flag] of entries(d.teaching, 'phase2.teaching', 64)) bool(flag, `phase2.teaching.${k}`);
  // 每日小目标（2026-11-17）：旧存档可能缺字段（加载时补 null），存在时严格校验。
  if (d.dailyBonus !== undefined && d.dailyBonus !== null) {
    const o = obj(d.dailyBonus, 'phase2.dailyBonus');
    if (!(typeof o.lastDate === 'string' && DATE_KEY.test(o.lastDate))) throw new ValidationError('phase2.dailyBonus.lastDate', 'bad date');
    int(o.streakDays, 'phase2.dailyBonus.streakDays', 1, 3660);
  }
  num(d.maxObservedAt, 'phase2.maxObservedAt', 0, MAX_MS);
  int(d.taskSeq, 'phase2.taskSeq', 0, MAX_COUNT);
}

function validateOccurrence(v: unknown, path: string): void {
  const o = obj(v, path);
  str(o.occurrenceId, `${path}.occurrenceId`, 80);
  itemId(o.targetId, `${path}.targetId`);
  str(o.draft, `${path}.draft`, 120);
  bool(o.firstSubmitted, `${path}.firstSubmitted`);
  bool(o.firstCorrect, `${path}.firstCorrect`);
  int(o.wrongSubmissions, `${path}.wrongSubmissions`, 0, MAX_COUNT);
  int(o.editOperations, `${path}.editOperations`, 0, 10_000);
  bool(o.editStatAvailable, `${path}.editStatAvailable`);
  bool(o.helpUsed, `${path}.helpUsed`);
  bool(o.completed, `${path}.completed`);
  bool(o.compositionActive, `${path}.compositionActive`);
}

function validateP2Task(v: unknown): void {
  const o = obj(v, 'activeTask.task');
  oneOf(o.kind, 'activeTask.task.kind', P2_KINDS);
  oneOf(o.language, 'activeTask.task.language', P2_LANGUAGES);
  str(o.sourceId, 'activeTask.task.sourceId', 60);
  str(o.instanceId, 'activeTask.task.instanceId', 60);
  int(o.seed, 'activeTask.task.seed', 0, 0xffffffff);
  num(o.createdAt, 'activeTask.task.createdAt', 0, MAX_MS);
  str(o.title, 'activeTask.task.title', 120);
  str(o.buildingId, 'activeTask.task.buildingId', 40);
  const stepCounts = arr(o.stepCounts, 'activeTask.task.stepCounts', 3);
  if (stepCounts.length === 0) throw new ValidationError('activeTask.task.stepCounts', 'empty');
  stepCounts.forEach((n, i) => int(n, `activeTask.task.stepCounts[${i}]`, 1, 36));
  const plan = arr(o.plan, 'activeTask.task.plan', 36);
  if (plan.length === 0) throw new ValidationError('activeTask.task.plan', 'empty');
  plan.forEach((id, i) => itemId(id, `activeTask.task.plan[${i}]`));
  const items = arr(o.items, 'activeTask.task.items', 36);
  if (items.length !== plan.length) throw new ValidationError('activeTask.task.items', 'length mismatch');
  items.forEach((x, i) => {
    validateOccurrence(x, `activeTask.task.items[${i}]`);
    const item = obj(x, 'item');
    if (item.targetId !== plan[i] || phase2Item(String(item.targetId))?.language !== o.language) throw new ValidationError('activeTask.task.items', 'plan mismatch');
  });
  if (new Set(items.map(x => obj(x, 'item').occurrenceId)).size !== items.length || (stepCounts as number[]).reduce((a,b) => a+b, 0) !== plan.length) throw new ValidationError('activeTask.task', 'invalid plan');
  if (o.kind === 'story' && phase2Task(String(o.sourceId))?.language !== o.language) throw new ValidationError('activeTask.task.sourceId');
  bool(o.introSeen, 'activeTask.task.introSeen');
  num(o.effectiveMs, 'activeTask.task.effectiveMs', 0, MAX_MS);
  bool(o.paused, 'activeTask.task.paused');
  for (const k of ['activeSince', 'accountedUntil', 'lastInputAt']) {
    nullable(o[k], (x) => num(x, `activeTask.task.${k}`, 0, MAX_MS));
  }
  if (o.drillCategory !== null) oneOf(o.drillCategory, 'activeTask.task.drillCategory', DRILL_IDS);
}

function validateActiveTask(v: unknown): void {
  const o = obj(v, 'activeTask');
  const variant = oneOf(o.variant, 'activeTask.variant', new Set(['phase1', 'phase2']));
  if (variant === 'phase1') validateLevel(o.level, 'activeTask.level');
  else validateP2Task(o.task);
}

function validateP2Result(v: unknown): void {
  const o = obj(v, 'lastTaskResult');
  oneOf(o.kind, 'lastTaskResult.kind', P2_KINDS);
  oneOf(o.language, 'lastTaskResult.language', P2_LANGUAGES);
  str(o.sourceId, 'lastTaskResult.sourceId', 60);
  str(o.instanceId, 'lastTaskResult.instanceId', 60);
  num(o.at, 'lastTaskResult.at', 0, MAX_MS);
  int(o.coins, 'lastTaskResult.coins', 0, 1000);
  bool(o.firstReward, 'lastTaskResult.firstReward');
  const itemCount = int(o.itemCount, 'lastTaskResult.itemCount', 1, 36);
  int(o.firstCorrectCount, 'lastTaskResult.firstCorrectCount', 0, itemCount);
  int(o.unaidedCorrectCount, 'lastTaskResult.unaidedCorrectCount', 0, itemCount);
  int(o.wrongSubmissions, 'lastTaskResult.wrongSubmissions', 0, MAX_COUNT);
  int(o.helpItems, 'lastTaskResult.helpItems', 0, itemCount);
  num(o.effectiveMs, 'lastTaskResult.effectiveMs', 0, MAX_MS);
  str(o.buildingId, 'lastTaskResult.buildingId', 40);
  str(o.title, 'lastTaskResult.title', 120);
  bool(o.routeComplete, 'lastTaskResult.routeComplete');
  bool(o.courseComplete, 'lastTaskResult.courseComplete');
  if (o.nextSourceId !== null) str(o.nextSourceId, 'lastTaskResult.nextSourceId', 60);
  bool(o.restReminder, 'lastTaskResult.restReminder');
  // 每日小目标加币（2026-11-17）：旧存档的旧结果没有这个字段，存在时校验范围。
  if (o.dailyBonusCoins !== undefined) int(o.dailyBonusCoins, 'lastTaskResult.dailyBonusCoins', 0, 1000);
}

function validateResult(v: unknown): void {
  const o = obj(v, 'lastResult');
  str(o.levelId, 'lastResult.levelId', 60);
  oneOf(o.entry, 'lastResult.entry', ENTRIES);
  oneOf(o.mode, 'lastResult.mode', MODES);
  const a = int(o.attempts, 'lastResult.attempts', 0, MAX_COUNT);
  int(o.correct, 'lastResult.correct', 0, a);
  const coins = obj(o.coins, 'lastResult.coins');
  for (const k of ['base', 'accuracy', 'building', 'district', 'festival', 'total']) {
    int(coins[k], `lastResult.coins.${k}`, 0, 1000);
  }
  str(o.encouragement, 'lastResult.encouragement', 100);
  str(o.courseLabel, 'lastResult.courseLabel', 80);
  int(o.courseStage, 'lastResult.courseStage', 1, MAX_STAGE);
  num(o.at, 'lastResult.at', 0, MAX_MS);
  num(o.effectiveMs, 'lastResult.effectiveMs', 0, MAX_MS);
  nullable(o.replayBuilding, x => int(x, 'lastResult.replayBuilding', 0, BUILDING_COUNT - 1));
  nullable(o.districtOpened, x => int(x, 'lastResult.districtOpened', 0, 3));
  bool(o.festivalUnlocked, 'lastResult.festivalUnlocked'); bool(o.restReminder, 'lastResult.restReminder');
  nullable(o.wordsCompleted, x => arr(x, 'lastResult.wordsCompleted', 12).forEach(w => str(w, 'word', 20)));
  nullable(o.building, x => {
    const b = obj(x, 'lastResult.building'); int(b.index, 'building.index', 0, BUILDING_COUNT - 1);
    int(b.before, 'building.before', 0, STAGES_PER_BUILDING); int(b.after, 'building.after', 0, STAGES_PER_BUILDING); bool(b.completed, 'building.completed');
  });
  nullable(o.festival, x => { const f = obj(x, 'lastResult.festival'); int(f.index, 'festival.index', 0, 2); bool(f.roundComplete, 'festival.roundComplete'); });
  nullable(o.promotion, x => { const p = obj(x, 'lastResult.promotion'); nullable(p.promotedTo, n => int(n, 'promotedTo', 1, MAX_STAGE)); bool(p.allComplete, 'allComplete'); int(p.streak, 'streak', 0, MAX_COUNT); });
}

/** Throws ValidationError when `data` is not a well-formed, in-range save of the current schema. */
export function validateSave(data: unknown): SaveData {
  const o = obj(data, 'save');
  if (o.schemaVersion !== 2) throw new ValidationError('schemaVersion');
  int(o.revision, 'revision', 0, Number.MAX_SAFE_INTEGER);
  num(o.createdAt, 'createdAt', 0, MAX_MS);
  num(o.updatedAt, 'updatedAt', 0, MAX_MS);
  nullable(o.partner, (x) => oneOf(x, 'partner', PARTNER_IDS));
  bool(o.onboarded, 'onboarded');
  validateSettings(o.settings);
  validateCourse(o.course);
  validateBuildings(o);
  int(o.coins, 'coins', 0, 10_000_000);
  validateShop(o);
  validateFestival(o);
  nullable(o.session, validateSession);
  nullable(o.activeTask, validateActiveTask);
  nullable(o.lastResult, validateResult);
  nullable(o.lastTaskResult, validateP2Result);
  validateStats(o.stats);
  validatePhase2(o.phase2);
  arr(o.settled, 'settled', RULES.history.settledIds).forEach((id, i) => str(id, `settled[${i}]`, 60));
  int(o.levelSeq, 'levelSeq', 0, MAX_COUNT);
  arr(o.wordLevels, 'wordLevels', 2).forEach((list, i) =>
    arr(list, `wordLevels[${i}]`, 12).forEach((w, j) => str(w, `wordLevels[${i}][${j}]`, 20)),
  );
  int(o.wordLevelsPlayed, 'wordLevelsPlayed', 0, MAX_COUNT);
  for (const [k, flag] of entries(o.seen, 'seen', 200)) bool(flag, `seen.${k}`);
  return o as unknown as SaveData;
}
