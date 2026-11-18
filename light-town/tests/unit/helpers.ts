import {
  applyInput,
  choosePartner,
  createNewSave,
  finishOnboarding,
  resumeLevel,
  settleLevel,
  startLevel,
  type StartRequest,
} from '../../src/core/game';
import { p1Level } from '../../src/core/game';
import type { KV } from '../../src/core/save/storage';
import type { LevelResult, LevelState, SaveData } from '../../src/core/types';

/** 未完成的第一阶段关（activeTask 判别联合）。 */
export function activeLevelOf(save: SaveData): LevelState | null {
  return p1Level(save);
}

export const T0 = new Date(2026, 10, 12, 9, 0, 0).getTime();

export function freshSave(now = T0): SaveData {
  return finishOnboarding(choosePartner(createNewSave(now), 'nuannuan'));
}

export function wrongCharFor(target: string): string {
  return target === 'q' ? 'p' : 'q';
}

export interface PlayOptions {
  /** Wrong inputs typed before the first `wrong` targets (one each). */
  wrong?: number;
  stepMs?: number;
}

/** Resume and finish the active level. Returns the save (unsettled) and the clock. */
export function finishLevel(save: SaveData, now: number, opts: PlayOptions = {}): { save: SaveData; now: number } {
  const step = opts.stepMs ?? 400;
  let s = resumeLevel(save, now);
  let t = now;
  let wrongLeft = opts.wrong ?? 0;
  while (activeLevelOf(s) && activeLevelOf(s)!.pos < activeLevelOf(s)!.targets.length) {
    const target = activeLevelOf(s)!.targets[activeLevelOf(s)!.pos];
    if (wrongLeft > 0) {
      t += step;
      s = applyInput(s, wrongCharFor(target), t).save;
      wrongLeft -= 1;
    }
    t += step;
    s = applyInput(s, target, t).save;
  }
  return { save: s, now: t };
}

let seedCounter = 1000;

export function playLevel(
  save: SaveData,
  req: StartRequest,
  now: number,
  opts: PlayOptions = {},
): { save: SaveData; now: number; result: LevelResult } {
  const started = startLevel(save, req, now, seedCounter++);
  if (started.error) throw new Error(`cannot start ${req.entry}: ${started.error}`);
  const done = finishLevel(started.save, now + 1000, opts);
  const settled = settleLevel(done.save, done.now + 10);
  if (!settled.settledNow) throw new Error(`not settled: ${settled.reason}`);
  return { save: settled.save, now: done.now + 2000, result: settled.result };
}

export class MemoryKV implements KV {
  readonly map = new Map<string, string>();
  failWrites = false;
  failReads = false;

  getItem(key: string): string | null {
    if (this.failReads) throw new DOMException('denied', 'SecurityError');
    return this.map.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) throw new DOMException('full', 'QuotaExceededError');
    this.map.set(key, value);
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }
}
