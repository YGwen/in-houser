// The player database is players.yaml at the repo root, bundled into the app at build time.
// Every device starts from it; local edits stay on the device until the repo file changes.
import repoYaml from '../players.yaml?raw';
import { playersFromYaml } from './playersYaml';
import type { Player } from './types';

/** Changes whenever players.yaml changes, so devices know to pick up the new roster. */
export const REPO_ROSTER_VERSION = hash(repoYaml);

export function repoRoster(): Player[] {
  const out = playersFromYaml(repoYaml);
  if (!out.ok) {
    console.error(`players.yaml is invalid: ${out.error}`);
    return [];
  }
  return out.players;
}

/**
 * Take the repo roster but keep this device's "playing tonight" ticks for players it already knew.
 * Players new to the device use the `playing` value from the YAML.
 */
export function mergeRepoRoster(repo: Player[], local: Player[]): Player[] {
  const localActive = new Map(local.map((p) => [p.id, p.active]));
  return repo.map((p) => ({ ...p, active: localActive.get(p.id) ?? p.active }));
}

function hash(text: string): string {
  let h = 0x811c9dc5; // FNV-1a
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
