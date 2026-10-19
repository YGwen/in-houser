import { useEffect, useLayoutEffect, useRef } from 'react';
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

/** A player's animated pixel fighter; blue faces right, red is mirrored to face left. */
export default function PixelFighter({ name, main, side, action }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLSpanElement>(null);

  // The lunge covers the real gap to the opponent (it depends on the screen width, the VS between them
  // and both fighters' reach), so the strike lands on the front of the opponent's guard.
  useLayoutEffect(() => {
    const me = wrap.current;
    if (action !== 'attack' || !me) return;
    const foe = me.closest('.fighters')?.querySelector<HTMLElement>('.pixel-fighter.red');
    if (!foe) return;
    const a = me.getBoundingClientRect();
    const b = foe.getBoundingClientRect();
    const tip = a.left + ((frontOf(frame(name, main, side, 'strike').px).x + 1) / SPRITE_W) * a.width;
    const guard = b.left + (1 - (Number(foe.dataset.guardX) + 1) / SPRITE_W) * b.width; // red is mirrored
    me.style.setProperty('--lunge', `${Math.max(0, guard - tip)}px`);
  }, [action, name, main, side]);

  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    const show = (pose: Pose) => {
      g.clearRect(0, 0, SPRITE_W, SPRITE_H);
      g.drawImage(frame(name, main, side, pose).canvas, 0, 0);
    };
    let timer = 0;
    const play = (seq: [Pose, number][], i: number, loop: boolean) => {
      if (i >= seq.length) {
        play(IDLE, 0, true);
        return;
      }
      const [pose, ms] = seq[i];
      show(pose);
      timer = window.setTimeout(() => play(seq, i + 1, loop), ms);
    };
    play(action === 'idle' ? IDLE : SEQUENCES[action], 0, action === 'idle');
    return () => window.clearTimeout(timer);
  }, [name, main, side, action]);

  // The hit spark sits on the front of the guard, at the height strikes land (chest to head).
  const guard = frontOf(frame(name, main, side, 'guard').px, 17, 30);
  return (
    <span className={`pixel-fighter ${side} ${action}`} ref={wrap} data-guard-x={guard.x}>
      <canvas ref={ref} width={SPRITE_W} height={SPRITE_H} aria-hidden="true" />
      {action === 'parry' && (
        <span
          className="spark"
          style={{ left: `${(1 - (guard.x + 1) / SPRITE_W) * 100}%`, top: `${(guard.y / SPRITE_H) * 100}%` }}
        />
      )}
    </span>
  );
}
