import { useEffect, useLayoutEffect, useRef } from 'react';
import { GUARD_X, SPRITE_H, SPRITE_W, drawPose, lookFor, strikeTipX, type Pose } from '../sprites/fighter';

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

// Each pose of each fighter is rendered once to a small canvas, then copied on every frame.
const cache = new Map<string, Map<Pose, HTMLCanvasElement>>();
function frame(name: string, side: 'blue' | 'red', pose: Pose) {
  const key = `${side}:${name}`;
  let poses = cache.get(key);
  if (!poses) cache.set(key, (poses = new Map()));
  let c = poses.get(pose);
  if (!c) {
    c = document.createElement('canvas');
    c.width = SPRITE_W;
    c.height = SPRITE_H;
    const g = c.getContext('2d')!;
    drawPose(lookFor(name), pose, SIDE_BAND[side]).forEach((row, y) =>
      row.forEach((color, x) => {
        if (!color) return;
        g.fillStyle = color;
        g.fillRect(x, y, 1, 1);
      }),
    );
    poses.set(pose, c);
  }
  return c;
}

interface Props {
  name: string;
  side: 'blue' | 'red';
  action: FighterAction;
}

/** A player's animated pixel fighter; blue faces right, red is mirrored to face left. */
export default function PixelFighter({ name, side, action }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLSpanElement>(null);

  // The lunge covers the real gap to the opponent (it depends on the screen width and the VS between
  // them), so the strike's tip lands on the opponent's guard.
  useLayoutEffect(() => {
    const me = wrap.current;
    if (action !== 'attack' || !me) return;
    const foe = me.closest('.fighters')?.querySelector('.pixel-fighter.red');
    if (!foe) return;
    const a = me.getBoundingClientRect();
    const b = foe.getBoundingClientRect();
    const tip = a.left + (strikeTipX(lookFor(name).weapon) / SPRITE_W) * a.width;
    const guard = b.left + (1 - GUARD_X / SPRITE_W) * b.width; // red is mirrored
    me.style.setProperty('--lunge', `${Math.max(0, guard - tip)}px`);
  }, [action, name]);

  useEffect(() => {
    const g = ref.current?.getContext('2d');
    if (!g) return;
    const show = (pose: Pose) => {
      g.clearRect(0, 0, SPRITE_W, SPRITE_H);
      g.drawImage(frame(name, side, pose), 0, 0);
    };
    let timer = 0;
    const play = (seq: [Pose, number][], i: number, loop: boolean) => {
      if (i >= seq.length) {
        if (loop) play(seq, 0, true);
        else play(IDLE, 0, true);
        return;
      }
      const [pose, ms] = seq[i];
      show(pose);
      timer = window.setTimeout(() => play(seq, i + 1, loop), ms);
    };
    if (action === 'idle') play(IDLE, 0, true);
    else play(SEQUENCES[action], 0, false);
    return () => window.clearTimeout(timer);
  }, [name, side, action]);

  return (
    <span className={`pixel-fighter ${side} ${action}`} ref={wrap}>
      <canvas ref={ref} width={SPRITE_W} height={SPRITE_H} aria-hidden="true" />
      {action === 'parry' && <span className="spark" />}
    </span>
  );
}
