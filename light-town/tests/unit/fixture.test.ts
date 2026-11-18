import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { T0, freshSave } from './helpers';
import { applyInput, buyAccessory, p1Level, prepareLoadedSave, resumeLevel, settleLevel, startLevel } from '../../src/core/game';
import { finishOnboarding, choosePartner, updateSettings, createNewSave } from '../../src/core/game';
import { parseSave } from '../../src/core/save/storage';
import type { SaveData } from '../../src/core/types';

const FIXTURE_PATH = fileURLToPath(new URL('../fixtures/phase1-save-v1.json', import.meta.url));

/** 用第一阶段纯函数实际游玩，生成 schemaVersion 1 的真实旧档（不是手工拼的空档）。 */
function buildRealV1Save(): string {
  let save: SaveData = createNewSave(T0);
  save = choosePartner(save, 'manman');
  save = finishOnboarding(save);
  save = updateSettings(save, { musicVolume: 0.15, reduceMotion: false });

  let seed = 202_610;
  let now = T0 + 5_000;
  const playOnce = (): void => {
    const started = startLevel(save, { entry: 'light' }, now, seed++);
    if (started.error) throw new Error(`start failed: ${started.error}`);
    let s = resumeLevel(started.save, now + 500);
    let t = now + 1000;
    let wrongLeft = 2;
    for (;;) {
      const lvl = p1Level(s);
      if (!lvl || lvl.pos >= lvl.targets.length) break;
      const target = lvl.targets[lvl.pos]!;
      if (wrongLeft > 0) {
        t += 900;
        s = applyInput(s, target === 'f' ? 'j' : 'f', t).save;
        wrongLeft -= 1;
      }
      t += 900;
      s = applyInput(s, target, t).save;
    }
    const settled = settleLevel(s, t + 200);
    if (!settled.settledNow) throw new Error('not settled');
    save = settled.save;
    now = t + 5_000;
  };

  // 点亮第 1 座建筑的 4 盏灯、买一件饰品、再点 1 盏，第 6 盏进行到一半。
  playOnce();
  playOnce();
  playOnce();
  const bought = buyAccessory(save, 'leaf-hat');
  if (bought.error) throw new Error(`buy failed: ${bought.error}`);
  save = bought.save;
  playOnce();

  const started = startLevel(save, { entry: 'light' }, now, 4242);
  if (started.error) throw new Error(`start failed: ${started.error}`);
  let unfinished = resumeLevel(started.save, now + 500);
  let t = now + 1000;
  for (let i = 0; i < 9; i++) {
    const lvl = p1Level(unfinished);
    if (!lvl) break;
    t += 900;
    unfinished = applyInput(unfinished, lvl.targets[lvl.pos]!, t).save;
  }
  const lvl = p1Level(unfinished);
  if (!lvl || lvl.pos !== 9) throw new Error('fixture level incomplete');

  const v1 = {
    ...structuredClone(unfinished),
    schemaVersion: 1,
    activeLevel: lvl,
  };
  delete (v1 as Record<string, unknown>).activeTask;
  delete (v1 as Record<string, unknown>).lastTaskResult;
  delete (v1 as Record<string, unknown>).phase2;
  return JSON.stringify(v1);
}

describe('真实旧档 fixture（P01）', () => {
  const raw = buildRealV1Save();

  it('fixture 是真实的第一阶段存档：未完成关、余额、装饰、统计都在', () => {
    const data = JSON.parse(raw) as Record<string, unknown>;
    expect(data.schemaVersion).toBe(1);
    expect(data.activeLevel).toBeTruthy();
    expect(data.phase2).toBeUndefined();
    const lvl = data.activeLevel as Record<string, unknown>;
    expect(lvl.pos).toBe(9);
    expect((data.coins as number)).toBeGreaterThan(0);
    expect((data.owned as string[]).length).toBe(1);
  });

  it('迁移：余额、装饰、课程、建筑、未完成关保持，可继续完成并结算', () => {
    const parsed = parseSave(raw);
    expect(parsed.kind).toBe('ok');
    const migrated = (parsed as { save: SaveData }).save;
    expect(migrated.schemaVersion).toBe(2);
    expect((parsed as { migrated?: boolean }).migrated).toBe(true);
    expect(migrated.coins).toBeGreaterThan(0);
    expect(migrated.owned).toEqual(['leaf-hat']);
    expect(migrated.equipped.head).toBe('leaf-hat');
    expect(migrated.activeTask?.variant).toBe('phase1');
    const lvl = migrated.activeTask && migrated.activeTask.variant === 'phase1' ? migrated.activeTask.level : null;
    expect(lvl!.pos).toBe(9);
    expect(lvl!.seed).toBe(4242);
    expect(migrated.phase2.storyDone).toEqual([]);

    const prepared = prepareLoadedSave(migrated, T0 + 60_000);
    expect(p1Level(prepared)!.paused).toBe(true);
    // 继续完成并结算（第一阶段行为不变）。
    let s = resumeLevel(prepared, T0 + 60_500);
    let t = T0 + 61_000;
    for (;;) {
      const level = p1Level(s);
      if (!level || level.pos >= level.targets.length) break;
      t += 800;
      s = applyInput(s, level.targets[level.pos]!, t).save;
    }
    const settled = settleLevel(s, t + 100);
    expect(settled.settledNow).toBe(true);
    if (settled.settledNow) {
      expect(settled.result.building!.index).toBe(0);
      expect(settled.result.building!.after).toBe(5);
    }
  });

  it('fixture 与仓库副本一致（保持交付物新鲜）', () => {
    let existing: string | null = null;
    try {
      existing = readFileSync(FIXTURE_PATH, 'utf8');
    } catch {
      existing = null;
    }
    mkdirSync(fileURLToPath(new URL('../fixtures', import.meta.url)), { recursive: true });
    if (existing !== raw) writeFileSync(FIXTURE_PATH, raw);
    expect(readFileSync(FIXTURE_PATH, 'utf8')).toBe(raw);
  });
});

describe('freshSave 供其他测试使用', () => {
  it('sanity', () => {
    expect(freshSave().schemaVersion).toBe(2);
  });
});
