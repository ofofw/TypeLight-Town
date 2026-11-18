// Minimal 16-bit PCM WAV writer/reader (canonical 44-byte header, no metadata chunks,
// so identical samples always give an identical file).

import fs from 'node:fs';
import path from 'node:path';

/** channels: array of Int16Array of equal length. */
export function encodeWav16(channels, sampleRate) {
  const nch = channels.length;
  const frames = channels[0].length;
  const dataBytes = frames * nch * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(nch, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * nch * 2, 28);
  buf.writeUInt16LE(nch * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataBytes, 40);
  let o = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < nch; c++) {
      buf.writeInt16LE(channels[c][i], o);
      o += 2;
    }
  }
  return buf;
}

export function writeWav16(file, channels, sampleRate) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, encodeWav16(channels, sampleRate));
}

/** Returns { sampleRate, channels: Int16Array[], bitsPerSample, format }. 16-bit PCM only. */
export function readWav16(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`${file}: not a RIFF/WAVE file`);
  }
  let off = 12;
  let fmt = null;
  let data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    const body = off + 8;
    if (id === 'fmt ') {
      fmt = {
        format: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      data = { start: body, size };
    }
    off = body + size + (size & 1);
  }
  if (!fmt || !data) throw new Error(`${file}: missing fmt or data chunk`);
  if (fmt.format !== 1 || fmt.bitsPerSample !== 16) {
    throw new Error(`${file}: expected 16-bit PCM, got format ${fmt.format} / ${fmt.bitsPerSample} bit`);
  }
  const nch = fmt.channels;
  const frames = Math.floor(data.size / (2 * nch));
  const channels = Array.from({ length: nch }, () => new Int16Array(frames));
  let o = data.start;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < nch; c++) {
      channels[c][i] = buf.readInt16LE(o);
      o += 2;
    }
  }
  return { sampleRate: fmt.sampleRate, channels, bitsPerSample: fmt.bitsPerSample, format: fmt.format };
}
