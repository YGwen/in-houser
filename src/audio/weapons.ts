import { duckMusic } from './chiptune';
import { audio, noise, tone } from './engine';

// Synthesized gunshots for the reveal: each player's entrance is marked by a random weapon.
// Built from filtered noise (the blast and its echo) plus a falling sine (the body "thump"),
// so there are no audio files and nothing to license.

export type Weapon = 'pistol' | 'revolver' | 'shotgun' | 'sniper' | 'smg' | 'blaster';

export const WEAPONS: Weapon[] = ['pistol', 'revolver', 'shotgun', 'sniper', 'smg', 'blaster'];

/** One shot: sharp crack, low thump, and a short room echo. */
function shot(dest: AudioNode, t: number, power: number, crackFreq: number) {
  noise(dest, t, 0.03, 1.1 * power, { type: 'highpass', freq: crackFreq });
  noise(dest, t, 0.22, 0.9 * power, { type: 'lowpass', freq: 4500, endFreq: 300 });
  tone(dest, 'sine', 160, t, 0.16, 0.9 * power, 45);
}

const PLAY: Record<Weapon, (dest: AudioNode, t: number) => number> = {
  pistol(dest, t) {
    shot(dest, t, 0.9, 2500);
    noise(dest, t + 0.06, 0.4, 0.12, { type: 'lowpass', freq: 1200, endFreq: 400 });
    return 0.5;
  },

  revolver(dest, t) {
    // Hammer cock, then a heavier shot with a long ring.
    tone(dest, 'square', 3200, t, 0.012, 0.15);
    tone(dest, 'square', 2400, t + 0.07, 0.012, 0.15);
    shot(dest, t + 0.22, 1.1, 2000);
    tone(dest, 'sine', 95, t + 0.22, 0.35, 0.6, 35);
    noise(dest, t + 0.3, 0.7, 0.18, { type: 'lowpass', freq: 900, endFreq: 250 });
    return 1;
  },

  shotgun(dest, t) {
    // Pump (back, forward), then a wide, bassy blast.
    noise(dest, t, 0.06, 0.45, { type: 'bandpass', freq: 1800 });
    noise(dest, t + 0.13, 0.05, 0.5, { type: 'bandpass', freq: 2400 });
    const b = t + 0.38;
    noise(dest, b, 0.5, 1.3, { type: 'lowpass', freq: 6000, endFreq: 180 });
    tone(dest, 'sine', 110, b, 0.45, 1.1, 30);
    noise(dest, b + 0.1, 0.8, 0.2, { type: 'lowpass', freq: 700, endFreq: 200 });
    return 1.3;
  },

  sniper(dest, t) {
    // Supersonic crack, deep boom, then echoes rolling off distant walls.
    noise(dest, t, 0.04, 1.4, { type: 'highpass', freq: 3500 });
    tone(dest, 'sine', 70, t, 0.7, 1.1, 28);
    noise(dest, t, 0.35, 0.8, { type: 'lowpass', freq: 3000, endFreq: 150 });
    noise(dest, t + 0.25, 0.9, 0.22, { type: 'lowpass', freq: 800, endFreq: 200 });
    noise(dest, t + 0.65, 0.9, 0.1, { type: 'lowpass', freq: 600, endFreq: 150 });
    return 1.6;
  },

  smg(dest, t) {
    // Five-round burst.
    for (let i = 0; i < 5; i++) {
      const s = t + i * 0.075;
      noise(dest, s, 0.07, 0.75, { type: 'bandpass', freq: 2200 });
      noise(dest, s, 0.09, 0.5, { type: 'lowpass', freq: 3000, endFreq: 500 });
      tone(dest, 'sine', 210, s, 0.06, 0.45, 80);
    }
    noise(dest, t + 0.38, 0.5, 0.14, { type: 'lowpass', freq: 1000, endFreq: 300 });
    return 0.9;
  },

  blaster(dest, t) {
    // Sci-fi "pew": fast falling sweeps with a bright zap on top.
    tone(dest, 'sawtooth', 1900, t, 0.28, 0.28, 180);
    tone(dest, 'square', 950, t, 0.28, 0.18, 90);
    noise(dest, t, 0.05, 0.5, { type: 'highpass', freq: 5000 });
    return 0.45;
  },
};

let last: Weapon | null = null;

/** A random weapon, never the same one twice in a row. */
export function pickWeapon(rng: () => number = Math.random, previous: Weapon | null = last): Weapon {
  const options = WEAPONS.filter((w) => w !== previous);
  return options[Math.floor(rng() * options.length)];
}

/** Fire a random weapon now; returns how long it rings (seconds). */
export function fireRandomWeapon(): number {
  const weapon = pickWeapon();
  last = weapon;
  return fireWeapon(weapon);
}

export function fireWeapon(weapon: Weapon): number {
  const { ctx, sfxBus } = audio();
  const seconds = PLAY[weapon](sfxBus, ctx.currentTime + 0.01);
  duckMusic(seconds);
  return seconds;
}
