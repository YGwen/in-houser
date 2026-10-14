import type { Duel, PlayedGame, Player } from './types';

const KEY = 'in-houser:v1';

export interface SavedState {
  players: Player[];
  duels: Duel[];
  tolerance: number;
  muted: boolean;
  /** Voice announcer during the reveal. */
  announcer: boolean;
  /** Most recent first. */
  history: PlayedGame[];
  /** Version of the repo's players.yaml this device last loaded (see src/roster.ts). */
  rosterVersion?: string;
}

export const DEFAULT_STATE: SavedState = { players: [], duels: [], tolerance: 1, muted: false, announcer: true, history: [] };

export const MAX_HISTORY = 20;

export function loadState(): SavedState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as Partial<SavedState>) };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveState(state: SavedState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable (private mode, blocked): the app still works for this session.
  }
}

export const newId = () => Math.random().toString(36).slice(2, 10);
