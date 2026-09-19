import { describe, expect, it } from 'vitest';
import { rebalanceAnswers } from './generate';

/**
 * The rebalancer is the piece that runs on every generated batch, so it is
 * tested without touching the API. Models have a strong positional bias
 * (usually toward B and C); re-prompting does not fix it, permuting does.
 */

type TestItem = {
  id: string;
  options: { id: string; text: string }[];
  answer: string;
  distractorRationale: Record<string, string>;
};

const makeItem = (id: string, answer: string): TestItem => ({
  id,
  options: [
    { id: 'a', text: 'alpha' },
    { id: 'b', text: 'bravo' },
    { id: 'c', text: 'charlie' },
    { id: 'd', text: 'delta' },
  ],
  answer,
  distractorRationale: { a: 'why alpha', b: 'why bravo', c: 'why charlie', d: 'why delta' },
});

const correctTextOf = (item: TestItem) => item.options.find((o) => o.id === item.answer)!.text;

describe('rebalanceAnswers', () => {
  it('spreads a fully skewed batch across all four letters', () => {
    const skewed = Array.from({ length: 20 }, (_, i) => makeItem(`q${i}`, 'b'));
    const balanced = rebalanceAnswers(skewed);

    const counts: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    for (const item of balanced) counts[item.answer]++;

    for (const letter of ['a', 'b', 'c', 'd']) {
      const share = counts[letter] / balanced.length;
      expect(share, `letter ${letter} share`).toBeGreaterThanOrEqual(0.15);
      expect(share, `letter ${letter} share`).toBeLessThanOrEqual(0.35);
    }
  });

  it('preserves which text is actually correct', () => {
    const skewed = Array.from({ length: 12 }, (_, i) => makeItem(`q${i}`, 'c'));
    const balanced = rebalanceAnswers(skewed);
    for (const item of balanced) {
      // 'charlie' was correct before; it must still be correct after permuting.
      expect(correctTextOf(item)).toBe('charlie');
    }
  });

  it('keeps all four option texts, without duplication or loss', () => {
    const balanced = rebalanceAnswers([makeItem('q1', 'd')]);
    const texts = balanced[0].options.map((o) => o.text).sort();
    expect(texts).toEqual(['alpha', 'bravo', 'charlie', 'delta']);
    expect(balanced[0].options.map((o) => o.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('moves each distractor rationale with its option', () => {
    const balanced = rebalanceAnswers([makeItem('q1', 'a')]);
    const item = balanced[0];
    for (const option of item.options) {
      if (option.id === item.answer) {
        // The correct option carries no "why this is tempting" note.
        expect(item.distractorRationale[option.id]).toBeUndefined();
        continue;
      }
      expect(item.distractorRationale[option.id]).toBe(`why ${option.text}`);
    }
  });

  it('leaves malformed items untouched rather than corrupting them', () => {
    const broken = [
      { id: 'x', options: [{ id: 'a', text: 'only one' }], answer: 'a' },
      { id: 'y', answer: 'b' },
    ];
    expect(rebalanceAnswers(broken)).toEqual(broken);
  });

  it('is deterministic for the same input', () => {
    const input = Array.from({ length: 8 }, (_, i) => makeItem(`q${i}`, 'b'));
    expect(rebalanceAnswers(input)).toEqual(rebalanceAnswers(input));
  });
});
