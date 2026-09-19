/**
 * Arcade scoring and — the part that actually matters — plateau detection.
 *
 * See plan/07-SCORING-AND-ANALYTICS.md §7.
 */

export interface LevelTiming {
  level: number;
  seconds: number;
  /** 0..1. Below 1 only where a game grades quality, as Motion grades minimality. */
  credit: number;
}

/**
 * reward = level^2 / secondsAtLevel
 *
 * The square is the interesting bit: depth is worth far more than speed at a
 * shallow level, so the right play is to push deeper rather than to farm level 3
 * quickly. The run screen surfaces this live, because nobody derives it mid-run.
 */
export function levelReward(level: number, seconds: number, credit = 1): number {
  // A level cleared in under half a second is a misread clock, not brilliance.
  const safeSeconds = Math.max(0.5, seconds);
  return (credit * level * level) / safeSeconds;
}

export const gameScore = (timings: LevelTiming[]): number =>
  timings.reduce((sum, t) => sum + levelReward(t.level, t.seconds, t.credit), 0);

// ---- Plateau -------------------------------------------------------------

export const PLATEAU_WINDOW = 10;
export const PLATEAU_MIN_RUNS = 8;
export const PLATEAU_SLOPE_FRACTION = 0.02;
/** What a plateaued stage's dashboard weight drops to. */
export const PLATEAU_STAGE_WEIGHT = 0.3;

export interface PlateauVerdict {
  plateaued: boolean;
  /** How many runs the verdict is based on. */
  runs: number;
  /** Score gained per run, from a least-squares fit. */
  slope: number;
  mean: number;
  best: number;
  message: string;
}

/**
 * Fit `score ~ a + b·run` over the last ten runs; call it a plateau when the
 * slope is under 2% of the mean and there are at least eight runs to judge on.
 *
 * This is the feature that protects the week. Cognitive games measure a trait;
 * you can remove the surprise and learn each game's strategy, but you cannot
 * grind the trait far in seven days. The app has to be willing to say stop,
 * because the fun module is exactly the one you will keep opening.
 */
export function detectPlateau(scoresOldestFirst: number[]): PlateauVerdict {
  const window = scoresOldestFirst.slice(-PLATEAU_WINDOW);
  const runs = window.length;
  const mean = runs > 0 ? window.reduce((a, b) => a + b, 0) / runs : 0;
  const best = runs > 0 ? Math.max(...window) : 0;

  if (runs < PLATEAU_MIN_RUNS) {
    const need = PLATEAU_MIN_RUNS - runs;
    return {
      plateaued: false,
      runs,
      slope: 0,
      mean,
      best,
      message: `${need} more run${need === 1 ? '' : 's'} before this can be called either way.`,
    };
  }

  const xBar = (runs - 1) / 2;
  let num = 0;
  let den = 0;
  for (let i = 0; i < runs; i++) {
    num += (i - xBar) * (window[i] - mean);
    den += (i - xBar) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const threshold = PLATEAU_SLOPE_FRACTION * mean;
  const plateaued = slope < threshold;

  return {
    plateaued,
    runs,
    slope,
    mean,
    best,
    message: plateaued
      ? `Plateaued over ${runs} runs (gaining ${slope.toFixed(2)} per run against a mean of ${mean.toFixed(1)}). Further practice here is low value — spend the time on a gate instead.`
      : `Still improving: ${slope.toFixed(2)} per run over ${runs} runs. Worth continuing.`,
  };
}
