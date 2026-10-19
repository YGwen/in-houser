import { describe, expect, it } from 'vitest';
import { despeckle, quantize } from './championArt';

describe('champion pixel art', () => {
  it('reduces an image to at most k SNES colors', () => {
    const w = 16;
    const data = new Uint8ClampedArray(w * w * 4);
    for (let i = 0; i < w * w; i++) data.set([(i * 37) % 256, (i * 91) % 256, (i * 13) % 256, 255], i * 4);
    quantize(data, { k: 6, width: w });
    const colors = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
      colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      for (const v of data.slice(i, i + 3)) expect(Math.round((v * 31) / 255) * (255 / 31)).toBeCloseTo(v, 0); // 5 bits
      expect(data[i + 3]).toBe(255);
    }
    expect(colors.size).toBeLessThanOrEqual(6);
  });

  it('keeps transparency and outlines the shape', () => {
    // 5x5, transparent except a 1x3 red bar in the middle column.
    const w = 5;
    const data = new Uint8ClampedArray(w * w * 4);
    for (const y of [1, 2, 3]) data.set([220, 30, 30, 255], (y * w + 2) * 4);
    quantize(data, { k: 4, width: w, alpha: true });
    const alpha = (x: number, y: number) => data[(y * w + x) * 4 + 3];
    const rgb = (x: number, y: number) => [...data.slice((y * w + x) * 4, (y * w + x) * 4 + 3)];
    expect(alpha(2, 2)).toBe(255); // the bar
    expect(rgb(2, 2)[0]).toBeGreaterThan(150);
    expect(alpha(1, 2)).toBe(255); // outline beside it
    expect(rgb(1, 2)).toEqual([18, 12, 24]);
    expect(alpha(0, 0)).toBe(0); // background
  });

  it('removes stray single pixels', () => {
    // A 5x5 block of color 1 with one stray pixel of color 2 in the middle.
    const owner = Array<number>(25).fill(1);
    owner[12] = 2;
    expect(despeckle(owner, 5)).toEqual(Array<number>(25).fill(1));
  });

  it('keeps lines that are 1 pixel wide', () => {
    const owner = Array<number>(25).fill(1);
    for (let x = 0; x < 5; x++) owner[10 + x] = 2;
    expect(despeckle(owner, 5)).toEqual(owner);
  });
});
