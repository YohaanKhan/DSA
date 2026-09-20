'use client';

import { clsx } from 'clsx';
import { Button } from '@/components/ui/Button';
import styles from './Drill.module.css';

/**
 * Mandatory before submitting in drill mode (skipped in mocks, where realism
 * wins). This one field is what makes `trueKnown` and the review queue honest:
 * without it, a score built on lucky guesses reads identically to real
 * knowledge, and you stop studying something you do not know.
 */
export function ConfidenceToggle({
  value,
  onChange,
}: {
  value: 'high' | 'low' | null;
  onChange: (v: 'high' | 'low') => void;
}) {
  return (
    <div className={styles.confidence}>
      <span className={clsx('microlabel', styles.confidenceLabel)}>How sure are you?</span>
      <Button
        size="sm"
        variant={value === 'high' ? 'solid' : 'outline'}
        onClick={() => onChange('high')}
        aria-pressed={value === 'high'}
      >
        Sure
      </Button>
      <Button
        size="sm"
        variant={value === 'low' ? 'solid' : 'outline'}
        onClick={() => onChange('low')}
        aria-pressed={value === 'low'}
      >
        Guess
      </Button>
    </div>
  );
}
