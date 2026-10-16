import { audio, midiToFreq } from './engine';
import { crash, createEcho, fmBass, hat, kick, lead, pad, snare } from './instruments';

// 16-bit fighting-game theme (SNES / Mega Drive style): A minor, 150 BPM, 8-bar loop over
// Am - F - G - E. FM slap bass, detuned-saw lead with vibrato, string pads, full drum kit and echo.
const BPM = 150;
const STEP = 60 / BPM / 4; // 16th note
const STEPS_PER_BAR = 16;
const BARS = 8;

const CHORDS = [
  { root: 33, pad: [57, 60, 64] }, // Am
  { root: 29, pad: [53, 57, 60] }, // F
  { root: 31, pad: [55, 59, 62] }, // G
  { root: 28, pad: [52, 56, 59] }, // E (major: tension back to Am)
];

// Melody per bar: [midi note, length in 16ths], played back to back (each bar adds up to 16).
const MELODY: [number, number][][] = [
  [[69, 4], [72, 2], [76, 2], [74, 2], [72, 2], [71, 2], [72, 2]],
  [[69, 6], [65, 2], [69, 2], [72, 4], [69, 2]],
  [[71, 4], [74, 4], [79, 4], [77, 2], [74, 2]],
  [[76, 6], [68, 2], [71, 2], [74, 2], [76, 4]],
  [[81, 4], [79, 2], [76, 2], [81, 4], [83, 2], [84, 2]],
  [[84, 4], [81, 2], [77, 2], [81, 4], [79, 2], [77, 2]],
  [[79, 4], [74, 2], [71, 2], [74, 2], [79, 2], [77, 2], [74, 2]],
  [[76, 8], [80, 4], [83, 4]],
];

// Bass: [step, semitones above the chord root].
const BASS: [number, number][] = [[0, 0], [2, 0], [3, 12], [4, 0], [6, 0], [8, 0], [10, 12], [11, 0], [12, 0], [14, 7]];
const KICK = new Set([0, 6, 8, 11]);
const SNARE = new Set([4, 12]);

// Melody note starts, indexed by absolute step in the loop.
const MELODY_AT = new Map<number, [number, number]>();
MELODY.forEach((bar, b) => {
  let s = b * STEPS_PER_BAR;
  for (const [note, len] of bar) {
    MELODY_AT.set(s, [note, len]);
    s += len;
  }
});

let timer: number | null = null;
let step = 0;
let nextTime = 0;
let busGain: GainNode | null = null;
let echo: AudioNode | null = null;

function scheduleStep(s: number, t: number) {
  if (!busGain || !echo) return;
  const bar = Math.floor(s / STEPS_PER_BAR);
  const i = s % STEPS_PER_BAR;
  const chord = CHORDS[bar % CHORDS.length];

  if (i === 0) {
    pad(busGain, chord.pad.map(midiToFreq), t, STEP * STEPS_PER_BAR * 0.98, 0.07);
    if (bar === 0) crash(busGain, t, 0.12);
  }

  for (const [at, offset] of BASS) {
    if (at === i) fmBass(busGain, midiToFreq(chord.root + 12 + offset), t, STEP * 1.6, 0.42);
  }

  const m = MELODY_AT.get(s);
  if (m) {
    const [note, len] = m;
    const dur = STEP * len * 0.92;
    lead(busGain, midiToFreq(note), t, dur, 0.11);
    lead(echo, midiToFreq(note), t, dur, 0.06);
  }

  if (KICK.has(i)) kick(busGain, t, 0.7);
  if (SNARE.has(i)) {
    snare(busGain, t, 0.38);
    snare(echo, t, 0.15);
  }
  if (i % 2 === 0) hat(busGain, t, i === 14 ? 0.07 : 0.05, i === 14);
}

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
      nextTime += STEP;
      step = (step + 1) % (STEPS_PER_BAR * BARS);
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

/** Lower the music briefly so a sound effect stands out. */
export function duckMusic(seconds: number) {
  if (!busGain) return;
  const { ctx } = audio();
  const g = busGain.gain;
  g.cancelScheduledValues(ctx.currentTime);
  g.setTargetAtTime(0.2, ctx.currentTime, 0.03);
  g.setTargetAtTime(1, ctx.currentTime + seconds, 0.2);
}
