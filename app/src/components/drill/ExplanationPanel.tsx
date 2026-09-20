import { clsx } from 'clsx';
import { Panel } from '@/components/ui/Panel';
import styles from './Drill.module.css';

/**
 * Shown after EVERY answer, including correct ones. The explanation is the
 * product; the question is just the delivery mechanism.
 */
export function ExplanationPanel({
  correct,
  explanation,
  distractorRationale,
}: {
  correct: boolean;
  explanation: string;
  distractorRationale?: Record<string, string>;
}) {
  const entries = Object.entries(distractorRationale ?? {});

  return (
    <Panel
      className={styles.explain}
      title={correct ? 'Why that is right' : 'Why that is wrong'}
      headerTone="stage"
    >
      <p className={styles.explainBody}>{explanation}</p>

      {entries.length > 0 ? (
        <details className={styles.rationale}>
          <summary className={clsx('microlabel', styles.summary)}>
            Why the other options are tempting
          </summary>
          {entries.map(([key, why]) => (
            <p key={key} className={styles.rationaleItem}>
              <strong className={clsx('microlabel', styles.rationaleKey)}>{key.toUpperCase()}</strong>
              <span>{why}</span>
            </p>
          ))}
        </details>
      ) : null}
    </Panel>
  );
}
