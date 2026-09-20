import { describe, expect, it } from 'vitest';
import { levelRng } from './rng';
import { OPS, SHAPES, applyOps, solutionsFor, switchGame, switchSeconds, switchTier } from './switch';

const SEEDS = [1, 17, 512, 90210, 7];

describe('operators', () => {
  it('each does what its label says', () => {
    const s = ['triangle', 'square', 'circle', 'diamond'] as const;
    const by = (code: number) => OPS.find((o) => o.code === code)!.apply([...s]);
    expect(by(1)).toEqual(['square', 'triangle', 'circle', 'diamond']);
    expect(by(2)).toEqual(['triangle', 'square', 'diamond', 'circle']);
    expect(by(3)).toEqual(['diamond', 'triangle', 'square', 'circle']);
    expect(by(4)).toEqual(['diamond', 'circle', 'square', 'triangle']);
    expect(by(5)).toEqual(['triangle', 'circle', 'circle', 'diamond']);
    expect(by(6)).toEqual(['diamond', 'square', 'circle', 'triangle']);
  });

  it('advances the second shape around the whole cycle', () => {
    let seq = [SHAPES[0], SHAPES[SHAPES.length - 1], SHAPES[2], SHAPES[3]];
    seq = applyOps(seq, [5]);
    expect(seq[1]).toBe(SHAPES[0]);
  });
});

describe('switch generation', () => {
  it('follows the level curve and the shrinking clock', () => {
    expect(switchTier(1)).toEqual({ poolSize: 3, opCount: 1 });
    expect(switchTier(4)).toEqual({ poolSize: 6, opCount: 1 });
    expect(switchTier(6)).toEqual({ poolSize: 6, opCount: 2 });
    expect(switchTier(12)).toEqual({ poolSize: 6, opCount: 3 });
    expect(switchSeconds(1)).toBe(30);
    expect(switchSeconds(20)).toBe(15);
  });

  it('every puzzle is uniquely determined, by brute force', () => {
    for (const seed of SEEDS) {
      for (let level = 1; level <= 14; level++) {
        const s = switchGame.generate(level, levelRng(seed, level));
        const solutions = solutionsFor(s.before, s.after, s.pool, s.applied.length);
        expect(solutions).toHaveLength(1);
        expect(solutions[0]).toEqual(s.applied);
      }
    }
  });

  it('never shows a result identical to the start', () => {
    for (const seed of SEEDS) {
      for (let level = 1; level <= 14; level++) {
        const s = switchGame.generate(level, levelRng(seed, level));
        expect(s.after.join()).not.toBe(s.before.join());
      }
    }
  });

  it('states the operators it actually applied, drawn from its own pool', () => {
    for (const seed of SEEDS) {
      for (let level = 1; level <= 14; level++) {
        const s = switchGame.generate(level, levelRng(seed, level));
        expect(applyOps(s.before, s.applied)).toEqual(s.after);
        expect(s.applied.every((c) => s.pool.includes(c))).toBe(true);
        expect(s.applied.length).toBeGreaterThanOrEqual(1);
        expect(s.applied.length).toBeLessThanOrEqual(switchTier(level).opCount);
      }
    }
  });

  it('is reproducible from a seed', () => {
    expect(switchGame.generate(9, levelRng(555, 9))).toEqual(switchGame.generate(9, levelRng(555, 9)));
  });
});

describe('switch checking', () => {
  it('requires the right codes in the right order', () => {
    const s = switchGame.generate(8, levelRng(64, 8));
    expect(switchGame.check(s, s.applied).correct).toBe(true);
    if (s.applied.length > 1) {
      expect(switchGame.check(s, [...s.applied].reverse()).correct).toBe(
        s.applied.join() === [...s.applied].reverse().join(),
      );
    }
    expect(switchGame.check(s, []).correct).toBe(false);
  });

  it('names the answer when you get it wrong', () => {
    const s = switchGame.generate(3, levelRng(8, 3));
    expect(switchGame.check(s, []).note).toContain(String(s.applied[0]));
  });
});
