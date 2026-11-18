import { describe, expect, it } from 'vitest';
import { keysForStage } from '../../src/config/keys';
import {
  applyInput,
  buyAccessory,
  buyTheme,
  discardActiveLevel,
  endSession,
  equipAccessory,
  nextShopGoal,
  pauseLevel,
  prepareLoadedSave,
  resumeLevel,
  settleLevel,
  startLevel,
  tick,
} from '../../src/core/game';
import { accuracyBonus, formatAccuracy, meetsPromotionAccuracy } from '../../src/core/scoring';
import { lastDaysTotals } from '../../src/core/stats';
import { localDateKey } from '../../src/core/time';
import type { SaveData } from '../../src/core/types';
import { activeLevelOf as lvlOf, T0, finishLevel, freshSave, playLevel, wrongCharFor } from './helpers';

function playLight(save: SaveData, now: number, wrong = 0) {
  return playLevel(save, { entry: 'light' }, now, { wrong });
}

describe('B01 input handling', () => {
  it('a correct key advances exactly one target; a wrong key keeps the target and counts one error', () => {
    let s = startLevel(freshSave(), { entry: 'light' }, T0, 1).save;
    s = resumeLevel(s, T0);
    const first = lvlOf(s)!.targets[0];
    let out = applyInput(s, wrongCharFor(first), T0 + 100);
    expect(out.outcome).toBe('wrong');
    expect(lvlOf(out.save)!.pos).toBe(0);
    expect(lvlOf(out.save)!.attempts).toBe(1);
    expect(out.save.stats.keys[first].attempts).toBe(1);
    out = applyInput(out.save, first, T0 + 200);
    expect(out.outcome).toBe('correct');
    expect(lvlOf(out.save)!.pos).toBe(1);
    expect(lvlOf(out.save)!.correct).toBe(1);
  });

  it('B04 a wrong unopened letter counts against the target key and opens nothing', () => {
    let s = resumeLevel(startLevel(freshSave(), { entry: 'light' }, T0, 1).save, T0);
    const target = lvlOf(s)!.targets[0];
    s = applyInput(s, 'z', T0 + 100).save;
    expect(s.stats.keys[target]).toMatchObject({ attempts: 1, correct: 0 });
    expect(s.stats.mistypes[target]).toEqual({ z: 1 });
    expect(s.course.stage).toBe(1);
  });

  it('ignores input while paused', () => {
    let s = startLevel(freshSave(), { entry: 'light' }, T0, 1).save;
    const out = applyInput(s, lvlOf(s)!.targets[0], T0 + 50);
    expect(out.outcome).toBe('ignored');
    s = pauseLevel(resumeLevel(s, T0), T0 + 10);
    expect(applyInput(s, lvlOf(s)!.targets[0], T0 + 50).outcome).toBe('ignored');
  });
});

describe('C01–C02 accuracy display and rewards', () => {
  it('24 correct + 3 wrong shows 89%, pays 10 and does not qualify', () => {
    const { result, save } = playLight(freshSave(), T0, 3);
    expect(formatAccuracy(result.correct, result.attempts)).toBe('89%');
    expect(result.coins.total).toBe(10);
    expect(save.course.lastQualifying).toBeNull();
  });

  it('24 correct + 2 wrong shows 92% and pays 12; perfect pays 14', () => {
    const a = playLight(freshSave(), T0, 2).result;
    expect(formatAccuracy(a.correct, a.attempts)).toBe('92%');
    expect(a.coins.total).toBe(12);
    expect(playLight(freshSave(), T0, 0).result.coins.total).toBe(14);
  });

  it('B09 uses the unrounded ratio near thresholds', () => {
    expect(formatAccuracy(43, 48)).toBe('90%');
    expect(meetsPromotionAccuracy(43, 48)).toBe(false);
    expect(accuracyBonus(43, 48)).toBe(0);
    expect(formatAccuracy(48, 49)).toBe('98%');
    expect(accuracyBonus(48, 49)).toBe(2);
    expect(formatAccuracy(0, 0)).toBe('—');
  });
});

describe('B07 promotion', () => {
  it('two consecutive standard levels at ≥90% open the next stage', () => {
    let { save, now } = playLight(freshSave(), T0, 2);
    expect(save.course.stage).toBe(1);
    ({ save, now } = playLight(save, now, 0));
    expect(save.course.stage).toBe(2);
    expect(save.course.nextMode).toBe('keys');
  });

  it('a level under 90% resets the streak without demotion or clawback', () => {
    let { save, now } = playLight(freshSave(), T0, 0);
    const coins = save.coins;
    ({ save, now } = playLight(save, now, 3));
    expect(save.course.lastQualifying).toBeNull();
    expect(save.coins).toBe(coins + 10);
    ({ save, now } = playLight(save, now, 0));
    expect(save.course.stage).toBe(1);
    ({ save } = playLight(save, now, 0));
    expect(save.course.stage).toBe(2);
  });

  it('unfinished and discarded levels neither count nor reset', () => {
    let { save, now } = playLight(freshSave(), T0, 0);
    let s = startLevel(save, { entry: 'light' }, now, 99).save;
    s = resumeLevel(s, now);
    s = applyInput(s, wrongCharFor(lvlOf(s)!.targets[0]), now + 10).save;
    s = discardActiveLevel(s, now + 20);
    expect(s.course.lastQualifying).not.toBeNull();
    ({ save } = playLight(s, now + 100, 0));
    expect(save.course.stage).toBe(2);
  });

  it('old-course review, word levels and free practice do not change the streak', () => {
    let save = freshSave();
    let now = T0;
    for (let i = 0; i < 8; i++) ({ save, now } = playLight(save, now, 0));
    expect(save.course.stage).toBe(5);
    ({ save, now } = playLight(save, now, 0));
    const pending = save.course.lastQualifying;
    expect(pending).not.toBeNull();
    ({ save, now } = playLevel(save, { entry: 'route', stage: 3, mode: 'keys' }, now, { wrong: 5 }));
    ({ save, now } = playLevel(save, { entry: 'route', stage: 5, mode: 'sign' }, now, { wrong: 9 }));
    expect(save.course.lastQualifying).toEqual(pending);
    expect(save.course.stage).toBe(5);
  });

  it('route practice of the current stage and building replays count (需求澄清 §4)', () => {
    let save = freshSave();
    let now = T0;
    ({ save, now } = playLevel(save, { entry: 'route', stage: 1, mode: 'keys' }, now));
    ({ save, now } = playLevel(save, { entry: 'route', stage: 1, mode: 'keys' }, now));
    expect(save.course.stage).toBe(2);
    expect(save.buildings[0]).toBe(0);
  });

  it('requires two-level total of ≥4 correct per new key (always met by the 12-slot quota)', () => {
    const { save } = playLight(freshSave(), T0, 0);
    expect(save.course.lastQualifying).toEqual({ f: expect.any(Number), j: expect.any(Number) });
    expect(save.course.lastQualifying!.f).toBeGreaterThanOrEqual(6);
  });

  it('stage 12 completion marks all courses complete', () => {
    let save = freshSave();
    let now = T0;
    for (let i = 0; i < 24; i++) ({ save, now } = playLight(save, now, 0));
    expect(save.course.stage).toBe(12);
    expect(save.course.allComplete).toBe(true);
  });
});

describe('C03–C04 buildings and coin totals', () => {
  it('six complete levels light a building; first completion +20, district end +30', () => {
    let save = freshSave();
    let now = T0;
    let total = 0;
    for (let i = 0; i < 6; i++) {
      const r = playLight(save, now, 0);
      ({ save, now } = r);
      total += r.result.coins.total;
      expect(r.result.building).toMatchObject({ index: 0, before: i, after: i + 1 });
    }
    expect(save.buildings[0]).toBe(6);
    expect(save.currentBuilding).toBe(1);
    expect(total).toBe(6 * 14 + 20);
    for (let i = 0; i < 12; i++) ({ save, now } = playLight(save, now, 0));
    expect(save.lastResult!.districtOpened).toBe(1);
    expect(save.lastResult!.coins).toMatchObject({ building: 20, district: 30 });
  });

  it('72 perfect building levels leave 72×14 + 12×20 + 4×30 = 1368 coins and open the festival', () => {
    let save = freshSave();
    let now = T0;
    const districtsOpened: [number, number | null][] = [];
    for (let i = 0; i < 72; i++) {
      ({ save, now } = playLight(save, now, 0));
      if (save.lastResult!.districtOpened != null) districtsOpened.push([i + 1, save.lastResult!.districtOpened]);
    }
    expect(districtsOpened, 'buildings 3, 6 and 9 open the next district').toEqual([
      [18, 1],
      [36, 2],
      [54, 3],
    ]);
    expect(save.coins).toBe(1368);
    expect(save.currentBuilding).toBe(12);
    expect(save.buildings.every((n) => n === 6)).toBe(true);
    expect(save.festival.unlocked).toBe(true);
    expect(startLevel(save, { entry: 'light' }, now, 1).error).toBe('all-buildings-done');
    expect(startLevel(save, { entry: 'learn' }, now, 1).error).toBeNull();
  });

  it('A07 a learner always under 90% still lights all 12 buildings and reaches the festival at stage 1', () => {
    let save = freshSave();
    let now = T0;
    for (let i = 0; i < 72; i++) ({ save, now } = playLight(save, now, 3));
    expect(save.course.stage).toBe(1);
    expect(save.festival.unlocked).toBe(true);
    expect(save.coins).toBe(72 * 10 + 12 * 20 + 4 * 30);
    const modes: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = playLevel(save, { entry: 'festival' }, now);
      ({ save, now } = r);
      modes.push(r.result.mode);
    }
    expect(modes).toEqual(['keys', 'keys', 'keys']);
    ({ save, now } = playLevel(save, { entry: 'learn' }, now, { wrong: 0 }));
    ({ save } = playLevel(save, { entry: 'learn' }, now, { wrong: 0 }));
    expect(save.course.stage).toBe(2);
  });

  it('A08 replaying a finished building pays normally but never advances buildings', () => {
    let save = freshSave();
    let now = T0;
    for (let i = 0; i < 6; i++) ({ save, now } = playLight(save, now, 0));
    const before = [...save.buildings];
    const r = playLevel(save, { entry: 'replay', building: 0 }, now, { wrong: 2 });
    expect(r.save.buildings).toEqual(before);
    expect(r.result.coins.total).toBe(12);
    expect(r.result.building).toBeNull();
    expect(r.result.encouragement).toBe('你完成了一次练习！');
    expect(startLevel(save, { entry: 'replay', building: 1 }, now, 1).error).toBe('building-locked');
  });

  it('D02 settling twice never pays twice', () => {
    const started = startLevel(freshSave(), { entry: 'light' }, T0, 5).save;
    const done = finishLevel(started, T0 + 10).save;
    const first = settleLevel(done, T0 + 20_000);
    expect(first.settledNow).toBe(true);
    const again = settleLevel(first.save, T0 + 21_000);
    expect(again.settledNow).toBe(false);
    expect(again.save.coins).toBe(first.save.coins);
    const replayOld = settleLevel({ ...first.save, activeTask: done.activeTask }, T0 + 22_000);
    expect(replayOld.settledNow).toBe(false);
    expect(replayOld.save.coins).toBe(first.save.coins);
    expect(replayOld.save.buildings[0]).toBe(1);
  });

  it('D02 reloading on the result page after a building completion, a district end or a promotion never settles twice', () => {
    let save = freshSave();
    let now = T0;
    const reload = (s: SaveData) => prepareLoadedSave(JSON.parse(JSON.stringify(s)), now);
    const moments = new Set<string>();
    for (let i = 0; i < 18; i++) {
      const done = finishLevel(startLevel(save, { entry: 'light' }, now, 500 + i).save, now + 1000);
      const first = settleLevel(done.save, done.now + 10);
      expect(first.settledNow).toBe(true);
      now = done.now + 2000;
      if (first.result!.building?.completed) moments.add('building');
      if (first.result!.coins.district > 0) moments.add('district');
      if (first.result!.promotion?.promotedTo) moments.add('promotion');
      for (const stale of [first.save, { ...first.save, activeTask: done.save.activeTask }]) {
        const again = settleLevel(reload(stale), now);
        expect(again.settledNow).toBe(false);
        expect(again.save.coins).toBe(first.save.coins);
        expect(again.save.buildings).toEqual(first.save.buildings);
        expect(again.save.course).toEqual(first.save.course);
      }
      save = first.save;
    }
    expect([...moments].sort()).toEqual(['building', 'district', 'promotion']);
  });

  it('refuses to settle an unfinished level', () => {
    const s = startLevel(freshSave(), { entry: 'light' }, T0, 5).save;
    expect(settleLevel(s, T0).settledNow).toBe(false);
  });
});

describe('C05 and A08 festival', () => {
  function festivalSave() {
    let save = freshSave();
    let now = T0;
    for (let i = 0; i < 72; i++) ({ save, now } = playLight(save, now, 0));
    return { save, now };
  }

  it('three perfect levels pay 42 + 10; a refreshed result page pays nothing more', () => {
    let { save, now } = festivalSave();
    const start = save.coins;
    const modes: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = playLevel(save, { entry: 'festival' }, now);
      ({ save, now } = r);
      modes.push(r.result.mode);
    }
    expect(modes).toEqual(['keys', 'strip', 'sign']);
    expect(save.coins - start).toBe(52);
    expect(save.festival.roundsCompleted).toBe(1);
    expect(save.festival.round).toBeNull();
    const reloaded = prepareLoadedSave(JSON.parse(JSON.stringify(save)), now + 5000);
    expect(settleLevel(reloaded, now + 6000).save.coins).toBe(save.coins);
  });

  it('an interrupted festival level can continue later and keeps the round id', () => {
    let { save, now } = festivalSave();
    ({ save, now } = playLevel(save, { entry: 'festival' }, now));
    const roundId = save.festival.round!.id;
    let s = startLevel(save, { entry: 'festival' }, now, 77).save;
    expect(lvlOf(s)!.festival).toEqual({ roundId, index: 1 });
    s = discardActiveLevel(s, now + 10);
    s = startLevel(s, { entry: 'festival' }, now + 20, 78).save;
    expect(lvlOf(s)!.festival).toEqual({ roundId, index: 1 });
  });

  it('festival levels and free practice never advance buildings or promotion', () => {
    let { save, now } = festivalSave();
    const course = save.course;
    ({ save, now } = playLevel(save, { entry: 'festival' }, now, { wrong: 6 }));
    ({ save, now } = playLevel(save, { entry: 'free', mode: 'keys', keys: ['f', 'j'] }, now));
    ({ save } = playLevel(save, { entry: 'free', mode: 'sign', stage: 12 }, now));
    expect(save.course).toEqual(course);
  });

  it('free practice only allows opened keys, at least two', () => {
    const { save, now } = festivalSave();
    expect(startLevel(save, { entry: 'free', mode: 'keys', keys: ['f'] }, now, 1).error).toBe('keys-invalid');
    const s1 = freshSave();
    expect(startLevel(s1, { entry: 'free', mode: 'keys', keys: ['f', 'j'] }, now, 1).error).toBe('festival-locked');
  });
});

describe('A05 mode availability and A09 shop', () => {
  it('strip opens at stage 2 and words at stage 5', () => {
    const s = freshSave();
    expect(startLevel(s, { entry: 'route', stage: 1, mode: 'strip' }, T0, 1).error).toBe('mode-locked');
    expect(startLevel(s, { entry: 'route', stage: 2, mode: 'keys' }, T0, 1).error).toBe('stage-locked');
    let save = s;
    let now = T0;
    for (let i = 0; i < 8; i++) ({ save, now } = playLight(save, now, 0));
    expect(startLevel(save, { entry: 'route', stage: 4, mode: 'sign' }, now, 1).error).toBe('mode-locked');
    expect(startLevel(save, { entry: 'route', stage: 5, mode: 'sign' }, now, 1).error).toBeNull();
  });

  it('buys, equips and refuses double charges or overspending', () => {
    let save = freshSave();
    let now = T0;
    for (let i = 0; i < 3; i++) ({ save, now } = playLight(save, now, 0));
    expect(save.coins).toBe(42);
    let r = buyAccessory(save, 'moon-crown'); // 45 币 > 42 币，买不起
    expect(r.error).toBe('insufficient');
    r = buyAccessory(save, 'leaf-hat');
    expect(r.error).toBeNull();
    expect(r.save.coins).toBe(27); // 2026-11-16 降价后小叶帽 15 币
    expect(r.save.equipped.head).toBe('leaf-hat');
    const twice = buyAccessory(r.save, 'leaf-hat');
    expect(twice.error).toBe('owned');
    expect(twice.save.coins).toBe(27);
    const off = equipAccessory(r.save, 'head', null);
    expect(off.save.equipped.head).toBeNull();
    expect(equipAccessory(off.save, 'head', 'leaf-hat').save.equipped.head).toBe('leaf-hat');
    expect(equipAccessory(off.save, 'head', 'star-hat').error).toBe('not-owned');
  });

  it('nextShopGoal：最便宜的未购商品优先；全购完返回 null（目标卡数据）', () => {
    let save = freshSave();
    expect(nextShopGoal(save)).toEqual({ kind: 'accessory', id: 'leaf-hat', name: '小叶帽', price: 15 });
    save = { ...save, owned: ['leaf-hat', 'scarf-orange', 'lamp-firefly'] };
    expect(nextShopGoal(save)).toEqual({ kind: 'accessory', id: 'star-hat', name: '星星帽', price: 30 });
    save = { ...save, owned: ['leaf-hat', 'star-hat', 'moon-crown', 'scarf-orange', 'scarf-mint', 'scarf-night', 'lamp-firefly', 'lamp-flower', 'lamp-planet'] };
    expect(nextShopGoal(save)).toEqual({ kind: 'theme', id: 'mint', name: '薄荷星光', price: 40 });
    save = { ...save, themesOwned: ['mint', 'berry'] };
    expect(nextShopGoal(save)).toBeNull();
  });

  it('themes can only be bought after the festival opens', () => {
    let save = freshSave();
    save = { ...save, coins: 500 };
    expect(buyTheme(save, 'mint').error).toBe('locked');
    let now = T0;
    for (let i = 0; i < 72; i++) ({ save, now } = playLight(save, now, 0));
    const r = buyTheme(save, 'mint');
    expect(r.error).toBeNull();
    expect(r.save.coins).toBe(save.coins - 40); // 2026-11-16 降价后主题 40 币
    expect(r.save.theme).toBe('mint');
    expect(buyTheme(r.save, 'mint').error).toBe('owned');
  });
});

describe('C06–C08 statistics and timing', () => {
  it('C06 totals use summed correct / summed attempts; interrupted input counts but pays nothing', () => {
    let { save, now } = playLight(freshSave(), T0, 2);
    let s = resumeLevel(startLevel(save, { entry: 'light' }, now, 9).save, now);
    s = applyInput(s, wrongCharFor(lvlOf(s)!.targets[0]), now + 100).save;
    s = applyInput(s, lvlOf(s)!.targets[0], now + 200).save;
    s = discardActiveLevel(s, now + 300);
    expect(s.stats.attempts).toBe(26 + 2);
    expect(s.stats.correct).toBe(24 + 1);
    expect(s.coins).toBe(12);
  });

  it('C07 effective time stops 15 s after the last input and auto-pauses at 30 s', () => {
    let s = resumeLevel(startLevel(freshSave(), { entry: 'light' }, T0, 3).save, T0);
    for (let i = 1; i <= 10; i++) s = applyInput(s, lvlOf(s)!.targets[lvlOf(s)!.pos], T0 + i * 1000).save;
    let t = tick(s, T0 + 20_000);
    expect(t.autoPaused).toBe(false);
    t = tick(t.save, T0 + 40_000);
    expect(t.autoPaused).toBe(true);
    expect(lvlOf(t.save)!.effectiveMs).toBe(25_000);
    expect(t.save.stats.effectiveMs).toBe(25_000);
  });

  it('C07 the first 15 s after start count even before typing', () => {
    let s = resumeLevel(startLevel(freshSave(), { entry: 'light' }, T0, 3).save, T0);
    let t = tick(s, T0 + 29_000);
    expect(lvlOf(t.save)!.effectiveMs).toBe(15_000);
    t = tick(t.save, T0 + 30_000);
    expect(t.autoPaused).toBe(true);
    s = resumeLevel(t.save, T0 + 100_000);
    s = tick(s, T0 + 105_000).save;
    expect(lvlOf(s)!.effectiveMs).toBe(20_000);
  });

  it('C07 paused time never counts', () => {
    let s = resumeLevel(startLevel(freshSave(), { entry: 'light' }, T0, 3).save, T0);
    s = pauseLevel(s, T0 + 5_000);
    s = tick(s, T0 + 60_000).save;
    expect(lvlOf(s)!.effectiveMs).toBe(5_000);
  });

  it('C08 a session crossing midnight continues and time is filed under each local date', () => {
    const before = new Date(2026, 10, 12, 23, 59, 50).getTime();
    let s = resumeLevel(startLevel(freshSave(before), { entry: 'light' }, before, 3).save, before);
    const sessionId = s.session!.id;
    s = applyInput(s, lvlOf(s)!.targets[0], before + 5_000).save;
    s = applyInput(s, lvlOf(s)!.targets[1], before + 15_000).save;
    s = pauseLevel(s, before + 16_000);
    expect(s.session!.id).toBe(sessionId);
    expect(s.stats.daily['2026-11-12'].effectiveMs).toBe(10_000);
    expect(s.stats.daily['2026-11-13'].effectiveMs).toBe(6_000);
    expect(s.stats.daily['2026-11-12'].attempts).toBe(1);
    expect(s.stats.daily['2026-11-13'].attempts).toBe(1);
    expect(lastDaysTotals(s.stats, before + 20_000).attempts).toBe(2);
  });

  it('C08 pruning old daily rows never lowers cumulative totals', () => {
    let { save, now } = playLight(freshSave(), T0, 0);
    const old = { attempts: 99, correct: 90, effectiveMs: 1000, levels: 1 };
    save = { ...save, stats: { ...save.stats, daily: { ...save.stats.daily, '2024-01-01': old } } };
    const totals = { attempts: save.stats.attempts, effectiveMs: save.stats.effectiveMs };
    ({ save } = playLight(save, now, 0));
    expect(save.stats.daily['2024-01-01']).toBeUndefined();
    expect(save.stats.attempts).toBe(totals.attempts + 24);
    expect(save.stats.effectiveMs).toBeGreaterThan(totals.effectiveMs);
    expect(save.stats.daily[localDateKey(T0)]).toBeDefined();
  });

  it('近 7 天 includes today and the previous six local dates only', () => {
    const save = freshSave();
    const day = (offset: number) => localDateKey(new Date(2026, 10, 12 - offset, 12).getTime());
    const row = { attempts: 1, correct: 1, effectiveMs: 1000, levels: 0 };
    save.stats.daily = { [day(0)]: row, [day(6)]: row, [day(7)]: row };
    expect(lastDaysTotals(save.stats, T0).attempts).toBe(2);
  });
});

describe('sessions, reminders and encouragement', () => {
  it('a session starts with the first formal level and ends with a partial summary', () => {
    let { save, now } = playLight(freshSave(), T0, 0);
    expect(save.session!.levelsCompleted).toBe(1);
    let s = resumeLevel(startLevel(save, { entry: 'light' }, now, 4).save, now);
    s = applyInput(s, lvlOf(s)!.targets[0], now + 300).save;
    const { save: ended, summary } = endSession(s, now + 1000);
    expect(summary!.levelsCompleted).toBe(1);
    expect(summary!.partialLevel).toEqual({ attempts: 1, correct: 1 });
    expect(summary!.coins).toBe(14);
    expect(summary!.buildingChanges).toEqual([{ index: 0, from: 0, to: 1 }]);
    expect(ended.session).toBeNull();
    expect(lvlOf(ended)).not.toBeNull();
  });

  it('a session idle for over an hour is closed on the next load or start (需求澄清 §5)', () => {
    const { save, now } = playLight(freshSave(), T0, 0);
    const later = now + 61 * 60_000;
    expect(prepareLoadedSave(save, later).session).toBeNull();
    const restarted = startLevel(save, { entry: 'light' }, later, 6).save;
    expect(restarted.session!.levelsCompleted).toBe(0);
    expect(prepareLoadedSave(save, now + 30 * 60_000).session).not.toBeNull();
  });

  it('rest reminders appear at 15 and 20 effective minutes on the next result page', () => {
    let save = freshSave();
    let now = T0;
    const reminders: boolean[] = [];
    for (let i = 0; i < 14; i++) {
      const r = playLevel(save, { entry: 'light' }, now, { stepMs: 4_000 });
      ({ save, now } = r);
      reminders.push(r.result.restReminder);
    }
    expect(save.session!.effectiveMs).toBeGreaterThan(20 * 60_000);
    expect(reminders.filter(Boolean).length).toBe(2);
  });

  it('C10 encouragement follows the priority order', () => {
    let save = freshSave();
    let now = T0;
    let r = playLight(save, now, 2);
    expect(r.result.encouragement).toBe('又有一片窗户亮起来了！');
    r = playLight(r.save, r.now, 2);
    expect(r.result.encouragement).toBe('又有一片窗户亮起来了！');
    ({ save, now } = r);
    r = playLevel(save, { entry: 'light' }, now, { wrong: 0 });
    expect(r.result.encouragement).toBe('这些按键都找对了！');
    let s = r.save;
    for (let i = 0; i < 3; i++) s = playLight(s, r.now + i * 100_000, 0).save;
    expect(s.lastResult!.encouragement).toBe('你点亮了小灯屋！');
  });

  it('an unfinished level reloads paused at the same position', () => {
    let s = resumeLevel(startLevel(freshSave(), { entry: 'light' }, T0, 8).save, T0);
    for (let i = 0; i < 5; i++) s = applyInput(s, lvlOf(s)!.targets[lvlOf(s)!.pos], T0 + (i + 1) * 500).save;
    const reloaded = prepareLoadedSave(JSON.parse(JSON.stringify(s)), T0 + 10_000);
    expect(lvlOf(reloaded)!.paused).toBe(true);
    expect(lvlOf(reloaded)!.pos).toBe(5);
    expect(lvlOf(reloaded)!.targets).toEqual(lvlOf(s)!.targets);
    expect(lvlOf(reloaded)!.attempts).toBe(5);
  });

  it('only one unfinished level exists at a time', () => {
    const s = startLevel(freshSave(), { entry: 'light' }, T0, 8).save;
    expect(startLevel(s, { entry: 'route', stage: 1, mode: 'keys' }, T0, 9).error).toBe('has-active-level');
    expect(keysForStage(1)).toEqual(['f', 'j']);
  });
});
