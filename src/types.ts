export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support';

export const ROLES: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

export const ROLE_LABELS: Record<Role, string> = {
  top: 'Top',
  jungle: 'Jungle',
  mid: 'Mid',
  adc: 'ADC',
  support: 'Support',
};

/** Skill from 1 (beginner) to 5 (best), in half-star steps: 1, 1.5, 2 … 5. */
export type Rank = number;

export const RANKS: Rank[] = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];

export const isRank = (value: unknown): value is Rank => typeof value === 'number' && RANKS.includes(value);

/** 3.5 -> "★★★½" */
export const formatStars = (rank: Rank) => '★'.repeat(Math.floor(rank)) + (rank % 1 ? '½' : '');

export interface Player {
  id: string;
  name: string;
  /** 1 = weakest, 5 = strongest, half stars allowed. */
  rank: Rank;
  /** Set for new players who always play the same role; null = random role. */
  fixedRole: Role | null;
  /** A role this player never gets (set in players.yaml as `ban:`). Ignored when fixedRole is set. */
  bannedRole?: Role | null;
  /** Wants a random champion that fits their assigned role (players.yaml: `random_champion: true`). */
  randomChampion?: boolean;
  /** Playing tonight. */
  active: boolean;
  /** Optional pronunciation for the announcer voice (set in players.yaml as `say:`). */
  say?: string;
}

export interface Duel {
  id: string;
  challengerId: string;
  opponentId: string;
  lane: Role | 'random';
}

export type TeamRoster = Record<Role, Player>;

/** A game the group actually played (rerolls are not recorded). Players are stored by id. */
export interface PlayedGame {
  id: string;
  playedAt: number;
  blue: Record<Role, string>;
  red: Record<Role, string>;
  duelLanes: Role[];
}

export interface TeamResult {
  blue: TeamRoster;
  red: TeamRoster;
  blueTotal: number;
  redTotal: number;
  gap: number;
  /** Lanes where a duel takes place. */
  duelLanes: Role[];
  /** Random champion (Data Dragon id) per player id, for players who asked for one. */
  champions?: Record<string, string>;
}
