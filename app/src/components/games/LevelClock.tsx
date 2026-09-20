'use client';

import { clsx } from 'clsx';
import { levelReward } from '@/lib/scoring/games';
import { ProgressTrack } from '@/components/ui/ProgressTrack';
import styles from './Games.module.css';

/**
 * The per-level countdown, plus the thing the plan actually cares about: a live
 * figure for what clearing THIS level right now is worth.
 *
 * The reward is level squared over seconds, so the marginal value of one more
 * level is enormous compared with shaving seconds off a shallow one — and
 * nobody derives that mid-run. Putting the number on screen is the only way the
 * intuition transfers.
 */
export function LevelClock({
  level, remainingMs, totalMs,
}: {
  level: number;
  remainingMs: number;
  totalMs: number;
}) {
  const elapsedSeconds = Math.max(0.5, (totalMs - remainingMs) / 1000);
  const low = remainingMs <= Math.min(5000, totalMs * 0.25);

  return (
    <div className={styles.clock}>
      <div className={styles.clockRow}>
        <span className={clsx('tabular', styles.clockTime, low && styles.clockLow)}>
          {(remainingMs / 1000).toFixed(1)}s
        </span>
        <span className={clsx('microlabel', styles.clockWorth)}>
          clear now{' '}
          <span className={clsx('tabular', styles.clockWorthValue)}>
            +{levelReward(level, elapsedSeconds).toFixed(1)}
          </span>
        </span>
      </div>
      <ProgressTrack
        value={remainingMs}
        max={totalMs}
        tone={low ? 'warn' : 'stage'}
        label={undefined}
      />
    </div>
  );
}
