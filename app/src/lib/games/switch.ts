import { rngInt, rngSample } from './rng';
import type { CheckResult, GameEngine } from './types';

/**
 * Switch Challenge — deductive reasoning over a fixed operator set.
 *
 * You see a sequence of four symbols before and after, and you say which
 * operator codes did it. Unlike Grid, this one is genuinely learnable: the
 * operator table is small and fixed, and knowing it cold is most of the score.
 */

export const SHAPES = [
  'triangle', 'square', 'circle', 'diamond', 'star', 'hexagon', 'chevron', 'cross',
] as const;
export type Shape = (typeof SHAPES)[number];

export type OpCode = 1 | 2 | 3 | 4 | 5 | 6;

const next = (s: Shape): Shape => SHAPES[(SHAPES.indexOf(s) + 1) % SHAPES.length];
const swap = (xs: Shape[], i: number, j: number): Shape[] => {
  const out = xs.slice();
  [out[i], out[j]] = [out[j], out[i]];
  return out;
};

export interface OpSpec {
  code: OpCode;
  label: string;
  apply: (xs: Shape[]) => Shape[];
}

/** Positions in the labels are 1-based, because that is what the player sees. */
export const OPS: OpSpec[] = [
  { code: 1, label: 'swap 1 and 2', apply: (xs) => swap(xs, 0, 1) },
  { code: 2, label: 'swap 3 and 4', apply: (xs) => swap(xs, 2, 3) },
  { code: 3, label: 'rotate right', apply: (xs) => [xs[3], xs[0], xs[1], xs[2]] },
  { code: 4, label: 'reverse all', apply: (xs) => [...xs].reverse() },
  { code: 5, label: 'advance shape 2', apply: (xs) => xs.map((s, i) => (i === 1 ? next(s) : s)) },
  { code: 6, label: 'swap 1 and 4', apply: (xs) => swap(xs, 0, 3) },
];

const OP_BY_CODE = new Map(OPS.map((o) => [o.code, o]));

export const applyOps = (start: Shape[], codes: OpCode[]): Shape[] =>
  codes.reduce((acc, c) => OP_BY_CODE.get(c)!.apply(acc), start);

export interface SwitchState {
  level: number;
  before: Shape[];
  after: Shape[];
  /** The answer: the codes that were applied, in order. */
  applied: OpCode[];
  /** The codes on offer this level. */
  pool: OpCode[];
  seconds: number;
}

export type SwitchAnswer = OpCode[];

interface SwitchTier {
  poolSize: number;
  opCount: number;
}

/**
 * The curve in the phase plan gives two slightly different operator counts.
 * This follows the explicit curve line — 1 from 3, 1 from 6, 2 from 6, 3 from 6
 * — and stops at three, because at four operators from a pool of six almost no
 * puzzle is uniquely determined and the generator would spend its time failing.
 * Depth past level 8 comes from the shrinking clock instead.
 */
const TIERS: SwitchTier[] = [
  { poolSize: 3, opCount: 1 },
  { poolSize: 6, opCount: 1 },
  { poolSize: 6, opCount: 2 },
  { poolSize: 6, opCount: 3 },
];

export function switchTier(level: number): SwitchTier {
  if (level <= 2) return TIERS[0];
  if (level <= 4) return TIERS[1];
  if (level <= 7) return TIERS[2];
  return TIERS[3];
}

/** 30 s at level 1 down to a 15 s floor. */
export const switchSeconds = (level: number): number => Math.max(15, 32 - 2 * level);

const seqKey = (xs: Shape[]) => xs.join(',');

/** Every code sequence of exactly `len` drawn from `pool`, repeats allowed. */
export function allSequences(pool: OpCode[], len: number): OpCode[][] {
  let out: OpCode[][] = [[]];
  for (let i = 0; i < len; i++) out = out.flatMap((prefix) => pool.map((c) => [...prefix, c]));
  return out;
}

/**
 * Every code sequence of the same length that turns `before` into `after`.
 * A puzzle is only fair if this has exactly one member: the player is told how
 * many operators were applied, so same-length ambiguity is the only kind that
 * can make a correct deduction score as wrong.
 */
export const solutionsFor = (
  before: Shape[], after: Shape[], pool: OpCode[], len: number,
): OpCode[][] =>
  allSequences(pool, len).filter((seq) => seqKey(applyOps(before, seq)) === seqKey(after));

const MAX_ATTEMPTS = 400;

export const switchGame: GameEngine<SwitchState, SwitchAnswer> = {
  id: 'switch',
  title: 'Switch Challenge',
  blurb: 'Deduce which operator codes turned one symbol sequence into another.',
  measures:
    'Deductive reasoning against a fixed rule set. The most learnable of the four — the operator table is six lines long, and knowing it cold is most of the score.',
  rules: [
    'You see four symbols before, and the same four after an operator was applied.',
    'The operator table is on screen throughout. Nothing is hidden.',
    'Pick the codes that were applied, in the order they were applied.',
    'You are told how many operators ran. Every puzzle has exactly one answer of that length — verified by brute force when it was generated.',
    'Submit before the clock runs out.',
  ],
  strategy: [
    'Work backwards from the result, not forwards from the start. The result is the evidence.',
    'Find a position that did not move and eliminate every operator that would have moved it. One glance usually kills half the table.',
    'On multi-operator levels, identify the LAST operator first — it explains the most visible difference.',
    'Learn the operator table until you no longer re-derive it. Re-deriving six rules under a 15-second clock is where the time goes.',
  ],

  generate(level, rng) {
    const tier = switchTier(level);
    const pool = OPS.slice(0, tier.poolSize).map((o) => o.code);
    const seconds = switchSeconds(level);

    for (let opCount = tier.opCount; opCount >= 1; opCount--) {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const before = rngSample(rng, SHAPES, 4) as Shape[];
        const applied = Array.from({ length: opCount }, () => pool[rngInt(rng, 0, pool.length)]);
        const after = applyOps(before, applied);
        // A puzzle whose result equals its start tells the player nothing.
        if (seqKey(after) === seqKey(before)) continue;
        if (solutionsFor(before, after, pool, opCount).length !== 1) continue;
        return { level, before, after, applied, pool, seconds };
      }
      // Dropping to one fewer operator keeps the level honest: the UI asks for
      // exactly `applied.length` codes, so a shorter puzzle is stated as such
      // rather than pretending to a difficulty it could not generate.
    }

    throw new Error(`switch: no uniquely determined puzzle for level ${level}`);
  },

  check(state, answer): CheckResult {
    const right =
      answer.length === state.applied.length && answer.every((c, i) => c === state.applied[i]);
    const names = state.applied.map((c) => `${c} (${OP_BY_CODE.get(c)!.label})`).join(' then ');
    return {
      correct: right,
      credit: right ? 1 : 0,
      note: right ? `Correct: ${names}.` : `It was ${names}.`,
    };
  },

  secondsFor: switchSeconds,
};
