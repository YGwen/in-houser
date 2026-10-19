// Generate announcer voice clips with Piper (local neural text-to-speech).
//
//   npm run voice                 -> uses ./players.yaml, only generates missing or changed clips
//   npm run voice -- --all        -> regenerate every clip
//   npm run voice -- path/to.yaml
//
// Writes public/voice/{lines,names}/*.wav and public/voice/manifest.json, which the reveal plays
// (with echo and grit added live). Players without a clip fall back to the browser voice.
// Optional per player in the YAML:  say: "how to pronounce the name"
//
// Existing clips are kept by default: Piper output varies slightly between runs, so regenerating
// would change voices you already approved. A clip is redone when its text changes (e.g. a new `say:`).

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const regenerateAll = args.includes('--all');
const playersPath = resolve(args.find((a) => !a.startsWith('--')) ?? join(root, 'players.yaml'));
const venv = join(root, '.venv-voice');
const python = join(venv, process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
// Announcer voice, picked in the voice lab (F3). Override with VOICE_MODEL=path/to/voice.onnx.
const model = process.env.VOICE_MODEL ?? join(venv, 'voices', 'en_US-hfc_female-medium.onnx');
const outDir = join(root, 'public', 'voice');

for (const [what, path] of [
  ['players file', playersPath],
  ['Piper (.venv-voice)', python],
  ['voice model', model],
]) {
  if (!existsSync(path)) {
    console.error(`Missing ${what}: ${path}`);
    process.exit(1);
  }
}

// Keep in sync with the lanes in src/components/RevealScreen.tsx.
const LINES = [
  ['top', 'Top lane!', 'call'],
  ['jungle', 'Jungle!', 'call'],
  ['mid', 'Mid lane!', 'call'],
  // Hyphens make Piper spell it in one go ("A D C" reads the A as "uh", "A. D. C." is choppy).
  ['adc', 'Bot lane. A-D-C!', 'call'],
  ['support', 'Bot lane. Support!', 'call'],
  ['versus', 'Versus!', 'call'],
  ['duel', 'Duel!', 'hype'],
  ['fight', 'Fight!', 'hype'],
];

/** Same cleanup as the browser fallback: drop Riot tags (#EUW), read separators as pauses. */
const spokenName = (name) => `${name.split('#')[0].replace(/[_\-.|~*]+/g, ' ').trim() || name}!`;
// Must match voiceKey() in src/audio/announcer.ts.
const nameKey = (name) => name.trim().toLowerCase();
const slug = (name) => {
  const base = nameKey(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'player';
  return `${base}-${createHash('sha1').update(nameKey(name)).digest('hex').slice(0, 6)}`;
};

const doc = parse(readFileSync(playersPath, 'utf8'));
const players = (Array.isArray(doc) ? doc : doc?.players) ?? [];
const names = players.filter((p) => p && p.name != null).map((p) => ({ name: String(p.name), say: p.say }));
if (!names.length) {
  console.error(`No players found in ${playersPath}`);
  process.exit(1);
}

const items = [
  ...LINES.map(([id, text, style]) => ({ file: `lines/${id}.wav`, text, style })),
  ...names.map(({ name, say }) => ({ file: `names/${slug(name)}.wav`, text: say ? `${say}!` : spokenName(name), style: 'name' })),
];

const manifestPath = join(outDir, 'manifest.json');
const previous = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
const previousTexts = previous.texts ?? {};

// Keep a clip when it exists and its text is unchanged (clips from before texts were recorded are kept too).
const isUpToDate = (item) =>
  existsSync(join(outDir, item.file)) && (previousTexts[item.file] ?? item.text) === item.text;
const todo = regenerateAll ? items : items.filter((item) => !isUpToDate(item));

mkdirSync(outDir, { recursive: true });
if (todo.length) {
  console.log(`Generating ${todo.length} of ${items.length} clips with ${model.split(/[\\/]/).pop()}...`);
  const run = spawnSync(python, [join(root, 'scripts', 'piper_batch.py'), '--model', model, '--out', outDir], {
    input: JSON.stringify(todo),
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  if (run.status !== 0) process.exit(run.status ?? 1);
} else {
  console.log('All clips are up to date (use --all to regenerate everything).');
}

// Remove clips of players that are no longer in the YAML.
const wanted = new Set(items.map((item) => item.file));
for (const dir of ['lines', 'names']) {
  const path = join(outDir, dir);
  if (!existsSync(path)) continue;
  for (const file of readdirSync(path)) {
    if (!wanted.has(`${dir}/${file}`)) {
      rmSync(join(path, file));
      console.log(`  removed ${dir}/${file}`);
    }
  }
}

const manifest = {
  voice: model.split(/[\\/]/).pop().replace(/\.onnx$/, ''),
  lines: Object.fromEntries(LINES.map(([id]) => [id, `lines/${id}.wav`])),
  names: Object.fromEntries(names.map(({ name }) => [nameKey(name), `names/${slug(name)}.wav`])),
  texts: Object.fromEntries(items.map((item) => [item.file, item.text])),
};
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Done: ${names.length} player names + ${LINES.length} lines in public/voice/`);
