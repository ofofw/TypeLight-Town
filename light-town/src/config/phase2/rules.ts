/** 第二阶段所有数值的单一来源（spec/phase-2/RULES.md、README.md 的参数）。 */
export const PHASE2_RULES = {
  /**
   * 委托题数（2026-11-16 下调，原 24/30，中文只学单字时原 36、英文有短句后原 18）：
   * 中文只学单字 charsOnly、有词语后 withWords；英文只有单词 wordsOnly、有短句后 sentences。
   */
  errand: { charsOnly: 12, withWords: 12, wordsOnly: 12, sentences: 9 } as const,
  /** 专项固定题数（2026-11-16 下调，原 10）。 */
  drill: 6,
  /** 委托配额：易错 40%、到期复习 40%、其他已学 20%（前两项向下取整，余量归最后项）。 */
  errandQuota: { error: 0.4, due: 0.4, other: 0.2 } as const,
  /** 易错池考察的最近完成记录条数。 */
  recentCompletionWindow: 20,
  /** 复习间隔阶梯（毫秒，UTC，1 天固定 86400000ms）。 */
  dayMs: 86_400_000,
  reviewLadderDays: [1, 3, 7, 14] as const,
  /** 已提交上屏 draft 的合并写入间隔。 */
  draftSaveDebounceMs: 300,
  /** 历史上限：每个 item 保留的最近完成记录。 */
  completionHistoryPerItem: 20,
  /** 首次完成记录的 item 总数上限（99 项中文 + 81 项英文）。 */
  maxLearnedItems: 256,
  rewards: {
    storyFirst: 30,
    /** 其余（故事重玩/委托/专项）：2026-11-16 由 10 上调到 20，让奖励跟得上投入的时间。 */
    repeat: 20,
    /** 每日小目标：本地日期内首次完成任意任务额外加币（2026-11-17 新增；连击只展示不惩罚）。 */
    dailyBonus: 5,
  },
  /** 中文误输入拼音提示。 */
  pinyinHint: '切换到中文拼音输入法，选好汉字再确认。',
  emptyHint: '先输入内容',
  pasteHint: '检测到粘贴，请用键盘输入。粘贴不计入错误。',
} as const;

/** 委托 N=12 → 4/4/4；N=9 → 3/3/3（向下取整，余量归最后项）。 */
export function errandQuota(total: number): { error: number; due: number; other: number } {
  const floor = Math.floor;
  const error = floor(total * PHASE2_RULES.errandQuota.error);
  const due = floor(total * PHASE2_RULES.errandQuota.due);
  return { error, due, other: total - error - due };
}

/** 专项/委托抽取类别。 */
export type DrillCategory =
  | 'uppercase'
  | 'space'
  | 'punctuation'
  | 'tricky-en'
  | 'selection'
  | 'tricky-zh'
  | 'polyphone'
  | 'umlaut';

export const DRILL_CATEGORIES: readonly {
  id: DrillCategory;
  language: 'zh' | 'en';
  name: string;
  description: string;
}[] = [
  { id: 'uppercase', language: 'en', name: '大小写', description: '练习有大写字母的句子。' },
  { id: 'space', language: 'en', name: '空格', description: '练习单词之间的空格。' },
  { id: 'punctuation', language: 'en', name: '标点', description: '练习句号和问号。' },
  { id: 'tricky-en', language: 'en', name: '易错词句', description: '练习你提交错过或求助过的英文。' },
  { id: 'selection', language: 'zh', name: '选字', description: '练习输入拼音并选出目标汉字。' },
  { id: 'tricky-zh', language: 'zh', name: '易错字词', description: '练习你提交错过或求助过的中文。' },
  { id: 'polyphone', language: 'zh', name: '多音字', description: '练习多音字组成的词语。' },
  { id: 'umlaut', language: 'zh', name: 'ü', description: '练习含有 ü 音的词语。' },
];
