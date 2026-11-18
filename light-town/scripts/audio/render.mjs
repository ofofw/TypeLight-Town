#!/usr/bin/env node
// Light Town (点亮小镇) audio renderer — composes and synthesises all game audio from code.
//
// Run from the project root (Node ≥ 22, built-in modules only):
//   node scripts/audio/render.mjs           render everything
//   node scripts/audio/render.mjs --stems   also print the level of each instrument group
//
// Produces (16-bit PCM, 44,100 Hz; the same command always writes bit-identical files):
//   .cache/audio/town-loop.wav      stereo background loop "Lantern Evening" with periodic padding:
//                                   [last 2 s of loop][16-bar loop, 2,352,000 samples][first 2 s]
//                                   play with offset = loopStart = 88200/44100, loopEnd = 2440200/44100
//   public/audio/sfx/correct.wav    mono sound effects
//   public/audio/sfx/error.wav
//   public/audio/sfx/complete.wav
//   public/audio/sfx/purchase.wav
//
// Check the results with: node scripts/audio/analyze.mjs [--plots]

import path from 'node:path';
import { SR, dbToGain, gainToDb, hash32 } from './lib/dsp.mjs';
import { writeWav16 } from './lib/wav.mjs';
import { renderMusic, LOOP, PRE, POST, TOTAL, GROUPS, BPM, BARS } from './music.mjs';
import { SFX, finalizeSfx } from './sfx.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const MUSIC_FILE = path.join(ROOT, '.cache', 'audio', 'town-loop.wav');
const SFX_DIR = path.join(ROOT, 'public', 'audio', 'sfx');

const TARGET_RMS_DB = -18.5;
const PEAK_CEILING_DB = -1.5;

const fmtDb = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)} dBFS`;

function loopRms(L, R) {
  let s = 0;
  for (let i = PRE; i < PRE + LOOP; i++) s += L[i] * L[i] + R[i] * R[i];
  return Math.sqrt(s / (2 * LOOP));
}

function peakOf(...chs) {
  let p = 0;
  for (const ch of chs) for (let i = 0; i < ch.length; i++) p = Math.max(p, Math.abs(ch[i]));
  return p;
}

/** Largest |x[i] − x[i + LOOP]| over the padded region (0 means exactly periodic). */
function periodicityError(...chs) {
  let worst = 0;
  for (const ch of chs) for (let i = 0; i < PRE + POST; i++) worst = Math.max(worst, Math.abs(ch[i] - ch[i + LOOP]));
  return worst;
}

// TPDF dither (±1 LSB) keyed by the position inside the loop cycle, so padding samples get
// exactly the same dither as the loop samples they duplicate.
function dither(pos, ch) {
  const k = pos * 4 + ch * 2;
  return (hash32(k + 0x51ed) + hash32(k + 0x51ee)) / 4294967296 - 1;
}

function quantizeMusic(x, gain, ch) {
  const q = new Int16Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const pos = (((i - PRE) % LOOP) + LOOP) % LOOP;
    const v = Math.round(x[i] * gain * 32768 + dither(pos, ch));
    q[i] = v > 32767 ? 32767 : v < -32768 ? -32768 : v;
  }
  return q;
}

function renderMusicFile() {
  const { L, R, stats, eventCount } = renderMusic();
  if (L.length !== TOTAL) throw new Error(`Music length ${L.length} != ${TOTAL}`);

  const floatErr = periodicityError(L, R);
  const rms = loopRms(L, R);
  let gain = dbToGain(TARGET_RMS_DB) / rms;
  const peak = peakOf(L, R);
  if (peak * gain > dbToGain(PEAK_CEILING_DB)) gain = dbToGain(PEAK_CEILING_DB) / peak;

  const qL = quantizeMusic(L, gain, 0);
  const qR = quantizeMusic(R, gain, 1);
  let mismatches = 0;
  for (let i = 0; i < PRE + POST; i++) {
    if (qL[i] !== qL[i + LOOP]) mismatches++;
    if (qR[i] !== qR[i + LOOP]) mismatches++;
  }
  if (mismatches) throw new Error(`Music padding is not periodic: ${mismatches} mismatching samples`);

  writeWav16(MUSIC_FILE, [qL, qR], SR);
  console.log(`music  ${path.relative(ROOT, MUSIC_FILE)}  (${eventCount} events/cycle, ${BPM} BPM, ${BARS} bars)`);
  console.log(`       frames ${TOTAL} = pre ${PRE} + loop ${LOOP} + post ${POST}  (${(TOTAL / SR).toFixed(3)} s)`);
  console.log(`       loop RMS ${fmtDb(TARGET_RMS_DB)} target -> gain ${gainToDb(gain).toFixed(2)} dB, peak ${fmtDb(gainToDb(peak * gain))}`);
  console.log(`       reverb return vs dry: ${(gainToDb(stats.wetRms) - gainToDb(stats.dryRms)).toFixed(1)} dB`);
  console.log(`       float periodicity error ${floatErr.toExponential(2)}, 16-bit padding mismatches ${mismatches}`);
  return gain;
}

function printStems(gain) {
  console.log('       instrument levels in the final mix (loop RMS, incl. their reverb):');
  for (const g of GROUPS) {
    const { L, R } = renderMusic({ groups: [g] });
    console.log(`         ${g.padEnd(7)} ${fmtDb(gainToDb(loopRms(L, R) * gain))}`);
  }
}

function renderSfxFiles() {
  for (const { name, render, fadeMs } of SFX) {
    const q = finalizeSfx(render(), { fadeMs });
    const file = path.join(SFX_DIR, `${name}.wav`);
    writeWav16(file, [q], SR);
    let peak = 0;
    let ss = 0;
    for (const v of q) {
      peak = Math.max(peak, Math.abs(v));
      ss += v * v;
    }
    const rms = Math.sqrt(ss / q.length) / 32768;
    console.log(
      `sfx    ${path.relative(ROOT, file).padEnd(30)} ${(q.length / SR).toFixed(3)} s  peak ${fmtDb(gainToDb(peak / 32768))}  RMS ${fmtDb(gainToDb(rms))}`,
    );
  }
}

const gain = renderMusicFile();
if (process.argv.includes('--stems')) printStems(gain);
renderSfxFiles();
