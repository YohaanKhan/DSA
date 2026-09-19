import { describe, expect, it } from 'vitest';
import {
  aggregate, complexityMatches, containment, extractComplexity, isMostlyCopied,
  isRestart, scoreReview, scoreRubric, STEP_WEIGHTS, type RubricElement, type StepScore,
} from './aic';

const PROBLEM =
  'Given an integer array, return the second largest DISTINCT value. ' +
  'If fewer than two distinct values exist, return Integer.MIN_VALUE.';

describe('the anti-paste rule', () => {
  it('rejects the problem statement pasted verbatim', () => {
    expect(isMostlyCopied(PROBLEM, PROBLEM)).toBe(true);
  });

  it('rejects a paste with a thin wrapper around it', () => {
    const lazy = `Please write code for this: ${PROBLEM} Thanks!`;
    expect(isMostlyCopied(lazy, PROBLEM)).toBe(true);
  });

  it('accepts a genuinely reframed prompt that covers the same ground', () => {
    const framed =
      'Write a Java method `int secondLargest(int[] nums)`. It should scan once and keep ' +
      'track of the top two unique numbers it has seen. When the array holds fewer than two ' +
      'unique numbers, hand back Integer.MIN_VALUE. Cope with an empty array, a one-element ' +
      'array, repeated maximums and all-negative input. Aim for linear time and constant ' +
      'extra space, and tell me the complexity.';
    expect(isMostlyCopied(framed, PROBLEM)).toBe(false);
  });

  it('does not penalise a short prompt, which the rubric handles instead', () => {
    expect(isMostlyCopied('second largest distinct', PROBLEM)).toBe(false);
  });

  it('containment is asymmetric, unlike Jaccard', () => {
    const short = 'second largest distinct value';
    const long = `${PROBLEM} ${PROBLEM} ${PROBLEM}`;
    // Nearly all of the short text appears in the long one...
    expect(containment(short, long)).toBeGreaterThan(0.9);
    // ...but the long text is not mostly contained in the short one.
    expect(containment(long, short)).toBeLessThan(0.5);
  });
});

describe('scoreRubric', () => {
  const elements: RubricElement[] = [
    { id: 'language', requirement: 'Names the language', patterns: ['java'] },
    { id: 'distinct', requirement: 'Says distinct', patterns: ['distinct', 'unique'] },
    { id: 'empty', requirement: 'Mentions the empty case', patterns: ['empty', 'no elements'] },
    { id: 'complexity', requirement: 'States complexity', patterns: ['o(n)', 'linear time'] },
  ];

  it('scores full marks when every element is present', () => {
    const text = 'Java method, second largest distinct value, handle an empty array, O(n) time.';
    const result = scoreRubric(text, elements);
    expect(result.missed).toEqual([]);
    expect(result.outOfFive).toBe(5);
  });

  it('accepts any one of an element’s alternative phrasings', () => {
    const result = scoreRubric('java, unique values, no elements case, linear time', elements);
    expect(result.missed).toEqual([]);
  });

  it('reports exactly what was missed, which is the feedback that teaches', () => {
    const result = scoreRubric('A Java method returning the distinct runner-up.', elements);
    expect(result.covered).toEqual(['language', 'distinct']);
    expect(result.missed).toEqual(['empty', 'complexity']);
    expect(result.outOfFive).toBe(2.5);
  });

  it('is case and whitespace insensitive', () => {
    expect(scoreRubric('JAVA   \n  DISTINCT', elements).covered).toEqual(['language', 'distinct']);
  });

  it('scores zero for an empty answer', () => {
    expect(scoreRubric('', elements).outOfFive).toBe(0);
  });
});

describe('scoreReview', () => {
  const real: RubricElement[] = [
    { id: 'dupes', requirement: 'Duplicated maximum not handled', patterns: ['duplicate'] },
    { id: 'empty', requirement: 'Empty array not handled', patterns: ['empty'] },
  ];
  const decoys: RubricElement[] = [
    { id: 'thread', requirement: 'Claims a thread-safety problem', patterns: ['thread'] },
    { id: 'sql', requirement: 'Claims an SQL injection problem', patterns: ['sql injection'] },
  ];

  it('rewards catching the real issues', () => {
    const r = scoreReview('It mishandles a duplicate maximum and an empty array.', real, decoys);
    expect(r.outOfFive).toBe(5);
    expect(r.falsePositives).toEqual([]);
  });

  it('penalises 0.5 per invented issue, so ticking everything backfires', () => {
    const r = scoreReview(
      'Mishandles a duplicate maximum and an empty array. Also not thread safe and open to SQL injection.',
      real, decoys,
    );
    expect(r.falsePositives).toEqual(['thread', 'sql']);
    expect(r.outOfFive).toBe(4);
  });

  it('never goes below zero', () => {
    const r = scoreReview('not thread safe, sql injection', real, decoys);
    expect(r.outOfFive).toBe(0);
  });
});

describe('complexity parsing', () => {
  it('extracts a stated complexity from prose', () => {
    expect(extractComplexity('I will do one pass, so O(n) time.')).toBe('O(n)');
    expect(extractComplexity('Sorting first gives O(n log n).')).toBe('O(n log n)');
  });

  it('returns null when none is stated', () => {
    expect(extractComplexity('It will be fast.')).toBeNull();
  });

  it('matches regardless of spacing and case', () => {
    expect(complexityMatches(extractComplexity('about O( N  LOG N )'), 'O(n log n)')).toBe(true);
    expect(complexityMatches('O(n)', 'O(n log n)')).toBe(false);
    expect(complexityMatches(null, 'O(n)')).toBe(false);
  });
});

describe('isRestart', () => {
  const original =
    'Write a Java method int secondLargest(int[] nums) returning the second largest distinct ' +
    'value, handling empty and single-element arrays, in O(n) time.';

  it('flags a refine that just repeats the original prompt', () => {
    expect(isRestart(original, original)).toBe(true);
  });

  it('accepts a targeted follow-up naming the specific defect', () => {
    const targeted = 'Your version returns 7 when the array is all sevens. Make a duplicated maximum not count twice.';
    expect(isRestart(targeted, original)).toBe(false);
  });
});

describe('aggregate', () => {
  const perfect = (step: StepScore['step']): StepScore => ({ step, outOfFive: 5, covered: [], missed: [] });

  it('weights prompt and review most heavily, per the round’s own emphasis', () => {
    expect(STEP_WEIGHTS.prompt).toBeGreaterThan(STEP_WEIGHTS.frame);
    expect(STEP_WEIGHTS.review).toBeGreaterThan(STEP_WEIGHTS.plan);
    expect(Object.values(STEP_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
  });

  it('gives 100 for five perfect steps', () => {
    const total = aggregate(['frame', 'plan', 'prompt', 'review', 'refine'].map((s) => perfect(s as StepScore['step'])));
    expect(total.total).toBe(100);
    expect(total.weakestStep).toBeNull();
  });

  it('names the weakest step by weighted headroom, not raw score', () => {
    const steps: StepScore[] = [
      { step: 'frame', outOfFive: 1, covered: [], missed: [] },   // headroom 0.8 * 0.20 = 0.16
      { step: 'plan', outOfFive: 5, covered: [], missed: [] },
      { step: 'prompt', outOfFive: 2, covered: [], missed: [] },  // headroom 0.6 * 0.30 = 0.18
      { step: 'review', outOfFive: 5, covered: [], missed: [] },
      { step: 'refine', outOfFive: 5, covered: [], missed: [] },
    ];
    // Frame scored lower, but prompt is worth more, so prompt is the better fix.
    expect(aggregate(steps).weakestStep).toBe('prompt');
  });

  it('scores a skipped review heavily, since that is the step candidates skip', () => {
    const withReview = aggregate(['frame', 'plan', 'prompt', 'review', 'refine'].map((s) => perfect(s as StepScore['step'])));
    const noReview = aggregate([
      perfect('frame'), perfect('plan'), perfect('prompt'),
      { step: 'review', outOfFive: 0, covered: [], missed: [] }, perfect('refine'),
    ]);
    expect(withReview.total - noReview.total).toBeCloseTo(25, 5);
  });
});
