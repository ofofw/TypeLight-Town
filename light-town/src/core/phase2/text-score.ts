import type { Phase2Item } from '../../config/phase2/content';

export type SubmitKind =
  /** 空提交：只提示，不计错误、不入统计。 */
  | 'empty'
  /** 与目标完全一致（Unicode NFC 后逐字符严格比较，不 trim）。 */
  | 'match'
  /** 有效提交但与目标不一致：计一次未匹配。 */
  | 'mismatch';

export interface SubmitEval {
  kind: SubmitKind;
  /** 中文目标却输入了纯拉丁字母：附加拼音输入法提示（仍按 mismatch 计）。 */
  pinyinHint: boolean;
  /** 与目标的逐字符差异（显示用）。 */
  diffs: CharDiff[];
}

export interface CharDiff {
  index: number;
  expected: string;
  actual: string | null;
}

/** Unicode NFC；不做大小写归一、不删空格、不修正答案。 */
export function normalizeText(text: string): string {
  return text.normalize('NFC');
}

/** 是否全为空白（空格、换行等）。 */
export function isBlank(text: string): boolean {
  return [...text].every((ch) => /\s/.test(ch));
}

/** 目标是否包含汉字。 */
function hasHan(text: string): boolean {
  return [...text].some((ch) => /\p{Script=Han}/u.test(ch));
}

/** 提交是否只由拉丁字母、空格和常见英文标点组成。 */
function isLatinLike(text: string): boolean {
  return [...text].every((ch) => /[A-Za-z .,?'!;:\-]/.test(ch));
}

/** 逐字符差异（同位置不同字符；长度不同按缺失处理，仅用于显示）。 */
export function diffAgainst(target: string, typed: string): CharDiff[] {
  const t = [...target];
  const s = [...typed];
  const diffs: CharDiff[] = [];
  for (let i = 0; i < Math.max(t.length, s.length); i++) {
    const expected = t[i] ?? '';
    const actual = s[i] ?? null;
    if (expected !== actual) diffs.push({ index: i, expected, actual });
  }
  return diffs;
}

/** 提交评估：空、匹配或不匹配（英文严格大小写与半角标点；中文按最终汉字判定）。 */
export function evaluateSubmission(target: Phase2Item, rawText: string): SubmitEval {
  const typed = normalizeText(rawText);
  if (isBlank(typed)) return { kind: 'empty', pinyinHint: false, diffs: [] };
  const expected = normalizeText(target.target);
  const ok = typed === expected;
  return {
    kind: ok ? 'match' : 'mismatch',
    pinyinHint: !ok && hasHan(expected) && isLatinLike(typed),
    diffs: ok ? [] : diffAgainst(expected, typed),
  };
}

/** 目标文本的字符数（Unicode code point；英文含空格标点，中文计汉字）。 */
export function targetCharCount(target: Phase2Item): number {
  return [...target.target].length;
}
