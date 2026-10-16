import { duckMusic } from './chiptune';
import { audio } from './engine';

// Gunshots for the reveal: each player's entrance is marked by a random weapon.
// Real stereo recordings from The Free Firearm Sound Library (CC0, see public/sfx/guns/CREDITS.md),
// trimmed to public/sfx/guns/<weapon>.wav. Only recordings are played, never synthesized shots.

export type Weapon = 'pistol' | 'revolver' | 'shotgun' | 'sniper' | 'smg';

export const WEAPONS: Weapon[] = ['pistol', 'revolver', 'shotgun', 'sniper', 'smg'];

const clips = new Map<Weapon, Promise<AudioBuffer | null>>();
/** Clips that finished decoding, so a shot can start on its exact animation frame. */
const loaded = new Map<Weapon, AudioBuffer>();

function loadClip(weapon: Weapon): Promise<AudioBuffer | null> {
  let clip = clips.get(weapon);
  if (!clip) {
    clip = fetch(`${import.meta.env.BASE_URL}sfx/guns/${weapon}.wav`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
      .then((data) => audio().ctx.decodeAudioData(data))
      .then((buffer) => {
        loaded.set(weapon, buffer);
        return buffer;
      })
      .catch(() => null);
    clips.set(weapon, clip);
  }
  return clip;
}

/** Fetch and decode all weapon clips ahead of the first shot. */
export function preloadWeapons() {
  WEAPONS.forEach((w) => void loadClip(w));
}

let last: Weapon | null = null;

/** A random weapon, never the same one twice in a row. */
export function pickWeapon(rng: () => number = Math.random, previous: Weapon | null = last): Weapon {
  const options = WEAPONS.filter((w) => w !== previous);
  return options[Math.floor(rng() * options.length)];
}

/** Fire a random weapon. */
export function fireRandomWeapon() {
  const weapon = pickWeapon();
  last = weapon;
  fireWeapon(weapon);
}

/** Drive into the saturator (3 = +9.5 dB before soft clipping). */
export const GUN_DRIVE = 3;
/** The app's master volume (see engine.ts). Gunshots compensate for it so they can reach full scale. */
const MASTER_LEVEL = 0.6;

let gunBus: AudioNode | null = null;

/**
 * Gunshots are one sharp peak followed by a quieter body, so plain volume clips before they sound loud.
 * Drive them into a smooth tanh saturator (rounds off only the tip of the blast, like game audio does),
 * then scale the result so that, after the master volume, the loudest shot just reaches full scale.
 */
export function buildGunChain(ctx: BaseAudioContext, dest: AudioNode): AudioNode {
  const drive = ctx.createGain();
  drive.gain.value = GUN_DRIVE;
  const saturator = ctx.createWaveShaper();
  const curve = new Float32Array(2048);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 4) / Math.tanh(4);
  // The curve covers inputs -4..4 mapped to -1..1; inputs are pre-scaled by 1/4 so tanh sees the true level.
  const toCurve = ctx.createGain();
  toCurve.gain.value = 1 / 4;
  saturator.curve = curve;
  saturator.oversample = '4x';
  const ceiling = ctx.createGain();
  ceiling.gain.value = (0.88 / MASTER_LEVEL) * Math.tanh(4); // undo the curve's normalisation, then fill the headroom
  drive.connect(toCurve).connect(saturator).connect(ceiling).connect(dest);
  return drive;
}

function play(buffer: AudioBuffer) {
  const { ctx, master } = audio();
  gunBus ??= buildGunChain(ctx, master);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(gunBus);
  src.start();
  // Near-silence the chiptune for the whole shot so its 8-bit beat doesn't color the recording.
  duckMusic(buffer.duration, 0.05);
}

/** Play a weapon's recording now, or as soon as it has loaded (silent if it can't be loaded). */
export function fireWeapon(weapon: Weapon) {
  const buffer = loaded.get(weapon);
  if (buffer) play(buffer);
  else void loadClip(weapon).then((b) => b && play(b));
}
