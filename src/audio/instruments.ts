import { audio } from './engine';

// 16-bit console instruments (SNES / Mega Drive flavour) built from Web Audio nodes:
// FM bass, detuned-saw lead and pads, brass, orchestra hit, a fuller drum kit and an SNES-style echo.

type Dest = AudioNode;

function ctx() {
  return audio().ctx;
}

/** Gain node with an attack/decay/sustain/release envelope over [t, t + dur]. */
function envelope(dest: Dest, t: number, dur: number, peak: number, a = 0.005, d = 0.1, s = 0.7, r = 0.08) {
  const g = ctx().createGain();
  const p = g.gain;
  p.setValueAtTime(0.0001, t);
  p.linearRampToValueAtTime(peak, t + a);
  p.setTargetAtTime(peak * s, t + a, d / 3);
  p.setTargetAtTime(0.0001, t + Math.max(dur, a), r / 3);
  g.connect(dest);
  return g;
}

function osc(type: OscillatorType, freq: number, t: number, stop: number, detuneCents = 0) {
  const o = ctx().createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.detune.value = detuneCents;
  o.start(t);
  o.stop(stop);
  return o;
}

function noiseSource(t: number, stop: number) {
  const { ctx: c, noiseBuffer } = audio();
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  src.start(t);
  src.stop(stop);
  return src;
}

function filter(type: BiquadFilterType, freq: number, q = 0.7) {
  const f = ctx().createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

/** SNES-style echo: filtered feedback delay plus a short hall. Returns the input to send into. */
export function createEcho(dest: Dest, { time = 0.19, feedback = 0.38, wet = 0.32 } = {}) {
  const c = ctx();
  const input = c.createGain();
  const delay = c.createDelay(1);
  delay.delayTime.value = time;
  const fb = c.createGain();
  fb.gain.value = feedback;
  const tone = filter('lowpass', 2600);
  const out = c.createGain();
  out.gain.value = wet;
  input.connect(delay);
  delay.connect(tone).connect(fb).connect(delay);
  tone.connect(out).connect(dest);
  return input;
}

/** Mega Drive style FM bass: a sine carrier whose brightness (modulation index) snaps down after the attack. */
export function fmBass(dest: Dest, freq: number, t: number, dur: number, vol: number) {
  const c = ctx();
  const stop = t + dur + 0.15;
  const carrier = osc('sine', freq, t, stop);
  const mod = osc('sine', freq * 2, t, stop);
  const index = c.createGain();
  index.gain.setValueAtTime(freq * 5, t);
  index.gain.setTargetAtTime(freq * 0.8, t, 0.04);
  mod.connect(index).connect(carrier.frequency);
  carrier.connect(envelope(dest, t, dur, vol, 0.004, 0.12, 0.6, 0.06));
}

/** Warm lead: two detuned saws through a low-pass with a small filter sweep and delayed vibrato. */
export function lead(dest: Dest, freq: number, t: number, dur: number, vol: number) {
  const c = ctx();
  const stop = t + dur + 0.3;
  const lp = filter('lowpass', 3200, 2);
  lp.frequency.setValueAtTime(4200, t);
  lp.frequency.setTargetAtTime(1800, t, 0.12);
  const amp = envelope(dest, t, dur, vol, 0.01, 0.15, 0.75, 0.12);
  lp.connect(amp);
  const vibrato = c.createGain();
  vibrato.gain.setValueAtTime(0, t);
  vibrato.gain.linearRampToValueAtTime(0, t + 0.18);
  vibrato.gain.linearRampToValueAtTime(freq * 0.012, t + 0.4);
  const lfo = osc('sine', 5.5, t, stop);
  lfo.connect(vibrato);
  for (const cents of [-7, 7]) {
    const o = osc('sawtooth', freq, t, stop, cents);
    vibrato.connect(o.frequency);
    o.connect(lp);
  }
}

/** String/synth pad: detuned saws, soft attack, dark filter. */
export function pad(dest: Dest, freqs: number[], t: number, dur: number, vol: number) {
  const stop = t + dur + 0.6;
  const lp = filter('lowpass', 1400);
  // Several detuned saws add up: scale by sqrt(count) so bigger chords aren't louder.
  const amp = envelope(dest, t, dur, vol / Math.sqrt(freqs.length * 2), 0.25, 0.3, 0.85, 0.5);
  lp.connect(amp);
  for (const f of freqs) {
    for (const cents of [-12, 12]) osc('sawtooth', f, t, stop, cents).connect(lp);
  }
}

/** Brass stab ("bwah"): saw + square with the filter opening on the attack. */
export function brass(dest: Dest, freq: number, t: number, dur: number, vol: number) {
  const stop = t + dur + 0.25;
  const lp = filter('lowpass', 600, 1.5);
  lp.frequency.setValueAtTime(600, t);
  lp.frequency.linearRampToValueAtTime(3800, t + 0.06);
  lp.frequency.setTargetAtTime(1600, t + 0.06, 0.15);
  lp.connect(envelope(dest, t, dur, vol, 0.03, 0.2, 0.8, 0.15));
  osc('sawtooth', freq, t, stop, -5).connect(lp);
  osc('square', freq, t, stop, 5).connect(lp);
}

/** The classic 16-bit "orchestra hit": a big chord of saws, brass and noise with a sharp decay. */
export function orchestraHit(dest: Dest, rootFreq: number, t: number, vol: number) {
  const stop = t + 1.2;
  const lp = filter('lowpass', 5000, 1);
  lp.frequency.setValueAtTime(5000, t);
  lp.frequency.setTargetAtTime(900, t, 0.15);
  // 12 stacked saws: scale by sqrt(12) so the hit stays punchy without clipping.
  const amp = ctx().createGain();
  amp.gain.setValueAtTime(vol / Math.sqrt(12), t);
  amp.gain.setTargetAtTime(0.0001, t + 0.05, 0.22);
  lp.connect(amp).connect(dest);
  for (const ratio of [0.5, 1, 1.5, 2, 2.52, 3]) {
    for (const cents of [-10, 10]) osc('sawtooth', rootFreq * ratio, t, stop, cents).connect(lp);
  }
  const n = noiseSource(t, t + 0.25);
  const nf = filter('bandpass', 2500, 0.8);
  const ng = ctx().createGain();
  ng.gain.setValueAtTime(vol * 0.6, t);
  ng.gain.setTargetAtTime(0.0001, t, 0.04);
  n.connect(nf).connect(ng).connect(dest);
}

export function kick(dest: Dest, t: number, vol: number) {
  const o = osc('sine', 160, t, t + 0.45);
  o.frequency.setTargetAtTime(42, t, 0.035);
  const g = ctx().createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.setTargetAtTime(0.0001, t + 0.02, 0.09);
  o.connect(g).connect(dest);
  // Beater click
  const n = noiseSource(t, t + 0.02);
  const ng = ctx().createGain();
  ng.gain.setValueAtTime(vol * 0.35, t);
  ng.gain.setTargetAtTime(0.0001, t, 0.004);
  n.connect(filter('highpass', 3000)).connect(ng).connect(dest);
}

export function snare(dest: Dest, t: number, vol: number) {
  const n = noiseSource(t, t + 0.3);
  const ng = ctx().createGain();
  ng.gain.setValueAtTime(vol, t);
  ng.gain.setTargetAtTime(0.0001, t, 0.06);
  n.connect(filter('bandpass', 2200, 0.6)).connect(ng).connect(dest);
  const body = osc('triangle', 210, t, t + 0.15);
  body.frequency.setTargetAtTime(150, t, 0.03);
  const bg = ctx().createGain();
  bg.gain.setValueAtTime(vol * 0.7, t);
  bg.gain.setTargetAtTime(0.0001, t, 0.035);
  body.connect(bg).connect(dest);
}

export function hat(dest: Dest, t: number, vol: number, open = false) {
  const n = noiseSource(t, t + (open ? 0.35 : 0.06));
  const g = ctx().createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.setTargetAtTime(0.0001, t, open ? 0.08 : 0.012);
  n.connect(filter('highpass', 8000)).connect(g).connect(dest);
}

export function crash(dest: Dest, t: number, vol: number) {
  const n = noiseSource(t, t + 1.6);
  const g = ctx().createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.setTargetAtTime(0.0001, t, 0.4);
  n.connect(filter('highpass', 4500)).connect(g).connect(dest);
}

/** Deep timpani-like boom for impacts. */
export function boom(dest: Dest, t: number, vol: number) {
  const o = osc('sine', 95, t, t + 1.2);
  o.frequency.setTargetAtTime(38, t, 0.12);
  const g = ctx().createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.setTargetAtTime(0.0001, t + 0.03, 0.25);
  o.connect(g).connect(dest);
}

/** Air whoosh that pans across the stereo field. */
export function sweep(dest: Dest, t: number, vol: number, fromLeft = true) {
  const c = ctx();
  const n = noiseSource(t, t + 0.4);
  const bp = filter('bandpass', 500, 1.2);
  bp.frequency.setValueAtTime(500, t);
  bp.frequency.exponentialRampToValueAtTime(3500, t + 0.3);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.12);
  g.gain.setTargetAtTime(0.0001, t + 0.18, 0.06);
  const pan = c.createStereoPanner();
  pan.pan.setValueAtTime(fromLeft ? -0.8 : 0.8, t);
  pan.pan.linearRampToValueAtTime(fromLeft ? 0.3 : -0.3, t + 0.3);
  n.connect(bp).connect(g).connect(pan).connect(dest);
}
