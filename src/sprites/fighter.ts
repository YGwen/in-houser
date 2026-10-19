// Pixel-art fighters for the reveal, in a 16-bit fighting-game style. A player whose favourite
// champion (players.yaml `main:`) has a costume below gets a stylized version of it, signature weapon
// included; everyone else gets a martial artist generated from their name, so they keep the same one
// every game. Poses are drawn from a skeleton with 3-tone shading, then outlined. Sprites face right;
// the red side mirrors them in CSS.

export const SPRITE_W = 80;
export const SPRITE_H = 56;

export type Pose = 'idle0' | 'idle1' | 'windup' | 'strike' | 'follow' | 'guard' | 'recoil';
export const POSES: Pose[] = ['idle0', 'idle1', 'windup', 'strike', 'follow', 'guard', 'recoil'];

type Pt = [number, number];
type HairStyle = 'short' | 'spiky' | 'long' | 'mohawk' | 'ponytail' | 'bald' | 'bob' | 'swept' | 'braids';
type HeadGear = 'headband' | 'helmet-sun' | 'hood' | 'tricorn' | 'glasses' | 'mask-horns' | 'maw';
type Weapon = 'none' | 'sword-shield' | 'katana' | 'pistols' | 'minigun' | 'orb' | 'claws' | 'void';

export interface Costume {
  build: 'normal' | 'big';
  skin: string;
  hair: HairStyle;
  hairColor: string;
  /** Glowing eyes instead of normal ones. */
  eyes?: string;
  top: string;
  /** Shirt or skin showing at the neckline. */
  chest?: string;
  belt?: string;
  sleeves: 'full' | 'half' | 'none';
  sleeveColor?: string;
  pants: string;
  boots: string;
  /** Gloves or wraps (default: bare hands). */
  hands?: string;
  /** Tabard, dress, robe or coat tails (`back`: behind the legs only). */
  skirt?: { color: string; length: number; flare: number; back?: boolean };
  pauldron?: string;
  spikes?: string;
  gear: HeadGear[];
  weapon: Weapon;
  /** Magic color: glowing hands, muzzle flashes, energy bursts. */
  glow?: string;
  attack: 'punch' | 'kick';
}

/** Stylized champions, by champion id (as in players.yaml `main:`). */
export const CHAMPION_COSTUMES: Record<string, Costume> = {
  Leona: {
    build: 'normal',
    skin: '#f1c9a5',
    hair: 'long',
    hairColor: '#a5452a',
    top: '#e8b84a',
    chest: '#fff1c1',
    belt: '#c0392b',
    sleeves: 'full',
    sleeveColor: '#d4a03a',
    pants: '#c08a2e',
    boots: '#8a5a1a',
    hands: '#e8b84a',
    skirt: { color: '#c0392b', length: 9, flare: 3 },
    pauldron: '#f5d36b',
    gear: ['helmet-sun'],
    weapon: 'sword-shield',
    glow: '#ffd84a',
    attack: 'punch',
  },
  Malzahar: {
    build: 'normal',
    skin: '#a77f6a',
    hair: 'bald',
    hairColor: '#2a1540',
    eyes: '#e07cff',
    top: '#4b2a6b',
    chest: '#e0b04a',
    belt: '#e0b04a',
    sleeves: 'full',
    sleeveColor: '#5c3480',
    pants: '#3a1f55',
    boots: '#2a1540',
    skirt: { color: '#4b2a6b', length: 18, flare: 6 },
    gear: ['hood'],
    weapon: 'void',
    glow: '#c45cff',
    attack: 'punch',
  },
  Jinx: {
    build: 'normal',
    skin: '#f3dcd0',
    hair: 'braids',
    hairColor: '#3f8fe8',
    top: '#2b2233',
    chest: '#f3dcd0',
    belt: '#c0392b',
    sleeves: 'none',
    pants: '#7a4bb0',
    boots: '#2b2233',
    gear: [],
    weapon: 'minigun',
    glow: '#ff5fa2',
    attack: 'punch',
  },
  Yone: {
    build: 'normal',
    skin: '#e2b48c',
    hair: 'ponytail',
    hairColor: '#1f1a24',
    top: '#2a2f4a',
    chest: '#e9e2d0',
    belt: '#c0392b',
    sleeves: 'full',
    pants: '#3a3f5c',
    boots: '#1f1a24',
    gear: ['mask-horns'],
    weapon: 'katana',
    glow: '#6fd3ff',
    attack: 'punch',
  },
  MissFortune: {
    build: 'normal',
    skin: '#f3cfb0',
    hair: 'long',
    hairColor: '#c0392b',
    top: '#7a1f2b',
    chest: '#f2efe6',
    belt: '#e0b04a',
    sleeves: 'full',
    pants: '#3a2a24',
    boots: '#2a1a14',
    hands: '#3a2a24',
    skirt: { color: '#7a1f2b', length: 14, flare: 4, back: true },
    gear: ['tricorn'],
    weapon: 'pistols',
    glow: '#ffd84a',
    attack: 'punch',
  },
  Chogath: {
    build: 'big',
    skin: '#6c5a8e',
    hair: 'bald',
    hairColor: '#4a3c66',
    eyes: '#d4ff4a',
    top: '#6c5a8e',
    chest: '#4a3c66',
    sleeves: 'none',
    pants: '#5a4a78',
    boots: '#3a2e52',
    spikes: '#c9a8ff',
    gear: ['maw'],
    weapon: 'claws',
    glow: '#b4ff4a',
    attack: 'punch',
  },
  Orianna: {
    build: 'normal',
    skin: '#efe7dc',
    hair: 'bob',
    hairColor: '#2a2230',
    eyes: '#5fd8ff',
    top: '#d9b45a',
    chest: '#f4f1ea',
    belt: '#5fd8ff',
    sleeves: 'full',
    sleeveColor: '#c9a24a',
    pants: '#bfb6a6',
    boots: '#8a7a5a',
    hands: '#bfb6a6',
    skirt: { color: '#f4f1ea', length: 8, flare: 4 },
    gear: [],
    weapon: 'orb',
    glow: '#5fd8ff',
    attack: 'punch',
  },
  Locke: {
    build: 'normal',
    skin: '#f2d2b6',
    hair: 'swept',
    hairColor: '#f0d27a',
    top: '#2a2236',
    chest: '#c9b8e8',
    belt: '#1a1424',
    sleeves: 'full',
    pants: '#3a3250',
    boots: '#1a1424',
    gear: ['glasses'],
    weapon: 'none',
    glow: '#b45cff',
    attack: 'punch',
  },
};

const SKINS = ['#f7d7bd', '#eebb94', '#d09a6c', '#a56a43', '#6e4529'];
const HAIR_COLORS = ['#2a1b12', '#5b3416', '#a0522d', '#e0b04a', '#f2efe6', '#c0392b', '#3f6fd8', '#8e44ad', '#16a085'];
const GI_COLORS = ['#f2efe6', '#e74c3c', '#f39c12', '#27ae60', '#2e86de', '#8e44ad', '#34495e', '#d35400', '#16a085', '#f1c40f'];
const PANTS = ['#2c3e50', '#4a3426', '#1d1d2b', '#5d6d7e', '#6e2c00', '#f2efe6'];
const BELTS = ['#1a1424', '#c0392b', '#2e86de', '#e0b04a'];
const HAIRS: HairStyle[] = ['short', 'spiky', 'long', 'mohawk', 'ponytail', 'bald', 'bob', 'swept'];

/** FNV-1a, then a small PRNG seeded with it: the same name always gives the same fighter. */
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

/** The player's fighter: their main's costume if there is one, else a martial artist from their name. */
export function costumeFor(name: string, main?: string): Costume {
  if (main && CHAMPION_COSTUMES[main]) return CHAMPION_COSTUMES[main];
  const r = rngFor(name);
  const pick = <T>(xs: T[]) => xs[Math.floor(r() * xs.length)];
  const top = pick(GI_COLORS);
  const bare = r() < 0.3; // tank top instead of a gi
  return {
    build: r() < 0.2 ? 'big' : 'normal',
    skin: pick(SKINS),
    hair: pick(HAIRS),
    hairColor: pick(HAIR_COLORS),
    top,
    chest: bare ? undefined : pick(SKINS),
    belt: pick(BELTS),
    sleeves: bare ? 'none' : 'half',
    pants: bare ? pick(PANTS) : top,
    boots: '#3b2a20',
    hands: '#f2efe6',
    gear: ['headband'],
    weapon: 'none',
    attack: r() < 0.5 ? 'punch' : 'kick',
  };
}

// ---- Colors ----------------------------------------------------------------------------------------

const OUTLINE = '#120c18';
const EYE = '#120c18';

function mix(hex: string, to: string, f: number) {
  const a = parseInt(hex.slice(1), 16);
  const b = parseInt(to.slice(1), 16);
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - f) + ((b >> s) & 255) * f);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
const dark = (c: string) => mix(c, '#000000', 0.32);
const light = (c: string) => mix(c, '#ffffff', 0.35);

// ---- Poses -----------------------------------------------------------------------------------------

interface PoseDef {
  dx: number; // body lean
  dy: number; // crouch
  fE: Pt; // front elbow / hand (the hand that strikes and holds the weapon)
  fH: Pt;
  bE: Pt; // back elbow / hand
  bH: Pt;
  fK: Pt; // front knee / foot
  fF: Pt;
  bK: Pt; // back knee / foot
  bF: Pt;
  angle: number; // blade angle in degrees (0 = forward, -90 = up)
  aim: number; // gun / orb angle
}

// Base coordinates (facing right); X0 leaves room behind for the wind-up.
const X0 = 6;
const PUNCH: Record<Pose, PoseDef> = {
  idle0: { dx: 0, dy: 0, fE: [39, 27], fH: [41, 21], bE: [29, 28], bH: [35, 24], fK: [36, 43], fF: [39, 52], bK: [25, 43], bF: [21, 52], angle: -55, aim: -10 },
  idle1: { dx: 0, dy: 1, fE: [39, 28], fH: [41, 22], bE: [29, 29], bH: [35, 25], fK: [36, 44], fF: [39, 52], bK: [25, 44], bF: [21, 52], angle: -50, aim: -8 },
  windup: { dx: -3, dy: 1, fE: [28, 28], fH: [25, 22], bE: [35, 27], bH: [39, 22], fK: [34, 43], fF: [38, 52], bK: [22, 44], bF: [17, 52], angle: -150, aim: -35 },
  strike: { dx: 6, dy: 1, fE: [46, 22], fH: [52, 21], bE: [33, 28], bH: [36, 25], fK: [44, 42], fF: [49, 52], bK: [27, 44], bF: [19, 52], angle: 0, aim: 0 },
  follow: { dx: 5, dy: 2, fE: [44, 25], fH: [50, 27], bE: [32, 29], bH: [36, 26], fK: [43, 43], fF: [48, 52], bK: [26, 45], bF: [18, 52], angle: 30, aim: 6 },
  guard: { dx: -1, dy: 1, fE: [37, 29], fH: [38, 18], bE: [35, 31], bH: [40, 21], fK: [35, 43], fF: [38, 52], bK: [24, 43], bF: [20, 52], angle: -95, aim: -70 },
  recoil: { dx: -4, dy: 2, fE: [33, 30], fH: [34, 19], bE: [31, 32], bH: [36, 22], fK: [31, 44], fF: [34, 52], bK: [20, 44], bF: [15, 52], angle: -105, aim: -80 },
};
// Kickers chamber the front leg, then snap a high kick; the hands stay up in guard.
const KICK: Record<Pose, PoseDef> = {
  ...PUNCH,
  windup: { ...PUNCH.idle0, dx: -2, fK: [38, 37], fF: [36, 46], bK: [26, 43], bF: [23, 52] },
  strike: { ...PUNCH.idle0, dx: -2, fE: [36, 28], fH: [38, 23], bE: [27, 27], bH: [31, 24], fK: [41, 31], fF: [51, 27], bK: [27, 43], bF: [25, 52] },
  follow: { ...PUNCH.idle0, dx: 0, dy: 1, fE: [36, 28], fH: [38, 23], bE: [27, 27], bH: [31, 24], fK: [40, 38], fF: [46, 44], bK: [26, 43], bF: [23, 52] },
};

// ---- Drawing ---------------------------------------------------------------------------------------

/** Rows of CSS colors (null = transparent), [y][x]. */
export type Pixels = (string | null)[][];

class Grid {
  px: Pixels = Array.from({ length: SPRITE_H }, () => Array<string | null>(SPRITE_W).fill(null));
  set(x: number, y: number, c: string) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && x < SPRITE_W && y >= 0 && y < SPRITE_H) this.px[y][x] = c;
  }
  rect(x: number, y: number, w: number, h: number, c: string) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }
  /** Line of square stamps; `anchor`/`ox`/`oy` place a smaller stamp inside a bigger one (shading). */
  line(a: Pt, b: Pt, c: string, t = 1, anchor = t, ox = 0, oy = 0) {
    const steps = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
    for (let s = 0; s <= steps; s++) {
      const x = a[0] + ((b[0] - a[0]) * s) / steps;
      const y = a[1] + ((b[1] - a[1]) * s) / steps;
      this.rect(Math.round(x - (anchor - 1) / 2) + ox, Math.round(y - (anchor - 1) / 2) + oy, t, t, c);
    }
  }
  /** Limb with a dark back/bottom rim and a light top-front edge (light comes from the front). */
  limb(a: Pt, b: Pt, c: string, t: number) {
    this.line(a, b, dark(c), t);
    this.line(a, b, c, t - 1, t, 1, 0);
    this.line(a, b, light(c), 1, t, t - 1, 0);
  }
  disc(cx: number, cy: number, r: number, c: string) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.set(cx + x, cy + y, c);
  }
  /** Filled trapezoid between two horizontal edges. */
  trap(y0: number, y1: number, l0: number, r0: number, l1: number, r1: number, c: string) {
    for (let y = y0; y <= y1; y++) {
      const t = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
      const l = Math.round(l0 + (l1 - l0) * t);
      const r = Math.round(r0 + (r1 - r0) * t);
      for (let x = l; x <= r; x++) this.set(x, y, c);
    }
  }
}

const add = (p: Pt, dx: number, dy: number): Pt => [p[0] + dx, p[1] + dy];
const dir = (deg: number): Pt => [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
const along = (p: Pt, d: Pt, k: number): Pt => [p[0] + d[0] * k, p[1] + d[1] * k];

/** Draw one pose of a fighter. `band` colors the headband of generated fighters (the side's color). */
export function drawPose(c: Costume, pose: Pose, band: string): Pixels {
  const g = new Grid();
  const p = (c.attack === 'kick' ? KICK : PUNCH)[pose];
  const big = c.build === 'big' ? 1 : 0;
  const at = (q: Pt): Pt => [X0 + q[0], q[1]];
  const bx = X0 + p.dx;
  const by = p.dy;
  const sF: Pt = [bx + 34 + big, by + 21];
  const sB: Pt = [bx + 26 - big, by + 21];
  const hipF: Pt = [bx + 33, by + 34];
  const hipB: Pt = [bx + 27, by + 34];
  const [hx, hy] = [bx + 26, by + 8]; // head box 10x11
  const [fE, fH, bE, bH] = [at(p.fE), at(p.fH), at(p.bE), at(p.bH)];
  const [fK, fF, bK, bF] = [at(p.fK), at(p.fF), at(p.bK), at(p.bF)];
  const handColor = c.hands ?? c.skin;
  const fistColor = c.weapon === 'none' && c.glow ? c.glow : c.weapon === 'void' ? c.glow! : handColor;
  const upperArm = c.sleeves === 'none' ? c.skin : (c.sleeveColor ?? c.top);
  const foreArm = c.sleeves === 'full' ? (c.sleeveColor ?? c.top) : c.skin;
  const robe = c.skirt && c.skirt.length >= 16;

  const fist = (h: Pt, col: string) => {
    const s = 4 + big;
    const [x, y] = [Math.round(h[0] - s / 2), Math.round(h[1] - s / 2)];
    g.rect(x, y, s, s, col);
    g.rect(x, y + s - 1, s, 1, dark(col));
    g.rect(x, y, 1, s, dark(col));
    g.set(x + s - 1, y, light(col));
  };
  const leg = (hip: Pt, knee: Pt, foot: Pt) => {
    if (robe) {
      g.rect(foot[0] - 2, 50, 6, 3, c.boots);
      return;
    }
    g.limb(hip, knee, c.pants, 5 + big);
    g.limb(knee, foot, c.pants, 4 + big);
    if (foot[1] >= 50) {
      g.rect(foot[0] - 2, 50, 6, 3, c.boots);
      g.rect(foot[0] - 2, 52, 6, 1, dark(c.boots));
      g.set(foot[0] + 3, 50, light(c.boots));
    } else {
      g.rect(foot[0] - 2, foot[1] - 1, 5, 3, c.boots);
      g.set(foot[0] + 2, foot[1] - 1, light(c.boots));
    }
  };
  const arm = (s: Pt, e: Pt, h: Pt) => {
    g.limb(s, e, upperArm, 4 + big);
    g.limb(e, h, foreArm, 3 + big);
  };
  const skirt = (back: boolean) => {
    const k = c.skirt!;
    if (!!k.back !== back) return;
    const y0 = hipF[1] - 1;
    const y1 = Math.min(52, y0 + k.length);
    const l1 = hipB[0] - 3 - k.flare;
    const r1 = k.back ? hipB[0] + 2 : hipF[0] + 3 + k.flare;
    g.trap(y0, y1, hipB[0] - 3, k.back ? hipB[0] + 3 : hipF[0] + 3, l1, r1, k.color);
    g.trap(y0, y1, hipB[0] - 3, hipB[0] - 2, l1, l1 + 1, dark(k.color));
    if (c.belt && !k.back) g.rect(l1 + 1, y1, r1 - l1 - 1, 1, c.belt);
  };

  // Behind the body: the back sword, coat tails, back arm and leg, hair falling behind, spikes.
  if (c.weapon === 'katana') {
    g.line(add(sB, -1, -3), add(sB, 9, 12), '#5a1a22', 2);
    g.line(add(sB, -3, -6), add(sB, -1, -3), '#1f1a24', 2);
  }
  if (c.skirt?.back) skirt(true);
  if (c.hair === 'long') g.rect(hx - 3, hy + 3, 5, 16, dark(c.hairColor));
  if (c.hair === 'braids') {
    g.line([hx - 1, hy + 4], [hx - 5, hy + 20], dark(c.hairColor), 2);
    g.line([hx - 5, hy + 20], [hx - 2, hy + 36], dark(c.hairColor), 2);
  }
  arm(sB, bE, bH);
  fist(bH, c.weapon === 'void' || (c.weapon === 'none' && c.glow) ? c.glow! : handColor);
  if (c.weapon === 'pistols') pistol(g, bH, dir(p.aim), false);
  leg(hipB, bK, bF);
  if (c.spikes) {
    for (let i = 0; i < 4; i++) {
      const base: Pt = [sB[0] - 1, sB[1] + 1 + i * 4];
      g.line(base, add(base, -6 + i, -5), c.spikes, 2);
      g.set(base[0] - 6 + i, base[1] - 5, light(c.spikes));
    }
  }

  // Torso: back edge in shadow, front edge lit, an opening at the neck, belt.
  const w = big ? 3 : 2;
  g.trap(sF[1], hipF[1], sB[0] - w, sF[0] + w, hipB[0] - 1, hipF[0] + 1, c.top);
  g.trap(sF[1], hipF[1], sB[0] - w, sB[0] - w + 1, hipB[0] - 1, hipB[0], dark(c.top));
  g.trap(sF[1], hipF[1], sF[0] + w, sF[0] + w, hipF[0] + 1, hipF[0] + 1, light(c.top));
  if (c.chest) g.trap(sF[1], sF[1] + 6, bx + 30, bx + 35, bx + 33, bx + 33, c.chest);
  if (c.weapon === 'claws' || c.spikes) {
    // Carapace plates.
    for (let y = sF[1] + 3; y < hipF[1] - 1; y += 4) g.rect(sB[0] - 1, y, sF[0] - sB[0] + 3, 1, dark(c.top));
  }
  if (c.belt) {
    g.rect(hipB[0] - 1, hipF[1] - 2, hipF[0] - hipB[0] + 3, 2, c.belt);
    g.set(hipF[0], hipF[1] - 2, light(c.belt));
  }

  // Front leg, then skirts and robes over it.
  leg(hipF, fK, fF);
  if (c.skirt && !c.skirt.back) skirt(false);

  // Head: shaded face, eyes looking forward, neck.
  g.rect(bx + 29, hy + 10, 4, 3, dark(c.skin));
  g.rect(hx, hy, 10, 11, c.skin);
  g.rect(hx, hy, 2, 11, dark(c.skin));
  g.rect(hx, hy + 10, 10, 1, dark(c.skin));
  g.set(hx + 10, hy + 5, c.skin); // nose
  for (const [x, y] of [
    [0, 0],
    [9, 0],
    [0, 10],
    [9, 10],
  ]) g.px[hy + y] && (g.px[hy + y][hx + x] = null);
  const eyes = () => {
    if (c.eyes) {
      g.rect(hx + 5, hy + 5, 2, 1, c.eyes);
      g.rect(hx + 8, hy + 5, 2, 1, c.eyes);
      g.set(hx + 6, hy + 5, light(c.eyes));
      return;
    }
    g.set(hx + 5, hy + 5, '#ffffff');
    g.set(hx + 6, hy + 5, EYE);
    g.set(hx + 8, hy + 5, EYE);
    g.rect(hx + 5, hy + 4, 2, 1, dark(c.hairColor));
    g.set(hx + 8, hy + 4, dark(c.hairColor));
    g.rect(hx + 7, hy + 8, 2, 1, dark(c.skin));
  };
  eyes();

  // Hair.
  const hc = c.hairColor;
  const cap = () => {
    g.rect(hx - 1, hy - 1, 11, 4, hc);
    g.rect(hx - 1, hy + 3, 3, 4, hc);
    g.set(hx + 9, hy + 3, hc);
    g.rect(hx + 3, hy - 1, 5, 1, light(hc));
  };
  switch (c.hair) {
    case 'short':
    case 'long':
      cap();
      break;
    case 'spiky':
      cap();
      for (const k of [0, 3, 6, 9]) g.line([hx + k, hy - 1], [hx + k - 3, hy - 5], hc, 2);
      g.set(hx + 7, hy - 4, light(hc));
      break;
    case 'mohawk':
      g.rect(hx + 3, hy - 5, 4, 6, hc);
      g.rect(hx + 5, hy - 5, 1, 4, light(hc));
      break;
    case 'ponytail':
      cap();
      g.disc(hx - 2, hy + 3, 2, hc);
      g.line([hx - 3, hy + 4], [hx - 9, hy + 15], hc, 3);
      g.line([hx - 3, hy + 4], [hx - 9, hy + 15], light(hc), 1);
      break;
    case 'bob':
      g.rect(hx - 1, hy - 1, 12, 4, hc);
      g.rect(hx - 1, hy + 3, 4, 7, hc);
      g.rect(hx + 3, hy + 3, 7, 1, hc);
      g.rect(hx + 2, hy - 1, 6, 1, light(hc));
      break;
    case 'swept':
      g.rect(hx - 1, hy - 2, 11, 5, hc);
      g.rect(hx + 4, hy - 4, 7, 2, hc);
      g.rect(hx - 3, hy, 3, 5, hc);
      g.rect(hx + 5, hy - 4, 5, 1, light(hc));
      g.rect(hx + 1, hy - 2, 4, 1, light(hc));
      break;
    case 'braids':
      cap();
      g.rect(hx + 4, hy + 3, 5, 1, hc); // bangs
      g.line([hx + 1, hy + 5], [hx - 2, hy + 21], hc, 2);
      g.line([hx - 2, hy + 21], [hx + 1, hy + 37], hc, 2);
      for (let y = hy + 7; y < hy + 37; y += 3) g.set(hx + (y < hy + 21 ? 0 : -1), y, light(hc));
      break;
    case 'bald':
      g.set(hx + 4, hy, light(c.skin));
      break;
  }

  // Head gear.
  for (const gear of c.gear) {
    switch (gear) {
      case 'headband':
        g.rect(hx - 1, hy + 2, 11, 2, band);
        g.line([hx - 2, hy + 3], [hx - 7, hy + 6], band, 2);
        g.line([hx - 3, hy + 4], [hx - 6, hy + 9], dark(band), 1);
        break;
      case 'helmet-sun': {
        const gold = '#e8b84a';
        for (const [x, y] of [
          [4, -8],
          [-1, -6],
          [9, -6],
          [-4, -3],
          [12, -3],
        ]) g.line([hx + 4, hy - 1], [hx + x, hy + y], '#ffe48a', 2);
        g.rect(hx - 1, hy - 2, 11, 5, gold);
        g.rect(hx - 1, hy - 2, 11, 1, light(gold));
        g.rect(hx - 1, hy + 2, 11, 1, dark(gold));
        g.disc(hx + 4, hy, 1, '#fff1a8');
        break;
      }
      case 'hood': {
        const robeC = c.top;
        g.rect(hx - 2, hy - 2, 13, 15, robeC);
        g.line([hx - 2, hy], [hx - 6, hy + 7], robeC, 3);
        g.rect(hx - 2, hy - 2, 2, 15, dark(robeC));
        g.rect(hx + 1, hy - 2, 8, 1, light(robeC));
        g.rect(hx + 4, hy + 2, 7, 9, '#1c0f28');
        g.rect(hx + 4, hy + 2, 7, 1, c.belt ?? robeC); // gold trim
        g.rect(hx + 5, hy + 5, 2, 1, c.eyes!);
        g.rect(hx + 8, hy + 5, 2, 1, c.eyes!);
        break;
      }
      case 'tricorn': {
        const hat = '#3a2018';
        g.rect(hx - 1, hy - 6, 11, 6, hat);
        g.rect(hx - 4, hy - 1, 18, 2, hat);
        g.rect(hx - 5, hy - 3, 2, 2, hat);
        g.rect(hx + 13, hy - 3, 2, 2, hat);
        g.rect(hx - 1, hy - 2, 11, 1, '#e0b04a');
        g.rect(hx + 1, hy - 6, 7, 1, light(hat));
        break;
      }
      case 'glasses':
        g.rect(hx + 4, hy + 4, 3, 2, '#b45cff');
        g.rect(hx + 8, hy + 4, 2, 2, '#b45cff');
        g.set(hx + 7, hy + 4, EYE);
        g.set(hx + 4, hy + 4, '#f0c8ff');
        g.set(hx + 8, hy + 4, '#f0c8ff');
        g.rect(hx + 6, hy + 8, 3, 1, '#ffffff'); // grin
        break;
      case 'mask-horns':
        // Demon mask worn on the side of the head, horns curving back.
        g.rect(hx - 2, hy + 1, 4, 7, '#c0392b');
        g.rect(hx - 2, hy + 1, 1, 7, dark('#c0392b'));
        g.line([hx - 1, hy + 1], [hx - 4, hy - 1], '#c0392b', 2);
        g.line([hx - 4, hy - 1], [hx - 6, hy + 1], light('#c0392b'), 1);
        g.set(hx, hy + 4, '#ffd84a');
        break;
      case 'maw':
        g.rect(hx + 4, hy + 7, 7, 3, '#1a0f20');
        for (const x of [4, 6, 8, 10]) g.set(hx + x, hy + 7, '#f2efe6');
        for (const x of [5, 7, 9]) g.set(hx + x, hy + 9, '#f2efe6');
        g.rect(hx, hy - 1, 9, 2, dark(c.skin)); // brow plate
        break;
    }
  }

  // Front arm, shoulder armor, then the weapon in front of everything.
  if (c.weapon === 'sword-shield') shield(g, bH, pose);
  if (c.weapon === 'minigun') minigun(g, fH, dir(p.aim), pose === 'strike', c);
  arm(sF, fE, fH);
  fist(fH, fistColor);
  if (c.pauldron) {
    g.disc(sF[0], sF[1] + 1, 3 + big, c.pauldron);
    g.rect(sF[0] - 3, sF[1] + 3, 7, 1, dark(c.pauldron));
    g.set(sF[0] + 1, sF[1] - 1, light(c.pauldron));
  }
  const blade = dir(p.angle);
  switch (c.weapon) {
    case 'sword-shield':
      g.line(along(fH, blade, -3), fH, '#6b3e1f', 2);
      g.line(along(fH, blade, 2), along(fH, blade, 15), '#fff4c8', 2);
      g.line(along(fH, blade, 2), along(fH, blade, 15), '#e8b84a', 1);
      g.line(add(fH, -blade[1] * 3, blade[0] * 3), add(fH, blade[1] * 3, -blade[0] * 3), '#e8b84a', 2);
      break;
    case 'katana':
      g.line(along(fH, blade, -4), fH, '#1f1a24', 2);
      g.set(...along(fH, blade, -2), '#efe3c8');
      g.line(along(fH, blade, 2), along(fH, blade, 19), '#9fd8ff', 2);
      g.line(along(fH, blade, 2), along(fH, blade, 19), '#eef8ff', 1);
      g.line(add(fH, -blade[1] * 2, blade[0] * 2), add(fH, blade[1] * 2, -blade[0] * 2), '#e0b04a', 1);
      break;
    case 'pistols':
      pistol(g, fH, dir(p.aim), pose === 'strike');
      break;
    case 'orb': {
      const reach = pose === 'strike' ? 13 : pose === 'follow' ? 10 : 6;
      // The Ball floats ahead of her hand (and behind her in the wind-up).
      const o = pose === 'windup' ? add(fH, -6, -4) : along(add(fH, 0, pose === 'strike' ? 0 : -3), dir(p.aim), reach);
      g.disc(o[0], o[1], 4, '#c9ccd6');
      g.disc(o[0] - 1, o[1] - 1, 2, '#eef0f6');
      g.rect(o[0] - 5, o[1], 11, 1, c.glow!);
      g.set(o[0] + 1, o[1] - 2, '#ffffff');
      break;
    }
    case 'claws':
      for (const s of [-2, 0, 2]) g.line(add(fH, 2, s), add(along(fH, blade, 6), 2, s), '#f2efe6', 1);
      break;
    case 'void':
      g.disc(fH[0] + 3, fH[1], pose === 'strike' ? 5 : 3, c.glow!);
      g.disc(fH[0] + 3, fH[1], pose === 'strike' ? 3 : 1, '#2a0f3a');
      break;
    case 'none':
      if (c.glow && pose === 'strike') burst(g, add(fH, 4, 0), c.glow);
      break;
  }
  if (c.weapon === 'void' && pose === 'strike') burst(g, add(fH, 9, 0), c.glow!);

  // One-pixel dark outline around the silhouette.
  const filled = g.px.map((row) => row.map((v) => v !== null));
  for (let y = 0; y < SPRITE_H; y++) {
    for (let x = 0; x < SPRITE_W; x++) {
      if (filled[y][x]) continue;
      if (filled[y - 1]?.[x] || filled[y + 1]?.[x] || filled[y][x - 1] || filled[y][x + 1]) g.px[y][x] = OUTLINE;
    }
  }
  return g.px;
}

function burst(g: Grid, at: Pt, color: string) {
  for (const [x, y] of [
    [4, 0],
    [-1, 0],
    [0, -3],
    [0, 3],
    [3, -3],
    [3, 3],
  ]) g.line(at, add(at, x, y), color, 1);
  g.disc(at[0], at[1], 1, '#ffffff');
}

function pistol(g: Grid, h: Pt, d: Pt, firing: boolean) {
  g.line(h, along(h, d, 7), '#3a3a44', 2);
  g.line(along(h, d, 1), along(h, d, 6), '#8a8a99', 1);
  g.line(h, add(h, -1, 3), '#6b3e1f', 2);
  if (firing) burst(g, along(h, d, 10), '#ffd84a');
}

function minigun(g: Grid, h: Pt, d: Pt, firing: boolean, c: Costume) {
  const start = along(h, d, -6);
  const end = along(h, d, 12);
  g.line(start, end, '#e0457b', 5);
  g.line(start, end, '#ff8ab8', 1, 5, 3, 0);
  g.line(along(h, d, -2), along(h, d, 2), '#3f8fe8', 5);
  g.line(end, along(h, d, 17), '#6b6b7a', 2);
  if (firing) burst(g, along(h, d, 20), c.glow ?? '#ffd84a');
}

function shield(g: Grid, h: Pt, pose: Pose) {
  const [x, y] = pose === 'guard' || pose === 'recoil' ? [h[0] + 3, h[1] + 4] : [h[0] - 1, h[1] + 5];
  g.disc(x, y, 7, '#a8741a');
  g.disc(x, y, 6, '#e8b84a');
  g.disc(x, y, 3, '#fff1a8');
  for (const [dx, dy] of [
    [0, -5],
    [0, 5],
    [-5, 0],
    [5, 0],
  ]) g.set(x + dx, y + dy, '#fff1a8');
  g.set(x - 2, y - 4, '#ffffff');
}

/**
 * Rightmost filled pixel of a pose between rows `top` and `bottom` (the strike's reach, or the front of
 * the guard at the height strikes land), with its height.
 */
export function frontOf(px: Pixels, top = 0, bottom = SPRITE_H - 1): { x: number; y: number } {
  for (let x = SPRITE_W - 1; x >= 0; x--) {
    const ys = px.flatMap((row, y) => (y >= top && y <= bottom && row[x] && row[x] !== OUTLINE ? [y] : []));
    if (ys.length) return { x, y: ys.reduce((s, y) => s + y, 0) / ys.length };
  }
  return { x: 0, y: SPRITE_H / 2 };
}
