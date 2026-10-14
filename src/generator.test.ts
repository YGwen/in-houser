import { describe, expect, it } from 'vitest';
import { generate, validate, type Rng } from './generator';
import { recentGames, toPlayedGame } from './history';
import { ROLES, type Duel, type PlayedGame, type Player, type Rank, type Role, type TeamResult } from './types';

function seeded(seed: number): Rng {
  // mulberry32
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RANKS: Rank[] = [5, 4, 4, 3, 3, 3, 2, 2, 1, 1];

function makePlayers(overrides: Partial<Record<number, Partial<Player>>> = {}): Player[] {
  return RANKS.map((rank, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    rank,
    fixedRole: null,
    active: true,
    ...overrides[i],
  }));
}

function duel(a: number, b: number, lane: Role | 'random' = 'random'): Duel {
  return { id: `d${a}-${b}`, challengerId: `p${a}`, opponentId: `p${b}`, lane };
}

function run(players: Player[], duels: Duel[] = [], tolerance = 1, seed = 1): TeamResult {
  const out = generate({ players, duels, tolerance, rng: seeded(seed) });
  if (!out.ok) throw new Error(out.errors.join('; '));
  return out.result;
}

function laneOf(team: TeamResult['blue'], id: string): Role | undefined {
  return ROLES.find((r) => team[r].id === id);
}

function sideOf(result: TeamResult, id: string): 'blue' | 'red' {
  return laneOf(result.blue, id) ? 'blue' : 'red';
}

describe('generate', () => {
  it('builds two full teams with every role exactly once', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = run(makePlayers(), [], 1, seed);
      const ids = [...ROLES.map((x) => r.blue[x].id), ...ROLES.map((x) => r.red[x].id)];
      expect(new Set(ids).size).toBe(10);
    }
  });

  it('respects fixed roles and splits two players locked to the same role', () => {
    const players = makePlayers({ 8: { fixedRole: 'support' }, 9: { fixedRole: 'support' }, 7: { fixedRole: 'mid' } });
    for (let seed = 1; seed <= 50; seed++) {
      const r = run(players, [], 1, seed);
      expect(r.blue.support.id === 'p8' || r.red.support.id === 'p8').toBe(true);
      expect(r.blue.support.id === 'p9' || r.red.support.id === 'p9').toBe(true);
      expect(r.blue.mid.id === 'p7' || r.red.mid.id === 'p7').toBe(true);
    }
  });

  it('puts duelists on opposite teams in the chosen lane', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = run(makePlayers(), [duel(0, 1, 'mid')], 1, seed);
      expect(sideOf(r, 'p0')).not.toBe(sideOf(r, 'p1'));
      expect([r.blue.mid.id, r.red.mid.id].sort()).toEqual(['p0', 'p1']);
      expect(r.duelLanes).toEqual(['mid']);
    }
  });

  it('puts duelists in the same random lane, and uses a fixed duelist role', () => {
    const players = makePlayers({ 3: { fixedRole: 'jungle' } });
    const lanes = new Set<Role>();
    for (let seed = 1; seed <= 80; seed++) {
      const r = run(players, [duel(0, 1), duel(2, 3)], 1, seed);
      const lane = laneOf(r.blue, 'p0') ?? laneOf(r.red, 'p0')!;
      expect(laneOf(r.blue, 'p1') ?? laneOf(r.red, 'p1')).toBe(lane);
      expect(sideOf(r, 'p0')).not.toBe(sideOf(r, 'p1'));
      expect([r.blue.jungle.id, r.red.jungle.id].sort()).toEqual(['p2', 'p3']);
      lanes.add(lane);
    }
    expect(lanes.size).toBeGreaterThan(1);
  });

  it('keeps the gap within tolerance and varies the teams', () => {
    // Best possible gap for these ranks is 0 (28 total).
    const seen = new Set<string>();
    for (let seed = 1; seed <= 100; seed++) {
      const r = run(makePlayers(), [], 1, seed);
      expect(r.gap).toBeLessThanOrEqual(1);
      seen.add(
        ROLES.map((x) => r.blue[x].id)
          .sort()
          .join(','),
      );
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it('with tolerance 0 only picks perfectly balanced teams', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(run(makePlayers(), [], 0, seed).gap).toBe(0);
    }
  });

  it('reports when no valid teams exist', () => {
    // Duel on top, but two non-duelists are locked to top.
    const players = makePlayers({ 4: { fixedRole: 'top' }, 5: { fixedRole: 'top' } });
    const out = generate({ players, duels: [duel(0, 1, 'top')], tolerance: 1, rng: seeded(1) });
    expect(out.ok).toBe(false);
  });
});

describe('history (role rotation)', () => {
  const NOW = 1_000_000_000_000;
  const players = makePlayers();

  function game(result: TeamResult, minutesAgo: number): PlayedGame {
    return toPlayedGame(result, `g${minutesAgo}`, NOW - minutesAgo * 60_000);
  }

  function runWith(history: PlayedGame[], seed: number, tolerance = 1) {
    const out = generate({ players, duels: [], tolerance, history, now: NOW, rng: seeded(seed) });
    if (!out.ok) throw new Error(out.errors.join('; '));
    return out.result;
  }

  const roleOf = (r: TeamResult, id: string) => laneOf(r.blue, id) ?? laneOf(r.red, id);
  const teamKey = (r: TeamResult) =>
    [ROLES.map((x) => r.blue[x].id).sort().join(','), ROLES.map((x) => r.red[x].id).sort().join(',')].sort().join(' | ');

  it('never gives anyone the same role as last game', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const last = run(players, [], 1, seed);
      const next = runWith([game(last, 40)], seed + 1000);
      for (const p of players) expect(roleOf(next, p.id)).not.toBe(roleOf(last, p.id));
    }
  });

  it('avoids the exact same teams as last game', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const last = run(players, [], 2, seed);
      const next = runWith([game(last, 40)], seed + 1000, 2);
      expect(teamKey(next)).not.toBe(teamKey(last));
    }
  });

  it('rotates roles over an evening of five games', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const history: PlayedGame[] = [];
      for (let i = 0; i < 5; i++) {
        history.unshift(game(runWith(history, seed * 10 + i), 200 - i * 40));
      }
      // Within any 3 consecutive games, nobody plays the same role twice.
      for (let i = 0; i + 2 < history.length; i++) {
        for (const p of players) {
          const roles = history.slice(i, i + 3).map((g) => ROLES.find((r) => g.blue[r] === p.id || g.red[r] === p.id));
          expect(new Set(roles).size).toBe(3);
        }
      }
    }
  });

  it('keeps balance as the priority', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const last = run(players, [], 0, seed);
      expect(runWith([game(last, 40)], seed + 1000, 0).gap).toBe(0);
    }
  });

  it('ignores games from a previous evening', () => {
    const history = [game(run(players, [], 1, 1), 13 * 60)];
    expect(recentGames(history, NOW)).toEqual([]);
  });

  it('still respects locked roles and duels', () => {
    const locked = makePlayers({ 9: { fixedRole: 'support' } });
    const last = run(locked, [duel(0, 1, 'mid')], 1, 1);
    for (let seed = 1; seed <= 30; seed++) {
      const out = generate({ players: locked, duels: [duel(0, 1, 'mid')], tolerance: 1, history: [game(last, 30)], now: NOW, rng: seeded(seed) });
      if (!out.ok) throw new Error(out.errors.join('; '));
      expect(roleOf(out.result, 'p9')).toBe('support');
      expect(roleOf(out.result, 'p0')).toBe('mid');
      expect(roleOf(out.result, 'p1')).toBe('mid');
    }
  });
});

describe('validate', () => {
  it('requires exactly 10 active players', () => {
    expect(validate(makePlayers({ 0: { active: false } }), [])).toHaveLength(1);
    expect(validate(makePlayers(), [])).toEqual([]);
  });

  it('rejects more than two players locked to a role', () => {
    const players = makePlayers({ 0: { fixedRole: 'adc' }, 1: { fixedRole: 'adc' }, 2: { fixedRole: 'adc' } });
    expect(validate(players, [])).toHaveLength(1);
  });

  it('rejects a player in two duels', () => {
    expect(validate(makePlayers(), [duel(0, 1), duel(0, 2)]).length).toBeGreaterThan(0);
  });

  it('rejects duelists locked to different roles', () => {
    const players = makePlayers({ 0: { fixedRole: 'top' }, 1: { fixedRole: 'mid' } });
    expect(validate(players, [duel(0, 1)]).length).toBeGreaterThan(0);
  });

  it('rejects a duel lane that conflicts with a locked role', () => {
    const players = makePlayers({ 0: { fixedRole: 'top' } });
    expect(validate(players, [duel(0, 1, 'mid')]).length).toBeGreaterThan(0);
  });

  it('rejects two duels on the same lane', () => {
    expect(validate(makePlayers(), [duel(0, 1, 'mid'), duel(2, 3, 'mid')]).length).toBeGreaterThan(0);
  });

  it('rejects a duel with a player not playing tonight', () => {
    expect(validate(makePlayers({ 1: { active: false } }), [duel(0, 1)]).length).toBeGreaterThan(0);
  });
});
