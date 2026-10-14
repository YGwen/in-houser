import { EVENING_MS, RECENT_GAMES } from '../history';
import { ROLES, ROLE_LABELS, type PlayedGame, type Player } from '../types';

interface Props {
  history: PlayedGame[];
  players: Player[];
  onChange: (history: PlayedGame[]) => void;
}

const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export default function HistoryPanel({ history, players, onChange }: Props) {
  const now = Date.now();
  const tonight = history.filter((g) => now - g.playedAt < EVENING_MS);
  if (!tonight.length) return null;

  const name = (id: string) => players.find((p) => p.id === id)?.name ?? '(removed)';

  return (
    <section className="panel history">
      <div className="panel-head">
        <h2>Tonight's games</h2>
        <button className="btn" onClick={() => onChange([])} title="Forget all games (start a new evening)">
          New evening
        </button>
      </div>
      <p className="hint">
        The last {RECENT_GAMES} games are used to avoid giving people the same role or teammates again.
      </p>
      <ol className="history-list">
        {tonight.map((g, i) => (
          <li key={g.id} className={i < RECENT_GAMES ? 'counts' : ''}>
            <div className="history-head">
              <b>Game {tonight.length - i}</b>
              <small>{time(g.playedAt)}</small>
              <button className="btn icon" onClick={() => onChange(history.filter((x) => x.id !== g.id))} title="Remove this game">
                ✕
              </button>
            </div>
            <table>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r} className={g.duelLanes.includes(r) ? 'duel' : ''}>
                    <td className="blue">{name(g.blue[r])}</td>
                    <td className="lane">
                      {g.duelLanes.includes(r) && '⚔ '}
                      {ROLE_LABELS[r]}
                    </td>
                    <td className="red">{name(g.red[r])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </li>
        ))}
      </ol>
    </section>
  );
}
