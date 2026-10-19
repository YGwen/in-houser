import { duckMusic } from './music';
import { audio, isMuted } from './engine';

// Fighting-game announcer.
// 1. Preferred: clips generated with Piper (`npm run voice`) in public/voice/, played through an
//    "arena" effects chain (a bit deeper, gritty, with slapback echo and hall reverb).
// 2. Fallback for anything without a clip (e.g. a player added after generating): the browser's
//    text-to-speech, pushed low and slow.
// Lines are queued so they never talk over each other.

export type LineId = 'top' | 'jungle' | 'mid' | 'adc' | 'support' | 'versus' | 'duel' | 'fight';
export type Style = 'call' | 'name' | 'hype';

export interface Line {
  /** Text for the browser-voice fallback. */
  text: string;
  style: Style;
  clip?: { line: LineId } | { name: string };
}

interface Manifest {
  lines: Partial<Record<LineId, string>>;
  names: Record<string, string>;
}

/** Must match nameKey() in scripts/generate-voice.mjs. */
export const voiceKey = (name: string) => name.trim().toLowerCase();

const VOICE_BASE = `${import.meta.env.BASE_URL}voice/`;

let enabled = true;
let manifest: Promise<Manifest | null> | null = null;
const buffers = new Map<string, Promise<AudioBuffer | null>>();

function loadManifest(): Promise<Manifest | null> {
  manifest ??= fetch(`${VOICE_BASE}manifest.json`, { cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<Manifest>) : null))
    .catch(() => null);
  return manifest;
}

function loadClip(file: string): Promise<AudioBuffer | null> {
  let buf = buffers.get(file);
  if (!buf) {
    buf = fetch(VOICE_BASE + file)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(r.statusText))))
      .then((data) => audio().ctx.decodeAudioData(data))
      .catch(() => null);
    buffers.set(file, buf);
  }
  return buf;
}

async function clipFile(clip: Line['clip']): Promise<string | undefined> {
  if (!clip) return undefined;
  const m = await loadManifest();
  if (!m) return undefined;
  return 'line' in clip ? m.lines[clip.line] : m.names[voiceKey(clip.name)];
}

/** Fetch and decode the clips for a reveal ahead of time so playback starts instantly. */
export function preloadVoice(lines: Line[]) {
  for (const line of lines) {
    void clipFile(line.clip).then((file) => (file ? loadClip(file) : null));
  }
}

// ---------- Arena effects chain (built once) ----------

let chainInput: AudioNode | null = null;

function impulse(ctx: AudioContext, seconds: number, decay: number) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const ir = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = ir.getChannelData(ch);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
  }
  return ir;
}

export function arenaChain(): AudioNode {
  if (chainInput) return chainInput;
  const { ctx, sfxBus } = audio();

  // Presence + chest: cut mud, boost low body and the "bite" range.
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.frequency.value = 90;
  const body = ctx.createBiquadFilter();
  body.type = 'lowshelf';
  body.frequency.value = 220;
  body.gain.value = 5;
  const bite = ctx.createBiquadFilter();
  bite.type = 'peaking';
  bite.frequency.value = 2800;
  bite.Q.value = 0.8;
  bite.gain.value = 5;

  // Gentle overdrive: the "shouting into a stadium PA" grit.
  const drive = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2);
  }
  drive.curve = curve;
  drive.oversample = '4x';

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20;
  comp.ratio.value = 6;
  comp.attack.value = 0.003;
  comp.release.value = 0.2;

  const dry = ctx.createGain();
  dry.gain.value = 1.0;

  // Slapback echo off the arena walls.
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.14;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const echoLevel = ctx.createGain();
  echoLevel.gain.value = 0.35;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = 'lowpass';
  echoTone.frequency.value = 3000;

  // Big hall tail.
  const reverb = ctx.createConvolver();
  reverb.buffer = impulse(ctx, 2.2, 3);
  const reverbLevel = ctx.createGain();
  reverbLevel.gain.value = 0.3;

  highpass.connect(body).connect(bite).connect(drive).connect(comp);
  comp.connect(dry).connect(sfxBus);
  comp.connect(delay);
  delay.connect(echoTone).connect(feedback).connect(delay);
  echoTone.connect(echoLevel).connect(sfxBus);
  comp.connect(reverb).connect(reverbLevel).connect(sfxBus);

  chainInput = highpass;
  return chainInput;
}

// ---------- Playback ----------

/** Playback rate per style: below 1 makes the voice deeper and slower (the classic announcer trick). */
export const CLIP_RATE: Record<Style, number> = { call: 0.9, name: 0.93, hype: 0.82 };
/** Generated clips end with this much silence (see TAIL_SILENCE_S in scripts/piper_batch.py). */
const CLIP_TAIL_S = 0.25;

let current: AudioBufferSourceNode | null = null;

function playClip(buffer: AudioBuffer, style: Style): Promise<void> {
  const { ctx } = audio();
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = CLIP_RATE[style];
  const gain = ctx.createGain();
  gain.gain.value = style === 'hype' ? 1.2 : 1;
  src.connect(gain).connect(arenaChain());
  const seconds = buffer.duration / CLIP_RATE[style];
  duckMusic(seconds + 0.3);
  current = src;
  src.onended = () => {
    if (current === src) current = null;
  };
  src.start();
  // The next line may start once the speech is over: the silent tail (and the echo) keep ringing under it.
  // A timer rather than onended also means a suspended audio context can never hang the reveal.
  const speechSeconds = Math.max(0.1, (buffer.duration - CLIP_TAIL_S) / CLIP_RATE[style]);
  return new Promise((resolve) => window.setTimeout(resolve, speechSeconds * 1000));
}

// Browser text-to-speech fallback.
const speechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
let ttsVoice: SpeechSynthesisVoice | null = null;
// Female voices, to match the pre-recorded announcer (Piper hfc_female).
const PREFERRED_TTS = ['Aria Online', 'Jenny Online', 'Michelle Online', 'Google US English', 'Google UK English Female', 'Microsoft Zira', 'Samantha', 'Karen'];

function pickTtsVoice() {
  const english = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('en'));
  ttsVoice =
    PREFERRED_TTS.map((n) => english.find((v) => v.name.includes(n))).find(Boolean) ??
    english.find((v) => /female|zira|aria|jenny|samantha/i.test(v.name)) ??
    english[0] ??
    null;
}
if (speechSupported) {
  pickTtsVoice();
  speechSynthesis.addEventListener('voiceschanged', pickTtsVoice);
}

function speak(text: string, style: Style): Promise<void> {
  if (!speechSupported) return Promise.resolve();
  const u = new SpeechSynthesisUtterance(text);
  if (ttsVoice) {
    u.voice = ttsVoice;
    u.lang = ttsVoice.lang;
  }
  const natural = !!ttsVoice && /online|natural|google/i.test(ttsVoice.name);
  const pitch = { call: 0.55, name: 0.7, hype: 0.35 }[style];
  u.pitch = natural ? pitch + 0.25 : pitch;
  u.rate = { call: 0.85, name: 0.95, hype: 0.75 }[style];
  return new Promise((resolve) => {
    // Some browsers never fire onend (e.g. when cancelled): don't let the reveal hang.
    const fallback = window.setTimeout(resolve, 600 + text.length * 160);
    const finish = () => {
      window.clearTimeout(fallback);
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    u.onstart = () => duckMusic(Math.min(2.5, 0.4 + text.length * 0.08));
    speechSynthesis.speak(u);
  });
}

// ---------- Queue ----------

let queue: Promise<void> = Promise.resolve();
let generation = 0;

/** Queue a line. Resolves once it has been said (immediately when muted or off). */
export function announce(line: Line): Promise<void> {
  const gen = generation;
  queue = queue.then(async () => {
    if (gen !== generation || !enabled || isMuted()) return;
    const file = await clipFile(line.clip);
    const buffer = file ? await loadClip(file) : null;
    if (gen !== generation) return;
    await (buffer ? playClip(buffer, line.style) : speak(line.text, line.style));
  });
  return queue;
}

/** Resolves when everything queued so far has been said. */
export function announcerIdle(): Promise<void> {
  return queue;
}

/** Drop everything queued and cut off the current line. */
export function stopAnnouncer() {
  generation++;
  try {
    current?.stop();
  } catch {
    // already stopped
  }
  current = null;
  if (speechSupported) speechSynthesis.cancel();
}

export function setAnnouncerEnabled(value: boolean) {
  enabled = value;
  if (!value) stopAnnouncer();
}
