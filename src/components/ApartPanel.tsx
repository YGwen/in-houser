import { useState } from 'react';
import { newId } from '../storage';
import type { Apart, Player } from '../types';

interface Props {
  /** The whole roster: a pair stays saved while one of its players sits a night out. */
  players: Player[];
  apart: Apart[];
  onChange: (apart: Apart[]) => void;
}

/** Pairs of players who always end up on opposite teams, in any lanes (unlike a duel). */
export default function ApartPanel({ players, apart, onChange }: Props) {
  const [aId, setAId] = useState('');
  const [bId, setBId] = useState('');

  const byId = new Map(players.map((p) => [p.id, p]));
  const exists = (a: string, b: string) => apart.some((p) => (p.aId === a && p.bId === b) || (p.aId === b && p.bId === a));
  const canAdd = aId && bId && aId !== bId && !exists(aId, bId);
  const sorted = [...players].sort((x, y) => Number(y.active) - Number(x.active) || x.name.localeCompare(y.name));

  const add = () => {
    if (!canAdd) return;
    onChange([...apart, { id: newId(), aId, bId }]);
    setAId('');
    setBId('');
  };

  const option = (p: Player) => (
    <option key={p.id} value={p.id}>
      {p.name}
      {p.active ? '' : ' (not playing)'}
    </option>
  );

  return (
    <section className="panel apart">
      <h2>⇄ Opposite teams</h2>
      <p className="hint">These two players are never on the same team, in any lanes. Unlike a duel, the pair stays from game to game
        until you remove it.</p>

      <div className="duel-form">
        <select value={aId} onChange={(e) => setAId(e.target.value)} aria-label="First player">
          <option value="">Player…</option>
          {sorted.map(option)}
        </select>
        <span className="vs-small">≠</span>
        <select value={bId} onChange={(e) => setBId(e.target.value)} aria-label="Second player">
          <option value="">Player…</option>
          {sorted.filter((p) => p.id !== aId).map(option)}
        </select>
        <button className="btn primary" disabled={!canAdd} onClick={add}>
          Add
        </button>
      </div>

      {apart.length > 0 && (
        <ul className="duel-list">
          {apart.map((p) => {
            const [a, b] = [byId.get(p.aId), byId.get(p.bId)];
            const sittingOut = !a?.active || !b?.active;
            return (
              <li key={p.id} className={sittingOut ? 'inactive' : ''}>
                <span>
                  <b>{a?.name ?? '?'}</b> ⇄ <b>{b?.name ?? '?'}</b>
                  <small> — {sittingOut ? 'ignored tonight (not both playing)' : 'opposite teams'}</small>
                </span>
                <button className="btn icon" onClick={() => onChange(apart.filter((x) => x.id !== p.id))} title="Remove pair">
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
