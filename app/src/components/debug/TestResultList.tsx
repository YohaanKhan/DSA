'use client';

import { clsx } from 'clsx';
import { Icon } from '@/components/ui/Icon';
import styles from './Debug.module.css';

export interface TestView {
  name: string;
  hidden?: boolean;
  edgeCase?: boolean;
  passed?: boolean;
  expected?: string;
  actual?: string;
  timedOut?: boolean;
}

export function TestResultList({ tests, revealHidden }: { tests: TestView[]; revealHidden: boolean }) {
  return (
    <div className={styles.tests}>
      {tests.map((t) => {
        const concealed = t.hidden && !revealHidden;
        const state = t.passed === undefined ? 'idle' : t.passed ? 'pass' : 'fail';
        return (
          <div
            key={t.name}
            className={clsx(
              styles.test,
              state === 'pass' && styles.testPass,
              state === 'fail' && styles.testFail,
              state === 'idle' && styles.testIdle,
            )}
          >
            {state === 'pass' ? <Icon name="check" size={16} style={{ color: 'var(--ok)' }} /> : null}
            {state === 'fail' ? <Icon name="cross" size={16} style={{ color: 'var(--bad)' }} /> : null}
            {state === 'idle' ? <Icon name="timer" size={16} style={{ color: 'var(--ink-faint)' }} /> : null}

            <span className={styles.testName}>
              <span className="microlabel">{concealed ? 'Hidden test' : t.name}</span>
              {t.edgeCase && !concealed ? (
                <span className={clsx('microlabel', styles.hiddenNote)}> · edge case</span>
              ) : null}
              {!concealed && state === 'fail' ? (
                <div className={styles.testIo}>
                  {t.timedOut
                    ? 'timed out — likely an infinite loop'
                    : `expected ${JSON.stringify(t.expected)}\n     got ${JSON.stringify(t.actual)}`}
                </div>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
