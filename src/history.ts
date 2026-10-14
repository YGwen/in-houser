import { ROLES, type PlayedGame, type Player, type Role, type TeamResult } from './types';

/** Only the last few games of the current evening influence the next roll. */
export const RECENT_GAMES = 3;
/** Weight of the last game, the one before, and so on. */
const RECENCY_WEIGHTS = [1, 0.5, 0.25];
/** Games older than this are from a previous evening and ignored. */
export const EVENING_MS = 12 * 60 * 60 * 1000;
/** Same 5 teammates as last game costs as much as 2 players repeating their role. */
const TEAMMATE_WEIGHT = 2;

export function recentGames(history: PlayedGame[], now: number): PlayedGame[] {
  return history.filter((g) => now - g.playedAt < EVENING_MS).slice(0, RECENT_GAMES);
}

export interface RepeatScorer {
  /** How much `player` has recently played `role` (0 = not in recent games). */
  rolePenalty: (player: Player, role: Role) => number;
  /** How much these two teams repeat teammate pairs from recent games (identical teams as last game = TEAMMATE_WEIGHT). */
  teammatePenalty: (teamA: Player[], teamB: Player[]) => number;
}

export function repeatScorer(history: PlayedGame[], now: number): RepeatScorer {
  const games = recentGames(history, now);

  const roleScore = new Map<string, number>();
  const sideOf = games.map((g) => {
    const side = new Map<string, 'blue' | 'red'>();
    for (const role of ROLES) {
      side.set(g.blue[role], 'blue');
      side.set(g.red[role], 'red');
    }
    return side;
  });
  games.forEach((g, i) => {
    const w = RECENCY_WEIGHTS[i] ?? 0;
    for (const role of ROLES) {
      for (const id of [g.blue[role], g.red[role]]) {
        const key = `${id}:${role}`;
        roleScore.set(key, (roleScore.get(key) ?? 0) + w);
      }
    }
  });

  const pairsRepeated = (team: Player[], side: Map<string, 'blue' | 'red'>) => {
    let n = 0;
    for (let i = 0; i < team.length; i++) {
      for (let j = i + 1; j < team.length; j++) {
        const a = side.get(team[i].id);
        if (a && a === side.get(team[j].id)) n++;
      }
    }
    return n;
  };

  return {
    rolePenalty: (player, role) => roleScore.get(`${player.id}:${role}`) ?? 0,
    teammatePenalty: (teamA, teamB) => {
      if (!games.length) return 0;
      const maxPairs = (teamA.length * (teamA.length - 1)) / 2 + (teamB.length * (teamB.length - 1)) / 2;
      return games.reduce((sum, _g, i) => {
        const repeated = pairsRepeated(teamA, sideOf[i]) + pairsRepeated(teamB, sideOf[i]);
        return sum + (RECENCY_WEIGHTS[i] ?? 0) * TEAMMATE_WEIGHT * (repeated / maxPairs);
      }, 0);
    },
  };
}

export function toPlayedGame(result: TeamResult, id: string, playedAt: number): PlayedGame {
  const ids = (team: TeamResult['blue']) =>
    Object.fromEntries(ROLES.map((r) => [r, team[r].id])) as Record<Role, string>;
  return { id, playedAt, blue: ids(result.blue), red: ids(result.red), duelLanes: result.duelLanes };
}
