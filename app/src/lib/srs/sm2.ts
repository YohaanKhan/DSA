/**
 * SM-2 spaced repetition, compressed for a one-week sprint.
 *
 * Vanilla SM-2 grows intervals to weeks, which is useless when the exam is on
 * day 7 — anything learned on day 1 would go unreviewed. MAX_INTERVAL_DAYS caps
 * the schedule so every item comes back at least once before the exam.
 * See plan/07-SCORING-AND-ANALYTICS.md §8.
 */

export const MAX_INTERVAL_DAYS = 3;
export const MIN_EASE_FACTOR = 1.3;

export interface CardState {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

export const NEW_CARD: CardState = {
  easeFactor: 2.5,
  intervalDays: 0,
  repetitions: 0,
  lapses: 0,
};

export interface ReviewOutcome {
  correct: boolean;
  /** 'low' means you guessed. A lucky guess is not knowledge. */
  confidence?: 'high' | 'low' | null;
  timeMs: number;
  targetMs: number;
  hintsUsed?: number;
}

/**
 * Derives an SM-2 quality score (0-5) from how the answer actually went.
 *
 * The important case is a CORRECT answer given with low confidence: it scores 3,
 * which still schedules a review. Without that, a bank of lucky guesses would
 * read as mastery and you would stop studying something you do not know.
 */
export function qualityFrom({ correct, confidence, timeMs, targetMs, hintsUsed = 0 }: ReviewOutcome): number {
  if (!correct) return hintsUsed > 0 ? 2 : 1;
  if (confidence === 'low') return 3;
  return timeMs <= targetMs ? 5 : 4;
}

/** Advances a card. Returns the new state plus when it is next due. */
export function schedule(card: CardState, quality: number, now: Date = new Date()): CardState & { dueAt: Date } {
  let { easeFactor, intervalDays, repetitions, lapses } = card;

  if (quality < 3) {
    // A lapse resets the ladder: you see it again tomorrow.
    repetitions = 0;
    intervalDays = 1;
    lapses += 1;
  } else {
    repetitions += 1;
    if (repetitions === 1) intervalDays = 1;
    else if (repetitions === 2) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
  }

  easeFactor = Math.max(
    MIN_EASE_FACTOR,
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  intervalDays = Math.min(intervalDays, MAX_INTERVAL_DAYS);

  const dueAt = new Date(now.getTime() + intervalDays * 86_400_000);
  return { easeFactor, intervalDays, repetitions, lapses, dueAt };
}
