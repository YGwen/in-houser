// Shared Web Audio graph: master -> destination, with separate music and sfx buses.

let ctx: AudioContext | null = null;
let master: GainNode;
let musicBus: GainNode;
let sfxBus: GainNode;
let noiseBuffer: AudioBuffer;
let muted = false;

/** Must be called from a user gesture (click / key) the first time, to satisfy autoplay rules. */
export function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.6;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.5;
    musicBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return { ctx, master, musicBus, sfxBus, noiseBuffer };
}

export function setMuted(value: boolean) {
  muted = value;
  if (ctx) master.gain.setTargetAtTime(value ? 0 : 0.6, ctx.currentTime, 0.02);
}

export const isMuted = () => muted;

export const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** One enveloped oscillator note. */
export function tone(
  dest: AudioNode,
  type: OscillatorType,
  freq: number,
  start: number,
  duration: number,
  volume: number,
  endFreq?: number,
) {
  const { ctx } = audio();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(dest);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Filtered white-noise burst (drums, impacts, swooshes). */
export function noise(
  dest: AudioNode,
  start: number,
  duration: number,
  volume: number,
  filter: { type: BiquadFilterType; freq: number; endFreq?: number },
) {
  const { ctx, noiseBuffer } = audio();
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const biquad = ctx.createBiquadFilter();
  biquad.type = filter.type;
  biquad.frequency.setValueAtTime(filter.freq, start);
  if (filter.endFreq) biquad.frequency.exponentialRampToValueAtTime(filter.endFreq, start + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  src.connect(biquad).connect(gain).connect(dest);
  src.start(start);
  src.stop(start + duration + 0.02);
}
