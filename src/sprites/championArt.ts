// Champion portraits for the reveal: the champion's official loading-screen art (Riot's Data Dragon CDN,
// which allows cross-origin reads), turned into 16-bit pixel art in the browser. The art is cropped to
// the head and torso, shrunk to a few dozen pixels wide, reduced to a small palette of SNES
// (15-bit) colors, cleaned of stray pixels and inked on strong edges. Nothing is stored in the repo.

export const ART_W = 64;
export const ART_H = 84;
const COLORS = 24;

// Loading art is 308x560; keep the top (head and torso) at the portrait's aspect ratio.
const SRC_W = 308;
const SRC_H = Math.round((SRC_W * ART_H) / ART_W);

export const loadingArtUrl = (id: string) => `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${id}_0.jpg`;

/**
 * Reduce RGBA pixels in place to `k` colors (k-means, seeded across the brightness range), with a
 * little extra contrast and saturation first so the small palette keeps the art's punch, and each
 * color snapped to 5 bits per channel like the SNES.
 */
export function quantize(data: Uint8ClampedArray, k = COLORS, width = 0) {
  const n = data.length / 4;
  const px: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    let [r, g, b] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]];
    const l = 0.299 * r + 0.587 * g + 0.114 * b;
    [r, g, b] = [r, g, b].map((v) => (l + (v - l) * 1.2 - 128) * 1.1 + 128) as [number, number, number];
    px.push([r, g, b].map((v) => Math.min(255, Math.max(0, v))) as [number, number, number]);
  }
  const lum = (p: [number, number, number]) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
  const sorted = [...px].sort((a, b) => lum(a) - lum(b));
  let centers = Array.from({ length: k }, (_, i) => [...sorted[Math.floor(((i + 0.5) * n) / k)]] as [number, number, number]);
  const nearest = (p: [number, number, number]) => {
    let best = 0;
    let bestD = Infinity;
    centers.forEach((c, j) => {
      const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2;
      if (d < bestD) [best, bestD] = [j, d];
    });
    return best;
  };
  let owner = new Array<number>(n).fill(0);
  for (let iter = 0; iter < 8; iter++) {
    owner = px.map(nearest);
    const sums = centers.map(() => [0, 0, 0, 0]);
    px.forEach((p, i) => {
      const s = sums[owner[i]];
      s[0] += p[0];
      s[1] += p[1];
      s[2] += p[2];
      s[3]++;
    });
    centers = centers.map((c, j) => (sums[j][3] ? [sums[j][0] / sums[j][3], sums[j][1] / sums[j][3], sums[j][2] / sums[j][3]] : c));
  }
  const snap = (v: number) => Math.round(Math.round((v / 255) * 31) * (255 / 31));
  const palette = centers.map((c) => c.map(snap));
  owner = px.map(nearest);
  if (width) {
    owner = despeckle(owner, width);
    // Ink: the darker side of a strong edge gets the darkest color, like hand-drawn sprite outlines.
    const darkest = palette.reduce((best, c, j) => (lum(c as [number, number, number]) < lum(palette[best] as [number, number, number]) ? j : best), 0);
    const l = owner.map((o) => lum(palette[o] as [number, number, number]));
    const height = n / width;
    const ink = owner.map((o, i) => {
      const [x, y] = [i % width, Math.floor(i / width)];
      const nb = [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, y > 0 ? i - width : -1, y < height - 1 ? i + width : -1];
      return nb.some((j) => j >= 0 && l[j] - l[i] > 130) && l[i] < 70 ? darkest : o;
    });
    owner = ink;
  }
  for (let i = 0; i < n; i++) {
    const c = palette[owner[i]];
    data[i * 4] = c[0];
    data[i * 4 + 1] = c[1];
    data[i * 4 + 2] = c[2];
    data[i * 4 + 3] = 255;
  }
  return palette.length;
}

/**
 * Pixel art has no stray single pixels: a pixel whose color none of its 4 neighbors share takes the
 * most common color around it (8 neighbors). Two passes.
 */
export function despeckle(owner: number[], width: number) {
  const height = owner.length / width;
  let cur = owner;
  for (let pass = 0; pass < 2; pass++) {
    const next = [...cur];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const at = (dx: number, dy: number) => {
          const [nx, ny] = [x + dx, y + dy];
          return nx >= 0 && nx < width && ny >= 0 && ny < height ? cur[ny * width + nx] : -1;
        };
        const four = [at(-1, 0), at(1, 0), at(0, -1), at(0, 1)];
        if (four.includes(cur[i])) continue;
        const counts = new Map<number, number>();
        for (const v of [...four, at(-1, -1), at(1, -1), at(-1, 1), at(1, 1)]) if (v >= 0) counts.set(v, (counts.get(v) ?? 0) + 1);
        next[i] = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? cur[i];
      }
    }
    cur = next;
  }
  return cur;
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

const cache = new Map<string, Promise<HTMLCanvasElement | null>>();

/** The champion's pixel-art portrait (ART_W x ART_H canvas), or null if the art can't be loaded. */
export function championPixelArt(id: string): Promise<HTMLCanvasElement | null> {
  let p = cache.get(id);
  if (!p) {
    p = loadImage(loadingArtUrl(id))
      .then((img) => {
        // Shrink in two steps so the small version averages the detail instead of skipping it.
        const mid = document.createElement('canvas');
        mid.width = ART_W * 2;
        mid.height = ART_H * 2;
        const m = mid.getContext('2d')!;
        m.imageSmoothingQuality = 'high';
        m.drawImage(img, 0, 0, SRC_W, SRC_H, 0, 0, mid.width, mid.height);
        const out = document.createElement('canvas');
        out.width = ART_W;
        out.height = ART_H;
        const o = out.getContext('2d', { willReadFrequently: true })!;
        o.imageSmoothingQuality = 'high';
        o.drawImage(mid, 0, 0, ART_W, ART_H);
        const pixels = o.getImageData(0, 0, ART_W, ART_H);
        quantize(pixels.data, COLORS, ART_W);
        o.putImageData(pixels, 0, 0);
        return out;
      })
      .catch(() => null);
    cache.set(id, p);
  }
  return p;
}
