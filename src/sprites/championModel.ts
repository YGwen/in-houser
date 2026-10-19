// Champions' in-game 3D models (base skin, bind pose) rendered as 16-bit pixel sprites. The mesh and
// texture come from CommunityDragon (see scripts/update-models.mjs); three.js is loaded only when a model
// is needed. Each model is rendered once, three-quarters facing right, at 4x the sprite size, averaged
// down, then reduced to a small SNES palette with a dark outline. Nothing is stored in the repo.

import modelData from '../data/championModels.json';
import { quantize } from './championArt';
import { parseSkn } from './skn';

export const MODEL_W = 96;
export const MODEL_H = 128;
const SUPERSAMPLE = 4;
const YAW = (55 * Math.PI) / 180; // turn the model's front (+Z) toward the right, still showing the face

const models: Record<string, { folder: string; skn: string; tex: string }> = modelData.models;

export const hasModel = (id: string) => id in models;

export interface ModelSprite {
  canvas: HTMLCanvasElement;
  /** Rightmost opaque column at upper-body height, as a fraction of the width (the fighter faces right). */
  front: number;
}

type Three = typeof import('three');
let three: Promise<{ T: Three; renderer: import('three').WebGLRenderer }> | null = null;
function renderer() {
  three ??= import('three').then((T) => {
    const r = new T.WebGLRenderer({ alpha: true, antialias: false, preserveDrawingBuffer: true });
    r.setPixelRatio(1);
    r.setSize(MODEL_W * SUPERSAMPLE, MODEL_H * SUPERSAMPLE, false);
    r.outputColorSpace = T.SRGBColorSpace;
    return { T, renderer: r };
  });
  return three;
}

async function render(id: string): Promise<ModelSprite> {
  const m = models[id];
  const url = (file: string) => `${modelData.base}${m.folder}/skins/base/${file}`;
  const [{ T, renderer: r }, mesh] = await Promise.all([
    renderer(),
    fetch(url(m.skn)).then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(res.statusText)))),
  ]);
  const texture = await new T.TextureLoader().setCrossOrigin('anonymous').loadAsync(url(m.tex));
  texture.flipY = false; // League UVs start at the top left
  texture.colorSpace = T.SRGBColorSpace;
  texture.magFilter = T.LinearFilter;

  const skn = parseSkn(mesh);
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.BufferAttribute(skn.positions, 3));
  geometry.setAttribute('normal', new T.BufferAttribute(skn.normals, 3));
  geometry.setAttribute('uv', new T.BufferAttribute(skn.uvs, 2));
  geometry.setIndex(new T.BufferAttribute(skn.indices, 1));
  const material = new T.MeshLambertMaterial({ map: texture, side: T.DoubleSide, alphaTest: 0.4 });
  const object = new T.Mesh(geometry, material);
  object.rotation.y = YAW;

  const scene = new T.Scene();
  scene.add(object);
  scene.add(new T.AmbientLight(0xffffff, 1.6));
  const sun = new T.DirectionalLight(0xffffff, 2.2);
  sun.position.set(2, 3, 3);
  scene.add(sun);

  // Orthographic camera framed on the body. In the bind pose some parts sit far from it (Yorick's cape
  // trails behind, Leona's sword and shield hang beside her, Nami's tail dips below the ground), so the
  // frame follows where most of the vertices are rather than the full bounding box.
  const { x0, x1, y0, y1 } = bodyFrame(skn.positions, YAW);
  const aspect = MODEL_W / MODEL_H;
  const h = Math.max(y1 - y0, (x1 - x0) / aspect) * 1.08;
  const w = h * aspect;
  const cx = (x0 + x1) / 2;
  const cy = y0 + h / 2 - h * 0.03;
  const camera = new T.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, -2000, 2000);
  camera.position.set(cx, cy, 1000);
  camera.lookAt(cx, cy, 0);

  r.setClearColor(0x000000, 0);
  r.render(scene, camera);
  geometry.dispose();
  material.dispose();
  texture.dispose();

  // Average the 4x render down to sprite size, then turn it into pixel art.
  const mid = document.createElement('canvas');
  mid.width = MODEL_W * 2;
  mid.height = MODEL_H * 2;
  const mg = mid.getContext('2d')!;
  mg.imageSmoothingQuality = 'high';
  mg.drawImage(r.domElement, 0, 0, mid.width, mid.height);
  const canvas = document.createElement('canvas');
  canvas.width = MODEL_W;
  canvas.height = MODEL_H;
  const g = canvas.getContext('2d', { willReadFrequently: true })!;
  g.imageSmoothingQuality = 'high';
  g.drawImage(mid, 0, 0, MODEL_W, MODEL_H);
  const pixels = g.getImageData(0, 0, MODEL_W, MODEL_H);
  quantize(pixels.data, { k: 20, width: MODEL_W, alpha: true });
  g.putImageData(pixels, 0, 0);

  // The front at upper-body height (where hits land), not a weapon tip trailing on the ground.
  let front = 0;
  for (let x = MODEL_W - 1; x >= 0 && !front; x--) {
    for (let y = Math.round(MODEL_H * 0.2); y < MODEL_H * 0.6; y++) {
      if (pixels.data[(y * MODEL_W + x) * 4 + 3]) {
        front = (x + 1) / MODEL_W;
        break;
      }
    }
  }
  return { canvas, front };
}

/**
 * Screen-space frame of the body once the model is turned by `yaw`: x between the 8th and 92nd
 * percentile of the vertices, y between the 1st and 99.5th.
 */
export function bodyFrame(positions: Float32Array, yaw: number) {
  const [c, s] = [Math.cos(yaw), Math.sin(yaw)];
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    xs.push(positions[i] * c + positions[i + 2] * s);
    ys.push(positions[i + 1]);
  }
  xs.sort((a, b) => a - b);
  ys.sort((a, b) => a - b);
  const at = (arr: number[], q: number) => arr[Math.min(arr.length - 1, Math.floor(q * arr.length))];
  return { x0: at(xs, 0.08), x1: at(xs, 0.92), y0: at(ys, 0.01), y1: at(ys, 0.995) };
}

const cache = new Map<string, Promise<ModelSprite | null>>();

/** The champion's in-game model as a pixel sprite, or null if it has none or it can't be loaded. */
export function championModelSprite(id: string): Promise<ModelSprite | null> {
  if (!hasModel(id)) return Promise.resolve(null);
  let p = cache.get(id);
  if (!p) {
    p = render(id).catch((e) => {
      console.warn(`No 3D model for ${id}:`, e);
      return null;
    });
    cache.set(id, p);
  }
  return p;
}
