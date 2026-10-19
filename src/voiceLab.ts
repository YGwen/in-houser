// Voice lab (dev page /voice-lab.html): compare announcer voices before picking one.
// A: Piper voices pre-rendered into public/voice-lab/<voice>/<line>.wav (not committed).
// B: live text-to-speech voices available in this browser.
import { arenaChain, CLIP_RATE, voiceKey, type Style } from './audio/announcer';
import { audio } from './audio/engine';
import { setMusicTrack, startMusic, stopMusic } from './audio/music';
import { TRACKS } from './audio/tracks';
import { repoRoster } from './roster';

const LINES: { file: string; text: string; style: Style }[] = [
  { file: 'top', text: 'Top lane!', style: 'call' },
  { file: 'tolll', text: 'ToLLL!', style: 'name' },
  { file: 'versus', text: 'Versus!', style: 'call' },
  { file: 'balwe', text: 'Balwé!', style: 'name' },
  { file: 'duel', text: 'Duel!', style: 'hype' },
  { file: 'fight', text: 'Fight!', style: 'hype' },
];

const FEMALE = [
  { id: 'en_US-amy-medium', label: 'Amy', accent: 'American female' },
  { id: 'en_US-kristin-medium', label: 'Kristin', accent: 'American female' },
  { id: 'en_US-hfc_female-medium', label: 'HFC female', accent: 'American female' },
  { id: 'en_US-lessac-medium', label: 'Lessac', accent: 'American female' },
  { id: 'en_US-ljspeech-medium', label: 'LJ Speech', accent: 'American female' },
  { id: 'en_GB-jenny_dioco-medium', label: 'Jenny', accent: 'British female' },
  { id: 'en_GB-cori-medium', label: 'Cori', accent: 'British female' },
  { id: 'en_GB-alba-medium', label: 'Alba', accent: 'Scottish female' },
  { id: 'en_GB-southern_english_female-low', label: 'Southern English', accent: 'Southern English female (lower quality model)' },
];

const MALE = [
  { id: 'en_US-ryan-high', label: 'Ryan', accent: 'American male (current voice)', current: true },
  { id: 'en_GB-alan-medium', label: 'Alan', accent: 'British male' },
  { id: 'en_GB-northern_english_male-medium', label: 'Northern English', accent: 'Northern English male' },
  { id: 'en_US-joe-medium', label: 'Joe', accent: 'American male' },
  { id: 'en_US-john-medium', label: 'John', accent: 'American male' },
  { id: 'en_US-norman-medium', label: 'Norman', accent: 'American male, deeper' },
  { id: 'en_US-bryce-medium', label: 'Bryce', accent: 'American male' },
  { id: 'en_US-hfc_male-medium', label: 'HFC male', accent: 'American male' },
];

let generation = 0;
const sources = new Set<AudioBufferSourceNode>();
const buffers = new Map<string, Promise<AudioBuffer>>();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function stopAll() {
  generation++;
  stopMusic(0.3);
  sources.forEach((s) => {
    try {
      s.stop();
    } catch {
      /* already stopped */
    }
  });
  sources.clear();
  speechSynthesis.cancel();
  document.querySelectorAll('.playing').forEach((el) => el.classList.remove('playing'));
}

function load(url: string) {
  let b = buffers.get(url);
  if (!b) {
    b = fetch(url)
      .then((r) => r.arrayBuffer())
      .then((d) => audio().ctx.decodeAudioData(d));
    buffers.set(url, b);
  }
  return b;
}

async function playClip(url: string, style: Style, effect: boolean) {
  const { ctx, sfxBus } = audio();
  const buffer = await load(url);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.value = effect ? CLIP_RATE[style] : 1;
  src.connect(effect ? arenaChain() : sfxBus);
  sources.add(src);
  src.start();
  await sleep((buffer.duration / src.playbackRate.value) * 1000 - 150);
  sources.delete(src);
}

async function playPiper(voice: string, effect: boolean, row: HTMLElement, only?: string) {
  stopAll();
  const gen = generation;
  row.classList.add('playing');
  for (const line of LINES) {
    if (only && line.file !== only) continue;
    if (gen !== generation) return;
    await playClip(`${import.meta.env.BASE_URL}voice-lab/${voice}/${line.file}.wav`, line.style, effect);
    await sleep(250);
  }
  if (gen === generation) row.classList.remove('playing');
}

function speak(voice: SpeechSynthesisVoice, text: string, style: Style, announcer: boolean) {
  return new Promise<void>((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    if (announcer) {
      u.pitch = { call: 0.7, name: 0.85, hype: 0.55 }[style];
      u.rate = { call: 0.85, name: 0.95, hype: 0.75 }[style];
    }
    const done = () => resolve();
    u.onend = done;
    u.onerror = done;
    setTimeout(done, 4000);
    speechSynthesis.speak(u);
  });
}

async function playLive(voice: SpeechSynthesisVoice, announcer: boolean, row: HTMLElement) {
  stopAll();
  const gen = generation;
  row.classList.add('playing');
  for (const line of LINES) {
    if (gen !== generation) return;
    await speak(voice, line.text, line.style, announcer);
    await sleep(200);
  }
  if (gen === generation) row.classList.remove('playing');
}

function button(text: string, onClick: () => void, primary = false) {
  const b = document.createElement('button');
  b.textContent = text;
  if (primary) b.className = 'primary';
  b.addEventListener('click', onClick);
  return b;
}

function row(num: string, title: string, subtitle: string, current = false) {
  const el = document.createElement('div');
  el.className = `voice ${current ? 'current' : ''}`;
  el.innerHTML = `<div class="num"></div><div class="label"><b></b><small></small><div class="lines"></div></div><div class="actions"></div>`;
  el.querySelector('.num')!.textContent = num;
  el.querySelector('b')!.textContent = title;
  el.querySelector('small')!.textContent = subtitle;
  return el;
}

function renderPiper(list: { id: string; label: string; accent: string; current?: boolean }[], prefix: string, el: HTMLElement) {
  list.forEach((v, i) => {
  const r = row(`${prefix}${i + 1}`, v.label, v.accent, v.current);
  const actions = r.querySelector('.actions')!;
  actions.append(button('▶ Arena effect', () => void playPiper(v.id, true, r), true), button('▶ Raw', () => void playPiper(v.id, false, r)));
  const lines = r.querySelector('.lines')!;
  LINES.forEach((l) => lines.append(button(l.text, () => void playPiper(v.id, true, r, l.file))));
  el.append(r);
  });
}
renderPiper(FEMALE, 'F', document.getElementById('piper')!);
renderPiper(MALE, 'M', document.getElementById('piper-male')!);

/** Best guess from the voice name: browsers don't expose a voice's gender. */
const FEMALE_NAMES = /female|zira|hortense|julie|aria|jenny|sonia|libby|michelle|ava|emma|samantha|karen|moira|tessa|denise|google us english|google français/i;

function renderLive() {
  const liveList = document.getElementById('live')!;
  const voices = speechSynthesis
    .getVoices()
    .filter((v) => /^(en|fr)/i.test(v.lang))
    .sort(
      (a, b) =>
        Number(FEMALE_NAMES.test(b.name)) - Number(FEMALE_NAMES.test(a.name)) ||
        Number(b.lang.startsWith('en')) - Number(a.lang.startsWith('en')) ||
        a.name.localeCompare(b.name),
    );
  liveList.innerHTML = '';
  if (!voices.length) {
    liveList.textContent = 'This browser has no English or French text-to-speech voices.';
    return;
  }
  voices.forEach((v, i) => {
    const gender = FEMALE_NAMES.test(v.name) ? ' · female' : '';
    const r = row(`L${i + 1}`, v.name, `${v.lang}${gender}${v.localService ? ' · on this computer' : ' · online voice'}`);
    r.querySelector('.actions')!.append(
      button('▶ Announcer', () => void playLive(v, true, r), true),
      button('▶ Natural', () => void playLive(v, false, r)),
    );
    liveList.append(r);
  });
}

// Player names with the real announcer clips (public/voice, generated by npm run voice).
async function renderNames() {
  const el = document.getElementById('names')!;
  const manifest = await fetch(`${import.meta.env.BASE_URL}voice/manifest.json`).then((r) => r.json());
  const url = (file: string) => `${import.meta.env.BASE_URL}voice/${file}`;
  const sequence = async (file: string, r: HTMLElement) => {
    stopAll();
    const gen = generation;
    r.classList.add('playing');
    for (const [f, style] of [[manifest.lines.top, 'call'], [file, 'name'], [manifest.lines.versus, 'call']] as [string, Style][]) {
      if (gen !== generation) return;
      await playClip(url(f), style, true);
      await sleep(200);
    }
    if (gen === generation) r.classList.remove('playing');
  };
  repoRoster().forEach((p, i) => {
    const file = manifest.names[voiceKey(p.name)];
    const spoken = (file && manifest.texts?.[file]) || '(no clip)';
    const r = row(String(i + 1), p.name, `said as: ${spoken}`);
    if (file) {
      r.querySelector('.actions')!.append(
        button('▶ Name', () => {
          stopAll();
          void playClip(url(file), 'name', true);
        }, true),
        button('▶ In a sentence', () => void sequence(file, r)),
      );
    }
    el.append(r);
  });
}

// Music tracks for the reveal.
TRACKS.forEach((t, i) => {
  const r = row(`T${i + 1}`, t.name, t.description, t.id === 'arena');
  r.querySelector('.actions')!.append(
    button('▶ Play', () => {
      stopAll();
      // Let the previous track fade before the new one starts.
      window.setTimeout(() => {
        setMusicTrack(t.id);
        startMusic();
        r.classList.add('playing');
      }, 350);
    }, true),
  );
  document.getElementById('music')!.append(r);
});

document.getElementById('stop-top')!.addEventListener('click', stopAll);
document.getElementById('stop')!.addEventListener('click', stopAll);
void renderNames();
renderLive();
speechSynthesis.addEventListener('voiceschanged', renderLive);
