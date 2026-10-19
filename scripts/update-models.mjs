// Refresh src/data/championModels.json: for every champion, its in-game 3D model (base skin) and
// texture on CommunityDragon, the community mirror of League's game files used by fan tools.
//
//   npm run models
//
// The reveal renders these models in the browser (src/sprites/championModel.ts); nothing is downloaded
// into the repo. Each folder holds a mesh (.skn) and some textures; the main one is the "_tx_cm" color
// map (names vary a little, e.g. yorick1_base_cm_tx.png).

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const BASE = 'https://raw.communitydragon.org/latest/game/assets/characters/';
const champions = JSON.parse(readFileSync(join(root, 'src/data/champions.json'), 'utf8'));
const list = Array.isArray(champions) ? champions : champions.champions;

async function files(folder) {
  const res = await fetch(`${BASE}${folder}/skins/base/`);
  if (!res.ok) return [];
  const html = await res.text();
  return [...html.matchAll(/href="([^"/?]+\.(?:skn|png))"/g)].map((m) => m[1]);
}

function pick(id, names) {
  const lower = id.toLowerCase();
  const skns = names.filter((n) => n.endsWith('.skn'));
  const skn = skns.find((n) => n === `${lower}.skn`) ?? skns.find((n) => n.startsWith(lower)) ?? skns[0];
  const pngs = names.filter((n) => n.endsWith('.png') && !/loadscreen|cubemap|noise|_gm\b|_gm\.|particle|dead/.test(n));
  const tex =
    pngs.find((n) => n === `${lower}_base_tx_cm.png`) ??
    pngs.find((n) => /_tx_cm\.png$/.test(n) && n.startsWith(lower)) ??
    pngs.find((n) => /(tx_cm|cm_tx)/.test(n)) ??
    pngs[0];
  return skn && tex ? { skn, tex } : null;
}

const out = {};
const missing = [];
const queue = [...list];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      const folder = c.id.toLowerCase();
      const found = pick(c.id, await files(folder));
      if (found) out[c.id] = { folder, ...found };
      else missing.push(c.id);
    }
  }),
);

const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(join(root, 'src/data/championModels.json'), `${JSON.stringify({ base: BASE, models: sorted }, null, 2)}\n`);
console.log(`${Object.keys(sorted).length} models${missing.length ? `; none found for ${missing.sort().join(', ')}` : ''}`);
