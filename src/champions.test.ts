import { describe, expect, it } from 'vitest';
import { CHAMPIONS, championById, championsFor, pickChampions } from './champions';
import { ROLES, type Player, type Role, type TeamRoster } from './types';

const player = (id: string, randomChampion: boolean): Player => ({
  id,
  name: id,
  rank: 3,
  fixedRole: null,
  active: true,
  randomChampion,
});

function teams(optIn: (role: Role, side: 'blue' | 'red') => boolean) {
  const make = (side: 'blue' | 'red') =>
    Object.fromEntries(ROLES.map((r) => [r, player(`${side}-${r}`, optIn(r, side))])) as TeamRoster;
  return { blue: make('blue'), red: make('red') };
}

describe('random champions', () => {
  it('has champions for every role', () => {
    expect(CHAMPIONS.length).toBeGreaterThan(150);
    for (const role of ROLES) expect(championsFor(role).length).toBeGreaterThan(20);
  });

  it('only picks for players who opted in, with a champion that fits their role', () => {
    const t = teams((r, side) => side === 'blue' || r === 'support');
    for (let seed = 0; seed < 50; seed++) {
      let s = seed + 1;
      const rng = () => ((s = (s * 16807) % 2147483647) / 2147483647);
      const picks = pickChampions(t, rng);
      expect(Object.keys(picks).sort()).toEqual([...ROLES.map((r) => `blue-${r}`), 'red-support'].sort());
      for (const [id, champId] of Object.entries(picks)) {
        const role = id.split('-')[1] as Role;
        expect(championById(champId)?.roles).toContain(role);
      }
    }
  });

  it('never gives two players the same champion', () => {
    const t = teams(() => true);
    for (let i = 0; i < 100; i++) {
      const picks = Object.values(pickChampions(t));
      expect(new Set(picks).size).toBe(10);
    }
  });
});
