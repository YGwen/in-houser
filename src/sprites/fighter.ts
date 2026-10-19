// Pixel-art fighters for the reveal. Each player gets a character generated from their name (so they
// keep the same one every game): skin, hair, outfit and weapon. Poses are drawn from simple parts on a
// small grid facing right, then outlined; the red side mirrors them in CSS.

export const SPRITE_W = 48;
export const SPRITE_H = 32;

export type Weapon = 'sword' | 'axe' | 'staff' | 'spear' | 'fists';
export type HairStyle = 'short' | 'spiky' | 'long' | 'mohawk' | 'ponytail' | 'bald';
export type Pose = 'idle0' | 'idle1' | 'windup' | 'strike' | 'follow' | 'guard' | 'recoil';
export const POSES: Pose[] = ['idle0', 'idle1', 'windup', 'strike', 'follow', 'guard', 'recoil'];

export interface Look {
  skin: string;
  hair: HairStyle;
  hairColor: string;
  outfit: string;
  outfitDark: string;
  pants: string;
  weapon: Weapon;
  beard: boolean;
}

/** Rows of CSS colors (null = transparent), [y][x]. */
export type Pixels = (string | null)[][];

const SKINS = ['#f7d7bd', '#eebb94', '#d09a6c', '#a56a43', '#6e4529'];
const HAIR_COLORS = ['#2a1b12', '#5b3416', '#a0522d', '#e0b04a', '#f2efe6', '#c0392b', '#3f6fd8', '#8e44ad', '#16a085'];
const OUTFITS: [string, string][] = [
  ['#e74c3c', '#962d22'],
  ['#f39c12', '#a8650a'],
  ['#27ae60', '#196f3d'],
  ['#2e86de', '#1b4f8a'],
  ['#8e44ad', '#5b2c6f'],
  ['#ecf0f1', '#9aa5ab'],
  ['#34495e', '#1f2d3a'],
  ['#d35400', '#873600'],
  ['#16a085', '#0e6655'],
  ['#f1c40f', '#9a7d0a'],
];
const PANTS = ['#2c3e50', '#4a3426', '#1d1d2b', '#5d6d7e', '#6e2c00'];
const HAIRS: HairStyle[] = ['short', 'spiky', 'long', 'mohawk', 'ponytail', 'bald'];
const WEAPONS: Weapon[] = ['sword', 'axe', 'staff', 'spear', 'fists'];

const OUTLINE = '#120c18';
const EYE = '#120c18';
const STEEL = '#dfe7ef';
const STEEL_DARK = '#7b8a99';
const WOOD = '#8b5a2b';
const GOLD = '#e0b04a';
const BOOT = '#3b2a20';
const WRAP = '#f2efe6';

/** FNV-1a, then a small PRNG seeded with it: the same name always gives the same character. */
function rngFor(name: string) {
  let h = 0x811c9dc5;
  for (const ch of name.toLowerCase()) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 0x01000193);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function lookFor(name: string): Look {
  const r = rngFor(name);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const [outfit, outfitDark] = pick(OUTFITS);
  return {
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairColor: pick(HAIR_COLORS),
    outfit,
    outfitDark,
    pants: pick(PANTS),
    weapon: pick(WEAPONS),
    beard: r() < 0.25,
  };
}

interface PoseDef {
  dx: number; // body offset (lean)
  dy: number; // body offset (crouch)
  back: [number, number]; // back foot
  front: [number, number]; // front foot
  hand: [number, number]; // front hand (holds the weapon)
  off: [number, number]; // back hand
  angle: number; // weapon angle in degrees: 0 = forward, -90 = up
}

// Base coordinates, before the X0 margin that leaves room for the lunge and the weapon.
const X0 = 8;
const POSE_DEFS: Record<Pose, PoseDef> = {
  idle0: { dx: 0, dy: 1, back: [10, 28], front: [21, 28], hand: [22, 14], off: [11, 16], angle: -55 },
  idle1: { dx: 0, dy: 2, back: [10, 28], front: [21, 28], hand: [22, 15], off: [11, 17], angle: -50 },
  windup: { dx: -2, dy: 2, back: [8, 28], front: [20, 28], hand: [11, 9], off: [8, 15], angle: -140 },
  strike: { dx: 5, dy: 2, back: [7, 28], front: [25, 28], hand: [27, 14], off: [12, 15], angle: 0 },
  follow: { dx: 4, dy: 3, back: [7, 28], front: [24, 28], hand: [26, 19], off: [13, 16], angle: 35 },
  guard: { dx: -1, dy: 2, back: [9, 28], front: [20, 28], hand: [21, 10], off: [20, 15], angle: -92 },
  recoil: { dx: -3, dy: 3, back: [7, 28], front: [18, 28], hand: [19, 11], off: [18, 16], angle: -105 },
};

/** How far the strike reaches (weapon tip, or the fist) and where the guard stands, in sprite pixels. */
const REACH: Record<Weapon, number> = { sword: 11, axe: 9, staff: 8, spear: 13, fists: 1 };
export const strikeTipX = (weapon: Weapon) => X0 + POSE_DEFS.strike.hand[0] + REACH[weapon];
export const GUARD_X = X0 + POSE_DEFS.guard.hand[0] + 1;

/** Draw one pose of a character. `band` is the headband color (the side's color). */
export function drawPose(look: Look, pose: Pose, band: string): Pixels {
  const px: Pixels = Array.from({ length: SPRITE_H }, () => Array<string | null>(SPRITE_W).fill(null));
  const set = (x: number, y: number, c: string) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && x < SPRITE_W && y >= 0 && y < SPRITE_H) px[y][x] = c;
  };
  const rect = (x: number, y: number, w: number, h: number, c: string) => {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, c);
  };
  // Thick line: stamp a square along a Bresenham line.
  const line = (x0: number, y0: number, x1: number, y1: number, c: string, t = 1) => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let s = 0; s <= steps; s++) {
      const x = x0 + ((x1 - x0) * s) / steps;
      const y = y0 + ((y1 - y0) * s) / steps;
      rect(Math.round(x - (t - 1) / 2), Math.round(y - (t - 1) / 2), t, t, c);
    }
  };

  const p = POSE_DEFS[pose];
  const bx = X0 + p.dx;
  const by = p.dy;
  const at = ([x, y]: [number, number]): [number, number] => [X0 + x, y];
  const [hx, hy] = [bx + 12, by + 3]; // head origin
  const hand = at(p.hand);
  const off = at(p.off);
  const fists = look.weapon === 'fists';

  // Back arm and legs, behind the body.
  line(bx + 13, by + 12, off[0], off[1], look.outfitDark, 2);
  rect(off[0] - 1, off[1] - 1, 2, 2, look.skin);
  for (const [hip, foot] of [
    [14, at(p.back)],
    [17, at(p.front)],
  ] as [number, [number, number]][]) {
    line(bx + hip, by + 20, foot[0], foot[1], look.pants, 3);
    rect(foot[0] - 1, 29, 4, 2, BOOT);
  }

  // Torso with a belt and a darker back.
  rect(bx + 13, by + 11, 6, 9, look.outfit);
  rect(bx + 13, by + 11, 1, 9, look.outfitDark);
  rect(bx + 13, by + 18, 6, 1, look.outfitDark);

  // Head, face, hair, headband.
  rect(hx, hy, 8, 8, look.skin);
  set(hx + 4, hy + 3, EYE);
  set(hx + 6, hy + 3, EYE);
  if (look.beard) rect(hx + 2, hy + 6, 6, 2, look.hairColor);
  const hc = look.hairColor;
  const cap = () => {
    rect(hx, hy - 1, 8, 2, hc);
    rect(hx, hy + 1, 2, 3, hc);
  };
  switch (look.hair) {
    case 'short':
      cap();
      break;
    case 'spiky':
      cap();
      for (const x of [1, 3, 5, 7]) set(hx + x, hy - 2, hc);
      set(hx + 3, hy - 3, hc);
      set(hx + 6, hy - 3, hc);
      break;
    case 'long':
      cap();
      rect(hx - 1, hy, 3, 10, hc);
      break;
    case 'mohawk':
      rect(hx + 2, hy - 3, 3, 4, hc);
      break;
    case 'ponytail':
      cap();
      line(hx - 1, hy + 2, hx - 4, hy + 8, hc, 2);
      break;
    case 'bald':
      break;
  }
  rect(hx, hy + 2, 8, 1, band);
  set(hx - 1, hy + 2, band);
  set(hx - 2, hy + 3, band);
  set(hx - 3, hy + 3, band);

  // Front arm, then the weapon in front of everything.
  line(bx + 18, by + 12, hand[0], hand[1], look.outfit, 2);
  const a = (p.angle * Math.PI) / 180;
  const [ux, uy] = [Math.cos(a), Math.sin(a)];
  const along = (d: number): [number, number] => [hand[0] + ux * d, hand[1] + uy * d];
  switch (look.weapon) {
    case 'sword': {
      line(...along(-2), ...along(0), WOOD);
      line(...along(1), ...along(11), STEEL);
      set(...along(11), STEEL_DARK); // tip
      const g = along(1);
      line(g[0] - uy * 2, g[1] + ux * 2, g[0] + uy * 2, g[1] - ux * 2, GOLD);
      break;
    }
    case 'axe': {
      line(...along(-3), ...along(9), WOOD);
      const h = along(8);
      for (let d = -1; d <= 1; d++) line(h[0] + ux * d, h[1] + uy * d, h[0] + ux * d - uy * 3, h[1] + uy * d + ux * 3, STEEL);
      break;
    }
    case 'staff':
      line(...along(-8), ...along(8), WOOD);
      line(...along(7), ...along(8), GOLD);
      break;
    case 'spear':
      line(...along(-6), ...along(9), WOOD);
      line(...along(10), ...along(13), STEEL);
      break;
    case 'fists':
      break;
  }
  rect(hand[0] - 1, hand[1] - 1, fists ? 3 : 2, fists ? 3 : 2, look.skin);
  if (fists) rect(hand[0] - 1, hand[1] + 1, 3, 1, WRAP);

  // One-pixel dark outline around the silhouette.
  const filled = px.map((row) => row.map((c) => c !== null));
  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      if (filled[y][x]) continue;
      if (filled[y - 1]?.[x] || filled[y + 1]?.[x] || filled[y][x - 1] || filled[y][x + 1]) px[y][x] = OUTLINE;
    }
  }
  return px;
}
