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

function play(buffer: AudioBuffer) {
  const { ctx, sfxBus } = audio();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(sfxBus);
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
