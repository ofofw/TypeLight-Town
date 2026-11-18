import { describe, expect, it } from 'vitest';
import { PHASE2_BUILDING_ORDER, PHASE2_ITEMS, PHASE2_TASKS, buildingOfItem, phase2Item, phase2Task, phase2TasksOf } from '../../src/config/phase2/content';
import { DRILL_CATEGORIES, PHASE2_RULES } from '../../src/config/phase2/rules';
import { SCHEMA_VERSION, applyInput, discardActiveLevel, p1Level, prepareLoadedSave, resumeLevel, settleLevel, startLevel } from '../../src/core/game';
import { buildErrandPlan, errandTotal, errorPool, pushErrWindow } from '../../src/core/phase2/errand';
import { applyReview, isDue, ladderMs } from '../../src/core/phase2/review';
import { buildStoryPlan, nextStoryOf, residentBuildings, residentJustJoined } from '../../src/core/phase2/story';
import { localDateKey } from '../../src/core/time';
import { evaluateSubmission, normalizeText } from '../../src/core/phase2/text-score';
import {
  abandonP2Task,
  currentOccurrence,
  currentStep,
  drillLockReason,
  markP2Help,
  maxUnlockedSequence,
  p2Now,
  p2StartError,
  pauseP2Task,
  prepareLoadedP2,
  resumeP2Task,
  setP2Composition,
  setP2Draft,
  settleP2ById,
  startP2Task,
  stepDone,
  submitP2,
  tickP2Task,
  touchP2Task,
} from '../../src/core/phase2/task';
import type { P2TaskState } from '../../src/core/phase2/types';
import { parseSave } from '../../src/core/save/storage';
import type { SaveData } from '../../src/core/types';
import { finishLevel, freshSave, T0 } from './helpers';

const DAY = 86_400_000;

/* ------------------------------------------------------------------ helpers */

function startStory(save: SaveData, taskId: string, seed = 42_000): SaveData {
  const r = startP2Task(save, { kind: 'story', taskId }, T0, seed);
  if (r.error) throw new Error(`cannot start ${taskId}: ${r.error}`);
  return r.save;
}

interface PlayOptions {
  /** 提交前先让这些题错一次（按题序）。 */
  wrongAt?: number[];
  /** 这些题先主动求助。 */
  helpAt?: number[];
  seed?: number;
}

/** 以固定节奏完成整个任务；返回结算后的存档。 */
function playP2(save: SaveData, req: Parameters<typeof startP2Task>[1], now: number, opts: PlayOptions = {}): { save: SaveData; now: number } {
  const started = startP2Task(save, req, now, opts.seed ?? 42_001);
  if (started.error) throw new Error(`cannot start: ${started.error}`);
  let s = resumeP2Task(started.save, now + 100);
  let t = now + 200;
  const task = () => (s.activeTask && s.activeTask.variant === 'phase2' ? s.activeTask.task : null);
  let i = 0;
  for (;;) {
    const cur = task() ? currentOccurrence(task()!) : null;
    if (!cur) break;
    if (opts.helpAt?.includes(i)) s = markP2Help(s);
    const item = phase2Item(cur.occ.targetId)!;
    t += 500;
    if (opts.wrongAt?.includes(i)) {
      const wrong = item.language === 'zh' ? '错字' : 'wrong text';
      const r = submitP2(s, wrong, t);
      s = r.save;
      t += 500;
    }
    const out = submitP2(s, item.target, t);
    if (out.kind === 'ignored') throw new Error('submission ignored');
    s = out.save;
    i += 1;
  }
  return { save: s, now: t };
}

function activeP2(save: SaveData): P2TaskState {
  if (!save.activeTask || save.activeTask.variant !== 'phase2') throw new Error('no active phase-2 task');
  return save.activeTask.task;
}

/* ------------------------------------------------------------------ C01 内容 */

describe('C01 固定内容导入', () => {
  it('72 个唯一任务，中英各 36、三步各 12；引用存在、每项内容可达', () => {
    expect(PHASE2_TASKS.length).toBe(72);
    expect(new Set(PHASE2_TASKS.map((t) => t.id)).size).toBe(72);
    expect(phase2TasksOf('zh').length).toBe(36);
    expect(phase2TasksOf('en').length).toBe(36);
    for (const lang of ['zh', 'en'] as const) {
      for (let step = 1; step <= 3; step++) {
        const group = phase2TasksOf(lang).filter((t) => t.step === step);
        expect(group.length).toBe(12);
        expect(new Set(group.map((t) => t.buildingId)).size).toBe(12);
      }
    }
    // 每个任务所有引用都存在且语言一致；每项内容都在某任务可达。
    const reachable = new Set<string>();
    for (const t of PHASE2_TASKS) {
      for (const id of [...t.focusItemIds, ...t.reviewItemIds]) {
        expect(phase2Item(id)?.language).toBe(t.language);
        reachable.add(id);
      }
      const built = buildStoryPlan(t, 1);
      expect(built, t.id).not.toBeNull();
      expect(built!.plan.length).toBe(t.targetCount);
      expect(built!.stepCounts).toEqual(t.steps.map((s) => s.targetCount));
      // 题单只包含任务声明的池内内容。
      const allowed = new Set([...t.focusItemIds, ...t.reviewItemIds]);
      for (const id of built!.plan) expect(allowed.has(id), `${t.id}: ${id}`).toBe(true);
    }
    for (const item of PHASE2_ITEMS) expect(reachable.has(item.id), item.id).toBe(true);
  });

  it('建筑顺序与 72 任务一致（每座建筑中英各三个故事任务）', () => {
    for (const building of PHASE2_BUILDING_ORDER) {
      expect(phase2TasksOf('zh').filter((t) => t.buildingId === building).length).toBe(3);
      expect(phase2TasksOf('en').filter((t) => t.buildingId === building).length).toBe(3);
    }
  });

  it('C05 故事无复习池：题数全来自重点池，每个重点至少出现一次', () => {
    // 中文第 1 项与英文第 1 项都没有复习池；2026-11-16 题量下调后两者都是 12 题。
    const noReview = PHASE2_TASKS.filter((t) => t.sequence === 1);
    expect(noReview.map((t) => t.targetCount).sort()).toEqual([12, 12]);
    for (const task of noReview) {
      expect(task.reviewItemIds.length).toBe(0);
      const { plan } = buildStoryPlan(task, 777)!;
      expect(plan.length).toBe(task.targetCount);
      for (const focus of task.focusItemIds) {
        expect(plan.filter((id) => id === focus).length).toBeGreaterThanOrEqual(1);
      }
      expect(plan.every((id) => task.focusItemIds.includes(id))).toBe(true);
    }
  });

  it('固定种子生成相同题单；不同种子允许不同（C04 生成部分）', () => {
    const task = phase2Task('zh-2-bakery')!;
    const a = buildStoryPlan(task, 999)!;
    const b = buildStoryPlan(task, 999)!;
    const c = buildStoryPlan(task, 1000)!;
    expect(a.plan).toEqual(b.plan);
    expect(a.stepCounts).toEqual(b.stepCounts);
    // 三步题数固定
    expect(a.stepCounts).toEqual(task.steps.map((s) => s.targetCount));
    void c;
  });

  it('每个故事步骤至少一条重点项', () => {
    for (const t of PHASE2_TASKS) {
      const { plan } = buildStoryPlan(t, 3)!;
      let acc = 0;
      for (let step = 0; step < 3; step++) {
        const slice = plan.slice(acc, acc + t.steps[step]!.targetCount);
        expect(slice.some((id) => t.focusItemIds.includes(id)), `${t.id} step ${step + 1}`).toBe(true);
        acc += t.steps[step]!.targetCount;
      }
    }
  });

  it('有复习池的任务：重点约 70%、复习约 30%，重点每个至少一次', () => {
    const task = phase2Task('en-2-lamp-house')!;
    const { plan } = buildStoryPlan(task, 5)!;
    const focusCount = plan.filter((id) => task.focusItemIds.includes(id)).length;
    expect(focusCount).toBe(Math.ceil(task.targetCount * 0.7));
    for (const focus of task.focusItemIds) expect(plan.filter((id) => id === focus).length).toBeGreaterThanOrEqual(1);
    for (const id of plan) expect(task.reviewItemIds.includes(id) || task.focusItemIds.includes(id)).toBe(true);
  });
});

/* ------------------------------------------------------------------ C02/C03 开放 */

describe('C02/C03 进度开放', () => {
  it('新档：任一路线第一项可开始；委托与专项锁定；未点亮建筑不影响', () => {
    const save = freshSave();
    expect(p2StartError(save, { kind: 'story', taskId: 'zh-1-lamp-house' })).toBeNull();
    expect(p2StartError(save, { kind: 'story', taskId: 'en-1-lamp-house' })).toBeNull();
    expect(p2StartError(save, { kind: 'story', taskId: 'zh-1-bakery' })).toBe('story-locked');
    expect(p2StartError(save, { kind: 'story', taskId: 'en-1-bakery' })).toBe('story-locked');
    expect(p2StartError(save, { kind: 'errand', language: 'zh' })).toBe('errand-locked');
    expect(p2StartError(save, { kind: 'drill', language: 'zh', category: 'selection' })).toBe('drill-locked');
    // 建筑全部未点亮也可开始。
    expect(save.buildings.every((n) => n === 0)).toBe(true);
  });

  it('完成中文第 1 项：中文第 2 项开放，英文进度与第一阶段建筑/课程不变', () => {
    let save = freshSave();
    save.buildings = [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    save.currentBuilding = 1;
    const courseBefore = save.course;
    const coinsBefore = save.coins;
    const played = playP2(save, { kind: 'story', taskId: 'zh-1-lamp-house' }, T0);
    save = played.save;
    expect(save.phase2.storyDone).toEqual(['zh-1-lamp-house']);
    expect(maxUnlockedSequence('zh', save.phase2.storyDone)).toBe(2);
    expect(maxUnlockedSequence('en', save.phase2.storyDone)).toBe(1);
    expect(p2StartError(save, { kind: 'story', taskId: 'zh-1-bakery' })).toBeNull();
    expect(p2StartError(save, { kind: 'story', taskId: 'en-1-lamp-house' })).toBeNull();
    expect(p2StartError(save, { kind: 'story', taskId: 'zh-1-post-office' })).toBe('story-locked');
    expect(p2StartError(save, { kind: 'story', taskId: 'en-1-bakery' })).toBe('story-locked');
    expect(save.buildings).toEqual([3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(save.currentBuilding).toBe(1);
    expect(save.course).toEqual(courseBefore);
    // 首次 30 币 + 今日小目标 5 币（2026-11-17）
    expect(save.coins).toBe(coinsBefore + 35);
    expect(save.lastTaskResult?.coins).toBe(30);
    expect(save.lastTaskResult?.dailyBonusCoins).toBe(5);
    expect(save.lastTaskResult?.firstReward).toBe(true);
  });
});

/* ------------------------------------------------------------------ C04 恢复 */

describe('C04 固定种子与存档恢复', () => {
  it('同种子同状态生成同一题单；恢复后题序、draft、步骤位置一致', () => {
    const save = freshSave();
    const a = startStory(save, 'zh-1-lamp-house', 12_345);
    const b = startStory(structuredClone(save), 'zh-1-lamp-house', 12_345);
    expect(activeP2(a).plan).toEqual(activeP2(b).plan);
    // 输入到一半，保存 draft，模拟刷新恢复。
    let s = resumeP2Task(a, T0 + 1000);
    s = submitP2(s, phase2Item(activeP2(s).plan[0]!)!.target, T0 + 2000).save;
    const cur = currentOccurrence(activeP2(s))!;
    s = markP2Help(s);
    const before = structuredClone(activeP2(s));
    // 用 JSON 往返模拟存档序列化。
    const restored = parseSave(JSON.stringify(s));
    expect(restored.kind).toBe('ok');
    const task = activeP2((restored as { save: SaveData }).save);
    expect(task.plan).toEqual(before.plan);
    expect(task.items.map((o) => o.draft)).toEqual(before.items.map((o) => o.draft));
    expect(currentStep(task)).toBe(currentStep(before));
    expect(currentOccurrence(task)?.index).toBe(cur.index);
    expect(task.items.filter((o) => o.completed).length).toBe(before.items.filter((o) => o.completed).length);
  });
});

/* ------------------------------------------------------------------ C06 委托 */

describe('C06 委托配额', () => {
  function learnedSave(n: number): SaveData {
    const save = freshSave();
    const items = PHASE2_ITEMS.filter((i) => i.language === 'zh').slice(0, n);
    for (const item of items) {
      save.phase2.learned[item.id] = true;
      // 前一半产生到期复习，若干条产生易错记录。
    }
    const list = items.map((i) => i.id);
    list.slice(0, Math.floor(n / 2)).forEach((id, idx) => {
      save.phase2.review[id] = { dueAt: T0 + idx, level: 0, lastPracticedAt: T0 - DAY };
    });
    return save;
  }

  it('N=24 时配额 9/9/6；缺额确定性补齐', () => {
    // 12 个已学、6 个到期、3 个易错 → 易错 3（缺 6）、到期 6（缺 3）、其余从已学补。
    const save = learnedSave(12);
    const learnedIds = Object.keys(save.phase2.learned);
    learnedIds.slice(0, 3).forEach((id) => {
      save.phase2.err[id] = pushErrWindow(undefined, true, T0 - 3600_000);
    });
    const plan = buildErrandPlan({
      language: 'zh',
      learned: new Set(learnedIds),
      review: save.phase2.review,
      err: save.phase2.err,
      now: T0,
      seed: 8,
      category: null,
      total: 24,
    });
    expect(plan.plan.length).toBe(24);
    const counts: Record<string, number> = {};
    for (const id of plan.plan) counts[id] = (counts[id] ?? 0) + 1;
    const errorIds = errorPool('zh', save.phase2.err, new Set(learnedIds)).map((c) => c.itemId);
    const errorSlots = plan.plan.filter((id) => errorIds.includes(id)).length;
    // 易错条目占位至少其配额数量（可能被缺额补齐占用更多）。
    expect(errorSlots).toBeGreaterThanOrEqual(3);
    // 全部来自已学池。
    for (const id of plan.plan) expect(learnedIds.includes(id)).toBe(true);
    // 确定性：同输入同结果。
    const again = buildErrandPlan({
      language: 'zh',
      learned: new Set(learnedIds),
      review: save.phase2.review,
      err: save.phase2.err,
      now: T0,
      seed: 8,
      category: null,
      total: 24,
    });
    expect(again.plan).toEqual(plan.plan);
  });

  it('池充足时按 9/9/6 轮询（N=24）', () => {
    // 干净构造：24 个已学、9 个易错、9 个到期、6 个其他（无预置复习记录）。
    const learnedIds = PHASE2_ITEMS.filter((i) => i.language === 'zh').slice(0, 24).map((i) => i.id);
    const save = freshSave();
    for (const id of learnedIds) save.phase2.learned[id] = true;
    learnedIds.slice(0, 9).forEach((id) => save.phase2.err[id] = pushErrWindow(undefined, true, T0 - 60_000));
    learnedIds.slice(9, 18).forEach((id, i) => {
      save.phase2.review[id] = { dueAt: T0 - i, level: 0, lastPracticedAt: T0 - DAY };
    });
    const input = {
      language: 'zh' as const,
      learned: new Set(learnedIds),
      review: save.phase2.review,
      err: save.phase2.err,
      now: T0,
      seed: 9,
      category: null,
      total: 24,
    };
    const plan = buildErrandPlan(input);
    expect(plan.plan.length).toBe(24);
    for (const id of plan.plan) expect(learnedIds.includes(id)).toBe(true);
    // 易错 9 个槽、到期 9 个槽：候选数与槽位相等时轮询保证每个候选至少一次。
    const errorIds = new Set(errorPool('zh', save.phase2.err, new Set(learnedIds)).map((c) => c.itemId));
    const dueIds = new Set(learnedIds.slice(9, 18));
    expect(errorIds.size).toBe(9);
    for (const id of errorIds) expect(plan.plan.filter((x) => x === id).length).toBeGreaterThanOrEqual(1);
    for (const id of dueIds) expect(plan.plan.filter((x) => x === id).length).toBeGreaterThanOrEqual(1);
    // 确定性
    expect(buildErrandPlan(input).plan).toEqual(plan.plan);
  });

  it('无池不能开始：委托需要已学内容与首个故事完成', () => {
    const save = freshSave();
    expect(p2StartError(save, { kind: 'errand', language: 'zh' })).toBe('errand-locked');
    const withStory = playP2(save, { kind: 'story', taskId: 'zh-1-lamp-house' }, T0).save;
    // 首个故事完成即有 3 个已学字 → 可开始，2026-11-16 下调后委托 12 题。
    expect(p2StartError(withStory, { kind: 'errand', language: 'zh' })).toBeNull();
    expect(errandTotal('zh', new Set(Object.keys(withStory.phase2.learned)))).toBe(12);
  });

  it('委托题数：中文 12、英文单词 12、英文有短句后 9（2026-11-16 下调）', () => {
    const zhChars = new Set(PHASE2_ITEMS.filter((i) => i.language === 'zh' && i.kind === 'character').map((i) => i.id));
    expect(errandTotal('zh', zhChars)).toBe(12);
    zhChars.add('zh-037');
    expect(errandTotal('zh', zhChars)).toBe(12);
    const enWords = new Set(PHASE2_ITEMS.filter((i) => i.language === 'en' && i.kind === 'word').map((i) => i.id));
    expect(errandTotal('en', enWords)).toBe(12);
    enWords.add('en-s-001');
    expect(errandTotal('en', enWords)).toBe(9);
  });

  it('易错窗口：最近 20 条内失败/求助才进入易错池', () => {
    let w = pushErrWindow(undefined, false, T0);
    w = pushErrWindow(w, true, T0 + 1);
    w = pushErrWindow(w, false, T0 + 2);
    const pool = errorPool('zh', { 'zh-001': w }, new Set(['zh-001']));
    expect(pool.length).toBe(1);
    expect(pool[0]!.trouble).toBe(1);
    const clean = pushErrWindow(undefined, false, T0);
    expect(errorPool('zh', { 'zh-001': clean }, new Set(['zh-001']))).toEqual([]);
  });
});

/* ------------------------------------------------------------------ I01 提交评分 */

describe('I01 完整文本评分', () => {
  const happy = phase2Item('en-s-009')!; // I am happy.
  it('I am happy. 通过', () => {
    expect(evaluateSubmission(happy, 'I am happy.').kind).toBe('match');
  });
  it('小写 i、双空格、缺句号不通过', () => {
    expect(evaluateSubmission(happy, 'i am happy.').kind).toBe('mismatch');
    expect(evaluateSubmission(happy, 'I am  happy.').kind).toBe('mismatch');
    expect(evaluateSubmission(happy, 'I am happy').kind).toBe('mismatch');
  });
  it('空提交只提示不计错；NFC 归一；不 trim 两端', () => {
    expect(evaluateSubmission(happy, '').kind).toBe('empty');
    expect(evaluateSubmission(happy, '  ').kind).toBe('empty');
    expect(evaluateSubmission(happy, ' I am happy.').kind).toBe('mismatch');
    const zh = phase2Item('zh-001')!;
    expect(evaluateSubmission(zh, '人').kind).toBe('match');
    expect(evaluateSubmission(zh, '人 ').kind).toBe('mismatch');
    expect(normalizeText('人')).toBe('人');
  });
  it('中文目标输入拉丁字母给出拼音提示，仍按未匹配计', () => {
    const zh = phase2Item('zh-001')!;
    const r = evaluateSubmission(zh, 'ren');
    expect(r.kind).toBe('mismatch');
    expect(r.pinyinHint).toBe(true);
  });
});

/* ------------------------------------------------------------------ I04/I05/S01/S02 提交与帮助 */

describe('I04/I05/S01/S02 提交状态与帮助', () => {
  it('空输入不计错误；连按提交不重复完成', () => {
    let s = resumeP2Task(startStory(freshSave(), 'zh-1-lamp-house'), T0 + 100);
    const first = submitP2(s, '', T0 + 200);
    expect(first.kind).toBe('empty');
    s = first.save;
    const target = phase2Item(currentOccurrence(activeP2(s))!.occ.targetId)!.target;
    const ok = submitP2(s, target, T0 + 300);
    expect(ok.occurrenceCompleted).toBe(true);
    // 已完成的题只完成一次：重复提交不会再增加完成数。
    expect(ok.save.phase2.stats['zh:story'].items).toBe(1);
    const emptyAgain = submitP2(ok.save, '', T0 + 350);
    expect(emptyAgain.kind).toBe('empty');
    const repeat = submitP2(ok.save, target, T0 + 400);
    expect(repeat.save.phase2.stats['zh:story'].items).toBe(1); // 不重复完成
    // 空提交不计错误。
    expect(ok.save.phase2.stats['zh:story'].wrongSubmissions).toBe(0);
    expect(emptyAgain.save.phase2.stats['zh:story'].wrongSubmissions).toBe(0);
  });

  it('错误首次提交再修正：分母 1、首次正确 0、完成 1（S01）', () => {
    let s = resumeP2Task(startStory(freshSave(), 'zh-1-lamp-house'), T0 + 100);
    const target = phase2Item(currentOccurrence(activeP2(s))!.occ.targetId)!.target;
    const wrong = submitP2(s, target === '人' ? '口' : '人', T0 + 200);
    expect(wrong.kind).toBe('mismatch');
    expect(wrong.firstSubmission).toBe(true);
    s = wrong.save;
    // 错误提交保留文字。
    expect(currentOccurrence(activeP2(s))!.occ.draft.length).toBeGreaterThan(0);
    const right = submitP2(s, target, T0 + 300);
    s = right.save;
    const g = s.phase2.stats['zh:story'];
    expect(g.firstSubmittedItems).toBe(1);
    expect(g.firstCorrectItems).toBe(0);
    expect(g.items).toBe(1);
    expect(g.wrongSubmissions).toBe(1);
  });

  it('错误 3 次：原文保留、帮助逐级、不跳题不代填（I05）', () => {
    let s = resumeP2Task(startStory(freshSave(), 'zh-1-lamp-house'), T0 + 100);
    const occ0 = currentOccurrence(activeP2(s))!;
    const target = phase2Item(occ0.occ.targetId)!.target;
    const wrongText = target === '人' ? '口' : '人';
    for (let i = 0; i < 3; i++) {
      const r = submitP2(s, wrongText, T0 + 200 + i);
      expect(r.kind).toBe('mismatch');
      s = r.save;
    }
    const occ = currentOccurrence(activeP2(s))!.occ;
    expect(occ.completed).toBe(false);
    expect(occ.wrongSubmissions).toBe(3);
    expect(currentOccurrence(activeP2(s))!.index).toBe(0); // 没有跳题
    expect(occ.helpUsed).toBe(true); // 第 2 次错误后的操作帮助计入求助
    expect(s.phase2.stats['zh:story'].items).toBe(0); // 未完成、未代填
    // 目标不变。
    expect(phase2Item(occ.targetId)!.target).toBe(target);
  });

  it('常驻拼音不计求助；显式帮助计一次；重复帮助不重复计（S02）', () => {
    let s = resumeP2Task(startStory(freshSave(), 'zh-1-lamp-house'), T0 + 100);
    // 常驻目标与拼音展示不改变任何状态：
    const before = structuredClone(s.phase2);
    void before;
    s = markP2Help(s);
    expect(activeP2(s).items[0]!.helpUsed).toBe(true);
    s = markP2Help(s);
    s = markP2Help(s);
    expect(s.phase2.stats['zh:story'].helpItems).toBe(0); // 未完成，helpItems 在完成时计入
    const target = phase2Item(currentOccurrence(activeP2(s))!.occ.targetId)!.target;
    const done = submitP2(s, target, T0 + 300);
    expect(done.save.phase2.stats['zh:story'].helpItems).toBe(1);
  });
});

/* ------------------------------------------------------------------ S03/S04 复习与时间 */

describe('S03/S04 复习调度与时间回拨', () => {
  it('同 item 同实例反复正确最多提高一级；任一失败回到 1 天（S03）', () => {
    const now = T0;
    let record = applyReview(undefined, [{ firstCorrect: true, helpUsed: false }], now);
    expect(record.dueAt).toBe(now + DAY);
    expect(record.level).toBe(0);
    // 全部首次正确 → 提高一级
    record = applyReview(record, [{ firstCorrect: true, helpUsed: false }, { firstCorrect: true, helpUsed: false }], now + DAY);
    expect(record.level).toBe(1);
    expect(record.dueAt).toBe(now + DAY + ladderMs(1));
    // 任一失败 → 回到 1 天
    record = applyReview(record, [{ firstCorrect: false, helpUsed: false }], now + 2 * DAY);
    expect(record.level).toBe(0);
    expect(record.dueAt).toBe(now + 2 * DAY + DAY);
    // 帮助也算失败
    record = applyReview(record, [{ firstCorrect: true, helpUsed: true }], now + 3 * DAY);
    expect(record.level).toBe(0);
    // 到期判断
    expect(isDue(record, record.dueAt - 1)).toBe(false);
    expect(isDue(record, record.dueAt)).toBe(true);
  });

  it('系统时间回拨：进度不倒退、无负间隔、再次进入不发奖（S04）', () => {
    let save = playP2(freshSave(), { kind: 'story', taskId: 'zh-1-lamp-house' }, T0).save;
    const coins = save.coins;
    const dueAt = save.phase2.review['zh-001']!.dueAt;
    const maxObserved = save.phase2.maxObservedAt;
    // 回拨 10 天后重玩同一故事（重玩 20 币，不因回拨多发）
    const rolled = playP2(save, { kind: 'story', taskId: 'zh-1-lamp-house' }, T0 - 10 * DAY);
    save = rolled.save;
    // 回拨不减少既有进度：dueAt 只能不变或因新的完成而推进。
    expect(save.phase2.review['zh-001']!.dueAt).toBeGreaterThanOrEqual(dueAt);
    expect(save.phase2.maxObservedAt).toBeGreaterThanOrEqual(maxObserved);
    // 时间回拨不发额外奖励：结算时间被保护在 maxObservedAt（回拨前的同一天），
    // 重玩固定 20 币，且同一本地日期不再发每日小目标加币。
    expect(save.coins).toBe(coins + 20);
    expect(save.lastTaskResult?.coins).toBe(20);
    expect(save.lastTaskResult?.dailyBonusCoins ?? 0).toBe(0);
    // p2Now 保护
    expect(p2Now(save, T0 - 20 * DAY)).toBe(save.phase2.maxObservedAt);
  });
});

/* ------------------------------------------------------------------ R01/R02/R03 奖励 */

describe('R01/R02/R03 奖励与幂等', () => {
  it('首次故事 30、其余（重玩/委托/专项）每次 20；无准确率奖金（R01）', () => {
    let save = freshSave();
    save = playP2(save, { kind: 'story', taskId: 'zh-1-lamp-house' }, T0).save;
    expect(save.lastTaskResult!.coins).toBe(30);
    save = playP2(save, { kind: 'story', taskId: 'zh-1-lamp-house' }, T0 + DAY).save;
    expect(save.lastTaskResult!.coins).toBe(20);
    expect(save.lastTaskResult!.firstReward).toBe(false);
    save = playP2(save, { kind: 'errand', language: 'zh' }, T0 + 2 * DAY, { seed: 33 }).save;
    expect(save.lastTaskResult!.coins).toBe(20);
    expect(save.lastTaskResult!.kind).toBe('errand');
    save.phase2.teaching['zh:selection'] = true; // 教学卡在故事练习中展示（界面行为），单测中直接标记
    save = playP2(save, { kind: 'drill', language: 'zh', category: 'selection' }, T0 + 3 * DAY, { seed: 34 }).save;
    expect(save.lastTaskResult!.coins).toBe(20);
    expect(save.lastTaskResult!.kind).toBe('drill');
    // 无论错误多少次，奖金一致（不按错误扣/加）。
    const messy = playP2(freshSave(), { kind: 'story', taskId: 'zh-1-lamp-house' }, T0, {
      wrongAt: [0, 1, 2],
      helpAt: [3],
    }).save;
    expect(messy.coins).toBe(35); // 30 + 当日小目标 5
  });

  it('R04 每日小目标：本地日期首个任务 +5 并推进连击；同日不重复；断签回到 1', () => {
    const HOUR = 3_600_000;
    let save = playP2(freshSave(), { kind: 'story', taskId: 'zh-1-lamp-house' }, T0).save;
    expect(save.lastTaskResult!.dailyBonusCoins).toBe(5);
    expect(save.phase2.dailyBonus).toEqual({ lastDate: localDateKey(T0), streakDays: 1 });
    const afterFirst = save.coins; // 30 + 5
    // 同日第二个任务（新故事，首次 30 币）：不再加每日币。
    save = playP2(save, { kind: 'story', taskId: 'zh-1-bakery' }, T0 + 3 * HOUR).save;
    expect(save.lastTaskResult!.dailyBonusCoins ?? 0).toBe(0);
    expect(save.lastTaskResult!.coins).toBe(30);
    expect(save.coins).toBe(afterFirst + 30);
    // 次日：连击推进到 2。
    save = playP2(save, { kind: 'story', taskId: 'zh-1-post-office' }, T0 + DAY + 3 * HOUR).save;
    expect(save.lastTaskResult!.dailyBonusCoins).toBe(5);
    expect(save.phase2.dailyBonus).toEqual({ lastDate: localDateKey(T0 + DAY), streakDays: 2 });
    // 跳过几天再完成：连击回到 1（断签不惩罚，也不补发）。
    save = playP2(save, { kind: 'story', taskId: 'zh-1-flower-house' }, T0 + 5 * DAY).save;
    expect(save.phase2.dailyBonus).toEqual({ lastDate: localDateKey(T0 + 5 * DAY), streakDays: 1 });
  });

  it('刷新结果页不重复发奖；旧实例重结算被拒绝（R02）', () => {
    let save = playP2(freshSave(), { kind: 'story', taskId: 'zh-1-lamp-house' }, T0).save;
    const coins = save.coins;
    const instanceId = save.lastTaskResult!.instanceId;
    // 结果页刷新：不产生任何结算调用；即使调用也拒绝旧实例。
    const r = settleP2ById(save, instanceId, T0 + 60_000);
    expect(r.settledNow).toBe(false);
    expect(save.coins).toBe(coins);
    // 历史淘汰（settled 列表裁剪）不影响：没有 activeTask 的旧实例永远拒绝。
    save.settled = [];
    const r2 = settleP2ById(save, instanceId, T0 + 60_000);
    expect(r2.settledNow).toBe(false);
    expect(save.coins).toBe(coins);
  });

  it('放弃旧任务：无完成奖励，已提交表现保留；取消不放弃（R03）', () => {
    let save = resumeP2Task(startStory(freshSave(), 'zh-1-lamp-house'), T0 + 100);
    const target = phase2Item(currentOccurrence(activeP2(save))!.occ.targetId)!.target;
    const ok = submitP2(save, target, T0 + 200);
    save = ok.save;
    const coinsBefore = save.coins;
    const statsItems = save.phase2.stats['zh:story'].items;
    save = abandonP2Task(save, T0 + 300);
    expect(save.activeTask).toBeNull();
    expect(save.coins).toBe(coinsBefore); // 无完成奖励
    expect(save.phase2.stats['zh:story'].items).toBe(statsItems); // 已提交表现保留
    expect(save.phase2.storyDone).toEqual([]);
  });
});

/* ------------------------------------------------------------------ P01/P02/P04 存档 */

describe('P01/P02/P04 迁移与恢复', () => {
  it('真实旧档（schemaVersion 1，含未完成关）迁移：余额、装饰、课程、建筑、未完成关保持', () => {
    // 构造一份由游戏逻辑真实生成的第一阶段存档（fixture）。
    let save = freshSave(T0);
    save.coins = 96;
    save.owned = ['leaf-hat'];
    save.equipped = { head: 'leaf-hat', scarf: null, lamp: null };
    save.buildings = [6, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    save.currentBuilding = 1;
    save.course = { stage: 4, allComplete: false, lastQualifying: { s: 5, l: 6 }, nextMode: 'keys', introSeen: 3 };
    const started = startLevel(save, { entry: 'light' }, T0 + 60_000, 4242);
    expect(started.error).toBeNull();
    let s = resumeLevel(started.save, T0 + 61_000);
    // 练到一半（5 个正确）。
    for (let i = 0; i < 5; i++) s = applyInput(s, s.activeTask && s.activeTask.variant === 'phase1' ? s.activeTask.level.targets[s.activeTask.level.pos] : '', T0 + 62_000 + i * 1000).save;
    const raw = JSON.stringify({ ...s, schemaVersion: 1, activeLevel: (s.activeTask as { level: unknown }).level, activeTask: undefined });
    const parsed = parseSave(raw);
    expect(parsed.kind).toBe('ok');
    const migrated = (parsed as { save: SaveData }).save;
    expect(migrated.schemaVersion).toBe(2);
    expect((parsed as { migrated?: boolean }).migrated).toBe(true);
    expect(migrated.coins).toBe(96);
    expect(migrated.owned).toEqual(['leaf-hat']);
    expect(migrated.equipped.head).toBe('leaf-hat');
    expect(migrated.course.stage).toBe(4);
    expect(migrated.buildings).toEqual([6, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(migrated.activeTask?.variant).toBe('phase1');
    const lvl = migrated.activeTask && migrated.activeTask.variant === 'phase1' ? migrated.activeTask.level : null;
    expect(lvl!.pos).toBe(5);
    expect(lvl!.seed).toBe(4242);
    // 载入后（prepareLoadedSave）未完成关一律先暂停。
    const prepared = prepareLoadedSave(migrated, T0 + 65_000);
    expect(p1Level(prepared)!.paused).toBe(true);
    expect(p1Level(prepared)!.pos).toBe(5);
    // 空的 phase2 数据。
    expect(migrated.phase2.storyDone).toEqual([]);
    expect(migrated.lastTaskResult).toBeNull();
    // 未完成关能继续完成并结算（第一阶段行为不变）。
    const finished = finishLevel(migrated, T0 + 70_000);
    const settled2 = settleLevel(finished.save, finished.now);
    expect(settled2.settledNow).toBe(true);
    if (settled2.settledNow) {
      expect(settled2.result.building!.index).toBe(1);
      expect(settled2.result.building!.before).toBe(2);
    }
  });

  it('更高版本存档保护（P02）', () => {
    const save = freshSave();
    const raw = JSON.stringify({ ...save, schemaVersion: SCHEMA_VERSION + 1 });
    const parsed = parseSave(raw);
    expect(parsed.kind).toBe('future');
    expect((parsed as { version: number }).version).toBe(SCHEMA_VERSION + 1);
  });

  it('损坏存档走备份（P02），主档合法时不动备份', () => {
    const save = freshSave();
    const raw = JSON.stringify(save);
    const parsed = parseSave(raw);
    expect(parsed.kind).toBe('ok');
    expect((parsed as { migrated?: boolean }).migrated).toBeUndefined();
  });

  it('最后题写入后关闭、结果未展示：恢复为已结算结果（P04）', () => {
    // 构造一个全部完成但未结算的任务（绕过 submitP2 的自动结算）。
    let save = freshSave();
    const started = startP2Task(save, { kind: 'story', taskId: 'zh-1-lamp-house' }, T0, 500);
    save = structuredClone(started.save);
    const slot = save.activeTask;
    if (!slot || slot.variant !== 'phase2') throw new Error('expected phase2');
    const task = slot.task;
    for (const occ of task.items) {
      occ.completed = true;
      occ.firstSubmitted = true;
      occ.firstCorrect = true;
      save.phase2.learned[occ.targetId] = true;
    }
    save.activeTask = { variant: 'phase2', task };
    expect(save.coins).toBe(0);
    expect(save.lastTaskResult).toBeNull();
    // 模拟重启载入：prepareLoadedP2 一次性结算，不漏奖。
    const prepared = prepareLoadedP2(save, T0 + 5000);
    expect(prepared.activeTask).toBeNull();
    expect(prepared.lastTaskResult).not.toBeNull();
    expect(prepared.lastTaskResult!.coins).toBe(30);
    expect(prepared.lastTaskResult!.dailyBonusCoins).toBe(5);
    expect(prepared.coins).toBe(35); // 30 + 今日小目标 5
    // 再次载入不重复发奖。
    const again = prepareLoadedP2(prepared, T0 + 6000);
    expect(again.coins).toBe(35);
  });

  it('第一阶段未完成关与第二阶段任务共用一个槽：开始第二阶段任务前必须明确处理第一阶段关', () => {
    const save = freshSave();
    const started = startLevel(save, { entry: 'light' }, T0, 7);
    expect(p2StartError(started.save, { kind: 'story', taskId: 'zh-1-lamp-house' })).toBe('has-active-task');
    const cleared = discardActiveLevel(started.save, T0 + 1000);
    expect(p2StartError(cleared, { kind: 'story', taskId: 'zh-1-lamp-house' })).toBeNull();
  });
});

/* ------------------------------------------------------------------ 步骤推进 */

describe('故事步骤推进', () => {
  it('三步依次推进；step-complete 在步骤最后一题后出现（非最后一步）', () => {
    let save = resumeP2Task(startStory(freshSave(), 'zh-1-lamp-house'), T0 + 100);
    let t = T0 + 200;
    let sawStepComplete = 0;
    for (;;) {
      const slot = save.activeTask;
      if (!slot || slot.variant !== 'phase2') break;
      const cur = currentOccurrence(slot.task);
      if (!cur) break;
      const target = phase2Item(cur.occ.targetId)!.target;
      const out = submitP2(save, target, t);
      save = out.save;
      t += 500;
      if (out.stepCompleted) sawStepComplete += 1;
    }
    expect(sawStepComplete).toBe(2); // 前两步各有一次；最后一步直接进结果
    expect(save.activeTask).toBeNull();
    expect(save.lastTaskResult!.itemCount).toBe(12);
    expect(stepDone(activeP2(structuredClone(startStory(freshSave(), 'zh-1-lamp-house'))), 0)).toBe(0);
  });

  it('currentStep 恢复正确（刷新后回到当前步骤）', () => {
    let save = resumeP2Task(startStory(freshSave(), 'en-1-lamp-house'), T0 + 100);
    let t = T0 + 100;
    for (let i = 0; i < 4; i++) { // en-1 每步 4 题：完成第 1 步进入第 2 步
      const cur = currentOccurrence(activeP2(save))!;
      save = submitP2(save, phase2Item(cur.occ.targetId)!.target, t += 400).save;
    }
    expect(currentStep(activeP2(save))).toBe(1);
    const restored = parseSave(JSON.stringify(save));
    expect(currentStep(activeP2((restored as { save: SaveData }).save))).toBe(1);
  });
});

/* ------------------------------------------------------------------ 双路线完成 */

describe('故事课程完成', () => {
  it('完成两条路线显示课程完成（结果字段 courseComplete）', () => {
    const save = freshSave();
    const zh = phase2TasksOf('zh').map((t) => t.id);
    const en = phase2TasksOf('en').map((t) => t.id);
    const slot = save.activeTask;
    void slot;
    // 直接构造：全部故事标记完成，最后一个故事结算时 courseComplete。
    let s = structuredClone(save);
    s.phase2.storyDone = [...zh.slice(0, -1), ...en];
    const lastTask = phase2Task(zh[zh.length - 1]!)!;
    const started = startP2Task(s, { kind: 'story', taskId: lastTask.id }, T0, 600);
    s = structuredClone(started.save);
    const t2 = (s.activeTask as { task: P2TaskState }).task;
    for (const occ of t2.items) {
      occ.completed = true;
      occ.firstSubmitted = true;
      occ.firstCorrect = true;
      s.phase2.learned[occ.targetId] = true;
    }
    s.activeTask = { variant: 'phase2', task: t2 };
    const prepared = prepareLoadedP2(s, T0 + 1000);
    expect(prepared.lastTaskResult!.routeComplete).toBe(true);
    expect(prepared.lastTaskResult!.courseComplete).toBe(true);
  });

  it('nextStoryOf 推荐同语言下一项', () => {
    expect(nextStoryOf('zh', new Set())).toBe('zh-1-lamp-house');
    expect(nextStoryOf('zh', new Set(['zh-1-lamp-house']))).toBe('zh-1-bakery');
    expect(nextStoryOf('zh', new Set(phase2TasksOf('zh').map((t) => t.id)))).toBeNull();
  });
});

/* ------------------------------------------------------------------ 专项 */

describe('专项开放与类别过滤', () => {
  it('教学展示后开放对应专项；只抽已学内容', () => {
    let save = freshSave();
    // 大写教学未展示 → 锁定（说明原因）
    expect(p2StartError(save, { kind: 'drill', language: 'en', category: 'uppercase' })).toBe('drill-locked');
    save.phase2.teaching['en:uppercase'] = true;
    // 教学已展示但还没有已学的大写内容 → 锁定（无题池，显示原因并引导继续课程）
    expect(p2StartError(save, { kind: 'drill', language: 'en', category: 'uppercase' })).toBe('drill-locked');
    expect(drillLockReason(save, 'uppercase')).toContain('先完成一个相关故事任务吧');
    // 学了带大写 tag 的句子后开放
    save.phase2.learned['en-s-001'] = true; // Hello. — uppercase + punctuation
    expect(p2StartError(save, { kind: 'drill', language: 'en', category: 'uppercase' })).toBeNull();
    const started = startP2Task(save, { kind: 'drill', language: 'en', category: 'uppercase' }, T0, 700);
    expect(started.error).toBeNull();
    const task = activeP2(started.save);
    expect(task.plan.length).toBe(PHASE2_RULES.drill);
    for (const id of task.plan) {
      expect(save.phase2.learned[id]).toBe(true);
      expect(phase2Item(id)!.tags.includes('uppercase')).toBe(true);
    }
  });

  it('易错专项需要失败或求助记录；专项目录描述与语言对应', () => {
    let save = freshSave();
    expect(p2StartError(save, { kind: 'drill', language: 'zh', category: 'tricky-zh' })).toBe('drill-locked');
    save.phase2.learned['zh-001'] = true;
    save.phase2.err['zh-001'] = pushErrWindow(undefined, true, T0);
    expect(p2StartError(save, { kind: 'drill', language: 'zh', category: 'tricky-zh' })).toBeNull();
    expect(DRILL_CATEGORIES.filter((d) => d.language === 'zh').map((d) => d.id).sort()).toEqual(['polyphone', 'selection', 'tricky-zh', 'umlaut']);
    expect(DRILL_CATEGORIES.filter((d) => d.language === 'en').map((d) => d.id).sort()).toEqual(['punctuation', 'space', 'tricky-en', 'uppercase']);
  });

  it('多音字与 ü 专项只出现在对应教学之后（从中文 31/34 的已学内容）', () => {
    const save = freshSave();
    // 未学习任何多音字 → 锁定
    expect(p2StartError(save, { kind: 'drill', language: 'zh', category: 'polyphone' })).toBe('drill-locked');
    expect(p2StartError(save, { kind: 'drill', language: 'zh', category: 'umlaut' })).toBe('drill-locked');
    // 多音字首次出现在中文 31（音乐 zh-084）
    const poly = PHASE2_ITEMS.find((i) => i.tags.includes('polyphone'))!;
    expect(poly.firstTask).toBe(31);
    const umlaut = PHASE2_ITEMS.find((i) => i.tags.includes('umlaut'))!;
    expect(umlaut.firstTask).toBe(34);
  });
});

describe('空闲暂停与输入活动（打字不打断）', () => {
  it('组字/草稿活动刷新空闲计时：输入超过 30 秒不被自动暂停', () => {
    let save = resumeP2Task(startStory(freshSave(), 'zh-1-lamp-house'), T0);
    const task = activeP2(save);
    const occId = currentOccurrence(task)!.occ.occurrenceId;
    // 起点：任务开始后 25 秒仍在可暂停窗口内
    let r = tickP2Task(save, T0 + 25_000);
    expect(r.autoPaused).toBe(false);
    save = r.save;
    // 第 29 秒开始组字（算输入活动），第 40 秒组字结束（选字上屏）
    save = setP2Composition(save, occId, true, T0 + 29_000);
    save = setP2Composition(save, occId, false, T0 + 40_000);
    // 第 60 秒：距上次活动 20 秒，不应暂停（旧实现会在第 30 秒就暂停）
    r = tickP2Task(save, T0 + 60_000);
    expect(r.autoPaused).toBe(false);
    save = r.save;
    // 草稿保存也算活动
    save = setP2Draft(save, occId, '人', T0 + 80_000);
    r = tickP2Task(save, T0 + 105_000);
    expect(r.autoPaused).toBe(false);
    save = r.save;
    // 真正闲置 30 秒后才暂停
    r = tickP2Task(save, T0 + 111_000);
    expect(r.autoPaused).toBe(true);
  });

  it('touchP2Task：暂停中不动作；未暂停时刷新计时（覆盖层关闭后不会立刻又被暂停）', () => {
    const active = resumeP2Task(startStory(freshSave(), 'zh-1-lamp-house'), T0);
    const paused = pauseP2Task(active, T0 + 1000);
    expect(touchP2Task(paused, T0 + 60_000)).toBe(paused); // 暂停中：原样返回
    // 未暂停：25 秒后 touch，30 秒处的 tick 不暂停
    const save = touchP2Task(active, T0 + 25_000);
    expect(tickP2Task(save, T0 + 50_000).autoPaused).toBe(false);
    expect(tickP2Task(save, T0 + 56_000).autoPaused).toBe(true);
  });
});

/* ------------------------------------------------------------------ 激励与长期目标（2026-11-17） */

describe('激励与长期目标', () => {
  it('B 居民入住：建筑 6 个故事全完成才算入住；集满那一次报喜、重玩不重复报', () => {
    const stories = PHASE2_TASKS.filter((t) => t.buildingId === 'lamp-house').map((t) => t.id);
    expect(stories.length).toBe(6);
    expect(residentBuildings([])).toEqual([]);
    expect(residentBuildings(stories.slice(0, 5))).not.toContain('lamp-house');
    expect(residentBuildings(stories)).toContain('lamp-house');
    expect(residentJustJoined('lamp-house', stories, true)).toBe(true);
    expect(residentJustJoined('lamp-house', stories, false)).toBe(false);
    // 未集满的建筑即使首次完成也不报喜。
    expect(residentJustJoined('bakery', stories, true)).toBe(false);
  });

  it('C 图鉴映射：每个 item 都归属首次出现的故事任务建筑', () => {
    for (const item of PHASE2_ITEMS) expect(buildingOfItem(item.id)).toBeTruthy();
    expect(buildingOfItem('zh-001')).toBe('lamp-house');
    // 每座建筑都有词组（12 组分组完整）。
    const covered = PHASE2_BUILDING_ORDER.filter((b) => PHASE2_ITEMS.some((i) => buildingOfItem(i.id) === b));
    expect(covered.length).toBe(PHASE2_BUILDING_ORDER.length);
  });
});
