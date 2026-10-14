import { describe, expect, it } from 'vitest';
import { playersFromYaml, playersToYaml } from './playersYaml';
import type { Player } from './types';

const players: Player[] = [
  { id: 'a', name: 'Faker', rank: 5, fixedRole: null, active: true },
  { id: 'b', name: 'Newbie', rank: 1, fixedRole: 'support', active: false },
];

describe('players YAML', () => {
  it('round-trips players', () => {
    const yaml = playersToYaml(players);
    expect(yaml).toContain('name: Faker');
    expect(yaml).toContain('role: support');
    const out = playersFromYaml(yaml);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    const withoutId = (list: Player[]) => list.map((p) => ({ ...p, id: undefined }));
    expect(withoutId(out.players)).toEqual(withoutId(players));
  });

  it('accepts a hand-written file with defaults', () => {
    const out = playersFromYaml('players:\n  - name: Zeus\n    rank: 3\n');
    expect(out).toMatchObject({ ok: true, players: [{ name: 'Zeus', rank: 3, fixedRole: null, active: false }] });
  });

  it('derives stable ids from names, deduplicating collisions', () => {
    const yaml = 'players:\n  - { name: Greg, rank: 3 }\n  - { name: greg, rank: 2 }\n';
    const first = playersFromYaml(yaml);
    const second = playersFromYaml(yaml);
    expect(first.ok && first.players.map((p) => p.id)).toEqual(['p:greg', 'p:greg#2']);
    expect(second.ok && second.players.map((p) => p.id)).toEqual(['p:greg', 'p:greg#2']);
  });

  it('rejects bad ranks, roles and syntax', () => {
    expect(playersFromYaml('players:\n  - name: A\n    rank: 7\n').ok).toBe(false);
    expect(playersFromYaml('players:\n  - name: A\n    rank: 3\n    role: carry\n').ok).toBe(false);
    expect(playersFromYaml('players:\n  - rank: 3\n').ok).toBe(false);
    expect(playersFromYaml('players: [').ok).toBe(false);
    expect(playersFromYaml('hello').ok).toBe(false);
  });
});
