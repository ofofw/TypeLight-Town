/**
 * 第二阶段固定内容（spec/phase-2/content.json 的导入视图）。
 * 词句、拼音、任务内容以该文件为唯一来源，运行时不生成新英文或新中文。
 */
import raw from './content.json' with { type: 'json' };

/** 内容配置版本：存档记录它与完整 target 快照，资源更新不得改变未完成题目的目标。 */
export const PHASE2_CONTENT_VERSION = 'phase2-content-2';

/**
 * 已知的旧内容版本，加载时透明升级到当前版本。
 * 未完成任务在存档里自带完整题单（plan/stepCounts），不依赖 content.json 重新推导，
 * 因此题量调整不影响进行中的任务；2026-11-16 只调整了各任务题量，未改任何词句目标。
 */
export const PAST_PHASE2_CONTENT_VERSIONS: readonly string[] = ['phase2-content-1'];

export function isKnownP2ContentVersion(v: unknown): v is string {
  return v === PHASE2_CONTENT_VERSION || PAST_PHASE2_CONTENT_VERSIONS.includes(v as string);
}

export type Phase2Language = 'zh' | 'en';
export type Phase2ItemKind = 'character' | 'word' | 'sentence';
export type Phase2Tag = 'selection' | 'homophone' | 'polyphone' | 'umlaut' | 'uppercase' | 'space' | 'punctuation';

export interface Phase2Item {
  id: string;
  language: Phase2Language;
  kind: Phase2ItemKind;
  target: string;
  /** 仅中文项；带声调拼音，音节数与字数一致。 */
  pinyin?: string;
  meaning: string;
  tags: Phase2Tag[];
  /** 首次出现的故事任务序号（语言内 1–36）。 */
  firstTask: number;
  voiceText: string | null;
}

export interface Phase2TaskStep {
  title: string;
  prompt: string;
  targetCount: number;
  visualState: string;
  progressUnit: string;
}

export interface Phase2Task {
  id: string;
  language: Phase2Language;
  /** 语言内顺序 1–36。 */
  sequence: number;
  /** 学习步骤 1–3。 */
  step: number;
  buildingId: string;
  title: string;
  intro: string;
  targetCount: number;
  focusItemIds: string[];
  newItemIds: string[];
  reviewItemIds: string[];
  steps: Phase2TaskStep[];
  outro: string;
  effect: string;
}

export const PHASE2_ITEMS: readonly Phase2Item[] = raw.items as Phase2Item[];
export const PHASE2_TASKS: readonly Phase2Task[] = raw.tasks as Phase2Task[];

const ITEM_BY_ID = new Map(PHASE2_ITEMS.map((i) => [i.id, i]));
const TASK_BY_ID = new Map(PHASE2_TASKS.map((t) => [t.id, t]));

/**
 * 每个 item 归属的建筑 = 它首次出现（newItemIds）的故事任务的建筑。
 * 图鉴按建筑分组展示；全部 item 都有首次任务（validate.py 校验覆盖）。
 */
const ITEM_BUILDING = new Map<string, string>();
for (const t of PHASE2_TASKS) {
  for (const id of t.newItemIds) ITEM_BUILDING.set(id, t.buildingId);
}

export function buildingOfItem(id: string): string | undefined {
  return ITEM_BUILDING.get(id);
}

export function phase2Item(id: string): Phase2Item | undefined {
  return ITEM_BY_ID.get(id);
}

export function phase2Task(id: string): Phase2Task | undefined {
  return TASK_BY_ID.get(id);
}

export function phase2ItemsOf(language: Phase2Language): Phase2Item[] {
  return PHASE2_ITEMS.filter((i) => i.language === language);
}

/** 语言内按 sequence 排序的故事任务（各 36 个）。 */
export function phase2TasksOf(language: Phase2Language): Phase2Task[] {
  return PHASE2_TASKS.filter((t) => t.language === language).sort((a, b) => a.sequence - b.sequence);
}

export const PHASE2_BUILDING_ORDER: readonly string[] = [
  'lamp-house',
  'bakery',
  'post-office',
  'flower-house',
  'clock-tower',
  'library',
  'music-house',
  'observatory',
  'windmill',
  'lighthouse',
  'boathouse',
  'festival-hall',
];
