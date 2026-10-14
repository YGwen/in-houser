import { describe, expect, it } from 'vitest';
import { mergeRepoRoster, repoRoster } from './roster';

describe('repo roster (players.yaml)', () => {
  it('loads the committed players.yaml', () => {
    const roster = repoRoster();
    expect(roster.length).toBeGreaterThan(0);
    expect(new Set(roster.map((p) => p.id)).size).toBe(roster.length);
    for (const p of roster) {
      expect(p.rank).toBeGreaterThanOrEqual(1);
      expect(p.rank).toBeLessThanOrEqual(5);
    }
  });

  it("keeps this device's playing ticks and uses the repo for everything else", () => {
    const repo = repoRoster();
    const [a, b] = repo;
    const local = [
      { ...a, active: !a.active, rank: a.rank === 5 ? 1 : 5 },
      { ...b, id: 'p:someone-removed', active: true },
    ] as typeof repo;
    const merged = mergeRepoRoster(repo, local);
    expect(merged).toHaveLength(repo.length);
    expect(merged[0].active).toBe(!a.active); // local tick kept
    expect(merged[0].rank).toBe(a.rank); // repo rank wins
    expect(merged[1].active).toBe(b.active); // unknown locally -> YAML value
  });
});
