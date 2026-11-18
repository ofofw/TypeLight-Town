import { PHASE2_CONTENT_VERSION } from '../../config/phase2/content';
import { SCHEMA_VERSION } from '../game';
import { emptyPhase2 } from '../phase2/task';
import type { SaveData } from '../types';
import { validateSave } from './validate';

/** Minimal synchronous key-value store (window.localStorage in the browser, a fake in tests). */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'lighttown.save';
export const BACKUP_KEY = 'lighttown.save.backup';
const PROBE_KEY = 'lighttown.probe';

export type ParsedSave =
  | { kind: 'missing' }
  | { kind: 'ok'; save: SaveData; migrated?: boolean }
  | { kind: 'future'; version: number }
  | { kind: 'invalid'; reason: string };

/**
 * v1 → v2 迁移：第一阶段未完成关转换成 activeTask 的 phase1 variant（不丢 seed、输入位置或
 * 结算状态），新增空的 phase2 数据与 lastTaskResult。旧金币、装饰、建筑与课程不变。
 */
function migrateV1(data: unknown): unknown {
  const { activeLevel, ...rest } = data as Record<string, unknown>;
  const updatedAt = typeof rest.updatedAt === 'number' && Number.isFinite(rest.updatedAt) ? rest.updatedAt : 0;
  return {
    ...rest,
    schemaVersion: 2,
    activeTask: activeLevel ? { variant: 'phase1', level: activeLevel } : null,
    lastTaskResult: null,
    phase2: emptyPhase2(updatedAt),
  };
}

export function parseSave(raw: string | null): ParsedSave {
  if (raw === null) return { kind: 'missing' };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { kind: 'invalid', reason: 'not JSON' };
  }
  const version = (data as { schemaVersion?: unknown } | null)?.schemaVersion;
  if (typeof version === 'number' && Number.isInteger(version) && version > SCHEMA_VERSION) {
    return { kind: 'future', version };
  }
  try {
    if (version === 1) {
      return { kind: 'ok', save: validateSave(migrateV1(data)), migrated: true };
    }
    const save = validateSave(data);
    // 透明迁移（migrated 标记 → 立即持久化）：
    // (1) phase2 内容版本 → 当前版本（未完成任务自带题单快照，题量调整不影响进行中的任务）；
    // (2) 2026-11-17 新增的 phase2.dailyBonus → 旧存档补默认 null。
    let migrated = false;
    if (save.phase2.contentVersion !== PHASE2_CONTENT_VERSION) {
      save.phase2.contentVersion = PHASE2_CONTENT_VERSION;
      migrated = true;
    }
    if (save.phase2.dailyBonus === undefined) {
      save.phase2.dailyBonus = null;
      migrated = true;
    }
    return migrated ? { kind: 'ok', save, migrated } : { kind: 'ok', save };
  } catch (e) {
    return { kind: 'invalid', reason: e instanceof Error ? e.message : String(e) };
  }
}

export type LoadOutcome =
  | { status: 'empty' }
  | { status: 'ok'; save: SaveData; raw: string; migrated?: boolean }
  | { status: 'restored-backup'; save: SaveData; raw: string }
  | { status: 'corrupt' }
  | { status: 'incompatible'; version: number }
  | { status: 'unavailable' };

export function probeStorage(kv: KV | null): boolean {
  if (!kv) return false;
  try {
    kv.setItem(PROBE_KEY, '1');
    kv.removeItem(PROBE_KEY);
    return true;
  } catch {
    return false;
  }
}

/** Main save first; a damaged main falls back to the backup. Nothing is deleted here. */
export function loadSave(kv: KV | null): LoadOutcome {
  if (!kv) return { status: 'unavailable' };
  let mainRaw: string | null;
  let backupRaw: string | null;
  try {
    mainRaw = kv.getItem(SAVE_KEY);
    backupRaw = kv.getItem(BACKUP_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  const main = parseSave(mainRaw);
  if (main.kind === 'ok') {
    return { status: 'ok', save: main.save, raw: mainRaw!, migrated: main.migrated };
  }
  if (main.kind === 'future') return { status: 'incompatible', version: main.version };
  const backup = parseSave(backupRaw);
  if (backup.kind === 'future') return { status: 'incompatible', version: backup.version };
  if (main.kind === 'missing' && backup.kind === 'missing') return { status: 'empty' };
  if (backup.kind === 'ok') return { status: 'restored-backup', save: backup.save, raw: backupRaw! };
  return { status: 'corrupt' };
}

export type StoreMode = 'storage' | 'memory' | 'readonly';

export type WriteResult =
  | { ok: true; save: SaveData }
  | { ok: false; save: SaveData; reason: 'memory' | 'readonly' | 'not-owner' | 'conflict' | 'quota' | 'invalid' };

export interface SaveStoreOptions {
  /** Returns false when another page holds the lease; writes are refused. */
  ownsLease?: () => boolean;
  now?: () => number;
}

/**
 * Writes the whole save as one JSON value (so every commit is atomic), after copying the previous validated
 * save to the backup key. Refuses to write when the stored save changed underneath (revision conflict),
 * when another page owns the lease, or in read-only (incompatible version) mode.
 */
export class SaveStore {
  mode: StoreMode;
  /** What this page expects to find in the main key (for revision-conflict detection). */
  private lastRaw: string | null;
  /** The last main save known to pass validation: the only thing ever copied to the backup key. */
  private lastValid: string | null;
  private readonly kv: KV | null;
  private readonly ownsLease: () => boolean;
  private readonly now: () => number;

  /** `lastRaw` must be the validated main save this page loaded (or null when there was none). */
  constructor(kv: KV | null, mode: StoreMode, lastRaw: string | null, opts: SaveStoreOptions = {}) {
    this.kv = kv;
    this.mode = kv ? mode : 'memory';
    this.lastRaw = lastRaw;
    this.lastValid = lastRaw;
    this.ownsLease = opts.ownsLease ?? (() => true);
    this.now = opts.now ?? Date.now;
  }

  /** After taking over from another page: expect the validated save that page left behind. */
  adopt(raw: string | null): void {
    this.lastRaw = raw;
    this.lastValid = raw;
  }

  storedRaw(): string | null {
    try {
      return this.kv?.getItem(SAVE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  write(save: SaveData): WriteResult {
    const next: SaveData = { ...save, revision: save.revision + 1, updatedAt: this.now() };
    if (this.mode === 'readonly') return { ok: false, save: next, reason: 'readonly' };
    if (this.mode === 'memory' || !this.kv) return { ok: false, save: next, reason: 'memory' };
    if (!this.ownsLease()) return { ok: false, save, reason: 'not-owner' };
    try {
      validateSave(next);
    } catch {
      return { ok: false, save, reason: 'invalid' };
    }
    let current: string | null;
    try {
      current = this.kv.getItem(SAVE_KEY);
    } catch {
      this.mode = 'memory';
      return { ok: false, save: next, reason: 'quota' };
    }
    if (current !== this.lastRaw) return { ok: false, save, reason: 'conflict' };
    const raw = JSON.stringify(next);
    try {
      if (this.lastValid !== null) this.kv.setItem(BACKUP_KEY, this.lastValid);
      this.kv.setItem(SAVE_KEY, raw);
    } catch {
      this.mode = 'memory';
      return { ok: false, save: next, reason: 'quota' };
    }
    this.lastRaw = raw;
    this.lastValid = raw;
    return { ok: true, save: next };
  }

  /** 清空进度: remove the save and its backup. */
  clear(): boolean {
    if (!this.kv || this.mode === 'readonly') return false;
    try {
      this.kv.removeItem(SAVE_KEY);
      this.kv.removeItem(BACKUP_KEY);
      this.lastRaw = null;
      this.lastValid = null;
      return true;
    } catch {
      return false;
    }
  }

  /** Both copies were unreadable and the user chose to start over: overwrite them with a fresh save. */
  replaceCorrupt(save: SaveData): WriteResult {
    if (!this.kv) return { ok: false, save, reason: 'memory' };
    try {
      this.lastRaw = this.kv.getItem(SAVE_KEY);
    } catch {
      return { ok: false, save, reason: 'quota' };
    }
    this.lastValid = null;
    return this.write(save);
  }
}

export function sizeInBytes(save: SaveData): number {
  return new TextEncoder().encode(JSON.stringify(save)).length;
}
