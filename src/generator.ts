import { repeatScorer } from './history';
import { ROLES, ROLE_LABELS, type Duel, type PlayedGame, type Player, type Role, type TeamResult, type TeamRoster } from './types';

export type Rng = () => number;

export interface GenerateInput {
  players: Player[];
  duels: Duel[];
  /** Accept any split whose rank gap is at most (best possible gap + tolerance). */
  tolerance: number;
  /** Games played earlier, most recent first: used to avoid repeating roles and teammates. */
  history?: PlayedGame[];
  now?: number;
  rng?: Rng;
}

/** Splits whose repeat score is this close to the best one are all fair game, to keep some randomness. */
const REPEAT_SLACK = 0.3;

export type GenerateOutput = { ok: true; result: TeamResult } | { ok: false; errors: string[] };

export const TEAM_SIZE = 5;

function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Lane a duel is forced into before any randomness, or null if it is free to pick. */
function forcedDuelLane(duel: Duel, byId: Map<string, Player>): Role | null {
  if (duel.lane !== 'random') return duel.lane;
  return byId.get(duel.challengerId)?.fixedRole ?? byId.get(duel.opponentId)?.fixedRole ?? null;
}

/** True if `player` must never get `role` (a lock to a role overrides any ban). */
export const isBanned = (player: Player, role: Role) => !player.fixedRole && player.bannedRole === role;

export function validate(players: Player[], duels: Duel[]): string[] {
  const errors: string[] = [];
  const active = players.filter((p) => p.active);
  const byId = new Map(active.map((p) => [p.id, p]));

  if (active.length !== TEAM_SIZE * 2) {
    errors.push(`Select exactly 10 players (currently ${active.length}).`);
  }

  for (const role of ROLES) {
    const fixed = active.filter((p) => p.fixedRole === role);
    if (fixed.length > 2) {
      errors.push(`${fixed.length} players are locked to ${ROLE_LABELS[role]}, but only 2 can play it.`);
    }
  }

  const inDuel = new Set<string>();
  const forcedLanes = new Map<Role, Duel>();
  for (const duel of duels) {
    const a = byId.get(duel.challengerId);
    const b = byId.get(duel.opponentId);
    if (!a || !b) {
      errors.push('A duel involves a player who is not playing tonight.');
      continue;
    }
    const label = `${a.name} vs ${b.name}`;
    if (a.id === b.id) errors.push(`${a.name} cannot duel themselves.`);
    for (const p of [a, b]) {
      if (inDuel.has(p.id)) errors.push(`${p.name} is in more than one duel.`);
      inDuel.add(p.id);
    }
    if (a.fixedRole && b.fixedRole && a.fixedRole !== b.fixedRole) {
      errors.push(`Duel ${label}: they are locked to different roles.`);
      continue;
    }
    for (const p of [a, b]) {
      if (duel.lane !== 'random' && p.fixedRole && p.fixedRole !== duel.lane) {
        errors.push(`Duel ${label}: ${p.name} is locked to ${ROLE_LABELS[p.fixedRole]}, not ${ROLE_LABELS[duel.lane]}.`);
      }
    }
    const lane = forcedDuelLane(duel, byId);
    if (lane) {
      for (const p of [a, b]) {
        if (isBanned(p, lane)) errors.push(`Duel ${label}: ${p.name} has banned ${ROLE_LABELS[lane]}.`);
      }
      if (forcedLanes.has(lane)) errors.push(`Two duels are set on ${ROLE_LABELS[lane]}.`);
      forcedLanes.set(lane, duel);
    }
  }

  return errors;
}

/**
 * Assign roles for one team split. Returns null if no assignment satisfies fixed roles, bans and duels.
 * Duel lanes are found by backtracking (checking everyone else can still avoid their ban), so null really means impossible for this split.
 */
export function assignRoles(
  blueTeam: Player[],
  redTeam: Player[],
  duels: Duel[],
  rng: Rng,
  rolePenalty: (player: Player, role: Role) => number = () => 0,
): { blue: TeamRoster; red: TeamRoster; duelLanes: Role[]; penalty: number } | null {
  const blue: Partial<TeamRoster> = {};
  const red: Partial<TeamRoster> = {};

  for (const [team, slots] of [
    [blueTeam, blue],
    [redTeam, red],
  ] as const) {
    for (const p of team) {
      if (!p.fixedRole) continue;
      if (slots[p.fixedRole]) return null;
      slots[p.fixedRole] = p;
    }
  }

  const blueIds = new Set(blueTeam.map((p) => p.id));
  const all = new Map([...blueTeam, ...redTeam].map((p) => [p.id, p]));
  const pairs = duels.map((d) => {
    const a = all.get(d.challengerId)!;
    const b = all.get(d.opponentId)!;
    return blueIds.has(a.id) ? { duel: d, blueP: a, redP: b } : { duel: d, blueP: b, redP: a };
  });

  const duelLanes: Role[] = [];
  const fits = (slot: Player | undefined, p: Player) => !slot || slot.id === p.id;

  // Hand out the free roles of both teams; false if bans make that impossible.
  const fillTeams = (): boolean => {
    const picks: [Partial<TeamRoster>, Role, Player][] = [];
    for (const [team, slots] of [
      [blueTeam, blue],
      [redTeam, red],
    ] as const) {
      const placed = new Set(Object.values(slots).flatMap((p) => (p ? [p.id] : [])));
      const rest = team.filter((p) => !placed.has(p.id));
      const freeRoles = ROLES.filter((r) => !slots[r]);
      // Try every way to hand out the free roles (at most 5! = 120) and keep one of the least repetitive.
      const cost = rest.map((p) => freeRoles.map((r) => (isBanned(p, r) ? Infinity : rolePenalty(p, r))));
      let best: number[][] = [];
      let bestScore = Infinity;
      for (const order of indexPermutations(rest.length)) {
        let score = 0;
        for (let i = 0; i < order.length; i++) score += cost[order[i]][i];
        if (score < bestScore - 1e-9) {
          best = [order];
          bestScore = score;
        } else if (score < bestScore + 1e-9) {
          best.push(order);
        }
      }
      if (!best.length) return false; // every assignment hits a banned role
      const chosen = best[Math.floor(rng() * best.length)];
      freeRoles.forEach((r, i) => picks.push([slots, r, rest[chosen[i]]]));
    }
    for (const [slots, role, player] of picks) slots[role] = player;
    return true;
  };

  const placeDuels = (i: number): boolean => {
    if (i === pairs.length) return fillTeams();
    const { duel, blueP, redP } = pairs[i];
    const forced = duel.lane !== 'random' ? duel.lane : (blueP.fixedRole ?? redP.fixedRole);
    // Random order, but lanes the duelists played recently are tried last.
    const lanePenalty = (lane: Role) => rolePenalty(blueP, lane) + rolePenalty(redP, lane);
    const candidates = forced ? [forced] : shuffle(ROLES, rng).sort((x, y) => lanePenalty(x) - lanePenalty(y));
    for (const lane of candidates) {
      if (duelLanes.includes(lane)) continue;
      if (!fits(blue[lane], blueP) || !fits(red[lane], redP)) continue;
      // A fixed duelist can only be placed in their own lane.
      if (blueP.fixedRole && blueP.fixedRole !== lane) continue;
      if (redP.fixedRole && redP.fixedRole !== lane) continue;
      if (isBanned(blueP, lane) || isBanned(redP, lane)) continue;
      const prevBlue = blue[lane];
      const prevRed = red[lane];
      blue[lane] = blueP;
      red[lane] = redP;
      duelLanes.push(lane);
      if (placeDuels(i + 1)) return true;
      duelLanes.pop();
      blue[lane] = prevBlue;
      red[lane] = prevRed;
    }
    return false;
  };

  if (!placeDuels(0)) return null;

  const penalty = ROLES.reduce((s, r) => s + rolePenalty(blue[r]!, r) + rolePenalty(red[r]!, r), 0);
  return { blue: blue as TeamRoster, red: red as TeamRoster, duelLanes, penalty };
}

const permutationCache = new Map<number, number[][]>();

/** All orderings of 0..n-1, computed once per n. */
function indexPermutations(n: number): number[][] {
  let cached = permutationCache.get(n);
  if (!cached) {
    const build = (items: number[]): number[][] =>
      items.length <= 1 ? [items] : items.flatMap((x, i) => build([...items.slice(0, i), ...items.slice(i + 1)]).map((r) => [x, ...r]));
    cached = build([...Array(n).keys()]);
    permutationCache.set(n, cached);
  }
  return cached;
}

const total = (team: Player[]) => team.reduce((sum, p) => sum + p.rank, 0);

/** All 5v5 splits of 10 players, without mirrored duplicates (player 0 is always in the first team). */
export function allSplits(players: Player[]): [Player[], Player[]][] {
  const splits: [Player[], Player[]][] = [];
  const n = players.length;
  for (let mask = 0; mask < 1 << n; mask++) {
    if (!(mask & 1)) continue;
    let bits = 0;
    for (let m = mask; m; m &= m - 1) bits++;
    if (bits !== n / 2) continue;
    const a: Player[] = [];
    const b: Player[] = [];
    players.forEach((p, i) => (mask & (1 << i) ? a : b).push(p));
    splits.push([a, b]);
  }
  return splits;
}

export function generate({ players, duels, tolerance, history = [], now = Date.now(), rng = Math.random }: GenerateInput): GenerateOutput {
  const errors = validate(players, duels);
  if (errors.length) return { ok: false, errors };

  const active = players.filter((p) => p.active);
  const scorer = repeatScorer(history, now);

  type Candidate = { gap: number; repeats: number; roles: NonNullable<ReturnType<typeof assignRoles>> };
  const valid: Candidate[] = [];
  for (const [a, b] of allSplits(active)) {
    const aIds = new Set(a.map((p) => p.id));
    const duelsSplit = duels.every((d) => aIds.has(d.challengerId) !== aIds.has(d.opponentId));
    if (!duelsSplit) continue;
    const roles = assignRoles(a, b, duels, rng, scorer.rolePenalty);
    if (!roles) continue;
    valid.push({ gap: Math.abs(total(a) - total(b)), repeats: roles.penalty + scorer.teammatePenalty(a, b), roles });
  }

  if (!valid.length) {
    return { ok: false, errors: ['No valid teams exist with these locked roles, bans and duels. Try changing a duel lane, a locked role or a ban.'] };
  }

  // Balance first: only splits close to the best rank gap.
  const minGap = Math.min(...valid.map((c) => c.gap));
  const pool = valid.filter((c) => c.gap <= minGap + tolerance);
  // Then variety: among those, the ones that repeat recent roles and teammates the least.
  const minRepeats = Math.min(...pool.map((c) => c.repeats));
  const finalists = pool.filter((c) => c.repeats <= minRepeats + REPEAT_SLACK);
  const pick = finalists[Math.floor(rng() * finalists.length)];

  // Randomly decide which team is blue side.
  const swap = rng() < 0.5;
  const blue = swap ? pick.roles.red : pick.roles.blue;
  const red = swap ? pick.roles.blue : pick.roles.red;
  const blueTotal = ROLES.reduce((s, r) => s + blue[r].rank, 0);
  const redTotal = ROLES.reduce((s, r) => s + red[r].rank, 0);

  return {
    ok: true,
    result: { blue, red, blueTotal, redTotal, gap: Math.abs(blueTotal - redTotal), duelLanes: pick.roles.duelLanes },
  };
}
