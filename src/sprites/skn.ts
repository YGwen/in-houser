// Reader for League of Legends skinned meshes (.skn), enough to draw a model in its bind pose:
// positions, normals, UVs, triangle indices and named submeshes. Bone weights are skipped.
// Layout (little endian), as documented by the community (LeagueToolkit / CommunityDragon):
//   u32 magic 0x00112233, u16 major, u16 minor
//   major > 0: u32 submesh count, then per submesh: char[64] name, u32 first vertex, vertex count,
//              first index, index count
//   major 4:   u32 flags
//   u32 index count, u32 vertex count
//   major 4:   u32 vertex size, u32 vertex type, 6 x f32 bounding box, 4 x f32 bounding sphere
//   u16 indices[], then vertices: f32 position[3], u8 bones[4], f32 weights[4], f32 normal[3],
//   f32 uv[2], then optional color / tangent (covered by the vertex size)

export interface Submesh {
  name: string;
  startIndex: number;
  indexCount: number;
}

export interface SknMesh {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint16Array;
  submeshes: Submesh[];
}

const MAGIC = 0x00112233;

export function parseSkn(buffer: ArrayBuffer): SknMesh {
  const v = new DataView(buffer);
  let o = 0;
  const u16 = () => ((o += 2), v.getUint16(o - 2, true));
  const u32 = () => ((o += 4), v.getUint32(o - 4, true));
  if (u32() !== MAGIC) throw new Error('not a .skn file');
  const major = u16();
  u16(); // minor

  const submeshes: Submesh[] = [];
  if (major > 0) {
    const count = u32();
    for (let i = 0; i < count; i++) {
      const bytes = new Uint8Array(buffer, o, 64);
      const end = bytes.indexOf(0);
      const name = String.fromCharCode(...bytes.subarray(0, end < 0 ? 64 : end));
      o += 64;
      u32(); // first vertex
      u32(); // vertex count
      const startIndex = u32();
      const indexCount = u32();
      submeshes.push({ name, startIndex, indexCount });
    }
  }
  if (major === 4) u32(); // flags
  const indexCount = u32();
  const vertexCount = u32();
  let vertexSize = 52;
  if (major === 4) {
    vertexSize = u32();
    u32(); // vertex type
    o += 6 * 4 + 4 * 4; // bounding box and sphere
  }
  if (!submeshes.length) submeshes.push({ name: 'mesh', startIndex: 0, indexCount });

  const indices = new Uint16Array(indexCount);
  for (let i = 0; i < indexCount; i++) indices[i] = u16();

  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  for (let i = 0; i < vertexCount; i++) {
    const b = o + i * vertexSize;
    for (let k = 0; k < 3; k++) positions[i * 3 + k] = v.getFloat32(b + k * 4, true);
    for (let k = 0; k < 3; k++) normals[i * 3 + k] = v.getFloat32(b + 32 + k * 4, true);
    for (let k = 0; k < 2; k++) uvs[i * 2 + k] = v.getFloat32(b + 44 + k * 4, true);
  }
  return { positions, normals, uvs, indices, submeshes };
}
