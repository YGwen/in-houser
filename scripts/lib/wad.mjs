// Read files out of League of Legends .wad.client archives (WAD v3), as documented by the community
// (CommunityDragon / LeagueToolkit). Entries are looked up by the xxHash64 of their lowercase path.
//
// Header (272 bytes): "RW", u8 major, u8 minor, 256-byte signature, u64 checksum, u32 entry count.
// Entry (32 bytes): u64 path hash, u32 offset, u32 compressed size, u32 size, u8 type (low 4 bits:
// 0 raw, 1 gzip, 2 link, 3 zstd, 4 zstd with uncompressed chunks first), u8 duplicate, u16 first
// subchunk, u64 checksum.

import { closeSync, openSync, readSync } from 'node:fs';
import { gunzipSync, zstdDecompressSync } from 'node:zlib';

const MASK = (1n << 64n) - 1n;
const P1 = 11400714785074694791n;
const P2 = 14029467366897019727n;
const P3 = 1609587929392839161n;
const P4 = 9650029242287828579n;
const P5 = 2870177450012600261n;
const rotl = (x, r) => ((x << BigInt(r)) | (x >> BigInt(64 - r))) & MASK;
const round = (acc, input) => (rotl((acc + input * P2) & MASK, 31) * P1) & MASK;
const merge = (acc, val) => (((acc ^ round(0n, val)) * P1) & MASK) + P4 & MASK;

/** xxHash64 (seed 0) of a string's UTF-8 bytes, as a BigInt. */
export function xxh64(text) {
  const b = Buffer.from(text, 'utf8');
  const len = b.length;
  let i = 0;
  let h;
  if (len >= 32) {
    let v1 = (P1 + P2) & MASK;
    let v2 = P2;
    let v3 = 0n;
    let v4 = (0n - P1) & MASK;
    for (; i + 32 <= len; i += 32) {
      v1 = round(v1, b.readBigUInt64LE(i));
      v2 = round(v2, b.readBigUInt64LE(i + 8));
      v3 = round(v3, b.readBigUInt64LE(i + 16));
      v4 = round(v4, b.readBigUInt64LE(i + 24));
    }
    h = (rotl(v1, 1) + rotl(v2, 7) + rotl(v3, 12) + rotl(v4, 18)) & MASK;
    h = merge(h, v1);
    h = merge(h, v2);
    h = merge(h, v3);
    h = merge(h, v4);
  } else {
    h = P5;
  }
  h = (h + BigInt(len)) & MASK;
  for (; i + 8 <= len; i += 8) {
    h ^= round(0n, b.readBigUInt64LE(i));
    h = ((rotl(h, 27) * P1) & MASK) + P4 & MASK;
  }
  if (i + 4 <= len) {
    h ^= (BigInt(b.readUInt32LE(i)) * P1) & MASK;
    h = ((rotl(h, 23) * P2) & MASK) + P3 & MASK;
    i += 4;
  }
  for (; i < len; i++) {
    h ^= (BigInt(b[i]) * P5) & MASK;
    h = (rotl(h, 11) * P1) & MASK;
  }
  h ^= h >> 33n;
  h = (h * P2) & MASK;
  h ^= h >> 29n;
  h = (h * P3) & MASK;
  h ^= h >> 32n;
  return h;
}

const ZSTD_MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);

/** Open a WAD; returns has(path) and read(path) -> Buffer | null. Call close() when done. */
export function openWad(file) {
  const fd = openSync(file, 'r');
  const head = Buffer.alloc(272);
  readSync(fd, head, 0, 272, 0);
  if (head.toString('latin1', 0, 2) !== 'RW' || head[2] !== 3) throw new Error(`${file}: not a WAD v3`);
  const count = head.readUInt32LE(268);
  const toc = Buffer.alloc(count * 32);
  readSync(fd, toc, 0, toc.length, 272);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    const o = i * 32;
    entries.set(toc.readBigUInt64LE(o), {
      offset: toc.readUInt32LE(o + 8),
      compressed: toc.readUInt32LE(o + 12),
      size: toc.readUInt32LE(o + 16),
      type: toc[o + 20] & 0xf,
    });
  }
  const find = (path) => entries.get(xxh64(path.toLowerCase()));
  return {
    has: (path) => !!find(path),
    read(path) {
      const e = find(path);
      if (!e) return null;
      const data = Buffer.alloc(e.compressed);
      readSync(fd, data, 0, e.compressed, e.offset);
      switch (e.type) {
        case 0:
          return data;
        case 1:
          return gunzipSync(data);
        case 3:
          return zstdDecompressSync(data);
        case 4: {
          // Some chunks are stored uncompressed before the zstd frame.
          const z = data.indexOf(ZSTD_MAGIC);
          return z <= 0 ? zstdDecompressSync(data) : Buffer.concat([data.subarray(0, z), zstdDecompressSync(data.subarray(z))]);
        }
        default:
          throw new Error(`${path}: unsupported WAD entry type ${e.type}`);
      }
    },
    close: () => closeSync(fd),
  };
}
