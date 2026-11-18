import { MUSIC, SFX_FILES, phase2VoiceFile, voiceFile, type SfxId } from '../config/audio';
import { RULES } from '../config/rules';
import { ERROR_VOICES, type VoiceId } from '../config/voice';
import type { Settings } from '../core/types';

/**
 * off: not started yet (needs the first click) · ready: playing normally ·
 * blocked: the browser refused to start audio · failed: a sound file could not be loaded.
 */
export type AudioStatus = 'off' | 'ready' | 'blocked' | 'failed';

type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as typeof globalThis & { webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function assetUrl(path: string): string {
  const embedded = (globalThis as typeof globalThis & { __LIGHT_TOWN_AUDIO__?: Record<string, string> }).__LIGHT_TOWN_AUDIO__;
  return (globalThis.location?.protocol === 'file:' ? embedded?.[path] : undefined) ?? `${import.meta.env.BASE_URL}${path}`;
}

/** One Web Audio graph for the whole page: music (with ducking), sound effects and voice. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private duckGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private readonly buffers = new Map<string, Promise<AudioBuffer>>();
  private musicSource: AudioBufferSourceNode | null = null;
  private musicStarting = false;
  private voiceSource: AudioBufferSourceNode | null = null;
  private voiceToken = 0;
  /** Asked for while the context was still starting after the first click; spoken once it runs. */
  private pendingVoice: VoiceId[] | null = null;
  private lastErrorVoiceAt = -Infinity;
  private errorVoiceIndex = 0;
  private settings: Settings | null = null;
  private readonly listeners = new Set<() => void>();
  status: AudioStatus = 'off';

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getStatus = (): AudioStatus => this.status;

  private setStatus(status: AudioStatus): void {
    if (this.status === status) return;
    this.status = status;
    for (const fn of this.listeners) fn();
  }

  applySettings(settings: Settings): void {
    this.settings = settings;
    this.updateGains();
  }

  private updateGains(): void {
    const s = this.settings;
    if (!this.ctx || !s || !this.master || !this.musicGain || !this.sfxGain || !this.voiceGain) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.masterMute ? 0 : 1, t, 0.03);
    this.musicGain.gain.setTargetAtTime(s.music ? s.musicVolume : 0, t, 0.08);
    this.sfxGain.gain.setTargetAtTime(s.sfx ? s.sfxVolume : 0, t, 0.02);
    this.voiceGain.gain.setTargetAtTime(s.voice ? s.voiceVolume : 0, t, 0.02);
    if (!s.voice || s.masterMute) this.stopVoice();
  }

  /** Must be called from a click or key handler: creates/resumes the context and starts the music. */
  unlock(): void {
    const Ctor = audioContextCtor();
    if (!Ctor) {
      this.setStatus('failed');
      return;
    }
    if (!this.ctx) {
      try {
        this.ctx = new Ctor();
      } catch {
        this.setStatus('failed');
        return;
      }
      this.buildGraph(this.ctx);
    }
    const ctx = this.ctx;
    const started = ctx.state === 'running' ? Promise.resolve() : ctx.resume();
    started
      .then(() => {
        if (ctx.state !== 'running') {
          this.setStatus('blocked');
          return;
        }
        if (this.status !== 'failed') this.setStatus('ready');
        this.preloadEffects();
        void this.ensureMusic();
        const pending = this.pendingVoice;
        this.pendingVoice = null;
        if (pending) this.playVoice(...pending);
      })
      .catch(() => this.setStatus('blocked'));
  }

  /** The sound button after a failure or a refusal: failed downloads were already forgotten, so try again. */
  retry(): void {
    this.setStatus(this.ctx?.state === 'running' ? 'ready' : 'off');
    this.unlock();
  }

  private running(): boolean {
    return this.ctx?.state === 'running';
  }

  private buildGraph(ctx: AudioContext): void {
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0;
    this.duckGain = ctx.createGain();
    this.duckGain.connect(this.musicGain);
    this.musicGain.connect(this.master);
    this.sfxGain = ctx.createGain();
    this.sfxGain.connect(this.master);
    this.voiceGain = ctx.createGain();
    this.voiceGain.connect(this.master);
    this.updateGains();
  }

  private load(path: string): Promise<AudioBuffer> {
    const url = assetUrl(path);
    let p = this.buffers.get(url);
    if (!p) {
      const ctx = this.ctx;
      p = (async () => {
        if (!ctx) throw new Error('audio not started');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`${res.status} ${url}`);
        return ctx.decodeAudioData(await res.arrayBuffer());
      })();
      p.catch(() => {
        this.buffers.delete(url);
        this.setStatus('failed');
      });
      this.buffers.set(url, p);
    }
    return p;
  }

  private preloadEffects(): void {
    for (const path of Object.values(SFX_FILES)) this.load(path).catch(() => undefined);
  }

  private async ensureMusic(): Promise<void> {
    if (this.musicSource || this.musicStarting || !this.ctx || !this.duckGain || !this.musicGain) return;
    this.musicStarting = true;
    try {
      const buffer = await this.load(MUSIC.file);
      const ctx = this.ctx;
      if (this.musicSource || !ctx || !this.duckGain) return;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.loopStart = MUSIC.loopStart;
      src.loopEnd = Math.min(MUSIC.loopEnd, buffer.duration);
      src.connect(this.duckGain);
      const t = ctx.currentTime;
      this.duckGain.gain.cancelScheduledValues(t);
      this.duckGain.gain.setValueAtTime(0, t);
      this.duckGain.gain.linearRampToValueAtTime(this.voiceSource ? RULES.audio.duckRatio : 1, t + MUSIC.fadeInSeconds);
      src.start(t, MUSIC.loopStart);
      this.musicSource = src;
    } catch {
      /* status already set to failed by load() */
    } finally {
      this.musicStarting = false;
    }
  }

  playSfx(id: SfxId): void {
    const s = this.settings;
    if (!this.running() || !s || !s.sfx || s.masterMute) return;
    const ctx = this.ctx;
    const gain = this.sfxGain;
    if (!ctx || !gain) return;
    this.load(SFX_FILES[id])
      .then((buffer) => {
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        src.start();
      })
      .catch(() => undefined);
  }

  /** Plays voice lines one after another (stopping any previous voice) and ducks the music while speaking. */
  playVoice(...ids: VoiceId[]): void {
    const s = this.settings;
    this.stopVoice();
    if (!s || !s.voice || s.masterMute || ids.length === 0) return;
    if (!this.running()) {
      if (this.ctx) this.pendingVoice = ids;
      return;
    }
    const token = ++this.voiceToken;
    this.playVoiceAt(ids, 0, token);
  }

  private playVoiceAt(ids: VoiceId[], index: number, token: number): void {
    const ctx = this.ctx;
    const gain = this.voiceGain;
    if (!ctx || !gain || index >= ids.length) return;
    this.load(voiceFile(ids[index]))
      .then((buffer) => {
        if (token !== this.voiceToken) return;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        src.onended = () => {
          if (this.voiceSource !== src) return;
          this.voiceSource = null;
          if (index + 1 < ids.length && token === this.voiceToken) {
            this.playVoiceAt(ids, index + 1, token);
          } else {
            this.setDuck(false);
          }
        };
        this.voiceSource = src;
        this.setDuck(true);
        src.start();
      })
      .catch(() => {
        if (token === this.voiceToken) this.setDuck(false);
      });
  }

  /** After a wrong key: a gentle line, at most once every 15 seconds. */
  errorVoice(nowMs: number): void {
    if (nowMs - this.lastErrorVoiceAt < RULES.timing.errorVoiceGapMs) return;
    const s = this.settings;
    if (!this.running() || !s || !s.voice || s.masterMute) return;
    this.lastErrorVoiceAt = nowMs;
    const id = ERROR_VOICES[this.errorVoiceIndex % ERROR_VOICES.length];
    this.errorVoiceIndex += 1;
    this.playVoice(id);
  }

  /**
   * 第二阶段：播放一个中文 item 读音或教学提示（audio/phase2/voice/<id>.m4a）。
   * 停掉上一段再播（不堆叠），语音播放时压低音乐；失效时静默（文字降级可玩）。
   */
  playP2Voice(id: string): void {
    const s = this.settings;
    this.stopVoice();
    if (!s || !s.voice || s.masterMute) return;
    if (!this.running()) {
      if (this.ctx) this.pendingVoice = [];
      return;
    }
    const token = ++this.voiceToken;
    this.load(phase2VoiceFile(id))
      .then((buffer) => {
        if (token !== this.voiceToken) return;
        const ctx = this.ctx;
        const gain = this.voiceGain;
        if (!ctx || !gain) return;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.connect(gain);
        src.onended = () => {
          if (this.voiceSource !== src) return;
          this.voiceSource = null;
          this.setDuck(false);
        };
        this.voiceSource = src;
        this.setDuck(true);
        src.start();
      })
      .catch(() => {
        if (token === this.voiceToken) this.setDuck(false);
      });
  }

  stopVoice(): void {
    this.pendingVoice = null;
    this.voiceToken += 1;
    const src = this.voiceSource;
    this.voiceSource = null;
    if (src) {
      src.onended = null;
      try {
        src.stop();
      } catch {
        /* already stopped */
      }
    }
    this.setDuck(false);
  }

  private setDuck(on: boolean): void {
    if (!this.ctx || !this.duckGain || !this.musicSource) return;
    const t = this.ctx.currentTime;
    this.duckGain.gain.cancelScheduledValues(t);
    this.duckGain.gain.setTargetAtTime(on ? RULES.audio.duckRatio : 1, t, on ? 0.06 : 0.25);
  }

  /** Page hidden: silence everything. */
  suspend(): void {
    this.stopVoice();
    if (this.ctx && this.ctx.state === 'running') void this.ctx.suspend().catch(() => undefined);
  }

  /** Page visible again, or any user gesture: bring audio back if it had been started. */
  resumeIfNeeded(): void {
    const ctx = this.ctx;
    if (!ctx || this.status === 'off' || ctx.state === 'running') return;
    ctx
      .resume()
      .then(() => {
        if (ctx.state === 'running') {
          if (this.status === 'blocked') this.setStatus('ready');
        } else if (this.status === 'ready') {
          this.setStatus('blocked');
        }
      })
      .catch(() => this.setStatus('blocked'));
  }
}
