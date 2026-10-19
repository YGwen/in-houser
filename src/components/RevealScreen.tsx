import { useCallback, useEffect, useRef, useState } from 'react';
import { announce, announcerIdle, preloadVoice, stopAnnouncer, type Line } from '../audio/announcer';
import { startMusic, stopMusic } from '../audio/music';
import { clash, duelSting, fightJingle, vsHit, whoosh } from '../audio/sfx';
import { ROLES, ROLE_LABELS, type Player, type Role, type TeamResult } from '../types';
import ChampionTag from './ChampionTag';
import PixelFighter, { IMPACT_MS, prepareFighter } from './PixelFighter';

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

// Each lane card is a script of steps: lane title -> blue player -> VS slam -> red player -> clash
// (the blue fighter attacks, the red one parries).
// A step's element appears with its announcer line, and the next step waits until that line has been
// said AND a minimum time has passed, so the visuals never run ahead of the voice. The minimums keep
// the old pace when the sound or the announcer is off.
const MIN_TITLE = 0.9; // seconds before the blue player
const MIN_BLUE = 0.8; // before the VS slam
const SLAM = 0.25; // duration of the VS slam keyframe (impact flash + shake right after)
const MIN_VS = 0.65; // after the slam, before the red player
const MIN_RED = 0.5; // after the red player appears
const CLASH = 0.7; // the attack and the parry
const HOLD = 1.1; // after the clash, before the next card
const MIN_DUEL = 0.8; // duel banner before the lane title
const FIGHT_HOLD = 1.2; // FIGHT! alone, before the recap appears under it
const RECAP_SECONDS = 30; // how long the recap stays before the reveal closes (NEXT/SKIP close it earlier)

/** Steps of a lane card; elements are hidden until their step is reached. */
const STAGE = { banner: 0, title: 1, blue: 2, vs: 3, red: 4, clash: 5 } as const;

export default function RevealScreen({ result, muted, onToggleMute, announcer, onToggleAnnouncer, onDone }: Props) {
  // 0..4 = lanes, 5 = "FIGHT!"
  const [index, setIndex] = useState(0);
  const isFight = index >= ROLES.length;
  const role = ROLES[Math.min(index, ROLES.length - 1)];
  const isDuel = !isFight && result.duelLanes.includes(role);

  const next = useCallback(() => setIndex((i) => i + 1), []);
  // Stage is tied to the card index, so a new card starts hidden instead of inheriting the last stage.
  const [stageOf, setStageOf] = useState({ index: 0, stage: 0 });
  const stage = stageOf.index === index ? stageOf.stage : 0;
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
    // Render every main's fighter now, so it's ready when their card comes up.
    for (const r of ROLES) for (const p of [result.blue[r], result.red[r]]) if (p.main) prepareFighter(p.main);
    return () => stopMusic();
  }, [result]);

  // Sound + auto-advance for the current card.
  useEffect(() => {
    if (index > ROLES.length) {
      done();
      return;
    }
    let cancelled = false;
    const wait = (seconds: number) => new Promise((r) => window.setTimeout(r, seconds * 1000));
    const show = (stage: number) => !cancelled && setStageOf({ index, stage });
    // Show a step, say its line, and wait for both the line and the step's minimum time.
    const step = async (stage: number, line: Line | null, minSeconds: number) => {
      if (cancelled) return;
      show(stage);
      await Promise.all([line ? announce(line) : null, wait(minSeconds)]);
    };

    void (async () => {
      if (isFight) {
        // The music keeps playing under the recap; it fades out when the reveal closes.
        fightJingle();
        await wait(0.3);
        await Promise.all([announce(FIGHT), wait(FIGHT_HOLD)]);
        show(1); // recap
        await wait(RECAP_SECONDS);
        if (!cancelled) next();
        return;
      }
      if (isDuel) {
        duelSting();
        await step(STAGE.banner, DUEL, MIN_DUEL);
      }
      await step(STAGE.title, laneLine(role), MIN_TITLE);
      if (cancelled) return;
      whoosh(true);
      await step(STAGE.blue, nameLine(result.blue[role]), MIN_BLUE);
      if (cancelled) return;
      show(STAGE.vs);
      await wait(SLAM);
      if (cancelled) return;
      vsHit();
      await Promise.all([announce(VERSUS), wait(MIN_VS)]);
      if (cancelled) return;
      whoosh(false);
      await step(STAGE.red, nameLine(result.red[role]), MIN_RED);
      if (cancelled) return;
      show(STAGE.clash);
      await wait(IMPACT_MS / 1000);
      if (cancelled) return;
      clash();
      await wait(CLASH - IMPACT_MS / 1000);
      await wait(HOLD);
      await announcerIdle();
      if (!cancelled) next();
    })();

    return () => {
      cancelled = true;
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
        <div className={`fight-screen ${stage >= 1 ? 'with-recap' : ''}`} key="fight">
          <div className="fight">FIGHT!</div>
          {stage >= 1 && <Recap result={result} seconds={RECAP_SECONDS} />}
        </div>
      ) : (
        <div className={`card ${isDuel ? 'duel' : ''} ${stage >= STAGE.vs ? 'impact' : ''}`} key={index}>
          {isDuel && <div className="duel-banner">⚔ DUEL ⚔</div>}
          <div className={`lane-title ${stage >= STAGE.title ? '' : 'pending'}`}>{LANE_TITLES[role]}</div>
          <div className="fighters">
            <div className={`fighter blue ${stage >= STAGE.blue ? '' : 'pending'}`}>
              <PixelFighter name={result.blue[role].name} main={result.blue[role].main} side="blue" action={stage >= STAGE.clash ? 'attack' : 'idle'} />
              <span className="side">BLUE SIDE</span>
              <span className="name">{result.blue[role].name}</span>
              <ChampionTag id={result.champions?.[result.blue[role].id]} large />
            </div>
            <div className={`vs ${stage >= STAGE.vs ? '' : 'pending'}`}>VS</div>
            <div className={`fighter red ${stage >= STAGE.red ? '' : 'pending'}`}>
              <PixelFighter name={result.red[role].name} main={result.red[role].main} side="red" action={stage >= STAGE.clash ? 'parry' : 'idle'} />
              <span className="side">RED SIDE</span>
              <span className="name">{result.red[role].name}</span>
              <ChampionTag id={result.champions?.[result.red[role].id]} large />
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

/** Summary of every matchup, shown under FIGHT! with a countdown bar until the reveal closes. */
function Recap({ result, seconds }: { result: TeamResult; seconds: number }) {
  return (
    // Clicks inside the recap don't skip it (the rest of the screen still does).
    <div className="recap" onClick={(e) => e.stopPropagation()}>
      <div className="recap-head">
        <span className="blue">BLUE {result.blueTotal}★</span>
        <span className="gap">gap {result.gap}</span>
        <span className="red">{result.redTotal}★ RED</span>
      </div>
      <ul>
        {ROLES.map((role) => {
          const duel = result.duelLanes.includes(role);
          const blue = result.blue[role];
          const red = result.red[role];
          return (
            <li key={role} className={duel ? 'duel' : ''}>
              <span className="p blue">
                <span className="n">{blue.name}</span>
                <ChampionTag id={result.champions?.[blue.id]} />
              </span>
              <span className="lane">
                {duel && '⚔ '}
                {ROLE_LABELS[role]}
              </span>
              <span className="p red">
                <span className="n">{red.name}</span>
                <ChampionTag id={result.champions?.[red.id]} />
              </span>
            </li>
          );
        })}
      </ul>
      <div className="recap-timer" style={{ animationDuration: `${seconds}s` }} />
    </div>
  );
}
