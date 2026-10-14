export type Role = 'top' | 'jungle' | 'mid' | 'adc' | 'support';

export const ROLES: Role[] = ['top', 'jungle', 'mid', 'adc', 'support'];

export const ROLE_LABELS: Record<Role, string> = {
  top: 'Top',
  jungle: 'Jungle',
  mid: 'Mid',
  adc: 'ADC',
  support: 'Support',
};

export type Rank = 1 | 2 | 3 | 4 | 5;

export interface Player {
  id: string;
  name: string;
  /** 1 = weakest, 5 = strongest. */
  rank: Rank;
  /** Set for new players who always play the same role; null = random role. */
  fixedRole: Role | null;
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
}
