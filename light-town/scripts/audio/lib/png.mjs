// Tiny RGB PNG encoder plus waveform/spectrogram drawing for visual checks of the audio.

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { framePower, hann } from './fft.mjs';

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(zlib.crc32(body));
  return Buffer.concat([len, body, crc]);
}

export class Canvas {
  constructor(width, height, bg = [12, 14, 24]) {
    this.width = width;
    this.height = height;
    this.px = new Uint8Array(width * height * 3);
    for (let i = 0; i < width * height; i++) this.px.set(bg, i * 3);
  }

  set(x, y, [r, g, b]) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const o = (y * this.width + x) * 3;
    this.px[o] = r;
    this.px[o + 1] = g;
    this.px[o + 2] = b;
  }

  vline(x, y0, y1, color) {
    for (let y = Math.max(0, Math.min(y0, y1)); y <= Math.min(this.height - 1, Math.max(y0, y1)); y++) this.set(x, y, color);
  }

  hline(y, x0, x1, color) {
    for (let x = x0; x <= x1; x++) this.set(x, y, color);
  }

  save(file) {
    const { width, height, px } = this;
    const raw = Buffer.alloc((width * 3 + 1) * height);
    for (let y = 0; y < height; y++) {
      raw[y * (width * 3 + 1)] = 0;
      Buffer.from(px.buffer, y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]));
  }
}

const STOPS = [
  [0, [12, 14, 24]],
  [0.25, [60, 20, 110]],
  [0.5, [170, 40, 90]],
  [0.75, [245, 130, 40]],
  [1, [255, 245, 190]],
];

function heat(v) {
  v = Math.max(0, Math.min(1, v));
  for (let i = 1; i < STOPS.length; i++) {
    if (v <= STOPS[i][0]) {
      const [t0, c0] = STOPS[i - 1];
      const [t1, c1] = STOPS[i];
      const f = (v - t0) / (t1 - t0);
      return c0.map((c, k) => Math.round(c + (c1[k] - c) * f));
    }
  }
  return STOPS[STOPS.length - 1][1];
}

/** Min/max waveform of x (floats in −1..1) into the band [top, top+h). markers: sample indices. */
export function drawWaveform(cv, x, top, h, { markers = [], color = [120, 200, 255] } = {}) {
  const mid = top + Math.floor(h / 2);
  const W = cv.width;
  for (const db of [-6, -20]) {
    const a = Math.pow(10, db / 20) * (h / 2);
    cv.hline(Math.round(mid - a), 0, W - 1, [40, 44, 60]);
    cv.hline(Math.round(mid + a), 0, W - 1, [40, 44, 60]);
  }
  cv.hline(mid, 0, W - 1, [55, 60, 80]);
  for (let px = 0; px < W; px++) {
    const s0 = Math.floor((px * x.length) / W);
    const s1 = Math.max(s0 + 1, Math.floor(((px + 1) * x.length) / W));
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = s0; i < s1 && i < x.length; i++) {
      lo = Math.min(lo, x[i]);
      hi = Math.max(hi, x[i]);
    }
    if (lo === Infinity) continue;
    cv.vline(px, Math.round(mid - hi * (h / 2)), Math.round(mid - lo * (h / 2)), color);
  }
  for (const m of markers) cv.vline(Math.round((m * W) / x.length), top, top + h - 1, [255, 80, 80]);
}

/** Log-frequency spectrogram of x into [top, top+h). */
export function drawSpectrogram(cv, x, sr, top, h, { n = 2048, fMin = 30, fMax = 16000, range = 90, markers = [] } = {}) {
  const W = cv.width;
  const win = hann(n);
  const cols = [];
  let maxDb = -Infinity;
  for (let px = 0; px < W; px++) {
    const center = Math.floor(((px + 0.5) * x.length) / W);
    const p = framePower(x, center - n / 2, n, win);
    const col = new Float64Array(h);
    for (let row = 0; row < h; row++) {
      const fa = fMin * Math.pow(fMax / fMin, (h - 1 - row) / h);
      const fb = fMin * Math.pow(fMax / fMin, (h - row) / h);
      const ka = Math.max(1, Math.floor((fa * n) / sr));
      const kb = Math.max(ka, Math.min(n / 2, Math.ceil((fb * n) / sr)));
      let s = 0;
      for (let k = ka; k <= kb; k++) s = Math.max(s, p[k]);
      col[row] = 10 * Math.log10(s + 1e-30);
      maxDb = Math.max(maxDb, col[row]);
    }
    cols.push(col);
  }
  for (let px = 0; px < W; px++) {
    for (let row = 0; row < h; row++) cv.set(px, top + row, heat((cols[px][row] - (maxDb - range)) / range));
  }
  for (const f of [100, 1000, 10000]) {
    const row = top + Math.round(h - 1 - (h * Math.log(f / fMin)) / Math.log(fMax / fMin));
    for (let px = 0; px < W; px += 4) cv.set(px, row, [90, 90, 110]);
  }
  for (const m of markers) {
    const px = Math.round((m * W) / x.length);
    for (let row = top; row < top + h; row += 3) cv.set(px, row, [255, 80, 80]);
  }
}
