import { describe, expect, it } from 'vitest';
import { CHAMPION_COSTUMES, POSES, SPRITE_H, SPRITE_W, costumeFor, drawPose, frontOf } from './fighter';
import { championById } from '../champions';
import { repoRoster } from '../roster';

const roster = repoRoster();

describe('pixel fighters', () => {
  it('gives the same fighter to the same player', () => {
    expect(costumeFor('Diegz')).toEqual(costumeFor('Diegz'));
    expect(drawPose(costumeFor('Diegz'), 'strike', '#00f')).toEqual(drawPose(costumeFor('Diegz'), 'strike', '#00f'));
  });

  it("dresses players as their main when there's a costume for it", () => {
    expect(costumeFor('Maas', 'Leona')).toBe(CHAMPION_COSTUMES.Leona);
    expect(costumeFor('Maas', 'NotAChampion')).toEqual(costumeFor('Maas'));
  });

  it('only has costumes for real champion ids', () => {
    for (const id of Object.keys(CHAMPION_COSTUMES)) expect(championById(id), id).toBeDefined();
  });

  it('gives generated fighters different looks', () => {
    const looks = new Set(roster.map((p) => JSON.stringify(costumeFor(p.name))));
    expect(looks.size).toBe(roster.length);
  });

  it('draws every pose inside the sprite, with the feet on the ground', () => {
    const costumes = [...roster.map((p) => costumeFor(p.name, p.main)), ...Object.values(CHAMPION_COSTUMES)];
    for (const c of costumes) {
      for (const pose of POSES) {
        const px = drawPose(c, pose, '#3d8bff');
        expect(px).toHaveLength(SPRITE_H);
        for (const row of px) expect(row).toHaveLength(SPRITE_W);
        expect(px[51].some((v) => v !== null)).toBe(true); // boots
        expect(px.flat().filter(Boolean).length).toBeGreaterThan(400);
      }
    }
  });

  it('reaches further on the strike than in the guard', () => {
    for (const c of Object.values(CHAMPION_COSTUMES)) {
      expect(frontOf(drawPose(c, 'strike', '#f00')).x).toBeGreaterThan(frontOf(drawPose(c, 'guard', '#f00')).x);
    }
  });
});
