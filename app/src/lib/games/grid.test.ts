import { describe, expect, it } from 'vitest';
import { levelRng } from './rng';
import {
  gridGame, gridTier, isRotationOf, isVerticallySymmetric, mirrorVertical, rotate90,
} from './grid';

const SEEDS = [1, 77, 4242, 99991, 5];

describe('grid geometry', () => {
  it('mirrors and rotates as involutions of the right order', () => {
    const cells = [0, 1, 7, 12, 18];
    expect(mirrorVertical(mirrorVertical(cells, 5), 5)).toEqual([...cells].sort((a, b) => a - b));
    let r = cells;
    for (let i = 0; i < 4; i++) r = rotate90(r, 5);
    expect(r).toEqual([...cells].sort((a, b) => a - b));
  });

  it('recognises vertical symmetry', () => {
    // A centred plus on a 5x5 grid.
    expect(isVerticallySymmetric([2, 10, 11, 12, 13, 14, 22], 5)).toBe(true);
    expect(isVerticallySymmetric([0, 1, 2], 5)).toBe(false);
  });

  it('recognises a rotation but not the identity', () => {
    const a = [0, 1, 2, 7];
    expect(isRotationOf(a, rotate90(a, 5), 5)).toBe(true);
    expect(isRotationOf(a, a, 5)).toBe(false);
  });
});

describe('grid generation', () => {
  it('follows the level curve', () => {
    expect(gridTier(1)).toMatchObject({ n: 4, k: 3 });
    expect(gridTier(4)).toMatchObject({ n: 4, k: 4 });
    expect(gridTier(6)).toMatchObject({ n: 5, k: 4 });
    expect(gridTier(9)).toMatchObject({ n: 6, k: 5 });
    expect(gridTier(30)).toMatchObject({ n: 6, k: 6 });
  });

  it('lights exactly K distinct cells inside the grid, at every level', () => {
    for (const seed of SEEDS) {
      for (let level = 1; level <= 14; level++) {
        const state = gridGame.generate(level, levelRng(seed, level));
        const tier = gridTier(level);
        expect(state.dots).toHaveLength(tier.k);
        expect(new Set(state.dots).size).toBe(tier.k);
        expect(Math.min(...state.dots)).toBeGreaterThanOrEqual(0);
        expect(Math.max(...state.dots)).toBeLessThan(tier.n * tier.n);
      }
    }
  });

  it('states an interference answer that the geometry actually supports', () => {
    for (const seed of SEEDS) {
      for (let level = 1; level <= 12; level++) {
        const { interference: task } = gridGame.generate(level, levelRng(seed, level));
        const truth = task.kind === 'symmetry'
          ? isVerticallySymmetric(task.a, task.size)
          : isRotationOf(task.a, task.b!, task.size);
        expect(task.answer).toBe(truth);
      }
    }
  });

  it('produces both yes and no interference answers', () => {
    const answers = new Set<boolean>();
    for (let seed = 0; seed < 40; seed++) {
      answers.add(gridGame.generate(3, levelRng(seed, 3)).interference.answer);
    }
    expect(answers).toEqual(new Set([true, false]));
  });

  it('is reproducible from a seed', () => {
    const a = gridGame.generate(7, levelRng(31337, 7));
    const b = gridGame.generate(7, levelRng(31337, 7));
    expect(b).toEqual(a);
  });
});

describe('grid checking', () => {
  const state = gridGame.generate(5, levelRng(2024, 5));

  it('requires every cell, exactly', () => {
    expect(gridGame.check(state, { cells: state.dots, interference: state.interference.answer }).correct).toBe(true);
    expect(gridGame.check(state, { cells: state.dots.slice(1), interference: true }).correct).toBe(false);
    expect(gridGame.check(state, { cells: [...state.dots, 0].filter((c, i, a) => a.indexOf(c) === i), interference: true }).correct)
      .toBe(state.dots.includes(0));
  });

  it('docks credit for a wrong interference answer without failing the level', () => {
    const wrong = gridGame.check(state, { cells: state.dots, interference: !state.interference.answer });
    expect(wrong.correct).toBe(true);
    expect(wrong.credit).toBeCloseTo(0.85);
  });

  it('scores nothing for an inexact recall however good the interference answer', () => {
    const miss = gridGame.check(state, { cells: [], interference: state.interference.answer });
    expect(miss).toMatchObject({ correct: false, credit: 0 });
  });
});
