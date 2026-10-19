// Animated fighters: sprite sheets rendered from the champions' own models and animations by
// `npm run fighters` (scripts/render-fighters.mjs) into public/fighters/<Champion>.png. Each sheet has
// the idle loop's frames, then the taunt's, side by side.

import data from '../data/fighterSheets.json';

export interface Sheet {
  /** Frames of the idle loop, then of the taunt. */
  idle: number;
  taunt: number;
}

export const SHEET_W = data.w;
export const SHEET_H = data.h;
export const SHEET_FPS = data.fps;

const sheets: Record<string, Sheet> = data.sheets;

export const sheetFor = (main?: string): Sheet | undefined => (main ? sheets[main] : undefined);

/** How long the champion's taunt lasts (0 without a sheet). */
export const tauntSeconds = (main?: string) => {
  const s = sheetFor(main);
  return s ? s.taunt / SHEET_FPS : 0;
};

const images = new Map<string, Promise<HTMLImageElement | null>>();

/** The champion's sprite sheet image (null if it can't load). */
export function loadSheet(id: string): Promise<HTMLImageElement | null> {
  let p = images.get(id);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `${import.meta.env.BASE_URL}fighters/${id}.png`;
    });
    images.set(id, p);
  }
  return p;
}
