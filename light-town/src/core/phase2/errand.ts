import type { Phase2Item, Phase2Language } from '../../config/phase2/content';
import { phase2ItemsOf } from '../../config/phase2/content';
import { errandQuota, PHASE2_RULES, type DrillCategory } from '../../config/phase2/rules';
import { arrangePlan } from './arrange';
import type { P2Data, P2ErrWindow, P2ReviewRecord } from './types';

interface Candidate {
  itemId: string;
  /** 易错排序值：最近 20 条完成记录中首次失败或显式求助的次数。 */
  trouble: number;
  /** 上次练习时间（未记录按 -1 最先）。 */
  lastPracticedAt: number;
  /** 到期时间（仅到期池）。 */
  dueAt: number;
}

/** 易错池：最近最多 20 条完成记录中至少一次首次失败或显式求助的已学内容。 */
export function errorPool(
  language: Phase2Language,
  err: Readonly<Record<string, P2ErrWindow>>,
  learned: ReadonlySet<string>,
): Candidate[] {
  const out: Candidate[] = [];
  for (const item of phase2ItemsOf(language)) {
    if (!learned.has(item.id)) continue;
    const w = err[item.id];
    const trouble = w ? popcount(w.bits & bitMask(w.count)) : 0;
    if (trouble > 0) out.push({ itemId: item.id, trouble, lastPracticedAt: w?.lastAt ?? -1, dueAt: 0 });
  }
  return out;
}

function bitMask(count: number): number {
  return count >= 31 ? 0x7fffffff : (1 << count) - 1;
}

function popcount(n: number): number {
  let c = n;
  c = c - ((c >> 1) & 0x55555555);
  c = (c & 0x33333333) + ((c >> 2) & 0x33333333);
  c = (c + (c >> 4)) & 0x0f0f0f0f;
  return (c * 0x01010101) >> 24;
}

const byId = (a: Candidate, b: Candidate) => a.itemId.localeCompare(b.itemId);

/** 易错排序：次数降序、上次练习时间升序、ID 升序。 */
const byErrorOrder = (a: Candidate, b: Candidate) =>
  b.trouble - a.trouble || a.lastPracticedAt - b.lastPracticedAt || byId(a, b);

/** 到期排序：dueAt 升序、ID 升序。 */
const byDueOrder = (a: Candidate, b: Candidate) => a.dueAt - b.dueAt || byId(a, b);

/** 其他池排序：lastPracticedAt 升序（未记录最先）、ID 升序。 */
const byOtherOrder = (a: Candidate, b: Candidate) => a.lastPracticedAt - b.lastPracticedAt || byId(a, b);

export interface ErrandPlanInput {
  language: Phase2Language;
  learned: ReadonlySet<string>;
  review: Readonly<Record<string, P2ReviewRecord>>;
  err: Readonly<Record<string, P2ErrWindow>>;
  /** 实例创建时的有效时间（已含 maxObservedAt 保护）。 */
  now: number;
  seed: number;
  /** 专项类别过滤；null 为委托（全部已学）。 */
  category: DrillCategory | null;
  /** 题数在实例创建时固定。 */
  total: number;
}

export interface ErrandPlan {
  plan: string[];
  /** 没有可用题池时为 true：不能开始、不发奖。 */
  empty: boolean;
}

/**
 * 委托/专项题单（spec/phase-2/RULES.md「委托、专项和复习」）：
 * - 配额易错 40%、到期 40%、其他 20%（前两项向下取整，余量归最后项）。
 * - 池内先轮询全部候选再重复；排序并列按稳定 ID。
 * - 缺额从已学池补齐后统一执行避免相邻规则；至少两项时避免相邻相同；小题池允许重复，不生成新词。
 */
export function buildErrandPlan(input: ErrandPlanInput): ErrandPlan {
  const scoped = scopedItems(input);
  const scopedIds = new Set(scoped.map((i) => i.id));
  if (scopedIds.size === 0) return { plan: [], empty: true };

  const asCandidate = (id: string): Candidate => {
    const rec = input.review[id];
    return { itemId: id, trouble: 0, lastPracticedAt: rec?.lastPracticedAt ?? -1, dueAt: rec?.dueAt ?? Infinity };
  };
  const errorList = errorPool(input.language, input.err, scopedIds).sort(byErrorOrder);
  const dueList = [...scopedIds]
    .filter((id) => (input.review[id]?.dueAt ?? Infinity) <= input.now)
    .map(asCandidate)
    .sort(byDueOrder);
  const otherList = [...scopedIds].map(asCandidate).sort(byOtherOrder);

  const q = errandQuota(input.total);
  const counts: Record<string, number> = {};
  const take = (list: Candidate[], slots: number): void => {
    if (slots <= 0 || list.length === 0) return;
    for (let i = 0; i < slots; i++) {
      const id = list[i % list.length]!.itemId;
      counts[id] = (counts[id] ?? 0) + 1;
    }
  };
  take(errorList, q.error);
  take(dueList, q.due);
  take(otherList, q.other);

  // 缺额从全部已学池（专项为过滤后类别池）补齐。
  const fill = [...scopedIds].sort((a, b) => (counts[a] ?? 0) - (counts[b] ?? 0) || a.localeCompare(b));
  let assigned = Object.values(counts).reduce((a, b) => a + b, 0);
  for (let i = 0; assigned < input.total && fill.length > 0; i++) {
    const id = fill[i % fill.length]!;
    counts[id] = (counts[id] ?? 0) + 1;
    assigned += 1;
  }

  const plan = arrangePlan(counts, input.seed, 71);
  return { plan, empty: plan.length === 0 };
}

/** 专项只抽对应类别；委托混合全部已学。 */
export function scopedItems(input: { language: Phase2Language; learned: ReadonlySet<string>; category: DrillCategory | null }): Phase2Item[] {
  return phase2ItemsOf(input.language).filter(
    (i) => input.learned.has(i.id) && (!input.category || itemMatchesCategory(i, input.category)),
  );
}

/** 专项类别是否包含该 item。 */
export function itemMatchesCategory(item: Phase2Item, category: DrillCategory): boolean {
  switch (category) {
    case 'uppercase':
      return item.tags.includes('uppercase');
    case 'space':
      return item.tags.includes('space');
    case 'punctuation':
      return item.tags.includes('punctuation');
    case 'selection':
      return item.tags.includes('selection');
    case 'polyphone':
      return item.tags.includes('polyphone');
    case 'umlaut':
      return item.tags.includes('umlaut');
    case 'tricky-zh':
    case 'tricky-en':
      return true;
  }
}

/** 易错专项的候选：有失败或求助记录且已学习。 */
export function trickyIds(language: Phase2Language, data: Pick<P2Data, 'err' | 'learned'>): string[] {
  const learned = new Set(Object.keys(data.learned));
  return errorPool(language, data.err, learned).map((c) => c.itemId);
}

/** 委托题数（2026-11-16 下调）：中文只学单字 12、有词语后 12；英文只有单词 12、有短句后 9。实例创建时固定。 */
export function errandTotal(language: Phase2Language, learned: ReadonlySet<string>): number {
  const hasBigger = phase2ItemsOf(language).some(
    (i) => learned.has(i.id) && (language === 'zh' ? i.kind === 'word' : i.kind === 'sentence'),
  );
  if (language === 'zh') return hasBigger ? PHASE2_RULES.errand.withWords : PHASE2_RULES.errand.charsOnly;
  return hasBigger ? PHASE2_RULES.errand.sentences : PHASE2_RULES.errand.wordsOnly;
}

/** 完成一条记录时更新该 item 的易错窗口（保留最近 20 条）。 */
export function pushErrWindow(window: P2ErrWindow | undefined, troubled: boolean, at: number): P2ErrWindow {
  const prev = window ?? { bits: 0, count: 0, lastAt: at };
  const shifted = prev.bits << 1;
  const bits = (troubled ? shifted | 1 : shifted) & 0x7fffffff;
  return { bits, count: Math.min(prev.count + 1, PHASE2_RULES.recentCompletionWindow), lastAt: at };
}
