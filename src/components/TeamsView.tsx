import { useState } from 'react';
import { ROLES, ROLE_LABELS, type TeamResult } from '../types';

interface Props {
  result: TeamResult;
  /** Game number once these teams were recorded as played, else null. */
  recordedAs: number | null;
  onRecord: () => void;
  onReroll: () => void;
  onQuickReroll: () => void;
  onReplay: () => void;
}

function asText(r: TeamResult) {
  const lines = [`🔵 BLUE (${r.blueTotal}★)  vs  🔴 RED (${r.redTotal}★)`];
  for (const role of ROLES) {
    const duel = r.duelLanes.includes(role) ? '  ⚔ DUEL' : '';
    lines.push(`${ROLE_LABELS[role].toUpperCase()}: ${r.blue[role].name} vs ${r.red[role].name}${duel}`);
  }
  return lines.join('\n');
}

export default function TeamsView({ result, recordedAs, onRecord, onReroll, onQuickReroll, onReplay }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(asText(result));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: nothing else to do.
    }
  };

  return (
    <section className="panel teams">
      <div className="teams-head">
        <div className="team-name blue">
          BLUE <small>{result.blueTotal}★</small>
        </div>
        <div className="gap">gap {result.gap}</div>
        <div className="team-name red">
          RED <small>{result.redTotal}★</small>
        </div>
      </div>

      <ul className="lanes">
        {ROLES.map((role) => {
          const duel = result.duelLanes.includes(role);
          return (
            <li key={role} className={duel ? 'duel' : ''}>
              <span className="p blue">{result.blue[role].name}</span>
              <span className="lane">
                {duel && '⚔ '}
                {ROLE_LABELS[role]}
              </span>
              <span className="p red">{result.red[role].name}</span>
            </li>
          );
        })}
      </ul>

      <div className="row-actions">
        <button
          className="btn primary"
          onClick={onRecord}
          disabled={recordedAs !== null}
          title="Save these teams to tonight's games so the next roll avoids repeating roles and teammates"
        >
          {recordedAs !== null ? `✓ Saved as game ${recordedAs}` : '✓ We play this'}
        </button>
        <button className="btn" onClick={onReroll}>
          🎲 Reroll
        </button>
        <button className="btn" onClick={onQuickReroll}>
          Quick reroll (no reveal)
        </button>
        <button className="btn" onClick={onReplay}>
          ▶ Replay reveal
        </button>
        <button className="btn" onClick={copy}>
          {copied ? 'Copied!' : '📋 Copy for Discord'}
        </button>
      </div>
    </section>
  );
}
