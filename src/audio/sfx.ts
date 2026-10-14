import { duckMusic } from './chiptune';
import { audio, midiToFreq, noise, tone } from './engine';

/** Heavy impact when "VS" slams in. */
export function vsHit() {
  const { ctx, sfxBus } = audio();
  const t = ctx.currentTime;
  noise(sfxBus, t, 0.35, 0.8, { type: 'lowpass', freq: 3000, endFreq: 200 });
  tone(sfxBus, 'square', 220, t, 0.3, 0.35, 50);
  tone(sfxBus, 'sine', 120, t, 0.4, 0.8, 35);
}

/** Quick swoosh when a player's name slides in. */
export function whoosh() {
  const { ctx, sfxBus } = audio();
  const t = ctx.currentTime;
  noise(sfxBus, t, 0.25, 0.4, { type: 'bandpass', freq: 600, endFreq: 4000 });
  tone(sfxBus, 'square', 330, t + 0.18, 0.08, 0.1);
}

/** Duel lanes: sword "shing" sweep followed by a gong hit. */
export function duelSting() {
  const { ctx, sfxBus } = audio();
  const t = ctx.currentTime;
  duckMusic(2.2);

  // Blade drawn: rising metallic sweep.
  noise(sfxBus, t, 0.45, 0.5, { type: 'bandpass', freq: 1500, endFreq: 9000 });
  tone(sfxBus, 'sawtooth', 600, t, 0.4, 0.12, 3200);
  tone(sfxBus, 'square', 2400, t + 0.38, 0.5, 0.08, 2300);

  // Gong: inharmonic sine partials with a long decay.
  const g = t + 0.45;
  for (const [ratio, vol] of [
    [1, 0.7],
    [2.76, 0.3],
    [5.4, 0.15],
    [8.93, 0.08],
  ]) {
    tone(sfxBus, 'sine', 98 * ratio, g, 2.2, vol);
  }
  noise(sfxBus, g, 0.15, 0.6, { type: 'lowpass', freq: 1200 });

  // Two-note alarm stab, classic fighting-game "challenger" feel.
  for (let i = 0; i < 3; i++) {
    tone(sfxBus, 'square', midiToFreq(76), g + 0.3 + i * 0.22, 0.1, 0.12);
    tone(sfxBus, 'square', midiToFreq(81), g + 0.41 + i * 0.22, 0.1, 0.12);
  }
}

/** Short victory-style jingle for the "FIGHT!" screen. */
export function fightJingle() {
  const { ctx, sfxBus } = audio();
  const t = ctx.currentTime;
  [72, 76, 79, 84].forEach((m, i) => tone(sfxBus, 'square', midiToFreq(m), t + i * 0.08, 0.12, 0.2));
  tone(sfxBus, 'square', midiToFreq(88), t + 0.32, 0.5, 0.2);
  tone(sfxBus, 'triangle', midiToFreq(48), t + 0.32, 0.5, 0.5);
}
