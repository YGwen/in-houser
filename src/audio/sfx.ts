import { duckMusic } from './music';
import { audio, midiToFreq, noise, tone } from './engine';
import { boom, brass, crash, createEcho, orchestraHit, sweep } from './instruments';

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

/** Brass fanfare for the "FIGHT!" screen. */
export function fightJingle() {
  const { t, out, echo } = buses();
  // Three pickup notes, then a held C major chord.
  [67, 67, 72].forEach((m, i) => {
    brass(out, midiToFreq(m), t + i * 0.11, 0.09, 0.12);
    brass(echo, midiToFreq(m), t + i * 0.11, 0.09, 0.05);
  });
  const hold = t + 0.36;
  for (const m of [60, 64, 67, 72]) {
    brass(out, midiToFreq(m), hold, 0.9, 0.08);
    brass(echo, midiToFreq(m), hold, 0.9, 0.04);
  }
  boom(out, hold, 0.8);
  crash(out, hold, 0.2);
}
