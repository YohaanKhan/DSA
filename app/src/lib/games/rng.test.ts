import { describe, expect, it } from 'vitest';
import { levelRng, mulberry32, rngInt, rngSample, rngShuffle } from './rng';

describe('mulberry32', () => {
  it('is deterministic for a seed', () => {
    const a = Array.from({ length: 20 }, mulberry32(12345));
    const b = Array.from({ length: 20 }, mulberry32(12345));
    expect(a).toEqual(b);
  });

  it('stays inside [0, 1)', () => {
    const rng = mulberry32(7);
    for (let i = 0; i < 5000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('does not collapse to a constant or a short cycle', () => {
    const rng = mulberry32(1);
    const seen = new Set(Array.from({ length: 2000 }, rng));
    expect(seen.size).toBeGreaterThan(1900);
  });
});

describe('levelRng', () => {
  it('gives consecutive levels uncorrelated streams', () => {
    const a = Array.from({ length: 10 }, levelRng(99, 1));
    const b = Array.from({ length: 10 }, levelRng(99, 2));
    expect(a).not.toEqual(b);
  });

  it('reproduces a level exactly from its seed', () => {
    const first = Array.from({ length: 10 }, levelRng(4242, 6));
    const again = Array.from({ length: 10 }, levelRng(4242, 6));
    expect(again).toEqual(first);
  });
});

describe('helpers', () => {
  it('rngInt covers its range and never exceeds it', () => {
    const rng = mulberry32(3);
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const v = rngInt(rng, 2, 7);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThan(7);
      seen.add(v);
    }
    expect([...seen].sort()).toEqual([2, 3, 4, 5, 6]);
  });

  it('rngShuffle permutes without losing or duplicating', () => {
    const source = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rngShuffle(mulberry32(11), source);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(source);
    expect(source).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('rngSample returns k distinct elements', () => {
    const out = rngSample(mulberry32(5), ['a', 'b', 'c', 'd', 'e'], 3);
    expect(out).toHaveLength(3);
    expect(new Set(out).size).toBe(3);
  });
});
