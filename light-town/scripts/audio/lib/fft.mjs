// Radix-2 FFT and Welch power spectra for the analysis script.

const plans = new Map();

function plan(n) {
  let p = plans.get(n);
  if (p) return p;
  const bits = Math.log2(n);
  if (!Number.isInteger(bits)) throw new Error(`FFT size must be a power of two, got ${n}`);
  const rev = new Uint32Array(n);
  for (let i = 0; i < n; i++) {
    let r = 0;
    for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
    rev[i] = r;
  }
  const cos = new Float64Array(n / 2);
  const sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i++) {
    cos[i] = Math.cos((2 * Math.PI * i) / n);
    sin[i] = Math.sin((2 * Math.PI * i) / n);
  }
  p = { rev, cos, sin };
  plans.set(n, p);
  return p;
}

/** In-place forward complex FFT. */
export function fft(re, im) {
  const n = re.length;
  const { rev, cos, sin } = plan(n);
  for (let i = 0; i < n; i++) {
    const j = rev[i];
    if (j > i) {
      let t = re[i]; re[i] = re[j]; re[j] = t;
      t = im[i]; im[i] = im[j]; im[j] = t;
    }
  }
  for (let size = 2; size <= n; size <<= 1) {
    const half = size >> 1;
    const step = n / size;
    for (let i = 0; i < n; i += size) {
      for (let j = i, k = 0; j < i + half; j++, k += step) {
        const l = j + half;
        const tre = re[l] * cos[k] + im[l] * sin[k];
        const tim = im[l] * cos[k] - re[l] * sin[k];
        re[l] = re[j] - tre;
        im[l] = im[j] - tim;
        re[j] += tre;
        im[j] += tim;
      }
    }
  }
}

export function hann(n) {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
  return w;
}

/** Power spectrum (bins 0..n/2) of x[start, start+n) with a Hann window; zero-pads past the end. */
export function framePower(x, start, n, win = hann(n)) {
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const j = start + i;
    re[i] = j >= 0 && j < x.length ? x[j] * win[i] : 0;
  }
  fft(re, im);
  const p = new Float64Array(n / 2 + 1);
  for (let k = 0; k <= n / 2; k++) p[k] = re[k] * re[k] + im[k] * im[k];
  return p;
}

/** Welch-averaged power spectrum of x[from, to). Short signals get a single zero-padded frame. */
export function welch(x, n, from = 0, to = x.length, hop = n >> 1) {
  const win = hann(n);
  const acc = new Float64Array(n / 2 + 1);
  let frames = 0;
  for (let s = from; s + n <= to; s += hop) {
    const p = framePower(x, s, n, win);
    for (let k = 0; k < acc.length; k++) acc[k] += p[k];
    frames++;
  }
  if (frames === 0) {
    const p = framePower(x.subarray(from, to), 0, n, win);
    for (let k = 0; k < acc.length; k++) acc[k] = p[k];
    frames = 1;
  }
  for (let k = 0; k < acc.length; k++) acc[k] /= frames;
  return acc;
}
