import { describe, expect, it } from 'vitest';
import { TRACKS, DEFAULT_TRACK, trackById } from './tracks';

describe('music tracks', () => {
  it('every melody bar is exactly one bar (16 steps)', () => {
    for (const t of TRACKS) {
      t.melody.forEach((bar, i) => expect(bar.reduce((s, [, len]) => s + len, 0), `${t.id} bar ${i + 1}`).toBe(16));
    }
  });

  it('patterns stay inside the bar and ids are unique', () => {
    expect(new Set(TRACKS.map((t) => t.id)).size).toBe(TRACKS.length);
    for (const t of TRACKS) {
      for (const step of [...t.kick, ...t.snare, ...t.bass.map(([s]) => s), t.openHat ?? 0]) {
        expect(step).toBeGreaterThanOrEqual(0);
        expect(step).toBeLessThan(16);
      }
    }
  });

  it('falls back to the default track for unknown ids', () => {
    expect(trackById('nope').id).toBe(TRACKS[0].id);
    expect(trackById(DEFAULT_TRACK).id).toBe('arena');
  });
});
