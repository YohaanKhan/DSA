import { describe, expect, it } from 'vitest';
import { levelRng } from './rng';
import {
  BOARD_SIZE, EXIT_ROW, MAX_DEPTH, applyMove, carsAt, isGoal, legalMoves,
  motionCars, motionDepth, motionGame, occupancy, replay, type MotionState, type Pos,
} from './motion';

const SEEDS = [1, 12, 300, 40404, 8];

/**
 * An INDEPENDENT check on the generator's claim. The generator works backwards
 * with a multi-source BFS from the solved set; this walks forwards from the
 * start and stops at the first goal. If those two ever disagree, `optimal` is
 * a lie and every minimality score built on it is wrong.
 */
function forwardOptimal(state: MotionState): number | null {
  const key = (pos: Pos) => pos.join(',');
  const seen = new Set([key(state.start)]);
  let layer: Pos[] = [state.start];
  let depth = 0;

  while (layer.length > 0) {
    for (const pos of layer) if (isGoal(state.specs, pos, state.size)) return depth;
    const next: Pos[] = [];
    for (const pos of layer) {
      for (const move of legalMoves(state.specs, pos, state.size)) {
        const child = applyMove(pos, move);
        if (seen.has(key(child))) continue;
        seen.add(key(child));
        next.push(child);
      }
    }
    layer = next;
    depth++;
  }
  return null;
}

/** Greedy BFS path, used to drive the board the way a player would. */
function solutionPath(state: MotionState) {
  const key = (pos: Pos) => pos.join(',');
  const parent = new Map<string, { pos: Pos; move: { carId: number; to: number } }>();
  const seen = new Set([key(state.start)]);
  let layer: Pos[] = [state.start];

  while (layer.length > 0) {
    const next: Pos[] = [];
    for (const pos of layer) {
      if (isGoal(state.specs, pos, state.size)) {
        const moves = [];
        let cursor = pos;
        while (key(cursor) !== key(state.start)) {
          const step = parent.get(key(cursor))!;
          moves.unshift(step.move);
          cursor = step.pos;
        }
        return moves;
      }
      for (const move of legalMoves(state.specs, pos, state.size)) {
        const child = applyMove(pos, move);
        if (seen.has(key(child))) continue;
        seen.add(key(child));
        parent.set(key(child), { pos, move });
        next.push(child);
      }
    }
    layer = next;
  }
  return null;
}

describe('motion board', () => {
  it('places every car inside the board without overlap', () => {
    for (const seed of SEEDS) {
      for (let level = 1; level <= 8; level++) {
        const s = motionGame.generate(level, levelRng(seed, level));
        expect(s.specs).toHaveLength(motionCars(level));
        const grid = occupancy(s.specs, s.start, s.size);
        const filled = [...grid].filter((v) => v !== -1).length;
        expect(filled).toBe(s.specs.reduce((sum, c) => sum + c.len, 0));
        for (const car of carsAt(s.specs, s.start)) {
          expect(car.row).toBeGreaterThanOrEqual(0);
          expect(car.col).toBeGreaterThanOrEqual(0);
          expect(car.horiz ? car.col + car.len : car.row + car.len).toBeLessThanOrEqual(s.size);
        }
      }
    }
  });

  it('keeps the target on the exit row and every other horizontal car off it', () => {
    for (const seed of SEEDS) {
      const s = motionGame.generate(6, levelRng(seed, 6));
      expect(s.specs[0]).toEqual({ len: 2, horiz: true, fixed: EXIT_ROW });
      expect(s.exitRow).toBe(EXIT_ROW);
      expect(s.size).toBe(BOARD_SIZE);
      for (const spec of s.specs.slice(1)) {
        if (spec.horiz) expect(spec.fixed).not.toBe(EXIT_ROW);
      }
    }
  });

  it('never starts already solved', () => {
    for (const seed of SEEDS) {
      for (let level = 1; level <= 8; level++) {
        const s = motionGame.generate(level, levelRng(seed, level));
        expect(isGoal(s.specs, s.start, s.size)).toBe(false);
      }
    }
  });
});

describe('motion generation', () => {
  it('states an optimal depth that a forward search independently confirms', () => {
    for (const seed of SEEDS) {
      for (let level = 1; level <= 8; level++) {
        const s = motionGame.generate(level, levelRng(seed, level));
        expect(forwardOptimal(s), `level ${level} seed ${seed}`).toBe(s.optimal);
      }
    }
  });

  it('follows the depth curve up to the ceiling', () => {
    expect(motionDepth(1)).toBe(3);
    expect(motionDepth(5)).toBe(7);
    expect(motionDepth(40)).toBe(MAX_DEPTH);
    for (const seed of SEEDS) {
      for (let level = 1; level <= 6; level++) {
        expect(motionGame.generate(level, levelRng(seed, level)).optimal).toBe(motionDepth(level));
      }
    }
  });

  it('is reproducible from a seed', () => {
    expect(motionGame.generate(4, levelRng(31, 4))).toEqual(motionGame.generate(4, levelRng(31, 4)));
  });
});

describe('motion checking', () => {
  it('gives full credit for an optimal solution and rejects illegal slides', () => {
    for (const seed of SEEDS.slice(0, 3)) {
      const s = motionGame.generate(5, levelRng(seed, 5));
      const path = solutionPath(s)!;
      expect(path).toHaveLength(s.optimal);
      expect(replay(s, path).legal).toBe(true);
      expect(motionGame.check(s, { moves: path })).toMatchObject({ correct: true, credit: 1 });
    }
  });

  it('docks a tenth per move past the optimum', () => {
    const s = motionGame.generate(3, levelRng(77, 3));
    const path = solutionPath(s)!;
    // A car shuffled back and forth before the real solution: same outcome, two
    // more moves, and the score has to notice.
    const wobble = legalMoves(s.specs, s.start, s.size).find((m) => m.carId !== 0)!;
    const detour = [wobble, { carId: wobble.carId, to: s.start[wobble.carId] }, ...path];
    const result = motionGame.check(s, { moves: detour });
    expect(result.correct).toBe(true);
    expect(result.credit).toBeCloseTo(0.8);
    expect(result.note).toContain(String(s.optimal));
  });

  it('scores nothing for an unsolved board', () => {
    const s = motionGame.generate(4, levelRng(3, 4));
    expect(motionGame.check(s, { moves: [] })).toMatchObject({ correct: false, credit: 0 });
  });

  it('rejects a move list containing an illegal slide', () => {
    const s = motionGame.generate(4, levelRng(3, 4));
    const result = motionGame.check(s, { moves: [{ carId: 0, to: s.size - 2 }] });
    expect(result.correct).toBe(false);
    expect(result.note).toContain('illegal');
  });
});
