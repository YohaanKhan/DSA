/**
 * Debugging score. See plan/07-SCORING-AND-ANALYTICS.md §3.
 *
 *   score = passed ? clamp(0.60 + 0.20*time + 0.20*minimality - 0.10*hints, 0, 1) : 0
 *
 * Minimality is scored because the exam hands you working code with one defect.
 * Rewriting the function may pass the tests but is the wrong reflex under a
 * 20-minute clock — and in the interview you will be asked what you changed.
 */

export interface DebugOutcome {
  passed: boolean;
  elapsedMs: number;
  limitMs: number;
  hintsUsed: number;
  /** Lines your fix touched. */
  changedLines: number;
  /** Lines the minimal fix touches — 1 for an injected exercise. */
  idealLines: number;
  /** Whether you named the right bug family BEFORE editing. */
  hypothesisCorrect: boolean;
}

export interface DebugScore {
  score: number;
  timeScore: number;
  minimality: number;
  hintPenalty: number;
}

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

export function scoreDebug(o: DebugOutcome): DebugScore {
  const timeScore = clamp(1 - o.elapsedMs / Math.max(1, o.limitMs));
  const minimality = clamp(1 - (o.changedLines - o.idealLines) / 10);
  const hintPenalty = 0.1 * o.hintsUsed;

  return {
    score: o.passed ? clamp(0.6 + 0.2 * timeScore + 0.2 * minimality - hintPenalty) : 0,
    timeScore,
    minimality,
    hintPenalty,
  };
}

/** Line-level diff count, ignoring pure whitespace changes. */
export function changedLineCount(before: string, after: string): number {
  const a = before.split('\n').map((l) => l.trim());
  const b = after.split('\n').map((l) => l.trim());
  const max = Math.max(a.length, b.length);
  let changed = 0;
  for (let i = 0; i < max; i++) if ((a[i] ?? '') !== (b[i] ?? '')) changed++;
  return changed;
}

/** Hints cost score, so they are worth showing the price of before unlocking. */
export const HINT_COST = 0.1;
/** Struggling for eight minutes IS the training; hints unlock after that. */
export const HINT_UNLOCK_MS = 8 * 60 * 1000;
