// Random champions for players who opt in, picked from champions actually played in their role.
// The list (src/data/champions.json) is refreshed with `npm run champions`.
import data from './data/champions.json';
import type { Rng } from './generator';
import { ROLES, type Role, type TeamResult } from './types';

export interface Champion {
  id: string;
  name: string;
  roles: Role[];
}

export const CHAMPIONS = data.champions as Champion[];
const BY_ID = new Map(CHAMPIONS.map((c) => [c.id, c]));

export const championById = (id: string) => BY_ID.get(id);

export const championsFor = (role: Role) => CHAMPIONS.filter((c) => c.roles.includes(role));

/** Square portrait from Riot's Data Dragon CDN. */
export const championIcon = (id: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${data.ddragonVersion}/img/champion/${id}.png`;

/**
 * A random champion for every player who asked for one, fitting the role they were given.
 * Never the same champion twice in one game (draft rules).
 */
export function pickChampions(result: Pick<TeamResult, 'blue' | 'red'>, rng: Rng = Math.random): Record<string, string> {
  const picks: Record<string, string> = {};
  const taken = new Set<string>();
  for (const team of [result.blue, result.red]) {
    for (const role of ROLES) {
      const player = team[role];
      if (!player.randomChampion) continue;
      const pool = championsFor(role).filter((c) => !taken.has(c.id));
      if (!pool.length) continue;
      const champ = pool[Math.floor(rng() * pool.length)];
      picks[player.id] = champ.id;
      taken.add(champ.id);
    }
  }
  return picks;
}
