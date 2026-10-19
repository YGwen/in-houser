// Tiny software rasterizer for cartoon pixel sprites: orthographic projection, depth test, textures,
// three-band cel shading, and ink lines where depth or surface direction breaks (like hand-drawn
// line art). Renders at `scale` times the sprite size, then shrinks to the sprite.

/** Rotate world points into view space: turn by `yaw` around Y, then tilt by `pitch` around X. */
export function toView(yaw, pitch) {
  const [cy, sy, cp, sp] = [Math.cos(yaw), Math.sin(yaw), Math.cos(pitch), Math.sin(pitch)];
  return (x, y, z) => {
    const x1 = x * cy + z * sy;
    const z1 = -x * sy + z * cy;
    return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
  };
}

const LIGHT = (() => {
  const v = [-0.45, 0.75, 0.6]; // from the upper left, in front
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
})();

/**
 * Render one posed mesh. `parts`: [{ indices: Uint16Array range [start, count], texture }], `frame`: view
 * rectangle { x0, x1, y0, y1 }. Returns RGBA of size w x h (sprite size).
 */
export function renderSprite({ positions, normals, uvs, indices, parts, yaw, pitch, frame, w, h, scale = 3 }) {
  const W = w * scale;
  const H = h * scale;
  const view = toView(yaw, pitch);
  const n = positions.length / 3;
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const sz = new Float32Array(n);
  const vn = new Float32Array(n * 3);
  const kx = W / (frame.x1 - frame.x0);
  const ky = H / (frame.y1 - frame.y0);
  for (let i = 0; i < n; i++) {
    const [x, y, z] = view(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    sx[i] = (x - frame.x0) * kx;
    sy[i] = (frame.y1 - y) * ky;
    sz[i] = z;
    const [nx, ny, nz] = view(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]);
    const l = Math.hypot(nx, ny, nz) || 1;
    vn.set([nx / l, ny / l, nz / l], i * 3);
  }

  const depth = new Float32Array(W * H).fill(-Infinity);
  const color = new Float32Array(W * H * 3);
  const normal = new Float32Array(W * H * 3);
  for (const part of parts) {
    const tex = part.texture;
    for (let t = part.start; t < part.start + part.count; t += 3) {
      const [a, b, c] = [indices[t], indices[t + 1], indices[t + 2]];
      const area = (sx[b] - sx[a]) * (sy[c] - sy[a]) - (sy[b] - sy[a]) * (sx[c] - sx[a]);
      if (Math.abs(area) < 1e-9) continue;
      const minX = Math.max(0, Math.floor(Math.min(sx[a], sx[b], sx[c])));
      const maxX = Math.min(W - 1, Math.ceil(Math.max(sx[a], sx[b], sx[c])));
      const minY = Math.max(0, Math.floor(Math.min(sy[a], sy[b], sy[c])));
      const maxY = Math.min(H - 1, Math.ceil(Math.max(sy[a], sy[b], sy[c])));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const [px, py] = [x + 0.5, y + 0.5];
          const w0 = ((sx[b] - px) * (sy[c] - py) - (sy[b] - py) * (sx[c] - px)) / area;
          const w1 = ((sx[c] - px) * (sy[a] - py) - (sy[c] - py) * (sx[a] - px)) / area;
          const w2 = 1 - w0 - w1;
          if (w0 < 0 || w1 < 0 || w2 < 0) continue;
          const z = w0 * sz[a] + w1 * sz[b] + w2 * sz[c];
          const i = y * W + x;
          if (z <= depth[i]) continue;
          const u = w0 * uvs[a * 2] + w1 * uvs[b * 2] + w2 * uvs[c * 2];
          const v = w0 * uvs[a * 2 + 1] + w1 * uvs[b * 2 + 1] + w2 * uvs[c * 2 + 1];
          const tx = Math.min(tex.width - 1, Math.max(0, Math.floor((u - Math.floor(u)) * tex.width)));
          const ty = Math.min(tex.height - 1, Math.max(0, Math.floor((v - Math.floor(v)) * tex.height)));
          const ti = (ty * tex.width + tx) * 4;
          if (tex.data[ti + 3] < 80) continue; // cut-out (hair, cloth edges)
          let nx = w0 * vn[a * 3] + w1 * vn[b * 3] + w2 * vn[c * 3];
          let ny = w0 * vn[a * 3 + 1] + w1 * vn[b * 3 + 1] + w2 * vn[c * 3 + 1];
          let nz = w0 * vn[a * 3 + 2] + w1 * vn[b * 3 + 2] + w2 * vn[c * 3 + 2];
          if (nz < 0) [nx, ny, nz] = [-nx, -ny, -nz]; // back faces (capes) lit like front faces
          const l = Math.hypot(nx, ny, nz) || 1;
          [nx, ny, nz] = [nx / l, ny / l, nz / l];
          // Cel shading: three flat bands.
          const d = nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2];
          const band = d > 0.45 ? 1.08 : d > 0 ? 0.86 : 0.64;
          depth[i] = z;
          color.set([tex.data[ti] * band, tex.data[ti + 1] * band, tex.data[ti + 2] * band], i * 3);
          normal.set([nx, ny, nz], i * 3);
        }
      }
    }
  }

  // Ink lines (at render scale): big depth steps or sharp turns of the surface between neighbors.
  const span = frame.y1 - frame.y0;
  const line = new Uint8Array(W * H);
  for (let y = 0; y < H - 1; y++) {
    for (let x = 0; x < W - 1; x++) {
      const i = y * W + x;
      if (depth[i] === -Infinity) continue;
      for (const j of [i + 1, i + W]) {
        if (depth[j] === -Infinity) continue;
        const dot = normal[i * 3] * normal[j * 3] + normal[i * 3 + 1] * normal[j * 3 + 1] + normal[i * 3 + 2] * normal[j * 3 + 2];
        if (Math.abs(depth[i] - depth[j]) > span * 0.035 || dot < 0.45) line[depth[i] < depth[j] ? i : j] = 1;
      }
    }
  }

  // Shrink to sprite size: a pixel is solid if most of its block is, inked if enough of it is line.
  const out = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let solid = 0;
      let lines = 0;
      const sum = [0, 0, 0];
      for (let j = 0; j < scale; j++) {
        for (let k = 0; k < scale; k++) {
          const i = (y * scale + j) * W + x * scale + k;
          if (depth[i] === -Infinity) continue;
          solid++;
          if (line[i]) lines++;
          else for (let c = 0; c < 3; c++) sum[c] += color[i * 3 + c];
        }
      }
      if (solid * 2 < scale * scale) continue;
      const fill = solid - lines;
      let rgb = fill ? sum.map((v) => v / fill) : [40, 30, 40];
      // Cartoon punch: a bit more saturation.
      const grey = 0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2];
      rgb = rgb.map((v) => grey + (v - grey) * 1.25);
      if (lines * 3 >= scale * scale) rgb = rgb.map((v) => v * 0.32);
      out.set([...rgb, 255], (y * w + x) * 4);
    }
  }
  return out;
}
