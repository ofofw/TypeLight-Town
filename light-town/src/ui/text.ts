import { BUILDINGS, DISTRICTS, STAGES_PER_BUILDING } from '../config/buildings';
import { SPACE, newKeysForStage } from '../config/keys';
import type { LevelResult, LevelState, Mode } from '../core/types';

export const MODE_NAMES: Record<Mode, string> = {
  keys: '逐键点窗',
  strip: '连接灯带',
  sign: '点亮招牌',
};

export const MODE_DESCRIPTIONS: Record<Mode, string> = {
  keys: '每次出现一个字母，按对一个，窗户就多一点光。',
  strip: '三个字母一组，从左往右按，每完成一组连起一段灯带。',
  sign: '一个字母一个字母拼出单词，拼完一个词，招牌亮一块。',
};

/** Key name as printed on the keycap. */
export function keyCapName(key: string): string {
  return key === SPACE ? '空格' : key === ';' ? ';' : key.toUpperCase();
}

export function keyList(keys: readonly string[]): string {
  return keys.map(keyCapName).join(' ');
}

export function stageNewKeysText(stage: number): string {
  return keyList(newKeysForStage(stage));
}

export function buildingName(index: number): string {
  return BUILDINGS[index]?.name ?? '';
}

/** 由建筑 ID 取名称（第二阶段任务用建筑 ID 引用）。 */
export function buildName(buildingId: string): string {
  return BUILDINGS.find((b) => b.id === buildingId)?.name ?? '';
}

export function districtName(index: number): string {
  return DISTRICTS[index]?.name ?? '';
}

export function stageProgressText(stage: number): string {
  return `已点亮 ${stage}/${STAGES_PER_BUILDING}`;
}

/** Short heading for the practice page and result page. */
export function levelHeading(level: Pick<LevelState, 'entry' | 'mode' | 'courseStage' | 'courseLabel' | 'buildingTarget' | 'replayBuilding' | 'festival'>): string {
  const mode = MODE_NAMES[level.mode];
  switch (level.entry) {
    case 'light':
      return `点亮${buildingName(level.buildingTarget ?? 0)} · ${mode}`;
    case 'learn':
      return `继续学习 · 第 ${level.courseStage} 阶 · ${mode}`;
    case 'route':
      return `学习路线 · 第 ${level.courseStage} 阶 · ${mode}`;
    case 'replay':
      return `重练${buildingName(level.replayBuilding ?? 0)} · ${mode}`;
    case 'free':
      return level.courseLabel.startsWith('custom:')
        ? `自由练习 · 自选按键 · ${mode}`
        : `自由练习 · 第 ${level.courseStage} 阶 · ${mode}`;
    case 'festival':
      return `灯光节 · 第 ${(level.festival?.index ?? 0) + 1}/3 关 · ${mode}`;
  }
}

export function resultHeading(r: LevelResult): string {
  return levelHeading({
    entry: r.entry,
    mode: r.mode,
    courseStage: r.courseStage,
    courseLabel: r.courseLabel,
    buildingTarget: r.building?.index ?? null,
    replayBuilding: r.replayBuilding,
    festival: r.festival ? { roundId: '', index: r.festival.index } : null,
  });
}

/** What the player should know about where their progress lives (parent page and settings). */
export const STORAGE_NOTES: readonly string[] = [
  '进度只保存在这台设备的这个浏览器里，没有账号，也不会上传到网络。',
  '清除浏览器的网站数据、使用无痕/隐私浏览，都会让进度消失或无法保存。',
  '复制游戏文件不会带走进度。换浏览器或移动使用请导出两人备份，再从文件恢复。',
  'iPad 和 Mac 上的 Safari：如果连续 7 天（按使用 Safari 的天数计算）没有打开本游戏，Safari 可能会自动清除它的本地数据。',
  '添加到主屏幕后打开的“点亮小镇”，和在 Safari 标签页里打开的进度是分开保存的。',
];
