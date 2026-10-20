// Render each player's main as a cartoon pixel-art sprite sheet (an idle loop, then the taunt) from the
// game's own model and animations, for the reveal. Needs a local League of Legends install:
//
//   npm run fighters -- "D:\Riot\Riot Games\League of Legends"          (every main in players.yaml)
//   npm run fighters -- "D:\Riot\Riot Games\League of Legends" Leona     (only these champions)
//
// The skeleton, mesh and animations come from the install's champion archive (.wad.client); the skin
// definition and textures from CommunityDragon. Each frame is posed on the CPU, drawn by a small
// cel-shading rasterizer with ink lines (scripts/lib/raster.mjs), then the whole sheet is reduced to one
// small SNES palette with a dark outline. Output: public/fighters/<Champion>.png (frames side by side)
// and src/data/fighterSheets.json (each sheet's frame size, and where the W x H body box sits in it).
// Only these pixel renders are committed, never the game files.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { quantize } from '../src/sprites/championArt.ts';
import { parseSkn } from '../src/sprites/skn.ts';
import { parseAnm, parseSkl, poseMatrices, skin } from './lib/animation.mjs';
import { decodePng, encodeIndexedPng } from './lib/png.mjs';
import { renderSprite, toView } from './lib/raster.mjs';
import { openWad } from './lib/wad.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CD = 'https://raw.communitydragon.org/latest/game/';
export const W = 128;
export const H = 168;
const FPS = 12;
const IDLE_MAX = 3; // seconds of idle loop
const TAUNT_MAX = 3.5; // seconds of taunt
const YAW = (40 * Math.PI) / 180; // three-quarters, facing right
const PITCH = (8 * Math.PI) / 180; // seen slightly from above

const [install = process.env.LOL_PATH, ...only] = process.argv.slice(2);
if (!install) {
  console.error('Usage: npm run fighters -- "<League of Legends install folder>" [Champion ...]');
  process.exit(1);
}
const champDir = [join(install, 'Game/DATA/FINAL/Champions'), join(install, 'DATA/FINAL/Champions'), install].find((d) =>
  existsSync(join(d, 'Leona.wad.client')),
);
if (!champDir) throw new Error(`No champion archives found under ${install}`);

const mains = only.length
  ? only
  : [...new Set(parse(readFileSync(join(root, 'players.yaml'), 'utf8')).players.map((p) => p.main).filter(Boolean))];

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return res.json();
}

/** Every value of `key` anywhere in a parsed .bin JSON. */
function findAll(node, key, out = []) {
  if (Array.isArray(node)) node.forEach((n) => findAll(n, key, out));
  else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) {
      if (k === key) out.push(v);
      findAll(v, key, out);
    }
  }
  return out;
}

const textures = new Map();
async function texture(path) {
  const url = `${CD}${path.toLowerCase().replace(/\.(tex|dds)$/, '.png')}`;
  if (!textures.has(url)) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} for ${url}`);
    textures.set(url, decodePng(Buffer.from(await res.arrayBuffer())));
  }
  return textures.get(url);
}

const pick = (paths, ...patterns) => {
  for (const re of patterns) {
    const p = paths.find((x) => re.test(x.split('/').pop()));
    if (p) return p;
  }
  return null;
};

async function renderChampion(id) {
  const folder = id.toLowerCase();
  const wadName = readdirSync(champDir).find((f) => f.toLowerCase() === `${folder}.wad.client`);
  if (!wadName) throw new Error('no archive');
  const skinDef = await json(`${CD}data/characters/${folder}/skins/skin0.bin.json`);
  const props = findAll(skinDef, 'skinMeshProperties')[0] ?? skinDef;
  const [sklPath] = findAll(props, 'skeleton');
  const [sknPath] = findAll(props, 'simpleSkin');
  const [texPath] = findAll(props, 'texture');
  const overrides = findAll(skinDef, 'materialOverride').flat().filter((o) => o?.submesh && o?.texture);
  const hidden = new Set(
    findAll(skinDef, 'initialSubmeshToHide')
      .flatMap((s) => String(s).split(/[\s,;]+/))
      .map((s) => s.toLowerCase())
      .filter(Boolean),
  );
  const clips = [...new Set(findAll(await json(`${CD}data/characters/${folder}/animations/skin0.bin.json`), 'mAnimationFilePath'))];
  const idlePath = pick(clips, /_idle1(_\w+)?\.anm$/i, /^(?!.*(spell|turn|_in|_out)).*idle.*\.anm$/i);
  const tauntPath = pick(clips, /taunt.*\.anm$/i, /joke.*\.anm$/i, /laugh.*\.anm$/i);
  if (!sklPath || !sknPath || !texPath || !idlePath || !tauntPath) throw new Error('missing skeleton, mesh, texture or clips');

  const wad = openWad(join(champDir, wadName));
  try {
    const read = (p) => {
      const b = wad.read(p);
      if (!b) throw new Error(`${p} not in archive`);
      return b;
    };
    const sknBuf = read(sknPath);
    const mesh = parseSkn(sknBuf.buffer.slice(sknBuf.byteOffset, sknBuf.byteOffset + sknBuf.length));
    const skl = parseSkl(read(sklPath));
    const idle = parseAnm(read(idlePath));
    const taunt = parseAnm(read(tauntPath));

    const parts = [];
    for (const sub of mesh.submeshes) {
      if (hidden.has(sub.name.toLowerCase())) continue;
      const o = overrides.find((x) => x.submesh.toLowerCase() === sub.name.toLowerCase());
      parts.push({ start: sub.startIndex, count: sub.indexCount, texture: await texture(o?.texture ?? texPath) });
    }

    const times = (anim, max) => Array.from({ length: Math.max(1, Math.round(Math.min(anim.duration, max) * FPS)) }, (_, i) => i / FPS);
    const frames = [...times(idle, IDLE_MAX).map((t) => [idle, t]), ...times(taunt, TAUNT_MAX).map((t) => [taunt, t])];
    const posed = frames.map(([anim, t]) => skin(mesh, skl, poseMatrices(skl, anim, t)));

    // Scale: the body at rest (union of the idle frames' body boxes, from vertex percentiles so a few
    // far-off vertices don't shrink everyone) fills a W x H box. Every sheet uses that scale, so all
    // fighters look the same size.
    const view = toView(YAW, PITCH);
    const used = new Set();
    for (const p of parts) for (let i = p.start; i < p.start + p.count; i++) used.add(mesh.indices[i]);
    const box = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    const all = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity };
    const idleCount = times(idle, IDLE_MAX).length;
    posed.forEach(({ positions }, f) => {
      const xs = [];
      const ys = [];
      for (const v of used) {
        const [x, y] = view(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]);
        xs.push(x);
        ys.push(y);
      }
      xs.sort((a, b) => a - b);
      ys.sort((a, b) => a - b);
      const q = (arr, f) => arr[Math.min(arr.length - 1, Math.floor(f * arr.length))];
      if (f < idleCount) {
        box.x0 = Math.min(box.x0, q(xs, 0.02));
        box.x1 = Math.max(box.x1, q(xs, 0.98));
        box.y0 = Math.min(box.y0, q(ys, 0.005));
        box.y1 = Math.max(box.y1, q(ys, 0.995));
      }
      all.x0 = Math.min(all.x0, xs[0]);
      all.x1 = Math.max(all.x1, xs[xs.length - 1]);
      all.y0 = Math.min(all.y0, ys[0]);
      all.y1 = Math.max(all.y1, ys[ys.length - 1]);
    });
    const aspect = W / H;
    const h = Math.max(box.y1 - box.y0, (box.x1 - box.x0) / aspect) * 1.08;
    const w = h * aspect;
    const cx = (box.x0 + box.x1) / 2;
    const body = { x0: cx - w / 2, x1: cx + w / 2, y0: box.y0 - h * 0.03, y1: box.y0 - h * 0.03 + h };
    const k = W / w; // pixels per model unit

    // Canvas: big enough for every frame (jumps, side steps, thrown props), so nothing is cropped. The
    // reveal lets it spill past the fighter's box. Far-flung extremes are capped to keep sheets small.
    const ext = {
      x0: Math.max(Math.min(all.x0, body.x0), body.x0 - w * 2),
      x1: Math.min(Math.max(all.x1, body.x1), body.x1 + w * 2),
      y0: Math.max(Math.min(all.y0, body.y0), body.y0 - h * 0.6),
      y1: Math.min(Math.max(all.y1, body.y1), body.y1 + h * 3),
    };
    const MARGIN = 2; // pixels, room for the outline
    const left = Math.ceil((body.x0 - ext.x0) * k) + MARGIN; // where the body box sits in the canvas
    const top = Math.ceil((ext.y1 - body.y1) * k) + MARGIN;
    const fw = left + Math.ceil((ext.x1 - body.x0) * k) + MARGIN;
    const fh = top + Math.ceil((body.y1 - ext.y0) * k) + MARGIN;
    const frame = { x0: body.x0 - left / k, x1: body.x0 - left / k + fw / k, y1: body.y1 + top / k, y0: body.y1 + top / k - fh / k };

    const sheetW = fw * frames.length;
    const sheet = new Uint8ClampedArray(sheetW * fh * 4);
    posed.forEach(({ positions, normals }, f) => {
      const px = renderSprite({ positions, normals, uvs: mesh.uvs, indices: mesh.indices, parts, yaw: YAW, pitch: PITCH, frame, w: fw, h: fh });
      for (let y = 0; y < fh; y++) sheet.set(px.subarray(y * fw * 4, (y + 1) * fw * 4), (y * sheetW + f * fw) * 4);
    });
    quantize(sheet, { k: 28, width: sheetW, alpha: true });
    mkdirSync(join(root, 'public/fighters'), { recursive: true });
    writeFileSync(join(root, `public/fighters/${id}.png`), encodeIndexedPng(sheetW, fh, sheet));
    // Frame size, and where the W x H body box sits in it.
    return { idle: idleCount, taunt: times(taunt, TAUNT_MAX).length, w: fw, h: fh, x: left, y: top };
  } finally {
    wad.close();
  }
}

const metaFile = join(root, 'src/data/fighterSheets.json');
const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : { w: W, h: H, fps: FPS, sheets: {} };
Object.assign(meta, { w: W, h: H, fps: FPS });
for (const id of mains) {
  const t = Date.now();
  try {
    meta.sheets[id] = await renderChampion(id);
    console.log(`${id}: ${meta.sheets[id].idle} idle + ${meta.sheets[id].taunt} taunt frames (${((Date.now() - t) / 1000).toFixed(1)} s)`);
  } catch (e) {
    console.warn(`${id}: skipped (${e.message})`);
  }
}
meta.sheets = Object.fromEntries(Object.entries(meta.sheets).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`);
