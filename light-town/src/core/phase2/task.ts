import { PHASE2_CONTENT_VERSION, type Phase2Language } from '../../config/phase2/content';
import { phase2Item, phase2Task, phase2TasksOf } from '../../config/phase2/content';
import { RULES } from '../../config/rules';
import { recordEffectiveTime } from '../stats';
import { DRILL_CATEGORIES, PHASE2_RULES, type DrillCategory } from '../../config/phase2/rules';
import { localDateKey } from '../time';
import type { SaveData } from '../types';
import { buildErrandPlan, errandTotal, scopedItems, trickyIds } from './errand';
import { applyReview } from './review';
import { buildStoryPlan, nextStoryOf } from './story';
import { evaluateSubmission, targetCharCount } from './text-score';
import type { P2Data, P2GroupKey, P2GroupStats, P2Occurrence, P2TaskResult, P2TaskState } from './types';
import { restReminderThresholdMs } from '../../config/rules';

/* ------------------------------------------------------------------ data */

export function emptyPhase2(now: number): P2Data {
  return {
    contentVersion: PHASE2_CONTENT_VERSION,
    storyDone: [],
    exposed: {},
    learned: {},
    review: {},
    err: {},
    stats: {
      'zh:story': emptyGroup(),
      'zh:errand': emptyGroup(),
      'zh:drill': emptyGroup(),
      'en:story': emptyGroup(),
      'en:errand': emptyGroup(),
      'en:drill': emptyGroup(),
    },
    daily: {},
    teaching: {},
    dailyBonus: null,
    maxObservedAt: now,
    taskSeq: 0,
  };
}

export function emptyGroup(): P2GroupStats {
  return {
    items: 0,
    firstSubmittedItems: 0,
    firstCorrectItems: 0,
    unaidedCorrectItems: 0,
    wrongSubmissions: 0,
    editOperations: 0,
    editStatAvailable: true,
    helpItems: 0,
    targetChars: 0,
    effectiveMs: 0,
  };
}

/** 第二阶段时间基准：取 max(当前系统时间, 存档最大观察时间)，回拨不倒退。 */
export function p2Now(save: SaveData, now: number): number {
  return Math.max(now, save.phase2.maxObservedAt);
}

/** 学习了的 item id 集合。 */
export function learnedSet(save: SaveData, language?: Phase2Language): Set<string> {
  const out = new Set<string>();
  for (const [id, ok] of Object.entries(save.phase2.learned)) {
    if (!ok) continue;
    if (language && phase2Item(id)?.language !== language) continue;
    out.add(id);
  }
  return out;
}

function groupKeyOf(language: Phase2Language, kind: P2TaskState['kind']): P2GroupKey {
  return `${language}:${kind}`;
}

/* ------------------------------------------------------------------ availability */

/** 语言内已解锁的最大故事序号：已全部完成时为 36。 */
export function maxUnlockedSequence(language: Phase2Language, storyDone: readonly string[]): number {
  const done = new Set(storyDone);
  const tasks = phase2TasksOf(language);
  let maxSeq = 0;
  for (const t of tasks) {
    if (done.has(t.id)) maxSeq = Math.max(maxSeq, t.sequence);
  }
  return Math.min(maxSeq + 1, tasks.length);
}

export function storyUnlocked(save: SaveData, language: Phase2Language, sequence: number): boolean {
  return sequence <= maxUnlockedSequence(language, save.phase2.storyDone);
}

export type P2StartRequest =
  | { kind: 'story'; taskId: string }
  | { kind: 'errand'; language: Phase2Language }
  | { kind: 'drill'; language: Phase2Language; category: DrillCategory };

export type P2StartError = 'has-active-task' | 'story-locked' | 'errand-locked' | 'drill-locked' | 'empty-pool';

/** 无题池时不能开始任务或发奖（界面显示“先完成一个相关故事任务吧”）。 */
export function p2StartError(save: SaveData, req: P2StartRequest): P2StartError | null {
  if (save.activeTask) return 'has-active-task';
  switch (req.kind) {
    case 'story': {
      const task = phase2Task(req.taskId);
      if (!task || !storyUnlocked(save, task.language, task.sequence)) return 'story-locked';
      return null;
    }
    case 'errand': {
      const learned = learnedSet(save, req.language);
      const hasStory = phase2TasksOf(req.language).some((t) => save.phase2.storyDone.includes(t.id));
      if (!hasStory) return 'errand-locked';
      return scopedItems({ language: req.language, learned, category: null }).length > 0 ? null : 'empty-pool';
    }
    case 'drill': {
      if (!drillOpen(save, req.category)) return 'drill-locked';
      const learned = learnedSet(save, req.language);
      return scopedItems({ language: req.language, learned, category: req.category }).length > 0 ? null : 'empty-pool';
    }
  }
}

/** 专项是否开放：教学已展示（或多音字/ü 首次教学后）且存在对应已学内容或易错记录。 */
export function drillOpen(save: SaveData, category: DrillCategory): boolean {
  const t = save.phase2.teaching;
  const learned = learnedSet(save);
  const hasLearned = (pred: (id: string) => boolean) => [...learned].some(pred);
  const hasErrRecords = (language: Phase2Language) =>
    trickyIds(language, save.phase2).length > 0;
  switch (category) {
    case 'uppercase':
      return !!t['en:uppercase'] && hasLearned((id) => phase2Item(id)?.tags.includes('uppercase') ?? false);
    case 'space':
      return !!t['en:space'] && hasLearned((id) => phase2Item(id)?.tags.includes('space') ?? false);
    case 'punctuation':
      return !!t['en:punctuation'] && hasLearned((id) => phase2Item(id)?.tags.includes('punctuation') ?? false);
    case 'selection':
      return !!t['zh:selection'] && hasLearned((id) => phase2Item(id)?.tags.includes('selection') ?? false);
    case 'polyphone':
      return hasLearned((id) => phase2Item(id)?.tags.includes('polyphone') ?? false);
    case 'umlaut':
      return hasLearned((id) => phase2Item(id)?.tags.includes('umlaut') ?? false);
    case 'tricky-en':
      return hasErrRecords('en');
    case 'tricky-zh':
      return hasErrRecords('zh');
  }
}

export function drillLockReason(save: SaveData, category: DrillCategory): string {
  if (drillOpen(save, category)) return '';
  if (category === 'tricky-en' || category === 'tricky-zh') {
    return '目前没有需要加强的内容。先完成故事任务，提交错了或求助过的内容会出现在这里。';
  }
  const taught =
    category === 'uppercase' ? !!save.phase2.teaching['en:uppercase']
    : category === 'space' ? !!save.phase2.teaching['en:space']
    : category === 'punctuation' ? !!save.phase2.teaching['en:punctuation']
    : category === 'selection' ? !!save.phase2.teaching['zh:selection']
    : true;
  return taught ? '先完成一个相关故事任务吧，学过的内容会出现在这里。' : '完成对应的课程后，这里会开放。';
}

/* ------------------------------------------------------------------ start */

export function p2TaskTitle(req: P2StartRequest): string {
  switch (req.kind) {
    case 'story':
      return phase2Task(req.taskId)?.title ?? '';
    case 'errand':
      return req.language === 'zh' ? '中文居民委托' : '英文居民委托';
    case 'drill':
      return `${req.language === 'zh' ? '中文' : '英文'}专项 · ${DRILL_CATEGORIES.find((d) => d.id === req.category)?.name ?? ''}`;
  }
}

/**
 * 开始一个新任务实例（不覆盖旧实例完成历史）。两阶段共用一个未完成任务槽：
 * 已有未完成任务时返回 has-active-task，由界面先给出三选一。
 */
export function startP2Task(
  save: SaveData,
  req: P2StartRequest,
  now: number,
  seed: number,
): { save: SaveData; error: P2StartError | null } {
  const error = p2StartError(save, req);
  if (error) return { save, error };
  const effective = p2Now(save, now);
  const s = structuredClone(save);
  const phase2 = s.phase2;
  phase2.taskSeq += 1;
  const instanceId = `P${phase2.taskSeq}-${(seed >>> 0).toString(36)}`;

  let plan: string[] = [];
  let stepCounts: number[] = [];
  let language: Phase2Language = 'zh';
  let sourceId = '';
  let buildingId = '';
  let title = '';
  let drillCategory: DrillCategory | null = null;

  if (req.kind === 'story') {
    const task = phase2Task(req.taskId)!;
    const built = buildStoryPlan(task, seed);
    if (!built) return { save, error: 'empty-pool' };
    plan = built.plan;
    stepCounts = built.stepCounts;
    language = task.language;
    sourceId = task.id;
    buildingId = task.buildingId;
    title = task.title;
  } else {
    const learned = learnedSet(s, req.language);
    const total = req.kind === 'errand' ? errandTotal(req.language, learned) : PHASE2_RULES.drill;
    const category = req.kind === 'drill' ? req.category : null;
    const built = buildErrandPlan({
      language: req.language,
      learned,
      review: phase2.review,
      err: phase2.err,
      now: effective,
      seed,
      category,
      total,
    });
    if (built.empty) return { save, error: 'empty-pool' };
    plan = built.plan;
    stepCounts = [total];
    language = req.language;
    sourceId = req.kind === 'errand' ? 'errand' : `drill:${req.category}`;
    buildingId = 'lamp-house';
    title = p2TaskTitle(req);
    drillCategory = category;
  }

  const items: P2Occurrence[] = plan.map((targetId, i) => ({
    occurrenceId: `${instanceId}:${i}`,
    targetId,
    draft: '',
    firstSubmitted: false,
    firstCorrect: false,
    wrongSubmissions: 0,
    editOperations: 0,
    editStatAvailable: true,
    helpUsed: false,
    completed: false,
    compositionActive: false,
  }));

  const task: P2TaskState = {
    kind: req.kind,
    language,
    sourceId,
    instanceId,
    seed,
    createdAt: effective,
    title,
    buildingId,
    stepCounts,
    plan,
    items,
    introSeen: false,
    effectiveMs: 0,
    paused: true,
    activeSince: null,
    accountedUntil: null,
    lastInputAt: null,
    drillCategory,
  };
  s.activeTask = { variant: 'phase2', task };
  phase2.maxObservedAt = effective;
  exposeCurrent(s);
  return { save: s, error: null };
}

/** 当前要练的题（第一个未完成的）。 */
export function currentOccurrence(task: P2TaskState): { index: number; occ: P2Occurrence } | null {
  for (let i = 0; i < task.items.length; i++) {
    if (!task.items[i]!.completed) return { index: i, occ: task.items[i]! };
  }
  return null;
}

/** 当前步骤（0 基）：第一个还有未完成题的步骤。 */
export function currentStep(task: P2TaskState): number {
  let acc = 0;
  for (let step = 0; step < task.stepCounts.length; step++) {
    const size = task.stepCounts[step]!;
    const done = task.items.slice(acc, acc + size).filter((o) => o.completed).length;
    if (done < size) return step;
    acc += size;
  }
  return task.stepCounts.length - 1;
}

/** 本步骤已完成的题数。 */
export function stepDone(task: P2TaskState, step: number): number {
  let acc = 0;
  for (let i = 0; i < step; i++) acc += task.stepCounts[i]!;
  const size = task.stepCounts[step] ?? 0;
  return task.items.slice(acc, acc + size).filter((o) => o.completed).length;
}

/** 本任务实例已完成题数。 */
export function taskDone(task: P2TaskState): number {
  return task.items.filter((o) => o.completed).length;
}

/** 全局题序号所属的步骤（0 基）。 */
export function stepOfIndex(task: P2TaskState, index: number): number {
  let acc = 0;
  for (let step = 0; step < task.stepCounts.length; step++) {
    acc += task.stepCounts[step]!;
    if (index < acc) return step;
  }
  return task.stepCounts.length - 1;
}

/** 孩子首次进入该题后标记 exposed（顺序练习：当前位置及之前的都算已进入）。 */
export function exposeCurrent(save: SaveData): void {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2') return;
  const cur = currentOccurrence(slot.task);
  const upto = cur ? cur.index + 1 : slot.task.items.length;
  for (let i = 0; i < upto; i++) {
    save.phase2.exposed[slot.task.plan[i]!] = true;
  }
}

/* ------------------------------------------------------------------ timing */

function creditTime(save: SaveData, now: number): void {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2') return;
  const task = slot.task;
  if (task.paused || task.activeSince === null) return;
  const ref = Math.max(task.lastInputAt ?? task.activeSince, task.activeSince);
  const windowEnd = ref + RULES.timing.effectiveWindowMs;
  const from = task.accountedUntil ?? task.activeSince;
  const to = Math.min(now, windowEnd);
  if (to > from) {
    task.effectiveMs += to - from;
    recordEffectiveTime(save.stats, from, to);
    // 第二阶段统计：按任务的语言与种类归集有效时长。
    const g = save.phase2.stats[groupKeyOf(task.language, task.kind)];
    g.effectiveMs += to - from;
    const day = p2Daily(save.phase2, localDateKey(now));
    day.effectiveMs += to - from;
    if (save.session) save.session.effectiveMs += to - from;
  }
  task.accountedUntil = Math.max(from, now);
}

function p2Daily(data: P2Data, key: string) {
  return (data.daily[key] ??= { effectiveMs: 0, items: 0 });
}

export function pauseP2Task(save: SaveData, now: number): SaveData {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2' || slot.task.paused) return save;
  const s = structuredClone(save);
  creditTime(s, now);
  const task = (s.activeTask as { task: P2TaskState }).task;
  task.paused = true;
  task.activeSince = null;
  task.accountedUntil = null;
  return s;
}

export function resumeP2Task(save: SaveData, now: number): SaveData {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2' || !slot.task.paused) return save;
  const s = structuredClone(save);
  const task = (s.activeTask as { task: P2TaskState }).task;
  const effective = p2Now(s, now);
  task.paused = false;
  task.activeSince = effective;
  task.accountedUntil = effective;
  task.lastInputAt = effective;
  s.phase2.maxObservedAt = Math.max(s.phase2.maxObservedAt, effective);
  exposeCurrent(s);
  return s;
}

/** 30 秒无输入自动暂停；组字进行中由界面延迟到组字结束后再调用。 */
export function tickP2Task(save: SaveData, now: number): { save: SaveData; autoPaused: boolean } {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2' || slot.task.paused || slot.task.activeSince === null) {
    return { save, autoPaused: false };
  }
  const s = structuredClone(save);
  creditTime(s, now);
  const task = (s.activeTask as { task: P2TaskState }).task;
  const ref = Math.max(task.lastInputAt ?? task.activeSince!, task.activeSince!);
  if (now - ref >= RULES.timing.autoPauseMs) {
    task.paused = true;
    task.activeSince = null;
    task.accountedUntil = null;
    return { save: s, autoPaused: true };
  }
  return { save: s, autoPaused: false };
}

/* ------------------------------------------------------------------ draft, help, composition */

/** 记录一次输入活动（草稿变化/组字/关闭覆盖层回到练习）：刷新空闲计时，不改变暂停状态。 */
export function touchP2Task(save: SaveData, now: number): SaveData {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2' || slot.task.paused) return save;
  const s = structuredClone(save);
  const task = (s.activeTask as { task: P2TaskState }).task;
  const effective = p2Now(s, now);
  s.phase2.maxObservedAt = Math.max(s.phase2.maxObservedAt, effective);
  task.lastInputAt = Math.max(task.lastInputAt ?? effective, effective);
  return s;
}

/** 已确认上屏的文本变化保存（控制器以 300ms trailing 合并提交）。打字算输入活动：刷新空闲计时。 */
export function setP2Draft(save: SaveData, occurrenceId: string, text: string, now: number): SaveData {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2') return save;
  const occ = slot.task.items.find((o) => o.occurrenceId === occurrenceId);
  if (!occ || occ.completed) return save;
  const s = structuredClone(save);
  const task = (s.activeTask as { task: P2TaskState }).task;
  const target = task.items.find((o) => o.occurrenceId === occurrenceId)!;
  target.draft = text.normalize('NFC');
  const effective = p2Now(s, now);
  s.phase2.maxObservedAt = Math.max(s.phase2.maxObservedAt, effective);
  task.lastInputAt = Math.max(task.lastInputAt ?? effective, effective);
  return s;
}

export function setP2Composition(save: SaveData, occurrenceId: string, active: boolean, now: number): SaveData {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2') return save;
  const occ = slot.task.items.find((o) => o.occurrenceId === occurrenceId);
  if (!occ || occ.compositionActive === active) return save;
  const s = structuredClone(save);
  const task = (s.activeTask as { task: P2TaskState }).task;
  const target = task.items.find((o) => o.occurrenceId === occurrenceId)!;
  target.compositionActive = active;
  // 组字开始/结束都算输入活动：结束（选字上屏）后重新起算 30 秒空闲窗口。
  const effective = p2Now(s, now);
  s.phase2.maxObservedAt = Math.max(s.phase2.maxObservedAt, effective);
  task.lastInputAt = Math.max(task.lastInputAt ?? effective, effective);
  return s;
}

/** 主动查看帮助/重播教学：本题记一次求助（重复播放不重复计题数）。 */
export function markP2Help(save: SaveData): SaveData {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2') return save;
  const cur = currentOccurrence(slot.task);
  if (!cur || cur.occ.helpUsed) return save;
  const s = structuredClone(save);
  const occ = (s.activeTask as { task: P2TaskState }).task;
  const target = currentOccurrence(occ)!.occ;
  target.helpUsed = true;
  return s;
}

/* ------------------------------------------------------------------ submission */

export interface P2SubmitOutcome {
  save: SaveData;
  /** empty 只提示不计错；match 完成该题；mismatch 保留文字并标差。 */
  kind: 'empty' | 'match' | 'mismatch' | 'ignored';
  /** 本次是否为该题的首次有效提交（界面据此显示第 1 级差异说明）。 */
  firstSubmission: boolean;
  pinyinHint: boolean;
  /** 该题完成（错误 3 次后的帮助等级界面自算）。 */
  occurrenceCompleted: boolean;
  /** 本步骤最后一题完成（界面显示步骤完成画面）。 */
  stepCompleted: boolean;
  /** 任务完成并已在同一提交里结算。 */
  taskCompleted: boolean;
}

/**
 * 提交当前题（Enter 或确认按钮）。空提交只提示；composing 期间界面不会调用本函数。
 * 最后一题完成时在同一提交内原子结算（奖励、统计、复习调度）。
 */
export function submitP2(save: SaveData, rawText: string, now: number): P2SubmitOutcome {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2') {
    return { save, kind: 'ignored', firstSubmission: false, pinyinHint: false, occurrenceCompleted: false, stepCompleted: false, taskCompleted: false };
  }
  const cur0 = currentOccurrence(slot.task);
  if (!cur0) {
    return { save, kind: 'ignored', firstSubmission: false, pinyinHint: false, occurrenceCompleted: false, stepCompleted: false, taskCompleted: false };
  }
  const item = phase2Item(cur0.occ.targetId)!;
  const evalResult = evaluateSubmission(item, rawText);
  if (evalResult.kind === 'empty') {
    return { save, kind: 'empty', firstSubmission: false, pinyinHint: false, occurrenceCompleted: false, stepCompleted: false, taskCompleted: false };
  }

  const s = structuredClone(save);
  const task = (s.activeTask as { task: P2TaskState }).task;
  const effective = p2Now(s, now);
  s.phase2.maxObservedAt = Math.max(s.phase2.maxObservedAt, effective);
  const occ = currentOccurrence(task)!.occ;
  const group = s.phase2.stats[groupKeyOf(task.language, task.kind)];
  const firstSubmission = !occ.firstSubmitted;

  creditTime(s, effective);
  task.lastInputAt = effective;
  if (save.session) save.session.lastActivityAt = effective;

  occ.draft = rawText.normalize('NFC');
  if (firstSubmission) {
    occ.firstSubmitted = true;
    group.firstSubmittedItems += 1;
  }

  if (evalResult.kind === 'mismatch') {
    occ.wrongSubmissions += 1;
    group.wrongSubmissions += 1;
    // 第 2、3 级操作帮助自动出现即计入求助（重复不重复计题）。
    if (occ.wrongSubmissions >= 2) occ.helpUsed = true;
    return {
      save: s,
      kind: 'mismatch',
      firstSubmission,
      pinyinHint: evalResult.pinyinHint,
      occurrenceCompleted: false,
      stepCompleted: false,
      taskCompleted: false,
    };
  }

  occ.firstCorrect = firstSubmission ? true : occ.firstCorrect;
  if (firstSubmission) group.firstCorrectItems += 1;
  const completedIndex = cur0.index;
  completeOccurrence(s, occ, group, effective);
  const allDone = taskDone(task) >= task.items.length;
  // 刚完成的题所在步骤全部完成且不是最后一步 → 显示步骤完成画面。
  const stepOfCompleted = stepOfIndex(task, completedIndex);
  const stepCompleted = !allDone && stepDone(task, stepOfCompleted) === task.stepCounts[stepOfCompleted];
  let taskCompleted = false;
  if (allDone) {
    settleP2(s, task, effective);
    taskCompleted = true;
  } else {
    exposeCurrent(s);
  }
  return {
    save: s,
    kind: 'match',
    firstSubmission,
    pinyinHint: false,
    occurrenceCompleted: true,
    stepCompleted: stepCompleted && !allDone,
    taskCompleted,
  };
}

/* ------------------------------------------------------------------ completion and settlement */

function completeOccurrence(save: SaveData, occ: P2Occurrence, group: P2GroupStats, effective: number): void {
  occ.completed = true;
  const item = phase2Item(occ.targetId)!;
  save.phase2.learned[occ.targetId] = true;
  group.items += 1;
  group.helpItems += occ.helpUsed ? 1 : 0;
  group.targetChars += targetCharCount(item);
  if (occ.firstCorrect && !occ.helpUsed) group.unaidedCorrectItems += 1;
  group.editOperations += occ.editOperations;
  if (!occ.editStatAvailable) group.editStatAvailable = false;
  p2Daily(save.phase2, localDateKey(effective)).items += 1;

  const troubled = !occ.firstCorrect || occ.helpUsed;
  const prev = save.phase2.err[occ.targetId];
  save.phase2.err[occ.targetId] = {
    bits: ((prev?.bits ?? 0) << 1 | (troubled ? 1 : 0)) & 0x7fffffff,
    count: Math.min((prev?.count ?? 0) + 1, PHASE2_RULES.recentCompletionWindow),
    lastAt: effective,
  };
}

/**
 * 任务结算（与最后一题完成同一次提交）：
 * 奖励（故事首次 30、其余 20；今日首个任务额外 +5）→ 复习调度 → 结果存档。旧 instanceId 的结算请求永远拒绝。
 */
export function settleP2(
  save: SaveData,
  task: P2TaskState,
  effective: number,
): { result: P2TaskResult; settledNow: true } | { result: P2TaskResult | null; settledNow: false; reason: 'not-current' | 'incomplete' } {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2' || slot.task.instanceId !== task.instanceId) {
    return { result: null, settledNow: false, reason: 'not-current' };
  }
  if (taskDone(task) < task.items.length) {
    return { result: null, settledNow: false, reason: 'incomplete' };
  }
  const s = save;
  const phase2 = s.phase2;

  const firstStory = task.kind === 'story' && !phase2.storyDone.includes(task.sourceId);
  const coins = firstStory ? PHASE2_RULES.rewards.storyFirst : PHASE2_RULES.rewards.repeat;
  if (firstStory) phase2.storyDone = [...phase2.storyDone, task.sourceId];
  s.coins += coins;

  // 每日小目标（2026-11-17）：本地日期内首次完成任务额外加币并推进连击。
  // 连击只用于展示；断签自动从 1 重新数，不惩罚、不追讨。同一本地日期只发一次（幂等）。
  const dayKey = localDateKey(effective);
  const prevBonus = phase2.dailyBonus;
  let dailyBonusCoins = 0;
  if (prevBonus?.lastDate !== dayKey) {
    const yesterdayKey = localDateKey(effective - PHASE2_RULES.dayMs);
    dailyBonusCoins = PHASE2_RULES.rewards.dailyBonus;
    phase2.dailyBonus = {
      lastDate: dayKey,
      streakDays: prevBonus && prevBonus.lastDate === yesterdayKey ? prevBonus.streakDays + 1 : 1,
    };
    s.coins += dailyBonusCoins;
  }

  // 复习调度：同一 item 的全部 occurrence 聚合后应用（同实例任一失败/求助回到 1 天）。
  const byItem = new Map<string, { firstCorrect: boolean; helpUsed: boolean }[]>();
  for (const occ of task.items) {
    const list = byItem.get(occ.targetId) ?? [];
    list.push({ firstCorrect: occ.firstCorrect, helpUsed: occ.helpUsed });
    byItem.set(occ.targetId, list);
  }
  for (const [itemId, occurrences] of byItem) {
    phase2.review[itemId] = applyReview(phase2.review[itemId], occurrences, effective);
  }

  const doneZh = countStoryDone(phase2.storyDone, 'zh');
  const doneEn = countStoryDone(phase2.storyDone, 'en');
  const routeComplete = task.kind === 'story' && (task.language === 'zh' ? doneZh : doneEn) >= phase2TasksOf(task.language).length;
  const courseComplete = doneZh >= phase2TasksOf('zh').length && doneEn >= phase2TasksOf('en').length;

  let restReminder = false;
  if (s.session) {
    while (s.session.effectiveMs >= restReminderThresholdMs(s.session.remindersShown)) {
      s.session.remindersShown += 1;
      restReminder = true;
    }
  }

  const items = task.items;
  const result: P2TaskResult = {
    kind: task.kind,
    language: task.language,
    sourceId: task.sourceId,
    instanceId: task.instanceId,
    at: effective,
    coins,
    firstReward: firstStory,
    itemCount: items.length,
    firstCorrectCount: items.filter((o) => o.firstCorrect).length,
    unaidedCorrectCount: items.filter((o) => o.firstCorrect && !o.helpUsed).length,
    wrongSubmissions: items.reduce((a, o) => a + o.wrongSubmissions, 0),
    helpItems: items.filter((o) => o.helpUsed).length,
    effectiveMs: task.effectiveMs,
    buildingId: task.buildingId,
    title: task.title,
    routeComplete,
    courseComplete,
    nextSourceId:
      task.kind === 'story'
        ? nextStoryOf(task.language, new Set(phase2.storyDone))
        : null,
    restReminder,
    dailyBonusCoins,
  };
  s.activeTask = null;
  s.lastTaskResult = result;
  return { result, settledNow: true };
}

function countStoryDone(storyDone: readonly string[], language: Phase2Language): number {
  return phase2TasksOf(language).filter((t) => storyDone.includes(t.id)).length;
}

/**
 * 结果页刷新或旧实例重复结算时调用：只有当前未结算实例可结算，
 * 旧 instanceId 永远拒绝（即使短历史已淘汰也不重新发奖）。
 */
export function settleP2ById(save: SaveData, instanceId: string, now: number) {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2' || slot.task.instanceId !== instanceId) {
    return { save, settledNow: false as const };
  }
  const effective = p2Now(save, now);
  const work = structuredClone(save);
  const workTask = (work.activeTask as { task: P2TaskState }).task;
  creditTime(work, effective);
  const settled = settleP2(work, workTask, effective);
  if (!settled.settledNow) return { save, settledNow: false as const };
  return { save: work, settledNow: true as const, result: settled.result };
}

/** 放弃旧任务：无完成奖励，已提交的表现保留（逐题提交时已入统计）。 */
export function abandonP2Task(save: SaveData, now: number): SaveData {
  const slot = save.activeTask;
  if (!slot || slot.variant !== 'phase2') return save;
  const s = structuredClone(save);
  creditTime(s, now);
  s.activeTask = null;
  return s;
}

/** 载入后恢复：未完成任务一律先暂停；组字状态不保证恢复（界面提示）。 */
export function prepareLoadedP2(save: SaveData, now: number): SaveData {
  const s = structuredClone(save);
  s.phase2.maxObservedAt = Math.max(s.phase2.maxObservedAt, now);
  const slot = s.activeTask;
  if (slot && slot.variant === 'phase2') {
    const task = slot.task;
    if (!task.paused) {
      task.paused = true;
      task.activeSince = null;
      task.accountedUntil = null;
    }
    exposeCurrent(s);
    // 防御性恢复：最后一题写入后关闭、结算未展示时，恢复为已结算结果（不漏奖、不重奖）。
    if (taskDone(task) >= task.items.length) {
      settleP2(s, task, p2Now(s, now));
    }
  }
  return s;
}

