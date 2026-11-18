import { ProfilesStore, newProfiles, parseProfiles, parseBackup, makeBackup, validateName, type ProfilesSave, type Backup } from '../core/save/profiles';
import { RULES } from '../config/rules';
import type { AccessorySlot, PartnerId, ThemeId } from '../config/shop';
import {
  allBuildingsDone,
  applyInput,
  applyTheme,
  buyAccessory,
  buyTheme,
  choosePartner,
  createNewSave,
  discardActiveLevel,
  endSession,
  equipAccessory,
  finishOnboarding,
  markIntroSeen,
  markSeen,
  pauseLevel,
  prepareLoadedSave,
  resumeLevel,
  settleLevel,
  startLevel,
  tick,
  updateSettings,
  type ShopError,
  type StartError,
  type StartRequest,
} from '../core/game';
import { p1Level } from '../core/game';
import { abandonP2Task, currentOccurrence, markP2Help, pauseP2Task, prepareLoadedP2, p2StartError, resumeP2Task, setP2Composition, setP2Draft, startP2Task, submitP2, taskDone, tickP2Task, touchP2Task, type P2StartError, type P2StartRequest } from '../core/phase2/task';
import { randomSeed } from '../core/rng';
import { LEASE_KEY, leaseStatus, readLease, releaseLease, writeLease } from '../core/save/lease';
import { SAVE_KEY, BACKUP_KEY, type KV } from '../core/save/storage';
import type { LevelResult, LevelState, SaveData, SessionSummary, Settings } from '../core/types';
import type { VoiceId } from '../config/voice';
import { AudioManager } from './audio';
import { browserStorage, pageIdentity } from './platform';

export type Route =
  | { name: 'home' }
  | { name: 'players' }
  | { name: 'backup' }
  | { name: 'partner'; from: 'first' | 'settings' }
  | { name: 'onboarding'; replay: boolean }
  | { name: 'town'; district?: number }
  | { name: 'practice'; autoStart?: boolean }
  | { name: 'result' }
  | { name: 'summary'; summary: SessionSummary }
  | { name: 'wardrobe' }
  | { name: 'route' }
  | { name: 'festival' }
  | { name: 'parent'; from?: 'home' | 'town' }
  | { name: 'settings' }
  /** 第二阶段：居民任务首页 */
  | { name: 'residents' }
  /** 语言路线页 */
  | { name: 'residents-route'; language: 'zh' | 'en' }
  /** 任务预览 */
  | { name: 'task-preview'; req: P2StartRequest }
  /** 第二阶段练习页 */
  | { name: 'task-practice'; autoStart?: boolean }
  /** 第二阶段结果页 */
  | { name: 'task-result' }
  /** 专项页 */
  | { name: 'drills'; language: 'zh' | 'en' }
  /** 字词图鉴（2026-11-17 新增） */
  | { name: 'album' };

export type Blocker =
  /** Another page holds the lease: this page only shows "游戏已在另一个页面打开". */
  | { kind: 'other-tab' }
  /** Main save and backup both unreadable: the player must choose to start over. */
  | { kind: 'corrupt' }
  /** Save written by a newer version: never overwritten. */
  | { kind: 'incompatible'; version: number }
  /** The stored save changed underneath this page: reload before continuing. */
  | { kind: 'conflict' };

/** Why progress is not being saved (shown as a banner on every page). */
export type SaveIssue = 'unavailable' | 'quota' | 'temporary' | 'error';

export interface AppState {
  save: SaveData;
  household: ProfilesSave;
  selectedId: string | null;
  generation: number;
  route: Route;
  blocker: Blocker | null;
  saveIssue: SaveIssue | null;
  notice: 'restored-backup' | null;
}

export interface InputResult {
  outcome: 'correct' | 'wrong' | 'ignored';
  completed: boolean;
}

const EMPTY_SUMMARY: SessionSummary = {
  levelsCompleted: 0,
  attempts: 0,
  correct: 0,
  effectiveMs: 0,
  coins: 0,
  buildingChanges: [],
  partialLevel: null,
};

/** The request that recreates a level of the same kind (重新开始 / 继续). */
export function requestLike(
  entry: LevelState['entry'],
  mode: LevelState['mode'],
  courseStage: number,
  courseLabel: string,
  replayBuilding: number | null,
  save: SaveData,
): StartRequest {
  switch (entry) {
    case 'light':
      return allBuildingsDone(save) ? { entry: 'learn' } : { entry: 'light' };
    case 'learn':
      return { entry: 'learn' };
    case 'route':
      return { entry: 'route', stage: courseStage, mode };
    case 'replay':
      return { entry: 'replay', building: replayBuilding ?? 0 };
    case 'festival':
      return { entry: 'festival' };
    case 'free':
      if (courseLabel.startsWith('custom:') && mode !== 'sign') {
        return { entry: 'free', mode, keys: courseLabel.slice('custom:'.length).split(',') };
      }
      return { entry: 'free', mode, stage: courseStage };
  }
}

export function requestForLevel(level: LevelState, save: SaveData): StartRequest {
  return requestLike(level.entry, level.mode, level.courseStage, level.courseLabel, level.replayBuilding, save);
}

export function requestAfterResult(result: LevelResult, save: SaveData): StartRequest {
  return requestLike(result.entry, result.mode, result.courseStage, result.courseLabel, result.replayBuilding, save);
}

export interface ControllerOptions {
  kv?: KV | null;
  now?: () => number;
  pageId?: string;
  audio?: AudioManager;
}

/** Owns the save, the storage lease and the current page; every change goes through commit(). */
export class AppController {
  readonly audio: AudioManager;
  private state: AppState;
  private readonly listeners = new Set<() => void>();
  private readonly kvSource: KV | null | undefined;
  private kv: KV | null = null;
  private store: ProfilesStore;
  private readonly pageId: string;
  private ownsLease = false;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private readonly now: () => number;

  constructor(opts: ControllerOptions = {}) {
    this.now = opts.now ?? Date.now;
    this.kvSource = opts.kv;
    this.pageId = opts.pageId ?? pageIdentity();
    this.audio = opts.audio ?? new AudioManager();
    this.store = new ProfilesStore(null, 'memory', newProfiles(this.now()), null);
    this.state = {
      save: createNewSave(this.now()),
      household: this.store.data, selectedId: null, generation: 0,
      route: { name: 'players' },
      blocker: null,
      saveIssue: null,
      notice: null,
    };
  }

  /* -------------------------------------------------------------- subscription */

  getState = (): AppState => this.state;

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  private setState(patch: Partial<AppState>): void {
    const prevSettings = this.state.save.settings;
    this.state = { ...this.state, household: this.store.data, ...patch };
    if (this.state.selectedId && this.state.save.settings !== prevSettings) this.audio.applySettings(this.state.save.settings);
    for (const fn of this.listeners) fn();
  }

  /* -------------------------------------------------------------- start-up */

  init(): void {
    const now = this.now();
    const kv = this.kvSource !== undefined ? this.kvSource : browserStorage();
    this.kv = kv;
    if (kv && leaseStatus(readLease(kv), this.pageId, now) === 'other') {
      this.setState({ blocker: { kind: 'other-tab' } });
      return;
    }
    this.acquireLease(now);
    this.loadFromStorage(now);
  }

  private storeOptions() { return { ownsLease: this.holdsLease, now: this.now }; }

  private loadFromStorage(now: number): void {
    let raw: string | null = null;
    let backup: string | null = null;
    try { raw = this.kv?.getItem(SAVE_KEY) ?? null; backup = this.kv?.getItem(BACKUP_KEY) ?? null; }
    catch { this.setState({ saveIssue: 'unavailable' }); }
    const main = parseProfiles(raw, now);
    const fallback = parseProfiles(backup, now);
    const out = main.kind === 'invalid' || main.kind === 'missing' ? fallback : main;
    const recovered = main.kind !== 'ok' && out.kind === 'ok';
    const data = out.kind === 'ok' ? out.save : newProfiles(now);
    this.store = new ProfilesStore(this.kv, out.kind === 'future' ? 'readonly' : this.kv ? 'storage' : 'memory', data, raw, this.storeOptions(), recovered ? backup : main.kind === 'ok' ? raw : null);
    const blocker: Blocker | null = out.kind === 'future' ? { kind: 'incompatible', version: out.version } :
      out.kind === 'invalid' || (main.kind === 'invalid' && out.kind === 'missing') ? { kind: 'corrupt' } : null;
    let saveIssue: SaveIssue | null = this.kv ? null : 'unavailable';
    if (!blocker && (out.kind !== 'ok' || out.migrated || recovered)) {
      const written = this.store.transaction(data);
      if (!written.ok) saveIssue = written.reason === 'memory' ? 'unavailable' : 'quota';
    }
    this.audio.suspend();
    this.setState({ save: data.profiles[0].game, selectedId: null, generation: this.state.generation + 1, route: { name: 'players' }, blocker, saveIssue, notice: recovered ? 'restored-backup' : null });
  }

  selectPlayer(id: string): void {
    if (this.state.blocker || this.state.selectedId) return;
    const p = this.store.data.profiles.find(p => p.profileId === id);
    if (!p) return;
    this.store.selectedId = id;
    const save = prepareLoadedP2(prepareLoadedSave(p.game, this.now()), this.now());
    this.setState({ selectedId: id, save, generation: this.state.generation + 1, route: { name: 'home' } });
    this.audio.applySettings(save.settings);
    this.audio.unlock();
    this.commit({ ...save });
    this.settleLeftover();
  }

  switchPlayer(allowMemory = false): boolean {
    if (this.state.blocker) return false;
    this.pauseActive();
    this.commit({ ...this.state.save });
    if (this.state.blocker || (this.state.saveIssue && !allowMemory)) return false;
    this.audio.suspend();
    this.store.selectedId = null;
    this.setState({ selectedId: null, generation: this.state.generation + 1, route: { name: 'players' } });
    return true;
  }

  renamePlayer(id: string, value: string): string | null {
    if (this.state.blocker) return '请先处理存档提示';
    try {
      const name = validateName(value, this.store.data.profiles.find(p => p.profileId !== id)?.name);
      const next = { ...this.store.data, profiles: this.store.data.profiles.map(p => p.profileId === id ? { ...p, name } : p) };
      const result = this.store.transaction(next);
      if (!result.ok) return this.transactionError(result.reason);
      this.setState({ saveIssue: null });
      return null;
    } catch (e) { return e instanceof Error ? e.message : '名字无效'; }
  }

  private transactionError(reason: string): string {
    if (reason === 'not-owner') this.loseLease();
    if (reason === 'conflict') this.setState({ blocker: { kind: 'conflict' } });
    return reason === 'conflict' ? '进度已变化，请先导出本页备份再重新载入。' : reason === 'readonly' ? '当前存档只读，不能覆盖。' : '尚未保存，请保留页面并重试或导出备份。';
  }

  retrySave(): boolean {
    const result = this.store.transaction(this.store.data);
    if (!result.ok) { this.transactionError(result.reason); return false; }
    this.setState({ saveIssue: null }); return true;
  }

  exportBackup(): string {
    const slot = this.state.save.activeTask;
    if (slot?.variant === 'phase2' && currentOccurrence(slot.task)?.occ.compositionActive) throw Error('请先选好字，再导出备份。也可通过切换玩家放弃本次未选定的拼音。');
    window.dispatchEvent(new Event('lighttown:flush-draft'));
    this.pauseActive();
    const now = this.now();
    const backup = makeBackup(this.store.data, now);
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const d = new Date(now);
    const pad = (n: number) => String(n).padStart(2, '0');
    const a = document.createElement('a');
    a.href = url; a.download = `点亮小镇-双人备份-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    if (!this.state.blocker) {
      const r = this.store.transaction({ ...this.store.data, lastExportRequestedAt: backup.exportedAt });
      if (r.ok) this.setState({});
    }
    return '已请求下载，请在下载位置确认文件';
  }

  previewBackup(raw: string): { backup: Backup; baseline: string | null; revision: number } {
    return { backup: parseBackup(raw), baseline: this.store.lastRaw, revision: this.store.data.revision };
  }

  restoreBackup(preview: { backup: Backup; baseline: string | null; revision: number }): string | null {
    if (this.state.blocker && this.state.blocker.kind !== 'corrupt') return '请先处理存档提示';
    if (preview.baseline !== this.store.lastRaw || preview.revision !== this.store.data.revision) return '预览已过期，请重新选择文件';
    const backup = parseBackup(JSON.stringify(preview.backup));
    const r = this.store.transaction({ ...this.store.data, profiles: backup.profiles, undoRestore: { capturedAt: this.now(), profiles: this.store.data.profiles } });
    if (!r.ok) return this.transactionError(r.reason);
    this.afterRestore(); return null;
  }

  undoRestore(): string | null {
    if (this.state.blocker || !this.store.data.undoRestore) return '没有可撤销的恢复';
    const r = this.store.transaction({ ...this.store.data, profiles: this.store.data.undoRestore.profiles, undoRestore: null });
    if (!r.ok) return this.transactionError(r.reason);
    this.afterRestore(); return null;
  }

  private afterRestore(): void {
    this.audio.suspend(); this.store.selectedId = null;
    this.setState({ selectedId: null, save: this.store.data.profiles[0].game, generation: this.state.generation + 1, saveIssue: null, blocker: null, route: { name: 'players' } });
  }

  /** A finished level/task that was never settled (page closed at the last key) is settled once on load. */
  private settleLeftover(): void {
    const save = this.state.save;
    const lvl = p1Level(save);
    if (lvl && lvl.pos >= lvl.targets.length) {
      this.commit(settleLevel(save, this.now()).save);
      return;
    }
    if (save.activeTask && save.activeTask.variant === 'phase2') {
      const task = save.activeTask.task;
      if (taskDone(task) >= task.items.length) {
        const prepared = prepareLoadedP2(save, this.now());
        this.commit(prepared);
      }
    }
  }

  /** Window listeners, installed once per page. Returns the cleanup. */
  attach(): () => void {
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        this.pauseActive();
        this.audio.suspend();
      } else {
        if (this.state.selectedId) this.audio.resumeIfNeeded();
        this.beat();
      }
    };
    const onBlur = () => { window.dispatchEvent(new Event('lighttown:flush-draft')); this.pauseActive(); };
    const onPageHide = () => {
      window.dispatchEvent(new Event('lighttown:flush-draft'));
      this.pauseActive();
      this.audio.suspend();
      if (this.kv && this.ownsLease) releaseLease(this.kv, this.pageId);
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted || !this.kv) return;
      if (leaseStatus(readLease(this.kv), this.pageId, this.now()) === 'other') this.loseLease();
      else if (this.ownsLease) writeLease(this.kv, this.pageId, this.now());
    };
    const onStorage = (e: StorageEvent) => {
      if (!this.kv || !this.ownsLease) return;
      if (e.key !== null && e.key !== LEASE_KEY && e.key !== SAVE_KEY) return;
      if (leaseStatus(readLease(this.kv), this.pageId, this.now()) === 'other') this.loseLease();
    };
    const onGesture = () => { if (this.state.selectedId) this.audio.resumeIfNeeded(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('storage', onStorage);
    document.addEventListener('pointerdown', onGesture, true);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('pointerdown', onGesture, true);
      this.stopHeartbeat();
    };
  }

  /* -------------------------------------------------------------- lease */

  private holdsLease = (): boolean => {
    if (!this.kv) return true;
    return this.ownsLease && leaseStatus(readLease(this.kv), this.pageId, this.now()) !== 'other';
  };

  private acquireLease(now: number): void {
    if (!this.kv) return;
    writeLease(this.kv, this.pageId, now);
    this.ownsLease = true;
    this.stopHeartbeat();
    this.heartbeat = setInterval(() => this.beat(), RULES.timing.leaseHeartbeatMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeat !== null) clearInterval(this.heartbeat);
    this.heartbeat = null;
  }

  private beat(): void {
    if (!this.kv || !this.ownsLease) return;
    if (leaseStatus(readLease(this.kv), this.pageId, this.now()) === 'other') {
      this.loseLease();
      return;
    }
    writeLease(this.kv, this.pageId, this.now());
  }

  private loseLease(): void {
    this.ownsLease = false;
    this.stopHeartbeat();
    this.audio.suspend();
    const save = this.state.save;
    const lvl = p1Level(save);
    const paused = lvl ? pauseLevel(save, this.now()) : pauseP2Task(save, this.now());
    this.setState({ save: paused, blocker: { kind: 'other-tab' } });
  }

  /** True while another page still has a fresh lease (taking over then needs confirmation). */
  otherPageActive(): boolean {
    if (!this.kv) return false;
    return leaseStatus(readLease(this.kv), this.pageId, this.now()) === 'other';
  }

  /** 在这里继续: take the lease and reload the save the other page left behind. */
  takeOver(): void {
    if (!this.kv) return;
    const now = this.now();
    this.acquireLease(now);
    this.loadFromStorage(now);
  }

  /* -------------------------------------------------------------- persistence */

  /** Persist and publish a new save. Returns false when the change was refused (lease lost or conflict). */
  private commit(next: SaveData): boolean {
    if (this.state.blocker || !this.state.selectedId) return false;
    if (next === this.state.save) return true;
    const r = this.store.write(next);
    if (r.ok) {
      this.setState({ save: r.save, saveIssue: null });
      return true;
    }
    switch (r.reason) {
      case 'memory':
        this.setState({ save: r.save, saveIssue: this.state.saveIssue ?? 'unavailable' });
        return true;
      case 'readonly':
        this.setState({ save: r.save });
        return true;
      case 'quota':
        this.setState({ save: r.save, saveIssue: 'quota' });
        return true;
      case 'invalid':
        console.error('Save validation failed; the change is kept in memory only.');
        this.setState({ save: { ...next, revision: next.revision + 1 }, saveIssue: 'error' });
        return true;
      case 'not-owner':
        this.loseLease();
        return false;
      case 'conflict':
        this.audio.stopVoice();
        this.setState({ save: this.pauseAny(this.state.save), blocker: { kind: 'conflict' } });
        return false;
    }
  }

  /** The stored save changed underneath (another page wrote it): load it and continue from there. */
  reloadAfterConflict(): void {
    if (!this.kv) return;
    if (!this.ownsLease) this.acquireLease(this.now());
    this.loadFromStorage(this.now());
  }

  /** Both copies unreadable and the player chose 重新开始. */
  startOverAfterCorrupt(): void {
    const r = this.store.transaction(newProfiles(this.now()), true);
    if (!r.ok) { this.transactionError(r.reason); return; }
    this.setState({ blocker: null }); this.afterRestore();
  }

  playWithoutSaving(): void {
    this.setState({ blocker: null, saveIssue: 'temporary', route: { name: 'players' } });
  }

  dismissNotice(): void {
    this.setState({ notice: null });
  }

  /** 清空进度 after the second confirmation. */
  clearProgress(): boolean {
    if (this.state.blocker || !this.state.selectedId) return false;
    const fresh = { ...createNewSave(this.now()), settings: this.state.save.settings };
    const next = { ...this.store.data, undoRestore: null, profiles: this.store.data.profiles.map(p => p.profileId === this.state.selectedId ? { ...p, game: fresh } : p) };
    const result = this.store.transaction(next, true);
    if (!result.ok) { this.transactionError(result.reason); return false; }
    this.audio.stopVoice();
    this.setState({ save: fresh, generation: this.state.generation + 1, route: { name: 'home' }, notice: null, saveIssue: null });
    return true;
  }

  /* -------------------------------------------------------------- navigation */

  go(route: Route): void {
    window.dispatchEvent(new Event('lighttown:flush-draft'));
    if (this.state.route.name === 'practice' || this.state.route.name === 'task-practice') this.pauseActive();
    this.audio.stopVoice();
    this.setState({ route });
  }

  /** The first click of a visit (开始点亮 / 继续点亮): starts audio, then goes where the player left off. */
  enter(): void {
    this.audio.unlock();
    const s = this.state.save;
    if (!s.partner) this.go({ name: 'partner', from: 'first' });
    else if (!s.onboarded) this.go({ name: 'onboarding', replay: false });
    else this.go({ name: 'town' });
  }

  speak(...ids: VoiceId[]): void {
    this.audio.playVoice(...ids);
  }

  /* -------------------------------------------------------------- levels */

  /**
   * Start a new level (it begins paused); an unfinished level must be continued or discarded first.
   * autoStart: the click that started it counts as the "continue" confirmation, unless an introduction
   * has to be shown first (the practice page decides).
   */
  start(req: StartRequest, opts: { autoStart?: boolean } = {}): StartError | null {
    const now = this.now();
    const r = startLevel(this.state.save, req, now, randomSeed());
    if (r.error) return r.error;
    if (!this.commit(r.save)) return null;
    this.audio.stopVoice();
    this.setState({ route: { name: 'practice', autoStart: opts.autoStart } });
    return null;
  }

  discardAndStart(req: StartRequest, opts: { autoStart?: boolean } = {}): StartError | null {
    if (!this.commit(discardActiveLevel(this.state.save, this.now()))) return null;
    return this.start(req, opts);
  }

  continueActive(): void {
    const slot = this.state.save.activeTask;
    if (!slot) return;
    this.go(slot.variant === 'phase1' ? { name: 'practice' } : { name: 'task-practice' });
  }

  /** 重新开始（第一阶段）: discard the unfinished level and start a fresh one of the same kind. */
  restartActive(opts: { autoStart?: boolean } = {}): StartError | null {
    const lvl = p1Level(this.state.save);
    if (!lvl) return null;
    return this.discardAndStart(requestForLevel(lvl, this.state.save), opts);
  }

  /** Result page 继续: the next level of the same kind starts right away (the click confirms). */
  continueAfterResult(): StartError | null {
    const result = this.state.save.lastResult;
    if (!result) {
      this.go({ name: 'town' });
      return null;
    }
    const req = requestAfterResult(result, this.state.save);
    if (this.state.save.activeTask) return this.discardAndStart(req, { autoStart: true });
    return this.start(req, { autoStart: true });
  }

  resume(): void {
    this.commit(resumeLevel(this.state.save, this.now()));
  }

  pause(): void {
    this.pauseActive();
  }

  /** 暂停当前任务槽里的第一阶段关或第二阶段任务（不发布状态）。 */
  private pauseAny(save: SaveData): SaveData {
    const lvl = p1Level(save);
    if (lvl) return pauseLevel(save, this.now());
    return pauseP2Task(save, this.now());
  }

  private pauseActive(): void {
    const save = this.state.save;
    const lvl = p1Level(save);
    if (lvl) {
      if (!lvl.paused) this.commit(pauseLevel(save, this.now()));
      return;
    }
    if (save.activeTask && save.activeTask.variant === 'phase2' && !save.activeTask.task.paused) {
      this.commit(pauseP2Task(save, this.now()));
    }
  }

  /** One accepted practice character. The last correct key settles the level in the same commit. */
  input(ch: string): InputResult {
    const now = this.now();
    const r = applyInput(this.state.save, ch, now);
    if (r.outcome === 'ignored') return { outcome: 'ignored', completed: false };
    if (r.completed) {
      const settled = settleLevel(r.save, now);
      if (!this.commit(settled.save)) return { outcome: 'ignored', completed: false };
      this.audio.stopVoice();
      this.audio.playSfx('complete');
      this.setState({ route: { name: 'result' } });
      return { outcome: r.outcome, completed: true };
    }
    if (!this.commit(r.save)) return { outcome: 'ignored', completed: false };
    if (r.outcome === 'correct') {
      this.audio.playSfx('correct');
    } else {
      this.audio.playSfx('error');
      this.audio.errorVoice(now);
    }
    return { outcome: r.outcome, completed: false };
  }

  /** Called about once a second while practising; returns true when the level/task was auto-paused (30 s idle). */
  tickPractice(): boolean {
    const save = this.state.save;
    const lvl = p1Level(save);
    if (lvl) {
      if (lvl.paused || lvl.activeSince === null) return false;
      const now = this.now();
      const ref = Math.max(lvl.lastInputAt ?? lvl.activeSince, lvl.activeSince);
      if (now - ref < RULES.timing.autoPauseMs) return false;
      const r = tick(save, now);
      this.commit(r.save);
      return r.autoPaused;
    }
    const slot = save.activeTask;
    if (!slot || slot.variant !== 'phase2' || slot.task.paused || slot.task.activeSince === null) return false;
    // 组字进行中不自动暂停，避免破坏候选窗口；界面在组字结束后继续调用。
    if (currentOccurrence(slot.task)?.occ.compositionActive) return false;
    const now = this.now();
    const ref = Math.max(slot.task.lastInputAt ?? slot.task.activeSince, slot.task.activeSince);
    if (now - ref < RULES.timing.autoPauseMs) return false;
    const r = tickP2Task(save, now);
    this.commit(r.save);
    return r.autoPaused;
  }

  /** 结束本次: close the session (an unfinished level stays, paused) and show 本次成果. */
  endSessionNow(): void {
    const r = endSession(this.state.save, this.now());
    this.commit(r.save);
    this.go({ name: 'summary', summary: r.summary ?? EMPTY_SUMMARY });
  }

  /* -------------------------------------------------------------- phase 2: residents' tasks */

  /** 第二阶段开始错误文案（界面直接展示）。 */
  p2StartErrorText(error: P2StartError): string {
    switch (error) {
      case 'has-active-task': return '还有一个任务没有完成。';
      case 'story-locked': return '按顺序完成前面的故事任务后会开放。';
      case 'errand-locked': return '完成这个语言的第一个故事任务后，居民委托就会开放。';
      case 'drill-locked': return '完成对应的课程后，这里会开放。';
      case 'empty-pool': return '先完成一个相关故事任务吧。';
    }
  }

  /** 开始第二阶段任务；有未完成任务时返回错误（界面先给三选一）。 */
  startP2(req: P2StartRequest, opts: { autoStart?: boolean } = {}): P2StartError | null {
    const error = p2StartError(this.state.save, req);
    if (error) return error;
    const r = startP2Task(this.state.save, req, this.now(), randomSeed());
    if (r.error) return r.error;
    if (!this.commit(r.save)) return null;
    this.audio.stopVoice();
    this.setState({ route: { name: 'task-practice', autoStart: opts.autoStart } });
    return null;
  }

  /** 放弃并开始（三选一对话框里明确选择后才调用）。 */
  discardAndStartP2(req: P2StartRequest, opts: { autoStart?: boolean } = {}): P2StartError | null {
    const save = this.state.save;
    if (save.activeTask && save.activeTask.variant === 'phase2' && !this.commit(abandonP2Task(save, this.now()))) return null;
    if (save.activeTask && save.activeTask.variant === 'phase1' && !this.commit(discardActiveLevel(save, this.now()))) return null;
    return this.startP2(req, opts);
  }

  /** 继续第一阶段未完成关（放弃当前第二阶段任务）。 */
  discardP2AndContinuePhase1(): void {
    const save = this.state.save;
    if (!save.activeTask) return;
    if (save.activeTask.variant === 'phase2') {
      if (!this.commit(abandonP2Task(save, this.now()))) return;
    }
    this.go({ name: 'practice' });
  }

  /** 恢复练习（练习页开始/继续按钮）。 */
  resumeP2(): void {
    this.commit(resumeP2Task(this.state.save, this.now()));
  }

  /** 开场确认。 */
  confirmP2Intro(): void {
    const save = this.state.save;
    const slot = save.activeTask;
    if (!slot || slot.variant !== 'phase2' || slot.task.introSeen) return;
    const s = structuredClone(save);
    (s.activeTask as { task: { introSeen: boolean } }).task.introSeen = true;
    this.commit(s);
  }

  /** 提交当前题；最后一题完成时同一提交内结算并进入结果页。 */
  submitP2Text(text: string): { kind: 'empty' | 'match' | 'mismatch' | 'ignored'; firstSubmission: boolean; pinyinHint: boolean; stepCompleted: boolean; taskCompleted: boolean } {
    const now = this.now();
    const r = submitP2(this.state.save, text, now);
    if (r.kind === 'ignored') return { kind: 'ignored', firstSubmission: false, pinyinHint: false, stepCompleted: false, taskCompleted: false };
    if (r.taskCompleted) {
      if (!this.commit(r.save)) return { kind: 'ignored', firstSubmission: false, pinyinHint: false, stepCompleted: false, taskCompleted: false };
      this.audio.stopVoice();
      this.audio.playSfx('complete');
      this.setState({ route: { name: 'task-result' } });
      return { kind: 'match', firstSubmission: r.firstSubmission, pinyinHint: false, stepCompleted: false, taskCompleted: true };
    }
    if (!this.commit(r.save)) return { kind: 'ignored', firstSubmission: false, pinyinHint: false, stepCompleted: false, taskCompleted: false };
    if (r.kind === 'match') this.audio.playSfx('correct');
    else this.audio.playSfx('error');
    return { kind: r.kind, firstSubmission: r.firstSubmission, pinyinHint: r.pinyinHint, stepCompleted: r.stepCompleted, taskCompleted: false };
  }

  /** 已确认上屏文本变化（300ms trailing 合并提交，见 TaskPracticePage）。打字刷新空闲计时。 */
  saveP2Draft(occurrenceId: string, text: string): void {
    const r = setP2Draft(this.state.save, occurrenceId, text, this.now());
    if (r !== this.state.save) this.commit(r);
  }

  setP2Composition(occurrenceId: string, active: boolean): void {
    const r = setP2Composition(this.state.save, occurrenceId, active, this.now());
    if (r !== this.state.save) this.commit(r);
  }

  /**
   * 练习页回到可输入状态（关闭覆盖层）：暂停中则恢复；未暂停则只刷新空闲计时，
   * 避免「看帮助/步骤完成页太久 → 点继续 → 下一秒又被自动暂停」。
   */
  touchP2Activity(): void {
    const save = this.state.save;
    const slot = save.activeTask;
    if (!slot || slot.variant !== 'phase2') return;
    if (slot.task.paused) {
      this.resumeP2();
      return;
    }
    const r = touchP2Task(save, this.now());
    if (r !== save) this.commit(r);
  }

  /** 主动帮助/重播教学。 */
  markP2Help(): void {
    const r = markP2Help(this.state.save);
    if (r !== this.state.save) this.commit(r);
  }

  /** 放弃当前第二阶段任务（明确确认后调用）。 */
  abandonP2(): void {
    const save = this.state.save;
    if (!save.activeTask || save.activeTask.variant !== 'phase2') return;
    this.commit(abandonP2Task(save, this.now()));
  }

  /** 第二阶段重新开始：放弃当前实例并按同一来源生成新实例（新种子、不覆盖旧完成历史）。 */
  restartP2(): P2StartError | null {
    const save = this.state.save;
    const slot = save.activeTask;
    if (!slot || slot.variant !== 'phase2') return null;
    const task = slot.task;
    const req: P2StartRequest =
      task.kind === 'story'
        ? { kind: 'story', taskId: task.sourceId }
        : task.kind === 'errand'
          ? { kind: 'errand', language: task.language }
          : { kind: 'drill', language: task.language, category: task.drillCategory ?? 'selection' };
    if (!this.commit(abandonP2Task(save, this.now()))) return null;
    const err = this.startP2(req);
    return err;
  }

  /** 标记教学卡已展示（专项开放条件）。 */
  markP2Teaching(key: string): void {
    const save = this.state.save;
    if (save.phase2.teaching[key]) return;
    const s = structuredClone(save);
    s.phase2.teaching[key] = true;
    this.commit(s);
  }

  /** 设置页「重看输入法引导」：清除引导标记，下一次进入第二阶段任务时重新展示三张卡。 */
  replayP2Guide(): void {
    const save = this.state.save;
    if (!save.phase2.teaching['intro']) return;
    const s = structuredClone(save);
    delete s.phase2.teaching['intro'];
    this.commit(s);
  }

  /** 保存失败提示的实际状态：本次结算是否已持久化。 */

  /* -------------------------------------------------------------- profile, shop, settings */

  pickPartner(id: PartnerId): void {
    this.commit(choosePartner(this.state.save, id));
  }

  completeOnboarding(): void {
    this.commit(finishOnboarding(this.state.save));
  }

  seeIntro(stage: number): void {
    this.commit(markIntroSeen(this.state.save, stage));
  }

  see(key: string): void {
    this.commit(markSeen(this.state.save, key));
  }

  setSettings(patch: Partial<Settings>): void {
    this.commit(updateSettings(this.state.save, patch));
  }

  buy(id: string): ShopError | null {
    const r = buyAccessory(this.state.save, id);
    if (r.error) return r.error;
    if (this.commit(r.save)) this.audio.playSfx('purchase');
    return null;
  }

  equip(slot: AccessorySlot, id: string | null): ShopError | null {
    const r = equipAccessory(this.state.save, slot, id);
    if (r.error) return r.error;
    this.commit(r.save);
    return null;
  }

  buyTheme(id: ThemeId): ShopError | null {
    const r = buyTheme(this.state.save, id);
    if (r.error) return r.error;
    if (this.commit(r.save)) this.audio.playSfx('purchase');
    return null;
  }

  applyTheme(id: ThemeId): ShopError | null {
    const r = applyTheme(this.state.save, id);
    if (r.error) return r.error;
    this.commit(r.save);
    return null;
  }
}
