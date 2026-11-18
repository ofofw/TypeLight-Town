import { describe, expect, it } from 'vitest';
import { applyInput, createNewSave, p1Level, prepareLoadedSave, resumeLevel, startLevel } from '../../src/core/game';
import { PHASE2_CONTENT_VERSION } from '../../src/config/phase2/content';
import { LEASE_KEY, leaseStatus, parseLease, readLease, releaseLease, writeLease } from '../../src/core/save/lease';
import { BACKUP_KEY, SAVE_KEY, SaveStore, loadSave, parseSave, probeStorage, sizeInBytes } from '../../src/core/save/storage';
import { validateSave } from '../../src/core/save/validate';
import type { SaveData } from '../../src/core/types';
import { MemoryKV, T0, freshSave, playLevel } from './helpers';

function storeWith(kv: MemoryKV, save: SaveData) {
  const store = new SaveStore(kv, 'storage', null, { now: () => T0 });
  const r = store.write(save);
  if (!r.ok) throw new Error(r.reason);
  return { store, save: r.save };
}

describe('D01 every input is saved and reloads to the same place, paused', () => {
  it('restores identical targets, position and counters', () => {
    const kv = new MemoryKV();
    let { store, save } = storeWith(kv, freshSave());
    save = resumeLevel(startLevel(save, { entry: 'light' }, T0, 21).save, T0);
    for (let i = 0; i < 7; i++) {
      const lvl = p1Level(save)!;
      const typed = i === 3 ? 'q' : lvl.targets[lvl.pos];
      save = applyInput(save, typed, T0 + (i + 1) * 400).save;
      const w = store.write(save);
      expect(w.ok).toBe(true);
      if (w.ok) save = w.save;
      const loaded = loadSave(kv);
      expect(loaded.status).toBe('ok');
      if (loaded.status !== 'ok') return;
      const restored = prepareLoadedSave(loaded.save, T0 + 60_000);
      expect(p1Level(restored)!.pos).toBe(p1Level(save)!.pos);
      expect(p1Level(restored)!.targets).toEqual(p1Level(save)!.targets);
      expect(p1Level(restored)!.attempts).toBe(p1Level(save)!.attempts);
      expect(p1Level(restored)!.paused).toBe(true);
    }
  });
});

describe('D03 damaged saves', () => {
  it('falls back to the last valid backup and reports it', () => {
    const kv = new MemoryKV();
    let { store, save } = storeWith(kv, freshSave());
    const w = store.write({ ...save, coins: 0 });
    expect(w.ok).toBe(true);
    kv.map.set(SAVE_KEY, '{"schemaVersion":1,"broken":');
    const loaded = loadSave(kv);
    expect(loaded.status).toBe('restored-backup');
    if (loaded.status === 'restored-backup') expect(loaded.save.revision).toBe(save.revision);
  });

  it('reports corruption without deleting anything when both copies are bad', () => {
    const kv = new MemoryKV();
    kv.map.set(SAVE_KEY, 'not json');
    kv.map.set(BACKUP_KEY, JSON.stringify({ schemaVersion: 1, coins: -5 }));
    expect(loadSave(kv).status).toBe('corrupt');
    expect(kv.map.get(SAVE_KEY)).toBe('not json');
    expect(kv.map.has(BACKUP_KEY)).toBe(true);
  });

  it('starting over after corruption overwrites both copies only on request', () => {
    const kv = new MemoryKV();
    kv.map.set(SAVE_KEY, 'not json');
    const store = new SaveStore(kv, 'storage', null);
    const fresh = createNewSave(T0);
    expect(store.write(fresh).ok).toBe(false);
    expect(store.replaceCorrupt(fresh).ok).toBe(true);
    expect(loadSave(kv).status).toBe('ok');
  });
});

describe('D04 storage refused or full', () => {
  it('switches to memory mode without claiming success', () => {
    const kv = new MemoryKV();
    let { store, save } = storeWith(kv, freshSave());
    kv.failWrites = true;
    const w = store.write({ ...save, coins: 99 });
    expect(w.ok).toBe(false);
    if (!w.ok) expect(w.reason).toBe('quota');
    expect(store.mode).toBe('memory');
    const again = store.write(w.save);
    expect(again.ok).toBe(false);
    if (!again.ok) {
      expect(again.reason).toBe('memory');
      expect(again.save.coins).toBe(99);
    }
  });

  it('detects unavailable storage', () => {
    const kv = new MemoryKV();
    kv.failWrites = true;
    expect(probeStorage(kv)).toBe(false);
    expect(probeStorage(null)).toBe(false);
    kv.failReads = true;
    expect(loadSave(kv).status).toBe('unavailable');
  });
});

describe('D05 versions and field ranges', () => {
  it('never overwrites a save from a newer version', () => {
    const kv = new MemoryKV();
    const future = JSON.stringify({ schemaVersion: 9, anything: true });
    kv.map.set(SAVE_KEY, future);
    const loaded = loadSave(kv);
    expect(loaded).toEqual({ status: 'incompatible', version: 9 });
    const store = new SaveStore(kv, 'readonly', future);
    const w = store.write(createNewSave(T0));
    expect(w.ok).toBe(false);
    expect(kv.map.get(SAVE_KEY)).toBe(future);
    expect(store.clear()).toBe(false);
  });

  it('migrates a known past phase2 content version; unknown ones are refused', () => {
    const base = freshSave();
    // 2026-11-16/17 之前的旧存档：内容版本旧、没有 dailyBonus 字段 → 透明升级并补默认值。
    const { dailyBonus: _dropped, ...oldPhase2 } = base.phase2;
    const past = JSON.stringify({ ...base, phase2: { ...oldPhase2, contentVersion: 'phase2-content-1' } });
    const parsed = parseSave(past);
    expect(parsed.kind).toBe('ok');
    if (parsed.kind === 'ok') {
      expect(parsed.migrated).toBe(true);
      expect(parsed.save.phase2.contentVersion).toBe(PHASE2_CONTENT_VERSION);
      expect(parsed.save.phase2.dailyBonus).toBeNull();
    }
    // 再解析已迁移存档：不再标记迁移。
    const again = parseSave(JSON.stringify(parsed.kind === 'ok' ? parsed.save : base));
    expect(again.kind !== 'ok' || !again.migrated).toBe(true);
    // 未知的更高内容版本仍按“更高版本保护”拒绝写入路径。
    expect(parseSave(JSON.stringify({ ...base, phase2: { ...base.phase2, contentVersion: 'phase2-content-999' } })).kind).toBe('invalid');
  });

  it('rejects negative coins, out-of-range stages and inconsistent buildings', () => {
    const base = freshSave();
    expect(() => validateSave(base)).not.toThrow();
    expect(() => validateSave({ ...base, coins: -1 })).toThrow();
    expect(() => validateSave({ ...base, coins: 1.5 })).toThrow();
    expect(() => validateSave({ ...base, course: { ...base.course, stage: 13 } })).toThrow();
    expect(() => validateSave({ ...base, buildings: [7, ...base.buildings.slice(1)] })).toThrow();
    expect(() => validateSave({ ...base, buildings: [0, 3, ...base.buildings.slice(2)] })).toThrow();
    expect(() => validateSave({ ...base, equipped: { ...base.equipped, head: 'leaf-hat' } })).toThrow();
    expect(() => validateSave({ ...base, theme: 'mint' })).toThrow();
    expect(() => validateSave({ ...base, festival: { ...base.festival, unlocked: true } })).toThrow();
  });

  it('validates a long-played save and keeps it under 1 MB', () => {
    let save = freshSave();
    let now = T0;
    for (let i = 0; i < 80; i++) ({ save, now } = playLevel(save, { entry: i < 72 ? 'light' : 'festival' }, now, { wrong: i % 3 }));
    expect(() => validateSave(save)).not.toThrow();
    expect(sizeInBytes(save)).toBeLessThan(1_000_000);
  });
});

describe('D06 single active page', () => {
  it('a lease is "other" only while its heartbeat is fresh', () => {
    const lease = { owner: 'A', heartbeat: T0 };
    expect(leaseStatus(lease, 'A', T0 + 1000)).toBe('mine');
    expect(leaseStatus(lease, 'B', T0 + 14_999)).toBe('other');
    expect(leaseStatus(lease, 'B', T0 + 15_000)).toBe('free');
    expect(leaseStatus(null, 'B', T0)).toBe('free');
    expect(parseLease('{bad')).toBeNull();
  });

  it('writes and releases leases', () => {
    const kv = new MemoryKV();
    writeLease(kv, 'A', T0);
    expect(readLease(kv)).toEqual({ owner: 'A', heartbeat: T0 });
    releaseLease(kv, 'B');
    expect(kv.map.has(LEASE_KEY)).toBe(true);
    releaseLease(kv, 'A');
    expect(kv.map.has(LEASE_KEY)).toBe(false);
  });

  it('refuses writes without the lease and never overwrites a newer revision', () => {
    const kv = new MemoryKV();
    let owner = 'A';
    const a = new SaveStore(kv, 'storage', null, { ownsLease: () => owner === 'A' });
    const first = a.write(freshSave());
    expect(first.ok).toBe(true);
    const stored = kv.map.get(SAVE_KEY)!;
    const b = new SaveStore(kv, 'storage', stored, { ownsLease: () => owner === 'B' });
    owner = 'B';
    expect(a.write({ ...first.save, coins: 5 }).ok).toBe(false);
    const bw = b.write({ ...first.save, coins: 7 });
    expect(bw.ok).toBe(true);
    owner = 'A';
    const stale = a.write({ ...first.save, coins: 9 });
    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.reason).toBe('conflict');
    expect(JSON.parse(kv.map.get(SAVE_KEY)!).coins).toBe(7);
  });
});

describe('D07 clearing progress', () => {
  it('removes the save and its backup', () => {
    const kv = new MemoryKV();
    const { store, save } = storeWith(kv, freshSave());
    store.write(save);
    expect(store.clear()).toBe(true);
    expect(kv.map.has(SAVE_KEY)).toBe(false);
    expect(kv.map.has(BACKUP_KEY)).toBe(false);
    expect(loadSave(kv).status).toBe('empty');
  });
});
