import { audio, midiToFreq, noise, tone } from './engine';

// 8-bit fighting-game loop: A minor, 4 bars (Am - F - G - E), 16th-note steps.
const BPM = 168;
const STEP = 60 / BPM / 4;

const CHORDS = [
  { root: 45, tones: [69, 72, 76] }, // Am
  { root: 41, tones: [65, 69, 72] }, // F
  { root: 43, tones: [67, 71, 74] }, // G
  { root: 40, tones: [64, 68, 71] }, // E (major for tension)
];

// Bass: offsets from chord root per 16th step (null = rest). Driving octave pattern.
const BASS = [0, null, 12, 0, null, 0, 12, null, 0, null, 12, 0, 12, null, 10, 12];
// Lead: index into chord tones (+3 = root an octave up), null = rest.
const LEAD = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 2, null, 3, null];
const KICK = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0];
const SNARE = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1];

let timer: number | null = null;
let step = 0;
let nextTime = 0;
let busGain: GainNode | null = null;

function scheduleStep(s: number, t: number) {
  if (!busGain) return;
  const chord = CHORDS[Math.floor(s / 16) % CHORDS.length];
  const i = s % 16;

  const b = BASS[i];
  if (b !== null) tone(busGain, 'triangle', midiToFreq(chord.root + b), t, STEP * 0.9, 0.5);

  const l = LEAD[i];
  if (l !== null) {
    const note = l === 3 ? chord.tones[0] + 12 : chord.tones[l];
    tone(busGain, 'square', midiToFreq(note), t, STEP * 0.8, 0.12);
  }

  if (KICK[i]) tone(busGain, 'sine', 150, t, 0.12, 0.6, 40);
  if (SNARE[i]) noise(busGain, t, 0.1, 0.25, { type: 'highpass', freq: 1500 });
  if (i % 2 === 1) noise(busGain, t, 0.03, 0.06, { type: 'highpass', freq: 7000 });
}

export function startMusic() {
  if (timer !== null) return;
  const { ctx, musicBus } = audio();
  busGain = ctx.createGain();
  busGain.gain.setValueAtTime(1, ctx.currentTime);
  busGain.connect(musicBus);
  step = 0;
  nextTime = ctx.currentTime + 0.05;
  // Lookahead scheduler: precise timing from the audio clock, driven by a coarse JS timer.
  timer = window.setInterval(() => {
    while (nextTime < ctx.currentTime + 0.12) {
      scheduleStep(step, nextTime);
      nextTime += STEP;
      step = (step + 1) % (16 * CHORDS.length);
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
  if (g) {
    g.gain.setTargetAtTime(0, ctx.currentTime, fadeSeconds / 4);
    window.setTimeout(() => g.disconnect(), fadeSeconds * 1000 + 200);
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
