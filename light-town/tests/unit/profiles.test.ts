import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PHASE2_CONTENT_VERSION } from '../../src/config/phase2/content';
import { createNewSave, choosePartner, finishOnboarding, startLevel } from '../../src/core/game';
import { startP2Task, setP2Draft, currentOccurrence } from '../../src/core/phase2/task';
import { ProfilesStore, newProfiles, parseProfiles, parseBackup, makeBackup, validateName } from '../../src/core/save/profiles';
import { SAVE_KEY, BACKUP_KEY, parseSave, type KV } from '../../src/core/save/storage';
class Memory implements KV {
  data = new Map<string, string>(); fail: string | null = null;
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { if (this.fail === k) throw Error('quota'); this.data.set(k, v); }
  removeItem(k: string) { if (this.fail === k) throw Error('quota'); this.data.delete(k); }
}
const now = 1700000000000;
function setup() {
  const kv = new Memory(); const data = newProfiles(now); const raw = JSON.stringify(data); kv.setItem(SAVE_KEY, raw);
  const store = new ProfilesStore(kv, 'storage', data, raw, { now: () => now + 1 }); store.selectedId = data.profiles[0].profileId;
  return { kv, data, raw, store };
}
describe('whole household persistence', () => {
  it('migrates real v1 and preserves every migrated field', () => {
    const raw = readFileSync(new URL('../fixtures/phase1-save-v1.json', import.meta.url), 'utf8');
    const old = parseSave(raw); const next = parseProfiles(raw, now);
    expect(old.kind).toBe('ok'); expect(next.kind).toBe('ok');
    if (old.kind === 'ok' && next.kind === 'ok') { expect(next.save.profiles[0].game).toEqual(old.save); expect(next.save.profiles[1].game).toEqual(createNewSave(now)); }
  });
  it('preserves a full v2 active task, drafts and counters; roundtrips both players', () => {
    let game = finishOnboarding(choosePartner(createNewSave(now), 'nuannuan'));
    game = startP2Task(game, { kind: 'story', taskId: 'zh-1-lamp-house' }, now, 123).save;
    if (game.activeTask?.variant === 'phase2') game = setP2Draft(game, currentOccurrence(game.activeTask.task)!.occ.occurrenceId, '人', now);
    game.coins = 123; game.phase2.maxObservedAt = now + 100;
    const parsed = parseProfiles(JSON.stringify(game), now); expect(parsed.kind).toBe('ok');
    if (parsed.kind !== 'ok') return;
    expect(parsed.save.profiles[0].game).toEqual(game);
    parsed.save.profiles[1].game = startLevel(createNewSave(now), { entry: 'light' }, now, 456).save;
    expect(parseBackup(JSON.stringify(makeBackup(parsed.save, now))).profiles).toEqual(parsed.save.profiles);
  });
  it('migrates phase2 content version phase2-content-1 in both profiles; unknown versions stay future', () => {
    const fresh = createNewSave(now);
    let game = finishOnboarding(choosePartner(structuredClone(fresh), 'nuannuan'));
    game = startP2Task(game, { kind: 'story', taskId: 'zh-1-lamp-house' }, now, 123).save;
    const downgrade = (g: typeof game) => {
      const { dailyBonus: _dropped, ...oldPhase2 } = g.phase2;
      return { ...g, phase2: { ...oldPhase2, contentVersion: 'phase2-content-1' } };
    };
    const oldRaw = JSON.stringify({ schemaVersion: 3, revision: 1, createdAt: now, updatedAt: now, profiles: [
      { profileId: 'profile-a', name: '玩家一', game: downgrade(game) },
      { profileId: 'profile-b', name: '玩家二', game: downgrade(structuredClone(fresh)) },
    ], undoRestore: null, lastExportRequestedAt: null });
    // 旧内容版本：两名玩家都透明迁移到当前版本，并标记 migrated（触发立即持久化）。
    const parsed = parseProfiles(oldRaw, now);
    expect(parsed.kind).toBe('ok');
    if (parsed.kind !== 'ok') return;
    expect(parsed.migrated).toBe(true);
    for (const p of parsed.save.profiles) {
      expect(p.game.phase2.contentVersion).toBe(PHASE2_CONTENT_VERSION);
      expect(p.game.phase2.dailyBonus).toBeNull(); // 旧档补默认值
    }
    expect(parsed.save.profiles[0].game.activeTask?.variant).toBe('phase2'); // 进行中任务原样保留
    // 迁移结果再次解析不再迁移。
    const again = parseProfiles(JSON.stringify(parsed.save), now);
    expect(again.kind === 'ok' && again.migrated).toBe(false);
    // 未知内容版本仍然按“更高版本”保护，不会被覆盖。
    expect(parseProfiles(oldRaw.replace('phase2-content-1', 'phase2-content-999'), now).kind).toBe('future');
  });
  it('writes only the chosen game and refuses stale or non-owner writes', () => {
    const { store, kv, data } = setup(); const second = structuredClone(data.profiles[1]);
    expect(store.write({ ...data.profiles[0].game, coins: 50 }).ok).toBe(true);
    expect(store.data.profiles[1]).toEqual(second);
    kv.setItem(SAVE_KEY, 'changed'); expect(store.write(store.data.profiles[0].game)).toMatchObject({ ok: false, reason: 'conflict' });
    const denied = new ProfilesStore(kv, 'storage', data, 'changed', { ownsLease: () => false });
    expect(denied.transaction(data, true)).toEqual({ ok: false, reason: 'not-owner' }); expect(kv.getItem(SAVE_KEY)).toBe('changed');
  });
  it.each([SAVE_KEY, BACKUP_KEY])('failed %s write preserves the original and both in-memory players', key => {
    const { store, kv, data, raw } = setup(); kv.fail = key;
    expect(store.write({ ...data.profiles[0].game, coins: 70 }).ok).toBe(false);
    expect(kv.getItem(SAVE_KEY)).toBe(raw); expect(store.data.profiles[0].game.coins).toBe(70);
    store.selectedId = data.profiles[1].profileId; store.write({ ...data.profiles[1].game, coins: 20 });
    expect(makeBackup(store.data, now).profiles.map(p => p.game.coins)).toEqual([70, 20]);
    kv.fail = null; expect(store.transaction(store.data).ok).toBe(true);
  });
  it('restore and undo are single transactions and survive reload', () => {
    const { store, kv, data } = setup(); const imported = newProfiles(now); imported.profiles[0].game.coins = 90;
    const next = { ...data, profiles: imported.profiles, undoRestore: { capturedAt: now, profiles: data.profiles } };
    kv.fail = SAVE_KEY; expect(store.transaction(next).ok).toBe(false); expect(store.data).toEqual(data);
    kv.fail = null; expect(store.transaction(next).ok).toBe(true);
    const loaded = parseProfiles(kv.getItem(SAVE_KEY), now); expect(loaded.kind).toBe('ok');
    if (loaded.kind === 'ok') expect(loaded.save.undoRestore?.profiles).toEqual(data.profiles);
    expect(store.transaction({ ...store.data, profiles: store.data.undoRestore!.profiles, undoRestore: null }).ok).toBe(true);
    expect(store.data.profiles).toEqual(data.profiles); expect(store.data.undoRestore).toBeNull();
  });
  it('clear removes rolling backup, never erases the other profile, and fails safely', () => {
    const { store, kv, data, raw } = setup(); kv.setItem(BACKUP_KEY, raw);
    const next = { ...data, profiles: data.profiles.map((p, i) => i === 0 ? { ...p, game: createNewSave(now + 10) } : p), undoRestore: null };
    kv.fail = SAVE_KEY; expect(store.transaction(next, true).ok).toBe(false); expect(kv.getItem(SAVE_KEY)).toBe(raw);
    kv.fail = null; expect(store.transaction(next, true).ok).toBe(true); expect(kv.getItem(BACKUP_KEY)).toBeNull(); expect(store.data.profiles[1]).toEqual(data.profiles[1]);
  });
  it('does not upgrade on quota failure or overwrite future data', () => {
    const kv = new Memory(); const raw = JSON.stringify(createNewSave(now)); kv.setItem(SAVE_KEY, raw); kv.fail = SAVE_KEY;
    const parsed = parseProfiles(raw, now); if (parsed.kind !== 'ok') throw Error('migration');
    const store = new ProfilesStore(kv, 'storage', parsed.save, raw); expect(store.transaction(parsed.save).ok).toBe(false); expect(kv.getItem(SAVE_KEY)).toBe(raw);
    expect(parseProfiles('{"schemaVersion":99}', now)).toEqual({ kind: 'future', version: 99 });
  });
  it('rejects malformed, duplicate, oversized and future backups; maps only known fields', () => {
    const backup = makeBackup(newProfiles(now), now);
    for (const value of ['', '{}', JSON.stringify({ ...backup, formatVersion: 2 }), JSON.stringify({ ...backup, profiles: [backup.profiles[0], backup.profiles[0]] }), JSON.stringify({ ...backup, profiles: [] }), ' '.repeat(20*1024*1024+1)]) expect(() => parseBackup(value)).toThrow();
    const invalid = structuredClone(backup); invalid.profiles[0].game.coins = -1; expect(() => parseBackup(JSON.stringify(invalid))).toThrow();
    expect(parseBackup(JSON.stringify({ ...backup, evil: 'ignored' }))).not.toHaveProperty('evil');
    for (const name of ['', 'a'.repeat(13), 'a\nb']) expect(() => validateName(name)).toThrow();
    expect(() => validateName('玩家二', '玩家二')).toThrow(); expect(validateName('  小明  ')).toBe('小明');
  });
});
