// Note renderers for the background loop. Each call renders ONE note into a fresh buffer
// whose samples depend only on the note's own parameters and seed, so the same score event
// yields bit-identical samples in every loop cycle.

import {
  SR,
  TAU,
  midiToHz,
  mulberry32,
  lowpassWeight,
  biquad,
  runBiquad,
  centsToRatio,
  panGains,
  svfLowpass,
} from './dsp.mjs';

const raisedCos = (i, n) => 0.5 - 0.5 * Math.cos((Math.PI * i) / n);

/** Raised-cosine fade over the last `ms` milliseconds so the buffer ends at exactly 0. */
export function fadeTail(buf, ms = 8) {
  const n = Math.min(buf.length, Math.round((ms * SR) / 1000));
  const end = buf.length - 1;
  for (let i = 0; i < n; i++) buf[end - i] *= raisedCos(i, n);
}

export function scaleInPlace(buf, g) {
  for (let i = 0; i < buf.length; i++) buf[i] *= g;
}

/** Add one exponentially decaying sine partial; `vib` is an optional per-sample frequency multiplier. */
export function addPartial(out, f, amp, tau, phase = 0, vib = null) {
  if (!(amp > 0) || f >= SR * 0.45) return;
  const w = (TAU * f) / SR;
  const dec = Math.exp(-1 / (tau * SR));
  const n = out.length;
  let ph = phase;
  let env = amp;
  if (vib) {
    for (let i = 0; i < n && env > 1e-7; i++) {
      out[i] += env * Math.sin(ph);
      ph += w * vib[i];
      env *= dec;
    }
  } else {
    for (let i = 0; i < n && env > 1e-7; i++) {
      out[i] += env * Math.sin(ph);
      ph += w;
      env *= dec;
    }
  }
}

/** Raised-cosine attack plus an optional exponential "damper" release from offT seconds on. */
export function shapeEnvelope(buf, { attack = 0.005, offT = Infinity, relTau = 0.3 } = {}) {
  const nA = Math.max(1, Math.round(attack * SR));
  const iOff = Number.isFinite(offT) ? Math.round(offT * SR) : buf.length;
  const dec = Math.exp(-1 / (relTau * SR));
  let rel = 1;
  for (let i = 0; i < buf.length; i++) {
    let e = i < nA ? raisedCos(i, nA) : 1;
    if (i >= iOff) {
      rel *= dec;
      e *= rel;
    }
    buf[i] *= e;
  }
}

/** Per-sample frequency multiplier: delayed, faded-in sine vibrato. */
export function vibratoCurve(n, { cents = 4, rate = 5, phase = 0, delay = 0.25, fade = 0.5 } = {}) {
  const v = new Float64Array(n);
  const depth = centsToRatio(cents) - 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const d = t <= delay ? 0 : depth * Math.min(1, (t - delay) / fade);
    v[i] = 1 + d * Math.sin(TAU * rate * t + phase);
  }
  return v;
}

// ---------------------------------------------------------------------------
// Lead: soft celesta / music-box tone (additive). Strong fundamental, a gentle octave
// partial and two quickly vanishing inharmonic "tine" partials, all tilted by a 2nd-order
// low-pass; 6 ms raised-cosine attack, natural decay, damper on note-off, slight vibrato.

export function celesta({ midi, vel = 1, dur, seed }) {
  const r = mulberry32(seed);
  const f0 = midiToHz(midi);
  const tau1 = 1.45 * Math.pow(440 / f0, 0.5);
  const offT = dur + 0.05;
  const relTau = 0.26;
  const n = Math.ceil((offT + relTau * 9) * SR);
  const vib = vibratoCurve(n, { cents: 4, rate: 4.6 + 0.7 * r(), phase: TAU * r(), delay: 0.28, fade: 0.5 });
  const bright = 0.7 + 0.3 * vel;
  const out = new Float64Array(n);
  const partials = [
    [1, 1, tau1],
    [2, 0.22 * bright, tau1 * 0.42],
    [3, 0.05 * bright, tau1 * 0.22],
    [4.2, 0.028 * bright, 0.07],
    [5.4, 0.012 * bright, 0.035],
  ];
  for (const [ratio, a, tau] of partials) {
    addPartial(out, f0 * ratio, a * lowpassWeight(f0 * ratio, 4200), tau, 0, vib);
  }
  shapeEnvelope(out, { attack: 0.006, offT, relTau });
  scaleInPlace(out, vel);
  fadeTail(out);
  return out;
}

// ---------------------------------------------------------------------------
// Mellow electric piano (2-operator FM, carrier:modulator = 1:1). The modulation index decays
// from ≈1 to 0.12, giving a soft bell-ish onset that settles into an almost pure tone.

export function epiano({ midi, vel = 1, dur }) {
  const f0 = midiToHz(midi);
  const tau = 1.5 * Math.pow(220 / f0, 0.4);
  const offT = dur + 0.03;
  const relTau = 0.15;
  const n = Math.ceil((offT + relTau * 9) * SR);
  const out = new Float64Array(n);
  const w = (TAU * f0) / SR;
  const i0 = 0.65 + 0.4 * vel;
  const i1 = 0.12;
  const dec = Math.exp(-1 / (tau * SR));
  const idec = Math.exp(-1 / (0.3 * SR));
  let env = 1;
  let ienv = 1;
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const index = i1 + (i0 - i1) * ienv;
    out[i] = env * Math.sin(ph + index * Math.sin(ph));
    ph += w;
    env *= dec;
    ienv *= idec;
  }
  shapeEnvelope(out, { attack: 0.004, offT, relTau });
  scaleInPlace(out, vel);
  fadeTail(out);
  return out;
}

// ---------------------------------------------------------------------------
// Glassy sparkle bell (additive, inharmonic). A slightly detuned twin of the fundamental
// produces a slow shimmer; upper partials are low-passed so nothing gets piercing.

export function bell({ midi, vel = 1, seed }) {
  const r = mulberry32(seed);
  const f0 = midiToHz(midi);
  const T = 1.7 * Math.pow(1500 / f0, 0.35);
  const n = Math.ceil(T * 6.5 * SR);
  const out = new Float64Array(n);
  const partials = [
    [1, 1, T],
    [1.0017, 0.4, T * 0.85],
    [2, 0.18, T * 0.4],
    [2.76, 0.1, T * 0.28],
    [4.07, 0.04, T * 0.12],
    [5.4, 0.015, T * 0.07],
  ];
  for (const [ratio, a, tau] of partials) {
    const phase = ratio === 1 ? 0 : TAU * r();
    addPartial(out, f0 * ratio, a * lowpassWeight(f0 * ratio, 6000), tau, phase);
  }
  shapeEnvelope(out, { attack: 0.003 });
  scaleInPlace(out, vel);
  fadeTail(out, 20);
  return out;
}

// ---------------------------------------------------------------------------
// Round bass: sine with a little 2nd/3rd harmonic so it still reads on small speakers.
// It is the only part with energy near the sub-bass, so the < 40 Hz clean-up happens here,
// per note, instead of on the master bus.

export function bass({ midi, vel = 1, dur }) {
  const f0 = midiToHz(midi);
  const offT = Math.max(0.05, dur - 0.03);
  const relTau = 0.07;
  const n = Math.ceil((offT + relTau * 9) * SR);
  const out = new Float64Array(n);
  addPartial(out, f0, 1, 2.2);
  addPartial(out, 2 * f0, 0.2, 0.9);
  addPartial(out, 3 * f0, 0.05, 0.5);
  shapeEnvelope(out, { attack: 0.02, offT, relTau });
  runBiquad(out, biquad('highpass', 40, 0.5412));
  runBiquad(out, biquad('highpass', 40, 1.3066));
  scaleInPlace(out, vel);
  fadeTail(out);
  return out;
}

// ---------------------------------------------------------------------------
// Warm pad: three detuned band-limited saw-ish oscillators per note (spread L / C / R),
// slow attack and release, through a state-variable low-pass whose cutoff opens gently.

const TABLE_N = 4096;
let padTable = null;

function getPadTable() {
  if (padTable) return padTable;
  const t = new Float64Array(TABLE_N + 1);
  for (let k = 1; k <= 40; k++) {
    const a = 1 / Math.pow(k, 1.25);
    for (let i = 0; i <= TABLE_N; i++) t[i] += a * Math.sin((TAU * k * i) / TABLE_N);
  }
  let peak = 0;
  for (let i = 0; i <= TABLE_N; i++) peak = Math.max(peak, Math.abs(t[i]));
  for (let i = 0; i <= TABLE_N; i++) t[i] /= peak;
  padTable = t;
  return t;
}

export function padNote({ midi, dur, seed, cutoff = 1200, attack = 0.8, relTau = 0.32 }) {
  const r = mulberry32(seed);
  const f0 = midiToHz(midi);
  const n = Math.ceil((dur + relTau * 9) * SR);
  const L = new Float64Array(n);
  const R = new Float64Array(n);
  const table = getPadTable();
  const voices = [
    { cents: -7, pan: -0.7 },
    { cents: 0.6, pan: 0.05 },
    { cents: 7.4, pan: 0.7 },
  ];
  for (const v of voices) {
    const inc = ((f0 * centsToRatio(v.cents + (r() - 0.5) * 1.5)) / SR) * TABLE_N;
    let ph = r() * TABLE_N;
    const [gl, gr] = panGains(v.pan);
    for (let i = 0; i < n; i++) {
      const ip = ph | 0;
      const s = table[ip] + (table[ip + 1] - table[ip]) * (ph - ip);
      L[i] += s * gl;
      R[i] += s * gr;
      ph += inc;
      if (ph >= TABLE_N) ph -= TABLE_N;
    }
  }
  // The release starts just before the chord change so a voice moving by a step crossfades
  // into its next note instead of rubbing against it.
  const nA = Math.round(attack * SR);
  const iOff = Math.round(Math.max(0.2, dur - 0.08) * SR);
  const dec = Math.exp(-1 / (relTau * SR));
  let rel = 1;
  for (let i = 0; i < n; i++) {
    let e = 1;
    if (i < nA) {
      const s = Math.sin((0.5 * Math.PI * i) / nA);
      e = s * s;
    }
    if (i >= iOff) {
      rel *= dec;
      e *= rel;
    }
    L[i] *= e;
    R[i] *= e;
  }
  const rise = 1.6 * SR;
  const cutoffAt = (i) => cutoff * (0.6 + 0.4 * Math.min(1, i / rise));
  svfLowpass(L, cutoffAt, 0.65);
  svfLowpass(R, cutoffAt, 0.65);
  fadeTail(L, 20);
  fadeTail(R, 20);
  return { L, R };
}

// ---------------------------------------------------------------------------
// Brushed shaker: one burst of seeded noise, band-limited to roughly 3–6.5 kHz.

export function shaker({ vel = 1, seed }) {
  const r = mulberry32(seed);
  const n = Math.round(0.12 * SR);
  const out = new Float64Array(n);
  const nA = Math.round(0.009 * SR);
  const dec = Math.exp(-1 / (0.026 * SR));
  let env = 1;
  for (let i = 0; i < n; i++) {
    let e;
    if (i < nA) e = raisedCos(i, nA);
    else e = env *= dec;
    out[i] = (r() * 2 - 1) * e;
  }
  runBiquad(out, biquad('highpass', 3000, 0.7));
  runBiquad(out, biquad('lowpass', 6500, 0.7));
  runBiquad(out, biquad('lowpass', 6500, 0.7));
  scaleInPlace(out, vel);
  fadeTail(out, 10);
  return out;
}
