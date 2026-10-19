import { describe, expect, it } from 'vitest';
import { parseSkn } from './skn';

/** A version 4 .skn with one submesh and one triangle. */
function sampleSkn() {
  const vertexSize = 52;
  const buf = new ArrayBuffer(4 + 4 + 4 + 80 + 4 + 8 + 8 + 40 + 6 + 3 * vertexSize);
  const v = new DataView(buf);
  let o = 0;
  const u16 = (x: number) => (v.setUint16(o, x, true), (o += 2));
  const u32 = (x: number) => (v.setUint32(o, x, true), (o += 4));
  const f32 = (x: number) => (v.setFloat32(o, x, true), (o += 4));
  u32(0x00112233);
  u16(4);
  u16(1);
  u32(1); // submeshes
  new Uint8Array(buf, o, 4).set([98, 111, 100, 121]); // "body"
  o += 64;
  u32(0);
  u32(3);
  u32(0);
  u32(3);
  u32(0); // flags
  u32(3); // indices
  u32(3); // vertices
  u32(vertexSize);
  u32(0); // vertex type
  for (let i = 0; i < 10; i++) f32(0); // bounds
  for (const i of [0, 1, 2]) u16(i);
  for (let i = 0; i < 3; i++) {
    for (const x of [i, i * 2, i * 3]) f32(x); // position
    new Uint8Array(buf, o, 4).set([i, 0, 0, 0]); // bones
    o += 4;
    for (const x of [1, 0, 0, 0]) f32(x); // weights
    for (const x of [0, 1, 0]) f32(x); // normal
    for (const x of [i / 2, 1 - i / 2]) f32(x); // uv
  }
  return buf;
}

describe('.skn reader', () => {
  it('reads submeshes, indices, positions, normals, uvs and bone weights', () => {
    const m = parseSkn(sampleSkn());
    expect(m.submeshes).toEqual([{ name: 'body', startIndex: 0, indexCount: 3 }]);
    expect([...m.indices]).toEqual([0, 1, 2]);
    expect([...m.positions]).toEqual([0, 0, 0, 1, 2, 3, 2, 4, 6]);
    expect([...m.normals]).toEqual([0, 1, 0, 0, 1, 0, 0, 1, 0]);
    expect([...m.uvs]).toEqual([0, 1, 0.5, 0.5, 1, 0]);
    expect([...m.bones]).toEqual([0, 0, 0, 0, 1, 0, 0, 0, 2, 0, 0, 0]);
    expect([...m.weights].filter((_, i) => i % 4 === 0)).toEqual([1, 1, 1]);
  });

  it('rejects other files', () => {
    expect(() => parseSkn(new ArrayBuffer(16))).toThrow('not a .skn file');
  });
});
