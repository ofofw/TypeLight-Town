#!/usr/bin/env node
// Light Town (点亮小镇) audio analysis — objective checks for the rendered music and SFX.
//
// Run from the project root after `node scripts/audio/render.mjs`:
//   node scripts/audio/analyze.mjs            analyse the default files, exit 1 if any check fails
//   node scripts/audio/analyze.mjs --plots    also write waveform/spectrogram PNGs to .cache/audio/plots/
//   node scripts/audio/analyze.mjs some.wav   analyse specific files
//
// Per file: duration, sample rate/channels, sample peak and ≈true peak, RMS, DC offset, crest
// factor, spectral centroid, band energies, dominant frequency, leading silence, attack time,
// end fade and clipping. For the music additionally: bit-exact periodicity of the padding
// (sample[i] === sample[i + loop] for every i < pre + post, both channels), the sample step at
// the loop seam versus the distribution of steps inside the loop, and per-bar loudness.

import path from 'node:path';
import fs from 'node:fs';
import { readWav16 } from './lib/wav.mjs';
import { welch, framePower, hann } from './lib/fft.mjs';
import { Canvas, drawWaveform, drawSpectrogram } from './lib/png.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PLOT_DIR = path.join(ROOT, '.cache', 'audio', 'plots');

const LOOP = { pre: 88200, loop: 2352000, post: 88200, bars: 16 };

const SPECS = {
  'town-loop.wav': { kind: 'music' },
  'correct.wav': { kind: 'sfx', dur: [0.15, 0.25], f0: [1000, 1400], attackMs: 1.0, leadMs: 2 },
  'error.wav': { kind: 'sfx', dur: [0.2, 0.3], f0: [200, 330], leadMs: 2 },
  'complete.wav': { kind: 'sfx', dur: [1.0, 1.5], leadMs: 2 },
  'purchase.wav': { kind: 'sfx', dur: [0.5, 0.8], leadMs: 2 },
};

const DEFAULT_FILES = [
  '.cache/audio/town-loop.wav',
  'public/audio/sfx/correct.wav',
  'public/audio/sfx/error.wav',
  'public/audio/sfx/complete.wav',
  'public/audio/sfx/purchase.wav',
];

const db = (v) => (v > 0 ? 20 * Math.log10(v) : -Infinity);
const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : String(v));
const ms = (samples, sr) => (samples * 1000) / sr;

let failures = 0;
function check(ok, label, detail) {
  if (!ok) failures++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? `  (${detail})` : ''}`);
}

function toFloat(ch) {
  const f = new Float64Array(ch.length);
  for (let i = 0; i < ch.length; i++) f[i] = ch[i] / 32768;
  return f;
}

function monoMix(chs) {
  if (chs.length === 1) return chs[0];
  const m = new Float64Array(chs[0].length);
  for (const c of chs) for (let i = 0; i < m.length; i++) m[i] += c[i] / chs.length;
  return m;
}

// ≈ true peak: 4× oversampling with a 32-tap Hann-windowed sinc, evaluated around loud samples.
function truePeak(x, samplePeak) {
  const taps = 16;
  const kernels = [0.25, 0.5, 0.75].map((frac) => {
    const k = new Float64Array(2 * taps);
    for (let j = -taps + 1; j <= taps; j++) {
      const t = j - frac;
      const sinc = Math.sin(Math.PI * t) / (Math.PI * t);
      const w = 0.5 + 0.5 * Math.cos((Math.PI * t) / (taps + 1));
      k[j + taps - 1] = sinc * w;
    }
    return k;
  });
  let tp = samplePeak;
  const thresh = 0.5 * samplePeak;
  for (let n = taps; n < x.length - taps - 1; n++) {
    if (Math.abs(x[n]) < thresh && Math.abs(x[n + 1]) < thresh) continue;
    for (const k of kernels) {
      let s = 0;
      for (let j = -taps + 1; j <= taps; j++) s += x[n + j] * k[j + taps - 1];
      tp = Math.max(tp, Math.abs(s));
    }
  }
  return tp;
}

function basicStats(chs, from, to) {
  let peak = 0;
  let ss = 0;
  let clip = 0;
  const dc = [];
  for (const c of chs) {
    let sum = 0;
    for (let i = from; i < to; i++) {
      const v = c[i];
      sum += v;
      ss += v * v;
      const a = Math.abs(v);
      if (a > peak) peak = a;
      if (v >= 32767 || v <= -32768) clip++;
    }
    dc.push(sum / (to - from) / 32768);
  }
  return { peak: peak / 32768, rms: Math.sqrt(ss / ((to - from) * chs.length)) / 32768, dc, clip };
}

function spectrum(mono, sr, from, to, n) {
  const p = welch(mono, n, from, to);
  const binHz = sr / n;
  let total = 0;
  let moment = 0;
  for (let k = 1; k < p.length; k++) {
    total += p[k];
    moment += p[k] * k * binHz;
  }
  const band = (lo, hi) => {
    let s = 0;
    for (let k = 1; k < p.length; k++) {
      const f = k * binHz;
      if (f >= lo && f < hi) s += p[k];
    }
    return 10 * Math.log10(s / total + 1e-30);
  };
  const bands = [
    ['<40', band(0, 40)],
    ['40-200', band(40, 200)],
    ['200-1k', band(200, 1000)],
    ['1k-4k', band(1000, 4000)],
    ['4k-8k', band(4000, 8000)],
    ['>8k', band(8000, sr / 2 + 1)],
  ];
  return { centroid: moment / total, bands, below40: bands[0][1], above8k: bands[5][1] };
}

function dominantFrequency(mono, sr, from, to) {
  const n = 32768;
  const len = Math.min(to - from, n);
  const win = hann(len);
  const seg = new Float64Array(n);
  for (let i = 0; i < len; i++) seg[i] = mono[from + i] * win[i];
  const p = framePower(seg, 0, n, new Float64Array(n).fill(1));
  let best = 1;
  for (let k = 2; k < p.length - 1; k++) if (p[k] > p[best]) best = k;
  const a = p[best - 1];
  const b = p[best];
  const c = p[best + 1];
  const delta = (0.5 * (a - c)) / (a - 2 * b + c || 1);
  return ((best + delta) * sr) / n;
}

function firstAbove(chs, level) {
  const t = level * 32768;
  let first = Infinity;
  for (const c of chs) {
    for (let i = 0; i < c.length; i++) {
      if (Math.abs(c[i]) >= t) {
        first = Math.min(first, i);
        break;
      }
    }
  }
  return first;
}

function printCommon(name, wav, st, sp, sr, frames, regionLabel) {
  const nch = wav.channels.length;
  console.log(`\n== ${name} ==`);
  console.log(`  format        ${sr} Hz, ${nch} ch, ${wav.bitsPerSample}-bit PCM, ${frames} frames = ${fmt(frames / sr, 3)} s`);
  console.log(`  peak          ${fmt(db(st.peak))} dBFS sample, ${fmt(db(st.truePeak))} dBFS ≈true (4× oversampled)`);
  console.log(`  RMS           ${fmt(db(st.rms))} dBFS ${regionLabel}, crest factor ${fmt(db(st.peak / st.rms), 1)} dB`);
  console.log(`  DC offset     ${st.dc.map((d) => d.toExponential(2)).join(' / ')} of full scale (${fmt(db(Math.max(...st.dc.map(Math.abs))), 1)} dBFS)`);
  console.log(`  centroid      ${fmt(sp.centroid, 0)} Hz`);
  console.log(`  bands         ${sp.bands.map(([b, v]) => `${b} ${fmt(v, 1)}`).join(' | ')}  (dB re total)`);
  console.log(`  clipping      ${st.clip} samples at full scale`);
}

function analyzeMusic(file, wav) {
  const sr = wav.sampleRate;
  const chs = wav.channels;
  const frames = chs[0].length;
  const { pre, loop, post, bars } = LOOP;
  const fl = chs.map(toFloat);
  const mono = monoMix(fl);
  const st = basicStats(chs, pre, pre + loop);
  st.truePeak = Math.max(...fl.map((c) => truePeak(c, st.peak)));
  const whole = basicStats(chs, 0, frames);
  const sp = spectrum(mono, sr, pre, pre + loop, 8192);
  const lead = firstAbove(chs, Math.pow(10, -60 / 20));
  printCommon(path.relative(ROOT, file), wav, st, sp, sr, frames, `(loop region; whole file ${fmt(db(whole.rms))} dBFS)`);
  console.log(`  lead. silence ${fmt(ms(lead, sr), 2)} ms (first sample above -60 dBFS)`);

  // periodicity of the padding
  let mismatches = 0;
  let firstBad = -1;
  for (let i = 0; i < pre + post; i++) {
    for (const c of chs) {
      if (c[i] !== c[i + loop]) {
        mismatches++;
        if (firstBad < 0) firstBad = i;
      }
    }
  }
  console.log(`  loop          pre ${pre} + loop ${loop} + post ${post} samples; loopStart ${fmt(pre / sr, 6)} s, loopEnd ${fmt((pre + loop) / sr, 6)} s`);
  console.log(`  periodicity   compared ${(pre + post) * chs.length} samples: ${mismatches} mismatches${firstBad >= 0 ? ` (first at ${firstBad})` : ''}`);

  // continuity at the seam: playback goes x[pre+loop-1] → x[pre]
  const seam = chs.map((c) => Math.abs(c[pre] - c[pre + loop - 1]));
  const hist = new Uint32Array(65536);
  let maxStep = 0;
  let count = 0;
  for (const c of chs) {
    for (let i = pre + 1; i < pre + loop; i++) {
      const d = Math.abs(c[i] - c[i - 1]);
      hist[d]++;
      count++;
      if (d > maxStep) maxStep = d;
    }
  }
  const pct = (q) => {
    let acc = 0;
    for (let d = 0; d < hist.length; d++) {
      acc += hist[d];
      if (acc >= q * count) return d;
    }
    return maxStep;
  };
  const rank = (v) => {
    let acc = 0;
    for (let d = 0; d < v; d++) acc += hist[d];
    return (100 * acc) / count;
  };
  const median = pct(0.5);
  const p99 = pct(0.99);
  const p999 = pct(0.999);
  const W = Math.round(0.01 * sr);
  let localMax = 0;
  for (const c of chs) {
    const seq = [];
    for (let i = pre + loop - W; i < pre + loop; i++) seq.push(c[i]);
    for (let i = pre; i < pre + W; i++) seq.push(c[i]);
    for (let i = 1; i < seq.length; i++) localMax = Math.max(localMax, Math.abs(seq[i] - seq[i - 1]));
  }
  // what a decoder offset of d samples would see at the seam vs. the natural step there
  let offsetWorst = 0;
  for (const d of [-4096, -2112, -1024, 0, 1024, 2112, 4096]) {
    for (const c of chs) {
      const jump = Math.abs(c[pre + d] - c[pre + loop - 1 + d]);
      const natural = Math.abs(c[pre + d] - c[pre + d - 1]);
      offsetWorst = Math.max(offsetWorst, Math.abs(jump - natural));
    }
  }
  console.log(`  seam step     L ${seam[0]} / R ${seam[1]} LSB (percentile ${fmt(rank(Math.max(...seam)), 1)} of in-loop steps)`);
  console.log(`  in-loop steps median ${median}, p99 ${p99}, p99.9 ${p999}, max ${maxStep} LSB; max step within ±10 ms of seam ${localMax} LSB`);
  console.log(`  decoder offset ±4096 samples: seam jump differs from the natural step by at most ${offsetWorst} LSB`);

  // stereo balance / mono compatibility
  let sLL = 0;
  let sRR = 0;
  let sLR = 0;
  for (let i = pre; i < pre + loop; i++) {
    sLL += fl[0][i] * fl[0][i];
    sRR += fl[1][i] * fl[1][i];
    sLR += fl[0][i] * fl[1][i];
  }
  const corr = sLR / Math.sqrt(sLL * sRR);
  console.log(`  stereo        L ${fmt(db(Math.sqrt(sLL / loop)))} / R ${fmt(db(Math.sqrt(sRR / loop)))} dBFS RMS, L/R correlation ${fmt(corr, 3)}`);

  // onset sharpness: largest rise of the 10 ms RMS envelope from one window to the next
  const win = Math.round(0.01 * sr);
  let prevDb = null;
  let maxRise = 0;
  for (let s = pre; s + win <= pre + loop; s += win) {
    let e = 0;
    for (let i = s; i < s + win; i++) e += mono[i] * mono[i];
    const d = 10 * Math.log10(e / win + 1e-12);
    if (prevDb !== null) maxRise = Math.max(maxRise, d - prevDb);
    prevDb = d;
  }
  console.log(`  onsets        largest 10 ms loudness rise ${fmt(maxRise, 1)} dB`);

  // per-bar loudness
  const barLen = loop / bars;
  const barDb = [];
  for (let b = 0; b < bars; b++) {
    const s = basicStats(chs, pre + b * barLen, pre + (b + 1) * barLen);
    barDb.push(db(s.rms));
  }
  console.log(`  bar RMS (dB)  ${barDb.map((v) => fmt(v, 1)).join(' ')}`);
  const lastToFirst = Math.abs(barDb[bars - 1] - barDb[0]);

  check(sr === 44100 && chs.length === 2 && wav.bitsPerSample === 16, 'format 44,100 Hz / stereo / 16-bit');
  check(frames === pre + loop + post, `length ${frames} = ${pre} + ${loop} + ${post} samples`);
  check(loop === 64 * 36750, 'loop = 64 beats at 72 BPM = 2,352,000 samples');
  check(mismatches === 0, 'padding bit-exactly periodic (sample[i] === sample[i + loop])');
  check(Math.max(...seam) <= maxStep && localMax <= maxStep, 'seam step no larger than the largest step inside the loop', `${Math.max(...seam)} vs ${maxStep} LSB`);
  check(db(st.peak) <= -1.0, 'sample peak ≤ -1.0 dBFS', `${fmt(db(st.peak))}`);
  check(db(st.truePeak) <= -1.0, '≈true peak ≤ -1.0 dBFS', `${fmt(db(st.truePeak))}`);
  check(db(st.rms) >= -20 && db(st.rms) <= -17, 'loop RMS within -20…-17 dBFS', `${fmt(db(st.rms))}`);
  check(Math.max(...st.dc.map(Math.abs)) < 1e-3, 'DC offset below -60 dBFS');
  check(whole.clip === 0, 'no clipped samples');
  check(sp.below40 < -40, 'energy below 40 Hz < -40 dB re total', `${fmt(sp.below40, 1)} dB`);
  check(sp.above8k < -30, 'energy above 8 kHz < -30 dB re total (faint sparkle only)', `${fmt(sp.above8k, 1)} dB`);
  check(lastToFirst < 3, 'bar 16 and bar 1 loudness within 3 dB', `${fmt(lastToFirst, 1)} dB`);
  check(maxRise < 10, 'no sharp transients (10 ms loudness never jumps by 10 dB or more)', `${fmt(maxRise, 1)} dB`);
  check(corr > 0.5 && corr < 0.98, 'slight stereo width, mono-compatible (0.5 < L/R correlation < 0.98)', `${fmt(corr, 3)}`);
  return { mono, fl, sr };
}

function analyzeSfx(file, wav, spec) {
  const sr = wav.sampleRate;
  const chs = wav.channels;
  const frames = chs[0].length;
  const fl = chs.map(toFloat);
  const mono = monoMix(fl);
  const st = basicStats(chs, 0, frames);
  st.truePeak = Math.max(...fl.map((c) => truePeak(c, st.peak)));
  const sp = spectrum(mono, sr, 0, frames, 1024);
  const f0 = dominantFrequency(mono, sr, 0, frames);
  const lead = firstAbove(chs, Math.pow(10, -60 / 20));
  const attack = firstAbove(chs, st.peak * 0.5);
  const last = chs.map((c) => c[c.length - 1]);
  const tail = basicStats(chs, frames - Math.round(0.002 * sr), frames);
  const fadeRef = basicStats(chs, frames - Math.round(0.05 * sr), frames - Math.round(0.03 * sr));
  printCommon(path.relative(ROOT, file), wav, st, sp, sr, frames, '(whole file)');
  console.log(`  dominant      ${fmt(f0, 1)} Hz`);
  console.log(`  lead. silence ${fmt(ms(lead, sr), 3)} ms (first sample above -60 dBFS); reaches -6 dB re peak at ${fmt(ms(attack, sr), 3)} ms`);
  console.log(`  ending        last sample ${last.join('/')}, last 2 ms peak ${fmt(db(tail.peak), 1)} dBFS (vs ${fmt(db(fadeRef.peak), 1)} dBFS 30–50 ms before the end)`);

  const dur = frames / sr;
  check(sr === 44100 && chs.length === 1 && wav.bitsPerSample === 16, 'format 44,100 Hz / mono / 16-bit');
  check(dur >= spec.dur[0] && dur <= spec.dur[1], `duration within ${spec.dur[0]}–${spec.dur[1]} s`, `${fmt(dur, 3)} s`);
  check(db(st.peak) >= -3.5 && db(st.peak) <= -2.5, 'peak ≈ -3 dBFS', `${fmt(db(st.peak))}`);
  check(db(st.truePeak) <= -1.0, '≈true peak ≤ -1.0 dBFS', `${fmt(db(st.truePeak))}`);
  check(ms(lead, sr) <= spec.leadMs, `no leading silence (starts within ${spec.leadMs} ms)`, `${fmt(ms(lead, sr), 3)} ms`);
  if (spec.attackMs) check(ms(attack, sr) <= spec.attackMs, `attack within ${spec.attackMs} ms`, `${fmt(ms(attack, sr), 3)} ms`);
  check(last.every((v) => v === 0) && tail.peak < fadeRef.peak, 'fades out to exactly zero');
  check(Math.max(...st.dc.map(Math.abs)) < 1e-3, 'DC offset below -60 dBFS');
  check(st.clip === 0, 'no clipped samples');
  if (spec.f0) check(f0 >= spec.f0[0] && f0 <= spec.f0[1], `dominant frequency within ${spec.f0[0]}–${spec.f0[1]} Hz`, `${fmt(f0, 1)} Hz`);
  return { mono, fl, sr };
}

function plotFile(name, kind, { mono, fl, sr }) {
  const base = path.basename(name, '.wav');
  if (kind === 'music') {
    const { pre, loop } = LOOP;
    const cv = new Canvas(1400, 560);
    drawWaveform(cv, mono, 0, 160, { markers: [pre, pre + loop] });
    drawSpectrogram(cv, mono, sr, 170, 390, { n: 4096, markers: [pre, pre + loop] });
    cv.save(path.join(PLOT_DIR, `${base}.png`));

    // 4-bar close-ups preceded by the bar before them (read cyclically, so bars 16→1 show the seam)
    const barLen = loop / LOOP.bars;
    for (const firstBar of [1, 9]) {
      const seg = new Float64Array(5 * barLen);
      const start = (firstBar - 2) * barLen;
      for (let i = 0; i < seg.length; i++) seg[i] = mono[pre + ((((start + i) % loop) + loop) % loop)];
      const zoom = new Canvas(1400, 520);
      const marks = [1, 2, 3, 4].map((b) => b * barLen);
      drawWaveform(zoom, seg, 0, 120, { markers: marks });
      drawSpectrogram(zoom, seg, sr, 130, 390, { n: 4096, fMin: 60, fMax: 8000, range: 80, markers: marks });
      zoom.save(path.join(PLOT_DIR, `${base}-bars${firstBar}-${firstBar + 3}.png`));
    }

    // the seam as the player hears it: end of the loop followed by its start
    const W = Math.round(0.03 * sr);
    const seamCv = new Canvas(1200, 420);
    fl.forEach((c, k) => {
      const seq = new Float64Array(2 * W);
      for (let i = 0; i < W; i++) {
        seq[i] = c[pre + loop - W + i];
        seq[W + i] = c[pre + i];
      }
      let peak = 1e-9;
      for (const v of seq) peak = Math.max(peak, Math.abs(v));
      for (let i = 0; i < seq.length; i++) seq[i] /= peak * 1.05;
      drawWaveform(seamCv, seq, k * 210, 200, { markers: [W], color: k ? [255, 190, 120] : [120, 200, 255] });
    });
    seamCv.save(path.join(PLOT_DIR, `${base}-seam.png`));
  } else {
    const cv = new Canvas(1000, 460);
    let peak = 1e-9;
    for (const v of mono) peak = Math.max(peak, Math.abs(v));
    drawWaveform(cv, mono.map((v) => v / peak), 0, 150);
    drawSpectrogram(cv, mono, sr, 160, 300, { n: 512, fMin: 60, fMax: 20000, range: 80 });
    cv.save(path.join(PLOT_DIR, `${base}.png`));
  }
}

const args = process.argv.slice(2);
const plots = args.includes('--plots');
const files = args.filter((a) => !a.startsWith('--'));
const targets = (files.length ? files : DEFAULT_FILES).map((f) => path.resolve(ROOT, f));

for (const file of targets) {
  if (!fs.existsSync(file)) {
    console.log(`\n== ${path.relative(ROOT, file)} ==`);
    check(false, 'file exists');
    continue;
  }
  const spec = SPECS[path.basename(file)] ?? { kind: 'sfx', dur: [0, Infinity], leadMs: 2 };
  const wav = readWav16(file);
  const res = spec.kind === 'music' ? analyzeMusic(file, wav) : analyzeSfx(file, wav, spec);
  if (plots) plotFile(file, spec.kind, res);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}${plots ? `; plots in ${path.relative(ROOT, PLOT_DIR)}/` : ''}`);
process.exitCode = failures === 0 ? 0 : 1;
