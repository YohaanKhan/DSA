import type { MCQItem, TraceItem } from '@/lib/content/schemas';
import { normaliseOutput } from '@/lib/content/validate';

/** Grading for the MCQ engine and the Trace Lab. Always runs server-side. */

export interface GradeResult {
  correct: boolean;
  /** The correct option id, or the expected output for an exact-match trace. */
  answer: string;
  explanation: string;
  distractorRationale?: Record<string, string>;
}

export function gradeMcq(item: MCQItem, response: unknown): GradeResult {
  const picked = typeof response === 'string' ? response : null;
  return {
    correct: picked === item.answer,
    answer: item.answer,
    explanation: item.explanation,
    distractorRationale: item.distractorRationale,
  };
}

/**
 * Trace answers are compared whitespace-normalised but otherwise exactly.
 * No partial credit: the real exam is multiple choice, and "nearly right"
 * output is wrong output.
 */
export function gradeTrace(item: TraceItem, response: unknown): GradeResult {
  const given = typeof response === 'string' ? response : '';
  const correct =
    item.answerMode === 'exact'
      ? normaliseOutput(given) === normaliseOutput(item.answer)
      : given === item.answer;
  return { correct, answer: item.answer, explanation: item.explanation };
}

export interface SessionStats {
  attempted: number;
  correct: number;
  /** Correct answers the user flagged as a guess. */
  luckyGuesses: number;
  accuracy: number;
  /** Accuracy with lucky guesses discounted by half — what you actually know. */
  trueKnown: number;
  meanTimeMs: number;
  /** Mean time as a fraction of the budget. Below 1 means you are inside it. */
  paceFactor: number;
}

export function summarise(
  rows: { correct: boolean | null; confidence: string | null; timeMs: number; targetSeconds: number }[],
): SessionStats {
  const attempted = rows.length;
  if (attempted === 0) {
    return { attempted: 0, correct: 0, luckyGuesses: 0, accuracy: 0, trueKnown: 0, meanTimeMs: 0, paceFactor: 0 };
  }

  const correct = rows.filter((r) => r.correct).length;
  const luckyGuesses = rows.filter((r) => r.correct && r.confidence === 'low').length;
  const totalTime = rows.reduce((sum, r) => sum + r.timeMs, 0);
  const totalBudget = rows.reduce((sum, r) => sum + r.targetSeconds * 1000, 0);

  return {
    attempted,
    correct,
    luckyGuesses,
    accuracy: correct / attempted,
    trueKnown: Math.max(0, (correct - luckyGuesses * 0.5) / attempted),
    meanTimeMs: totalTime / attempted,
    paceFactor: totalBudget > 0 ? totalTime / totalBudget : 0,
  };
}
