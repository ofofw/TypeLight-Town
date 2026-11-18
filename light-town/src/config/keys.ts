export const SPACE = ' ';

export interface CourseStage {
  stage: number;
  newKeys: string[];
  tip: string;
}

export const COURSE_STAGES: readonly CourseStage[] = [
  { stage: 1, newKeys: ['f', 'j'], tip: '两只食指放在有小凸点的 F 和 J 上。' },
  { stage: 2, newKeys: ['d', 'k'], tip: '中指放在 D 和 K 上，紧挨着食指。' },
  { stage: 3, newKeys: ['s', 'l'], tip: '无名指放在 S 和 L 上。' },
  { stage: 4, newKeys: ['a'], tip: '左手小指放在 A 上。' },
  { stage: 5, newKeys: ['g', 'h'], tip: '食指向中间伸一步，按 G 和 H。' },
  { stage: 6, newKeys: ['r', 'u'], tip: '食指向上一排，按 R 和 U。' },
  { stage: 7, newKeys: ['e', 'i'], tip: '中指向上一排，按 E 和 I。' },
  { stage: 8, newKeys: ['w', 'o'], tip: '无名指向上一排，按 W 和 O。' },
  { stage: 9, newKeys: ['q', 'p'], tip: '小指向上一排，按 Q 和 P。' },
  { stage: 10, newKeys: ['t', 'y'], tip: '食指向上斜伸，按 T 和 Y。' },
  { stage: 11, newKeys: ['v', 'b', 'n', 'm'], tip: '食指向下一排，按 V、B、N、M。' },
  { stage: 12, newKeys: ['z', 'x', 'c', SPACE], tip: '左手向下一排按 Z、X、C，拇指按空格。' },
];

export const MAX_STAGE = COURSE_STAGES.length;

/** All course keys in course order (a–z plus space). */
export const COURSE_KEY_ORDER: readonly string[] = COURSE_STAGES.flatMap((s) => s.newKeys);

const ORDER_INDEX = new Map(COURSE_KEY_ORDER.map((k, i) => [k, i]));

export function courseOrderIndex(key: string): number {
  return ORDER_INDEX.get(key) ?? COURSE_KEY_ORDER.length;
}

export function stageDef(stage: number): CourseStage {
  const def = COURSE_STAGES[stage - 1];
  if (!def) throw new Error(`unknown stage ${stage}`);
  return def;
}

export function keysForStage(stage: number): string[] {
  return COURSE_STAGES.slice(0, stage).flatMap((s) => s.newKeys);
}

export function newKeysForStage(stage: number): string[] {
  return [...stageDef(stage).newKeys];
}

export function sortByCourseOrder(keys: Iterable<string>): string[] {
  return [...keys].sort((a, b) => courseOrderIndex(a) - courseOrderIndex(b));
}

export function isCourseKey(key: string): boolean {
  return ORDER_INDEX.has(key);
}

export function keyLabel(key: string): string {
  return key === SPACE ? '空格' : key;
}

export type FingerId = 'L5' | 'L4' | 'L3' | 'L2' | 'R2' | 'R3' | 'R4' | 'R5' | 'RT';

export const FINGER_NAMES: Record<FingerId, string> = {
  L5: '左手小指',
  L4: '左手无名指',
  L3: '左手中指',
  L2: '左手食指',
  R2: '右手食指',
  R3: '右手中指',
  R4: '右手无名指',
  R5: '右手小指',
  RT: '拇指',
};

export const KEY_FINGER: Record<string, FingerId> = {
  q: 'L5', a: 'L5', z: 'L5',
  w: 'L4', s: 'L4', x: 'L4',
  e: 'L3', d: 'L3', c: 'L3',
  r: 'L2', t: 'L2', f: 'L2', g: 'L2', v: 'L2', b: 'L2',
  y: 'R2', u: 'R2', h: 'R2', j: 'R2', n: 'R2', m: 'R2',
  i: 'R3', k: 'R3',
  o: 'R4', l: 'R4',
  p: 'R5',
  [SPACE]: 'RT',
};

/** Home-row resting key of each finger. The right little finger rests on the semicolon key, which is shown but never practised. */
export const HOME_KEY: Record<FingerId, string> = {
  L5: 'a', L4: 's', L3: 'd', L2: 'f', R2: 'j', R3: 'k', R4: 'l', R5: ';', RT: SPACE,
};

export function fingerHint(key: string): string {
  if (key === SPACE) return '用拇指按空格（默认右手拇指），按完回到基准位置。';
  const finger = KEY_FINGER[key];
  if (!finger) return '';
  const home = HOME_KEY[finger];
  const where = home === key ? '它就在基准位置上' : `从 ${home.toUpperCase()} 出发去按`;
  return `用${FINGER_NAMES[finger]}，${where}，按完回到基准位置，手腕放松。`;
}

/** On-screen keyboard rows (standard QWERTY). */
export const KEYBOARD_ROWS: readonly (readonly string[])[] = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  [SPACE],
];

export const BUMP_KEYS = new Set(['f', 'j']);
