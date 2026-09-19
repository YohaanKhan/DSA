'use client';

import { clsx } from 'clsx';
import { Icon } from '@/components/ui/Icon';
import styles from './Aic.module.css';

export interface Requirement { id: string; requirement: string }

/**
 * Shown only AFTER a step is submitted. This is the feedback that teaches:
 * you see exactly which required element you forgot to consider.
 */
export function RubricChecklist({
  requirements,
  covered,
  falsePositives = [],
  decoysNamed = [],
}: {
  requirements: Requirement[];
  covered: string[];
  falsePositives?: string[];
  decoysNamed?: Requirement[];
}) {
  return (
    <div className={styles.checklist}>
      {requirements.map((r) => {
        const hit = covered.includes(r.id);
        return (
          <div key={r.id} className={clsx(styles.checkRow, hit ? styles.covered : styles.missedRow)}>
            <Icon name={hit ? 'check' : 'cross'} size={16} style={{ color: hit ? 'var(--ok)' : 'var(--bad)', flex: '0 0 auto' }} />
            <span>{r.requirement}</span>
          </div>
        );
      })}

      {decoysNamed.map((d) => (
        <div key={d.id} className={clsx(styles.checkRow, styles.falsePositive)}>
          <Icon name="cross" size={16} style={{ flex: '0 0 auto' }} />
          <span>
            <strong>−0.5</strong> {d.requirement}. Claiming a flaw that is not there costs marks,
            so ticking everything does not work.
          </span>
        </div>
      ))}

      {falsePositives.length > 0 && decoysNamed.length === 0 ? (
        <div className={clsx(styles.checkRow, styles.falsePositive)}>
          <Icon name="cross" size={16} style={{ flex: '0 0 auto' }} />
          <span>{falsePositives.length} invented issue(s), −0.5 each.</span>
        </div>
      ) : null}
    </div>
  );
}
