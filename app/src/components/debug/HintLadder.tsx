'use client';

import { clsx } from 'clsx';
import { Icon } from '@/components/ui/Icon';
import { HINT_COST } from '@/lib/scoring/debug';
import styles from './Debug.module.css';

/**
 * Four rungs: family → line range → exact line → the diff.
 *
 * Locked for the first eight minutes, because struggling for eight minutes IS
 * the training. Each rung costs score, and the price is shown before you commit.
 */
export function HintLadder({
  hints,
  revealed,
  unlocked,
  finished = false,
  onReveal,
}: {
  hints: string[];
  revealed: number;
  unlocked: boolean;
  /** Once the exercise is over, an unrevealed hint is simply unused — not "locked". */
  finished?: boolean;
  onReveal: (index: number) => void;
}) {
  return (
    <div className={styles.hints}>
      {hints.map((hint, i) => {
        const open = i < revealed;
        const next = i === revealed;
        const available = unlocked && next && !finished;

        return (
          <button
            key={i}
            type="button"
            className={clsx(styles.hint, open && styles.hintOpen, !open && !available && styles.hintLocked)}
            onClick={() => available && onReveal(i)}
            disabled={!available}
            aria-expanded={open}
          >
            <Icon name={open ? 'unlock' : 'lock'} size={16} />
            <span className={styles.hintText}>
              {open ? (
                hint
              ) : (
                <span className="microlabel">
                  Hint {i + 1} of {hints.length}
                  {finished
                    ? ' · not used'
                    : !unlocked
                      ? ' · locked for the first 8 minutes'
                      : !next
                        ? ' · reveal the previous hint first'
                        : ''}
                </span>
              )}
            </span>
            {!open && !finished ? (
              <span className={clsx('microlabel', styles.hintCost)}>−{HINT_COST.toFixed(2)}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
