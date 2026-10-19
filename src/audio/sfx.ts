import { duckMusic } from './music';
import { audio, midiToFreq, noise, tone } from './engine';
import { boom, brass, crash, createEcho, orchestraHit, pad, snare, sweep } from './instruments';

// 16-bit style sound effects for the reveal, sharing one SNES-style echo.

let echo: AudioNode | null = null;

function buses() {
  const a = audio();
  echo ??= createEcho(a.sfxBus, { time: 0.16, feedback: 0.3, wet: 0.35 });
  return { t: a.ctx.currentTime, out: a.sfxBus, echo };
}

/** Heavy impact when "VS" slams in: boom, low orchestra hit, crash and a filtered blast. */
export function vsHit() {
  const { t, out, echo } = buses();
  boom(out, t, 0.9);
  orchestraHit(out, midiToFreq(45), t, 0.22);
  orchestraHit(echo, midiToFreq(45), t, 0.12);
  crash(out, t, 0.18);
  noise(out, t, 0.35, 0.5, { type: 'lowpass', freq: 4000, endFreq: 200 });
}

/** Blades meeting when the red fighter parries: a bright metallic clang over a short noise burst. */
export function clash() {
  const { t, out, echo } = buses();
  for (const [freq, vol, dur] of [
    [1480, 0.09, 0.32],
    [2210, 0.07, 0.26],
    [3390, 0.05, 0.2],
    [5020, 0.03, 0.14],
  ]) {
    tone(out, 'square', freq, t, dur, vol, freq * 0.97);
    tone(echo, 'triangle', freq, t, dur, vol * 0.5);
  }
  noise(out, t, 0.12, 0.45, { type: 'highpass', freq: 3000 });
  tone(out, 'triangle', 220, t, 0.12, 0.25, 90);
}

/** Air sweep when a player's name slides in, travelling from that player's side. */
export function whoosh(fromLeft = true) {
  const { t, out } = buses();
  sweep(out, t, 0.55, fromLeft);
}

/** Duel lanes: metallic sword "shing", two dramatic orchestra hits, then a gong. */
export function duelSting() {
  const { t, out, echo } = buses();
  duckMusic(2.4);

  // Blade drawn: bright inharmonic partials with a long ring, over a rising noise sweep.
  noise(out, t, 0.4, 0.35, { type: 'bandpass', freq: 2000, endFreq: 9000 });
  for (const [freq, vol] of [
    [2380, 0.09],
    [3710, 0.07],
    [5160, 0.05],
    [6950, 0.03],
  ]) {
    tone(out, 'sine', freq, t + 0.3, 1.4, vol);
    tone(echo, 'sine', freq, t + 0.3, 1.4, vol * 0.6);
  }

  // Dun... DUN!
  orchestraHit(out, midiToFreq(50), t + 0.5, 0.2);
  orchestraHit(out, midiToFreq(45), t + 0.85, 0.26);
  orchestraHit(echo, midiToFreq(45), t + 0.85, 0.15);
  boom(out, t + 0.85, 0.8);

  // Gong: inharmonic sine partials with a long decay.
  for (const [ratio, vol] of [
    [1, 0.5],
    [2.76, 0.22],
    [5.4, 0.1],
  ]) {
    tone(out, 'sine', 98 * ratio, t + 0.85, 2.2, vol);
  }
}

/**
 * "VS" sting for the FIGHT! screen (~4.3 s at 150 BPM, in Arena's key): orchestra hits climbing
 * A minor -> F -> G with a brass run, a snare roll, then a held A major brass chord.
 */
export function fightJingle() {
  const { t, out, echo } = buses();
  const S = 0.1; // one 16th note at 150 BPM
  duckMusic(4.4, 0.15);

  const stab = (at: number, root: number, chord: number[], dur: number, vol: number) => {
    orchestraHit(out, midiToFreq(root), at, 0.2);
    orchestraHit(echo, midiToFreq(root), at, 0.08);
    for (const m of chord) brass(out, midiToFreq(m), at, dur, vol);
  };

  // Hit 1: A minor, with a boom and crash.
  stab(t, 45, [57, 60, 64], 0.25, 0.08);
  boom(out, t, 0.8);
  crash(out, t, 0.16);
  // Brass run up to the next hit.
  [64, 67, 69, 72].forEach((m, i) => {
    brass(out, midiToFreq(m), t + (3 + i) * S, S * 0.9, 0.11);
    brass(echo, midiToFreq(m), t + (3 + i) * S, S * 0.9, 0.05);
  });
  // Hits 2 and 3: F, then G.
  stab(t + 8 * S, 41, [65, 69, 72], 0.35, 0.08);
  stab(t + 12 * S, 43, [67, 71, 74], 0.35, 0.08);
  // Snare roll in 32nds, getting louder into the last hit.
  for (let i = 0; i < 16; i++) snare(out, t + 12 * S + i * (S / 2), 0.08 + i * 0.016);

  // Last hit: held A major, topped by a high A.
  const last = t + 20 * S;
  stab(last, 45, [57, 61, 64, 69], 2.0, 0.07);
  for (const m of [61, 64, 69]) brass(echo, midiToFreq(m), last, 2.0, 0.03);
  brass(out, midiToFreq(81), last + 2 * S, 1.8, 0.09);
  brass(echo, midiToFreq(81), last + 2 * S, 1.8, 0.04);
  pad(out, [57, 61, 64, 69].map(midiToFreq), last, 2.3, 0.06);
  boom(out, last, 0.9);
  crash(out, last, 0.22);
}
