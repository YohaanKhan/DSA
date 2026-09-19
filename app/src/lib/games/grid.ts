import { rngInt, rngPick, rngSample, type Rng } from './rng';
import type { CheckResult, GameEngine } from './types';

/**
 * Grid Challenge — visuospatial working memory under interference.
 *
 * Memorise dot positions, then do something else entirely for a few seconds,
 * then reproduce the dots. The interference phase is the whole point: holding a
 * pattern while your attention is elsewhere is the thing being measured, and it
 * is why "just stare at it" does not transfer.
 */

export type InterferenceKind = 'symmetry' | 'rotation';

export interface InterferenceTask {
  kind: InterferenceKind;
  /** Drawn on its own small grid, deliberately a different size to the memory grid. */
  size: number;
  a: number[];
  /** The comparison shape. Only present for 'rotation'. */
  b: number[] | null;
  question: string;
  /** The true yes/no answer, proven by construction and re-checked below. */
  answer: boolean;
}

export interface GridState {
  level: number;
  n: number;
  /** Lit cell indices, ascending. */
  dots: number[];
  interference: InterferenceTask;
  memoriseMs: number;
  interferenceMs: number;
  recallMs: number;
}

export interface GridAnswer {
  cells: number[];
  /** null when the interference phase ran out before an answer was given. */
  interference: boolean | null;
}

interface GridTier {
  n: number;
  k: number;
  memoriseMs: number;
  interferenceMs: number;
  recallMs: number;
}

/** plan/phases/PHASE-04-cognitive-arcade.md, one tier per two levels. */
const TIERS: GridTier[] = [
  { n: 4, k: 3, memoriseMs: 4000, interferenceMs: 3000, recallMs: 12_000 },
  { n: 4, k: 4, memoriseMs: 3500, interferenceMs: 3000, recallMs: 12_000 },
  { n: 5, k: 4, memoriseMs: 3000, interferenceMs: 4000, recallMs: 11_000 },
  { n: 5, k: 5, memoriseMs: 3000, interferenceMs: 4000, recallMs: 11_000 },
  { n: 6, k: 5, memoriseMs: 2500, interferenceMs: 5000, recallMs: 10_000 },
  { n: 6, k: 6, memoriseMs: 2000, interferenceMs: 5000, recallMs: 10_000 },
];

export const gridTier = (level: number): GridTier =>
  TIERS[Math.min(TIERS.length - 1, Math.max(0, Math.floor((level - 1) / 2)))];

const INTERFERENCE_SIZE = 5;

// ---- Shape geometry ------------------------------------------------------

const rowOf = (i: number, size: number) => Math.floor(i / size);
const colOf = (i: number, size: number) => i % size;
const idxOf = (r: number, c: number, size: number) => r * size + c;
const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);

/** Reflection in the vertical centre line. */
export const mirrorVertical = (cells: number[], size: number): number[] =>
  sorted(cells.map((i) => idxOf(rowOf(i, size), size - 1 - colOf(i, size), size)));

/** Quarter turn clockwise. */
export const rotate90 = (cells: number[], size: number): number[] =>
  sorted(cells.map((i) => idxOf(colOf(i, size), size - 1 - rowOf(i, size), size)));

function sameSet(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const bs = sorted(b);
  return sorted(a).every((v, i) => v === bs[i]);
}

export const isVerticallySymmetric = (cells: number[], size: number): boolean =>
  sameSet(cells, mirrorVertical(cells, size));

/**
 * True if `b` is `a` turned by 90, 180 or 270 degrees. The identity is
 * deliberately excluded: "it is the same picture" is not a rotation challenge,
 * and generation never produces an identical pair.
 */
export function isRotationOf(a: number[], b: number[], size: number): boolean {
  let r = a;
  for (let turn = 0; turn < 3; turn++) {
    r = rotate90(r, size);
    if (sameSet(r, b)) return true;
  }
  return false;
}

/** One cell moved to a free cell — the smallest edit that can break a property. */
function nudge(cells: number[], size: number, rng: Rng): number[] {
  const free: number[] = [];
  for (let i = 0; i < size * size; i++) if (!cells.includes(i)) free.push(i);
  if (free.length === 0) return cells;
  const drop = rngPick(rng, cells);
  const add = rngPick(rng, free);
  return sorted([...cells.filter((c) => c !== drop), add]);
}

function symmetricShape(size: number, rng: Rng): number[] {
  const half: number[] = [];
  for (let r = 0; r < size; r++) for (let c = 0; c <= Math.floor(size / 2); c++) half.push(idxOf(r, c, size));
  const picked = rngSample(rng, half, rngInt(rng, 3, 5));
  return sorted([...new Set([...picked, ...mirrorVertical(picked, size)])]);
}

function freeShape(size: number, rng: Rng): number[] {
  const all = Array.from({ length: size * size }, (_, i) => i);
  return sorted(rngSample(rng, all, rngInt(rng, 4, 7)));
}

/**
 * Both kinds are built so the answer is known, then the answer is re-derived
 * from the geometry. A generator that merely *believes* its own answer is how
 * you end up training on wrong feedback.
 */
function interferenceTask(rng: Rng): InterferenceTask {
  const size = INTERFERENCE_SIZE;
  const wantYes = rng() < 0.5;

  if (rng() < 0.5) {
    let a = wantYes ? symmetricShape(size, rng) : nudge(symmetricShape(size, rng), size, rng);
    // A nudge can land on the mirror of the cell it left, restoring symmetry.
    for (let i = 0; !wantYes && isVerticallySymmetric(a, size) && i < 12; i++) a = nudge(a, size, rng);
    return {
      kind: 'symmetry',
      size,
      a,
      b: null,
      question: 'Is this shape symmetric about the vertical centre line?',
      answer: isVerticallySymmetric(a, size),
    };
  }

  const a = freeShape(size, rng);
  let b = rotate90(a, size);
  const turns = rngInt(rng, 0, 3);
  for (let t = 0; t < turns; t++) b = rotate90(b, size);
  if (!wantYes) {
    for (let i = 0; i < 12 && (isRotationOf(a, b, size) || sameSet(a, b)); i++) b = nudge(b, size, rng);
  }
  return {
    kind: 'rotation',
    size,
    a,
    b,
    question: 'Is the right-hand shape the left-hand shape rotated by 90, 180 or 270 degrees?',
    answer: isRotationOf(a, b, size),
  };
}

// ---- Engine --------------------------------------------------------------

/**
 * Getting the interference question wrong costs 15% of the level's reward, and
 * never blocks the level. That asymmetry is the lesson: the recall is what is
 * scored, so answer the interference task fast and move on — but do answer it.
 * Ignoring it entirely would otherwise be the dominant strategy, which the real
 * assessment does not reward.
 */
const INTERFERENCE_PENALTY = 0.15;

export const gridGame: GameEngine<GridState, GridAnswer> = {
  id: 'grid',
  title: 'Grid Challenge',
  blurb: 'Hold a dot pattern in mind while something else demands your attention.',
  measures:
    'Visuospatial working memory under interference. This is closer to a trait than a skill — you can learn the rules and a chunking strategy, but you will hit a ceiling, and the app will tell you when.',
  rules: [
    'A grid appears with several cells lit. Memorise them.',
    'The grid vanishes and a shape question takes its place. Answer it yes or no.',
    'A blank grid returns. Click every cell that was lit.',
    'You must get ALL of them, exactly. There is no partial credit for the recall.',
    'A wrong shape answer costs 15% of the level, but never fails it.',
  ],
  strategy: [
    'Chunk the dots into a shape — "an L in the top-left, one stray on the right" — instead of storing four separate coordinates.',
    'Say the row numbers to yourself. A verbal trace survives a visual distraction far better than a visual one does.',
    'Rehearse during the shape question rather than staring at it. The question is the interference; treat it as background noise you answer quickly.',
    'Always answer the shape question, even by guessing. Dwelling on it is what destroys the pattern.',
  ],

  generate(level, rng) {
    const tier = gridTier(level);
    const all = Array.from({ length: tier.n * tier.n }, (_, i) => i);
    return {
      level,
      n: tier.n,
      dots: sorted(rngSample(rng, all, tier.k)),
      interference: interferenceTask(rng),
      memoriseMs: tier.memoriseMs,
      interferenceMs: tier.interferenceMs,
      recallMs: tier.recallMs,
    };
  },

  check(state, answer): CheckResult {
    const exact = sameSet(answer.cells, state.dots);
    const interferenceOk = answer.interference === state.interference.answer;
    const missed = state.dots.filter((d) => !answer.cells.includes(d)).length;
    const spurious = answer.cells.filter((c) => !state.dots.includes(c)).length;

    return {
      correct: exact,
      credit: exact ? (interferenceOk ? 1 : 1 - INTERFERENCE_PENALTY) : 0,
      note: exact
        ? interferenceOk
          ? 'Exact recall, shape question right.'
          : `Exact recall, but the shape question was ${state.interference.answer ? 'yes' : 'no'} — that cost ${INTERFERENCE_PENALTY * 100}%.`
        : `${missed} cell${missed === 1 ? '' : 's'} missed, ${spurious} wrong. The recall has to be exact.`,
    };
  },

  secondsFor: (level) => Math.round(gridTier(level).recallMs / 1000),
};
