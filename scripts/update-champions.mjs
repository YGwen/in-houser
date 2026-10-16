// Refresh src/data/champions.json: every released champion with the lanes it is played in.
//
//   npm run champions
//
// Lanes come from the League of Legends Wiki champion data (CC BY-SA): the positions Riot's client
// recommends ("client_positions"), so a random pick always fits the role in the usual sense. Stats-site
// positions ("external_positions") include niche off-role picks (e.g. Camille support), so they are only
// a fallback for a champion without client positions. Names, ids and portraits come from Riot's Data Dragon.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WIKI = 'https://wiki.leagueoflegends.com/en-us/Module:ChampionData/data?action=raw';
const DDRAGON = 'https://ddragon.leagueoflegends.com';
const LANES = { Top: 'top', Jungle: 'jungle', Middle: 'mid', Bottom: 'adc', Support: 'support' };

async function get(url, as = 'json') {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return as === 'json' ? res.json() : res.text();
}

const list = (block, key) => {
  const m = block.match(new RegExp(`\\["${key}"\\]\\s*=\\s*\\{([^}]*)\\}`));
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : [];
};

const [version] = await get(`${DDRAGON}/api/versions.json`);
const dd = (await get(`${DDRAGON}/cdn/${version}/data/en_US/champion.json`)).data;
const wiki = await get(WIKI, 'text');

// Top-level entries look like:   ["Ahri"] = { ... ["apiname"] = "Ahri", ... ["external_positions"] = {"Middle"}, ... },
// Each entry runs until the next one starts (indentation inside entries isn't consistent).
const starts = [...wiki.matchAll(/^ {2}\["([^"]+)"\] = \{/gm)];
const entries = starts.map((m, i) => [m[1], wiki.slice(m.index, starts[i + 1]?.index ?? wiki.length)]);
const positions = new Map();
for (const [name, block] of entries) {
  const api = block.match(/\["apiname"\]\s*=\s*"([^"]+)"/)?.[1] ?? name;
  const lanes = list(block, 'client_positions');
  const fallback = list(block, 'external_positions');
  positions.set(api.toLowerCase(), (lanes.length ? lanes : fallback).map((p) => LANES[p]).filter(Boolean));
  positions.set(name.toLowerCase(), positions.get(api.toLowerCase()));
}

const champions = [];
const missing = [];
for (const c of Object.values(dd)) {
  const roles = positions.get(c.id.toLowerCase()) ?? positions.get(c.name.toLowerCase()) ?? [];
  if (!roles.length) missing.push(c.name);
  champions.push({ id: c.id, name: c.name, roles: [...new Set(roles)] });
}
champions.sort((a, b) => a.name.localeCompare(b.name));

const out = join(root, 'src', 'data', 'champions.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ ddragonVersion: version, champions }, null, 1) + '\n');

const perRole = Object.fromEntries(Object.values(LANES).map((r) => [r, champions.filter((c) => c.roles.includes(r)).length]));
console.log(`Data Dragon ${version}: ${champions.length} champions written to src/data/champions.json`);
console.log('Champions per role:', perRole);
if (missing.length) console.warn(`No lane data (never picked randomly): ${missing.join(', ')}`);
