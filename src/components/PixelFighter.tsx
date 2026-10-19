import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ART_W, ART_H, championPixelArt } from '../sprites/championArt';
import { SPRITE_H, SPRITE_W, costumeFor, drawPose, frontOf, type Pixels, type Pose } from '../sprites/fighter';

export type FighterAction = 'idle' | 'attack' | 'parry';

/** When the attacker's strike lands (and the defender's parry takes the hit), after the action starts. */
export const IMPACT_MS = 160;

const SIDE_BAND = { blue: '#3d8bff', red: '#ff3b4a' };

// Frame sequences: [pose, ms]. Idle loops; the others play once, then go back to idle.
const IDLE: [Pose, number][] = [
  ['idle0', 420],
  ['idle1', 420],
];
const SEQUENCES: Record<Exclude<FighterAction, 'idle'>, [Pose, number][]> = {
  attack: [
    ['windup', IMPACT_MS],
    ['strike', 130],
    ['follow', 280],
  ],
  parry: [
    ['guard', IMPACT_MS],
    ['recoil', 230],
    ['guard', 180],
  ],
};

// Each pose of each fighter is drawn once, then copied to the screen on every frame.
const cache = new Map<string, { px: Pixels; canvas: HTMLCanvasElement }>();
function frame(name: string, main: string | undefined, side: 'blue' | 'red', pose: Pose) {
  const key = `${side}:${name}:${main ?? ''}:${pose}`;
  let f = cache.get(key);
  if (!f) {
    const px = drawPose(costumeFor(name, main), pose, SIDE_BAND[side]);
    const canvas = document.createElement('canvas');
    canvas.width = SPRITE_W;
    canvas.height = SPRITE_H;
    const g = canvas.getContext('2d')!;
    px.forEach((row, y) =>
      row.forEach((color, x) => {
        if (!color) return;
        g.fillStyle = color;
        g.fillRect(x, y, 1, 1);
      }),
    );
    cache.set(key, (f = { px, canvas }));
  }
  return f;
}

interface Props {
  name: string;
  /** Favourite champion: styles the fighter after it. */
  main?: string;
  side: 'blue' | 'red';
  action: FighterAction;
}

/**
 * A player's fighter: their main champion's art as a pixel-art portrait when it loads, else an animated
 * pixel sprite. Blue faces right, red is mirrored to face left.
 */
export default function PixelFighter({ name, main, side, action }: Props) {
  const [art, setArt] = useState<HTMLCanvasElement | null>(null);
  useEffect(() => {
    let live = true;
    setArt(null);
    if (main) void championPixelArt(main).then((c) => live && setArt(c));
    return () => {
      live = false;
    };
  }, [main]);
  return art ? (
    <Portrait art={art} side={side} action={action} />
  ) : (
    <Sprite name={name} main={main} side={side} action={action} />
  );
}

/**
 * The lunge covers the real gap to the opponent (it depends on the screen width, the VS between them and
 * both fighters' reach), so the strike lands on the front of the opponent's guard. `reach` and the
 * foe's `data-guard` are fractions of each element's width, from its left edge.
 */
function useLunge(wrap: React.RefObject<HTMLSpanElement | null>, action: FighterAction, reach: number) {
  useLayoutEffect(() => {
    const me = wrap.current;
    if (action !== 'attack' || !me) return;
    const foe = me.closest('.fighters')?.querySelector<HTMLElement>('.pixel-fighter.red');
    if (!foe) return;
    const a = me.getBoundingClientRect();
    const b = foe.getBoundingClientRect();
    const gap = b.left + Number(foe.dataset.guard) * b.width - (a.left + reach * a.width);
    me.style.setProperty('--lunge', `${Math.max(0, gap)}px`);
  }, [wrap, action, reach]);
}

function Portrait({ art, side, action }: { art: HTMLCanvasElement; side: 'blue' | 'red'; action: FighterAction }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLSpanElement>(null);
  useLunge(wrap, action, 0.97); // portraits collide frame to frame
  useEffect(() => {
    const g = ref.current?.getContext('2d');
    g?.clearRect(0, 0, ART_W, ART_H);
    g?.drawImage(art, 0, 0);
  }, [art]);
  return (
    <span className={`pixel-fighter portrait ${side} ${action}`} ref={wrap} data-guard={0.03}>
      <canvas ref={ref} width={ART_W} height={ART_H} aria-hidden="true" />
      {action === 'parry' && <span className="spark" style={{ left: '3%', top: '45%' }} />}
    </span>
  );
}

function Sprite({ name, main, side, action }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLSpanElement>(null);
  useLunge(wrap, action, (frontOf(frame(name, main, side, 'strike').px).x + 1) / SPRITE_W);

  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    const show = (pose: Pose) => {
      g.clearRect(0, 0, SPRITE_W, SPRITE_H);
      g.drawImage(frame(name, main, side, pose).canvas, 0, 0);
    };
    let timer = 0;
    const play = (seq: [Pose, number][], i: number) => {
      if (i >= seq.length) {
        play(IDLE, 0);
        return;
      }
      const [pose, ms] = seq[i];
      show(pose);
      timer = window.setTimeout(() => play(seq, i + 1), ms);
    };
    play(action === 'idle' ? IDLE : SEQUENCES[action], 0);
    return () => window.clearTimeout(timer);
  }, [name, main, side, action]);

  // The hit spark sits on the front of the guard, at the height strikes land (chest to head).
  const guard = frontOf(frame(name, main, side, 'guard').px, 17, 30);
  const guardLeft = 1 - (guard.x + 1) / SPRITE_W; // red is mirrored
  return (
    <span className={`pixel-fighter ${side} ${action}`} ref={wrap} data-guard={guardLeft}>
      <canvas ref={ref} width={SPRITE_W} height={SPRITE_H} aria-hidden="true" />
      {action === 'parry' && (
        <span className="spark" style={{ left: `${guardLeft * 100}%`, top: `${(guard.y / SPRITE_H) * 100}%` }} />
      )}
    </span>
  );
}
