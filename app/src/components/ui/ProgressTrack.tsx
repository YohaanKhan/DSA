import { clsx } from 'clsx';
import styles from './ProgressTrack.module.css';

/** Determinate bar. `tone` shifts colour as a budget is consumed. */
export function ProgressTrack({
  value,
  max = 100,
  label,
  tone = 'stage',
}: {
  value: number;
  max?: number;
  label?: string;
  tone?: 'stage' | 'warn' | 'over';
}) {
  const pct = max <= 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className={styles.wrap}>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={clsx(styles.fill, tone === 'warn' && styles.warn, tone === 'over' && styles.over)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label ? <span className={clsx('tabular', styles.value)}>{label}</span> : null}
    </div>
  );
}

/** One block per question — reads as progress AND as remaining count at a glance. */
export function SegmentedTrack({ total, done, current }: { total: number; done: number; current?: number }) {
  return (
    <div className={styles.segments} role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={clsx(styles.seg, i < done && styles.segDone, i === current && styles.segCurrent)}
        />
      ))}
    </div>
  );
}
