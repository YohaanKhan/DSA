'use client';

import { clsx } from 'clsx';
import { Icon } from '@/components/ui/Icon';
import { STEP_ORDER, STEP_WEIGHTS, type StepId } from '@/lib/scoring/aic';
import styles from './Aic.module.css';

const LABEL: Record<StepId, string> = {
  frame: 'Frame', plan: 'Plan', prompt: 'Prompt', review: 'Review', refine: 'Refine',
};

/** Completed steps show their score; the current one is stage-hued; future ones are dashed. */
export function StepRail({ current, scores }: { current: StepId | 'done'; scores: Partial<Record<StepId, number>> }) {
  const currentIndex = current === 'done' ? STEP_ORDER.length : STEP_ORDER.indexOf(current);

  return (
    <div className={styles.rail}>
      {STEP_ORDER.map((step, i) => {
        const done = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div
            key={step}
            className={clsx(
              styles.railStep,
              done && styles.railDone,
              isCurrent && styles.railCurrent,
              !done && !isCurrent && styles.railFuture,
            )}
          >
            <span className={clsx('microlabel', styles.railName)}>
              {done ? <Icon name="check" size={14} /> : null}
              {i + 1}. {LABEL[step]}
            </span>
            <span className={clsx('tabular', styles.railScore)}>
              {done && scores[step] !== undefined ? `${scores[step]}/5` : '—'}
            </span>
            <span className={styles.railWeight}>{Math.round(STEP_WEIGHTS[step] * 100)}% of score</span>
          </div>
        );
      })}
    </div>
  );
}
