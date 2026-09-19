import { describe, expect, it } from 'vitest';
import {
  PLATEAU_MIN_RUNS, PLATEAU_SLOPE_FRACTION, detectPlateau, gameScore, levelReward,
} from './games';

describe('levelReward', () => {
  it('is level squared over seconds', () => {
    expect(levelReward(4, 8)).toBeCloseTo(2);
    expect(levelReward(2, 8)).toBeCloseTo(0.5);
  });

  it('makes depth worth more than speed at a shallow level', () => {
    // The squared numerator is the whole strategic point: twice the level for
    // twice the time is worth TWICE as much, not the same. Pushing deeper beats
    // farming an easy level quickly, and the run screen says so live.
    expect(levelReward(6, 12)).toBeCloseTo(levelReward(3, 6) * 2);
    expect(levelReward(6, 12)).toBeGreaterThan(levelReward(3, 4));
  });

  it('scales by credit, which is how minimality is priced', () => {
    expect(levelReward(5, 10, 0.8)).toBeCloseTo(levelReward(5, 10) * 0.8);
    expect(levelReward(5, 10, 0)).toBe(0);
  });

  it('refuses to return Infinity for an impossibly fast clear', () => {
    expect(Number.isFinite(levelReward(3, 0))).toBe(true);
    expect(levelReward(3, 0)).toBe(levelReward(3, 0.5));
  });
});

describe('gameScore', () => {
  it('sums the levels completed', () => {
    const timings = [
      { level: 1, seconds: 5, credit: 1 },
      { level: 2, seconds: 5, credit: 1 },
      { level: 3, seconds: 5, credit: 1 },
    ];
    expect(gameScore(timings)).toBeCloseTo((1 + 4 + 9) / 5);
  });

  it('is zero for a run that cleared nothing', () => {
    expect(gameScore([])).toBe(0);
  });
});

describe('detectPlateau', () => {
  const flat = Array.from({ length: 10 }, () => 20);
  const rising = Array.from({ length: 10 }, (_, i) => 10 + i * 3);

  it('withholds a verdict until there are enough runs', () => {
    const verdict = detectPlateau(Array.from({ length: PLATEAU_MIN_RUNS - 1 }, () => 20));
    expect(verdict.plateaued).toBe(false);
    expect(verdict.message).toContain('1 more run');
  });

  it('fires on eight flat runs', () => {
    const verdict = detectPlateau(flat.slice(0, PLATEAU_MIN_RUNS));
    expect(verdict.plateaued).toBe(true);
    expect(verdict.runs).toBe(PLATEAU_MIN_RUNS);
    expect(verdict.slope).toBeCloseTo(0);
    expect(verdict.message).toContain('low value');
  });

  it('does not fire while you are still improving', () => {
    const verdict = detectPlateau(rising);
    expect(verdict.plateaued).toBe(false);
    expect(verdict.slope).toBeCloseTo(3);
    expect(verdict.message).toContain('Still improving');
  });

  it('fires on a decline — getting worse is not progress', () => {
    expect(detectPlateau([...rising].reverse()).plateaued).toBe(true);
  });

  it('judges the threshold relative to the mean, not absolutely', () => {
    // The same absolute slope reads as progress on small scores and as noise on
    // large ones, which is the point of a relative threshold.
    const gentle = Array.from({ length: 10 }, (_, i) => 5 + i * 0.5);
    const same = Array.from({ length: 10 }, (_, i) => 500 + i * 0.5);
    expect(detectPlateau(gentle).plateaued).toBe(false);
    expect(detectPlateau(same).plateaued).toBe(true);
  });

  it('only looks at the last ten runs', () => {
    const stale = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, ...flat];
    const verdict = detectPlateau(stale);
    expect(verdict.runs).toBe(10);
    expect(verdict.mean).toBeCloseTo(20);
    expect(verdict.plateaued).toBe(true);
  });

  it('uses the documented two-percent-of-mean threshold', () => {
    const mean = 100;
    const belowLine = Array.from({ length: 10 }, (_, i) => mean + i * PLATEAU_SLOPE_FRACTION * mean * 0.5);
    const aboveLine = Array.from({ length: 10 }, (_, i) => mean + i * PLATEAU_SLOPE_FRACTION * mean * 2);
    expect(detectPlateau(belowLine).plateaued).toBe(true);
    expect(detectPlateau(aboveLine).plateaued).toBe(false);
  });
});
