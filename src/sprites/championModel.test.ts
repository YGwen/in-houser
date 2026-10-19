import { describe, expect, it } from 'vitest';
import modelData from '../data/championModels.json';
import { bodyFrame, hasModel } from './championModel';

describe('champion models', () => {
  it('frames the body, not parts sitting far from it', () => {
    // 100 body vertices in a 10 x 100 column, plus 5 vertices of a cape trailing far to the side.
    const pts: number[] = [];
    for (let i = 0; i < 100; i++) pts.push((i % 10) - 5, i, 0);
    for (let i = 0; i < 5; i++) pts.push(400, 50, 0);
    const f = bodyFrame(new Float32Array(pts), 0);
    expect(f.x1).toBeLessThan(10);
    expect(f.x0).toBeGreaterThanOrEqual(-5);
    expect(f.y0).toBeLessThanOrEqual(1);
    expect(f.y1).toBeGreaterThanOrEqual(98);
  });

  it('has a model and texture for almost every champion', () => {
    expect(Object.keys(modelData.models).length).toBeGreaterThan(160);
    expect(hasModel('Leona')).toBe(true);
    for (const m of Object.values(modelData.models)) {
      expect(m.skn).toMatch(/\.skn$/);
      expect(m.tex).toMatch(/\.png$/);
    }
  });
});
