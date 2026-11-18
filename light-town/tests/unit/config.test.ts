import { describe, expect, it } from 'vitest';
import { BUILDINGS, DISTRICTS } from '../../src/config/buildings';
import { COURSE_KEY_ORDER, COURSE_STAGES, KEY_FINGER, SPACE, keysForStage } from '../../src/config/keys';
import { ACCESSORIES, PARTNERS, THEMES } from '../../src/config/shop';
import { WORDS } from '../../src/config/words';
import { restReminderThresholdMs } from '../../src/config/rules';

describe('A04 course stages and finger map', () => {
  it('has 12 stages whose new keys never repeat, cover a–z, and end with space', () => {
    expect(COURSE_STAGES).toHaveLength(12);
    const all = COURSE_STAGES.flatMap((s) => s.newKeys);
    expect(new Set(all).size).toBe(all.length);
    const letters = all.filter((k) => k !== SPACE).sort().join('');
    expect(letters).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(COURSE_STAGES[11].newKeys.at(-1)).toBe(SPACE);
    expect(COURSE_KEY_ORDER).toHaveLength(27);
  });

  it('matches the specified new keys and cumulative sizes', () => {
    const expected = ['fj', 'dk', 'sl', 'a', 'gh', 'ru', 'ei', 'wo', 'qp', 'ty', 'vbnm', 'zxc '];
    expect(COURSE_STAGES.map((s) => s.newKeys.join(''))).toEqual(expected);
    const sizes = [2, 4, 6, 7, 9, 11, 13, 15, 17, 19, 23, 27];
    expect(COURSE_STAGES.map((s) => keysForStage(s.stage).length)).toEqual(sizes);
  });

  it('maps every key to the specified finger', () => {
    const spec: Record<string, string> = {
      L5: 'qaz', L4: 'wsx', L3: 'edc', L2: 'rtfgvb', R2: 'yuhjnm', R3: 'ik', R4: 'ol', R5: 'p',
    };
    for (const [finger, keys] of Object.entries(spec)) {
      for (const k of keys) expect(KEY_FINGER[k]).toBe(finger);
    }
    expect(KEY_FINGER[SPACE]).toBe('RT');
    expect(Object.keys(KEY_FINGER)).toHaveLength(27);
  });
});

describe('content configuration', () => {
  it('has 12 buildings in 4 districts of 3', () => {
    expect(BUILDINGS).toHaveLength(12);
    expect(DISTRICTS).toHaveLength(4);
    DISTRICTS.forEach((d) => expect(BUILDINGS.filter((b) => b.district === d.index)).toHaveLength(3));
    expect(BUILDINGS.map((b) => b.name)).toEqual([
      '小灯屋', '面包坊', '邮局', '花房', '钟楼', '图书馆', '音乐屋', '观星台', '风车坊', '灯塔', '船屋', '节庆大厅',
    ]);
  });

  it('prices 9 accessories and 3 themes as specified（2026-11-16 下调后）', () => {
    const prices = Object.fromEntries(ACCESSORIES.map((a) => [a.name, a.price]));
    expect(prices).toEqual({
      小叶帽: 15, 星星帽: 30, 月亮冠: 45,
      暖橙围巾: 15, 薄荷围巾: 30, 星夜围巾: 45,
      萤火灯: 15, 花朵灯: 30, 星球灯: 45,
    });
    expect(THEMES.map((t) => [t.name, t.price])).toEqual([['暖金', 0], ['薄荷星光', 40], ['莓果晚霞', 40]]);
    expect(PARTNERS.map((p) => p.name)).toEqual(['暖暖', '慢慢', '跳跳']);
  });

  it('loads the fixed word bank de-duplicated', () => {
    expect(WORDS).toHaveLength(89);
    expect(new Set(WORDS).size).toBe(WORDS.length);
    expect(WORDS.every((w) => /^[a-z]+$/.test(w))).toBe(true);
  });

  it('schedules rest reminders at 15, 20, 30, 40 minutes', () => {
    expect([0, 1, 2, 3].map((n) => restReminderThresholdMs(n) / 60_000)).toEqual([15, 20, 30, 40]);
  });
});
