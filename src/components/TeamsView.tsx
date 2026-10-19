import { useState } from 'react';
import { championById } from '../champions';
import { ROLES, ROLE_LABELS, type Player, type TeamResult } from '../types';
import ChampionTag from './ChampionTag';

interface Props {
  result: TeamResult;
  /** Game number once these teams were recorded as played, else null. */
  recordedAs: number | null;
  onRecord: () => void;
  onReroll: () => void;
  onQuickReroll: () => void;
  onRerollChampions: () => void;
  onReplay: () => void;
}

function asText(r: TeamResult) {
  const lines = [`🔵 BLUE (${r.blueTotal}★)  vs  🔴 RED (${r.redTotal}★)`];
  const who = (p: Player) => {
    const champ = championById(r.champions?.[p.id] ?? '');
    return champ ? `${p.name} (${champ.name})` : p.name;
  };
  for (const role of ROLES) {
    const duel = r.duelLanes.includes(role) ? '  ⚔ DUEL' : '';
    lines.push(`${ROLE_LABELS[role].toUpperCase()}: ${who(r.blue[role])} vs ${who(r.red[role])}${duel}`);
  }
  return lines.join('\n');
}

export default function TeamsView({ result, recordedAs, onRecord, onReroll, onQuickReroll, onRerollChampions, onReplay }: Props) {
  const hasChampions = Object.keys(result.champions ?? {}).length > 0;
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
              <span className="p blue" title={result.blue[role].style}>
                {result.blue[role].name}
                <ChampionTag id={result.champions?.[result.blue[role].id]} />
              </span>
              <span className="lane">
                {duel && '⚔ '}
                {ROLE_LABELS[role]}
              </span>
              <span className="p red" title={result.red[role].style}>
                {result.red[role].name}
                <ChampionTag id={result.champions?.[result.red[role].id]} />
              </span>
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
        {hasChampions && (
          <button className="btn" onClick={onRerollChampions} title="New random champions, same teams">
            🎲 Reroll champions
          </button>
        )}
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
