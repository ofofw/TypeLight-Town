import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioManager } from '../../src/app/audio';
import { RULES } from '../../src/config/rules';
import { defaultSettings } from '../../src/core/game';

/** A minimal stand-in for the Web Audio API: records gain changes and which node each source plays into. */
class FakeParam {
  value = 1;
  setTargetAtTime(v: number) {
    this.value = v;
  }
  setValueAtTime(v: number) {
    this.value = v;
  }
  linearRampToValueAtTime(v: number) {
    this.value = v;
  }
  cancelScheduledValues() {}
}

class FakeGain {
  gain = new FakeParam();
  output: unknown = null;
  connect(node: unknown) {
    this.output = node;
  }
}

class FakeSource {
  buffer: unknown = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onended: (() => void) | null = null;
  output: FakeGain | null = null;
  started = false;
  stopped = false;
  connect(node: FakeGain) {
    this.output = node;
  }
  start() {
    this.started = true;
  }
  stop() {
    this.stopped = true;
  }
}

class FakeContext {
  static last: FakeContext;
  state: 'suspended' | 'running' = 'suspended';
  currentTime = 0;
  destination = {};
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  constructor() {
    FakeContext.last = this;
  }
  createGain() {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
  createBufferSource() {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  }
  async resume() {
    this.state = 'running';
  }
  async suspend() {
    this.state = 'suspended';
  }
  async decodeAudioData() {
    return { duration: 60 };
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));
const ctx = () => FakeContext.last;
const master = () => ctx().gains.find((g) => g.output === ctx().destination)!;
const music = () => ctx().sources.filter((s) => s.loop);
/** These tests play no sound effects, so every other source is a voice line. */
const voices = () => ctx().sources.filter((s) => !s.loop);
const duck = () => music()[0].output!.gain.value;

let failing: RegExp | null = null;

beforeEach(() => {
  failing = null;
  vi.stubGlobal('window', { AudioContext: FakeContext });
  vi.stubGlobal('fetch', async (url: string) => ({
    ok: !(failing && failing.test(url)),
    status: failing && failing.test(url) ? 404 : 200,
    arrayBuffer: async () => new ArrayBuffer(8),
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

async function started(): Promise<AudioManager> {
  const audio = new AudioManager();
  audio.applySettings(defaultSettings());
  audio.unlock();
  await flush();
  await flush();
  return audio;
}

describe('E01/E02 music, voice and ducking', () => {
  it('the first gesture starts one looping music track; repeated unlocks never stack it (E07)', async () => {
    const audio = await started();
    expect(audio.status).toBe('ready');
    audio.unlock();
    audio.unlock();
    await flush();
    await flush();
    expect(music()).toHaveLength(1);
    expect(music()[0].started).toBe(true);
  });

  it('music is lowered while a voice line plays and restored when it ends', async () => {
    const audio = await started();
    expect(duck()).toBe(1);
    audio.playVoice('help');
    await flush();
    expect(voices()).toHaveLength(1);
    expect(duck()).toBe(RULES.audio.duckRatio);
    voices()[0].onended!();
    expect(duck()).toBe(1);
  });

  it('cancelling a voice (as every page change does) stops it and restores the music', async () => {
    const audio = await started();
    audio.playVoice('welcome');
    await flush();
    audio.stopVoice();
    expect(voices()[0].stopped).toBe(true);
    expect(duck()).toBe(1);
  });

  it('a new line replaces the one still playing; lines in a sequence play one after another', async () => {
    const audio = await started();
    audio.playVoice('modeKeys');
    await flush();
    audio.playVoice('modeSign', 'modeSignSpace');
    await flush();
    expect(voices()[0].stopped).toBe(true);
    expect(voices()).toHaveLength(2);
    voices()[1].onended!();
    await flush();
    expect(voices()).toHaveLength(3);
    expect(duck()).toBe(RULES.audio.duckRatio);
  });

  it('a line asked for while audio is still starting is spoken once it runs', async () => {
    const audio = new AudioManager();
    audio.applySettings(defaultSettings());
    audio.unlock();
    audio.playVoice('choosePartner');
    await flush();
    await flush();
    await flush();
    expect(voices()).toHaveLength(1);
  });

  it('master mute silences everything and stops the voice; switching voice off stops it too', async () => {
    const audio = await started();
    audio.playVoice('help');
    await flush();
    audio.applySettings({ ...defaultSettings(), masterMute: true });
    expect(master().gain.value).toBe(0);
    expect(voices()[0].stopped).toBe(true);
    audio.applySettings({ ...defaultSettings(), voice: false });
    expect(master().gain.value).toBe(1);
    expect(voices()[0].output!.gain.value).toBe(0);
    audio.playVoice('help');
    await flush();
    expect(voices()).toHaveLength(1);
  });
});

describe('E01/E09 audio problems never stop the game', () => {
  it('a sound file that fails to load reports failed; retry loads it again', async () => {
    failing = /voice/;
    const audio = await started();
    audio.playVoice('help');
    await flush();
    await flush();
    expect(audio.status).toBe('failed');
    expect(duck()).toBe(1);
    failing = null;
    audio.retry();
    await flush();
    audio.playVoice('help');
    await flush();
    await flush();
    expect(audio.status).toBe('ready');
    expect(voices()).toHaveLength(1);
  });

  it('a browser that refuses to start audio reports blocked', async () => {
    vi.spyOn(FakeContext.prototype, 'resume').mockImplementation(async () => undefined);
    const audio = new AudioManager();
    audio.applySettings(defaultSettings());
    audio.unlock();
    await flush();
    expect(audio.status).toBe('blocked');
  });

  it('without Web Audio at all the game still runs and reports failed', () => {
    vi.stubGlobal('window', {});
    const audio = new AudioManager();
    audio.unlock();
    audio.playVoice('help');
    audio.playSfx('correct');
    expect(audio.status).toBe('failed');
  });
});
