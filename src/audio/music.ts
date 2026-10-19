import { audio, midiToFreq } from './engine';
import { crash, createEcho, fmBass, hat, kick, lead, pad, snare } from './instruments';
import { DEFAULT_TRACK, trackById, type Track } from './tracks';

// Plays the selected track (src/audio/tracks.ts) with a lookahead scheduler on the audio clock.
const STEPS_PER_BAR = 16;

let track: Track = trackById(DEFAULT_TRACK);
let melodyAt = new Map<number, [number, number]>();

function prepare(t: Track) {
  track = t;
  // Melody note starts, indexed by absolute step in the loop.
  melodyAt = new Map();
  t.melody.forEach((bar, b) => {
    let s = b * STEPS_PER_BAR;
    for (const [note, len] of bar) {
      melodyAt.set(s, [note, len]);
      s += len;
    }
  });
}
prepare(track);

const stepSeconds = () => 60 / track.bpm / 4; // one 16th note

let timer: number | null = null;
let step = 0;
let nextTime = 0;
let busGain: GainNode | null = null;
let echo: AudioNode | null = null;

function scheduleStep(s: number, t: number) {
  if (!busGain || !echo) return;
  const bar = Math.floor(s / STEPS_PER_BAR);
  const i = s % STEPS_PER_BAR;
  const chord = track.chords[bar % track.chords.length];
  const STEP = stepSeconds();

  if (i === 0) {
    pad(busGain, chord.pad.map(midiToFreq), t, STEP * STEPS_PER_BAR * 0.98, 0.07);
    if (bar === 0) crash(busGain, t, 0.12);
  }

  for (const [at, offset] of track.bass) {
    if (at === i) fmBass(busGain, midiToFreq(chord.root + 12 + offset), t, STEP * 1.6, 0.42);
  }

  const m = melodyAt.get(s);
  if (m) {
    const [note, len] = m;
    const dur = STEP * len * 0.92;
    lead(busGain, midiToFreq(note), t, dur, 0.11);
    lead(echo, midiToFreq(note), t, dur, 0.06);
  }

  if (track.kick.includes(i)) kick(busGain, t, 0.7);
  if (track.snare.includes(i)) {
    snare(busGain, t, 0.38);
    snare(echo, t, 0.15);
  }
  if (i % track.hatEvery === 0) {
    const open = i === track.openHat;
    hat(busGain, t, open ? 0.07 : track.hatEvery === 1 ? 0.035 : 0.05, open);
  }
}

/** The track the reveal plays (default: Arena). Takes effect the next time the music starts. */
export function setMusicTrack(id: string) {
  prepare(trackById(id));
}

export const currentTrack = () => track.id;

export function startMusic() {
  if (timer !== null) return;
  const { ctx, musicBus } = audio();
  busGain = ctx.createGain();
  busGain.gain.setValueAtTime(1, ctx.currentTime);
  busGain.connect(musicBus);
  echo = createEcho(busGain);
  step = 0;
  nextTime = ctx.currentTime + 0.05;
  // Lookahead scheduler: precise timing from the audio clock, driven by a coarse JS timer.
  timer = window.setInterval(() => {
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      nextTime += stepSeconds();
      step = (step + 1) % (STEPS_PER_BAR * track.melody.length);
    }
  }, 25);
}

export function stopMusic(fadeSeconds = 0.6) {
  if (timer === null) return;
  window.clearInterval(timer);
  timer = null;
  const { ctx } = audio();
  const g = busGain;
  busGain = null;
  echo = null;
  if (g) {
    g.gain.setTargetAtTime(0, ctx.currentTime, fadeSeconds / 4);
    window.setTimeout(() => g.disconnect(), fadeSeconds * 1000 + 1500);
  }
}

/**
 * Lower the music briefly so a sound stands out. `level` is the music volume while ducked:
 * 0.2 for short dramatic effects, higher for the announcer so the music stays audible under it.
 */
export function duckMusic(seconds: number, level = 0.2) {
  if (!busGain) return;
  const { ctx } = audio();
  const g = busGain.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setTargetAtTime(level, ctx.currentTime, 0.03);
  g.setTargetAtTime(1, ctx.currentTime + seconds, 0.2);
}
