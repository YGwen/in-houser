// Score players from League of Legends custom-game replays (.rofl) and suggest 1-5 star ranks.
//
//   npm run score-replays                          -> ~/Documents/League of Legends/Replays
//   npm run score-replays -- "D:/path/to/Replays"
//
// Reads only the end-of-game stats stored at the end of each replay (ROFL2: JSON metadata, its length
// in the last 4 bytes). Each game is compared against everyone else who played the same role, on:
//   fighting:  kill participation, damage/gold share, KDA, deaths, farm, wins
//   map play:  structures (share of team turret damage + turret/inhibitor takedowns: split push, sieging)
//              and objectives (share of team damage to epic monsters + dragon/baron/herald/grub kills,
//              steals count double)
//   utility:   vision score and crowd control on enemy champions
// Players with few games are pulled toward the average. In-game names map to roster names via NAME_MAP.
// Prints a table only; it does not change players.yaml.

import { readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';

/** In-game Riot ID name -> roster name in players.yaml. Add new accounts here. */
const NAME_MAP = {
  'Tsyukomì': 'Tsyuko', toLLL: 'ToLLL', Dydyre: 'Dydyre', momoben: 'Momo', Neoskai: 'Neo', EIyXiiR: 'Ely',
  Azod: 'Azod', Gorhock: 'Gorhok', 'Balwé': 'Balwé', 'Asha real ninja': 'Asha', 'Zeultıma': 'Zeult',
  Dmzqt: 'DMZ', 'Thøgæ': 'Thogae', 'Hide On GROOT': 'Samy', Mofoz: 'Maas', Nayou: 'Shanou',
};
const MIN_GAMES = 3; // fewer games than this: shown, but not trusted
const PRIOR_GAMES = 2; // pull players with few games toward the average

// Weights per role (each row sums to 1). Junglers are judged most on objectives, solo lanes and ADC on
// structures, supports on vision and crowd control; nobody's farm counts for supports.
const WEIGHTS = {
  default: { kp: 0.15, dmg: 0.15, gold: 0.08, kda: 0.12, deaths: 0.08, cs: 0.08, win: 0.08,
             towerDmg: 0.07, takedowns: 0.05, epicDmg: 0.03, epics: 0.02, vision: 0.04, cc: 0.05 },
  JUNGLE: { kp: 0.18, dmg: 0.1, gold: 0.07, kda: 0.1, deaths: 0.08, cs: 0.04, win: 0.08,
            towerDmg: 0.03, takedowns: 0.02, epicDmg: 0.09, epics: 0.08, vision: 0.08, cc: 0.05 },
  UTILITY: { kp: 0.2, dmg: 0.06, gold: 0.03, kda: 0.12, deaths: 0.08, cs: 0, win: 0.08,
             towerDmg: 0.02, takedowns: 0.02, epicDmg: 0.04, epics: 0.03, vision: 0.2, cc: 0.12 },
};
/** Which metrics make up each part of the breakdown shown in the table. */
const GROUPS = {
  fight: ['kp', 'dmg', 'gold', 'kda', 'deaths', 'cs', 'win'],
  map: ['towerDmg', 'takedowns', 'epicDmg', 'epics'],
  utility: ['vision', 'cc'],
};

const dir = process.argv[2] ?? join(homedir(), 'Documents', 'League of Legends', 'Replays');
const num = (v) => Number(v) || 0;

function readReplay(path) {
  const data = readFileSync(path);
  const size = data.readUInt32LE(data.length - 4);
  const meta = JSON.parse(data.subarray(data.length - 4 - size, data.length - 4).toString('utf8'));
  const stats = typeof meta.statsJson === 'string' ? JSON.parse(meta.statsJson) : (meta.statsJson ?? []);
  return { minutes: meta.gameLength / 60000, players: stats };
}

const games = readdirSync(dir)
  .filter((f) => f.toLowerCase().endsWith('.rofl'))
  .map((f) => {
    try {
      return readReplay(join(dir, f));
    } catch {
      console.warn(`skipped ${f} (no readable stats)`);
      return null;
    }
  })
  .filter((g) => g && g.players.length === 10);

const rows = [];
for (const g of games) {
  for (const p of g.players) {
    const mates = g.players.filter((x) => x.TEAM === p.TEAM);
    const sum = (key) => mates.reduce((s, x) => s + num(x[key]), 0) || 1;
    const k = num(p.CHAMPIONS_KILLED), d = num(p.NUM_DEATHS), a = num(p.ASSISTS);
    rows.push({
      name: p.RIOT_ID_GAME_NAME || p.NAME,
      role: p.TEAM_POSITION,
      m: {
        kp: (k + a) / sum('CHAMPIONS_KILLED'),
        dmg: num(p.TOTAL_DAMAGE_DEALT_TO_CHAMPIONS) / sum('TOTAL_DAMAGE_DEALT_TO_CHAMPIONS'),
        gold: num(p.GOLD_EARNED) / sum('GOLD_EARNED'),
        kda: Math.log(1 + (k + a) / Math.max(1, d)),
        deaths: -d / g.minutes,
        cs: (num(p.MINIONS_KILLED) + num(p.NEUTRAL_MINIONS_KILLED)) / g.minutes,
        vision: num(p.VISION_SCORE) / g.minutes,
        win: p.WIN === 'Win' ? 1 : 0,
        // Map play: split pushing / sieging, and objective control.
        towerDmg: num(p.TOTAL_DAMAGE_DEALT_TO_TURRETS) / sum('TOTAL_DAMAGE_DEALT_TO_TURRETS'),
        takedowns: (num(p.TURRET_TAKEDOWNS) + num(p.BARRACKS_TAKEDOWNS)) / g.minutes,
        epicDmg: num(p.TOTAL_DAMAGE_DEALT_TO_EPIC_MONSTERS) / sum('TOTAL_DAMAGE_DEALT_TO_EPIC_MONSTERS'),
        epics:
          (num(p.DRAGON_KILLS) + num(p.BARON_KILLS) + num(p.RIFT_HERALD_KILLS) + num(p.HORDE_KILLS) +
            2 * num(p.OBJECTIVES_STOLEN)) / g.minutes,
        cc: num(p.TIME_CCING_OTHERS) / g.minutes,
      },
    });
  }
}

// z-score every metric within its role, then weight
for (const role of new Set(rows.map((r) => r.role))) {
  const rr = rows.filter((r) => r.role === role);
  for (const key of Object.keys(rr[0].m)) {
    const vals = rr.map((r) => r.m[key]);
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length) || 1;
    for (const r of rr) (r.z ??= {})[key] = (r.m[key] - mean) / sd;
  }
  const w = WEIGHTS[role] ?? WEIGHTS.default;
  for (const r of rr) {
    r.score = Object.entries(w).reduce((s, [key, wt]) => s + wt * r.z[key], 0);
    r.parts = Object.fromEntries(
      Object.entries(GROUPS).map(([group, keys]) => [group, keys.reduce((s, key) => s + (w[key] ?? 0) * r.z[key], 0)]),
    );
  }
}

const byPlayer = {};
for (const r of rows) (byPlayer[r.name] ??= []).push(r);
const table = Object.entries(byPlayer).map(([name, rs]) => ({
  name,
  games: rs.length,
  wins: rs.filter((r) => r.m.win).length,
  score: rs.reduce((s, r) => s + r.score, 0) / (rs.length + PRIOR_GAMES),
  parts: Object.fromEntries(
    Object.keys(GROUPS).map((g) => [g, rs.reduce((s, r) => s + r.parts[g], 0) / (rs.length + PRIOR_GAMES)]),
  ),
}));
const spread = Math.sqrt(table.reduce((s, t) => s + t.score ** 2, 0) / table.length) || 1;
for (const t of table) t.stars = Math.min(5, Math.max(1, Math.round((3 + 1.3 * (t.score / spread)) * 2) / 2));
table.sort((a, b) => b.score - a.score);

const roster = parse(readFileSync(new URL('../players.yaml', import.meta.url), 'utf8')).players;
console.log(`${games.length} games from ${dir}\n`);
console.log('In-game name        Roster    Games  Wins   Score   (fight    map  utility)  Suggested  Current');
for (const t of table) {
  const who = NAME_MAP[t.name] ?? '?';
  const current = roster.find((p) => p.name === who)?.rank ?? '-';
  const note = t.games < MIN_GAMES ? '  (too few games)' : who === '?' ? '  (add to NAME_MAP)' : '';
  console.log(
    `${t.name.padEnd(19)} ${who.padEnd(9)} ${String(t.games).padStart(5)} ${String(t.wins).padStart(5)} ` +
      `${t.score.toFixed(2).padStart(7)}   (${t.parts.fight.toFixed(2).padStart(5)}  ${t.parts.map.toFixed(2).padStart(5)}  ${t.parts.utility.toFixed(2).padStart(6)})` +
      `${String(t.stars).padStart(11)} ${String(current).padStart(8)}${note}`,
  );
}
