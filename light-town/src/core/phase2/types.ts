import type { Phase2Language } from '../../config/phase2/content';
import type { DrillCategory } from '../../config/phase2/rules';

/** 第二阶段任务种类：故事、居民委托、专项。 */
export type P2TaskKind = 'story' | 'errand' | 'drill';

/** 统计分组键：语言:任务种类。 */
export type P2GroupKey = `${Phase2Language}:${P2TaskKind}`;

export interface P2Occurrence {
  occurrenceId: string;
  targetId: string;
  /** 已确认上屏的文本（提交后保存；组字未确认内容不在此）。 */
  draft: string;
  firstSubmitted: boolean;
  firstCorrect: boolean;
  wrongSubmissions: number;
  editOperations: number;
  /** 本题的编辑操作统计是否可用（无法识别时不猜数量）。 */
  editStatAvailable: boolean;
  helpUsed: boolean;
  completed: boolean;
  compositionActive: boolean;
}

/** 一个未完成任务实例。委托/专项只有一步；故事固定三步。 */
export interface P2TaskState {
  kind: P2TaskKind;
  language: Phase2Language;
  /** 故事任务 ID；委托为 `errand`、专项为 `drill:<类别>`。 */
  sourceId: string;
  /** 唯一实例 ID：结算与幂等按它判定，旧实例请求永远拒绝。 */
  instanceId: string;
  seed: number;
  createdAt: number;
  title: string;
  buildingId: string;
  /** 每步题数（和为 plan 长度）。委托/专项只有一步。 */
  stepCounts: number[];
  /** 按顺序排列的 item id。 */
  plan: string[];
  /** 与 plan 对齐的每题状态。 */
  items: P2Occurrence[];
  /** 开场已确认（重开页面后不再重复显示）。 */
  introSeen: boolean;
  effectiveMs: number;
  paused: boolean;
  activeSince: number | null;
  accountedUntil: number | null;
  lastInputAt: number | null;
  /** 专项的类别；委托/故事为 null。 */
  drillCategory: DrillCategory | null;
}

export interface P2ReviewRecord {
  /** 下次到期时间（毫秒 UTC）。 */
  dueAt: number;
  /** 间隔档 0..3 → 1/3/7/14 天。 */
  level: number;
  lastPracticedAt: number;
}

/**
 * 每 item 的最近完成窗口（易错池用，最多 20 条，位图压缩）：
 * bits 从低位起依次是最近第 1、2……次完成；1 表示该次首次失败或用了帮助。
 */
export interface P2ErrWindow {
  bits: number;
  /** 窗口内记录条数（≤20）。 */
  count: number;
  lastAt: number;
}

export interface P2GroupStats {
  /** 正确完成题数。 */
  items: number;
  /** 有首次有效提交的题数（首次正确率分母）。 */
  firstSubmittedItems: number;
  /** 首次正确题数（分子）。 */
  firstCorrectItems: number;
  /** 无帮助且首次正确（独立完成次数）。 */
  unaidedCorrectItems: number;
  wrongSubmissions: number;
  /** 编辑操作次数；editStatAvailable=false 时不可信，显示“—”。 */
  editOperations: number;
  editStatAvailable: boolean;
  /** 使用帮助的题数（每题最多一次）。 */
  helpItems: number;
  /** 正确完成目标字符数（英文含空格标点，中文计汉字；Unicode code point）。 */
  targetChars: number;
  effectiveMs: number;
}

export interface P2DailyStat {
  effectiveMs: number;
  items: number;
}

export interface P2Data {
  contentVersion: string;
  /** 首次完成的故事任务 ID 集合（≤72，永久记录首次奖励）。 */
  storyDone: string[];
  /** 首次进入该题后标记。 */
  exposed: Record<string, boolean>;
  /** 正确完成该题后标记；委托与专项只用 learned。 */
  learned: Record<string, boolean>;
  review: Record<string, P2ReviewRecord>;
  /** 每 item 最近完成窗口（易错池，位图压缩）。 */
  err: Record<string, P2ErrWindow>;
  /** 分语言、任务种类的累计统计。 */
  stats: Record<P2GroupKey, P2GroupStats>;
  /** 按本地日期的练习概况（沿用日历史保留上限）。 */
  daily: Record<string, P2DailyStat>;
  /** 已展示过的教学卡（专项开放条件之一）。 */
  teaching: Record<string, boolean>;
  /**
   * 每日小目标：本地日期内首次完成任务时发加币并推进连击（2026-11-17 新增）。
   * null 表示还没有记录；连击只用于展示，断签不惩罚、不追讨。
   * 旧存档可能缺这个字段：加载时补为 null（parseSave/parseProfiles 迁移）。
   */
  dailyBonus: { lastDate: string; streakDays: number } | null;
  /** 系统观察到的最大时间：时间回拨时进度不倒退。 */
  maxObservedAt: number;
  taskSeq: number;
}

/** 任务结算结果（结果页显示一次；刷新不重结算）。 */
export interface P2TaskResult {
  kind: P2TaskKind;
  language: Phase2Language;
  sourceId: string;
  instanceId: string;
  at: number;
  coins: number;
  /** 故事首次完成的 30 币。 */
  firstReward: boolean;
  itemCount: number;
  firstCorrectCount: number;
  unaidedCorrectCount: number;
  wrongSubmissions: number;
  helpItems: number;
  effectiveMs: number;
  buildingId: string;
  title: string;
  /** 故事：本语言 36 项全部完成。 */
  routeComplete: boolean;
  /** 两条路线都完成。 */
  courseComplete: boolean;
  /** 推荐的同语言下一个故事任务 ID；委托/专项推荐同类。 */
  nextSourceId: string | null;
  restReminder: boolean;
  /** 今日首个完成任务的额外加币（每日小目标）；缺省表示没有（旧存档的旧结果）。 */
  dailyBonusCoins?: number;
}

/** 两阶段共用的未完成任务槽。 */
export type ActiveTask =
  | { variant: 'phase1'; level: import('../types').LevelState }
  | { variant: 'phase2'; task: P2TaskState };
