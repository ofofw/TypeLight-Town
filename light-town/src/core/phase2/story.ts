import type { Phase2Language, Phase2Task } from '../../config/phase2/content';
import { PHASE2_BUILDING_ORDER, phase2Item, phase2TasksOf } from '../../config/phase2/content';
import { createRng, deriveSeed, type Rng } from '../rng';

export interface StoryPlan {
  /** 排列后的 item id，长度等于 targetCount。 */
  plan: string[];
  /** 每步题数（来自任务配置，固定不变）。 */
  stepCounts: number[];
}

/**
 * 故事题单（spec/phase-2/RULES.md「故事题单」）：
 * - 重点池 ceil(N×0.7) 题，复习池分配余量；无复习池则全部来自重点池。
 * - 先让每个重点项目出现一次，再补足重点配额。
 * - 池内按当前累计选取次数最少优先，种子随机打破平局；复习池同法。
 * - 每步题数固定；优先放置剩余次数最多且不同于上一项的项目，并列按种子随机；
 *   只有单项池才允许相邻相同。
 * - 每个故事步骤至少保留一条重点项题目。
 */
export function buildStoryPlan(task: Phase2Task, seed: number): StoryPlan | null {
  const n = task.targetCount;
  const focusItems = task.focusItemIds.filter((id) => phase2Item(id));
  const reviewItems = task.reviewItemIds.filter((id) => phase2Item(id));
  // 无复习池则全部从重点池抽取（C05）。
  const focusSlots = reviewItems.length > 0 ? Math.ceil(n * 0.7) : n;
  if (focusItems.length === 0) return null;

  const rng = createRng(deriveSeed(seed, 41));
  const focusCounts = allocatePool(focusItems, focusSlots, rng);
  const reviewCounts = reviewItems.length > 0 ? allocatePool(reviewItems, n - focusSlots, rng) : {};
  const counts: Record<string, number> = {};
  const add = (m: Record<string, number>) => {
    for (const [id, c] of Object.entries(m)) counts[id] = (counts[id] ?? 0) + c;
  };
  add(focusCounts);
  add(reviewCounts);

  const stepCounts = task.steps.map((s) => s.targetCount);
  const plan = arrangeSteps(new Map(Object.entries(counts)), stepCounts, new Set(focusItems), seed);
  if (plan.length !== n) return null;
  return { plan, stepCounts };
}

/** 池内分配：先每个候选一次，再按“当前累计选取次数最少优先、种子随机破平”补足配额。 */
function allocatePool(items: readonly string[], slots: number, rng: Rng): Record<string, number> {
  const counts: Record<string, number> = {};
  let filled = 0;
  for (const id of items) {
    if (filled >= slots) break;
    counts[id] = 1;
    filled += 1;
  }
  while (filled < slots) {
    const min = Math.min(...items.map((id) => counts[id] ?? 0));
    const tied = items.filter((id) => (counts[id] ?? 0) === min);
    const pick = tied[Math.floor(rng() * tied.length)]!;
    counts[pick] = (counts[pick] ?? 0) + 1;
    filled += 1;
  }
  return counts;
}

/**
 * 逐步排列：每步在种子位置保留一个重点项，其余位置按“剩余最多、不同于上一项”填充。
 */
function arrangeSteps(
  rem: Map<string, number>,
  stepCounts: readonly number[],
  focus: ReadonlySet<string>,
  seed: number,
): string[] {
  const plan: string[] = [];
  let salt = 61;
  let last: string | null = null;
  for (const size of stepCounts) {
    // 本步保留重点项的位置（种子决定），保证每个故事步骤至少一条重点项。
    const rngPos = createRng(deriveSeed(seed, salt++));
    const focusPos = size > 0 ? Math.floor(rngPos() * size) : -1;
    const rng = createRng(deriveSeed(seed, salt++));
    for (let p = 0; p < size; p++) {
      let candidates = [...rem.entries()].filter(([id, n]) => n > 0 && id !== last);
      if (p === focusPos) {
        const focusOnly = candidates.filter(([id]) => focus.has(id));
        if (focusOnly.length > 0) candidates = focusOnly;
        else {
          // 重点项只剩与上一项相同的：按“同池其他项替换一次”无解，保留重点项保证覆盖。
          const focusAny = [...rem.entries()].filter(([id, n]) => n > 0 && focus.has(id));
          if (focusAny.length > 0) candidates = focusAny;
        }
      }
      if (candidates.length === 0) candidates = [...rem.entries()].filter(([, n]) => n > 0);
      if (candidates.length === 0) break;
      const max = Math.max(...candidates.map(([, n]) => n));
      const top = candidates.filter(([, n]) => n === max);
      const pick = top[Math.floor(rng() * top.length)]![0];
      plan.push(pick);
      last = pick;
      rem.set(pick, (rem.get(pick) ?? 0) - 1);
    }
  }
  return plan;
}

/** 语言内推荐下一个故事任务：最小的未完成 sequence。 */
export function nextStoryOf(language: Phase2Language, done: ReadonlySet<string>): string | null {
  for (const task of phase2TasksOf(language)) {
    if (!done.has(task.id)) return task.id;
  }
  return null;
}

/**
 * 居民入住（2026-11-17 新增的长期目标，纯派生数据、不进存档）：
 * 一座建筑的中英文 6 个故事全部首次完成后，视为「一位新居民搬进来」。
 * 小镇地图给这些建筑亮一扇新居民窗；结果页在恰好集满时报喜。
 */
export function residentBuildings(storyDone: readonly string[]): string[] {
  const done = new Set(storyDone);
  return PHASE2_BUILDING_ORDER.filter((buildingId) =>
    phase2TasksOf('zh')
      .concat(phase2TasksOf('en'))
      .filter((t) => t.buildingId === buildingId)
      .every((t) => done.has(t.id)),
  );
}

/** 该建筑是否「恰好这次完成后集满 6 个故事」（用于结果页报喜，重玩不重复报）。 */
export function residentJustJoined(buildingId: string, storyDone: readonly string[], firstReward: boolean): boolean {
  if (!firstReward) return false;
  return residentBuildings(storyDone).includes(buildingId);
}
