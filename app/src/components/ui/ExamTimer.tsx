'use client';

import { clsx } from 'clsx';
import { formatClock } from '@/lib/format';
import { Icon } from './Icon';
import styles from './ExamTimer.module.css';

/**
 * Presentational only — it takes remaining time rather than owning a timer, so
 * a screen can drive several displays from one `useExamTimer` instance.
 */
export function ExamTimer({
  remainingMs,
  totalMs,
  label,
  size = 'lg',
}: {
  remainingMs: number;
  totalMs: number;
  label?: string;
  size?: 'sm' | 'lg';
}) {
  const remainingFraction = totalMs > 0 ? remainingMs / totalMs : 0;
  const warn = remainingFraction <= 0.25 && remainingFraction > 0.1;
  const danger = remainingFraction <= 0.1;
  const finalTen = remainingMs <= 10_000 && remainingMs > 0;

  return (
    <div className={styles.wrap}>
      <span
        className={clsx(
          'tabular',
          styles.clock,
          size === 'sm' && styles.sm,
          warn && styles.warn,
          danger && styles.danger,
          finalTen && styles.pulse,
        )}
        // Announced politely so the warning reaches screen-reader users too,
        // without interrupting them on every tick.
        aria-live={warn || danger ? 'polite' : 'off'}
        aria-atomic="true"
      >
        <Icon name="timer" size={size === 'sm' ? 16 : 28} />
        {formatClock(remainingMs)}
      </span>
      {label ? <span className={clsx('microlabel', styles.label)}>{label}</span> : null}
    </div>
  );
}
