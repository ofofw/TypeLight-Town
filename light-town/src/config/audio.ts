/** Bundled audio files (paths relative to the site root) and loop points of the music. */

const MUSIC_SAMPLE_RATE = 44_100;
const MUSIC_PRE_SAMPLES = 88_200;
const MUSIC_LOOP_SAMPLES = 2_352_000;

/**
 * The music file holds [last 2 s of the loop][the loop][first 2 s of the loop], so looping between
 * loopStart and loopEnd is seamless even when a decoder shifts the audio by a few milliseconds.
 */
export const MUSIC = {
  file: 'audio/music/town-loop.m4a',
  loopStart: MUSIC_PRE_SAMPLES / MUSIC_SAMPLE_RATE,
  loopEnd: (MUSIC_PRE_SAMPLES + MUSIC_LOOP_SAMPLES) / MUSIC_SAMPLE_RATE,
  fadeInSeconds: 1.5,
};

export type SfxId = 'correct' | 'error' | 'complete' | 'purchase';

export const SFX_FILES: Record<SfxId, string> = {
  correct: 'audio/sfx/correct.wav',
  error: 'audio/sfx/error.wav',
  complete: 'audio/sfx/complete.wav',
  purchase: 'audio/sfx/purchase.wav',
};

export function voiceFile(id: string): string {
  return `audio/voice/${id}.m4a`;
}

/** 第二阶段：中文 item 读音与教学提示（public/audio/phase2/voice/<id>.m4a）。 */
export function phase2VoiceFile(id: string): string {
  return `audio/phase2/voice/${id}.m4a`;
}
