'use client';

import { clsx } from 'clsx';
import { Icon } from '@/components/ui/Icon';
import { KeyCap } from '@/components/ui/KeyCap';
import styles from './Drill.module.css';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong';

/**
 * A full-width pressable answer. Correct and wrong are communicated with a
 * colour AND a glyph AND a word — never colour alone.
 */
export function OptionRow({
  id,
  index,
  text,
  state,
  disabled,
  onSelect,
}: {
  id: string;
  index: number;
  text: string;
  state: OptionState;
  disabled?: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      className={clsx(
        'press',
        styles.option,
        state === 'selected' && styles.selected,
        state === 'correct' && styles.correct,
        state === 'wrong' && styles.wrong,
      )}
      onClick={() => onSelect(id)}
      disabled={disabled}
      aria-pressed={state === 'selected'}
    >
      <KeyCap active={state === 'selected'}>{String(index + 1)}</KeyCap>
      <span className={styles.optionText}>{text}</span>

      {state === 'correct' ? (
        <span className={clsx('microlabel', styles.verdict, styles.verdictOk)}>
          <Icon name="check" size={16} />
          Correct
        </span>
      ) : null}
      {state === 'wrong' ? (
        <span className={clsx('microlabel', styles.verdict, styles.verdictBad)}>
          <Icon name="cross" size={16} />
          Your answer
        </span>
      ) : null}
    </button>
  );
}
