import { isKnownP2ContentVersion, PHASE2_CONTENT_VERSION } from '../../config/phase2/content';
import { createNewSave } from '../game';
import type { SaveData } from '../types';
import { mapGame } from './mapGame';
import { BACKUP_KEY, SAVE_KEY, parseSave, type KV, type StoreMode, type WriteResult, type SaveStoreOptions } from './storage';

export interface Profile { profileId: string; name: string; game: SaveData }
export interface ProfilesSave {
  schemaVersion: 3; revision: number; createdAt: number; updatedAt: number;
  profiles: Profile[];
  undoRestore: { capturedAt: number; profiles: Profile[] } | null;
  lastExportRequestedAt: string | null;
}
export interface Backup { format: 'lighttown.profiles-backup'; formatVersion: 1; exportedAt: string; appSaveVersion: 3; profiles: Profile[] }
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw Error('文件内容不完整');
  return v as Record<string, unknown>;
};
const integer = (v: unknown): number => {
  if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < 0) throw Error('存档数字无效');
  return v;
};
const date = (v: unknown): string => {
  if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT/.test(v) || !Number.isFinite(Date.parse(v))) throw Error('备份时间无效');
  return v;
};
export function validateName(value: string, other?: string): string {
  const name = value.trim();
  if (!name || [...name].length > 12 || /[\u0000-\u001f\u007f-\u009f]/u.test(name)) throw Error('名字需要 1–12 个字，不能包含控制字符');
  if (name === other) throw Error('请使用不同的玩家名字');
  return name;
}
export function validateProfiles(value: unknown): Profile[] {
  if (!Array.isArray(value) || value.length !== 2) throw Error('备份必须包含两名玩家');
  const result = value.map(v => {
    const p = object(v);
    if (typeof p.profileId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(p.profileId) || typeof p.name !== 'string') throw Error('玩家身份无效');
    return { profileId: p.profileId, name: validateName(p.name), game: mapGame(p.game) };
  });
  if (result[0].profileId === result[1].profileId || result[0].name === result[1].name) throw Error('两名玩家的身份或名字重复');
  return result;
}
export function validateProfilesSave(value: unknown): ProfilesSave {
  const p = object(value);
  if (p.schemaVersion !== 3) throw Error('存档版本不支持');
  const u = p.undoRestore === null ? null : object(p.undoRestore);
  return { schemaVersion: 3, revision: integer(p.revision), createdAt: integer(p.createdAt), updatedAt: integer(p.updatedAt),
    profiles: validateProfiles(p.profiles), undoRestore: u ? { capturedAt: integer(u.capturedAt), profiles: validateProfiles(u.profiles) } : null,
    lastExportRequestedAt: p.lastExportRequestedAt === null ? null : date(p.lastExportRequestedAt) };
}
export function newProfiles(now: number, first = createNewSave(now)): ProfilesSave {
  return { schemaVersion: 3, revision: 0, createdAt: now, updatedAt: now, profiles: [
    { profileId: Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join(''), name: '玩家一', game: first },
    { profileId: Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8, '0')).join(''), name: '玩家二', game: createNewSave(now) },
  ], undoRestore: null, lastExportRequestedAt: null };
}
export function parseBackup(raw: string): Backup {
  if (new TextEncoder().encode(raw).length > 20 * 1024 * 1024) throw Error('文件超过 20 MiB');
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw Error('文件不是有效的 JSON 备份'); }
  const p = object(value);
  if (p.format !== 'lighttown.profiles-backup') throw Error('请选择点亮小镇导出的双人备份');
  if (p.formatVersion !== 1 || p.appSaveVersion !== 3) throw Error('备份版本不支持，请使用对应的新版本游戏');
  return { format: 'lighttown.profiles-backup', formatVersion: 1, appSaveVersion: 3, exportedAt: date(p.exportedAt), profiles: validateProfiles(p.profiles) };
}
export function makeBackup(save: ProfilesSave, now: number): Backup {
  return { format: 'lighttown.profiles-backup', formatVersion: 1, appSaveVersion: 3, exportedAt: new Date(now).toISOString(), profiles: validateProfiles(save.profiles) };
}
export function parseProfiles(raw: string | null, now: number): { kind: 'ok'; save: ProfilesSave; migrated: boolean } | { kind: 'missing' | 'invalid' } | { kind: 'future'; version: number } {
  if (raw === null) return { kind: 'missing' };
  try {
    const v = object(JSON.parse(raw));
    if (typeof v.schemaVersion === 'number' && v.schemaVersion > 3) return { kind: 'future', version: v.schemaVersion };
    // phase2 内容版本允许已知的旧版本：改写为当前版本并立即持久化（migrated 标记）。
    if (v.schemaVersion === 3 && Array.isArray(v.profiles) && v.profiles.some(p => { const game = object(object(p).game); return (typeof game.schemaVersion === 'number' && game.schemaVersion > 2) || !isKnownP2ContentVersion(object(game.phase2).contentVersion); })) return { kind: 'future', version: 3 };
    if (v.schemaVersion === 3 && Array.isArray(v.profiles)) {
      let migrated = false;
      for (const p of v.profiles) {
        const phase2 = object(object(object(p).game).phase2) as { contentVersion: unknown; dailyBonus?: unknown };
        if (phase2.contentVersion !== PHASE2_CONTENT_VERSION) {
          phase2.contentVersion = PHASE2_CONTENT_VERSION;
          migrated = true;
        }
        // 2026-11-17 新增字段：旧档补默认 null。
        if (phase2.dailyBonus === undefined) {
          phase2.dailyBonus = null;
          migrated = true;
        }
      }
      return { kind: 'ok', save: validateProfilesSave(v), migrated };
    }
    if (v.schemaVersion === 3) return { kind: 'ok', save: validateProfilesSave(v), migrated: false };
    const old = parseSave(raw);
    if (old.kind === 'ok') return { kind: 'ok', save: newProfiles(now, old.save), migrated: true };
  } catch { /* invalid data is never overwritten automatically */ }
  return { kind: 'invalid' };
}

/** Whole-household transactions. The selected profile is deliberately not persisted. */
export class ProfilesStore {
  mode: StoreMode;
  data: ProfilesSave;
  selectedId: string | null = null;
  lastRaw: string | null;
  private validRaw: string | null;
  private ownsLease: () => boolean;
  private now: () => number;
  constructor(private kv: KV | null, mode: StoreMode, data: ProfilesSave, raw: string | null, opts: SaveStoreOptions = {}, validRaw = raw) {
    this.mode = mode; this.data = data; this.lastRaw = raw; this.validRaw = validRaw;
    this.ownsLease = opts.ownsLease ?? (() => true); this.now = opts.now ?? Date.now;
  }
  transaction(next: ProfilesSave, clearBackup = false): { ok: true } | { ok: false; reason: Exclude<WriteResult, { ok: true }>['reason'] } {
    if (!this.ownsLease()) return { ok: false, reason: 'not-owner' };
    if (this.mode === 'readonly') return { ok: false, reason: 'readonly' };
    if (!this.kv) return { ok: false, reason: 'memory' };
    let checked: ProfilesSave;
    try { checked = validateProfilesSave({ ...next, revision: this.data.revision + 1, updatedAt: this.now() }); }
    catch { return { ok: false, reason: 'invalid' }; }
    try {
      if (this.kv.getItem(SAVE_KEY) !== this.lastRaw) return { ok: false, reason: 'conflict' };
      if (clearBackup) this.kv.removeItem(BACKUP_KEY);
      else if (this.validRaw !== null) this.kv.setItem(BACKUP_KEY, this.validRaw);
      const raw = JSON.stringify(checked);
      this.kv.setItem(SAVE_KEY, raw);
      this.lastRaw = raw; this.validRaw = raw; this.data = checked; this.mode = 'storage';
      return { ok: true };
    } catch { return { ok: false, reason: 'quota' }; }
  }
  write(game: SaveData): WriteResult {
    const next = { ...game, revision: game.revision + 1, updatedAt: this.now() };
    if (!this.selectedId) return { ok: false, save: game, reason: 'not-owner' };
    const data = { ...this.data, profiles: this.data.profiles.map(p => p.profileId === this.selectedId ? { ...p, game: next } : p) };
    const result = this.transaction(data);
    if (result.ok) return { ok: true, save: next };
    if (['quota', 'memory', 'readonly'].includes(result.reason)) this.data = data;
    return { ok: false, save: next, reason: result.reason };
  }
}
