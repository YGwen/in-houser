import { describe, expect, it } from 'vitest';
import { POSES, SPRITE_H, SPRITE_W, drawPose, lookFor } from './fighter';
import { repoRoster } from '../roster';

const names = repoRoster().map((p) => p.name);

describe('pixel fighters', () => {
  it('gives the same character to the same name', () => {
    expect(lookFor('Diegz')).toEqual(lookFor('Diegz'));
    expect(drawPose(lookFor('Diegz'), 'strike', '#00f')).toEqual(drawPose(lookFor('Diegz'), 'strike', '#00f'));
  });

  it('gives each roster player a different character', () => {
    const looks = new Set(names.map((n) => JSON.stringify(lookFor(n))));
    expect(looks.size).toBe(names.length);
  });

  it('draws every pose inside the sprite, with the feet on the ground', () => {
    for (const name of names) {
      const look = lookFor(name);
      for (const pose of POSES) {
        const px = drawPose(look, pose, '#3d8bff');
        expect(px).toHaveLength(SPRITE_H);
        for (const row of px) expect(row).toHaveLength(SPRITE_W);
        expect(px[30].some((c) => c !== null)).toBe(true); // boots
        expect(px.flat().filter(Boolean).length).toBeGreaterThan(150);
      }
    }
  });

  it('moves between poses', () => {
    const look = lookFor('Diegz');
    const frames = new Set(POSES.map((p) => JSON.stringify(drawPose(look, p, '#f00'))));
    expect(frames.size).toBe(POSES.length);
  });
});
