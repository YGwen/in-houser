// League of Legends skeletons (.skl) and animations (.anm), enough to pose a .skn mesh at any time of a
// clip. Formats as documented by the community (LeagueToolkit). Matrices are column-major 4x4 arrays
// (like three.js), composed as translation * rotation * scale.

// ---- Math -------------------------------------------------------------------------------------------

/** 4x4 matrix from translation [x,y,z], rotation quaternion [x,y,z,w] and scale [x,y,z]. */
export function compose(t, q, s) {
  const [x, y, z, w] = q;
  const [x2, y2, z2] = [x + x, y + y, z + z];
  const [xx, xy, xz] = [x * x2, x * y2, x * z2];
  const [yy, yz, zz] = [y * y2, y * z2, z * z2];
  const [wx, wy, wz] = [w * x2, w * y2, w * z2];
  return [
    (1 - (yy + zz)) * s[0], (xy + wz) * s[0], (xz - wy) * s[0], 0,
    (xy - wz) * s[1], (1 - (xx + zz)) * s[1], (yz + wx) * s[1], 0,
    (xz + wy) * s[2], (yz - wx) * s[2], (1 - (xx + yy)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
}

export function multiply(a, b) {
  const out = new Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      out[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
  }
  return out;
}

function slerp(a, b, t) {
  let [bx, by, bz, bw] = b;
  let cos = a[0] * bx + a[1] * by + a[2] * bz + a[3] * bw;
  if (cos < 0) [bx, by, bz, bw, cos] = [-bx, -by, -bz, -bw, -cos];
  let k0 = 1 - t;
  let k1 = t;
  if (cos < 0.9995) {
    const angle = Math.acos(cos);
    const sin = Math.sin(angle);
    k0 = Math.sin((1 - t) * angle) / sin;
    k1 = Math.sin(t * angle) / sin;
  }
  const q = [a[0] * k0 + bx * k1, a[1] * k0 + by * k1, a[2] * k0 + bz * k1, a[3] * k0 + bw * k1];
  const len = Math.hypot(...q) || 1;
  return q.map((v) => v / len);
}
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** League's joint name hash (ELF hash of the lowercase name). */
export function elfHash(name) {
  let h = 0;
  for (const ch of name.toLowerCase()) {
    h = ((h << 4) + ch.charCodeAt(0)) >>> 0;
    const high = h & 0xf0000000;
    if (high) h ^= high >>> 24;
    h = (h & ~high) >>> 0;
  }
  return h >>> 0;
}

/** 48-bit "smallest three" quaternion from three u16 words. */
function unpackQuat(w0, w1, w2) {
  const bits = BigInt(w0) | (BigInt(w1) << 16n) | (BigInt(w2) << 32n);
  const max = Number((bits >> 45n) & 3n);
  const comp = (shift) => (Number((bits >> BigInt(shift)) & 0x7fffn) / 32767) * Math.SQRT2 - 1 / Math.SQRT2;
  const [a, b, c] = [comp(30), comp(15), comp(0)];
  const d = Math.sqrt(Math.max(0, 1 - (a * a + b * b + c * c)));
  return max === 0 ? [d, a, b, c] : max === 1 ? [a, d, b, c] : max === 2 ? [a, b, d, c] : [a, b, c, d];
}

const cstr = (buf, at) => {
  const end = buf.indexOf(0, at);
  return buf.toString('latin1', at, end < 0 ? buf.length : end);
};

// ---- Skeleton ---------------------------------------------------------------------------------------

/**
 * Parse a .skl. Returns joints (name, hash, parent, local TRS, inverse bind matrix) and `influences`,
 * which maps a .skn vertex bone index to a joint index.
 */
export function parseSkl(buf) {
  if (buf.readUInt32LE(4) === 0x22fd4fc3) {
    const jointCount = buf.readUInt16LE(14);
    const influenceCount = buf.readUInt32LE(16);
    const jointsOffset = buf.readInt32LE(20);
    const influencesOffset = buf.readInt32LE(28);
    const joints = [];
    for (let i = 0; i < jointCount; i++) {
      const o = jointsOffset + i * 100;
      const f = (k) => buf.readFloatLE(o + 16 + k * 4);
      const name = cstr(buf, o + 96 + buf.readInt32LE(o + 96));
      joints.push({
        name,
        hash: elfHash(name),
        parent: buf.readInt16LE(o + 4),
        t: [f(0), f(1), f(2)],
        s: [f(3), f(4), f(5)],
        r: [f(6), f(7), f(8), f(9)],
        inverseBind: compose([f(10), f(11), f(12)], [f(16), f(17), f(18), f(19)], [f(13), f(14), f(15)]),
      });
    }
    const influences = [];
    for (let i = 0; i < influenceCount; i++) influences.push(buf.readUInt16LE(influencesOffset + i * 2));
    return { joints, influences };
  }
  throw new Error('legacy .skl (r3d2sklt) is not supported');
}

// ---- Animation --------------------------------------------------------------------------------------

/**
 * Parse an .anm (r3d2anmd v3/v4/v5, or r3d2canm). Returns { duration, tracks: Map<jointHash, sample> }
 * where sample(time) -> { t, r, s } (missing parts are null and fall back to the bind pose).
 */
export function parseAnm(buf) {
  const magic = buf.toString('latin1', 0, 8);
  if (magic === 'r3d2canm') return parseCompressed(buf);
  if (magic !== 'r3d2anmd') throw new Error(`unknown animation format ${magic}`);
  const version = buf.readUInt32LE(8);
  if (version === 5) return parseV5(buf);
  if (version === 4) return parseV4(buf);
  if (version === 3) return parseV3(buf);
  throw new Error(`r3d2anmd v${version} is not supported`);
}

/** Sampler over evenly spaced frames of [t, r, s] keys. */
function framesSampler(frames, frameDuration) {
  return (time) => {
    const f = Math.min(frames.length - 1, Math.max(0, time / frameDuration));
    const i = Math.floor(f);
    const j = Math.min(frames.length - 1, i + 1);
    const k = f - i;
    const [a, b] = [frames[i], frames[j]];
    return { t: a.t && lerp3(a.t, b.t, k), r: a.r && slerp(a.r, b.r, k), s: a.s && lerp3(a.s, b.s, k) };
  };
}

function parseV3(buf) {
  const trackCount = buf.readUInt32LE(16);
  const frameCount = buf.readUInt32LE(20);
  const fps = buf.readUInt32LE(24) || 30;
  const tracks = new Map();
  let o = 28;
  for (let tr = 0; tr < trackCount; tr++) {
    const name = cstr(buf, o).slice(0, 32);
    o += 36; // name[32] + flags
    const frames = [];
    for (let f = 0; f < frameCount; f++, o += 28) {
      const q = [0, 1, 2, 3].map((k) => buf.readFloatLE(o + k * 4));
      const t = [0, 1, 2].map((k) => buf.readFloatLE(o + 16 + k * 4));
      frames.push({ t, r: q, s: null });
    }
    tracks.set(elfHash(name), framesSampler(frames, 1 / fps));
  }
  return { duration: frameCount / fps, tracks };
}

function parseV4(buf) {
  const trackCount = buf.readInt32LE(28);
  const frameCount = buf.readInt32LE(32);
  const frameDuration = buf.readFloatLE(36);
  const vectorsOffset = buf.readInt32LE(52) + 12;
  const rotationsOffset = buf.readInt32LE(56) + 12;
  const framesOffset = buf.readInt32LE(60) + 12;
  const vec = (i) => [0, 1, 2].map((k) => buf.readFloatLE(vectorsOffset + i * 12 + k * 4));
  const quat = (i) => [0, 1, 2, 3].map((k) => buf.readFloatLE(rotationsOffset + i * 16 + k * 4));
  const byHash = new Map();
  for (let f = 0; f < frameCount; f++) {
    for (let tr = 0; tr < trackCount; tr++) {
      const o = framesOffset + (f * trackCount + tr) * 12; // u32 joint hash, u16 t/s/r, u16 padding
      const hash = buf.readUInt32LE(o);
      if (!byHash.has(hash)) byHash.set(hash, []);
      byHash.get(hash).push({ t: vec(buf.readUInt16LE(o + 4)), s: vec(buf.readUInt16LE(o + 6)), r: quat(buf.readUInt16LE(o + 8)) });
    }
  }
  const tracks = new Map([...byHash].map(([h, frames]) => [h, framesSampler(frames, frameDuration)]));
  return { duration: frameCount * frameDuration, tracks };
}

function parseV5(buf) {
  const trackCount = buf.readInt32LE(28);
  const frameCount = buf.readInt32LE(32);
  const frameDuration = buf.readFloatLE(36);
  const hashesOffset = buf.readInt32LE(40) + 12;
  const vectorsOffset = buf.readInt32LE(52) + 12;
  const quatsOffset = buf.readInt32LE(56) + 12;
  const framesOffset = buf.readInt32LE(60) + 12;
  const vec = (i) => [0, 1, 2].map((k) => buf.readFloatLE(vectorsOffset + i * 12 + k * 4));
  const quat = (i) => unpackQuat(buf.readUInt16LE(quatsOffset + i * 6), buf.readUInt16LE(quatsOffset + i * 6 + 2), buf.readUInt16LE(quatsOffset + i * 6 + 4));
  const tracks = new Map();
  for (let tr = 0; tr < trackCount; tr++) {
    const frames = [];
    for (let f = 0; f < frameCount; f++) {
      const o = framesOffset + (f * trackCount + tr) * 6;
      frames.push({ t: vec(buf.readUInt16LE(o)), s: vec(buf.readUInt16LE(o + 2)), r: quat(buf.readUInt16LE(o + 4)) });
    }
    tracks.set(buf.readUInt32LE(hashesOffset + tr * 4), framesSampler(frames, frameDuration));
  }
  return { duration: frameCount * frameDuration, tracks };
}

function parseCompressed(buf) {
  // magic(8) version(4) | resourceSize formatToken flags | jointCount frameCount jumpCacheCount
  // duration fps | 3 error metrics (2 f32 each) | translation min/max, scale min/max (vec3) |
  // framesOffset jumpCachesOffset jointHashesOffset (relative to byte 12)
  const jointCount = buf.readInt32LE(24);
  const frameCount = buf.readInt32LE(28);
  const duration = buf.readFloatLE(36);
  let o = 44 + 24;
  const v3 = () => {
    const v = [buf.readFloatLE(o), buf.readFloatLE(o + 4), buf.readFloatLE(o + 8)];
    o += 12;
    return v;
  };
  const [tMin, tMax, sMin, sMax] = [v3(), v3(), v3(), v3()];
  const framesOffset = buf.readInt32LE(o) + 12;
  const hashesOffset = buf.readInt32LE(o + 8) + 12;
  const hashes = [];
  for (let j = 0; j < jointCount; j++) hashes.push(buf.readUInt32LE(hashesOffset + j * 4));
  // Keys per joint and transform type (0 rotation, 1 translation, 2 scale).
  const keys = hashes.map(() => [[], [], []]);
  for (let f = 0; f < frameCount; f++) {
    const p = framesOffset + f * 10;
    const time = (buf.readUInt16LE(p) / 65535) * duration;
    const id = buf.readUInt16LE(p + 2);
    const [joint, type] = [id & 0x3fff, id >> 14];
    const [a, b, c] = [buf.readUInt16LE(p + 4), buf.readUInt16LE(p + 6), buf.readUInt16LE(p + 8)];
    let value;
    if (type === 0) value = unpackQuat(a, b, c);
    else {
      const [min, max] = type === 1 ? [tMin, tMax] : [sMin, sMax];
      value = [a, b, c].map((q, k) => min[k] + (max[k] - min[k]) * (q / 65535));
    }
    keys[joint]?.[type]?.push({ time, value });
  }
  const sampleKeys = (list, time, mixer) => {
    if (!list.length) return null;
    list.sort((x, y) => x.time - y.time);
    if (time <= list[0].time) return list[0].value;
    for (let i = 1; i < list.length; i++) {
      if (list[i].time >= time) {
        const [a, b] = [list[i - 1], list[i]];
        return mixer(a.value, b.value, (time - a.time) / (b.time - a.time || 1));
      }
    }
    return list[list.length - 1].value;
  };
  const tracks = new Map(
    hashes.map((h, j) => [h, (time) => ({ r: sampleKeys(keys[j][0], time, slerp), t: sampleKeys(keys[j][1], time, lerp3), s: sampleKeys(keys[j][2], time, lerp3) })]),
  );
  return { duration, tracks };
}

// ---- Posing -----------------------------------------------------------------------------------------

/** Skinning matrices (one per joint) for the skeleton posed by `anim` at `time` (bind pose if no anim). */
export function poseMatrices(skl, anim, time) {
  const globals = new Array(skl.joints.length);
  return skl.joints.map((j, i) => {
    const k = anim?.tracks.get(j.hash)?.(time);
    const local = compose(k?.t ?? j.t, k?.r ?? j.r, k?.s ?? j.s);
    globals[i] = j.parent >= 0 ? multiply(globals[j.parent], local) : local;
    return multiply(globals[i], j.inverseBind);
  });
}

/** Skinned vertex positions and normals for a .skn (with bone data) posed by `matrices`. */
export function skin(mesh, skl, matrices) {
  const n = mesh.positions.length / 3;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  for (let v = 0; v < n; v++) {
    const [x, y, z] = [mesh.positions[v * 3], mesh.positions[v * 3 + 1], mesh.positions[v * 3 + 2]];
    const [nx, ny, nz] = [mesh.normals[v * 3], mesh.normals[v * 3 + 1], mesh.normals[v * 3 + 2]];
    for (let k = 0; k < 4; k++) {
      const w = mesh.weights[v * 4 + k];
      if (!w) continue;
      const m = matrices[skl.influences[mesh.bones[v * 4 + k]]];
      if (!m) continue;
      pos[v * 3] += w * (m[0] * x + m[4] * y + m[8] * z + m[12]);
      pos[v * 3 + 1] += w * (m[1] * x + m[5] * y + m[9] * z + m[13]);
      pos[v * 3 + 2] += w * (m[2] * x + m[6] * y + m[10] * z + m[14]);
      nor[v * 3] += w * (m[0] * nx + m[4] * ny + m[8] * nz);
      nor[v * 3 + 1] += w * (m[1] * nx + m[5] * ny + m[9] * nz);
      nor[v * 3 + 2] += w * (m[2] * nx + m[6] * ny + m[10] * nz);
    }
  }
  return { positions: pos, normals: nor };
}
