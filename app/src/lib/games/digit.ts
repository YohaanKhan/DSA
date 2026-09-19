import { rngInt, rngPick, rngShuffle, type Rng } from './rng';
import type { CheckResult, GameEngine } from './types';

/**
 * Digit Challenge — balance an equation from a bank of tiles, each usable once.
 *
 * Of the four games this is the one where practice genuinely moves the number,
 * because it is arithmetic fluency plus a search strategy, and both train. It
 * is also the one with the cruellest clock.
 */

export type Op = '+' | '-' | '*' | '/';

export const OP_GLYPH: Record<Op, string> = { '+': '+', '-': '−', '*': '×', '/': '÷' };

export type Token =
  | { kind: 'num'; value: number }
  | { kind: 'op'; value: Op }
  | { kind: 'slot'; id: number; accepts: 'digit' | 'op' };

export interface Equation {
  lhs: Token[];
  target: number;
}

export interface Tile {
  id: number;
  kind: 'digit' | 'op';
  digit?: number;
  op?: Op;
}

export interface DigitState {
  level: number;
  equations: Equation[];
  /** Every tile may be spent once, across ALL equations on screen. */
  tiles: Tile[];
  seconds: number;
}

/** slot id -> tile id. */
export type DigitAnswer = Record<number, number>;

// ---- Arithmetic ----------------------------------------------------------

/**
 * Standard precedence, integers only. Division that is not exact returns null
 * rather than a fraction — a keypad game where 7/2 is a legal intermediate
 * would be a different, worse game.
 */
export function evaluate(parts: Array<number | Op>): number | null {
  if (parts.length === 0 || parts.length % 2 === 0) return null;

  const folded: Array<number | Op> = [parts[0]];
  for (let i = 1; i < parts.length; i += 2) {
    const op = parts[i] as Op;
    const rhs = parts[i + 1] as number;
    if (typeof rhs !== 'number') return null;
    if (op === '*' || op === '/') {
      const lhs = folded.pop() as number;
      if (op === '/') {
        if (rhs === 0 || lhs % rhs !== 0) return null;
        folded.push(lhs / rhs);
      } else {
        folded.push(lhs * rhs);
      }
    } else {
      folded.push(op, rhs);
    }
  }

  let acc = folded[0] as number;
  for (let i = 1; i < folded.length; i += 2) {
    acc = (folded[i] as Op) === '+' ? acc + (folded[i + 1] as number) : acc - (folded[i + 1] as number);
  }
  return acc;
}

export const slotsOf = (equations: Equation[]): Extract<Token, { kind: 'slot' }>[] =>
  equations.flatMap((e) => e.lhs.filter((t): t is Extract<Token, { kind: 'slot' }> => t.kind === 'slot'));

function fill(equation: Equation, answer: DigitAnswer, byId: Map<number, Tile>): Array<number | Op> | null {
  const parts: Array<number | Op> = [];
  for (const t of equation.lhs) {
    if (t.kind === 'num') parts.push(t.value);
    else if (t.kind === 'op') parts.push(t.value);
    else {
      const tile = byId.get(answer[t.id]);
      if (!tile) return null;
      if (t.accepts === 'digit') {
        if (tile.kind !== 'digit') return null;
        parts.push(tile.digit!);
      } else {
        if (tile.kind !== 'op') return null;
        parts.push(tile.op!);
      }
    }
  }
  return parts;
}

/** Complete, use-once respected, and every equation true. */
export function isSolution(state: DigitState, answer: DigitAnswer): boolean {
  const slots = slotsOf(state.equations);
  const byId = new Map(state.tiles.map((t) => [t.id, t]));
  const used = new Set<number>();

  for (const slot of slots) {
    const tileId = answer[slot.id];
    if (tileId === undefined || !byId.has(tileId) || used.has(tileId)) return false;
    used.add(tileId);
  }

  return state.equations.every((eq) => {
    const parts = fill(eq, answer, byId);
    return parts !== null && evaluate(parts) === eq.target;
  });
}

/** Solutions, up to `limit`. Used to prove every generated level is solvable. */
export function solve(state: DigitState, limit = 1): DigitAnswer[] {
  const slots = slotsOf(state.equations);
  const out: DigitAnswer[] = [];
  const assign: DigitAnswer = {};
  const used = new Set<number>();

  const step = (i: number) => {
    if (out.length >= limit) return;
    if (i === slots.length) {
      if (isSolution(state, assign)) out.push({ ...assign });
      return;
    }
    for (const tile of state.tiles) {
      if (used.has(tile.id) || tile.kind !== slots[i].accepts) continue;
      used.add(tile.id);
      assign[slots[i].id] = tile.id;
      step(i + 1);
      used.delete(tile.id);
      delete assign[slots[i].id];
    }
  };

  step(0);
  return out;
}

// ---- Generation ----------------------------------------------------------

const lit = (value: Op): Token => ({ kind: 'op', value });

interface Built {
  equations: Equation[];
  digits: number[];
  ops: Op[];
}

export const digitTier = (level: number): number => Math.min(5, Math.floor((level - 1) / 2));

/** 20 s at level 1 down to an 8 s floor. */
export const digitSeconds = (level: number): number => Math.max(8, 21 - level);

/**
 * Every tier constructs a TRUE equation first and then blanks it, so a solution
 * exists by construction. `solve()` re-proves that at generation time anyway —
 * an unsolvable level under an eight-second clock would be indistinguishable
 * from a bad day, which is the worst kind of bug to ship into practice.
 */
function build(level: number, rng: Rng): Built {
  let nextSlot = 0;
  const slot = (accepts: 'digit' | 'op' = 'digit'): Token =>
    ({ kind: 'slot', id: nextSlot++, accepts });

  switch (digitTier(level)) {
    // Two-term addition.
    case 0: {
      const a = rngInt(rng, 1, 10);
      const b = rngInt(rng, 1, 10);
      return {
        equations: [{ lhs: [slot(), lit('+'), slot()], target: a + b }],
        digits: [a, b],
        ops: [],
      };
    }
    // Mixed plus and minus, the operator shown.
    case 1: {
      if (rng() < 0.5) {
        const a = rngInt(rng, 1, 10);
        const b = rngInt(rng, 1, 10);
        return { equations: [{ lhs: [slot(), lit('+'), slot()], target: a + b }], digits: [a, b], ops: [] };
      }
      const a = rngInt(rng, 3, 10);
      const b = rngInt(rng, 1, a);
      return { equations: [{ lhs: [slot(), lit('-'), slot()], target: a - b }], digits: [a, b], ops: [] };
    }
    // Three terms.
    case 2: {
      let a = 0, b = 0, c = 0;
      do {
        a = rngInt(rng, 2, 10);
        b = rngInt(rng, 2, 10);
        c = rngInt(rng, 1, 10);
      } while (a + b - c < 1);
      return {
        equations: [{ lhs: [slot(), lit('+'), slot(), lit('-'), slot()], target: a + b - c }],
        digits: [a, b, c],
        ops: [],
      };
    }
    // Multiplication enters.
    case 3: {
      if (rng() < 0.5) {
        const a = rngInt(rng, 2, 10);
        const b = rngInt(rng, 2, 10);
        return { equations: [{ lhs: [slot(), lit('*'), slot()], target: a * b }], digits: [a, b], ops: [] };
      }
      const a = rngInt(rng, 2, 8);
      const b = rngInt(rng, 2, 8);
      const c = rngInt(rng, 1, 10);
      return {
        equations: [{ lhs: [slot(), lit('*'), slot(), lit('+'), slot()], target: a * b + c }],
        digits: [a, b, c],
        ops: [],
      };
    }
    // The operator is blank too.
    case 4: {
      const op = rngPick(rng, ['+', '-', '*'] as Op[]);
      const a = op === '*' ? rngInt(rng, 2, 10) : rngInt(rng, 3, 10);
      const b = op === '-' ? rngInt(rng, 1, a) : rngInt(rng, 2, 10);
      const target = op === '+' ? a + b : op === '-' ? a - b : a * b;
      return {
        equations: [{ lhs: [slot(), slot('op'), slot()], target }],
        digits: [a, b],
        ops: [op],
      };
    }
    // Two equations, one shared bank. Spending a tile on the first costs you
    // the second, which is the actual skill here.
    default: {
      const a = rngInt(rng, 1, 10);
      const b = rngInt(rng, 1, 10);
      const c = rngInt(rng, 2, 10);
      const d = rngInt(rng, 2, 10);
      return {
        equations: [
          { lhs: [slot(), lit('+'), slot()], target: a + b },
          { lhs: [slot(), lit('*'), slot()], target: c * d },
        ],
        digits: [a, b, c, d],
        ops: [],
      };
    }
  }
}

const DISTRACTOR_DIGITS = 3;
const ALL_OPS: Op[] = ['+', '-', '*', '/'];

export const digitGame: GameEngine<DigitState, DigitAnswer> = {
  id: 'digit',
  title: 'Digit Challenge',
  blurb: 'Balance the equation from a bank of tiles. Each tile is spent when used.',
  measures:
    'Arithmetic fluency plus constrained search under time pressure. The one game here where reps genuinely move the score.',
  rules: [
    'One or two equations appear with blanks in them.',
    'Below is a bank of tiles. Drag or click a tile into a blank.',
    'Every tile can be used at most ONCE, across every equation on screen.',
    'Fill all the blanks so every equation is true, before the clock runs out.',
    'Division, where it appears, must come out exact. There are no fractions.',
  ],
  strategy: [
    'Look for the complement first. For _ + _ = 12 with {3,4,5,7,9}, scan for a pair that sums to 12 — do not try tiles in order.',
    'Use parity to eliminate. An even target from a sum needs two odds or two evens; that alone halves the bank.',
    'For a product, factorise the target before you look at the bank. 42 is 6x7 and nothing else you have.',
    'Constrain, then check. Exhaustive trial-and-error is exactly what the eight-second clock is built to punish.',
    'Pair this with zetamac (arithmetic.zetamac.com) for raw arithmetic reps — this game trains the search, not the sums.',
  ],

  generate(level, rng) {
    const built = build(level, rng);
    const digits = [
      ...built.digits,
      ...Array.from({ length: DISTRACTOR_DIGITS }, () => rngInt(rng, 1, 10)),
    ];
    const ops = built.ops.length > 0 ? ALL_OPS : [];

    const tiles: Tile[] = rngShuffle(rng, [
      ...digits.map((digit) => ({ kind: 'digit' as const, digit })),
      ...ops.map((op) => ({ kind: 'op' as const, op })),
    ]).map((t, id) => ({ id, ...t }));

    const state: DigitState = { level, equations: built.equations, tiles, seconds: digitSeconds(level) };

    if (solve(state, 1).length === 0) {
      throw new Error(`digit: generated an unsolvable level ${level}`);
    }
    return state;
  },

  check(state, answer): CheckResult {
    if (isSolution(state, answer)) {
      return { correct: true, credit: 1, note: 'Balanced.' };
    }
    const [example] = solve(state, 1);
    return {
      correct: false,
      credit: 0,
      note: example
        ? `Not balanced. One that works: ${state.equations.map((eq) => renderEquation(eq, example, state.tiles)).join('   ')}`
        : 'Not balanced.',
    };
  },

  secondsFor: digitSeconds,
};

/** Human-readable form of an equation with an assignment applied. */
export function renderEquation(equation: Equation, answer: DigitAnswer, tiles: Tile[]): string {
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const body = equation.lhs
    .map((t) => {
      if (t.kind === 'num') return String(t.value);
      if (t.kind === 'op') return OP_GLYPH[t.value];
      const tile = byId.get(answer[t.id]);
      if (!tile) return '_';
      return tile.kind === 'digit' ? String(tile.digit) : OP_GLYPH[tile.op!];
    })
    .join(' ');
  return `${body} = ${equation.target}`;
}
