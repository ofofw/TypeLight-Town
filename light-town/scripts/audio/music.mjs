// "Lantern Evening" — the 16-bar background loop of 点亮小镇: score, arrangement and mixdown.
//
// F major, 72 BPM, 4/4. Bars 1–8 (A): two 4-bar phrases, the first ending on a C9sus4 half
// cadence, the second on Fmaj7. Bars 9–16 (B): IV–V/IV–iii–vi then ii–iii–IV–V9sus4→V7, whose
// rising bass G–A–B♭–C and the melody's E–D–C descent lead straight back into bar 1.
//
// Seamless-loop strategy: every score event has an integer start sample inside the cycle and
// its samples depend only on its own parameters and a seed derived from its position in the
// cycle. The renderer lays out three identical cycles (tails ringing into the next cycle),
// runs the reverb continuously over all three, and extracts [LOOP − PRE, 2·LOOP + POST).
// By the end of the first cycle the reverb state has converged (bit for bit) to the
// periodic steady state, so the padding equals the opposite end of the loop sample for sample.

import { SR, noteToMidi, midiToHz, panGains, hashSeed, rngFor, biquad, runBiquad, freeverb } from './lib/dsp.mjs';
import { celesta, epiano, bell, bass, padNote, shaker } from './lib/instruments.mjs';

export const BPM = 72;
export const BEAT = (SR * 60) / BPM; // 36,750 samples
export const EIGHTH = BEAT / 2; // 18,375 samples
export const BAR = 4 * BEAT; // 147,000 samples
export const BARS = 16;
export const LOOP = BARS * BAR; // 2,352,000 samples = 53.333… s
export const PRE = 2 * SR; // 88,200 samples
export const POST = 2 * SR; // 88,200 samples
export const TOTAL = PRE + LOOP + POST; // 2,528,400 samples

// ---------------------------------------------------------------------------
// Harmony: [chord, beats] per bar.

const CHORDS = [
  [['Fadd9', 4]], [['Bbmaj7', 4]], [['Am7', 4]], [['Gm7', 2], ['C9sus4', 2]],
  [['Fadd9', 4]], [['Bbmaj7', 4]], [['Gm7', 2], ['C9sus4', 2]], [['Fmaj7', 4]],
  [['Bbmaj7', 4]], [['C/Bb', 4]], [['Am7', 4]], [['Dm7', 4]],
  [['Gm7', 4]], [['Am7', 4]], [['Bbmaj7', 4]], [['C9sus4', 2], ['C7', 2]],
];

// Close, smoothly voice-led pad voicings (A3–A4); each column is one pad voice.
const PAD_VOICING = {
  Fadd9: ['A3', 'C4', 'F4', 'G4'],
  Bbmaj7: ['Bb3', 'D4', 'F4', 'A4'],
  Am7: ['A3', 'C4', 'E4', 'G4'],
  Gm7: ['Bb3', 'D4', 'F4', 'G4'],
  C9sus4: ['Bb3', 'D4', 'F4', 'G4'],
  Fmaj7: ['A3', 'C4', 'E4', 'A4'],
  'C/Bb': ['Bb3', 'C4', 'E4', 'G4'],
  Dm7: ['A3', 'C4', 'F4', 'A4'],
  C7: ['Bb3', 'D4', 'E4', 'G4'],
};

// Broken-chord tones for the electric piano, low to high.
const ARP_VOICING = {
  Fadd9: ['F3', 'C4', 'G4', 'A4'],
  Bbmaj7: ['F3', 'Bb3', 'D4', 'A4'],
  Am7: ['E3', 'A3', 'C4', 'G4'],
  Gm7: ['G3', 'Bb3', 'D4', 'F4'],
  C9sus4: ['G3', 'C4', 'D4', 'F4'],
  Fmaj7: ['F3', 'A3', 'C4', 'E4'],
  'C/Bb': ['G3', 'Bb3', 'C4', 'E4'],
  Dm7: ['D3', 'A3', 'C4', 'F4'],
  C7: ['G3', 'Bb3', 'C4', 'E4'],
};

// Melody (celesta), one string per bar, durations in eighth notes, 'r' = rest.
const MELODY = [
  'A4:1 C5:1 F5:2 G5:4',
  'A5:2 G5:1 F5:1 D5:4',
  'E5:2 G5:1 A5:1 C6:2 A5:2',
  'G5:3 F5:1 G5:4',
  'A4:1 C5:1 F5:2 A5:2 G5:2',
  'F5:2 D5:1 F5:1 A5:4',
  'Bb5:2 A5:1 G5:1 F5:2 G5:2',
  'F5:4 r:2 C5:1 D5:1',
  'F5:2 A5:2 C6:4',
  'Bb5:2 A5:1 G5:1 E5:4',
  'E5:1 F5:1 G5:2 A5:2 C6:2',
  'D6:2 C6:1 A5:1 F5:4',
  'D5:1 F5:1 G5:2 Bb5:2 A5:2',
  'A5:3 G5:1 E5:4',
  'D5:1 F5:1 A5:2 G5:1 F5:1 D5:2',
  'G5:3 F5:1 E5:2 D5:1 C5:1',
];

const BASS_LINE = [
  'F2:6 C3:2', 'Bb2:6 F2:2', 'A2:6 E2:2', 'G2:4 C3:4',
  'F2:6 C3:2', 'Bb2:6 F2:2', 'G2:4 C3:4', 'F2:6 A2:2',
  'Bb2:6 F2:2', 'Bb2:6 C3:2', 'A2:6 C3:2', 'D3:6 A2:2',
  'G2:6 Bb2:2', 'A2:6 C3:2', 'Bb2:6 F2:2', 'C3:4 G2:2 E2:2',
];

// Sparkle bells placed where the melody holds or rests: [bar (1-based), eighth, note, velocity].
const BELLS = [
  [1, 6, 'C7', 0.5],
  [2, 5, 'A6', 0.45],
  [4, 5, 'G6', 0.5], [4, 6, 'D7', 0.42],
  [6, 5, 'F6', 0.45], [6, 6, 'A6', 0.45], [6, 7, 'D7', 0.38],
  [8, 4, 'C7', 0.5], [8, 5, 'A6', 0.45], [8, 6, 'F6', 0.42],
  [9, 6, 'D7', 0.42],
  [10, 6, 'G6', 0.45], [10, 7, 'C7', 0.38],
  [12, 5, 'A6', 0.45], [12, 6, 'F6', 0.4],
  [14, 6, 'C7', 0.42], [14, 7, 'G6', 0.36],
];

// Dynamics: bar inside a 4-bar phrase, and phrase inside the loop.
const PHRASE_SHAPE = [0.93, 1.0, 0.98, 0.9];
const PHRASE_GAIN = [0.97, 1.0, 1.04, 0.97];

export const MIX = {
  lead: { gain: 0.25, pan: -0.12, send: 0.3 },
  arp: { gain: 0.11, pan: 0.3, send: 0.3 },
  pad: { gain: 0.033, pan: 0, send: 0.45 },
  bass: { gain: 0.19, pan: 0, send: 0.05 },
  bell: { gain: 0.065, pan: 0, send: 0.7 },
  shaker: { gain: 0.45, pan: 0.3, send: 0.15 },
};

export const REVERB = { roomSize: 0.8, damp: 0.5, width: 0.9, preDelay: 0.022, wet: 2.0, inHP: 160, inLP: 6000 };

// ---------------------------------------------------------------------------
// Score → events. Every event: { group, start (sample inside the cycle), gain, pan, send,
// stereo?, render() }. Randomness (timing, velocity, noise, phases) is seeded by the event's
// position inside the cycle, never by a running generator.

function parseLine(line, what) {
  const notes = line
    .trim()
    .split(/\s+/)
    .map((tok) => {
      const [name, len] = tok.split(':');
      return { midi: name === 'r' ? null : noteToMidi(name), len: Number(len) };
    });
  const sum = notes.reduce((a, n) => a + n.len, 0);
  if (sum !== 8) throw new Error(`${what}: bar has ${sum} eighths instead of 8 (${line})`);
  return notes;
}

function chordAt(bar, eighth) {
  let pos = 0;
  for (const [sym, beats] of CHORDS[bar]) {
    pos += beats * 2;
    if (eighth < pos) return sym;
  }
  throw new Error(`No chord at bar ${bar + 1}, eighth ${eighth}`);
}

/** Eighths from `eighth` to the end of the chord that is sounding there. */
function eighthsToChordChange(bar, eighth) {
  let pos = 0;
  for (const [, beats] of CHORDS[bar]) {
    pos += beats * 2;
    if (eighth < pos) return pos - eighth;
  }
  throw new Error(`No chord at bar ${bar + 1}, eighth ${eighth}`);
}

function leadEvents(events) {
  MELODY.forEach((line, bar) => {
    let pos = 0;
    for (const { midi, len } of parseLine(line, `melody bar ${bar + 1}`)) {
      if (midi !== null) {
        const e8 = bar * 8 + pos;
        const r = rngFor('lead', e8, midi);
        const metric = pos === 0 ? 1 : pos % 4 === 0 ? 0.95 : pos % 2 === 0 ? 0.9 : 0.84;
        const vel =
          PHRASE_SHAPE[bar % 4] *
          PHRASE_GAIN[bar >> 2] *
          metric *
          (0.95 + 0.07 * r()) *
          Math.pow(523.25 / midiToHz(midi), 0.15);
        const delay = Math.floor(r() * 120);
        const seed = hashSeed('lead-note', e8, midi);
        const dur = (len * EIGHTH) / SR;
        events.push({ group: 'lead', start: e8 * EIGHTH + delay, ...MIX.lead, render: () => celesta({ midi, vel, dur, seed }) });
      }
      pos += len;
    }
  });
}

function arpEvents(events) {
  for (let bar = 0; bar < BARS; bar++) {
    const sectionB = bar >= 8;
    // [eighth, chord-tone index, length in eighths]: quarter-note broken chords in A,
    // a lilting 3+3+2 figure in B.
    const slots = sectionB
      ? [[0, 0, 3], [3, 2, 3], [6, 3, 2]]
      : [[0, 0, 2], [2, 1, 2], [4, 2, 2], [6, 1, 2]];
    for (const [pos, idx, len] of slots) {
      const midi = noteToMidi(ARP_VOICING[chordAt(bar, pos)][idx]);
      const e8 = bar * 8 + pos;
      const r = rngFor('arp', e8, midi);
      const vel = (pos === 0 ? 1 : 0.86) * (0.92 + 0.1 * r());
      const delay = 40 + Math.floor(r() * 160);
      // In A the broken chord is half-pedalled, but no note is held into the next chord.
      const held = Math.min(sectionB ? len : len * 1.5, eighthsToChordChange(bar, pos));
      const dur = (held * EIGHTH - delay) / SR - 0.06;
      events.push({ group: 'arp', start: e8 * EIGHTH + delay, ...MIX.arp, render: () => epiano({ midi, vel, dur }) });
    }
  }
}

function bassEvents(events) {
  BASS_LINE.forEach((line, bar) => {
    let pos = 0;
    for (const { midi, len } of parseLine(line, `bass bar ${bar + 1}`)) {
      const vel = pos === 0 ? 1 : 0.86;
      const dur = (len * EIGHTH) / SR;
      events.push({ group: 'bass', start: (bar * 8 + pos) * EIGHTH, ...MIX.bass, render: () => bass({ midi, vel, dur }) });
      pos += len;
    }
  });
}

function bellEvents(events) {
  for (const [bar1, pos, name, vel] of BELLS) {
    const midi = noteToMidi(name);
    const e8 = (bar1 - 1) * 8 + pos;
    const r = rngFor('bell', e8, midi);
    const delay = Math.floor(r() * 300);
    const pan = -0.5 + r();
    const seed = hashSeed('bell-note', e8, midi);
    events.push({ group: 'bell', start: e8 * EIGHTH + delay, ...MIX.bell, pan, render: () => bell({ midi, vel, seed }) });
  }
}

function shakerEvents(events) {
  for (let bar = 0; bar < BARS; bar++) {
    for (let pos = 0; pos < 8; pos++) {
      const offbeat = pos % 2 === 1;
      let vel;
      if (bar < 4) vel = offbeat ? 0.55 : 0;
      else if (bar < 8) vel = offbeat ? 0.6 : 0.25;
      else vel = offbeat ? 0.7 : 0.35;
      if (vel === 0) continue;
      const e8 = bar * 8 + pos;
      const r = rngFor('shaker', e8);
      const v = vel * (0.85 + 0.3 * r());
      const delay = Math.floor(r() * 250);
      const seed = hashSeed('shaker-noise', e8);
      events.push({ group: 'shaker', start: e8 * EIGHTH + delay, ...MIX.shaker, render: () => shaker({ vel: v, seed }) });
    }
  }
}

function padEvents(events) {
  const segs = [];
  CHORDS.forEach((bar, b) => {
    let pos = 0;
    for (const [sym, beats] of bar) {
      segs.push({ start: b * 8 + pos, len: beats * 2, sym });
      pos += beats * 2;
    }
  });
  for (let v = 0; v < 4; v++) {
    const notes = [];
    for (const s of segs) {
      const midi = noteToMidi(PAD_VOICING[s.sym][v]);
      const last = notes[notes.length - 1];
      if (last && last.midi === midi) last.len += s.len;
      else notes.push({ midi, start: s.start, len: s.len });
    }
    // A voice holding the same pitch across the loop seam is one note that starts in this
    // cycle and keeps sounding into the next one.
    if (notes.length > 1 && notes[0].midi === notes[notes.length - 1].midi) {
      notes[notes.length - 1].len += notes[0].len;
      notes.shift();
    }
    for (const nt of notes) {
      const seed = hashSeed('pad', v, nt.start, nt.midi);
      const cutoff = nt.start >= 64 ? 1350 : 1150;
      const dur = (nt.len * EIGHTH) / SR;
      events.push({
        group: 'pad',
        start: nt.start * EIGHTH,
        ...MIX.pad,
        stereo: true,
        render: () => padNote({ midi: nt.midi, dur, seed, cutoff }),
      });
    }
  }
}

export function buildScore() {
  const events = [];
  padEvents(events);
  bassEvents(events);
  arpEvents(events);
  leadEvents(events);
  bellEvents(events);
  shakerEvents(events);
  for (const e of events) {
    if (!Number.isInteger(e.start) || e.start < 0 || e.start >= LOOP) throw new Error(`Bad event start ${e.start}`);
  }
  return events;
}

export const GROUPS = ['lead', 'arp', 'pad', 'bass', 'bell', 'shaker'];

// ---------------------------------------------------------------------------
// Mixdown

function rmsOf(a, from, to) {
  let s = 0;
  for (let i = from; i < to; i++) s += a[i] * a[i];
  return Math.sqrt(s / (to - from));
}

/**
 * Renders three cycles and returns the extracted, padded loop as floats:
 * { L, R, stats } with L/R of length TOTAL (not yet normalised).
 * `groups` restricts the render to some instrument groups (used for level reports).
 */
export function renderMusic({ groups = null } = {}) {
  const N = 3 * LOOP;
  const dryL = new Float64Array(N);
  const dryR = new Float64Array(N);
  let send = new Float64Array(N);
  const events = buildScore().filter((e) => !groups || groups.includes(e.group));

  for (const ev of events) {
    const sig = ev.render();
    let L, R, gl, gr;
    if (ev.stereo) {
      L = sig.L;
      R = sig.R;
      gl = gr = ev.gain;
    } else {
      L = R = sig;
      const [pl, pr] = panGains(ev.pan);
      gl = pl * ev.gain;
      gr = pr * ev.gain;
    }
    const gs = 0.5 * ev.gain * ev.send;
    for (let k = 0; k < 3; k++) {
      const off = ev.start + k * LOOP;
      const len = Math.min(L.length, N - off);
      for (let i = 0; i < len; i++) {
        const l = L[i];
        const r = R[i];
        dryL[off + i] += l * gl;
        dryR[off + i] += r * gr;
        send[off + i] += (l + r) * gs;
      }
    }
  }

  // Reverb runs continuously over all three cycles.
  const pd = Math.round(REVERB.preDelay * SR);
  const rin = new Float64Array(N);
  for (let i = pd; i < N; i++) rin[i] = send[i - pd] * 0.015;
  send = null;
  runBiquad(rin, biquad('highpass', REVERB.inHP, Math.SQRT1_2));
  runBiquad(rin, biquad('lowpass', REVERB.inLP, Math.SQRT1_2));
  const wet = freeverb(rin, REVERB);

  const mid0 = LOOP;
  const mid1 = 2 * LOOP;
  const stats = {
    dryRms: Math.hypot(rmsOf(dryL, mid0, mid1), rmsOf(dryR, mid0, mid1)) / Math.SQRT2,
    wetRms: (REVERB.wet * Math.hypot(rmsOf(wet.L, mid0, mid1), rmsOf(wet.R, mid0, mid1))) / Math.SQRT2,
  };

  // The master bus is a plain sum. Sub-bass and treble are shaped inside the instruments and on
  // the reverb input, so the only recursive process after the dry sum is the reverb itself.
  for (let i = 0; i < N; i++) {
    dryL[i] += wet.L[i] * REVERB.wet;
    dryR[i] += wet.R[i] * REVERB.wet;
  }

  const from = LOOP - PRE;
  const to = 2 * LOOP + POST;
  return { L: dryL.slice(from, to), R: dryR.slice(from, to), stats, eventCount: events.length };
}
