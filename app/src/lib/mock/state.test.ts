import { describe, expect, it } from 'vitest';
import { evaluateGates, isExpired, remainingMs, type SectionState } from './state';
import type { MockSection } from '@/lib/config/exam-profiles';

const section = (over: Partial<MockSection> = {}): MockSection => ({
  id: 's1', label: 'Section', stage: 'technical', kind: 'mcq',
  count: 10, minutes: 10, passMark: 0.6, eliminatory: true, instructions: '',
  ...over,
});

const state = (over: Partial<SectionState> = {}): SectionState => ({
  id: 's1', itemIds: [], startedAt: null, finishedAt: null, score: null, skipped: false, ...over,
});

const T0 = 1_000_000_000_000;

describe('remainingMs', () => {
  it('returns the full budget before the section starts', () => {
    expect(remainingMs(section({ minutes: 10 }), state(), T0)).toBe(600_000);
  });

  it('counts down from the wall clock, so a crash cannot buy time back', () => {
    const s = state({ startedAt: T0 });
    expect(remainingMs(section({ minutes: 10 }), s, T0 + 240_000)).toBe(360_000);
    // Reopening five minutes later shows the truth, not a paused timer.
    expect(remainingMs(section({ minutes: 10 }), s, T0 + 540_000)).toBe(60_000);
  });

  it('never goes negative', () => {
    expect(remainingMs(section({ minutes: 10 }), state({ startedAt: T0 }), T0 + 9_999_999)).toBe(0);
  });

  it('treats a finished section as having no time left', () => {
    expect(remainingMs(section(), state({ startedAt: T0, finishedAt: T0 + 1000 }), T0 + 2000)).toBe(0);
  });

  it('reports an untimed section as infinite', () => {
    expect(remainingMs(section({ minutes: 0 }), state({ startedAt: T0 }), T0 + 10_000_000)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('isExpired', () => {
  it('is false before the section is opened, even long after creation', () => {
    expect(isExpired(section({ minutes: 5 }), state(), T0 + 99_999_999)).toBe(false);
  });

  it('is true once the budget is spent', () => {
    expect(isExpired(section({ minutes: 5 }), state({ startedAt: T0 }), T0 + 300_001)).toBe(true);
  });
});

describe('evaluateGates', () => {
  const sections = [
    section({ id: 'a', label: 'English', passMark: 0.6, eliminatory: true }),
    section({ id: 'b', label: 'Technical', passMark: 0.6, eliminatory: true }),
    section({ id: 'c', label: 'AI Coding', passMark: 0.5, eliminatory: false }),
  ];

  it('passes when every eliminatory section clears its mark', () => {
    const verdict = evaluateGates(sections, [
      state({ id: 'a', score: 0.8 }), state({ id: 'b', score: 0.7 }), state({ id: 'c', score: 0.2 }),
    ]);
    expect(verdict.wouldProgress).toBe(true);
    expect(verdict.failedAt).toBeNull();
  });

  it('reports the FIRST failed gate, since that is where the real process would end', () => {
    const verdict = evaluateGates(sections, [
      state({ id: 'a', score: 0.3 }), state({ id: 'b', score: 0.2 }), state({ id: 'c', score: 0.9 }),
    ]);
    expect(verdict.failedAt).toBe('a');
    expect(verdict.failedLabel).toBe('English');
    expect(verdict.wouldProgress).toBe(false);
  });

  it('ignores a weak non-eliminatory section', () => {
    const verdict = evaluateGates(sections, [
      state({ id: 'a', score: 0.9 }), state({ id: 'b', score: 0.9 }), state({ id: 'c', score: 0 }),
    ]);
    expect(verdict.wouldProgress).toBe(true);
  });

  it('ignores sections that were skipped or never scored', () => {
    const verdict = evaluateGates(sections, [
      state({ id: 'a', score: null }),
      state({ id: 'b', score: 0, skipped: true }),
      state({ id: 'c', score: 0.9 }),
    ]);
    expect(verdict.wouldProgress).toBe(true);
  });

  it('treats exactly meeting the pass mark as a pass', () => {
    const verdict = evaluateGates([section({ id: 'a', passMark: 0.6 })], [state({ id: 'a', score: 0.6 })]);
    expect(verdict.wouldProgress).toBe(true);
  });
});
