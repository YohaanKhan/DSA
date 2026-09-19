import { describe, expect, it } from 'vitest';
import { MAX_INTERVAL_DAYS, NEW_CARD, qualityFrom, schedule } from './sm2';

const T0 = new Date('2026-09-19T00:00:00Z');
const days = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86_400_000);

describe('qualityFrom', () => {
  it('scores a fast, confident, correct answer highest', () => {
    expect(qualityFrom({ correct: true, confidence: 'high', timeMs: 30_000, targetMs: 45_000 })).toBe(5);
  });

  it('scores a slow but confident correct answer slightly lower', () => {
    expect(qualityFrom({ correct: true, confidence: 'high', timeMs: 90_000, targetMs: 45_000 })).toBe(4);
  });

  it('scores a CORRECT but guessed answer as 3, so it still gets reviewed', () => {
    // The whole point: a lucky guess must not read as knowledge.
    expect(qualityFrom({ correct: true, confidence: 'low', timeMs: 10_000, targetMs: 45_000 })).toBe(3);
  });

  it('scores a wrong answer as a lapse, and lower still when hints were used', () => {
    expect(qualityFrom({ correct: false, confidence: 'high', timeMs: 10_000, targetMs: 45_000 })).toBe(1);
    expect(qualityFrom({ correct: false, timeMs: 10_000, targetMs: 45_000, hintsUsed: 2 })).toBe(2);
  });
});

describe('schedule', () => {
  it('a guessed-but-correct answer still schedules a review', () => {
    const next = schedule(NEW_CARD, 3, T0);
    expect(next.repetitions).toBe(1);
    expect(days(T0, next.dueAt)).toBe(1);
  });

  it('never exceeds the three-day cap, however well you do', () => {
    let card = { ...NEW_CARD };
    let due = T0;
    for (let i = 0; i < 10; i++) {
      const next = schedule(card, 5, T0);
      card = next;
      due = next.dueAt;
      expect(card.intervalDays).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
    }
    // Nothing learned on day 1 can go unreviewed before a day-7 exam.
    expect(days(T0, due)).toBeLessThanOrEqual(MAX_INTERVAL_DAYS);
  });

  it('a lapse resets repetitions and brings the card back tomorrow', () => {
    const good = schedule(schedule(NEW_CARD, 5, T0), 5, T0);
    expect(good.repetitions).toBe(2);

    const lapsed = schedule(good, 1, T0);
    expect(lapsed.repetitions).toBe(0);
    expect(lapsed.lapses).toBe(1);
    expect(days(T0, lapsed.dueAt)).toBe(1);
  });

  it('ease factor falls on poor recall but never below the floor', () => {
    let card = { ...NEW_CARD };
    for (let i = 0; i < 20; i++) card = schedule(card, 0, T0);
    expect(card.easeFactor).toBeGreaterThanOrEqual(1.3);
    expect(card.easeFactor).toBeCloseTo(1.3, 5);
  });

  it('ease factor rises on strong recall', () => {
    const next = schedule(NEW_CARD, 5, T0);
    expect(next.easeFactor).toBeGreaterThan(NEW_CARD.easeFactor);
  });
});
