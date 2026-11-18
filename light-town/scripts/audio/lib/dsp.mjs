// Deterministic DSP building blocks shared by the Light Town music and SFX renderers.
// Plain double-precision math only: no Math.random, no clocks, no threads, so every
// run produces bit-identical output.

export const SR = 44100;
export const TAU = 2 * Math.PI;

export const midiToHz = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const dbToGain = (db) => Math.pow(10, db / 20);
export const gainToDb = (g) => (g > 0 ? 20 * Math.log10(g) : -Infinity);
export const centsToRatio = (c) => Math.pow(2, c / 1200);

const STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** 'A4' → 69, 'Bb3' → 58, 'F#5' → 78. */
export function noteToMidi(name) {
  const m = /^([A-G])([b#]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`Bad note name: ${name}`);
  const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  return STEPS[m[1]] + acc + (Number(m[3]) + 1) * 12;
}

/** Constant-power pan law: pan in [-1, 1] → [gainL, gainR]. */
export function panGains(pan) {
  const a = ((pan + 1) * Math.PI) / 4;
  return [Math.cos(a), Math.sin(a)];
}

// ---------------------------------------------------------------------------
// Seeded randomness

/** 32-bit integer finaliser ("lowbias32"). */
export function hash32(x) {
  x >>>= 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x >>> 0;
}

/** Hash a list of integers and/or strings into a 32-bit seed. */
export function hashSeed(...parts) {
  let h = 0x2545f491;
  for (const p of parts) {
    if (typeof p === 'string') {
      for (let i = 0; i < p.length; i++) h = hash32(h ^ p.charCodeAt(i));
    } else {
      if (!Number.isInteger(p)) throw new Error(`hashSeed expects integers or strings, got ${p}`);
      h = hash32(h ^ (p >>> 0));
      h = hash32(h ^ (Math.floor(p / 4294967296) >>> 0));
    }
    h = hash32(h + 0x9e3779b9);
  }
  return h;
}

/** mulberry32 PRNG: returns a function yielding floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rngFor = (...parts) => mulberry32(hashSeed(...parts));

// ---------------------------------------------------------------------------
// Filters

/** RBJ audio-EQ-cookbook biquad coefficients, normalised so that a0 = 1. */
export function biquad(type, f0, q = Math.SQRT1_2, gainDb = 0, sr = SR) {
  const w0 = (TAU * f0) / sr;
  const cw = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'lowpass':
      b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = b0;
      a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = b0;
      a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
      break;
    case 'bandpass':
      b0 = alpha; b1 = 0; b2 = -alpha;
      a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
      break;
    case 'peaking':
      b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A;
      a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
      break;
    case 'highshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 + (A - 1) * cw + s);
      b1 = -2 * A * (A - 1 + (A + 1) * cw);
      b2 = A * (A + 1 + (A - 1) * cw - s);
      a0 = A + 1 - (A - 1) * cw + s;
      a1 = 2 * (A - 1 - (A + 1) * cw);
      a2 = A + 1 - (A - 1) * cw - s;
      break;
    }
    case 'lowshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 - (A - 1) * cw + s);
      b1 = 2 * A * (A - 1 - (A + 1) * cw);
      b2 = A * (A + 1 - (A - 1) * cw - s);
      a0 = A + 1 + (A - 1) * cw + s;
      a1 = -2 * (A - 1 + (A + 1) * cw);
      a2 = A + 1 + (A - 1) * cw - s;
      break;
    }
    default:
      throw new Error(`Unknown biquad type: ${type}`);
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/** Run a biquad over buf[from, to) in place (transposed direct form II, zero initial state). */
export function runBiquad(buf, c, from = 0, to = buf.length) {
  const { b0, b1, b2, a1, a2 } = c;
  let z1 = 0;
  let z2 = 0;
  for (let i = from; i < to; i++) {
    const x = buf[i];
    const y = b0 * x + z1;
    z1 = b1 * x - a1 * y + z2;
    z2 = b2 * x - a2 * y;
    buf[i] = y;
  }
}

/** Magnitude response of an n-th order Butterworth low-pass at f; used to tilt additive spectra. */
export function lowpassWeight(f, fc, order = 2) {
  return 1 / Math.sqrt(1 + Math.pow(f / fc, 2 * order));
}

/** Topology-preserving state-variable low-pass with a time-varying cutoff cutoffAt(i) in Hz. */
export function svfLowpass(buf, cutoffAt, q = Math.SQRT1_2, block = 32, sr = SR) {
  const k = 1 / q;
  let ic1 = 0;
  let ic2 = 0;
  let a1 = 0;
  let a2 = 0;
  let a3 = 0;
  for (let i = 0; i < buf.length; i++) {
    if (i % block === 0) {
      const fc = Math.min(cutoffAt(i), sr * 0.45);
      const g = Math.tan((Math.PI * fc) / sr);
      a1 = 1 / (1 + g * (g + k));
      a2 = g * a1;
      a3 = g * a2;
    }
    const v3 = buf[i] - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    buf[i] = v2;
  }
}

// ---------------------------------------------------------------------------
// Reverb: Freeverb (Jezar at Dreampoint, public domain), 8 parallel damped combs + 4 series
// allpasses per channel. The combs are independent LTI filters, so each one is run over the
// whole input in a tight loop; the result is identical to the classic per-sample formulation.

const COMB_TUNING = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASS_TUNING = [556, 441, 341, 225];
const STEREO_SPREAD = 23;

function combInto(input, out, len, feedback, damp1, damp2) {
  const buf = new Float64Array(len);
  let idx = 0;
  let store = 0;
  for (let i = 0; i < input.length; i++) {
    const o = buf[idx];
    store = o * damp2 + store * damp1;
    buf[idx] = input[i] + store * feedback;
    if (++idx === len) idx = 0;
    out[i] += o;
  }
}

function allpassInPlace(io, len, feedback = 0.5) {
  const buf = new Float64Array(len);
  let idx = 0;
  for (let i = 0; i < io.length; i++) {
    const bo = buf[idx];
    const x = io[i];
    io[i] = bo - x;
    buf[idx] = x + bo * feedback;
    if (++idx === len) idx = 0;
  }
}

/** Mono in → stereo wet out ({L, R}). Input should already carry Freeverb's fixed gain (≈0.015). */
export function freeverb(input, { roomSize = 0.5, damp = 0.5, width = 1, sr = SR } = {}) {
  const scale = sr / 44100;
  const feedback = roomSize * 0.28 + 0.7;
  const damp1 = damp * 0.4;
  const damp2 = 1 - damp1;
  const n = input.length;
  const L = new Float64Array(n);
  const R = new Float64Array(n);
  for (const t of COMB_TUNING) {
    combInto(input, L, Math.round(t * scale), feedback, damp1, damp2);
    combInto(input, R, Math.round((t + STEREO_SPREAD) * scale), feedback, damp1, damp2);
  }
  for (const t of ALLPASS_TUNING) {
    allpassInPlace(L, Math.round(t * scale));
    allpassInPlace(R, Math.round((t + STEREO_SPREAD) * scale));
  }
  const wet1 = width / 2 + 0.5;
  const wet2 = (1 - width) / 2;
  for (let i = 0; i < n; i++) {
    const l = L[i];
    const r = R[i];
    L[i] = l * wet1 + r * wet2;
    R[i] = r * wet1 + l * wet2;
  }
  return { L, R };
}
