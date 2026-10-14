import { useState } from 'react';
import { newId } from '../storage';
import { ROLES, ROLE_LABELS, type Duel, type Player, type Role } from '../types';

interface Props {
  /** Players playing tonight. */
  players: Player[];
  duels: Duel[];
  onChange: (duels: Duel[]) => void;
}

export default function DuelPanel({ players, duels, onChange }: Props) {
  const [challengerId, setChallengerId] = useState('');
  const [opponentId, setOpponentId] = useState('');
  const [lane, setLane] = useState<Role | 'random'>('random');

  const busy = new Set(duels.flatMap((d) => [d.challengerId, d.opponentId]));
  const free = players.filter((p) => !busy.has(p.id));
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? '?';

  const canAdd = challengerId && opponentId && challengerId !== opponentId && !busy.has(challengerId) && !busy.has(opponentId);

  const add = () => {
    if (!canAdd) return;
    onChange([...duels, { id: newId(), challengerId, opponentId, lane }]);
    setChallengerId('');
    setOpponentId('');
    setLane('random');
  };

  return (
    <section className="panel duels">
      <h2>⚔ Duels</h2>
      <p className="hint">Once the challenge is accepted, both players face each other in the same lane. A duel only lasts one game: it is
        removed when you click "We play this".</p>

      <div className="duel-form">
        <select value={challengerId} onChange={(e) => setChallengerId(e.target.value)}>
          <option value="">Challenger…</option>
          {free.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="vs-small">VS</span>
        <select value={opponentId} onChange={(e) => setOpponentId(e.target.value)}>
          <option value="">Opponent…</option>
          {free
            .filter((p) => p.id !== challengerId)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <select value={lane} onChange={(e) => setLane(e.target.value as Role | 'random')}>
          <option value="random">Random lane</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <button className="btn primary" disabled={!canAdd} onClick={add}>
          Accepted ✓
        </button>
      </div>

      {duels.length > 0 && (
        <ul className="duel-list">
          {duels.map((d) => (
            <li key={d.id}>
              <span>
                <b>{name(d.challengerId)}</b> ⚔ <b>{name(d.opponentId)}</b>
                <small> — {d.lane === 'random' ? 'random lane' : ROLE_LABELS[d.lane]}</small>
              </span>
              <button className="btn icon" onClick={() => onChange(duels.filter((x) => x.id !== d.id))} title="Cancel duel">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
