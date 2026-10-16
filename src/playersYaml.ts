import { parse, stringify } from 'yaml';
import { ROLES, isRank, type Player, type Role } from './types';

/** Shape of one player in players.yaml. `role` is only written for players locked to a role. */
interface YamlPlayer {
  name: string;
  rank: number;
  role?: Role;
  ban?: Role;
  random_champion?: boolean;
  playing?: boolean;
  say?: string;
}

const HEADER = `# In-Houser players
# rank: 1 (beginner) to 5 (best), half stars allowed (e.g. 2.5)
# role: optional, locks a new player to top | jungle | mid | adc | support
# ban: optional, a role this player never gets (top | jungle | mid | adc | support)
# random_champion: optional, true = gets a random champion that fits their role
# playing: ticked for tonight's game
# say: optional, how the announcer should pronounce the name (used by npm run voice)
`;

export function playersToYaml(players: Player[]): string {
  const doc = {
    players: players.map((p): YamlPlayer => ({
      name: p.name,
      rank: p.rank,
      ...(p.fixedRole ? { role: p.fixedRole } : {}),
      ...(p.bannedRole && !p.fixedRole ? { ban: p.bannedRole } : {}),
      ...(p.randomChampion ? { random_champion: true } : {}),
      playing: p.active,
      ...(p.say ? { say: p.say } : {}),
    })),
  };
  return HEADER + stringify(doc);
}

/**
 * Stable id derived from the name, so history and duels still match after reloading the roster
 * from players.yaml. Names that collide (case-insensitive) get a numeric suffix.
 */
export function playerId(name: string, taken: Iterable<string> = []): string {
  const used = new Set(taken);
  const base = `p:${name.trim().toLowerCase()}`;
  let id = base;
  for (let n = 2; used.has(id); n++) id = `${base}#${n}`;
  return id;
}

export type ImportResult = { ok: true; players: Player[] } | { ok: false; error: string };

export function playersFromYaml(text: string): ImportResult {
  let doc: unknown;
  try {
    doc = parse(text);
  } catch (e) {
    return { ok: false, error: `Not valid YAML: ${(e as Error).message}` };
  }

  // Accept both `players: [...]` and a bare list.
  const list = Array.isArray(doc) ? doc : (doc as { players?: unknown } | null)?.players;
  if (!Array.isArray(list)) return { ok: false, error: 'Expected a "players:" list.' };

  const players: Player[] = [];
  for (const [i, raw] of list.entries()) {
    const entry = raw as Partial<Record<keyof YamlPlayer, unknown>> | null;
    const where = `Player #${i + 1}`;
    const name = typeof entry?.name === 'string' || typeof entry?.name === 'number' ? String(entry.name).trim() : '';
    if (!name) return { ok: false, error: `${where}: missing name.` };
    const rank = entry?.rank;
    if (!isRank(rank)) {
      return { ok: false, error: `${name}: rank must be from 1 to 5 in half-star steps (1, 1.5, 2 … 5).` };
    }
    const role = entry?.role ?? null;
    if (role !== null && !ROLES.includes(role as Role)) {
      return { ok: false, error: `${name}: role must be one of ${ROLES.join(', ')}.` };
    }
    const ban = entry?.ban ?? null;
    if (ban !== null && !ROLES.includes(ban as Role)) {
      return { ok: false, error: `${name}: ban must be one of ${ROLES.join(', ')}.` };
    }
    if (ban !== null && ban === role) {
      return { ok: false, error: `${name}: can't be locked to and banned from ${role}.` };
    }
    players.push({
      id: playerId(name, players.map((p) => p.id)),
      name,
      rank,
      fixedRole: role as Role | null,
      ...(ban !== null ? { bannedRole: ban as Role } : {}),
      ...(entry?.random_champion === true ? { randomChampion: true } : {}),
      active: entry?.playing === true,
      ...(typeof entry?.say === 'string' && entry.say.trim() ? { say: entry.say.trim() } : {}),
    });
  }
  return { ok: true, players };
}
