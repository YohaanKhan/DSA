import { describe, expect, it } from 'vitest';
import { changedLineCount, scoreDebug } from './debug';

const base = {
  passed: true,
  elapsedMs: 0,
  limitMs: 1_200_000,
  hintsUsed: 0,
  changedLines: 1,
  idealLines: 1,
  hypothesisCorrect: true,
};

describe('scoreDebug', () => {
  it('scores zero when the tests do not pass, however fast and minimal', () => {
    expect(scoreDebug({ ...base, passed: false, elapsedMs: 0 }).score).toBe(0);
  });

  it('gives a near-perfect score for an instant minimal fix', () => {
    expect(scoreDebug(base).score).toBeCloseTo(1.0, 2);
  });

  it('never drops below the 0.60 base for a passing fix without hints', () => {
    const slowAndSprawling = scoreDebug({
      ...base, elapsedMs: 1_200_000, changedLines: 40,
    });
    expect(slowAndSprawling.score).toBeCloseTo(0.6, 2);
  });

  it('penalises a sprawling rewrite versus a surgical fix', () => {
    const surgical = scoreDebug({ ...base, elapsedMs: 300_000, changedLines: 1 });
    const rewrite = scoreDebug({ ...base, elapsedMs: 300_000, changedLines: 15 });
    expect(surgical.score).toBeGreaterThan(rewrite.score);
    expect(rewrite.minimality).toBe(0);
  });

  it('charges 0.10 per hint', () => {
    const none = scoreDebug(base).score;
    const two = scoreDebug({ ...base, hintsUsed: 2 }).score;
    expect(none - two).toBeCloseTo(0.2, 5);
  });

  it('clamps to [0, 1] even with every hint used', () => {
    const s = scoreDebug({ ...base, hintsUsed: 4, elapsedMs: 1_200_000, changedLines: 50 });
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(1);
  });
});

describe('changedLineCount', () => {
  it('counts a one-line edit as one', () => {
    expect(changedLineCount('a\nb\nc', 'a\nX\nc')).toBe(1);
  });

  it('ignores indentation-only changes', () => {
    expect(changedLineCount('a\n  b', 'a\n        b')).toBe(0);
  });

  it('counts added lines', () => {
    expect(changedLineCount('a\nb', 'a\nb\nc\nd')).toBe(2);
  });

  it('is zero for an identical program', () => {
    expect(changedLineCount('int x;\nreturn 0;', 'int x;\nreturn 0;')).toBe(0);
  });
});
