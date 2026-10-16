import { describe, expect, it } from 'vitest';
import { WEAPONS, pickWeapon, type Weapon } from './weapons';

describe('weapon picker', () => {
  it('uses every weapon and never repeats one twice in a row', () => {
    let seed = 7;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const seen = new Set<Weapon>();
    let previous: Weapon | null = null;
    for (let i = 0; i < 300; i++) {
      const w = pickWeapon(rng, previous);
      expect(w).not.toBe(previous);
      seen.add(w);
      previous = w;
    }
    expect([...seen].sort()).toEqual([...WEAPONS].sort());
  });
});
