import { describe, expect, it } from 'vitest';
import { levelRng } from './rng';
import {
  digitGame, digitSeconds, digitTier, evaluate, isSolution, slotsOf, solve,
} from './digit';

const SEEDS = [1, 23, 808, 65535, 3];

describe('evaluate', () => {
  it('applies standard precedence', () => {
    expect(evaluate([2, '+', 3, '*', 4])).toBe(14);
    expect(evaluate([12, '/', 3, '+', 1])).toBe(5);
    expect(evaluate([9, '-', 2, '-', 3])).toBe(4);
  });

  it('refuses inexact division rather than inventing a fraction', () => {
    expect(evaluate([7, '/', 2])).toBeNull();
    expect(evaluate([7, '/', 0])).toBeNull();
  });

  it('rejects malformed token runs', () => {
    expect(evaluate([])).toBeNull();
    expect(evaluate([1, '+'])).toBeNull();
  });
});

describe('digit generation', () => {
  it('follows the level curve and the shrinking clock', () => {
    expect(digitTier(1)).toBe(0);
    expect(digitTier(6)).toBe(2);
    expect(digitTier(11)).toBe(5);
    expect(digitTier(40)).toBe(5);
    expect(digitSeconds(1)).toBe(20);
    expect(digitSeconds(30)).toBe(8);
  });

  it('every generated level has at least one valid use-once solution', () => {
    for (const seed of SEEDS) {
      for (let level = 1; level <= 14; level++) {
        const state = digitGame.generate(level, levelRng(seed, level));
        const solutions = solve(state, 1);
        expect(solutions.length, `level ${level} seed ${seed}`).toBe(1);
        expect(isSolution(state, solutions[0])).toBe(true);
      }
    }
  });

  it('gives every slot a tile of the right kind to draw on', () => {
    for (const seed of SEEDS) {
      for (let level = 1; level <= 14; level++) {
        const state = digitGame.generate(level, levelRng(seed, level));
        const slots = slotsOf(state.equations);
        expect(slots.length).toBeGreaterThan(0);
        expect(new Set(slots.map((s) => s.id)).size).toBe(slots.length);
        for (const kind of ['digit', 'op'] as const) {
          const needed = slots.filter((s) => s.accepts === kind).length;
          expect(state.tiles.filter((t) => t.kind === kind).length).toBeGreaterThanOrEqual(needed);
        }
      }
    }
  });

  it('reaches two equations sharing one bank at the top tier', () => {
    const state = digitGame.generate(12, levelRng(9, 12));
    expect(state.equations).toHaveLength(2);
    expect(slotsOf(state.equations)).toHaveLength(4);
  });

  it('blanks the operator at tier four', () => {
    const state = digitGame.generate(9, levelRng(11, 9));
    expect(slotsOf(state.equations).some((s) => s.accepts === 'op')).toBe(true);
    expect(state.tiles.some((t) => t.kind === 'op')).toBe(true);
  });

  it('is reproducible from a seed', () => {
    expect(digitGame.generate(5, levelRng(777, 5))).toEqual(digitGame.generate(5, levelRng(777, 5)));
  });
});

describe('digit checking', () => {
  it('accepts a solution the solver found', () => {
    const state = digitGame.generate(6, levelRng(42, 6));
    const [answer] = solve(state, 1);
    expect(digitGame.check(state, answer)).toMatchObject({ correct: true, credit: 1 });
  });

  it('rejects an incomplete board', () => {
    const state = digitGame.generate(6, levelRng(42, 6));
    const [answer] = solve(state, 1);
    const slots = slotsOf(state.equations);
    const partial = { ...answer };
    delete partial[slots[0].id];
    expect(digitGame.check(state, partial).correct).toBe(false);
  });

  it('rejects spending one tile twice', () => {
    // Two slots, one tile id: the use-once rule is what makes the bank a puzzle.
    const state = digitGame.generate(1, levelRng(5, 1));
    const slots = slotsOf(state.equations);
    const tile = state.tiles.find((t) => t.kind === 'digit')!;
    expect(isSolution(state, { [slots[0].id]: tile.id, [slots[1].id]: tile.id })).toBe(false);
  });

  it('shows a working answer when you get it wrong', () => {
    const state = digitGame.generate(3, levelRng(6, 3));
    expect(digitGame.check(state, {}).note).toContain('=');
  });
});
