import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { announce, announcerIdle, preloadVoice, stopAnnouncer, type Line } from '../audio/announcer';
import { startMusic, stopMusic } from '../audio/music';
import { duelSting, fightJingle, vsHit, whoosh } from '../audio/sfx';
import { ROLES, type Player, type Role, type TeamResult } from '../types';

interface Props {
  result: TeamResult;
  muted: boolean;
  onToggleMute: () => void;
  announcer: boolean;
  onToggleAnnouncer: () => void;
  onDone: () => void;
}

const LANE_TITLES: Record<Role, string> = {
  top: 'TOP LANE',
  jungle: 'JUNGLE',
  mid: 'MID LANE',
  adc: 'BOT LANE · ADC',
  support: 'BOT LANE · SUPPORT',
};

const SPOKEN_LANES: Record<Role, string> = {
  top: 'Top lane!',
  jungle: 'Jungle!',
  mid: 'Mid lane!',
  adc: 'Bot lane. A, D, C!',
  support: 'Bot lane. Support!',
};

/** Make summoner names sayable: drop Riot tags (#EUW) and read separators as pauses, not "underscore". */
function spokenName(player: Player) {
  if (player.say) return `${player.say}!`;
  const clean = player.name.split('#')[0].replace(/[_\-.|~*]+/g, ' ').trim();
  return `${clean || player.name}!`;
}

const laneLine = (role: Role): Line => ({ text: SPOKEN_LANES[role], style: 'call', clip: { line: role } });
const nameLine = (player: Player): Line => ({ text: spokenName(player), style: 'name', clip: { name: player.name } });
const VERSUS: Line = { text: 'versus!', style: 'call', clip: { line: 'versus' } };
const DUEL: Line = { text: 'Duel!', style: 'hype', clip: { line: 'duel' } };
const FIGHT: Line = { text: 'Fight!', style: 'hype', clip: { line: 'fight' } };

// Reveal sequence for one lane, in seconds: lane title, then blue player, then the VS slam, then red player.
// Passed to CSS as variables so animations and sounds stay in sync.
// Spaced so the announcer ("<lane>!", "<name>!", "versus!", "<name>!") keeps up with the visuals.
const T_TITLE = 0;
const T_BLUE = 0.9;
const T_VS = 1.7;
const SLAM = 0.25; // duration of the VS slam keyframe
const T_RED = 2.6;
const DUEL_OFFSET = 0.8; // duel lanes show the DUEL banner first
const HOLD_AFTER_RED = 2;
const FIGHT_HOLD = 1800;

function cardTimings(offset: number) {
  return {
    '--t-title': `${offset + T_TITLE}s`,
    '--t-blue': `${offset + T_BLUE}s`,
    '--t-red': `${offset + T_RED}s`,
    '--t-vs': `${offset + T_VS}s`,
    '--t-impact': `${offset + T_VS + SLAM}s`,
  } as CSSProperties;
}

export default function RevealScreen({ result, muted, onToggleMute, announcer, onToggleAnnouncer, onDone }: Props) {
  // 0..4 = lanes, 5 = "FIGHT!"
  const [index, setIndex] = useState(0);
  const isFight = index >= ROLES.length;
  const role = ROLES[Math.min(index, ROLES.length - 1)];
  const isDuel = !isFight && result.duelLanes.includes(role);

  const next = useCallback(() => setIndex((i) => i + 1), []);
  // Keep the latest onDone without restarting the card timers when the parent re-renders (e.g. mute).
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const done = useCallback(() => onDoneRef.current(), []);

  useEffect(() => {
    startMusic();
    preloadVoice([
      VERSUS,
      DUEL,
      FIGHT,
      ...ROLES.flatMap((r) => [laneLine(r), nameLine(result.blue[r]), nameLine(result.red[r])]),
    ]);
    return () => stopMusic();
  }, [result]);

  // Sound + auto-advance for the current card.
  useEffect(() => {
    if (index > ROLES.length) {
      done();
      return;
    }
    let cancelled = false;
    const at = (seconds: number, fn: () => void) => window.setTimeout(fn, seconds * 1000);
    // Move on once the hold time has passed AND the announcer has finished talking.
    const advanceAfter = (seconds: number) =>
      at(seconds, () => {
        void announcerIdle().then(() => !cancelled && next());
      });

    let timers: number[];
    if (isFight) {
      fightJingle();
      stopMusic(1.5);
      timers = [at(0.3, () => void announce(FIGHT)), advanceAfter(FIGHT_HOLD / 1000)];
    } else {
      const o = isDuel ? DUEL_OFFSET : 0;
      timers = [
        at(o + T_TITLE + 0.1, () => void announce(laneLine(role))),
        at(o + T_BLUE, () => whoosh(true)),
        at(o + T_BLUE + 0.1, () => void announce(nameLine(result.blue[role]))),
        at(o + T_VS + SLAM, vsHit),
        at(o + T_VS + SLAM + 0.05, () => void announce(VERSUS)),
        at(o + T_RED, () => whoosh(false)),
        at(o + T_RED + 0.1, () => void announce(nameLine(result.red[role]))),
        advanceAfter(o + T_RED + HOLD_AFTER_RED),
      ];
      if (isDuel) timers.push(at(0.15, duelSting), at(0.3, () => void announce(DUEL)));
    }
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      // Skipping ahead: drop what the previous card still had to say.
      stopAnnouncer();
    };
  }, [index, isFight, isDuel, role, result, next, done]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'Escape') {
        done();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, done]);

  return (
    <div className={`reveal ${isDuel ? 'is-duel' : ''}`} onClick={next} role="dialog" aria-label="Team reveal">
      <div className="reveal-bg">
        <div className="half blue" />
        <div className="half red" />
      </div>
      <div className="scanlines" />

      {isFight ? (
        <div className="fight" key="fight">
          FIGHT!
        </div>
      ) : (
        <div className={`card ${isDuel ? 'duel' : ''}`} key={index} style={cardTimings(isDuel ? DUEL_OFFSET : 0)}>
          {isDuel && <div className="duel-banner">⚔ DUEL ⚔</div>}
          <div className="lane-title">{LANE_TITLES[role]}</div>
          <div className="fighters">
            <div className="fighter blue">
              <span className="side">BLUE SIDE</span>
              <span className="name">{result.blue[role].name}</span>
            </div>
            <div className="vs">VS</div>
            <div className="fighter red">
              <span className="side">RED SIDE</span>
              <span className="name">{result.red[role].name}</span>
            </div>
          </div>
        </div>
      )}

      <div className="reveal-footer" onClick={(e) => e.stopPropagation()}>
        <div className="dots">
          {ROLES.map((r, i) => (
            <span key={r} className={`${i <= index ? 'on' : ''} ${result.duelLanes.includes(r) ? 'duel' : ''}`} />
          ))}
        </div>
        <div className="reveal-buttons">
          <button className="btn pixel mute" onClick={onToggleMute} title={muted ? 'Unmute' : 'Mute'}>
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            className={`btn pixel mute ${announcer ? '' : 'off'}`}
            onClick={onToggleAnnouncer}
            title={announcer ? 'Turn the announcer off' : 'Turn the announcer on'}
          >
            🎙
          </button>
          <button className="btn pixel" onClick={next}>
            NEXT ▶
          </button>
          <button className="btn pixel" onClick={done}>
            SKIP ⏭
          </button>
        </div>
      </div>
    </div>
  );
}
