// Minimal PNG reader (8-bit RGB/RGBA/grey/palette, non-interlaced) and writer (8-bit palette with
// transparency, for small pixel-art sprite sheets).

import { deflateSync, inflateSync } from 'node:zlib';

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

/** Decode a PNG to { width, height, data: Uint8ClampedArray RGBA }. */
export function decodePng(buf) {
  if (!buf.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a PNG');
  let o = 8;
  let width = 0;
  let height = 0;
  let depth = 0;
  let type = 0;
  let interlace = 0;
  let palette = null;
  let trns = null;
  const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o);
    const kind = buf.toString('latin1', o + 4, o + 8);
    const body = buf.subarray(o + 8, o + 8 + len);
    if (kind === 'IHDR') {
      [width, height, depth, type, interlace] = [body.readUInt32BE(0), body.readUInt32BE(4), body[8], body[9], body[12]];
    } else if (kind === 'PLTE') palette = body;
    else if (kind === 'tRNS') trns = body;
    else if (kind === 'IDAT') idat.push(body);
    else if (kind === 'IEND') break;
    o += 12 + len;
  }
  if (depth !== 8 || interlace) throw new Error(`unsupported PNG (depth ${depth}, interlace ${interlace})`);
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pixels[y * stride + x - channels] : 0;
      const b = y ? pixels[(y - 1) * stride + x] : 0;
      const c = x >= channels && y ? pixels[(y - 1) * stride + x - channels] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const p = a + b - c;
        const [pa, pb, pc] = [Math.abs(p - a), Math.abs(p - b), Math.abs(p - c)];
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      pixels[y * stride + x] = v & 255;
    }
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const p = pixels.subarray(i * channels, (i + 1) * channels);
    let rgba;
    if (type === 6) rgba = [p[0], p[1], p[2], p[3]];
    else if (type === 2) rgba = [p[0], p[1], p[2], 255];
    else if (type === 0) rgba = [p[0], p[0], p[0], 255];
    else if (type === 4) rgba = [p[0], p[0], p[0], p[1]];
    else rgba = [palette[p[0] * 3], palette[p[0] * 3 + 1], palette[p[0] * 3 + 2], trns && p[0] < trns.length ? trns[p[0]] : 255];
    data.set(rgba, i * 4);
  }
  return { width, height, data };
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(kind, body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const kb = Buffer.concat([Buffer.from(kind, 'latin1'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(kb));
  return Buffer.concat([len, kb, crc]);
}

/** Encode RGBA pixels (at most 256 distinct colors) as an 8-bit palette PNG. */
export function encodeIndexedPng(width, height, data) {
  const colors = new Map();
  const index = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const a = data[i * 4 + 3];
    const key = a ? (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2] | (a === 255 ? 0 : 1 << 24) : -1;
    if (!colors.has(key)) {
      if (colors.size >= 256) throw new Error('more than 256 colors');
      colors.set(key, colors.size);
    }
    index[i] = colors.get(key);
  }
  const keys = [...colors.keys()];
  const plte = Buffer.alloc(keys.length * 3);
  const trns = Buffer.alloc(keys.length, 255);
  keys.forEach((k, i) => {
    if (k === -1) trns[i] = 0;
    else plte.set([(k >> 16) & 255, (k >> 8) & 255, k & 255], i * 3);
  });
  const raw = Buffer.alloc((width + 1) * height);
  for (let y = 0; y < height; y++) raw.set(index.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 3;
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('PLTE', plte),
    chunk('tRNS', trns),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
