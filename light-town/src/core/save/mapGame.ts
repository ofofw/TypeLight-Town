import type { SaveData } from '../types';
import { validateSave } from './validate';

// Explicit object fields at every level. Records retain validated data keys only;
// arrays/scalars never carry object extensions into the live game.
type Shape = true | { [key: string]: Shape };
const fields = (names: string, nested: Record<string, Shape> = {}): Shape =>
  Object.fromEntries([...names.split(' ').filter(Boolean).map(k => [k, true]), ...Object.entries(nested)]);
const dict = (value: Shape): Shape => ({ '*': value });
const list = (value: Shape): Shape => ({ '[]': value });
const occurrence = fields('occurrenceId targetId draft firstSubmitted firstCorrect wrongSubmissions editOperations editStatAvailable helpUsed completed compositionActive');
const level = fields('id seq entry mode autoMode courseStage courseLabel keys standard buildingTarget replayBuilding seed targets words wordStarts pos attempts correct wrongStreak effectiveMs createdAt paused activeSince lastInputAt accountedUntil targetShownAt', {
  festival: fields('roundId index'), newKeyQuota: dict(true), keyCounts: dict(fields('a c')),
});
const task = fields('kind language sourceId instanceId seed createdAt title buildingId stepCounts plan introSeen effectiveMs paused activeSince accountedUntil lastInputAt drillCategory', { items: list(occurrence) });
const schema = fields('schemaVersion revision createdAt updatedAt partner onboarded buildings currentBuilding coins owned themesOwned theme settled levelSeq wordLevels wordLevelsPlayed', {
  settings: fields('music sfx voice musicVolume sfxVolume voiceVolume masterMute reduceMotion'),
  course: fields('stage allComplete nextMode introSeen', { lastQualifying: dict(true) }),
  equipped: fields('head scarf lamp'), festival: fields('unlocked roundsCompleted', { round: fields('id done') }),
  session: fields('id startedAt lastActivityAt levelsCompleted attempts correct effectiveMs coins buildingsAtStart remindersShown'),
  activeTask: fields('variant', { level, task }),
  lastResult: fields('levelId at entry mode courseStage courseLabel attempts correct effectiveMs replayBuilding districtOpened festivalUnlocked encouragement restReminder wordsCompleted', {
    coins: fields('base accuracy building district festival total'), building: fields('index before after completed'),
    festival: fields('index roundComplete'), promotion: fields('promotedTo allComplete streak'),
  }),
  lastTaskResult: fields('kind language sourceId instanceId at coins firstReward itemCount firstCorrectCount unaidedCorrectCount wrongSubmissions helpItems effectiveMs buildingId title routeComplete courseComplete nextSourceId restReminder dailyBonusCoins'),
  stats: fields('attempts correct effectiveMs levelsCompleted recent', {
    keys: dict(fields('attempts correct presented')), mistypes: dict(dict(true)), daily: dict(fields('attempts correct effectiveMs levels')),
    levels: list(fields('id at entry mode course attempts correct effectiveMs coins')),
  }), seen: dict(true),
  phase2: fields('contentVersion storyDone maxObservedAt taskSeq', {
    exposed: dict(true), learned: dict(true), teaching: dict(true),
    review: dict(fields('dueAt level lastPracticedAt')), err: dict(fields('bits count lastAt')),
    daily: dict(fields('effectiveMs items')),
    dailyBonus: fields('lastDate streakDays'),
    stats: dict(fields('items firstSubmittedItems firstCorrectItems unaidedCorrectItems wrongSubmissions editOperations editStatAvailable helpItems targetChars effectiveMs')),
  }),
});
function map(value: unknown, shape: Shape): unknown {
  if (value === null || value === undefined) return value;
  if (shape === true) {
    if (Array.isArray(value)) return value.map(v => map(v, true));
    if (typeof value === 'object') throw Error('存档字段类型无效');
    return value;
  }
  if (shape['[]']) {
    if (!Array.isArray(value)) throw Error('存档列表无效');
    return value.map(v => map(v, shape['[]']));
  }
  if (typeof value !== 'object' || Array.isArray(value)) throw Error('存档对象无效');
  const source = value as Record<string, unknown>;
  const entries = shape['*'] ? Object.keys(source).map(k => [k, shape['*']] as const) : Object.entries(shape);
  return Object.fromEntries(entries.filter(([k]) => Object.hasOwn(source, k) && !['__proto__', 'prototype', 'constructor'].includes(k)).map(([k, s]) => [k, map(source[k], s)]));
}
export function mapGame(value: unknown): SaveData { return validateSave(map(value, schema)); }
