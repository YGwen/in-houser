import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { playerId, playersFromYaml, playersToYaml } from '../playersYaml';
import { ROLES, ROLE_LABELS, type Player, type Rank, type Role } from '../types';
import StarRating from './StarRating';

interface Props {
  players: Player[];
  onChange: (players: Player[]) => void;
  /** Replace the roster with the repo's players.yaml (keeps "playing tonight" ticks). */
  onResetToRepo: () => void;
}

function RoleSelect({ value, onChange }: { value: Role | null; onChange: (r: Role | null) => void }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange((e.target.value || null) as Role | null)}
      title="New players can be locked to one role"
    >
      <option value="">Any role</option>
      {ROLES.map((r) => (
        <option key={r} value={r}>
          🔒 {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}

function BanSelect({ value, disabled, onChange }: { value: Role | null; disabled: boolean; onChange: (r: Role | null) => void }) {
  return (
    <select
      className={`ban ${value && !disabled ? 'set' : ''}`}
      value={disabled ? '' : (value ?? '')}
      disabled={disabled}
      onChange={(e) => onChange((e.target.value || null) as Role | null)}
      title={disabled ? 'Locked players always get their role' : 'A role this player never gets'}
    >
      <option value="">🚫 No ban</option>
      {ROLES.map((r) => (
        <option key={r} value={r}>
          🚫 {ROLE_LABELS[r]}
        </option>
      ))}
    </select>
  );
}

export default function RosterPanel({ players, onChange, onResetToRepo }: Props) {
  const [name, setName] = useState('');
  const [rank, setRank] = useState<Rank>(3);
  const [fixedRole, setFixedRole] = useState<Role | null>(null);
  const [bannedRole, setBannedRole] = useState<Role | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState('');

  const activeCount = players.filter((p) => p.active).length;

  const exportYaml = () => {
    const blob = new Blob([playersToYaml(players)], { type: 'application/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'players.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importYaml = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-importing the same file
    if (!file) return;
    const out = playersFromYaml(await file.text());
    if (!out.ok) {
      setImportError(`Import failed — ${out.error}`);
      return;
    }
    setImportError('');
    if (players.length && !window.confirm(`Replace the current ${players.length} players with ${out.players.length} from ${file.name}?`)) {
      return;
    }
    onChange(out.players);
  };
  const update = (id: string, patch: Partial<Player>) => onChange(players.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const add = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = playerId(trimmed, players.map((p) => p.id));
    const ban = fixedRole ? null : bannedRole;
    onChange([...players, { id, name: trimmed, rank, fixedRole, bannedRole: ban, active: activeCount < 10 }]);
    setName('');
    setFixedRole(null);
    setBannedRole(null);
  };

  return (
    <section className="panel roster">
      <div className="panel-head">
        <h2>Players</h2>
        <span className={`counter ${activeCount === 10 ? 'ok' : ''}`}>{activeCount}/10 playing</span>
      </div>

      <form className="add-player" onSubmit={add}>
        <input placeholder="Summoner name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} />
        <StarRating value={rank} onChange={setRank} />
        <RoleSelect value={fixedRole} onChange={setFixedRole} />
        <BanSelect value={bannedRole} disabled={!!fixedRole} onChange={setBannedRole} />
        <button className="btn primary" type="submit" disabled={!name.trim()}>
          Add
        </button>
      </form>

      {players.length === 0 ? (
        <p className="hint">Add your friends. Rank them from ★ (beginner) to ★★★★★ (best), half stars allowed. Lock a role for new players, or ban a role someone never wants. 🎲 gives a player a random champion for their role.</p>
      ) : (
        <ul className="player-list">
          {players.map((p) => (
            <li key={p.id} className={p.active ? 'active' : ''}>
              <input
                type="checkbox"
                checked={p.active}
                onChange={(e) => update(p.id, { active: e.target.checked })}
                title="Playing tonight"
              />
              <input className="name" value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} maxLength={24} />
              <StarRating value={p.rank} onChange={(r) => update(p.id, { rank: r })} />
              <RoleSelect value={p.fixedRole} onChange={(r) => update(p.id, { fixedRole: r })} />
              <BanSelect
                value={p.bannedRole ?? null}
                disabled={!!p.fixedRole}
                onChange={(r) => update(p.id, { bannedRole: r })}
              />
              <button
                className={`btn icon champ-toggle ${p.randomChampion ? 'on' : ''}`}
                onClick={() => update(p.id, { randomChampion: !p.randomChampion })}
                aria-pressed={!!p.randomChampion}
                title={p.randomChampion ? 'Gets a random champion for their role (click to turn off)' : 'Give this player a random champion for their role'}
              >
                🎲
              </button>
              <button className="btn icon" onClick={() => onChange(players.filter((x) => x.id !== p.id))} title="Remove player">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="row-actions">
        {players.length > 0 && (
          <button className="btn" onClick={() => onChange(players.map((p) => ({ ...p, active: false })))}>
            Unselect all
          </button>
        )}
        <button className="btn" onClick={exportYaml} disabled={players.length === 0}>
          ⬇ Export players.yaml
        </button>
        <button className="btn" onClick={() => fileInput.current?.click()}>
          ⬆ Import YAML
        </button>
        <input ref={fileInput} type="file" accept=".yaml,.yml" hidden onChange={importYaml} />
        <button
          className="btn"
          onClick={() => window.confirm("Replace this device's roster with players.yaml from the repo? Local changes are lost.") && onResetToRepo()}
        >
          ↺ Reset to repo roster
        </button>
      </div>
      {importError && <p className="errors-inline">{importError}</p>}
      <p className="hint">
        The roster comes from <code>players.yaml</code> in the repo. Changes made here stay on this device; to share
        them, export <code>players.yaml</code> and commit it.
      </p>
    </section>
  );
}
