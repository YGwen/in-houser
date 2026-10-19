import { audio, midiToFreq } from './engine';
import { brass, crash, createEcho, fmBass, hat, kick, lead, pad, snare } from './instruments';
import { DEFAULT_TRACK, isFileTrack, trackById, type FileTrack, type Track } from './tracks';

// Plays the selected track (src/audio/tracks.ts): synthesized tracks with a lookahead scheduler on the
// audio clock, recorded tracks (audio files) as a looping buffer. Both go through the same bus, so
// ducking under the announcer and fading out work the same way.
const STEPS_PER_BAR = 16;

let track: Track | FileTrack = trackById(DEFAULT_TRACK);
let melodyAt = new Map<number, [number, number]>();

function prepare(t: Track | FileTrack) {
  track = t;
  melodyAt = new Map();
  if (isFileTrack(t)) return;
  // Melody note starts, indexed by absolute step in the loop.
  t.melody.forEach((bar, b) => {
    let s = b * STEPS_PER_BAR;
    for (const [note, len] of bar) {
      melodyAt.set(s, [note, len]);
      s += len;
    }
  });
}
prepare(track);

const synth = () => track as Track;
const stepSeconds = () => 60 / synth().bpm / 4; // one 16th note

let timer: number | null = null;
let step = 0;
let nextTime = 0;
let busGain: GainNode | null = null;
let echo: AudioNode | null = null;

function scheduleStep(s: number, t: number) {
  if (!busGain || !echo) return;
  const track = synth();
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
    if (track.leadVoice === 'brass') {
      brass(busGain, midiToFreq(note), t, dur, 0.1);
      brass(echo, midiToFreq(note), t, dur, 0.04);
    } else {
      lead(busGain, midiToFreq(note), t, dur, 0.11);
      lead(echo, midiToFreq(note), t, dur, 0.06);
    }
  }

  if (track.stabs?.includes(i)) {
    for (const note of chord.pad) brass(busGain, midiToFreq(note), t, STEP * 0.9, 0.035);
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

// Recorded tracks: decoded once, then looped.
const fileBuffers = new Map<string, Promise<AudioBuffer | null>>();
let fileSource: AudioBufferSourceNode | null = null;
let playing = false;

function loadFile(file: string) {
  let b = fileBuffers.get(file);
  if (!b) {
    b = fetch(`${import.meta.env.BASE_URL}${file}`)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
      .then((d) => audio().ctx.decodeAudioData(d))
      .catch(() => null);
    fileBuffers.set(file, b);
  }
  return b;
}

function startFile(t: FileTrack, bus: GainNode) {
  void loadFile(t.file).then((buffer) => {
    if (!playing || busGain !== bus) return; // stopped (or switched) while loading
    if (!buffer) {
      startOnBus(trackById(t.fallback), bus); // file missing (e.g. live site): use the built-in track
      return;
    }
    const { ctx } = audio();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = t.loop ?? true;
    const level = ctx.createGain();
    level.gain.value = t.gain ?? 1;
    src.connect(level).connect(bus);
    if (!src.loop && t.then) {
      const next = trackById(t.then);
      src.onended = () => {
        if (playing && busGain === bus && fileSource === src) startOnBus(next, bus);
      };
    }
    src.start();
    fileSource = src;
  });
}

/** Start a track (synthesized or file) on the current music bus. */
function startOnBus(t: Track | FileTrack, bus: GainNode) {
  prepare(t);
  if (isFileTrack(t)) {
    startFile(t, bus);
    return;
  }
  const { ctx } = audio();
  fileSource = null;
  echo = createEcho(bus);
  step = 0;
  nextTime = ctx.currentTime + 0.05;
  // Lookahead scheduler: precise timing from the audio clock, driven by a coarse JS timer.
  if (timer !== null) window.clearInterval(timer);
  timer = window.setInterval(() => {
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      nextTime += stepSeconds();
      step = (step + 1) % (STEPS_PER_BAR * synth().melody.length);
    }
  }, 25);
}

/** Start the music: `id` picks the track (otherwise the last one set). */
export function startMusic(id?: string) {
  if (playing) return;
  playing = true;
  const { ctx, musicBus } = audio();
  busGain = ctx.createGain();
  busGain.gain.setValueAtTime(1, ctx.currentTime);
  busGain.connect(musicBus);
  startOnBus(id ? trackById(id) : track, busGain);
}

/** Play track `id`: keeps going if it is already playing, otherwise fades out what plays and switches. */
export function playMusic(id: string) {
  if (playing && track.id === id) return;
  stopMusic(0.3);
  startMusic(id);
}

export function stopMusic(fadeSeconds = 0.6) {
  if (!playing) return;
  playing = false;
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  const { ctx } = audio();
  const src = fileSource;
  fileSource = null;
  if (src) window.setTimeout(() => src.stop(), fadeSeconds * 1000 + 200);
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
