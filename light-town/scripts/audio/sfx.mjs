// The four game sound effects, in the music's key family (F major / C).
//
//   correct  – C6 (1046.5 Hz) soft glass-marimba "ding", 0.20 s, attack complete within 1 ms.
//   error    – A3 (220 Hz) muted wooden "boop" with a gentle ~70-cent downward bend, 0.26 s.
//   complete – pentatonic celesta run F5 G5 A5 C6 → F6 over a soft F-major bloom, sparkle tail, 1.35 s.
//   purchase – C6 → G6 (rising fifth) bell chime with a light coin clink and shimmer, 0.70 s.

import { SR, TAU, midiToHz, noteToMidi, mulberry32, hashSeed, lowpassWeight, biquad, runBiquad, freeverb, dbToGain } from './lib/dsp.mjs';
import { addPartial, shapeEnvelope, fadeTail } from './lib/instruments.mjs';

const hz = (name) => midiToHz(noteToMidi(name));

function mixAt(dst, src, at, gain = 1) {
  const off = Math.round(at * SR);
  const n = Math.min(src.length, dst.length - off);
  for (let i = 0; i < n; i++) dst[off + i] += src[i] * gain;
}

/** One struck tone made of [ratio, amplitude, decay τ] partials, tilted by a low-pass. */
function strike(f0, partials, { len, attack = 0.002, lp = 7000, seed = 0 }) {
  const out = new Float64Array(Math.round(len * SR));
  const r = mulberry32(seed);
  for (const [ratio, amp, tau] of partials) {
    const f = f0 * ratio;
    const phase = seed && ratio !== 1 ? TAU * r() : 0;
    addPartial(out, f, amp * lowpassWeight(f, lp), tau, phase);
  }
  shapeEnvelope(out, { attack });
  return out;
}

/** Exponential "damper" from t0 on, so a ringing sound dies away before the final fade. */
function dampAfter(x, t0, tau) {
  const dec = Math.exp(-1 / (tau * SR));
  let g = 1;
  for (let i = Math.round(t0 * SR); i < x.length; i++) {
    g *= dec;
    x[i] *= g;
  }
}

/** Mix in a little Freeverb room (mono). */
function addRoom(x, { roomSize, damp, wet }) {
  const inp = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) inp[i] = x[i] * 0.015;
  const rv = freeverb(inp, { roomSize, damp, width: 1 });
  for (let i = 0; i < x.length; i++) x[i] += 0.5 * (rv.L[i] + rv.R[i]) * wet;
}

export function correct() {
  return strike(
    hz('C6'),
    [
      [1, 1, 0.058],
      [2, 0.18, 0.03],
      [3, 0.04, 0.017],
      [4, 0.025, 0.01],
    ],
    { len: 0.2, attack: 0.0008, lp: 6000 },
  );
}

export function error() {
  const len = 0.26;
  const n = Math.round(len * SR);
  const f1 = hz('A3');
  const out = new Float64Array(n);
  // [ratio, amplitude, extra exponential decay τ]; the shared bell-shaped envelope below
  // holds the tone briefly and then rounds it off ("boop" rather than "plink").
  const partials = [
    [1, 1, 1],
    [2, 0.1, 0.12],
    [3, 0.025, 0.06],
    [4, 0.07, 0.02],
  ];
  for (const [ratio, amp, tau] of partials) {
    const dec = Math.exp(-1 / (tau * SR));
    let env = amp * lowpassWeight(f1 * ratio, 1800);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      // starts ~+55 cents above A3, settles within ~0.1 s, then sags another ~15 cents
      const f = f1 * (1 + 0.032 * Math.exp(-t / 0.045)) * (1 - 0.009 * (t / len));
      out[i] += env * Math.sin(ph);
      ph += (TAU * f * ratio) / SR;
      env *= dec;
    }
  }
  for (let i = 0; i < n; i++) {
    const u = i / SR / 0.135;
    out[i] *= Math.exp(-u * u);
  }
  // soft felt-mallet contact: a few milliseconds of low-passed noise
  const r = mulberry32(hashSeed('sfx-error-knock'));
  const knock = new Float64Array(Math.round(0.012 * SR));
  for (let i = 0; i < knock.length; i++) knock[i] = (r() * 2 - 1) * Math.exp(-i / (0.003 * SR));
  runBiquad(knock, biquad('lowpass', 1200, Math.SQRT1_2));
  mixAt(out, knock, 0, 0.05);
  shapeEnvelope(out, { attack: 0.005 });
  return out;
}

export function complete() {
  const len = 1.35;
  const out = new Float64Array(Math.round(len * SR));
  const run = [
    ['F5', 0, 0.78],
    ['G5', 0.085, 0.82],
    ['A5', 0.17, 0.87],
    ['C6', 0.255, 0.92],
    ['F6', 0.36, 1.0],
  ];
  for (const [name, at, vel] of run) {
    const tau = name === 'F6' ? 0.5 : 0.42;
    const tone = strike(
      hz(name),
      [
        [1, 1, tau],
        [2, 0.26, tau * 0.4],
        [3, 0.06, tau * 0.2],
        [4.2, 0.025, 0.05],
      ],
      { len: len - at, attack: 0.002, lp: 6500 },
    );
    mixAt(out, tone, at, vel);
  }
  // warm bloom under the final note
  for (const [name, a] of [['F5', 0.1], ['A5', 0.08], ['C6', 0.07]]) {
    const tone = new Float64Array(Math.round((len - 0.36) * SR));
    addPartial(tone, hz(name), a, 0.5);
    shapeEnvelope(tone, { attack: 0.05 });
    mixAt(out, tone, 0.36);
  }
  // sparkle tail: soft high glints from the F pentatonic, fading out
  const r = mulberry32(hashSeed('sfx-complete-sparkle'));
  const pool = ['C7', 'D7', 'F7', 'G7', 'A7'];
  for (let k = 0; k < 7; k++) {
    const at = 0.42 + k * 0.085 + r() * 0.04;
    const f = hz(pool[Math.floor(r() * pool.length)]);
    const a = 0.09 * (1 - k / 9) * (0.8 + 0.4 * r());
    const glint = strike(f, [[1, 1, 0.09 + 0.05 * r()], [1.003, 0.5, 0.09]], { len: 0.5, attack: 0.0015, lp: 9000 });
    mixAt(out, glint, at, a);
  }
  addRoom(out, { roomSize: 0.55, damp: 0.5, wet: 0.16 });
  dampAfter(out, 0.95, 0.13);
  return out;
}

export function purchase() {
  const len = 0.7;
  const out = new Float64Array(Math.round(len * SR));
  const chime = (tau) => [
    [1, 1, tau],
    [1.0035, 0.3, tau],
    [2, 0.22, tau * 0.45],
    [2.76, 0.12, tau * 0.25],
    [5.4, 0.04, tau * 0.08],
  ];
  mixAt(out, strike(hz('C6'), chime(0.26), { len, attack: 0.0015, lp: 7500, seed: hashSeed('sfx-purchase-1') }), 0, 0.85);
  mixAt(out, strike(hz('G6'), chime(0.36), { len: len - 0.09, attack: 0.0015, lp: 7500, seed: hashSeed('sfx-purchase-2') }), 0.09, 1.0);
  // light metallic coin clink on each strike
  for (const [at, freqs] of [[0, [4650, 5870, 7050]], [0.09, [5230, 6410]]]) {
    for (const f of freqs) {
      const c = new Float64Array(Math.round(0.08 * SR));
      addPartial(c, f, 0.035, 0.012);
      shapeEnvelope(c, { attack: 0.0005 });
      mixAt(out, c, at);
    }
  }
  // shimmering sparkles after the second note
  const r = mulberry32(hashSeed('sfx-purchase-sparkle'));
  const pool = ['G6', 'C7', 'D7', 'G7', 'C8'];
  for (let k = 0; k < 5; k++) {
    const at = 0.14 + k * 0.07 + r() * 0.03;
    const f = hz(pool[Math.floor(r() * pool.length)]);
    const a = 0.08 * (1 - k / 7) * (0.8 + 0.4 * r());
    const glint = strike(f, [[1, 1, 0.05 + 0.04 * r()], [1.004, 0.5, 0.06]], { len: 0.35, attack: 0.0015, lp: 9000 });
    mixAt(out, glint, at, a);
  }
  addRoom(out, { roomSize: 0.5, damp: 0.5, wet: 0.14 });
  dampAfter(out, 0.45, 0.09);
  return out;
}

export const SFX = [
  { name: 'correct', render: correct, fadeMs: 12 },
  { name: 'error', render: error, fadeMs: 12 },
  { name: 'complete', render: complete, fadeMs: 20 },
  { name: 'purchase', render: purchase, fadeMs: 15 },
];

/** Sub-sonic clean-up, end fade, peak normalisation, rounding to 16-bit. */
export function finalizeSfx(x, { fadeMs, peakDb = -3 }) {
  runBiquad(x, biquad('highpass', 30, Math.SQRT1_2));
  fadeTail(x, fadeMs);
  let peak = 0;
  for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  const g = (dbToGain(peakDb) * 32768) / peak;
  const q = new Int16Array(x.length);
  for (let i = 0; i < x.length; i++) q[i] = Math.max(-32768, Math.min(32767, Math.round(x[i] * g)));
  return q;
}
