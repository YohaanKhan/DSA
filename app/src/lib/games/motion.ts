import { rngInt, type Rng } from './rng';
import type { CheckResult, GameEngine } from './types';

/**
 * Motion Challenge — a sliding-block puzzle scored on MINIMUM moves.
 *
 * The scoring is the whole design problem: you cannot mark minimality unless
 * you know the true optimum. So the generator does not invent a board and hope.
 * It enumerates the board's entire reachable component, runs a multi-source BFS
 * backwards from every solved state in it, and takes a position whose distance
 * from solved is exactly the level's target depth. The optimum is therefore not
 * an estimate — it is the BFS distance.
 *
 * A move is a slide of one car by any distance in one direction, as in the
 * physical game. Two cells is one move, not two.
 */

export const BOARD_SIZE = 6;
export const EXIT_ROW = 2;

/** The fixed half of a car: everything a slide cannot change. */
export interface CarSpec {
  len: number;
  horiz: boolean;
  /** Row for a horizontal car, column for a vertical one. */
  fixed: number;
}

/** A position vector: `pos[i]` is car i's head along its own axis. */
export type Pos = number[];

export interface MotionState {
  level: number;
  size: number;
  exitRow: number;
  /** Car 0 is the target: horizontal, length 2, sitting on the exit row. */
  specs: CarSpec[];
  start: Pos;
  /** The true minimum, from BFS. Not a guess. */
  optimal: number;
  seconds: number;
}

export interface MotionMove {
  carId: number;
  /** The car's new head along its axis. */
  to: number;
}

export interface MotionAnswer {
  moves: MotionMove[];
}

/** The rectangle a car occupies, for rendering. */
export interface Car {
  id: number;
  row: number;
  col: number;
  len: number;
  horiz: boolean;
}

export const carsAt = (specs: CarSpec[], pos: Pos): Car[] =>
  specs.map((s, id) => ({
    id,
    row: s.horiz ? s.fixed : pos[id],
    col: s.horiz ? pos[id] : s.fixed,
    len: s.len,
    horiz: s.horiz,
  }));

/** -1 for an empty cell, otherwise the car index sitting on it. */
export function occupancy(specs: CarSpec[], pos: Pos, size: number): Int8Array {
  const grid = new Int8Array(size * size).fill(-1);
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    for (let k = 0; k < s.len; k++) {
      const r = s.horiz ? s.fixed : pos[i] + k;
      const c = s.horiz ? pos[i] + k : s.fixed;
      grid[r * size + c] = i;
    }
  }
  return grid;
}

export const isGoal = (specs: CarSpec[], pos: Pos, size: number): boolean =>
  pos[0] + specs[0].len === size;

/** Every legal slide from this position. */
export function legalMoves(specs: CarSpec[], pos: Pos, size: number): MotionMove[] {
  const grid = occupancy(specs, pos, size);
  const out: MotionMove[] = [];
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    for (let p = pos[i] - 1; p >= 0; p--) {
      const r = s.horiz ? s.fixed : p;
      const c = s.horiz ? p : s.fixed;
      if (grid[r * size + c] !== -1) break;
      out.push({ carId: i, to: p });
    }
    for (let p = pos[i] + 1; p + s.len <= size; p++) {
      const r = s.horiz ? s.fixed : p + s.len - 1;
      const c = s.horiz ? p + s.len - 1 : s.fixed;
      if (grid[r * size + c] !== -1) break;
      out.push({ carId: i, to: p });
    }
  }
  return out;
}

export function applyMove(pos: Pos, move: MotionMove): Pos {
  const next = pos.slice();
  next[move.carId] = move.to;
  return next;
}

/** Replays a move list, rejecting the first illegal one. */
export function replay(state: MotionState, moves: MotionMove[]): { pos: Pos; legal: boolean } {
  let pos = state.start;
  for (const move of moves) {
    const ok = legalMoves(state.specs, pos, state.size)
      .some((m) => m.carId === move.carId && m.to === move.to);
    if (!ok) return { pos, legal: false };
    pos = applyMove(pos, move);
  }
  return { pos, legal: true };
}

// ---- Generation ----------------------------------------------------------

/**
 * A position vector packs into one 32-bit integer: the board is six wide, so
 * each car's head needs three bits, and nine cars still fit. That matters —
 * the search below visits tens of thousands of states per puzzle, and a numeric
 * key in a Set beats a joined string by roughly an order of magnitude.
 */
const BITS = 3;
const MASK = 7;

const encode = (pos: Pos): number => {
  let key = 0;
  for (let i = 0; i < pos.length; i++) key |= pos[i] << (BITS * i);
  return key;
};

const decodeInto = (key: number, count: number, out: Pos): Pos => {
  for (let i = 0; i < count; i++) out[i] = (key >> (BITS * i)) & MASK;
  return out;
};

const decode = (key: number, count: number): Pos => decodeInto(key, count, new Array(count));

/** Fills a reused buffer rather than allocating one per visited state. */
function fillOccupancy(specs: CarSpec[], pos: Pos, size: number, grid: Int8Array): void {
  grid.fill(-1);
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    for (let k = 0; k < s.len; k++) {
      const r = s.horiz ? s.fixed : pos[i] + k;
      const c = s.horiz ? pos[i] + k : s.fixed;
      grid[r * size + c] = i;
    }
  }
}

/** Neighbour keys, derived from `key` by rewriting one car's three bits. */
function expandKeys(
  specs: CarSpec[], key: number, size: number, pos: Pos, grid: Int8Array, out: number[],
): void {
  out.length = 0;
  decodeInto(key, specs.length, pos);
  fillOccupancy(specs, pos, size, grid);

  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    const shift = BITS * i;
    const cleared = key & ~(MASK << shift);
    for (let p = pos[i] - 1; p >= 0; p--) {
      const r = s.horiz ? s.fixed : p;
      const c = s.horiz ? p : s.fixed;
      if (grid[r * size + c] !== -1) break;
      out.push(cleared | (p << shift));
    }
    for (let p = pos[i] + 1; p + s.len <= size; p++) {
      const r = s.horiz ? s.fixed : p + s.len - 1;
      const c = s.horiz ? p + s.len - 1 : s.fixed;
      if (grid[r * size + c] !== -1) break;
      out.push(cleared | (p << shift));
    }
  }
}

/** Dense boards make deep puzzles; this is the ceiling before search costs bite. */
const NODE_CAP = 120_000;
const LAYOUT_ATTEMPTS = 40;
const PLACEMENT_ATTEMPTS = 60;

function randomLayout(
  size: number, exitRow: number, carCount: number, longOdds: number, rng: Rng,
): { specs: CarSpec[]; pos: Pos } | null {
  const specs: CarSpec[] = [{ len: 2, horiz: true, fixed: exitRow }];
  const pos: Pos = [rngInt(rng, 0, size - 2)];

  for (let placed = 1; placed < carCount; placed++) {
    let ok = false;
    for (let attempt = 0; attempt < PLACEMENT_ATTEMPTS && !ok; attempt++) {
      const horiz = rng() < 0.45;
      const fixed = rngInt(rng, 0, size);
      // A horizontal car on the exit row can only ever slide along that row, so
      // it either walls the target in forever or is scenery. Neither is a puzzle.
      if (horiz && fixed === exitRow) continue;
      const len = rng() < longOdds ? 3 : 2;
      const head = rngInt(rng, 0, size - len + 1);

      if (overlaps([...specs, { len, horiz, fixed }], [...pos, head], size)) continue;

      specs.push({ len, horiz, fixed });
      pos.push(head);
      ok = true;
    }
    if (!ok) return null;
  }
  return { specs, pos };
}

function overlaps(specs: CarSpec[], pos: Pos, size: number): boolean {
  const seen = new Set<number>();
  for (let i = 0; i < specs.length; i++) {
    const s = specs[i];
    for (let k = 0; k < s.len; k++) {
      const r = s.horiz ? s.fixed : pos[i] + k;
      const c = s.horiz ? pos[i] + k : s.fixed;
      const cell = r * size + c;
      if (seen.has(cell)) return true;
      seen.add(cell);
    }
  }
  return false;
}

/**
 * Enumerate the component, then walk back from every solved state in it.
 *
 * Slides are reversible, so the component is one undirected graph and the
 * backwards distance from the solved set IS the forwards solution length. That
 * is what makes `optimal` a fact rather than an estimate, and it is the only
 * reason this game can be scored on minimality at all.
 */
function analyse(
  specs: CarSpec[], start: Pos, size: number, targetDepth: number, rng: Rng,
): { pos: Pos; depth: number } | null {
  const count = specs.length;
  const scratch: Pos = new Array(count).fill(0);
  const grid = new Int8Array(size * size);
  const neighbours: number[] = [];
  const goalCol = size - specs[0].len;
  // Car 0 owns the low three bits, so "solved" is a mask test.
  const isGoalKey = (key: number) => (key & MASK) === goalCol;

  // Pass 1 — the component, and which of its states are solved.
  const startKey = encode(start);
  const seen = new Set<number>([startKey]);
  const goals: number[] = isGoalKey(startKey) ? [startKey] : [];
  let frontier: number[] = [startKey];

  while (frontier.length > 0) {
    if (seen.size > NODE_CAP) return null;
    const next: number[] = [];
    for (const key of frontier) {
      expandKeys(specs, key, size, scratch, grid, neighbours);
      for (const nk of neighbours) {
        if (seen.has(nk)) continue;
        seen.add(nk);
        if (isGoalKey(nk)) goals.push(nk);
        next.push(nk);
      }
    }
    frontier = next;
  }
  if (goals.length === 0) return null;

  // Pass 2 — multi-source BFS backwards from every solved state.
  const reached = new Set<number>(goals);
  const byDepth: number[][] = [];
  let layer = goals;
  let depth = 0;

  while (layer.length > 0) {
    depth++;
    const next: number[] = [];
    for (const key of layer) {
      expandKeys(specs, key, size, scratch, grid, neighbours);
      for (const nk of neighbours) {
        if (reached.has(nk)) continue;
        reached.add(nk);
        next.push(nk);
      }
    }
    if (next.length > 0) byDepth[depth] = next;
    layer = next;
  }

  let chosen = -1;
  for (let d = 1; d < byDepth.length; d++) {
    if (!byDepth[d]) continue;
    if (chosen < 0 || Math.abs(d - targetDepth) < Math.abs(chosen - targetDepth)) chosen = d;
  }
  if (chosen < 0) return null;

  const bucket = byDepth[chosen];
  return { pos: decode(bucket[rngInt(rng, 0, bucket.length)], count), depth: chosen };
}

/**
 * One more move per level, up to a ceiling. The ceiling is empirical: random
 * six-by-six boards top out around fourteen moves from solved, and hunting for
 * deeper ones costs seconds of generation for a puzzle that is not meaningfully
 * harder. Past the ceiling the clock tightens instead of the board deepening.
 */
export const MAX_DEPTH = 14;
const DEPTH_CEILING_LEVEL = MAX_DEPTH - 2;
export const motionDepth = (level: number): number => Math.min(MAX_DEPTH, level + 2);

/**
 * Density, not board size, is what makes a sliding puzzle deep. Later levels add
 * cars and lengthen them rather than growing the grid, which would change the
 * game the assessment reportedly uses.
 */
export const motionCars = (level: number): number => Math.min(9, 5 + Math.floor(level / 2));
export const motionLongOdds = (level: number): number => Math.min(0.55, 0.25 + level * 0.04);

/**
 * Generous on purpose: this game is about planning, not reaction speed. Once
 * the board stops deepening, the clock starts shrinking, so the run still ends.
 */
export const motionSeconds = (level: number): number =>
  Math.max(40, 30 + motionDepth(level) * 6 - Math.max(0, level - DEPTH_CEILING_LEVEL) * 6);

/** Each move past the optimum costs a tenth. Not solving at all scores zero. */
const PENALTY_PER_EXTRA_MOVE = 0.1;

export const motionGame: GameEngine<MotionState, MotionAnswer> = {
  id: 'motion',
  title: 'Motion Challenge',
  blurb: 'Slide the blocks to free the target. Scored on the fewest moves, not the fastest.',
  measures:
    'Spatial planning and lookahead. It rewards planning before touching anything, which is a habit rather than a trait — so this one does improve with practice.',
  rules: [
    'The highlighted block must reach the exit on the right-hand edge.',
    'Blocks slide only along their own axis. Horizontal blocks move left and right, vertical blocks up and down.',
    'Click a block to select it, then click where it should go. Sliding any distance counts as ONE move.',
    'You are scored on the minimum. The optimal move count is known and shown after the level.',
    'Each move past the optimum costs 10% of the level. Not solving it scores nothing.',
  ],
  strategy: [
    'Find the chain of blockers between the target and the exit, then work backwards: what has to move for THAT to move?',
    'Plan at least two moves ahead before you touch anything. A move you make to see what happens is a move on your scorecard.',
    'Do not take the first solution you see. The score is the minimum, and the first route found is rarely it.',
    'Count your planned moves before executing. If your count is above the level depth, keep planning.',
    'Undo is free and does not count. Use it — reasoning on the board beats reasoning in your head.',
  ],

  generate(level, rng) {
    const targetDepth = motionDepth(level);
    const carCount = motionCars(level);
    const longOdds = motionLongOdds(level);
    let best: { pos: Pos; depth: number; specs: CarSpec[] } | null = null;

    for (let attempt = 0; attempt < LAYOUT_ATTEMPTS; attempt++) {
      const layout = randomLayout(BOARD_SIZE, EXIT_ROW, carCount, longOdds, rng);
      if (!layout) continue;
      const found = analyse(layout.specs, layout.pos, BOARD_SIZE, targetDepth, rng);
      if (!found) continue;

      // At or beyond the target is taken immediately. A board deeper than asked
      // for is a better puzzle than the same board a move shallower, and
      // chasing an exact match on deep levels burns seconds for nothing.
      if (found.depth >= targetDepth) {
        return {
          level, size: BOARD_SIZE, exitRow: EXIT_ROW,
          specs: layout.specs, start: found.pos,
          optimal: found.depth, seconds: motionSeconds(level),
        };
      }
      if (!best || Math.abs(found.depth - targetDepth) < Math.abs(best.depth - targetDepth)) {
        best = { ...found, specs: layout.specs };
      }
    }

    if (!best) throw new Error(`motion: no solvable board for level ${level}`);
    // The target depth is a wish; `optimal` is always the measured truth, so a
    // board a move short of the wish still scores minimality correctly.
    return {
      level, size: BOARD_SIZE, exitRow: EXIT_ROW,
      specs: best.specs, start: best.pos,
      optimal: best.depth, seconds: motionSeconds(level),
    };
  },

  check(state, answer): CheckResult {
    const { pos, legal } = replay(state, answer.moves);
    const solved = legal && isGoal(state.specs, pos, state.size);
    const extra = Math.max(0, answer.moves.length - state.optimal);

    if (!solved) {
      return {
        correct: false,
        credit: 0,
        note: legal
          ? `Not solved. It can be done in ${state.optimal} moves.`
          : 'That move list contains an illegal slide.',
      };
    }
    return {
      correct: true,
      credit: Math.max(0, 1 - PENALTY_PER_EXTRA_MOVE * extra),
      note: extra === 0
        ? `Solved in ${answer.moves.length} — the optimum.`
        : `Solved in ${answer.moves.length}; the optimum was ${state.optimal}. ${extra} extra move${extra === 1 ? '' : 's'} cost ${extra * 10}%.`,
    };
  },

  secondsFor: motionSeconds,
};
