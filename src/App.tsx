import { useEffect, useState } from 'react';
import { setAnnouncerEnabled, stopAnnouncer } from './audio/announcer';
import { audio, setMuted } from './audio/engine';
import DuelPanel from './components/DuelPanel';
import HistoryPanel from './components/HistoryPanel';
import RevealScreen from './components/RevealScreen';
import RosterPanel from './components/RosterPanel';
import TeamsView from './components/TeamsView';
import { generate } from './generator';
import { EVENING_MS, toPlayedGame } from './history';
import { MAX_HISTORY, loadState, newId, saveState } from './storage';
import type { Duel, PlayedGame, Player, TeamResult } from './types';

export default function App() {
  const [initial] = useState(loadState);
  const [players, setPlayers] = useState<Player[]>(initial.players);
  const [duels, setDuels] = useState<Duel[]>(initial.duels);
  const [tolerance, setTolerance] = useState(initial.tolerance);
  const [muted, setMutedState] = useState(initial.muted);
  const [announcer, setAnnouncer] = useState(initial.announcer);
  const [history, setHistory] = useState<PlayedGame[]>(initial.history);
  const [result, setResult] = useState<TeamResult | null>(null);
  const [recordedAs, setRecordedAs] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [revealing, setRevealing] = useState(false);

  useEffect(
    () => saveState({ players, duels, tolerance, muted, announcer, history }),
    [players, duels, tolerance, muted, announcer, history],
  );
  useEffect(() => {
    setMuted(muted);
    if (muted) stopAnnouncer();
  }, [muted]);
  useEffect(() => setAnnouncerEnabled(announcer), [announcer]);

  // Drop duels whose players were removed or are no longer playing tonight.
  const updatePlayers = (next: Player[]) => {
    setPlayers(next);
    const active = new Set(next.filter((p) => p.active).map((p) => p.id));
    setDuels((ds) => ds.filter((d) => active.has(d.challengerId) && active.has(d.opponentId)));
  };

  const roll = (withReveal: boolean) => {
    const out = generate({ players, duels, tolerance, history });
    if (!out.ok) {
      setErrors(out.errors);
      return;
    }
    setErrors([]);
    setResult(out.result);
    setRecordedAs(null);
    if (withReveal) {
      audio(); // unlock audio inside the click handler
      setRevealing(true);
    }
  };

  const recordGame = () => {
    if (!result || recordedAs !== null) return;
    const now = Date.now();
    const tonight = history.filter((g) => now - g.playedAt < EVENING_MS).length;
    setHistory([toPlayedGame(result, newId(), now), ...history].slice(0, MAX_HISTORY));
    setRecordedAs(tonight + 1);
    // A challenge is for one game: drop the duels that were fought in it (not ones added after this roll).
    const duelists = new Set(result.duelLanes.flatMap((r) => [result.blue[r].id, result.red[r].id]));
    setDuels((ds) => ds.filter((d) => !(duelists.has(d.challengerId) && duelists.has(d.opponentId))));
  };

  const activeCount = players.filter((p) => p.active).length;

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          IN<span>-</span>HOUSER
        </h1>
        <p>Balanced 5v5 custom games for the squad</p>
      </header>

      <main className="layout">
        <RosterPanel players={players} onChange={updatePlayers} />
        <div className="side">
          <DuelPanel players={players.filter((p) => p.active)} duels={duels} onChange={setDuels} />

          <section className="panel generate">
            <h2>Generate</h2>
            <label className="tolerance">
              <span>
                Variety <small>(allowed rank gap above the best split: {tolerance})</small>
              </span>
              <input type="range" min={0} max={3} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} />
            </label>
            <button className="btn primary big" disabled={activeCount !== 10} onClick={() => roll(true)}>
              ⚔ Generate teams
            </button>
            {activeCount !== 10 && <p className="hint">Select exactly 10 players ({activeCount}/10).</p>}
            {errors.length > 0 && (
              <ul className="errors">
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>

      {result && !revealing && (
        <TeamsView
          result={result}
          recordedAs={recordedAs}
          onRecord={recordGame}
          onReroll={() => roll(true)}
          onQuickReroll={() => roll(false)}
          onReplay={() => {
            audio();
            setRevealing(true);
          }}
        />
      )}

      <HistoryPanel history={history} players={players} onChange={setHistory} />

      {result && revealing && (
        <RevealScreen
          result={result}
          muted={muted}
          onToggleMute={() => setMutedState((m) => !m)}
          announcer={announcer}
          onToggleAnnouncer={() => setAnnouncer((a) => !a)}
          onDone={() => setRevealing(false)}
        />
      )}
    </div>
  );
}
